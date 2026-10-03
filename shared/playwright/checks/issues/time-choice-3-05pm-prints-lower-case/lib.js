// Helpers of walk.js here (issue report docs/issues/U10-A8-*.md). Requiring this file runs
// nothing. The "Date & Time" tab helpers are the U10 A9 walk's
// (../date-short-empty-custom-strips-editorial-dates/lib.js), the discussion helpers the U53 A15
// walk's, the library helpers the U39 walk's (../library-download-redraws-list/lib.js).
const {idle, screen, record} = require('../../../probe');
const A9 = require('../date-short-empty-custom-strips-editorial-dates/lib');
const LIB = require('../library-download-redraws-list/lib');

const {flat, sleep} = A9;

/** The innermost fieldset holding a group's radios for one language. */
function group(form, field, locale) {
    return form.form.locator('fieldset.pkpFormField--options').filter({has: form.page.locator(`input[type="radio"][name="${field}-${locale}"]`)}).last();
}

/** A group's choices for one language as shown: label, the value behind it, whether chosen. */
async function readChoices(form, field, locale = 'en') {
    return group(form, field, locale).locator(`input[type="radio"][name="${field}-${locale}"]`).evaluateAll((radios) => radios.map((r) => {
        const label = r.closest('label');
        const clone = label ? label.cloneNode(true) : null;
        if (clone) clone.querySelectorAll('input').forEach((n) => n.remove());
        return {label: clone ? clone.textContent.replace(/\s+/g, ' ').trim() : null, value: r.value, checked: r.checked};
    }));
}

/** "Time" in English and French, and "Date & Time (Short)" in English, as shown. */
async function timeGroups(form) {
    return {
        timeEn: await readChoices(form, 'timeFormat', 'en'),
        timeFr: await readChoices(form, 'timeFormat', 'fr_CA').catch((e) => ({error: flat(String(e.message), 200)})),
        datetimeShortEn: await readChoices(form, 'datetimeFormatShort', 'en'),
    };
}

/** Press "Save": the answer, the "Saved" mark and the English formats the request sent. */
async function save(page, form) {
    const response = await form.pressSave();
    const body = new URLSearchParams(response.request().postData() || '');
    await idle(page).catch(() => {});
    return {
        status: response.status(),
        saved: await form.savedStatus.isVisible().catch(() => false),
        sent: {timeFormat: body.get('timeFormat[en]'), datetimeFormatShort: body.get('datetimeFormatShort[en]')},
    };
}

/** Settings › Workflow › the library tab: "Add a file" (`name`, "Other", a text file, "OK"). */
async function addLibraryFile(page, app, name) {
    const list = await LIB.openPublisherLibrary(page, app);
    await LIB.addFile(list, name, 'Other');
    await LIB.settle(page, 1_500);
    return {listed: await list.row(name).count()};
}

/** The library file's arrow, "Edit": the "File" table's "Date uploaded" (the window stays open). */
async function libraryDateUploaded(page, app, name, label) {
    const list = await LIB.openPublisherLibrary(page, app);
    const win = await list.openEdit(name);
    await sleep(500);
    if (label) record(label, await screen(page));
    return flat(await win.fileLine('Date uploaded').innerText(), 100);
}

module.exports = {flat, sleep, timeGroups, save, addLibraryFile, libraryDateUploaded,
    openDateTime: A9.openDateTime, choose: A9.choose, messageDates: A9.messageDates};
