// rr12780 fix edges: the remember cookie across two ended sessions (its expiry unchanged), after "Sign out"
// (copied cookie), after a password change, after the account is disabled, after the same browser saves an
// email change, after a password change made in this browser (a second browser loses it), an API call with
// the cookie alone (no sign-in there; the next page signs in), and the control without "Keep me logged in".
const {forEachApp, launch, signIn, screen, record, note, idle, tag, sql, serverLog} = require('../../../probe');

async function landing(page, url) {
    const resp = await page.goto(url);
    await idle(page).catch(() => {});
    const s = await screen(page);
    return {
        status: resp && resp.status(),
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        loginForm: await page.locator('form#login').count(),
        currentUser: await page.evaluate(() => (window.pkp && pkp.currentUser) ? pkp.currentUser.username : null).catch(() => null),
        text: ((s.text && s.text.main) || '').slice(0, 120),
    };
}

async function loginForm(page, t, user, remember = true) {
    await page.goto(`/index.php/${t}/en/login`);
    await page.locator('form#login input[name="remember"]').setChecked(remember);
    await page.locator('form#login input[name="username"]').fill(user);
    await page.locator('form#login input[name="password"]').evaluate((el) => el.removeAttribute('maxlength'));
    await page.locator('form#login input[name="password"]').fill(user + user);
    await page.locator('form#login button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.includes('/login'), {timeout: 15000, waitUntil: 'commit'});
    await idle(page).catch(() => {});
}

const cookieNames = async (context) => (await context.cookies()).map((c) => c.name);
const sid = async (context) => (await context.cookies()).find((c) => /SID$/i.test(c.name));
const rem = async (context) => (await context.cookies()).find((c) => /^remember_/.test(c.name));
const dropSession = async (context) => context.clearCookies({name: (await sid(context)).name});

forEachApp(async (app) => {
    const t = tag('k12fx');
    const names = ['twice', 'out', 'pw', 'dis', 'ctl', 'mail', 'chpw', 'api'];
    const u = Object.fromEntries(names.map((n) => [n, `${t}${n}`]));
    await app.api.createContext({
        tag: t,
        users: names.map((n) => ({username: u[n], givenName: 'Fx', familyName: n, roles: ['author']})),
    });
    const token = (user) => sql(app, `select coalesce(remember_token, '') from users where username='${user}'`);
    const out = {app: app.name, tag: t};
    const log = serverLog(app);
    const from = log.mark();
    const profile = `/index.php/${t}/en/user/profile`;
    const run = async (key, fn) => {
        const C = await launch(app);
        const r = {};
        try { await fn(C, r); } catch (e) { r.error = String(e && e.message || e).slice(0, 500); } finally { await C.close(); }
        out[key] = r;
    };

    // d: "Keep me logged in", the session ends twice: signed in both times, the cookie kept
    await run('d', async (C, r) => {
        await loginForm(C.page, t, u.twice);
        r.expiresAtSignIn = (await rem(C.context))?.expires;
        await dropSession(C.context);
        r.first = await landing(C.page, profile);
        r.cookiesAfterFirst = await cookieNames(C.context);
        await dropSession(C.context);
        r.second = await landing(C.page, `/index.php/${t}/en/submissions`);
        r.cookiesAfterSecond = await cookieNames(C.context);
        r.expiresAfterSecond = (await rem(C.context))?.expires;
    });

    // e: a copy of the remember cookie taken before "Sign out" no longer signs anyone in
    await run('e', async (C, r) => {
        await loginForm(C.page, t, u.out);
        const copied = await rem(C.context);
        r.tokenBefore = token(u.out).slice(0, 8);
        await C.page.goto(`/index.php/${t}/en/login/signOut`);
        await idle(C.page).catch(() => {});
        r.tokenAfter = token(u.out).slice(0, 8);
        r.cookiesAfterSignOut = await cookieNames(C.context);
        const D = await launch(app);
        try {
            await D.context.addCookies([copied]);
            r.copiedCookie = await landing(D.page, profile);
        } finally { await D.close(); }
    });

    // f: the password changes after the sign-in: the cookie no longer signs in
    await run('f', async (C, r) => {
        await loginForm(C.page, t, u.pw);
        sql(app, `update users set password=(select password from users where username='${u.ctl}') where username='${u.pw}'`);
        await dropSession(C.context);
        r.afterDrop = await landing(C.page, profile);
        r.cookies = await cookieNames(C.context);
    });

    // g: the account is disabled after the sign-in: the cookie no longer signs in and is removed
    await run('g', async (C, r) => {
        await loginForm(C.page, t, u.dis);
        sql(app, `update users set disabled=1 where username='${u.dis}'`);
        await dropSession(C.context);
        r.afterDrop = await landing(C.page, profile);
        r.cookies = await cookieNames(C.context);
    });

    // h: control, "Keep me logged in" unticked: signed out once the session ends
    await run('h', async (C, r) => {
        await loginForm(C.page, t, u.ctl, false);
        r.cookies = await cookieNames(C.context);
        await dropSession(C.context);
        r.afterDrop = await landing(C.page, profile);
    });

    // i: the browser that saves an email change keeps its own "Keep me logged in"
    await run('i', async (C, r) => {
        const {ProfilePage} = require('../../../pages/ProfilePage.js');
        await loginForm(C.page, t, u.mail);
        const p = new ProfilePage(C.page, t);
        await p.goto('contact');
        await p.country().selectOption({label: 'Canada'});
        await p.email().fill(`${u.mail}new@mail.test`);
        await p.save();
        await p.pendingEmailNotice().waitFor({timeout: 15000});
        r.cookiesAfterSave = await cookieNames(C.context);
        await dropSession(C.context);
        r.afterDrop = await landing(C.page, profile);
    });

    // j: the password changed under "Edit Profile" in this browser: this browser stays remembered, another does not
    await run('j', async (C, r) => {
        const {ProfilePage} = require('../../../pages/ProfilePage.js');
        const D = await launch(app);
        try {
            await loginForm(D.page, t, u.chpw);
            await loginForm(C.page, t, u.chpw);
            const pwBefore = sql(app, `select password from users where username='${u.chpw}'`);
            const cookieBefore = (await rem(C.context))?.value;
            const p = new ProfilePage(C.page, t);
            await p.goto('password');
            for (const box of [p.currentPassword(), p.newPassword(), p.repeatPassword()]) {
                await box.evaluate((el) => el.removeAttribute('maxlength'));
            }
            await p.currentPassword().fill(u.chpw + u.chpw);
            await p.newPassword().fill(`${u.chpw}${u.chpw}New1!`);
            await p.repeatPassword().fill(`${u.chpw}${u.chpw}New1!`);
            await p.form('password').locator('button[type="submit"]').click();
            for (let i = 0; i < 30 && !r.passwordChanged; i++) {
                await C.page.waitForTimeout(500);
                r.passwordChanged = sql(app, `select password from users where username='${u.chpw}'`) !== pwBefore;
            }
            // the save's answer carries any new cookie after the password is stored: wait for it (10 s)
            for (let i = 0; i < 20 && !r.cookieReplacedOnSave; i++) {
                r.cookieReplacedOnSave = ((await rem(C.context))?.value || null) !== cookieBefore;
                if (!r.cookieReplacedOnSave) await C.page.waitForTimeout(500);
            }
            await idle(C.page).catch(() => {});
            r.formError = (await p.form('password').innerText().catch(() => '')).slice(0, 300);
            await dropSession(C.context);
            r.afterDrop = await landing(C.page, profile);
            await dropSession(D.context);
            r.otherAfterDrop = await landing(D.page, profile);
        } finally { await D.close(); }
    });

    // k: the session ends, then an API call with the cookie alone; then a page
    await run('k', async (C, r) => {
        await loginForm(C.page, t, u.api);
        await dropSession(C.context);
        const before = sql(app, `select count(*) from sessions where user_id=(select user_id from users where username='${u.api}')`);
        const resp = await C.page.request.get(`/index.php/${t}/api/v1/submissions`, {headers: {'X-Requested-With': 'XMLHttpRequest'}});
        r.apiStatus = resp.status();
        r.sessionsBeforeApi = before;
        r.sessionsAfterApi = sql(app, `select count(*) from sessions where user_id=(select user_id from users where username='${u.api}')`);
        r.afterPage = await landing(C.page, profile);
    });

    out.serverLog = log.since(from);
    record('edges', out);
    const at = (x) => x && (x.loginForm ? 'login' : x.currentUser || x.url);
    note(`rr12780fx ${app.name}: d=${at(out.d.first)}/${at(out.d.second)} e=${at(out.e.copiedCookie)} f=${at(out.f.afterDrop)} g=${at(out.g.afterDrop)} h=${at(out.h.afterDrop)} i=${at(out.i.afterDrop)} j=${at(out.j.afterDrop)}/${at(out.j.otherAfterDrop)} k=${out.k.apiStatus}/${at(out.k.afterPage)}`);
});
