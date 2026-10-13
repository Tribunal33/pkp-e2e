// Helpers of walk.js here (docs/issues/U27-A45-inverted-review-dates-notice-says-adding.md, spec U27,
// register A45). Requiring this file runs nothing. Self-contained: the screens a person uses on the
// workflow's "Reviewers" panel ("Add Reviewer", a row's "More Actions" > "Edit" and "Resend Review
// Request") and the reviewer's own review page ("Decline Review Request"). The legacy windows' page
// objects (the journal's; the panel is the same on a press) are required inside the calls, since they
// read the app the kit has exported.
const {idle, screen, record} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const R = () => require('../../../../../apps/ojs/playwright/pages/ReviewStagePages.js');

/** The guidance sentence the "Add Reviewer" and "Edit" windows show under "Important Dates". */
const GUIDANCE = 'Review due date must be greater or equal to response due date.';

/** Per app, on PKP's default test dataset (docs/process/dataset.md): a submission in review whose two reviewers have not responded. */
const CASES = {
    ojs: {id: 12, stays: {user: 'jjanssen', name: 'Julie Janssen'}, declines: {user: 'phudson', name: 'Paul Hudson'},
        add: {search: 'McCrae', name: 'Aisla McCrae'}},
    omp: {id: 17, stays: {user: 'jjanssen', name: 'Julie Janssen'}, declines: {user: 'phudson', name: 'Paul Hudson'},
        add: {search: 'McCrae', name: 'Aisla McCrae'}},
};

/** Today plus n days, at noon local time. */
function day(n) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return d;
}

function isoDate(date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Every browser dialog (alert, confirm) on the page, kept in `into`; alerts accepted, a page-leave question accepted. */
function watchDialogs(page, into) {
    page.on('dialog', async (d) => {
        into.push({type: d.type(), message: flat(d.message(), 300), at: new Date().toISOString()});
        await d.accept().catch(() => {});
    });
}

/** The editor's workflow of the submission, opened by its address; the "Reviewers" panel on screen. */
async function openWorkflow(page, app, id) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    const modal = page.locator('[data-cy="active-modal"]').first();
    await modal.locator('[data-cy="reviewer-manager"]').waitFor({timeout: T});
    await idle(page);
    return modal;
}

/** The reviewer's row of the open workflow's "Reviewers" panel. */
const row = (modal, name) => modal.locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: name}).first();

async function rowText(modal, name) {
    return flat(await row(modal, name).innerText().catch(() => null), 240);
}

/** The reviewer's review page of the submission, "Decline Review Request", then the window's "Decline Review Request". */
async function reviewerDecline(page, app, id) {
    const {ReviewWizardPage} = require('../../../pages/ReviewerPages.js');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewer/submission/${id}`));
    await page.getByRole('heading', {level: 1}).first().waitFor({timeout: T});
    await idle(page);
    await new ReviewWizardPage(page, app.contextPath).decline();
    await idle(page);
    return {declined: true, landed: page.url().replace(/^https?:\/\/[^/]+/, '')};
}

/** The "Important Dates" section of a legacy form: its text, and whether it carries the guidance sentence. */
async function datesSection(form) {
    const text = flat(await form.innerText().catch(() => ''), 4000) || '';
    const i = text.indexOf('Important Dates');
    return {section: i < 0 ? null : flat(text.slice(i, i + 260), 260), guidance: text.includes(GUIDANCE)};
}

/** The two dates picked from the form's calendars; what the form will submit after. */
async function pickDates(page, form, {response, review}) {
    await R().pickDate(page, form, 'responseDueDate', response);
    await R().pickDate(page, form, 'reviewDueDate', review);
    await idle(page);
    const hidden = async (n) => form.locator(`input[type="hidden"][name="${n}"]`).first().inputValue().catch(() => null);
    return {picked: {response: isoDate(response), review: isoDate(review)},
        submitted: {responseDueDate: await hidden('responseDueDate'), reviewDueDate: await hidden('reviewDueDate')}};
}

/**
 * Press the form's submit button; read the save's answer, the page notices as they appear (they go
 * within seconds), the dialogs raised, and whether the window is still open two seconds on.
 */
async function pressAndRead(page, form, button, urlRe, dialogs, label) {
    const before = dialogs.length;
    const saved = page.waitForResponse((r) => urlRe.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: button, exact: true}).click();
    const r = await saved;
    const notices = new Set();
    for (let i = 0; i < 20; i++) {
        for (const t of await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => [])) notices.add(flat(t, 300));
        if (notices.size && i >= 6) break;
        await sleep(250);
    }
    await idle(page);
    await sleep(2000);
    const out = {
        request: r ? {url: r.url().replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, ''), status: r.status(), body: flat(await r.text().catch(() => ''), 300)} : null,
        notices: [...notices],
        dialogs: dialogs.slice(before),
        windowOpen: await form.isVisible().catch(() => false),
    };
    if (label) record(label, await screen(page));
    return out;
}

/** "Add Reviewer", the reviewer searched and selected: the window's request form. */
async function openAddReviewer(page, who) {
    const win = await R().openAddReviewerModal(page);
    await R().selectReviewer(page, win, who.name, {search: true});
    const form = win.locator('#regularReviewerForm');
    await form.waitFor({timeout: T});
    await idle(page);
    return form;
}

/** A row's "More Actions" > "Edit": the window's form. */
async function openEdit(page, modal, name) {
    await R().clickRowAction(page, row(modal, name), 'Edit');
    const form = page.locator('form#editReviewForm');
    await form.locator('input.datepicker[id^="responseDueDate"]').first().waitFor({timeout: T});
    await idle(page);
    return form;
}

/** A declined row's "More Actions" > "Resend Review Request": the window's form, its message loaded. */
async function openResend(page, modal, name) {
    await R().clickRowAction(page, row(modal, name), 'Resend Review Request');
    const form = page.locator('form#resendRequestReviewerForm');
    await form.locator('input.datepicker[id^="responseDueDate"]').first().waitFor({timeout: T});
    const body = form.frameLocator('iframe[id^="personalMessage"]').last().locator('body');
    for (let i = 0; i < 60 && !flat(await body.innerText().catch(() => '')); i++) await sleep(500);
    await idle(page);
    return form;
}

module.exports = {T, sleep, flat, GUIDANCE, CASES, day, isoDate, watchDialogs, openWorkflow, row, rowText,
    reviewerDecline, datesSection, pickDates, pressAndRead, openAddReviewer, openEdit, openResend};
