// U54 claim check I29 (housekeeping incidentals, row 10): what an account
// whose only role is a created "Reviewer"-level role meets after sign-in and
// on the dashboards, on a preprint server (OPS2's level) with journal and
// press controls, beside installed-role accounts; and, read in passing, the
// "Roles" list order (the U54 S3 flake diagnosis, A13).
//
// Run: PROBE_FEATURE=U54 PROBE_AGENT=ccI29 RUN=r1 node bin/probe.js <ojs|omp|ops> shared/playwright/checks/U54/I29/i29.js
//   (one app per process: about 3-4 minutes each; three apps outlast a 10-minute cap).
//   RUN names the facts file (facts-<RUN>-<app>.json); every run seeds its own
//   scratch context, so two runs are two independent reads.
// Accounts (scratch context, tag u54i29): `cr` holds only the created
// Reviewer-level role "I29 Referee" (OJS/OMP: its review box(es) ticked; OPS:
// no box, the level has none there); `ca` an installed Author plus that role;
// `au` an installed Author; `xr` {OJS OMP}
// an installed External Reviewer; `m` a manager, who only reads "Roles".
// publicknowledge and the roster are not touched.
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, tag} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

forEachApp(async (app) => {
    const isOPS = app.name === 'ops';
    const isOMP = app.name === 'omp';
    const facts = {app: app.name, run: RUN};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };

    // ---- seed ---------------------------------------------------------------
    const t = tag('u54i29');
    const stages = isOPS ? undefined : (isOMP ? ['internalReview', 'review'] : ['review']);
    const customRoles = [{key: 'crev', level: 'reviewer', name: 'I29 Referee', abbrev: 'I29R', ...(stages ? {stages} : {})}];
    const U = (k, roles, g) => ({username: `${t}${k}`, roles, givenName: g, familyName: 'Ieight'});
    const users = [U('cr', ['crev'], 'Cree'), U('ca', ['author', 'crev'], 'Cara'), U('au', ['author'], 'Auda'), U('m', ['manager'], 'Mana')];
    if (!isOPS) users.push(U('xr', ['externalReviewer'], 'Xera'));
    const res = await app.api.createContext({tag: t, context: {name: `U54 I29 ${t}`}, customRoles, users});
    fact('seed', {ctx: t, customRoles: res.customRoles, users: users.map((u) => `${u.username}:${u.roles}`)});

    const {page, close} = await launch(app);
    // Per-visit capture of API traffic, console errors and page errors.
    let cur = null;
    page.on('response', (r) => {
        if (!cur) return;
        const u = r.url();
        if (/\/api\/v1\//.test(u) || r.status() >= 400) cur.api.push(`${r.request().method()} ${r.status()} ${rel(u).replace(`/index.php/${t}`, '~')}`);
    });
    page.on('console', (m) => {
        if (cur && (m.type() === 'error' || m.type() === 'warning')) cur.console.push(`${m.type()}: ${flat(m.text(), 160)}`);
    });
    page.on('pageerror', (e) => {
        if (cur) cur.pageerror.push(flat(e.message, 200));
    });
    page.on('dialog', async (d) => {
        if (cur) cur.dialogs.push(`${d.type()}: ${flat(d.message(), 120)}`);
        if (d.type() === 'beforeunload') await d.accept().catch(() => {});
        else await d.dismiss().catch(() => {});
    });
    const begin = () => (cur = {api: [], console: [], pageerror: [], dialogs: []});

    async function sideNav() {
        return page.evaluate(() => {
            const nav = document.querySelector('nav') || document.body;
            const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
            return [...nav.querySelectorAll('a, button')].map((a) => `${vis(a) ? '' : '(hidden) '}${(a.innerText || a.textContent || '').trim().replace(/\s+/g, ' ')}${a.getAttribute('href') ? ` -> ${a.getAttribute('href').replace(/^https?:\/\/[^/]+/, '')}` : ''}`)
                .filter((x) => x.replace('(hidden) ', '').length);
        }).catch(() => null);
    }
    async function mainControls() {
        return page.evaluate(() => {
            const m = document.querySelector('main') || document.body;
            const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
            return [...m.querySelectorAll('button, a, input, select')].filter(vis)
                .map((e) => `${e.tagName.toLowerCase()}${e.type ? `[${e.type}]` : ''}: ${(e.innerText || e.value || e.getAttribute('aria-label') || e.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 60)}`);
        }).catch(() => null);
    }
    async function snap(name) {
        await idle(page).catch(() => {});
        await sleep(400);
        const s = await screen(page);
        record(`${RUN}-${name}`, s);
        await shot(page, `${RUN}-${name}`).catch(() => {});
        return s;
    }
    // Land an address, record the screen and what it asked for.
    async function visit(name, url) {
        begin();
        let status = null;
        try {
            const r = await page.goto(url);
            status = r ? r.status() : null;
        } catch (e) {
            status = `ERR ${flat(e.message, 100)}`;
        }
        const s = await snap(name);
        const out = {
            snap: `${RUN}-${name}-${app.name}`, status, final: rel(page.url()).replace(`/index.php/${t}`, '~'),
            title: await page.title().catch(() => null),
            dialog: flat(s.text && s.text.dialog, 200),
            main: flat(s.text && s.text.main, 500),
            nav: await sideNav(),
            controls: await mainControls(),
            ...cur,
        };
        cur = null;
        return out;
    }

    try {
        // ---- each account: sign in (where it lands), then every dashboard by address
        const who = [['cr', `${t}cr`], ['ca', `${t}ca`], ['au', `${t}au`]];
        if (!isOPS) who.push(['xr', `${t}xr`]);
        for (const [k, user] of who) {
            const out = {};
            begin();
            try {
                await signIn(page, user, {contextPath: t});
                await page.waitForLoadState('load').catch(() => {});
            } catch (e) {
                cur.signInError = flat(e.message, 160);
            }
            const s = await snap(`${k}-landing`);
            out.landing = {snap: `${RUN}-${k}-landing-${app.name}`, final: rel(page.url()).replace(`/index.php/${t}`, '~'), title: await page.title().catch(() => null),
                dialog: flat(s.text && s.text.dialog, 200), main: flat(s.text && s.text.main, 500), nav: await sideNav(), controls: await mainControls(), ...cur};
            cur = null;
            for (const [v, p] of [['dash', 'dashboard'], ['editorial', 'dashboard/editorial'], ['reviewAssignments', 'dashboard/reviewAssignments'],
                ['mySubmissions', 'dashboard/mySubmissions'], ['submissions', 'submissions']]) {
                out[v] = await visit(`${k}-${v}`, app.url(`/index.php/${t}/${p}`));
            }
            // Sweep, on the landing page: an "Error" window over it is answered
            // with its own "OK" and what is left is read; "Filters" is pressed
            // and closed; the side menu's group header is pressed.
            await signIn(page, user, {contextPath: t}).catch(() => {});
            await page.waitForLoadState('load').catch(() => {});
            await idle(page).catch(() => {});
            out.sweep = {};
            const landingUrl = page.url();
            const errWin = page.getByRole('dialog').filter({hasText: 'The current role does not have access'});
            if (await errWin.count()) {
                begin();
                await errWin.getByRole('button', {name: 'OK', exact: true}).click({timeout: 8000}).catch((e) => cur.console.push(`ok failed: ${flat(e.message, 80)}`));
                await sleep(800);
                const s3 = await snap(`${k}-after-ok`);
                out.sweep.afterOk = {final: rel(page.url()).replace(`/index.php/${t}`, '~'), dialog: flat(s3.text && s3.text.dialog, 200), main: flat(s3.text && s3.text.main, 300),
                    heading: flat(await page.locator('main h1, main h2').first().innerText().catch(() => null), 100), controls: await mainControls(), api: cur.api, console: cur.console};
                cur = null;
            }
            const filters = page.locator('main').getByRole('button', {name: 'Filters', exact: true});
            if (await filters.count()) {
                begin();
                await filters.first().click({timeout: 8000}).catch((e) => cur.console.push(`filters failed: ${flat(e.message, 80)}`));
                await sleep(800);
                const s4 = await snap(`${k}-filters`);
                out.sweep.filters = {dialog: flat(s4.text && s4.text.dialog, 600), api: cur.api, console: cur.console, pageerror: cur.pageerror};
                cur = null;
                // "Apply Filters" pressed as the window opened (nothing changed).
                begin();
                await page.getByRole('dialog', {name: 'Filters'}).getByRole('button', {name: 'Apply Filters', exact: true}).click({timeout: 8000})
                    .catch((e) => cur.console.push(`apply failed: ${flat(e.message, 80)}`));
                await sleep(1000);
                const s5 = await snap(`${k}-filters-applied`);
                out.sweep.applied = {dialog: flat(s5.text && s5.text.dialog, 200), main: flat(s5.text && s5.text.main, 200), api: cur.api, console: cur.console, pageerror: cur.pageerror};
                cur = null;
                await page.goto(landingUrl).catch(() => {});
                await idle(page).catch(() => {});
            }
            const groupHead = page.locator('nav').getByRole('button').filter({hasText: /My Assignments as Reviewer|My Submissions as Author/});
            out.sweep.groups = [];
            for (const g of await groupHead.all()) {
                begin();
                const name = flat(await g.innerText().catch(() => ''), 60);
                const before = await g.getAttribute('aria-expanded').catch(() => null);
                await g.click({timeout: 5000}).catch((e) => cur.console.push(`group failed: ${flat(e.message, 80)}`));
                await sleep(600);
                out.sweep.groups.push({name, before, after: await g.getAttribute('aria-expanded').catch(() => null), nav: await sideNav(), final: rel(page.url()).replace(`/index.php/${t}`, '~'), console: cur.console});
                cur = null;
            }
            // Every side-menu entry with an address inside the context, pressed.
            const entries = await page.evaluate(() => [...(document.querySelector('nav') || document.body).querySelectorAll('a[href]')]
                .filter((a) => !!(a.offsetWidth || a.offsetHeight || a.getClientRects().length))
                .map((a) => ({text: (a.innerText || '').trim().replace(/\s+/g, ' '), href: a.getAttribute('href')}))).catch(() => []);
            out.menuPressed = [];
            for (const e of entries.filter((x) => x.text && /\/index\.php\//.test(x.href) && !/signOut|\/login/.test(x.href)).slice(0, 8)) {
                const ew = page.getByRole('dialog').filter({hasText: 'The current role does not have access'});
                if (await ew.count()) await ew.getByRole('button', {name: 'OK', exact: true}).click({timeout: 5000}).catch(() => {});
                await sleep(300);
                begin();
                await page.getByRole('link', {name: e.text, exact: true}).first().click({timeout: 5000}).catch((err) => cur.console.push(`click failed: ${flat(err.message, 80)}`));
                await page.waitForLoadState('load').catch(() => {});
                const s2 = await snap(`${k}-menu-${e.text.replace(/[^A-Za-z]/g, '').slice(0, 20)}`);
                out.menuPressed.push({entry: e.text, href: rel(e.href).replace(`/index.php/${t}`, '~'), final: rel(page.url()).replace(`/index.php/${t}`, '~'),
                    main: flat(s2.text && s2.text.main, 300), api: cur.api, console: cur.console, pageerror: cur.pageerror});
                cur = null;
            }
            fact(`account ${k}`, out);
            await signOut(page).catch(() => {});
        }

        // ---- the manager reads "Roles": where the created role sits
        await signIn(page, `${t}m`, {contextPath: t});
        begin();
        await page.goto(app.url(`/index.php/${t}/en/management/settings/access`));
        await idle(page).catch(() => {});
        await page.locator('#roles-button').first().click();
        await page.locator('#roleGridContainer tr.gridRow').first().waitFor({timeout: 20000}).catch(() => {});
        await snap('m-roles');
        const rows = await page.locator('#roleGridContainer tr.gridRow').evaluateAll((els) => els.map((e) => (e.querySelector('td') || e).innerText.trim().replace(/\s+/g, ' ').slice(0, 50)));
        fact('roles list', {rows, createdAt: rows.findIndex((r) => /I29 Referee/.test(r)), api: cur.api.filter((x) => !/ 200 /.test(x)), console: cur.console});
        cur = null;
        await signOut(page).catch(() => {});
    } finally {
        record(`facts-${RUN}`, facts);
        await close();
    }
});
