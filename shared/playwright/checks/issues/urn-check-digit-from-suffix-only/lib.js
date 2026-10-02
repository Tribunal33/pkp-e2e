// Helpers of walk.js here (issue report docs/issues/U44-A6-urn-check-digit-from-suffix-only.md).
// Requiring this file runs nothing. Every helper presses what a person presses, or reads what the
// screen shows; page objects are required inside the functions (probe kit rule).
const {expect} = require('@playwright/test');
const {idle} = require('../../../probe');

const T = 30_000;
const PREFIX = 'urn:nbn:de:0000-';
const RESOLVER = 'https://nbn-resolving.de/';
const OMP_CHAPTERS = '../../../../../apps/omp/playwright/pages/ChapterPages.js';
const flat = (s, n = 300) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

/**
 * For the facts only, never a step: the URN check digit of `s` by the algorithm both the plugin's
 * PHP `_calculateCheckNo()` and its JavaScript `getCheckNumber()` cite (persistent-identifier.de).
 */
function checkDigit(s) {
    const t = {9: '41', 8: '9', 7: '8', 6: '7', 5: '6', 4: '5', 3: '4', 2: '3', 1: '2', 0: '1', a: '18', b: '14', c: '19', d: '15', e: '16', f: '21', g: '22', h: '23', i: '24', j: '25', k: '42', l: '26', m: '27', n: '13', o: '28', p: '29', q: '31', r: '12', s: '32', t: '33', u: '11', v: '34', w: '35', x: '36', y: '37', z: '38', '-': '39', ':': '17', _: '43', '/': '45', '.': '47', '+': '49'};
    const n = [...String(s).toLowerCase()].map((c) => t[c]).join('');
    let sum = 0;
    for (let j = 1; j <= n.length; j++) sum += Number(n[j - 1]) * j;
    const q = String(Math.floor(sum / Number(n[n.length - 1])));
    return q[q.length - 1];
}

/** Both digits for a URN without its check digit: the whole URN's and the suffix's alone. */
const digits = (urn) => ({whole: checkDigit(urn), suffixOnly: checkDigit(urn.startsWith(PREFIX) ? urn.slice(PREFIX.length) : urn)});

/**
 * Settings › Website › "Plugins": tick "Enabled" on the "URN" row (when it is not), then the row's
 * "Settings": the `kinds` ticked, the prefix, `suffix` (`default` | `customId`), "Check Number"
 * as `checkNo`, "Namespace" urn:nbn:de, the resolver, "Save".
 */
async function setUpUrn(page, app, {kinds = [], suffix = 'default', checkNo = true} = {}) {
    const {UrnPluginSettings} = require('../../../pages/IdentifiersPages.js');
    const plugins = new UrnPluginSettings(page, app.contextPath);
    await plugins.openPlugins();
    const wasEnabled = await plugins.enabledBox().isChecked();
    if (!wasEnabled) await plugins.setEnabled(true);
    await plugins.openSettings();
    for (const k of kinds) await plugins.setKind(k, true);
    await plugins.prefixBox().fill(PREFIX);
    await plugins.suffixRadio(suffix).check();
    if (checkNo) await plugins.checkNumberBox().check();
    else await plugins.checkNumberBox().uncheck();
    await plugins.namespaceSelect().selectOption('urn:nbn:de');
    await plugins.resolverBox().fill(RESOLVER);
    await plugins.saveAccepted();
    return {wasEnabled, kinds, suffix, checkNo};
}

/**
 * Open a submission's Publication page `label` ("Identifiers", "Galleys", "Chapters") of the version
 * the workflow opens on: on main by its menu key (`publication_<id>_<key>`), on 3.5 (keys without
 * the id) by the side menu's link.
 */
async function openPublicationPage(page, app, frame, sid, pubId, label) {
    const key = {Identifiers: 'identifiers', Galleys: 'galleys', Chapters: 'chapters'}[label];
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

/** The article's (monograph's) "Identifiers" page, its "URN" field loaded. */
async function openIdentifiers(page, app, frame, sid, pubId) {
    const {IdentifiersPage} = require('../../../pages/IdentifiersPages.js');
    await openPublicationPage(page, app, frame, sid, pubId, 'Identifiers');
    const ids = new IdentifiersPage(page, frame);
    await expect(ids.box()).toBeVisible({timeout: T});
    return ids;
}

/**
 * The galley's (OJS) or the chapter's (OMP) window, on its "Identifiers" tab: OJS Publication ›
 * "Galleys" › the row's "Edit"; OMP Publication › "Chapters" › the chapter's title.
 */
async function openItemTab(page, app, frame, sid, pubId, item) {
    const {LegacyIdentifiersWindow, GalleysPage} = require('../../../pages/IdentifiersPages.js');
    if (app.name === 'ojs') {
        await openPublicationPage(page, app, frame, sid, pubId, 'Galleys');
        const galleys = new GalleysPage(page, frame);
        return galleys.openIdentifiers(item);
    }
    const {ChapterList, ChapterWindow} = require(OMP_CHAPTERS);
    await openPublicationPage(page, app, frame, sid, pubId, 'Chapters');
    const list = new ChapterList(page);
    await list.expectLoaded();
    await list.titleLink(item).click();
    const cw = new ChapterWindow(page, 'Edit Chapter');
    await cw.expectOpen();
    const win = new LegacyIdentifiersWindow(page, cw.dialog());
    await win.openIdentifiersTab();
    return win;
}

/** What the tab's "URN" area shows: its text and the first URN in it. */
async function readUrnArea(win) {
    const text = flat(await win.urnArea().innerText().catch(() => ''), 600);
    const m = text.match(/urn:[^\s"]+/i);
    return {text, urn: m ? m[0] : null};
}

/** Close the legacy window with "Close", accepting the "unsaved changes" question if it asks. */
async function closeWindow(page, win) {
    if (!((await win.dialog.count()) > 0)) return;
    const onDialog = (d) => d.accept().catch(() => {});
    page.on('dialog', onDialog);
    try {
        await win.close();
    } finally {
        page.off('dialog', onDialog);
    }
}

module.exports = {T, PREFIX, flat, checkDigit, digits, setUpUrn, openIdentifiers, openItemTab, readUrnArea, closeWindow};
