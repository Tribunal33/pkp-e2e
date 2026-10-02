// U26 A1 issue walk: after "Request Revisions" with a new review round ("Resubmit for Review"), the
// Author's "Upload revisions" button goes with their first file, while "Upload" above "Revisions
// Uploaded" still opens the upload window. On PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), journal or press `publicknowledge`. The kit builds nothing.
// A preprint server has no review rounds: not walked. Helpers:
// ../author-revisions-upload-offered-then-refused/lib.js.
//
// MODE=walk (default): OJS submission 10 (author jnovak); OMP submission 16 (mpower; external
//   review):
//   1 sign in as dbarnes, open the submission, "Request Revisions", "Revisions will be subject to
//   a new round of peer reviews.", "Next", the wizard to "Record Decision"; 2 sign in as the
//   author, open the submission from "My Submissions"; 3 "Upload revisions", the component,
//   u36f-revision.txt, "Continue", "Continue", "Complete"; 4 open the submission again and read
//   the two buttons; press "Upload" above "Revisions Uploaded"; 5 on "My Submissions" press "Tasks".
// MODE=nb, the neighbour alone (with a fix in and out), every step recorded, none throwing:
//   OJS 13 as lkumiega (round 1 asks for revisions without a new round): steps 2 to 4;
//   OJS 7 as dsokoloff (no revisions requested) and OJS 3 as ckwantes (accepted round): the buttons.
//   OMP 16: dbarnes records "Request Revisions" without a new round; mpower: steps 2 to 4.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/upload-revisions-button-gone-after-resubmit-upload/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a1-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('../author-update-file-details-offered-then-refused/lib.js');
const A = require('../author-revisions-upload-offered-then-refused/lib.js');

const MODE = process.env.MODE || 'walk';
const FILE = 'u36f-revision.txt';
const CASES = {
    ojs: {
        component: 'Article Text',
        walk: [{key: 'resubmit', id: 10, author: 'jnovak', request: {newRound: true}}],
        nb: [{key: 'inRound', id: 13, author: 'lkumiega'}, {key: 'noRevisions', id: 7, author: 'dsokoloff', readOnly: true}, {key: 'accepted', id: 3, author: 'ckwantes', readOnly: true, lastRound: true}],
    },
    omp: {
        component: 'Book Manuscript',
        walk: [{key: 'resubmitExternal', id: 16, author: 'mpower', request: {newRound: true}}],
        nb: [{key: 'inRound', id: 16, author: 'mpower', request: {newRound: false}}],
    },
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    if (!c) { console.log(`[a1 ${app.name}] no review rounds: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    const rounds = A.watchRounds(page);
    let n = 0;
    const snap = async (name) => {
        const data = await screen(page).catch((e) => ({url: page.url(), error: L.flat(e.message)}));
        const id = `a1-${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, data);
        await shot(page, id).catch(() => {});
    };
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) { o[key] = {threw: L.flat(e.message, 400)}; await snap(`${key}-threw`).catch(() => {}); }
        console.log(`[a1 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 1500));
        return o[key];
    };
    const read = (key, s, round) => step(key, async () => {
        await A.openWorkflow(page, app, s.id, {author: true, round});
        const out = {...(await A.offers(page)), rounds: rounds.last(), stored: A.storedRounds(app, s.id)};
        await snap(key);
        return out;
    });
    try {
        for (const s of c[MODE]) {
            if (s.request) {
                await step(`${s.key}Decision`, async () => {                                       // 1
                    const R = require('../../../../../apps/omp/playwright/pages/ReviewStagePages.js'); // the decision wizard is the same on a journal
                    await signIn(page, 'dbarnes');
                    await A.openWorkflow(page, app, s.id);
                    await R.requestRevisions(page, R.workflowModal(page), s.request);
                    return {recorded: true, stored: A.storedRounds(app, s.id)};
                });
            }
            await signIn(page, s.author);                                                         // 2
            const round = s.lastRound ? A.storedRounds(app, s.id).pop() : null;
            const before = await read(`${s.key}Before`, s, round);
            if (s.readOnly) continue;
            if (before && before.uploadRevisions) {
                await step(`${s.key}Upload`, () => A.uploadThrough(page, A.uploadRevisionsButton(page), c.component, L.smallFile(FILE))); // 3
                await step(`${s.key}AtClose`, async () => { await idle(page); await A.listTable(page).getByText(FILE).first().waitFor({timeout: 30_000}).catch(() => {}); return {...(await A.offers(page)), rounds: rounds.last()}; }); // the page as the window left it
                await snap(`${s.key}-at-close`);
            }
            const after = await read(`${s.key}After`, s, round);                                  // 5
            if (after && after.upload) {
                await step(`${s.key}PressUpload`, () => A.press(page, A.uploadButton(page)));
                await snap(`${s.key}-upload-window`);
            }
            await step(`${s.key}Tasks`, () => A.tasks(page, app));
            await snap(`${s.key}-tasks`);
        }
    } catch (e) {
        o.error = L.flat(e.stack || e.message, 800);
        await snap('error').catch(() => {});
    } finally {
        record(`a1-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
