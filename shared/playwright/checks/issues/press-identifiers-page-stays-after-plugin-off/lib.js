// Helpers of walk.js here (issue report docs/issues/U24-OMP3-press-identifiers-page-stays-after-plugin-off.md).
// Requiring this file runs nothing. Every helper presses what a person presses, or reads what the
// screen shows; page objects are required inside the functions (probe kit rule).
const {idle, screen} = require('../../../probe');

const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

/** Settings › Website › "Plugins": tick or untick "Enabled" on the "URN" row (unticking answers "OK"). */
async function setUrnEnabled(page, app, want) {
    const {UrnPluginSettings} = require('../../../pages/IdentifiersPages.js');
    const plugins = new UrnPluginSettings(page, app.contextPath);
    await plugins.openPlugins();
    const was = await plugins.enabledBox().isChecked();
    if (was !== want) await plugins.setEnabled(want);
    const s = await screen(page);
    return {was, now: await plugins.enabledBox().isChecked(), notices: s.notices};
}

/**
 * Open a submission's workflow and read the side menu: every entry, how many are "Identifiers".
 * When one is listed, press the last (the newest version's) and read what opens: the heading, the
 * main column's text, whether a "URN" field is there, and every answer of 400 or more on the way.
 * Takes the state it finds; never throws on a missing page.
 */
async function readIdentifiers(page, app, frame, sid) {
    await frame.gotoEditorial(sid);
    await frame.expectVersionLoaded().catch(() => {});
    if (app.line !== 'stable-3_5_0') await frame.expandLatestVersionNode().catch(() => {});
    await idle(page);
    const entries = (await frame.menuEntries()).map((e) => e.label);
    const listed = entries.filter((l) => l === 'Identifiers').length;
    const out = {submission: sid, menu: entries, identifiersListed: listed};
    if (!listed) return out;
    const refused = [];
    const onResponse = (r) => {
        if (r.status() >= 400) refused.push(`${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`);
    };
    page.on('response', onResponse);
    await frame.menuLink('Identifiers').last().click();
    await idle(page);
    await page.waitForTimeout(1500); // the form is fetched after the click; a bounded settle, read once
    await idle(page);
    page.off('response', onResponse);
    const field = frame.dialog().locator('.pkpFormField').filter({hasText: 'URN'});
    out.heading = flat(await frame.heading().innerText().catch(() => ''));
    out.urnField = await field.count();
    out.mainColumn = flat(await frame.dialog().locator('.pkp-modal-scroll-container').first().innerText().catch(() => ''), 600);
    out.formControls = await frame.dialog().locator('.pkp-modal-scroll-container').first().locator('input, textarea, select, button').count();
    out.refused = refused;
    return out;
}

module.exports = {flat, setUrnEnabled, readIdentifiers};
