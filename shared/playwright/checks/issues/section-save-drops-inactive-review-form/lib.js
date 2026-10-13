// Helpers of walk.js here (spec U17, register A11). Requiring this file runs nothing. Every helper
// drives the screens a person uses: Settings › Journal › "Sections" (a section's "Edit" or "Create
// Section" window, its "Review Form" list, "Save" or "Cancel"), Settings › Workflow › "Review" ›
// "Review Forms" (a row's "Active" box) and the workflow's "Add Reviewer" window. Making a form is
// U28 A14's helper and deactivating one U29 A9's, reused as they stand.
const {idle, sql} = require('../../../probe');
const A14 = require('../review-form-save-for-later-required-fields/lib.js');
const A9 = require('../edit-review-drops-deactivated-form/lib.js');

const {T, sleep, flat} = A14;
const ACTIVATE = /activate this review form/i;

/** On PKP's default test dataset (docs/process/dataset.md): submission 12 is in "Articles", at Review; Aisla McCrae is not on it. */
const CASE = {id: 12, reviewer: 'Aisla McCrae'};

function sectionsTab(page, app) {
    const {SectionsTab} = require('../../../pages/SectionsPages.js');
    return new SectionsTab(page, app.contextPath);
}

/** A section window's "Review Form": absent, or its options and the chosen one. */
async function readList(win) {
    const select = win.reviewFormSelect();
    if (!(await select.count())) return {listShown: false};
    return {listShown: true, options: (await select.locator('option').allInnerTexts()).map((t) => flat(t, 80)), chosen: flat(await select.locator('option:checked').innerText(), 80)};
}

/**
 * "Sections": the row's "Edit" (or "Create Section" when `title` is null), the "Review Form" list,
 * then `choose` a form (optional) and `press` "Save" or "Cancel". For "Save": the answer's status,
 * what the window posted as `reviewFormId`, whether the window closed and the notices shown.
 * `onOpen(win)` runs with the window open (a screen record).
 */
async function sectionWindow(page, app, title, {choose = null, press = 'Cancel', onOpen = null} = {}) {
    const tab = sectionsTab(page, app);
    await tab.goto();
    const win = title ? await tab.openEdit(title) : await tab.openAdd();
    await idle(page);
    const out = {section: title || '(Create Section)', ...(await readList(win))};
    if (onOpen) await onOpen(win);
    if (choose) { await win.reviewFormSelect().selectOption({label: choose}); out.chose = choose; }
    if (press === 'Save') {
        const answered = page.waitForResponse((r) => r.request().method() === 'POST' && /update-section/.test(r.url()), {timeout: T});
        answered.catch(() => null);
        await win.saveButton().click();
        const r = await answered;
        const params = new URLSearchParams(r.request().postData() || '');
        out.save = {status: r.status(), posted: params.has('reviewFormId') ? params.get('reviewFormId') : '(not posted)'};
        await win.form().waitFor({state: 'hidden', timeout: T}).catch(() => {});
        out.save.windowClosed = !(await win.form().isVisible().catch(() => false));
        const notice = page.locator('.app__notifications .pkpNotification').last();
        out.save.notice = flat(await notice.innerText({timeout: 5_000}).catch(() => null), 200);
    } else {
        await win.cancelLink().click().catch(() => null);
        await win.form().waitFor({state: 'hidden', timeout: 10_000}).catch(() => null);
    }
    await idle(page);
    await sleep(600); // the closed window's slot (patterns.md pitfall 4)
    return out;
}

/** "Review Forms": tick the form's "Active" box, "OK". Returns the question and the tick after. */
async function activateForm(page, app, title) {
    const {ReviewSettingsPage} = require('../../../pages/ReviewSettingsPages.js');
    const settings = new ReviewSettingsPage(page, app.contextPath);
    const forms = settings.forms;
    await settings.goto('Review Forms');
    await idle(page);
    await forms.activeBox(forms.row(title).first()).click();
    const question = flat(await forms.confirmWindow(ACTIVATE).innerText(), 300);
    await forms.answerConfirm(ACTIVATE, 'OK');
    await idle(page);
    return {question, active: await forms.activeBox(forms.row(title).first()).isChecked()};
}

/** The submission's workflow, "Add Reviewer", "Select" on the reviewer: the "Review Form" list. The window is left by the next navigation. */
async function addReviewerList(page, app, id, reviewer, {onOpen = null} = {}) {
    const R = require('../../../../../apps/ojs/playwright/pages/ReviewStagePages.js');
    await A14.openWorkflow(page, app, id);
    const modal = await R.openAddReviewerModal(page);
    await R.selectReviewer(page, modal, reviewer);
    await idle(page);
    const select = R.reviewFormSelect(modal);
    const out = {submission: id, reviewer, listShown: (await select.count()) > 0};
    if (out.listShown) {
        out.options = (await select.first().locator('option').allInnerTexts()).map((t) => flat(t, 80));
        out.chosen = flat(await select.first().locator('option:checked').innerText(), 80);
    }
    if (onOpen) await onOpen(modal);
    return out;
}

/** Beside the screens: each section's stored review form (title | review_form_id). */
function storedSections(app) {
    return sql(app, `select (select setting_value from section_settings ss where ss.section_id = s.section_id and ss.setting_name = 'title' and ss.locale = 'en'), coalesce(s.review_form_id::text, '(none)') from sections s join journals j on j.journal_id = s.journal_id where j.path = '${app.contextPath}' order by s.seq, s.section_id`).split('\n');
}

module.exports = {T, sleep, flat, CASE, A14, A9, readList, sectionWindow, activateForm, addReviewerList, storedSections};
