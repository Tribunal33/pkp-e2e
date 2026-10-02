// Kept walk of issue report docs/issues/U06-A7-invitation-email-role-article.md (U06 A7).
// On PKP's default test dataset: as `rvaca`, Settings > Users & Roles > "Invite to a role" for
// dbuskins@mailinator.com, a new role "Author" (today, "Does not appear on the masthead"), sent;
// the invitation email's masthead sentences. On OJS also: as `dbarnes`, submission 1's "Activity
// Log", its lines about participants (the dataset holds one for Alan Mwandenga as Author).
//
// `neighbour` as argument walks only the neighbour instead: as `dbarnes`, every line of the "Activity
// Log" of submission 1 (OJS, OPS) and of submissions 1 and 4 (OMP, whose lines name a Copyeditor
// and a Layout Editor), so the other events' lines and the participant lines of roles that start
// with a consonant can be compared with the fix in and out.
//
// Reset first:  npm run fleet-prep -- --feature issues-u06h --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u06h PROBE_AGENT=u06h node bin/probe.js all shared/playwright/checks/issues/invitation-email-role-article/walk.js [neighbour]
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-u06h-3_5), PROBE_RUN=r35
const {forEachApp, launch, signIn, screen, record, serverLog} = require('../../../probe');
const H = require('../invitation-wizard-typos/lib.js');
const L = require('../activity-log-names-participant-not-editor/lib.js');

// Every record's name starts with 'article-', so the A7 walks run by one agent keep apart.
const P = 'article-';
const neighbour = process.argv.slice(2).includes('neighbour');
const LOG_SUBMISSIONS = {ojs: [1], omp: [1, 4], ops: [1]};

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: neighbour ? 'neighbour' : 'walk'};
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    try {
        if (!neighbour) {
            await signIn(page, 'rvaca');
            const since = new Date();
            facts.sent = await H.sendInvitation(page, app, {email: H.PERSON.email, role: 'Author', masthead: 'Does not appear on the masthead'});
            const mail = await H.invitationMail(app, H.PERSON.email, since);
            facts.subject = mail.subject;
            facts.mastheadLines = H.mastheadLines(mail.text);
            facts.mailText = mail.text.replace(/\?id=\d+&key=\S+/g, '?id=…&key=…');
        }
        const ids = neighbour ? LOG_SUBMISSIONS[app.name] : app.name === 'ojs' ? [1] : [];
        if (ids.length) {
            await signIn(page, 'dbarnes');
            facts.logs = {};
            for (const id of ids) {
                await H.openWorkflow(page, app, id);
                const h = await L.history(page, `${neighbour ? 'nb' : '02'}-activity-log-${id}`);
                facts.logs[id] = neighbour ? h.lines.map((l) => l.event) : h.lines.map((l) => l.event).filter((e) => /this submission as/.test(e));
            }
        }
        facts.serverLog = log.since(from);
        record(P + (neighbour ? 'neighbour' : 'walk'), facts);
    } catch (error) {
        facts.error = String(error.stack || error).slice(0, 1500);
        facts.serverLog = log.since(from);
        record(P + (neighbour ? 'neighbour' : 'walk'), facts);
        throw error;
    } finally {
        await close();
    }
});
