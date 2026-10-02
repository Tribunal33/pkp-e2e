// Issue report docs/issues/U36-A14-change-file-keeps-first-upload.md (U36 A14): in step 1 of the
// upload wizard, "Change File" uploads the second file but leaves the first one stored, so a new
// file's list shows both. Walked through the screens on PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"), context `publicknowledge`. The kit builds nothing.
//
// MODE=walk (default), OJS submission 4 and OMP submission 3, "Submission Files":
//   1. sign in as dbarnes
//   2. open the submission's workflow; read "Submission Files"
//   3. "Upload": the window "Upload Submission File" on "1. Upload File"
//   4. the component "Article Text" (OMP "Book Manuscript")
//   5. "Upload File": u36c-first.pdf
//   6. "Change File": u36c-second.pdf
//   7. "Continue", "Continue", "Complete"
//   8. read "Submission Files"; reload, read it again
//   OPS (no file lists; a new galley's file): preprint 1, "Galleys", "Add galley" "u36c PDF",
//   "Save", then steps 4 to 7 with "Preprint Text"; the galley's row and the stored files.
// MODE=nb, the neighbour alone (OJS, OMP; with the fix in and out): the same steps with, at step 4,
//   the dataset's own file chosen under "If you are uploading a revision of an existing file…"
//   instead of a component. The list must keep its number of rows, the revised one named
//   u36c-second.pdf: the first pick's delete must never remove the file being revised.
// MODE=rev (OJS; the dataset's press has no revision request): the same swap by the author
//   lkumiega on submission 13's "Revisions Uploaded" (revisions requested), from the author's view
//   (/dashboard/mySubmissions), with "Article Text"; also the round's status and the activity
//   log's new lines, which a delete that works adds to.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=issues-u36c PROBE_AGENT=u36c node bin/probe.js all shared/playwright/checks/issues/change-file-keeps-first-upload/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature <feature>-3_5 --dataset <n> --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u36c-3_5 PROBE_AGENT=u36c node bin/probe.js all shared/playwright/checks/issues/change-file-keeps-first-upload/walk.js
// Facts: .reports/<feature>/u36c/a14-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const SUBMISSION = MODE === 'rev' ? {ojs: 13} : {ojs: 4, omp: 3, ops: 1};
const LIST = MODE === 'rev' ? 'Revisions Uploaded' : 'Submission Files';
const COMPONENT = {ojs: 'Article Text', omp: 'Book Manuscript', ops: 'Preprint Text'};

forEachApp(async (app) => {
    const fact = (k, v) => { record('a14-facts', {[k]: v}, {merge: true}); console.log('[a14]', app.name, MODE, k, JSON.stringify(v).slice(0, 1200)); };
    const step = async (k, fn) => {
        try { return await fn(); } catch (e) {
            fact(`${k}-FAILED`, String(e.stack || e).split('\n').slice(0, 5).join(' | '));
            return null;
        }
    };
    const id = SUBMISSION[app.name];
    const files = L.twoFiles();
    if (MODE === 'rev' && app.name !== 'ojs') { fact('surface', 'not walked: the dataset holds no revision request here'); return; }
    if (app.name === 'ops' && MODE !== 'walk') { fact('surface', 'none: a preprint server has no file list to revise a file on'); return; }
    const {page} = await launch(app);
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push(`${d.type()}: ${d.message()}`); d.accept().catch(() => {}); });
    const requests = L.watchWizard(page);

    await signIn(page, MODE === 'rev' ? 'lkumiega' : 'dbarnes');                                    // 1
    fact('stored-before', L.stored(app, id));
    const logFrom = L.lastLogId(app);
    fact('side-before', L.sideEffects(app, id, logFrom));

    // Steps 4 to 7 in the open wizard; `choose` makes step 4's choice.
    const throughWizard = async (choose) => {
        fact('step1-open', await step('step1-open', () => L.stepOne(page)));
        await step('choose', choose);                                                               // 4
        fact('step1-chosen', await step('step1-chosen', () => L.stepOne(page)));
        fact('upload-first', await step('upload-first', () => L.pick(page, files.first)));          // 5
        fact('step1-first', await step('step1-first', () => L.stepOne(page)));
        record(`a14-${MODE}-step1-first`, await screen(page));
        fact('stored-after-first', L.stored(app, id));
        fact('side-after-first', L.sideEffects(app, id, logFrom));
        fact('upload-second', await step('upload-second', () => L.pick(page, files.second)));       // 6
        await L.sleep(1000);                                                                        // the delete's answer
        fact('step1-second', await step('step1-second', () => L.stepOne(page)));
        record(`a14-${MODE}-step1-second`, await screen(page));
        await shot(page, `a14-${MODE}-step1-second`);
        fact('requests-step1', requests.slice());
        fact('notices-step1', (await screen(page)).notices);
        fact('stored-after-second', L.stored(app, id));
        fact('finish', await step('finish', () => L.finish(page)));                                 // 7
    };

    if (app.name === 'ops') {
        await L.openWorkflow(page, app, id, app.line === 'stable-3_5_0' ? 'publication_galleys' : 'publication_1_galleys');
        const manager = page.locator('[data-cy="galley-manager"]').first();
        await step('galleys', () => manager.locator('table').first().waitFor({timeout: L.T}));
        const galleyRows = async () => (await manager.locator('tbody tr').allInnerTexts()).map((t) => L.flat(t, 200));
        fact('galleys-before', await step('galleys-before', galleyRows));
        await step('add-galley', async () => {
            await manager.locator('button').filter({hasText: /^\s*Add galley\s*$/}).click();
            const label = page.getByRole('dialog').locator('input[name="label"]').last();
            await label.waitFor({timeout: L.T});
            await idle(page);
            await label.fill('u36c PDF');
            const saved = page.waitForResponse((r) => r.url().includes('update-galley') && r.request().method() === 'POST', {timeout: L.T});
            await page.getByRole('dialog').filter({has: page.locator('input[name="label"]')}).last().getByRole('button', {name: 'Save', exact: true}).last().click();
            await saved;
            await L.uploadBox(page).waitFor({state: 'attached', timeout: L.T});
            await idle(page);
        });
        await throughWizard(() => L.wizard(page).locator('select[id^="genreId"]').selectOption({label: COMPONENT.ops}));
        fact('galleys-after', await step('galleys-after', galleyRows));
        record('a14-walk-galleys-after', await screen(page));
        await shot(page, 'a14-walk-galleys-after');
        fact('stored-after', L.stored(app, id));
        fact('requests', requests);
        fact('dialogs', dialogs);
        return;
    }

    const view = MODE === 'rev' ? 'mySubmissions' : 'editorial';
    await L.openWorkflow(page, app, id, null, view);                                                // 2
    const before = await step('list-before', () => L.listRows(page, LIST));
    fact('list-before', before);
    record(`a14-${MODE}-list-before`, await screen(page));
    await step('open-wizard', async () => {                                                         // 3
        await L.uploadButton(page, LIST).click();
        await L.uploadBox(page).waitFor({state: 'attached', timeout: L.T});
        await idle(page);
    });
    if (MODE !== 'nb') {
        await throughWizard(() => L.wizard(page).locator('select[id^="genreId"]').selectOption({label: COMPONENT[app.name]}));
    } else {
        await throughWizard(() => L.wizard(page).locator('select[id^="revisedFileId"]').selectOption({index: 1}));
    }
    const after = await step('list-after', () => L.listRows(page, LIST));                                 // 8
    fact('list-after', after);
    record(`a14-${MODE}-list-after`, await screen(page));
    await shot(page, `a14-${MODE}-list-after`);
    await L.openWorkflow(page, app, id, null, view);
    await page.reload();
    await idle(page);
    const reloaded = await step('list-after-reload', () => L.listRows(page, LIST));
    fact('list-after-reload', reloaded);
    fact('side-after', L.sideEffects(app, id, logFrom));
    fact('stored-after', L.stored(app, id));
    fact('requests', requests);
    fact('dialogs', dialogs);
    if (before && reloaded) {
        const names = (rows) => ['u36c-first.pdf', 'u36c-second.pdf'].filter((n) => rows.some((r) => r.includes(n)));
        fact('verdict', {rowsBefore: before.length, rowsAfter: reloaded.length, listed: names(reloaded)});
    }
});
