// U03 A14 walk (issue report docs/issues/U03-A14-site-profile-privacy-link-not-found.md).
// On PKP's default test dataset: the Site Administrator creates a second journal (press,
// server) on screen and gives dbarnes a Reader role there, so dbarnes holds roles in two and
// the site-level profile stays at the site. On every tab of that page dbarnes reads the
// privacy sentence and presses "privacy statement" (Identity and API Key open the page);
// then the administrator types a site Privacy Statement and dbarnes presses the link again.
// Modes (the argument after the script; each runs alone, from a freshly reset dataset):
//   walk       (default) the steps above
//   neighbour  dbarnes's journal-level profile in `publicknowledge`, whose statement exists:
//              the sentence and its link must stay and open the journal's "Privacy Statement"
//   reach      rvaca empties `publicknowledge`'s English Privacy Statement; the French one
//              remains, so dbarnes's journal-level link must still open the statement (the
//              page falls back to it), with the fix in and out
//   PROBE_FEATURE=issues-u03e PROBE_AGENT=u03e node bin/probe.js all shared/playwright/checks/issues/site-profile-privacy-link-not-found/walk.js [walk|neighbour|reach]
const {forEachApp, launch, signIn, signOut, screen, record, serverLog} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.argv[2] || 'walk';
const SITE_TEXT = 'u03re site privacy statement.';

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
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    try {
        if (MODE === 'walk') {
            // 1-2. admin creates the second context and gives dbarnes a role there
            await signIn(page, 'admin');
            await step(facts, 'create', () => H.createSecondContext(page, app));
            record('01-second-context', await screen(page));
            await signOut(page);
            // 3-4. dbarnes opens the site-level profile
            await signIn(page, 'dbarnes');
            await step(facts, 'siteProfile', async () => {
                const o = await H.openProfile(page, app, null);
                facts._profile = o.profile;
                return {status: o.status, landed: o.landed};
            });
            record('02-site-profile', await screen(page));
            // 5-6. every tab's sentence and link; Identity and API Key open it
            if (facts._profile) {
                await step(facts, 'tabs', () => H.walkTabs(page, facts._profile));
                await step(facts, 'roles', () => H.rolesText(page, facts._profile));
                record('03-site-profile-roles', await screen(page));
            }
            delete facts._profile;
            await signOut(page);
            // 7. the way round: the administrator writes a site statement
            await signIn(page, 'admin');
            await step(facts, 'sitePrivacy', () => H.setSitePrivacy(page, SITE_TEXT));
            record('04-site-privacy-saved', await screen(page));
            await signOut(page);
            // 8. dbarnes presses the link again
            await signIn(page, 'dbarnes');
            await step(facts, 'afterStatement', async () => {
                const o = await H.openProfile(page, app, null);
                return {landed: o.landed, privacy: await H.readPrivacy(page, o.profile, 'identity'), opened: await H.openPrivacyLink(page, o.profile, 'identity')};
            });
            record('05-site-profile-after', await screen(page));
        } else if (MODE === 'neighbour') {
            // dbarnes's journal-level profile: the journal has a statement
            await signIn(page, 'dbarnes');
            await step(facts, 'journalProfile', async () => {
                const o = await H.openProfile(page, app, app.contextPath);
                return {landed: o.landed, identity: await H.readPrivacy(page, o.profile, 'identity'), opened: await H.openPrivacyLink(page, o.profile, 'identity')};
            });
            record('n1-journal-profile', await screen(page));
        } else if (MODE === 'reach') {
            // rvaca empties the journal's English statement; dbarnes's journal-level profile
            await signIn(page, 'rvaca');
            await step(facts, 'emptyStatement', () => H.emptyContextPrivacy(page, app.contextPath));
            record('r1-statement-emptied', await screen(page));
            await signOut(page);
            await signIn(page, 'dbarnes');
            await step(facts, 'journalProfile', async () => {
                const o = await H.openProfile(page, app, app.contextPath);
                return {landed: o.landed, identity: await H.readPrivacy(page, o.profile, 'identity'), opened: await H.openPrivacyLink(page, o.profile, 'identity')};
            });
            record('r2-journal-profile', await screen(page));
        } else {
            throw new Error(`unknown mode ${MODE}`);
        }
        await signOut(page).catch(() => {});
    } finally {
        facts.serverLog = log.since(from);
        record(`facts-${MODE}`, facts);
        await close();
    }
});
