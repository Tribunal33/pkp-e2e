// Helpers of walk.js here (issue report docs/issues/U44-OMP8-urn-pattern-example-unknown-placeholder.md),
// copied in part from urn-check-number-nan-unlisted-character/lib.js (U44 A15) so this folder stands
// alone. Requiring this file runs nothing. Every helper presses what a person presses, or reads what
// the screen shows; page objects are required inside the functions (probe kit rule).
const {expect} = require('@playwright/test');
const {idle} = require('../../../probe');

const T = 30_000;
const PREFIX = 'urn:nbn:de:0000-';
const RESOLVER = 'https://nbn-resolving.de/';
const flat = (s, n = 300) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

/**
 * Settings › Website › "Plugins": tick "Enabled" on the "URN" row (when it is not), then the row's
 * "Settings". Returns the open settings page object.
 */
async function openUrnSettings(page, app) {
    const {UrnPluginSettings} = require('../../../pages/IdentifiersPages.js');
    const plugins = new UrnPluginSettings(page, app.contextPath);
    await plugins.openPlugins();
    const wasEnabled = await plugins.enabledBox().isChecked();
    if (!wasEnabled) await plugins.setEnabled(true);
    await plugins.openSettings();
    return {plugins, wasEnabled};
}

/** What the window says under "URN Suffix" about the pattern choice: its label and the example under it. */
async function readPatternChoice(plugins) {
    const form = plugins.form();
    const label = flat(await form.locator('label').filter({has: plugins.suffixRadio('pattern')}).or(form.locator('label').filter({hasText: 'Use the pattern entered below'})).first().innerText().catch(() => ''), 600);
    const example = flat(await form.locator('p.pkp_help').filter({hasText: /example/i}).first().innerText().catch(() => ''), 600);
    return {label, example};
}

/** "for monographs" (and the other kinds') pattern box under the pattern choice, by its field name. */
const patternBox = (plugins, kind = 'Publication') => plugins.form().locator(`input[name="urn${kind}SuffixPattern"]`);

/**
 * Open a submission's Publication page `label` ("Identifiers") of the version the workflow opens on:
 * on main by its menu key (`publication_<id>_<key>`), on 3.5 (keys without the id) by the side menu's link.
 */
async function openPublicationPage(page, app, frame, sid, pubId, label) {
    const key = {Identifiers: 'identifiers'}[label];
    if (app.line === 'stable-3_5_0') {
        await frame.gotoEditorial(sid);
        await frame.expectVersionLoaded().catch(() => {});
        await frame.menuLink(label).first().click();
    } else {
        await frame.gotoEditorial(sid, {menuKey: `publication_${pubId}_${key}`});
    }
    await frame.expectPageHeading(label);
    await idle(page);
}

/** The monograph's "Identifiers" page, its "URN" field loaded. */
async function openIdentifiers(page, app, frame, sid, pubId) {
    const {IdentifiersPage} = require('../../../pages/IdentifiersPages.js');
    await openPublicationPage(page, app, frame, sid, pubId, 'Identifiers');
    const ids = new IdentifiersPage(page, frame);
    await expect(ids.box()).toBeVisible({timeout: T});
    return ids;
}

module.exports = {T, PREFIX, RESOLVER, flat, openUrnSettings, readPatternChoice, patternBox, openIdentifiers};
