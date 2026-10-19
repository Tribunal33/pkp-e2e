// Helpers of walk.js here (U44 A17, joined to docs/issues/U38-A3-A9-A10-activity-log-close-drops-typed-note.md).
// Requiring this file runs nothing. Each helper presses what a person presses or reads what the
// screen shows; page objects are required inside the functions (probe kit rule).
const {expect} = require('@playwright/test');
const {idle} = require('../../../probe');

const T = 30_000;
const OMP_CHAPTERS = '../../../../../apps/omp/playwright/pages/ChapterPages.js';
const OMP_FORMATS = '../../../../../apps/omp/playwright/pages/PublicationFormatPages.js';
const flat = (s, n = 300) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const pause = (page, ms) => page.evaluate((m) => new Promise((r) => setTimeout(r, m)), ms);

/** Settings › Workflow › Submission › "Metadata": tick the "Publisher ID" boxes named, "Save". */
async function enablePublisherIds(page, app, boxes) {
    const {PublisherIdSettings} = require('../../../pages/IdentifiersPages.js');
    const settings = new PublisherIdSettings(page, app.contextPath);
    await settings.open();
    await settings.setBoxes(Object.fromEntries(boxes.map((b) => [b, true])));
    await settings.save();
    return settings.boxes();
}

/**
 * Open a submission's Publication page `label` of the version the workflow opens on: on main by its
 * menu key (`publication_<id>_<key>`), on 3.5 (keys without the id) by the side menu's link.
 * (Copied from urn-check-digit-from-suffix-only/lib.js, so this folder stands alone.)
 */
async function openPublicationPage(page, app, frame, sid, pubId, label) {
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
}

/**
 * The item's window, open on its first tab with that tab's form loaded (so "Identifiers" is pressed
 * only after the first tab's request has answered): `kind` galley (OJS, OPS: the row menu's "Edit"),
 * chapter (OMP: the chapter's title), format (OMP: the format's arrow › "Edit").
 * Returns a LegacyIdentifiersWindow.
 */
async function openItemWindow(page, app, frame, {kind, sid, pubId, item}) {
    const {LegacyIdentifiersWindow, GalleysPage} = require('../../../pages/IdentifiersPages.js');
    let win;
    if (kind === 'galley') {
        await openPublicationPage(page, app, frame, sid, pubId, 'Galleys');
        win = await new GalleysPage(page, frame).openEdit(item);
    } else if (kind === 'chapter') {
        const {ChapterList, ChapterWindow} = require(OMP_CHAPTERS);
        await openPublicationPage(page, app, frame, sid, pubId, 'Chapters');
        const list = new ChapterList(page);
        await list.expectLoaded();
        await list.titleLink(item).click();
        const cw = new ChapterWindow(page, 'Edit Chapter');
        await cw.expectOpen();
        win = new LegacyIdentifiersWindow(page, cw.dialog());
    } else {
        const {PublicationFormatsPage} = require(OMP_FORMATS);
        await openPublicationPage(page, app, frame, sid, pubId, 'Publication Formats');
        const formats = new PublicationFormatsPage(page, app.contextPath);
        await formats.expectLoaded();
        const fw = await formats.openEdit(item);
        win = new LegacyIdentifiersWindow(page, fw.dialog());
    }
    await expect(win.dialog.locator('form').first()).toBeVisible({timeout: T});
    await idle(page);
    return win;
}

/**
 * OMP: Publication › "Publication Formats" › "Add publication format", "Name" `name`, "OK" (the
 * dataset's own format on submission 4 is a remote one, whose window has no "Identifiers" tab).
 */
async function addFormat(page, app, frame, {sid, pubId, name}) {
    const {PublicationFormatsPage} = require(OMP_FORMATS);
    await openPublicationPage(page, app, frame, sid, pubId, 'Publication Formats');
    const formats = new PublicationFormatsPage(page, app.contextPath);
    await formats.expectLoaded();
    const fw = await formats.openAdd();
    await fw.typeName(name);
    await fw.ok();
    await idle(page);
    return {listed: await formats.formatLabels().allInnerTexts().catch(() => null)};
}

/** The ids of the forms the window holds, in document order. */
async function formIds(win) {
    return win.dialog.locator('form').evaluateAll((fs) => fs.map((f) => f.id || '(no id)'));
}

/**
 * Press the window's header "Close" once and read what follows: whether the window is still open
 * (it is gone as soon as it closes; else read two seconds on: a question answered "Cancel" keeps
 * it) and the box's value if so.
 */
async function pressClose(page, win, box) {
    await win.dialog.getByRole('button', {name: 'Close', exact: true}).first().click();
    // Gone as soon as it closes; a window a question kept open is read after two seconds.
    await win.dialog.waitFor({state: 'detached', timeout: 2000}).catch(() => {});
    const open = (await win.dialog.count()) > 0 && (await win.dialog.isVisible().catch(() => false));
    const value = open && box ? await box.inputValue().catch(() => null) : null;
    return {stillOpen: open, value};
}

module.exports = {T, flat, pause, enablePublisherIds, openPublicationPage, openItemWindow, addFormat, formIds, pressClose};
