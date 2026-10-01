// Helpers for walk.js and neighbour.js (U57 A3, language-block-loses-page-on-port).
// "Sidebar" on "Appearance" › "Setup", "Save" and "Change Language" come from the
// sibling setup-save-refused-disabled-block lib, a second journal made on Hosted
// Journals from the oai-own-address-loses-deleted-records lib. Requiring this file runs nothing.
const {idle} = require('../../../probe');
const S = require('../setup-save-refused-disabled-block/lib');
const {createPublicContext} = require('../oai-own-address-loses-deleted-records/lib');

const {T, sleep} = S;
const LTB = 'languagetoggleblockplugin';
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');

/** The sidebar "Language" block on the open page: heading and links (text, address, its `source`). */
async function readBlock(page) {
    const block = page.locator('.block_language').first();
    if (!(await block.count())) return null;
    const heading = (await block.locator('.title').first().innerText()).trim();
    const links = await block.locator('a').evaluateAll((as) => as.map((a) => ({text: a.innerText.trim(), href: a.href})));
    return {heading, links: links.map((l) => ({text: l.text, href: rel(l.href), source: new URL(l.href).searchParams.get('source')}))};
}

/**
 * In the sidebar "Language" block, choose the link named `label`; returns the
 * address chosen from, the redirects the browser followed, where it landed, the
 * page's language and its first heading.
 */
async function chooseInBlock(page, label) {
    const from = page.url();
    const link = page.locator('.block_language a').filter({hasText: label}).first();
    const href = await link.getAttribute('href', {timeout: T});
    const [resp] = await Promise.all([page.waitForNavigation({timeout: T}), link.click()]);
    await idle(page);
    const chain = [];
    for (let r = resp && resp.request(); r; r = r.redirectedFrom()) chain.unshift(rel(r.url()));
    return {
        from: rel(from),
        source: new URL(href, from).searchParams.get('source'),
        chain,
        landed: rel(page.url()),
        status: resp ? resp.status() : null,
        lang: await page.locator('html').getAttribute('lang'),
        title: await page.title(),
        heading: await page.locator('h1, h2').first().innerText().then((t) => t.trim()).catch(() => null),
    };
}

/** The browser's Back: where it lands, in which language, and the search box's terms. */
async function goBack(page) {
    await page.goBack({timeout: T});
    await idle(page);
    return {
        landed: rel(page.url()),
        lang: await page.locator('html').getAttribute('lang'),
        title: await page.title(),
        query: await page.locator('input[name="query"]').first().inputValue({timeout: 2000}).catch(() => null),
    };
}

/** Administration › "Site Settings" › "Appearance" › "Setup" (a fresh load): the "Sidebar" boxes. */
async function openSiteSidebarList(app, page) {
    return S.openSidebarList(app, page, 'index');
}

/**
 * Tick "Language Toggle Block" under "Sidebar" (the list already open) and "Save";
 * a journal's form saves to its context, the site's to the site.
 */
async function placeLanguageBlock(page, {site = false} = {}) {
    await page.locator(`input[name="sidebar"][value="${LTB}"]`).first().check();
    if (!site) return S.saveSetup(page);
    const form = page.locator('form').filter({has: page.locator('input[name="sidebar"]')}).first();
    const answered = page.waitForResponse((r) => /\/api\/v1\/site(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answered;
    const saved = r.ok() && await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 5000}).then(() => true).catch(() => false);
    return {request: `${r.request().method()} ${rel(r.url())}`, status: r.status(), saved};
}

module.exports = {...S, createPublicContext, T, sleep, rel, LTB, readBlock, chooseInBlock, goBack, openSiteSidebarList, placeLanguageBlock};
