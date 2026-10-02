// Helpers for walk.js (U59 A4). Requiring this file runs nothing.

const T = 30_000;
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per-app screen words. */
const WORDS = {
    ojs: {noun: 'Journal', hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal', wizard: {settings: 'Journal Settings', journal: 'Journal'}},
    omp: {noun: 'Press', hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press', wizard: {settings: 'Setup', journal: 'Press'}},
    ops: {noun: 'Server', hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server', wizard: {settings: 'Server Settings', journal: 'Server'}},
};

/**
 * Watch the page from now on: every request that is not a plain GET, every
 * legacy component call, and every full page load. `mark()` / `since(m)`
 * slice the requests; `loads()` counts the page loads seen.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} baseURL dropped from the recorded addresses
 */
function watch(page, baseURL) {
    const calls = [];
    let loads = 0;
    page.on('response', (r) => {
        const u = r.url();
        if (r.request().method() === 'GET' && !/\$\$\$call\$\$\$/.test(u)) return;
        if (/fetch-grid|fetch-row|notification/.test(u) && r.status() < 400) return;
        calls.push(`${r.status()} ${r.request().method()} ${u.replace(baseURL, '').replace(/\?.*$/, '').slice(0, 160)}`);
    });
    page.on('load', () => {
        loads += 1;
    });
    return {mark: () => calls.length, since: (m) => calls.slice(m), loads: () => loads};
}

/** A wizard side tab's (or top tab's) form: press the tabs, return the form. */
async function openForm(page, sideId) {
    await page.locator('#setup-button').first().click();
    await page.locator(`#${sideId}-button`).first().click();
    const form = page.locator(`[role="tabpanel"]#${sideId} form`).first();
    await form.waitFor({state: 'visible', timeout: T});
    return form;
}

/**
 * Press a form's "Save" and say what followed: the words beside the button
 * as they changed (sampled for `ms`), the requests the save sent, and
 * whether the page reloaded meanwhile. Never throws.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} form
 * @param {{mark: Function, since: Function, loads: Function}} w from watch()
 */
async function saveForm(page, form, w, ms = 3_000) {
    const m = w.mark();
    const loadsBefore = w.loads();
    const status = [];
    try {
        await form.getByRole('button', {name: 'Save', exact: true}).last().click({timeout: 10_000});
    } catch (e) {
        return {error: flat(e.message, 200)};
    }
    const start = Date.now();
    while (Date.now() - start < ms) {
        const st = (
            await form
                .locator('[role="status"]')
                .evaluateAll((es) => es.map((e) => e.innerText.trim()).filter(Boolean))
                .catch(() => [])
        ).join(' / ');
        if (st && status[status.length - 1] !== st) status.push(st);
        await page.waitForTimeout(100).catch(() => {});
    }
    return {status, requests: w.since(m), reloaded: w.loads() > loadsBefore};
}

/** Wait until no "Saved" (or "Saving") shows beside a form's button. */
async function statusGone(page, form) {
    await page
        .waitForFunction(
            (f) => ![...f.querySelectorAll('[role="status"]')].some((e) => e.innerText.trim()),
            await form.elementHandle(),
            {timeout: 15_000}
        )
        .catch(() => {});
}

/**
 * A box of a legacy list: the row found by a text it holds, the box under
 * the column headed `column`. Returns the locator (count 0 when not found).
 */
async function gridBox(page, containerSel, rowText, column) {
    const grid = page.locator(containerSel);
    await grid.locator('tbody tr.gridRow').first().waitFor({state: 'visible', timeout: T});
    const heads = await grid
        .locator('table')
        .first()
        .locator('thead th')
        .evaluateAll((ths) => ths.map((t) => t.textContent.replace(/\s+/g, ' ').trim()));
    const idx = heads.findIndex((h) => h === column);
    const row = grid.locator('table').first().locator('tbody tr.gridRow').filter({hasText: rowText}).first();
    if (idx < 0 || !(await row.count())) return {box: grid.locator('never-there'), heads, row: null};
    return {box: row.locator('td').nth(idx).locator('input[type="checkbox"]').first(), heads, row: flat(await row.innerText(), 80)};
}

/**
 * Press a list's box and say what followed: ticked before and after, the
 * requests, any window that opened (its words; answered "OK"). Never throws.
 */
async function pressBox(page, box, w, idle) {
    if (!(await box.count())) return {error: 'box not found'};
    const out = {before: await box.isChecked()};
    const m = w.mark();
    try {
        await box.click({timeout: 10_000});
        await page.waitForTimeout(1_500);
        await idle(page).catch(() => {});
        const dialog = page.locator('[role="dialog"]:visible').last();
        if (await dialog.count()) {
            out.window = flat(await dialog.innerText().catch(() => ''), 200);
            const ok = dialog.getByRole('button', {name: /^(OK|Yes)$/}).first();
            if (await ok.count()) {
                await ok.click();
                await page.waitForTimeout(1_500);
                await idle(page).catch(() => {});
            }
        }
    } catch (e) {
        out.error = flat(e.message, 200);
    }
    out.requests = w.since(m);
    return out;
}

/** "Users" › "Add User": the window that opens (its words), then closed. Never throws. */
async function pressAddUser(page, w, idle) {
    const out = {};
    const m = w.mark();
    try {
        await page.locator('#users-button').first().click();
        const link = page.locator('[role="tabpanel"]#users').getByRole('link', {name: 'Add User', exact: true}).first();
        await link.waitFor({state: 'visible', timeout: T});
        await idle(page).catch(() => {});
        await link.click();
        const dialog = page.locator('[role="dialog"]:visible').last();
        await dialog.waitFor({state: 'visible', timeout: 15_000});
        await page.waitForTimeout(1_500);
        await idle(page).catch(() => {});
        out.windowHeading = flat(await dialog.locator('h1, h2, .pkpModalDialog__title, [id$="-title"]').first().innerText().catch(() => null), 80);
        out.window = flat(await dialog.innerText().catch(() => ''), 200);
        out.hasUserForm = (await dialog.locator('input[name="givenName[en]"], input[name^="givenName"], input[name="username"]').count()) > 0;
        const ok = dialog.getByRole('button', {name: /^(OK|Close|Cancel)$/}).first();
        if (await ok.count()) await ok.click().catch(() => {});
        else await dialog.getByRole('link', {name: /^(Close|Cancel)$/}).first().click().catch(() => {});
        await page.waitForTimeout(800);
        // a filled legacy form asks before it closes
        const again = page.locator('[role="dialog"]:visible').last();
        if (await again.count()) await again.getByRole('button', {name: /^(OK|Yes)$/}).first().click().catch(() => {});
        await page.waitForTimeout(600);
    } catch (e) {
        out.error = flat(e.message, 200);
    }
    out.requests = w.since(m);
    return out;
}

module.exports = {T, flat, WORDS, watch, openForm, saveForm, statusGone, gridBox, pressBox, pressAddUser};
