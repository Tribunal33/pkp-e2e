// U28 A5 issue walk (docs/issues/U28-A5-accepted-review-row-due-date-clock-time.md): once a
// reviewer accepts a request, the row of their list reads "Please complete this review by
// 2026-10-30 00:00:00." On PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"), journal or press `publicknowledge`. The kit builds nothing. A preprint server has no
// review: not walked.
//
// MODE=walk (default): OJS submission 12, OMP submission 17; `phudson` has not answered round 1:
//   1 sign in as phudson, "Action Required by me", read the row; 2 "Respond to request" on the
//   row, "Accept Review, Continue to Step #2"; 3 "Action Required by me" again, read the row.
// MODE=nb, the neighbour alone (with a fix in and out), changes nothing, every step recorded,
//   none throwing: jjanssen's unanswered row on the same submission, and a submitted review's row
//   under "All assignments" (OJS amccrae 10, OMP agallego 16).
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/accepted-review-row-due-date-clock-time/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a5-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const H = require('./lib.js');
const L = require('../reviewer-own-round-listed-under-previous-reviews/lib.js');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    if (!c) { console.log(`[a5 ${app.name}] no review: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) { o[key] = {threw: H.flat(e.message, 400)}; }
        console.log(`[a5 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 2000));
        record(`a5-${MODE}-${key}`, await screen(page).catch(() => ({url: page.url()})));
        await shot(page, `a5-${MODE}-${key}`).catch(() => {});
        return o[key];
    };
    try {
        if (MODE === 'nb') {
            await step('unanswered', async () => {
                await signIn(page, 'jjanssen');
                return H.openRow(page, app, 'reviewer-action-required', c.id);
            });
            await step('submitted', async () => {
                await signIn(page, c.submitted.reviewer);
                return H.openRow(page, app, 'reviewer-assignments-all', c.submitted.id);
            });
        } else {
            await step('before', async () => {                                               // 1
                await signIn(page, 'phudson');
                const landed = page.url().replace(/^https?:\/\/[^/]+/, '');
                return {landed, ...(await H.openRow(page, app, 'reviewer-action-required', c.id))};
            });
            await step('accept', async () => {                                               // 2
                const opened = await H.respond(page, c.id, 'Respond to request');
                return {...opened, ...(await L.acceptReview(page))};
            });
            await step('after', () => H.openRow(page, app, 'reviewer-action-required', c.id)); // 3
        }
    } finally {
        record(`a5-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
