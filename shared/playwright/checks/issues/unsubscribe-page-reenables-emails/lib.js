// Helpers of walk.js here (spec U05, register A2: the "Unsubscribe" page switches back on emails
// switched off on the profile). Requiring this file runs nothing. The profile tab, the "Unsubscribe"
// page and the mailbox helpers are U27 A12's (../review-change-email-unsubscribe-omits-type/lib.js);
// the discussion is U53 A15's addDiscussion (main's "Tasks & Discussions" panel, 3.5's grid).
const {idle, record, screen, shot} = require('../../../probe');
const U = require('../review-change-email-unsubscribe-omits-type/lib.js');
const D = require('../merge-fails-for-discussion-opener/lib.js');

/**
 * Per app, on PKP's default test dataset (docs/process/dataset.md): an author whose profile already
 * has emails switched off (they registered without asking for news), and a submission of theirs.
 * `off` names the "Do not send me an email…" boxes the dataset holds ticked for them.
 */
const CASES = {
    ojs: {author: 'ckwantes', authorName: 'Catherine Kwantes', where: {id: 3, menuKey: 'workflow_4', panelTitle: 'Copyediting Tasks & Discussions'},
        off: ['emailNotificationPublishedIssue', 'emailNotificationOpenAccess', 'emailNotificationNewAnnouncement']},
    omp: {author: 'dkennepohl', authorName: 'Dietmar Kennepohl', where: {id: 7, menuKey: 'workflow_4', panelTitle: 'Copyediting Tasks & Discussions'},
        off: ['emailNotificationNewAnnouncement']},
    ops: {author: 'ccorino', authorName: 'Carlo Corino', where: {id: 1, menuKey: 'workflow_5', panelTitle: 'Production Tasks & Discussions'},
        off: ['emailNotificationNewAnnouncement']},
};
const KEEP = 'emailNotificationNewQuery'; // "Discussion added."

/** The profile tab's "Do not send me an email…" boxes: {name: {row, checked}}. */
async function emailBoxes(page, app, label) {
    const tab = await U.notificationsTab(page, app, label);
    const out = {};
    for (const r of tab.rows) if (/^email/.test(r.name)) out[r.name] = {row: r.row, checked: r.checked};
    return out;
}

/** On the open "Unsubscribe" page: untick every box but those named in `keep`; the boxes after. */
async function untickAllBut(page, keep, label) {
    const form = page.locator('form#unsubscribeNotificationForm');
    const boxes = form.locator('input[type=checkbox]');
    const n = await boxes.count();
    for (let i = 0; i < n; i++) {
        const b = boxes.nth(i);
        const name = await b.getAttribute('name');
        await b.setChecked(keep.includes(name));
    }
    await idle(page);
    const after = await boxes.evaluateAll((els) => els.map((b) => ({name: b.name, checked: b.checked})));
    if (label) {
        record(label, {...(await screen(page)), boxes: after});
        await shot(page, label).catch(() => {});
    }
    return after;
}

/** The newest email to `to` since `since` carrying an "unsubscribe" link (polled up to `ms`). */
async function unsubscribeMail(app, to, since, ms = 40_000) {
    const deadline = Date.now() + ms;
    for (;;) {
        const all = await U.mailsTo(app, to, since);
        const hit = all.filter((m) => m.unsubscribe);
        if (hit.length || Date.now() > deadline) return {mail: hit[hit.length - 1] || null, subjects: all.map((m) => m.subject)};
        await U.sleep(1000);
    }
}

module.exports = {CASES, KEEP, emailBoxes, untickAllBut, unsubscribeMail, U, D};
