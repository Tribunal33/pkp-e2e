// Helpers for "Unpublish Issue" and the journal's current issue (U50 A2), shared by walk.js and
// neighbour.js. Requiring this file runs nothing. Page objects are required inside the functions
// (probe kit: a suite page object is required inside forEachApp's callback).
const {idle, screen, record, shot} = require('../../../probe');

const T = 20_000;
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/** Record the screen and a full-page picture under `name`. */
async function snap(page, name) {
    record(name, await screen(page));
    await shot(page, name).catch(() => {});
}

function issuesPage(page, contextPath) {
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    return new IssuesAdmin(page, contextPath);
}

/** Issues › "Future Issues" › the row's arrow › "Publish Issue", the email box unticked, "OK". */
async function publishIssue(page, contextPath, name) {
    const issues = issuesPage(page, contextPath);
    await issues.goto('Future Issues');
    const win = await issues.openPublish(name);
    await win.mailBox().uncheck();
    await win.ok();
}

/** Issues › "Back Issues" › the row's arrow › "Unpublish Issue" › "OK"; the answer's status. */
async function unpublishIssue(page, contextPath, name) {
    const {ISSUES_TEXT} = require('../../../pages/IssuesPages.js');
    const issues = issuesPage(page, contextPath);
    await issues.goto('Back Issues');
    const dialog = await issues.openQuestion('Back Issues', name, 'Unpublish Issue', ISSUES_TEXT.unpublishQuestion);
    const r = await issues.answer(dialog, 'OK', /unpublish-issue/);
    return r ? r.status() : null;
}

/** Issues › "Back Issues": each row's name and the links its arrow offers. */
async function backIssueRows(page, contextPath) {
    const issues = issuesPage(page, contextPath);
    await issues.goto('Back Issues');
    const names = (await issues.names('Back Issues').allInnerTexts()).map(flat);
    const out = {};
    for (const name of names) {
        out[name] = await issues.rowActionNames('Back Issues', name);
        await issues.goto('Back Issues');
    }
    return out;
}

/** The journal's home page: its "Current Issue" part; then the header's "Current": the page it opens. */
async function readerCurrent(page, contextPath, label) {
    const {IssueReader} = require('../../../pages/IssuesPages.js');
    const reader = new IssueReader(page, contextPath);
    await reader.gotoHome();
    const part = page.locator('section.current_issue');
    const home = {
        currentIssuePart: (await part.count()) > 0,
        currentIssueTitle: (await part.count()) ? flat(await part.locator('.current_issue_title').innerText().catch(() => '')) : null,
    };
    await snap(page, `${label}-home`);
    await reader.pressHeader('Current');
    await idle(page).catch(() => {});
    const current = {
        url: page.url(),
        heading: flat(await reader.heading().innerText()),
        main: flat(await page.locator('.pkp_structure_main').innerText()).slice(0, 300),
    };
    await snap(page, `${label}-current`);
    return {home, current};
}

/** The header's "Archives": the issue summaries' titles. */
async function readerArchives(page, contextPath, label) {
    const {IssueReader} = require('../../../pages/IssuesPages.js');
    const reader = new IssueReader(page, contextPath);
    await reader.gotoHome();
    await reader.pressHeader('Archives');
    const titles = (await reader.summaryTitles().allInnerTexts()).map(flat);
    await snap(page, `${label}-archives`);
    return titles;
}

module.exports = {T, flat, snap, publishIssue, unpublishIssue, backIssueRows, readerCurrent, readerArchives};
