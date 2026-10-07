// rr12780 S3: disabled account sign-in, disable while signed in, Login As a disabled user and back.
const {forEachApp, launch, signIn, screen, record, idle, tag, sql, serverLog} = require('../../../probe');

async function landing(page, url) {
    const resp = await page.goto(url);
    await idle(page).catch(() => {});
    const s = await screen(page);
    return {
        status: resp && resp.status(),
        url: page.url(),
        loginForm: await page.locator('form#login').count(),
        userNavText: (await page.locator('[data-cy="app-user-nav"]').first().innerText().catch(() => '')).slice(0, 80),
        currentUser: await page.evaluate(() => (window.pkp && pkp.currentUser) ? {id: pkp.currentUser.id, username: pkp.currentUser.username} : null).catch(() => null),
        text: ((s.text && s.text.main) || '').slice(0, 300),
    };
}

async function loginForm(page, t, user, remember = true) {
    await page.goto(`/index.php/${t}/en/login`);
    if (!remember) await page.locator('form#login input[name="remember"]').setChecked(false);
    await page.locator('form#login input[name="username"]').fill(user);
    await page.locator('form#login input[name="password"]').evaluate((el) => el.removeAttribute('maxlength'));
    await page.locator('form#login input[name="password"]').fill(user + user);
    await page.locator('form#login button[type="submit"]').click();
    await page.waitForLoadState('load');
    await idle(page).catch(() => {});
    return {url: page.url(), error: (await page.locator('form#login .pkp_form_error, form#login [role="alert"], .pkp_form_error').allInnerTexts().catch(() => [])).join(' | ').slice(0, 300),
        cookies: (await page.context().cookies()).map((c) => c.name)};
}

forEachApp(async (app) => {
    const t = tag('rr12780s3');
    const mgr = `${t}mgr`, dis = `${t}dis`, live = `${t}live`;
    await app.api.createContext({
        tag: t,
        users: [
            {username: mgr, givenName: 'Mona', familyName: 'Manager', roles: ['manager']},
            {username: dis, givenName: 'Dis', familyName: 'Abled', roles: ['author'], disabled: true},
            {username: live, givenName: 'Liv', familyName: 'Edisable', roles: ['author']},
        ],
    });
    const uid = (u) => Number(sql(app, `select user_id from users where username='${u}'`));
    const out = {app: app.name, tag: t};
    const log = serverLog(app);
    const from = log.mark();

    // (a) the disabled account signs in (Remember me ticked, the default)
    {
        const B = await launch(app);
        try {
            out.a = {attempt: await loginForm(B.page, t, dis)};
            out.a.next = await landing(B.page, `/index.php/${t}/en/user/profile`);
            out.a.home = await landing(B.page, `/index.php/${t}/en`);
        } catch (e) { out.a = {...out.a, error: String(e.message).slice(0, 500)}; } finally { await B.close(); }
    }

    // (b) a signed-in account is disabled by the manager
    {
        const U = await launch(app);
        const M = await launch(app);
        try {
            await loginForm(U.page, t, live);
            out.b = {before: await landing(U.page, `/index.php/${t}/en/user/profile`)};
            await signIn(M.page, mgr, {contextPath: t});
            await M.page.goto(`/index.php/${t}/en/management/settings/access`);
            await idle(M.page);
            const csrf = await M.page.evaluate(() => pkp.currentUser.csrfToken);
            const resp = await M.page.request.post(`/index.php/${t}/$$$call$$$/grid/settings/user/user-grid/disable-user`, {
                form: {userId: String(uid(live)), enable: '0', disableReason: 'rr12780 probe', csrfToken: csrf},
                headers: {'X-Requested-With': 'XMLHttpRequest'},
            });
            out.b.disableAnswer = {status: resp.status(), body: (await resp.text()).slice(0, 200)};
            out.b.disabledInDb = sql(app, `select disabled from users where username='${live}'`);
            out.b.after = await landing(U.page, `/index.php/${t}/en/user/profile`);
            out.b.afterCookies = (await U.context.cookies()).map((c) => c.name);
        } catch (e) { out.b = {...out.b, error: String(e.message).slice(0, 500)}; } finally { await U.close(); await M.close(); }
    }

    // (c) Login As the disabled user, then sign back
    {
        const M = await launch(app);
        try {
            await signIn(M.page, mgr, {contextPath: t});
            const asResp = await M.page.goto(`/index.php/${t}/en/login/signInAsUser/${uid(dis)}`);
            await idle(M.page).catch(() => {});
            out.c = {loginAsStatus: asResp && asResp.status(), landedAt: M.page.url()};
            out.c.asProfile = await landing(M.page, `/index.php/${t}/en/user/profile`);
            out.c.asDashboard = await landing(M.page, `/index.php/${t}/en/submissions`);
            const backResp = await M.page.goto(`/index.php/${t}/en/login/signOutAsUser`);
            await idle(M.page).catch(() => {});
            out.c.signBackStatus = backResp && backResp.status();
            out.c.back = await landing(M.page, `/index.php/${t}/en/user/profile`);
        } catch (e) { out.c = {...out.c, error: String(e.message).slice(0, 500)}; } finally { await M.close(); }
    }
    out.ids = {mgr: uid(mgr), dis: uid(dis), live: uid(live)};
    out.serverLog = log.since(from);
    record('s3', out);
});
