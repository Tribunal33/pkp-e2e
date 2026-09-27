const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U54 claim check, chunk K4: "Site Access Options" and what the role settings
// change elsewhere. Spec docs/specs/U54-roles-configuration.md: Fields for the
// tab 142-149, Rules 22-24 278-321, Side effects 322-339, Settings bullet 3
// 350-354, Cross-feature interactions 355-388, the scenario preamble 389-394,
// register OPS1 534-544, Reference 987-end.
//
// Run one app per process (each seeds its own scratch contexts):
//   PROBE_FEATURE=U54 PROBE_AGENT=ccK4 node bin/probe.js ojs shared/playwright/checks/U54/K4/k4.js
//   PH=site,content  runs only those phases (the seed is kept in
//   .reports/U54/ccK4/state-<app>.json; delete it to reseed).
//
// Contexts per app (tag prefix u54k4):
//   A  access: manager am, reader ar, author aa, one published item (OJS
//      article with a PDF galley, OMP monograph with a PDF format, OPS
//      preprint with a PDF galley). Site Access Options saved on screen.
//   X  roles: manager m, Editorial Board Member eb, copyeditor ce (OJS OMP),
//      section editor se, reader rd, author au, a custom manager-level role
//      "K4 Chief" held by ch. Two submissions in production with ce (OPS: se)
//      as participant, se on both.
//   R  the recipe (fn-s): restrictSiteAccess seeded, a signed-out visitor.
//
// Phases, in order: recipe fields site content reg all3 stage created rename
// options notify sysinfo nomail.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const T = 20_000;
const ALL = ['recipe', 'fields', 'site', 'content', 'reg', 'all3', 'stage', 'created', 'rename', 'options', 'notify', 'sysinfo', 'nomail', 'grid'];
const PHASES = process.env.PH ? process.env.PH.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const outDir = path.join(__dirname, '../../../../.reports/U54/ccK4');
const stateFile = (app) => path.join(outDir, `state-${app.name}.json`);

const VOC = {
    ojs: {stages: ['Submission', 'Review', 'Copyediting', 'Production'], box: 'restrictArticleAccess', ce: 'Copyeditor', se: 'Section editor', eb: 'Editorial Board Member', prod: 'workflow_5'},
    omp: {stages: ['Submission', 'Internal Review', 'External Review', 'Copyediting', 'Production'], box: 'restrictMonographAccess', ce: 'Copyeditor', se: 'Series editor', eb: 'Editorial Board Member', prod: 'workflow_5'},
    ops: {stages: ['Production'], box: 'restrictPreprintAccess', ce: null, se: 'Moderator', eb: 'Editorial Board Member', prod: 'workflow_5'},
};
const CTXT = {ojs: ['journals', 'journal_id', 'journal_settings'], omp: ['presses', 'press_id', 'press_settings'], ops: ['servers', 'server_id', 'server_settings']};

function psql(app, q) {
    try { return execFileSync('psql', ['-d', `${dbName(app.name)}`, '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim(); } catch (e) { return `ERR ${flat(e.message, 200)}`; }
}

// ---------------------------------------------------------------- seed
async function seed(app) {
    const V = VOC[app.name];
    const isOJS = app.name === 'ojs', isOMP = app.name === 'omp', isOPS = app.name === 'ops';
    const t = tag('u54k4');
    const S = {t, A: `${t}a`, X: `${t}x`, R: `${t}r`};
    const U = (p, k, roles, g, f, more = {}) => ({username: `${p}${k}`, roles, givenName: g, familyName: f, ...more});
    const ctx = (p, label) => ({name: `U54 K4 ${label} ${p}`, acronym: 'KFOUR', contactName: 'K4 Contact', contactEmail: `${p}c@mail.test`});
    // A: access.
    await app.api.createContext({tag: S.A, context: ctx(S.A, 'access'), users: [U(S.A, 'm', ['manager'], 'Ama', 'Manager'), U(S.A, 'r', ['reader'], 'Ari', 'Reader'), U(S.A, 'a', ['author'], 'Ava', 'Author')]});
    const pub = isOJS ? {decisions: ['skipExternalReview', 'sendToProduction'], galleys: [{label: 'PDF', file: 'article.pdf'}], published: true}
        : isOMP ? {decisions: ['skipExternalReview', 'sendToProduction'], publicationFormats: [{name: 'PDF', file: 'article.pdf'}], published: true}
            : {galleys: [{label: 'PDF', file: 'preprint.pdf'}], published: true};
    const p1 = await app.api.createSubmission({tag: `${S.A}p1`, context: S.A, submitter: `${S.A}a`, title: `K4 Access item ${t}`, ...pub});
    S.Apub = {id: p1.submissionId, galleys: p1.galleys || null, formats: p1.publicationFormats || null};
    // X: roles.
    const usersX = [U(S.X, 'm', ['manager'], 'Mika', 'Manager'), U(S.X, 'eb', ['editorialBoardMember'], 'Ebba', 'Board'),
        U(S.X, 'se', ['sectionEditor'], 'Sela', 'Editor'), U(S.X, 'rd', ['reader'], 'Rui', 'Reader'), U(S.X, 'au', ['author'], 'Aya', 'Author'),
        U(S.X, 'ch', ['chief'], 'Chet', 'Chief')];
    if (!isOPS) usersX.push(U(S.X, 'ce', ['copyeditor'], 'Cora', 'Copy'));
    await app.api.createContext({tag: S.X, context: ctx(S.X, 'roles'), customRoles: [{key: 'chief', level: 'manager', name: 'K4 Chief', abbrev: 'KFC'}], users: usersX});
    const parts = [{username: `${S.X}se`, role: 'sectionEditor'}];
    if (!isOPS) parts.push({username: `${S.X}ce`, role: 'copyeditor'});
    const toProd = isOPS ? {} : {decisions: ['skipExternalReview', 'sendToProduction']};
    S.Xsubs = [];
    for (const k of ['s1', 's2']) {
        const r = await app.api.createSubmission({tag: `${S.X}${k}`, context: S.X, submitter: `${S.X}au`, title: `K4 ${k} ${t}`, participants: parts, ...toProd});
        S.Xsubs.push(r.submissionId);
    }
    // R: the recipe's restrictSiteAccess key.
    await app.api.createContext({tag: S.R, context: ctx(S.R, 'recipe'), restrictSiteAccess: true, users: [U(S.R, 'm', ['manager'], 'Rho', 'Manager'), U(S.R, 'r', ['reader'], 'Ria', 'Reader'), U(S.R, 'a', ['author'], 'Rex', 'Author')]});
    const rp = await app.api.createSubmission({tag: `${S.R}p1`, context: S.R, submitter: `${S.R}a`, title: `K4 Recipe item ${t}`, ...pub});
    S.Rpub = {id: rp.submissionId};
    fs.mkdirSync(outDir, {recursive: true});
    fs.writeFileSync(stateFile(app), JSON.stringify(S, null, 2));
    return S;
}

forEachApp(async (app) => {
    const V = VOC[app.name];
    const isOJS = app.name === 'ojs', isOMP = app.name === 'omp', isOPS = app.name === 'ops';
    const facts = {};
    const fact = (k, v) => { facts[k] = v; record('k4-facts', {[k]: v}, {merge: true}); log(`[${app.name}] ${k}:`, typeof v === 'string' ? v : JSON.stringify(v).slice(0, 1500)); };

    let S = fs.existsSync(stateFile(app)) ? JSON.parse(fs.readFileSync(stateFile(app), 'utf8')) : null;
    if (!S) { S = await seed(app); fact('seed', S); }
    const x = S.X;
    const ux = (k) => `${x}${k}`;
    const email = (u) => `${u}@mail.test`;

    const {page, context, close} = await launch(app);
    const vis = await launch(app); // the signed-out visitor, a browser of its own
    const vpage = vis.page;
    const bad = [];
    const pageErrors = [];
    const dialogs = [];
    const reqs = [];
    for (const [who, pg] of [['m', page], ['v', vpage]]) {
        pg.on('response', (r) => { if (r.status() >= 400) bad.push({at: Date.now(), who, status: r.status(), m: r.request().method(), url: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 180)}); });
        pg.on('pageerror', (e) => pageErrors.push({at: Date.now(), who, text: flat(e.message, 200), url: pg.url()}));
        pg.on('dialog', async (d) => { dialogs.push({at: Date.now(), who, type: d.type(), message: d.message().slice(0, 200)}); await d.accept().catch(() => {}); });
    }
    page.on('request', (r) => {
        const u = r.url();
        if (r.method() !== 'GET' && (/\/api\/v1\/(contexts|site)/.test(u) || /user-group-grid|user-group-form|update-user-group|assign-stage/.test(u))) {
            reqs.push({at: Date.now(), m: r.method(), override: r.headers()['x-http-method-override'] || null, url: u.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '').slice(0, 160), body: (r.postData() || '').replace(/csrfToken=[^&]*&?/, '').slice(0, 500)});
        }
    });
    const since = (arr, t0) => arr.filter((e) => e.at >= t0);

    let snapN = 0;
    async function snap(name, extra, {png = true, pg = page} = {}) {
        let s;
        try { s = await screen(pg); } catch (e) { s = {url: pg.url(), error: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        const n = `k4-${String(++snapN).padStart(3, '0')}-${name}`;
        record(n, s);
        if (png) await shot(pg, n).catch(() => {});
        return {name: n, s};
    }
    async function sect(name, fn) {
        if (!on(name)) return null;
        const t0 = Date.now();
        try { await fn(); } catch (e) {
            fact(`${name}.FAILED`, flat(e.stack || e, 900));
            await snap(`zz-failed-${name}`).catch(() => {});
        }
        const b = since(bad, t0).filter((r) => r.status >= 500), pe = since(pageErrors, t0);
        if (b.length || pe.length) fact(`${name}.crashes`, {server: b, script: pe});
        const d = since(dialogs, t0);
        if (d.length) fact(`${name}.dialogs`, d);
        return null;
    }
    const as = async (u, ctx) => { await signIn(page, u, {contextPath: ctx}); await idle(page).catch(() => {}); };
    const settle = async (pg = page) => {
        await idle(pg).catch(() => {});
        await pg.waitForFunction(() => !window.jQuery || window.jQuery(':animated').length === 0, null, {timeout: 5000}).catch(() => {});
        await sleep(250);
    };
    const accessURL = (ctx) => app.url(`/index.php/${ctx}/management/settings/access`);

    // ------------------------------------------------ Site Access Options helpers
    const siteBox = () => page.locator('input[name="restrictSiteAccess"]');
    const contentBox = () => page.locator(`input[name="${V.box}"]`);
    const accessForm = () => page.locator('form').filter({has: siteBox()}).first();
    async function openAccessTab(ctx) {
        await page.goto(accessURL(ctx));
        await idle(page).catch(() => {});
        await page.getByRole('tab', {name: 'Site Access Options'}).click();
        await siteBox().first().waitFor({state: 'attached', timeout: T});
        await settle();
    }
    async function readAccess() {
        return accessForm().evaluate((f) => {
            const v = (e) => !!(e && e.getClientRects().length) && getComputedStyle(e).visibility !== 'hidden';
            const lab = (i) => { const l = i.closest('label') || (i.id && f.querySelector(`label[for="${i.id}"]`)); return l ? l.innerText.replace(/\s+/g, ' ').trim() : null; };
            return {
                groups: [...f.querySelectorAll('fieldset, .pkpFormField')].filter(v).map((g) => ({legend: ((g.querySelector('legend, .pkpFormFieldLabel') || {}).innerText || '').replace(/\s+/g, ' ').trim(), desc: ((g.querySelector('.pkpFormField__description') || {}).innerText || '').replace(/\s+/g, ' ').trim()})).filter((g) => g.legend),
                inputs: [...f.querySelectorAll('input')].filter((i) => ['checkbox', 'radio'].includes(i.type)).map((i) => ({name: i.name, type: i.type, value: i.value, label: lab(i), checked: i.checked, disabled: i.disabled, visible: v(i)})),
                buttons: [...f.querySelectorAll('button')].filter(v).map((b) => b.innerText.trim()).filter(Boolean),
                required: [...f.querySelectorAll('.pkpFormFieldLabel__required, [aria-required=true]')].length,
            };
        });
    }
    const brief = (r) => (r && r.inputs ? r.inputs.map((i) => `${i.name}${i.type === 'radio' || i.name === 'disableUserReg' ? `[${i.value}]` : ''}=${i.checked ? 'x' : '-'}`).join(' ') : r);
    async function saveAccess(label) {
        const t0 = Date.now();
        const w = page.waitForResponse((r) => r.url().includes('/api/v1/contexts/') && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await accessForm().getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w;
        const saved = await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
        const status = flat(await page.locator('.pkpFormPage__status, [role="status"]').allInnerTexts().catch(() => []).then((a) => a.join(' | ')), 200);
        const samePage = brief(await readAccess());
        const errs = await page.locator('.pkpFormPage__status, .pkpNotification, .pkpFieldError, [role=alert]').allInnerTexts().catch(() => []);
        await snap(`${label}-saved`, {samePage});
        await page.reload(); await idle(page).catch(() => {});
        await page.getByRole('tab', {name: 'Site Access Options'}).click();
        await siteBox().first().waitFor({state: 'attached', timeout: T}); await settle();
        const reload = brief(await readAccess());
        await snap(`${label}-reloaded`, {reload}, {png: false});
        return {status: r ? r.status() : 'none', request: since(reqs, t0).map((q) => `${q.m} ${q.override || ''} ${q.url} ${q.body}`), saved, statusText: status, errs: errs.map((e) => flat(e, 150)).filter(Boolean), samePage, reload};
    }

    // ------------------------------------------------ the signed-out visitor
    async function visit(url, label, {png = false} = {}) {
        const t0 = Date.now();
        let resp = null;
        try { resp = await vpage.goto(url); } catch (e) { resp = {err: flat(e.message, 120)}; }
        await idle(vpage).catch(() => {});
        const o = {asked: url.replace(/^https?:\/\/[^/]+/, ''), status: resp && resp.status ? resp.status() : resp, landed: vpage.url().replace(/^https?:\/\/[^/]+/, ''),
            title: await vpage.title().catch(() => ''), h1: flat(await vpage.locator('h1').first().innerText({timeout: 2000}).catch(() => ''), 100),
            download: null};
        const ct = resp && resp.headers ? resp.headers()['content-type'] : null;
        o.contentType = ct ? ct.split(';')[0] : null;
        o.registerLinks = await vpage.getByRole('link', {name: 'Register', exact: true}).count().catch(() => null);
        if (label) await snap(`v-${label}`, o, {png, pg: vpage});
        o.failed = since(bad, t0).filter((b) => b.who === 'v').map((b) => `${b.status} ${b.m} ${b.url}`);
        return o;
    }
    // A download link read from the page (the kit rule: wait on 'download').
    async function fileLink(url) {
        const t0 = Date.now();
        const out = {asked: url.replace(/^https?:\/\/[^/]+/, '')};
        const dl = vpage.waitForEvent('download', {timeout: 8000}).catch(() => null);
        let resp = null;
        try { resp = await vpage.goto(url); } catch (e) { out.gotoErr = flat(e.message, 100); }
        const d = await dl;
        await idle(vpage).catch(() => {});
        out.status = resp ? resp.status() : null;
        out.contentType = resp ? (resp.headers()['content-type'] || '').split(';')[0] : null;
        out.disposition = resp ? (resp.headers()['content-disposition'] || null) : null;
        out.download = d ? d.suggestedFilename() : null;
        out.landed = vpage.url().replace(/^https?:\/\/[^/]+/, '');
        out.h1 = flat(await vpage.locator('h1').first().innerText({timeout: 1500}).catch(() => ''), 100);
        out.failed = since(bad, t0).filter((b) => b.who === 'v').map((b) => `${b.status} ${b.m} ${b.url}`);
        return out;
    }
    const vSignOut = async () => { await vpage.goto(app.url('/index.php/index/login/signOut')).catch(() => {}); await idle(vpage).catch(() => {}); };

    // The public item's pages on A, collected while the site is open.
    async function itemLinks(ctx, id) {
        const itemUrl = isOJS ? `/index.php/${ctx}/article/view/${id}` : isOMP ? `/index.php/${ctx}/catalog/book/${id}` : `/index.php/${ctx}/preprint/view/${id}`;
        await vpage.goto(app.url(itemUrl)); await idle(vpage).catch(() => {});
        const links = await vpage.locator('a').evaluateAll((as, c) => as.map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim().slice(0, 60), href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, ''), cls: a.className})).filter((a) => a.href.includes(`/${c}/`)), ctx);
        const file = links.find((l) => /article\/view\/\d+\/\d+|preprint\/view\/\d+\/\d+|catalog\/view\//.test(l.href) && !/\/citation|comments/.test(l.href));
        return {itemUrl, fileUrl: file ? file.href : null, fileText: file ? file.text : null, links: links.slice(0, 60)};
    }

    try {
        // ============================================================ recipe (fn-s): restrictSiteAccess seeded
        await sect('recipe', async () => {
            await vSignOut();
            const r = {};
            r.home = await visit(app.url(`/index.php/${S.R}`), 'recipe-home');
            r.item = await visit(app.url(isOJS ? `/index.php/${S.R}/article/view/${S.Rpub.id}` : isOMP ? `/index.php/${S.R}/catalog/book/${S.Rpub.id}` : `/index.php/${S.R}/preprint/view/${S.Rpub.id}`), 'recipe-item');
            r.login = await visit(app.url(`/index.php/${S.R}/login`), 'recipe-login');
            // The scratch manager signs in with the username twice.
            await as(`${S.R}m`, S.R);
            await openAccessTab(S.R);
            r.managerTab = brief(await readAccess());
            await snap('recipe-mgr-tab', r.managerTab);
            await signOut(page);
            fact('recipe', r);
        });

        // ============================================================ fields: the tab as it opens (142-148), manager and admin
        await sect('fields', async () => {
            const r = {};
            for (const who of [`${S.A}m`, 'admin']) {
                await as(who, S.A);
                await openAccessTab(S.A);
                const s = await snap(`fields-${who === 'admin' ? 'admin' : 'mgr'}`);
                r[who === 'admin' ? 'admin' : 'mgr'] = {read: await readAccess(), tabs: (await page.getByRole('tab').allInnerTexts()).map((x) => flat(x, 40)), formText: flat(await accessForm().innerText(), 1500), snap: s.name};
                if (who !== 'admin') {
                    await loc(page, 'Site Access Options › "Site Access" box', siteBox());
                    await loc(page, 'Site Access Options › the open access content box', contentBox());
                    await loc(page, 'Site Access Options › "User Registration" radios', page.locator('input[name="disableUserReg"]'));
                    await loc(page, 'Site Access Options › "Save"', accessForm().getByRole('button', {name: 'Save', exact: true}));
                    // Leave once with a change unsaved: the radio switched, a tab switch, then another page.
                    const t0 = Date.now();
                    await page.locator('input[name="disableUserReg"]').nth(1).check();
                    r.unsavedTicked = brief(await readAccess());
                    await page.getByRole('tab', {name: 'Roles', exact: true}).click(); await sleep(700);
                    await page.getByRole('tab', {name: 'Site Access Options'}).click(); await sleep(500);
                    r.unsavedAfterTabSwitch = brief(await readAccess());
                    await page.goto(app.url(`/index.php/${S.A}/submissions`)).catch((e) => { r.leaveErr = flat(e.message, 100); });
                    await idle(page).catch(() => {});
                    r.leaveDialogs = since(dialogs, t0).map((d) => `${d.type}: ${d.message}`);
                    await openAccessTab(S.A);
                    r.afterReturn = brief(await readAccess());
                }
                await signOut(page);
            }
            fact('fields', r);
        });

        // ============================================================ site: "Site Access" ticked, then unticked (Rules 23, 24 first bullet)
        await sect('site', async () => {
            const r = {};
            await vSignOut();
            const il = await itemLinks(S.A, S.Apub.id);
            r.links = {item: il.itemUrl, file: il.fileUrl};
            const pages = {
                home: `/index.php/${S.A}`, about: `/index.php/${S.A}/about`, masthead: `/index.php/${S.A}/about/editorialMasthead`,
                item: il.itemUrl, file: il.fileUrl, search: `/index.php/${S.A}/search`,
                list: isOJS ? `/index.php/${S.A}/issue/archive` : isOMP ? `/index.php/${S.A}/catalog` : `/index.php/${S.A}/preprints`,
                login: `/index.php/${S.A}/login`, register: `/index.php/${S.A}/user/register`, lostPassword: `/index.php/${S.A}/login/lostPassword`,
            };
            const sweep = async (k) => {
                const o = {};
                for (const [n, p] of Object.entries(pages)) if (p) o[n] = await visit(app.url(p), ['home', 'item', 'login', 'register'].includes(n) ? `site-${k}-${n}` : null, {png: n === 'home'});
                return o;
            };
            r.open = await sweep('open');
            // The visitor holds the home page open across the save.
            await vpage.goto(app.url(pages.home)); await idle(vpage).catch(() => {});
            await as(`${S.A}m`, S.A);
            await openAccessTab(S.A);
            r.before = brief(await readAccess());
            await siteBox().check();
            r.tick = await saveAccess('site-tick');
            // The page the visitor already has open, reloaded after the save.
            await vpage.reload(); await idle(vpage).catch(() => {});
            r.openPageReload = vpage.url().replace(/^https?:\/\/[^/]+/, '');
            r.restricted = await sweep('restricted');
            // A Reader signs in on the journal's own Login page.
            await signIn(vpage, `${S.A}r`, {contextPath: S.A});
            await idle(vpage).catch(() => {});
            r.readerAfterLogin = vpage.url().replace(/^https?:\/\/[^/]+/, '');
            r.readerHome = await visit(app.url(pages.home), 'site-reader-home');
            r.readerItem = await visit(app.url(pages.item), null);
            r.readerFile = pages.file ? await fileLink(app.url(pages.file)) : null;
            await vSignOut();
            // Untick, save: the other end.
            await openAccessTab(S.A);
            await siteBox().uncheck();
            r.untick = await saveAccess('site-untick');
            r.reopened = await sweep('reopened');
            await signOut(page);
            fact('site', r);
        });

        // ============================================================ content: the open access content box (Rules 23-24 second bullet; OPS1)
        await sect('content', async () => {
            const out = {};
            // OJS: a journal whose article sits in a published issue (U51 Rule 13, "an article in an issue").
            if (isOJS && !S.I) {
                S.I = `${S.t}i`;
                await app.api.createContext({tag: S.I, context: {name: `U54 K4 issue ${S.I}`, acronym: 'KFI', contactName: 'K4 Contact', contactEmail: `${S.I}c@mail.test`},
                    issues: [{volume: 1, number: 1, year: 2026, published: true}],
                    users: [{username: `${S.I}m`, roles: ['manager'], givenName: 'Ima', familyName: 'Manager'}, {username: `${S.I}r`, roles: ['reader'], givenName: 'Iri', familyName: 'Reader'}, {username: `${S.I}a`, roles: ['author'], givenName: 'Ivo', familyName: 'Author'}]});
                const pi = await app.api.createSubmission({tag: `${S.I}p1`, context: S.I, submitter: `${S.I}a`, title: `K4 Issue item ${S.t}`, decisions: ['skipExternalReview', 'sendToProduction'], galleys: [{label: 'PDF', file: 'article.pdf'}], published: true, issue: {volume: 1, number: 1, year: 2026}});
                S.Ipub = {id: pi.submissionId};
                fs.writeFileSync(stateFile(app), JSON.stringify(S, null, 2));
            }
            // OJS drives the journal whose article sits in a published issue; a press and a preprint server drive A.
            const targets = isOJS ? [['I', S.I, S.Ipub.id]] : [['A', S.A, S.Apub.id]];
            for (const [K, C, id] of targets) {
                const r = {};
                await vSignOut();
                const il = await itemLinks(C, id);
                r.links = {itemUrl: il.itemUrl, fileUrl: il.fileUrl, fileText: il.fileText};
                const itemAndFile = async (k) => {
                    const o = {};
                    o.item = await visit(app.url(il.itemUrl), `content-${K}-${k}-item`, {png: true});
                    o.itemFileLinks = await vpage.locator('a').evaluateAll((as) => as.map((a) => `${a.innerText.replace(/\s+/g, ' ').trim().slice(0, 30)} -> ${(a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')}`).filter((s2) => /\/view\/\d+\/\d+|catalog\/view|download/.test(s2)));
                    if (il.fileUrl) {
                        o.fileView = await visit(app.url(il.fileUrl), `content-${K}-${k}-file`, {png: true});
                        const d = await vpage.locator('a.download, a[href*="/download/"]').first().getAttribute('href').catch(() => null);
                        o.fileDownloadHref = d ? d.replace(/^https?:\/\/[^/]+/, '') : null;
                        if (o.fileDownloadHref) o.fileDownload = await fileLink(app.url(o.fileDownloadHref));
                    }
                    return o;
                };
                r.open = await itemAndFile('open');
                await as(`${C}m`, C);
                await openAccessTab(C);
                await contentBox().check();
                r.tick = await saveAccess(`content-${K}-tick`);
                r.restricted = await itemAndFile('restricted');
                await signIn(vpage, `${C}r`, {contextPath: C}); await idle(vpage).catch(() => {});
                r.reader = il.fileUrl ? await visit(app.url(il.fileUrl), `content-${K}-reader-file`) : null;
                const dh = r.restricted.fileDownloadHref || r.open.fileDownloadHref;
                if (dh) r.readerDownload = await fileLink(app.url(dh));
                await vSignOut();
                await openAccessTab(C);
                if (await contentBox().isChecked()) await contentBox().uncheck();
                else r.untickNote = 'box already unticked after reload';
                r.untick = await saveAccess(`content-${K}-untick`);
                r.reopened = await itemAndFile('reopened');
                r.db = psql(app, `select setting_name, setting_value from ${CTXT[app.name][2]} s join ${CTXT[app.name][0]} c on c.${CTXT[app.name][1]} = s.${CTXT[app.name][1]} where c.path = '${C}' and setting_name in ('restrictSiteAccess','restrictArticleAccess','restrictMonographAccess','restrictPreprintAccess','disableUserReg') order by 1`);
                await signOut(page);
                out[K] = r;
            }
            fact('content', out);
        });

        // ============================================================ reg: "User Registration" (Rule 24 third bullet)
        await sect('reg', async () => {
            const r = {};
            await vSignOut();
            const regSweep = async (k) => {
                const o = {};
                o.home = await visit(app.url(`/index.php/${S.A}`), `reg-${k}-home`);
                o.homeRegisterHref = await vpage.getByRole('link', {name: 'Register', exact: true}).first().getAttribute('href').catch(() => null);
                o.login = await visit(app.url(`/index.php/${S.A}/login`), `reg-${k}-login`);
                o.loginFormRegister = await vpage.locator('form#login').getByRole('link', {name: 'Register', exact: true}).count().catch(() => null);
                o.register = await visit(app.url(`/index.php/${S.A}/user/register`), `reg-${k}-register`, {png: true});
                o.registerForm = await vpage.locator('form#register').count();
                o.registerText = flat(await vpage.locator('main, .pkp_structure_main, body').first().innerText().catch(() => ''), 400);
                // the site-level Register page's block for this context
                o.siteRegister = await visit(app.url('/index.php/index/user/register'), null);
                o.siteRegisterHasContext = await vpage.getByText(new RegExp(`U54 K4 access ${S.A}`)).count().catch(() => null);
                return o;
            };
            r.open = await regSweep('open');
            await as(`${S.A}m`, S.A);
            await openAccessTab(S.A);
            await page.locator('input[name="disableUserReg"]').nth(1).check();
            r.close = await saveAccess('reg-close');
            r.closed = await regSweep('closed');
            await openAccessTab(S.A);
            await page.locator('input[name="disableUserReg"]').nth(0).check();
            r.reopen = await saveAccess('reg-reopen');
            r.reopened = await regSweep('reopened');
            await signOut(page);
            fact('reg', r);
        });

        // ============================================================ all3: the three fields saved together in one "Save" (Rule 23)
        await sect('all3', async () => {
            const r = {};
            await as(`${S.A}m`, S.A);
            await openAccessTab(S.A);
            await siteBox().check(); await contentBox().check(); await page.locator('input[name="disableUserReg"]').nth(1).check();
            r.set = await saveAccess('all3-set');
            await openAccessTab(S.A);
            await siteBox().uncheck(); if (await contentBox().isChecked()) await contentBox().uncheck(); await page.locator('input[name="disableUserReg"]').nth(0).check();
            r.reset = await saveAccess('all3-reset');
            await signOut(page);
            fact('all3', r);
        });

        // ============================================================ grid helpers (Roles tab)
        const grid = () => page.locator('#roleGridContainer');
        async function gotoRoles(ctx = x) {
            await page.goto(`${accessURL(ctx)}?k4=${Date.now()}`);
            await idle(page).catch(() => {});
            await page.locator('#roles-button').first().click();
            await grid().locator('tr.gridRow').first().waitFor({timeout: T});
            await settle();
            const line = (await grid().innerText().catch(() => '')).match(/(\d+) - (\d+) of (\d+) items/);
            if (line && Number(line[2]) < Number(line[3])) {
                await grid().locator('select.itemsPerPage').selectOption({label: '50'}).catch(() => {});
                await page.waitForResponse((r) => r.url().includes('user-group-grid/fetch-grid'), {timeout: 10000}).catch(() => {});
                await settle();
            }
        }
        const readRows = () => grid().evaluate((g) => [...g.querySelectorAll('tbody tr.gridRow')].filter((r) => r.getClientRects().length).map((tr) => ({
            id: tr.id, name: ((tr.querySelector('[id$="-name"] .label') || {}).innerText || '').trim(), level: ((tr.querySelector('[id$="-roleId"] .label') || {}).innerText || '').trim(),
            boxes: [...tr.querySelectorAll('input[type=checkbox]')].map((i) => `${i.checked ? 'x' : '-'}${i.disabled ? 'd' : ''}`).join(' '),
            arrow: !!tr.querySelector('a.show_extras, a.hide_extras')})));
        const rowOf = async (name) => (await readRows()).find((r) => r.name === name) || null;
        async function pressStage(roleName, stageName) {
            const row = await rowOf(roleName);
            if (!row) return {rowAbsent: true};
            const i = V.stages.indexOf(stageName);
            const box = page.locator(`tr[id="${row.id}"] input[type=checkbox]`).nth(i);
            const t0 = Date.now();
            const w = page.waitForResponse((r) => /assign-stage|unassign-stage/.test(r.url()), {timeout: T}).catch(() => null);
            await box.click();
            const resp = await w;
            await sleep(1200);
            const notices = await page.locator('.app__notifications').allInnerTexts().catch(() => []);
            const out = {before: row.boxes, op: resp ? resp.url().replace(/^.*user-group-grid\//, '').replace(/\?.*$/, '') : null, status: resp ? resp.status() : null, notices: notices.map((n) => flat(n, 160)).filter(Boolean), failed: since(bad, t0).map((b) => `${b.status} ${b.url}`)};
            await gotoRoles();
            out.afterReload = (await rowOf(roleName) || {}).boxes;
            return out;
        }
        const form = () => page.locator('form#userGroupForm');
        async function waitWindow() { await form().locator('select[name=roleId]').waitFor({state: 'attached', timeout: T}); await settle(); await sleep(700); await settle(); }
        async function rowAction(name, action) {
            const row = await rowOf(name);
            if (!row) return {rowAbsent: true};
            const tr = page.locator(`tr[id="${row.id}"]`);
            const tog = tr.locator('a.show_extras');
            if (await tog.count()) { await tog.first().click(); await sleep(300); } else if (!(await tr.locator('a.hide_extras').count())) return {noArrow: true};
            const link = page.locator(`tr[id="${row.id}"] + tr`).getByRole('link', {name: action, exact: true});
            if (!(await link.count())) return {noAction: true};
            await link.first().click();
            return {ok: true};
        }
        async function readWindow() {
            return form().evaluate((f) => {
                const v = (e) => !!(e && e.getClientRects().length) && getComputedStyle(e).visibility !== 'hidden';
                const lab = (i) => { const l = (i.id && f.querySelector(`label[for="${i.id}"]`)) || i.closest('label'); return l ? l.innerText.replace(/\s+/g, ' ').trim().slice(0, 70) : i.name; };
                return [...f.querySelectorAll('input[type=checkbox]')].filter(v).map((i) => `${lab(i)}=${i.checked ? 'x' : '-'}${i.disabled ? 'd' : ''}`);
            }).catch((e) => flat(e.message, 100));
        }
        async function setBox(re, value) {
            const b = form().getByRole('checkbox', {name: re}).first();
            if (value) await b.check({timeout: 4000}); else await b.uncheck({timeout: 4000});
        }
        async function pressOK(label) {
            const t0 = Date.now();
            const w = page.waitForResponse((r) => r.url().includes('update-user-group'), {timeout: 10000}).catch(() => null);
            await form().getByRole('button', {name: 'OK', exact: true}).click();
            const r = await w;
            await sleep(1500); await settle();
            const out = {status: r ? r.status() : 'none', windowOpen: await form().isVisible().catch(() => false), notices: (await page.locator('.app__notifications').allInnerTexts().catch(() => [])).map((n) => flat(n, 160)).filter(Boolean), failed: since(bad, t0).map((b) => `${b.status} ${b.url}`)};
            await snap(`${label}-ok`, out, {png: false});
            return out;
        }

        // ------------------------------------------------ other screens
        let ctxOverride = null;
        const wfUrl = (id, key) => app.url(`/index.php/${ctxOverride || x}/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
        async function openWorkflow(id, key, label) {
            await page.goto(wfUrl(id, key));
            await idle(page).catch(() => {});
            await page.locator('[role="dialog"]:visible').first().waitFor({timeout: T}).catch(() => {});
            await page.waitForFunction(() => { const d = document.querySelector('[role=dialog]'); return d && !/Loading/.test(d.innerText); }, null, {timeout: 15000}).catch(() => {});
            await settle();
            const s = await snap(label, null, {png: true});
            const d = s.s.text && s.s.text.dialog;
            return {url: page.url().replace(/^https?:\/\/[^/]+/, ''), dialog: flat(d, 700), main: d ? null : flat(s.s.text && s.s.text.main, 300),
                menu: await page.locator('[role=dialog] nav a, [role=dialog] nav button').allInnerTexts().then((a) => a.map((t) => flat(t, 40)).filter(Boolean)).catch(() => []),
                assign: await page.locator('[data-cy="workflow-secondary-items"]').getByRole('button', {name: 'Assign', exact: true}).count().catch(() => 0)};
        }
        async function assignOptions(id, key, label, pickRole, pickWho) {
            const o = await openWorkflow(id, key, `${label}-wf`);
            const a = page.locator('[data-cy="workflow-secondary-items"]').getByRole('button', {name: 'Assign', exact: true});
            if (!(await a.count())) return {...o, noAssign: true};
            await a.click();
            const w = page.getByRole('dialog').filter({has: page.locator('select[name="filterUserGroupId"]')}).last();
            await w.locator('select[name="filterUserGroupId"]').waitFor({timeout: 30000});
            await settle();
            const opts = await w.locator('select[name="filterUserGroupId"] option').allInnerTexts().then((a2) => a2.map((t) => t.trim()));
            let boxes = null;
            if (pickRole) {
                await w.locator('select[name="filterUserGroupId"]').selectOption({label: pickRole}); await settle();
                await w.getByRole('textbox', {name: 'Search User By Name'}).fill('');
                await w.getByRole('button', {name: 'Search', exact: true}).click();
                await settle(); await sleep(300); await settle();
                const people = await w.locator('input[name="userId"]').evaluateAll((els) => els.map((r) => ({value: r.value, row: (r.closest('tr') || {}).innerText?.trim().replace(/\s+/g, ' ').slice(0, 80)})));
                const p = people.find((pp) => pp.row && pp.row.includes(pickWho)) || people[0];
                if (p) {
                    await w.locator(`input[name="userId"][value="${p.value}"]`).check({force: true}); await settle();
                    boxes = await w.evaluate((d) => {
                        const vv = (e) => e && e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none';
                        const b = (n) => { const i = d.querySelector(`input[name="${n}"]`); return i ? {visible: vv(i), checked: i.checked} : null; };
                        return {recommendOnly: b('recommendOnly'), canChangeMetadata: b('canChangeMetadata')};
                    });
                    boxes.who = p.row;
                }
            }
            await snap(`${label}-assign`, {opts, boxes}, {png: true});
            const c = w.getByRole('link', {name: /^\s*Cancel\s*$/}).last();
            if (await c.count()) await c.click(); else await w.getByRole('button', {name: /^(Cancel|Close)$/}).last().click().catch(() => {});
            await settle(); await sleep(600);
            return {opts, boxes};
        }
        async function inviteOptions(label) {
            await page.goto(accessURL(x)); await idle(page).catch(() => {});
            const inv = page.getByRole('button', {name: 'Invite to a role'});
            if (!(await inv.count())) return 'no "Invite to a role" button';
            await inv.click();
            const search = page.getByLabel(/Search for a user by email address/);
            await search.waitFor({timeout: T});
            await search.fill(email(ux('rd')));
            await page.getByRole('button', {name: 'Search User', exact: true}).click();
            await page.getByRole('heading', {name: /Enter details/}).first().waitFor({timeout: T}).catch(() => {});
            await settle();
            let newRow = page.getByRole('row').filter({hasText: 'Select a new role'}).last();
            if (!(await newRow.count())) { await page.getByRole('button', {name: 'Add Another Role'}).click().catch(() => {}); await sleep(500); newRow = page.getByRole('row').filter({hasText: 'Select a new role'}).last(); }
            const opts = await newRow.getByRole('combobox').first().locator('option').allInnerTexts().catch(() => []);
            await snap(`${label}-invite`, {opts}, {png: true});
            return opts.map((o) => o.trim());
        }
        async function templateRoles(stageName, label) {
            await page.goto(app.url(`/index.php/${x}/management/settings/workflow`)); await idle(page).catch(() => {});
            const tab = page.getByRole('tab', {name: 'Tasks and Discussions'});
            if (!(await tab.count())) return 'no "Tasks and Discussions" tab';
            await tab.click();
            await page.getByRole('button', {name: /More Actions/}).first().waitFor({timeout: 30000}).catch(() => {});
            await settle();
            const panel = page.getByRole('tabpanel', {name: 'Tasks and Discussions'});
            const grp = panel.getByRole('row').filter({hasText: stageName}).filter({has: page.getByRole('button', {name: /Add template/})}).first();
            await grp.getByRole('button', {name: /Add template/}).click();
            const w = page.getByRole('dialog').filter({has: page.locator('input[name="title"]')}).last();
            await w.waitFor({timeout: 30000}); await settle();
            await w.getByRole('radio', {name: 'Limit access to specific roles'}).check();
            await w.locator('input[name="userGroupIds"]').first().waitFor({timeout: 15000}).catch(() => {});
            await sleep(600);
            const roles = await w.locator('input[name="userGroupIds"]').evaluateAll((els) => els.map((i) => ((i.closest('label') || {}).innerText || '').trim()));
            await snap(`${label}-template`, {roles}, {png: true});
            await w.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
            await sleep(800);
            const warn = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Yes', exact: true})}).last();
            if (await warn.isVisible().catch(() => false)) await warn.getByRole('button', {name: 'Yes', exact: true}).click();
            await sleep(500);
            return roles;
        }
        async function usersRolesCell(u, label) {
            await page.goto(accessURL(x)); await idle(page).catch(() => {});
            const tbl = page.getByRole('table', {name: /Current Users \(/});
            await tbl.waitFor({timeout: T}).catch(() => {});
            const row = tbl.locator('tbody tr').filter({hasText: email(u)}).first();
            const txt = flat(await row.innerText().catch(() => ''), 200);
            await snap(`${label}-users`, {row: txt}, {png: true});
            return txt;
        }
        async function masthead(label) {
            await vpage.goto(app.url(`/index.php/${x}/about/editorialMasthead`)); await idle(vpage).catch(() => {});
            const s = await snap(`${label}-masthead`, null, {png: true, pg: vpage});
            return flat(s.s.text && s.s.text.main, 900);
        }
        async function profileRoles(u, label) {
            const p2 = await launch(app);
            try {
                await signIn(p2.page, u, {contextPath: x}); await idle(p2.page).catch(() => {});
                await p2.page.goto(app.url(`/index.php/${x}/user/profile`)); await idle(p2.page).catch(() => {});
                const tabR = p2.page.getByRole('tab', {name: 'Roles', exact: true});
                if (await tabR.count()) { await tabR.first().click(); await idle(p2.page).catch(() => {}); await sleep(500); }
                const s = await snap(`${label}-profile-roles`, null, {png: true, pg: p2.page});
                const boxes = await p2.page.locator('input[type=checkbox]:visible').evaluateAll((els) => els.map((i) => `${((i.closest('label') || {}).innerText || i.name).trim().slice(0, 50)}=${i.checked ? 'x' : '-'}${i.disabled ? 'd' : ''}`));
                return {boxes: boxes.slice(0, 6), text: flat(s.s.text && s.s.text.main, 300)};
            } finally { await p2.close(); }
        }

        // ============================================================ stage: a stage change and the role's existing members (330-332)
        await sect('stage', async () => {
            const r = {};
            const member = isOPS ? ux('se') : ux('ce');
            const roleName = isOPS ? V.se : V.ce;
            const [s1, s2] = S.Xsubs;
            const memberView = async (k) => {
                const p2 = await launch(app);
                const o = {};
                try {
                    await signIn(p2.page, member, {contextPath: x}); await idle(p2.page).catch(() => {});
                    for (const [n, id] of [['s1', s1], ['s2', s2]]) {
                        await p2.page.goto(wfUrl(id, V.prod)); await idle(p2.page).catch(() => {});
                        await p2.page.locator('[role="dialog"]:visible').first().waitFor({timeout: 15000}).catch(() => {});
                        await p2.page.waitForFunction(() => { const d = document.querySelector('[role=dialog]'); return !d || !/Loading/.test(d.innerText); }, null, {timeout: 15000}).catch(() => {});
                        await idle(p2.page).catch(() => {}); await sleep(500);
                        const s = await snap(`stage-${k}-${n}-member`, null, {png: n === 's1', pg: p2.page});
                        o[n] = {url: p2.page.url().replace(/^https?:\/\/[^/]+/, ''), dialog: flat(s.s.text && s.s.text.dialog, 600), main: flat(s.s.text && s.s.text.main, 250)};
                    }
                    // the member's own list
                    await p2.page.goto(app.url(`/index.php/${x}/dashboard/editorial`)); await idle(p2.page).catch(() => {});
                    const s = await snap(`stage-${k}-dashboard-member`, null, {png: false, pg: p2.page});
                    o.dashboard = flat(s.s.text && s.s.text.main, 500);
                } finally { await p2.close(); }
                return o;
            };
            const notif = () => psql(app, `select count(*) from notifications n join users u on u.user_id = n.user_id where u.username = '${member}'`);
            const mails = async () => app.mail.count({to: email(member)}).catch((e) => `ERR ${flat(e.message, 80)}`);
            r.baseline = {notif: notif(), mails: await mails()};
            r.before = await memberView('before');
            await as(ux('m'), x);
            await gotoRoles();
            r.rowBefore = await rowOf(roleName);
            await snap('stage-grid-before');
            // OJS/OMP: tick Production for Copyeditor (gain); OPS: untick Production for Moderator (loss).
            r.press1 = await pressStage(roleName, 'Production');
            r.after1 = await memberView('after1');
            r.after1Counts = {notif: notif(), mails: await mails()};
            // the submission's Activity Log, as the manager
            await openWorkflow(s1, V.prod, 'stage-s1-manager');
            const act = page.getByRole('button', {name: /Activity Log/}).first();
            if (await act.count()) {
                await act.click(); await sleep(1500); await settle();
                const s = await snap('stage-s1-activity', null, {png: true});
                r.activity = flat(s.s.text && s.s.text.dialog, 900);
            } else r.activity = 'no Activity Log button';
            await gotoRoles();
            r.press2 = await pressStage(roleName, 'Production');
            r.after2 = await memberView('after2');
            r.after2Counts = {notif: notif(), mails: await mails()};
            await signOut(page);
            fact('stage', r);
        });

        // ============================================================ created: a created role offered, then removed (324-327, Rule 22 rows 1-2)
        await sect('created', async () => {
            const r = {};
            const name = 'K4 Probe';
            const stage = 'Production';
            await as(ux('m'), x);
            r.inviteBefore = (await inviteOptions('cr-before')).filter((o) => o.includes('K4'));
            await gotoRoles();
            // a filler first, so the role under test is not the list's first row (A1)
            if (!(await rowOf('K4 Filler'))) {
                await grid().getByRole('link', {name: 'Create New Role', exact: true}).click(); await waitWindow();
                await form().locator('select[name=roleId]').selectOption({label: 'Reader'}); await settle(); await sleep(700);
                await form().locator('input[name="name[en]"]').fill('K4 Filler'); await form().locator('input[name="abbrev[en]"]').fill('KFF');
                r.filler = await pressOK('cr-filler');
                await gotoRoles();
            }
            await grid().getByRole('link', {name: 'Create New Role', exact: true}).click(); await waitWindow();
            await form().locator('select[name=roleId]').selectOption({label: 'Author'}); await settle(); await sleep(700); await settle();
            await form().locator('input[name="name[en]"]').fill(name); await form().locator('input[name="abbrev[en]"]').fill('KFP');
            await form().getByRole('checkbox', {name: stage, exact: true}).first().check();
            await setBox(/self-registration/i, true);
            r.window = await readWindow();
            await snap('cr-window', {window: r.window});
            r.ok = await pressOK('cr-create');
            await gotoRoles();
            r.row = await rowOf(name);
            r.inviteAfter = (await inviteOptions('cr-after')).filter((o) => o.includes('K4'));
            r.assignAfter = (await assignOptions(S.Xsubs[0], V.prod, 'cr-after')).opts;
            r.templateAfter = await templateRoles(stage, 'cr-after');
            r.profileAfter = await profileRoles(ux('rd'), 'cr-after');
            await vSignOut();
            r.registerAfter = await visit(app.url(`/index.php/${x}/user/register`), 'cr-after-register', {png: true});
            r.registerAfterMentions = await vpage.getByText(name).count().catch(() => null);
            r.siteRegisterMentions = (await visit(app.url('/index.php/index/user/register'), null), await vpage.getByText(name).count().catch(() => null));
            // a Reviewer-level role with "Allow user self-registration": the Register page's reviewer offer
            await gotoRoles();
            await grid().getByRole('link', {name: 'Create New Role', exact: true}).click(); await waitWindow();
            await form().locator('select[name=roleId]').selectOption({label: 'Reviewer'}); await settle(); await sleep(700); await settle();
            await form().locator('input[name="name[en]"]').fill('K4 Referee'); await form().locator('input[name="abbrev[en]"]').fill('KFR');
            await setBox(/self-registration/i, true);
            r.refWindow = await readWindow();
            r.refOk = await pressOK('cr-referee');
            await vSignOut();
            r.refRegister = await visit(app.url(`/index.php/${x}/user/register`), 'cr-referee-register', {png: true});
            r.refRegisterBoxes = await vpage.locator('form#register input[type=checkbox]').evaluateAll((els) => els.map((i) => `${((i.closest('label') || {}).innerText || i.name).replace(/\s+/g, ' ').trim().slice(0, 80)}=${i.checked ? 'x' : '-'}`));
            await visit(app.url('/index.php/index/user/register'), 'cr-referee-site-register');
            r.refSiteRegisterMentions = await vpage.getByText('K4 Referee').count().catch(() => null);
            r.refSiteRegisterMentionsProbe = await vpage.getByText('K4 Probe').count().catch(() => null);
            await gotoRoles();
            const ra = await rowAction('K4 Referee', 'Remove');
            if (ra.ok) { const dl = page.getByRole('dialog').last(); await dl.getByRole('button', {name: 'OK', exact: true}).click(); await sleep(1500); await settle(); }
            r.refRemoved = !(await (async () => { await gotoRoles(); return rowOf('K4 Referee'); })());
            // remove it
            await gotoRoles();
            const a = await rowAction(name, 'Remove');
            r.removeAction = a;
            if (a.ok) {
                const dlg = page.getByRole('dialog').last();
                await dlg.getByRole('button', {name: 'OK', exact: true}).waitFor({timeout: T});
                r.confirm = flat(await dlg.innerText(), 300);
                await dlg.getByRole('button', {name: 'OK', exact: true}).click();
                await sleep(1500); await settle();
                r.removeNotices = (await page.locator('.app__notifications').allInnerTexts().catch(() => [])).map((n) => flat(n, 160));
            }
            await gotoRoles();
            r.rowAfterRemove = await rowOf(name);
            r.inviteRemoved = (await inviteOptions('cr-removed')).filter((o) => o.includes('K4'));
            r.assignRemoved = (await assignOptions(S.Xsubs[0], V.prod, 'cr-removed')).opts;
            r.templateRemoved = await templateRoles(stage, 'cr-removed');
            r.profileRemoved = await profileRoles(ux('rd'), 'cr-removed');
            await signOut(page);
            fact('created', r);
        });

        // ============================================================ rename: a renamed role on the screens that name it; the masthead box (328-329, Rule 22 rows 5, 7)
        await sect('rename', async () => {
            const r = {};
            const nn = 'K4 Board';
            await as(ux('m'), x);
            r.usersBefore = await usersRolesCell(ux('eb'), 'rn-before');
            r.inviteBefore = (await inviteOptions('rn-before')).filter((o) => /Board/.test(o));
            r.mastheadBefore = await masthead('rn-before');
            await gotoRoles();
            let a = await rowAction(V.eb, 'Edit');
            r.editAction = a;
            if (a.ok) {
                await waitWindow();
                await form().locator('input[name="name[en]"]').fill(nn);
                r.ok = await pressOK('rn-rename');
            }
            r.usersAfter = await usersRolesCell(ux('eb'), 'rn-after');
            r.inviteAfter = (await inviteOptions('rn-after')).filter((o) => /Board/.test(o));
            r.mastheadAfter = await masthead('rn-after');
            // Settings › Website › Appearance › "Editorial Masthead" order list
            await page.goto(app.url(`/index.php/${x}/management/settings/website`)); await idle(page).catch(() => {});
            await page.getByRole('tab', {name: 'Editorial Masthead'}).first().click().catch(() => {});
            await sleep(800); await settle();
            const sOrd = await snap('rn-after-order-list');
            r.orderList = flat(await page.locator('[role=tabpanel]:visible').filter({hasText: /masthead roles/i}).last().innerText().catch(() => ''), 500) || flat(sOrd.s.text && sOrd.s.text.main, 500);
            // "Consider role in masthead list" unticked on the renamed role
            await gotoRoles();
            a = await rowAction(nn, 'Edit');
            if (a.ok) {
                await waitWindow();
                r.windowBeforeMasthead = await readWindow();
                await setBox(/Consider role in masthead list/i, false);
                r.okMasthead = await pressOK('rn-masthead');
            } else r.mastheadEdit = a;
            r.mastheadUnticked = await masthead('rn-masthead-off');
            await page.goto(app.url(`/index.php/${x}/management/settings/website`)); await idle(page).catch(() => {});
            await page.getByRole('tab', {name: 'Editorial Masthead'}).first().click().catch(() => {});
            await sleep(800); await settle();
            const s2 = await snap('rn-off-order-list');
            r.orderListOff = flat(await page.locator('[role=tabpanel]:visible').filter({hasText: /masthead roles/i}).last().innerText().catch(() => ''), 500) || flat(s2.s.text && s2.s.text.main, 500);
            await signOut(page);
            fact('rename', r);
        });

        // ============================================================ options: recommend-only, metadata, "Permit changes to Settings" (Rule 22 rows 3, 4, 6; 333-334)
        await sect('options', async () => {
            const r = {};
            const [s1] = S.Xsubs;
            // O: a context whose Section editor is not yet on the submission, so "Assign" can pick them.
            if (!S.O) {
                S.O = `${S.t}o`;
                await app.api.createContext({tag: S.O, context: {name: `U54 K4 options ${S.O}`, acronym: 'KFO', contactName: 'K4 Contact', contactEmail: `${S.O}c@mail.test`},
                    users: [{username: `${S.O}m`, roles: ['manager'], givenName: 'Oma', familyName: 'Manager'}, {username: `${S.O}se`, roles: ['sectionEditor'], givenName: 'Osi', familyName: 'Editor'}, {username: `${S.O}a`, roles: ['author'], givenName: 'Ola', familyName: 'Author'}]});
                const so = await app.api.createSubmission({tag: `${S.O}s1`, context: S.O, submitter: `${S.O}a`, title: `K4 O s1 ${S.t}`, ...(isOPS ? {} : {decisions: ['skipExternalReview', 'sendToProduction']})});
                S.Osub = so.submissionId;
                fs.writeFileSync(stateFile(app), JSON.stringify(S, null, 2));
            }
            // assignOptions/gotoRoles read the context from `x`; run them against O through a local override
            const withCtx = async (ctx, fn) => { ctxOverride = ctx; try { return await fn(); } finally { ctxOverride = null; } };
            const dbSe = () => psql(app, `select sa.submission_id, sa.recommend_only, sa.can_change_metadata from stage_assignments sa join users u on u.user_id = sa.user_id where u.username = '${ux('se')}' order by 1`);
            await as(`${S.O}m`, S.O);
            r.assignBefore = await withCtx(S.O, async () => (await assignOptions(S.Osub, V.prod, 'op-before', V.se, 'Osi')).boxes);
            await withCtx(S.O, () => gotoRoles(S.O));
            let a = await rowAction(V.se, 'Edit');
            if (a.ok) {
                await waitWindow();
                r.seWindowBefore = await readWindow();
                await setBox(/only allowed to recommend/i, true);
                await setBox(/Permit submission metadata edit/i, false);
                r.seWindowSet = await readWindow();
                r.okSe = await pressOK('op-se');
            } else r.seEdit = a;
            r.assignAfter = await withCtx(S.O, async () => (await assignOptions(S.Osub, V.prod, 'op-after', V.se, 'Osi')).boxes);
            await signOut(page);
            // X: the existing assignments of the Section editor role (333-334)
            await as(ux('m'), x);
            r.dbBefore = dbSe();
            await gotoRoles();
            a = await rowAction(V.se, 'Edit');
            if (a.ok) {
                await waitWindow();
                r.xSeWindowBefore = await readWindow();
                await setBox(/Permit submission metadata edit/i, false);
                r.okXSe = await pressOK('op-xse');
            } else r.xSeEdit = a;
            r.dbAfter = dbSe();
            // the participant's own "Edit" window on s1 (Participants panel), as the manager
            await openWorkflow(s1, V.prod, 'op-xse-wf');
            // "Permit changes to Settings" on K4 Chief: ticked, then unticked
            const chiefView = async (k) => {
                const p2 = await launch(app);
                try {
                    await signIn(p2.page, ux('ch'), {contextPath: x}); await idle(p2.page).catch(() => {});
                    const resp = await p2.page.goto(accessURL(x)); await idle(p2.page).catch(() => {});
                    const s = await snap(`op-chief-${k}`, null, {png: true, pg: p2.page});
                    const tabs = await p2.page.getByRole('tab').allInnerTexts().then((t) => t.map((y) => flat(y, 30))).catch(() => []);
                    return {status: resp ? resp.status() : null, url: p2.page.url().replace(/^https?:\/\/[^/]+/, ''), tabs, text: flat(s.s.text && (s.s.text.dialog || s.s.text.main), 250)};
                } finally { await p2.close(); }
            };
            r.chiefStart = await chiefView('start');
            for (const [k, v] of [['ticked', true], ['unticked', false]]) {
                await gotoRoles();
                a = await rowAction('K4 Chief', 'Edit');
                if (!a.ok) { r[`chief-${k}-edit`] = a; continue; }
                await waitWindow();
                r[`chiefWindow-${k}-before`] = await readWindow();
                await setBox(/Permit changes to Settings/i, v);
                r[`okChief-${k}`] = await pressOK(`op-chief-${k}`);
                r[`chief-${k}`] = await chiefView(k);
            }
            await signOut(page);
            fact('options', r);
        });

        // ============================================================ notify: the page's tabs, "Notify" with bulk email allowed (386-387)
        await sect('notify', async () => {
            const r = {};
            const tabsOf = async () => { await page.goto(accessURL(x)); await idle(page).catch(() => {}); return (await page.getByRole('tab').allInnerTexts()).map((t) => flat(t, 40)); };
            await as(ux('m'), x);
            r.mgrBefore = await tabsOf();
            await snap('nt-mgr-before', {tabs: r.mgrBefore});
            await as('admin', x);
            const setBulk = async (value) => {
                await page.goto(app.url('/index.php/index/admin/settings')); await idle(page).catch(() => {});
                await page.locator('#setup-button').first().click().catch(() => {});
                await page.locator('#bulkEmails-button').first().click();
                await settle(); await sleep(600);
                const box = page.getByRole('checkbox', {name: new RegExp(x)});
                if (!(await box.count())) return {n: 0};
                const was = await box.isChecked();
                if (value) await box.check(); else await box.uncheck();
                const f = page.locator('form').filter({has: box}).last();
                const w = page.waitForResponse((rr) => /\/api\/v1\/site/.test(rr.url()) && rr.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await f.getByRole('button', {name: 'Save', exact: true}).click();
                const rr = await w; await sleep(800);
                return {was, status: rr ? rr.status() : null};
            };
            r.tick = await setBulk(true);
            await as(ux('m'), x);
            r.mgrTicked = await tabsOf();
            await snap('nt-mgr-ticked', {tabs: r.mgrTicked});
            const nt = page.getByRole('tab', {name: 'Notify'});
            if (await nt.count()) { await nt.click(); await settle(); await snap('nt-notify-tab'); }
            await as('admin', x);
            r.untick = await setBulk(false);
            await as(ux('m'), x);
            r.mgrAfter = await tabsOf();
            await signOut(page);
            fact('notify', r);
        });

        // ============================================================ sysinfo: where the audit log switch could show (350-353)
        await sect('sysinfo', async () => {
            const r = {};
            await as('admin', x);
            await page.goto(app.url('/index.php/index/admin/systemInfo')); await idle(page).catch(() => {});
            const s = await snap('si-system-info');
            const txt = (s.s.text && s.s.text.main) || '';
            r.hasLogs = /\blogs\b/i.test(txt);
            r.logsLines = txt.split('\n').filter((l) => /log_/i.test(l)).map((l) => flat(l, 100)).slice(0, 20);
            r.hasAudit = /audit/i.test(txt);
            // the site settings: any word "audit"
            await page.goto(app.url('/index.php/index/admin/settings')); await idle(page).catch(() => {});
            const s2 = await snap('si-site-settings', null, {png: false});
            r.siteSettingsAudit = /audit/i.test(JSON.stringify(s2.s));
            await signOut(page);
            fact('sysinfo', r);
        });

        // ============================================================ nomail: no email to the members after every control (335-338), bounded by a control
        await sect('nomail', async () => {
            const r = {};
            const members = ['m', 'eb', 'se', 'rd', 'au', 'ch', ...(isOPS ? [] : ['ce'])].map(ux);
            r.before = {};
            for (const u of members) r.before[u.replace(x, '')] = await app.mail.count({to: email(u)}).catch(() => 'ERR');
            r.accessMgr = await app.mail.count({to: email(`${S.A}m`)}).catch(() => 'ERR');
            r.notifications = psql(app, `select u.username, n.type, count(*) from notifications n join users u on u.user_id = n.user_id where u.username like '${x}%' group by 1, 2 order by 1`);
            // positive control: "Forgot your password?" for rd, a screen that does send mail
            await vSignOut();
            await vpage.goto(app.url(`/index.php/${x}/login/lostPassword`)); await idle(vpage).catch(() => {});
            await vpage.locator('input[name="email"]').fill(email(ux('rd')));
            await vpage.getByRole('button', {name: /Reset password/i}).click();
            await idle(vpage).catch(() => {});
            r.control = await app.mail.find({to: email(ux('rd')), timeoutMs: 20000}).then((m) => flat(m.Subject, 80)).catch((e) => `none: ${flat(e.message, 80)}`);
            r.after = {};
            for (const u of members) r.after[u.replace(x, '')] = await app.mail.count({to: email(u)}).catch(() => 'ERR');
            fact('nomail', r);
        });
        // ============================================================ grid: fn-g's open question (boxes of the Subscription Manager and the two reviewer rows),
        // and a first-stage box read in a section's "Editorial Assignments" (Rule 22 row 1, Sections)
        await sect('grid', async () => {
            const r = {};
            await as(ux('m'), x);
            await gotoRoles();
            r.rows = (await readRows()).map((w) => `${w.name} | ${w.level} | ${w.boxes}`);
            await snap('gr-rows');
            const presses = isOJS ? [['Subscription Manager', 'Submission'], ['Subscription Manager', 'Production']]
                : isOMP ? [['Internal Reviewer', 'External Review'], ['External Reviewer', 'Internal Review']] : [];
            r.presses = [];
            for (const [role, stage] of presses) {
                const one = await pressStage(role, stage);
                const two = await pressStage(role, stage);
                r.presses.push({role, stage, first: {op: one.op, notices: one.notices, before: one.before, after: one.afterReload}, second: {op: two.op, notices: two.notices, after: two.afterReload}});
            }
            // Sections (Series): the Editorial Assignments boxes before and after the first stage is ticked for a role
            // OPS: Editorial Board Member (renamed "K4 Board" by the rename phase)
            const role = isOPS ? ((await rowOf('K4 Board')) ? 'K4 Board' : V.eb) : V.ce;
            const first = isOPS ? 'Production' : 'Submission';
            const TAB = isOMP ? 'Series' : 'Sections';
            const sgrid = () => page.locator(isOMP ? '#seriesGridContainer' : '#sectionsGridContainer');
            const sform = () => page.locator(isOMP ? 'form#seriesForm' : 'form#sectionForm');
            const assignBoxes = async (k) => {
                await page.goto(app.url(`/index.php/${x}/management/settings/context`)); await idle(page).catch(() => {});
                await page.getByRole('tab', {name: TAB, exact: true}).first().click(); await idle(page).catch(() => {});
                await sgrid().waitFor({timeout: T});
                await sgrid().getByRole('link', {name: isOMP ? /Add Series/ : /Create Section/}).first().click();
                await sform().locator('input[name^="title"]').first().waitFor({timeout: T}); await idle(page).catch(() => {}); await sleep(700);
                const boxes = await sform().locator('input[name^="subEditors"]').evaluateAll((els) => els.map((e) => ((e.closest('label') || e.parentElement).innerText || '').replace(/\s+/g, ' ').trim()));
                await snap(`gr-section-${k}`, {boxes}, {png: true});
                const c = sform().getByRole('link', {name: 'Cancel', exact: true}).or(sform().getByRole('button', {name: 'Cancel', exact: true}));
                await c.first().click().catch(() => {}); await sleep(900);
                return boxes;
            };
            r.sectionBefore = await assignBoxes('before');
            await gotoRoles();
            r.sectionPress1 = await pressStage(role, first);
            r.sectionAfter = await assignBoxes('after');
            await gotoRoles();
            r.sectionPress2 = await pressStage(role, first);
            r.sectionReverted = await assignBoxes('reverted');
            await signOut(page);
            fact('grid', r);
        });
    } finally {
        record('k4-run', {bad: bad.filter((b) => b.status >= 500), pageErrors, dialogs});
        if (on('fields')) note(`ccK4: K4 [${app.name}] · Site Access Options: boxes by name (input[name=restrictSiteAccess], input[name=${V.box}], radios input[name=disableUserReg] nth 0 open / 1 closed); the form is page.locator("form").filter({has: the site box}); a signed-out visitor is a second launch(app).`);
        await vis.close();
        await close();
    }
});
