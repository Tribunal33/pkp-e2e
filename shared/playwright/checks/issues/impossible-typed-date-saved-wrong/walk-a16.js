// Issue report docs/issues/U13-OJS8-impossible-typed-date-saved-wrong.md, the steps U27 A16 adds
// (a date typed in another format, month/day/year, in a review's "Edit" and "Add Reviewer"
// windows), walked through the screens on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"), `publicknowledge`, as `dbarnes`. OJS submission 12, OMP submission 17.
//
// The kit builds nothing. Everything goes through the screens:
//   Editing: Paul Hudson's row, "Edit", "Review Due Date" "11/12/2030", Tab, "OK", "Edit" again.
//   Adding:  "Add Reviewer", Aisla McCrae, "Review Due Date" "11/12/2030", Tab, "Add Reviewer";
//            her row's "Edit"; her request email.
// `neighbour` as the argument runs only the neighbour check instead: Paul Hudson's row, "Edit",
// "Review Due Date" typed "2030-11-12" (the display format), "OK", "Edit" again: it must save.
//
// Reset first:  npm run fleet-prep -- --feature issues-k3 --dataset 3 --reset
// Run (main):   ONLY=ojs,omp PROBE_FEATURE=issues-k3 PROBE_AGENT=k3 node bin/probe.js all shared/playwright/checks/issues/impossible-typed-date-saved-wrong/walk-a16.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-k3-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 ONLY=ojs,omp PROBE_FEATURE=issues-k3-3_5 PROBE_AGENT=k3 node bin/probe.js all shared/playwright/checks/issues/impossible-typed-date-saved-wrong/walk-a16.js
// Facts: .reports/<feature>/k3/a16[nb][-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, record, sql, idle} = require('../../../probe');
const {T, flat, readDate, typeDate, pressOk, openEditReview, openAddReviewer, pressAdd, mailWithDates} = require('./lib');

const NEIGHBOUR = process.argv.includes('neighbour');
const REVIEW = {ojs: 12, omp: 17};
const EDITED = {name: 'Paul Hudson', username: 'phudson'};
const ADDED = {name: 'Aisla McCrae', username: 'amccrae', search: 'McCrae'};
const DATES = ['responseDueDate', 'reviewDueDate'];

forEachApp(async (app) => {
    const sid = REVIEW[app.name];
    if (!sid) return; // OPS has no review windows
    const {page, close} = await launch(app);
    const facts = {line: app.line, dataset: app.dataset, mode: NEIGHBOUR ? 'neighbour' : 'steps', steps: []};
    const push = (step, o) => facts.steps.push({step, ...o});
    const stored = (u) => sql(app, `select ra.date_response_due, ra.date_due from review_assignments ra join users u on u.user_id = ra.reviewer_id where ra.submission_id = ${sid} and u.username = '${u}'`);
    const step = async (name, fn) => {
        try { push(name, await fn()); } catch (e) { push(name, {error: flat(String(e && e.message), 400)}); }
    };
    try {
        await signIn(page, 'dbarnes');
        // Editing (E1–E5), or the neighbour (a date typed in the display format)
        const text = NEIGHBOUR ? '2030-11-12' : '11/12/2030';
        let form;
        await step('E2 opened', async () => {
            form = await openEditReview(page, app, sid, EDITED.name);
            return {reviewDueDate: await readDate(form, 'reviewDueDate'), stored: stored(EDITED.username)};
        });
        await step(`E3 typed "${text}"`, async () => ({date: await typeDate(page, form, 'reviewDueDate', text)}));
        const since = new Date();
        await step('E4 OK', async () => pressOk(page, form, DATES, `a16-${NEIGHBOUR ? 'nb' : 'e4'}-ok`));
        await step('E5 reopened', async () => {
            form = await openEditReview(page, app, sid, EDITED.name);
            return {reviewDueDate: await readDate(form, 'reviewDueDate'), stored: stored(EDITED.username)};
        });
        await step('E mail', async () => mailWithDates(app, `${EDITED.username}@mailinator.com`, since, /./));
        if (!NEIGHBOUR) {
            // Adding (A1–A5)
            let win;
            await step('A1-2 opened', async () => {
                await page.goto('about:blank');
                await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${sid}`));
                const modal = page.locator('[data-cy="active-modal"]').first();
                await modal.locator('[data-cy="reviewer-manager"]').waitFor({timeout: T});
                await idle(page);
                win = await openAddReviewer(page, modal, ADDED);
                return {responseDueDate: await readDate(win, 'responseDueDate'), reviewDueDate: await readDate(win, 'reviewDueDate')};
            });
            await step('A3 typed "11/12/2030"', async () => ({date: await typeDate(page, win, 'reviewDueDate', '11/12/2030')}));
            const since2 = new Date();
            await step('A4 Add Reviewer', async () => pressAdd(page, win, 'a16-a4-add'));
            await step('A5 stored', async () => ({stored: stored(ADDED.username)}));
            await step('A5 Edit', async () => {
                const f = await openEditReview(page, app, sid, ADDED.name);
                return {reviewDueDate: await readDate(f, 'reviewDueDate')};
            });
            await step('A5 mail', async () => mailWithDates(app, `${ADDED.username}@mailinator.com`, since2, /./));
        }
        await signOut(page).catch(() => {});
    } finally {
        record(NEIGHBOUR ? 'a16nb' : 'a16', facts);
        for (const s of facts.steps) console.log(`step ${s.step}`, flat(JSON.stringify(s), 1200));
        await close();
    }
});
