// Helpers for the U62 A7 walk (the Delete notice's spelling). Requiring this runs nothing.
// Locators go by element ids and roles, never by English labels, so the same helpers drive the
// French interface (the neighbour check).
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 400) => (t == null ? t : String(t).replace(/\s+/g, ' ').trim().slice(0, n));
const GRID = '.pkp_controllers_grid[id^="component-grid-settings-plugins-settingsplugingrid-"]:visible';

/** Settings › Website › "Plugins" (Installed Plugins) of a context, in the interface language `locale`. */
async function openWebsitePlugins(page, app, ctx, locale = 'en') {
    const o = {};
    try { const r = await page.goto(app.url(`/index.php/${ctx}/${locale}/management/settings/website`)); o.status = r && r.status(); } catch (e) { o.status = flat(e.message, 100); }
    await idle(page).catch(() => {});
    const tab = page.locator('#plugins-button').first();
    o.pluginsTab = await tab.count() > 0;
    if (o.pluginsTab) {
        o.pluginsTabLabel = flat(await tab.innerText().catch(() => null), 60);
        await tab.click();
        await idle(page).catch(() => {});
        await page.locator(GRID).first().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
        await sleep(400);
    }
    return o;
}

/** Texts of the notices on screen now. */
const noticeTexts = (page) => page.locator('.pkpNotification').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);

/** Notices that appear after `before` (texts on screen before the action), within `ms`. */
async function newNotices(page, before, ms = 12000) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
        const left = [...before];
        const fresh = (await noticeTexts(page)).filter((t) => { const i = left.indexOf(t); if (i >= 0) { left.splice(i, 1); return false; } return true; });
        if (fresh.length) return fresh;
        await sleep(150);
    }
    return [];
}

/** The plugin row with this row id (the plugin class name in lower case), or an empty locator. */
const rowLoc = (page, id) => page.locator(GRID).first().locator(`tr.gridRow[id$="-row-${id}"]`).first();

/** "Upload A New Plugin": open the window, choose `file` through "Upload File", press "Save". */
async function uploadPlugin(page, file) {
    const o = {};
    const link = page.locator(GRID).first().locator('a[id*="-upload-button"]').first();
    o.linkText = flat(await link.innerText().catch(() => null), 80);
    await link.click();
    const dlg = page.locator('[role="dialog"]:visible').filter({has: page.locator('input[type=file]')}).last();
    await dlg.waitFor({timeout: T});
    await idle(page).catch(() => {});
    o.heading = flat(await dlg.locator('h1, h2').first().innerText().catch(() => null), 80);
    await dlg.locator('input[type=file]').first().setInputFiles(file);
    const tf = dlg.locator('input[name=temporaryFileId]');
    const end = Date.now() + 20000;
    while (Date.now() < end && !(await tf.inputValue().catch(() => ''))) await sleep(200);
    o.uploaded = !!(await tf.inputValue().catch(() => ''));
    const before = await noticeTexts(page);
    const save = dlg.locator('button[type=submit], button.submitFormButton').first();
    o.saveText = flat(await save.innerText().catch(() => null), 40);
    await save.click();
    o.notices = await newNotices(page, before);
    await idle(page).catch(() => {});
    await sleep(600);
    o.windowOpen = await dlg.isVisible().catch(() => false);
    return o;
}

/** A row's arrow › "Delete", read the confirmation window, press its first button ("OK"); the notice that follows. */
async function deletePlugin(page, id) {
    const o = {};
    const row = rowLoc(page, id);
    o.listedBefore = await row.count() > 0;
    if (!o.listedBefore) return o;
    if (await row.locator('a.show_extras').count()) { await row.locator('a.show_extras').first().click(); await sleep(400); }
    const del = row.locator('xpath=following-sibling::tr[1]').locator('a[id*="-delete-button"]').first();
    o.linkText = flat(await del.innerText().catch(() => null), 40);
    await del.click();
    const dlg = page.locator('[role="dialog"]:visible').last();
    await dlg.waitFor({timeout: T}).catch(() => {});
    o.window = await dlg.evaluate((d) => ({
        heading: ((d.querySelector('h1, h2, [id^="reka-dialog-title"]') || {}).innerText || '').trim() || null,
        text: d.innerText.replace(/\s+/g, ' ').trim().slice(0, 400),
        buttons: [...d.querySelectorAll('button')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
    })).catch((e) => `read failed ${flat(e.message, 100)}`);
    const before = await noticeTexts(page);
    const responses = [];
    const onResp = (r) => { if (/delete-?plugin/i.test(r.url())) responses.push(r.text().then((t) => `${r.request().method()} ${r.status()} ${flat(t, 200)}`).catch(() => `${r.status()}`)); };
    page.on('response', onResp);
    await dlg.getByRole('button', {name: 'OK', exact: true}).click();
    o.notices = await newNotices(page, before);
    await idle(page).catch(() => {});
    await sleep(800);
    page.off('response', onResp);
    o.responses = await Promise.all(responses);
    o.listedAfter = await rowLoc(page, id).count() > 0;
    return o;
}

module.exports = {T, sleep, flat, GRID, openWebsitePlugins, noticeTexts, newNotices, rowLoc, uploadPlugin, deletePlugin};
