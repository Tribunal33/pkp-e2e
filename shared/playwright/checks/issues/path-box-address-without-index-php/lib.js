// Helpers for walk.js (U59 A3). Requiring this file runs nothing.

const T = 30_000;
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per-app screen words. */
const WORDS = {
    ojs: {noun: 'Journal', hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal', wizard: {settings: 'Journal Settings', journal: 'Journal'}},
    omp: {noun: 'Press', hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press', wizard: {settings: 'Setup', journal: 'Press'}},
    ops: {noun: 'Server', hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server', wizard: {settings: 'Server Settings', journal: 'Server'}},
};

/**
 * What stands in front of a form's "Path" box: the prefix's text as read,
 * the box's value, and whether the prefix is drawn whole (a long prefix is
 * cut to the box's width by FieldText.vue).
 *
 * @param {import('@playwright/test').Locator} form the journal form
 */
async function readPathPrefix(form) {
    const prefix = form
        .locator('#context-urlPath-control')
        .locator('xpath=following-sibling::span[contains(concat(" ", @class, " "), " pkpFormField__inputPrefix ")]');
    if (!(await prefix.count())) return {prefix: null, value: await form.locator('#context-urlPath-control').inputValue().catch(() => null)};
    await prefix.waitFor({state: 'visible', timeout: T});
    // FieldText measures the prefix 700 ms after mount; read after that.
    await form.page().waitForTimeout(900);
    const box = await prefix.evaluate((el) => ({
        text: el.textContent,
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
        style: el.style.cssText || null,
    }));
    return {
        prefix: box.text.trim(),
        value: await form.locator('#context-urlPath-control').inputValue(),
        drawnWhole: box.scrollWidth <= box.clientWidth,
        widths: box,
    };
}

/**
 * Open an address typed into the address bar and say where it ended:
 * status, final address (redirects followed), page title.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} url
 */
async function openTyped(page, url) {
    const res = await page.goto(url).catch((e) => ({error: flat(e.message, 200)}));
    if (res && res.error) return {typed: url, error: res.error};
    return {
        typed: url,
        status: res ? res.status() : null,
        landed: page.url(),
        title: await page.title().catch(() => null),
        heading: flat(await page.locator('h1').first().innerText({timeout: 3_000}).catch(() => null), 120),
    };
}

module.exports = {T, flat, WORDS, readPathPrefix, openTyped};
