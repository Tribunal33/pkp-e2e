// Helpers for docs/issues/U13-OJS8-publication-facts-start-date-typo-saved-as-other-date.md
// (walk.js, neighbour.js). Requiring this runs nothing. Opening the plugin's
// row and window comes from the U13 OJS2 walk's lib.js (openPflRow, enablePfl,
// readPflSettings), "OK" and reopening from the U13 OJS7 walk's (pressPflOk,
// reopenPflSettings).
const {sql, idle} = require('../../../probe');

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// The visible "Start Date" box (FormHandler renames it "dateStart-removed")
// and the hidden field the form posts as "dateStart".
const dateBox = (page) => page.locator('form#pflPluginSettingsForm input.datepicker').first();
const dateAlt = (page) => page.locator('form#pflPluginSettingsForm input[type=hidden][id^="dateStart"][id$="-altField"]').first();

// What the window shows in "Start Date" and what it would post.
async function readStartDate(page) {
    return {shown: await dateBox(page).inputValue().catch(() => null), posted: await dateAlt(page).inputValue().catch(() => null)};
}

// Click in the box, select its text, Delete, type from the keyboard, Tab
// (patterns.md pitfall: fill() does not reach the posted field).
async function typeDate(page, text) {
    const box = dateBox(page);
    await box.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    if (text) await page.keyboard.type(text, {delay: 60});
    await page.keyboard.press('Tab');
    await pause(300);
    return readStartDate(page);
}

// Click in the box, clear it, pick day <day> of the month the calendar shows.
// With {clear: false} the box keeps its text until the day is picked (after a
// refusal, so the message's removal is the pick's doing).
async function pickDay(page, day, {clear = true} = {}) {
    const box = dateBox(page);
    const errorBefore = await dateError(page);
    if (clear) {
        await box.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Delete');
        await page.keyboard.press('Tab');
    }
    await box.click();
    const cal = page.locator('#ui-datepicker-div');
    await cal.waitFor({state: 'visible', timeout: 10_000});
    await cal.locator('td:not(.ui-datepicker-other-month) a').filter({hasText: new RegExp(`^${day}$`)}).first().click();
    await pause(300);
    return {cleared: clear, errorBefore, ...(await readStartDate(page)), dateError: await dateError(page)};
}

// The refusal shown under "Start Date", if any.
async function dateError(page) {
    const l = page.locator('form#pflPluginSettingsForm label.error').filter({visible: true});
    return (await l.allInnerTexts()).map((x) => x.trim()).filter(Boolean).join(' | ') || null;
}

// Set the box's text without a key press, as a mouse paste or the browser's
// autofill does (Playwright's fill() fires "input" only, no key events).
async function setDateWithoutKeys(page, text) {
    await dateBox(page).fill(text);
    await page.locator('form#pflPluginSettingsForm').getByText('Exclude by Date').first().click();
    await pause(300);
    return readStartDate(page);
}

// The stored setting, as the plugin reads it.
function storedStartDate(app) {
    return sql(app, `select coalesce(setting_value, '<null>') from plugin_settings where plugin_name = 'pflplugin' and setting_name = 'dateStart' and context_id = (select journal_id from journals where path = '${app.contextPath}')`) || '<no row>';
}

module.exports = {dateBox, dateAlt, readStartDate, typeDate, pickDay, dateError, setDateWithoutKeys, storedStartDate, pause, idle};
