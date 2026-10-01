// Helpers for the U09 A1 and A4/A13 walks (custom-block-listed-by-made-up-name,
// custom-block-stuck-with-unusable-name). The grid and sidebar basics come from the
// sibling A14 lib. Requiring this file runs nothing.
const {idle} = require('../../../probe');
const B = require('../custom-block-delete-fails-postgresql/lib');

const {T, sleep, flat} = B;

/** Press a grid row's arrow (when it has one) and return its control row, where its links sit. */
async function rowControls(page, row) {
    const id = await row.getAttribute('id', {timeout: T});
    const opener = row.locator('a.show_extras');
    if (await opener.count()) { await opener.first().click(); await sleep(300); }
    return page.locator(`[id="${id}-control-row"]`);
}

/** Script errors the page raises from now on, caught or not (page errors and console errors). */
function scriptErrors(page) {
    const errs = [];
    page.on('pageerror', (e) => errs.push(flat(e.message, 300)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(flat(m.text(), 300)); });
    return errs;
}

/** Settings › Website in a given interface language (`en`, `fr_CA`), on its "Plugins" tab. */
async function openPlugins(app, page, locale = 'en') {
    await page.goto(app.url(`/index.php/${app.contextPath}/${locale}/management/settings/website`));
    await idle(page);
    await page.locator('#plugins-button').first().click();
    await idle(page);
}

/** The plugin row's arrow › "Manage Custom Blocks" (any language); returns the rows listed. */
async function openManager(page) {
    const ctl = await rowControls(page, B.pluginRow(page));
    await ctl.locator('a[id*="-settings-button"]').first().click();
    await B.managerDialog(page).waitFor({timeout: T});
    return managerRowsFull(page);
}

/** Each row of the "Custom Block Manager" window: its id's block name, its text, whether it has an arrow. */
async function managerRowsFull(page) {
    const d = B.managerDialog(page);
    await d.locator('.pkp_controllers_grid').first().waitFor({timeout: T});
    await idle(page);
    return d.locator('tr.gridRow').evaluateAll((trs) => trs.map((tr) => {
        const td = tr.querySelector('td');
        const c = td ? td.cloneNode(true) : null;
        if (c) c.querySelectorAll('a.show_extras, a.hide_extras, script').forEach((a) => a.remove());
        return {
            name: (tr.id.match(/-row-(.*)$/) || [])[1] ?? null,
            text: c ? c.textContent.replace(/\s+/g, ' ').trim() : null,
            arrow: !!tr.querySelector('a.show_extras, a.hide_extras'),
        };
    }));
}

/** The block window's form, once its content editor is ready. */
async function blockForm(page) {
    const form = page.locator('form#customBlockForm:visible').first();
    await form.waitFor({timeout: T});
    await idle(page);
    const ta = form.locator('textarea[name="blockContent[en]"]').first();
    const id = await ta.getAttribute('id');
    await page.waitForFunction((x) => window.tinymce && window.tinymce.get(x) && window.tinymce.get(x).initialized, id, {timeout: T});
    return {form, editorId: id};
}

/** Press the window's "Save" and wait for the save's answer and the window to close. */
async function saveBlockForm(page, form) {
    // the other languages' boxes open over the window's foot while a box has the focus
    await page.locator('[role="dialog"]:visible').filter({has: form}).last().locator('h1, h2').first().click();
    await sleep(300);
    const answered = page.waitForResponse((r) => /update-custom-block/.test(r.url()), {timeout: T});
    await form.locator('button[id^="submitFormButton"], button[type=submit]').first().click();
    const r = await answered;
    await page.locator('form#customBlockForm:visible').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    return r.status();
}

/**
 * "Add Block" (any language), the English "Block Name" and "Content" only,
 * "Save"; returns the save's answer and the rows.
 */
async function addBlock(page, name, content) {
    await B.managerDialog(page).locator('a[id*="addCustomBlock-button"]').first().click();
    const {form, editorId} = await blockForm(page);
    await form.locator('input[name="blockTitle[en]"]').first().fill(name);
    await page.locator(`[id="${editorId}_ifr"]`).contentFrame().locator('body').click();
    await page.keyboard.type(content);
    const status = await saveBlockForm(page, form);
    return {status, rows: await managerRowsFull(page)};
}

/**
 * A row's arrow, then one of its links ("Edit" or "Delete"); returns what
 * opened within three seconds (the block window, the delete question, or
 * nothing) and the script errors raised meanwhile.
 */
async function pressRowAction(page, blockName, label, errs) {
    const d = B.managerDialog(page);
    const row = d.locator(`tr.gridRow[id$="-row-${blockName}"]`).first();
    const ctl = await rowControls(page, row);
    const link = ctl.getByRole('link', {name: label, exact: true}).first();
    const offered = await link.isVisible().catch(() => false);
    const before = errs.length;
    if (offered) await link.click();
    await sleep(3000);
    const form = await page.locator('form#customBlockForm:visible').count();
    const ask = page.locator('[role="dialog"]:visible').filter({hasText: 'Are you sure you wish to delete this item?'}).last();
    const asked = await ask.isVisible().catch(() => false);
    const out = {offered, blockWindowOpened: form > 0, deleteQuestion: asked ? flat(await ask.innerText()) : null, scriptErrors: errs.slice(before)};
    if (asked) await ask.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
    if (form) await page.locator('form#customBlockForm:visible').getByRole('link', {name: 'Cancel'}).first().click().catch(() => {});
    await sleep(600);
    return out;
}

/** A row's arrow › "Edit", a new English "Block Name", "Save"; returns the save's answer and the rows. */
async function renameBlock(page, blockName, newName) {
    const d = B.managerDialog(page);
    const row = d.locator(`tr.gridRow[id$="-row-${blockName}"]`).first();
    const ctl = await rowControls(page, row);
    await ctl.getByRole('link', {name: 'Edit', exact: true}).first().click();
    const {form} = await blockForm(page);
    await form.locator('input[name="blockTitle[en]"]').first().fill(newName);
    const status = await saveBlockForm(page, form);
    return {status, rows: await managerRowsFull(page)};
}

/**
 * On "Appearance" › "Setup" (already open): tick these "Sidebar" values and
 * "Save"; returns the save's answer, whether "Saved" showed, and the
 * messages the form showed under its fields.
 */
async function placeAndRead(page, values) {
    for (const v of values) await page.locator(`input[name="sidebar"][value="${v}"]`).first().check();
    const form = page.locator('form').filter({has: page.locator('input[name="sidebar"]')}).first();
    const answered = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answered;
    const saved = r.ok() && await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 5000}).then(() => true).catch(() => false);
    await sleep(500);
    const errors = await form.locator('.pkpFieldError__message').evaluateAll((els) => [...new Set(els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean))]);
    return {status: r.status(), saved, errors};
}

/** The initials menu › "Change Language" › the language whose link matches; waits for the address to carry `locale`. */
async function changeLanguage(page, label, locale) {
    await page.locator('[data-cy="app-user-nav"] button').first().click();
    const menu = page.locator('[data-cy="app-user-nav"] nav:visible').first();
    await menu.getByRole('link', {name: label}).first().click();
    await page.waitForURL(new RegExp(`/${locale}(/|$|\\?|#)`), {timeout: T});
    await idle(page);
}

module.exports = {
    ...B, rowControls, scriptErrors, openPlugins, openManager, managerRowsFull, blockForm, saveBlockForm, addBlock,
    pressRowAction, renameBlock, placeAndRead, changeLanguage,
};
