// Helpers of walk.js (U14 A18: a comment request made by hand is accepted on a submission that is not
// published, and while public comments are off; docs/issues/U14-A18-comment-request-unpublished-submission.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses, except `comment()`, which
// is the report's console snippet run in the user's own signed-in page. None throws on a control a fix
// changes; each records what it found.
const {idle, screen} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const strip = (u) => (u || '').replace(/^https?:\/\/[^/]+/, '');

/**
 * Open a dashboard view of the context (`mySubmissions`) and wait for the page's
 * `pkp` globals. Returns the address it landed on and whether the globals came.
 */
async function dashboard(page, app, view) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/${view}`));
    const ready = await page
        .waitForFunction(() => window.pkp && pkp.currentUser && pkp.currentUser.csrfToken, null, {timeout: T})
        .then(() => true)
        .catch(() => false);
    await idle(page);
    return {landed: strip(page.url()), ready};
}

/**
 * The report's console snippet: POST `comments` of the page's own context with the page's CSRF token,
 * as the article page's comment box sends it. Returns {status, json, base}; the base falls back to the
 * context's API address when the page carries no `pkp.context.apiBaseUrl` (stable lines).
 */
async function comment(page, app, publicationId, commentText) {
    const fallback = app.url(`/index.php/${app.contextPath}/api/v1/`);
    return page.evaluate(
        async ({publicationId, commentText, fallback}) => {
            const base = (window.pkp && pkp.context && pkp.context.apiBaseUrl) || fallback;
            const r = await fetch(base + 'comments', {
                method: 'POST',
                headers: {'Content-Type': 'application/json', 'X-Csrf-Token': (pkp.currentUser || {}).csrfToken},
                body: JSON.stringify({publicationId, commentText}),
            });
            const text = await r.text();
            let json = null;
            try {
                json = JSON.parse(text);
            } catch (e) {
                /* not JSON */
            }
            return {status: r.status, json, text: json ? undefined : text.slice(0, 300), base};
        },
        {publicationId, commentText, fallback}
    );
}

/** The parts of a `comments` answer the report quotes. */
function answer(r) {
    const j = r.json || {};
    return {
        status: r.status,
        id: j.id,
        isApproved: j.isApproved,
        contextId: j.contextId,
        publicationId: j.publicationId,
        publication: j.publication,
        error: j.id ? undefined : j,
        text: r.text,
    };
}

/**
 * Settings › Website › Content › "Comments": the state of "Enable Public Comments" (and, when `tick`, tick it
 * and press "Save", through the OJS U14 suite's page object; the lib/pkp tab is the same in the three apps).
 * On a line without the tab, the Website tabs alone.
 */
async function commentsSetting(page, app, {tick = false} = {}) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/website`));
    await idle(page);
    const out = {tabs: await page.locator('main').getByRole('tab').allInnerTexts().catch(() => [])};
    if (!out.tabs.map((t) => t.trim()).includes('Content')) return {...out, commentsTab: false};
    const {CommentsSettingsTab} = require('../../../../../apps/ojs/playwright/pages/ReaderCommentsPages.js');
    const tab = new CommentsSettingsTab(page, app.contextPath);
    await tab.openCommentsTab();
    out.commentsTab = true;
    out.ticked = await tab.box().isChecked();
    if (tick && !out.ticked) {
        await tab.box().check();
        await tab.save();
        await tab.openCommentsTab();
        out.tickedAfterSave = await tab.box().isChecked();
    }
    return out;
}

/** The reviewer's review page of a submission: whether it shows the author's family name anywhere. */
async function reviewPage(page, app, submissionId, familyName) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewer/submission/${submissionId}`));
    await idle(page);
    const s = await screen(page);
    const text = [s.text && s.text.main, s.text && s.text.header].join('\n');
    return {landed: strip(page.url()), heading: flat(await page.locator('main h1, main h2').first().innerText().catch(() => null), 200), namesAuthor: text.includes(familyName), screen: s};
}

/** The Comments page by its address: its heading and every row of its first tab, as texts. */
async function commentsPage(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/userComments`));
    const heading = page.locator('main h1', {hasText: /^\s*Comments\s*$/});
    const open = await heading.waitFor({timeout: T}).then(() => true).catch(() => false);
    if (!open) return {landed: strip(page.url()), open, screen: await screen(page)};
    const rows = page.locator('main [role="tabpanel"]:visible tbody tr');
    await page
        .waitForFunction(() => ![...document.querySelectorAll('main [role="tabpanel"] tbody tr')].some((r) => /^\s*Loading\s*$/.test(r.innerText)), null, {timeout: T})
        .catch(() => {});
    await idle(page);
    return {
        landed: strip(page.url()),
        open,
        tabs: await page.locator('main').getByRole('tab').allInnerTexts(),
        rows: (await rows.allInnerTexts()).map((t) => flat(t, 400)),
        screen: await screen(page),
    };
}

/**
 * The article page (OJS): with comments on, type `text` in the comment box and press "Submit"; returns the
 * request the box sent and its answer status (the neighbour check's screen path).
 */
async function commentThroughBox(page, app, submissionId, text) {
    const {ArticleCommentsPage} = require('../../../../../apps/ojs/playwright/pages/ReaderCommentsPages.js');
    const landing = new ArticleCommentsPage(page, app.contextPath);
    const sent = [];
    const listen = async (res) => {
        if (/\/api\/v1\/comments$/.test(res.url()) && res.request().method() === 'POST') {
            sent.push({status: res.status(), body: res.request().postDataJSON()});
        }
    };
    page.on('response', listen);
    await landing.goto(submissionId);
    await idle(page);
    const offered = await landing.box().count();
    if (offered) await landing.writeComment(text).catch((e) => sent.push({error: flat(e.message, 300)}));
    await idle(page);
    page.off('response', listen);
    return {offered: offered > 0, sent, pending: offered ? await landing.comment(text).count() : 0};
}

module.exports = {flat, dashboard, comment, answer, commentsSetting, reviewPage, commentsPage, commentThroughBox};
