// U71 OMP1 issue walk: after "Request Revisions" on a press's Internal Review the author gets no
// task in the header's Tasks panel, where External Review's request gives "Revisions to consider in
// External Review.". On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// press or journal `publicknowledge`. The kit builds nothing. Internal Review exists on a press
// only: the walk runs on OMP; the neighbour also on OJS, which the fix's file reaches.
//
// MODE=walk (default), OMP:
//   submission 17 (author msmith; Internal Review round 1):
//   1 sign in as dbarnes, open the submission from the dashboard; 2 "Request Revisions";
//   3 the decision's steps, "Record Decision"; 4 sign in as msmith, "My Submissions";
//   5 press "Tasks" in the header.
//   Control, submission 16 (mpower; External Review round 1): the same, with the entry window's
//   "Revisions will not be subject to a new round of peer reviews." left chosen and "Next".
// MODE=nb, the neighbour alone (with a fix in and out), every step recorded, none throwing:
//   OMP 12 (lelder; Internal Review): "Request Revisions"; the author's Tasks; the author uploads
//     u71a-revision.txt with "Upload revisions"; Tasks again.
//   OMP 9 (fperini; Internal Review): "Request Revisions"; Tasks; dbarnes records "Send to External
//     Review"; Tasks again.
//   OJS 10 (jnovak): "Request Revisions" without a new round; the author's Tasks.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/internal-revisions-request-gives-author-no-task/walk.js
//               MODE=nb PROBE_RUN=nb … node bin/probe.js ojs,omp …
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/omp1-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('../author-update-file-details-offered-then-refused/lib.js');
const A = require('../author-revisions-upload-offered-then-refused/lib.js');
const H = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const FILE = 'u71a-revision.txt';
const REQUEST = 'Request Revisions';
const CASES = {
    omp: {
        component: 'Book Manuscript',
        walk: [{key: 'internal', id: 17, author: 'msmith'}, {key: 'external', id: 16, author: 'mpower'}],
        nb: [{key: 'upload', id: 12, author: 'lelder', then: 'upload'}, {key: 'sentOn', id: 9, author: 'fperini', then: 'Send to External Review'}],
    },
    ojs: {
        component: 'Article Text',
        walk: [],
        nb: [{key: 'journal', id: 10, author: 'jnovak'}],
    },
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    if (!c || !c[MODE].length) { console.log(`[omp1 ${app.name} ${MODE}] nothing to walk on this app`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => {
        const data = await screen(page).catch((e) => ({url: page.url(), error: L.flat(e.message)}));
        const id = `omp1-${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, data);
        await shot(page, id).catch(() => {});
    };
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) { o[key] = {threw: L.flat(e.message, 400)}; await snap(`${key}-threw`).catch(() => {}); }
        console.log(`[omp1 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 1500));
        return o[key];
    };
    // dbarnes opens the submission and records the decision `label`.
    const decide = (key, s, label) => step(key, async () => {
        await signIn(page, 'dbarnes');                                                            // 1
        const opened = await H.openEditorial(page, app, s.id, label);
        await snap(`${key}-workflow`);
        const wizard = await H.recordDecision(page, label);                                       // 2, 3
        await snap(`${key}-recorded`);
        return {opened, ...wizard, decisions: H.decisions(app, s.id)};
    });
    // The author's "My Submissions" row and Tasks panel.
    const tasks = (key, s) => step(key, async () => {
        await signIn(page, s.author);                                                             // 4
        const out = await H.authorSees(page, app, s.id);                                          // 5
        await snap(key);
        return {...out, stored: H.stored(app, s.author, s.id)};
    });
    try {
        for (const s of c[MODE]) {
            await decide(`${s.key}Decision`, s, REQUEST);
            await tasks(`${s.key}Tasks`, s);
            if (s.then === 'upload') {
                await step(`${s.key}Upload`, async () => {
                    await A.openWorkflow(page, app, s.id, {author: true});
                    return A.uploadThrough(page, A.uploadRevisionsButton(page), c.component, L.smallFile(FILE));
                });
                await tasks(`${s.key}TasksAfter`, s);
            } else if (s.then) {
                await decide(`${s.key}Then`, s, s.then);
                await tasks(`${s.key}TasksAfter`, s);
            }
        }
    } catch (e) {
        o.error = L.flat(e.stack || e.message, 800);
        await snap('error').catch(() => {});
    } finally {
        record(`omp1-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
