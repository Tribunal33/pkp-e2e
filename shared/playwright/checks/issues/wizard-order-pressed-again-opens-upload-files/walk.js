// Issue report docs/issues/U72-A11-wizard-order-pressed-again-opens-upload-files.md (U72 A11):
// in the submission wizard, "Order" pressed while a list is being ordered (or "Done" pressed
// twice) moves the wizard to its first step (OMP chapters on `main`, OPS galleys on 3.5).
// Runs on PKP's default test dataset (OMP, OPS), context `publicknowledge`, freshly loaded.
// No argument (the report's Steps), as the author `aclark`:
//   1-3  "Make a Submission", Title "Ordering h19u", "Begin Submission"
//   4    "Continue" to "Details"
//   5-6  "Add Chapter" "First h19u", then "Second h19u"
//   7    "Order"                       (read)
//   8    "Order" again                 (read: the open step, the address's #hash, the list)
//   8b   the rail's "Details"          (read)
//   9    "Done" pressed twice quickly  (read: saves sent, the open step, the #hash)
//   9b   the rail's "Details"          (read)
// On OPS (no argument), the same presses on the wizard's galley list, as the author `ccorino`:
//   "Make a Submission", Title "Ordering h19u", "Begin Submission"; on the
//   "Upload Files" step (3.5: "Continue" from "Details" first) "Add File" twice, galleys "PDF"
//   and "HTML" (each the fixture PDF, "Preprint Text"); "Order", "Order" again, then "Done"
//   double-clicked, each read as on OMP.
// `neighbour` (OMP only, runs alone; fix in and out): as `dbarnes` on submission 3's "Chapters" page,
// "Order" (read), "Order" again (read: the control, nothing happens), "Cancel ordering" (read),
// "Order" (read: ordering starts again), "Done" once (read: one save), "Order" (read),
// "Cancel ordering" (read). Nothing throws on a state a fix brings: each step is recorded.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset <n> --apps omp,ops --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js <omp|ops> shared/playwright/checks/issues/wizard-order-pressed-again-opens-upload-files/walk.js [neighbour]
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5)
const {forEachApp, launch, signIn, record} = require('../../../probe');
const H = require('./lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : 'steps';

forEachApp(async (app) => {
    if (app.name === 'ojs') return; // no orderable list in a journal's wizard
    if (app.name === 'ops' && process.argv.includes('neighbour')) return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const facts = {line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const step = async (k, fn) => {
        try {
            return await fn();
        } catch (e) {
            fact(`${k}.FAILED`, H.flat(e.message || e, 600));
            return null;
        }
    };
    const {page, close} = await launch(app);
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(H.flat(e.message)));
    const seen = H.watch(page);
    const {ChapterList} = H.omp('ChapterPages.js');
    const W = H.omp('SubmissionWizardPages.js');
    const list = new ChapterList(page);
    const read = async (k, settle = 1500) => {
        await H.sleep(settle);
        const s = await H.state(page);
        fact(k, s);
        await H.snap(page, `${MODE === 'steps' ? 'walk' : 'nb'}-${k}`);
        return s;
    };
    try {
        if (app.name === 'ops') {
            const O = H.ops('SubmissionWizardPages.js');
            const readOps = async (k, settle = 1500) => {
                await H.sleep(settle);
                const s = await H.stateOps(page);
                fact(k, s);
                await H.snap(page, `ops-${k}`);
                return s;
            };
            await signIn(page, 'ccorino');
            fact('o3-begin', await step('o3-begin', () => H.startToFilesOps(page, app, 'Ordering h19u')));
            await readOps('o4-files', 500);
            await step('o5-add', () => O.addGalleyFile(page, {label: 'PDF'}));
            await step('o6-add', () => O.addGalleyFile(page, {label: 'HTML'}));
            await readOps('o6-added', 800);
            await step('o7-order', async () => {
                await H.galleyGrid(page).locator('.header a.pkp_linkaction_orderItems').click({timeout: 10_000});
                await H.galleyGrid(page).locator('.order_finish_controls a.saveButton').waitFor({timeout: 10_000});
            });
            await readOps('o7-ordering', 500);
            await step('o8-order-again', () => H.galleyGrid(page).locator('.header a.pkp_linkaction_orderItems').click({timeout: 10_000}));
            await readOps('o8-after-order-again');
            await step('o8b-rail-files', () => O.gotoStep(page, O.STEPS.files));
            await readOps('o8b-files-again');
            const before = seen.saves.length;
            await step('o9-done-twice', () => H.galleyGrid(page).locator('.order_finish_controls a.saveButton').dblclick({timeout: 10_000}));
            await readOps('o9-after-done-twice', 3000);
            fact('o9-saves', seen.saves.slice(before));
        } else if (MODE === 'steps') {
            await signIn(page, 'aclark');
            const id = await step('s3-begin', () => H.startToDetails(page, app, 'Ordering h19u'));
            fact('submissionId', id);
            await read('s4-details', 500);
            await step('s5-add', () => list.addChapter({title: 'First h19u'}));
            await step('s6-add', () => list.addChapter({title: 'Second h19u'}));
            await read('s6-added', 800);
            await step('s7-order', () => list.startOrdering());
            await read('s7-ordering', 500);
            await step('s8-order-again', () => list.orderLink().click({timeout: 10_000}));
            await read('s8-after-order-again');
            await step('s8b-rail-details', () => W.gotoStep(page, W.STEPS.details));
            await read('s8b-details-again');
            const before = seen.saves.length;
            await step('s9-done-twice', () => list.doneLink().dblclick({timeout: 10_000}));
            await read('s9-after-done-twice', 3000);
            fact('s9-saves', seen.saves.slice(before));
            await step('s9b-rail-details', () => W.gotoStep(page, W.STEPS.details));
            await read('s9b-details-again');
        } else {
            await signIn(page, 'dbarnes');
            await step('n1-open', () => H.openChapters(page, app, 3));
            await read('n1-chapters', 500);
            await step('n2-order', () => list.startOrdering());
            await read('n2-ordering', 500);
            await step('n3-order-again', () => list.orderLink().click({timeout: 10_000}));
            await read('n3-after-order-again');
            await step('n4-cancel', () => list.cancelOrdering());
            await read('n4-after-cancel');
            await step('n5-order', () => list.startOrdering());
            await read('n5-ordering-again', 500);
            const before = seen.saves.length;
            await step('n6-done', () => list.finishOrdering());
            await read('n6-after-done');
            fact('n6-saves', seen.saves.slice(before));
            await step('n7-order', () => list.startOrdering());
            await read('n7-ordering-third', 500);
            await step('n8-cancel', () => list.cancelOrdering());
            await read('n8-after-cancel');
        }
    } finally {
        fact('saves', seen.saves);
        fact('http4xx5xx', seen.bad);
        fact('pageErrors', pageErrors);
        record(`${MODE === 'steps' ? 'walk' : 'nb'}-facts`, facts);
        await close();
    }
});
