// Issue report docs/issues/U49-A11-revision-summary-markup-runs-on-insert-content.md (U49 A11):
// markup an author saves in a review revision's "Summary of Changes (Amendment Notice)" runs as script
// in the editor's browser when the editor presses "Insert Content" on a version's Summary of Changes box.
// Takes the report's Steps on PKP's default test dataset (a dataset fleet), OJS submission 13 (author
// lkumiega, revisions requested) and OMP book 16 (author mpower; the editor requests revisions first):
//   O1-O3 (OMP) dbarnes: book 16, "Request Revisions", through its steps, "Record Decision"
//   1-4 the author: "Upload revisions", component, a file, "Continue", the summary TYPED, "Continue", "Complete"
//   5   the author: a second upload, the same markup PASTED as HTML
//   7-9 dbarnes: the submission, "Publication Settings" / "Catalog Entry", "Insert Content" on the English box
// WALK=request (the report's Steps; the coordinator allowed the one constructed request, 2026-10-15):
//   R1-R4 the author: "Upload revisions", component, a file, "Continue", "Fixed figure 2." typed in
//         "Summary of Changes", "Continue", "Complete" (the save the "Review Details" step sends is kept)
//   R5    the author's own signed-in page sends that save once more, every field as the wizard sent it,
//         "summaryOfChanges" set to "<p>Fixed figure 2.<img src="x" onerror="alert(…)"></p>"
//   R7-R9 dbarnes: "Publication Settings" / "Catalog Entry", "Insert Content"; R10 "Insert" on the summary
// WALK=nb (the neighbour, alone on a fresh reset): the author's summary "Fixed Figure 2." typed, then
// all of it made bold (Ctrl+A, Ctrl+B); dbarnes's "Insert Content" must list "Fixed Figure 2." and its
// "Insert" must append the bold summary to the box.
// On stable-3_5_0 (no such field): the author's step 3 is read for a "Summary of Changes" box and the
// editor's "Issue" / "Catalog Entry" page for "Insert Content".
//
// Reset first:  npm run fleet-prep -- --feature issues-k11 --dataset 9 --reset
// Run (main):   PROBE_FEATURE=issues-k11 PROBE_AGENT=k11 node bin/probe.js ojs,omp shared/playwright/checks/issues/revision-summary-markup-runs-on-insert-content/walk.js
//               (ONLY=ojs or omp narrows; `bin/probe.js all` also reads OPS's lack of the surface)
// Insert+Save:  THEN_SAVE=1 WALK=request PROBE_RUN=save … (step 10's "Insert" followed at once by "Save")
// Report walk:  WALK=request PROBE_RUN=req (PROBE_RUN=fix with fix.diff applied) … the same command
// Neighbour:    WALK=nb PROBE_RUN=nb-out (or nb-in with fix.diff applied) … the same command
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-k11-3_5 --dataset 9 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-k11-3_5 PROBE_AGENT=k11 node bin/probe.js all <this file>
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const K = require('./lib.js');
const D = require('../author-response-gone-after-revisions-upload/lib.js');

const MODE = process.env.WALK || 'walk';
const TYPED = `<img src="x" onerror="alert('hkk11 typed')">`;
const PASTED = `<img src="x" onerror="alert('hkk11 pasted')">`;
const NB = 'Fixed Figure 2.';
const FIRST = 'Fixed figure 2.';
const PROOF = `<p>${FIRST}<img src="x" onerror="alert('hkk11: this ran in ' + document.title)"></p>`;
const C = {
    ojs: {id: 13, author: 'lkumiega', component: 'Article Text', entry: 'Publication Settings', entry35: 'Issue', request: false},
    omp: {id: 16, author: 'mpower', component: 'Book Manuscript', entry: 'Catalog Entry', entry35: 'Catalog Entry', request: true},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `${MODE === 'walk' ? '' : `${MODE}-`}${s}${run}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const step = async (k, fn) => {
        try {
            fact(k, await fn());
        } catch (e) {
            fact(k, {threw: K.flat(e.message, 400)});
        }
    };
    const stable35 = app.line === 'stable-3_5_0';
    const c = C[app.name];

    const {page, close} = await launch(app);
    const alerts = [];
    page.on('dialog', async (d) => {
        alerts.push({type: d.type(), message: d.message(), at: new Date().toISOString()});
        if (d.type() === 'beforeunload') await d.accept().catch(() => {});
        else await d.dismiss().catch(() => {});
    });
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});

    try {
        if (!c) {
            // OPS: a preprint server has no review stage; the entry page is read for the button.
            await signIn(page, 'dbarnes');
            await frame.gotoEditorial(3);
            await idle(page);
            const entry = frame.menuLink(stable35 ? 'Preprint' : 'Preprint entry');
            if (!(await entry.last().isVisible().catch(() => false))) await frame.latestVersionNode().click().catch(() => {});
            await entry.last().click().catch(() => {});
            await idle(page);
            await page.waitForTimeout(1500);
            fact('ops entry', {
                summaryBoxes: await page.locator('iframe[id*="summaryOfChanges-control"]').count(),
                insertContent: await page.getByRole('button', {name: 'Insert Content', exact: true}).count(),
            });
            record(name('ops-entry'), await screen(page));
            return;
        }

        // O1-O3
        if (c.request && !stable35) {
            await step('O request revisions', async () => {
                await signIn(page, 'dbarnes');
                const out = await D.decide(page, app, c.id, 'Request Revisions');
                await signOut(page);
                return out;
            });
        }

        // 1-6
        await signIn(page, c.author);
        if (stable35) {
            await step('35 author step 3', async () => {
                if (c.request) {
                    await signOut(page);
                    await signIn(page, 'dbarnes');
                    await D.decide(page, app, c.id, 'Request Revisions');
                    await signOut(page);
                    await signIn(page, c.author);
                }
                await K.openAuthor(page, app, c.id, {author: true});
                const W = require('../change-file-keeps-first-upload/lib.js');
                const A = require('../author-revisions-upload-offered-then-refused/lib.js');
                await A.uploadRevisionsButton(page).first().click();
                await W.uploadBox(page).waitFor({state: 'attached', timeout: K.T});
                await W.wizard(page).locator('select[id^="genreId"]').selectOption({label: c.component});
                await W.pick(page, K.smallFile('hkk11-r35.txt'));
                const dlg = page.getByRole('dialog').filter({has: page.getByRole('tab', {name: '2. Review Details', exact: true})}).last();
                await dlg.getByRole('button', {name: 'Continue', exact: true}).click();
                await idle(page);
                await page.waitForTimeout(1500);
                const s = await screen(page);
                record(name('35-review-details'), s);
                return {summaryField: /Summary of Changes/.test(String(s.text?.dialog || '')), iframes: await page.locator('iframe[id*="summaryOfChanges"]').count()};
            });
        } else if (MODE === 'request') {
            let save = null;
            await step('R2-4 author upload', async () => {
                await K.openAuthor(page, app, c.id, {author: true});
                const out = await K.uploadWithSummary(page, c.component, K.smallFile('hkk11-revision.txt'), FIRST, 'type');
                save = out.request;
                return {...out, request: K.shown(out.request)};
            });
            await step('R5 author resends the save', async () => {
                if (!save) throw new Error('no save request was seen in step 4');
                return K.resendSave(page, save, PROOF);
            });
        } else if (MODE === 'nb') {
            await step('nb author upload', async () => {
                await K.openAuthor(page, app, c.id, {author: true});
                const out = await K.uploadWithSummary(page, c.component, K.smallFile('hkk11-nb.txt'), NB, 'bold');
                return {...out, request: K.shown(out.request)};
            });
        } else {
            await step('3-4 author upload typed', async () => {
                await K.openAuthor(page, app, c.id, {author: true});
                const out = await K.uploadWithSummary(page, c.component, K.smallFile('hkk11-typed.txt'), TYPED, 'type');
                record(name('4-typed-done'), await screen(page));
                return {...out, request: K.shown(out.request)};
            });
            await step('5 author upload pasted', async () => {
                await K.openAuthor(page, app, c.id, {author: true});
                const out = await K.uploadWithSummary(page, c.component, K.smallFile('hkk11-pasted.txt'), PASTED, 'paste');
                return {...out, request: K.shown(out.request)};
            });
        }
        fact('stored summaries', K.storedSummaries(app, c.id));
        fact('alerts during author steps', alerts.slice());
        await signOut(page);

        // 7-9
        await signIn(page, 'dbarnes');
        await frame.gotoEditorial(c.id);
        await idle(page);
        if (stable35) {
            await step('35 editor entry', async () => {
                const entry = frame.menuLink(c.entry35);
                if (!(await entry.last().isVisible().catch(() => false))) await frame.latestVersionNode().click().catch(() => {});
                await entry.last().click();
                await idle(page);
                await page.waitForTimeout(1500);
                const s = await screen(page);
                record(name('35-entry'), s);
                return {
                    summaryBoxes: await page.locator('iframe[id*="summaryOfChanges-control"]').count(),
                    insertContent: await page.getByRole('button', {name: 'Insert Content', exact: true}).count(),
                };
            });
            return;
        }
        let panel = null;
        await step('9 insert content', async () => {
            // THEN_SAVE on a journal: "Don't Assign To An Issue" first, since the page's "Save" is refused
            // with "This field is required." under "Issue" while "Assign To Current/Back Issue" has no issue
            const prepare = process.env.THEN_SAVE && app.name === 'ojs'
                ? async () => { await page.getByText("Don't Assign To An Issue", {exact: true}).first().click(); }
                : null;
            const out = await K.openInsertContent(page, frame, c.entry, alerts, prepare);
            panel = out.panelLocator;
            delete out.panelLocator;
            record(name('9-insert-content'), await screen(page));
            return out;
        });
        if (MODE === 'nb' && panel) {
            await step('nb insert', async () => ({boxAfter: await K.insertItem(page, panel, NB)}));
            record(name('nb-inserted'), await screen(page));
        }
        if (MODE === 'request' && panel) {
            // 10: "Insert" on the listed summary; what the box holds and whether anything more ran
            const before = alerts.length;
            if (process.env.THEN_SAVE) {
                // R10-R11 (THEN_SAVE=1): "Insert", then "Save" at once; what was sent, answered, shown and stored
                await step('R11 insert then save', async () => ({...(await K.insertThenSave(page, panel, FIRST, app, c.id)), alertsSince: alerts.slice(before)}));
                record(name('R11-after-save'), await screen(page));
            } else {
                await step('R10 insert', async () => ({boxAfter: await K.insertItem(page, panel, FIRST), alertsWhileInserting: alerts.slice(before)}));
            }
            record(name('R10-inserted'), await screen(page));
        }
        fact('verdict', {
            alerts: alerts.map((a) => a.message),
            expected: MODE === 'nb' ? '"Fixed Figure 2." listed, inserted with its bold' : MODE === 'request' ? '"Fixed figure 2." listed, no alert' : 'each summary listed as text, no alert',
        });
    } finally {
        fact('all alerts', alerts);
        record(name('facts'), facts);
        await close();
    }
});
