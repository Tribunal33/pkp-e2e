// Helpers of the U35 A6 walk (issue report docs/issues/U35-A6-assign-editor-message-gives-no-task.md).
// Requiring this file runs nothing. The workflow helpers ("Participants", "Assign Participant", "Notify",
// the predefined-message list) are the U35 A3 walk's (../typed-participant-message-not-sent/lib.js), the
// "Tasks" window's read the U35 A16 walk's (../notify-message-ignores-email-opt-out/lib.js) and the mailbox
// read the U35 A15 walk's (../assign-editor-email-two-footers/lib.js); this file adds one "Assign" or
// "Notify" with a predefined message and the read of the recipient's "Tasks" rows for one submission.
const {screen, record} = require('../../../probe');
const P = require('../typed-participant-message-not-sent/lib.js');
const T = require('../notify-message-ignores-email-opt-out/lib.js');
const M = require('../assign-editor-email-two-footers/lib.js');

const {sleep, flat} = P;

/**
 * Per-app dataset facts the steps use (docs/process/dataset.md). `main` is the submission the editor is
 * assigned to with "Assign Editor", `control` a "Request Copyedit" to a new Copyeditor (a journal and a
 * press only), `neighbour` a "Notify" to an assigned editor with the stage's plain discussion message.
 */
const WORDS = {
    ojs: {
        main: {id: 4, stage: 'workflow_1', role: 'Section editor', person: 'Minoti Inoue', user: 'minoue', template: /^Assign Editor$/, words: 'Computer Skill Requirements'},
        control: {id: 3, stage: null, role: 'Copyeditor', person: 'Sarah Vogt', user: 'svogt', template: /^Request Copyedit$/, words: 'The Facets Of Job Satisfaction'},
        neighbour: {id: 8, stage: 'workflow_1', person: 'David Buskins', user: 'dbuskins', template: /^Discussion \(Submission\)$/, mailWords: 'Please enter your message', words: 'Traditions and Trends'},
    },
    omp: {
        main: {id: 3, stage: 'workflow_1', role: 'Series editor', person: 'Minoti Inoue', user: 'minoue', template: /^Assign Editor$/, words: 'The Political Economy of Workplace Injury'},
        control: {id: 7, stage: null, role: 'Copyeditor', person: 'Sarah Vogt', user: 'svogt', template: /^Request Copyedit$/, words: 'Accessible Elements'},
        neighbour: {id: 9, stage: 'workflow_1', person: 'David Buskins', user: 'dbuskins', template: /^Discussion \(Submission\)$/, mailWords: 'Please enter your message', words: 'Enabling Openness'},
    },
    ops: {
        // "Editor Assigned" is the message's name on a 3.5 preprint server.
        main: {id: 1, stage: 'workflow_5', role: 'Moderator', person: 'Minoti Inoue', user: 'minoue', template: /^(Assign Editor|Editor Assigned)$/, words: 'The influence of lactation'},
        control: null,
        neighbour: {id: 1, stage: 'workflow_5', person: 'David Buskins', user: 'dbuskins', template: /^Discussion \(Production\)$/, mailWords: 'Please enter your message', words: 'The influence of lactation'},
    },
};

// The task's sentence; on 3.5 the discussion row quotes the letter's subject, "You have been assigned as an editor on a submission to …".
const ASSIGNED = /^You have been assigned as an editor to the submission/;

/**
 * As the signed-in editor, on submission `s`: "Assign", the role, "Search", the person (or, with no
 * `s.role`, the person's row › "Notify"), the predefined message, a typed line `typed` when "Message"
 * stays empty, then "OK" ("Notify"). Returns what the window offered, held and answered.
 */
async function send(page, app, s, typed, name) {
    await P.openWorkflow(page, app, s.id, s.stage);
    let win;
    const out = {};
    if (s.role) {
        win = await P.openAssign(page);
        out.listed = await P.chooseRoleAndPerson(page, win, s.role, s.person);
        if (!out.listed) return out;
    } else {
        win = await P.openNotify(page, s.person);
    }
    out.options = await P.templateOptions(win);
    out.label = out.options.find((o) => s.template.test(o));
    if (!out.label) return {...out, failed: 'the predefined message is not listed'};
    out.chosen = (await P.chooseTemplate(page, win, out.label)).status;
    const filled = await P.readMessage(page, win);
    out.filled = flat(filled, 160);
    if (!flat(filled)) {
        await P.typeMessage(page, win, typed);
        out.typed = typed;
    }
    record(`${name}-filled`, {...(await screen(page)), ...out});
    const pressed = s.role
        ? await P.press(page, win, 'OK', /save-?participant/i, `${name}-pressed`)
        : await P.press(page, win, 'Notify', /send-?notification/i, `${name}-pressed`);
    await P.openWorkflow(page, app, s.id, s.stage);
    const d = await P.discussions(page);
    return {...out, status: pressed.status, windowOpen: pressed.windowOpen, notices: pressed.notices, participants: await P.participants(page), discussions: d && d.rows};
}

/** As the signed-in recipient: the "Tasks" window's rows that name the submission, and whether one is the "assigned as an editor" task. */
async function tasksFor(page, app, s, name) {
    const t = await T.tasks(page, app, name);
    const rows = t.rows.filter((r) => r.includes(s.words));
    return {bell: t.bellText, all: t.rows.length, rows: rows.map((r) => flat(r, 260)), assignedTask: rows.filter((r) => ASSIGNED.test(r)).length};
}

/** How many emails `to` got since `since` that hold `words`, with their subjects (polls up to 20 s). */
async function mails(page, app, to, words, since) {
    const found = await M.letters(page, app, to, words, since, 20000);
    return {count: found.length, subjects: found.map((m) => m.subject)};
}

module.exports = {P, WORDS, ASSIGNED, sleep, flat, send, tasksFor, mails};
