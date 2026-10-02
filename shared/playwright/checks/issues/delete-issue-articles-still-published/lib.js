// Helpers for walk.js and neighbour.js (U50 A12, deleting an issue leaves its articles marked
// "Published"). Requiring this file runs nothing. Page objects are required inside the functions
// (probe kit: a suite page object is required inside forEachApp's callback).
const {idle, screen, record, shot} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));

const ISSUE = 'Vol. 1 No. 2 (2014)';
const FUTURE = 'Vol. 2 No. 1 (2015)';

function frameFor(page, app) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    return new WorkflowPage(page, app.contextPath);
}

/**
 * Open a submission's workflow by its address and read the header (the stage bubble and the
 * header's buttons) and the page it lands on, then the newest version's "Title & Abstract": its
 * status line. Recorded as `label`.
 */
async function readWorkflow(page, app, submissionId, label) {
    const frame = frameFor(page, app);
    await page.goto('about:blank');
    await frame.gotoEditorial(submissionId);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    await sleep(800);
    const out = {
        landingActions: flat(await frame.actionItems().innerText().catch(() => null), 200),
        stage: flat(await frame.stageBubble().innerText().catch(() => null)),
        buttons: await frame.headerButtonLabels().catch((e) => `error ${e.message}`),
        landing: flat(await frame.heading().innerText().catch(() => null)),
    };
    // The newest version's "Title & Abstract": its controls carry "Status: …". The version node
    // only folds its pages open, so it is pressed when they are hidden.
    const pages = frame.menuLink('Title & Abstract');
    if (!(await pages.last().isVisible().catch(() => false))) {
        await frame.latestVersionNode().click({timeout: T}).catch(() => {});
    }
    await pages.last().click({timeout: T}).catch(() => {});
    await idle(page);
    await sleep(800);
    out.page = flat(await frame.heading().innerText().catch(() => null));
    out.status = flat(await frame.controlsLeft().innerText().catch(() => null), 200);
    record(label, await screen(page));
    await shot(page, label).catch(() => {});
    return out;
}

/** In the open workflow: "Activity Log", then "History": each line's event text, newest first; "Close". */
async function history(page, app, label) {
    const frame = frameFor(page, app);
    const dialog = await frame.openActivityLog();
    await dialog.locator('tbody tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    const lines = await dialog.locator('tbody tr.gridRow').evaluateAll((rows) =>
        rows.map((tr) => {
            const cells = [...tr.querySelectorAll('td')].map((td) => {
                const c = td.cloneNode(true);
                c.querySelectorAll('script, a.show_extras').forEach((x) => x.remove());
                return c.textContent.replace(/\s+/g, ' ').trim();
            });
            return `${cells[1]} | ${cells[2]}`;
        })
    );
    record(label, await screen(page));
    await frame.closeActivityLog().catch(() => {});
    return lines;
}

/** The article's page as a reader opens it by its address: status and heading. */
async function readArticlePage(page, app, submissionId) {
    const r = await page.goto(app.url(`/index.php/${app.contextPath}/en/article/view/${submissionId}`));
    await idle(page).catch(() => {});
    return {
        url: rel(page.url()),
        status: r ? r.status() : null,
        heading: flat(await page.locator('.pkp_structure_main h1, .page h1, h1').first().innerText().catch(() => null)),
    };
}

/** Issues › `tab` › the row's arrow › "Delete" › the question › "OK": {question, status, rowsAfter}. */
async function deleteIssue(page, app, tab, name) {
    const {IssuesAdmin, ISSUES_TEXT, ISSUES_REQUEST} = require('../../../pages/IssuesPages.js');
    const issues = new IssuesAdmin(page, app.contextPath);
    await issues.goto(tab);
    const dialog = await issues.openQuestion(tab, name, 'Delete', ISSUES_TEXT.confirmDelete);
    const question = flat(await dialog.innerText(), 300);
    const r = await issues.answer(dialog, 'OK', ISSUES_REQUEST.deleteIssue);
    await idle(page);
    await sleep(800);
    await issues.goto(tab);
    const rowsAfter = (await issues.names(tab).allInnerTexts()).map((s) => flat(s));
    return {question, status: r ? r.status() : null, rowsAfter};
}

module.exports = {T, sleep, flat, rel, ISSUE, FUTURE, readWorkflow, history, readArticlePage, deleteIssue};
