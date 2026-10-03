// Helpers of walk.js (issue report on U12 A13: an edited announcement type keeps its old name
// until a reload). Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);

/** The names in a legacy grid's first column, in order (the grid's rows only). */
async function rowNames(grid) {
    return grid.locator('tbody tr.gridRow').evaluateAll((trs) =>
        trs.map((tr) => {
            const td = tr.querySelector('td');
            if (!td) return '';
            const copy = td.cloneNode(true);
            copy.querySelectorAll('a.show_extras, a.hide_extras, script').forEach((a) => a.remove());
            return copy.textContent.replace(/\s+/g, ' ').trim();
        }));
}

/**
 * Collect the answers of the grid's single-row refreshes (`…/fetch-row`) from now on, each
 * with its status and body: `{list(), stop()}`.
 */
function fetchRowAnswers(page) {
    const seen = [];
    const pending = new Set();
    const on = (r) => {
        if (!/\/fetch-row\b/.test(r.url())) return;
        const row = {method: r.request().method(), url: rel(r.url()), status: r.status()};
        seen.push(row);
        const p = r.text().then((t) => { row.body = flat(t, 800); }).catch(() => {}).finally(() => pending.delete(p));
        pending.add(p);
    };
    page.on('response', on);
    return {
        list: async () => { await Promise.all([...pending]); return seen.slice(); },
        stop: () => page.off('response', on),
    };
}

/**
 * In a legacy grid (`grid`, a locator on its container): press the link `addLabel`, type `name`
 * in the window's "Name" (English) and press "Save". Returns the window's title and the rows after.
 */
async function addItem(page, grid, {addLabel, formId, field = 'name[en]'}, name) {
    await grid.getByRole('link', {name: addLabel, exact: true}).first().click();
    const form = page.locator(`form#${formId}`);
    await form.waitFor({state: 'visible', timeout: T});
    const title = await page.getByRole('dialog').last().locator('h1, h2, .pkp_modal_panel > .header').first().innerText().catch(() => null);
    await form.locator(`input[name="${field}"]`).fill(name);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    await form.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    await sleep(500);
    return {window: flat(title), rows: await rowNames(grid)};
}

/**
 * Press the arrow of the row reading `rowName`, then `action` ("Edit", "Remove"). Returns the
 * row actions offered, or `{error}` when the row or the action is missing.
 */
async function rowAction(grid, rowName, action) {
    const row = grid.locator('tbody tr.gridRow').filter({hasText: rowName}).first();
    if (!(await row.count())) return {error: `no row reading "${rowName}"`};
    await row.locator('a.show_extras').click();
    const actions = row.locator('xpath=following-sibling::tr[1]');
    await actions.getByRole('link').first().waitFor({state: 'visible', timeout: T});
    const offered = (await actions.getByRole('link').allInnerTexts()).map((s) => flat(s)).filter(Boolean);
    await actions.getByRole('link', {name: action, exact: true}).click();
    return {offered, rowId: await row.getAttribute('id')};
}

/**
 * The open edit window (`formId`): read "Name", set it to `newName`, press "Save". Returns the
 * value it held, and whether the window closed.
 */
async function saveName(page, {formId, field = 'name[en]'}, newName) {
    const form = page.locator(`form#${formId}`);
    await form.waitFor({state: 'visible', timeout: T});
    const input = form.locator(`input[name="${field}"]`);
    await input.waitFor({state: 'visible', timeout: T});
    const held = await input.inputValue();
    await input.fill(newName);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const closed = await form.waitFor({state: 'detached', timeout: T}).then(() => true, () => false);
    await idle(page).catch(() => {});
    return {held, closed};
}

/** Press "OK" in the confirmation window that a row's "Remove" opens; returns its text. */
async function confirmOk(page) {
    const dialog = page.getByRole('dialog').last();
    await dialog.waitFor({state: 'visible', timeout: T});
    const text = flat(await dialog.innerText().catch(() => null), 300);
    await dialog.getByRole('button', {name: 'OK', exact: true}).click();
    await dialog.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    await sleep(500);
    return text;
}

/**
 * Administration › Site Settings › "Announcements" › "Settings": tick "Enable announcements" and
 * press "Save". Returns whether it was ticked before and whether "Saved" showed.
 */
async function enableSiteAnnouncements(app, page) {
    await page.goto(app.url('/index.php/index/en/admin/settings'));
    await idle(page).catch(() => {});
    const top = page.getByRole('tab', {name: 'Announcements', exact: true}).first();
    await top.waitFor({state: 'visible', timeout: T});
    await top.click();
    await page.getByRole('tab', {name: 'Settings', exact: true}).first().click();
    const panel = page.locator('#announcement-settings');
    const box = panel.getByRole('checkbox', {name: 'Enable announcements', exact: true});
    await box.waitFor({state: 'visible', timeout: T});
    const before = await box.isChecked();
    await box.check();
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const saved = await panel.locator('[role="status"]').filter({hasText: 'Saved'}).first()
        .waitFor({state: 'visible', timeout: T}).then(() => true, () => false);
    return {tickedBefore: before, saved};
}

/** The site's "Announcements" › "Announcement Types" side tab; returns the grid's container. */
async function openSiteTypes(app, page, {reload = true} = {}) {
    if (reload) {
        await page.goto(app.url('/index.php/index/en/admin/settings'));
        await idle(page).catch(() => {});
    }
    await page.getByRole('tab', {name: 'Announcements', exact: true}).first().click();
    await page.getByRole('tab', {name: 'Announcement Types', exact: true}).first().click();
    const grid = page.locator('#announcementTypeGridContainer');
    await grid.locator('table').first().waitFor({state: 'visible', timeout: T});
    await idle(page).catch(() => {});
    return grid;
}

/** The context's Announcements page, tab "Announcement Types"; returns the grid's container. */
async function openContextTypes(app, page) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/announcements`));
    await idle(page).catch(() => {});
    await page.getByRole('tab', {name: 'Announcement Types', exact: true}).first().click();
    const grid = page.locator('#announcementTypeGridContainer');
    await grid.locator('table').first().waitFor({state: 'visible', timeout: T});
    await idle(page).catch(() => {});
    return grid;
}

/** Settings › Workflow › "Submission" › "Components"; returns the grid's container. */
async function openComponents(app, page) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/workflow`));
    await idle(page).catch(() => {});
    await page.getByRole('tab', {name: 'Submission', exact: true}).first().click();
    await page.getByRole('tab', {name: 'Components', exact: true}).first().click();
    const grid = page.locator('#components');
    await grid.locator('tbody tr.gridRow').first().waitFor({state: 'visible', timeout: T});
    await idle(page).catch(() => {});
    return grid;
}

module.exports = {T, sleep, flat, rel, rowNames, fetchRowAnswers, addItem, rowAction, saveName, confirmOk,
    enableSiteAnnouncements, openSiteTypes, openContextTypes, openComponents};
