// U23 A4 + A6 issue walk (docs/issues/U23-A4-A6-review-popover-cancelled-overdue-wording.md): on the
// editorial dashboard, the popover of a review request the editor cancelled reads "Reviewer
// cancelled review request" / "Reviewer has cancelled the review request on {date}.", and the
// popover of an accepted review gone overdue reads "This reviewer has not completed their review. A
// response was due on {review due date}." On PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), journal or press `publicknowledge`. The kit builds nothing. A
// preprint server has no review: not walked.
//
// MODE=walk (default), as dbarnes, OJS submission 12 (Julie Janssen, Paul Hudson), OMP
//   submission 2 (Al Zacharia, Gonzalo Favio), neither reviewer answered:
//   2 "Log Response" accepted for reviewer A; 3 "Edit": Response Due Date 14 days ago, Review Due
//   Date 7 days ago; 4 "Log Response" accepted for reviewer B; 5 "Cancel Reviewer" for B, the
//   panel's rows read; 6-8 "Active submissions", every indicator of the row opened and read.
// MODE=nb, the neighbour alone (with a fix in and out), on a freshly loaded dataset, every step
//   recorded, none throwing: reviewer A left unanswered with "Response Due Date" 14 days ago
//   (Review Due Date 7 days ahead) gives the response-overdue popover; reviewer B logged as
//   declined gives the declined popover. Neither text may change with the fix.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/review-popover-cancelled-overdue-wording/walk.js
//               (then omp, after a reset)
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a4a6-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    if (!c) { console.log(`[a4a6 ${app.name}] no review: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE, today: H.day(0).toISOString().slice(0, 10)};
    const {page, close} = await launch(app);
    let modal = null;
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) { o[key] = {threw: H.flat(e.message, 400)}; }
        console.log(`[a4a6 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 2500));
        record(`a4a6-${MODE}-${key}`, await screen(page).catch(() => ({url: page.url()})));
        await shot(page, `a4a6-${MODE}-${key}`).catch(() => {});
        return o[key];
    };
    try {
        await step('signin', async () => {                                                   // 1
            await signIn(page, 'dbarnes');
            modal = await H.openWorkflow(page, app, c.id);
            return {a: await H.panelRow(modal, c.a.name), b: await H.panelRow(modal, c.b.name)};
        });
        if (MODE === 'nb') {
            await step('responseOverdue', () => H.editDates(page, modal, c.a.name, H.day(-14), H.day(7)));
            await step('declined', () => H.logResponse(page, modal, c.b.name, 'Reviewer has declined the invitation to review'));
            await step('popovers', () => H.readPopovers(page, app, c.id));
            o.responseOverduePopover = H.popoverOf(o.popovers, c.a.name);
            o.declinedPopover = H.popoverOf(o.popovers, c.b.name);
        } else {
            await step('acceptA', () => H.logResponse(page, modal, c.a.name, 'Reviewer has accepted the invitation to review'));   // 2
            await step('overdueA', () => H.editDates(page, modal, c.a.name, H.day(-14), H.day(-7)));                             // 3
            await step('acceptB', () => H.logResponse(page, modal, c.b.name, 'Reviewer has accepted the invitation to review'));   // 4
            await step('cancelB', async () => {                                                                                   // 5
                const r = await H.cancelReviewer(page, modal, c.b.name);
                return {...r, tooltip: await H.rowTooltip(page, modal, c.b.name).catch(() => null), rowA: await H.panelRow(modal, c.a.name)};
            });
            await step('popovers', () => H.readPopovers(page, app, c.id));                                                       // 6-8
            o.overduePopover = H.popoverOf(o.popovers, c.a.name);                                                                 // 7
            o.cancelledPopover = H.popoverOf(o.popovers, c.b.name);                                                               // 8
        }
    } finally {
        record(`a4a6-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
