// Issue report docs/issues/U09-A19-static-page-content-change-lost-on-close.md: the fix's reach on
// the reviewer email windows, whose message is prefilled from an email template. Each window is
// opened and closed without a change; with the fix in, none may ask the unsaved-change question.
// OJS submission 7 "Developing efficacy beliefs in the classroom" (Review, round 1) and OMP
// submission 12 "Connecting ICTs to Development" (Internal review, round 1); the kit builds nothing.
//   u1  `amccrae` (Request Sent) › More Actions › "Unassign Reviewer", then the panel's close control
//   u2  `phudson` › "Read Review" › "Mark as Complete" (and the question's "Mark as Complete");
//       the "Thank Reviewer" panel that opens, closed untouched
//   u3  "Thank Reviewer" opened again from the row, closed untouched
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/static-page-content-change-lost-on-close/untouched.js
// Facts: .reports/<feature>/<id>/untouched-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, idle, record} = require('../../../probe');
const L = require('./lib');

const {T} = L;
const SUB = {ojs: 7, omp: 12};
const NAMES = {amccrae: 'Aisla McCrae', phudson: 'Paul Hudson'};

forEachApp(async (app) => {
    if (!SUB[app.name]) return;
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const fact = (k, v) => { record('untouched-facts', {[k]: v}, {merge: true}); console.log('[untouched]', app.name, k, JSON.stringify(v).slice(0, 400)); };
    const {page} = await launch(app);
    await signIn(page, 'dbarnes');
    const wf = new WorkflowPage(page, app.contextPath);
    const open = async () => {
        await wf.gotoEditorial(SUB[app.name]);
        await page.locator('[data-cy="reviewer-manager"]').first().waitFor({timeout: T});
        await idle(page).catch(() => {});
    };
    const row = (user) => page.locator('[data-cy="reviewer-manager"]').first().getByRole('row').filter({hasText: NAMES[user]});
    async function press(user, label) {
        const r = row(user);
        await r.first().waitFor({timeout: T});
        const direct = r.getByRole('button', {name: label, exact: true});
        if (await direct.count()) { await direct.first().click(); return; }
        await r.getByRole('button', {name: 'More Actions'}).first().click();
        await page.getByRole('menuitem', {name: label, exact: true}).first().click();
    }
    /** The open side panel's legacy form, once its message editor is ready; then its close control. */
    async function closeUntouched(formId) {
        const form = page.locator(`form#${formId}`).first();
        await form.waitFor({timeout: T});
        await idle(page).catch(() => {});
        const id = await form.locator('textarea').first().getAttribute('id');
        await page.waitForFunction((x) => window.tinymce && window.tinymce.get(x) && window.tinymce.get(x).initialized, id, {timeout: T});
        const message = (await L.editorText(page, form.locator('textarea').first())).length;
        const close = page.locator('[role="dialog"]').filter({has: form}).last().getByRole('button', {name: 'Close', exact: true}).first();
        return {message, ...(await L.closeWindow(page, close, form, {answer: 'cancel'}))};
    }

    await open();
    await press('amccrae', 'Unassign Reviewer');
    fact('u1-unassign', await closeUntouched('unassignReviewerForm'));

    await open();
    await row('phudson').getByRole('button', {name: 'Read Review', exact: true}).click();
    const done = page.getByRole('dialog').last().getByRole('button', {name: /^(Mark as Complete|Confirm)$/});
    await done.waitFor({timeout: T});
    await done.click();
    const ask = page.getByRole('dialog').filter({hasText: 'Mark this review as complete?'}).last();
    if (await ask.waitFor({timeout: 5000}).then(() => true).catch(() => false)) {
        await ask.getByRole('button', {name: 'Mark as Complete', exact: true}).click();
    }
    if (await page.locator('form#sendThankYouForm').first().waitFor({timeout: 10000}).then(() => true).catch(() => false)) {
        fact('u2-thank-opened-by-itself', await closeUntouched('sendThankYouForm'));
    }
    await open();
    await press('phudson', 'Thank Reviewer');
    fact('u3-thank', await closeUntouched('sendThankYouForm'));
});
