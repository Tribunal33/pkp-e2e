// U01 claim check J15 (housekeeping 2026-10-15, second session, incidentals row L9): what a
// back-office page left open in browser B shows once B's session has ended some other way than a
// profile change (U03 A25/A26 own that case): Rule 5a (back after the session ended), Rule 6
// (signing out ends only this browser's session) and Rule 18 (sessions end from the outside; "the
// user's next click then lands on the Login page").
//
// PKP's default dataset, the manager `rvaca`. B holds two pages: Settings › Website › "Plugins"
// (the legacy "Installed Plugins" list, its "Search") and Settings › Users & Roles (the "Users"
// list's search: a Vue list on the API on `main`, the legacy grid on 3.5).
// Modes, one after the other in one process per app (MODES=alive-p,logout-p narrows):
//   alive   control: nothing ends B's session
//   logout  browser A signs in as the same user and presses "Logout" in its user menu (Rule 6)
//   cookie  B's own cookies deleted (what a browser close does under session_expire_on_close)
//   idle    every session's last activity moved back 8 days (the 7-day idle limit; Rule 5a)
//   expire  the admin, in browser C, presses Administration › "Expire User Sessions" (Rule 18)
// Suffix -p: presses Plugins Search, Plugins Search, Users search, Users search, Plugins Search;
// suffix -u: the same with the Users search first. Then B presses a side-menu link (the "next
// click") and reloads the Users page. Every dialog of B's pages is answered OK and kept by phase.
//
// Run (dataset fleet 6; one app per call):
//   PROBE_FEATURE=issues-kc2 PKP_E2E_DATASET=6 PROBE_AGENT=kc2 PROBE_RUN=r1 \
//     bin/app-lock.sh shared ojs -- node bin/probe.js ojs shared/playwright/checks/U01/J15/j15.js
//   (stable-3_5_0: PKP_E2E_LINE=stable-3_5_0 PROBE_FEATURE=issues-kc2-3_5, PROBE_RUN=s1)
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, note, sql} = require('../../../probe');

const USER = 'rvaca';
const MODES = (process.env.MODES || 'alive-p,logout-p,cookie-p,cookie-u,idle-p,idle-u,expire-p,expire-u').split(',');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const strip = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '').slice(0, 220);
const pages = (f) => require(path.join(__dirname, '../../../pages', f));

/** screen() + PNG, bounded: a page whose script is stuck still gets its reads. */
async function snap(page, name, ms = 10000) {
    let s = null;
    try {
        s = await Promise.race([screen(page), sleep(ms).then(() => null)]);
    } catch (e) {
        s = {error: flat(String(e), 200)};
    }
    if (!s) {
        const main = page.locator('main').first();
        s = {url: page.url(), unsettled: true,
            aria: {main: await main.ariaSnapshot({timeout: 3000}).catch(() => null)},
            text: {main: await main.innerText({timeout: 3000}).catch(() => null)}};
    }
    record(name, s);
    await shot(page, name).catch(() => {});
    return s.unsettled ? `${name} (unsettled read)` : name;
}

/** Every dialog, page error, console error and call/login response of a context, by phase. */
function watchContext(context) {
    const w = {phase: 'before', dialogs: [], errors: [], responses: []};
    const hook = (page) => {
        page.on('dialog', (d) => {
            w.dialogs.push({phase: w.phase, type: d.type(), message: d.message(), page: strip(page.url())});
            d.accept().catch(() => {});
        });
        page.on('pageerror', (e) => w.errors.push({phase: w.phase, kind: 'pageerror', text: flat(e.message || String(e), 300)}));
        page.on('console', (m) => { if (m.type() === 'error') w.errors.push({phase: w.phase, kind: 'console', text: flat(m.text(), 300)}); });
    };
    context.pages().forEach(hook);
    context.on('page', hook);
    context.on('response', (res) => {
        const u = res.url();
        if (!/\$\$\$call\$\$\$|\/api\/v1\/|\/login|\/management\/|\/dashboard|\/submissions/.test(u) || /\.(js|css|png|svg|woff2?)(\?|$)/.test(u)) return;
        const r = res.request();
        const e = {phase: w.phase, method: r.method(), url: strip(u), status: res.status(),
            type: (res.headers()['content-type'] || '').slice(0, 40)};
        if (res.status() >= 300 && res.status() < 400) e.location = strip(res.headers().location);
        w.responses.push(e);
        // what a refused call says (the page shows none of it, or only as an alert)
        if (res.status() >= 400 || /\$\$\$call\$\$\$/.test(u)) {
            res.text().then((t) => { e.body = flat(t, 200); }).catch(() => {});
        }
    });
    return w;
}

/** One press in B: the phase's dialogs, responses and errors, then what the page shows. */
async function press(w, name, page, fn, ms = 4500) {
    w.phase = name;
    const d0 = w.dialogs.length, e0 = w.errors.length, r0 = w.responses.length;
    let error = null;
    try {
        await page.bringToFront();
        await fn();
    } catch (e) {
        error = flat(String(e), 200);
    }
    await sleep(ms);
    return {press: name, error,
        dialogs: w.dialogs.slice(d0).map((d) => `${d.type}: ${d.message}`),
        responses: w.responses.slice(r0).map((r) => `${r.method} ${r.status} ${r.url}${r.location ? ' -> ' + r.location : ''} [${r.type}]${r.body && r.status >= 400 ? ' ' + r.body : ''}${r.body && r.status < 400 && /"status":false/.test(r.body) ? ' ' + r.body : ''}`),
        errors: w.errors.slice(e0).map((e) => `${e.kind}: ${e.text}`)};
}

/** The Users & Roles search, whichever list the line has (the kind read once, on load). */
function usersList(page) {
    const vueBox = page.getByRole('searchbox', {name: /Enter a user's name/});
    const grid = page.locator('[id^="component-grid-settings-user-usergrid"]').first();
    const modal = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'OK', exact: true})}).last();
    let kind = null;
    return {
        vueBox, grid,
        async kind() {
            if (await vueBox.count()) kind = 'vue';
            else if (await grid.count()) kind = 'grid';
            else kind = 'none';
            return kind;
        },
        /** The open message window, if any (text), dismissed with its OK as a person would. */
        async dismiss() {
            if (!(await modal.isVisible().catch(() => false))) return null;
            const text = flat(await modal.innerText().catch(() => ''), 200);
            await modal.getByRole('button', {name: 'OK', exact: true}).click({timeout: 5000}).catch(() => {});
            await sleep(600);
            return text;
        },
        async search(text) {
            if (kind === 'vue') {
                await vueBox.fill(text, {timeout: 5000});
                await vueBox.press('Enter');
                return;
            }
            const form = grid.locator('form.filter').first();
            const box = form.locator('input[name="search"]');
            if (!(await box.isVisible())) {
                await grid.locator('.header .actions a').filter({hasText: 'Search'}).first().click({timeout: 5000});
            }
            await box.fill(text, {timeout: 5000});
            await form.getByRole('button', {name: 'Search', exact: true}).click({timeout: 5000});
        },
        async state() {
            const body = page.locator('main').first();
            return {
                url: strip(page.url()),
                loginForm: await page.locator('form#login').count().catch(() => null),
                modal: await modal.isVisible().catch(() => false) ? flat(await modal.innerText().catch(() => ''), 200) : null,
                rows: await (kind === 'vue'
                    ? page.locator('table').filter({hasText: 'START DATE'}).locator('tbody tr').count().catch(() => null)
                    : grid.locator('tr.gridRow').count().catch(() => null)),
                heading: flat(await page.locator('main h3, main h4').filter({hasText: /Current Users|Users/}).first().innerText({timeout: 1000}).catch(() => null), 60),
                boxValue: kind === 'vue' ? await vueBox.inputValue({timeout: 1000}).catch(() => null) : null,
                spinner: await body.locator('.pkpSpinner:visible, .pkp_spinner:visible').count().catch(() => null),
                main: flat(await body.innerText({timeout: 2000}).catch(() => null), 300),
            };
        },
    };
}

forEachApp(async (app) => {
    const T = app.contextPath;
    const {WebsitePluginsPage} = pages('PluginsPages.js');
    const line = app.line || 'main';
    const result = {app: app.name, line, modes: {}};
    for (const mode of MODES) {
        const [how, order] = mode.split('-');
        const out = {mode};
        result.modes[mode] = out;
        const B = await launch(app);
        let A = null, C = null;
        try {
            const w = watchContext(B.context);
            // B: signed in; page 1 Plugins, page 2 Users & Roles
            await signIn(B.page, USER, {contextPath: T});
            out.bCookies = (await B.context.cookies()).map((c) => `${c.name}${c.expires > 0 ? '' : ' (session)'}`);
            const plugins = new WebsitePluginsPage(B.page, T);
            await plugins.goto();
            out.pluginsBefore = {rows: await B.page.locator('tr.gridRow').count()};
            await snap(B.page, `j15-${mode}-B-plugins-before`);
            const p2 = await B.context.newPage();
            await p2.goto(app.url(`/index.php/${T}/en/management/settings/access`));
            await p2.waitForLoadState('networkidle', {timeout: 20000}).catch(() => {});
            const users = usersList(p2);
            out.usersKind = await users.kind();
            out.usersBefore = await users.state();
            await snap(p2, `j15-${mode}-B-users-before`);

            // the end of B's session
            w.phase = `end-${how}`;
            if (how === 'logout') {
                A = await launch(app);
                await signIn(A.page, USER, {contextPath: T});
                await A.page.goto(app.url(`/index.php/${T}/en/management/settings/website`));
                const nav = A.page.locator('header [data-cy="app-user-nav"] button').first();
                let via = 'menu';
                try {
                    await nav.click({timeout: 8000});
                    const link = A.page.locator('nav[aria-label="User Navigation"]').first().getByRole('link', {name: 'Logout', exact: true});
                    out.aLogoutHref = strip(await link.getAttribute('href', {timeout: 5000}));
                    await Promise.all([A.page.waitForURL(/\/login/, {timeout: 15000}), link.click({timeout: 5000})]);
                } catch (e) {
                    via = `address (${flat(String(e), 120)})`;
                    await A.page.goto(app.url(`/index.php/${T}/en/login/signOut`));
                }
                out.aLogout = {via, url: strip(A.page.url()), loginForm: await A.page.locator('form#login').count(),
                    username: await A.page.locator('form#login input[name="username"]').inputValue().catch(() => null)};
                await snap(A.page, `j15-${mode}-A-after-logout`);
            } else if (how === 'cookie') {
                await B.context.clearCookies();
                out.cookiesAfter = (await B.context.cookies()).map((c) => c.name);
            } else if (how === 'idle') {
                out.idle = sql(app, `UPDATE sessions SET last_activity = last_activity - ${8 * 86400}; SELECT count(*) FROM sessions`);
            } else if (how === 'expire') {
                C = await launch(app);
                await signIn(C.page, 'admin', {password: 'admin'});
                await C.page.goto(app.url('/index.php/index/en/admin'));
                const btn = C.page.getByRole('button', {name: 'Expire User Sessions', exact: true});
                const asked = [];
                C.page.on('dialog', (d) => { asked.push(`${d.type()}: ${d.message()}`); d.accept().catch(() => {}); });
                await Promise.all([C.page.waitForURL(/\/login/, {timeout: 20000}).catch(() => {}), btn.click({timeout: 8000})]);
                await sleep(1000);
                out.expire = {asked, url: strip(C.page.url()), sessionsLeft: sql(app, 'SELECT count(*) FROM sessions')};
                await snap(C.page, `j15-${mode}-C-after-expire`);
            }

            // B's presses
            let pn = 0, un = 0;
            const pPress = () => press(w, `plugins-search-${++pn}`, B.page, async () => {
                await plugins.list.openFilter().catch(() => {});
                await plugins.list.nameBox.fill(`u01j15${pn}`, {timeout: 5000});
                await plugins.list.filterButton.click({timeout: 5000});
            });
            const uPress = async () => {
                const dismissed = await users.dismiss();
                const r = await press(w, `users-search-${++un}`, p2, () => users.search(`u01j15${un}`));
                r.dismissedFirst = dismissed;
                return r;
            };
            const seq = order === 'u' ? [uPress, uPress, pPress, pPress, uPress] : [pPress, pPress, uPress, uPress, pPress];
            out.steps = [];
            for (const fn of seq) {
                const s = await fn();
                const onPlugins = s.press.startsWith('plugins');
                const pg = onPlugins ? B.page : p2;
                s.state = onPlugins
                    ? {url: strip(B.page.url()), loginForm: await B.page.locator('form#login').count().catch(() => null),
                        filterVisible: await plugins.list.filterForm.isVisible().catch(() => null),
                        rows: await B.page.locator('tr.gridRow').count().catch(() => null),
                        spinner: await B.page.locator('main .pkp_spinner:visible').count().catch(() => null),
                        main: flat(await B.page.locator('main').first().innerText({timeout: 2000}).catch(() => null), 200)}
                    : await users.state();
                s.snap = await snap(pg, `j15-${mode}-B-${s.press}`, 6000);
                out.steps.push(s);
            }

            // the next click: a side-menu link on the Plugins page; then the Users page reloaded
            const navClick = await press(w, 'nav-click', B.page, async () => {
                const link = B.page.locator('nav#app-nav a[href*="/management/settings/access"], nav a[href*="/management/settings/access"]').first();
                if (await link.count()) {
                    await Promise.all([B.page.waitForNavigation({timeout: 15000}).catch(() => {}), link.click({timeout: 5000})]);
                } else {
                    await B.page.goto(app.url(`/index.php/${T}/en/management/settings/access`));
                }
            }, 1500);
            navClick.state = {url: strip(B.page.url()), loginForm: await B.page.locator('form#login').count(),
                username: await B.page.locator('form#login input[name="username"]').inputValue().catch(() => null)};
            navClick.snap = await snap(B.page, `j15-${mode}-B-nav-click`);
            out.navClick = navClick;
            const reload = await press(w, 'reload', p2, () => p2.reload({timeout: 15000}), 1500);
            reload.state = {url: strip(p2.url()), loginForm: await p2.locator('form#login').count()};
            out.reload = reload;
            out.allDialogs = w.dialogs;
            out.allErrors = w.errors;
        } catch (e) {
            out.error = flat(String(e), 500);
        } finally {
            if (A) await A.close();
            if (C) await C.close();
            await B.close();
        }
        record('j15', {[mode]: out}, {merge: true});
    }
    const brief = {};
    for (const [m, o] of Object.entries(result.modes)) {
        brief[m] = {error: o.error, usersKind: o.usersKind, aLogout: o.aLogout, expire: o.expire && {asked: o.expire.asked, url: o.expire.url},
            steps: (o.steps || []).map((s) => ({press: s.press, dialogs: s.dialogs, errors: s.errors.slice(0, 2),
                calls: s.responses.slice(0, 3), login: s.state && s.state.loginForm, modal: s.state && s.state.modal, dismissedFirst: s.dismissedFirst, rows: s.state && s.state.rows,
                spinner: s.state && s.state.spinner})),
            nav: o.navClick && o.navClick.state, navDialogs: o.navClick && o.navClick.dialogs, reload: o.reload && o.reload.state};
    }
    console.log(JSON.stringify({app: app.name, line, modes: brief}, null, 1));
    if (app.name === 'ojs' && line === 'main' && process.env.PROBE_RUN === 'r1') {
        note('J15 · a page left open after its session ended: read B\'s pages with a bounded screen() (Promise.race) and answer dialogs with a context-wide page.on(\'dialog\'); Users & Roles on main is the Vue list (searchbox "Enter a user\'s name", GET api/v1/users), on 3.5 the legacy grid [id^=component-grid-settings-user-usergrid].');
    }
});
