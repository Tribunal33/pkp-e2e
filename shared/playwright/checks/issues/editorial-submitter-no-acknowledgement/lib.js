// Helpers of the U21 A7 / OPS5 walks (issue reports
// docs/issues/U21-A7-OPS5-editorial-submitter-no-acknowledgement.md and
// docs/issues/U21-A7-completion-screen-claims-unsent-confirmation.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {signIn, signOut, screen, idle} = require('../../../probe');
const A8 = require('../section-editors-not-assigned-second-journal/lib.js');

const {T, sleep, flat} = A8;

/** Per-app dataset facts the steps use. */
const WORDS = {
    ojs: {author: 'ccorino', section: 'Articles', series: null},
    omp: {author: 'aclark', section: null, series: 'Library & Information Studies'},
    ops: {author: 'ccorino', section: 'Preprints', series: null},
};

/**
 * Sign in as `user`, "New Submission" with `title`, complete every step and "Submit".
 * Returns {id, problems, complete}: the Review step's problems (empty when it submitted)
 * and the "Submission complete" screen's text.
 */
async function submitAs(page, app, user, title) {
    const w = WORDS[app.name];
    await signIn(page, user);
    const id = await A8.beginSubmission(page, app, app.contextPath, {title, section: w.section});
    const problems = await A8.completeSubmission(page, app, app.contextPath, id, {series: w.series});
    const s = await screen(page);
    const complete = problems ? null : flat(s.text && s.text.main, 1200);
    await signOut(page);
    return {id, problems, complete, screen: s};
}

/** As `rvaca`: Settings › Workflow › "Emails", "Submission Confirmation" set to the radio labelled `label`, "Save". */
async function setConfirmation(page, app, label) {
    const {WorkflowEmailsSettingsPage} = require('../../../pages/EmailsPages.js');
    await signIn(page, 'rvaca');
    const p = new WorkflowEmailsSettingsPage(page, `${app.contextPath}${A8.L(app)}`);
    await p.goto();
    await p.field('submissionAcknowledgement').getByRole('radio', {name: label, exact: true}).check();
    await p.save();
    const labels = await p.radioLabels('submissionAcknowledgement');
    await signOut(page);
    return {labels};
}

/**
 * Messages to `to` whose subject or body holds `marker`: [{subject, to, start}] (start: the body's first 200 characters). Polls until one
 * arrives or `ms` passes, loading the context's home page between reads (the dataset runs queued jobs
 * on web requests, so a queued message goes out on the next page load).
 */
async function waitMail(page, app, to, marker, ms) {
    const end = Date.now() + ms;
    for (;;) {
        const r = await app.mail._search({to, contains: marker}).catch(() => ({messages: []}));
        const found = (r.messages || []).map((m) => ({subject: m.Subject, to: (m.To || []).map((x) => x.Address).join(','), start: flat(m.Snippet, 400)}));
        if (found.length || Date.now() > end) return found;
        await page.goto(app.url(`/index.php/${app.contextPath}`)).catch(() => {});
        await idle(page).catch(() => {});
        await sleep(1500);
    }
}

/**
 * As the signed-in editor: open the submission's workflow, press "Activity Log", and return
 * the log's rows that record an email ("An email has been sent: …"), flattened.
 */
async function activityLogEmails(page, app, id) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const wf = new WorkflowPage(page, `${app.contextPath}${A8.L(app)}`);
    await wf.gotoEditorial(id);
    const dialog = await wf.openActivityLog();
    await idle(page).catch(() => {});
    const rows = await dialog.getByRole('row').allInnerTexts();
    await wf.closeActivityLog().catch(() => {});
    return rows.map((r) => flat(r, 300)).filter((r) => /email/i.test(r));
}

/**
 * The acknowledgements among messages, as "<subject>" or "<subject> (can post)" for OPS's
 * variant, which the dataset seeds under the same subject and tells apart by its body.
 */
const ACK = /^Thank you for your submission to/;
const acks = (msgs) => msgs.filter((m) => ACK.test(m.subject)).map((m) => ({...m, subject: /As a trusted author|no moderation is required/.test(m.start || '') ? `${m.subject} (can post)` : m.subject}));

/** The completion screen's email sentence, or null when it makes no such claim. */
const emailClaim = (text) => {
    const m = /[^.]*\bemailed a confirmation[^.]*\./.exec((text || '').replace(/^Submission complete\s*/, ''));
    return m ? m[0].trim() : null;
};

module.exports = {T, sleep, flat, WORDS, submitAs, setConfirmation, waitMail, acks, emailClaim, activityLogEmails, L: A8.L};
