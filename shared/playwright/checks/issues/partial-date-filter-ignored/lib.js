// Helpers of walk.js (U15 A1: a partly chosen date filter on the Search page is ignored, and
// its selects then show a date the reader never chose). Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * From the context's home page, "Search" in the header (the Search page's own address when
 * the theme shows no such link). Returns how the page was reached.
 */
async function openSearch(app, page) {
    await page.goto(app.url(`/index.php/${app.contextPath}`));
    await idle(page).catch(() => {});
    const link = page.locator('header a[href*="/search"]').first();
    if (await link.isVisible().catch(() => false)) {
        await Promise.all([page.waitForEvent('load', {timeout: T}), link.click()]);
        await idle(page).catch(() => {});
        return 'header link';
    }
    await page.goto(app.url(`/index.php/${app.contextPath}/search`));
    await idle(page).catch(() => {});
    return 'address';
}

/** The three selects of a date filter ('dateFrom' or 'dateTo'): the option shown in each. */
async function readSelects(page, prefix) {
    const out = {};
    for (const part of ['Year', 'Month', 'Day']) {
        const sel = page.locator(`select[name="${prefix}${part}"]`);
        out[part] = (await sel.count())
            ? await sel.evaluate((s) => (s.selectedIndex < 0 ? null : s.options[s.selectedIndex].text.trim()))
            : 'no such select';
    }
    out.yearOptions = (await page.locator(`select[name="${prefix}Year"] option`).allInnerTexts().catch(() => [])).map((t) => t.trim());
    return out;
}

/**
 * On the open Search page: the box left as `query` (empty by default), each part of
 * `choose` ({dateFromYear: '2026', dateToMonth: 'Jan', …}) chosen by its label, "Search"
 * pressed. Returns the address, the listed titles, the notice and both filters' selects.
 */
async function searchWith(page, choose, query = '') {
    const form = page.locator('.page_search form').filter({has: page.locator('input[name="query"]')}).first();
    await form.locator('input[name="query"]').fill(query);
    for (const [name, label] of Object.entries(choose)) {
        await form.locator(`select[name="${name}"]`).selectOption({label});
    }
    const before = {dateFrom: await readSelects(page, 'dateFrom'), dateTo: await readSelects(page, 'dateTo')};
    await Promise.all([page.waitForEvent('load', {timeout: T}), form.locator('button[type="submit"]').first().click()]);
    await idle(page).catch(() => {});
    return {chosen: choose, query, beforeSearch: {dateFrom: strip(before.dateFrom), dateTo: strip(before.dateTo)}, ...(await readResults(page))};
}

const strip = ({Year, Month, Day}) => ({Year, Month, Day});

/** What the Search page shows after a search: titles listed, the notice, the selects. */
async function readResults(page) {
    const titles = await page.locator('.page_search a[href*="/article/view/"], .page_search a[href*="/preprint/view/"], .page_search a[href*="/catalog/book/"]')
        .evaluateAll((as) => [...new Set(as.map((a) => a.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean))]);
    const notice = flat(await page.locator('.page_search .cmp_notification').first().innerText({timeout: 2000}).catch(() => null), 200);
    const count = flat(await page.locator('.page_search .cmp_pagination .current, .page_search .cmp_pagination').first().innerText({timeout: 2000}).catch(() => null), 120);
    return {
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        listed: titles.length,
        titles: titles.map((t) => flat(t, 90)),
        notice,
        paging: count,
        dateFrom: await readSelects(page, 'dateFrom'),
        dateTo: await readSelects(page, 'dateTo'),
    };
}

module.exports = {T, flat, openSearch, readSelects, searchWith, readResults};
