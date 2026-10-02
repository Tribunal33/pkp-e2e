// Kept walk of issue report docs/issues/U06-A7-invitation-wizard-typos.md (U06 A7).
// On PKP's default test dataset, as `rvaca`: Settings > Users & Roles > "Invite to a role"; step 1's
// description; search dbuskins@mailinator.com ("Search User"); "Cancel" and its dialog, "Go Back";
// on "Enter details" a new role (Author, today, "Does not appear on the masthead"), "Save And
// Continue"; step 3's description. Nothing is sent.
//
// `neighbour` as argument walks only the neighbour instead: the same steps' other application texts
// (step 2's search answer and description, the masthead column, the page's description), which
// the fix must leave as they are.
//
// Reset first:  npm run fleet-prep -- --feature issues-u06h --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u06h PROBE_AGENT=u06h node bin/probe.js all shared/playwright/checks/issues/invitation-wizard-typos/walk.js [neighbour]
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-u06h-3_5), PROBE_RUN=r35
const {forEachApp, launch, signIn, screen, record, serverLog} = require('../../../probe');
const H = require('./lib.js');

// Every record's name starts with 'typos-', so the A7 walks run by one agent keep apart.
const P = 'typos-';
const neighbour = process.argv.slice(2).includes('neighbour');

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: neighbour ? 'neighbour' : 'walk'};
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        await H.usersAndRoles(page, app);
        await H.openInviteWizard(page);
        record(P + '01-search-step', await screen(page));
        facts.pageDescription = H.flat(await page.locator('main p').first().innerText().catch(() => null), 300);
        facts.step1 = await H.stepIntro(page);
        await H.searchUser(page, H.PERSON.email);
        const s2 = await screen(page);
        record(P + '02-details-step', s2);
        facts.step2 = await H.stepIntro(page);
        facts.searchAnswer = (s2.text.main || '').split('\n').map((l) => l.trim()).find((l) => /already exists|does not have a role/.test(l)) || null;
        facts.mastheadColumn = H.flat(await page.locator('thead th').nth(3).innerText().catch(() => null), 60);
        if (!neighbour) {
            facts.cancelDialog = await H.pressCancel(page);
            record(P + '03-cancel-dialog', await screen(page));
            await page.getByRole('dialog').getByRole('button', {name: 'Go Back'}).click().catch(() => {});
            await page.getByRole('dialog').waitFor({state: 'detached', timeout: 10_000}).catch(() => {});
            await H.fillNewRole(page, {role: 'Author', masthead: 'Does not appear on the masthead'});
            facts.step3 = await H.toCompose(page);
            record(P + '04-compose-step', await screen(page));
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
