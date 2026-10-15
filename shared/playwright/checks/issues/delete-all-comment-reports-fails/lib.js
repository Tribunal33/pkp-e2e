// Helpers of walk.js (U14 A19). Requiring this file runs nothing. Every helper drives the screens,
// through the OJS U14 suite's page objects (required inside the call, once withApp has set the app),
// apart from sendDeleteReports(), which types the one request no screen sends, as the browser
// console would, from a back-office page of the journal.
const {idle, screen} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const PAGES = '../../../../../apps/ojs/playwright/pages';
const SHARED = '../../../pages';
const po = () => ({
    ...require(`${PAGES}/ReaderCommentsPages.js`),
    TasksPanel: require(`${SHARED}/NotificationsPages.js`).TasksPanel,
});

/** Settings › Website › Content › Comments: tick "Enable Public Comments", "Save". */
async function enableComments(page, ctx) {
    const {CommentsSettingsTab} = po();
    const tab = new CommentsSettingsTab(page, ctx);
    await tab.goto();
    const was = await tab.box().isChecked();
    if (!was) await tab.box().check();
    await tab.save();
    await tab.openCommentsTab();
    return {was, now: await tab.box().isChecked()};
}

/** The reader types `text` in the article's comment box and presses "Submit". Returns the comment's id. */
async function writeComment(page, ctx, submissionId, text) {
    const {ArticleCommentsPage} = po();
    const landing = new ArticleCommentsPage(page, ctx);
    await landing.goto(submissionId);
    return await landing.writeComment(text);
}

/** Content › Comments: the row's "…" › "View Comment" › "Approve Comment". */
async function approve(page, ctx, text) {
    const {CommentsPage} = po();
    const comments = new CommentsPage(page, ctx);
    await comments.goto();
    await comments.viewComment(comments.row(text));
    await comments.setApproval('Approve Comment');
}

/** On the article's page, the comment's "…" › "Report", reason `reason`, "Submit". */
async function report(page, ctx, submissionId, text, reason) {
    const {ArticleCommentsPage} = po();
    const landing = new ArticleCommentsPage(page, ctx);
    await landing.goto(submissionId);
    const dialog = await landing.openReportDialog(landing.comment(text));
    await landing.reasonBox(dialog).fill(reason);
    await landing.submitReport(dialog);
}

/**
 * Content › Comments: is the comment on the "Reported" tab, and what does its panel's "Reports"
 * table list ("…" › "View Comment" from the "All" tab)? Leaves the panel closed.
 */
async function readComment(page, ctx, text) {
    const {CommentsPage} = po();
    const comments = new CommentsPage(page, ctx);
    await comments.goto();
    await comments.openTab('Reported');
    const out = {onReportedTab: await comments.row(text).count()};
    await comments.openTab('All');
    if (!(await comments.row(text).count())) return {...out, listed: false};
    const panel = await comments.viewComment(comments.row(text));
    await idle(page);
    await comments.reportsTable().locator('tbody tr').first().waitFor({timeout: T}).catch(() => {});
    out.address = page.url().replace(/^https?:\/\/[^/]+/, '');
    out.reportRows = await comments.reportRows().count();
    out.noReportsLine = await comments.noReports().count();
    out.reportsTable = flat(await comments.reportsTable().innerText().catch(() => ''), 600);
    out.screen = await screen(page);
    await comments.closeButton(panel).click();
    await comments.commentPanel().waitFor({state: 'detached', timeout: T}).catch(() => {});
    return out;
}

/** The editorial dashboard, "Tasks" pressed: the badge and every row {sentence, title, unread}. */
async function readTasks(page, ctx) {
    const {TasksPanel} = po();
    await page.goto(`/index.php/${ctx}/dashboard/editorial`);
    const tasks = new TasksPanel(page);
    await tasks.bell().waitFor({timeout: T});
    await idle(page);
    const badge = await tasks.count();
    await tasks.open();
    const rows = await tasks.rows().evaluateAll((trs) =>
        trs.map((tr) => {
            const t = (sel) => (tr.querySelector(sel)?.textContent || '').replace(/\s+/g, ' ').trim();
            return {sentence: t('.task .message'), title: t('.task .details .submission'), unread: !!tr.querySelector('div.task.unread')};
        })
    );
    await tasks.close();
    return {badge, rows};
}

/**
 * The request no screen sends, typed in the browser's developer console on the Comments page:
 * `DELETE {apiBaseUrl}comments/{id}/reports` with the page's CSRF token. Returns its status and body.
 */
async function sendDeleteReports(page, ctx, commentId) {
    const {CommentsPage} = po();
    await new CommentsPage(page, ctx).goto();
    await idle(page);
    return await page.evaluate(async (id) => {
        /* global pkp */
        const res = await fetch(`${pkp.context.apiBaseUrl}comments/${id}/reports`, {
            method: 'DELETE',
            headers: {'X-Csrf-Token': pkp.currentUser.csrfToken},
        });
        const body = await res.text();
        let json = null;
        try { json = JSON.parse(body); } catch (e) { /* not JSON */ }
        return {
            request: `DELETE ${pkp.context.apiBaseUrl.replace(/^https?:\/\/[^/]+/, '')}comments/${id}/reports`,
            status: res.status,
            json: json && typeof json === 'object' ? {...json, trace: undefined} : json,
            text: json ? undefined : body.slice(0, 600),
        };
    }, commentId);
}

module.exports = {T, flat, po, enableComments, writeComment, approve, report, readComment, readTasks, sendDeleteReports};
