// U01 A4 walk (issue report docs/issues/U01-A4-second-login-as-strands-operator.md).
// On PKP's default test dataset, as `admin`:
//   steps (default): Users & Roles › "Daniel Barnes" › "Login As" › "OK"; as dbarnes, the row menus
//     of "Ramiro Vaca" (Users & Roles), the submission's participant and (OJS, OMP) reviewer read;
//     "Ramiro Vaca" › "Login As" › "OK"; "Logout as rvaca"; the user menu and Administration read.
//     Each step records what it finds and goes on: with the fix in, step 6 finds no "Login As".
//   nb: the neighbour check of the fix: `dbarnes` signed in on his own is still offered "Login As"
//     on the same three rows; `admin` › "Login As" dbarnes › "Logout as dbarnes" returns to admin;
//     and while impersonating dbarnes, the sign-in-as address typed for rvaca, then "Logout as".
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> [PROBE_RUN=<run>] node bin/probe.js all shared/playwright/checks/issues/second-login-as-strands-operator/walk.js [nb]
const {forEachApp, launch, signIn, signOut, record, screen, sql} = require('../../../probe');
const L = require('./lib.js');

const mode = process.argv[2] || 'steps';

const SUBMISSION = {
    ojs: {id: 7, participant: 'Domatilia Sokoloff', reviewer: 'Paul Hudson'},
    omp: {id: 16, participant: 'Michael Power', reviewer: 'Adela Gallego'},
    ops: {id: 1, participant: 'Carlo Corino', reviewer: null},
};

/** Run one step, keeping its result or its error in `facts`, never throwing. */
async function step(facts, key, fn) {
    try {
        facts[key] = await fn();
    } catch (e) {
        facts[key] = {error: L.flat(String(e && e.message || e), 300)};
    }
    return facts[key];
}

/** Steps 3-5: the row menus read while signed in as (or impersonating) dbarnes. */
async function readOffers(app, page, facts, prefix) {
    const s = SUBMISSION[app.name];
    await step(facts, `${prefix}UsersRolesRvaca`, () => L.usersRowMenu(page, app, 'Ramiro Vaca'));
    record(`a4-${prefix}-users-roles`, await screen(page));
    await L.openWorkflow(page, app, s.id);
    await step(facts, `${prefix}Participant`, () => L.participantMenu(page, s.participant));
    if (s.reviewer) await step(facts, `${prefix}Reviewer`, () => L.reviewerMenu(page, s.reviewer));
    record(`a4-${prefix}-workflow`, await screen(page));
}

async function steps(app, page, facts) {
    await signIn(page, 'admin');
    facts.s2 = await L.loginAsFromUsers(page, app, 'Daniel Barnes');
    facts.s2menu = await step(facts, 's2menu', () => L.userMenu(page));
    record('a4-02-impersonating-dbarnes', await screen(page));
    await readOffers(app, page, facts, 's3');
    const s6 = await step(facts, 's6', () => L.loginAsFromUsers(page, app, 'Ramiro Vaca'));
    await step(facts, 's6menu', () => L.userMenu(page));
    record('a4-06-after-second-login-as', await screen(page));
    if (s6 && s6.offered) {
        await step(facts, 's7', () => L.logoutAs(page, 'rvaca'));
        await step(facts, 's8menu', () => L.userMenu(page));
        record('a4-07-after-logout-as', await screen(page));
        await step(facts, 's8admin', () => L.administration(page, app));
        record('a4-08-administration', await screen(page));
    } else {
        // the fix's state: no second Login As; the one "Logout as dbarnes" returns to admin
        await step(facts, 's7', () => L.logoutAs(page, 'dbarnes'));
        await step(facts, 's8menu', () => L.userMenu(page));
        await step(facts, 's8admin', () => L.administration(page, app));
        record('a4-08-administration', await screen(page));
    }
}

async function neighbour(app, page, facts) {
    await signIn(page, 'dbarnes');
    await readOffers(app, page, facts, 'nbOwn');
    await signIn(page, 'admin');
    await step(facts, 'nbLoginAs', () => L.loginAsFromUsers(page, app, 'Daniel Barnes'));
    await step(facts, 'nbLogoutAs', () => L.logoutAs(page, 'dbarnes'));
    await step(facts, 'nbMenu', () => L.userMenu(page));
    await step(facts, 'nbAdmin', () => L.administration(page, app));
    record('a4-nb-back-to-admin', await screen(page));
    // the sign-in-as address typed while impersonating dbarnes
    const rvaca = sql(app, "select user_id from users where username = 'rvaca'").trim();
    await step(facts, 'nbLoginAs2', () => L.loginAsFromUsers(page, app, 'Daniel Barnes'));
    await step(facts, 'nbTyped', async () => {
        const r = await page.goto(app.url(`/index.php/${app.contextPath}/en/login/signInAsUser/${rvaca}`));
        return {status: r ? r.status() : null, url: page.url().replace(/^https?:\/\/[^/]+/, '')};
    });
    const typedMenu = await step(facts, 'nbTypedMenu', () => L.userMenu(page));
    const who = (typedMenu && /logged in as (\w+)/.exec(typedMenu.text || '')) || null;
    await step(facts, 'nbTypedLogoutAs', () => L.logoutAs(page, who ? who[1] : 'rvaca'));
    await step(facts, 'nbTypedAfterMenu', () => L.userMenu(page));
    await step(facts, 'nbTypedAdmin', () => L.administration(page, app));
    record('a4-nb-typed-address', await screen(page));
}

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode, run: process.env.PROBE_RUN || null};
    const {page, close} = await launch(app);
    try {
        if (mode === 'nb') await neighbour(app, page, facts);
        else await steps(app, page, facts);
        await signOut(page).catch(() => {});
    } catch (e) {
        facts.error = String(e && e.stack || e).slice(0, 1500);
        record('a4-error', await screen(page).catch(() => ({})));
    } finally {
        record(mode === 'nb' ? 'a4-nb-facts' : 'a4-facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
