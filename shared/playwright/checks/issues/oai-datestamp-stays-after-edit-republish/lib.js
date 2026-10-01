// Helpers of walk.js (issue report docs/issues/U19-A18-oai-datestamp-stays-after-edit-republish.md).
// Requiring this file runs nothing. The helper drives a screen a person uses.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * On an open "Title & Abstract" page: `text` typed into "Prefix", then "Save". Returns
 * whether the box and "Save" could be used (a locked published version offers neither),
 * the save's status and the notice shown.
 */
async function savePrefix(page, text) {
    const d = page.getByRole('dialog').first();
    const box = d.getByRole('textbox', {name: /^Prefix/}).first();
    const save = d.getByRole('button', {name: 'Save', exact: true}).first();
    const out = {
        box: await box.isVisible().catch(() => false),
        boxEnabled: await box.isEnabled().catch(() => false),
        saveShown: await save.isVisible().catch(() => false),
        saveEnabled: await save.isEnabled().catch(() => false),
    };
    if (!out.boxEnabled || !out.saveShown) return {...out, save: null};
    await box.fill(text);
    const w = page.waitForResponse((r) => /\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await save.click();
    const r = await w;
    out.save = r ? r.status() : null;
    out.shown = await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10_000}).then(() => 'Saved').catch(() => null);
    await idle(page).catch(() => {});
    await sleep(1000);
    return out;
}

module.exports = {T, sleep, savePrefix};
