// Helpers for the author's "My Submissions" walks in English and French (U22 A6).
// Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (t, n = 400) => (t == null ? null : String(t).replace(/\s+/g, ' ').trim().slice(0, n));

/** The dataset author per app and their submission (dataset.md). */
const AUTHOR = {
    ojs: {username: 'jnovak', id: 10, title: 'Condensing Water Availability Models'},
    omp: {username: 'mpower', id: 16, title: "A Designer's Log"},
    ops: {username: 'ccorino', id: 1, title: 'The influence of lactation'},
};

/** Open the author's "My Submissions" in `lang` ('en' | 'fr_CA') and wait for the list's first row. */
async function openMySubmissions(app, page, lang) {
    if (!page.url().includes(`/${lang}/dashboard/mySubmissions`)) {
        await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/dashboard/mySubmissions`));
    }
    await idle(page);
    await page.locator('main table tbody tr').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
}

/** The row holding `title`: its cells as shown, with the column headings. */
async function rowFacts(page, title) {
    const table = page.locator('main table').first();
    const columns = (await table.locator('thead th').allInnerTexts().catch(() => [])).map((t) => flat(t, 80));
    const row = table.locator('tbody tr').filter({hasText: title}).first();
    if (!(await row.count())) return {columns, row: null};
    const cells = (await row.locator('td, th').allInnerTexts()).map((t) => flat(t, 300));
    return {columns, cells};
}

/** Every row of the list: its ID and its last-but-one (Editorial Activity) cell. */
async function allRows(page) {
    return page.locator('main table').first().locator('tbody tr').evaluateAll((trs) => trs.map((tr) => {
        const cells = [...tr.querySelectorAll('td, th')].map((c) => c.innerText.replace(/\s+/g, ' ').trim());
        return {id: cells[0], activity: cells[cells.length - 2]};
    }));
}

const MORE = /^(More Actions|Plus d.actions|##common\.moreActions##)$/;

/** The "…" button above the list: its accessible name (aria-label, else text) and its menu's items. */
async function moreActionsFacts(page) {
    const candidates = await page.locator('main button').evaluateAll((bs) => bs
        .filter((b) => !b.closest('table'))
        .map((b) => ({ariaLabel: b.getAttribute('aria-label'), text: b.textContent.replace(/\s+/g, ' ').trim(), shown: b.innerText.replace(/\s+/g, ' ').trim()}))
        .filter((b) => /moreActions|More Actions|Plus d.actions/.test(`${b.ariaLabel} ${b.text}`)));
    const button = page.getByRole('button', {name: MORE}).first();
    const found = await button.count();
    let menu = null;
    if (found) {
        await button.click();
        await page.getByRole('menuitem').first().waitFor({timeout: T}).catch(() => {});
        menu = (await page.getByRole('menuitem').allInnerTexts().catch(() => [])).map((t) => flat(t, 80));
        await page.keyboard.press('Escape');
        await idle(page);
    }
    return {accessibleNameMatched: !!found, candidates, menu};
}

module.exports = {T, flat, AUTHOR, openMySubmissions, rowFacts, allRows, moreActionsFacts};
