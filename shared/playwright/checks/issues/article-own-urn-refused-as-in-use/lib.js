// Helpers of walk.js here (issue report docs/issues/U44-A4-article-own-urn-refused-as-in-use.md).
// Requiring this file runs nothing. Every helper presses what a person presses, or reads what the
// screen shows; page objects are required inside the functions (probe kit rule).
const {expect} = require('@playwright/test');
const {idle, screen, serverLog} = require('../../../probe');

const T = 30_000;
const PREFIX = 'urn:nbn:de:0000-';
const RESOLVER = 'https://nbn-resolving.de/';
const flat = (s, n = 300) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

/**
 * Settings › Website › "Plugins": tick "Enabled" on the "URN" row, then the row's "Settings":
 * the kind box `kind` ticked, the prefix, "Namespace" urn:nbn:de, the individual suffix choice,
 * the resolver, "Save". Returns what the window held before and after.
 */
async function setUpUrn(page, app, kind) {
    const {UrnPluginSettings} = require('../../../pages/IdentifiersPages.js');
    const plugins = new UrnPluginSettings(page, app.contextPath);
    await plugins.openPlugins();
    const wasEnabled = await plugins.enabledBox().isChecked();
    if (!wasEnabled) await plugins.setEnabled(true);
    await plugins.openSettings();
    await plugins.setKind(kind, true);
    await plugins.prefixBox().fill(PREFIX);
    await plugins.namespaceSelect().selectOption('urn:nbn:de');
    await plugins.suffixRadio('customId').check();
    await plugins.resolverBox().fill(RESOLVER);
    await plugins.saveAccepted();
    return {wasEnabled};
}

/**
 * Open a version's Publication › "Identifiers". On main by the version's own menu key
 * (`publication_<id>_identifiers`); on 3.5, whose keys carry no id, the side menu's
 * "Identifiers" of the version the workflow opens on (the newest).
 */
async function openIdentifiers(page, app, frame, sid, pubId) {
    const {IdentifiersPage} = require('../../../pages/IdentifiersPages.js');
    const ids = new IdentifiersPage(page, frame);
    if (app.line === 'stable-3_5_0') {
        await frame.gotoEditorial(sid);
        await frame.expectVersionLoaded().catch(() => {});
        await frame.menuLink('Identifiers').first().click();
        await expect(ids.box()).toBeVisible({timeout: T});
    } else {
        await ids.open(sid, pubId);
    }
    await idle(page);
    return ids;
}

/**
 * Type `urn` into the "URN" box when given (replacing what is there), press "Save" and read
 * the outcome: the publication write's status, "Saved" or the messages under the box, the
 * error summary, the box's value, the server log's error lines written since.
 */
async function saveUrn(page, app, frame, ids, urn = null) {
    if (urn !== null) await ids.box().fill(urn);
    const before = await ids.box().inputValue();
    const log = serverLog(app);
    const from = log.mark();
    await screen(page); // clears the notices seen so far
    const answered = page.waitForResponse((r) => /\/publications\/\d+(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await ids.saveButton().click();
    const r = await answered;
    let body = '';
    try {
        body = await r.text();
    } catch (e) {
        body = '';
    }
    const savedStatus = frame.dialog().locator('[role="status"]').filter({hasText: 'Saved'});
    const errors = ids.field().locator('.pkpFieldError');
    await expect(savedStatus.or(errors).first()).toBeVisible({timeout: T}).catch(() => {});
    await idle(page);
    const s = await screen(page);
    return {
        typed: urn,
        boxBefore: before,
        status: r.status(),
        saved: await savedStatus.isVisible().catch(() => false),
        fieldErrors: (await errors.allInnerTexts().catch(() => [])).map((t) => flat(t)),
        summary: flat(await frame.dialog().locator('.pkpFormErrors, .pkpFormPage__errors, [class*="formErrors"]').first().innerText().catch(() => ''), 200) || null,
        body: r.ok() ? null : flat(body, 400),
        boxAfter: await ids.box().inputValue().catch(() => null),
        notices: s.notices,
        serverLog: log.since(from).map((l) => flat(l, 300)),
    };
}

module.exports = {PREFIX, RESOLVER, flat, setUpUrn, openIdentifiers, saveUrn};
