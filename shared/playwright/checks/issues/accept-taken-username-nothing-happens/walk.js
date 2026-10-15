// Kept walk of issue report docs/issues/U06-A13-accept-taken-username-nothing-happens.md (U06 A13).
// On PKP's default test dataset, as `rvaca`: Settings > Users & Roles > "Invite to a role" for two
// newcomers (ada.h15j and ben.h15j @mailinator.com, the app's offered role). Ben, signed out, walks
// his accept wizard to "Review & create account" with Username larkh15j; Ada, in another signed-out
// browser, takes the same username and accepts first; then Ben presses "Accept And Continue to …",
// presses it again, goes "Back" to the Username box, and (control) tries another username.
// Each press records the page (step, notices, field errors, dialogs, button) and the accept
// request's answer. With the fix in, the first press moves Ben to the username step with the error
// under the box: the script records that state instead of throwing.
//
// `neighbour` as argument walks only the paths the fix must leave alone: a third newcomer with a
// free username accepts (the new-role dialog), and a dataset author signed in as themselves accepts
// their invitation (the dialog). `reopen` walks the steps to step 9, then opens Ben's email link
// again in a new browser, types the password, ticks the consent and presses "Save and continue".
// No argument walks the steps alone.
//
// Reset first:  npm run fleet-prep -- --feature issues-h15j --dataset 2 --reset
// Run (main):   bin/app-lock.sh shared ojs -- env PROBE_FEATURE=issues-h15j PROBE_AGENT=h15j \
//                   node bin/probe.js ojs shared/playwright/checks/issues/accept-taken-username-nothing-happens/walk.js [neighbour]
//               (one app per lock call: ojs, omp, ops)
// 3.5:          PKP_E2E_LINE=stable-3_5_0 in front of both (feature issues-h15j-3_5), PROBE_RUN=r35
const {forEachApp, launch, signIn, screen, shot, record, idle, serverLog} = require('../../../probe');
const A4 = require('../newcomer-not-signed-in-after-accepting/lib.js');
const H = require('./lib.js');

const neighbour = process.argv.slice(2).includes('neighbour');
const reopen = process.argv.slice(2).includes('reopen');
const name = neighbour ? 'neighbour' : reopen ? 'reopen' : 'walk';

forEachApp(async (app) => {
    const role = A4.ROLE[app.name];
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, role};
    const log = serverLog(app);
    const from = log.mark();
    const manager = await launch(app);
    const open = [];
    const browser = async () => {
        const b = await launch(app);
        open.push(b);
        return b;
    };
    try {
        await signIn(manager.page, 'rvaca');
        const since = new Date();

        if (!neighbour) {
            // Steps 1-3: the two invitations.
            facts.inviteBen = await A4.invite(manager.page, app, {...H.BEN, role});
            facts.inviteAda = await A4.invite(manager.page, app, {...H.ADA, role});
            const benMail = await A4.acceptLink(app, H.BEN.email, since);
            const adaMail = await A4.acceptLink(app, H.ADA.email, since);
            facts.mails = {ben: benMail.subject, ada: adaMail.subject};
            record('01-manager-users', await screen(manager.page));

            // Steps 4-6: Ben reaches "Review & create account".
            const ben = (await browser()).page;
            facts.ben = {steps: await A4.openAccept(ben, benMail.accept)};
            facts.ben.steps.push(...(await H.toReview(ben, {username: H.SHARED_USERNAME, password: H.BEN.password})));
            facts.ben.review = await H.pageState(ben);
            record('02-ben-review', await screen(ben));

            // Steps 7-8: Ada takes the same username and accepts first.
            const ada = (await browser()).page;
            facts.ada = {steps: await A4.openAccept(ada, adaMail.accept)};
            facts.ada.steps.push(...(await H.toReview(ada, {username: H.SHARED_USERNAME, password: H.ADA.password})));
            facts.ada.accept = await H.pressAccept(ada);
            record('03-ada-accepted', await screen(ada));

            // Step 9: Ben accepts.
            facts.ben.accept1 = await H.pressAccept(ben);
            record('04-ben-after-accept', await screen(ben));
            await shot(ben, '04-ben-after-accept');

            if (reopen) {
                // The other way round: Ben leaves the page and opens his email's link again.
                const again = (await browser()).page;
                facts.ben.reopenSteps = await A4.openAccept(again, benMail.accept);
                facts.ben.reopened = await H.pageState(again);
                record('08-ben-reopened', await screen(again));
                // the page asks for the password and the consent again; the Username box keeps its name
                await again.getByLabel(/^Password/).fill(H.BEN.password);
                await again.getByRole('checkbox').first().check();
                await H.saveAndContinue(again).click();
                await again.waitForResponse((r) => /\/refine/.test(r.url()), {timeout: 30_000}).catch(() => null);
                await idle(again);
                await again.waitForTimeout(1500);
                facts.ben.reopenedSaved = await H.pageState(again);
                record('09-ben-reopened-saved', await screen(again));
                await shot(again, '09-ben-reopened-saved');
                facts.serverLog = log.since(from);
                record(name, facts);
                return;
            }

            // Step 10: again (only where the button is still there).
            facts.ben.accept2 = await H.pressAccept(ben);
            record('05-ben-after-second-press', await screen(ben));

            // Step 11: "Back" to the Username box.
            facts.ben.backPresses = await H.backToUsername(ben);
            facts.ben.atUsername = await H.pageState(ben);
            record('06-ben-username-step', await screen(ben));
            await shot(ben, '06-ben-username-step');

            // Control: another username, forward, accept.
            await guarded(facts.ben, 'recover', async () => {
                facts.ben.recoverSteps = await H.toReview(ben, {username: H.BEN_SECOND_USERNAME, password: H.BEN.password});
                facts.ben.recoverAccept = await H.pressAccept(ben);
                record('07-ben-recovered', await screen(ben));
            });
        } else {
            // A newcomer with a free username accepts.
            facts.inviteCy = await A4.invite(manager.page, app, {...H.CY, role});
            const ex = A4.EXISTING[app.name].signedIn;
            facts.inviteExisting = await A4.invite(manager.page, app, {email: A4.mailOf(ex), role});
            const cyMail = await A4.acceptLink(app, H.CY.email, since);
            const exMail = await A4.acceptLink(app, A4.mailOf(ex), since);

            const cy = (await browser()).page;
            facts.cy = {steps: await A4.openAccept(cy, cyMail.accept)};
            facts.cy.steps.push(...(await H.toReview(cy, {username: H.CY.username, password: H.CY.password})));
            facts.cy.accept = await H.pressAccept(cy);
            record('11-nb-newcomer-accepted', await screen(cy));

            // An existing user signed in as themselves accepts.
            const ep = (await browser()).page;
            await signIn(ep, ex, {contextPath: app.contextPath});
            await idle(ep);
            facts.existing = {user: ex, steps: await A4.openAccept(ep, exMail.accept)};
            facts.existing.accept = await H.pressAccept(ep);
            record('12-nb-existing-accepted', await screen(ep));
        }
        facts.serverLog = log.since(from);
        record(name, facts);
    } catch (error) {
        facts.error = String(error.stack || error).slice(0, 1500);
        facts.serverLog = log.since(from);
        record(name, facts);
        throw error;
    } finally {
        for (const b of open) await b.close().catch(() => {});
        await manager.close();
    }
});

async function guarded(into, key, fn) {
    try {
        await fn();
    } catch (error) {
        into[`${key}Error`] = String(error.message || error).slice(0, 600);
    }
}
