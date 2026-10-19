// U26 A14 issue walk: with two authors on the review stage, a revised file clears the revisions
// task of one author only; the other keeps "Revision required." in their Tasks panel. On PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"), journal or press
// `publicknowledge`; the second author is assigned on screen, the kit builds nothing. A preprint
// server has no review rounds: not walked. Helpers: lib.js beside this file.
//
// MODE=walk (default): OJS submission 7 (author dsokoloff; second author ccorino, Carlo Corino;
//   "Article Text"); OMP submission 18 (zzedd; second author afinkel, Alvin Finkel; "Book Manuscript"):
//   1 sign in as dbarnes, open the submission; 2 "Participants" > "Assign", "Author", search the
//   second author's surname, choose them, "OK"; 3 "Request Revisions", leave "Revisions will not be
//   subject to a new round of peer reviews.", "Next", the wizard to "Record Decision"; 4, 5 each
//   author's "Tasks"; 6 the submitting author opens the submission, "Upload revisions", the
//   component, h19v-revision.txt, "Continue", "Continue", "Complete"; 7, 8 each author's "Tasks"
//   and their row on "My Submissions".
// MODE=resubmit: the same steps with "Revisions will be subject to a new round of peer reviews."
//   chosen in step 3, for the trial of this fix together with U26 A13's (fix-with-a13.diff).
// MODE=nb, the neighbour alone (with a fix in and out), every step recorded, none throwing: one
//   author on the stage (OJS 13, lkumiega, whose round already asks for revisions, so no decision
//   is recorded; OMP 16, mpower, after "Request Revisions" without a new round): the task before
//   the upload and none after it.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/co-author-revisions-task-stays-after-upload/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a14-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const FILE = 'h19v-revision.txt';
const CASES = {
    ojs: {
        component: 'Article Text',
        walk: {id: 7, author: 'dsokoloff', second: {username: 'ccorino', query: 'Corino', name: 'Carlo Corino'}, request: {newRound: false}},
        nb: {id: 13, author: 'lkumiega', second: null, request: null},
    },
    omp: {
        component: 'Book Manuscript',
        walk: {id: 18, author: 'zzedd', second: {username: 'afinkel', query: 'Finkel', name: 'Alvin Finkel'}, request: {newRound: false}},
        nb: {id: 16, author: 'mpower', second: null, request: {newRound: false}},
    },
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    if (!c) { console.log(`[a14 ${app.name}] no review rounds: not walked`); return; }
    const s = MODE === 'resubmit' ? {...c.walk, request: {newRound: true}} : c[MODE];
    const authors = [s.author, ...(s.second ? [s.second.username] : [])];
    const o = {app: app.name, line: app.line || 'main', mode: MODE, submission: s.id, authors};
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => {
        const id = `a14-${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, await screen(page).catch((e) => ({url: page.url(), error: L.flat(e.message)})));
        await shot(page, id).catch(() => {});
    };
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) { o[key] = {threw: L.flat(e.message, 400)}; await snap(`${key}-threw`).catch(() => {}); }
        console.log(`[a14 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 1500));
        return o[key];
    };
    const readTasks = async (when) => {
        for (const u of authors) {
            await signIn(page, u);
            await step(`tasks${when}_${u}`, async () => ({...(await L.tasks(page, app, s.id)), stored: L.stored(app, u, s.id)}));
            await snap(`tasks-${when.toLowerCase()}-${u}`);
        }
    };
    try {
        if (s.second || s.request) {
            const R = require('../../../../../apps/omp/playwright/pages/ReviewStagePages.js'); // the same windows on a journal
            await signIn(page, 'dbarnes');                                                         // 1
            if (s.second) {
                await step('assign', async () => {                                                   // 2
                    await L.openWorkflow(page, app, s.id);
                    await R.assignParticipant(page, R.workflowModal(page), {group: 'Author', query: s.second.query, resultName: s.second.name});
                    await snap('assigned');
                    return {assigned: s.second.username, stageAuthors: L.stageAuthors(app, s.id)};
                });
            }
            if (s.request) {
                await step('decision', async () => {                                                 // 3
                    await L.openWorkflow(page, app, s.id);
                    await R.requestRevisions(page, R.workflowModal(page), s.request);
                    await snap('decision-recorded');
                    return {recorded: true};
                });
            }
        }
        await readTasks('Before');                                                                   // 4, 5
        await signIn(page, s.author);                                                                // 6
        await step('roundBefore', async () => { await L.openWorkflow(page, app, s.id, {author: true}); return L.round(page); });
        await step('upload', () => L.uploadRevisions(page, c.component, L.smallFile(FILE)));
        await snap('after-upload');
        await readTasks('After');                                                                    // 7, 8
        o.stageAuthors = L.stageAuthors(app, s.id);
    } catch (e) {
        o.error = L.flat(e.stack || e.message, 800);
        await snap('error').catch(() => {});
    } finally {
        record(`a14-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
