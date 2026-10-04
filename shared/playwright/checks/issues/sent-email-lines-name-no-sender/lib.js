// Helpers of the U38 A1 walk (issue report docs/issues/U38-A1-sent-email-lines-name-no-sender.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses on PKP's default
// test dataset: the "Participants" panel's "Notify" and "Assign" (the U35 A3, A14 and A16 walks'
// helpers), the stage's "Tasks & Discussions" panel (main, the shared page objects) or its
// discussions grid (stable-3_5_0, the U05 A1 walk's addQuery35), and the "Activity Log" window
// with its "View Email" (the shared ActivityLogPages page objects).
const {idle, screen, shot, record, sql} = require('../../../probe');
const P = require('../typed-participant-message-not-sent/lib.js');
const N = require('../notify-message-ignores-email-opt-out/lib.js');

const {sleep, flat} = P;

/** Per app (docs/process/dataset.md): the submission, its stage, the "Notify" template, the role "Assign" offers. */
const WORDS = {
    ojs: {id: 4, stage: 'workflow_1', stageName: 'Submission', panel: 'Desk Review Tasks & Discussions', template: 'Discussion (Submission)', role: 'Section editor', assignTemplate: 'Assign Editor'},
    omp: {id: 9, stage: 'workflow_1', stageName: 'Submission', panel: 'Desk Review Tasks & Discussions', template: 'Discussion (Submission)', role: 'Series editor', assignTemplate: 'Assign Editor'},
    // a preprint server installed on main has no "Assign Editor" text (U35 OPS2): its other predefined message
    ops: {id: 1, stage: 'workflow_5', stageName: 'Production', panel: 'Production Tasks & Discussions', template: 'Discussion (Production)', role: 'Moderator', assignTemplate: 'Discussion (Production)'},
};
const NOTIFY_PERSON = 'David Buskins';
const NOTIFY_USERNAME = 'dbuskins';
const ASSIGN_PERSON = 'Minoti Inoue';

/** The submission's email log as stored: id|sender's username|from|to|subject (evidence beside the screen). */
function storedEmails(app, id, afterLogId = 0) {
    return sql(app, `select e.log_id, coalesce(u.username, ''), e.from_address, e.recipients, e.subject from email_log e left join users u on u.user_id = e.sender_id where e.assoc_type = 1048585 and e.assoc_id = ${Number(id)} and e.log_id > ${Number(afterLogId)} order by e.log_id`)
        .split('\n').filter(Boolean)
        .map((row) => { const [logId, sender, from, to, subject] = row.split('|'); return {logId: Number(logId), sender, from, to, subject}; });
}

function lastEmailLogId(app) {
    return Number(sql(app, 'select coalesce(max(log_id), 0) from email_log')) || 0;
}

/** Step 3: "Participants" › David Buskins › "More Actions" › "Notify", the template, a message, "Notify". */
function notify(page, app, text, name) {
    return N.notify(page, app, WORDS[app.name], NOTIFY_PERSON, text, name);
}

/**
 * Step 4: "Participants" › "Assign": the role, "Search", Minoti Inoue, the predefined message chosen
 * (without one "Message" stays empty and nothing is sent), "OK".
 */
async function assign(page, app, label) {
    const w = WORDS[app.name];
    await P.openWorkflow(page, app, w.id, w.stage);
    const win = await P.openAssign(page);
    const listed = await P.chooseRoleAndPerson(page, win, w.role, ASSIGN_PERSON);
    if (!listed) return {listed};
    const options = await P.templateOptions(win);
    const chosen = await P.chooseTemplate(page, win, w.assignTemplate);
    const message = flat(await P.readMessage(page, win), 160);
    const pressed = await P.press(page, win, 'OK', /save-participant/, label);
    return {listed, options, chosen: chosen.status, message, status: pressed.status, windowOpen: pressed.windowOpen, notices: pressed.notices};
}

/** Step 5 on main: "Desk Review Tasks & Discussions" (OPS "Production Tasks & Discussions") › "Add": the name, David Buskins ticked, the message, "Save". */
async function addDiscussion(page, app, {title, message, label}) {
    const w = WORDS[app.name];
    if (app.line === 'stable-3_5_0') {
        const D = require('../discussion-activity-choice-governs-nothing/lib.js');
        await P.openWorkflow(page, app, w.id, w.stage);
        return D.addQuery35(page, {participantNames: [NOTIFY_PERSON], subject: title, message});
    }
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: w.panel});
    await panel.gotoEditorial(w.id, w.stage);
    await idle(page);
    const win = await panel.openAdd();
    await win.nameField().fill(title);
    await win.tick(NOTIFY_USERNAME);
    await win.typeMessage(message);
    record(`${label}-window`, await screen(page));
    const answer = await win.saveAndAnswer();
    await win.root.waitFor({state: 'hidden', timeout: 30_000}).catch(() => {});
    await idle(page);
    return {status: answer.status()};
}

/** The neighbour on main: David Buskins presses the discussion's name, "Add New Message", a reply, "Save". */
async function reply(page, app, {title, message, label}) {
    const w = WORDS[app.name];
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: w.panel});
    await panel.gotoEditorial(w.id, w.stage);
    const win = await panel.openItem(title);
    await win.addNewMessage();
    await win.typeReply(message);
    await win.saveReply();
    record(`${label}-window`, await screen(page));
    await win.close();
    return {saved: true};
}

/**
 * Step 6: open the workflow (`id`/`stage`, default WORDS), press "Activity Log", read "History" (every line {date, user, event}),
 * then for each event in `views` press the line's arrow and "View Email" and read its lines; "Close".
 */
async function readLog(page, app, {views = [], label, id, stage}) {
    const w = WORDS[app.name] || {};
    const {ActivityLogWindow} = require('../../../pages/ActivityLogPages.js');
    // `id` and `stage` default to the A1 submission; `stage: null` opens the submission's current stage
    await P.openWorkflow(page, app, id || w.id, stage === undefined ? w.stage : stage);
    const fetched = page.waitForResponse((r) => r.url().includes('submission-event-log-grid/fetch-grid'), {timeout: 30_000});
    await P.wf(page).getByRole('button', {name: /Activity Log/}).first().click();
    await fetched;
    const log = new ActivityLogWindow(page, null);
    await log.expectOpen();
    await idle(page);
    const lines = await log.historyLines();
    record(`${label}-history`, await screen(page));
    await shot(page, `${label}-history`).catch(() => {});
    const viewed = {};
    for (const event of views) {
        try {
            const strip = await log.openStrip(event);
            const email = await log.viewEmail(strip);
            viewed[event] = (await email.lines()).filter((l) => /^(From|To|CC|BCC|Subject):/.test(l));
            record(`${label}-view-email-${Object.keys(viewed).length}`, await screen(page));
            await email.close();
            await sleep(600);
        } catch (e) {
            viewed[event] = {failed: flat(e.message, 300)};
        }
    }
    await log.close().catch(() => {});
    return {lines: lines.map(({date, user, event}) => ({date, user, event})), viewed};
}

module.exports = {WORDS, NOTIFY_PERSON, ASSIGN_PERSON, sleep, flat, storedEmails, lastEmailLogId, notify, assign, addDiscussion, reply, readLog};
