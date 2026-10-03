// Helpers of walk.js here (issue report docs/issues/U10-A9-date-short-empty-custom-strips-editorial-dates.md).
// Requiring this file runs nothing. The discussion helpers are the U53-A15 walk's
// (../merge-fails-for-discussion-opener/lib.js): main's "Tasks & Discussions" panel, 3.5's grid.
const {idle, screen, record} = require('../../../probe');
const {flat, sleep, is35, openDiscussions} = require('../merge-fails-for-discussion-opener/lib');

const T = 30_000;

/**
 * Open the discussion `name` at `where` and read each message's head as shown: main, the window's
 * "Message from …" line with its date and time; 3.5, the notes grid's rows ("username" over the date).
 */
async function messageDates(page, app, where, name, label) {
    try {
        const panel = await openDiscussions(page, app, where);
        if (is35(app)) {
            const grid = page.locator('[id^="component-grid-queries-queriesgrid"]').first();
            await grid.locator('tbody tr.gridRow').filter({hasText: name}).last().locator('a').filter({hasText: name}).first().click();
            const dlg = page.locator('[role="dialog"]').filter({has: page.locator('[id^="component-grid-queries-querynotesgrid"]')}).last();
            await dlg.waitFor({timeout: T});
            await idle(page);
            await sleep(800);
            record(`${label}-discussion`, await screen(page));
            // A row is the message, then its writer's username over the date and time: keep that end.
            const rows = await dlg.locator('[id^="component-grid-queries-querynotesgrid"] tbody tr.gridRow').allInnerTexts();
            return rows.map((r) => flat(r, 5000).slice(-40));
        }
        const win = await panel.openItem(name);
        record(`${label}-discussion`, await screen(page));
        const n = await win.messages().count();
        const heads = [];
        for (let i = 0; i < n; i++) heads.push(flat(await win.messageHead(i).innerText(), 200));
        return heads;
    } catch (e) {
        return {error: flat(String(e && e.message), 300)};
    }
}

/** Settings › Website › "Setup" › "Date & Time", freshly loaded; returns the form object. */
async function openDateTime(page, app) {
    const {WebsiteSettings} = require('../../../pages/AppearancePages.js');
    const site = new WebsiteSettings(page, app.contextPath, {locale: /stable-3_[34]_0/.test(app.line || '') ? '' : 'en'});
    await site.goto();
    const form = await site.open('dateTime');
    await idle(page);
    return form;
}

/**
 * A group of choices by its field name, the innermost fieldset that holds its radios (3.5 wraps the
 * whole form in one more fieldset, so the page object's `group()` matches every group there).
 */
function group(form, field, locale = 'en') {
    return form.form.locator('fieldset.pkpFormField--options').filter({has: form.page.locator(`input[type="radio"][name="${field}-${locale}"]`)}).last();
}

/** The group's choices as read: each label and whether it is chosen; and the "Custom" box. */
async function readGroup(form, field) {
    const g = group(form, field);
    const choices = await g.locator('label.pkpFormField--options__option').evaluateAll((labels) => labels.map((l) => {
        const radio = l.querySelector('input[type="radio"]');
        const clone = l.cloneNode(true);
        clone.querySelectorAll('input').forEach((n) => n.remove());
        return {label: clone.textContent.replace(/\s+/g, ' ').trim(), checked: !!(radio && radio.checked)};
    }));
    const customBox = await g.locator('input[type="text"]').first().inputValue().catch(() => null);
    return {choices, customBox};
}

/** "Date (Short)" and "Date & Time (Short)" as shown. */
async function shortGroups(form) {
    return {dateFormatShort: await readGroup(form, 'dateFormatShort'), datetimeFormatShort: await readGroup(form, 'datetimeFormatShort')};
}

/** Choose the group's n-th choice (0-based; "Custom" is the last). */
async function choose(form, field, n) {
    const radios = group(form, field).locator('input[type="radio"]');
    await (n < 0 ? radios.last() : radios.nth(n)).check();
}

/** Choose "Custom" and type `text` in its box ('' leaves it empty, clearing what it held). */
async function chooseCustom(form, field, text = '') {
    await choose(form, field, -1);
    const box = group(form, field).locator('input[type="text"]').first();
    if (text || (await box.inputValue())) await box.fill(text);
}

/** Press "Save": the answer, the "Saved" mark, and the two short formats the request sent. */
async function save(page, form) {
    const response = await form.pressSave();
    const body = new URLSearchParams(response.request().postData() || '');
    await idle(page).catch(() => {});
    const saved = await form.savedStatus.isVisible().catch(() => false);
    return {
        status: response.status(),
        saved,
        sent: {dateFormatShort: body.get('dateFormatShort[en]') ?? body.get('dateFormatShort[en_US]'), datetimeFormatShort: body.get('datetimeFormatShort[en]') ?? body.get('datetimeFormatShort[en_US]')},
    };
}

module.exports = {T, flat, sleep, is35, messageDates, openDateTime, shortGroups, choose, chooseCustom, save};
