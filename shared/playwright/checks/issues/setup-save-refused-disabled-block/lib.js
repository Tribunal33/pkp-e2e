// Helpers for the U09 A15 / U10 A4 walk (setup-save-refused-disabled-block).
// The custom block window and the "Sidebar" basics come from the sibling
// custom-block libs. Requiring this file runs nothing.
const {idle} = require('../../../probe');
const C = require('../custom-block-stuck-with-unusable-name/lib');

const {T, sleep} = C;

const rowOf = (page, plugin) => page.locator(`tr.gridRow[id$="-row-${plugin}"]`).first();

/**
 * On "Plugins" (already open): tick or untick a plugin's box, answering
 * "OK" when unticking asks. Returns the grid's answer and the box's state.
 */
async function setPluginEnabled(page, plugin, on) {
    const row = rowOf(page, plugin);
    await row.waitFor({timeout: T});
    const box = row.getByRole('checkbox').first();
    if ((await box.isChecked()) === on) return {already: on};
    const answered = page.waitForResponse((r) => /plugin-grid\/(enable|disable)/.test(r.url()), {timeout: T});
    await box.click();
    let asked = null;
    if (!on) {
        const ask = page.locator('[role="dialog"]:visible').filter({hasText: 'Are you sure you want to disable this plugin?'}).last();
        await ask.waitFor({timeout: T});
        asked = (await ask.innerText()).replace(/\s+/g, ' ').trim();
        await ask.getByRole('button', {name: 'OK', exact: true}).click();
    }
    const r = await answered;
    await idle(page);
    await sleep(500);
    return {asked, status: r.status(), now: await rowOf(page, plugin).getByRole('checkbox').first().isChecked()};
}

/** The "Appearance" › "Setup" form (already open). */
const setupForm = (page) => page.locator('form').filter({has: page.locator('input[name="sidebar"]')}).first();

/** The English "Page Footer" editor's id on "Appearance" › "Setup". */
async function footerEditorId(page) {
    const id = await setupForm(page).locator('textarea[id*="pageFooter"][id$="-en"]').first().getAttribute('id', {timeout: T});
    await page.waitForFunction((x) => window.tinymce && window.tinymce.get(x) && window.tinymce.get(x).initialized, id, {timeout: T});
    return id;
}

/** Type text at the end of the English "Page Footer". */
async function typeFooter(page, text) {
    const id = await footerEditorId(page);
    await page.locator(`[id="${id}_ifr"]`).contentFrame().locator('body').click();
    await page.keyboard.press('ControlOrMeta+End');
    await page.keyboard.type(text);
    await setupForm(page).locator('legend, label').first().click().catch(() => {});
    await sleep(300);
}

/** The English "Page Footer" as its editor holds it. */
async function footerText(page) {
    const id = await footerEditorId(page);
    return page.evaluate((x) => window.tinymce.get(x).getContent({format: 'text'}).trim(), id);
}

/**
 * "Save" on "Appearance" › "Setup"; returns the request, its answer, whether
 * "Saved" showed, the messages under the fields and the form's foot.
 */
async function saveSetup(page) {
    const form = setupForm(page);
    const answered = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answered;
    let posted = null;
    try { posted = JSON.parse(r.request().postData() || 'null'); } catch { posted = null; }
    const saved = r.ok() && await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 5000}).then(() => true).catch(() => false);
    await sleep(500);
    const errors = await form.locator('.pkpFieldError__message').evaluateAll((els) => [...new Set(els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean))]);
    const foot = await form.locator('.pkpFormPage__footer, .pkpFormPage__status, .pkpFormErrors').first().innerText().catch(() => null);
    let body = null;
    try { body = await r.json(); } catch { body = null; }
    return {
        request: `${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`,
        override: r.request().headers()['x-http-method-override'] || null,
        postedSidebar: posted ? posted.sidebar : undefined,
        status: r.status(), body: r.ok() ? undefined : body, saved, errors,
        foot: foot ? foot.replace(/\s+/g, ' ').trim().slice(0, 300) : null,
    };
}

module.exports = {...C, setPluginEnabled, setupForm, footerEditorId, typeFooter, footerText, saveSetup};
