// Helpers of walk.js here (issue report docs/issues/U44-OMP2-book-page-format-urn-code-label.md).
// Requiring this file runs nothing. Every helper reads what the screen shows; page objects are
// required inside the functions (probe kit rule).
const {idle} = require('../../../probe');

const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * A visitor's book page `/catalog/book/<sid>`: every publication-format details block, each row as
 * {label, value, links: [{text, href}]} (label and value as shown), plus the page's whole text for
 * a raw "other::urn" search.
 */
async function readBookFormats(page, app, sid) {
    const resp = await page.goto(app.url(`/index.php/${app.contextPath}/catalog/book/${sid}`));
    await idle(page);
    const blocks = await page.locator('.item.publication_format').evaluateAll((els) =>
        els.map((el) => ({
            heading: (el.querySelector('.item_heading .label')?.textContent || '').replace(/\s+/g, ' ').trim(),
            rows: Array.from(el.querySelectorAll(':scope > .sub_item:not(.item_heading)')).map((row) => {
                const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
                const label = row.querySelector(':scope > .label');
                const value = row.querySelector(':scope > .value');
                return {
                    cls: row.className,
                    label: f(label?.textContent),
                    value: f(value?.textContent),
                    links: value ? Array.from(value.querySelectorAll('a')).map((a) => ({text: f(a.textContent), href: a.getAttribute('href')})) : [],
                };
            }),
        }))
    );
    const body = await page.locator('body').innerText();
    return {status: resp ? resp.status() : null, blocks, rawCodeOnPage: body.includes('other::urn'), urnHeadTag: await page.evaluate(() => document.querySelector('meta[name="DC.Identifier.URN"]')?.getAttribute('content') || null)};
}

module.exports = {flat, readBookFormats};
