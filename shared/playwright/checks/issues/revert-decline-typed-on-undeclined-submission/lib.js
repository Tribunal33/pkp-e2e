// Helpers of walk.js (U34 A6: "Revert Decline" typed by address on a submission that was never declined;
// docs/issues/U34-A6-revert-decline-typed-on-undeclined-submission.md). Requiring this file runs nothing.
// Reused: the workflow opener, decision press and wizard walker of ../internal-round-revised-files-not-carried/lib.js,
// the author's "Tasks" read of ../internal-revisions-request-gives-author-no-task/lib.js and the
// "Activity Log" read of ../activity-log-names-participant-not-editor/lib.js.
const {idle, sql, screen} = require('../../../probe');
const R = require('../internal-round-revised-files-not-carried/lib.js');
const H = require('../internal-revisions-request-gives-author-no-task/lib.js');
const LOG = require('../activity-log-names-participant-not-editor/lib.js');

const {flat} = R;

/** Open the decision wizard's address as typed; returns the landing page's address, title, first heading and text. */
async function typed(page, app, id, decision, roundId = null) {
    const path = `/index.php/${app.contextPath}/decision/record/${Number(id)}?decision=${decision}${roundId ? `&reviewRoundId=${roundId}` : ''}`;
    const resp = await page.goto(app.url(path));
    await idle(page);
    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30_000}).catch(() => {});
    const s = await screen(page);
    return {
        typed: path,
        status: resp ? resp.status() : null,
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        title: await page.title(),
        h1: flat(await page.locator('h1').first().innerText().catch(() => null), 160),
        text: flat(s.text && s.text.main, 600),
        screen: s,
    };
}

/** Walk the open wizard to "Record Decision" (pressing it) and return its pages, the decision request and the closing panel. */
async function recordTyped(page) {
    const w = await R.throughWizard(page);
    return {pages: w.pages.map((p) => ({h1: p.h1, steps: p.stepHeads})), requests: w.requests || null, done: w.done};
}

/** As the signed-in editor: the workflow's status box and decisions (on `menuKey` when given), and the Activity Log lines. */
async function editorReads(page, app, id, {menuKey = null, log = true, label = null} = {}) {
    await R.openWorkflow(page, app, id, {menuKey});
    const state = await R.roundState(page);
    const out = {status: state.status, buttons: state.buttons};
    if (log) {
        const h = await LOG.history(page, label).catch((e) => ({error: flat(e.message, 200)}));
        out.log = (h.lines || []).slice(0, 4).map((l) => `${l.user} | ${l.event}`);
        if (h.error) out.log = h.error;
    }
    return out;
}

/** From the open workflow (on the round's page), press "Accept Submission" and return the wizard's address and its round id. */
async function roundFromAccept(page) {
    const pressed = await R.pressDecision(page, 'Accept Submission');
    const url = page.url().replace(/^https?:\/\/[^/]+/, '');
    const m = url.match(/reviewRoundId=(\d+)/);
    return {pressed: {onWizard: pressed.onWizard, absent: pressed.absent || false}, url, roundId: m ? Number(m[1]) : null};
}

/** The newest message to `to` since `since` with its subject and first lines (null when none arrived). */
async function mailTo(app, to, since, timeoutMs = 15_000) {
    const m = await app.mail.find({to, since, timeoutMs}).catch(() => null);
    if (!m) return null;
    const full = await app.mail.fullMessage(m.ID).catch(() => null);
    return {subject: m.Subject, count: await app.mail.count({to, since}).catch(() => null), text: flat(full && full.Text, 400)};
}

/** The author's "Tasks" panel and the submission's round from "My Submissions". */
const authorTasks = (page, app, id) => H.authorSees(page, app, id);

/** Evidence beside the screens, never a step: the submission's status and stage, its decisions, its rounds and the author's tasks. */
function stored(app, id) {
    const one = (q) => sql(app, q);
    return {
        submission: one(`select status, stage_id from submissions where submission_id = ${Number(id)}`),
        decisions: one(`select decision, stage_id, coalesce(round, 0) from edit_decisions where submission_id = ${Number(id)} order by edit_decision_id`).split('\n').filter(Boolean),
        rounds: one(`select review_round_id, stage_id, round, status from review_rounds where submission_id = ${Number(id)} order by 1`).split('\n').filter(Boolean),
        authorTasks: one(`select n.type, u.username from notifications n join users u on u.user_id = n.user_id where n.assoc_type = 1048585 and n.assoc_id = ${Number(id)} and n.level = 3 order by 1, 2`).split('\n').filter(Boolean),
        publications: one(`select publication_id, status from publications where submission_id = ${Number(id)} order by 1`).split('\n').filter(Boolean),
    };
}

module.exports = {flat, typed, recordTyped, editorReads, roundFromAccept, mailTo, authorTasks, stored, openWorkflow: R.openWorkflow, roundState: R.roundState, pressDecision: R.pressDecision, throughWizard: R.throughWizard, uploadRevision: R.uploadRevision};
