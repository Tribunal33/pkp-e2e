// Helpers for walk.js (U50 A17, A18). Requiring this file runs nothing.
const path = require('path');
const {expect} = require('@playwright/test');
const {screen, record, shot, idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));

const ISSUE = 'Vol. 1 No. 2 (2014)';
const FUTURE = 'Vol. 2 No. 1 (2015)';

function frameFor(page, app) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    return new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
}

/** Open a submission's workflow on its newest version's "Title & Abstract" (main). */
async function openNewestVersion(page, app, submissionId) {
    const frame = frameFor(page, app);
    await frame.gotoEditorial(submissionId);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    const pages = frame.menuLink('Title & Abstract');
    if (app.line !== 'stable-3_5_0') {
        await expect(frame.latestVersionNode()).toBeVisible({timeout: T});
        if (!(await pages.last().isVisible().catch(() => false))) await frame.latestVersionNode().click();
    }
    await expect(pages.last()).toBeVisible({timeout: T});
    await pages.last().click();
    await idle(page);
    return {versionNodes: await frame.versionNodeLabels().catch((e) => `error ${e.message}`)};
}

/**
 * main: "Publish" on the shown version, the panel's "Issue Assignment" set to
 * `assignment` (a radio's label), "Confirm", then "Publish" in the question.
 */
async function publishShown(page, app, assignment, label) {
    const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
    const pub = new PublicationScreen(page, app.contextPath);
    const out = {button: flat(await pub.publishButton().innerText().catch(() => null))};
    const question = page.getByRole('dialog').filter({hasText: 'Are you sure you want to publish this?'});
    const panel = await pub.pressPublish();
    out.radios = await panel.locator('input[name="assignment"]').evaluateAll((els) =>
        els.map((e) => ({label: (e.closest('label')?.textContent || '').trim(), checked: e.checked}))
    );
    out.versionStage = await panel.locator('select[name="versionStage"]').inputValue().catch(() => null);
    await panel.getByRole('radio', {name: assignment, exact: true}).check();
    await sleep(500);
    out.panel = flat(await panel.innerText().catch(() => null), 900);
    record(`${label}-panel`, await screen(page));
    await shot(page, `${label}-panel`).catch(() => {});
    await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
    await expect(question).toBeVisible({timeout: T});
    out.question = flat(await question.innerText(), 400);
    const published = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 60_000});
    await question.getByRole('button', {name: 'Publish', exact: true}).click();
    const r = await published;
    out.publish = r.status();
    await idle(page);
    await sleep(1000);
    out.status = flat(await pub.leftControls().innerText().catch(() => null), 200);
    record(`${label}-published`, await screen(page));
    return out;
}

/** The issue's page as a reader sees it: sections and titles with their links. */
async function readIssuePage(page, app, tail) {
    const {IssueReader} = require('../../../pages/IssuesPages.js');
    const reader = new IssueReader(page, app.contextPath);
    const r = await page.goto(app.url(`/index.php/${app.contextPath}/${tail}`));
    await idle(page);
    const out = {url: rel(page.url()), status: r ? r.status() : null, heading: flat(await reader.heading().innerText().catch(() => null))};
    out.outline = await reader.tocOutline().catch((e) => `error ${e.message}`);
    out.links = await page.locator('.obj_issue_toc .obj_article_summary .title a').evaluateAll((as) =>
        as.map((a) => ({text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')}))
    ).catch(() => []);
    out.links = out.links.map((l) => ({...l, href: rel(l.href)}));
    return out;
}

/** An article page: status, heading, breadcrumb, the issue part, versions. */
async function readArticlePage(page, app, href) {
    const r = await page.goto(href.startsWith('http') ? href : app.url(href));
    await idle(page);
    const body = (await page.locator('body').innerText().catch(() => '')) || '';
    return {
        url: rel(page.url()),
        status: r ? r.status() : null,
        tab: await page.title(),
        heading: flat(await page.locator('.page h1, .pkp_structure_main h1').first().innerText().catch(() => null)),
        breadcrumb: flat(await page.locator('.cmp_breadcrumbs').innerText().catch(() => null)),
        issuePart: flat(await page.locator('.item.issue').innerText().catch(() => null), 300),
        published: flat((body.match(/Published\s*\n?[^\n]*/) || [null])[0], 120),
        versions: flat(await page.locator('.item.versions').innerText().catch(() => null), 300),
        versionLinks: (await page.locator('a[href*="/version/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).map(rel),
    };
}

/** Issues › "Back Issues": the issue row's "Items". */
async function backIssueItems(page, app, name = ISSUE) {
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    const admin = new IssuesAdmin(page, app.contextPath);
    await admin.goto('Back Issues');
    return {admin, items: flat(await admin.items('Back Issues', name).innerText())};
}

/** The issue's "Edit" › "Table of Contents": its outline. */
async function openToc(page, app, name = ISSUE) {
    const {admin, items} = await backIssueItems(page, app, name);
    const win = await admin.openManagement('Back Issues', name);
    await win.openTab('Table of Contents');
    return {admin, win, items, outline: await win.tocOutline()};
}

/** "Remove" on a row of the open window's table of contents, answered "OK". */
async function removeFromToc(page, win, title) {
    const {ISSUES_REQUEST, ISSUES_TEXT} = require('../../../pages/IssuesPages.js');
    const {answerQuestion} = require('../../../pages/IdentifiersPages.js');
    const dialog = await win.openRemove(title);
    const question = flat(await dialog.innerText(), 300);
    const r = await answerQuestion(page, dialog, 'OK', ISSUES_REQUEST.removeArticle);
    const body = r ? await r.text().catch(() => null) : null;
    await idle(page);
    await sleep(800);
    return {question, removeStatus: r ? r.status() : null, removeBody: flat(body, 200), outlineAfter: await win.tocOutline(), expected: ISSUES_TEXT.removeQuestion};
}

/** The workflow's status line for a submission. */
async function workflowStatus(page, app, submissionId) {
    const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
    const pub = new PublicationScreen(page, app.contextPath);
    await pub.gotoWorkflow(submissionId);
    await idle(page);
    await sleep(800);
    return flat(await pub.leftControls().innerText().catch(() => null), 200);
}

module.exports = {T, sleep, flat, rel, ISSUE, FUTURE, frameFor, openNewestVersion, publishShown, readIssuePage, readArticlePage, backIssueItems, openToc, removeFromToc, workflowStatus};
