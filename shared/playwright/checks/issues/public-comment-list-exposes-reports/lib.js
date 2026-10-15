// Helpers of walk.js (U14 A17). Requiring this file runs nothing. Every helper drives the screens,
// through the OJS U14 suite's page objects (required inside the call, once withApp has set the app).
const {idle, screen} = require('../../../probe');

const PAGES = '../../../../../apps/ojs/playwright/pages';
const po = () => require(`${PAGES}/ReaderCommentsPages.js`);
const flat = (s, n = 400) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

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

/**
 * Open the article's page, type `text` in the comment box, press "Submit". Returns the comment's id
 * and the publication ids the page itself asked comments for (its own `comments/public` request).
 */
async function writeComment(page, ctx, submissionId, text) {
    const {ArticleCommentsPage} = po();
    const asked = [];
    const listen = (req) => {
        const m = /\/api\/v1\/comments\/public\?(.*)$/.exec(req.url());
        if (m) asked.push(new URLSearchParams(m[1]).get('publicationIds'));
    };
    page.on('request', listen);
    const landing = new ArticleCommentsPage(page, ctx);
    await landing.goto(submissionId);
    await idle(page);
    page.off('request', listen);
    const id = await landing.writeComment(text);
    return {id, pagePublicationIds: [...new Set(asked)]};
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
 * Type an address into the browser and read what it answers: the status and, when it is JSON,
 * the parsed body (else the first 400 characters of the text).
 */
async function openAddress(page, path) {
    const response = await page.goto(path);
    const status = response ? response.status() : null;
    const text = response ? await response.text() : '';
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* not JSON */ }
    return {path, status, json, text: json ? undefined : flat(text)};
}

/** The comment holding `text` in a `comments/public` answer, reduced to what the report names. */
function commentIn(answer, text) {
    const items = (answer.json && (answer.json.data || answer.json.items)) || [];  // the list answers {data, total, pagination}
    const c = items.find((i) => i.commentText && i.commentText.includes(text));
    if (!c) return {found: false, items: items.length, total: answer.json && answer.json.total};
    return {
        found: true,
        id: c.id,
        isApproved: c.isApproved,
        isReported: c.isReported,
        hasReportsKey: Object.prototype.hasOwnProperty.call(c, 'reports'),
        reports: c.reports,
        moderatorFields: {approvedAt: c.approvedAt, approvedByUserName: c.approvedByUserName},
    };
}

/**
 * Content › Comments › "Reported" tab: the row's "…" › "View Comment", then the report's "…" ›
 * "View Report". Returns what the report panel shows (the reporter line and its text).
 */
async function viewReportOnCommentsPage(page, ctx, text, reason) {
    const {CommentsPage} = po();
    const comments = new CommentsPage(page, ctx);
    await comments.goto();
    await comments.openTab('Reported');
    const out = {reportedTabRows: await comments.row(text).count()};
    if (!out.reportedTabRows) return out;
    await comments.viewComment(comments.row(text));
    await idle(page);
    out.reportRows = await comments.reportRow(reason).count();
    if (!out.reportRows) return out;
    const panel = await comments.viewReport(comments.reportRow(reason));
    await idle(page);
    out.reportPanel = {
        person: flat(await comments.panelPerson(panel).innerText().catch(() => '')),
        showsReason: (await panel.getByText(reason).count()) > 0,
        text: flat(await panel.innerText(), 600),
    };
    out.screen = await screen(page);
    await comments.closeReportPanel();
    await comments.closeCommentPanel();
    return out;
}

module.exports = {flat, enableComments, writeComment, approve, report, openAddress, commentIn, viewReportOnCommentsPage};
