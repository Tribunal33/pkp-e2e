// Kept walk of issue report docs/issues/U06-A7-omp-ops-invitation-journal-wording.md (U06 A7).
// On PKP's default test dataset, as `rvaca`: Settings > Users & Roles, "Current Users", David
// Buskins' "…" > "Edit"; his current role's masthead select set to the other value; the
// "Confirm masthead visibility change" dialog, "Cancel". Then "Invite to a role" for
// dbuskins@mailinator.com (Reader, today, "Does not appear on the masthead"), sent; in a signed-out
// browser the email's decline link, "Confirm Decline Invitation"; then the email's accept link:
// the "Invitation Unavailable" page. OJS is the control (a journal).
//
// `neighbour` as argument walks only the neighbour instead: the same "Edit" page's own texts (the
// page description, the masthead column, the select's values) and what "Cancel" on the dialog
// does (the select back to its value, no masthead request sent).
//
// Reset first:  npm run fleet-prep -- --feature issues-u06h --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u06h PROBE_AGENT=u06h node bin/probe.js all shared/playwright/checks/issues/omp-ops-invitation-journal-wording/walk.js [neighbour]
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-u06h-3_5), PROBE_RUN=r35
const {forEachApp, launch, screen, record, serverLog, signIn} = require('../../../probe');
const H = require('../invitation-wizard-typos/lib.js');

// Every record's name starts with 'wording-', so the A7 walks run by one agent keep apart.
const P = 'wording-';
const neighbour = process.argv.slice(2).includes('neighbour');

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: neighbour ? 'neighbour' : 'walk'};
    const log = serverLog(app);
    const from = log.mark();
    const manager = await launch(app);
    try {
        const page = manager.page;
        await signIn(page, 'rvaca');
        await H.editUser(page, app, H.PERSON);
        facts.pageDescription = H.flat(await page.locator('main p').first().innerText().catch(() => null), 300);
        const m = await H.mastheadChange(page);
        record(P + '01-masthead-dialog', m.screen);
        delete m.screen;
        facts.masthead = m;
        if (!neighbour) {
            const since = new Date();
            facts.sent = await H.sendInvitation(page, app, {email: H.PERSON.email, role: 'Reader', masthead: 'Does not appear on the masthead'});
            const mail = await H.invitationMail(app, H.PERSON.email, since);
            const r = await launch(app);
            try {
                facts.decline = await H.decline(r.page, mail.decline);
                await r.page.goto(mail.accept);
                await r.page.locator('main h1, h1').first().waitFor({timeout: H.T}).catch(() => {});
                const shown = await screen(r.page);
                record(P + '02-unavailable', shown);
                facts.unavailable = {title: shown.title, text: H.flat(shown.text.main, 600)};
            } finally {
                await r.close();
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
        await manager.close();
    }
});
