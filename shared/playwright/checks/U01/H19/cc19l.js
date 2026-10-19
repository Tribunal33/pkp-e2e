// U01 claim check cc19l (housekeeping 2026-10-19, chunk H19, an incidentals row):
// what the installation's security audit log ([logs] log_audit, written to the
// server log; no screen shows it) records when the app itself ends a session
// because the account's password changed in another browser, against a plain
// "Logout" and the Site Administrator setting the password on "Edit User".
//
// On a dataset fleet (PKP's default test dataset, `fleet-prep --dataset`), whose
// config the script switches `log_audit = On` in (harness.md "Dataset fleets":
// a walk sets the value it needs in config.test.ds<n>.inc.php after each reset).
// dbarnes's password is changed and put back to the dataset's own in each phase.
//   phases (all by default, or name some: self logout admin):
//     self    B signs in as dbarnes; A, dbarnes too, changes the password on
//             Profile › Password; B opens the Dashboard again; A puts it back
//     logout  B signs in as dbarnes and presses "Logout" in the user menu
//     admin   B signs in as dbarnes; A, admin, sets dbarnes's password on the
//             journal's Users & Roles › Edit User; B opens the Dashboard again;
//             A puts it back the same way
//   PROBE_FEATURE=issues-cc19l PKP_E2E_DATASET=1 PROBE_AGENT=cc19l PROBE_RUN=r1 \
//     bin/app-lock.sh shared ojs -- node bin/probe.js ojs shared/playwright/checks/U01/H19/cc19l.js
const fs = require('fs');
const path = require('path');
const {expect} = require('@playwright/test');
const {forEachApp, launch, signIn, signOut, record, screen, shot, idle, serverLog, sql} = require('../../../probe');

const ALL = ['self', 'logout', 'admin'];
const asked = process.argv.slice(2).filter((a) => ALL.includes(a));
const PHASES = asked.length ? asked : ALL;
const USER = 'dbarnes';
const ORIGINAL = 'dbarnesdbarnes';
const CHANGED = 'Cc19lChanged-1';
const T = 30_000;
const HOSTED = {ojs: 'Hosted Journals', omp: 'Hosted Presses', ops: 'Hosted Servers'};
const strip = (u) => String(u).replace(/^https?:\/\/[^/]+/, '');

/** Turn the security audit log on in the fleet's own config ([logs] log_audit = On). */
function ensureAudit(app) {
    if (!app.dataset) throw new Error('cc19l: drives a dataset fleet only (PKP_E2E_DATASET=1)');
    const file = path.isAbsolute(app.configFile) ? app.configFile : path.join(__dirname, '../../../../..', app.configFile);
    const text = fs.readFileSync(file, 'utf8');
    if (/^log_audit\s*=\s*On\s*$/m.test(text)) return {file: path.basename(file), was: 'On'};
    const next = text.replace(/^\[logs\]\s*$/m, '[logs]\nlog_audit = On');
    if (next === text) throw new Error(`cc19l: no [logs] section in ${file}`);
    fs.writeFileSync(file, next);
    return {file: path.basename(file), was: 'off (commented out)', now: 'On'};
}

/** The audit entries the server log gained since `from` (Monolog's errorlog lines). */
function auditSince(log, from) {
    return log.since(from).map((l) => {
        const m = l.match(/\] \w+\.(\w+): (.*?) (\{.*\})\s*$/);
        if (!m) return {raw: l.slice(0, 400)};
        let ctx = {};
        try {
            ctx = JSON.parse(m[3]);
        } catch {
            ctx = {unparsed: m[3].slice(0, 300)};
        }
        return {level: m[1], message: m[2], event: ctx.event, status: ctx.status, userId: ctx.userId, oldIp: ctx.oldIp, newIp: ctx.newIp,
            targetUserId: ctx.targetUserId, ip: ctx.ip, requestUrl: ctx.requestUrl && strip(ctx.requestUrl)};
    });
}

/** Where the page is and what it says, for a facts line. */
async function where(page) {
    return {url: strip(page.url()), loginForm: await page.locator('form#login').count(),
        userMenu: await page.locator('[data-cy="app-user-nav"]').count()};
}

async function snap(page, name) {
    await idle(page).catch(() => {});
    record(name, await screen(page));
    await shot(page, name);
}

async function changeOwnPassword(app, page, current, next) {
    const {ProfilePage} = require('../../../pages/ProfilePage.js');
    const profile = new ProfilePage(page, app.contextPath);
    await profile.goto('password');
    await profile.fillPasswords({current, next});
    await profile.save();
    return {notice: await profile.inTabNotice('password').innerText().catch(() => null), toast: await profile.toast.innerText().catch(() => null)};
}

/**
 * As the Site Administrator (signed in): Administration › "Hosted …" › the context's arrow ›
 * "Settings wizard", tab "Users", search dbarnes, "Edit User", type the password twice, "OK"
 * (the journal's own Users & Roles has no password box on main: its "Edit" opens the roles page).
 */
async function adminSetPassword(app, page, password) {
    const {HostedContextsPage, UserDetailsWindow} = require('../../../pages/UsersManagementPages.js');
    const hosted = new HostedContextsPage(page, {hostedLabel: HOSTED[app.name]});
    await hosted.gotoFromAdministration();
    await hosted.openSettingsWizard(app.contextPath);
    const grid = await hosted.openWizardTab('Users');
    await grid.search({text: USER});
    await grid.chooseAction(USER, 'Edit User');
    const win = new UserDetailsWindow(page, 'Edit User');
    await win.expectOpen();
    if (!(await win.password.isVisible())) await win.moreDetailsLink.click().catch(() => {});
    await win.password.fill(password);
    await win.password2.fill(password);
    const answer = page.waitForResponse((r) => /update-user/i.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await win.pressOk();
    const res = await answer;
    await win.expectClosed();
    await idle(page);
    return {status: res.status(), url: strip(res.url())};
}

forEachApp(async (app) => {
    const id = sql(app, `select user_id from users where username='${USER}'`);
    const adminId = sql(app, `select user_id from users where username='admin'`);
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null, ids: {[USER]: id, admin: adminId},
        audit: ensureAudit(app), phases: {}};
    const log = serverLog(app, {match: /"event":"/});
    const sessions = () => Number(sql(app, `select count(*) from sessions where user_id=${id}`));

    for (const phase of PHASES) {
        const f = (facts.phases[phase] = {});
        const B = await launch(app);
        let A = null;
        try {
            // B: dbarnes signed in, on the Dashboard
            let from = log.mark();
            await signIn(B.page, USER, {contextPath: app.contextPath});
            await B.page.goto(`/index.php/${app.contextPath}/en/dashboard/editorial`);
            await snap(B.page, `cc19l-${phase}-1-B-signed-in`);
            f.bSignedIn = await where(B.page);
            f.bLoginAudit = auditSince(log, from);
            f.sessionsAfterB = sessions();

            if (phase === 'logout') {
                from = log.mark();
                const nav = B.page.locator('[data-cy="app-user-nav"] button').first();
                await nav.click({timeout: 8000});
                const link = B.page.locator('[data-cy="app-user-nav"]').getByRole('link', {name: 'Logout', exact: true});
                f.logoutHref = strip(await link.getAttribute('href', {timeout: 5000}));
                await Promise.all([B.page.waitForURL(/\/login/, {timeout: 15000}), link.click({timeout: 5000})]);
                await snap(B.page, `cc19l-${phase}-2-B-after-logout`);
                f.bAfter = await where(B.page);
                f.bAfterUsername = await B.page.locator('form#login input[name="username"]').inputValue().catch(() => null);
                f.audit = auditSince(log, from);
                continue;
            }

            // A: the password changes
            A = await launch(app);
            if (phase === 'self') {
                await signIn(A.page, USER, {contextPath: app.contextPath});
                from = log.mark();
                f.change = await changeOwnPassword(app, A.page, ORIGINAL, CHANGED);
                await snap(A.page, `cc19l-${phase}-2-A-after-change`);
            } else {
                await signIn(A.page, 'admin', {contextPath: app.contextPath});
                from = log.mark();
                f.change = await adminSetPassword(app, A.page, CHANGED);
                await snap(A.page, `cc19l-${phase}-2-A-after-change`);
            }
            f.changeAudit = auditSince(log, from);
            f.sessionsAfterChange = sessions();
            const fromChange = from;

            // B: the next page (the Dashboard's own background requests may reach the server first)
            from = log.mark();
            const resp = await B.page.goto(`/index.php/${app.contextPath}/en/dashboard/editorial`);
            f.bNextStatus = resp ? resp.status() : null;
            await snap(B.page, `cc19l-${phase}-3-B-next-page`);
            f.bNext = await where(B.page);
            f.audit = auditSince(log, from);
            f.windowAudit = auditSince(log, fromChange);

            // A again: the page after the change (still signed in?), then the password put back
            from = log.mark();
            await A.page.goto(`/index.php/${app.contextPath}/en/dashboard/editorial`);
            f.aNext = await where(A.page);
            f.aNextAudit = auditSince(log, from);
            from = log.mark();
            f.restore = phase === 'self'
                ? await changeOwnPassword(app, A.page, CHANGED, ORIGINAL)
                : await adminSetPassword(app, A.page, ORIGINAL);
            f.restoreAudit = auditSince(log, from);
            await signOut(A.page);
        } catch (e) {
            f.error = String(e).slice(0, 500);
            await snap(B.page, `cc19l-${phase}-error-B`).catch(() => {});
            if (A) await snap(A.page, `cc19l-${phase}-error-A`).catch(() => {});
        } finally {
            if (A) await A.close();
            await B.close();
        }
    }
    record(`cc19l-facts-${PHASES.join('-')}`, facts);
    console.log(JSON.stringify(facts, null, 1));
});
