// U35 OJS1 walk (issue report docs/issues/U35-OJS1-assigned-email-names-send-to-review.md).
// On PKP's default test dataset, a journal (the finding) and a press (the control):
//   1  rvaca opens "Editor Assigned (Auto)" under Settings › Workflow › Emails and reads its body
//   2  the dataset's author (ccorino, OMP aclark) submits to the section (series) that assigns editors
//   3  the assigned editor's mailbox (dbarnes, OMP dbuskins): "You have been assigned as an editor …"
//   4  that editor opens the email's link and reads the Submission stage's buttons
// The verdict per app: each button name the email's sentence quotes, and whether a button reads so.
// Neighbour of the fix: the press's email and buttons (the fix touches the journal's text only), and
// `others`, a digest of every other default email text of the install, the same with and without it.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/assigned-email-names-send-to-review/walk.js
//   (3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 and the line's feature in front.)
const {forEachApp, launch, signIn, signOut, screen, record, tag, sql} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const w = H.WORDS[app.name];
    if (!w) return; // a preprint server's "Moderator Assigned (Auto)" names no button
    const run = tag('u35r15');
    const facts = {app: app.name, line: app.line || 'main', run};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        const tpl = await H.templateBody(page, app).catch((e) => ({error: e.message.split('\n')[0]}));
        record('01-template', await screen(page));
        facts.template = {subject: tpl.subject, error: tpl.error, ...H.namedButtons(tpl.body)};
        await signOut(page);

        const title = `${run} submission`;
        const sub = await H.submitAs(page, app, w.author, title);
        record('02-submitted', sub.screen);
        facts.submission = {id: sub.id, title, problems: sub.problems};

        const mail = await H.readMail(page, app, `${w.editor}@mailinator.com`, title, 45_000);
        facts.mail = {subject: mail.subject, found: mail.found, ...H.namedButtons(mail.text)};
        const link = (mail.links || []).find((l) => /workflow|dashboard/.test(l));
        facts.link = link;

        if (link) {
            await signIn(page, w.editor);
            facts.buttons = await H.openLinkAndReadButtons(page, link);
            record('04-workflow', await screen(page));
            await signOut(page);
        }
        const decisions = (facts.buttons || []).filter((b) => /review|decline|accept/i.test(b));
        facts.observed = {
            templateSays: facts.template.names, emailSubject: facts.mail.subject, emailSentence: facts.mail.sentence, emailSays: facts.mail.names,
            stageButtons: decisions,
            emailNamesAButton: Object.fromEntries((facts.mail.names || []).filter((n) => /Send/.test(n)).map((n) => [n, (facts.buttons || []).includes(n)])),
        };
        try {
            facts.others = sql(app, "select md5(string_agg(email_key || locale || subject || body, '|' order by email_key, locale)) from email_templates_default_data where not (email_key = 'EDITOR_ASSIGN' and locale = 'en')");
        } catch (e) {
            facts.others = String(e.message).split('\n')[0];
        }
    } finally {
        record('facts', facts);
        console.log(JSON.stringify({observed: facts.observed || facts, others: facts.others}, null, 1));
        await close();
    }
});
