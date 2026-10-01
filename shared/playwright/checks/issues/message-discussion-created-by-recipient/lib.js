// Helpers of walk.js and neighbour.js here (issue report
// docs/issues/U35-A5-message-discussion-created-by-recipient.md). Requiring this file runs nothing.
// The workflow helpers ("Participants", "Notify", "Assign", the discussions panel, the mailbox poll)
// are the U35 A3 walk's (../typed-participant-message-not-sent/lib.js), the "Tasks" window the
// U35 A16 walk's (../notify-message-ignores-email-opt-out/lib.js); this file adds the per-app
// dataset facts and the read of one discussion's window.
const {screen, record, idle} = require('../../../probe');
const P = require('../typed-participant-message-not-sent/lib.js');
const {tasks} = require('../notify-message-ignores-email-opt-out/lib.js');

const {sleep, flat} = P;

/** Per app, on PKP's default test dataset (docs/process/dataset.md). */
const WORDS = {
    ojs: {
        notify: {id: 5, stage: 'workflow_5', person: 'Diaga Diouf', username: 'ddiouf', template: 'Discussion (Production)'},
        assign: {id: 3, stage: 'workflow_4', role: 'Copyeditor', person: 'Sarah Vogt', username: 'svogt', template: 'Request Copyedit'},
    },
    omp: {
        notify: {id: 4, stage: 'workflow_5', person: 'Bart Beaty', username: 'bbeaty', template: 'Discussion (Production)'},
        assign: {id: 7, stage: 'workflow_4', role: 'Copyeditor', person: 'Sarah Vogt', username: 'svogt', template: 'Request Copyedit'},
    },
    ops: {
        notify: {id: 1, stage: 'workflow_5', person: 'Carlo Corino', username: 'ccorino', template: 'Discussion (Production)'},
        assign: null, // a preprint server has no Copyediting stage
    },
};

/**
 * The rows of the stage's discussions panel, as text: those that name `title`, or every row when
 * `title` is null (3.5 names a message's discussion after the email's subject, not the list's entry).
 */
async function rowsNamed(page, title) {
    const d = await P.discussions(page);
    return {heading: d && d.heading, rows: ((d && d.rows) || []).filter((r) => !title || r.includes(title))};
}

/**
 * Press the last discussion named `title` in the stage's panel and read its window; the page is
 * landed afresh after. `main` only: null where the panel has no such name (3.5's list is read by its
 * "From" column instead).
 */
async function readDiscussion(page, title, name) {
    const link = page.locator('span[id^="discussion_name_"]').filter({hasText: title});
    if (!(await link.count())) return null;
    await link.last().click();
    await idle(page);
    await sleep(1500);
    const s = await screen(page);
    record(name, s);
    const text = flat(s.text.dialog, 900);
    await page.goto(page.url());
    await idle(page);
    return text;
}

module.exports = {P, WORDS, sleep, flat, tasks, rowsNamed, readDiscussion};
