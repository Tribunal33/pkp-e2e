// Kept walk for docs/issues/U27-A13-email-reviewer-sends-empty-body.md (spec U27, register A13).
// On PKP's default test dataset (a dataset fleet), journal and press: dbarnes opens a reviewer's
// "More Actions" › "Email Reviewer", presses "Send Email" with Subject and Body empty, then with a
// Subject alone; then "Cancel", the window again and the same Subject alone; and the reviewer's
// mailbox is read. Run:
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=u27a node bin/probe.js ojs,omp \
//     shared/playwright/checks/issues/email-reviewer-sends-empty-body/walk.js
// (`all` works too: a preprint server has no review and is skipped.)
// WALK_MODE=neighbour runs only the neighbour check for a fix trial: Subject and Body both filled
// still send the email, with the typed body.
const {forEachApp, launch, signIn, screen, record, note} = require('../../../probe');
const K = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const SUBJECT = 'u27a: a question about your review';
const BODY = 'u27a: could you tell me when you expect to send your review?';

forEachApp(async (app) => {
    const c = K.CASES[app.name];
    if (!c) return; // a preprint server has no review
    const who = c.reviewer;
    const to = `${who.user}@mailinator.com`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submission: c.id, reviewer: who.user};
    const step = async (key, fn) => {
        try {
            facts[key] = await fn();
        } catch (e) {
            facts[key] = {error: K.flat(e.message, 400)};
            note(`U27 A13 walk (${app.name}, ${MODE}): step ${key} failed: ${K.flat(e.message, 200)}`);
        }
        return facts[key];
    };
    const {page} = await launch(app);
    await signIn(page, 'dbarnes');
    const modal = await K.openWorkflow(page, app, c.id);
    const since = new Date();

    if (MODE === 'neighbour') {
        await step('n1-open', () => K.openEmailReviewer(page, modal, who.name));
        await step('n2-fill', async () => {
            await K.fill(page, {subject: SUBJECT, body: BODY});
            return K.readForm(page);
        });
        await step('n3-send', () => K.send(page));
        record('a13-neighbour-sent', await screen(page));
        await K.sleep(2000);
        await step('n4-mails', () => K.mailsTo(app, to, since));
        record('a13-neighbour', facts);
        return;
    }

    await step('s3-open', () => K.openEmailReviewer(page, modal, who.name));
    record('a13-s3-window', await screen(page));
    await step('s4-send-empty', () => K.send(page));
    record('a13-s4-both-empty', await screen(page));
    await step('s5-fill-subject', async () => {
        await K.fill(page, {subject: SUBJECT});
        return K.readForm(page);
    });
    await step('s5-send-subject-only', () => K.send(page));
    record('a13-s5-subject-only', await screen(page));
    // step 6: the window's "Cancel", "Email Reviewer" again, the same Subject alone, "Send Email"
    await step('s6-cancel', () => K.cancel(page));
    await step('s6-reopen', () => K.openEmailReviewer(page, modal, who.name));
    await step('s6-fill-subject', async () => {
        await K.fill(page, {subject: SUBJECT});
        return K.readForm(page);
    });
    await step('s6-send-again', () => K.send(page));
    record('a13-s6-sent-again', await screen(page));
    await K.sleep(2000);
    await step('s7-mails', () => K.mailsTo(app, to, since));
    record('a13-walk', facts);
});
