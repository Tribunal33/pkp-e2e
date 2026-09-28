// U65 claim check K1: "Editorial Activity" — getting in (Purpose, Actors &
// permissions: the statistics roles, the access-denied page, signed out,
// whole-journal figures, current roles), the page and its parts (Fields:
// headings, chart, "Trends", columns, rows, information icons), Rules 1–5
// (the page, the chart, the date range, "Filters", the table), Rules 11–12
// (the icons on hover and from the keyboard, the sub-rows' indent: the old sub-row claim, not reproduced and
// deleted from the spec), A5,
// OPS1.
//
// Run: PROBE_FEATURE=U65 PROBE_AGENT=ccK1 node bin/probe.js all shared/playwright/checks/U65/K1/k1.js [seed]
//   `seed` forces fresh scratch contexts; without it the contexts recorded in
//   .reports/U65/<agent>/state-<app>.json are reused. PHASES=access,signedout,
//   page,icons,keyboard,spinner,presets,custom,leave,filters,bare,open,
//   versions,inactive,mail,side picks a subset (inactive and versions mutate
//   the main context: run them last).
// Scratch contexts only; publicknowledge is read (its Users list, for the
// administrator's roles) and never changed.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const T = 30000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const iso = (d) => d.toISOString().slice(0, 10);
const ago = (n) => iso(new Date(Date.now() - n * 86400000));
const FRESH = process.argv.includes('seed');
const ALL = ['access', 'signedout', 'side', 'page', 'icons', 'keyboard', 'spinner', 'presets', 'custom', 'leave', 'filters', 'bare', 'open', 'mail', 'versions', 'verpub', 'inactive'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

const ROLES = {
    ojs: {mgr: 'manager', ed: 'editor', pe: 'productionEditor', se: 'sectionEditor', sx: 'sectionEditor', ge: 'guestEditor',
        ce: 'copyeditor', au: 'author', rv: 'externalReviewer', rd: 'reader', sm: 'subscriptionManager'},
    omp: {mgr: 'manager', ed: 'editor', pe: 'productionEditor', se: 'sectionEditor', sx: 'sectionEditor',
        ce: 'copyeditor', au: 'author', ve: 'volumeEditor', rv: 'externalReviewer', ir: 'internalReviewer', rd: 'reader'},
    ops: {mgr: 'manager', se: 'sectionEditor', sx: 'sectionEditor', eb: 'editorialBoardMember', au: 'author', rd: 'reader'},
};
const STATS = ['mgr', 'ed', 'pe', 'se', 'sx', 'ge', 'admin'];
const SECTIONS = {ojs: [{abbrev: 'ART', title: 'Articles'}, {abbrev: 'REV', title: 'Reviews'}], ops: [{abbrev: 'PRE', title: 'Preprints'}, {abbrev: 'NOTE', title: 'Notes'}]};
const SERIES = [{path: 'alpha', title: 'Alpha Series'}, {path: 'beta', title: 'Beta Series'}];

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
const saveState = (app, s) => {
    fs.mkdirSync(path.dirname(stateFile(app)), {recursive: true});
    fs.writeFileSync(stateFile(app), JSON.stringify(s, null, 2));
};

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const facts = {app: app.name, today: ago(0)};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
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
    const secA = isOMP ? SERIES[0] : SECTIONS[app.name] ? SECTIONS[app.name][0] : null;
    const secB = isOMP ? SERIES[1] : SECTIONS[app.name][1];
    const place = (s) => (isOMP ? {series: s.path} : {section: s.abbrev});
    const deskDecline = isOPS ? 'decline' : 'initialDecline';

    // ---- seeding ------------------------------------------------------------
    async function seed() {
        const S = {};
        // main: two sections (series), one account per role, the chart's
        // stages filled, and every kind the chart leaves out.
        const M = tag('u65k1m');
        const roles = ROLES[app.name];
        const users = Object.entries(roles).map(([k, r]) => {
            const u = {username: `${M}${k}`, givenName: k.toUpperCase(), familyName: 'Kone', roles: [r]};
            if (k === 'se') u[isOMP ? 'series' : 'sections'] = [isOMP ? secA.path : secA.abbrev];
            return u;
        });
        users.push({username: `${M}ended`, givenName: 'ENDED', familyName: 'Kone', roles: ['author'], pastRoles: [{role: 'sectionEditor'}]});
        const body = {tag: M, users};
        if (isOMP) body.series = SERIES;
        else body.sections = SECTIONS[app.name];
        if (isOJS) body.issues = [{volume: 1, number: 1, year: 2026, published: true}, {volume: 1, number: 2, year: 2026, published: false}];
        await app.api.createContext(body);
        S.main = {path: M, users: Object.fromEntries([...Object.keys(roles), 'ended'].map((k) => [k, `${M}${k}`])), subs: {}};
        saveState(app, S);
        const sub = async (key, spec) => {
            try {
                const r = await app.api.createSubmission({tag: `${M}${key}`, context: M, submitter: `${M}au`, title: `K1 ${key}`, ...spec});
                S.main.subs[key] = {id: r.submissionId, publicationId: r.publicationId, stageId: r.stageId};
            } catch (e) {
                S.main.subs[key] = {error: flat(e.message, 500)};
            }
            saveState(app, S);
        };
        const future = iso(new Date(Date.now() + 30 * 86400000));
        await sub('s1', {...place(secA), participants: [{username: `${M}se`, role: 'sectionEditor'}]});
        await sub('s2', place(secB));
        await sub('old1', {...place(secA), dateSubmitted: ago(200)});
        if (!isOPS) {
            await sub('r1', {...place(secA), decisions: ['sendExternalReview']});
            await sub('c1', {...place(secB), decisions: ['sendExternalReview', 'accept']});
            await sub('p1', {...place(secA), decisions: ['sendExternalReview', 'accept', 'sendToProduction']});
        }
        if (isOMP) await sub('i1', {...place(secB), decisions: ['sendInternalReview']});
        await sub('d1', {...place(secA), decisions: [deskDecline]});
        await sub('pub1', {...place(secA), published: true, datePublished: ago(5), dateSubmitted: ago(10), ...(isOJS ? {issue: {volume: 1, number: 1, year: 2026}} : {})});
        await sub('sch1', {...place(secB), published: true, ...(isOJS ? {issue: {volume: 1, number: 2, year: 2026}} : {datePublished: future})});
        await sub('dr1', {...place(secA), submitted: false});
        await sub('im1', {...place(secB), published: true, datePublished: ago(365), ...(isOJS ? {issue: {volume: 1, number: 1, year: 2026}} : {})});
        await sub('v1', {...place(secA), published: true, dateSubmitted: ago(20), datePublished: ago(15), ...(isOJS ? {issue: {volume: 1, number: 1, year: 2026}} : {})});
        // bare: a context as created (one section; a press with no series), no submission.
        const B = tag('u65k1b');
        await app.api.createContext({tag: B, users: [{username: `${B}mgr`, roles: ['manager']}, {username: `${B}au`, roles: ['author']}]});
        S.bare = {path: B, users: {mgr: `${B}mgr`, au: `${B}au`}, subs: {}};
        saveState(app, S);
        return S;
    }

    let S = loadState(app);
    if (!S || on('seed')) S = await seed();
    const M = S.main.path;
    const U = S.main.users;
    const stored = Object.fromEntries(
        Object.entries(S.main.subs).map(([k, s]) => [k, s.id ? psql(app, `select status, stage_id, submission_progress, date_submitted, current_publication_id from submissions where submission_id=${s.id}`)[0] : s]),
    );
    fact('seeds stored (status, stage, progress, dateSubmitted, currentPub)', stored);

    // ---- reading the page ---------------------------------------------------
    async function snap(page, name) {
        await idle(page).catch(() => {});
        const s = await screen(page);
        record(name, s);
        await shot(page, name).catch(() => {});
        return s;
    }
    async function readTrends(page) {
        const table = page.getByRole('table', {name: 'Trends'});
        if (!(await table.count())) return null;
        const header = (await table.locator('thead th').allInnerTexts()).map((s) => s.trim());
        const rows = [];
        for (const r of await table.locator('tbody tr').all()) {
            const cells = await r.locator('td, th').allInnerTexts();
            rows.push([cells[0].split('\n')[0].replace(/[  ]/g, ' ').trim(), ...cells.slice(1).map((s) => s.replace(/\s+/g, ' ').trim())]);
        }
        return {header, rows};
    }
    function readChart(s) {
        const aria = s.aria.main || '';
        const m = aria.match(/heading "(\d+) Active Submissions"/);
        const line = (aria.match(/heading "\d+ Active Submissions"[^\n]*\n\s*- text: ([^\n]*)/) || [])[1] || null;
        return m ? {total: Number(m[1]), stages: line} : null;
    }
    async function trends(page, name) {
        const s = await snap(page, name);
        return {snap: `${name}-${app.name}`, chart: readChart(s), trends: await readTrends(page)};
    }
    const statsCall = (page) => page.waitForResponse((r) => /\/api\/v1\/stats\/editorial(\?|$)/.test(r.url()) && r.request().method() === 'GET', {timeout: T});
    async function openEA(page, ctx, name) {
        const resp = await page.goto(app.url(`/index.php/${ctx}/stats/editorial`));
        await idle(page);
        await page.getByRole('table', {name: 'Trends'}).waitFor({timeout: T}).catch(() => {});
        await sleep(300);
        const out = await trends(page, name);
        out.status = resp ? resp.status() : null;
        out.title = await page.title();
        return out;
    }
    async function sideNav(page) {
        return page.evaluate(() => {
            const nav = document.querySelector('nav') || document.body;
            const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
            return [...nav.querySelectorAll('a, button')].map((a) => `${vis(a) ? '' : '(hidden) '}${(a.innerText || a.textContent || '').trim().replace(/\s+/g, ' ')}${a.getAttribute('href') ? ` -> ${a.getAttribute('href').replace(/^https?:\/\/[^/]+/, '')}` : ''}${a.getAttribute('aria-expanded') ? ` [expanded=${a.getAttribute('aria-expanded')}]` : ''}`);
        }).catch(() => null);
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
        return {status, final: rel(page.url()), title: await page.title().catch(() => null), h1: flat(h1, 120), head: flat((s.text && s.text.main) || '', 300)};
    }

    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message(), at: Date.now()});
        if (d.type() === 'beforeunload') await d.accept().catch(() => {});
        else await d.dismiss().catch(() => {});
    });
    try {
        // =====================================================================
        // Actors: every role's side menu and the two pages by address.
        if (on('access')) {
            const out = {};
            const who = [...Object.keys(ROLES[app.name]), 'ended', 'admin'];
            for (const k of who) {
                out[k] = await step(`access ${k}`, async () => {
                    const user = k === 'admin' ? 'admin' : U[k];
                    await signIn(page, user, {contextPath: M});
                    const o = {landing: await visit(page, `acc-${k}-landing`, app.url(`/index.php/${M}/submissions`))};
                    const nav = (await sideNav(page)) || [];
                    o.navStats = nav.filter((t) => /stats\/|Statistics|Reports/.test(t));
                    o.editorial = await visit(page, `acc-${k}-editorial`, app.url(`/index.php/${M}/stats/editorial`));
                    if (/stats\/editorial/.test(o.editorial.final)) {
                        await page.getByRole('table', {name: 'Trends'}).waitFor({timeout: T}).catch(() => {});
                        const t = await trends(page, `acc-${k}-editorial-read`);
                        o.chart = t.chart;
                        o.rows = t.trends && t.trends.rows;
                    }
                    o.users = await visit(page, `acc-${k}-users`, app.url(`/index.php/${M}/stats/users`));
                    return o;
                });
                fact(`access ${k}`, out[k]);
            }
            const mg = JSON.stringify(out.mgr && out.mgr.rows);
            fact('access: figures equal to the manager\'s', Object.fromEntries(Object.entries(out).filter(([, v]) => v && v.rows).map(([k, v]) => [k, JSON.stringify(v.rows) === mg && JSON.stringify(v.chart) === JSON.stringify(out.mgr.chart)])));
            await signOut(page).catch(() => {});
        }

        // Signed out: both pages by address.
        if (on('signedout')) {
            await signOut(page).catch(() => {});
            fact('signed out', {
                editorial: await step('so editorial', () => visit(page, 'so-editorial', app.url(`/index.php/${M}/stats/editorial`))),
                users: await step('so users', () => visit(page, 'so-users', app.url(`/index.php/${M}/stats/users`))),
            });
        }

        // The side menu's "Statistics" group, pressed; the administrator's roles
        // on the Users list of the scratch context and of publicknowledge.
        if (on('side')) {
            await step('side', async () => {
                for (const k of ['mgr', 'se']) {
                    await signIn(page, U[k], {contextPath: M});
                    await visit(page, `side-${k}-landing`, app.url(`/index.php/${M}/submissions`));
                    const group = page.locator('nav').getByRole('button', {name: 'Statistics', exact: true}).or(page.locator('nav').getByText('Statistics', {exact: true})).first();
                    await loc(page, 'Side menu: the Statistics group', group);
                    const before = await sideNav(page);
                    const link = page.locator('nav').getByRole('link', {name: 'Editorial Activity', exact: true}).first();
                    if (!(await link.isVisible().catch(() => false))) await group.click().catch(() => {});
                    await sleep(500);
                    const opened = await sideNav(page);
                    await loc(page, 'Side menu: Editorial Activity', link);
                    await link.click();
                    await page.waitForURL(/stats\/editorial/, {timeout: T}).catch(() => {});
                    await idle(page);
                    const s = await snap(page, `side-${k}-editorial`);
                    fact(`side ${k}`, {before: (before || []).filter((t) => /Statistic|stats|Report/.test(t)), opened: (opened || []).filter((t) => /Statistic|stats|Report/.test(t)), landed: rel(page.url()), chart: readChart(s)});
                }
                await signIn(page, U.mgr, {contextPath: M});
                const v = await visit(page, 'side-mgr-users-roles', app.url(`/index.php/${M}/management/settings/access`));
                await sleep(1500);
                const adminRow = await page.locator('tr').filter({hasText: /admin admin|admin@/}).allInnerTexts().catch(() => []);
                fact('admin on the scratch Users list', {final: v.final, rows: adminRow.map((x) => flat(x, 300))});
                await signIn(page, 'admin');
                await visit(page, 'side-pk-users-roles', app.url('/index.php/publicknowledge/management/settings/access'));
                await sleep(1500);
                const pkRow = await page.locator('tr').filter({hasText: /admin admin|admin@/}).allInnerTexts().catch(() => []);
                fact('admin on the publicknowledge Users list', pkRow.map((x) => flat(x, 300)));
            });
        }

        // =====================================================================
        // The page as the manager: headings (td1), the chart, "Trends", columns,
        // rows, icons, indent (td5), a sweep of every control.
        if (on('page')) {
            await step('page', async () => {
                await signIn(page, U.mgr, {contextPath: M});
                const t = await openEA(page, M, 'page-open');
                fact('page open', t);
                const d = await page.evaluate(() => {
                    const main = document.querySelector('main') || document.body;
                    const r = (e) => {
                        const b = e.getBoundingClientRect();
                        return {x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height)};
                    };
                    const shown = (e) => {
                        const cs = getComputedStyle(e);
                        const b = e.getBoundingClientRect();
                        return cs.display !== 'none' && cs.visibility !== 'hidden' && b.width > 1 && b.height > 1 && cs.clip !== 'rect(0px, 0px, 0px, 0px)' && !/rect\(0/.test(cs.clip) && cs.clipPath === 'none';
                    };
                    const headings = [...main.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]')].map((h) => ({tag: h.tagName, cls: h.className, text: (h.innerText || h.textContent).trim().replace(/\s+/g, ' '), shown: shown(h), rect: r(h), clip: getComputedStyle(h).clip, clipPath: getComputedStyle(h).clipPath}));
                    const trendsH = [...main.querySelectorAll('h1,h2')].find((h) => h.textContent.trim() === 'Trends');
                    const dateBtn = [...main.querySelectorAll('button')].find((b) => /Change date range/.test(b.textContent));
                    const filt = [...main.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Filters');
                    const range = dateBtn ? dateBtn.parentElement : null;
                    // the chart block
                    const act = [...main.querySelectorAll('*')].find((e) => e.children.length === 0 && /Active Submissions/.test(e.textContent));
                    let chart = null;
                    if (act) {
                        let blk = act;
                        for (let i = 0; i < 6 && blk.parentElement && !blk.parentElement.querySelector('svg, canvas'); i++) blk = blk.parentElement;
                        blk = blk.parentElement || blk;
                        const svg = blk.querySelector('svg');
                        const canvas = blk.querySelector('canvas');
                        chart = {
                            text: blk.innerText.replace(/\s+/g, ' ').trim().slice(0, 300),
                            svg: svg ? {paths: svg.querySelectorAll('path').length, circles: svg.querySelectorAll('circle').length, strokes: [...svg.querySelectorAll('circle, path')].map((c) => c.getAttribute('stroke') || getComputedStyle(c).stroke).slice(0, 10), dash: [...svg.querySelectorAll('circle')].map((c) => c.getAttribute('stroke-dasharray')).slice(0, 10), rect: r(svg)} : null,
                            canvas: !!canvas,
                            html: blk.outerHTML.replace(/\s+/g, ' ').slice(0, 2500),
                            actRect: r(act),
                            actSize: getComputedStyle(act.previousElementSibling || act).fontSize,
                        };
                    }
                    // rows: left edge of the name text (td5), icon
                    const table = main.querySelector('table');
                    const rows = table ? [...table.querySelectorAll('tbody tr')].map((tr) => {
                        const cell = tr.children[0];
                        const tn = [...cell.childNodes].concat([...cell.querySelectorAll('*')].flatMap((e) => [...e.childNodes])).find((n) => n.nodeType === 3 && n.textContent.trim());
                        let left = null;
                        let rawStart = null;
                        if (tn) {
                            const rg = document.createRange();
                            const txt = tn.textContent;
                            const i = txt.search(/\S/);
                            rg.setStart(tn, i);
                            rg.setEnd(tn, i + 1);
                            left = Math.round(rg.getBoundingClientRect().left * 10) / 10;
                            rawStart = [...txt.slice(0, i + 1)].map((c) => c.charCodeAt(0).toString(16));
                        }
                        const tip = cell.querySelector('.tooltipButton');
                        return {
                            name: cell.innerText.split('\n')[0].trim(),
                            cellLeft: Math.round(cell.getBoundingClientRect().left),
                            textLeft: left,
                            rawStart,
                            whiteSpace: getComputedStyle(cell).whiteSpace,
                            paddingLeft: getComputedStyle(cell).paddingLeft,
                            icon: tip ? {html: tip.outerHTML.replace(/\s+/g, ' ').slice(0, 600), tabindex: tip.getAttribute('tabindex'), role: tip.getAttribute('role'), aria: tip.getAttribute('aria-label'), tag: tip.tagName, rect: r(tip)} : null,
                        };
                    }) : null;
                    const heads = table ? [...table.querySelectorAll('thead th')].map((th) => ({text: th.innerText.trim(), html: th.outerHTML.replace(/\s+/g, ' ').slice(0, 300), cursor: getComputedStyle(th).cursor, hasButton: !!th.querySelector('button, a')})) : null;
                    const controls = [...main.querySelectorAll('button, a, input, select, [tabindex]')].map((e) => ({tag: e.tagName, text: (e.innerText || e.value || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 60), href: e.getAttribute('href'), shown: shown(e), tabindex: e.getAttribute('tabindex')}));
                    return {headings, trendsRect: trendsH ? r(trendsH) : null, dateRect: range ? r(range) : null, dateText: range ? range.innerText.replace(/\s+/g, ' ').trim() : null, filtersRect: filt ? r(filt) : null, chart, rows, heads, controls};
                });
                fact('page headings (td1)', d.headings);
                fact('page title', await page.title());
                fact('page chart', d.chart && {...d.chart, html: undefined});
                fact('page chart html', d.chart && d.chart.html);
                fact('page trends layout', {trends: d.trendsRect, date: d.dateRect, dateText: d.dateText, filters: d.filtersRect});
                fact('page rows (td5 left edges, icons)', d.rows);
                fact('page column heads', d.heads);
                fact('page controls (sweep)', d.controls);
                await loc(page, 'Editorial Activity: the Trends heading', page.getByRole('heading', {name: 'Trends', exact: true}));
                await loc(page, 'Editorial Activity: the screen-reader heading', page.getByRole('heading', {name: 'Editorial Activity', exact: true}));
                await loc(page, 'Editorial Activity: the active submissions heading', page.getByRole('heading', {name: /Active Submissions$/}));
                await loc(page, 'Editorial Activity: the Trends table', page.getByRole('table', {name: 'Trends'}));
                await loc(page, 'Editorial Activity: Filters', page.getByRole('button', {name: 'Filters', exact: true}));
                await loc(page, 'Trends: information icons', page.getByRole('table', {name: 'Trends'}).locator('.tooltipButton'));
                // Rule 5: each column heading pressed; the rows' order and any request.
                const heads = [];
                const before = JSON.stringify((await readTrends(page)).rows);
                for (const h of ['Name', 'Total']) {
                    const reqs = [];
                    const lis = (r) => reqs.push(`${r.method()} ${rel(r.url())}`);
                    page.on('request', lis);
                    await page.getByRole('columnheader', {name: h, exact: true}).click().catch((e) => reqs.push(`click failed ${flat(e.message, 80)}`));
                    await sleep(800);
                    page.off('request', lis);
                    heads.push({head: h, sameOrder: JSON.stringify((await readTrends(page)).rows) === before, reqs});
                }
                const mid = await page.locator('table thead th').nth(1).innerText();
                await page.locator('table thead th').nth(1).click().catch(() => {});
                await sleep(800);
                heads.push({head: mid, sameOrder: JSON.stringify((await readTrends(page)).rows) === before});
                await snap(page, 'page-heads-pressed');
                fact('Rule 5: headings pressed', heads);
                // chart segments hovered: a title or tooltip?
                const seg = page.locator('main svg path, main svg circle').first();
                if (await seg.count()) {
                    await seg.hover({force: true}).catch(() => {});
                    await sleep(600);
                    const s = await snap(page, 'page-chart-hover');
                    fact('chart hovered', {poppers: await page.locator('.v-popper__popper, [role=tooltip]').allInnerTexts().catch(() => []), title: await seg.evaluate((e) => (e.querySelector('title') || {}).textContent || null).catch(() => null), chart: readChart(s)});
                }
            });
        }

        // Rule 11 / A5: every icon rested on with the pointer (td4).
        if (on('icons')) {
            await step('icons', async () => {
                await signIn(page, U.mgr, {contextPath: M});
                await openEA(page, M, 'icons-open');
                const table = page.getByRole('table', {name: 'Trends'});
                const n = await table.locator('.tooltipButton').count();
                const out = [];
                for (let i = 0; i < n; i++) {
                    const target = table.locator('.tooltipButton').nth(i);
                    const row = flat(await target.evaluate((e) => e.closest('tr').children[0].innerText.split('\n')[0]), 80);
                    const pop = page.locator('.v-popper__popper');
                    let shown = [];
                    for (let a = 0; a < 6 && !shown.length; a++) {
                        await page.mouse.move(5, 5);
                        await sleep(500);
                        await target.scrollIntoViewIfNeeded();
                        await sleep(300);
                        await target.hover();
                        await pop.first().waitFor({state: 'visible', timeout: 2500}).catch(() => {});
                        shown = (await pop.allInnerTexts()).map((x) => flat(x, 800)).filter(Boolean);
                        if (!shown.length) {
                            await target.dispatchEvent('mouseenter');
                            await pop.first().waitFor({state: 'visible', timeout: 2500}).catch(() => {});
                            shown = (await pop.allInnerTexts()).map((x) => flat(x, 800)).filter(Boolean);
                        }
                    }
                    await snap(page, `icons-hover-${i}`);
                    // the pointer moved away: does the text go?
                    await page.mouse.move(5, 5);
                    await sleep(900);
                    const after = (await pop.allInnerTexts()).map((x) => flat(x, 80)).filter(Boolean);
                    // a press on the icon
                    await target.click().catch(() => {});
                    await sleep(700);
                    const pressed = {focused: await target.evaluate((e) => document.activeElement === e || e.contains(document.activeElement)), pop: (await pop.allInnerTexts()).map((x) => flat(x, 80)).filter(Boolean)};
                    await page.mouse.move(5, 5);
                    await sleep(700);
                    out.push({row, shown, afterLeave: after, pressed});
                }
                fact('icons on hover', out);
            });
        }

        // Rule 11 / A5: Tab from the calendar button through the table (td4).
        if (on('keyboard')) {
            await step('keyboard', async () => {
                await signIn(page, U.mgr, {contextPath: M});
                await openEA(page, M, 'kbd-open');
                const btn = page.getByRole('button', {name: 'Change date range'});
                await btn.focus();
                const seq = [];
                for (let i = 0; i < 45; i++) {
                    const a = await page.evaluate(() => {
                        const e = document.activeElement;
                        if (!e) return null;
                        const inTable = !!e.closest('table');
                        const tip = !!e.closest('.tooltipButton');
                        const pops = [...document.querySelectorAll('.v-popper__popper')].map((p) => p.innerText.trim().slice(0, 60)).filter(Boolean);
                        return {tag: e.tagName, text: (e.innerText || e.getAttribute('aria-label') || e.value || '').trim().replace(/\s+/g, ' ').slice(0, 50), inMain: !!e.closest('main'), inTable, tip, pops};
                    });
                    seq.push(a);
                    if (i > 2 && a && !a.inMain) break;
                    await page.keyboard.press('Tab');
                    await sleep(150);
                }
                await snap(page, 'kbd-after-tabs');
                fact('keyboard Tab sequence', seq);
                // Shift+Tab back from the page end once more, the table's cells
                const tabbable = await page.evaluate(() => [...document.querySelectorAll('table .tooltipButton, table [tabindex]')].map((e) => ({tag: e.tagName, tabindex: e.getAttribute('tabindex'), tabIndexProp: e.tabIndex})));
                fact('keyboard: icons tabIndex', tabbable);
            });
        }

        // Rule 5: the spinner beside "Trends" while a new range is counted
        // (the page's own requests held 2.5 s on their way back).
        if (on('spinner')) {
            await step('spinner', async () => {
                await signIn(page, U.mgr, {contextPath: M});
                await openEA(page, M, 'spin-open');
                await page.route(/\/api\/v1\/stats\/editorial/, async (route) => {
                    await sleep(2500);
                    await route.continue().catch(() => {});
                });
                await page.getByRole('button', {name: 'Change date range'}).click();
                await page.getByRole('button', {name: 'Year to date', exact: true}).click();
                // Read while the held requests are out: screen() and idle()
                // wait for them, so a DOM read and a shot, no settle.
                await page.locator('main .pkpSpinner').first().waitFor({state: 'attached', timeout: 2000}).catch(() => {});
                await page.screenshot({path: path.join(outDir(), `spin-during-${app.name}.png`)}).catch(() => {});
                const s = {aria: {main: await page.locator('main').ariaSnapshot().catch(() => '')}};
                const sp = await page.evaluate(() => {
                    const tr = [...document.querySelectorAll('main h1, main h2')].find((h) => h.textContent.trim() === 'Trends');
                    const spins = [...document.querySelectorAll('main .pkpSpinner, main [class*=pinner]')];
                    const cells = [...document.querySelectorAll('main table tbody tr')].slice(0, 2).map((r) => r.innerText.replace(/\s+/g, ' '));
                    return {trends: tr ? tr.getBoundingClientRect().toJSON() : null, cells, spinners: spins.map((e) => ({cls: e.className, rect: e.getBoundingClientRect().toJSON(), parent: e.parentElement.className, parentText: e.parentElement.innerText.trim().slice(0, 40), display: getComputedStyle(e).display}))};
                });
                const mid = await readTrends(page);
                await sleep(3500);
                await page.unroute(/\/api\/v1\/stats\/editorial/);
                await idle(page);
                const s2 = await snap(page, 'spin-after');
                const sp2 = await page.locator('main .pkpSpinner').count();
                fact('spinner', {during: sp, headerDuring: mid && mid.header, after: sp2, headerAfter: (await readTrends(page)).header, aria: flat(s.aria.main, 300), ariaAfter: flat(s2.aria.main, 120)});
            });
        }

        // Rule 3: the presets, their ranges, "Total" kept, the chart kept.
        if (on('presets')) {
            await step('presets', async () => {
                await signIn(page, U.mgr, {contextPath: M});
                const first = await openEA(page, M, 'pre-open');
                await page.getByRole('button', {name: 'Change date range'}).click();
                await sleep(500);
                const s = await snap(page, 'pre-list');
                const list = await page.evaluate(() => {
                    const btn = [...document.querySelectorAll('main button')].find((b) => /Change date range/.test(b.textContent));
                    let box = btn;
                    for (let i = 0; i < 5 && box && !/Custom Range/.test(box.innerText); i++) box = box.parentElement;
                    return box ? {text: box.innerText.replace(/\s+/g, ' ').trim(), buttons: [...box.querySelectorAll('button, a, input, label')].map((b) => `${b.tagName}:${(b.innerText || b.placeholder || b.getAttribute('aria-label') || '').trim()}`)} : null;
                });
                fact('presets list', {list, aria: flat(s.aria.main, 1500)});
                await page.keyboard.press('Escape').catch(() => {});
                await sleep(400);
                const escClosed = !(await page.getByRole('button', {name: 'Last two years', exact: true}).isVisible().catch(() => false));
                if (!escClosed) {
                    await page.getByRole('button', {name: 'Change date range'}).click();
                    await sleep(400);
                }
                fact('presets list: Escape closes it', {escClosed, closedByButton: !(await page.getByRole('button', {name: 'Last two years', exact: true}).isVisible().catch(() => false))});
                const totals = (x) => x.trends.rows.map((r) => r[2]);
                const out = {open: {header: first.trends.header, chart: first.chart}};
                for (const p of ['Year to date', 'Last year', 'Last two years', 'Last 90 days', 'All dates']) {
                    out[p] = await step(`preset ${p}`, async () => {
                        if (!(await page.getByRole('button', {name: 'Last two years', exact: true}).isVisible().catch(() => false))) await page.getByRole('button', {name: 'Change date range'}).click();
                        await sleep(300);
                        const b = page.getByRole('button', {name: p, exact: true});
                        if (!(await b.count())) return 'no such preset';
                        const call = statsCall(page).catch(() => null);
                        await b.click();
                        const r = await call;
                        await idle(page);
                        await sleep(500);
                        const t = await trends(page, `pre-${p.replace(/\s+/g, '-').toLowerCase()}`);
                        return {call: r ? rel(r.url()) : null, header: t.trends.header, chart: t.chart, totalsKept: JSON.stringify(totals(t)) === JSON.stringify(totals(first)), middle: t.trends.rows.map((x) => x[1])};
                    });
                }
                out.firstMiddle = first.trends.rows.map((x) => x[1]);
                fact('presets', out);
            });
        }

        // Rule 3: the Custom Range and its refusals (U64 Fields).
        if (on('custom')) {
            await step('custom', async () => {
                await signIn(page, U.mgr, {contextPath: M});
                const first = await openEA(page, M, 'cus-open');
                const y = ago(1);
                const tomorrowish = ago(0);
                const cases = [
                    ['format', '2026-9-1', y],
                    ['nonexistent', '2026-02-30', y],
                    ['reversed', ago(5), ago(10)],
                    ['before2001', '2000-12-31', y],
                    ['afterYesterday', ago(10), tomorrowish],
                    ['toEmpty', ago(10), ''],
                    ['fromEmpty', '', ago(10)],
                ];
                const out = {};
                for (const [k, from, to] of cases) {
                    out[k] = await step(`custom ${k}`, async () => {
                        const open = page.getByRole('textbox', {name: 'From'});
                        if (!(await open.isVisible().catch(() => false))) await page.getByRole('button', {name: 'Change date range'}).click();
                        await page.getByRole('textbox', {name: 'From'}).fill(from);
                        await page.getByRole('textbox', {name: 'To'}).fill(to);
                        const reqs = [];
                        const lis = (r) => /stats\/editorial/.test(r.url()) && reqs.push(rel(r.url()));
                        page.on('request', lis);
                        await page.getByRole('button', {name: 'Apply', exact: true}).click();
                        await sleep(900);
                        page.off('request', lis);
                        const s = await snap(page, `cus-${k}`);
                        const msg = await page.evaluate(() => {
                            const b = [...document.querySelectorAll('main button')].find((x) => x.textContent.trim() === 'Apply');
                            let box = b;
                            for (let i = 0; i < 4 && box; i++) box = box.parentElement;
                            return box ? box.innerText.replace(/\s+/g, ' ').trim() : null;
                        });
                        const t = await readTrends(page);
                        return {from, to, msg, reqs, header: t.header, listOpen: await page.getByRole('textbox', {name: 'From'}).isVisible().catch(() => false), aria: flat(s.aria.main, 200)};
                    });
                }
                // Enter in a box
                out.enter = await step('custom enter', async () => {
                    if (!(await page.getByRole('textbox', {name: 'From'}).isVisible().catch(() => false))) await page.getByRole('button', {name: 'Change date range'}).click();
                    await page.getByRole('textbox', {name: 'From'}).fill(ago(40));
                    await page.getByRole('textbox', {name: 'To'}).fill(ago(20));
                    const reqs = [];
                    const lis = (r) => /stats\/editorial/.test(r.url()) && reqs.push(rel(r.url()));
                    page.on('request', lis);
                    await page.getByRole('textbox', {name: 'To'}).press('Enter');
                    await sleep(1200);
                    page.off('request', lis);
                    await snap(page, 'cus-enter');
                    return {reqs, header: (await readTrends(page)).header, listOpen: await page.getByRole('textbox', {name: 'From'}).isVisible().catch(() => false)};
                });
                // a valid range
                out.valid = await step('custom valid', async () => {
                    if (!(await page.getByRole('textbox', {name: 'From'}).isVisible().catch(() => false))) await page.getByRole('button', {name: 'Change date range'}).click();
                    await page.getByRole('textbox', {name: 'From'}).fill('2001-01-01');
                    await page.getByRole('textbox', {name: 'To'}).fill(ago(1));
                    const call = statsCall(page);
                    await page.getByRole('button', {name: 'Apply', exact: true}).click();
                    const r = await call;
                    await idle(page);
                    await sleep(500);
                    const t = await trends(page, 'cus-valid');
                    return {call: rel(r.url()), header: t.trends.header, chart: t.chart, totalsKept: JSON.stringify(t.trends.rows.map((x) => x[2])) === JSON.stringify(first.trends.rows.map((x) => x[2])), middle: t.trends.rows.map((x) => x[1]), listOpen: await page.getByRole('textbox', {name: 'From'}).isVisible().catch(() => false)};
                });
                fact('custom range', out);
            });
        }

        // Leaving the page with a Custom Range typed and not applied.
        if (on('leave')) {
            await step('leave', async () => {
                await signIn(page, U.mgr, {contextPath: M});
                await openEA(page, M, 'leave-open');
                await page.getByRole('button', {name: 'Change date range'}).click();
                await page.getByRole('textbox', {name: 'From'}).fill(ago(30));
                await page.getByRole('textbox', {name: 'To'}).fill(ago(2));
                const t0 = Date.now();
                const link = page.locator('nav').getByRole('link', {name: 'Users', exact: true}).first();
                let how = 'side menu Users';
                if (await link.isVisible().catch(() => false)) await link.click();
                else {
                    how = 'goto stats/users';
                    await page.goto(app.url(`/index.php/${M}/stats/users`));
                }
                await page.waitForURL(/stats\/users/, {timeout: T}).catch(() => {});
                await idle(page);
                const s = await snap(page, 'leave-landed');
                const landed = rel(page.url());
                await page.goBack().catch(() => {});
                await idle(page);
                const back = await trends(page, 'leave-back');
                fact('leave with a typed range', {how, landed, backURL: rel(page.url()), dialogs: dialogs.filter((d) => d.at >= t0), usersHead: flat(s.text.main, 120), backHeader: back.trends && back.trends.header});
            });
        }

        // Rule 4: "Filters" on the main context (two sections / series).
        if (on('filters')) {
            await step('filters', async () => {
                await signIn(page, U.mgr, {contextPath: M});
                const first = await openEA(page, M, 'fil-open');
                const F = page.getByRole('button', {name: 'Filters', exact: true});
                const out = {present: await F.count()};
                if (!out.present) {
                    fact('filters', out);
                    return;
                }
                await F.click();
                await sleep(700);
                const s = await snap(page, 'fil-panel');
                out.panel = await page.evaluate(() => {
                    const sb = document.querySelector('.pkpStats__sidebar') || [...document.querySelectorAll('main *')].find((e) => /^Filters/.test(e.innerText || '') && e.querySelector('button'));
                    return sb ? {cls: sb.className, text: sb.innerText.replace(/\s+/g, ' ').trim(), headings: [...sb.querySelectorAll('h1,h2,h3,h4,.pkpHeader__title')].map((h) => h.innerText.trim()), buttons: [...sb.querySelectorAll('button')].map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim()), rect: sb.getBoundingClientRect().toJSON()} : null;
                });
                out.aria = flat(s.aria.main, 800);
                const A = secA.title;
                const Bn = secB.title;
                const choose = async (label, name) => {
                    const call = statsCall(page).catch(() => null);
                    await page.getByRole('button', {name: label, exact: true}).first().click();
                    const r = await call;
                    await idle(page);
                    await sleep(600);
                    const t = await trends(page, name);
                    return {call: r ? rel(r.url()) : null, chart: t.chart, rows: t.trends.rows};
                };
                out.A = await step('filter A', () => choose(A, 'fil-a'));
                out.AB = await step('filter A+B', () => choose(Bn, 'fil-ab'));
                out.aria2 = flat((await screen(page)).aria.main, 600);
                out.Aagain = await step('filter A again', () => choose(A, 'fil-b-only'));
                out.clearB = await step('filter clear B', async () => {
                    const x = page.getByRole('button', {name: `Clear filter: ${Bn}`});
                    await loc(page, 'Filters: a chosen name\'s clear button', x);
                    const n = await x.count();
                    if (!n) return 'no clear button';
                    const call = statsCall(page).catch(() => null);
                    await x.first().click();
                    const r = await call;
                    await idle(page);
                    await sleep(600);
                    const t = await trends(page, 'fil-cleared');
                    return {call: r ? rel(r.url()) : null, chart: t.chart, rows: t.trends.rows};
                });
                out.Bthen = await step('filter B', () => choose(Bn, 'fil-b'));
                out.closed = await step('filters closed', async () => {
                    const call = statsCall(page).catch(() => null);
                    await F.click();
                    const r = await call;
                    await idle(page);
                    await sleep(700);
                    const t = await trends(page, 'fil-closed');
                    return {call: r ? rel(r.url()) : null, chart: t.chart, rows: t.trends.rows, sameAsUnfiltered: JSON.stringify(t.trends.rows) === JSON.stringify(first.trends.rows)};
                });
                out.reopened = await step('filters reopened', async () => {
                    await F.click();
                    await sleep(700);
                    const s2 = await snap(page, 'fil-reopened');
                    return flat(s2.aria.main, 500);
                });
                // a filter with a preset: both kept?
                out.withPreset = await step('filter + preset', async () => {
                    await openEA(page, M, 'fil-open2');
                    await F.click();
                    await sleep(600);
                    await choose(A, 'fil-a2');
                    await page.getByRole('button', {name: 'Change date range'}).click();
                    const call = statsCall(page).catch(() => null);
                    await page.getByRole('button', {name: 'Last two years', exact: true}).click();
                    const r = await call;
                    await idle(page);
                    await sleep(600);
                    const t = await trends(page, 'fil-a2-preset');
                    return {call: r ? rel(r.url()) : null, rows: t.trends.rows, header: t.trends.header};
                });
                out.unfiltered = first.trends.rows;
                out.unfilteredChart = first.chart;
                fact('filters', out);
            });
        }

        // Rule 4 other end, Rule 5 "whatever the figures": the bare context
        // (as created: one section; a press with no series; no submission).
        if (on('bare')) {
            await step('bare', async () => {
                await signIn(page, S.bare.users.mgr, {contextPath: S.bare.path});
                const t = await openEA(page, S.bare.path, 'bare-open');
                const F = page.getByRole('button', {name: 'Filters', exact: true});
                const out = {t, filters: await F.count()};
                if (out.filters) {
                    await F.click();
                    await sleep(600);
                    const s = await snap(page, 'bare-panel');
                    out.panel = flat(s.aria.main, 600);
                }
                fact('bare', out);
            });
        }

        // Rule 1: figures read when the page opens (a submission arrives while
        // the page is open; read, then reload).
        if (on('open')) {
            await step('open', async () => {
                await signIn(page, S.bare.users.mgr, {contextPath: S.bare.path});
                const before = await openEA(page, S.bare.path, 'open-before');
                const reqs = [];
                const lis = (r) => /\/api\//.test(r.url()) && reqs.push(`${r.method()} ${rel(r.url())}`);
                page.on('request', lis);
                const n = Object.keys(S.bare.subs).length;
                const r = await app.api.createSubmission({tag: `${S.bare.path}o${n}`, context: S.bare.path, submitter: S.bare.users.au, title: `K1 arrives ${n}`});
                S.bare.subs[`o${n}`] = {id: r.submissionId};
                saveState(app, S);
                await sleep(8000);
                page.off('request', lis);
                const still = await trends(page, 'open-still');
                await page.reload();
                await idle(page);
                await page.getByRole('table', {name: 'Trends'}).waitFor({timeout: T});
                const after = await trends(page, 'open-reloaded');
                fact('Rule 1: opened, a submission arrives, reload', {before: {chart: before.chart, rows: before.trends.rows.slice(0, 1)}, still: {chart: still.chart, rows: still.trends.rows.slice(0, 1)}, reqsWhileOpen: reqs, after: {chart: after.chart, rows: after.trends.rows.slice(0, 1)}});
            });
        }

        // Purpose: the monthly email reaches the manager with an attachment
        // (K5 owns the email; a light read here).
        if (on('mail')) {
            await step('mail', async () => {
                const run = await app.api.runTask({task: 'statisticsReport', context: M});
                const msg = await app.mail.find({to: `${U.mgr}@mail.test`, subject: 'activity for', timeoutMs: 30000});
                const full = await app.mail.fullMessage(msg.ID);
                fact('monthly email', {run: flat(JSON.stringify(run), 400), subject: full.Subject, attachments: (full.Attachments || []).map((a) => a.FileName), text: flat(full.Text, 600)});
                await signIn(page, U.mgr, {contextPath: M});
                const v = await visit(page, 'purpose-reports', app.url(`/index.php/${M}/stats/reports`));
                const links = await page.locator('main a').evaluateAll((as) => as.map((a) => `${a.innerText.trim()} -> ${(a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')}`)).catch(() => null);
                fact('purpose: Reports page', {v, links});
            });
        }

        // Rule 4 "current version": a published item in section A given a new
        // version on screen, that version moved to section B, then filtered.
        if (on('versions') && !state0(S).versionsDone) {
            await step('versions', async () => {
                const v1 = S.main.subs.v1;
                await signIn(page, U.mgr, {contextPath: M});
                const out = {};
                await page.goto(app.url(`/index.php/${M}/dashboard/editorial?workflowSubmissionId=${v1.id}&workflowMenuKey=publication_${v1.publicationId}_titleAbstract`));
                await idle(page);
                const link = page.getByRole('link', {name: 'Create New Version', exact: true}).or(page.getByRole('button', {name: 'Create New Version', exact: true})).first();
                await link.waitFor({state: 'visible', timeout: T});
                await sleep(1000);
                await snap(page, 'ver-workflow');
                await link.click();
                const w = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
                const hasWin = await w.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: 10000}).then(() => true).catch(() => false);
                let vr;
                if (hasWin) {
                    await idle(page);
                    await sleep(600);
                    for (const [sel, val] of [['select[name="versionStage"]', 'VoR'], ['select[name="versionIsMinor"]', 'false']]) {
                        const el = w.locator(sel);
                        if ((await el.isVisible().catch(() => false)) && !(await el.inputValue().catch(() => ''))) await el.selectOption(val).catch(() => {});
                    }
                    await snap(page, 'ver-window');
                    const vw = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T});
                    await w.getByRole('button', {name: 'Confirm', exact: true}).click();
                    vr = await vw;
                } else {
                    const conf = page.getByRole('dialog').filter({hasText: /version/i}).last();
                    await snap(page, 'ver-confirm');
                    const vw = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T});
                    await conf.getByRole('button', {name: /^(Yes|OK|Confirm|Create New Version)$/}).last().click();
                    vr = await vw;
                }
                out.versionStatus = vr.status();
                const newPub = psql(app, `select publication_id, status from publications where submission_id=${v1.id} order by publication_id`);
                out.pubs = newPub;
                out.currentAfterVersion = psql(app, `select current_publication_id from submissions where submission_id=${v1.id}`)[0];
                await idle(page);
                await sleep(1500);
                const np = newPub[newPub.length - 1][0];
                // the new version's section/series page
                const MENU = isOJS ? 'Publication Settings' : isOMP ? 'Catalog Entry' : /Preprint Entry/i;
                await page.goto(app.url(`/index.php/${M}/dashboard/editorial?workflowSubmissionId=${v1.id}&workflowMenuKey=publication_${np}_titleAbstract`));
                await idle(page);
                await sleep(1500);
                const wf = page.locator('[role="dialog"]:visible').first();
                const ml = wf.getByRole('link', {name: MENU}).last();
                await ml.click();
                await idle(page);
                await sleep(1800);
                const selName = isOMP ? 'seriesId' : 'sectionId';
                const sel = page.locator('[role="dialog"]:visible').first().locator(`select[name="${selName}"]`).first();
                await sel.waitFor({state: 'visible', timeout: T});
                out.selectedBefore = await sel.evaluate((s) => s.options[s.selectedIndex].text.trim());
                await sel.selectOption({label: secB.title});
                const formL = sel.locator('xpath=ancestor::form[1]');
                const pw = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15000}).catch(() => null);
                await formL.getByRole('button', {name: 'Save', exact: true}).last().click();
                const pr = await pw;
                await idle(page);
                await sleep(1200);
                out.save = {status: pr ? pr.status() : null, url: pr ? rel(pr.url()) : null, errors: (await formL.locator('.pkpFieldError, .pkpFormErrors').allInnerTexts().catch(() => [])).map((x) => flat(x, 160))};
                if (!out.save.status) {
                    const dont = formL.getByRole('radio', {name: /Don't Assign To An Issue/}).first();
                    if (await dont.count()) {
                        await dont.check();
                        const pw2 = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15000}).catch(() => null);
                        await formL.getByRole('button', {name: 'Save', exact: true}).last().click();
                        const pr2 = await pw2;
                        out.save2 = {status: pr2 ? pr2.status() : null};
                        await idle(page);
                        await sleep(1000);
                    }
                }
                await snap(page, 'ver-moved');
                out.sectionsStored = psql(app, `select publication_id, status, ${isOMP ? 'series_id' : 'section_id'} from publications where submission_id=${v1.id} order by publication_id`);
                out.current = psql(app, `select current_publication_id from submissions where submission_id=${v1.id}`)[0];
                S.versionsDone = out;
                saveState(app, S);
                fact('versions: made on screen', out);
            });
        }
        if (on('versions') && S.versionsDone) {
            await step('versions read', async () => {
                await signIn(page, U.mgr, {contextPath: M});
                const res = {};
                for (const [k, label] of [['A', secA.title], ['B', secB.title]]) {
                    await openEA(page, M, `ver-open-${k}`);
                    await page.getByRole('button', {name: 'Filters', exact: true}).click();
                    await sleep(600);
                    const call = statsCall(page).catch(() => null);
                    await page.getByRole('button', {name: label, exact: true}).first().click();
                    await call;
                    await idle(page);
                    await sleep(600);
                    const t = await trends(page, `ver-filter-${k}`);
                    res[k] = t.trends.rows.filter((r) => /Received|Published/.test(r[0]));
                }
                fact('versions: filter reads (section A, section B)', res);
            });
        }

        // Rule 4 "current version", the other end: the moved new version
        // published on screen, then the filters read again.
        if (on('verpub') && S.versionsDone && !S.verPubDone) {
            await step('verpub', async () => {
                const v1 = S.main.subs.v1;
                const np = S.versionsDone.pubs[S.versionsDone.pubs.length - 1][0];
                await signIn(page, U.mgr, {contextPath: M});
                const out = {};
                await page.goto(app.url(`/index.php/${M}/dashboard/editorial?workflowSubmissionId=${v1.id}&workflowMenuKey=publication_${np}_titleAbstract`));
                await idle(page);
                await sleep(1500);
                const controls = page.locator('[data-cy="workflow-controls-right"]');
                const button = controls.getByRole('button', {name: /^(Schedule For Publication|Publish|Post)$/}).first();
                await button.waitFor({state: 'visible', timeout: T});
                out.button = (await button.innerText()).trim();
                await snap(page, 'verpub-before');
                await sleep(800);
                await button.click();
                const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
                const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to|make this catalog entry public/}).last();
                const which = await Promise.race([
                    panel.locator('select[name="versionStage"], input[name="assignment"], button').first().waitFor({state: 'visible', timeout: 15000}).then(() => 'panel'),
                    confirm.waitFor({state: 'visible', timeout: 15000}).then(() => 'confirm'),
                ]).catch(() => null);
                out.opened = which;
                await idle(page);
                await sleep(600);
                await snap(page, 'verpub-window');
                if (which === 'panel') {
                    const back = panel.getByRole('radio', {name: 'Assign To Current/Back Issue'});
                    if (await back.isVisible().catch(() => false)) {
                        await back.check();
                        const sel = panel.locator('select[name="issueId"]');
                        await sel.waitFor({state: 'visible', timeout: T});
                        const opt = sel.locator('option').filter({hasText: /Vol\.? 1/});
                        await opt.first().waitFor({state: 'attached', timeout: T});
                        await sel.selectOption((await opt.first().getAttribute('value')) || '');
                    }
                    out.panel = flat(await panel.innerText().catch(() => ''), 600);
                    await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
                    await confirm.waitFor({state: 'visible', timeout: T});
                    await sleep(600);
                }
                out.confirm = flat(await confirm.innerText().catch(() => ''), 400);
                const pr = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
                await confirm.getByRole('button', {name: /^(Publish|Post|Schedule For Publication)$/}).last().click();
                out.publishStatus = (await pr).status();
                await idle(page);
                await sleep(800);
                await snap(page, 'verpub-done');
                out.stored = psql(app, `select publication_id, status, ${isOMP ? 'series_id' : 'section_id'} from publications where submission_id=${v1.id} order by publication_id`);
                out.current = psql(app, `select current_publication_id from submissions where submission_id=${v1.id}`)[0];
                S.verPubDone = out;
                saveState(app, S);
                fact('verpub: published on screen', out);
            });
        }
        if (on('verpub') && S.verPubDone) {
            await step('verpub read', async () => {
                await signIn(page, U.mgr, {contextPath: M});
                const res = {};
                for (const [k, label] of [['A', secA.title], ['B', secB.title]]) {
                    await openEA(page, M, `verpub-open-${k}`);
                    await page.getByRole('button', {name: 'Filters', exact: true}).click();
                    await sleep(600);
                    const call = statsCall(page).catch(() => null);
                    await page.getByRole('button', {name: label, exact: true}).first().click();
                    await call;
                    await idle(page);
                    await sleep(600);
                    const t = await trends(page, `verpub-filter-${k}`);
                    res[k] = t.trends.rows.filter((r) => /Received|Published/.test(r[0]));
                }
                fact('verpub: filter reads (section A, section B)', res);
            });
        }

        // Rule 4 "every section": a section (series) deactivated on screen,
        // then "Filters" read again.
        if (on('inactive')) {
            await step('inactive', async () => {
                await signIn(page, U.mgr, {contextPath: M});
                if (!S.inactiveDone) {
                    const TAB = isOMP ? 'Series' : 'Sections';
                    const GRIDSEL = isOMP ? '#seriesGridContainer' : '#sectionsGridContainer';
                    await page.goto(app.url(`/index.php/${M}/management/settings/context`));
                    await idle(page);
                    await page.getByRole('tab', {name: TAB, exact: true}).first().click();
                    await idle(page);
                    const grid = page.locator(GRIDSEL).first();
                    await grid.locator('tr.gridRow').first().waitFor({timeout: T});
                    await sleep(600);
                    const row = grid.locator('tr.gridRow').filter({hasText: secB.title}).first();
                    await snap(page, 'inact-grid-before');
                    await row.locator('input[type=checkbox]').first().click();
                    await sleep(1200);
                    const top = page.locator('[role="dialog"]:visible').last();
                    const ask = flat(await top.innerText().catch(() => ''), 300);
                    await top.getByRole('button', {name: 'OK', exact: true}).first().click().catch(() => {});
                    await sleep(1800);
                    await idle(page);
                    await snap(page, 'inact-grid-after');
                    S.inactiveDone = {ask, box: await row.locator('input[type=checkbox]').first().isChecked().catch(() => null)};
                    saveState(app, S);
                }
                const t = await openEA(page, M, 'inact-open');
                const F = page.getByRole('button', {name: 'Filters', exact: true});
                const out = {done: S.inactiveDone, filters: await F.count(), chart: t.chart};
                if (out.filters) {
                    await F.click();
                    await sleep(600);
                    const s = await snap(page, 'inact-panel');
                    out.panel = flat(s.aria.main, 700);
                }
                fact('inactive section/series', out);
            });
        }
    } finally {
        fact('dialogs', dialogs);
        record('k1-facts', facts, {merge: true});
        await close();
    }
});

function state0(S) {
    return S || {};
}
