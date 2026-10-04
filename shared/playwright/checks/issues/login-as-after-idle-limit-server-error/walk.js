// U01 A8 walk (issue report docs/issues/U01-A8-login-as-after-idle-limit-server-error.md).
// On PKP's default test dataset, as the manager `rvaca`:
//   steps (default):
//     1. signed out, the Login page: sign in with "Keep me logged in" as the page shows it (ticked)
//     2. the idle limit passes: stood in for by moving the sessions' last activity back 8 days
//        (lib.lapseSessions; the app's session lifetime is 7 days)
//     3. Settings › Users & Roles: still signed in
//     4. row "David Buskins" › "Login As" › "OK": the answer, and the server log since
//     then (reads, not steps): the journal's home page header and the Login page in the same
//     session; and the control: sign out, sign in again, step 4 once more.
//   nb (the fix's neighbour check, run alone, fix in and out):
//     a. signed out, the sign-in-as address typed for David Buskins: the Login page
//     b. "Keep me logged in" ticked, the idle limit passes, the address typed for `admin`, whom a
//        manager may not impersonate: the "no administrative rights" page, never an impersonation
//     c. "Keep me logged in" unticked, the idle limit passes, Settings › Users & Roles: signed out
//        (the Login page), as before
// Every step records its result or its error and goes on.
//   Reset first: PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
//   PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH PROBE_FEATURE=<feature> PROBE_AGENT=<id> [PROBE_RUN=<run>] node bin/probe.js all shared/playwright/checks/issues/login-as-after-idle-limit-server-error/walk.js [nb]
// Facts: .reports/<feature>/<id>/facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signOut, record, screen, sql, serverLog} = require('../../../probe');
const L = require('./lib.js');

const mode = process.argv[2] || 'steps';
const ACTOR = 'rvaca';
const TARGET = 'David Buskins';

async function step(facts, key, fn) {
    try {
        facts[key] = await fn();
    } catch (e) {
        facts[key] = {error: L.flat(String((e && e.message) || e), 300)};
    }
    console.log(`[fact] ${key}: ${JSON.stringify(facts[key]).slice(0, 1500)}`);
    return facts[key];
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const facts = {app: app.name, line: app.line || 'main', mode};
    const log = serverLog(app);
    const targetId = sql(app, `SELECT user_id FROM users WHERE username = 'dbuskins'`);
    const adminId = sql(app, `SELECT user_id FROM users WHERE username = 'admin'`);
    const signInAs = (id) => `/index.php/${app.contextPath}${L.loc(app)}/login/signInAsUser/${id}`;
    const {page, close} = await launch(app);
    try {
        await signOut(page).catch(() => {});
        if (mode === 'steps') {
            await step(facts, '1 sign in, box as shown', () => L.signInWithBox(page, app, ACTOR, null));
            await step(facts, '2 idle limit passes', async () => ({sessions: L.lapseSessions(app)}));
            await step(facts, '3 Users & Roles', async () => {
                await L.usersRow(page, app, TARGET);
                const s = await screen(page);
                record('3-users-roles', s);
                return {landed: L.path(page), header: L.flat(s.text && s.text.header, 200)};
            });
            const from = log.mark();
            await step(facts, '4 Login As David Buskins', async () => {
                const row = await L.usersRow(page, app, TARGET);
                const r = await L.loginAsOnRow(page, row);
                record('4-login-as', await screen(page));
                return r;
            });
            facts['4 server log'] = log.since(from).map((l) => L.flat(l, 400)).slice(0, 6);
            console.log(`[fact] 4 server log: ${JSON.stringify(facts['4 server log'])}`);
            await step(facts, 'read: home page header', () => L.homeHeader(page, app));
            await step(facts, 'read: Login page', () => L.typeAddress(page, app, `/index.php/${app.contextPath}${L.loc(app)}/login`));
            await step(facts, 'control: sign out, sign in, Login As', async () => {
                await signOut(page);
                const signedIn = await L.signInWithBox(page, app, ACTOR, null);
                const row = await L.usersRow(page, app, TARGET);
                return {signedIn: signedIn.landed, loginAs: await L.loginAsOnRow(page, row)};
            });
        } else if (mode === 'nb') {
            await step(facts, 'a signed out, address for David Buskins', () => L.typeAddress(page, app, signInAs(targetId)));
            await step(facts, 'b sign in, box ticked', () => L.signInWithBox(page, app, ACTOR, true));
            await step(facts, 'b idle limit passes', async () => ({sessions: L.lapseSessions(app)}));
            const from = log.mark();
            await step(facts, 'b address for admin', () => L.typeAddress(page, app, signInAs(adminId)));
            facts['b server log'] = log.since(from).map((l) => L.flat(l, 400)).slice(0, 6);
            await step(facts, 'b Users & Roles after', async () => {
                await L.usersRow(page, app, TARGET);
                const s = await screen(page);
                return {landed: L.path(page), header: L.flat(s.text && s.text.header, 200)};
            });
            await signOut(page).catch(() => {});
            await step(facts, 'c sign in, box unticked', () => L.signInWithBox(page, app, ACTOR, false));
            await step(facts, 'c idle limit passes', async () => ({sessions: L.lapseSessions(app)}));
            await step(facts, 'c Users & Roles', () => L.typeAddress(page, app, `/index.php/${app.contextPath}${L.loc(app)}/management/settings/access`));
        } else {
            throw new Error(`unknown mode ${mode}`);
        }
    } finally {
        record(`facts-${mode}`, facts);
        await close();
    }
});
