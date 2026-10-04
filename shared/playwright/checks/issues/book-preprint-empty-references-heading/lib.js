// Helpers for walk.js (U42 A20). Requiring this file runs nothing.
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));

/**
 * A landing page's "References" block as a reader sees it: how many blocks,
 * the heading, the value's text and its paragraphs, and the page's title.
 */
async function readHeading(page) {
    const block = page.locator('.item.references');
    const blocks = await block.count();
    const heading = blocks ? ((await block.first().locator('.label').first().innerText().catch(() => null)) || '').trim() : null;
    const valueText = blocks ? ((await block.first().locator('.value').first().innerText().catch(() => '')) || '').trim() : null;
    const paragraphs = blocks ? await block.first().locator('.value p').evaluateAll((ps) => ps.map((p) => p.innerText.trim())) : [];
    const html = blocks ? (await block.first().evaluate((el) => el.outerHTML)).replace(/\s+/g, ' ').slice(0, 600) : null;
    return {url: rel(page.url()), title: await page.locator('h1').first().innerText().catch(() => null), blocks, heading, valueText, paragraphs, html};
}

module.exports = {readHeading};
