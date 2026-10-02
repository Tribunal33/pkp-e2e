// Helpers for "Date Published" showing today's date after a refused "Save" (U50 A4), shared by
// walk.js and neighbour.js. Requiring this file runs nothing. Page objects are required inside the
// functions (probe kit: a suite page object is required inside forEachApp's callback).
const {idle, screen, record, shot, sql} = require('../../../probe');

const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();

function issuesAdmin(page, contextPath) {
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    return new IssuesAdmin(page, contextPath);
}

/** Record the screen and a picture under `name`. */
async function snap(page, name) {
    record(name, await screen(page));
    await shot(page, name).catch(() => {});
}

/**
 * What "Date Published" holds: the visible box, the hidden field "Save" posts, the message under
 * the box, and any notice on the page.
 */
async function readDate(page, form) {
    const hidden = form.form.locator('input[type="hidden"][id$="-altField"]');
    return {
        box: await form.dateBox().inputValue(),
        posted: (await hidden.count()) ? await hidden.first().inputValue() : null,
        boxLine: flat(await form.dateLine().first().innerText().catch(() => '')),
        fieldErrors: (await form.fieldErrors().allInnerTexts().catch(() => [])).map(flat).filter(Boolean),
        notices: (await page.locator('.app__notifications .pkpNotification').allInnerTexts()).map(flat),
    };
}

/** Press "Save"; the save's status and "Date Published" as it reads afterwards. */
async function save(page, form, label) {
    const status = (await form.save()).status();
    await idle(page).catch(() => {});
    const after = (await form.dateBox().isVisible().catch(() => false)) ? await readDate(page, form) : null;
    await snap(page, label);
    return {status, after};
}

/** The stored Date Published of the journal's issue with this volume and number. */
function storedDate(app, volume, number) {
    return sql(app, `select coalesce(date_published::text, 'NULL') from issues where volume = ${Number(volume)} and number = '${number}'`);
}

/** Open an issue's "Issue Management" window on "Issue Data": the form. */
async function openIssueData(page, contextPath, tab, name) {
    const issues = issuesAdmin(page, contextPath);
    await issues.goto(tab);
    await issues.showTab(tab);
    const win = await issues.openManagement(tab, name);
    return win.openData();
}

module.exports = {flat, issuesAdmin, snap, readDate, save, storedDate, openIssueData};
