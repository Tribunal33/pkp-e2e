// U33 OPS2 (docs/issues/U33-OPS2-preprint-revert-decline-names-submission-stage.md): the report's
// Steps on PKP's default test dataset, OPS. As `dbarnes`, open submission 4, "Genetic transformation
// of forest trees" (declined at Production), select "Production", press "Revert Decline", read the
// "Notify Authors" page's templates, "Record Decision", read the closing window; then Settings ›
// Workflow › "Emails" › "Manage Emails" and the two decline emails.
//
// MODE=steps (default) takes the Steps. MODE=nb is the neighbour the fix must leave alone: "Decline
// Submission" on submission 1 (queued at Production), its template and closing window, and the
// "Submission Declined" email on "Manage Emails". Each mode runs alone on a freshly reset fleet.
//
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/preprint-revert-decline-names-submission-stage/walk.js
//   (PKP_E2E_LINE=stable-3_5_0 in front for 3.5; MODE=nb for the neighbour)
const {forEachApp, launch, signIn, screen, record, shot, serverLog, sql} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'steps';
const CASE = {
    steps: {id: 4, title: 'Genetic transformation of forest trees', decision: 'Revert Decline', email: 'Reinstate Submission Declined Without Review', author: 'ddiouf@mailinator.com'},
    nb: {id: 1, title: 'The influence of lactation on the quantity and quality of cashmere production', decision: 'Decline Submission', email: 'Submission Declined', author: 'ccorino@mailinator.com'},
}[MODE];

forEachApp(async (app) => {
    const out = {mode: MODE, line: app.line, case: CASE};
    const log = serverLog(app);
    const from = log.mark();
    const status = () => sql(app, `select status, stage_id from submissions where submission_id = ${CASE.id}`);
    out.storedBefore = status();
    const {page, close} = await launch(app);
    try {
        // 1. Sign in as dbarnes.
        await signIn(page, 'dbarnes');
        // 2. Open the submission; the workflow lands where it lands.
        await L.openWorkflow(page, app, CASE.id);
        out.landing = await L.workflowHead(page);
        record(`${MODE}-1-landing`, await screen(page));
        // 3. Select "Production" in the workflow's menu.
        out.production = await L.workflowMenu(page, 'Production');
        record(`${MODE}-2-production`, await screen(page));
        await shot(page, `${MODE}-2-production`);
        // 4. Press the decision; read the "Notify Authors" page and its templates.
        out.pressed = await L.pressDecision(page, CASE.decision);
        if (!out.pressed.onWizard) {
            out.blocked = 'the decision did not open its pages';
        } else {
            out.wizard = await L.wizardPage(page);
            out.templates = await L.templateButtons(page);
            const s = await screen(page);
            out.wizardText = L.flat(s.text && s.text.main, 1500);
            // The "Notify Authors" step's description: the paragraph under its heading.
            const m = (s.text && s.text.main || '').match(/\nNotify Authors\n+([^\n]+)/);
            out.notifyDescription = m ? m[1].trim() : null;
            record(`${MODE}-3-wizard`, s);
            await shot(page, `${MODE}-3-wizard`);
            // 5. "Record Decision"; 6. read the closing window.
            const since = new Date();
            const w = await L.throughWizard(page);
            out.requests = w.requests;
            out.closing = w.done;
            // The email the author receives.
            const mail = await app.mail.find({to: CASE.author, since, timeoutMs: 20_000}).catch(() => null);
            const full = mail ? await app.mail.fullMessage(mail.ID).catch(() => null) : null;
            out.authorEmail = mail ? {subject: mail.Subject, text: L.flat(full && full.Text, 900)} : null;
            record(`${MODE}-4-closing`, await screen(page));
            await shot(page, `${MODE}-4-closing`);
            // The workflow after: the bubble and the buttons on "Production".
            await L.openWorkflow(page, app, CASE.id);
            out.afterHead = await L.workflowHead(page);
            out.afterProduction = await L.workflowMenu(page, 'Production');
        }
        out.storedAfter = status();
        // 7. Settings › Workflow › "Emails" › "Manage Emails": the decline emails, and the one this decision sends.
        out.emails = await L.declineRows(app, page);
        record(`${MODE}-5-manage-emails`, await screen(page));
        out.mailable = await L.mailableWindow(page, CASE.email);
        record(`${MODE}-6-mailable`, await screen(page));
        await shot(page, `${MODE}-6-mailable`);
    } catch (e) {
        out.error = L.flat(e.stack, 800);
        await shot(page, `${MODE}-error`).catch(() => {});
    } finally {
        out.serverErrors = log.since(from);
        record(`${MODE}-facts`, out);
        console.log(JSON.stringify({app: app.name, ...out, wizard: undefined, wizardText: undefined}, null, 1).slice(0, 6000));
        await close();
    }
});
