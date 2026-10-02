// Kept walk of issue report docs/issues/U06-A4-newcomer-not-signed-in-after-accepting.md (U06 A4).
// On PKP's default test dataset, as `rvaca`: Settings > Users & Roles > "Invite to a role" for a
// newcomer (nova.u06a@mailinator.com, the app's offered role); in a second, signed-out browser the
// email's accept link: "Create … account" (novau06a), "Enter details" (Canada), "Accept And
// Continue to …", "View All Submissions": where the browser lands and whether it is signed in; then
// signing in with the new account.
//
// `neighbour` as argument walks only the existing-user paths instead: a dataset author invited the
// same way opens the link signed out, accepts and presses "View All Submissions"; a second author
// signs in first, then opens their link and does the same. No argument walks both.
//
// Reset first:  npm run fleet-prep -- --feature issues-u06a --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u06a PROBE_AGENT=u06a node bin/probe.js all shared/playwright/checks/issues/newcomer-not-signed-in-after-accepting/walk.js [newcomer|neighbour]
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-u06a-3_5), PROBE_RUN=r35
const {forEachApp, launch, signIn, screen, shot, record, idle, serverLog} = require('../../../probe');
const H = require('./lib.js');

const args = process.argv.slice(2);
const doNewcomer = !args.includes('neighbour');
const doNeighbour = !args.includes('newcomer');
const name = doNewcomer && doNeighbour ? 'walk' : doNewcomer ? 'newcomer' : 'neighbour';

forEachApp(async (app) => {
    const role = H.ROLE[app.name];
    const ex = H.EXISTING[app.name];
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, role};
    const log = serverLog(app);
    const from = log.mark();
    const manager = await launch(app);
    try {
        // The manager sends the invitations the walk needs.
        await signIn(manager.page, 'rvaca');
        const since = new Date();
        const sent = {};
        if (doNewcomer) {
            facts.inviteNewcomer = await H.invite(manager.page, app, {
                email: H.NEWCOMER.email,
                givenName: H.NEWCOMER.givenName,
                familyName: H.NEWCOMER.familyName,
                role,
            });
            sent.newcomer = await H.acceptLink(app, H.NEWCOMER.email, since);
        }
        if (doNeighbour) {
            for (const k of ['signedOut', 'signedIn']) {
                facts[`invite_${k}`] = await H.invite(manager.page, app, {email: H.mailOf(ex[k]), role});
                sent[k] = await H.acceptLink(app, H.mailOf(ex[k]), since);
            }
        }
        record('01-manager-users', await screen(manager.page));
        facts.mails = sent;

        if (doNewcomer) {
            const r = await launch(app);
            try {
                const n = {};
                n.steps = await H.openAccept(r.page, sent.newcomer.accept);
                n.before = await H.where(r.page);
                n.steps.push(...(await H.newcomerSteps(r.page)));
                record('02-newcomer-review', await screen(r.page));
                Object.assign(n, await H.acceptAndLeave(r.page));
                record('03-newcomer-landed', await screen(r.page));
                await shot(r.page, '03-newcomer-landed');
                // the sign-in screen's own way on: the new credentials
                if (n.landed.loginForm) {
                    await signIn(r.page, H.NEWCOMER.username, {contextPath: app.contextPath});
                    await idle(r.page);
                    n.afterSignIn = await H.where(r.page);
                    record('04-newcomer-signed-in', await screen(r.page));
                }
                facts.newcomer = n;
            } finally {
                await r.close();
            }
        }

        if (doNeighbour) {
            // an existing user who opens the link signed out
            let r = await launch(app);
            try {
                const o = {user: ex.signedOut};
                o.steps = await H.openAccept(r.page, sent.signedOut.accept);
                o.before = await H.where(r.page);
                Object.assign(o, await H.acceptAndLeave(r.page));
                record('05-existing-signed-out-landed', await screen(r.page));
                await shot(r.page, '05-existing-signed-out-landed');
                facts.existingSignedOut = o;
            } finally {
                await r.close();
            }
            // an existing user signed in as themselves (control)
            r = await launch(app);
            try {
                const i = {user: ex.signedIn};
                await signIn(r.page, ex.signedIn, {contextPath: app.contextPath});
                await idle(r.page);
                i.steps = await H.openAccept(r.page, sent.signedIn.accept);
                Object.assign(i, await H.acceptAndLeave(r.page));
                record('06-existing-signed-in-landed', await screen(r.page));
                facts.existingSignedIn = i;
            } finally {
                await r.close();
            }
        }
        facts.serverLog = log.since(from);
        record(name, facts);
    } catch (error) {
        facts.error = String(error.stack || error).slice(0, 1500);
        facts.serverLog = log.since(from);
        record(name, facts);
        throw error;
    } finally {
        await manager.close();
    }
});
