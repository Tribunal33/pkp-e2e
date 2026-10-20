// U05 OPS3 email read (issue report docs/issues/U05-OPS3-ops-task-link-workflow-stage-not-specified.md).
// Run right after walk.js on the same fleet, without a reset: it reads the "needs an editor" email
// the walk's submission sent to dbarnes (subject "A new submission needs an editor to be assigned:
// "{title}""), and dbarnes opens the email's title link. The report's control: the email's link
// opens the workflow where the task's does not. It takes no step of its own beyond opening the link.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/ops-task-link-workflow-stage-not-specified/email.js
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main'};
    const to = String(await sql(app, "select email from users where username = 'dbarnes'")).trim();
    facts.to = to;
    const summary = await app.fleetMail.find({to, subject: 'needs an editor', contains: 'needs a moderator'});
    const full = await app.fleetMail.fullMessage(summary.ID);
    facts.subject = full.Subject;
    facts.link = app.fleetMail.extractLink(full.HTML || '', /needs a moderator/);
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const res = facts.link ? await page.goto(facts.link) : null;
        await idle(page).catch(() => {});
        await H.sleep(1500);
        await idle(page).catch(() => {});
        const s = await screen(page);
        record('email-landed', s);
        facts.landing = {status: res && res.status(), url: page.url(), title: await page.title(),
            dialog: H.flat(s.text && s.text.dialog, 300), main: H.flat(s.text && s.text.main, 300)};
        await signOut(page);
    } finally {
        record('email', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
