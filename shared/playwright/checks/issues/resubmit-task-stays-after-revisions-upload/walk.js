// U26 A13 issue walk: after "Request Revisions" with "Revisions will be subject to a new round of
// peer reviews.", the Author's "Resubmit for review." task stays in their Tasks panel once they
// have uploaded a revised file. On PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"), journal or press `publicknowledge`; the kit builds nothing. A preprint
// server has no review rounds: not walked. Helpers: lib.js beside this file.
//
// MODE=walk (default): OJS submission 10 (author jnovak, "Article Text"); OMP submission 16
//   (mpower, "Book Manuscript"):
//   1 sign in as dbarnes, open the submission; 2 "Request Revisions", "Revisions will be subject
//   to a new round of peer reviews.", "Next", the wizard to "Record Decision"; 3 sign in as the
//   author, "Tasks"; 4 open the submission, "Upload revisions", the component, h19v-revision.txt,
//   "Continue", "Continue", "Complete"; 5 "Tasks".
// MODE=second: the Steps, then what an author's second upload costs: 6 open the submission, press
//   "Upload" above "Revisions Uploaded", h19v-second.txt the same way; the round's files and the
//   "Revised Version Uploaded" messages to the assigned editor dbarnes after each upload.
// MODE=nb, the neighbour alone (with a fix in and out), every step recorded, none throwing: the
//   same steps with revisions requested WITHOUT a new round (OJS 13, lkumiega, whose round already
//   asks for them, so step 2 is skipped; OMP 16, mpower, step 2 leaving "Revisions will not be
//   subject to a new round of peer reviews."): the task before the upload and none after it.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/resubmit-task-stays-after-revisions-upload/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a13-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const FILE = 'h19v-revision.txt';
const CASES = {
    ojs: {
        component: 'Article Text',
        walk: {id: 10, author: 'jnovak', request: {newRound: true}},
        nb: {id: 13, author: 'lkumiega', request: null},
        editor: 'dbarnes',
    },
    omp: {
        component: 'Book Manuscript',
        walk: {id: 16, author: 'mpower', request: {newRound: true}},
        nb: {id: 16, author: 'mpower', request: {newRound: false}},
        editor: null,
    },
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    if (!c) { console.log(`[a13 ${app.name}] no review rounds: not walked`); return; }
    const s = c[MODE === 'second' ? 'walk' : MODE];
    const o = {app: app.name, line: app.line || 'main', mode: MODE, submission: s.id, author: s.author};
    const {page, close} = await launch(app);
    const since = new Date();
    const editorMail = async () => (c.editor ? app.fleetMail.count({to: `${c.editor}@mailinator.com`, subject: 'Revised Version Uploaded', since}).catch((e) => `threw ${L.flat(e.message, 80)}`) : null);
    let n = 0;
    const snap = async (name) => {
        const id = `a13-${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, await screen(page).catch((e) => ({url: page.url(), error: L.flat(e.message)})));
        await shot(page, id).catch(() => {});
    };
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) { o[key] = {threw: L.flat(e.message, 400)}; await snap(`${key}-threw`).catch(() => {}); }
        console.log(`[a13 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 1500));
        return o[key];
    };
    try {
        if (s.request) {
            await step('decision', async () => {                                                  // 1, 2
                const R = require('../../../../../apps/omp/playwright/pages/ReviewStagePages.js'); // the decision wizard is the same on a journal
                await signIn(page, 'dbarnes');
                await L.openWorkflow(page, app, s.id);
                await R.requestRevisions(page, R.workflowModal(page), s.request);
                await snap('decision-recorded');
                return {recorded: true, stored: L.stored(app, s.author, s.id)};
            });
        }
        await signIn(page, s.author);                                                               // 3
        await step('tasksBefore', async () => ({...(await L.tasks(page, app, s.id)), stored: L.stored(app, s.author, s.id)}));
        await snap('tasks-before');
        await step('roundBefore', async () => { await L.openWorkflow(page, app, s.id, {author: true}); return L.round(page); });
        await step('upload', () => L.uploadRevisions(page, c.component, L.smallFile(FILE)));          // 4
        await snap('after-upload');
        await step('tasksAfter', async () => ({...(await L.tasks(page, app, s.id)), stored: L.stored(app, s.author, s.id)})); // 5
        await snap('tasks-after');
        if (MODE === 'second') {
            await L.sleep(5000);
            o.editorMailAfterFirst = await editorMail();
            await step('secondUpload', async () => {                                                 // 6
                await L.openWorkflow(page, app, s.id, {author: true});
                return L.uploadRevisions(page, c.component, L.smallFile('h19v-second.txt'), L.listUploadButton(page));
            });
            await snap('after-second-upload');
            await L.sleep(5000);
            o.editorMailAfterSecond = await editorMail();
            await step('tasksAfterSecond', async () => ({...(await L.tasks(page, app, s.id)), stored: L.stored(app, s.author, s.id)}));
        }
    } catch (e) {
        o.error = L.flat(e.stack || e.message, 800);
        await snap('error').catch(() => {});
    } finally {
        record(`a13-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
