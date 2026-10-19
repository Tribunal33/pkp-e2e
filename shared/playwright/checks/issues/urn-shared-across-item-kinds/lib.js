// Helpers of walk.js here (issue report docs/issues/U44-A16-urn-shared-across-item-kinds.md).
// Requiring this file runs nothing. Every helper presses what a person presses, or reads what the
// screen shows; page objects are required inside the functions (probe kit rule). Copied, not
// required, from the U44 A4, A6 and A14 walks so this folder stands alone.
const {expect} = require('@playwright/test');
const {idle, screen, serverLog} = require('../../../probe');

const T = 30_000;
const PREFIX = 'urn:nbn:de:0000-';
const RESOLVER = 'https://nbn-resolving.de/';
const OMP_CHAPTERS = '../../../../../apps/omp/playwright/pages/ChapterPages.js';
const OMP_FORMATS = '../../../../../apps/omp/playwright/pages/PublicationFormatPages.js';
const flat = (s, n = 300) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

/**
 * Settings › Website › "Plugins": tick "Enabled" on the "URN" row (when it is not), then the row's
 * "Settings": the `kinds` ticked, the prefix, the individual suffix choice, "Check Number" unticked,
 * "Namespace" urn:nbn:de, the resolver, "Save".
 */
async function setUpUrn(page, app, kinds) {
    const {UrnPluginSettings} = require('../../../pages/IdentifiersPages.js');
    const plugins = new UrnPluginSettings(page, app.contextPath);
    await plugins.openPlugins();
    const wasEnabled = await plugins.enabledBox().isChecked();
    if (!wasEnabled) await plugins.setEnabled(true);
    await plugins.openSettings();
    for (const k of kinds) await plugins.setKind(k, true);
    await plugins.prefixBox().fill(PREFIX);
    await plugins.suffixRadio('customId').check();
    await plugins.checkNumberBox().uncheck();
    await plugins.namespaceSelect().selectOption('urn:nbn:de');
    await plugins.resolverBox().fill(RESOLVER);
    await plugins.saveAccepted();
    return {wasEnabled, kinds};
}

/**
 * Open a submission's Publication page `label` of the version the workflow opens on (the newest):
 * on main by its menu key (`publication_<id>_<key>`), on 3.5 (keys without the id) by the side
 * menu's link.
 */
async function openPublicationPage(page, app, frame, sid, pubId, label) {
    const key = {Identifiers: 'identifiers', Galleys: 'galleys', Chapters: 'chapters', 'Publication Formats': 'publicationFormats'}[label];
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

/**
 * The article's (monograph's) "Identifiers" page: type `urn` into "URN", press "Save", read the
 * outcome (the publication write's status and body, "Saved" or the messages under the box, the
 * server log's error lines written since).
 */
async function savePage(page, app, frame, sid, pubId, urn) {
    const {IdentifiersPage} = require('../../../pages/IdentifiersPages.js');
    await openPublicationPage(page, app, frame, sid, pubId, 'Identifiers');
    const ids = new IdentifiersPage(page, frame);
    await expect(ids.box()).toBeVisible({timeout: T});
    const shown = await ids.box().inputValue();
    if (urn !== null) await ids.box().fill(urn);
    const log = serverLog(app);
    const from = log.mark();
    await screen(page); // clears the notices seen so far
    const answered = page.waitForResponse((r) => /\/publications\/\d+(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await ids.saveButton().click();
    const r = await answered;
    const body = await r.text().catch(() => '');
    const savedStatus = frame.dialog().locator('[role="status"]').filter({hasText: 'Saved'});
    const errors = ids.field().locator('.pkpFieldError');
    await expect(savedStatus.or(errors).first()).toBeVisible({timeout: T}).catch(() => {});
    await idle(page);
    const s = await screen(page);
    return {
        submission: sid,
        publication: pubId,
        shown,
        typed: urn,
        status: r.status(),
        saved: await savedStatus.isVisible().catch(() => false),
        fieldErrors: (await errors.allInnerTexts().catch(() => [])).map((t) => flat(t)),
        body: r.ok() ? null : flat(body, 400),
        boxAfter: await ids.box().inputValue().catch(() => null),
        notices: s.notices,
        serverLog: log.since(from).map((l) => flat(l, 300)),
    };
}

/**
 * An item's legacy window on its "Identifiers" tab:
 *   issue   (OJS) Issues › "Future Issues" › the issue's arrow › "Edit"
 *   galley  (OJS) Publication › "Galleys" › the row's menu › "Edit"
 *   chapter (OMP) Publication › "Chapters" › the chapter's title
 *   format  (OMP) Publication › "Publication Formats" › the format's arrow › "Edit"
 */
async function openItemTab(page, app, frame, kind, {sid, pubId, item}) {
    const {LegacyIdentifiersWindow, GalleysPage, IssuesPage} = require('../../../pages/IdentifiersPages.js');
    if (kind === 'issue') {
        const issues = new IssuesPage(page, app.contextPath);
        await issues.open();
        const win = await issues.openIdentifiers(item);
        await idle(page);
        return win;
    }
    if (kind === 'galley') {
        await openPublicationPage(page, app, frame, sid, pubId, 'Galleys');
        const win = await new GalleysPage(page, frame).openIdentifiers(item);
        await idle(page);
        return win;
    }
    if (kind === 'chapter') {
        const {ChapterList, ChapterWindow} = require(OMP_CHAPTERS);
        await openPublicationPage(page, app, frame, sid, pubId, 'Chapters');
        const list = new ChapterList(page);
        await list.expectLoaded();
        await list.titleLink(item).click();
        const cw = new ChapterWindow(page, 'Edit Chapter');
        await cw.expectOpen();
        const win = new LegacyIdentifiersWindow(page, cw.dialog());
        await win.openIdentifiersTab();
        await idle(page);
        return win;
    }
    // format
    const {PublicationFormatsPage} = require(OMP_FORMATS);
    const formats = new PublicationFormatsPage(page, app.contextPath);
    await openPublicationPage(page, app, frame, sid, pubId, 'Publication Formats');
    await formats.expectLoaded();
    await idle(page);
    const row = formats.formatRow(item);
    await expect(row).toHaveCount(1, {timeout: T});
    // The controls are the row's next row (a format's and a file's control rows can share an id).
    const controls = row.locator('xpath=following-sibling::tr[1]');
    if (!(await controls.isVisible())) await row.locator('a.show_extras').first().click();
    await expect(controls).toBeVisible({timeout: T});
    await controls.getByRole('link', {name: 'Edit', exact: true}).first().click();
    const dialog = page.getByRole('dialog').filter({has: page.getByRole('tab', {name: 'Identifiers', exact: true})}).last();
    const win = new LegacyIdentifiersWindow(page, dialog);
    await win.tab('Identifiers').waitFor({timeout: T});
    // The first tab's form loaded before the switch, so the switch aborts no request.
    await expect(dialog.locator('form').first()).toBeVisible({timeout: T});
    await idle(page);
    await win.openIdentifiersTab();
    await idle(page);
    return win;
}

/**
 * Publication › "Publication Formats" › "Add publication format": `name` in "Name", "OK"; waits for
 * the new row. (The OMP dataset's book 4 has only a remotely hosted "PDF", which has no
 * "Identifiers" tab.)
 */
async function addFormat(page, app, frame, sid, pubId, name) {
    const {PublicationFormatsPage} = require(OMP_FORMATS);
    const formats = new PublicationFormatsPage(page, app.contextPath);
    await openPublicationPage(page, app, frame, sid, pubId, 'Publication Formats');
    await formats.expectLoaded();
    const add = await formats.openAdd();
    await add.typeName(name);
    await add.ok();
    await formats.formatRow(name).waitFor({state: 'visible', timeout: T});
    await idle(page);
    return {added: name, rows: (await formats.formatLabels().allInnerTexts().catch(() => [])).map((t) => flat(t, 80))};
}

/** What the tab's "URN" area shows: the preview with its box, or the stored state. */
async function readTab(win) {
    const {IDENTIFIERS_TEXT: TEXT} = require('../../../pages/IdentifiersPages.js');
    const text = flat(await win.urnArea().innerText().catch(() => ''), 600);
    const m = text.match(/urn:[^\s"]+/i);
    const boxShown = (await win.assignBox().count()) > 0;
    const suffixes = await win.urnSuffixBox().count();
    return {
        urn: m ? m[0] : null,
        suffix: suffixes ? await win.urnSuffixBox().inputValue().catch(() => null) : null,
        previewText: text.includes(TEXT.preview),
        boxShown,
        boxChecked: boxShown ? await win.assignBox().isChecked() : null,
        assignedText: /The URN is assigned to this/.test(text),
        text,
    };
}

/**
 * Type `suffix` into "URN Suffix" (when given) and press the tab's "Save". Accepted: the window
 * closes by itself. Refused: the tab comes back with "Errors occurred processing this form"; its
 * text is read and the window is closed with "Close" (accepting the unsaved-changes question).
 */
async function saveTab(page, app, win, suffix = null) {
    const {IDENTIFIERS_TEXT: TEXT, pastCloseWindow} = require('../../../pages/IdentifiersPages.js');
    const before = await readTab(win);
    if (suffix !== null) await win.urnSuffixBox().fill(suffix);
    const log = serverLog(app);
    const from = log.mark();
    await screen(page);
    const answered = page.waitForResponse((r) => /update-identifiers/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await win.saveButton().click();
    const res = await answered;
    await idle(page);
    const refusedBox = win.form().getByText(TEXT.formErrors);
    await Promise.race([
        expect(win.dialog).toHaveCount(0, {timeout: 12_000}).catch(() => null),
        expect(refusedBox.first()).toBeVisible({timeout: 12_000}).catch(() => null),
    ]);
    await page.waitForTimeout(600);
    const open = (await win.dialog.count()) > 0;
    const out = {before, typed: suffix, status: res.status(), accepted: !open, serverLog: log.since(from).map((l) => flat(l, 300))};
    if (open) {
        out.refusal = flat(await win.form().innerText().catch(() => ''), 500);
        out.refused = out.refusal.includes(TEXT.formErrors);
        const onDialog = (d) => d.accept().catch(() => {});
        page.on('dialog', onDialog);
        try {
            await win.close();
        } finally {
            page.off('dialog', onDialog);
        }
    } else {
        await pastCloseWindow(page);
    }
    return out;
}

module.exports = {T, PREFIX, flat, setUpUrn, openPublicationPage, savePage, openItemTab, addFormat, readTab, saveTab};
