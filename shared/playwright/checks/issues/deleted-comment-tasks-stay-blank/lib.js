// Helpers of walk.js (U14 A10). Requiring this file runs nothing. Every helper drives the screens,
// through the OJS U14 suite's page objects (required inside the call, once withApp has set the app).
const {idle, screen, signIn} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const PAGES = '../../../../../apps/ojs/playwright/pages';
const SHARED = '../../../pages';
const po = () => ({
    ...require(`${PAGES}/ReaderCommentsPages.js`),
    ...require(`${PAGES}/PublishSchedulePages.js`),
    DecisionPage: require(`${PAGES}/ReviewStagePages.js`).DecisionPage,
    WorkflowPage: require(`${SHARED}/WorkflowPage.js`).WorkflowPage,
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

/** Workflow › Publication › "Title & Abstract" › "Schedule For Publication" › "Don't Assign To An Issue" › "Confirm" › "Publish". */
async function publishFromSubmissionStage(page, ctx, submissionId) {
    const {PublishScreen} = po();
    const publish = new PublishScreen(page, ctx);
    await publish.gotoWorkflow(submissionId);
    await publish.openEntry('Title & Abstract');
    await publish.publish();
    return await screen(page);
}

/** The reader writes `text` in the article's comment box and presses "Submit". Returns the comment's id. */
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

/** The reader's "…" › "Report" on the comment holding `text`, reason `reason`, "Submit". */
async function report(page, ctx, submissionId, text, reason) {
    const {ArticleCommentsPage} = po();
    const landing = new ArticleCommentsPage(page, ctx);
    await landing.goto(submissionId);
    const dialog = await landing.openReportDialog(landing.comment(text));
    await landing.reasonBox(dialog).fill(reason);
    await landing.submitReport(dialog);
}

/** The editorial dashboard (its header carries "Tasks"). Returns the bell's count read on the fresh page. */
async function gotoDashboard(page, ctx) {
    const {TasksPanel} = po();
    await page.goto(`/index.php/${ctx}/dashboard/editorial`);
    const tasks = new TasksPanel(page);
    await tasks.bell().waitFor({timeout: T});
    await idle(page);
    return await tasks.count();
}

/**
 * Press "Tasks" and read every row: {sentence, title, unread}. The window stays open when
 * `keepOpen`, so the caller can press a row.
 */
async function readTasks(page, ctx, {keepOpen = false} = {}) {
    const {TasksPanel} = po();
    const badge = await gotoDashboard(page, ctx);
    const tasks = new TasksPanel(page);
    await tasks.open();
    const rows = await tasks.rows().evaluateAll((trs) =>
        trs.map((tr) => {
            const t = (sel) => (tr.querySelector(sel)?.textContent || '').replace(/\s+/g, ' ').trim();
            return {sentence: t('.task .message'), title: t('.task .details .submission'), unread: !!tr.querySelector('div.task.unread')};
        })
    );
    const shown = await screen(page);
    if (!keepOpen) await tasks.close();
    return {badge, rows, screen: shown, tasks};
}

/** The open Tasks window's rows with `sentence` and an empty text line. */
function blankRows(page, tasks, sentence) {
    return tasks.rowsOpening(sentence).filter({hasNot: page.locator('.task .details .submission', {hasText: /\S/})});
}

/** Press a row in the open Tasks window, then read where it lands on the Comments page (the panels, the "Error" dialog). */
async function pressTask(page, ctx, tasks, row) {
    const {CommentsPage} = po();
    const comments = new CommentsPage(page, ctx);
    await tasks.openTask(row);
    await page.waitForURL(/\/management\/settings\/userComments/, {timeout: T, waitUntil: 'commit'});
    await page.locator('main h1').first().waitFor({timeout: T});
    await idle(page);
    // the panels and the error dialog arrive with the page's own fetch
    await comments.commentPanel().or(comments.reportPanel()).or(comments.errorDialog()).first()
        .waitFor({timeout: 10_000}).catch(() => {});
    const error = comments.errorDialog();
    return {
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        errorDialog: (await error.count()) ? flat(await error.innerText()) : null,
        commentPanel: await comments.commentPanel().count(),
        reportPanel: await comments.reportPanel().count(),
        screen: await screen(page),
    };
}

/** Content › Comments: on which of the four tabs is a row holding `text`? */
async function commentListed(page, ctx, text) {
    const {CommentsPage} = po();
    const comments = new CommentsPage(page, ctx);
    await comments.goto();
    const out = {};
    for (const tab of ['All', 'Approved', 'Hidden/Needs Approval', 'Reported']) {
        await comments.openTab(tab);
        await comments.tableSettled();
        out[tab] = await comments.row(text).count();
    }
    return out;
}

/** Submission › Publication › "Unpublish"; Submission stage › "Decline Submission" › decision; "Delete" › "Confirm". */
async function unpublishDeclineDelete(page, ctx, submissionId) {
    const {PublishScreen, WorkflowPage, DecisionPage} = po();
    const publish = new PublishScreen(page, ctx);
    await publish.gotoWorkflow(submissionId);
    await publish.openEntry('Title & Abstract');
    await publish.unpublish();
    const workflow = new WorkflowPage(page, ctx);
    await workflow.selectStage('Submission');
    await workflow.actionButton('Decline Submission').click();
    const decision = new DecisionPage(page);
    await decision.expectOpen('Decline Submission');
    await decision.completeAll();
    const offered = await workflow.actionButtonLabels();
    await workflow.deleteSubmission();
    return {offeredBeforeDelete: offered, after: await screen(page)};
}

/**
 * Settings › Users & Roles › Users: `username`'s "…" › "Merge user", `into`'s row › "Settings" ›
 * "Merge into this User" › "OK". The list holds 39 accounts, so the row is found through the
 * list's search box when the first page does not show it.
 */
async function mergeUser(page, ctx, username, into) {
    const {UsersPage} = po();
    const users = new UsersPage(page, ctx);
    await page.goto(users.url());
    await idle(page);
    let searched = false;
    if (!(await users.userRow(username).isVisible().catch(() => false))) {
        const box = page.getByRole('searchbox').or(page.locator('main input[type="search"]')).first();
        await box.fill(username);
        await box.press('Enter');
        searched = true;
        await idle(page);
    }
    await users.userRow(username).waitFor({timeout: T});
    await users.mergeUser(username, into);
    return {searched, after: await screen(page)};
}

module.exports = {
    T, flat, po, signIn, enableComments, publishFromSubmissionStage, writeComment, approve, report,
    gotoDashboard, readTasks, blankRows, pressTask, commentListed, unpublishDeclineDelete, mergeUser,
};
