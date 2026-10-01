// Helpers for walk.js and neighbour.js (U13 OJS6). Requiring this file runs nothing.
const {screen, record, idle} = require('../../../probe');

const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));

/**
 * The PDF reader's bar as a reader meets it: the return arrow's hidden
 * text (what a screen reader announces), its address, the title link and
 * the browser tab; then press the arrow and say where it led.
 */
async function readArrowAndPress(page, name) {
    const arrow = page.locator('header a.return');
    await arrow.waitFor({timeout: 20_000});
    const out = {
        reader: rel(page.url()),
        tab: flat(await page.title()),
        arrowName: flat(await arrow.textContent()),
        arrowRole: flat(await page.getByRole('link', {name: /Return|Retourner|##/}).first().textContent().catch(() => null)),
        arrowHref: rel(await arrow.getAttribute('href')),
        titleLink: flat(await page.locator('header a.title, header span.title').first().textContent()),
    };
    record(`${name}-reader`, await screen(page));
    await arrow.click();
    await page.waitForLoadState('domcontentloaded');
    await idle(page);
    out.landed = rel(page.url());
    out.landedTab = flat(await page.title());
    out.landedHeading = flat(await page.locator('h1').first().textContent().catch(() => null));
    record(`${name}-after-arrow`, await screen(page));
    return out;
}

module.exports = {readArrowAndPress, flat, rel};
