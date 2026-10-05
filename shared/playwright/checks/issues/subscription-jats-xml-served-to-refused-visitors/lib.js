// Helpers of walk.js (issue report U48 A22: the article page's "JATS XML" serves a restricted
// article's text to visitors its galleys refuse). Requiring this file runs nothing. Every
// helper presses what a person presses, or reads what the screen shows, on OJS.
'use strict';
const fs = require('fs');
const {idle, serverLog} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));

const TEXT = "sxx2 This paragraph is the article's full text, for subscribers only.";

/** The article's text as an HTML file, for the "HTML" galley. */
const HTML = (name = 'sxx2-article.html') => ({
    name,
    mimeType: 'text/html',
    buffer: Buffer.from(`<!DOCTYPE html><html><head><title>sxx2 full text</title></head><body><h1>sxx2 full text</h1><p>${TEXT}</p></body></html>\n`),
});

/** The facts of a JATS XML text: whether it has a body, its body's text, its title. */
function xmlFacts(text) {
    if (!text) return {bytes: 0};
    const body = (text.match(/<body[\s>][\s\S]*?<\/body>/) || [null])[0];
    return {
        bytes: Buffer.byteLength(text, 'utf8'),
        isJats: /<article[\s>]/.test(text),
        title: flat((text.match(/<article-title[^>]*>([\s\S]*?)<\/article-title>/) || [null, null])[1], 160),
        body: body ? flat(body.replace(/<[^>]+>/g, ' '), 300) : null,
        carriesText: text.includes('sxx2 This paragraph'),
        head: body ? null : flat(text, 200),
    };
}

/**
 * The links of the article page's galley list (`a.obj_galley_link`), "JATS XML" included: the
 * label, whether it is marked restricted, the address.
 */
async function articleLinks(page) {
    return page.locator('.entry_details a.obj_galley_link, .main_entry a.obj_galley_link, a.obj_galley_link').evaluateAll((as) =>
        [...new Set(as)].map((a) => ({
            label: [...a.childNodes].filter((n) => !(n.nodeType === 1 && n.classList.contains('pkp_screen_reader'))).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim(),
            restricted: a.classList.contains('restricted'),
            href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, ''),
        }))
    );
}

/** "Archives" › the issue › the article's title: the article page, as a reader reaches it. */
async function openArticle(page, app, issue, title) {
    await page.goto(app.url(`/index.php/${app.contextPath}/issue/archive`));
    await idle(page).catch(() => {});
    await page.getByRole('link', {name: issue}).first().click();
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
    await page.locator('.obj_article_summary .title a').filter({hasText: title}).first().click();
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
    return {url: rel(page.url()), heading: flat(await page.locator('h1.page_title').first().innerText().catch(() => null), 120)};
}

/**
 * Press a galley link by its label and say where the reader landed: the page's address, title,
 * heading and first message, or the file it downloaded (name and, for XML, its facts), with the
 * status of every navigation and of the link's own request. Never throws: an absent link is
 * `{offered: false}`.
 */
async function press(page, app, label) {
    const links = await articleLinks(page);
    const i = links.findIndex((l) => l.label === label);
    if (i < 0) return {offered: false, links: links.map((l) => l.label)};
    const log = serverLog(app);
    const from = log.mark();
    const answers = [];
    const onResponse = (r) => {
        const u = rel(r.url());
        if (r.request().isNavigationRequest() || /\/jats\/download/.test(u)) {
            const h = r.headers();
            answers.push({status: r.status(), url: u, type: h['content-type'] || null, cacheControl: h['cache-control'] || null, disposition: h['content-disposition'] || null});
        }
    };
    page.on('response', onResponse);
    const dl = page.waitForEvent('download', {timeout: 10_000}).catch(() => null);
    await page.locator('a.obj_galley_link').filter({hasText: label}).first().click();
    const d = await Promise.race([dl, sleep(4000).then(() => null)]);
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
    await sleep(500);
    page.off('response', onResponse);
    const out = {offered: true, link: links[i], answers};
    if (d) {
        out.download = d.suggestedFilename();
        const file = await d.path().catch(() => null);
        const text = file ? fs.readFileSync(file, 'utf8') : '';
        out.xml = xmlFacts(text);
    } else {
        const main = page.locator('.pkp_structure_main').first();
        out.landed = {
            url: rel(page.url()),
            title: flat(await page.title().catch(() => null), 120),
            heading: flat(await main.locator('h1, h2').first().innerText({timeout: 3000}).catch(() => null), 120),
            message: flat(await main.locator('.cmp_notification, .pkp_form_error, p').first().innerText({timeout: 3000}).catch(() => null), 300),
            body: (await main.count()) ? null : flat(await page.locator('body').innerText().catch(() => ''), 300),
        };
    }
    out.serverLog = log.since(from);
    return out;
}

/**
 * Open the "JATS XML" link's address directly, as a person who copied the link does (the browser's
 * own request, with its cookies): the status, the headers and the XML's facts.
 */
async function openAddress(page, app, href) {
    const r = await page.request.get(app.url(href), {maxRedirects: 0});
    const h = r.headers();
    const text = await r.text();
    return {status: r.status(), type: h['content-type'] || null, cacheControl: h['cache-control'] || null, location: h.location || null, ...(/xml/.test(h['content-type'] || '') ? xmlFacts(text) : {body: flat(text, 200)})};
}

module.exports = {T, sleep, flat, rel, TEXT, HTML, xmlFacts, articleLinks, openArticle, press, openAddress};
