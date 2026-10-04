// U02 A3 walk (issue report docs/issues/U02-A3-site-register-email-optout-not-kept.md).
// On PKP's default test dataset: a visitor, signed out, opens the site-level Register page by
// its address, ticks the context's "Reader" and its privacy line, leaves "Yes, I would like to
// be notified of new publications and announcements." unticked and presses "Register"; then
// opens the context's Profile › "Notifications" and reads the "Public Announcements" block.
// Modes (the argument after the script; each runs alone, from a freshly reset dataset):
//   walk       (default) the steps above
//   neighbour  (a) the context's own Register page, box unticked: "Do not send me an email…"
//              ticked under "Public Announcements" (must stay so); (b) the site-level page with
//              the box ticked: those boxes unticked (must stay so)
//   PROBE_FEATURE=issues-u02d PROBE_AGENT=u02d node bin/probe.js all shared/playwright/checks/issues/site-register-email-optout-not-kept/walk.js [walk|neighbour]
const {forEachApp, launch, signOut, screen, record, serverLog} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.argv[2] || 'walk';
const who = (username) => ({
    givenName: 'u02d',
    familyName: 'Visitor',
    affiliation: 'u02d',
    country: 'Canada',
    email: `${username}@mailinator.com`.replace('u02dvisitor@', 'u02d.visitor@'),
    username,
    password: `${username}${username}`,
});

/** Run a step, recording its error instead of throwing, so the state a fix brings is read too. */
async function step(facts, name, fn) {
    try {
        facts.steps[name] = await fn();
    } catch (e) {
        facts.steps[name] = {error: String(e && e.message ? e.message : e).split('\n')[0]};
    }
    return facts.steps[name];
}

/** Site-level page: fill, tick the context's "Reader" and privacy line, set the email box, register. */
async function siteRegister(page, app, facts, tag, person, emailTicked) {
    const ctxName = H.CONTEXT_NAME[app.name];
    await step(facts, `${tag}-open`, () => H.openRegister(page, app, null));
    record(`${tag}-1-site-register`, await screen(page));
    return step(facts, `${tag}-register`, async () => {
        await H.fillNewcomer(page, person);
        const block = H.contextBlock(page, ctxName);
        const reader = await H.tick(block.getByRole('checkbox', {name: 'Reader', exact: true}));
        const consent = await H.tick(block.locator('.context_privacy input[type="checkbox"]'));
        const box = H.emailConsent(page);
        if (emailTicked) await box.check({force: true});
        const emailBox = {count: await box.count(), checked: await box.first().isChecked()};
        return {reader, consent, emailBox, ...(await H.pressRegister(page))};
    });
}

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, dataset: app.dataset, steps: {}};
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    try {
        if (MODE === 'walk') {
            // 1-5: site-level page, "Reader" and the privacy line ticked, the email box left unticked
            await siteRegister(page, app, facts, 'w', who('u02dvisitor'), false);
            record('w-2-registered', await screen(page));
            // 6: the context's Profile › "Notifications"
            await step(facts, 'w-notifications', async () => {
                const cats = await H.readNotifications(page, app, app.contextPath);
                return {publicAnnouncements: H.publicEmailBoxes(cats), categories: cats};
            });
            record('w-3-notifications', await screen(page));
        } else if (MODE === 'neighbour') {
            // (a) the context's own Register page, box unticked
            await step(facts, 'a-open', () => H.openRegister(page, app, app.contextPath));
            await step(facts, 'a-register', async () => {
                await H.fillNewcomer(page, who('u02dnbj'));
                const consent = await H.tick(H.contextPageConsent(page));
                const box = H.emailConsent(page);
                const emailBox = {count: await box.count(), checked: await box.first().isChecked()};
                return {consent, emailBox, ...(await H.pressRegister(page))};
            });
            record('n-a1-registered', await screen(page));
            await step(facts, 'a-notifications', async () => {
                const cats = await H.readNotifications(page, app, app.contextPath);
                return {publicAnnouncements: H.publicEmailBoxes(cats)};
            });
            record('n-a2-notifications', await screen(page));
            await signOut(page);
            // (b) the site-level page, box ticked
            await siteRegister(page, app, facts, 'b', who('u02dnbs'), true);
            record('n-b2-registered', await screen(page));
            await step(facts, 'b-notifications', async () => {
                const cats = await H.readNotifications(page, app, app.contextPath);
                return {publicAnnouncements: H.publicEmailBoxes(cats)};
            });
            record('n-b3-notifications', await screen(page));
        }
    } finally {
        facts.serverLog = log.since(from);
        record(`facts-${MODE}`, facts);
        await close();
    }
});
