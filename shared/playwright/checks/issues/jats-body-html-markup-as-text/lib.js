// Helpers for the U48 A6 and A7 walks (the generated JATS XML's <body>).
// Requiring this file runs nothing.
const path = require('path');
const {expect} = require('@playwright/test');
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));

/** The HTML galley file both reports' steps upload (a heading, two paragraphs, an emphasis, an "&"). */
const HTML_FILE = path.join(__dirname, 'u48r8-body.html');

/** The <body> element of an XML string, or null when it has none. */
function bodyOf(xml) {
    if (!xml) return null;
    const m = String(xml).match(/<body\b[^>]*\/>|<body\b[^>]*>[\s\S]*?<\/body>/);
    return m ? m[0] : null;
}

/**
 * Open a page of one version in the workflow's side menu. `which` is
 * 'first' (the oldest version) or 'latest'. main lists a node per
 * version, its pages under it; 3.5 lists one version's pages, the one the
 * "All Versions" menu picks ("Version 1: …").
 */
async function openVersionPage(page, app, frame, which, label) {
    if (app.line === 'stable-3_5_0') {
        const all = page.getByRole('button', {name: 'All Versions'}).first();
        if (await all.isVisible().catch(() => false)) {
            await all.click();
            const items = page.getByRole('menuitem');
            await expect(items.first()).toBeVisible({timeout: T});
            const item = which === 'first' ? items.filter({hasText: /^\s*Version 1:/}).first() : items.last();
            await item.click();
            await idle(page);
            await sleep(800);
        }
        await frame.revealPublicationEntry(label);
        await frame.menuLink(label).first().click();
        await idle(page);
        return {version: flat(await page.getByText(/^Version:?$/).first().locator('..').innerText().catch(() => null), 120)};
    }
    const nodes = frame.versionNodes();
    await expect(nodes.first()).toBeVisible({timeout: T});
    const node = which === 'first' ? nodes.first() : nodes.last();
    const nodeLabel = flat(await node.innerText());
    for (let attempt = 0; attempt < 2; attempt++) {
        const entries = await frame.menuEntries();
        const at = entries.findIndex((e) => e.level === 2 && e.label === nodeLabel);
        let j = at + 1;
        for (; j < entries.length && entries[j].level > 2; j++) {
            if (entries[j].label === label) break;
        }
        if (at >= 0 && j < entries.length && entries[j].label === label) {
            const nth = entries.slice(0, j).filter((e) => e.label === label).length;
            await frame.menuLink(label).nth(nth).click();
            await idle(page);
            return {version: nodeLabel};
        }
        await node.click();
        await idle(page);
        await sleep(500);
    }
    throw new Error(`no "${label}" under "${nodeLabel}"`);
}

/**
 * Open a version's "JATS XML" page and read it: the XML the page's own GET
 * brought (`jatsContent`), the text the page shows, the line under it, and
 * the <body> of each.
 */
async function openJats(page, app, frame, which) {
    const respP = page.waitForResponse((r) => /\/publications\/\d+\/jats(\?|$)/.test(r.url()) && r.request().method() === 'GET', {timeout: T}).catch(() => null);
    const opened = await openVersionPage(page, app, frame, which, 'JATS XML');
    const r = await respP;
    let json = null;
    if (r) json = await r.json().catch(() => null);
    const panel = page.locator('.jatsPanel').first();
    await panel.locator('.filePanel__fileContent').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(page);
    await sleep(500);
    const shown = await panel.locator('.filePanel__fileContent').first().innerText().catch(() => null);
    const xml = json ? json.jatsContent : null;
    return {
        version: opened.version,
        request: r ? `GET ${r.status()} ${rel(r.url()).replace(/^.*\/index\.php/, '')}` : null,
        isDefaultContent: json ? json.isDefaultContent : null,
        line: flat(await panel.locator('.filePanel__defaultContentFooter, .filePanel__fileContentFooter').first().innerText().catch(() => null), 200),
        body: bodyOf(xml),
        shownBody: bodyOf(shown),
        xmlLength: xml ? xml.length : null,
    };
}

module.exports = {T, sleep, flat, rel, HTML_FILE, bodyOf, openVersionPage, openJats};
