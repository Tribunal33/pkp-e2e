// Helpers of walk.js and neighbour.js here (issue report docs/issues/U35-A10-added-message-template-not-sent.md)
// and of ../role-limited-message-template-not-sent/. Requiring this file runs nothing.
// Every helper drives the screens a person uses; the mailbox and the server's log are read beside them.
const fs = require('fs');
const path = require('path');
const {idle, screen, record} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per app, on PKP's default test dataset: the submission in Production, its author, and the neighbour's submission. */
const APPS = {
    ojs: {id: 5, author: {name: 'Diaga Diouf', username: 'ddiouf'}, outside: {name: 'Graham Cox', username: 'gcox', role: 'Layout Editor'}, se: {id: 5, menuKey: 'workflow_5', stage: 'Production Stage', template: 'Discussion (Production)', person: 'Diaga Diouf'}},
    omp: {id: 4, author: {name: 'Bart Beaty', username: 'bbeaty'}, outside: {name: 'Graham Cox', username: 'gcox', role: 'Layout Editor'}, se: {id: 1, menuKey: 'workflow_4', stage: 'Copyediting Stage', template: 'Discussion (Copyediting)', person: 'Arthur Clark'}},
    ops: {id: 1, author: {name: 'Carlo Corino', username: 'ccorino'}, outside: {name: 'David Buskins', username: 'dbuskins', role: 'Moderator'}, se: {id: 1, menuKey: 'workflow_5', stage: 'Production Stage', template: 'Discussion (Production)', person: 'Carlo Corino'}},
};
const STAGE = 'Production Stage';
const PANEL = 'Production Tasks & Discussions';
const MENU_KEY = 'workflow_5';

/** The fleet server's log lines written since this call that name a PHP or database failure. */
function serverLog(app) {
    const dir = path.join(__dirname, '../../../../../apps', app.name, 'playwright/.server-logs');
    const name = fs.existsSync(dir) ? fs.readdirSync(dir).find((f) => f.startsWith(`server-${app.port}`)) : null;
    const full = name ? path.join(dir, name) : null;
    const size = () => (full && fs.existsSync(full) ? fs.statSync(full).size : 0);
    let start = size();
    return {
        file: name,
        take() {
            if (!full) return [];
            const end = size();
            const fd = fs.openSync(full, 'r');
            const buf = Buffer.alloc(Math.max(0, end - start));
            fs.readSync(fd, buf, 0, buf.length, start);
            fs.closeSync(fd);
            start = end;
            return [...new Set(buf.toString('utf8').split('\n').filter((l) => /Uncaught|Fatal|TypeError|SQLSTATE/.test(l)).map((l) => flat(l.replace(/^\[[^\]]*\]\s*/, ''), 700)))];
        },
    };
}

/** Settings › Workflow › "Tasks and Discussions". */
async function openTemplates(page, app) {
    const {TaskTemplatesTab} = require('../../../pages/TasksDiscussionsPages.js');
    const tab = new TaskTemplatesTab(page, app.contextPath);
    await tab.goto();
    await idle(page);
    return tab;
}

/** "Add template" in a stage group: Name, message, optionally "Limit access to specific roles" with one role; "Save". */
async function addTemplate(page, app, {stage, name, message, limitTo = null, insert = []}) {
    const tab = await openTemplates(page, app);
    const win = await tab.openAdd(stage);
    await win.nameField().fill(name);
    if (limitTo) {
        await win.radio('Limit access to specific roles').check();
        await win.roleBox(limitTo).check();
    }
    await win.typeMessage(message);
    // "Insert Content" in the editor's toolbar: "Insert" on each placeholder's row, at the cursor
    for (const value of insert) {
        await win.root.getByRole('button', {name: 'Insert Content', exact: true}).click();
        const dialog = page.getByRole('dialog', {name: 'Insert Content'}).last();
        await dialog.locator('li').filter({hasText: value}).first().getByRole('button', {name: 'Insert', exact: true}).click();
        await sleep(500);
        if (await dialog.isVisible().catch(() => false)) await dialog.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await sleep(500);
    }
    const filled = await screen(page);
    await win.saveExpectClosed();
    await idle(page);
    return {filled: flat(filled.text.dialog, 900), names: await tab.templateNames(stage)};
}

/** A template row's "More Actions" › "Edit": "Limit access to specific roles", tick one role, "Save". */
async function limitTemplate(page, app, {stage, name, role}) {
    const tab = await openTemplates(page, app);
    const win = await tab.openEdit(name, stage);
    const radio = win.radio('Limit access to specific roles');
    const was = await radio.isChecked();
    await radio.check();
    const roles = await win.root.getByRole('checkbox').evaluateAll((els) => els.map((e) => ((e.closest('label') || {}).innerText || '').trim()).filter(Boolean)).catch(() => []);
    await win.roleBox(role).check();
    const filled = await screen(page);
    await win.saveExpectClosed();
    await idle(page);
    return {wasLimited: was, role, boxes: roles, filled: flat(filled.text.dialog, 900)};
}

/** Open the submission's workflow at a stage; returns the Participants panel. */
async function openStage(page, app, id, menuKey = MENU_KEY) {
    const {ParticipantsPanel} = require('../../../pages/StageParticipantsPages.js');
    const panel = new ParticipantsPanel(page, app.contextPath);
    await panel.goto(id, {menuKey});
    await idle(page);
    return panel;
}

const messageId = (win) => win.root.locator('textarea[name="message"]').getAttribute('id');
async function readMessage(page, win) {
    const id = await messageId(win);
    return page.evaluate((i) => {
        const editor = window.tinymce && window.tinymce.get(i);
        return editor ? editor.getContent({format: 'text'}) : document.getElementById(i).value;
    }, id);
}
async function typeMessage(page, win, text) {
    const id = await messageId(win);
    await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T});
    await page.frameLocator(`#${id}_ifr`).locator('body').click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await page.keyboard.type(text);
    await sleep(300);
}

/** The option labels of the open window's predefined-message list. */
const options = async (win) => (await win.root.locator('select[name="template"] option').allTextContents()).map((t) => t.trim());

/** A person's row › "More Actions" › "Notify"; returns the window. */
async function openNotify(page, panel, person) {
    const win = await panel.openNotify(person);
    await idle(page);
    return win;
}

/**
 * In the open "Notify" window: choose a predefined message and read what "Message" holds,
 * then (when `message` is given) type it and press "Notify". Reports each request's status,
 * whether the window stayed open and the notices shown.
 */
async function chooseAndSend(page, app, win, label, {template, message = null, send = true}) {
    const log = serverLog(app);
    const out = {template, options: await options(win), before: flat(await readMessage(page, win))};
    const fetched = page.waitForResponse((r) => r.url().includes('fetch-template-body'), {timeout: T}).catch(() => null);
    await win.templateSelect().selectOption({label: template});
    const f = await fetched;
    out.choice = {status: f ? f.status() : null, answer: f ? flat(await f.text().catch(() => ''), 300) : null};
    await idle(page);
    await sleep(1500);
    out.choice.message = flat(await readMessage(page, win));
    out.choice.log = log.take();
    record(`${label}-chosen`, await screen(page));
    if (!send) return out;
    if (message !== null) await typeMessage(page, win, message);
    out.messageAtSend = flat(await readMessage(page, win));
    const sent = page.waitForResponse((r) => r.url().includes('send-notification'), {timeout: T}).catch(() => null);
    await win.notifyButton().click();
    const s = await sent;
    out.send = {status: s ? s.status() : null, answer: s ? flat(await s.text().catch(() => ''), 300) : null};
    await win.root.waitFor({state: 'detached', timeout: 8000}).catch(() => {});
    await idle(page);
    const after = await screen(page);
    record(`${label}-sent`, after);
    out.send.windowOpen = await win.notifyButton().isVisible().catch(() => false);
    out.send.windowText = out.send.windowOpen ? flat(await win.root.innerText().catch(() => ''), 500) : null;
    out.send.notices = (after.notices || []).map((n) => flat(n.text || n));
    out.send.log = log.take();
    return out;
}

/** Land the page afresh and read the stage's discussions named `name`: each row's text, and the first one's window. */
async function readDiscussions(page, panel, label, {title = PANEL, name, open = true}) {
    await panel.reland();
    await idle(page);
    const rows = panel.discussionRows(title, name);
    await sleep(500);
    const texts = (await rows.allInnerTexts()).map((t) => flat(t, 300));
    const out = {count: texts.length, rows: texts, window: null};
    if (open && texts.length) {
        await rows.last().locator('a, button').first().click();
        await idle(page);
        await sleep(1000);
        const s = await screen(page);
        record(`${label}-discussion`, s);
        out.window = flat(s.text.dialog, 900);
        await panel.reland();
        await idle(page);
    }
    return out;
}

/** The recipient's mail holding `marker`, waited up to `ms` (the dataset's config sends queued mail on page loads). */
async function waitMail(page, app, username, marker, ms = 12_000) {
    const to = `${username}@mailinator.com`;
    const end = Date.now() + ms;
    for (;;) {
        const r = await app.mail._search({to, contains: marker}).catch(() => ({messages: []}));
        const found = (r.messages || []).map((m) => ({subject: m.Subject, from: m.From && m.From.Address, start: flat(m.Snippet, 300)}));
        if (found.length || Date.now() > end) return found;
        await page.goto(app.url(`/index.php/${app.contextPath}`)).catch(() => {});
        await idle(page).catch(() => {});
        await sleep(1500);
    }
}

module.exports = {T, sleep, flat, APPS, STAGE, PANEL, MENU_KEY, serverLog, openTemplates, addTemplate, limitTemplate, openStage, readMessage, typeMessage, options, openNotify, chooseAndSend, readDiscussions, waitMail};
