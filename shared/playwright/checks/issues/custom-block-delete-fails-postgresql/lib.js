// Helpers for walk.js and neighbour.js (U09 A14). Requiring this file runs nothing.
const fs = require('fs');
const path = require('path');
const {idle} = require('../../../probe');

const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '').replace(/csrfToken=[^&]+/, 'csrfToken=…');

/** The address of Settings › Website (a context path) or Administration › "Site Settings" ('index'). */
function settingsUrl(app, ctx) {
    return ctx === 'index'
        ? app.url('/index.php/index/en/admin/settings')
        : app.url(`/index.php/${ctx}/en/management/settings/website`);
}

/** Open a settings page's top tab (`plugins`, `appearance`) on a fresh page load. */
async function openTab(app, page, ctx, top) {
    await page.goto(settingsUrl(app, ctx));
    await idle(page);
    await page.locator(`#${top}-button`).first().click();
    await idle(page);
}

const pluginRow = (page) => page.locator('tr.gridRow[id$="-row-customblockmanagerplugin"]').first();

/** Tick "Custom Block Manager" on the Plugins tab (asks nothing); returns the grid's answer. */
async function enablePlugin(page) {
    const row = pluginRow(page);
    await row.waitFor({timeout: T});
    const box = row.getByRole('checkbox').first();
    if (await box.isChecked()) return {was: true};
    const answered = page.waitForResponse((r) => /plugin-grid\/enable/.test(r.url()), {timeout: T});
    await box.click();
    const r = await answered;
    await idle(page);
    await sleep(500);
    return {was: false, status: r.status(), now: await pluginRow(page).getByRole('checkbox').first().isChecked()};
}

/** Press a grid row's arrow and return its control row (where "Edit", "Delete", "Manage Custom Blocks" sit). */
async function rowControls(page, row) {
    const id = await row.getAttribute('id', {timeout: T});
    const opener = row.locator('a.show_extras');
    if (await opener.count()) { await opener.first().click(); await sleep(300); }
    return page.locator(`[id="${id}-control-row"]`);
}

const managerDialog = (page) => page.locator('[role="dialog"]:visible')
    .filter({has: page.locator('[id*="customblockgrid"], [id*="customBlockGrid"], table[id*="customblock"]')}).first();

/** The block names the "Custom Block Manager" window lists. */
async function managerRows(page) {
    const d = managerDialog(page);
    await d.locator('.pkp_controllers_grid').first().waitFor({timeout: T});
    await idle(page);
    return d.locator('tr.gridRow').evaluateAll((trs) => trs.map((tr) => {
        const td = tr.querySelector('td');
        const c = td ? td.cloneNode(true) : null;
        if (c) c.querySelectorAll('a.show_extras, a.hide_extras, script').forEach((a) => a.remove());
        return c ? c.textContent.replace(/\s+/g, ' ').trim() : null;
    }));
}

/** On the Plugins tab: the row's arrow › "Manage Custom Blocks"; returns the rows listed. */
async function openManager(page) {
    const ctl = await rowControls(page, pluginRow(page));
    await ctl.getByRole('link', {name: 'Manage Custom Blocks', exact: true}).first().click();
    await managerDialog(page).waitFor({timeout: T});
    return managerRows(page);
}

/** "Add Block", type "Block Name" and "Content" (English), "Save"; returns the save's answer and the rows. */
async function addBlock(page, name, content) {
    await managerDialog(page).getByRole('link', {name: 'Add Block', exact: true}).first().click();
    const form = page.locator('form#customBlockForm:visible').first();
    await form.waitFor({timeout: T});
    await idle(page);
    const ta = form.locator('textarea[name="blockContent[en]"]').first();
    const id = await ta.getAttribute('id');
    await page.waitForFunction((x) => window.tinymce && window.tinymce.get(x) && window.tinymce.get(x).initialized, id, {timeout: T});
    await form.locator('input[name="blockTitle[en]"]').first().fill(name);
    await page.locator(`[id="${id}_ifr"]`).contentFrame().locator('body').click();
    await page.keyboard.type(content);
    // the other languages' boxes open over the window's foot while a box has the focus
    await page.locator('[role="dialog"]:visible').filter({has: form}).last().locator('h1, h2').first().click();
    await sleep(300);
    const answered = page.waitForResponse((r) => /update-custom-block/.test(r.url()), {timeout: T});
    await form.locator('button[id^="submitFormButton"], button[type=submit]').first().click();
    const r = await answered;
    await page.locator('form#customBlockForm:visible').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    return {status: r.status(), rows: await managerRows(page)};
}

/**
 * A row's arrow › "Delete", then "OK" in the window that asks. Returns the
 * question, the answer to the delete request, and what the window shows
 * three seconds later (still open, a spinner, any message).
 */
async function deleteBlock(page, blockName) {
    const d = managerDialog(page);
    const row = d.locator(`tr.gridRow[id$="-row-${blockName}"]`).first();
    const ctl = await rowControls(page, row);
    await ctl.getByRole('link', {name: 'Delete', exact: true}).first().click();
    const ask = page.locator('[role="dialog"]:visible').filter({hasText: 'Are you sure you wish to delete this item?'}).last();
    await ask.waitFor({timeout: T});
    const question = flat(await ask.innerText());
    const answered = page.waitForResponse((r) => /delete-custom-block/.test(r.url()), {timeout: T});
    await ask.getByRole('button', {name: 'OK', exact: true}).click();
    const r = await answered;
    await sleep(3000);
    const askOpen = await ask.isVisible().catch(() => false);
    return {
        question,
        request: `${r.request().method()} ${rel(r.url())}`,
        status: r.status(),
        askOpen,
        askText: askOpen ? flat(await ask.innerText().catch(() => null)) : null,
        spinner: askOpen ? await ask.locator('.pkpSpinner').first().isVisible().catch(() => null) : null,
    };
}

/** Settings › Website › "Appearance" › "Setup" (a fresh load): the "Sidebar" boxes. */
async function openSidebarList(app, page, ctx) {
    await openTab(app, page, ctx, 'appearance');
    await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click();
    await page.locator('input[name="sidebar"]').first().waitFor({timeout: T});
    await idle(page);
    return page.locator('input[name="sidebar"]').evaluateAll((els) => els.map((e) => ({
        value: e.value, checked: e.checked, label: (e.closest('label') || e.parentElement).innerText.trim(),
    })));
}

/** Tick these blocks under "Sidebar" and "Save"; returns whether "Saved" showed. */
async function placeInSidebar(page, values) {
    for (const v of values) await page.locator(`input[name="sidebar"][value="${v}"]`).first().check();
    const form = page.locator('form').filter({has: page.locator('input[name="sidebar"]')}).first();
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    return page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: T}).then(() => true).catch(() => false);
}

/** The custom blocks in the public sidebar of a context's home page (a visitor's page). */
async function publicSidebar(app, page, ctx) {
    await page.goto(app.url(`/index.php/${ctx}/en`));
    await idle(page);
    return page.locator('.pkp_structure_sidebar .pkp_block').evaluateAll((els) => els
        .map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
}

/** This dataset fleet's server log, and the lines written to it since `from` (a byte offset). */
function serverLog(app) {
    const file = path.resolve(__dirname, '../../../../../apps', app.name, 'playwright/.server-logs',
        `server-${app.port}-ds${app.dataset}.log`);
    const size = () => (fs.existsSync(file) ? fs.statSync(file).size : 0);
    const since = (from, re) => {
        if (!fs.existsSync(file)) return [];
        const fd = fs.openSync(file, 'r');
        const len = size() - from;
        const buf = Buffer.alloc(Math.max(0, len));
        fs.readSync(fd, buf, 0, buf.length, from);
        fs.closeSync(fd);
        return buf.toString('utf8').split('\n').filter((l) => re.test(l)).map((l) => flat(l, 400));
    };
    return {file, size, since};
}

module.exports = {
    T, sleep, flat, rel, openTab, pluginRow, enablePlugin, openManager, managerRows,
    managerDialog, addBlock, deleteBlock, openSidebarList, placeInSidebar, publicSidebar, serverLog,
};
