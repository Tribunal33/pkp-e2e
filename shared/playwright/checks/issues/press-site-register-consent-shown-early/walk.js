// U02 OMP2 walk (issue report docs/issues/U02-OMP2-press-site-register-consent-shown-early.md).
// On PKP's default test dataset: a visitor, signed out, types the site-level Register page's
// address and reads where the context's line "Yes, I agree to have my data collected and stored
// according to this press's (journal's, server's) privacy statement." sits before any role is
// ticked, after "Reader" is ticked, and after "Reader" is unticked again.
// Modes (the argument after the script; each runs alone, from a freshly reset dataset):
//   walk       (default) the steps above
//   neighbour  what the fix must leave alone: (a) the context's own Register page, whose consent
//              box "Yes, I agree to have my data collected and stored according to the privacy
//              statement." is on screen from the start; (b) the site-level page refused with
//              "Reader" ticked and the context's consent unticked: the page comes back with
//              "Reader" still ticked and the context's line on screen, so it can be ticked
//   PROBE_FEATURE=issues-u02f PROBE_AGENT=u02f node bin/probe.js all shared/playwright/checks/issues/press-site-register-consent-shown-early/walk.js [walk|neighbour]
const {forEachApp, launch, screen, shot, record, serverLog} = require('../../../probe');
const H = require('../press-site-register-consent-raw-codes/lib.js');
const L = require('./lib.js');

const MODE = process.argv[2] || 'walk';
const WHO = {
    givenName: 'u02f',
    familyName: 'Visitor',
    affiliation: 'u02f',
    country: 'Canada',
    email: 'u02f.visitor@mailinator.com',
    username: 'u02fvisitor',
    password: 'u02fvisitoru02fvisitor',
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
    const block = () => H.contextBlock(page, H.CONTEXT_NAME[app.name]);
    const reader = () => block().getByRole('checkbox', {name: 'Reader', exact: true});
    const line = () => L.contextConsentLine(block());
    try {
        if (MODE === 'walk') {
            // 1-2: the site-level page, nothing ticked
            await step(facts, 'open', () => H.openRegister(page, app, null));
            await step(facts, 'beforeTick', async () => ({
                blockText: (await block().innerText()).replace(/\s+/g, ' ').trim().slice(0, 400),
                line: await L.onScreen(line()),
            }));
            record('01-site-register-nothing-ticked', await screen(page));
            await shot(page, `01-site-register-nothing-ticked-${app.name}`);
            // 3: "Reader" ticked
            await step(facts, 'afterTick', async () => {
                await reader().check();
                return {reader: await reader().isChecked(), line: await L.onScreen(line())};
            });
            await shot(page, `02-reader-ticked-${app.name}`);
            // 4: "Reader" unticked
            await step(facts, 'afterUntick', async () => {
                await reader().uncheck();
                return {reader: await reader().isChecked(), line: await L.onScreen(line())};
            });
            record('03-reader-unticked', await screen(page));
            await shot(page, `03-reader-unticked-${app.name}`);
        } else if (MODE === 'neighbour') {
            // (a) the context's own Register page: its consent box on screen from the start
            await step(facts, 'ownPage', async () => ({
                open: await H.openRegister(page, app, app.contextPath),
                consent: await L.onScreen(page.locator('form#register fieldset.consent').filter({has: page.locator('input[name="privacyConsent"]')})),
            }));
            record('n1-context-register', await screen(page));
            // (b) the site-level page refused with "Reader" ticked and the context's line unticked
            await step(facts, 'siteRefused', async () => {
                await H.openRegister(page, app, null);
                await H.fillNewcomer(page, WHO);
                await reader().check();
                const refused = await H.pressRegister(page);
                return {refused, reader: await reader().isChecked().catch(() => null), line: await L.onScreen(line())};
            });
            record('n2-site-register-refused', await screen(page));
            await shot(page, `n2-site-register-refused-${app.name}`);
        }
    } finally {
        facts.serverLog = log.since(from);
        record(`facts-${MODE}`, facts);
        await close();
    }
});
