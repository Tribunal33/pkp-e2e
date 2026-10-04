// Issue report docs/issues/U02-A6-register-no-support-contact-empty-page.md (U02 A6): with
// email validation required, a visitor who registers with a journal that has no technical
// support contact gets an empty page, and the account is left created, disabled and without
// its email. Takes the report's Steps on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"). The install is served with [email] require_validation = On by
// a php -S of the script's own (lib.js validationServer(): a copy of the fleet's config with
// that key, base_url and the session cookie changed, at the fleet's port + 18), since the
// fleet's own config must not be edited. Everything else goes through the screens.
//
//   (default)  1. admin: Hosted Journals › "Create Journal" u02a (no technical support contact)
//              2. signed out: Register u02areader on u02a: the page, the POST's status, the log
//              3. sign in as u02areader;  4. register again with the same details
//              5. admin: u02a Settings › Journal › Contact: Technical Support Contact, "Save"
//              6. sign in as u02areader again, the mailbox
//              7. control: register u02areader2 on u02a (contact now set)
//              8. way round: admin, Users & Roles › Users › u02areader "Enable User"; sign in
//   neighbour  (the fix's): a journal created and given a technical support contact before
//              anyone registers: the email's sender stays that contact; a registration on the
//              site-wide Register page: the sender stays the site's contact.
//   enable     step 8 alone, on the state a cut-short walk left (no reset).
//   smtp       (issue report docs/issues/U02-A6-register-mail-down-says-email-sent.md) the register's second half: on publicknowledge (support contact set), with the
//              mail server unreachable (smtp_port at a dead port, at the fleet's port + 17):
//              register u02asmtp, then sign in as u02asmtp.
//
// Reset first:  npm run fleet-prep -- --feature issues-u02a --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u02a PROBE_AGENT=u02a node bin/probe.js all shared/playwright/checks/issues/register-no-support-contact-empty-page/walk.js [neighbour|smtp]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u02a-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u02a-3_5 PROBE_AGENT=u02a node bin/probe.js all shared/playwright/checks/issues/register-no-support-contact-empty-page/walk.js
// Facts: .reports/<feature>/u02a/a6-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, sql} = require('../../../probe');

const MODE = process.argv[2] || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const L = require('./lib');
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[a6] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const step = async (key, fn) => {
        try {
            fact(key, await fn());
        } catch (e) {
            fact(`${key} error`, L.flat(e.message, 400));
        }
    };
    const smtp = MODE === 'smtp';
    const server = await L.validationServer(app, {port: app.port + (smtp ? 17 : 18), smtpPort: smtp ? 1 : null, name: MODE});
    fact('server', {url: server.url, config: server.config});
    const vapp = {...app, baseURL: server.url, url: (p) => `${server.url}${p}`};
    // Each person starts in a fresh browser: after a disabled account's refusal the browser's
    // next correct sign-in bounces back to the Login page once (U01 A12, a finding of its own).
    let browser = await launch(vapp);
    let page = browser.page;
    const fresh = async () => {
        await browser.close();
        browser = await launch(vapp);
        page = browser.page;
    };
    const userRow = (username) =>
        sql(app, `SELECT username, disabled, disabled_reason, date_validated FROM users WHERE username = '${username}'`);
    const registerAt = async (key, contextPath, who) => {
        const since = new Date();
        const from = server.mark();
        await step(`${key} register`, () => L.register(page, contextPath, who));
        record(`a6-${key}`, await screen(page).catch((e) => ({error: e.message})));
        await shot(page, `a6-${key}`).catch(() => {});
        fact(`${key} server log`, server.since(from).slice(0, 6));
        fact(`${key} mail`, await L.mailFor(app, `${who.username}@mailinator.com`, since));
        fact(`${key} account`, userRow(who.username));
        return since;
    };
    const ctx = {name: 'u02a Journal', initials: 'U02A', path: 'u02a', contactName: 'u02a Contact', contactEmail: 'u02acontact@mailinator.com'};
    const reader = {givenName: 'u02a', familyName: 'Reader', username: 'u02areader'};
    try {
        if (MODE === 'steps') {
            await signIn(page, 'admin');
            await step('1 create journal u02a', () => L.createJournal(page, app, ctx));
            await signOut(page);
            const since = await registerAt('2', 'u02a', reader);
            await step('3 sign in as u02areader', () => L.tryLogin(page, 'u02a', 'u02areader'));
            await step('4 register again', () => L.register(page, 'u02a', reader));
            record('a6-4', await screen(page).catch((e) => ({error: e.message})));
            await fresh();
            await signIn(page, 'admin');
            await step('5 set support contact', () => L.setSupportContact(page, 'u02a', {name: 'u02a Support', email: 'u02asupport@mailinator.com'}));
            await signOut(page);
            await step('6 sign in as u02areader again', () => L.tryLogin(page, 'u02a', 'u02areader'));
            fact('6 mail since step 2', await L.mailFor(app, 'u02areader@mailinator.com', since, 5000));
            await fresh();
            await registerAt('7', 'u02a', {givenName: 'u02a', familyName: 'Reader Two', username: 'u02areader2'});
            await fresh();
            await signIn(page, 'admin');
            await step('8 enable u02areader', () => L.enableUser(page, 'u02a', {email: 'u02areader@mailinator.com', fullName: 'u02a Reader'}));
            await signOut(page);
            await step('8 sign in as u02areader', () => L.tryLogin(page, 'u02a', 'u02areader'));
            fact('8 account', userRow('u02areader'));
        } else if (MODE === 'enable') {
            // Step 8 alone, on the state the steps left (no reset): a walk cut short there.
            await signIn(page, 'admin');
            await step('8 enable u02areader', () => L.enableUser(page, 'u02a', {email: 'u02areader@mailinator.com', fullName: 'u02a Reader'}));
            await signOut(page);
            await step('8 sign in as u02areader', () => L.tryLogin(page, 'u02a', 'u02areader'));
            fact('8 account', userRow('u02areader'));
        } else if (MODE === 'neighbour') {
            await signIn(page, 'admin');
            await step('n1 create journal u02a', () => L.createJournal(page, app, ctx));
            await step('n1 set support contact', () => L.setSupportContact(page, 'u02a', {name: 'u02a Support', email: 'u02asupport@mailinator.com'}));
            await signOut(page);
            await registerAt('n2', 'u02a', {givenName: 'u02a', familyName: 'Neighbour', username: 'u02anb'});
            await registerAt('n3', 'index', {givenName: 'u02a', familyName: 'Site', username: 'u02asite'});
        } else if (MODE === 'smtp') {
            await registerAt('s1', app.contextPath, {givenName: 'u02a', familyName: 'Smtp', username: 'u02asmtp'});
            await step('s2 sign in as u02asmtp', () => L.tryLogin(page, app.contextPath, 'u02asmtp'));
        }
    } finally {
        record('a6-facts', facts);
        await browser.close();
        await server.stop();
    }
});
