// Issue report docs/issues/U02-A1-activation-link-expires-before-validation-timeout.md (U02 A1):
// with email validation required, the emailed activation link lives as long as any invitation
// ([invitations] expiration_days, 3 by default), not the [email] validation_timeout (14) the
// configuration documents as its lifetime. Takes the report's Steps on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"). The install is served by a php -S of the
// script's own at the fleet's port + 31 (validationServer() of
// ../register-no-support-contact-empty-page/lib.js: a copy of the fleet's config with
// require_validation = On, expiration_days = 0, base_url and the session cookie changed), since
// the fleet's own config must not be edited. expiration_days = 0 stands for the fourth day on a
// default install: the invitations' lifetime has run out, validation_timeout's 14 days have not.
// Everything else goes through the screens.
//
//   (default)  1. signed out, Register u02hreader on publicknowledge
//              2. the "Validate Your Account" email's link (and "Activate Account" if offered)
//              3. the page's "Login" (else the Login page); sign in as u02hreader
//              4. signed out, register again with the same details
//              5. way round (only while still refused): rvaca, Users & Roles › Users,
//                 "u02h Reader" › "Enable User"; sign in as u02hreader
//   enable     step 5 alone, on the state a cut-short walk left (no reset).
//   neighbour  (the fix's, run alone): same config; rvaca invites an existing user to a role;
//              the emailed accept link, signed out, must stay "Invitation Unavailable".
//
// Reset first:  npm run fleet-prep -- --feature issues-u02h --dataset 8 --reset
// Run (main):   PROBE_FEATURE=issues-u02h PROBE_AGENT=u02h node bin/probe.js all shared/playwright/checks/issues/activation-link-expires-before-validation-timeout/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u02h-3_5 --dataset 8 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u02h-3_5 PROBE_AGENT=u02h node bin/probe.js all shared/playwright/checks/issues/activation-link-expires-before-validation-timeout/walk.js
// Facts: .reports/<feature>/u02h/a1-facts[-neighbour][-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, sql} = require('../../../probe');

const MODE = process.argv[2] || 'steps';
const KEYS = {expiration_days: 0};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const A6 = require('../register-no-support-contact-empty-page/lib');
    const A2 = require('../activation-pages-no-heading/lib');
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[a1] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const step = async (key, fn) => {
        try {
            const v = await fn();
            fact(key, v);
            return v;
        } catch (e) {
            fact(`${key} error`, A6.flat(e.message, 400));
            return null;
        }
    };
    const snap = async (page, name) => {
        record(`a1-${name}`, await screen(page).catch((e) => ({error: e.message})));
        await shot(page, `a1-${name}`).catch(() => {});
    };
    const ctx = app.contextPath;

    const server = await A6.validationServer(app, {port: app.port + 31, name: 'u02h', keys: KEYS});
    const cfg = require('fs').readFileSync(server.config, 'utf8');
    fact('server', {url: server.url, keys: cfg.match(/^(require_validation|validation_timeout|expiration_days) = .*$/gm)});
    const vapp = {...app, baseURL: server.url, url: (p) => `${server.url}${p}`};
    const from = server.mark();

    if (MODE === 'neighbour') {
        const {sendInvitation, viewAllUsers, invitationMail} = require('../invitation-sent-promises-decision-updates/lib.js');
        const {CASES, mailOf, openLink} = require('../replaced-invitation-links-not-found/lib.js');
        const c = CASES[app.name];
        const mgr = await launch(vapp);
        const rcpt = await launch(vapp);
        try {
            await signIn(mgr.page, 'rvaca');
            const since = new Date();
            const sent = await step('n1 invite', async () => {
                const s = await sendInvitation(mgr.page, vapp, {email: mailOf(c.neighbour.first), role: c.role});
                await viewAllUsers(mgr.page);
                return {sent: s.text, mail: await invitationMail(vapp, mailOf(c.neighbour.first), since)};
            });
            if (sent && sent.mail && sent.mail.accept) {
                await step('n2 accept link', async () => {
                    const r = await openLink(rcpt.page, sent.mail.accept);
                    return {status: r.status, title: r.title, headings: r.headings, unavailable: r.unavailable, acceptWizard: r.acceptWizard, buttons: r.buttons, body: A6.flat(r.body, 300)};
                });
                await snap(rcpt.page, 'n2');
            }
            fact('n invitation row', sql(app, `SELECT type, status, expiry_date <= now() AS expired FROM invitations WHERE email = '${mailOf(c.neighbour.first)}' OR user_id = (SELECT user_id FROM users WHERE username = '${c.neighbour.first}') ORDER BY invitation_id DESC LIMIT 1`));
            fact('server log', server.since(from).slice(0, 8));
        } finally {
            record('a1-facts-neighbour', facts);
            await mgr.close();
            await rcpt.close();
            await server.stop();
        }
        return;
    }

    const who = {givenName: 'u02h', familyName: 'Reader', username: 'u02hreader'};
    const email = `${who.username}@mailinator.com`;
    const wayRound = async (page) => {
        await step('5 rvaca signs in', () => A6.tryLogin(page, ctx, 'rvaca'));
        await step('5 enable user', () => require('./lib').enableUserSearched(page, ctx, {phrase: 'u02h', email, fullName: 'u02h Reader'}));
        await snap(page, '5a');
        await signOut(page).catch(() => {});
        await step('5 sign in', () => A6.tryLogin(page, ctx, who.username));
        await snap(page, '5');
    };
    const {page, close} = await launch(vapp);
    if (MODE === 'enable') {
        try {
            await wayRound(page);
            fact('server log', server.since(from).slice(0, 8));
        } finally {
            record('a1-facts-enable', facts);
            await close();
            await server.stop();
        }
        return;
    }
    try {
        // 1
        const since = new Date();
        await step('1 register', () => A6.register(page, ctx, who));
        await snap(page, '1');
        fact('1 invitation row', sql(app, `SELECT i.type, i.status, i.expiry_date, i.created_at, i.expiry_date <= now() AS expired FROM invitations i JOIN users u ON u.user_id = i.user_id WHERE u.username = '${who.username}'`));
        // 2
        const mail = await step('2 email', () => A2.validationEmail(vapp, email, since));
        if (!mail || !mail.link) throw new Error('no activation link in the email');
        const opened = await step('2 emailed link page', async () => {
            const r = await page.goto(mail.link);
            await page.getByRole('heading', {name: /Invitation Unavailable|activate/i}).first().waitFor({timeout: 10_000}).catch(() => {});
            const read = await A2.readPage(page, r);
            const buttons = (await page.getByRole('button').allInnerTexts().catch(() => [])).map((b) => A6.flat(b, 60)).filter(Boolean);
            const links = (await page.getByRole('link').allInnerTexts().catch(() => [])).map((b) => A6.flat(b, 60)).filter(Boolean);
            return {...read, buttons, allLinks: links, activateOffered: (await page.getByRole('link', {name: 'Activate Account', exact: true}).count()) > 0};
        });
        await snap(page, '2');
        if (opened && opened.activateOffered) {
            await step('2b activate', async () => {
                await Promise.all([page.waitForLoadState('load'), page.getByRole('link', {name: 'Activate Account', exact: true}).click()]);
                return A2.readPage(page, null);
            });
            await snap(page, '2b');
        }
        // 3
        const login = await step('3 sign in', async () => {
            const btn = page.getByRole('button', {name: 'Login', exact: true}).or(page.getByRole('link', {name: 'Login', exact: true}));
            let via = 'the Login page';
            if (await btn.count()) {
                via = 'the page';
                await Promise.all([page.waitForLoadState('load'), btn.first().click()]);
                await page.waitForLoadState('load');
            }
            const onLogin = (await page.locator('form#login').count()) > 0;
            if (!onLogin) return {via, ...(await A6.tryLogin(page, ctx, who.username))};
            const r = await A2.loginHere(page, who.username);
            const message = A6.flat(await page.locator('form#login .pkp_form_error, .pkp_form_error, .cmp_notification').first().innerText({timeout: 2000}).catch(() => null), 600);
            return {via, landedOn: page.url().replace(/^https?:\/\/[^/]+/, ''), ...r, message};
        });
        await snap(page, '3');
        fact('3 account', sql(app, `SELECT username, disabled, disabled_reason, date_validated IS NOT NULL AS validated FROM users WHERE username = '${who.username}'`));
        fact('3 mailbox', await A6.mailFor(vapp, email, new Date(Date.now() - 5000), 3000));
        // 4
        if (login && login.signedIn) await signOut(page).catch(() => {});
        await step('4 register again', () => A6.register(page, ctx, who));
        await snap(page, '4');
        // 5
        if (!(login && login.signedIn)) await wayRound(page);
        fact('server log', server.since(from).slice(0, 8));
    } finally {
        record('a1-facts', facts);
        await close();
        await server.stop();
    }
});
