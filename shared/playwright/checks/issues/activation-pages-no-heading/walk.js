// Issue report docs/issues/U02-A2-activation-pages-no-heading.md (U02 A2): with email
// validation required, the page the emailed link opens ("Confirm and activate your account")
// and the page after "Activate Account" have no heading, an empty current breadcrumb and a
// browser tab without the page's name; the second offers no Login link. Takes the report's
// Steps on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"). The
// install is served with [email] require_validation = On by a php -S of the script's own
// (validationServer() of ../register-no-support-contact-empty-page/lib.js: a copy of the
// fleet's config with that key, base_url and the session cookie changed, at the fleet's
// port + 25), since the fleet's own config must not be edited. Everything else goes through
// the screens.
//
//   (default)  1. signed out, Register u02creader on publicknowledge (the pending page: control)
//              2. the "Validate Your Account" email's link
//              3. "Activate Account"
//              4. the page's "Login" link if any, else the header's "Login"; sign in as u02creader
//   neighbour  (the fix's, run alone): other message pages keep their state: signed out,
//              Login › "Forgot your password?" › dbarnes@mailinator.com › "Reset Password"
//              (named, with its Login link); dbuskins types the journal's settings address
//              (the access-denied page, which the fix leaves alone).
//
// Reset first:  npm run fleet-prep -- --feature issues-u02c --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u02c PROBE_AGENT=u02c node bin/probe.js all shared/playwright/checks/issues/activation-pages-no-heading/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u02c-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u02c-3_5 PROBE_AGENT=u02c node bin/probe.js all shared/playwright/checks/issues/activation-pages-no-heading/walk.js
// Facts: .reports/<feature>/u02c/a2-facts[-neighbour][-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const MODE = process.argv[2] || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const A6 = require('../register-no-support-contact-empty-page/lib');
    const L = require('./lib');
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[a2] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const step = async (key, fn) => {
        try {
            const v = await fn();
            fact(key, v);
            return v;
        } catch (e) {
            fact(`${key} error`, L.flat(e.message, 400));
            return null;
        }
    };
    const snap = async (page, name) => {
        record(`a2-${name}`, await screen(page).catch((e) => ({error: e.message})));
        await shot(page, `a2-${name}`).catch(() => {});
    };
    const ctx = app.contextPath;
    const L35 = app.line && /3_[34]/.test(app.line) ? '' : '/en';

    if (MODE === 'neighbour') {
        const {page, close} = await launch(app);
        try {
            await step('n1 reset password page', async () => {
                await page.goto(app.url(`/index.php/${ctx}${L35}/login`));
                await idle(page);
                await page.getByRole('link', {name: 'Forgot your password?'}).click();
                await idle(page);
                await page.getByLabel(/Registered user's email/i).fill('dbarnes@mailinator.com');
                const answered = page.waitForResponse((r) => r.request().resourceType() === 'document' && /requestResetPassword/.test(r.url()), {timeout: 60_000});
                await page.getByRole('button', {name: 'Reset Password'}).click();
                return L.readPage(page, await answered);
            });
            await snap(page, 'n1');
            await signIn(page, 'dbuskins');
            await step('n2 access denied page', async () => {
                const r = await page.goto(app.url(`/index.php/${ctx}${L35}/management/settings/context`));
                return L.readPage(page, r);
            });
            await snap(page, 'n2');
        } finally {
            record('a2-facts-neighbour', facts);
            await close();
        }
        return;
    }

    const server = await A6.validationServer(app, {port: app.port + 25, name: 'u02c'});
    fact('server', {url: server.url});
    const vapp = {...app, baseURL: server.url, url: (p) => `${server.url}${p}`};
    const {page, close} = await launch(vapp);
    const who = {givenName: 'u02c', familyName: 'Reader', username: 'u02creader'};
    try {
        // 1
        const since = new Date();
        const from = server.mark();
        await step('1 register', () => A6.register(page, ctx, who));
        await step('1 pending page', () => L.readPage(page, null));
        await snap(page, '1');
        // 2
        const mail = await step('2 email', () => L.validationEmail(app, `${who.username}@mailinator.com`, since));
        if (!mail || !mail.link) throw new Error('no activation link in the email');
        await step('2 emailed link page', async () => L.readPage(page, await page.goto(mail.link)));
        await snap(page, '2');
        // 3
        await step('3 activated page', async () => {
            const answered = page.waitForResponse((r) => r.request().resourceType() === 'document' && /activateUser/.test(r.url()), {timeout: 60_000});
            await page.getByRole('link', {name: 'Activate Account', exact: true}).click();
            const r = await answered;
            await page.waitForLoadState('load');
            return L.readPage(page, r);
        });
        await snap(page, '3');
        fact('3 account', sql(app, `SELECT username, disabled, date_validated IS NOT NULL AS validated FROM users WHERE username = '${who.username}'`));
        // 4
        await step('4 sign in', async () => {
            const inPage = page.locator('.page_message .cmp_back_link a, .page a').filter({hasText: /^\s*Login\s*$/});
            const via = (await inPage.count()) ? 'the page' : 'the header';
            const link = via === 'the page' ? inPage.first() : page.locator('.pkp_navigation_user a, #navigationUser a').filter({hasText: /^\s*Login\s*$/}).first();
            await Promise.all([page.waitForLoadState('load'), link.click()]);
            await idle(page).catch(() => {});
            const login = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), title: await page.title()};
            return {via, login, ...(await L.loginHere(page, who.username))};
        });
        fact('server log', server.since(from).slice(0, 8));
    } finally {
        record('a2-facts', facts);
        await close();
        await server.stop();
    }
});
