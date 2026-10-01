// Helpers for walk.js (U13 OJS4). Requiring this file runs nothing.
const fs = require('fs');
const path = require('path');
const {screen, shot, record, idle, loc} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * Settings › Website › "Plugins": tick a plugin's "Enabled" box (the
 * signed-in user must manage the journal). Reuses the Citation Style
 * Language page object with another plugin's row id.
 */
async function enablePlugin(page, app, pluginId) {
    const {CitationStyleSettings} = require('../../../pages/ArticleLandingPages');
    const settings = new CitationStyleSettings(page, app.contextPath);
    settings.pluginId = pluginId;
    await settings.openPlugins();
    const was = await settings.enabledBox().isChecked();
    if (!was) await settings.setEnabled(true);
    const out = {pluginId, wasEnabled: was, enabled: await settings.enabledBox().isChecked(), row: flat(await settings.row().innerText())};
    await shot(page, `plugin-${pluginId}`).catch(() => {});
    return out;
}

/**
 * A submission's Publication › "Contributors" › "Add Contributor": a
 * person with the given name, email and country, ticked "Author", saved.
 */
async function addContributor(page, app, submissionId, {given, family, email, country}) {
    const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
    const {ContributorsPanel} = require(path.join(app.suiteDir, 'pages', 'ContributorPages.js'));
    const pub = new PublicationScreen(page, app.contextPath);
    await pub.gotoWorkflow(submissionId);
    await pub.openEntry('Contributors');
    const panel = new ContributorsPanel(page);
    const dialog = await panel.openAdd();
    await panel.fillPerson(dialog, {given, family, email, country});
    const author = dialog.getByRole('checkbox', {name: 'Author', exact: true});
    if ((await author.count()) && !(await author.isChecked())) await author.check();
    await panel.savePanel(dialog);
    await idle(page);
    const rows = (await panel.rows().allInnerTexts()).map((t) => flat(t, 120));
    await shot(page, `contributors-${submissionId}`).catch(() => {});
    return {submissionId, rows};
}

/**
 * The publish button ("Schedule For Publication" / "Publish") and its
 * panel: "Assign To Current/Back Issue" with the issue named, or "Don't
 * Assign To An Issue" when `issueLabel` is null. Records the panel's text.
 */
async function publish(page, app, submissionId, issueLabel) {
    const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
    const pub = new PublicationScreen(page, app.contextPath);
    await pub.gotoWorkflow(submissionId);
    if (app.line === 'stable-3_5_0') return publish35(page, pub, submissionId, issueLabel);
    await pub.openEntry('Title & Abstract');
    if (issueLabel) await pub.publish({backIssueLabel: issueLabel});
    else await pub.publish();
    await idle(page);
    return {submissionId, status: flat(await pub.leftControls().innerText().catch(() => ''), 200)};
}

/**
 * 3.5: Publication › "Issue": pick the issue, "Save"; then "Publish" (or
 * "Schedule For Publication") and the panel's own "Publish". Records each
 * screen's words, since 3.5's flow differs from main's.
 */
async function publish35(page, pub, submissionId, issueLabel) {
    const out = {submissionId, line35: true};
    await pub.openEntry('Issue');
    // "Assign to Issue" opens a window with the "Issue" choice.
    await page.getByRole('button', {name: 'Assign to Issue', exact: true}).click();
    const assign = page.getByRole('dialog').filter({has: page.locator('select[name="issueId"]')}).last();
    await assign.waitFor({state: 'visible', timeout: T});
    await pub.selectIssueOption(assign, issueLabel);
    out.assignWindow = flat(await assign.innerText(), 400);
    const saved = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await assign.getByRole('button', {name: 'Save', exact: true}).click();
    const s1 = await saved;
    out.issueSave = s1 ? s1.status() : null;
    await idle(page);
    await sleep(1500);
    const button = pub.publishButton();
    await button.waitFor({state: 'visible', timeout: T});
    out.button = flat(await button.innerText());
    await button.click();
    const panelPublish = page.getByRole('dialog').getByRole('button', {name: 'Publish', exact: true}).last();
    await panelPublish.waitFor({state: 'visible', timeout: T});
    await sleep(800);
    out.panel = flat(await page.getByRole('dialog').last().innerText().catch(() => null), 600);
    await shot(page, `publish-panel-${submissionId}`).catch(() => {});
    const published = page.waitForResponse((r) => r.url().includes('/publish') && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await panelPublish.click();
    const s2 = await published;
    out.publish = s2 ? s2.status() : null;
    await idle(page);
    await sleep(1500);
    out.status = flat(await pub.leftControls().innerText().catch(() => ''), 200) || flat(await page.locator('body').innerText(), 300);
    return out;
}

/**
 * An article's public page: its status, the "Most read articles by the
 * same author(s)" section (heading and items with their links) and the
 * neighbouring footer sections.
 */
async function readArticle(page, app, articleId) {
    const response = await page.goto(app.url(`/index.php/${app.contextPath}/article/view/${articleId}`));
    await idle(page);
    const section = page.locator('#articlesBySameAuthorList');
    const out = {
        articleId,
        status: response ? response.status() : null,
        title: flat(await page.locator('h1').first().innerText().catch(() => null), 200),
        sectionCount: await section.count(),
        headingOnPage: (await page.getByRole('heading', {name: 'Most read articles by the same author(s)'}).count()) > 0,
    };
    if (out.sectionCount) {
        out.heading = flat(await section.locator('h2').innerText());
        out.items = await section.locator('li').evaluateAll((lis) =>
            lis.map((li) => ({
                text: li.innerText.replace(/\s+/g, ' ').trim(),
                links: [...li.querySelectorAll('a')].map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href').replace(/^https?:\/\/[^/]+/, '')})),
            }))
        );
        await loc(page, `article ${articleId}: "Most read articles by the same author(s)" section`, section);
    }
    const s = await screen(page);
    out.pageEnd = flat((s.text.main || '').slice(-600), 600);
    return out;
}

/** The size of the fleet server's log now, to read what a walk adds. */
function serverLogPath(app) {
    return path.join(app.suiteDir, '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
}
function logMark(app) {
    const p = serverLogPath(app);
    return fs.existsSync(p) ? fs.statSync(p).size : 0;
}
/** The lines the server logged since `mark` that name an error. */
function logSince(app, mark) {
    const p = serverLogPath(app);
    if (!fs.existsSync(p)) return {path: p, missing: true, lines: []};
    const fd = fs.openSync(p, 'r');
    const size = fs.statSync(p).size;
    const buf = Buffer.alloc(Math.max(0, size - mark));
    fs.readSync(fd, buf, 0, buf.length, mark);
    fs.closeSync(fd);
    const lines = buf
        .toString('utf8')
        .split('\n')
        .filter((l) => /RecommendByAuthor|getCurrentPublication|PHP (Fatal|Warning|Error)|Uncaught|failed to handle the hook/i.test(l))
        .map((l) => l.slice(0, 600));
    return {path: path.relative(process.cwd(), p), lines};
}

module.exports = {T, sleep, flat, enablePlugin, addContributor, publish, readArticle, logMark, logSince};
