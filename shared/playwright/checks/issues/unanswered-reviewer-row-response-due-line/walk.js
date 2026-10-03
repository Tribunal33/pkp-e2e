// U27 A7 and A2 issue walk (docs/issues/U27-A7-request-sent-row-no-response-due.md and
// docs/issues/U27-A2-request-resent-row-shows-review-deadline.md; one fix each, fix-a7.diff and
// fix-a2.diff beside this file): the Reviewers table's status cell on an unanswered request. A "Request Sent" row shows no
// "Response due:" line (A7); a "Request Resent" row's "Response due:" line prints the review due
// date (A2). On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), journal
// or press `publicknowledge`. The kit builds nothing. A preprint server has no review: not walked.
//
// MODE=walk (default): OJS submission 12, OMP submission 17, both reviewers unanswered:
//   1-2 dbarnes opens the workflow, reads Julie Janssen's row; 3 its "Edit" window's dates, Cancel;
//   4-5 jjanssen declines; 6 dbarnes reads the row; 7 "Resend Review Request" with response due
//   today+14 and review due today+42; 8 reads the row (and again after a reload).
// MODE=nb, the neighbour alone (with a fix in and out), every step recorded, none throwing:
//   dbarnes sets Paul Hudson's dates to today+14 / today+42 through "Edit" and reads the row
//   ("Request Sent"); phudson accepts; dbarnes reads the row ("Request Accepted", "Review due:").
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/unanswered-reviewer-row-response-due-line/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a2a7-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    if (!c) { console.log(`[a2a7 ${app.name}] no review: not walked`); return; }
    const R = H.day(14), V = H.day(42);
    const o = {app: app.name, line: app.line || 'main', mode: MODE, responseDue: R.toDateString(), reviewDue: V.toDateString()};
    const {page, close} = await launch(app);
    let modal = null;
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) { o[key] = {threw: H.flat(e.message, 400)}; }
        console.log(`[a2a7 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 1500));
        record(`a2a7-${MODE}-${key}`, await screen(page).catch(() => ({url: page.url()})));
        await shot(page, `a2a7-${MODE}-${key}`).catch(() => {});
        return o[key];
    };
    try {
        if (MODE === 'nb') {
            await step('nbEdit', async () => {
                await signIn(page, 'dbarnes');
                modal = await H.workflow(page, app, c.id);
                const set = await H.setEditDates(page, modal, c.nb.name, R, V);
                modal = await H.workflow(page, app, c.id);
                return {...set, row: await H.readRow(modal, c.nb.name)};
            });
            await step('nbAccept', async () => {
                await signIn(page, c.nb.user);
                return H.accept(page, app, c.id);
            });
            await step('nbAccepted', async () => {
                await signIn(page, 'dbarnes');
                modal = await H.workflow(page, app, c.id);
                return {row: await H.readRow(modal, c.nb.name)};
            });
        } else {
            await step('sent', async () => {                                                   // 1-2
                await signIn(page, 'dbarnes');
                modal = await H.workflow(page, app, c.id);
                return {row: await H.readRow(modal, c.declines.name), other: await H.readRow(modal, c.nb.name)};
            });
            await step('editDates', () => H.readEditDates(page, modal, c.declines.name));    // 3
            await step('decline', async () => {                                                // 4-5
                await signIn(page, c.declines.user);
                return H.decline(page, app, c.id);
            });
            await step('declined', async () => {                                               // 6
                await signIn(page, 'dbarnes');
                modal = await H.workflow(page, app, c.id);
                return {row: await H.readRow(modal, c.declines.name)};
            });
            await step('resend', async () => {                                                 // 7
                const r = await H.resend(page, modal, c.declines.name, R, V);
                return {...r, rowAtOnce: await H.readRow(modal, c.declines.name).catch((e) => ({threw: H.flat(e.message, 200)}))};
            });
            await step('resent', async () => {                                                 // 8
                modal = await H.workflow(page, app, c.id);
                return {row: await H.readRow(modal, c.declines.name)};
            });
        }
    } finally {
        record(`a2a7-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
