// U67 claim check K1 — Settings › Distribution › "Archiving" (both side tabs, the "Publisher Manifest"
// links), who reaches it, the save and what it leaves, the OMP/OPS absence, the Actors rows for the
// journal's and the site's LOCKSS/CLOCKSS pages (t7, t8, t9), and the side effects of a save.
// Seeds its own scratch journals (tag prefix u67k1); publicknowledge and the roster are read only.
//
//   RUN=r1 PROBE_FEATURE=U67 PROBE_AGENT=ccK1 node bin/probe.js all shared/playwright/checks/U67/K1/k1.js
//   RUN=r2 …  (a second, independent run: every fact is taken twice, each run on its own journals)
//   PHASES=seed,access,pn,tab,effects,pages,site,hosted,french,links,absence  (default: all; `seed` is needed by the rest)
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const ALL = ['seed', 'access', 'pn', 'tab', 'effects', 'pages', 'site', 'hosted', 'french', 'links', 'absence'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const strip = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const LOCKSS = 'Enable LOCKSS to store and distribute journal content at participating libraries via a LOCKSS Publisher Manifest page.';
const CLOCKSS = 'Enable CLOCKSS to store and distribute journal content at participating libraries via a CLOCKSS Publisher Manifest page.';
const DENIED = /does not have access to this operation/i;

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const PK = app.contextPath;
    await app.api.bootstrapProbe(PK);
    const facts = {run: RUN, app: app.name};
    const fact = (k, v) => { facts[k] = v; record(`${RUN}-facts`, {[k]: v, run: RUN}, {merge: true}); };
    const log = (...a) => console.log(`[k1 ${RUN} ${app.name}]`, new Date().toISOString().slice(11, 19), ...a);

    const {context, page, close} = await launch(app);
    // every request to a host other than the probe server, for "nothing is sent to a network"
    const external = [];
    context.on('request', (r) => { try { const h = new URL(r.url()).hostname; if (!/^(127\.0\.0\.1|localhost)$/.test(h) && !/^(data|blob):/.test(r.url())) external.push({url: r.url().slice(0, 200), method: r.method(), at: new Date().toISOString()}); } catch { /* ignore */ } });
    const dialogs = [];
    page.on('dialog', async (d) => { dialogs.push({type: d.type(), message: d.message().slice(0, 200), url: strip(page.url())}); await d.accept().catch(() => {}); });

    const go = async (p, pg = page) => { const r = await pg.goto(app.url(p)).catch((e) => ({err: String(e.message).slice(0, 200)})); await idle(pg).catch(() => {}); return r && typeof r.status === 'function' ? r.status() : (r && r.err) || null; };
    async function snap(name, pg = page, extra = {}) {
        let s;
        try { s = await screen(pg); } catch (e) { s = {url: pg.url(), title: await pg.title().catch(() => null), error: String(e.message).slice(0, 300)}; }
        Object.assign(s, extra);
        record(`${RUN}-${name}`, s);
        await shot(pg, `${RUN}-${name}`).catch(() => {});
        return s;
    }
    async function sect(name, fn) {
        log(`== ${name}`);
        try { return await fn(); } catch (e) {
            log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | '));
            fact(`${name}.FAILED`, String(e.message || e).slice(0, 600));
            await snap(`zz-failed-${name}`).catch(() => {});
            return null;
        }
    }
    async function headings(pg = page) {
        return pg.locator('h1:visible, h2:visible, h3:visible').allInnerTexts().then((a) => a.map((x) => flat(x, 120))).catch(() => []);
    }
    async function classify(pg = page, httpStatus = null) {
        const text = await pg.locator('body').innerText().catch(() => '');
        const url = pg.url();
        return {httpStatus, url: strip(url), title: await pg.title().catch(() => null), headings: await headings(pg),
            loginForm: /\/login/.test(url) && (await pg.locator('input[name="username"], #username').count()) > 0,
            denied: DENIED.test(text), notFound: /404 Not Found/i.test(text),
            tabs: (await pg.getByRole('tab').allInnerTexts().catch(() => [])).map((t) => flat(t, 60)),
            snippet: flat(text, 300)};
    }
    async function readNav(pg = page) {
        const nav = pg.getByRole('navigation', {name: 'Site Navigation'});
        if (!(await nav.count().catch(() => 0))) return {present: false, groups: []};
        const groups = await nav.locator('[role="button"][aria-controls]').evaluateAll((els) => els.map((e) => {
            const region = document.getElementById(e.getAttribute('aria-controls') || '');
            return {label: e.getAttribute('aria-label') || e.textContent.replace(/\s+/g, ' ').trim(),
                items: region ? [...region.querySelectorAll('[role="treeitem"]')].map((li) => li.getAttribute('aria-label') || li.textContent.replace(/\s+/g, ' ').trim()) : []};
        })).catch(() => []);
        const s = groups.find((g) => /^Settings$/i.test(g.label));
        return {present: true, groups: groups.map((g) => g.label), settings: s ? s.items : null};
    }
    // the controls of a region, as a user could press them
    async function controls(region) {
        return region.locator('a, button, input, select, textarea, [role="button"], [role="checkbox"], [role="link"], [tabindex]').evaluateAll((els) => els.map((e) => ({
            tag: e.tagName.toLowerCase(), type: e.getAttribute('type'), role: e.getAttribute('role'), name: e.getAttribute('name'),
            text: (e.innerText || e.value || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 120),
            href: e.getAttribute('href'), target: e.getAttribute('target'), disabled: e.disabled || e.getAttribute('aria-disabled') === 'true',
            checked: e.type === 'checkbox' ? e.checked : undefined,
            visible: !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length),
        }))).catch((e) => [{error: String(e.message).slice(0, 100)}]);
    }
    const panel = (name) => page.getByRole('tabpanel', {name, exact: true});
    async function openArchiving(ctx, side = 'LOCKSS and CLOCKSS') {
        const status = await go(`/index.php/${ctx}/management/settings/distribution`);
        const arch = page.getByRole('tab', {name: 'Archiving', exact: true});
        if (!(await arch.count())) return {status, archiving: false};
        await arch.first().click(); await idle(page); await sleep(400);
        if (side) {
            await page.getByRole('tab', {name: side, exact: true}).first().click(); await idle(page); await sleep(400);
            await panel(side).first().waitFor({timeout: T}).catch(() => {});
        }
        return {status, archiving: true, url: strip(page.url())};
    }
    async function boxes() {
        const p = panel('LOCKSS and CLOCKSS');
        return {
            lockss: await p.getByRole('checkbox', {name: LOCKSS}).isChecked().catch((e) => `ERR ${flat(e.message, 60)}`),
            clockss: await p.getByRole('checkbox', {name: CLOCKSS}).isChecked().catch((e) => `ERR ${flat(e.message, 60)}`),
        };
    }
    async function saveTab(name) {
        const p = panel('LOCKSS and CLOCKSS');
        const reqs = [];
        const onReq = (r) => { if (/\/api\/v1\//.test(r.url()) && r.method() !== 'GET') reqs.push({method: r.method(), url: strip(r.url()), override: r.headers()['x-http-method-override'] || null, post: flat(r.postData(), 300)}); };
        page.on('request', onReq);
        const w = page.waitForResponse((x) => /\/api\/v1\/contexts\/\d+/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await p.getByRole('button', {name: 'Save', exact: true}).click();
        const resp = await w;
        const saved = await p.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10_000}).then(() => true).catch(() => false);
        const statusText = await p.locator('[role="status"]').allInnerTexts().then((a) => a.map((x) => flat(x, 80))).catch(() => []);
        const s = await snap(name);
        await sleep(300);
        page.off('request', onReq);
        return {status: resp ? resp.status() : null, saved, statusText, reqs, notices: s.notices, errors: await p.locator('.pkpFieldError, .pkpFormPage__errors').allInnerTexts().catch(() => [])};
    }
    // press a "Publisher Manifest" link; record where it lands and whether it is a new browser tab
    async function pressManifest(group, name) {
        const link = panel('LOCKSS and CLOCKSS').getByRole('group', {name: group, exact: true}).getByRole('link', {name: 'Publisher Manifest'});
        const meta = await link.evaluate((a) => ({href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel')})).catch((e) => ({error: flat(e.message, 100)}));
        const before = page.url();
        const [pop] = await Promise.all([context.waitForEvent('page', {timeout: 10_000}).catch(() => null), link.click().catch(() => null)]);
        const out = {link: {...meta, href: strip(meta.href)}, newTab: !!pop};
        const pg = pop || page;
        await pg.waitForLoadState('load').catch(() => {}); await idle(pg).catch(() => {});
        const s = await snap(name, pg);
        Object.assign(out, {url: strip(pg.url()), title: s.title, headings: await headings(pg), sameTabUrlAfter: strip(page.url()), sameTabMoved: page.url() !== before});
        if (pop) await pop.close().catch(() => {});
        return out;
    }
    const U = (t, k, roles, extra = {}) => ({username: `${t}${k}`, roles, givenName: k.toUpperCase(), familyName: `K1${k}`, ...extra});

    // =====================================================================================================
    const S = {};
    if (on('seed')) await sect('seed', async () => {
        if (isOJS) {
            // A: access journal, one account per permission level
            const a = tag('u67k1a');
            const ra = await app.api.createContext({tag: a, context: {acronym: 'K1A', country: 'CA'},
                customRoles: [{key: 'nopermit', level: 'manager', name: 'K1 Manager Without Settings', abbrev: 'K1MW'}],
                users: [U(a, 'mgr', ['manager']), U(a, 'ed', ['editor']), U(a, 'pe', ['productionEditor']), U(a, 'np', ['nopermit']),
                    U(a, 'se', ['sectionEditor']), U(a, 'cp', ['copyeditor']), U(a, 'au', ['author']), U(a, 'rv', ['externalReviewer']),
                    U(a, 'rd', ['reader']), U(a, 'sm', ['subscriptionManager'])]});
            // T: the tab drive, a published issue and article (for the page and the activity log)
            const t = tag('u67k1t');
            const rt = await app.api.createContext({tag: t, context: {acronym: 'K1T', country: 'CA'}, issues: [{volume: 1, number: 1, year: 2025, published: true}],
                users: [U(t, 'mgr', ['manager']), U(t, 'au', ['author']), U(t, 'rd', ['reader'])]});
            const sub = await app.api.createSubmission({context: t, submitter: `${t}au`, tag: `${t}s1`, title: `K1 Article ${t}`, issue: {volume: 1, number: 1, year: 2025}, published: true});
            // N: a journal left unticked
            const n = tag('u67k1n');
            await app.api.createContext({tag: n, users: [U(n, 'mgr', ['manager'])]});
            // R: sign-in required, both ticked; D: not enabled publicly, both ticked
            const r = tag('u67k1r');
            await app.api.createContext({tag: r, restrictSiteAccess: true, enableLockss: true, enableClockss: true, issues: [{volume: 1, number: 1, year: 2025, published: true}],
                users: [U(r, 'mgr', ['manager']), U(r, 'rd', ['reader'])]});
            const d = tag('u67k1d');
            await app.api.createContext({tag: d, context: {enabled: false}, enableLockss: true, enableClockss: true, issues: [{volume: 1, number: 1, year: 2025, published: true}],
                users: [U(d, 'mgr', ['manager']), U(d, 'rd', ['reader'])]});
            Object.assign(S, {A: a, T: t, N: n, R: r, D: d, sid: sub && (sub.submissionId || sub.id), subResp: flat(JSON.stringify(sub), 300), aId: ra && ra.id, tId: rt && rt.id});
        } else {
            const x = tag('u67k1x');
            await app.api.createContext({tag: x, users: [U(x, 'mgr', ['manager'])]});
            S.X = x;
        }
        fact('seed', S);
        log('seed', JSON.stringify(S));
    });

    try {
        // ================================================================= access: who reaches the tab (OJS)
        if (on('access') && isOJS && S.A) await sect('access', async () => {
            const A = S.A;
            const out = {};
            // signed out first
            await signOut(page).catch(() => {});
            const st0 = await go(`/index.php/${A}/management/settings/distribution`);
            out.signedOut = await classify(page, st0);
            await snap('a-00-signed-out');
            const who = [['mgr', `${A}mgr`], ['ed', `${A}ed`], ['pe', `${A}pe`], ['admin', 'admin'], ['np', `${A}np`], ['se', `${A}se`], ['cp', `${A}cp`],
                ['sm', `${A}sm`], ['au', `${A}au`], ['rv', `${A}rv`], ['rd', `${A}rd`]];
            for (const [k, user] of who) {
                const o = {};
                await signIn(page, user, {contextPath: A}); await idle(page);
                o.landed = strip(page.url());
                o.nav = await readNav(page);
                const st = await go(`/index.php/${A}/management/settings/distribution`);
                o.page = await classify(page, st);
                await snap(`a-01-${k}-distribution`);
                const arch = page.getByRole('tab', {name: 'Archiving', exact: true});
                o.archivingTab = await arch.count();
                if (o.archivingTab) {
                    await arch.first().click(); await idle(page); await sleep(400);
                    o.sideTabs = await panel('Archiving').getByRole('tab').allInnerTexts().then((a) => a.map((x) => flat(x, 60))).catch(() => []);
                    o.selectedSide = await panel('Archiving').getByRole('tab', {selected: true}).allInnerTexts().catch(() => []);
                    o.urlAfterArchiving = strip(page.url());
                    await snap(`a-02-${k}-archiving`);
                    await page.getByRole('tab', {name: 'PKP Preservation Network (PN)', exact: true}).click(); await idle(page); await sleep(300);
                    o.pnControls = await controls(panel('PKP Preservation Network (PN)'));
                    await snap(`a-03-${k}-pn`);
                    await page.getByRole('tab', {name: 'LOCKSS and CLOCKSS', exact: true}).click(); await idle(page); await sleep(300);
                    o.lockssControls = await controls(panel('LOCKSS and CLOCKSS'));
                    o.boxes = await boxes();
                    await snap(`a-04-${k}-lockss`);
                    // a save round trip as each level that reaches the tab (not on the manager: the tab phase does it)
                    if (k !== 'mgr') {
                        await panel('LOCKSS and CLOCKSS').getByRole('checkbox', {name: LOCKSS}).check();
                        o.saveTick = await saveTab(`a-05-${k}-saved-ticked`);
                        await page.reload(); await idle(page);
                        await openArchiving(A);
                        o.afterReloadTick = await boxes();
                        await panel('LOCKSS and CLOCKSS').getByRole('checkbox', {name: LOCKSS}).uncheck();
                        o.saveUntick = await saveTab(`a-06-${k}-saved-unticked`);
                        await openArchiving(A);
                        o.afterReloadUntick = await boxes();
                    }
                }
                out[k] = o;
                log('access', k, JSON.stringify({landed: o.landed, settings: o.nav.settings, url: o.page.url, denied: o.page.denied, login: o.page.loginForm, arch: o.archivingTab, save: o.saveTick && [o.saveTick.status, o.saveTick.saved, o.afterReloadTick, o.saveUntick.status, o.afterReloadUntick]}));
            }
            // the seeded journal, read only: the tab there as its Journal Manager
            await signIn(page, 'manager.maya', {contextPath: PK});
            const pk = await openArchiving(PK);
            out.pk = {...pk, boxes: await boxes(), tabs: (await page.getByRole('tab').allInnerTexts()).map((x) => flat(x, 60))};
            await snap('a-07-pk-lockss');
            // an address hash naming the tab, typed
            await go('/index.php/index/admin');
            await go(`/index.php/${PK}/management/settings/distribution#archive`);
            await sleep(800);
            out.pkHash = {url: strip(page.url()), selected: await page.getByRole('tab', {selected: true}).allInnerTexts().catch(() => [])};
            await snap('a-08-pk-hash-archive');
            fact('access', out);
        });

        // ================================================================= pn: the PN side tab (OJS)
        if (on('pn') && isOJS && S.T) await sect('pn', async () => {
            const o = {};
            await signIn(page, `${S.T}mgr`, {contextPath: S.T});
            const r = await openArchiving(S.T, null);
            o.open = r;
            o.topTabs = (await page.getByRole('tablist').first().getByRole('tab').allInnerTexts()).map((x) => flat(x, 60));
            o.sideTabs = (await panel('Archiving').getByRole('tab').allInnerTexts()).map((x) => flat(x, 60));
            o.selectedOnOpen = await panel('Archiving').getByRole('tab', {selected: true}).allInnerTexts().catch(() => []);
            await snap('p-01-archiving-open');
            await page.getByRole('tab', {name: 'PKP Preservation Network (PN)', exact: true}).click(); await idle(page); await sleep(400);
            const p = panel('PKP Preservation Network (PN)');
            o.url = strip(page.url());
            o.text = await p.innerText().catch(() => null);
            o.html = flat(await p.innerHTML().catch(() => ''), 1500);
            o.headingsInPanel = await p.locator('h1,h2,h3,h4,legend,label,.pkpFormFieldLabel').allInnerTexts().catch(() => []);
            o.controls = await controls(p);
            o.saveButtons = await p.getByRole('button', {name: 'Save'}).count();
            o.buttons = await p.getByRole('button').allInnerTexts().catch(() => []);
            o.links = await p.getByRole('link').allInnerTexts().catch(() => []);
            await snap('p-02-pn-tab');
            await loc(page, 'the PN side tab', page.getByRole('tab', {name: 'PKP Preservation Network (PN)', exact: true}));
            await loc(page, 'the PN tab panel', p);
            fact('pn', o);
            log('pn', JSON.stringify({side: o.sideTabs, sel: o.selectedOnOpen, text: flat(o.text, 400), controls: o.controls.length, save: o.saveButtons}));
        });

        // ================================================================= tab: the LOCKSS and CLOCKSS side tab (OJS)
        if (on('tab') && isOJS && S.T) await sect('tab', async () => {
            const T0 = S.T;
            const o = {};
            await signIn(page, `${T0}mgr`, {contextPath: T0});
            // mail and header before
            o.mailBefore = {};
            for (const k of ['mgr', 'au', 'rd']) o.mailBefore[k] = await app.mail.count({to: `${T0}${k}@mail.test`}).catch((e) => `ERR ${e.message}`);
            o.mailTotalBefore = await app.mail.messageCount().catch(() => null);
            await openArchiving(T0);
            o.url = strip(page.url());
            o.default = await boxes();
            o.controls = await controls(panel('LOCKSS and CLOCKSS'));
            o.groups = await panel('LOCKSS and CLOCKSS').getByRole('group').evaluateAll((els) => els.map((g) => ({name: g.getAttribute('aria-label') || (g.querySelector('legend') || {}).innerText || null, text: g.innerText.replace(/\s+/g, ' ').trim()}))).catch(() => []);
            o.panelText = await panel('LOCKSS and CLOCKSS').innerText().catch(() => null);
            const s0 = await snap('t-01-default');
            o.headerBefore = s0.text && s0.text.header;
            await loc(page, 'LOCKSS box', panel('LOCKSS and CLOCKSS').getByRole('checkbox', {name: LOCKSS}));
            await loc(page, 'CLOCKSS box', panel('LOCKSS and CLOCKSS').getByRole('checkbox', {name: CLOCKSS}));
            await loc(page, 'LOCKSS Publisher Manifest link', panel('LOCKSS and CLOCKSS').getByRole('group', {name: 'LOCKSS', exact: true}).getByRole('link', {name: 'Publisher Manifest'}));
            await loc(page, 'CLOCKSS Publisher Manifest link', panel('LOCKSS and CLOCKSS').getByRole('group', {name: 'CLOCKSS', exact: true}).getByRole('link', {name: 'Publisher Manifest'}));
            // the links while unticked (t2 first half)
            o.linkUnticked = {lockss: await pressManifest('LOCKSS', 't-02-link-lockss-unticked'), clockss: await pressManifest('CLOCKSS', 't-03-link-clockss-unticked')};
            // unsaved tick: pressing the link, moving between side tabs, top tabs, leaving the page
            await panel('LOCKSS and CLOCKSS').getByRole('checkbox', {name: LOCKSS}).check();
            o.linkUnsavedTick = await pressManifest('LOCKSS', 't-04-link-lockss-unsaved-tick');
            await page.getByRole('tab', {name: 'PKP Preservation Network (PN)', exact: true}).click(); await idle(page);
            await page.getByRole('tab', {name: 'LOCKSS and CLOCKSS', exact: true}).click(); await idle(page);
            o.unsavedAfterSideTab = await boxes();
            await page.getByRole('tab', {name: 'Access', exact: true}).click(); await idle(page); await sleep(300);
            await snap('t-05-unsaved-on-access');
            await page.getByRole('tab', {name: 'Archiving', exact: true}).click(); await idle(page); await sleep(300);
            o.sideSelectedAfterTopTab = await panel('Archiving').getByRole('tab', {selected: true}).allInnerTexts().catch(() => []);
            await page.getByRole('tab', {name: 'LOCKSS and CLOCKSS', exact: true}).click(); await idle(page);
            o.unsavedAfterTopTab = await boxes();
            await snap('t-06-unsaved-back');
            const d0 = dialogs.length;
            await go(`/index.php/${T0}/management/settings/website`);
            o.leave = {url: strip(page.url()), dialogs: dialogs.slice(d0)};
            await openArchiving(T0);
            o.unsavedAfterLeave = await boxes();
            await snap('t-07-after-leave');
            // a reload with a tick unsaved
            await panel('LOCKSS and CLOCKSS').getByRole('checkbox', {name: CLOCKSS}).check();
            const d1 = dialogs.length;
            await page.reload(); await idle(page);
            o.reloadUnsaved = {dialogs: dialogs.slice(d1), url: strip(page.url())};
            await openArchiving(T0);
            o.unsavedAfterReload = await boxes();
            // LOCKSS alone
            await panel('LOCKSS and CLOCKSS').getByRole('checkbox', {name: LOCKSS}).check();
            o.saveL = await saveTab('t-08-saved-lockss-only');
            o.saveL.samePage = await boxes();
            o.saveL.links = {lockss: await pressManifest('LOCKSS', 't-09-link-lockss-saved'), clockss: await pressManifest('CLOCKSS', 't-10-link-clockss-unticked')};
            await page.reload(); await idle(page); await openArchiving(T0);
            o.saveL.afterReload = await boxes();
            await snap('t-11-reload-lockss-only');
            // CLOCKSS alone
            await panel('LOCKSS and CLOCKSS').getByRole('checkbox', {name: LOCKSS}).uncheck();
            await panel('LOCKSS and CLOCKSS').getByRole('checkbox', {name: CLOCKSS}).check();
            o.saveC = await saveTab('t-12-saved-clockss-only');
            o.saveC.samePage = await boxes();
            o.saveC.links = {lockss: await pressManifest('LOCKSS', 't-13-link-lockss-unticked'), clockss: await pressManifest('CLOCKSS', 't-14-link-clockss-saved')};
            await page.reload(); await idle(page); await openArchiving(T0);
            o.saveC.afterReload = await boxes();
            // neither
            await panel('LOCKSS and CLOCKSS').getByRole('checkbox', {name: CLOCKSS}).uncheck();
            o.saveN = await saveTab('t-15-saved-neither');
            o.saveN.links = {lockss: await pressManifest('LOCKSS', 't-16-link-lockss-neither'), clockss: await pressManifest('CLOCKSS', 't-17-link-clockss-neither')};
            await page.reload(); await idle(page); await openArchiving(T0);
            o.saveN.afterReload = await boxes();
            // both (left so for the pages and the site's list)
            await panel('LOCKSS and CLOCKSS').getByRole('checkbox', {name: LOCKSS}).check();
            await panel('LOCKSS and CLOCKSS').getByRole('checkbox', {name: CLOCKSS}).check();
            o.saveB = await saveTab('t-18-saved-both');
            o.saveB.links = {lockss: await pressManifest('LOCKSS', 't-19-link-lockss-both'), clockss: await pressManifest('CLOCKSS', 't-20-link-clockss-both')};
            await page.reload(); await idle(page); await openArchiving(T0);
            o.saveB.afterReload = await boxes();
            const s1 = await snap('t-21-reload-both');
            o.headerAfter = s1.text && s1.text.header;
            // a save with nothing changed
            o.saveSame = await saveTab('t-22-saved-unchanged');
            fact('tab', o);
            log('tab', JSON.stringify({def: o.default, un: [o.linkUnticked.lockss.newTab, o.linkUnticked.lockss.url, o.linkUnticked.clockss.url], unsaved: [o.unsavedAfterSideTab, o.unsavedAfterTopTab, o.unsavedAfterLeave, o.leave.dialogs.length, o.reloadUnsaved.dialogs.length, o.unsavedAfterReload],
                L: [o.saveL.status, o.saveL.saved, o.saveL.links.lockss.url, o.saveL.links.clockss.url, o.saveL.afterReload], C: [o.saveC.saved, o.saveC.links.lockss.url, o.saveC.links.clockss.url, o.saveC.afterReload],
                N: [o.saveN.saved, o.saveN.links.lockss.url, o.saveN.afterReload], B: [o.saveB.saved, o.saveB.links.lockss.url, o.saveB.links.clockss.url, o.saveB.afterReload]}));
        });

        // ================================================================= effects: mail, tasks, activity log, outbound (OJS)
        if (on('effects') && isOJS && S.T) await sect('effects', async () => {
            const T0 = S.T;
            const o = {};
            await sleep(4000);
            o.mailAfter = {};
            for (const k of ['mgr', 'au', 'rd']) o.mailAfter[k] = await app.mail.count({to: `${T0}${k}@mail.test`}).catch((e) => `ERR ${e.message}`);
            o.mailTotalAfter = await app.mail.messageCount().catch(() => null);
            await signIn(page, `${T0}mgr`, {contextPath: T0});
            // the Tasks panel
            await go(`/index.php/${T0}/en/dashboard/editorial`);
            const tasks = page.getByRole('button', {name: /Tasks/}).first();
            o.tasksButton = await tasks.innerText().catch(() => null);
            if (await tasks.count()) { await tasks.click().catch(() => {}); await idle(page); await sleep(800); }
            await snap('e-01-tasks');
            o.tasksText = flat(await page.locator('[role="dialog"]:visible').last().innerText().catch(() => null), 600);
            await go(`/index.php/${T0}/en/dashboard/editorial`);
            // the published article's Activity Log
            if (S.sid) {
                await go(`/index.php/${T0}/en/dashboard/editorial?workflowSubmissionId=${S.sid}`);
                await sleep(800);
                const hist = page.getByRole('button', {name: /Activity Log/}).first();
                if (await hist.count()) { await hist.click().catch(() => {}); await idle(page); await sleep(1200); }
                const s = await snap('e-02-activity-log');
                o.activityLog = flat(s.text && s.text.dialog, 1500);
            }
            // the author's notifications (a reader-side view): their Tasks
            await signIn(page, `${T0}au`, {contextPath: T0});
            await go(`/index.php/${T0}/en/dashboard/mySubmissions`);
            const t2 = page.getByRole('button', {name: /Tasks/}).first();
            o.authorTasksButton = await t2.innerText().catch(() => null);
            await snap('e-03-author-dashboard');
            o.external = external.slice(0, 50);
            fact('effects', o);
            log('effects', JSON.stringify({mailBefore: (facts.tab || {}).mailBefore, mailAfter: o.mailAfter, tasks: o.tasksButton, ext: o.external.length, log: flat(o.activityLog, 300)}));
        });

        // ================================================================= pages: t8, Rule 5 for every visitor, t9 (OJS)
        if (on('pages') && isOJS && S.T) await sect('pages', async () => {
            const o = {};
            const anon = await launch(app);
            const ap = anon.page;
            const aGo = async (p) => { const r = await ap.goto(app.url(p)).catch((e) => ({err: String(e.message).slice(0, 200)})); await idle(ap).catch(() => {}); return r && typeof r.status === 'function' ? r.status() : (r && r.err) || null; };
            const read = async (p, name) => {
                const st = await aGo(p);
                const c = await classify(ap, st);
                c.hasHeader = await ap.locator('header, .pkp_structure_head').count();
                c.hasFooter = await ap.locator('footer, .pkp_structure_footer').count();
                c.navMenus = await ap.locator('nav').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label'))).catch(() => []);
                c.h1 = await ap.locator('h1').allInnerTexts().catch(() => []);
                await snap(name, ap);
                return c;
            };
            // t8: signed out, T ticked both
            o.tLockss = await read(`/index.php/${S.T}/gateway/lockss`, 'g-01-t-lockss-signed-out');
            o.tClockss = await read(`/index.php/${S.T}/gateway/clockss`, 'g-02-t-clockss-signed-out');
            // Rule 5 (unticked): N, as visitor, a Reader of the roster (no role there), N's manager, the admin
            o.nLockssOut = await read(`/index.php/${S.N}/gateway/lockss`, 'g-03-n-lockss-signed-out');
            o.nClockssOut = await read(`/index.php/${S.N}/gateway/clockss`, 'g-04-n-clockss-signed-out');
            o.nHome = await read(`/index.php/${S.N}`, 'g-05-n-home');
            await signIn(ap, `${S.N}mgr`, {contextPath: S.N});
            o.nLockssMgr = await read(`/index.php/${S.N}/gateway/lockss`, 'g-06-n-lockss-manager');
            o.nClockssMgr = await read(`/index.php/${S.N}/gateway/clockss`, 'g-07-n-clockss-manager');
            await signIn(ap, 'admin', {contextPath: S.N});
            o.nLockssAdmin = await read(`/index.php/${S.N}/gateway/lockss`, 'g-08-n-lockss-admin');
            // the seeded journal (unticked), read only: signed out
            await signOut(ap).catch(() => {});
            o.pkLockss = await read(`/index.php/${PK}/gateway/lockss`, 'g-09-pk-lockss');
            o.pkClockss = await read(`/index.php/${PK}/gateway/clockss`, 'g-10-pk-clockss');
            // t9: R requires sign-in
            o.rLockssOut = await read(`/index.php/${S.R}/gateway/lockss`, 'g-11-r-lockss-signed-out');
            o.rClockssOut = await read(`/index.php/${S.R}/gateway/clockss`, 'g-12-r-clockss-signed-out');
            await signIn(ap, `${S.R}rd`, {contextPath: S.R});
            o.rLockssReader = await read(`/index.php/${S.R}/gateway/lockss`, 'g-13-r-lockss-reader');
            o.rClockssReader = await read(`/index.php/${S.R}/gateway/clockss`, 'g-14-r-clockss-reader');
            // t9: D not enabled
            await signOut(ap).catch(() => {});
            o.dLockssOut = await read(`/index.php/${S.D}/gateway/lockss`, 'g-16-d-lockss-signed-out');
            o.dClockssOut = await read(`/index.php/${S.D}/gateway/clockss`, 'g-17-d-clockss-signed-out');
            await signIn(ap, `${S.D}rd`, {contextPath: S.D});
            o.dLockssReader = await read(`/index.php/${S.D}/gateway/lockss`, 'g-18-d-lockss-reader');
            await signIn(ap, `${S.D}mgr`, {contextPath: S.D});
            o.dLockssMgr = await read(`/index.php/${S.D}/gateway/lockss`, 'g-19-d-lockss-manager');
            await anon.close();
            fact('pages', o);
            const brief = (c) => c && [c.httpStatus, c.url, c.title, c.loginForm, (c.h1 || []).join('|')];
            log('pages', JSON.stringify(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, brief(v)]))));
        });

        // ================================================================= site: t7, the site's lists (OJS); the site address on OMP/OPS too
        if (on('site')) await sect('site', async () => {
            const o = {};
            const anon = await launch(app);
            const ap = anon.page;
            const readList = async (which, name) => {
                const r = await ap.goto(app.url(`/index.php/index/gateway/${which}`)).catch((e) => ({err: String(e.message)}));
                await idle(ap).catch(() => {});
                const c = await classify(ap, r && typeof r.status === 'function' ? r.status() : r && r.err);
                c.links = await ap.locator('li a').evaluateAll((els) => els.map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')}))).catch(() => []);
                c.mine = isOJS ? Object.fromEntries(['T', 'N', 'R', 'D', 'A'].map((k) => [k, c.links.some((l) => (l.href || '').includes(`/${S[k]}/`))])) : null;
                c.count = c.links.length;
                await snap(name, ap, {facts: {mine: c.mine, count: c.count}});
                return c;
            };
            o.lockssOut = await readList('lockss', 's-01-site-lockss-signed-out');
            o.clockssOut = await readList('clockss', 's-02-site-clockss-signed-out');
            if (isOJS && S.T) {
                // follow T's entry
                const link = ap.locator(`li a[href*="/${S.T}/"]`).first();
                if (await link.count()) {
                    await link.click(); await idle(ap);
                    o.followT = await classify(ap);
                    await snap('s-03-site-lockss-follow-t', ap);
                }
            }
            await signIn(ap, 'reader.rosa');
            o.lockssReader = await readList('lockss', 's-04-site-lockss-reader');
            await anon.close();
            fact('site', o);
            log('site', JSON.stringify({l: [o.lockssOut.httpStatus, o.lockssOut.headings, o.lockssOut.count, o.lockssOut.mine], c: [o.clockssOut.httpStatus, o.clockssOut.count, o.clockssOut.mine], follow: o.followT && o.followT.url, rd: [o.lockssReader.httpStatus, o.lockssReader.count]}));
        });

        // ================================================================= hosted: T unticked from "appear publicly" on screen, then the list and the page (OJS)
        if (on('hosted') && isOJS && S.T) await sect('hosted', async () => {
            const o = {};
            await signIn(page, 'admin');
            await go('/index.php/index/admin/contexts');
            const row = page.locator('tr.gridRow').filter({hasText: S.T}).first();
            await row.waitFor({timeout: T});
            await row.locator('a.show_extras').click(); await idle(page); await sleep(400);
            await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Edit', exact: true}).click();
            const cb = page.getByRole('checkbox', {name: /appear publicly on the site/});
            await cb.waitFor({timeout: T}); await idle(page); await sleep(500);
            o.before = await cb.isChecked();
            await cb.uncheck();
            const dlg = page.locator('[role="dialog"]:visible').last();
            const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await dlg.getByRole('button', {name: 'Save', exact: true}).click();
            const resp = await w;
            o.saveStatus = resp ? resp.status() : null;
            await sleep(1500);
            await snap('h-01-hosted-saved');
            await signOut(page).catch(() => {});
            const r1 = await go('/index.php/index/gateway/lockss');
            o.listAfter = await classify(page, r1);
            o.tListed = await page.locator(`li a[href*="/${S.T}/"]`).count();
            await snap('h-02-site-lockss-after-disable');
            const r2 = await go(`/index.php/${S.T}/gateway/lockss`);
            o.tPageOut = await classify(page, r2);
            await snap('h-03-t-lockss-disabled-signed-out');
            await signIn(page, `${S.T}rd`, {contextPath: S.T});
            const r3 = await go(`/index.php/${S.T}/gateway/lockss`);
            o.tPageReader = await classify(page, r3);
            await snap('h-04-t-lockss-disabled-reader');
            fact('hosted', o);
            log('hosted', JSON.stringify({save: o.saveStatus, before: o.before, listed: o.tListed, out: [o.tPageOut.url, o.tPageOut.title], rd: [o.tPageReader.url, o.tPageReader.title]}));
        });

        // ================================================================= french: the page read with /fr_CA/ (line 81; seeds its own journal)
        if (on('french') && isOJS) await sect('french', async () => {
            const o = {};
            const f = tag('u67k1f');
            await app.api.createContext({tag: f, context: {supportedLocales: ['en', 'fr_CA']}, enableLockss: true, enableClockss: true,
                issues: [{volume: 1, number: 1, year: 2025, published: true}], users: [U(f, 'mgr', ['manager'])]});
            o.F = f;
            await signOut(page).catch(() => {});
            for (const [k, p] of [['en', `/index.php/${f}/en/gateway/lockss`], ['fr', `/index.php/${f}/fr_CA/gateway/lockss`], ['frC', `/index.php/${f}/fr_CA/gateway/clockss`], ['frHome', `/index.php/${f}/fr_CA`]]) {
                const st = await go(p);
                o[k] = await classify(page, st);
                o[k].main = flat(await page.locator('.pkp_structure_main, main, #pkp_content_main').first().innerText().catch(() => ''), 1500);
                o[k].headerNav = flat(await page.locator('header, .pkp_structure_head').first().innerText().catch(() => ''), 300);
                o[k].footer = flat(await page.locator('footer, .pkp_structure_footer').first().innerText().catch(() => ''), 300);
                await snap(`f-${k}`);
            }
            fact('french', o);
            log('french', JSON.stringify({en: [o.en.title, o.en.headings], fr: [o.fr.title, o.fr.headings, o.fr.headerNav.slice(0, 120)], frC: o.frC.title}));
        });

        // ================================================================= links: does any public page of a ticked journal link to its manifest (line 21)
        if (on('links') && isOJS) await sect('links', async () => {
            const o = {};
            const l = tag('u67k1l');
            await app.api.createContext({tag: l, enableLockss: true, enableClockss: true, issues: [{volume: 1, number: 1, year: 2025, published: true}], users: [U(l, 'mgr', ['manager']), U(l, 'au', ['author'])]});
            const sub = await app.api.createSubmission({context: l, submitter: `${l}au`, tag: `${l}s1`, title: `K1 Linked ${l}`, issue: {volume: 1, number: 1, year: 2025}, published: true});
            o.L = l;
            await signOut(page).catch(() => {});
            const pages = ['', '/issue/current', '/issue/archive', '/about', '/about/submissions', '/about/contact', '/about/editorialMasthead', `/article/view/${sub.submissionId}`, '/search/search', '/sitemap'];
            o.pages = {};
            for (const p of pages) {
                const st = await go(`/index.php/${l}${p}`);
                const hrefs = await page.locator('a[href]').evaluateAll((els) => els.map((a) => a.getAttribute('href')).filter((h) => /gateway\/(c)?lockss/i.test(h))).catch(() => []);
                const body = await page.content().catch(() => '');
                o.pages[p || '/'] = {status: st, url: strip(page.url()), manifestLinks: hrefs, mentions: (body.match(/gateway\/c?lockss|Publisher Manifest/gi) || []).length};
            }
            await snap('l-01-home-ticked');
            // the site's home page
            const st = await go('/index.php/index');
            o.site = {status: st, manifestLinks: await page.locator('a[href*="gateway/lockss"], a[href*="gateway/clockss"]').count()};
            fact('links', o);
            log('links', JSON.stringify(o));
        });

        // ================================================================= absence: OMP/OPS (and the OJS control)
        if (on('absence')) await sect('absence', async () => {
            const o = {};
            await signIn(page, 'manager.maya', {contextPath: PK});
            for (const [k, ctx] of [['pk', PK], ['scratch', S.X || S.N]]) {
                if (!ctx) continue;
                if (k === 'scratch') await signIn(page, isOJS ? `${S.N}mgr` : `${S.X}mgr`, {contextPath: ctx});
                const st = await go(`/index.php/${ctx}/management/settings/distribution`);
                o[`${k}Dist`] = await classify(page, st);
                o[`${k}Dist`].topTabs = (await page.getByRole('tablist').first().getByRole('tab').allInnerTexts().catch(() => [])).map((x) => flat(x, 60));
                o[`${k}Dist`].archiving = await page.getByRole('tab', {name: 'Archiving', exact: true}).count();
                o[`${k}Dist`].lockssBox = await page.locator('input[name="enableLockss"]').count();
                await snap(`x-01-${k}-distribution`);
                await go('/index.php/index/admin');
                await go(`/index.php/${ctx}/management/settings/distribution#archive`);
                await sleep(800);
                o[`${k}Hash`] = {url: strip(page.url()), selected: await page.getByRole('tab', {selected: true}).allInnerTexts().catch(() => []), lockssBox: await page.locator('input[name="enableLockss"]').count()};
                await snap(`x-02-${k}-hash-archive`);
                for (const which of ['lockss', 'clockss']) {
                    const s2 = await go(`/index.php/${ctx}/gateway/${which}`);
                    o[`${k}-${which}-signedIn`] = await classify(page, s2);
                    await snap(`x-03-${k}-${which}-signed-in`);
                }
            }
            await signOut(page).catch(() => {});
            for (const which of ['lockss', 'clockss']) {
                const s3 = await go(`/index.php/${PK}/gateway/${which}`);
                o[`pk-${which}-signedOut`] = await classify(page, s3);
                await snap(`x-04-pk-${which}-signed-out`);
            }
            fact('absence', o);
            const b = (c) => c && [c.httpStatus, c.url, c.notFound, c.title];
            log('absence', JSON.stringify({pkTabs: o.pkDist && o.pkDist.topTabs, pkArch: o.pkDist && o.pkDist.archiving, scTabs: o.scratchDist && o.scratchDist.topTabs, hash: o.pkHash, pkL: b(o['pk-lockss-signedIn']), pkC: b(o['pk-clockss-signedIn']), scL: b(o['scratch-lockss-signedIn']), outL: b(o['pk-lockss-signedOut']), outC: b(o['pk-clockss-signedOut'])}));
        });
    } finally {
        fact('dialogs', dialogs);
        fact('externalAll', external.slice(0, 100));
        await close();
    }
});
