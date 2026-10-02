// Helpers for the Settings > Users & Roles > "Users" tab walks (U53 A11, A4).
// Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (t, n = 400) => (t == null ? null : String(t).replace(/\s+/g, ' ').trim().slice(0, n));

/** Open Settings > Users & Roles in `lang` ('en' | 'fr_CA') and wait for the users list's first row. */
async function openUsersTab(app, page, lang) {
    await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/management/settings/access`));
    await idle(page);
    await page.locator('#users table').last().locator('tbody tr').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
}

/** The users list's search box (the Search component's input). */
function searchBox(page) {
    return page.locator('main input.pkpSearch__input').first();
}

/**
 * What the "Users" tab shows: the search box's placeholder and screen-reader label, every
 * table's caption heading, header cells (rendered text and source text, since the
 * columns are upper-cased by CSS), and the buttons above the tables.
 */
async function usersTabFacts(page) {
    const box = searchBox(page);
    const placeholder = await box.getAttribute('placeholder').catch(() => null);
    const label = flat(await page.locator('main .pkpSearch label .-screenReader').first().textContent().catch(() => null));
    const tables = await page.locator('#users table').evaluateAll((els) => els.map((t) => {
        const wrap = t.closest('.pkpTable, div') || t.parentElement;
        let heading = null;
        for (let el = t; el && !heading; el = el.parentElement) {
            const h = el.querySelector('h2, h3, h4');
            if (h) heading = h.textContent.replace(/\s+/g, ' ').trim();
        }
        return {
            heading,
            ariaLabel: t.getAttribute('aria-label'),
            columns: [...t.querySelectorAll('thead th')].map((th) => ({
                shown: th.innerText.replace(/\s+/g, ' ').trim(),
                text: th.textContent.replace(/\s+/g, ' ').trim(),
            })),
            wrap: !!wrap,
        };
    }));
    const buttons = (await page.locator('#users button:visible').allInnerTexts().catch(() => [])).map((t) => flat(t)).filter(Boolean);
    return {placeholder, label, tables, buttons};
}

/** Type `term` into the search box and press Enter; return the list's heading and row texts. */
async function searchUsers(page, term) {
    const box = searchBox(page);
    await box.fill(term);
    const answer = page.waitForResponse((r) => /\/api\/v1\/users\?/.test(r.url()), {timeout: T}).catch(() => null);
    await box.press('Enter');
    const res = await answer;
    await idle(page);
    const table = page.locator('#users table').last();
    const rows = await table.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()));
    const heading = flat(await page.locator('#users h3, #users h2').filter({hasText: /\(\d+\)/}).last().innerText().catch(() => null));
    return {term, status: res ? res.status() : null, heading, rows};
}

module.exports = {T, flat, openUsersTab, searchBox, usersTabFacts, searchUsers};
