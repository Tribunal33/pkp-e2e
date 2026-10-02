// Helpers of walk.js and neighbour.js here (issue report docs/issues/U37-A29-add-window-file-missing-from-history.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses, on PKP's default test
// dataset: the Production "Tasks & Discussions" panel (main) through the shared page objects, and on
// stable-3_5_0 the older "Production Discussions" grid through the U37 A8 and A9 walks' helpers.
const path = require('path');
const {idle, screen, record} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per app, on PKP's default test dataset: the submission at Production and the participant ticked. */
const WORDS = {
    ojs: {id: 5, participant: 'dbuskins', participantName: 'David Buskins'},
    omp: {id: 4, participant: 'gcox', participantName: 'Graham Cox'},
    ops: {id: 1, participant: 'dbuskins', participantName: 'David Buskins'},
};
const PANEL = 'Production Tasks & Discussions';
const MENU_KEY = 'workflow_5';
const FIRST_FILE = 'figure.png';
const REPLY_FILE = 'replacement.pdf';

const fixturePath = (app, f) => path.resolve(__dirname, `../../../../../apps/${app.name}/playwright/fixtures/files/${f}`);

/** dbarnes's view of the submission at Production; returns the panel. */
async function openPanel(page, app) {
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: PANEL});
    await panel.gotoEditorial(WORDS[app.name].id, MENU_KEY);
    await idle(page);
    return panel;
}

/** "Add": the name, the participant ticked, the message, and when `file` an upload through "Attach Files"; "Save". */
async function addItem(page, app, panel, {name, message, file, label}) {
    const win = await panel.openAdd();
    await win.nameField().fill(name);
    await win.tick(WORDS[app.name].participant);
    await win.typeMessage(message);
    if (file) {
        const attach = await win.openAttachFiles();
        await attach.upload(fixturePath(app, file));
    }
    const listed = file ? await win.attachedFile(file).count() : 0;
    record(`${label}-window`, await screen(page));
    const answer = await win.saveAndAnswer();
    const status = answer.status();
    await win.root.waitFor({state: 'hidden', timeout: 30_000}).catch(() => {});
    await idle(page);
    return {status, fileListedUnderMessage: listed};
}

/** Row menu › "History": every row as {date, user, event, download}, newest first; closed after. */
async function readHistory(page, panel, name, label) {
    await panel.reland();
    const history = await panel.openHistory(name);
    const entries = await history.entries();
    const downloads = await history.root.getByRole('link', {name: 'Download', exact: true}).count();
    record(`${label}-history`, await screen(page));
    await history.close();
    return {entries: entries.map((e) => `${e.event}${e.download ? ` [${e.download}]` : ''}`), downloadLinks: downloads};
}

/** Press the name; "Add New Message", the text, an upload, "Save"; the window's file links; "Close". */
async function replyWithFile(page, app, panel, name, {message, file, label}) {
    await panel.reland();
    const win = await panel.openItem(name);
    const filesBefore = await fileLinks(win);
    await win.addNewMessage();
    await win.typeReply(message);
    const attach = await win.openAttachFiles();
    await attach.upload(fixturePath(app, file));
    await win.saveReply();
    await idle(page);
    const filesAfter = await fileLinks(win);
    record(`${label}-window`, await screen(page));
    await win.close();
    return {filesBefore, filesAfter};
}

/** The file links the item's window shows under its messages. */
async function fileLinks(win) {
    return (await win.root.locator('a[href*="download"]').allInnerTexts()).map((t) => flat(t, 120)).filter(Boolean);
}

/** Row menu › "Edit": `remove` presses the file's "Remove" under the message; `rename` changes the name; "Save". */
async function editItem(page, panel, name, {remove, rename, label}) {
    await panel.reland();
    const win = await panel.openEdit(name, 'Edit');
    const listed = remove ? await win.attachedFile(remove).count() : null;
    if (remove) {
        // the first message holds the one file, so its one "Remove"
        await win.removeButtons().first().click();
        await sleep(400);
    }
    if (rename) await win.nameField().fill(rename);
    record(`${label}-window`, await screen(page));
    const answer = await win.saveAndAnswer();
    const status = answer.status();
    await win.root.waitFor({state: 'hidden', timeout: 30_000}).catch(() => {});
    await idle(page);
    return {status, fileListedBeforeRemove: listed};
}

// ---------------------------------------------------------------------------------------------
// stable-3_5_0: the stage's "Production Discussions" grid. "Add discussion" with an upload is the
// U37 A8 walk's addQuery35; the grid, its row actions and the query window are the U37 A9 walk's.

/** dbarnes at Production; "Add discussion" with the file; the grid's rows, the row's actions, the query window. */
async function walk35(page, app, {subject, message, file}) {
    const P = require('../typed-participant-message-not-sent/lib.js');
    const Q = require('../participant-message-edit-adds-message/lib.js');
    const {addQuery35} = require('../author-discussion-with-file-edit-refused/lib.js');
    await P.openWorkflow(page, app, WORDS[app.name].id, MENU_KEY);
    record('r35-panel', await screen(page));
    const added = await addQuery35(page, app, {participantName: WORDS[app.name].participantName, subject, message, file});
    await P.openWorkflow(page, app, WORDS[app.name].id, MENU_KEY);
    const rows = await Q.gridRows(page);
    const {actions} = await Q.editQuery35(page, subject, null, 'r35-actions');
    record('r35-row-actions', await screen(page));
    await P.openWorkflow(page, app, WORDS[app.name].id, MENU_KEY);
    const notes = await Q.readQuery35(page, subject, 'r35-query');
    return {added, rows, rowActions: actions, notes};
}

module.exports = {sleep, flat, WORDS, PANEL, MENU_KEY, FIRST_FILE, REPLY_FILE, fixturePath, openPanel, addItem, readHistory, replyWithFile, fileLinks, editItem, walk35};
