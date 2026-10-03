// Helpers of walk.js and neighbour.js here (issue report
// docs/issues/U27-A18-emptied-request-letter-half-adds-reviewer.md). Requiring this file runs nothing.
// Every helper drives the screens a person uses: the workflow's "Reviewers" panel, its "Add Reviewer"
// window (search, "Select", the request letter, "Important Dates", "Add Reviewer", "Cancel") and a
// row's "More Actions" › "Edit" window; and the reviewer's own dashboard and review page.
const {idle, screen, record, serverLog, signIn} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per app, on PKP's default test dataset (docs/process/dataset.md): a submission in Review and its reviewers. */
const CASES = {
    // dates: a reviewer added with inverted due dates (the session's check of the spec's A8, kept out of the report);
    // letter: the one added with the letter emptied;
    // control: one added with nothing changed; skip: one added with the letter emptied and "Do not send email" ticked;
    // edit: a reviewer already on the round, whose "Edit" window is used
    // space: one added with the letter emptied and a single space typed in it
    ojs: {id: 12, dates: 'Aisla McCrae', letter: {name: 'Adela Gallego', username: 'agallego'},
        control: {name: 'Sabine Kumar', username: 'skumar'}, skip: {name: 'Catherine Turner', username: 'cturner'},
        space: {name: 'Stephen Hellier', username: 'shellier'}, edit: 'Julie Janssen'},
    omp: {id: 2, dates: 'Graham Cox', letter: {name: 'Adela Gallego', username: 'agallego'},
        control: {name: 'Lisset Von', username: 'lvon'}, skip: {name: 'Catherine Turner', username: 'cturner'},
        space: {name: 'Stephen Hellier', username: 'shellier'}, edit: 'Gonzalo Favio'},
    ops: null, // a preprint server has no review stage
};

const mailOf = (username) => `${username}@mailinator.com`;

/** The review page objects (the Reviewers panel and its windows are the same on a press). */
const R = () => require('../../../../../apps/ojs/playwright/pages/ReviewStagePages.js');

/** Tomorrow at noon (before the four-week response due date the window opens with). */
const tomorrow = () => {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    d.setHours(12, 0, 0, 0);
    return d;
};

/** Every browser dialog (alert, confirm, page leave) is recorded and accepted. */
function watchDialogs(page, list) {
    page.on('dialog', async (d) => {
        list.push({type: d.type(), message: flat(d.message(), 300), at: new Date().toISOString()});
        await d.accept().catch(() => {});
    });
}

/** The editor's workflow of the submission, on the stage it opens on. */
async function openWorkflow(page, app, id) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    const modal = page.locator('[data-cy="active-modal"]').first();
    await modal.locator('[data-cy="reviewer-manager"]').waitFor({timeout: T});
    await idle(page);
    return modal;
}

/** The rows of the "Reviewers" panel naming the person, as text. */
async function reviewerRows(modal, name) {
    return modal
        .locator('[data-cy="reviewer-manager"]')
        .getByRole('row')
        .filter({hasText: name})
        .evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
}

/** "Add Reviewer", search the name, "Select {name}" (after the letter's editor is ready). Returns the window. */
async function openAndSelect(page, name) {
    const win = await R().openAddReviewerModal(page);
    await R().selectReviewer(page, win, name);
    const letter = win.frameLocator('iframe[id^="personalMessage"]').last().locator('body');
    for (let i = 0; i < 60 && !flat(await letter.innerText().catch(() => '')); i++) await sleep(500);
    return win;
}

/** The request letter's text as the editor shows it. */
async function letterText(win) {
    return flat(await win.frameLocator('iframe[id^="personalMessage"]').last().locator('body').innerText().catch(() => null), 200);
}

/** Click in the request letter, select all, Delete. */
async function emptyLetter(page, win) {
    const body = win.frameLocator('iframe[id^="personalMessage"]').last().locator('body');
    await body.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await sleep(300);
    return letterText(win);
}

/** After emptyLetter(): type one space into the letter (TinyMCE keeps it as a non-breaking space). */
async function spaceLetter(page, win) {
    await win.frameLocator('iframe[id^="personalMessage"]').last().locator('body').click();
    await page.keyboard.press('Space');
    await sleep(300);
    return letterText(win);
}

/**
 * The reviewer signs in: whether their dashboard's review assignments list the submission, and on the
 * review's own page whether "Accept Review, Continue to Step #2" is offered and what "Review Files" lists.
 */
async function reviewerSide(page, app, id, username, label) {
    await signIn(page, username);
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/reviewAssignments`));
    await idle(page);
    await sleep(1500);
    const dash = await screen(page);
    record(`${label}-dashboard`, dash);
    const out = {dashboardListsIt: new RegExp(`\\b${id}\\b`).test(dash.text.main || '') && /Review|Request/.test(dash.text.main || ''),
        dashboardRows: (dash.text.main || '').split('\n').filter((l) => new RegExp(`^\\s*${id}\\b`).test(l)).map((l) => flat(l, 200))};
    await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewer/submission/${id}`));
    await idle(page);
    const grid = page.locator('#reviewFilesStep1 .pkp_controllers_grid').first();
    await grid.waitFor({state: 'visible', timeout: 20_000}).catch(() => {});
    await idle(page);
    const s = await screen(page);
    record(`${label}-review-page`, s);
    out.title = s.title;
    out.accept = await page.getByRole('button', {name: /Accept Review, Continue to Step #2/}).filter({visible: true}).count();
    out.reviewFiles = flat(await grid.innerText().catch(() => null), 400);
    return out;
}

/** The two due dates the window shows. */
async function dueDates(scope) {
    const read = (p) => scope.locator(`input.datepicker[id^="${p}"]`).first().inputValue().catch(() => null);
    return {response: await read('responseDueDate'), review: await read('reviewDueDate')};
}

/** What the window shows besides its fields: refusal texts, field errors, the form-error box. */
async function refusalTexts(scope) {
    return scope
        .locator('.error, .pkp_form_error, #formErrors, .notifyFormError, label.error, .sub_label.error, [class*="Error"]')
        .evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean))
        .catch(() => []);
}

/**
 * Press the window's submit button ("Add Reviewer" or "OK") and read what follows: the answer to the
 * browser's own request (status, a short body, the letter it carried), the server log's error lines, whether
 * the window is still open after 4 s, any refusal text inside it, and the notices shown.
 */
async function submit(page, app, win, {button, url, formSel, label}) {
    const log = serverLog(app);
    const from = log.mark();
    let posted = null;
    const onRequest = (r) => {
        if (url.test(r.url()) && r.method() === 'POST') {
            const p = new URLSearchParams(r.postData() || '');
            posted = {personalMessage: p.has('personalMessage') ? flat(p.get('personalMessage'), 120) : undefined,
                responseDueDate: p.get('responseDueDate'), reviewDueDate: p.get('reviewDueDate'), skipEmail: p.get('skipEmail')};
        }
    };
    page.on('request', onRequest);
    const answered = page.waitForResponse((r) => url.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await win.getByRole('button', {name: button, exact: true}).click();
    const r = await answered;
    page.off('request', onRequest);
    await sleep(4000);
    await idle(page);
    const out = {posted, status: r ? r.status() : null, answer: r ? flat(await r.text().catch(() => ''), 300) : null};
    out.serverLog = log.since(from).map((l) => flat(l, 400)).slice(0, 8);
    out.windowOpen = await win.locator(formSel).isVisible().catch(() => false);
    out.refusals = out.windowOpen ? await refusalTexts(win) : [];
    const s = await screen(page);
    record(label, s);
    out.notices = (s.notices || []).map((n) => flat(n.text || n, 200));
    return out;
}

/** The legacy window's own "Cancel" link; then what notices show in the next 4 s. */
async function cancel(page, win, formSel, label) {
    await win.locator(`${formSel} a, ${formSel} button`).filter({hasText: /^\s*Cancel\s*$/}).first().click();
    await win.locator(formSel).waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await sleep(4000);
    await idle(page);
    const s = await screen(page);
    record(label, s);
    return {closed: !(await win.locator(formSel).isVisible().catch(() => false)), notices: (s.notices || []).map((n) => flat(n.text || n, 200))};
}

/** Whether the reviewer search list shows the person as already assigned (the Add Reviewer window opened afresh). */
async function listedAsAssigned(page, name) {
    const win = await R().openAddReviewerModal(page);
    const item = await R().searchReviewerList(page, win, name);
    const out = {item: flat(await item.innerText(), 300), selectButton: await item.getByRole('button', {name: `Select ${name}`}).count()};
    await win.getByRole('button', {name: /^Close/}).first().click().catch(() => {});
    await win.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    return out;
}

module.exports = {T, sleep, flat, CASES, mailOf, R, tomorrow, watchDialogs, openWorkflow, reviewerRows, openAndSelect, letterText,
    emptyLetter, spaceLetter, reviewerSide, dueDates, refusalTexts, submit, cancel, listedAsAssigned};
