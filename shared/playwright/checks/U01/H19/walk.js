// U01 A12 walk (issue report docs/issues/U01-A12-disabled-sign-in-bounces-next-sign-in.md).
// On PKP's default test dataset (a freshly reset install): rvaca disables Carlo
// Corino (OMP Arthur Clark) in Settings > Users & Roles and signs out; then, in
// the same browser, on the journal's Login page, each with the correct password:
//   steps (no argument): the disabled account, dbarnes, the disabled account,
//     dbarnes, dbarnes; the same first two on the site-level Login page.
//   neighbour (argument `neighbour`): what a fix must leave alone: the disabled
//     account's refusal and message (no reason, then a typed reason), the disabled
//     account's wrong password answering the generic sentence, an unknown username,
//     each followed by dbarnes landing at once, and no session left signed in as
//     the disabled account (Login page open afresh shows the form).
//   PROBE_FEATURE=issues-h19h PROBE_AGENT=h19h node bin/probe.js all shared/playwright/checks/issues/disabled-sign-in-bounces-next-sign-in/walk.js [neighbour]
const {forEachApp, launch, signIn, signOut, record, screen} = require('../../../probe');
const H = require('./lib.js');

const mode = process.argv.slice(2).find((a) => a === 'neighbour') || 'steps';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', mode, disabled: c.disabled.username, enabled: c.enabled,
        ids: {disabled: H.userId(app, c.disabled.username), enabled: H.userId(app, c.enabled)}, attempts: []};
    const {page, close} = await launch(app);
    const attempt = async (label, username, opts = {}) => {
        let r;
        try {
            r = await H.loginAttempt(page, app, username, opts);
        } catch (e) {
            r = {username, failed: String(e).slice(0, 300)};
        }
        r.label = label;
        r.session = H.lastSession(app);
        facts.attempts.push(r);
        record(`a12-${mode}-${String(facts.attempts.length).padStart(2, '0')}-${label}`, await screen(page));
        if (r.signedIn) await signOut(page);
        return r;
    };
    try {
        await signIn(page, 'rvaca', {contextPath: app.contextPath});
        facts.disable = await H.disableUser(page, app, c.disabled);
        record(`a12-${mode}-00-disabled`, await screen(page));
        await signOut(page);
        const D = c.disabled.username, E = c.enabled;
        if (mode === 'steps') {
            await attempt('1-disabled', D, {open: true});
            await attempt('2-enabled', E);
            await attempt('3-disabled-again', D);
            await attempt('4-enabled-again', E);
            await attempt('5-enabled-once-more', E);
            // the site-level Login page, steps 1 and 2
            await attempt('site-1-disabled', D, {open: true, site: true});
            await attempt('site-2-enabled', E, {site: true});
            await attempt('site-3-enabled-again', E, {site: true});
        } else {
            await attempt('nb-1-disabled', D, {open: true});
            await attempt('nb-2-disabled-wrong-password', D, {password: 'wrong-password'});
            await attempt('nb-3-unknown-user', 'nosuchuserh19h');
            await attempt('nb-4-enabled', E);
            await attempt('nb-5-disabled', D, {open: true});
            await page.goto(`/index.php/${app.contextPath}/en/login`).catch(() => null);
            facts.loginAfreshAfterRefusal = {url: page.url(), form: await page.locator('form#login').count()};
            await attempt('nb-6-enabled', E);
            await attempt('nb-7-wrong-password', E, {password: 'wrong-password'});
            await attempt('nb-8-enabled', E);
            // a reason typed: its message
            await signIn(page, 'rvaca', {contextPath: app.contextPath});
            const {list, row} = await H.findUser(page, app, c.disabled);
            facts.reasonNote = 'enable then disable with a reason';
            await list.chooseAction(row, 'Enable User');
            const {DisableUserWindow} = require('../../../pages/UsersManagementPages.js');
            const en = new DisableUserWindow(page, `Enable ${c.disabled.name}`);
            await en.expectOpen();
            const ans = page.waitForResponse((r) => /disable-user/.test(r.url()) && r.request().method() === 'POST');
            await en.ok();
            await ans;
            facts.disableWithReason = await H.disableUser(page, app, c.disabled, 'Spam h19h');
            await signOut(page);
            await attempt('nb-9-disabled-reason', D, {open: true});
            await attempt('nb-10-enabled', E);
        }
    } finally {
        record(`a12-${mode}-facts`, facts);
        console.log(JSON.stringify(facts.attempts.map((a) => ({l: a.label, in: a.signedIn, err: a.error, landed: a.landed, chain: a.chain && a.chain.map((x) => `${x.method} ${x.url} ${x.status}`), s: a.session, f: a.failed})), null, 1).slice(0, 6000));
        await close();
    }
});
