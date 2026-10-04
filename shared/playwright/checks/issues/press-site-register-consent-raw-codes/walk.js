// U02 OMP1 walk (issue report docs/issues/U02-OMP1-press-site-register-consent-raw-codes.md).
// On PKP's default test dataset: a visitor, signed out, opens the site-level Register page by
// its address, ticks the context's "Reader" but not its consent, and presses "Register" (the
// context's consent refusal). Then the Site Administrator creates a second context (which
// brings the site's "Information" tab) and types a site Privacy Statement; the visitor presses
// "Register" with nothing ticked (the site's consent refusal), then with the site's consent and
// "Reader" (the context's refusal again), then with every consent (the account is created).
// Modes (the argument after the script; each runs alone, from a freshly reset dataset):
//   walk       (default) the steps above
//   neighbour  the press's (journal's, server's) own Register page, no consent ticked: its
//              refusal "You must agree to the terms of the privacy statement." must stay as is
//   PROBE_FEATURE=issues-u02b PROBE_AGENT=u02b node bin/probe.js all shared/playwright/checks/issues/press-site-register-consent-raw-codes/walk.js [walk|neighbour]
const {forEachApp, launch, signIn, signOut, screen, record, serverLog} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.argv[2] || 'walk';
const SITE_TEXT = 'u02b site privacy statement.';
const WHO = {
    givenName: 'u02b',
    familyName: 'Visitor',
    affiliation: 'u02b',
    country: 'Canada',
    email: 'u02b.visitor@mailinator.com',
    username: 'u02bvisitor',
    password: 'u02bvisitoru02bvisitor',
};

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
    const ctxName = H.CONTEXT_NAME[app.name];
    try {
        if (MODE === 'walk') {
            const reader = () => H.contextBlock(page, ctxName).getByRole('checkbox', {name: 'Reader', exact: true});
            const ctxConsent = () => H.contextBlock(page, ctxName).locator('.context_privacy input[type="checkbox"]');
            const state = async (loc) => ((await loc.count()) ? {present: true, checked: await loc.first().isChecked()} : {present: false});
            // One press. 1-4: the site-level page, "Reader" ticked, the context's consent left
            await step(facts, 'open1', () => H.openRegister(page, app, null));
            record('01-site-register', await screen(page));
            await step(facts, 'noContextConsent1', async () => {
                await H.fillNewcomer(page, WHO);
                const r = await H.tick(reader());
                return {siteConsentBox: await state(H.siteConsent(page)), reader: r, ctxConsent: await state(ctxConsent()), ...(await H.pressRegister(page))};
            });
            record('02-refused-context-consent', await screen(page));
            // With a site statement. 5: a second context; 6: the site's Privacy Statement
            await signIn(page, 'admin');
            await step(facts, 'secondContext', async () => ({status: await H.createSecondContext(page, app)}));
            await step(facts, 'sitePrivacy', () => H.setSitePrivacy(page, SITE_TEXT));
            record('03-site-privacy-saved', await screen(page));
            await signOut(page);
            // 7-8: nothing ticked
            await step(facts, 'open2', () => H.openRegister(page, app, null));
            record('04-site-register-with-statement', await screen(page));
            await step(facts, 'noSiteConsent', async () => {
                await H.fillNewcomer(page, WHO);
                return {siteConsentBox: await state(H.siteConsent(page)), ...(await H.pressRegister(page))};
            });
            record('05-refused-site-consent', await screen(page));
            // 9: the site's consent and "Reader" ticked, the context's consent left
            await step(facts, 'noContextConsent2', async () => {
                const site = await H.tick(H.siteConsent(page));
                const r = await H.tick(reader());
                await H.fillPasswords(page, WHO);
                return {site, reader: r, ctxConsent: await state(ctxConsent()), ...(await H.pressRegister(page))};
            });
            record('06-refused-context-consent-2', await screen(page));
            // 10: control, every consent ticked
            await step(facts, 'allConsents', async () => {
                const site = await H.tick(H.siteConsent(page));
                const r = await H.tick(reader());
                const c = await H.tick(ctxConsent());
                await H.fillPasswords(page, WHO);
                return {site, reader: r, ctxConsent: c, ...(await H.pressRegister(page))};
            });
            record('07-registered', await screen(page));
        } else if (MODE === 'neighbour') {
            // the context's own Register page, no consent ticked
            await step(facts, 'open', () => H.openRegister(page, app, app.contextPath));
            await step(facts, 'noConsent', async () => {
                await H.fillNewcomer(page, {...WHO, username: 'u02bnb', email: 'u02b.nb@mailinator.com'});
                return H.pressRegister(page);
            });
            record('n1-context-register-refused', await screen(page));
        }
    } finally {
        facts.serverLog = log.since(from);
        record(`facts-${MODE}`, facts);
        await close();
    }
});
