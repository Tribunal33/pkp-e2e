// Issue report docs/issues/U60-A4-site-save-stores-empty-contact-email.md (U60 A4): the report's
// Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"). The kit builds nothing.
//
// Default mode, the Steps (OJS, OMP, OPS):
// Precondition through the screens: a second journal ("u60c Journal", path `u60c`) from
// Administration › Hosted Journals › "Create Journal", since a one-journal site's Site Settings
// shows neither "Settings" nor "Information" (U60 Rule 2).
//   1. Sign in as `admin`.
//   2. Administration › Site Settings › "Site Setup" › "Information": the contact boxes.
//   3. (Control) Clear "Email of principal contact", "Save".
//   4. Reload; from the page's console, the site's save with "Site Name", "Name of principal
//      contact" and "Email of principal contact" empty (lib.js consoleSave).
//   5. Reload; "Settings" and "Information".
//   6. Sign out; the journal's Login › "Forgot your password?", dbarnes@mailinator.com, "Reset Password".
// `neighbour` as the argument (the fix in and out), from the console unless said:
//   N1 only "Email of principal contact", a new address: stored.
//   N2 "Site Name" in English, French left empty: stored.
//   N3 "Information" through the page, a new contact name, "Save": saved.
//   N4 "Settings" through the page, "Save": saved.
// Each step records the state it finds rather than throwing, so the same script reads the fix.
//
// Reset first:  npm run fleet-prep -- --feature issues-u60c --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u60c PROBE_AGENT=u60c node bin/probe.js all shared/playwright/checks/issues/site-save-stores-empty-contact-email/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u60c-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u60c-3_5 PROBE_AGENT=u60c node bin/probe.js all shared/playwright/checks/issues/site-save-stores-empty-contact-email/walk.js
// Facts: .reports/<feature>/u60c/facts[-neighbour][-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, serverLog} = require('../../../probe');
const {flat, attempt, openSiteTab, readTab, pressSave, consoleSave, stored, requestReset} = require('./lib');
const {createContext} = require('../all-dates-error-nothing-published/lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : 'steps';
const RESET_TO = 'dbarnes@mailinator.com';

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const facts = {mode: MODE, line: app.line, dataset: app.dataset};
    const log = serverLog(app);
    const from = log.mark();
    try {
        // 1
        await signIn(page, 'admin');
        facts.start = stored(app);
        // precondition: the second journal
        facts.secondContext = await attempt(() =>
            createContext(page, app, {name: 'u60c Journal', initials: 'U60C', path: 'u60c', email: 'u60c@mailinator.com'})
        );
        if (MODE === 'steps') {
            // 2
            facts.info = await attempt(async () => (await openSiteTab(page, app, 'info')) && readTab(page, 'info'));
            record('info-before', await screen(page));
            // 3 (control)
            facts.control = await attempt(async () => {
                const box = page.locator('#info input[name^="contactEmail"]').first();
                await box.fill('');
                return pressSave(page, 'info');
            });
            facts.storedAfterControl = stored(app);
            record('control-refused', await screen(page));
            // 4
            facts.consoleSave = await attempt(async () => {
                await openSiteTab(page, app, 'info');
                return consoleSave(page, {title: {en: ''}, contactName: {en: ''}, contactEmail: {en: ''}});
            });
            facts.storedAfterConsole = stored(app);
            // 5
            facts.settingsAfter = await attempt(async () => (await openSiteTab(page, app, 'settings')) && readTab(page, 'settings'));
            record('settings-after', await screen(page));
            facts.infoAfter = await attempt(async () => (await openSiteTab(page, app, 'info')) && readTab(page, 'info'));
            record('info-after', await screen(page));
            await shot(page, 'info-after');
            // 6
            await signOut(page).catch(() => {});
            const since = new Date();
            const resetFrom = log.mark();
            facts.reset = await attempt(() => requestReset(page, app, RESET_TO));
            facts.resetServerLog = log.since(resetFrom);
            record('reset-answer', await screen(page));
            await shot(page, 'reset-answer');
            facts.resetMail = await app.mail
                .find({to: RESET_TO, since, timeoutMs: 10_000})
                .then((m) => ({subject: m.Subject, from: m.From, to: m.To}), (e) => ({none: flat(e.message, 200)}));
        } else {
            // N1
            facts.n1 = await attempt(async () => {
                await openSiteTab(page, app, 'info');
                return consoleSave(page, {contactEmail: {en: 'u60c@example.org'}});
            });
            facts.n1stored = stored(app);
            // N2
            facts.n2 = await attempt(() => consoleSave(page, {title: {en: 'u60c site', fr_CA: ''}}));
            facts.n2stored = stored(app);
            // N3
            facts.n3 = await attempt(async () => {
                await openSiteTab(page, app, 'info');
                await page.locator('#info input[name^="contactName"]').first().fill('u60c contact');
                return pressSave(page, 'info');
            });
            facts.n3stored = stored(app);
            // N4
            facts.n4 = await attempt(async () => {
                await openSiteTab(page, app, 'settings');
                return pressSave(page, 'settings');
            });
            facts.n4stored = stored(app);
            record('nb-settings-saved', await screen(page));
        }
    } catch (e) {
        facts.error = flat(e.stack || e.message, 800);
        record(`threw-${MODE}`, await screen(page).catch(() => null));
    } finally {
        facts.serverLog = log.since(from);
        record(MODE === 'steps' ? 'facts' : `facts-${MODE}`, facts);
        await close();
    }
});
