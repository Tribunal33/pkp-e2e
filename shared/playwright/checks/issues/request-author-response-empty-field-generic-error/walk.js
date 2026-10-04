// Kept walk for docs/issues/U30-A5-request-author-response-empty-field-generic-error.md (spec U30, register A5).
// On PKP's default test dataset (a dataset fleet): dbarnes opens "Request Author Response" for a review round
// whose reviews are in (OJS submission 10 from "Request Response"; OMP submission 16 by the page's address,
// since a press shows no "Request Response"), clears "Subject" and presses "Submit Request", answers the
// dialog, types the subject back, clears "Message" and presses "Submit Request" again. Each press records the
// POST's status and body, the dialog, and every field message on the page; the author's mailbox is counted. Run:
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/issues/request-author-response-empty-field-generic-error/walk.js
// (a preprint server has no review stage and is skipped.)
// WALK_MODE=neighbour runs only the neighbour check for a fix trial: a round whose reviews are not in, by the
// page's address with the template untouched, must still be refused with its own dialog ("This review round
// has review assignments …"); then the ready round's request, sent as the template fills it, must still be
// accepted with the "Request for review response sent" dialog.
const {forEachApp, launch, signIn, record, note, serverLog} = require('../../../probe');
const K = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const SUBJECT = 'Request For Author Response To Reviewer Feedback';
const CASES = {
    ojs: {ready: 10, author: 'jnovak', fromButton: true, notReady: 12},
    omp: {ready: 16, author: 'mpower', fromButton: false, notReady: 2},
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    if (!c) return; // OPS: no review stage
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submission: c.ready};
    const step = async (key, fn) => {
        try {
            facts[key] = await fn();
        } catch (e) {
            facts[key] = {error: K.flat(e.message, 400)};
            note(`U30 A5 walk (${app.name}, ${MODE}): step ${key} failed: ${K.flat(e.message, 200)}`);
        }
        return facts[key];
    };
    const log = serverLog(app);
    const from = log.mark();
    const since = new Date();
    const host = new URL(app.baseURL).host;
    const mails = () => app.mail.count({to: `${c.author}@mailinator.com`, subject: SUBJECT, contains: host, since});
    const {page} = await launch(app);
    await signIn(page, 'dbarnes');

    if (MODE === 'neighbour') {
        await step('n1-not-ready', async () => {
            const round = await K.openWorkflowRound(page, app, c.notReady);
            await K.openRequestByAddress(page, app, c.notReady, round);
            const out = await K.submit(page, 'nb-n1-not-ready');
            return {round, ...out};
        });
        await step('n2-ready-full', async () => {
            const round = await K.openWorkflowRound(page, app, c.ready);
            if (c.fromButton) await K.openRequestFromButton(page);
            else await K.openRequestByAddress(page, app, c.ready, round);
            const out = await K.submit(page, 'nb-n2-ready-full');
            await K.sleep(3000);
            return {round, ...out, mails: await mails().catch((e) => `mail read failed: ${e.message}`)};
        });
        facts.serverLog = log.since(from);
        record('a5-neighbour', facts);
        return;
    }

    await step('s1-open', async () => {
        const round = await K.openWorkflowRound(page, app, c.ready);
        if (c.fromButton) await K.openRequestFromButton(page);
        else await K.openRequestByAddress(page, app, c.ready, round);
        return {round, ...(await K.readPage(page))};
    });
    await step('s3-subject-cleared', async () => {
        await K.clearSubject(page);
        return K.readPage(page);
    });
    await step('s4-submit-no-subject', () => K.submit(page, 's4-submit-no-subject'));
    await step('s5-after-ok', () => K.dismiss(page));
    await step('s6-subject-back-message-cleared', async () => {
        await K.typeSubject(page, SUBJECT);
        const afterSubject = await K.readPage(page);
        await K.clearMessage(page);
        return {afterSubject, afterMessage: await K.readPage(page)};
    });
    await step('s7-submit-no-message', () => K.submit(page, 's7-submit-no-message'));
    await step('s7-after-ok', () => K.dismiss(page));
    await K.sleep(3000);
    await step('mails', () => mails());
    facts.serverLog = log.since(from);
    record('a5-summary', facts);
});
