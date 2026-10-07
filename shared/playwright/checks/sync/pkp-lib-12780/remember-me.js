// rr12780 S1 (other browser after an email-change request) and S2 (remember me after the session is gone).
const {forEachApp, launch, signIn, screen, record, note, idle, tag, sql, serverLog} = require('../../../probe');

async function cookieNames(context) {
    return (await context.cookies()).map((c) => ({name: c.name, expires: c.expires, session: c.expires === -1}));
}

async function landing(page, url) {
    const resp = await page.goto(url);
    await idle(page).catch(() => {});
    const s = await screen(page);
    return {
        status: resp && resp.status(),
        url: page.url(),
        loginForm: await page.locator('form#login').count(),
        userNav: await page.locator('[data-cy="app-user-nav"]').count(),
        frontLogin: await page.locator('a[href*="/login"]').count(),
        heading: (s.text && (s.text.main || '')).slice(0, 200),
    };
}

forEachApp(async (app) => {
    const {ProfilePage} = require('../../../pages/ProfilePage.js');
    const t = tag('rr12780');
    const ua = `${t}au`, uc = `${t}ctl`, ur = `${t}rem`;
    await app.api.createContext({
        tag: t,
        users: [
            {username: ua, givenName: 'Dee', familyName: 'Probe', roles: ['author']},
            {username: uc, givenName: 'Cee', familyName: 'Control', roles: ['author']},
            {username: ur, givenName: 'Rem', familyName: 'Ember', roles: ['author']},
        ],
    });
    const uid = (u) => sql(app, `select user_id from users where username='${u}'`);
    const sessions = (u) => sql(app, `select count(*) from sessions where user_id=${uid(u)}`);
    const out = {app: app.name, tag: t, s1: {}, s1ctl: {}, s2: {}};
    const log = serverLog(app);
    const from = log.mark();

    // ---------- S1: remember ticked (the default) on both browsers ----------
    const runS1 = async (user, rememberB, key) => {
        const A = await launch(app);
        const B = await launch(app);
        const r = {};
        try {
            await signIn(A.page, user, {contextPath: t});
            // B: the Login page as a person sees it; untick only for the control
            await B.page.goto(`/index.php/${t}/en/login`);
            r.rememberDefaultChecked = await B.page.locator('form#login input[name="remember"]').isChecked();
            if (!rememberB) await B.page.locator('form#login input[name="remember"]').setChecked(false);
            await B.page.locator('form#login input[name="username"]').fill(user);
            await B.page.locator('form#login input[name="password"]').evaluate((el) => el.removeAttribute('maxlength'));
            await B.page.locator('form#login input[name="password"]').fill(user + user);
            await B.page.locator('form#login button[type="submit"]').click();
            await B.page.waitForURL((u) => !u.pathname.includes('/login'), {timeout: 15000, waitUntil: 'commit'});
            r.bCookies = await cookieNames(B.context);
            const pb = new ProfilePage(B.page, t);
            await pb.goto('contact');
            r.sessionsBefore = sessions(user);

            const pa = new ProfilePage(A.page, t);
            await pa.goto('contact');
            await pa.country().selectOption({label: 'Canada'});
            await pa.email().fill(`${user}new@mail.test`);
            await pa.save();
            await pa.pendingEmailNotice().waitFor({timeout: 15000});
            r.pendingShown = true;
            r.sessionsAfter = sessions(user);

            // B presses "Identity"
            const tabResponses = [];
            const onResp = (resp) => { if (/profile|identity/i.test(resp.url())) tabResponses.push({url: resp.url().replace(/^https?:\/\/[^/]+/, ''), status: resp.status()}); };
            B.page.on('response', onResp);
            await pb.tabLink('identity').click();
            await B.page.waitForTimeout(6000);
            B.page.off('response', onResp);
            r.identityFormCount = await B.page.locator('form#identityForm').count();
            r.identityTabResponses = tabResponses;
            r.identityTabPanelText = (await B.page.locator('#profileTabs').innerText().catch(() => '')).slice(0, 300);
            // B loads the profile in full
            r.bFullLoad = await landing(B.page, `/index.php/${t}/en/user/profile`);
            r.bCookiesAfter = await cookieNames(B.context);
            // A still signed in
            r.aFullLoad = await landing(A.page, `/index.php/${t}/en/user/profile`);
        } catch (e) {
            r.error = String(e && e.message || e).slice(0, 600);
        } finally {
            await A.close();
            await B.close();
        }
        out[key] = r;
    };
    await runS1(ua, true, 's1');
    await runS1(uc, false, 's1ctl');

    // ---------- S2: remember ticked, the session cookie lost ----------
    {
        const C = await launch(app);
        const r = {};
        try {
            await signIn(C.page, ur, {contextPath: t});
            r.cookies = await cookieNames(C.context);
            r.withSession = await landing(C.page, `/index.php/${t}/en/user/profile`);
            const all = await C.context.cookies();
            const sid = all.find((c) => /SID$/i.test(c.name));
            const rem = all.find((c) => /^remember_/.test(c.name));
            r.sessionCookie = sid && sid.name;
            r.rememberCookie = rem && rem.name;
            // the browser closed with session_expire_on_close (or the session aged out): only the session cookie goes
            await C.context.clearCookies({name: sid.name});
            r.cookiesAfterDrop = await cookieNames(C.context);
            r.afterDropProfile = await landing(C.page, `/index.php/${t}/en/user/profile`);
            r.afterDropDashboard = await landing(C.page, `/index.php/${t}/en/submissions`);
        } catch (e) {
            r.error = String(e && e.message || e).slice(0, 600);
        } finally {
            await C.close();
        }
        out.s2 = r;
    }
    out.serverLog = log.since(from);
    record('s1s2', out);
    note(`rr12780 ${app.name}: s1 identityForm=${out.s1.identityFormCount} full=${out.s1.bFullLoad && out.s1.bFullLoad.url}; s2 afterDrop=${out.s2.afterDropProfile && out.s2.afterDropProfile.url}`);
});
