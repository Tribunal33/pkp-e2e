// Kept walk of issue report docs/issues/U03-A7-password-boxes-keep-32-characters.md (U03 A7, U01 A1).
// On PKP's default test dataset: `rvaca` invites a newcomer (u03rb@mailinator.com) through Settings >
// Users & Roles > "Invite to a role"; signed out, the newcomer accepts with a 40-character password;
// then the Login page with that password; "Forgot your password?" and the reset email's form with the
// same password; signing in again; Profile > "Password" with the same password in each box. Every
// password is typed key by key, so each box's own limit applies as it does to a person.
//
// `neighbour` as argument walks only the paths a fix must leave alone instead: a wrong password is
// still refused on the Login page, Profile > "Password" still refuses a new password under the
// minimum, and the Register page's Username box still stops at 32 characters. No argument walks the
// steps alone.
//
// Reset first:  npm run fleet-prep -- --feature issues-u03b --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u03b PROBE_AGENT=u03b node bin/probe.js all shared/playwright/checks/issues/password-boxes-keep-32-characters/walk.js [neighbour]
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-u03b-3_5), PROBE_RUN=r35
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, serverLog} = require('../../../probe');
const H = require('./lib.js');

const neighbour = process.argv.slice(2).includes('neighbour');

async function steps(app, facts) {
    const role = H.U06.ROLE[app.name];
    facts.role = role;
    const manager = await launch(app);
    try {
        // 1-4: the manager invites the newcomer
        await signIn(manager.page, 'rvaca');
        const since = new Date();
        facts.invite = await H.U06.invite(manager.page, app, {
            email: H.NEWCOMER.email,
            givenName: H.NEWCOMER.givenName,
            familyName: H.NEWCOMER.familyName,
            role,
        });
        facts.mail = await H.U06.acceptLink(app, H.NEWCOMER.email, since);
    } finally {
        await manager.close();
    }

    const {page, close} = await launch(app);
    try {
        // 5-8: signed out, the newcomer accepts with the 40-character password
        const n = {};
        n.met = await H.U06.openAccept(page, facts.mail.accept);
        const create = await H.newcomerSteps(page);
        n.met.push(...create.met);
        n.acceptPasswordBox = create.box;
        record('01-review', await screen(page));
        Object.assign(n, await H.U06.acceptAndLeave(page));
        facts.accept = n;
        record('02-landed', await screen(page));

        // 9: the Login page with the same password
        if (!n.landed.loginForm) {
            await page.goto(app.url(`/index.php/${app.contextPath}/en/login`));
            await idle(page);
        }
        facts.login = await H.login(page, H.NEWCOMER.username, H.PASSWORD);
        record('03-login', await screen(page));
        await shot(page, '03-login');

        // 10-11: "Forgot your password?" and the reset email's form
        if (facts.login.signedIn) {
            await signOut(page);
        }
        await page.goto(app.url(`/index.php/${app.contextPath}/en/login`));
        await idle(page);
        const since = new Date();
        facts.resetRequest = await H.requestReset(page, H.NEWCOMER.email);
        facts.resetMail = await H.resetLink(app, H.NEWCOMER.email, since);
        if (facts.resetMail.link) {
            facts.reset = await H.resetTo(page, facts.resetMail.link, H.PASSWORD);
            record('04-reset-saved', await screen(page));
            // 12: "Login", then the same password
            const back = page.getByRole('link', {name: 'Login', exact: true}).last();
            if (await back.count()) {
                await back.click();
                await page.waitForLoadState('load').catch(() => {});
                await idle(page);
            }
            facts.loginAfterReset = await H.login(page, H.NEWCOMER.username, H.PASSWORD);
            record('05-login-after-reset', await screen(page));
        }

        // 13-14: Profile > "Password", the three boxes
        if (facts.loginAfterReset && facts.loginAfterReset.signedIn) {
            facts.profile = await H.profilePasswordBoxes(page, app, H.PASSWORD);
            record('06-profile-password', await screen(page));
            await shot(page, '06-profile-password');
        }
    } finally {
        await close();
    }
}

async function neighbourChecks(app, facts) {
    const {page, close} = await launch(app);
    try {
        // a wrong password is still refused (the first 32 characters of a longer one)
        await page.goto(app.url(`/index.php/${app.contextPath}/en/login`));
        await idle(page);
        facts.wrongPassword = await H.login(page, 'dbarnes', 'dbarnesdbarnes-not-the-password');
        record('n1-wrong-password', await screen(page));
        // Profile > "Password" still refuses a new password under the minimum
        await signIn(page, 'dbarnes');
        await idle(page);
        facts.tooShort = await H.profileSave(page, app, 'dbarnesdbarnes', 'abc');
        record('n2-too-short', await screen(page));
        await signOut(page);
        // the Register page: the Username box keeps its 32-character limit
        facts.register = await H.registerBoxes(page, app, H.PASSWORD);
        record('n3-register', await screen(page));
    } finally {
        await close();
    }
}

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, password: {length: H.PASSWORD.length, first32: H.FIRST32}};
    const log = serverLog(app);
    const from = log.mark();
    const name = neighbour ? 'neighbour' : 'walk';
    try {
        if (neighbour) {
            await neighbourChecks(app, facts);
        } else {
            await steps(app, facts);
        }
        facts.serverLog = log.since(from);
        record(name, facts);
    } catch (error) {
        facts.error = String(error.stack || error).slice(0, 1500);
        facts.serverLog = log.since(from);
        record(name, facts);
        throw error;
    }
});
