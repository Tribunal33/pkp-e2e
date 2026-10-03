// Helpers of walk.js here (U27 A30 and A31: the Review Details window's "Modify Review" offered,
// then its "Save Changes" refused; docs/issues/U27-A30-A31-modify-review-offered-then-refused.md).
// Requiring this file runs nothing. Every helper drives the workflow's "Reviewers" table, the
// "Review Details" window and the stacked "Modify Review" window as a person does; none throws on
// a control the fix removes or disables, it records the state instead.
const {idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * Per app, on PKP's default test dataset (docs/process/dataset.md):
 * declined: the submission whose unanswered reviewer declines (A30);
 * submitted: the submission with a submitted review the Funding coordinator opens (A31).
 */
const CASES = {
    ojs: {
        declined: {id: 12, user: 'jjanssen', name: 'Julie Janssen'},
        submitted: {id: 7, user: 'phudson', name: 'Paul Hudson', sectionEditor: 'dbuskins', title: 'Developing efficacy beliefs in the classroom'},
        production: {id: 5, name: 'Paul Hudson', roundLink: 'Review Round 1', nth: 0},
        recommendation: 'Accept Submission',
    },
    omp: {
        declined: {id: 17, user: 'jjanssen', name: 'Julie Janssen'},
        submitted: {id: 16, user: 'agallego', name: 'Adela Gallego', sectionEditor: null, title: "A Designer's Log"},
        production: {id: 4, name: 'Al Zacharia', roundLink: 'Review Round 1', nth: 1},
        recommendation: null,
    },
};

const wf = (page) => page.locator('[data-cy="active-modal"]').first();
const panel = (page) => wf(page).locator('[data-cy="reviewer-manager"]');
const row = (page, name) => panel(page).getByRole('row').filter({hasText: name});
const details = (page) => page.getByRole('dialog', {name: /^Review Details:/});
const editWin = (page) => page.getByRole('dialog', {name: /^Modify Review/});
const confirmDlg = (page, text) => page.locator('[data-cy="dialog"]').filter({hasText: text});

/** Open the submission's workflow from the editorial dashboard's address; waits for the Reviewers table. */
async function openWorkflow(page, app, id) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    await wf(page).getByRole('heading', {name: /^Workflow:/}).first().waitFor({timeout: T});
    await idle(page);
    await panel(page).getByRole('row').nth(1).waitFor({timeout: T});
    return wf(page);
}

/** A reviewer row: its text, its buttons and its "More Actions" entries (the menu closed again by its button). */
async function readRow(page, name) {
    const r = row(page, name);
    if (!(await r.first().waitFor({timeout: 10_000}).then(() => true).catch(() => false))) return {absent: true};
    const text = flat(await r.first().innerText(), 300);
    const buttons = (await r.first().getByRole('button').allInnerTexts()).map((t) => flat(t, 60)).filter(Boolean);
    await r.first().getByRole('button', {name: 'More Actions'}).click();
    const menu = page.getByRole('menu').last();
    await menu.waitFor({timeout: 10_000});
    const menuEntries = (await menu.getByRole('menuitem').allInnerTexts()).map((t) => flat(t, 60));
    // never Escape: it closes the workflow window too (patterns.md pitfall 7)
    await r.first().getByRole('button', {name: 'More Actions'}).click();
    await menu.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    return {text, buttons, menuEntries};
}

/** Wait for the Review Details window to have loaded the review (its Cancel shown, the spinner gone). */
async function settleDetails(page) {
    const d = details(page);
    await d.waitFor({timeout: 20_000});
    await d.getByRole('button', {name: 'Cancel', exact: true}).waitFor({timeout: 20_000});
    await idle(page);
    await page.waitForFunction(() => !document.querySelector('[role="dialog"] .pkpSpinner'), null, {timeout: 20_000}).catch(() => {});
    await sleep(500);
    return d;
}

/** "More Actions" > "Review Details"; returns false when the menu has no such entry. */
async function openDetailsFromMenu(page, name) {
    const r = row(page, name).first();
    await r.getByRole('button', {name: 'More Actions'}).click();
    const menu = page.getByRole('menu').last();
    await menu.waitFor({timeout: 10_000});
    const entry = menu.getByRole('menuitem', {name: 'Review Details', exact: true});
    if (!(await entry.count())) {
        await r.getByRole('button', {name: 'More Actions'}).click();
        return false;
    }
    await entry.click();
    await settleDetails(page);
    return true;
}

/** The row's "Read Review"; returns false when the row has no such button. */
async function openDetailsFromReadReview(page, name) {
    const b = row(page, name).first().getByRole('button', {name: 'Read Review'});
    if (!(await b.count())) return false;
    await b.click();
    await settleDetails(page);
    return true;
}

/** The Review Details window's footer: each button absent, enabled or disabled, and the text above it. */
async function footer(page) {
    const d = details(page);
    const states = {};
    for (const b of ['Cancel', 'Modify Review', 'Mark as Complete']) {
        const l = d.getByRole('button', {name: b, exact: true});
        states[b] = (await l.count()) ? ((await l.first().isEnabled()) ? 'enabled' : 'disabled') : 'absent';
    }
    const text = flat(await d.innerText(), 4000);
    const at = text.lastIndexOf('stars');
    return {states, tail: at >= 0 ? text.slice(at, at + 400) : text.slice(-400)};
}

/** "Modify Review" > "Modify this review?" (read) > "Modify Review"; returns the dialog's text and the window's. */
async function openModify(page) {
    await details(page).getByRole('button', {name: 'Modify Review', exact: true}).click();
    const dlg = confirmDlg(page, 'Modify this review?');
    await dlg.waitFor({timeout: 10_000});
    const confirm = {text: flat(await dlg.innerText()), buttons: (await dlg.getByRole('button').allInnerTexts()).map((t) => flat(t, 40)).filter(Boolean)};
    await dlg.getByRole('button', {name: 'Modify Review', exact: true}).click();
    await editWin(page).waitFor({timeout: 20_000});
    await editWin(page).locator('iframe.tox-edit-area__iframe').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    await sleep(1000);
    const w = editWin(page);
    return {
        confirm,
        window: flat(await w.innerText(), 2000),
        buttons: (await w.getByRole('button').allInnerTexts()).map((t) => flat(t, 40)).filter(Boolean),
        selects: await w.locator('select').evaluateAll((els) => els.map((e) => ({name: e.name, value: e.value}))),
    };
}

/** Type into "For author and editor" (the first editor of the window) and, on a journal, pick the recommendation. */
async function enterReview(page, text, recommendation) {
    const w = editWin(page);
    const body = w.frameLocator('iframe.tox-edit-area__iframe').first().locator('body');
    await body.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type(text);
    if (recommendation) await w.locator('select').first().selectOption({label: recommendation});
    await sleep(300);
    return {typed: text, recommendation};
}

/** Press "Save Changes": the save's answer (status and body), what the window and any dialog then show. */
async function pressSave(page) {
    const w = editWin(page);
    const button = w.getByRole('button', {name: 'Save Changes', exact: true});
    if (!(await button.isEnabled())) return {saveChangesDisabled: true};
    const answered = page
        .waitForResponse((r) => /\/reviewAssignments\/\d+\/review(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15_000})
        .then(async (r) => ({status: r.status(), method: r.request().method(), override: r.request().headers()['x-http-method-override'] || null, body: flat(await r.text().catch(() => ''), 400)}))
        .catch(() => null);
    await button.click();
    const response = await answered;
    await idle(page);
    await sleep(1200);
    const dialogs = [];
    for (const d of await page.locator('[data-cy="dialog"]').all()) {
        if (await d.isVisible().catch(() => false)) dialogs.push({text: flat(await d.innerText(), 400), buttons: (await d.getByRole('button').allInnerTexts()).map((t) => flat(t, 40)).filter(Boolean)});
    }
    const open = await w.isVisible().catch(() => false);
    return {
        response,
        dialogs,
        editWindowOpen: open,
        errors: open ? (await w.locator('.pkpFieldError, .pkpFormErrors, [role="alert"]').allInnerTexts().catch(() => [])).map((t) => flat(t, 300)).filter(Boolean) : [],
        windowText: open ? flat(await w.innerText(), 2000) : null,
    };
}

/** Press "OK" on a visible dialog that holds the text, if one is shown. */
async function okDialog(page, text) {
    const d = page.locator('[data-cy="dialog"]').filter({hasText: text});
    if (!(await d.isVisible().catch(() => false))) return false;
    await d.getByRole('button', {name: 'OK', exact: true}).click();
    await d.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    return true;
}

/** "Cancel" in the edit window: the warning it asks (read), answered "Yes"; then the Review Details window's "Cancel". */
async function leaveWindows(page) {
    const out = {};
    const w = editWin(page);
    if (await w.isVisible().catch(() => false)) {
        await w.getByRole('button', {name: 'Cancel', exact: true}).click();
        const warn = page.locator('[data-cy="dialog"]').filter({hasText: 'Do you wish to continue without saving?'});
        out.warning = (await warn.waitFor({timeout: 5_000}).then(() => true).catch(() => false)) ? flat(await warn.innerText(), 300) : null;
        if (out.warning) await warn.getByRole('button', {name: 'Yes', exact: true}).click();
        await w.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
        await sleep(800);
    }
    const d = details(page);
    if (await d.isVisible().catch(() => false)) {
        await d.getByRole('button', {name: 'Cancel', exact: true}).click();
        await d.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    }
    await idle(page);
    await sleep(800);
    return out;
}

/**
 * The workflow's side menu: its links' labels; then the round link (`nth` among same labels, a
 * press lists internal and external "Review Round 1") pressed. Returns false when there is none.
 */
async function openRound(page, label, nth) {
    const nav = wf(page).getByRole('navigation');
    const links = (await nav.getByRole('link').allInnerTexts()).map((t) => flat(t, 60));
    const link = nav.getByRole('link', {name: label, exact: true});
    if ((await link.count()) <= nth) return {links, opened: false};
    await link.nth(nth).click();
    await idle(page);
    const shown = await panel(page).getByRole('row').nth(1).waitFor({timeout: T}).then(() => true).catch(() => false);
    return {links, opened: shown};
}

/**
 * The editorial dashboard ("Active submissions" where the view exists, else the landing view):
 * search the title, open the row's "Review completed on …" indicator naming the reviewer, press
 * its "View …" button. Returns the button's label, or null when nothing was found.
 */
async function openDetailsFromDashboard(page, app, title, reviewerName) {
    const {EditorialDashboardPage} = require('../../../pages/EditorialDashboardPage.js');
    const dash = new EditorialDashboardPage(page, app.contextPath);
    await dash.goto();
    await dash.openView('Active submissions').catch(() => {});
    await dash.searchFor(title);
    const r = dash.row(title);
    await r.first().waitFor({timeout: T});
    const pop = await dash.openActivityPopoverFor(r.first(), /Review completed on/, reviewerName);
    const view = pop.getByRole('button', {name: /^View /});
    const label = flat(await view.first().innerText(), 60);
    await view.first().click();
    await settleDetails(page);
    return label;
}

/** The assignment as stored: declined, completed, last modified, its review comments holding the tag. */
function stored(app, id, username, tag) {
    const ra = sql(
        app,
        `select ra.review_id, ra.declined, ra.date_completed is not null, ra.last_modified from review_assignments ra join users u on u.user_id = ra.reviewer_id where ra.submission_id = ${id} and u.username = '${username}' order by ra.review_id desc limit 1`
    );
    const [reviewId, declined, completed, lastModified] = ra.split('|');
    const comments = sql(app, `select count(*) from submission_comments where assoc_id = ${Number(reviewId) || 0} and comments like '%${tag}%'`);
    return {reviewId: Number(reviewId), declined, completed, lastModified: lastModified || null, commentsWithTag: Number(comments)};
}

module.exports = {T, sleep, flat, CASES, details, editWin, openWorkflow, openRound, openDetailsFromDashboard, readRow, openDetailsFromMenu, openDetailsFromReadReview, footer, openModify, enterReview, pressSave, okDialog, leaveWindows, stored};
