// Helpers of walk.js here (issue report docs/issues/U44-A2-publisher-id-on-tab-never-removed.md).
// Requiring this file runs nothing. Every helper presses what a person presses, or reads what the
// screen shows; `stored()` reads the database for Evidence only. Page objects are required inside
// the functions (probe kit rule).
const {expect} = require('@playwright/test');
const {idle, screen, record, shot, serverLog, sql} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OMP_CHAPTERS = '../../../../../apps/omp/playwright/pages/ChapterPages.js';
const OMP_FORMATS = '../../../../../apps/omp/playwright/pages/PublicationFormatPages.js';

async function snap(page, name) {
    record(name, await screen(page));
    await shot(page, name).catch(() => {});
}

/** Settings › Workflow › Submission › "Metadata": set the "Publisher ID" boxes ({label: bool}), "Save". */
async function setPublisherIds(page, app, states) {
    const {PublisherIdSettings} = require('../../../pages/IdentifiersPages.js');
    const settings = new PublisherIdSettings(page, app.contextPath);
    await settings.open();
    const before = await settings.boxes();
    await settings.setBoxes(states);
    await settings.save();
    await settings.open();
    return {before, after: await settings.boxes()};
}

/**
 * Settings › Website › "Plugins": "URN" enabled, its "Settings": the `kinds` ticked, a prefix, the
 * default patterns, namespace urn:nbn:de, a resolver, "Save".
 */
async function setUpUrn(page, app, kinds) {
    const {UrnPluginSettings} = require('../../../pages/IdentifiersPages.js');
    const plugins = new UrnPluginSettings(page, app.contextPath);
    await plugins.openPlugins();
    if (!(await plugins.enabledBox().isChecked())) await plugins.setEnabled(true);
    await plugins.openSettings();
    for (const k of kinds) await plugins.setKind(k, true);
    await plugins.prefixBox().fill('urn:nbn:de:0000-');
    await plugins.suffixRadio('default').check();
    await plugins.namespaceSelect().selectOption('urn:nbn:de');
    await plugins.resolverBox().fill('https://nbn-resolving.de/');
    await plugins.saveAccepted();
    return {kinds};
}

/**
 * Open a Publication page (`Galleys`, `Chapters`, `Publication Formats`) of submission `sid`, version
 * `pubId`: on main by its menu key, on 3.5 (keys without the id) by the side menu's link.
 */
async function openPublicationPage(page, app, sid, pubId, label) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication', publicationHeading: app.name === 'ops' ? 'Preprint' : 'Publication'}});
    const key = {Galleys: 'galleys', Chapters: 'chapters', 'Publication Formats': 'publicationFormats'}[label];
    if (app.line === 'stable-3_5_0') {
        await frame.gotoEditorial(sid);
        await frame.expectVersionLoaded().catch(() => {});
        await frame.menuLink(label).first().click();
    } else {
        await frame.gotoEditorial(sid, {menuKey: `publication_${pubId}_${key}`});
    }
    await frame.expectPageHeading(label);
    await idle(page);
    return frame;
}

/**
 * The item's legacy window on its "Identifiers" tab. `kind`: `galley` (OJS, OPS: Publication ›
 * "Galleys" › the row's menu › "Edit"), `chapter` (OMP: Publication › "Chapters" › the title),
 * `format` (OMP: Publication › "Publication Formats" › the format's arrow › "Edit").
 */
async function openTab(page, app, {kind, sid, pubId, item}, name) {
    const {LegacyIdentifiersWindow, GalleysPage} = require('../../../pages/IdentifiersPages.js');
    let win;
    if (kind === 'galley') {
        const frame = await openPublicationPage(page, app, sid, pubId, 'Galleys');
        win = await new GalleysPage(page, frame).openIdentifiers(item);
    } else if (kind === 'chapter') {
        await openPublicationPage(page, app, sid, pubId, 'Chapters');
        const {ChapterList, ChapterWindow} = require(OMP_CHAPTERS);
        const list = new ChapterList(page);
        await list.expectLoaded();
        await list.titleLink(item).click();
        const cw = new ChapterWindow(page, 'Edit Chapter');
        await cw.expectOpen();
        win = new LegacyIdentifiersWindow(page, cw.dialog());
        await win.openIdentifiersTab();
    } else {
        await openPublicationPage(page, app, sid, pubId, 'Publication Formats');
        const {PublicationFormatsPage} = require(OMP_FORMATS);
        const formats = new PublicationFormatsPage(page, app.contextPath);
        await formats.expectLoaded();
        const fw = await formats.openEdit(item);
        win = new LegacyIdentifiersWindow(page, fw.dialog());
        await win.openIdentifiersTab();
    }
    await idle(page);
    if (name) await snap(page, name);
    return win;
}

/** What an open "Identifiers" tab shows: the "Publisher ID" box (or its absence), the URN area, the refusal. */
async function readTab(win) {
    const form = win.form();
    const box = form.locator('input[name="publisherId"]');
    const n = await box.count();
    return {
        tabs: await win.tabNames().catch(() => null),
        publisherIdBox: n ? await box.inputValue() : '(no box)',
        urnArea: (await win.urnArea().count()) ? flat(await win.urnArea().innerText().catch(() => ''), 300) : null,
        assignBox: (await win.assignBox().count()) ? await win.assignBox().isChecked() : null,
        formErrors: flat(await form.locator('#formErrors, .pkp_form_error, .notifyFormError').allInnerTexts().then((a) => a.join(' | ')).catch(() => ''), 600),
    };
}

/**
 * In the open tab: type `value` in "Publisher ID" (`''` empties it, `null` leaves the box alone),
 * optionally untick the URN assign box, press "Save". Reads the answer, the server log's error lines
 * written since, whether the window closed, the tab when it stayed open, the notices. Never throws on
 * what the screen does.
 */
async function typeAndSave(page, app, win, value, name, {untickAssign = false} = {}) {
    const log = serverLog(app);
    const from = log.mark();
    await screen(page); // clears the notices seen so far
    const box = win.form().locator('input[name="publisherId"]');
    const hadBox = (await box.count()) > 0;
    if (hadBox && value != null) await box.fill(value);
    if (untickAssign && (await win.assignBox().count())) await win.assignBox().uncheck();
    const answered = page.waitForResponse((r) => /update-identifiers/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await win.saveButton().click();
    const r = await answered;
    let text = '';
    try { text = await r.text(); } catch (e) { text = ''; }
    let json = null;
    try { json = JSON.parse(text); } catch (e) { json = null; }
    await idle(page).catch(() => {});
    await sleep(1000); // a legacy window's close; bounded, read once
    const open = (await win.dialog.count()) > 0 && (await win.dialog.isVisible().catch(() => false));
    const tab = open ? await readTab(win) : null;
    const s = await screen(page);
    record(`${name}-after-save`, s);
    await shot(page, `${name}-after-save`).catch(() => {});
    return {
        typed: hadBox ? value : '(no box)',
        posted: flat(r.request().postData(), 300),
        status: r.status(),
        json_status: json ? json.status : null,
        body: json ? null : flat(text, 300),
        serverLog: log.since(from).map((l) => flat(l, 400)),
        windowOpen: open,
        tab,
        notices: s.notices,
    };
}

/** Close an open legacy window with its "Close" (answering a "data has changed" confirm with OK). */
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

/** Evidence only: the stored publisher-id row of a galley, chapter or format. */
function stored(app, kind, id) {
    const t = {galley: ['publication_galley_settings', 'galley_id'], chapter: ['submission_chapter_settings', 'chapter_id'], format: ['publication_format_settings', 'publication_format_id']}[kind];
    return sql(app, `select ${t[1]}, '[' || setting_value || ']' from ${t[0]} where setting_name = 'pub-id::publisher-id' and ${t[1]} = ${Number(id)}`);
}

module.exports = {T, flat, sleep, snap, setPublisherIds, setUpUrn, openPublicationPage, openTab, readTab, typeAndSave, closeWindow, stored, expect};
