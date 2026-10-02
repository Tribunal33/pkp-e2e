// Helpers of walk.js and neighbour.js here (issue report
// docs/issues/U37-A9-participant-message-edit-adds-message.md). Requiring this file runs nothing.
// "Participants" › "Notify" is the U35 A3 walk's (../typed-participant-message-not-sent/lib.js);
// this file adds the per-app dataset facts and the discussions panel's "Edit" and window reads
// (main), and the 3.5 "Production Discussions" grid (its "Edit" and its query window).
const {screen, record, idle} = require('../../../probe');
const P = require('../typed-participant-message-not-sent/lib.js');

const {sleep, flat} = P;

/** Per app, on PKP's default test dataset (docs/process/dataset.md). */
const WORDS = {
    ojs: {id: 5, stage: 'workflow_5', person: 'Diaga Diouf', username: 'ddiouf', template: 'Discussion (Production)'},
    omp: {id: 4, stage: 'workflow_5', person: 'Bart Beaty', username: 'bbeaty', template: 'Discussion (Production)'},
    ops: {id: 1, stage: 'workflow_5', person: 'Carlo Corino', username: 'ccorino', template: 'Discussion (Production)', byMenu: true},
};
const PANEL = 'Production Tasks & Discussions';

/** "Participants" › the person's "More Actions" › "Notify", the predefined message chosen, `text` typed, "Notify". */
async function notify(page, app, w, text, name) {
    await P.openWorkflow(page, app, w.id, w.stage);
    const win = await P.openNotify(page, w.person);
    const chosen = await P.chooseTemplate(page, win, w.template);
    await P.typeMessage(page, win, text);
    const pressed = await P.press(page, win, 'Notify', /send-?notification/i, name);
    return {chosen: chosen.status, status: pressed.status, windowOpen: pressed.windowOpen, notices: pressed.notices};
}

/** The discussion window's messages as [{head, body}], read by pressing the row's name; closed after. */
async function readMessages(page, panel, title, name) {
    const {DiscussionWindow} = require('../../../pages/TasksDiscussionsPages.js');
    await panel.nameButton(title).last().click();
    const win = new DiscussionWindow(page, title);
    await win.expectReady({participants: false});
    await sleep(800);
    record(name, await screen(page));
    const n = await win.messages().count();
    const out = [];
    for (let i = 0; i < n; i++) {
        out.push({head: flat(await win.messageHead(i).innerText().catch(() => null), 120), body: flat(await win.messageBody(i).innerText().catch(() => null), 200)});
    }
    await win.close();
    return out;
}

/**
 * Row menu › "Edit": what the message box holds, then `name` and/or `message` put in, the participant
 * `tick` ticked, and "Save".
 * Returns the box's text, the answer's status, and on a refusal the message box's error.
 */
async function editAndSave(page, panel, title, {name, message, tick}, shotName) {
    const win = await panel.openEdit(title);
    await win.waitForEditor();
    const box = flat(await win.messageText(), 200);
    if (name) await win.nameField().fill(name);
    if (message) await win.typeMessage(message);
    if (tick) await win.tick(tick);
    record(`${shotName}-filled`, await screen(page));
    const answer = await win.saveAndAnswer();
    const out = {box, status: answer.status()};
    await sleep(1200);
    if (out.status >= 400) {
        out.error = flat(await win.fieldError('description').innerText().catch(() => null), 200);
        out.answer = flat(await answer.text().catch(() => ''), 300);
        record(`${shotName}-refused`, await screen(page));
        await win.cancelButton().click().catch(() => {});
        await sleep(800);
    }
    await panel.reland();
    return out;
}

// ---------------------------------------------------------------------------------------------
// 3.5: the stage's "Production Discussions" grid (legacy), its row "Edit" and the query window.

const grid = (page) => page.locator('[id^="component-grid-queries-queriesgrid"]').first();

/** The grid's rows as text. */
async function gridRows(page) {
    await grid(page).waitFor({timeout: 30000});
    return (await grid(page).locator('tbody tr.gridRow').allInnerTexts()).map((t) => flat(t, 200));
}

/** The grid row whose subject is `subject` (the last one when several). */
const gridRow = (page, subject) => grid(page).locator('tbody tr.gridRow').filter({hasText: subject}).last();

/** Press the row's subject and read the query window's notes as text; closed after. */
async function readQuery35(page, subject, name) {
    await gridRow(page, subject).locator('a').filter({hasText: subject}).first().click();
    const dlg = page.locator('[role="dialog"]').filter({has: page.locator('[id^="component-grid-queries-querynotesgrid"]')}).last();
    await dlg.locator('[id^="component-grid-queries-querynotesgrid"] tbody tr').first().waitFor({timeout: 30000});
    await idle(page);
    await sleep(800);
    record(name, await screen(page));
    const notes = (await dlg.locator('[id^="component-grid-queries-querynotesgrid"] tbody tr').allInnerTexts()).map((t) => flat(t, 240)).filter((t) => t && t !== 'No Items');
    await dlg.getByRole('button', {name: /Close/}).first().click().catch(() => {});
    await sleep(800);
    return notes;
}

/** Whether the row offers "Edit" (its actions toggled open), and when `change`, the edit saved. */
async function editQuery35(page, subject, change, name) {
    const row = gridRow(page, subject);
    const toggle = row.locator('a.show_extras, button.show_extras').first();
    if (await toggle.count()) await toggle.click();
    await sleep(500);
    const ctl = page.locator('tr.row_controls:visible a, tr.row_controls:visible button').filter({hasText: /^\s*Edit\s*$/});
    const actions = (await page.locator('tr.row_controls:visible a, tr.row_controls:visible button').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
    if (!change || !(await ctl.count())) return {actions};
    await ctl.first().click();
    const form = page.locator('form#queryForm').last();
    await form.waitFor({timeout: 30000});
    await idle(page);
    const id = await form.locator('textarea[name="comment"]').getAttribute('id');
    await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: 30000});
    const box = await page.evaluate((i) => window.tinymce.get(i).getContent({format: 'text'}), id);
    if (change.name) await form.locator('input[name="subject"]').fill(change.name);
    if (change.message) {
        await page.frameLocator(`#${id}_ifr`).locator('body').click();
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.press('Delete');
        await page.keyboard.type(change.message);
    }
    record(`${name}-filled`, await screen(page));
    const resp = page.waitForResponse((r) => /update-?query/i.test(r.url()), {timeout: 30000}).catch(() => null);
    await form.getByRole('button', {name: /^(Save|OK)$/}).last().click();
    const r = await resp;
    await sleep(1500);
    await idle(page);
    return {actions, box: flat(box, 200), status: r ? r.status() : null};
}

/** The subject of the grid's last row (3.5 names a message's discussion after the email's subject). */
async function subject35(page) {
    await grid(page).waitFor({timeout: 30000});
    return (await grid(page).locator('tbody tr.gridRow').last().locator('[id$="-name"] a').first().innerText()).trim();
}

/** The author's view of the submission (3.5: "My Submissions" › the submission), on its current stage (OPS: "Discussions"). */
async function authorWorkflow35(page, app, w) {
    await page.goto(app.url(`/index.php/${app.contextPath}/authorDashboard/submission/${w.id}`));
    await idle(page);
    // A preprint server's Author has no stage entries: the side menu's "Discussions" holds the grid.
    if (w.byMenu) await page.getByRole('navigation').getByRole('link', {name: 'Discussions', exact: true}).click();
    await idle(page);
    await grid(page).waitFor({timeout: 30000});
    await idle(page);
}

/** Messages to `to` holding `marker`, with the sender's name and address: [{subject, from, body}]. */
async function mailsTo(page, app, to, marker, ms) {
    const end = Date.now() + ms;
    for (;;) {
        const r = await app.mail._search({to, contains: marker}).catch(() => ({messages: []}));
        const found = (r.messages || []).map((m) => ({subject: m.Subject, from: m.From && `${m.From.Name} <${m.From.Address}>`, body: flat(m.Snippet, 300)}));
        if (found.length || Date.now() > end) return found;
        await page.goto(app.url(`/index.php/${app.contextPath}`)).catch(() => {});
        await idle(page).catch(() => {});
        await sleep(1500);
    }
}

module.exports = {mailsTo, P, WORDS, PANEL, sleep, flat, notify, readMessages, editAndSave, gridRows, readQuery35, editQuery35, subject35, authorWorkflow35};
