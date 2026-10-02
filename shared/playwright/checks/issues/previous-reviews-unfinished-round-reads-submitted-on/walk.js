// U28 A2 issue walk: a reviewer asked again on a later round reads "Round 1 Review Submitted on "
// with no date under "Previous Reviews" for a round they never finished. On PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), journal or press `publicknowledge`. The
// kit builds nothing. A preprint server has no review: not walked. Helpers:
// ../reviewer-own-round-listed-under-previous-reviews/lib.js.
//
// MODE=walk (default): OJS submission 12 (round 1), OMP submission 17 (Internal Review round 1);
//   on both, phudson and jjanssen have not answered round 1:
//   1 sign in as phudson, open the review, "Accept Review, Continue to Step #2"; 2 sign in as
//   dbarnes, open the submission, "Create New Review Round", through to "Record Decision"; 3 on
//   round 2, "Add Reviewer" for Paul Hudson, then for Julie Janssen; 4 phudson opens the review and
//   5 presses "Read Round 1 Review"; 6 jjanssen opens the review.
// MODE=nb, the neighbour alone (with a fix in and out), every step recorded, none throwing:
//   a submitted round 1 still reads "Round 1 Review Submitted on {date}".
//   OJS 10 as amccrae, OMP 16 as agallego: dbarnes records "Create New Review Round", "Add
//   Reviewer" with the same person; the reviewer opens the review.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/previous-reviews-unfinished-round-reads-submitted-on/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a2-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('../reviewer-own-round-listed-under-previous-reviews/lib.js');

const MODE = process.env.MODE || 'walk';
const PEOPLE = [
    {reviewer: 'phudson', name: 'Paul Hudson', search: 'Hudson', accepts: true},
    {reviewer: 'jjanssen', name: 'Julie Janssen', search: 'Janssen', accepts: false},
];
const CASES = {
    ojs: {walk: {id: 12}, nb: {id: 10, reviewer: 'amccrae', name: 'Aisla McCrae', search: 'McCrae'}},
    omp: {walk: {id: 17}, nb: {id: 16, reviewer: 'agallego', name: 'Adela Gallego', search: 'Gallego'}},
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    if (!c) { console.log(`[a2 ${app.name}] no review: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) {
            o[key] = {threw: L.flat(e.message, 400)};
            record(`a2-${MODE}-${key}-threw`, await screen(page).catch(() => ({url: page.url()})));
            await shot(page, `a2-${MODE}-${key}-threw`).catch(() => {});
        }
        console.log(`[a2 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 2500));
        return o[key];
    };
    try {
        if (MODE === 'nb') {
            await L.reassignedAfterSubmitted(page, app, c.nb, step, 'a2-nb');
        } else {
            const id = c.walk.id;
            await step('accept', async () => {                                               // 1
                await signIn(page, 'phudson');
                const before = await L.readReviewPage(page, app, id, 'a2-1-before');
                return {before, ...(await L.acceptReview(page))};
            });
            await step('round2', async () => {                                               // 2
                await signIn(page, 'dbarnes');
                const modal = await L.openWorkflow(page, app, id);
                return L.recordDecision(page, modal, 'Create New Review Round');
            });
            await step('added', async () => {                                                // 3
                const modal = await L.openWorkflow(page, app, id);
                const out = {heading: await L.workflowHeading(modal), people: []};
                for (const p of PEOPLE) out.people.push(await L.addReviewer(page, modal, p));
                return out;
            });
            for (const p of PEOPLE) {                                                        // 4, 5, 6
                await step(p.accepts ? 'accepted' : 'unanswered', async () => {
                    await signIn(page, p.reviewer);
                    return L.readReviewPage(page, app, id, `a2-${p.accepts ? '4-accepted' : '6-unanswered'}`);
                });
            }
        }
    } finally {
        record(`a2-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
