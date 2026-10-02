// Helpers of walk.js here (U37 A31: an auto-added item keeps the recipient and sender placeholders).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle, screen, record, shot} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1200) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const PANEL = 'Production Tasks & Discussions';
const STAGE = 'Production Stage';

/** Submission `id`'s workflow on Production, as the signed-in editor; returns the panel. */
async function openPanel(page, app, id) {
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: PANEL});
    await panel.gotoEditorial(id, 'workflow_5');
    await idle(page);
    return panel;
}

/**
 * The workflow of submission `id`: "Send To Production", "Continue" through the steps, "Record Decision",
 * then "View Submission Summary". Returns the completion dialog's text and the decision call's status.
 */
async function sendToProduction(page, app, id) {
    await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${id}`));
    await idle(page);
    await page.getByRole('button', {name: 'Send To Production', exact: true}).click();
    await page.getByRole('heading', {name: /^Send To Production(:|$)/, level: 1}).waitFor({timeout: 30_000});
    const mask = page.locator('.composer__loadingTemplateMask');
    const recordBtn = page.getByRole('button', {name: 'Record Decision', exact: true});
    for (let i = 0; i < 8; i++) {
        await mask.waitFor({state: 'detached', timeout: 30_000}).catch(() => {});
        await idle(page);
        if (await recordBtn.isVisible()) break;
        await page.getByRole('button', {name: 'Continue', exact: true}).click();
        await sleep(800);
    }
    const posted = page.waitForResponse((r) => r.url().includes('/decisions') && r.request().method() === 'POST', {timeout: 60_000});
    await recordBtn.click();
    const r = await posted;
    const done = page.getByRole('dialog').filter({has: page.getByRole('link', {name: 'View Submission Summary'})}).last();
    await done.waitFor({timeout: 30_000});
    const text = flat(await done.innerText(), 300);
    await done.getByRole('link', {name: 'View Submission Summary'}).click();
    await idle(page);
    return {decision: r.status(), completion: text};
}

/** The panel's rows as lines. */
async function rows(panel) {
    return panel.root().locator('tbody tr').evaluateAll((trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
}

/**
 * Press the item `name` in the panel; returns the window's first message (its head line, its text and the
 * placeholders it still holds), the participant lines, and records the screen as `label`. Closes the window.
 */
async function readItem(page, panel, name, label) {
    const {DiscussionWindow} = require('../../../pages/TasksDiscussionsPages.js');
    const list = await rows(panel);
    if (!(await panel.nameButton(name).count())) return {rows: list, found: false};
    await panel.nameButton(name).first().click();
    const win = new DiscussionWindow(page, name);
    await win.messages().first().waitFor({timeout: 30_000});
    await idle(page);
    await sleep(800);
    const head = flat(await win.messageHead(0).innerText().catch(() => null), 200);
    const body = await win.messages().first().innerText().catch(() => null);
    const participants = await win.participantLines().allInnerTexts().catch(() => []);
    const s = await screen(page);
    record(label, s);
    await shot(page, label).catch(() => {});
    await win.close().catch(() => {});
    await sleep(700);
    return {
        rows: list,
        found: true,
        head,
        message: flat(body, 1200),
        placeholdersLeft: (body || '').match(/\{\$[A-Za-z]+\}/g) || [],
        participants: participants.map((p) => flat(p, 120)),
    };
}

/**
 * "Add" in the panel, press the discussion template `template`, rename the item `name`, tick the participants
 * `users` (usernames; when a username is not offered, the first offered participant other than the signed-in
 * `self`), untick `self` when `untickSelf`, "Save". Returns the save call's status and what was ticked.
 */
async function addFromTemplate(page, panel, template, name, users, self, {untickSelf = false} = {}) {
    const win = await panel.openAdd();
    await win.pressTemplate('Discussion', template);
    await idle(page);
    await sleep(800);
    const filled = flat(await win.messageText(), 600);
    await win.nameField().fill(name);
    const offered = await win.participantUsernames();
    const ticked = [];
    for (const u of users) {
        const pick = offered.includes(u) ? u : offered.find((o) => o && o !== self && !ticked.includes(o));
        if (pick) {
            await win.tick(pick);
            ticked.push(pick);
        }
    }
    if (untickSelf) await win.tick(self, false);
    const checked = (await win.participants()).filter((p) => p.checked).map((p) => p.label);
    const answer = await win.saveAndAnswer();
    await sleep(1200);
    await idle(page);
    return {filled, offered, ticked, checked, saved: answer.status()};
}

/** On the item `name`: "More Actions" › "Edit", tick two participants other than `self`, "Save". */
async function editAddParticipants(page, panel, name, self) {
    const win = await panel.openEdit(name);
    await sleep(600);
    const shown = flat(await win.messageText(), 600);
    const offered = await win.participantUsernames();
    const ticked = offered.filter((o) => o && o !== self).slice(0, 2);
    for (const u of ticked) await win.tick(u);
    const answer = await win.saveAndAnswer();
    await sleep(1200);
    await idle(page);
    const open = await win.root.isVisible().catch(() => false);
    const s = await screen(page);
    if (open) await win.cancelButton().click().catch(() => {});
    await sleep(700);
    return {shown, offered, ticked, saved: answer.status(), windowOpen: open, notices: s.notices};
}

/** Settings › Workflow › "Tasks and Discussions" › `stage` › "Add template": `name`, the discussion `text`, "Save". */
async function addTemplate(page, app, name, text, stage = STAGE) {
    const {TaskTemplatesTab} = require('../../../pages/TasksDiscussionsPages.js');
    const tab = new TaskTemplatesTab(page, app.contextPath);
    await tab.goto();
    await idle(page);
    const win = await tab.openAdd(stage);
    await win.nameField().fill(name);
    await win.typeMessage(text);
    await win.saveExpectClosed();
    await idle(page);
    return tab.templateNames(stage);
}

module.exports = {sleep, flat, PANEL, STAGE, openPanel, sendToProduction, rows, readItem, addFromTemplate, editAddParticipants, addTemplate};
