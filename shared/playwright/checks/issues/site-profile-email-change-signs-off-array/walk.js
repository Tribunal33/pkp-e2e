// U03 A10 walk (issue report docs/issues/U03-A10-site-profile-email-change-signs-off-array.md).
// On PKP's default test dataset: the Site Administrator creates a second journal (press,
// server) on screen and gives dbarnes a Reader role there, so dbarnes holds roles in two and
// the site-level Profile page stays at the site. There dbarnes asks for a new email address
// on "Contact", and the script reads how the "Confirm account contact email change request"
// message to dbarnes's current address ends.
// Modes (the argument after the script; each runs alone, from a freshly reset dataset):
//   walk       (default) the steps above; Expected "Kind regards," + the site's principal
//              contact (Administration › Site Settings › "Information"), Observed "Array"
//   neighbour  the same request from dbarnes's Profile page in `publicknowledge`: the
//              message must keep closing with the journal's contact, "Ramiro Vaca"
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/site-profile-email-change-signs-off-array/walk.js [walk|neighbour]
const {forEachApp, launch, signIn, signOut, screen, record, serverLog, sql} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.argv[2] || 'walk';
const NEW_EMAIL = 'dbarnes.u03rg@mailinator.com';
const OLD_EMAIL = 'dbarnes@mailinator.com';

/** Run a step, recording its error instead of throwing, so the state a fix brings is read too. */
async function step(facts, name, fn) {
    try {
        facts.steps[name] = await fn();
    } catch (e) {
        facts.steps[name] = {error: String(e && e.message ? e.message : e).split('\n')[0]};
    }
    return facts.steps[name];
}

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, dataset: app.dataset, steps: {}};
    // What the dataset says the two contacts are (read only, for Expected).
    try {
        facts.siteContactName = sql(app, "select locale || '=' || setting_value from site_settings where setting_name = 'contactName'");
    } catch (e) {
        facts.siteContactName = String(e);
    }
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    try {
        let contextPath = app.contextPath;
        if (MODE === 'walk') {
            contextPath = null;
            // 1-2. admin creates the second context and gives dbarnes a role there
            await signIn(page, 'admin');
            await step(facts, 'create', () => H.createSecondContext(page, app));
            record('01-second-context', await screen(page));
            await signOut(page);
        } else if (MODE !== 'neighbour') {
            throw new Error(`unknown mode ${MODE}`);
        }
        // 3. dbarnes opens the Profile page (site-level in walk, the journal's in neighbour)
        await signIn(page, 'dbarnes');
        let profile = null;
        await step(facts, 'profile', async () => {
            const o = await H.openProfile(page, app, contextPath);
            profile = o.profile;
            return {status: o.status, landed: o.landed};
        });
        record('02-profile', await screen(page));
        if (profile) {
            // 4. "Contact" › "Email" › "Save"
            const since = new Date();
            await step(facts, 'request', () => H.requestEmailChange(page, profile, NEW_EMAIL));
            record('03-contact-saved', await screen(page));
            // 5. the message to the current address
            await step(facts, 'mail', () => H.readChangeMail(app, {to: OLD_EMAIL, newEmail: NEW_EMAIL, since}));
        }
        await signOut(page).catch(() => {});
    } finally {
        facts.serverLog = log.since(from);
        record(`facts-${MODE}`, facts);
        await close();
    }
});
