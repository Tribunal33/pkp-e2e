// U26 A9 issue walk: an author deletes the only revised file they uploaded in answer to "Request
// Revisions"; the round goes back to "Revisions have been requested." but the author's revisions task
// never comes back to the header's Tasks panel. On PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), context `publicknowledge`. The kit builds nothing. OPS has no review
// stage.
//
// MODE=walk (default):
//   OJS submission 13 (lkumiega; Review round 1, revisions already requested in the dataset).
//   OMP submission 16 (mpower; External Review round 1): first dbarnes records "Request Revisions"
//     (no new round), as the preconditions say.
//   1 sign in as the author, "My Submissions"; 2 "Tasks"; 3 open the submission, "Upload revisions",
//   the component, u26w1-revision.txt, "Continue", "Continue", "Complete"; 4 "Tasks"; 5 the row's
//   "More Actions" > "Delete", "OK"; 6 the round's status and the "My Submissions" row; 7 "Tasks".
// MODE=nb, OJS only, every step recorded, none throwing (run with the fix in and out): on OJS 13,
//   lkumiega uploads u26w1-first.txt and u26w1-second.txt and deletes the first: the round must stay
//   "submitted" and no task may come back.
// MODE=ce, the same method's copyediting branch (spec U32 A7), with the fix in and out:
//   dbarnes records "Accept Submission" on OJS 10 (OMP 16, after "Assign" of himself as "Press
//   editor" in "Participants"); on Copyediting, "Upload/Select Files" above
//   "Copyedited Files", u26w1-copyedit.txt, then that row's "Delete"; the notice above the lists is
//   read at each point.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/deleted-revision-no-task-back/walk.js
//               MODE=nb PROBE_RUN=nb-out … node bin/probe.js ojs …; MODE=ce PROBE_RUN=ce-out … node bin/probe.js ojs,omp …
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a9-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const H = require('../internal-revisions-request-gives-author-no-task/lib.js');
const L = require('../author-update-file-details-offered-then-refused/lib.js');
const D = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const CASES = {
    ojs: {
        component: 'Article Text',
        walk: {id: 13, author: 'lkumiega', request: false},
        nb: {id: 13, author: 'lkumiega'},
        ce: {id: 10, editor: 'dbarnes'},
    },
    omp: {
        component: 'Book Manuscript',
        walk: {id: 16, author: 'mpower', request: true},
        nb: null,
        // No editor is assigned to an External Review monograph in the dataset, and the notice is
        // shown to assigned editors only: dbarnes first assigns himself as "Press editor".
        ce: {id: 16, editor: 'dbarnes', assign: {name: 'Daniel Barnes', role: 'Press editor'}},
    },
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    if (!c || !c[MODE]) { console.log(`[a9 ${app.name} ${MODE}] nothing to walk on this app`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => {
        const data = await screen(page).catch((e) => ({url: page.url(), error: L.flat(e.message)}));
        const id = `a9-${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, data);
        await shot(page, id).catch(() => {});
    };
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) { o[key] = {threw: L.flat(e.message, 400)}; await snap(`${key}-threw`).catch(() => {}); }
        console.log(`[a9 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 1500));
        return o[key];
    };
    const tasks = (key, s) => step(key, async () => {
        const out = await H.authorSees(page, app, s.id);
        await snap(key);
        return {...out, stored: H.stored(app, s.author, s.id)};
    });
    try {
        if (MODE === 'walk') {
            const s = c.walk;
            if (s.request) {
                await step('request', async () => {
                    await signIn(page, 'dbarnes');
                    await H.openEditorial(page, app, s.id, 'Request Revisions');
                    const out = await H.recordDecision(page, 'Request Revisions');
                    await snap('request');
                    return {...out, decisions: H.decisions(app, s.id)};
                });
            }
            await step('signIn', async () => { await signIn(page, s.author); return {url: page.url()}; });          // 1
            await tasks('tasksBefore', s);                                                                          // 2
            await step('upload', async () => {                                                                      // 3
                const before = await D.authorRound(page, app, s.id);
                const out = await D.authorUpload(page, c.component, L.smallFile('u26w1-revision.txt'));
                await snap('uploaded');
                return {before, ...out};
            });
            await tasks('tasksAfterUpload', s);                                                                     // 4
            await step('delete', async () => {                                                                      // 5
                await D.authorRound(page, app, s.id);
                const out = await D.deleteFrom(page, D.LIST, 'u26w1-revision.txt');
                await snap('deleted');
                return out;
            });
            await step('roundAfterDelete', async () => {                                                            // 6
                const r = await D.authorRound(page, app, s.id);
                await snap('round-after-delete');
                return r;
            });
            await tasks('tasksAfterDelete', s);                                                                     // 6, 7
        } else if (MODE === 'nb') {
            const t = c.nb;
            await step('nbSignIn', async () => { await signIn(page, t.author); return {url: page.url()}; });
            await step('nbUploads', async () => {
                await D.authorRound(page, app, t.id);
                const first = await D.authorUpload(page, c.component, L.smallFile('u26w1-first.txt'));
                await D.authorRound(page, app, t.id);
                const second = await D.authorUpload(page, c.component, L.smallFile('u26w1-second.txt'));
                return {first, second};
            });
            await tasks('nbTasksAfterUploads', t);
            await step('nbDeleteFirst', async () => {
                await D.authorRound(page, app, t.id);
                const out = await D.deleteFrom(page, D.LIST, 'u26w1-first.txt');
                return {...out, after: await D.authorRound(page, app, t.id)};
            });
            await snap('nb-round-after-delete');
            await tasks('nbTasksAfterDelete', t);
        } else {
            const e = c.ce;
            await step('ceAccept', async () => {
                await signIn(page, e.editor);
                if (e.assign) {
                    const P = require('../no-changes-window-ok-reports-change/lib.js');
                    o.ceAssign = await P.assign(page, app, {submissionId: e.id, ...e.assign});
                }
                await H.openEditorial(page, app, e.id, 'Accept Submission');
                return H.recordDecision(page, 'Accept Submission');
            });
            await step('ceBefore', async () => { const r = await D.copyediting(page, app, e.id); await snap('ce-before'); return r; });
            await step('ceUpload', async () => {
                await D.copyeditUpload(page, c.component, L.smallFile('u26w1-copyedit.txt'));
                await page.goto('about:blank');
                const r = await D.copyediting(page, app, e.id);
                await snap('ce-uploaded');
                return r;
            });
            await step('ceDelete', async () => {
                const out = await D.deleteFrom(page, D.COPYEDITED, 'u26w1-copyedit.txt');
                const r = await D.copyediting(page, app, e.id);
                await snap('ce-deleted');
                return {...out, after: r};
            });
        }
    } catch (err) {
        o.error = L.flat(err.stack || err.message, 800);
        await snap('error').catch(() => {});
    } finally {
        record(`a9-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
