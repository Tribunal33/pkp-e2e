// U28 A12 issue walk: a reviewer whose round is no longer the submission's latest finds their own
// review listed under "Previous Reviews" on their review page. On PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"), journal or press `publicknowledge`. The kit builds
// nothing. A preprint server has no review: not walked. Helpers: ./lib.js.
//
// MODE=walk (default):
//   OJS submission 7 (round 1: phudson submitted, amccrae has not answered):
//   1 sign in as phudson, open the review (no box); 2 sign in as dbarnes, open the submission,
//   "Create New Review Round", through to "Record Decision"; 3 phudson opens the review again and
//   4 presses "Read Round 1 Review"; 5 amccrae opens her review and presses "Read Round 1 Review".
//   OMP submission 12 (Internal Review round 1: phudson submitted, jjanssen has not answered):
//   the same, step 2 being "Send to External Review".
// MODE=nb, the neighbour alone (with a fix in and out), every step recorded, none throwing:
//   a reviewer who submitted round 1 and is asked again on round 2 still reads the round-1 line.
//   OJS 10 as amccrae, OMP 16 as agallego: dbarnes records "Create New Review Round", "Add
//   Reviewer" with the same person; the reviewer opens the review.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/reviewer-own-round-listed-under-previous-reviews/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a12-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const CASES = {
    ojs: {
        walk: {id: 7, decision: 'Create New Review Round', submitted: 'phudson', unanswered: 'amccrae'},
        nb: {id: 10, reviewer: 'amccrae', name: 'Aisla McCrae', search: 'McCrae'},
    },
    omp: {
        walk: {id: 12, decision: 'Send to External Review', submitted: 'phudson', unanswered: 'jjanssen'},
        nb: {id: 16, reviewer: 'agallego', name: 'Adela Gallego', search: 'Gallego'},
    },
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    if (!c) { console.log(`[a12 ${app.name}] no review: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) {
            o[key] = {threw: L.flat(e.message, 400)};
            record(`a12-${MODE}-${key}-threw`, await screen(page).catch(() => ({url: page.url()})));
            await shot(page, `a12-${MODE}-${key}-threw`).catch(() => {});
        }
        console.log(`[a12 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 2500));
        return o[key];
    };
    try {
        if (MODE === 'nb') {
            await L.reassignedAfterSubmitted(page, app, c.nb, step, 'a12-nb');
        } else {
            const w = c.walk;
            await step('before', async () => { await signIn(page, w.submitted); return L.readReviewPage(page, app, w.id, 'a12-1-before'); }); // 1
            await step('decision', async () => {                                                                                         // 2
                await signIn(page, 'dbarnes');
                const modal = await L.openWorkflow(page, app, w.id);
                const d = await L.recordDecision(page, modal, w.decision);
                return {...d, headingAfter: await L.workflowHeading(await L.openWorkflow(page, app, w.id))};
            });
            await step('submitted', async () => { await signIn(page, w.submitted); return L.readReviewPage(page, app, w.id, 'a12-3-submitted'); });   // 3, 4
            await step('unanswered', async () => { await signIn(page, w.unanswered); return L.readReviewPage(page, app, w.id, 'a12-5-unanswered'); }); // 5
        }
    } finally {
        record(`a12-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
