// Issue report docs/issues/U50-A4-refused-save-date-published-today.md (U50 A4), the review window's
// group of the Steps: on PKP's default test dataset, dbarnes opens the workflow of OJS submission 12
// / OMP submission 17, Julie Janssen's reviewer row › "More Actions" › "Edit", empties "Review Due
// Date" from the keyboard, presses "OK" (refused), reads the box, presses "OK" again, then reopens
// the window. Records the visible boxes, the hidden fields "OK" posts and the stored due dates.
// OPS has no review window with a date box. Reset the dataset fleet first.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/refused-save-date-published-today/review.js
const {forEachApp, launch, signIn, record, note, sql} = require('../../../probe');
const {readDate, typeDate, pressOk, openEditReview} = require('../impossible-typed-date-saved-wrong/lib');

const REVIEW = {ojs: 12, omp: 17};
const REVIEWER = 'Julie Janssen';
const DATES = ['responseDueDate', 'reviewDueDate'];

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('review.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const sid = REVIEW[app.name];
    if (!sid) {
        note(`u50a4 review: ${app.name} skipped, no review window with a date box`);
        return;
    }
    const {page, close} = await launch(app);
    const stored = () => sql(app, `select ra.date_response_due, ra.date_due from review_assignments ra join users u on u.user_id = ra.reviewer_id where ra.submission_id = ${sid} and u.username = 'jjanssen'`);
    const facts = {today: new Date().toISOString().slice(0, 10)};
    try {
        await signIn(page, 'dbarnes');
        let form = await openEditReview(page, app, sid, REVIEWER);
        facts.opened = {reviewDueDate: await readDate(form, 'reviewDueDate'), stored: stored()};
        facts.emptied = await typeDate(page, form, 'reviewDueDate', '');
        facts.firstOk = await pressOk(page, form, DATES, 'r-first-ok');
        if (facts.firstOk.windowOpen) facts.secondOk = await pressOk(page, form, DATES, 'r-second-ok');
        await page.keyboard.press('Escape').catch(() => {});
        await page.reload();
        form = await openEditReview(page, app, sid, REVIEWER);
        facts.reopened = {reviewDueDate: await readDate(form, 'reviewDueDate'), stored: stored()};
    } finally {
        record('review', facts);
        await close();
    }
});
