// Helpers for walk.js (U26 OJS1). Requiring this file runs nothing.
// Every helper drives the screens a person uses: the workflow's "Reviewers"
// panel and a row's "More Actions" › "Edit" window as the editor, and My
// Submissions › "View" › "Read Review" as the author. The author's window is
// read in its review part only (`#reviewAssignment-<id>`): the window's
// files section is outside this walk.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per app, on PKP's default test dataset (docs/process/dataset.md). */
const CASES = {
    ojs: {id: 10, title: 'Condensing Water Availability Models to Focus on Specific Water Management Systems', author: 'jnovak', reviewer: 'Aisla McCrae', comment: 'Here are my review comments'},
    omp: {id: 16, title: "A Designer's Log: Case Studies in Instructional Design", author: 'mpower', reviewer: 'Adela Gallego', comment: 'I recommend that the author revise this submission.'},
};

function reviewerRow(page, name) {
    return page.locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: name}).first();
}

/** The editor opens the submission's workflow (the dashboard's own address for it). */
async function openEditorial(page, app, id) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    await page.locator('[data-cy="reviewer-manager"]').first().waitFor({timeout: T});
    await idle(page);
}

/**
 * A reviewer row's "More Actions" › "Edit": choose `reviewType` ("Open"), "OK".
 * Returns the type checked before and after, and the save's status.
 */
async function setReviewType(page, name, reviewType) {
    const row = reviewerRow(page, name);
    await row.waitFor({timeout: T});
    await row.getByRole('button', {name: 'More Actions'}).click();
    const menu = page.getByRole('menu');
    await menu.getByRole('menuitem').first().waitFor({timeout: T});
    await menu.getByRole('menuitem', {name: 'Edit', exact: true}).click();
    const edit = page.getByRole('dialog').filter({has: page.locator('form#editReviewForm')});
    const form = edit.locator('form#editReviewForm');
    await form.waitFor({timeout: T});
    await idle(page);
    const radios = edit.locator('input[name="reviewMethod"]');
    await radios.first().waitFor({timeout: T});
    const before = await edit.locator('input[name="reviewMethod"]:checked').evaluate((e) => e.closest('label') ? e.closest('label').innerText : e.value).catch(() => null);
    const radio = edit.getByRole('radio', {name: reviewType, exact: true});
    await radio.check();
    const saved = page.waitForResponse((r) => /update-review|updateReview/i.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await edit.getByRole('button', {name: 'OK', exact: true}).click();
    const s = await saved;
    await form.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    return {before: flat(before, 80), chosen: reviewType, saveStatus: s ? s.status() : null, closed: !(await form.isVisible().catch(() => false))};
}

/** The author's My Submissions › the row's "View": the workflow on its current stage. */
async function openAsAuthor(page, app, c) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/mySubmissions`));
    await idle(page);
    const row = page.getByRole('row').filter({hasText: c.title}).first();
    await row.waitFor({timeout: T});
    await row.getByRole('button', {name: 'View', exact: true}).click();
    await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: T});
    await idle(page);
    await page.locator('[data-cy="reviewer-manager"]').first().waitFor({timeout: T}).catch(() => {});
    await sleep(500);
}

/**
 * The author presses "Read Review" on the reviewer's row. Returns the
 * window's title, the review part's text and headings, whether the
 * comment shows, and the server's answer for the window (the review part of
 * its HTML only).
 */
async function authorReadReview(page, c) {
    const row = reviewerRow(page, c.reviewer);
    const out = {rowFound: (await row.count()) > 0};
    if (!out.rowFound) {
        out.reviewersPanel = await page.locator('[data-cy="reviewer-manager"]').count();
        return {out, win: null, part: null};
    }
    out.row = flat(await row.innerText(), 300);
    const answer = page.waitForResponse((r) => /readReview|read-review/i.test(r.url()), {timeout: T}).catch(() => null);
    await row.getByRole('button', {name: 'Read Review', exact: true}).click();
    const res = await answer;
    out.request = res ? {status: res.status(), url: res.url().replace(/^https?:\/\/[^/]+/, '')} : null;
    if (res) {
        const body = await res.json().catch(() => null);
        const html = body && typeof body.content === 'string' ? body.content : '';
        const m = html.match(/<div id="reviewAssignment-\d+">[\s\S]*?<\/div>\s*<\/div>/);
        out.answer = {status: body ? body.status : null, reviewPartHtml: m ? flat(m[0], 3000) : null};
    }
    const win = page.getByRole('dialog').filter({has: page.locator('form#readReviewForm')});
    await win.waitFor({timeout: T});
    const part = win.locator('[id^="reviewAssignment-"]').first();
    await part.waitFor({timeout: T});
    await idle(page);
    out.title = flat(await win.getAttribute('aria-label').catch(() => null)) ||
        flat(await win.getByRole('heading').first().innerText().catch(() => null), 200);
    out.reviewPartText = flat(await part.innerText(), 3000);
    out.headings = (await part.getByRole('heading').allInnerTexts()).map((t) => flat(t, 120));
    out.commentShown = out.reviewPartText.includes(c.comment);
    return {out, win, part};
}

/** Close the author's window through its header "Close". */
async function closeWindow(page, win) {
    await win.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
    await win.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await sleep(600);
}

const NEIGHBOUR = {};

module.exports = {T, sleep, flat, CASES, NEIGHBOUR, reviewerRow, openEditorial, setReviewType, openAsAuthor, authorReadReview, closeWindow};
