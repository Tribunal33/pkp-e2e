// Kept walk of U02 A4 (the site-wide Register page lists a journal closed to registrations with
// nothing to tick; a disabled journal is left out), joined to issue report
// docs/issues/U03-A4-closed-journal-listed-on-roles-tab.md. On PKP's default test dataset,
// through the screens; the kit builds nothing. Fact keys follow the steps:
//   1  `admin` creates "u02e Closed Journal" (u02eclosed) on Administration › Hosted Journals
//      (Presses, Servers), public
//   2  the same for "u02e Hidden Journal" (u02ehidden), left not public (disabled)
//   3  u02eclosed's Settings › Users & Roles › Site Access Options: manager-only registration
//   4  signed out: the site-wide Register page, each listed journal with its boxes and consent line
//
// `neighbour` as argument takes steps 1-3, then on the site-wide Register page a newcomer ticks
// "Reader" under the dataset's journal and its consent line and registers (n1); that journal's
// profile then shows Reader ticked (n2). What a fix must leave alone.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u02e --dataset 5 --reset
// Run (main):   PROBE_FEATURE=issues-u02e PROBE_AGENT=u02e node bin/probe.js all shared/playwright/checks/issues/site-register-closed-journal-listed/walk.js [neighbour]
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-u02e-3_5), PROBE_RUN=r35
const {forEachApp, launch, signIn, signOut, screen, shot, record, serverLog} = require('../../../probe');
const L = require('./lib.js');
const {closeRegistration, readRoles} = require('../closed-journal-listed-on-roles-tab/lib.js');
const {fillNewcomer, tick, pressRegister} = require('../press-site-register-consent-raw-codes/lib.js');

const neighbour = process.argv.slice(2).includes('neighbour');

async function setup(app, page, fact) {
    const s = L.scratchNames(app);
    await signIn(page, 'admin');
    const err = (e) => `error: ${String(e).slice(0, 300)}`;
    fact('1-create-closed', {status: await L.createContext(page, app, s.closed).catch(err)});
    fact('2-create-hidden', {status: await L.createContext(page, app, s.hidden).catch(err)});
    fact('3-close', await closeRegistration(page, app, s.closed.path).catch(err));
    record('03-site-access', await screen(page));
    await signOut(page);
    return s;
}

async function steps(app, page, fact) {
    await setup(app, page, fact);
    fact('4-site-register', await L.readSiteRegister(page, app));
    record('04-site-register', await screen(page));
    await shot(page, '04-site-register');
}

async function neighbourChecks(app, page, fact) {
    await setup(app, page, fact);
    fact('n1-site-register', await L.readSiteRegister(page, app));
    await fillNewcomer(page, {givenName: 'Ula', familyName: 'Uzee', affiliation: 'u02e', country: 'Canada', email: 'u02e.newcomer@mailinator.com', username: 'u02enewcomer', password: 'u02enewcomeru02enewcomer'});
    const block = L.contextBlock(page, L.CONTEXT_NAME[app.name]);
    fact('n1-reader', await tick(block.locator('fieldset.roles label', {hasText: 'Reader'}).locator('input')));
    fact('n1-consent', await tick(block.locator('.context_privacy input')));
    const site = page.locator('form#register input[name="privacyConsent[0]"]');
    if (await site.count()) fact('n1-site-consent', await tick(site));
    fact('n1-register', await pressRegister(page));
    record('n1-after-register', await screen(page));
    const {ProfilePage} = require('../../../pages/ProfilePage.js');
    const profile = new ProfilePage(page, app.contextPath);
    await profile.goto('roles').catch((e) => fact('n2-goto-error', String(e).slice(0, 300)));
    fact('n2-profile-roles', {url: page.url(), ...(await readRoles(page, [L.CONTEXT_NAME[app.name]]))});
    record('n2-profile-roles', await screen(page));
}

forEachApp(async (app) => {
    const name = neighbour ? 'neighbour-facts' : 'walk-facts';
    const fact = (k, v) => {
        record(name, {[k]: v}, {merge: true});
        const shown = v && typeof v === 'object' && 'html' in v ? {...v, html: '…'} : v;
        console.log(`[${name}]`, app.name, k, JSON.stringify(shown).slice(0, 2000));
    };
    fact('run', {app: app.name, line: app.line || 'main', dataset: app.dataset});
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    try {
        if (neighbour) await neighbourChecks(app, page, fact);
        else await steps(app, page, fact);
    } catch (error) {
        fact('error', String(error.stack || error).slice(0, 1500));
        throw error;
    } finally {
        fact('serverLog', log.since(from));
        await close();
    }
});
