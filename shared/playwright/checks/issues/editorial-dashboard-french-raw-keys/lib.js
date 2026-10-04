// Helpers of walk.js (U23 A12: the editorial "Submissions" dashboard in French (Canada) shows raw
// codes). Requiring this file runs nothing. The reviewer's acceptance reuses
// ../accepted-review-row-due-date-clock-time/lib.js and ../reviewer-own-round-listed-under-previous-reviews/lib.js,
// the language switch ../custom-block-stuck-with-unusable-name/lib.js.
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Per app (dataset.md, `main` and 3.5): the submission in review whose round-1 request `phudson`
 * has not answered (OJS 12, OMP 17), and one with a completed review for the neighbour check
 * (OJS 10, OMP 16). A preprint server has no review.
 */
const REVIEW = {
    ojs: {id: 12, reviewer: 'phudson', completed: 10},
    omp: {id: 17, reviewer: 'phudson', completed: 16},
};

/** What the screen reader's live regions (`#announcer`: the page's own and vue-announcer's) hold now. */
const announcer = (page) => page.locator('[id="announcer"]').evaluateAll((els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' | ')).catch(() => null);

/** Open "Active submissions" from the side menu (in the language the page is in); returns the link's text and what the live region said. */
async function openActive(page) {
    const link = page.locator('nav a[href*="currentViewId=active"]').first();
    const label = flat(await link.innerText().catch(() => null), 80);
    await link.click();
    await page.waitForURL(/currentViewId=active/, {timeout: T});
    await idle(page);
    await page.locator('main table tbody tr').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    await sleep(500);
    return {link: label, url: page.url().replace(/^https?:\/\/[^/]+/, ''), heading: flat(await page.locator('main h1').first().innerText().catch(() => null), 120), announcer: await announcer(page)};
}

/** The list's own search box (not the side menu's); fill it with `phrase`, press Enter, read the live region. */
async function searchList(page, phrase) {
    const box = page.locator('main input[type="search"]').first();
    const named = {placeholder: await box.getAttribute('placeholder').catch(() => null), ariaLabel: await box.getAttribute('aria-label').catch(() => null)};
    await box.fill(String(phrase));
    await box.press('Enter');
    await idle(page);
    await sleep(800);
    return {box: named, phrase, announcer: await announcer(page), rows: await page.locator('main table tbody tr').count()};
}

const MORE = /^(More Actions|Plus d.actions|##common\.moreActions##)$/;

/** The "…" button above the list: its accessible name and its menu's name and items (Escape closes it). */
async function moreActions(page) {
    const above = await page.locator('main button').evaluateAll((bs) => bs
        .filter((b) => !b.closest('table'))
        .map((b) => ({ariaLabel: b.getAttribute('aria-label'), text: b.textContent.replace(/\s+/g, ' ').trim()}))
        .filter((b) => /moreActions|More Actions|Plus d.actions/.test(`${b.ariaLabel} ${b.text}`)));
    const button = page.getByRole('button', {name: MORE}).first();
    if (!(await button.count())) return {found: false, above};
    await button.click();
    const menu = page.getByRole('menu').first();
    await page.getByRole('menuitem').first().waitFor({timeout: T}).catch(() => {});
    const out = {
        found: true,
        above,
        menuName: await menu.getAttribute('aria-label').catch(() => null),
        menuLabelledBy: await menu.evaluate((m) => {
            const id = m.getAttribute('aria-labelledby');
            const el = id && document.getElementById(id);
            return el ? el.getAttribute('aria-label') || el.textContent.replace(/\s+/g, ' ').trim() : null;
        }).catch(() => null),
        items: (await page.getByRole('menuitem').allInnerTexts().catch(() => [])).map((t) => flat(t, 80)),
    };
    await page.keyboard.press('Escape');
    await idle(page);
    return out;
}

/** The row of submission `id` on the list as shown: its cells' text, and the Editorial Activity cell's indicators. */
async function rowOf(page, id) {
    const index = await page.evaluate((wanted) => {
        const table = document.querySelector('main table');
        return table ? [...table.querySelectorAll('tbody tr')].findIndex((tr) => {
            const c = tr.querySelector('td, th');
            return c && Number(c.innerText.replace(/\D+/g, '')) === wanted;
        }) : -1;
    }, id);
    if (index < 0) return {listed: false};
    const row = page.locator('main table tbody tr').nth(index);
    const cells = (await row.locator('td, th').allInnerTexts()).map((t) => flat(t, 300));
    const columns = (await page.locator('main table thead th').allInnerTexts().catch(() => [])).map((t) => flat(t, 60));
    const activity = row.locator('td, th').nth(cells.length - 2);
    const indicators = await activity.locator('button').evaluateAll((bs) => bs.map((b) => ({
        text: b.textContent.replace(/\s+/g, ' ').trim(),
        shown: b.innerText.replace(/\s+/g, ' ').trim(),
        srOnly: [...b.querySelectorAll('.sr-only')].map((s) => s.textContent.replace(/\s+/g, ' ').trim()),
    })));
    return {listed: true, index, columns, cells, indicators};
}

/** Press indicator `n` of the row's Editorial Activity cell and read the popover that opens (Escape closes it). */
async function openIndicator(page, rowIndex, n) {
    const row = page.locator('main table tbody tr').nth(rowIndex);
    const count = await row.locator('td, th').count();
    const button = row.locator('td, th').nth(count - 2).locator('button').nth(n);
    await button.click();
    const panel = page.locator('[id^="headlessui-popover-panel"]').last();
    await panel.waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
    await idle(page);
    const out = {
        text: flat(await panel.innerText().catch(() => null), 600),
        headline: flat(await panel.locator('.mb-5').first().innerText().catch(() => null), 160),
        buttons: (await panel.getByRole('button').allInnerTexts().catch(() => [])).map((t) => flat(t, 60)),
    };
    await page.keyboard.press('Escape');
    await idle(page);
    return out;
}

/** Press "Filters" ("Filtres") above the list and read the panel: its text, its fields' labels and its raw codes; Escape closes it. */
async function filtersPanel(page) {
    await page.locator('main').getByRole('button', {name: /^(Filters|Filtres)$/}).first().click();
    const dialog = page.getByRole('dialog').last();
    await dialog.waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(page);
    await sleep(500);
    const out = {
        title: flat(await dialog.locator('h1, h2').first().innerText().catch(() => null), 120),
        labels: await dialog.evaluate((d) => [...d.querySelectorAll('legend, label, .pkpFormFieldLabel, .pkpFormField__heading')]
            .map((l) => l.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).filter((t, i, a) => a.indexOf(t) === i).slice(0, 60)).catch(() => []),
        codes: [...new Set((await dialog.innerText().catch(() => '')).match(/##[^#\s]+##/g) || [])],
        buttons: (await dialog.getByRole('button').allInnerTexts().catch(() => [])).map((t) => flat(t, 60)).filter(Boolean),
    };
    await page.keyboard.press('Escape');
    await idle(page);
    return out;
}

module.exports = {T, flat, sleep, REVIEW, announcer, openActive, searchList, moreActions, rowOf, openIndicator, filtersPanel};
