// Helpers for walk.js (U13 OJS10). Requiring this file runs nothing.
const fs = require('fs');
const path = require('path');
const {screen, shot, idle, loc} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * A submission's Publication › "Metadata": type each keyword into the
 * "Keywords" box (Enter commits the chip), then "Save". Records the chips.
 */
async function addKeywords(page, app, submissionId, keywords) {
    const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
    const pub = new PublicationScreen(page, app.contextPath);
    await pub.gotoWorkflow(submissionId);
    await pub.openEntry('Metadata');
    const input = page.locator('input[id$="-keywords-control-en"]').first();
    await input.waitFor({state: 'visible', timeout: T});
    await loc(page, 'Publication › Metadata: the Keywords box (en)', input);
    for (const k of keywords) {
        await input.click();
        await input.pressSequentially(k, {delay: 15});
        await input.press('Enter');
        await page.getByRole('button', {name: `Remove ${k}`}).first().waitFor({state: 'visible', timeout: T});
    }
    const response = await pub.save();
    await idle(page);
    const chips = await page.getByRole('button', {name: /^Remove /}).evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') || b.innerText));
    await shot(page, `keywords-${submissionId}`).catch(() => {});
    return {submissionId, saved: response ? response.status() : null, chips: chips.map((c) => flat(c, 80))};
}

/** Schedule into a future (unpublished) issue without publishing (main). */
async function scheduleOnly(page, app, submissionId, issueLabel) {
    const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
    const pub = new PublicationScreen(page, app.contextPath);
    await pub.gotoWorkflow(submissionId);
    await pub.scheduleToFutureIssue(issueLabel);
    await idle(page);
    return {submissionId, status: flat(await pub.leftControls().innerText().catch(() => ''), 200)};
}

/**
 * An article's public page: its status and the "Similar Articles" section
 * (heading, items with their links, the advanced-search line).
 */
async function readArticle(page, app, articleId) {
    const response = await page.goto(app.url(`/index.php/${app.contextPath}/article/view/${articleId}`));
    await idle(page);
    const section = page.locator('#articlesBySimilarityList');
    const out = {
        articleId,
        status: response ? response.status() : null,
        title: flat(await page.locator('h1').first().innerText().catch(() => null), 200),
        sectionCount: await section.count(),
        headingOnPage: (await page.getByRole('heading', {name: 'Similar Articles'}).count()) > 0,
    };
    if (out.sectionCount) {
        out.heading = flat(await section.locator('h2').innerText());
        out.items = await section.locator('li').evaluateAll((lis) =>
            lis.map((li) => ({
                text: li.innerText.replace(/\s+/g, ' ').trim(),
                links: [...li.querySelectorAll('a')].map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href').replace(/^https?:\/\/[^/]+/, '')})),
            }))
        );
        out.pages = flat(await section.locator('#articlesBySimilarityPages').innerText().catch(() => null), 200);
        out.search = flat(await section.locator('#articlesBySimilaritySearch').innerText().catch(() => null), 200);
        out.searchHref = await section.locator('#articlesBySimilaritySearch a').getAttribute('href').catch(() => null);
        await loc(page, `article ${articleId}: "Similar Articles" section`, section);
    }
    const s = await screen(page);
    out.pageEnd = flat((s.text.main || '').slice(-600), 600);
    return out;
}

/** The fleet server's log, read from a mark to see what a walk adds. */
function serverLogPath(app) {
    return path.join(app.suiteDir, '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
}
function logMark(app) {
    const p = serverLogPath(app);
    return fs.existsSync(p) ? fs.statSync(p).size : 0;
}
/** The lines the server logged since `mark` that name an error or warning. */
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
        .filter((l) => /RecommendBySimilarity|Array to string|PHP (Fatal|Warning|Error|Notice|Deprecated)|Uncaught|failed to handle the hook|Error:/i.test(l))
        .map((l) => l.slice(0, 600));
    return {path: path.relative(process.cwd(), p), lines};
}

module.exports = {T, flat, addKeywords, scheduleOnly, readArticle, logMark, logSince};
