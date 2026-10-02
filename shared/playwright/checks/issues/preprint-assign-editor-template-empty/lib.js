// Helpers of walk.js here (U37 OPS1, joined to docs/issues/U35-OPS2-preprint-assign-editor-message-not-filled.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle, screen, record, shot} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const PANEL = 'Production Tasks & Discussions';
const STAGE = 'Production Stage';

/** The text of the TinyMCE box inside `root` (the textarea whose id ends in `-<field>-control`). */
async function boxText(page, root, field = 'description') {
    const id = await root.locator(`textarea[id$="-${field}-control"]`).getAttribute('id', {timeout: 5000}).catch(() => null);
    if (!id) return null;
    return page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent({format: 'text'}).trim() : null), id);
}

/** Every visible field error inside `root` as `{field, text}`. */
async function fieldErrors(root) {
    return root.locator('.pkpFieldError').evaluateAll((els) =>
        els.filter((el) => el.getClientRects().length > 0).map((el) => ({field: (el.id || '').replace(/^.*?-(.*)-error$/, '$1'), text: (el.innerText || '').replace(/\s+/g, ' ').trim()})),
    ).catch(() => []);
}

/** Submission `id`'s workflow on Production, as the signed-in editor; returns the "Tasks & Discussions" panel. */
async function openPanel(page, app, id) {
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: PANEL});
    await panel.gotoEditorial(id, 'workflow_5');
    await idle(page);
    return panel;
}

/** The "Add" window: press the discussion template `name`; returns what "Name" and "Message" then hold, and the template call's status. */
async function pressTemplate(page, win, name) {
    const answered = page.waitForResponse((r) => r.url().includes('/tasks/fromTemplate/'), {timeout: 30_000}).catch(() => null);
    await win.templateButton('Discussion', name).click();
    const r = await answered;
    await idle(page);
    await sleep(800);
    return {template: name, status: r ? r.status() : null, name: await win.nameField().inputValue(), message: flat(await win.messageText(), 300)};
}

/** Press "Save" in an "Add"/"Edit" window; returns whether it closed, the errors shown, and the save call's status. */
async function save(page, win, label) {
    const sent = page.waitForResponse((r) => /\/tasks(\/\d+)?$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 6000}).catch(() => null);
    await win.saveButton().click();
    const r = await sent;
    await sleep(1200);
    await idle(page);
    const open = await win.root.isVisible().catch(() => false);
    const s = await screen(page);
    record(label, s);
    await shot(page, label).catch(() => {});
    return {sent: r ? r.status() : null, windowOpen: open, errors: open ? await fieldErrors(win.root) : [], message: open ? flat(await win.messageText(), 300) : null, notices: s.notices};
}

/** Settings › Workflow › "Tasks and Discussions". */
async function openTemplates(page, app) {
    const {TaskTemplatesTab} = require('../../../pages/TasksDiscussionsPages.js');
    const tab = new TaskTemplatesTab(page, app.contextPath);
    await tab.goto();
    await idle(page);
    return tab;
}

/** The template's "Edit" window: what it holds, then "Save" (typing `text` first when given); "Cancel" when refused. */
async function editTemplate(page, app, name, label, {text = null} = {}) {
    const tab = await openTemplates(page, app);
    const win = await tab.openEdit(name, STAGE);
    await sleep(600);
    const held = {name: await win.nameField().inputValue(), discussion: await boxText(page, win.root)};
    const s0 = await screen(page);
    record(`${label}-open`, s0);
    if (text) await win.typeMessage(text);
    const answered = page.waitForResponse((r) => /editTaskTemplates|taskTemplates/.test(r.url()) && r.request().method() !== 'GET', {timeout: 6000}).catch(() => null);
    await win.saveButton().click();
    const r = await answered;
    await sleep(1200);
    await idle(page);
    const open = await win.root.isVisible().catch(() => false);
    const s = await screen(page);
    record(label, s);
    await shot(page, label).catch(() => {});
    const out = {held, typed: text, sent: r ? r.status() : null, windowOpen: open, errors: open ? await fieldErrors(win.root) : [], notices: s.notices};
    if (open) {
        await win.cancelButton().click();
        await sleep(800);
    }
    return out;
}

/** Tick the template's "Auto-add at stage" box and answer "Yes". */
async function autoAdd(page, app, name) {
    const tab = await openTemplates(page, app);
    const before = await tab.autoAddBox(name, STAGE).isChecked();
    const dialog = await tab.pressAutoAdd(name, STAGE);
    const question = flat(await page.getByRole('dialog').last().innerText().catch(() => ''), 300);
    await dialog.answer('Yes');
    await sleep(1200);
    await idle(page);
    const s = await screen(page);
    return {before, question, after: await tab.autoAddBox(name, STAGE).isChecked(), notices: s.notices};
}

/** The panel's rows, and the item `name` opened: its window's text. */
async function readItem(page, panel, name, label) {
    const rows = await panel.root().locator('tbody tr').evaluateAll((trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
    if (!(await panel.nameButton(name).count())) return {rows, found: false};
    await panel.nameButton(name).first().click();
    await sleep(1500);
    await idle(page);
    const s = await screen(page);
    record(label, s);
    await shot(page, label).catch(() => {});
    return {rows, found: true, window: flat(s.text.dialog, 1200)};
}

// 3.5: "Production Discussions" › "Add discussion", the predefined-message list.
/** On 3.5, open submission `id`'s workflow on Production, press "Add discussion", choose `entry`; returns the list and the box. */
async function addDiscussion35(page, app, id, entryPattern) {
    await page.goto(app.url(`/index.php/${app.contextPath}/workflow/index/${id}/5`));
    await idle(page);
    const grid = page.locator('[id^="component-grid-queries-queriesgrid"]').first();
    await grid.getByRole('link', {name: 'Add discussion'}).or(grid.getByRole('button', {name: 'Add discussion'})).first().click();
    const win = page.getByRole('dialog').filter({has: page.locator('select[name="template"]')}).last();
    await win.locator('select[name="template"]').waitFor({timeout: 30_000});
    await idle(page);
    const ta = win.locator('textarea[name="comment"]');
    const tid = await ta.getAttribute('id');
    await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), tid, {timeout: 30_000});
    const options = (await win.locator('select[name="template"] option').allTextContents()).map((t) => t.trim());
    const entry = options.find((o) => entryPattern.test(o));
    const fetched = page.waitForResponse((r) => /fetch-?template-?body/i.test(r.url()), {timeout: 15_000}).catch(() => null);
    await win.locator('select[name="template"]').selectOption({label: entry});
    const r = await fetched;
    await idle(page);
    await sleep(800);
    const message = await page.evaluate((i) => window.tinymce.get(i).getContent({format: 'text'}).trim(), tid);
    const s = await screen(page);
    record('add-discussion-35', s);
    await shot(page, 'add-discussion-35').catch(() => {});
    await win.getByRole('button', {name: 'Cancel'}).last().click().catch(() => {});
    return {options, entry, status: r ? r.status() : null, message: flat(message, 300)};
}

module.exports = {sleep, flat, PANEL, STAGE, boxText, fieldErrors, openPanel, pressTemplate, save, openTemplates, editTemplate, autoAdd, readItem, addDiscussion35};
