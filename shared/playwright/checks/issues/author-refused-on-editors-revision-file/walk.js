// U36 A2 issue walk, the "Revisions Uploaded" side: while a review round asks for revisions, the
// Author is refused "Update File Details" and "Delete" on a file an editor uploaded to the list.
// On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), journal or press
// `publicknowledge`. The kit builds nothing. A preprint server has no review rounds: not walked.
// Helpers: ../author-update-file-details-offered-then-refused/lib.js.
//
// MODE=walk (default): OJS submission 13 (author lkumiega), whose round 1 asks for revisions in the
//   dataset; OMP submission 16 (author mpower), where dbarnes first records "Request Revisions"
//   (the dataset's press has no round asking for revisions).
//   1 sign in as dbarnes; 2 open the submission [OMP: "Request Revisions", "Next", "Continue" to
//   "Record Decision"]; 3 "Upload" above "Revisions Uploaded", the component "Article Text" (OMP
//   "Book Manuscript"), u36e-notes.txt, "Continue", "Continue", "Complete"; 4 sign in as the
//   author, open the submission from "My Submissions"; 5 "More Actions" on u36e-notes.txt, "Update
//   File Details" (3.5: "Edit"); 6 close the window, "More Actions", "Delete", "OK".
// MODE=nb, the neighbour alone (with a fix in and out): a round that does not ask for revisions,
//   OJS submission 7 (dsokoloff), OMP submission 2 (afinkel). Steps 1, 3 to 6: the author must
//   stay refused.
// MODE=revise (what the fix opens besides the two entries; walked with the fix in on main, without
//   it on 3.5): the walk's submissions and steps 1 to 4, then as the author "Upload" above
//   "Revisions Uploaded", u36e-notes.txt chosen under "If you are uploading a revision of an
//   existing file, please indicate which file.", u36e-revised.txt, "Continue", "Continue",
//   "Complete".
//
// Reset first:  npm run fleet-prep -- --feature issues-u36e --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u36e PROBE_AGENT=u36e node bin/probe.js ojs,omp shared/playwright/checks/issues/author-refused-on-editors-revision-file/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u36e-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u36e-3_5 PROBE_AGENT=u36e node bin/probe.js ojs,omp shared/playwright/checks/issues/author-refused-on-editors-revision-file/walk.js
// Facts: .reports/<feature>/u36e/a2rev-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('../author-update-file-details-offered-then-refused/lib.js');

const MODE = process.env.MODE || 'walk';
const FILE = 'u36e-notes.txt';
const LIST = 'Revisions Uploaded';
const ENTRY = process.env.PKP_E2E_LINE === 'stable-3_5_0' ? 'Edit' : 'Update File Details'; // 3.5 names the entry "Edit"
const CASES = {
    ojs: {component: 'Article Text', walk: {id: 13, author: 'lkumiega'}, nb: {id: 7, author: 'dsokoloff'}},
    omp: {component: 'Book Manuscript', walk: {id: 16, author: 'mpower', request: true}, nb: {id: 2, author: 'afinkel'}},
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    if (!c) { console.log(`[a2rev ${app.name}] no review rounds: not walked`); return; }
    const s = c[MODE === 'revise' ? 'walk' : MODE];
    const o = {app: app.name, line: app.line || 'main', mode: MODE, submission: s.id, author: s.author};
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => {
        const data = await screen(page).catch((e) => ({url: page.url(), error: L.flat(e.message)}));
        const id = `a2rev-${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, data);
        await shot(page, id).catch(() => {});
        return data;
    };
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) { o[key] = {threw: L.flat(e.message, 400)}; await snap(`${key}-threw`).catch(() => {}); }
        console.log(`[a2rev ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 1500));
        return o[key];
    };
    const decisions = () => require('../../../probe').sql(app, `select decision, review_round_id from edit_decisions where submission_id = ${s.id} order by edit_decision_id`);
    try {
        await signIn(page, 'dbarnes');                                                            // 1
        await L.openWorkflow(page, app, s.id);                                                    // 2
        if (s.request) {
            // The press's own page object takes "Request Revisions", "Next" and the wizard to "Record Decision".
            const R = require('../../../../../apps/omp/playwright/pages/ReviewStagePages.js');
            await step('requestRevisions', async () => { await R.requestRevisions(page, R.workflowModal(page)); return 'recorded'; });
            await snap('revisions-requested');
            await L.openWorkflow(page, app, s.id);
        }
        o.decisions = decisions();
        await step('editorUpload', () => L.editorUpload(page, LIST, c.component, L.smallFile(FILE))); // 3
        await signIn(page, s.author);                                                             // 4
        await L.openWorkflow(page, app, s.id, {author: true});
        await step('authorList', () => L.listRows(page, LIST));
        await step('authorMenu', () => L.rowMenu(page, LIST, FILE));
        await snap('author-revisions');
        if (MODE === 'revise') {
            const W = require('../change-file-keeps-first-upload/lib.js');
            const requests = W.watchWizard(page);
            await step('authorWizard', async () => {
                await W.uploadButton(page, LIST).click();
                await W.uploadBox(page).waitFor({state: 'attached', timeout: L.T});
                await idle(page);
                return W.stepOne(page);
            });
            await snap('author-wizard');
            await step('authorChoosesEditorsFile', async () => {
                const select = W.wizard(page).locator('select[id^="revisedFileId"]');
                const label = (await select.locator('option').allInnerTexts()).find((x) => x.includes(FILE));
                if (!label) return {offered: false};
                await select.selectOption({label});
                await idle(page);
                return {offered: true, chosen: L.flat(label, 80)};
            });
            if (o.authorChoosesEditorsFile && o.authorChoosesEditorsFile.offered) {
                await step('authorUpload', () => W.pick(page, L.smallFile('u36e-revised.txt')));
                await snap('author-uploaded');
                await step('authorFinish', () => W.finish(page));
            }
            o.requests = requests;
            await L.openWorkflow(page, app, s.id, {author: true});
            await step('authorListAfter', () => L.listRows(page, LIST));
            o.stored = L.stored(app, s.id).filter((f) => f.stage === 15);
            return;
        }
        const e = await step('authorEdit', () => L.openEdit(page, LIST, FILE, ENTRY));            // 5
        await snap('author-edit');
        if (e && e.offered) await L.closeTop(page).catch(() => {});
        await step('authorDelete', () => L.deleteRow(page, LIST, FILE));                          // 6
        await snap('author-delete');
        await L.openWorkflow(page, app, s.id, {author: true});
        await step('authorListAfterDelete', () => L.listRows(page, LIST).then((rows) => rows.filter((r) => !/No Files|No Items/i.test(r))));
        o.stored = L.stored(app, s.id).filter((f) => f.stage === 15);
    } catch (e) {
        o.error = L.flat(e.stack || e.message, 800);
        await snap('error').catch(() => {});
    } finally {
        record(`a2rev-facts-${MODE}`, o);
        console.log(`[a2rev ${app.name} ${MODE}] facts`, JSON.stringify(o).slice(0, 5000));
        await idle(page).catch(() => {});
        await close();
    }
});
