// Helpers for the U73 A6 walk {OMP}: a format's "Edit" window, which groups its "Metadata" tab
// shows (physical, digital, neither), and a save on each kind of tab. Requiring this file runs
// nothing; the format pages and `addFormat()` come from the U74 A11/A18/A19 walk's lib (book 4 of
// PKP's default test dataset), `flat()` and `step()` from the U74 A17 walk's lib.
const {idle, screen} = require('../../../probe');
const F = require('../native-import-loses-trade-details/lib');

const {flat, step, BOOK, addFormat, openFormats, cancelMeta} = F;

const GROUPS = {
    physical: ['Page Counts', 'Returnable Indicator', 'Physical Dimensions'],
    digital: ['Digital Information'],
};
const FIELDS = ['frontMatter', 'backMatter', 'returnableIndicatorCode', 'height', 'width', 'thickness', 'weight', 'countryManufactureCode', 'fileSize', 'override', 'technicalProtectionCode'];

/** A format's arrow › "Edit": the window, and what its "Edit" tab says about the format's kind. */
async function openWindow(app, page, name) {
    const pf = await openFormats(app, page, BOOK.id, BOOK.publicationId);
    const win = await pf.openEdit(name);
    const edit = {
        physical: await win.physicalBox().isChecked().catch(() => null),
        remoteTicked: await win.remoteBox().isChecked().catch(() => null),
        remoteURL: await win.remoteUrlBox().inputValue().catch(() => null),
    };
    return {win, edit};
}

/** The "Metadata" tab's groups and fields: which of the physical and digital ones it offers. */
async function tabGroups(meta) {
    const labels = await meta.labelsTopToBottom();
    const fields = {};
    for (const n of FIELDS) fields[n] = await meta.form().locator(`[name="${n}"]`).count();
    const headings = await meta.form().locator('legend, .pkp_form_area_title, h3').allInnerTexts().catch(() => []);
    const has = (t) => labels.some((l) => l === t || l.startsWith(t)) || headings.some((h) => flat(h) === t);
    const groups = {};
    for (const t of [...GROUPS.physical, ...GROUPS.digital, 'File Size in Mbytes', 'Digital Technical Protection', 'Enter your own file size value?']) groups[t] = has(t);
    const kind = GROUPS.physical.every((t) => groups[t]) ? 'physical' : (groups['Digital Information'] ? 'digital' : 'neither');
    return {kind, groups, fields, labels};
}

/** Choose `composition` and, when the tab offers them, tick the override, type a file size and choose a protection; "Save". */
async function saveDigital(meta, {composition, size, protection}) {
    if (!(await meta.form().locator('[name="fileSize"]').count())) return {offered: false};
    await meta.compositionList().selectOption({label: composition});
    // "File Size in Mbytes" is disabled (the calculated size) until the override is ticked.
    await meta.form().locator('[name="override"]').check();
    await meta.form().locator('[name="fileSize"]').fill(size);
    const list = meta.form().locator('select[name="technicalProtectionCode"]');
    const label = await list.locator('option').evaluateAll((os, src) => {
        const re = new RegExp(src);
        const o = os.find((x) => re.test(x.textContent || ''));
        return o ? o.textContent.trim() : null;
    }, protection.source);
    if (label) await list.selectOption({label});
    await meta.save();
    return {offered: true, saved: true, protection: label};
}

/** What the digital fields hold (null: not offered). */
async function readDigital(meta) {
    const box = meta.form().locator('[name="fileSize"]');
    if (!(await box.count())) return {offered: false};
    return {
        offered: true,
        fileSize: await box.inputValue(),
        override: await meta.form().locator('[name="override"]').isChecked(),
        protection: flat(await meta.form().locator('select[name="technicalProtectionCode"] option:checked').first().textContent().catch(() => null)),
    };
}

/** Choose `composition`, type `height` in "Height" when offered; "Save". */
async function savePhysical(meta, {composition, height}) {
    const box = meta.form().locator('[name="height"]');
    if (!(await box.count())) return {offered: false};
    await meta.compositionList().selectOption({label: composition});
    await box.fill(height);
    await meta.save();
    return {offered: true, saved: true};
}

/** What "Height" holds (null: not offered). */
async function readHeight(meta) {
    const box = meta.form().locator('[name="height"]');
    return (await box.count()) ? box.inputValue() : null;
}

/** The tab's "Cancel"; the page settled. */
async function close(page, meta) {
    const out = await cancelMeta(page, meta);
    await idle(page).catch(() => {});
    return out;
}

module.exports = {flat, step, BOOK, addFormat, openWindow, tabGroups, saveDigital, readDigital, savePhysical, readHeight, close, screen};
