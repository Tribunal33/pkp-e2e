// Issue report docs/issues/U09-A19-static-page-content-change-lost-on-close.md (U09 A19):
// the same fault in the editor's reviewer email windows, walked through the
// screens on PKP's default test dataset (a dataset fleet). OJS submission 7
// "Developing efficacy beliefs in the classroom" (Review, round 1) and OMP
// submission 12 "Connecting ICTs to Development" (Internal review, round 1);
// OPS has no review. The kit builds nothing. Fact keys follow the steps:
//   1–2.  `dbarnes` opens the submission's workflow at its review round
//   3–5.  `amccrae` (Request Sent) › More Actions › "Unassign Reviewer": text added at the end of the message only,
//         the panel's close control; then "Unassign Reviewer" again ("Send Reminder" shows only once a request or review is overdue,
//         which no reviewer of the dataset is)
//   6.    `phudson` (Review Submitted) › "Read Review" › "Mark as Complete", "Mark as Complete" again in the question
//         [3.5: "Confirm", no question];
//         the "Thank Reviewer" panel opens by itself (or from the row's actions when it does not)
//   7–9.  in "Thank Reviewer": the same as 3–5, reopened from the row's actions
//   c.    the control: "Thank Reviewer" with "Do not send an email" ticked as well, then the close control
//
// Reset first:  npm run fleet-prep -- --feature issues-ir9 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir9 PROBE_AGENT=ir9 node bin/probe.js ojs,omp shared/playwright/checks/issues/static-page-content-change-lost-on-close/review.js
//               (or ONLY=ojs,omp … all)
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir9-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir9-3_5 PROBE_AGENT=ir9 node bin/probe.js all shared/playwright/checks/issues/static-page-content-change-lost-on-close/review.js
// Facts: .reports/<feature>/ir9/review-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib');

const {T, sleep, flat} = L;
const SUB = {ojs: 7, omp: 12};
const NAMES = {amccrae: 'Aisla McCrae', phudson: 'Paul Hudson'};

forEachApp(async (app) => {
    if (!SUB[app.name]) { console.log(`[review] ${app.name}: no review stage, nothing to walk`); return; }
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const fact = (k, v) => { record('review-facts', {[k]: v}, {merge: true}); console.log('[review]', app.name, k, JSON.stringify(v).slice(0, 600)); };
    const snap = async (name) => { record(name, await screen(page)); await shot(page, name).catch(() => {}); };
    const {page} = await launch(app);
    const errs = L.scriptErrors(page);

    await signIn(page, 'dbarnes');                                                    // 1
    const wf = new WorkflowPage(page, app.contextPath);
    const open = async () => {                                                        // 2 (the workflow opens at the round)
        await wf.gotoEditorial(SUB[app.name]);
        await page.locator('[data-cy="reviewer-manager"]').first().waitFor({timeout: T});
        await idle(page).catch(() => {});
    };
    const row = (user) => page.locator('[data-cy="reviewer-manager"]').first().getByRole('row').filter({hasText: NAMES[user]});

    /** The row's action by its label: a button in the row, else under "More Actions". */
    async function press(user, label) {
        const r = row(user);
        await r.first().waitFor({timeout: T});
        const direct = r.getByRole('button', {name: label, exact: true});
        if (await direct.count()) { await direct.first().click(); return 'button'; }
        await r.getByRole('button', {name: 'More Actions'}).first().click();
        await page.getByRole('menuitem', {name: label, exact: true}).first().click();
        return 'menu';
    }

    /** The open side panel with the legacy form `formId`, once its message editor is ready. */
    async function panel(formId) {
        const form = page.locator(`form#${formId}`).first();
        await form.waitFor({timeout: T});
        await idle(page).catch(() => {});
        const ta = form.locator('textarea').first();
        const id = await ta.getAttribute('id');
        await page.waitForFunction((x) => window.tinymce && window.tinymce.get(x) && window.tinymce.get(x).initialized, id, {timeout: T});
        const dialog = page.locator('[role="dialog"]').filter({has: form}).last();
        return {form, ta, id, close: dialog.getByRole('button', {name: 'Close', exact: true}).first()};
    }

    async function addToMessage(p, text) {
        await page.locator(`[id="${p.id}_ifr"]`).contentFrame().locator('body').click();
        await page.keyboard.press('ControlOrMeta+End');
        await page.keyboard.type(text);
        await sleep(300);
    }

    async function walkWindow(key, user, label, formId, {tick = null, already = false} = {}) {
        if (!already) {
            await open();
            fact(`${key}-pressed`, {user, label, via: await press(user, label)});
        }
        let p = await panel(formId);
        const before = await L.editorText(page, p.ta);
        await addToMessage(p, ' u09ir9 extra line');
        if (tick) await p.form.locator(`input[name="${tick}"]`).first().check();
        const after = await L.editorText(page, p.ta);
        fact(`${key}-typed`, {endsWith: flat(after.slice(-60)), grew: after.length - before.length, tick});
        await snap(`a19r-${key}-typed`);
        const c = await L.closeWindow(page, p.close, p.form, {answer: 'cancel'});
        fact(`${key}-close`, c);
        if (!c.closed) {
            fact(`${key}-kept`, flat((await L.editorText(page, p.ta)).slice(-60)));
            fact(`${key}-close-ok`, await L.closeWindow(page, p.close, p.form));
            return;
        }
        await press(user, label);                                                       // reopen
        p = await panel(formId);
        const again = await L.editorText(page, p.ta);
        fact(`${key}-reopened`, {hasExtra: again.includes('u09ir9 extra line'), sameAsBefore: again === before, endsWith: flat(again.slice(-60))});
        await L.closeWindow(page, p.close, p.form);
    }

    await walkWindow('unassign', 'amccrae', 'Unassign Reviewer', 'unassignReviewerForm');   // 3–5
    await open();                                                                      // 6
    await row('phudson').getByRole('button', {name: 'Read Review', exact: true}).click();
    const done = page.getByRole('dialog').last().getByRole('button', {name: /^(Mark as Complete|Confirm)$/});
    await done.waitFor({timeout: T});
    fact('6-button', await done.innerText());
    await done.click();
    const ask = page.getByRole('dialog').filter({hasText: 'Mark this review as complete?'}).last();
    if (await ask.waitFor({timeout: 5000}).then(() => true).catch(() => false)) {
        fact('6-question', flat(await ask.innerText(), 200));
        await ask.getByRole('button', {name: 'Mark as Complete', exact: true}).click();
    }
    const thankOpened = await page.locator('form#sendThankYouForm').first().waitFor({timeout: 10000}).then(() => true).catch(() => false);
    fact('6-thank-opened-by-itself', thankOpened);
    await walkWindow('thank', 'phudson', 'Thank Reviewer', 'sendThankYouForm', {already: thankOpened});   // 7–9
    await walkWindow('c-thank-skip', 'phudson', 'Thank Reviewer', 'sendThankYouForm', {tick: 'skipEmail'});   // control
    fact('scriptErrors-all', errs.filter((e) => !/status of 500/.test(e)));
});
