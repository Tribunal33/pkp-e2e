// Helpers of walk.js here (issue report docs/issues/U10-A18-ordinal-ending-dropped-on-discussion-messages.md).
// Requiring this file runs nothing. Copied so the folder stands alone: the "Date & Time" tab and
// discussion-message reads from the U10 A9 walk, the discussion panel/grid and "Add" from the U53 A15
// walk, the library tab and "Add a file" from the U39 walk. Every helper records what it saw rather
// than throwing where a fix trial could change the state.
const fs = require('fs');
const {idle, screen, record, outFile} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Is this process on stable-3_5_0 (the older discussions grid)? */
const is35 = (app) => app.line === 'stable-3_5_0';

// ---------------------------------------------------------------------------------------------
// Settings › Website › "Setup" › "Date & Time".

/** The tab, freshly loaded; returns the form object. */
async function openDateTime(page, app) {
    const {WebsiteSettings} = require('../../../pages/AppearancePages.js');
    const site = new WebsiteSettings(page, app.contextPath, {locale: /stable-3_[34]_0/.test(app.line || '') ? '' : 'en'});
    await site.goto();
    const form = await site.open('dateTime');
    await idle(page);
    return form;
}

/** The innermost fieldset holding a group's radios (3.5 wraps the whole form in one more). */
function group(form, field, locale = 'en') {
    return form.form.locator('fieldset.pkpFormField--options').filter({has: form.page.locator(`input[type="radio"][name="${field}-${locale}"]`)}).last();
}

/** The group's choices as shown (label, chosen) and its "Custom" box. */
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

/** Choose "Custom" (the group's last choice) and type `text` in its box. */
async function chooseCustom(form, field, text) {
    await group(form, field).locator('input[type="radio"]').last().check();
    await group(form, field).locator('input[type="text"]').first().fill(text);
}

/** Press "Save": the answer, the "Saved" mark and the English "Date & Time (Short)" the request sent. */
async function save(page, form) {
    const response = await form.pressSave();
    const body = new URLSearchParams(response.request().postData() || '');
    await idle(page).catch(() => {});
    return {
        status: response.status(),
        saved: await form.savedStatus.isVisible().catch(() => false),
        sent: body.get('datetimeFormatShort[en]') ?? body.get('datetimeFormatShort[en_US]'),
    };
}

// ---------------------------------------------------------------------------------------------
// The discussion: main's "Tasks & Discussions" panel, 3.5's discussions grid.

/** Open the panel (main) or the grid (3.5) of submission `id` at `menuKey`. */
async function openDiscussions(page, app, {id, menuKey, panelTitle}) {
    if (is35(app)) {
        await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${id}&workflowMenuKey=${menuKey}`));
        await idle(page);
        await page.locator('[id^="component-grid-queries-queriesgrid"]').first().waitFor({timeout: T});
        await idle(page);
        return null;
    }
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: panelTitle});
    await panel.gotoEditorial(id, menuKey);
    await idle(page);
    return panel;
}

/**
 * "Add" on the panel (main) or "Add discussion" on the grid (3.5): `name`, `participant` ticked
 * (main: username; 3.5: full name), `message`, "Save". Returns the save's status.
 */
async function addDiscussion(page, app, where, {name, participant, participantName, message, label}) {
    const panel = await openDiscussions(page, app, where);
    if (is35(app)) {
        const grid = page.locator('[id^="component-grid-queries-queriesgrid"]').first();
        await grid.getByText(/Add discussion/i).first().click();
        const form = page.locator('form#queryForm').last();
        await form.waitFor({timeout: T});
        await idle(page);
        await form.locator('label', {hasText: participantName}).locator('input[type="checkbox"]').first().check();
        await form.locator('input[name="subject"]').fill(name);
        const id = await form.locator('textarea[name="comment"]').getAttribute('id');
        await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T});
        await page.frameLocator(`#${id}_ifr`).locator('body').click();
        await page.keyboard.type(message);
        record(`${label}-add-filled`, await screen(page));
        const resp = page.waitForResponse((r) => /update-?query/i.test(r.url()), {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: /^(Save|OK)$/}).last().click();
        const r = await resp;
        await sleep(1500);
        await idle(page);
        return {status: r ? r.status() : null};
    }
    const win = await panel.openAdd();
    await win.nameField().fill(name);
    await win.tick(participant);
    await win.typeMessage(message);
    record(`${label}-add-filled`, await screen(page));
    const answer = await win.saveAndAnswer();
    await win.root.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    return {status: answer.status()};
}

/**
 * Open the discussion `name` and read each message's head as shown: main, the window's "Message from
 * …" line with its date and time; 3.5, the notes grid's rows (the username over the date: the end kept).
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

// ---------------------------------------------------------------------------------------------
// Settings › Workflow › the library tab.

/** The library's name per app: the Settings › Workflow tab's label. */
const LIBRARY_TAB = {ojs: 'Publisher Library', omp: 'Press Library', ops: 'Preprint Server Library'};

/** Settings › Workflow and the app's library tab; returns the tab's list. */
async function openLibrary(page, app) {
    const {PublisherLibraryTab} = require('../../../pages/LibraryPages.js');
    const tab = new PublisherLibraryTab(page, app.contextPath, LIBRARY_TAB[app.name]);
    await tab.goto();
    await idle(page);
    return tab.list();
}

/** "Add a file": `name`, Type "Other", a small text file, "OK". */
async function addLibraryFile(page, app, name) {
    const list = await openLibrary(page, app);
    const file = outFile(`${name.replace(/\W+/g, '-')}.txt`);
    fs.writeFileSync(file, `${name}\n`);
    const win = await list.openAdd();
    await win.add({name, type: 'Other', file});
    await sleep(1500);
    await idle(page);
    return {listed: await list.row(name).count()};
}

/** The library file's arrow › "Edit": the "File" table's "Date uploaded". */
async function libraryDateUploaded(page, app, name, label) {
    const list = await openLibrary(page, app);
    const win = await list.openEdit(name);
    await sleep(500);
    record(label, await screen(page));
    return flat(await win.fileLine('Date uploaded').innerText(), 100);
}

/**
 * The workflow of submission `id` (at `menuKey`, or where it opens): every short date shown ("5 Oct
 * 2026", "5th Oct 2026"), each with the line it sits on.
 */
async function workflowDates(page, app, id, menuKey, label) {
    const q = menuKey ? `&workflowMenuKey=${menuKey}` : '';
    await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${id}${q}`));
    await idle(page);
    await page.getByText(/\b\d{1,2}(st|nd|rd|th)? [A-Z][a-z]{2} \d{4}\b/).first().waitFor({timeout: 15_000}).catch(() => {});
    await sleep(800);
    record(label, await screen(page));
    const text = await page.locator('body').innerText();
    const lines = text.split('\n').map((l) => flat(l, 160)).filter((l) => /\b\d{1,2}(st|nd|rd|th)? [A-Z][a-z]{2} \d{4}\b/.test(l));
    return {url: page.url().replace(/^https?:\/\/[^/]+/, ''), lines: [...new Set(lines)].slice(0, 20)};
}

module.exports = {T, workflowDates, sleep, flat, is35, openDateTime, readGroup, chooseCustom, save, addDiscussion, messageDates, addLibraryFile, libraryDateUploaded};
