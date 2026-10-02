// Kept walk of issue report docs/issues/U06-A7-invitation-steps-raw-labels.md (U06 A7).
// On PKP's default test dataset, as `rvaca`: Settings > Users & Roles > "Invite to a role"; the
// list of steps' accessible name. Then an invitation for dbuskins@mailinator.com (Author, today,
// "Does not appear on the masthead"), sent; in a signed-out browser the email's accept link: the
// list of steps' accessible name and the text of its "show steps" button.
//
// `neighbour` as argument walks only the neighbour instead: as `dbarnes`, an editorial decision
// page ("Decline Submission" on OJS 4, OMP 3, OPS 1), the same component given the decision's own
// texts: its list's name and its "show steps" button, which the fix must leave alone.
//
// Reset first:  npm run fleet-prep -- --feature issues-u06h --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u06h PROBE_AGENT=u06h node bin/probe.js all shared/playwright/checks/issues/invitation-steps-raw-labels/walk.js [neighbour]
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-u06h-3_5), PROBE_RUN=r35
const {forEachApp, launch, signIn, screen, record, serverLog, rawKeys} = require('../../../probe');
const H = require('../invitation-wizard-typos/lib.js');

// Every record's name starts with 'labels-', so the A7 walks run by one agent keep apart.
const P = 'labels-';
const neighbour = process.argv.slice(2).includes('neighbour');

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: neighbour ? 'neighbour' : 'walk'};
    const log = serverLog(app);
    const from = log.mark();
    const manager = await launch(app);
    try {
        const page = manager.page;
        if (neighbour) {
            await signIn(page, 'dbarnes');
            await H.openWorkflow(page, app, H.DECISION[app.name].submissionId);
            await H.openDecision(page, 'Decline Submission');
            record(P + 'nb-decision', await screen(page));
            facts.decision = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), steps: await H.stepsFacts(page), accessibleName: await H.listAccessibleName(page)};
        } else {
            await signIn(page, 'rvaca');
            await H.usersAndRoles(page, app);
            await H.openInviteWizard(page);
            record(P + '01-send-wizard', await screen(page));
            facts.send = {steps: await H.stepsFacts(page), accessibleName: await H.listAccessibleName(page), rawKeys: await rawKeys(page, {scope: 'main'})};
            const since = new Date();
            facts.sent = await H.sendInvitation(page, app, {email: H.PERSON.email, role: 'Author', masthead: 'Does not appear on the masthead'});
            const mail = await H.invitationMail(app, H.PERSON.email, since);
            const r = await launch(app);
            try {
                await H.openAccept(r.page, mail.accept);
                record(P + '02-accept-page', await screen(r.page));
                facts.accept = {steps: await H.stepsFacts(r.page), accessibleName: await H.listAccessibleName(r.page), rawKeys: await rawKeys(r.page, {scope: 'main'})};
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
