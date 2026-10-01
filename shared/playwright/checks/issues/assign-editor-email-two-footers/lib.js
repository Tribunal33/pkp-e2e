// Helpers of the U35 A15 walk (issue report docs/issues/U35-A15-assign-editor-email-two-footers.md).
// Requiring this file runs nothing. The workflow helpers ("Participants", "Assign Participant", the
// predefined-message list, the discussions panel) are the U35 A3 walk's
// (../typed-participant-message-not-sent/lib.js); this file adds one "Assign" with a predefined message
// and the read of the mail it sends.
const {screen, record, idle} = require('../../../probe');
const P = require('../typed-participant-message-not-sent/lib.js');

const {sleep, flat} = P;

/**
 * Per-app dataset facts the steps use (docs/process/dataset.md). `letter` is the submission whose stage
 * holds the letter under test, `control` one in Review. A preprint server has one stage, Production.
 */
const WORDS = {
    ojs: {
        role: 'Section editor', person: 'Minoti Inoue', mail: 'minoue@mailinator.com',
        letter: {id: 4, stage: 'workflow_1', words: 'Computer Skill Requirements'},
        control: {id: 7, stage: null, words: 'Developing efficacy beliefs'},
    },
    omp: {
        role: 'Series editor', person: 'Minoti Inoue', mail: 'minoue@mailinator.com',
        letter: {id: 3, stage: 'workflow_1', words: 'The Political Economy of Workplace Injury'},
        control: {id: 15, stage: null, words: 'Expansive Discourses'},
    },
    ops: {
        role: 'Moderator', person: 'Minoti Inoue', mail: 'minoue@mailinator.com',
        letter: {id: 1, stage: 'workflow_5', words: 'The influence of lactation'},
        control: null,
    },
};

/** The predefined message's name: "Assign Editor", or "Editor Assigned" on a 3.5 preprint server. */
const TEMPLATE = /^(Assign Editor|Editor Assigned)$/;

/**
 * As the signed-in editor: "Assign", the role, "Search", the person, the predefined message, "OK".
 * Returns the list's entries, the "Message" text as filled, and what "OK" answered.
 */
async function assignWithLetter(page, app, w, s, name) {
    await P.openWorkflow(page, app, s.id, s.stage);
    const win = await P.openAssign(page);
    const listed = await P.chooseRoleAndPerson(page, win, w.role, w.person);
    if (!listed) return {listed};
    const options = await P.templateOptions(win);
    const label = options.find((o) => TEMPLATE.test(o));
    if (!label) return {listed, options, failed: 'no "Assign Editor" entry'};
    const chosen = await P.chooseTemplate(page, win, label);
    const message = await P.readMessage(page, win);
    record(`${name}-filled`, {...(await screen(page)), options, label, message});
    const pressed = await P.press(page, win, 'OK', /save-?participant/i, `${name}-pressed`);
    await P.openWorkflow(page, app, s.id, s.stage);
    const d = await P.discussions(page);
    return {
        listed, options, label, chosen: chosen.status,
        messageEnd: message ? message.replace(/\n{2,}/g, '\n').trim().split('\n').slice(-4) : message,
        status: pressed.status, windowOpen: pressed.windowOpen, notices: pressed.notices,
        participants: await P.participants(page), discussions: d && d.rows,
    };
}

/**
 * The messages to `to` that name `words` and arrived after `since` (the slot's mailbox is shared by every
 * install and keeps earlier walks' mail): sender, subject, and the text from "Kind regards" to the end.
 * Polls up to `ms`, loading the context's home page between reads (queued jobs run on web requests).
 */
async function letters(page, app, to, words, since, ms) {
    const end = Date.now() + ms;
    for (;;) {
        const r = await app.mail._search({to, contains: words}).catch(() => ({messages: []}));
        const fresh = (r.messages || []).filter((m) => new Date(m.Created).getTime() >= since);
        if (fresh.length || Date.now() > end) {
            const out = [];
            for (const m of fresh) {
                const full = await app.mail.fullMessage(m.ID).catch(() => null);
                const text = full ? String(full.Text || '') : '';
                const html = full ? String(full.HTML || '') : '';
                const at = text.lastIndexOf('Kind regards');
                out.push({
                    subject: m.Subject, from: m.From && `${m.From.Name} <${m.From.Address}>`,
                    dashes: (html.match(/—<br\s*\/?>/g) || []).length,
                    automated: /This is an automated message/.test(text),
                    end: flat(at >= 0 ? text.slice(at) : text.slice(-700), 900),
                    htmlEnd: html.slice(Math.max(0, html.lastIndexOf('Kind regards')), html.lastIndexOf('Kind regards') + 1200),
                });
            }
            return out;
        }
        await page.goto(app.url(`/index.php/${app.contextPath}`)).catch(() => {});
        await idle(page).catch(() => {});
        await sleep(1500);
    }
}

module.exports = {P, WORDS, TEMPLATE, sleep, flat, assignWithLetter, letters};
