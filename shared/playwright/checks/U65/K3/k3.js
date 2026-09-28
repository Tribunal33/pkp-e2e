// U65 claim check K3: Statistics › "Users" — getting in (Actors rows "Open
// Editorial Activity and Users" for "Users", "Export the journal's users"),
// the page (Fields: "Users", the "Export to Excel/CSV" window, the exported
// file), Rules 14–17 (the counts, who is left out, the export window,
// exporting), register A6, A7, and the unticked-export claim the check
// did not reproduce (deleted from the spec).
//
// Run: PROBE_FEATURE=U65 PROBE_AGENT=ccK3 node bin/probe.js all shared/playwright/checks/U65/K3/k3.js [seed]
//   `seed` forces fresh scratch contexts; without it the contexts recorded in
//   .reports/U65/<agent>/state-<app>.json are reused. PHASES=access,signedout,
//   side,rows,pk,roles,window,td8,exportB,exportSE,leave,moment picks a subset
//   (moment mutates context B through the screens: run it last).
// Two scratch contexts per app: A is the td7 journal (a manager, two editors,
// a section editor, a guest editor {OJS}, a disabled author, an account whose
// only role has ended); B holds one account per default role, a two-role
// account, a custom role, a disabled manager, an account with an ended
// manager-level role. publicknowledge is only read.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const T = 30000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FRESH = process.argv.includes('seed');
const ALL = ['access', 'signedout', 'side', 'rows', 'pk', 'roles', 'window', 'td8', 'exportB', 'exportSE', 'leave', 'moment'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

// Context B: one account per default role key of the app.
const KEYS = {
    ojs: ['manager', 'editor', 'productionEditor', 'sectionEditor', 'guestEditor', 'copyeditor', 'designer', 'funding', 'indexer', 'layoutEditor',
        'marketing', 'proofreader', 'author', 'translator', 'externalReviewer', 'reader', 'subscriptionManager', 'editorialBoardMember'],
    omp: ['manager', 'editor', 'productionEditor', 'sectionEditor', 'copyeditor', 'designer', 'funding', 'indexer', 'layoutEditor', 'marketing',
        'proofreader', 'author', 'volumeEditor', 'chapterAuthor', 'translator', 'internalReviewer', 'externalReviewer', 'reader', 'editorialBoardMember'],
    ops: ['manager', 'sectionEditor', 'author', 'reader', 'editorialBoardMember'],
};
// The roles signed in as for the access rows (one per permission level, plus
// the named statistics roles).
const ACCESS = {
    ojs: ['manager', 'editor', 'productionEditor', 'sectionEditor', 'guestEditor', 'copyeditor', 'author', 'externalReviewer', 'reader', 'subscriptionManager'],
    omp: ['manager', 'editor', 'productionEditor', 'sectionEditor', 'copyeditor', 'author', 'externalReviewer', 'internalReviewer', 'reader'],
    ops: ['manager', 'sectionEditor', 'editorialBoardMember', 'author', 'reader', 'crev'],
};
// Short username suffixes (usernames are varchar(32)).
const SHORT = {manager: 'mgr', editor: 'ed', productionEditor: 'pe', sectionEditor: 'se', guestEditor: 'ge', copyeditor: 'ce', designer: 'de',
    funding: 'fu', indexer: 'ix', layoutEditor: 'le', marketing: 'mk', proofreader: 'pr', author: 'au', translator: 'tr', externalReviewer: 'xr',
    internalReviewer: 'ir', reader: 'rd', subscriptionManager: 'sm', editorialBoardMember: 'eb', volumeEditor: 've', chapterAuthor: 'ca'};
const short = (k) => SHORT[k] || k.toLowerCase();
const LEVEL = {1: 'siteAdmin', 16: 'manager', 17: 'subEditor', 4097: 'assistant', 65536: 'author', 4096: 'reviewer', 1048576: 'reader', 2097152: 'subscriptionManager'};

function dbName(app) {
    const config = fs.readFileSync(path.join(path.resolve(REPO, app.root || path.join('checkouts', app.name)), 'config.test.inc.php'), 'utf8');
    return config.match(/\[database\][\s\S]*?\nname = (\S+)/)[1];
}
// Read-only reads of what the app stored; never a write.
function psql(app, sql) {
    const out = execFileSync('psql', ['-h', '127.0.0.1', '-U', 'e2e', dbName(app), '-AtF', '\t', '-c', sql], {env: {...process.env, PGPASSWORD: 'e2e'}, encoding: 'utf8'});
    return out.trim() === '' ? [] : out.trim().split('\n').map((line) => line.split('\t'));
}

const stateFile = (app) => path.join(outDir(), `state-${app.name}.json`);
function loadState(app) {
    if (FRESH) return null;
    try {
        return JSON.parse(fs.readFileSync(stateFile(app), 'utf8'));
    } catch {
        return null;
    }
}
const saveState = (app, s) => fs.writeFileSync(stateFile(app), JSON.stringify(s, null, 2));

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOPS = app.name === 'ops';
    const facts = {app: app.name};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1800)}`);
    };
    async function step(name, fn) {
        try {
            return await fn();
        } catch (e) {
            const msg = String((e && e.message) || e).split('\n').slice(0, 4).join(' | ');
            fact(`ERR ${name}`, msg);
            return {error: msg};
        }
    }

    // ---- seeding ------------------------------------------------------------
    async function seed() {
        const S = {};
        const A = tag('u65k3a');
        const ua = [{username: `${A}mgr`, givenName: 'MGR', familyName: 'Kthree', roles: ['manager']}];
        if (!isOPS) ua.push({username: `${A}ed1`, givenName: 'EDONE', familyName: 'Kthree', roles: ['editor']}, {username: `${A}ed2`, givenName: 'EDTWO', familyName: 'Kthree', roles: ['editor']});
        ua.push({username: `${A}se`, givenName: 'SE', familyName: 'Kthree', roles: ['sectionEditor']});
        if (isOJS) ua.push({username: `${A}ge`, givenName: 'GE', familyName: 'Kthree', roles: ['guestEditor']});
        ua.push({username: `${A}dis`, givenName: 'DIS', familyName: 'Kthree', roles: ['author'], disabled: true});
        ua.push({username: `${A}end`, givenName: 'END', familyName: 'Kthree', roles: [], pastRoles: [{role: 'reader'}]});
        await app.api.createContext({tag: A, users: ua});
        S.A = {path: A, users: ua.map((u) => u.username)};
        saveState(app, S);

        const B = tag('u65k3b');
        const custom = isOPS
            ? [{key: 'crev', level: 'reviewer', name: 'K3 Referee', abbrev: 'KTR'}]
            : [{key: 'casst', level: 'assistant', name: 'K3 Checker', abbrev: 'KTC'}];
        const ub = KEYS[app.name].map((k) => ({username: `${B}${short(k)}`, givenName: k.toUpperCase().slice(0, 12), familyName: 'Kthree', roles: [k]}));
        ub.push({username: `${B}dual`, givenName: 'DUAL', familyName: 'Kthree', roles: ['sectionEditor', 'author']});
        ub.push({username: `${B}cust`, givenName: 'CUST', familyName: 'Kthree', roles: [custom[0].key]});
        if (isOPS) ub.push({username: `${B}crev`, givenName: 'CREV', familyName: 'Kthree', roles: ['crev']});
        ub.push({username: `${B}dmgr`, givenName: 'DMGR', familyName: 'Kthree', roles: ['manager'], disabled: true});
        ub.push({username: `${B}pmgr`, givenName: 'PMGR', familyName: 'Kthree', roles: ['author'], pastRoles: [{role: 'manager'}]});
        ub.push({username: `${B}tmpd`, givenName: 'TMPD', familyName: 'Kthree', roles: ['reader']});
        ub.push({username: `${B}tmpr`, givenName: 'TMPR', familyName: 'Kthree', roles: ['author']});
        await app.api.createContext({tag: B, customRoles: custom, users: ub});
        S.B = {path: B, users: ub.map((u) => u.username), seed: ub};
        S.A.seed = ua;
        saveState(app, S);
        return S;
    }

    let S = loadState(app);
    if (!S || on('seed')) S = await seed();
    const A = S.A.path;
    const B = S.B.path;
    const u = (ctx, k) => `${ctx}${short(k)}`;

    // What the database holds (read-only): groups of the context with their
    // level, and each account's current groups there.
    function dbView(ctx) {
        const cid = psql(app, `select journal_id from journals where path='${ctx}'`.replace(/journal_id|journals/g, (m) => ({ojs: m, omp: m === 'journal_id' ? 'press_id' : 'presses', ops: m === 'journal_id' ? 'server_id' : 'servers'})[app.name]))[0][0];
        const groups = psql(app, `select g.user_group_id, g.role_id, s.setting_value from user_groups g left join user_group_settings s on s.user_group_id=g.user_group_id and s.setting_name='name' and s.locale='en' where g.context_id=${cid} order by g.user_group_id`);
        const members = psql(app, `select u.username, u.disabled, g.role_id, uug.user_group_id, coalesce(uug.date_start::text,''), coalesce(uug.date_end::text,'') from user_user_groups uug join user_groups g on g.user_group_id=uug.user_group_id join users u on u.user_id=uug.user_id where g.context_id=${cid} order by u.username`);
        return {cid, groups, members};
    }
    // The rule as the spec states it (Rule 14/15): accounts with a current role, not disabled, per level.
    function expected(view) {
        const now = new Date();
        const cur = view.members.filter((m) => m[1] !== '1' && m[1] !== 't' && (!m[4] || new Date(m[4]) <= now) && (!m[5] || new Date(m[5]) > now));
        const all = new Set(cur.map((m) => m[0]));
        const per = {};
        for (const m of cur) (per[LEVEL[m[2]] || m[2]] = per[LEVEL[m[2]] || m[2]] || new Set()).add(m[0]);
        return {all: all.size, ...Object.fromEntries(Object.entries(per).map(([k, v]) => [k, v.size]))};
    }

    // ---- reading the page ---------------------------------------------------
    async function snap(page, name) {
        await idle(page).catch(() => {});
        const s = await screen(page);
        record(name, s);
        await shot(page, name).catch(() => {});
        return s;
    }
    async function visit(page, name, url) {
        let status = null;
        try {
            const r = await page.goto(url);
            status = r ? r.status() : null;
        } catch (e) {
            status = `ERR ${flat(e.message, 120)}`;
        }
        await idle(page).catch(() => {});
        await sleep(300);
        const s = await snap(page, name);
        const h1 = await page.locator('main h1, h1').first().innerText().catch(() => null);
        return {snap: `${name}-${app.name}`, status, final: rel(page.url()), title: await page.title().catch(() => null), h1: flat(h1, 120), head: flat((s.text && s.text.main) || '', 300)};
    }
    const usersTable = (page) => page.getByRole('table', {name: 'Registered users'});
    async function readUsers(page) {
        const t = usersTable(page);
        if (!(await t.count())) return null;
        const header = (await t.locator('thead th, [role=columnheader]').allInnerTexts()).map((x) => flat(x, 60));
        const rows = [];
        for (const r of await t.locator('tbody tr').all()) rows.push((await r.locator('td, th').allInnerTexts()).map((x) => flat(x, 80)));
        return {header, rows, map: Object.fromEntries(rows.map((r) => [r[0], Number(r[1])]))};
    }
    async function openUsers(page, ctx, name) {
        const v = await visit(page, name, app.url(`/index.php/${ctx}/stats/users`));
        v.table = await readUsers(page);
        return v;
    }
    async function sideNav(page) {
        return page.evaluate(() => {
            const nav = document.querySelector('nav') || document.body;
            const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
            return [...nav.querySelectorAll('a, button')].map((a) => `${vis(a) ? '' : '(hidden) '}${(a.innerText || a.textContent || '').trim().replace(/\s+/g, ' ')}${a.getAttribute('href') ? ` -> ${a.getAttribute('href').replace(/^https?:\/\/[^/]+/, '')}` : ''}`);
        }).catch(() => null);
    }

    // The export window.
    const exportButton = (page) => page.locator('main').getByRole('button', {name: 'Export', exact: true}).first();
    const win = (page) => page.getByRole('dialog', {name: 'Export to Excel/CSV'});
    async function openWindow(page) {
        await exportButton(page).click();
        await win(page).waitFor({timeout: T});
        await idle(page);
        await win(page).getByRole('checkbox').first().waitFor({timeout: T}).catch(() => {});
        await sleep(300);
    }
    async function readWindow(page) {
        const d = win(page);
        if (!(await d.count()) || !(await d.isVisible().catch(() => false))) return {open: false};
        return {
            open: true,
            text: flat(await d.innerText().catch(() => ''), 1500),
            boxes: await d.getByRole('checkbox').evaluateAll((els) => els.map((e) => {
                const lab = e.closest('label') || document.querySelector(`label[for="${e.id}"]`);
                return {label: (lab ? lab.innerText : e.value).trim(), value: e.value, checked: e.checked, disabled: e.disabled};
            })),
            buttons: (await d.getByRole('button').allInnerTexts()).map((x) => flat(x, 60)),
            links: (await d.getByRole('link').allInnerTexts()).map((x) => flat(x, 60)),
            legend: flat(await d.locator('legend, .pkpFormFieldLabel').first().innerText().catch(() => null), 100),
        };
    }
    async function setBoxes(page, keep) {
        // keep: a predicate on the label; every other box is unticked
        const boxes = win(page).getByRole('checkbox');
        const n = await boxes.count();
        for (let i = 0; i < n; i++) {
            const b = boxes.nth(i);
            const label = await b.evaluate((e) => ((e.closest('label') || {}).innerText || '').trim());
            const want = keep(label);
            if ((await b.isChecked()) !== want) await b.click();
        }
        await sleep(300);
    }
    // Press the window's "Export" and take the download (or its absence).
    async function doExport(page, name) {
        const reqs = [];
        const onResp = async (r) => {
            if (/stats\/users|users\/report/.test(r.url())) reqs.push({m: r.request().method(), s: r.status(), url: rel(r.url()), cd: r.headers()['content-disposition'] || null, ct: r.headers()['content-type'] || null});
        };
        page.on('response', onResp);
        const dl = page.waitForEvent('download', {timeout: 15000}).catch(() => null);
        await win(page).getByRole('button', {name: 'Export', exact: true}).click();
        const d = await dl;
        await sleep(1500);
        page.off('response', onResp);
        const out = {requests: reqs, windowAfter: (await readWindow(page)).open, url: rel(page.url())};
        if (d) {
            out.file = d.suggestedFilename();
            const p = path.join(outDir(), `${name}-${app.name}.csv`);
            await d.saveAs(p);
            const raw = fs.readFileSync(p);
            out.bom = raw.slice(0, 3).toString('hex');
            const lines = raw.toString('utf8').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.length);
            out.header = lines[0];
            out.lines = lines.slice(1);
            out.saved = path.basename(p);
        } else {
            out.file = null;
        }
        await snap(page, `${name}-after`);
        return out;
    }
    const csvRow = (line) => {
        const out = [];
        let cur = '';
        let q = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (q) {
                if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c;
            } else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
        }
        out.push(cur);
        return out;
    };
    // The file as data: header, and per email the role columns reading "Yes".
    function fileView(x) {
        if (!x || !x.header) return x;
        const h = csvRow(x.header);
        const rows = x.lines.map(csvRow);
        return {
            file: x.file, bom: x.bom, header: h, count: rows.length,
            people: rows.map((r) => `${r[3]} [${h.slice(9).filter((_, i) => r[9 + i] === 'Yes').join('|')}] reg=${r[7]} upd=${r[8]} phone=${r[4]} country=${r[5]}`),
            windowAfter: x.windowAfter, requests: x.requests, saved: x.saved,
        };
    }

    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message(), at: Date.now()});
        if (d.type() === 'beforeunload') await d.accept().catch(() => {});
        else await d.dismiss().catch(() => {});
    });
    try {
        fact('state', {A, B});
        // =====================================================================
        // Actors: one account per permission level signs in and opens "Users"
        // by its address; the side menu's Statistics entries are read.
        if (on('access')) {
            const out = {};
            const who = [...ACCESS[app.name].map((k) => [k, B, u(B, k)]), ['endedOnly', A, u(A, 'end')], ['admin', B, 'admin']];
            for (const [k, ctx, user] of who) {
                out[k] = await step(`access ${k}`, async () => {
                    await signIn(page, user, {contextPath: ctx});
                    await page.goto(app.url(`/index.php/${ctx}/submissions`)).catch(() => {});
                    await idle(page).catch(() => {});
                    const nav = (await sideNav(page)) || [];
                    const o = {navStats: nav.filter((t) => /stats\/|Statistics|Reports|Users/.test(t))};
                    o.users = await openUsers(page, ctx, `acc-${k}-users`);
                    o.users.table = o.users.table && o.users.table.rows;
                    // The address the export sends the browser to, typed.
                    const ex = await visit(page, `acc-${k}-export-address`, app.url(`/index.php/${ctx}/api/v1/users/report`)).catch((e) => ({error: flat(e.message, 200)}));
                    o.exportAddress = {status: ex.status, final: ex.final, head: flat(ex.head, 160)};
                    return o;
                });
                fact(`access ${k}`, out[k]);
            }
            await signOut(page).catch(() => {});
        }

        if (on('signedout')) {
            await signOut(page).catch(() => {});
            fact('signed out', await step('so users', () => visit(page, 'so-users', app.url(`/index.php/${A}/stats/users`))));
        }

        // The side menu's "Statistics" › "Users" pressed, as the manager and the section editor.
        if (on('side')) {
            for (const k of ['mgr', 'se']) {
                await step(`side ${k}`, async () => {
                    await signIn(page, u(A, k), {contextPath: A});
                    await page.goto(app.url(`/index.php/${A}/submissions`));
                    await idle(page);
                    const group = page.locator('nav').getByRole('button', {name: 'Statistics', exact: true}).or(page.locator('nav').getByText('Statistics', {exact: true})).first();
                    const link = page.locator('nav').getByRole('link', {name: 'Users', exact: true});
                    await loc(page, 'Side menu: Statistics › Users (all links named Users)', link);
                    const statsUsers = page.locator('nav a[href*="stats/users"]');
                    if (!(await statsUsers.first().isVisible().catch(() => false))) await group.click().catch(() => {});
                    await sleep(500);
                    const name = await statsUsers.first().innerText().catch(() => null);
                    await statsUsers.first().click();
                    await page.waitForURL(/stats\/users/, {timeout: T}).catch(() => {});
                    await idle(page);
                    const s = await snap(page, `side-${k}-users`);
                    fact(`side ${k}`, {linkText: flat(name, 60), landed: rel(page.url()), title: s.title, table: (await readUsers(page) || {}).rows});
                });
            }
        }

        // =====================================================================
        // The page and the counts (Fields "Users", Rules 14–15, A6, A7).
        if (on('rows')) {
            await step('rows', async () => {
                await signIn(page, u(A, 'mgr'), {contextPath: A});
                const va = await openUsers(page, A, 'rows-a');
                const geo = await page.evaluate(() => {
                    const h = document.querySelector('#usersTableLabel');
                    const b = [...document.querySelectorAll('main button')].find((x) => x.innerText.trim() === 'Export');
                    const r = (e) => (e ? (({x, y, width, height}) => ({x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height)}))(e.getBoundingClientRect()) : null);
                    return {heading: r(h), headingTag: h && h.tagName, exportButton: r(b), main: r(document.querySelector('main'))};
                });
                const controls = await page.locator('main').evaluate((m) => [...m.querySelectorAll('a, button, input, select, [role=button], [tabindex]')].map((e) => `${e.tagName}:${(e.innerText || e.value || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 60)}`));
                await loc(page, 'Users: the "Registered users" table', usersTable(page));
                await loc(page, 'Users: the "Export" button', exportButton(page));
                await loc(page, 'Users: heading "Registered users"', page.getByRole('heading', {name: 'Registered users'}));
                fact('rows A', {title: va.title, h1: va.h1, table: va.table, geo, controls});
                fact('rows A db', dbView(A));
                fact('rows A expected (rule as stated)', expected(dbView(A)));
                const vb = await openUsers(page, B, 'rows-b-as-a-mgr');
                fact('rows B as A manager (other journal)', {final: vb.final, h1: vb.h1, table: vb.table && vb.table.map});
                await signIn(page, u(B, 'manager'), {contextPath: B});
                const vb2 = await openUsers(page, B, 'rows-b');
                fact('rows B', vb2.table);
                const db = dbView(B);
                fact('rows B db groups', db.groups);
                fact('rows B db members', db.members.map((m) => m.join(' ')));
                fact('rows B expected (rule as stated)', expected(db));
                // Reload: the same counts (no date range, no filter).
                await page.reload();
                await idle(page);
                fact('rows B reload', (await readUsers(page)).map);
                // A as the administrator (the one account counted "Site Administrator" would be).
                await signIn(page, 'admin', {contextPath: A});
                const vad = await openUsers(page, A, 'rows-a-admin');
                fact('rows A as admin', vad.table && vad.table.map);
                await signIn(page, u(A, 'se'), {contextPath: A});
                const vse = await openUsers(page, A, 'rows-a-se');
                fact('rows A as section editor', vse.table && vse.table.map);
            });
        }

        // publicknowledge, read only: the Site Administrator row there.
        if (on('pk')) {
            await step('pk', async () => {
                await signIn(page, 'manager.maya', {contextPath: app.contextPath});
                const v = await openUsers(page, app.contextPath, 'pk-users');
                fact('publicknowledge Users (manager.maya)', v.table && v.table.map);
                await signIn(page, 'admin', {contextPath: app.contextPath});
                const v2 = await openUsers(page, app.contextPath, 'pk-users-admin');
                fact('publicknowledge Users (admin)', v2.table && v2.table.map);
            });
        }

        // The Roles tab of Settings › Users & Roles: role names and levels (for the boxes' names).
        if (on('roles')) {
            await step('roles', async () => {
                await signIn(page, u(B, 'manager'), {contextPath: B});
                await page.goto(app.url(`/index.php/${B}/management/settings/access`));
                await idle(page);
                const tab = page.getByRole('tab', {name: 'Roles', exact: true});
                await tab.click();
                await idle(page);
                await sleep(1500);
                const s = await snap(page, 'roles-tab');
                const rows = await page.locator('[role=tabpanel]:visible tbody tr, [role=tabpanel]:visible .gridRow').allInnerTexts().catch(() => []);
                fact('Roles tab rows', rows.map((x) => flat(x, 120)).filter(Boolean));
                fact('Roles tab text head', flat(s.text.main, 1500));
            });
        }

        // =====================================================================
        // The export window (Rule 16; Fields; td8 first half) and its Close.
        if (on('window')) {
            await step('window', async () => {
                await signIn(page, u(A, 'mgr'), {contextPath: A});
                await openUsers(page, A, 'win-page');
                await openWindow(page);
                const s = await snap(page, 'win-open');
                await loc(page, 'Export window: dialog by name', win(page));
                await loc(page, 'Export window: its checkboxes', win(page).getByRole('checkbox'));
                await loc(page, 'Export window: its Export button', win(page).getByRole('button', {name: 'Export', exact: true}));
                await loc(page, 'Export window: its Close button', win(page).getByRole('button', {name: /Close/}));
                const w = await readWindow(page);
                fact('window open', {...w, aria: s.aria.dialogs});
                const geo = await win(page).evaluate((d) => {
                    const r = d.getBoundingClientRect();
                    return {x: Math.round(r.x), w: Math.round(r.width), vw: window.innerWidth};
                }).catch(() => null);
                fact('window geometry', geo);
                // Close with the boxes as opened: nothing downloaded.
                const dl = page.waitForEvent('download', {timeout: 4000}).then(() => true).catch(() => false);
                await win(page).getByRole('button', {name: /Close/}).first().click();
                const got = await dl;
                await sleep(600);
                fact('Close (unchanged)', {download: got, windowOpen: (await readWindow(page)).open});
                // Change the boxes, Close, reopen: what the window keeps.
                await sleep(600);
                await openWindow(page);
                await setBoxes(page, (l) => /Author/.test(l));
                const changed = (await readWindow(page)).boxes.filter((b) => b.checked).map((b) => b.label);
                const dl2 = page.waitForEvent('download', {timeout: 4000}).then(() => true).catch(() => false);
                await win(page).getByRole('button', {name: /Close/}).first().click();
                const got2 = await dl2;
                await sleep(800);
                await openWindow(page);
                const re = await readWindow(page);
                await snap(page, 'win-reopened-after-close');
                fact('Close (changed) then reopen', {tickedBeforeClose: changed, download: got2, dialogs: dialogs.slice(-3), reopenedTicked: re.boxes.filter((b) => b.checked).map((b) => b.label), reopenedCount: re.boxes.length});
                // The keyboard: Escape.
                await page.keyboard.press('Escape');
                await sleep(800);
                fact('Escape', {windowOpen: (await readWindow(page)).open});
                // Reload: the window's ticks after a fresh page.
                await page.reload();
                await idle(page);
                await openWindow(page);
                const rl = await readWindow(page);
                fact('after reload', {ticked: rl.boxes.filter((b) => b.checked).length, of: rl.boxes.length});
                await win(page).getByRole('button', {name: /Close/}).first().click();
            });
        }

        // td8: untick all but the Section Editor role, Export; reopen; untick all, Export.
        if (on('td8')) {
            await step('td8', async () => {
                await signIn(page, u(A, 'mgr'), {contextPath: A});
                await openUsers(page, A, 'td8-page');
                await openWindow(page);
                const all = await readWindow(page);
                const seName = all.boxes.map((b) => b.label).find((l) => /^(Section editor|Series editor|Moderator)$/i.test(l));
                // Every box as opened.
                const x0 = fileView(await doExport(page, 'td8-all'));
                fact('td8 all ticked', x0);
                await sleep(800);
                await openWindow(page);
                const r0 = await readWindow(page);
                fact('td8 reopened after an all-ticked export', {ticked: r0.boxes.filter((b) => b.checked).length, of: r0.boxes.length});
                await setBoxes(page, (l) => l === seName);
                const x1 = fileView(await doExport(page, 'td8-se-only'));
                fact('td8 section editor only', {seName, ...x1});
                await sleep(800);
                await openWindow(page);
                const r1 = await readWindow(page);
                await snap(page, 'td8-reopened');
                fact('td8 reopened after the export', {ticked: r1.boxes.filter((b) => b.checked).map((b) => b.label)});
                await setBoxes(page, () => false);
                await snap(page, 'td8-none-ticked');
                const x2 = fileView(await doExport(page, 'td8-none'));
                fact('td8 none ticked', x2);
                const after = await readWindow(page);
                fact('td8 after none', {windowOpen: after.open, text: after.open ? after.text : null});
            });
        }

        // Context B: the file with every box; each account once; disabled/ended; custom role column.
        if (on('exportB')) {
            await step('exportB', async () => {
                await signIn(page, u(B, 'manager'), {contextPath: B});
                await openUsers(page, B, 'expb-page');
                await openWindow(page);
                const w = await readWindow(page);
                fact('B window boxes', w.boxes.map((b) => `${b.checked ? '[x]' : '[ ]'} ${b.label}`));
                const x = fileView(await doExport(page, 'expb-all'));
                fact('B all ticked', x);
                // Two boxes of the two-role account ticked, nothing else: listed once?
                await sleep(800);
                await openWindow(page);
                const se = w.boxes.map((b) => b.label).find((l) => /^(Section editor|Series editor|Moderator)$/i.test(l));
                await setBoxes(page, (l) => l === se || l === 'Author');
                const y = fileView(await doExport(page, 'expb-se-author'));
                fact('B section editor + author ticked', y);
                // A manager-level box only: the disabled manager and the ended manager left out?
                await sleep(800);
                await openWindow(page);
                const mgrBox = w.boxes.map((b) => b.label).find((l) => /manager/i.test(l) && !/subscription/i.test(l));
                await setBoxes(page, (l) => l === mgrBox);
                const z = fileView(await doExport(page, 'expb-manager'));
                fact('B manager box only', {mgrBox, ...z});
            });
        }

        // A non-manager statistics role exports (Actors row 2): the section editor (and guest editor on OJS).
        if (on('exportSE')) {
            for (const k of isOJS ? ['se', 'ge'] : ['se']) {
                await step(`export ${k}`, async () => {
                    await signIn(page, u(A, k), {contextPath: A});
                    await openUsers(page, A, `exp-${k}-page`);
                    await openWindow(page);
                    const w = await readWindow(page);
                    const x = fileView(await doExport(page, `exp-${k}-all`));
                    fact(`export as ${k}`, {boxes: w.boxes.length, ticked: w.boxes.filter((b) => b.checked).length, ...x});
                });
            }
        }

        // Leaving the page with the window open and boxes changed.
        if (on('leave')) {
            await step('leave', async () => {
                await signIn(page, u(A, 'mgr'), {contextPath: A});
                await openUsers(page, A, 'leave-page');
                await openWindow(page);
                await setBoxes(page, (l) => /Reader/.test(l));
                const t0 = Date.now();
                await page.goto(app.url(`/index.php/${A}/stats/editorial`)).catch((e) => fact('leave goto error', flat(e.message, 200)));
                await idle(page);
                await sleep(500);
                fact('leave with the window open, boxes changed', {landed: rel(page.url()), dialogs: dialogs.filter((d) => d.at >= t0)});
                await page.goBack().catch(() => {});
                await idle(page);
                await sleep(500);
                const s = await snap(page, 'leave-back');
                fact('back', {url: rel(page.url()), dialogOpen: (await readWindow(page)).open, h1: flat(s.text.main, 100)});
            });
        }

        // =====================================================================
        // Rule 15, through the screens: a page open while an account is
        // disabled and another removed on Settings › Users & Roles, then reloaded.
        if (on('moment')) {
            await step('moment', async () => {
                await signIn(page, u(B, 'manager'), {contextPath: B});
                await openUsers(page, B, 'moment-before');
                const before = (await readUsers(page)).map;
                const page2 = await page.context().newPage();
                page2.on('dialog', (d) => d.accept().catch(() => {}));
                await page2.goto(app.url(`/index.php/${B}/management/settings/access`));
                const table = page2.getByRole('table', {name: /Current Users \(/});
                await table.locator('tbody tr').first().waitFor({timeout: T});
                await idle(page2);
                const press = async (email, item) => {
                    // The list pages (a press's B list runs past one page): search the account first.
                    const box = page2.getByRole('searchbox').first();
                    await box.fill(email);
                    await box.press('Enter');
                    await table.locator('tbody tr').filter({hasText: email}).first().waitFor({timeout: T});
                    await idle(page2);
                    const row = table.locator('tbody tr').filter({hasText: email}).first();
                    await row.locator('button').last().click();
                    const mi = page2.getByRole('menuitem', {name: item, exact: true});
                    await mi.waitFor({timeout: 10000});
                    await mi.click();
                };
                // Disable TMPD (reader), unless an earlier run already did.
                const already = psql(app, `select disabled from users where username='${u(B, 'tmpd')}'`)[0][0] === '1';
                fact('moment: TMPD already disabled by an earlier run', already);
                if (!already) {
                    await press(`${u(B, 'tmpd')}@mail.test`, 'Disable User');
                    await page2.locator('#userDisableForm').waitFor({timeout: T});
                    await idle(page2);
                    await page2.locator('#userDisableForm').getByRole('button', {name: 'OK', exact: true}).click();
                    await sleep(2000);
                    await idle(page2);
                }
                // Remove TMPR (author) from the journal.
                await sleep(800);
                await press(`${u(B, 'tmpr')}@mail.test`, 'Remove User');
                const conf = page2.getByRole('dialog').last();
                await conf.waitFor({timeout: T});
                await conf.getByRole('button', {name: 'OK', exact: true}).click();
                await sleep(2000);
                await idle(page2);
                await snap(page2, 'moment-access-after');
                const rowsAfter = await table.locator('tbody tr').filter({hasText: /tmp[dr]@/}).allInnerTexts().catch(() => []);
                fact('Users & Roles rows after', rowsAfter.map((x) => flat(x, 200)));
                await page2.close();
                await page.bringToFront();
                await sleep(500);
                const stale = (await readUsers(page)).map;
                await page.reload();
                await idle(page);
                const s = await snap(page, 'moment-after-reload');
                const fresh = (await readUsers(page)).map;
                fact('moment', {before, withoutReload: stale, afterReload: fresh, title: s.title});
                fact('moment db', dbView(B).members.filter((m) => /tmp/.test(m[0])).map((m) => m.join(' ')));
                fact('moment expected (rule as stated)', expected(dbView(B)));
                // The file now: the two accounts?
                await openWindow(page);
                const x = fileView(await doExport(page, 'moment-all'));
                fact('moment file', {count: x.count, tmp: (x.people || []).filter((p) => /tmp/.test(p))});
            });
        }
    } finally {
        record('facts', facts, {merge: true});
        await close();
    }
});
