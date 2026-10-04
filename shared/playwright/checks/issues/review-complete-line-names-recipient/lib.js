// Helpers of the U38 A5 walk (issue report docs/issues/U38-A5-review-complete-line-names-recipient.md).
// Requiring this file runs nothing. The reviewer's steps (open the review, accept, step 3, type,
// "Submit Review") are the U28 A4 walk's (../emptied-review-text-kept-after-save/lib.js); OMP's
// "Assign" is the U35 A14 walk's; the "Activity Log" read with "View Email" is the U38 A1 walk's.
const {sql} = require('../../../probe');
const R = require('../emptied-review-text-kept-after-save/lib.js');
const A14 = require('../activity-log-names-participant-not-editor/lib.js');
const A1 = require('../sent-email-lines-name-no-sender/lib.js');
const P = require('../typed-participant-message-not-sent/lib.js');

/** Per app (docs/process/dataset.md): the submission in review, the reviewer, the neighbour reviewer, the editor OMP lacks. */
const CASES = {
    ojs: {id: 12, reviewer: 'jjanssen', reviewerName: 'Julie Janssen', nb: 'phudson', nbName: 'Paul Hudson', recommendation: 'Accept Submission', assign: null},
    omp: {id: 17, reviewer: 'jjanssen', reviewerName: 'Julie Janssen', nb: 'phudson', nbName: 'Paul Hudson', recommendation: null,
        assign: {role: 'Series editor', person: 'David Buskins'}},
};

/** OMP's precondition: `dbarnes` opens the submission (its current stage) and assigns David Buskins with "Assign". */
async function assignEditor(page, app, label) {
    const c = CASES[app.name];
    await P.openWorkflow(page, app, c.id);
    return A14.assign(page, {...c.assign, label});
}

/** Steps 2–3: open the review, "Accept Review, Continue to Step #2", "Continue to Step #3". */
function acceptReview(page, app, id) {
    return R.openStep3(page, app, id, {accept: true});
}

/** Step 4: the comment typed, (journal) the recommendation, "Submit Review", "OK". */
async function submitReview(page, app, {text, recommendation}) {
    await R.typeBoxes(page, app, {author: text});
    return R.submitReview(page, app, recommendation);
}

/** Steps 5–6: "History" of the submission at its current stage, with "View Email" on the given lines. */
function readLog(page, app, id, views, label) {
    return A1.readLog(page, app, {id, stage: null, views, label});
}

/** The stored "Review complete" entries (event type 0x4000000C): sender's username|from|to|subject. */
function storedReviewComplete(app, id) {
    return sql(app, `select coalesce(u.username, ''), e.from_address, e.recipients, e.subject from email_log e left join users u on u.user_id = e.sender_id where e.assoc_type = 1048585 and e.assoc_id = ${Number(id)} and e.event_type = 1073741836 order by e.log_id`)
        .split('\n').filter(Boolean).map((row) => { const [sender, from, to, subject] = row.split('|'); return {sender, from, to, subject}; });
}

module.exports = {CASES, flat: A1.flat, storedEmails: A1.storedEmails, lastEmailLogId: A1.lastEmailLogId, assignEditor, acceptReview, submitReview, readLog, storedReviewComplete};
