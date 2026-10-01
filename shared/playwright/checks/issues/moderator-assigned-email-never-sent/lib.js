// Helpers of walk.js (issue report docs/issues/U35-OPS3-moderator-assigned-email-never-sent.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle} = require('../../../probe');
const A8 = require('../section-editors-not-assigned-second-journal/lib.js');
const A7 = require('../editorial-submitter-no-acknowledgement/lib.js');

const {T, sleep, flat, L} = A8;

/** Per-app screen words and the dataset's users the steps name. */
const WORDS = {
    ojs: {email: 'Editor Assigned (Auto)', author: 'ccorino', subject: /^You have been assigned as an editor on a submission to/},
    omp: {email: 'Editor Assigned (Auto)', author: 'aclark', subject: /^You have been assigned as an editor on a submission to/},
    ops: {email: 'Moderator Assigned (Auto)', author: 'ccorino', subject: /^You have been assigned as a moderator on a submission to/},
};

/**
 * As the signed-in manager: Settings › Workflow › Emails › "Add and edit templates", search the
 * email by name, press its "Edit". Returns {listed, kind, subject} and leaves the window open.
 */
async function openAutoEmail(page, app) {
    const {ManageEmailsPage} = require('../../../pages/EmailsPages.js');
    const name = WORDS[app.name].email;
    const p = new ManageEmailsPage(page, `${app.contextPath}${L(app)}`);
    await p.goto();
    await p.search(name);
    await idle(page).catch(() => {});
    const listed = (await p.rowNames().catch(() => [])).map((s) => flat(s, 120));
    const {kind, window} = await p.openEmail(name, {search: false});
    const subject = kind === 'one' ? await p.subjectBox('en').inputValue().catch(() => null) : null;
    return {name, listed, kind, subject, window: flat(await window.innerText().catch(() => null), 600)};
}

/** The "assigned" emails to each username that hold `marker`: {username: [subject, …]}. */
async function assignedMail(app, usernames, marker) {
    const out = {};
    for (const u of usernames) {
        const r = await app.mail._search({to: `${u}@mailinator.com`, contains: marker}).catch(() => ({messages: []}));
        out[u] = (r.messages || []).map((m) => m.Subject);
    }
    return out;
}

/** As the signed-in manager: the submission's "Participants" text and its Activity Log's email rows. */
async function readSubmission(page, app, id) {
    const text = await A8.openWorkflow(page, app, app.contextPath, id);
    const participants = A8.participantsPart(text);
    const log = (await A7.activityLogEmails(page, app, id).catch((e) => [`(log not read: ${e.message.split('\n')[0]})`]))
        .map((r) => flat(r.replace(/\$\(function.*$/s, ''), 220));
    return {participants: flat(participants, 400), log};
}

module.exports = {T, sleep, flat, L, WORDS, openAutoEmail, assignedMail, readSubmission, submitAs: A7.submitAs, waitMail: A7.waitMail};
