// U28 A18 issue walk (docs/issues/U28-A18-review-due-today-reads-overdue.md): on its due date a
// review already reads as overdue, for the reviewer ("Deadline for completing this review has
// passed.") and the editor ("Overdue", "Reviews overdue"); a request whose response and review
// are both due today offers "Finish review". On PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), journal or press `publicknowledge`. The kit builds nothing. A
// preprint server has no review: not walked. "Today" is the server's date (UTC on the fleets).
//
// MODE=walk (default): OJS submission 12, OMP submission 17; jjanssen and phudson unanswered:
//   1 jjanssen reads her row; 2 "Respond to request", the privacy-consent box ticked, "Accept
//   Review, Continue to Step #2";
//   3 reads the row again; 4-6 dbarnes sets both due dates of both rows to today ("Edit", "OK");
//   7 reads both rows and "Reviews overdue"; 8 jjanssen reads her row; 9 phudson reads his row
//   and presses its button.
// MODE=nb, the neighbour alone (with a fix in and out), every step recorded, none throwing: the
//   same with yesterday's date (jjanssen accepts first): both still late.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/review-due-today-reads-overdue/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a18-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    if (!c) { console.log(`[a18 ${app.name}] no review: not walked`); return; }
    const date = H.day(MODE === 'nb' ? -1 : 0);
    const o = {app: app.name, line: app.line || 'main', mode: MODE, date: date.toDateString(), serverNow: new Date().toISOString()};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) { o[key] = {threw: H.flat(e.message, 400)}; }
        console.log(`[a18 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 2000));
        record(`a18-${MODE}-${key}`, await screen(page).catch(() => ({url: page.url()})));
        await shot(page, `a18-${MODE}-${key}`).catch(() => {});
        return o[key];
    };
    try {
        await step('s1-before', async () => {                                                   // 1
            await signIn(page, c.accepts.user);
            return H.reviewerRow(page, app, c.id);
        });
        if (MODE === 'nb') {
            await step('s2-accept', () => H.accept(page, app, c.id));
        } else {
            await step('s2-accept', async () => {                                                 // 2
                const opened = await H.respond(page, c.id, 'Respond to request');
                return {...opened, ...(await H.acceptReview(page))};
            });
            await step('s3-accepted', () => H.reviewerRow(page, app, c.id));                     // 3
        }
        await step('s5-6-edit', async () => {                                                    // 4-6
            await signIn(page, 'dbarnes');
            return H.setBothRows(page, app, c, date);
        });
        await step('s7-editor-rows', () => H.editorRows(page, app, c));                          // 7
        await step('s7-reviews-overdue', () => H.reviewsOverdue(page, app, c.id));
        await step('s8-accepted-row', async () => {                                              // 8
            await signIn(page, c.accepts.user);
            return H.reviewerRow(page, app, c.id);
        });
        await step('s9-unanswered-row', async () => {                                            // 9
            await signIn(page, c.unanswered.user);
            return H.reviewerRow(page, app, c.id);
        });
        if (MODE !== 'nb') {
            await step('s9-press', async () => {
                const row = o['s9-unanswered-row'] && o['s9-unanswered-row'].row;
                const button = row && row.action ? row.action : 'Finish review';
                return {pressed: button, ...(await H.respond(page, c.id, button))};
            });
        }
    } finally {
        record(`a18-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
