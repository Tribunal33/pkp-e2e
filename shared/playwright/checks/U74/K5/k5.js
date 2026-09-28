// U74 claim check K5 — Tools › "ONIX 3.0 Monograph Export Plugin" and the side effects {OMP},
// with read-only controls on OJS and OPS.
// Spec: docs/specs/U74-onix-metadata-export.md — Fields 158–171 (the export page); Rules 16–19 (260–300);
// Side effects 368–382; register A1 (492–506); footnotes i, j, l, n, td7, td18–td22, td25, f-a1.
//
// Run: RUN=r1 PROBE_FEATURE=U74 PROBE_AGENT=ccK5 node bin/probe.js all shared/playwright/checks/U74/K5/k5.js
//      RUN=r2 …  (a second, independent run: its own scratch presses, its own facts file k5-<RUN>-facts-<app>.json)
//      PHASES=seed,details,roles,list,page,export,close,native,side,version (OMP) · control (OJS, OPS). Default: all.
//      Later phases read k5-state-<RUN>-<app>.json; FRESH=1 seeds anew. A full OMP run outlasts the Bash cap:
//      launch it detached (nohup … &).
//
// Scratch contexts per run (tag u74k5…), OMP:
//   PN  a new press WITHOUT the four ONIX details (Rule 16, td18): one book so the Native XML "Export" list has a line.
//   PF  a press WITH the four ONIX details (seeded): books
//         B1 published, "Paperback" (sales rights, market) + "Ebook", audience 02/11/9–12, an agent and a supplier
//         B2 at the Submission stage (no decision)      B3 a draft (not submitted)
//         B4 declined at the Submission stage             B5 at Production, no format
//         B6 at Production, "Paperback" with a market priced "ten"
//         B7 at Production, "Print" (page counts typed "xii" on screen in the native phase)
//         B8 at Production, "Paperback", an agent named by a seeded market (the side-effects book)
//         B9 published, "Paperback" + "Hardback" with sales rights and markets (Create New Version, format delete)
//   PP  a press WITH the four details and 101 books (the list's page size).
// OJS, OPS: publicknowledge read as manager.maya (Tools list, typed ONIX address, Native XML export tab), plus a
//   scratch journal/server with one galley for a Native XML export (no ONIX product in the file).
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outDir, drainJobs} = require('../../../probe');

const T = 30_000;
const RUN = process.env.RUN || 'r1';
const ALL = ['seed', 'details', 'roles', 'list', 'page', 'export', 'close', 'native', 'side', 'version', 'control'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',').map((s) => s.trim());
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k5]', RUN, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const VIS = '[role="dialog"]:visible';
const SR = 'salesRightsGridContainer';
const MK = 'marketsGridContainer';
const SRFORM = 'form#addSalesRightsForm';
const MKFORM = 'form#marketForm';
const ONIX = 'Onix30ExportPlugin';
const NATIVE = 'NativeImportExportPlugin';
const MISSING = /missing some required information/i;

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const sf = path.join(outDir(), `k5-state-${RUN}-${app.name}.json`);
    let S = (!process.env.FRESH && fs.existsSync(sf)) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`k5-${RUN}-facts`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const sql = (q) => { try { return execFileSync('psql', ['-d', `${app.name}_test`, '-tA', '-F', '|', '-c', q], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim(); } catch (e) { return `SQL ERROR ${String(e.stderr).trim()}`; } };
    const tempDir = path.resolve(__dirname, `../../../../../checkouts/files/${app.name}-test/temp`);
    const tempFiles = (ctxId) => { try { return fs.readdirSync(tempDir).filter((f) => f.endsWith(`-${ctxId}.xml`)).sort(); } catch (e) { return [`ERR ${e.message}`]; } };

    const {page, close} = await launch(app);
    // browser dialogs: `policy` answers confirm()/alert(); every one is kept with a time
    let policy = 'accept';
    const jsDialogs = [];
    page.on('dialog', async (d) => {
        jsDialogs.push({at: Date.now(), type: d.type(), message: d.message(), answered: d.type() === 'beforeunload' ? 'accept' : policy});
        if (d.type() === 'beforeunload' || policy === 'accept') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    const dlgSince = (t0) => jsDialogs.filter((d) => d.at >= t0).map(({at, ...d}) => d);
    // page notices as they appear
    const notices = [];
    await page.exposeFunction('__k5Notice', (text) => notices.push({at: Date.now(), text}));
    await page.addInitScript(() => {
        const seen = new WeakSet();
        new MutationObserver(() => {
            document.querySelectorAll('.app__notifications .pkpNotification, .pkp_notification').forEach((e) => {
                if (seen.has(e)) return;
                const t = (e.textContent || '').replace(/\s+/g, ' ').trim();
                if (!t) return;
                seen.add(e);
                window.__k5Notice(t);
            });
        }).observe(document, {childList: true, subtree: true});
    });
    const noticesSince = (t0) => notices.filter((n) => n.at >= t0).map((n) => n.text);
    // non-GET answers and every error answer
    const posts = [];
    page.on('response', async (r) => {
        const m = r.request().method();
        if (m === 'GET' && r.status() < 400) return;
        const u = r.url();
        if (/\.(js|css|png|svg|woff2?)(\?|$)/.test(u)) return;
        let body = '';
        if (m !== 'GET' || r.status() >= 400) { try { body = (await r.text()).slice(0, 600); } catch { /* ignore */ } }
        posts.push({at: Date.now(), method: m, status: r.status(), url: u.replace(/^.*\/index\.php/, '').replace(/csrfToken=[^&]+/, 'csrf').slice(0, 180), body: flat(body, 300)});
    });
    const since = (t0) => posts.filter((p) => p.at >= t0).map(({at, ...p}) => p);

    const pfx = (n) => `${RUN}-${n}`;
    async function snap(name, extra = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        Object.assign(s, extra);
        record(pfx(name), s);
        await shot(page, pfx(name)).catch(() => {});
        return s;
    }
    const safe = async (label, fn) => {
        try { return await fn(); } catch (e) {
            const err = String(e.message || e).split('\n')[0].slice(0, 300);
            log(`[${app.name} ${label}] ERROR`, err);
            await snap(`err-${label.replace(/[^a-z0-9-]/gi, '-')}`).catch(() => {});
            return {error: err};
        }
    };
    const rel = (u) => String(u).replace(/^https?:\/\/[^/]+/, '');
    const top = () => page.locator(VIS).last();
    const dialogCount = () => page.locator(VIS).count();
    const waitTop = (sel, n) => page.waitForFunction(({sel, n}) => {
        const d = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length);
        return d.length >= n && d[d.length - 1].querySelector(sel);
    }, {sel, n}, {timeout: T});
    const waitCount = (n) => page.waitForFunction((n) => [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).length <= n, n, {timeout: 12_000}).then(() => true).catch(() => false);
    let who = null;
    const as = async (u, ctx) => {
        if (who === `${u}@${ctx}`) return;
        await signIn(page, u, {contextPath: ctx}); await idle(page); who = `${u}@${ctx}`;
    };
    const cu = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    const pageFacts = () => page.evaluate(() => {
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => !!(e && e.getClientRects().length);
        const main = document.querySelector('.app__contentPanel') || document.querySelector('main') || document.body;
        return {
            h1: t(document.querySelector('h1.app__pageHeading, main h1, h1')),
            title: document.title,
            content: t(main).slice(0, 2500),
            links: [...main.querySelectorAll('a')].filter(vis).map((a) => ({text: t(a), href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')})).slice(0, 40),
            tabs: [...document.querySelectorAll('#importExportTabs [role="tab"]')].map((x) => ({text: t(x), selected: x.getAttribute('aria-selected')})),
            lists: [...main.querySelectorAll('.listPanel')].length,
            boxes: [...main.querySelectorAll('input[type=checkbox]')].filter(vis).length,
            buttons: [...main.querySelectorAll('button, a.pkpButton')].filter(vis).map((b) => t(b)).filter(Boolean),
        };
    }).catch((e) => ({error: flat(e.message, 200)}));

    // ============================================================ OJS / OPS: the read-only control
    if (!isOMP) {
        if (!on('control')) { await close(); return; }
        const o = await safe('control', async () => {
            const o = {};
            const isOJS = app.name === 'ojs';
            await as('manager.maya', 'publicknowledge');
            // Tools › Import/Export: the list of tools
            await page.goto(cu('publicknowledge', '/management/tools')); await idle(page);
            await page.getByRole('tab', {name: 'Import/Export'}).first().click().catch(() => {});
            await page.locator('.pkp_page_importexport_plugins li').first().waitFor({timeout: T}).catch(() => {});
            await idle(page);
            await snap('c-01-tools-list');
            o.tools = await page.locator('.pkp_page_importexport_plugins li').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => []);
            o.onixInList = o.tools.some((x) => /ONIX/i.test(x));
            // the ONIX tool's address typed
            const r = await page.goto(cu('publicknowledge', `/management/importexport/plugin/${ONIX}`)); await idle(page).catch(() => {});
            await snap('c-02-onix-address-typed');
            o.onixTyped = {status: r ? r.status() : null, url: rel(page.url()), page: await pageFacts(), bodyStart: flat(await page.locator('body').innerText().catch(() => ''), 400)};
            // Native XML export tab: no ONIX reminder
            await page.goto(cu('publicknowledge', `/management/importexport/plugin/${NATIVE}`)); await idle(page);
            const tabName = isOJS ? 'Export Articles' : 'Export Preprints';
            await page.getByRole('tab', {name: tabName, exact: true}).first().click();
            await page.locator('#exportSubmissions-tab .listPanel__item').first().waitFor({timeout: T}).catch(() => {});
            await idle(page);
            await snap('c-03-native-export-tab');
            o.nativeTab = {text: flat(await page.locator('#exportSubmissions-tab').innerText().catch(() => null), 600)};
            o.nativeTab.reminder = MISSING.test(o.nativeTab.text || '');
            // a scratch journal/server: one submission with a galley exported; does the file carry ONIX?
            if (!S.J) {
                const t = tag('u74k5');
                const FILE = isOJS ? 'article.pdf' : 'preprint.pdf';
                const c = await app.api.createContext({tag: `${t}j`, context: {name: `U74 K5 control ${t}`, contactName: 'K5 Contact', contactEmail: `${t}jc@mail.test`},
                    users: [{username: `${t}jmg`, roles: ['manager']}, {username: `${t}jau`, roles: ['author']}]});
                const sub = await app.api.createSubmission({tag: `${t}s`, context: c.path, submitter: `${t}jau`, title: `K5 control ${t}`,
                    ...(isOJS ? {files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction']} : {}), galleys: [{label: 'PDF', file: FILE}]});
                S.J = {path: c.path, mg: `${t}jmg`, sid: sub.submissionId};
                save();
            }
            await as(S.J.mg, S.J.path);
            await page.goto(cu(S.J.path, `/management/importexport/plugin/${NATIVE}`)); await idle(page);
            await page.getByRole('tab', {name: tabName, exact: true}).first().click();
            const et = page.locator('#exportSubmissions-tab');
            await et.locator('.listPanel__item').first().waitFor({timeout: T});
            await et.locator('.listPanel__item input[type=checkbox]').first().check();
            await et.getByRole('button', {name: tabName, exact: true}).click();
            const panel = page.locator('#importExportTabs [role="tabpanel"]:visible').first();
            await panel.getByText(/Download Exported File|failed/i).first().waitFor({timeout: 60_000}).catch(() => {});
            await snap('c-04-native-export-result');
            o.scratchExport = {results: flat(await panel.innerText().catch(() => null), 400)};
            const b = panel.getByRole('button', {name: 'Download Exported File'});
            if (await b.count()) {
                const dl = page.waitForEvent('download', {timeout: 30_000}).catch(() => null);
                await b.first().click();
                const d = await dl;
                if (d) {
                    const xml = fs.readFileSync(await d.path(), 'utf8');
                    fs.writeFileSync(path.join(outDir(), `${RUN}-c-native-export-${app.name}.xml`), xml);
                    o.scratchExport.bytes = xml.length;
                    o.scratchExport.onix = /onix/i.test(xml);
                    o.scratchExport.products = (xml.match(/<(?:onix:)?Product[ >]/g) || []).length;
                }
            }
            return o;
        });
        fact('control', o);
        await close();
        return;
    }

    // ============================================================ OMP: seed
    const BASE = {files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction']};
    const RIGHTS = {type: 'For sale with exclusive rights in the specified countries or territories (01)', countriesIncluded: ['Canada (CA)']};
    const market = (price, extra = {}) => ({date: '20250301', dateFormat: 'YYYYMMDD', price, countriesIncluded: ['Canada (CA)'], ...extra});
    const mkPress = async (t, k, extra = {}) => {
        const users = [{username: `${t}${k}mg`, roles: ['manager'], givenName: 'Mona', familyName: `K5${k}`},
            {username: `${t}${k}au`, roles: ['author'], givenName: 'Abe', familyName: `K5${k}`}];
        const r = await app.api.createContext({tag: `${t}${k}`, context: {name: `U74 K5 ${k} ${t}`, acronym: 'K5P', country: 'CA', contactName: 'K5 Contact', contactEmail: `${t}${k}c@mail.test`}, users, ...extra});
        return {path: r.path, id: r.contextId, mg: `${t}${k}mg`, au: `${t}${k}au`, contact: `${t}${k}c@mail.test`};
    };
    const ONIXD = (n) => ({publisher: `K5 Press ${n}`, location: 'Vancouver, Canada', codeType: 'Proprietary (01)', codeValue: `K5-000${n}`});
    if (on('seed') && !S.PF) {
        const t = tag('u74k5');
        S.t = t;
        S.PN = await mkPress(t, 'n');
        const nb = await app.api.createSubmission({tag: `${t}nb`, context: S.PN.path, submitter: S.PN.au, title: `K5 N-book ${t}`, ...BASE, publicationFormats: [{name: 'Paperback'}]});
        S.PN.book = nb.submissionId;
        S.PF = await mkPress(t, 'f', ONIXD(1));
        const sub = async (k, title, extra) => {
            const r = await app.api.createSubmission({tag: `${t}${k}`, context: S.PF.path, submitter: S.PF.au, title: `${title} ${t}`, ...extra});
            return {id: r.submissionId, pub: r.publicationId, formats: r.publicationFormats, reps: r.representatives, title: `${title} ${t}`};
        };
        const REPS = [{type: 'agent', role: 'Exclusive sales agent (05)', name: 'K5 Agent'}, {type: 'supplier', role: 'Distributor to end-customers (12)', name: 'K5 Supplier'}];
        S.B1 = await sub('b1', 'K5 One published', {...BASE, published: true, representatives: REPS,
            audience: {audience: 'Children (02)', rangeQualifier: 'US school grade range (11)', rangeFrom: 'Ninth Grade (9)', rangeTo: 'Twelfth Grade (12)'},
            publicationFormats: [{name: 'Paperback', salesRights: [RIGHTS], markets: [market('25', {agent: 'K5 Agent', supplier: 'K5 Supplier'})]}, {name: 'Ebook'}]});
        S.B2 = await sub('b2', 'K5 Two submission-stage', {});
        S.B3 = await sub('b3', 'K5 Three draft', {submitted: false});
        S.B4 = await sub('b4', 'K5 Four declined', {decisions: ['initialDecline']});
        S.B5 = await sub('b5', 'K5 Five no-format', {...BASE});
        S.B6 = await sub('b6', 'K5 Six price-ten', {...BASE, publicationFormats: [{name: 'Paperback', markets: [market('ten')]}]});
        S.B7 = await sub('b7', 'K5 Seven page-counts', {...BASE, publicationFormats: [{name: 'Print'}]});
        S.B8 = await sub('b8', 'K5 Eight side-effects', {...BASE, representatives: [{type: 'agent', role: 'Sales agent (08)', name: 'Named Agency'}],
            publicationFormats: [{name: 'Paperback', markets: [market('30', {agent: 'Named Agency'})]}]});
        S.B9 = await sub('b9', 'K5 Nine versions', {...BASE, published: true, representatives: REPS,
            publicationFormats: [{name: 'Paperback', salesRights: [RIGHTS], markets: [market('25', {agent: 'K5 Agent'})]}, {name: 'Hardback', salesRights: [RIGHTS], markets: [market('40')]}]});
        save();
        note(`ccK5 (${RUN}): scratch presses PN ${S.PN.path} (no ONIX details, one book), PF ${S.PF.path} (ONIX details seeded; books B1 published w/ lists, B2 submission stage, B3 draft, B4 declined, B5 no format, B6 price "ten", B7 Print, B8 side effects, B9 versions); managers <path>mg`);
        log('[seed]', JSON.stringify(S).slice(0, 2000));
    }
    if (on('seed') && S.PF && !S.PP) {
        const t0 = Date.now();
        S.PP = await mkPress(S.t, 'p', ONIXD(3));
        for (let i = 1; i <= 101; i++) {
            await app.api.createSubmission({tag: `${S.t}p${i}`, context: S.PP.path, submitter: S.PP.au, title: `K5 paged ${String(i).padStart(3, '0')} ${S.t}`});
        }
        S.PP.seedMs = Date.now() - t0;
        save();
        note(`ccK5 (${RUN}): press PP ${S.PP.path} with 101 books (ONIX details seeded); 101 plain seeds took ${Math.round(S.PP.seedMs / 1000)} s`);
    }
    if (!S.PF) { log('no state; run the seed phase'); await close(); return; }

    const onixUrl = (P) => cu(P.path, `/management/importexport/plugin/${ONIX}`);
    const nativeUrl = (P) => cu(P.path, `/management/importexport/plugin/${NATIVE}`);
    const tab = () => page.locator('#export-tab');
    async function openOnix(P, name) {
        const r = await page.goto(onixUrl(P)); await idle(page);
        if (await tab().count()) {
            await tab().locator('.listPanel__item, .listPanel__empty').first().waitFor({timeout: T}).catch(() => {});
            await idle(page); await sleep(400);
        }
        const s = name ? await snap(name) : null;
        return {status: r ? r.status() : null, url: rel(page.url()), page: await pageFacts(), notices: s ? s.notices : undefined};
    }
    /** The ONIX tool's list, as data. */
    const readList = (sel = '#export-tab') => page.locator(sel).evaluate((el) => {
        const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => !!(e && e.getClientRects().length);
        const box = (e) => { const r = e.getBoundingClientRect(); return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width)}; };
        const items = [...el.querySelectorAll('.listPanel__item')].map((li) => {
            const b = li.querySelector('input[type=checkbox]');
            const a = li.querySelector('a');
            return {text: txt(li), checked: b ? b.checked : null, value: b ? b.value : null, view: a ? {text: txt(a), href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')} : null};
        });
        const header = el.querySelector('.listPanel__header');
        const pagination = el.querySelector('.pkpPagination, nav[aria-label*="agination" i]');
        const v = el.querySelector('input[name="validation"]');
        const vlab = v ? (v.closest('label') || el.querySelector(`label[for="${v.id}"]`)) : null;
        const list = el.querySelector('.listPanel');
        return {
            title: txt(el.querySelector('.listPanel__title, .pkpHeader__title, h2, h3')),
            header: txt(header),
            headerControls: header ? [...header.querySelectorAll('button, input, a')].filter(vis).map((b) => ({tag: b.tagName, text: txt(b), label: b.getAttribute('aria-label') || b.placeholder || null, box: box(b)})) : [],
            listBox: list ? box(list) : null,
            items, count: items.length, checked: items.filter((i) => i.checked).length,
            buttons: [...el.querySelectorAll('button, a.pkpButton')].filter(vis).map((b) => ({text: txt(b), disabled: b.disabled || b.getAttribute('aria-disabled') === 'true', y: Math.round(b.getBoundingClientRect().y)})),
            listBottom: list ? Math.round(list.getBoundingClientRect().bottom) : null,
            pagination: pagination ? {text: txt(pagination), links: [...pagination.querySelectorAll('a,button')].map((b) => `${txt(b) || ''}|${b.getAttribute('aria-label') || ''}${b.getAttribute('aria-current') ? '*' : ''}`)} : null,
            empty: txt(el.querySelector('.listPanel__empty, .pkpListPanel__empty')),
            validation: v ? {checked: v.checked, label: txt(vlab)} : null,
            filtersOpen: vis(el.querySelector('.listPanel__sidebar')),
            filterPanel: txt(el.querySelector('.listPanel__sidebar')),
            reminder: /missing some required information/i.test(el.innerText || ''),
        };
    }).catch((e) => ({error: flat(e.message, 200)}));
    const tabsNow = () => page.locator('#importExportTabs [role="tab"]').evaluateAll((ts) => ts.map((t) => ({text: t.innerText.trim(), selected: t.getAttribute('aria-selected') === 'true'}))).catch(() => []);
    const readXml = (xml) => ({
        bytes: xml.length,
        products: (xml.match(/<(?:onix:)?Product[ >]/g) || []).length,
        titles: [...xml.matchAll(/<(?:onix:)?TitleText[^>]*>([^<]*)</g)].map((m) => m[1]).slice(0, 10),
        header: flat((xml.match(/<(?:onix:)?Header>[\s\S]*?<\/(?:onix:)?Header>/) || [''])[0], 500),
        root: flat((xml.match(/<(?:\w+:)?ONIXMessage[^>]*>/) || [''])[0], 200),
        start: flat(xml.slice(0, 300), 300),
    });
    /** Tick the lines whose text holds one of `words` (or `all`), set the validation box, export; read the results tab. */
    async function exportOnix(P, {words = [], validation = true, selectAll = false, name}) {
        await openOnix(P);
        const o = {words, validation, selectAll};
        const items = tab().locator('.listPanel__item');
        const n = await items.count();
        o.listCount = n;
        if (selectAll) await tab().getByRole('button', {name: /^Select (All|None)$/}).first().click();
        for (let i = 0; i < n && words.length; i++) {
            const it = items.nth(i);
            const txt = await it.innerText();
            if (words.some((w) => txt.includes(w))) await it.locator('input[type=checkbox]').check();
        }
        const vbox = tab().locator('input[name="validation"]').first();
        o.validationBefore = await vbox.isChecked().catch(() => null);
        await vbox.setChecked(validation);
        o.ticked = (await readList()).items.filter((x) => x.checked).map((x) => flat(x.text, 80));
        const tempBefore = tempFiles(P.id);
        const tabsBefore = await page.locator('#importExportTabs [role=tab]').count();
        const t0 = Date.now();
        await tab().getByRole('button', {name: 'Export Submissions', exact: true}).click();
        for (let i = 0; i < 60; i++) { await sleep(500); if ((await page.locator('#importExportTabs [role=tab]').count()) > tabsBefore) break; }
        await idle(page); await sleep(800);
        const panel = page.locator('#importExportTabs [role="tabpanel"]:visible').first();
        await panel.getByText(/Download Exported File|failed|error|completed/i).first().waitFor({timeout: 60_000}).catch(() => {});
        await sleep(500);
        const s = await snap(name);
        o.tabs = await tabsNow();
        o.results = flat(await panel.innerText().catch(() => null), 1500);
        o.resultsHtmlButtons = await panel.locator('button, a').evaluateAll((bs) => bs.map((b) => b.innerText.trim()).filter(Boolean)).catch(() => []);
        o.posts = since(t0).map((p) => `${p.method} ${p.status} ${p.url.slice(0, 120)}${p.status >= 400 ? ` BODY ${p.body}` : ''}`);
        o.tempAfterExport = tempFiles(P.id).filter((f) => !tempBefore.includes(f));
        o.notices = s.notices;
        const b = panel.getByRole('button', {name: 'Download Exported File'});
        o.downloadButton = await b.count();
        if (o.downloadButton) {
            const dl = page.waitForEvent('download', {timeout: 30_000}).catch(() => null);
            await b.first().click();
            const d = await dl;
            if (d) {
                const xml = fs.readFileSync(await d.path(), 'utf8');
                const f = path.join(outDir(), `${RUN}-${name}-${app.name}.xml`);
                fs.writeFileSync(f, xml);
                o.file = {name: d.suggestedFilename(), saved: path.basename(f), ...readXml(xml)};
            } else o.file = 'no download event';
            await sleep(500);
            o.tempAfterDownload = tempFiles(P.id).filter((f) => !tempBefore.includes(f));
        }
        return o;
    }
    async function nativeExport(P, words, name, {validation = true} = {}) {
        const r = {words};
        await page.goto(nativeUrl(P)); await idle(page);
        await page.getByRole('tab', {name: 'Export', exact: true}).first().click();
        const et = page.locator('#exportSubmissions-tab');
        await et.locator('.listPanel__item').first().waitFor({timeout: T});
        await idle(page); await sleep(500);
        r.reminder = MISSING.test(await et.innerText().catch(() => ''));
        const items = et.locator('.listPanel__item');
        for (let i = 0; i < await items.count(); i++) {
            const it = items.nth(i);
            const tx = flat(await it.innerText());
            if (words.some((w) => tx.includes(w))) await it.locator('input[type=checkbox]').check();
        }
        const vbox = et.locator('input[name="validation"]').first();
        if (await vbox.count()) await vbox.setChecked(validation);
        const tabsBefore = await page.locator('#importExportTabs [role=tab]').count();
        const t0 = Date.now();
        await et.getByRole('button', {name: 'Export Submissions', exact: true}).click();
        for (let i = 0; i < 60; i++) { await sleep(500); if ((await page.locator('#importExportTabs [role=tab]').count()) > tabsBefore) break; }
        await idle(page); await sleep(800);
        const panel = page.locator('#importExportTabs [role="tabpanel"]:visible').first();
        await panel.getByText(/Download Exported File|failed|error/i).first().waitFor({timeout: 60_000}).catch(() => {});
        await snap(name);
        r.results = flat(await panel.innerText().catch(() => null), 1500);
        r.posts = since(t0).filter((p) => p.status >= 400).map((p) => `${p.method} ${p.status} ${p.url}`);
        const b = panel.getByRole('button', {name: 'Download Exported File'});
        if (await b.count()) {
            const dl = page.waitForEvent('download', {timeout: 30_000}).catch(() => null);
            await b.first().click();
            const d = await dl;
            if (d) {
                const xml = fs.readFileSync(await d.path(), 'utf8');
                fs.writeFileSync(path.join(outDir(), `${RUN}-${name}-${app.name}.xml`), xml);
                r.formats = [...xml.matchAll(/<publication_format\b[\s\S]*?<\/publication_format>/g)].map((m) => {
                    const f = m[0];
                    return {
                        name: flat((f.match(/<name[^>]*>([^<]*)</) || [])[1]),
                        product: (f.match(/<(?:onix:)?Product[ >]/g) || []).length,
                        audience: [...f.matchAll(/<(?:onix:)?Audience>[\s\S]*?<\/(?:onix:)?Audience>/g)].map((x) => flat(x[0], 300)),
                        audienceRange: [...f.matchAll(/<(?:onix:)?AudienceRange>[\s\S]*?<\/(?:onix:)?AudienceRange>/g)].map((x) => flat(x[0], 400)),
                        price: [...f.matchAll(/<(?:onix:)?PriceAmount>[^<]*<\/(?:onix:)?PriceAmount>/g)].map((x) => x[0]),
                        extent: [...f.matchAll(/<(?:onix:)?Extent>[\s\S]*?<\/(?:onix:)?Extent>/g)].map((x) => flat(x[0], 200)),
                    };
                });
                r.onixAnywhere = /onix/i.test(xml);
            } else r.download = 'none';
        }
        return r;
    }

    // ------------------------------------------------------------ Masthead helpers (Settings › Press › "Masthead")
    async function openMasthead(P) {
        await page.goto(cu(P.path, '/management/settings/context')); await idle(page);
        await page.getByRole('tab', {name: 'Masthead'}).first().click().catch(() => {});
        await page.locator('[name="publisher"]').first().waitFor({timeout: T});
        await idle(page); await sleep(300);
        return page.locator('form').filter({has: page.locator('[name=publisher]')}).first();
    }
    const readMasthead = (f) => f.evaluate((form) => {
        const g = (n) => form.querySelector(`[name="${n}"]`);
        const sel = g('codeType');
        return {publisher: g('publisher') && g('publisher').value, location: g('location') && g('location').value,
            codeType: sel ? `${sel.value}|${sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex].text.trim() : ''}` : null,
            codeTypeOptions: sel ? {count: sel.options.length, empty: [...sel.options].filter((x) => x.value === '').length, first: [...sel.options].slice(0, 3).map((x) => `${x.value}|${x.text.trim()}`)} : null,
            codeValue: g('codeValue') && g('codeValue').value};
    });
    async function saveMasthead(f) {
        const t0 = Date.now();
        await f.getByRole('button', {name: 'Save', exact: true}).first().click();
        const saved = await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 15_000}).then(() => true).catch(() => false);
        await idle(page); await sleep(500);
        const errs = await f.locator('.pkpFieldError, .pkpFormField__error').allInnerTexts().catch(() => []);
        return {saved, notices: noticesSince(t0), errors: errs.map((x) => flat(x)), posts: since(t0).filter((p) => p.method !== 'GET').map((p) => `${p.method} ${p.status} ${p.url.slice(0, 100)} ${p.status >= 400 ? p.body : ''}`)};
    }

    // ============================================================ details: Rule 16, td18 (PN), and the Native XML reminder
    if (on('details')) {
        const o = await safe('details', async () => {
            const o = {};
            // the phase needs a press with none of the four details: a used PN is replaced by a new one
            if (S.PN.used) {
                const k = `n${(S.PN.gen || 1) + 1}`;
                const nP = await mkPress(S.t, k);
                const nb = await app.api.createSubmission({tag: `${S.t}${k}b`, context: nP.path, submitter: nP.au, title: `K5 N-book ${S.t}`, ...BASE, publicationFormats: [{name: 'Paperback'}]});
                S.PN = {...nP, book: nb.submissionId, gen: (S.PN.gen || 1) + 1};
            }
            S.PN.used = true; save();
            const P = S.PN;
            o.press = P.path;
            await as(P.mg, P.path);
            // via Tools › Import/Export › the link
            await page.goto(cu(P.path, '/management/tools')); await idle(page);
            await page.getByRole('tab', {name: 'Import/Export'}).first().click().catch(() => {});
            await page.locator('.pkp_page_importexport_plugins li').first().waitFor({timeout: T}).catch(() => {});
            await idle(page);
            await snap('d-01-tools-list');
            o.tools = await page.locator('.pkp_page_importexport_plugins li').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => []);
            await loc(page, 'Tools › Import/Export: the ONIX tool link', page.locator('.pkp_page_importexport_plugins').getByRole('link', {name: 'ONIX 3.0 Monograph Export Plugin'}));
            await page.locator('.pkp_page_importexport_plugins').getByRole('link', {name: 'ONIX 3.0 Monograph Export Plugin'}).first().click();
            await page.waitForLoadState('load'); await idle(page);
            const s = await snap('d-02-onix-page-incomplete');
            o.incomplete = {url: rel(page.url()), page: await pageFacts(), main: flat(s.text && s.text.main, 800)};
            o.incomplete.rawSentence = await page.locator('.app__contentPanel p').first().evaluate((p) => p.textContent).catch(() => null);
            await loc(page, 'ONIX tool: the reminder paragraph (incomplete details)', page.locator('.app__contentPanel p').first());
            await loc(page, 'ONIX tool: the "Press Settings" link', page.locator('.app__contentPanel').getByRole('link', {name: 'Press Settings'}));
            // press "Press Settings"
            await page.locator('.app__contentPanel').getByRole('link', {name: 'Press Settings'}).first().click();
            await page.waitForLoadState('load'); await idle(page); await sleep(500);
            const s2 = await snap('d-03-press-settings-landing');
            o.pressSettingsLanding = {url: rel(page.url()), h1: flat(await page.locator('h1').first().innerText().catch(() => null)),
                selectedTabs: await page.locator('[role="tab"][aria-selected="true"]').allInnerTexts().then((a) => a.map((x) => flat(x))).catch(() => []),
                publisherBoxVisible: await page.locator('[name="publisher"]').first().isVisible().catch(() => false), main: flat(s2.text && s2.text.main, 300)};
            // the Native XML tool's "Export" tab on the same press
            o.native = await (async () => {
                await page.goto(nativeUrl(P)); await idle(page);
                await page.getByRole('tab', {name: 'Export', exact: true}).first().click();
                await page.locator('#exportSubmissions-tab .listPanel__item').first().waitFor({timeout: T}).catch(() => {});
                await idle(page);
                await snap('d-04-native-export-tab-incomplete');
                const t = await page.locator('#exportSubmissions-tab').innerText().catch(() => '');
                return {text: flat(t, 700), reminder: MISSING.test(t), items: await page.locator('#exportSubmissions-tab .listPanel__item').count(),
                    link: await page.locator('#exportSubmissions-tab').getByRole('link', {name: 'Press Settings'}).getAttribute('href').then(rel).catch(() => null)};
            })();
            // fill the four on the Masthead by hand, save, reopen
            let f = await openMasthead(P);
            o.mastheadBefore = await readMasthead(f);
            await snap('d-05-masthead-before');
            await f.locator('[name="publisher"]').first().fill('K5 Typed Press');
            await f.locator('[name="location"]').first().fill('Prague');
            await f.locator('select[name="codeType"]').first().selectOption('01');
            await f.locator('[name="codeValue"]').first().fill('K5-TYPED');
            o.saveAll = await saveMasthead(f);
            o.saveAllRead = await readMasthead(f);
            o.filled = await openOnix(P, 'd-06-onix-page-filled');
            o.filled.list = await readList();
            // each of the four emptied alone, saved, the tool reopened; then put back
            o.blanks = {};
            for (const [field, restore] of [['codeValue', 'K5-TYPED'], ['publisher', 'K5 Typed Press'], ['location', 'Prague'], ['codeType', '01']]) {
                f = await openMasthead(P);
                if (field === 'codeType') {
                    const opts = await f.locator('select[name="codeType"] option').evaluateAll((os) => os.map((x) => x.value));
                    if (opts.includes('')) await f.locator('select[name="codeType"]').selectOption(''); else { o.blanks.codeType = {noEmptyChoice: true, options: opts.slice(0, 5)}; continue; }
                } else await f.locator(`[name="${field}"]`).first().fill('');
                const sv = await saveMasthead(f);
                const afterReload = await readMasthead(await openMasthead(P));
                const pg = await openOnix(P, `d-07-onix-page-${field}-blank`);
                o.blanks[field] = {save: sv, mastheadAfterReload: afterReload, tool: {tabs: pg.page.tabs, lists: pg.page.lists, content: flat(pg.page.content, 300)}};
                if (field === 'codeValue') {
                    // the Native XML tool with Publisher Code blank again
                    await page.goto(nativeUrl(P)); await idle(page);
                    await page.getByRole('tab', {name: 'Export', exact: true}).first().click();
                    await page.locator('#exportSubmissions-tab .listPanel__item').first().waitFor({timeout: T}).catch(() => {});
                    o.blanks[field].nativeReminder = MISSING.test(await page.locator('#exportSubmissions-tab').innerText().catch(() => ''));
                }
                f = await openMasthead(P);
                if (field === 'codeType') await f.locator('select[name="codeType"]').selectOption(restore); else await f.locator(`[name="${field}"]`).first().fill(restore);
                o.blanks[field].restore = (await saveMasthead(f)).saved;
            }
            // whitespace only in Publisher Code (does a blank-looking value count as filled?)
            f = await openMasthead(P);
            await f.locator('[name="codeValue"]').first().fill('   ');
            o.spaces = {save: await saveMasthead(f)};
            o.spaces.masthead = await readMasthead(await openMasthead(P));
            const pgs = await openOnix(P, 'd-08-onix-page-code-spaces');
            o.spaces.tool = {tabs: pgs.page.tabs, content: flat(pgs.page.content, 200)};
            f = await openMasthead(P);
            await f.locator('[name="codeValue"]').first().fill('K5-TYPED');
            await saveMasthead(f);
            o.db = sql(`select setting_name, coalesce(setting_value,'<null>') from press_settings where press_id=${P.id} and setting_name in ('publisher','location','codeType','codeValue') order by 1`);
            // "Publisher Code Type" alone blank: the list has no empty choice once one is saved, so a press seeded
            // with the other three stands in for it
            if (!S.PT) { S.PT = await mkPress(S.t, 't', {publisher: 'K5 T Press', location: 'Brno', codeValue: 'K5-T'}); save(); }
            await as(S.PT.mg, S.PT.path);
            const pt = await openOnix(S.PT, 'd-09-onix-page-codetype-blank');
            o.codeTypeOnly = {tabs: pt.page.tabs, lists: pt.page.lists, content: flat(pt.page.content, 200)};
            const mt = await openMasthead(S.PT);
            o.codeTypeOnly.masthead = await readMasthead(mt);
            await snap('d-10-masthead-codetype-blank');
            return o;
        });
        fact('details', o);
    }

    // ============================================================ roles: the tool's address typed by other roles (sweep)
    if (on('roles')) {
        const o = await safe('roles', async () => {
            const o = {};
            for (const [u, ctx, key] of [['sectioneditor.ana', 'publicknowledge', 'subeditor'], ['admin', 'publicknowledge', 'admin'], [S.PF.au, S.PF.path, 'author'], ['manager.maya', 'publicknowledge', 'manager-pk']]) {
                await as(u, ctx);
                const r = await page.goto(cu(ctx, `/management/importexport/plugin/${ONIX}`)); await idle(page).catch(() => {});
                const s = await snap(`r-onix-typed-${key}`);
                o[key] = {status: r ? r.status() : null, url: rel(page.url()), page: await pageFacts(), main: flat(s.text && s.text.main, 300)};
            }
            return o;
        });
        fact('roles', o);
    }

    // ============================================================ list: Rule 17, td19 (PF), the page as a whole (Fields 158–168)
    if (on('list')) {
        const o = await safe('list', async () => {
            const o = {};
            const P = S.PF;
            await as(P.mg, P.path);
            o.arrive = await openOnix(P, 'l-01-onix-page-filled');
            o.list = await readList();
            await loc(page, 'ONIX tool: the tab strip', page.locator('#importExportTabs [role="tab"]'));
            await loc(page, 'ONIX tool: the list', tab().locator('.listPanel'));
            await loc(page, 'ONIX tool: list lines', tab().locator('.listPanel__item'));
            await loc(page, 'ONIX tool: the search box', tab().locator('.listPanel__header input[type="search"]'));
            await loc(page, 'ONIX tool: "Filters"', tab().getByRole('button', {name: 'Filters'}));
            await loc(page, 'ONIX tool: validation box', tab().locator('input[name="validation"]'));
            await loc(page, 'ONIX tool: "Select All"', tab().getByRole('button', {name: /^Select (All|None)$/}));
            await loc(page, 'ONIX tool: "Export Submissions"', tab().getByRole('button', {name: 'Export Submissions', exact: true}));
            await loc(page, 'ONIX tool: a line\'s "View"', tab().locator('.listPanel__item').first().getByRole('link', {name: 'View'}));
            // Filters
            await tab().getByRole('button', {name: 'Filters'}).first().click();
            await sleep(700); await idle(page);
            await snap('l-02-filters-open');
            o.filters = await readList();
            o.filterButtons = await tab().locator('.listPanel__sidebar').locator('button, a, input').evaluateAll((bs) => bs.map((b) => (b.innerText || b.value || '').trim()).filter(Boolean)).catch(() => []);
            // press "Submission" stage filter, then "Production"
            for (const f of ['Submission', 'Production']) {
                const b = tab().locator('.listPanel__sidebar').getByRole('button', {name: f, exact: true}).first();
                if (!(await b.count())) { o[`filter${f}`] = 'no such filter'; continue; }
                await b.click(); await sleep(1500); await idle(page);
                o[`filter${f}`] = (await readList()).items.map((x) => flat(x.text, 60));
                await b.click(); await sleep(1500); await idle(page);
            }
            await tab().getByRole('button', {name: 'Filters'}).first().click().catch(() => {});
            await sleep(500);
            // search box
            const box = tab().locator('.listPanel__header input[type="search"]').first();
            if (await box.count()) {
                await box.fill('Seven'); await sleep(300);
                o.searchNoEnter = (await readList()).count;
                await box.press('Enter'); await sleep(1500); await idle(page);
                o.searchSeven = (await readList()).items.map((x) => flat(x.text, 60));
                await snap('l-03-search-seven');
                await box.fill(''); await box.press('Enter'); await sleep(1500); await idle(page);
            }
            // Select All, then again
            const sa = tab().getByRole('button', {name: /^Select (All|None)$/}).first();
            await sa.click(); await sleep(500);
            o.selectAll1 = {label: flat(await sa.innerText()), checked: (await readList()).checked, count: (await readList()).count};
            await snap('l-04-select-all');
            await sa.click(); await sleep(500);
            o.selectAll2 = {label: flat(await sa.innerText()), checked: (await readList()).checked};
            // leave the tab with a tick and the validation box changed: what asks?
            await tab().locator('.listPanel__item input[type=checkbox]').first().check();
            await tab().locator('input[name="validation"]').first().setChecked(false);
            const t0 = Date.now();
            await page.goto(cu(P.path, '/management/tools')); await idle(page);
            o.leaveWithTick = {dialogs: dlgSince(t0), url: rel(page.url())};
            o.back = await openOnix(P);
            o.backList = {checked: (await readList()).checked, validation: (await readList()).validation};
            // which change asks: a tick alone, the validation box alone, Select All alone, a search alone
            o.leaveEach = {};
            for (const [k, act] of [['tick', () => tab().locator('.listPanel__item input[type=checkbox]').first().check()],
                ['validation', () => tab().locator('input[name="validation"]').first().setChecked(false)],
                ['selectAll', () => tab().getByRole('button', {name: /^Select (All|None)$/}).first().click()],
                ['search', async () => { const b = tab().locator('.listPanel__header input[type="search"]').first(); await b.fill('Seven'); await b.press('Enter'); await sleep(1200); }]]) {
                await openOnix(P);
                await act(); await sleep(300);
                await page.locator('body').click({position: {x: 5, y: 5}}).catch(() => {});
                const t1 = Date.now();
                await page.goto(cu(P.path, '/management/tools')); await idle(page);
                o.leaveEach[k] = dlgSince(t1).map((d) => d.type);
            }
            // "View" on the published book, on the draft, on the declined one
            for (const [k, B] of [['published', S.B1], ['draft', S.B3], ['submission', S.B2]]) {
                await openOnix(P);
                const it = tab().locator('.listPanel__item').filter({hasText: B.title}).first();
                const href = await it.getByRole('link', {name: 'View'}).first().getAttribute('href').catch(() => null);
                await it.getByRole('link', {name: 'View'}).first().click();
                await page.waitForLoadState('load'); await idle(page); await sleep(1500);
                const s = await snap(`l-05-view-${k}`);
                o[`view_${k}`] = {href: rel(href || ''), url: rel(page.url()), dialog: flat(s.text && s.text.dialog, 300), mainStart: flat(s.text && s.text.main, 200), h1: flat(await page.locator('h1').first().innerText().catch(() => null))};
            }
            return o;
        });
        fact('list', o);
    }

    // ============================================================ page: 100 to a page (PP, 101 books)
    if (on('page') && S.PP) {
        const o = await safe('page', async () => {
            const o = {};
            const P = S.PP;
            await as(P.mg, P.path);
            await openOnix(P, 'p-01-onix-list-101');
            const l = await readList();
            o.first = {count: l.count, pagination: l.pagination, firstItem: l.items[0] && l.items[0].text, lastItem: l.items.length && l.items[l.items.length - 1].text};
            const sa = tab().getByRole('button', {name: /^Select (All|None)$/}).first();
            await sa.click(); await sleep(500);
            o.selectAll = {label: flat(await sa.innerText()), checked: (await readList()).checked};
            await sa.click(); await sleep(500);
            o.selectAllSecond = {label: flat(await sa.innerText()), checked: (await readList()).checked};
            await snap('p-02-select-all-101');
            const p2 = tab().locator('.pkpPagination').getByRole('button', {name: /2/}).or(tab().locator('.pkpPagination').getByRole('link', {name: /2/})).first();
            if (await p2.count()) {
                await p2.click(); await sleep(1500); await idle(page);
                const l2 = await readList();
                o.page2 = {count: l2.count, items: l2.items.map((i) => flat(i.text, 60)), pagination: l2.pagination};
                await snap('p-03-onix-list-page2');
            } else o.page2 = 'no page-2 control';
            return o;
        });
        fact('page', o);
    }

    // ============================================================ export: Rule 18, 18a, A1, td20, td21 (PF)
    if (on('export')) {
        const o = await safe('export', async () => {
            const o = {};
            const P = S.PF;
            await as(P.mg, P.path);
            o.oneOn = await exportOnix(P, {words: [S.B1.title], validation: true, name: 'e-01-one-published-validation-on'});
            o.oneOff = await exportOnix(P, {words: [S.B1.title], validation: false, name: 'e-02-one-published-validation-off'});
            o.twoOn = await exportOnix(P, {words: [S.B1.title, S.B9.title], validation: true, name: 'e-03-two-published-validation-on'});
            o.twoOff = await exportOnix(P, {words: [S.B1.title, S.B9.title], validation: false, name: 'e-04-two-published-validation-off'});
            o.noFormatOn = await exportOnix(P, {words: [S.B5.title], validation: true, name: 'e-05-no-format-validation-on'});
            o.draftOff = await exportOnix(P, {words: [S.B3.title], validation: false, name: 'e-06-draft-validation-off'});
            o.allOn = await exportOnix(P, {selectAll: true, validation: true, name: 'e-07-select-all-validation-on'});
            o.noneOn = await exportOnix(P, {validation: true, name: 'e-08-none-validation-on'});
            o.noneOff = await exportOnix(P, {validation: false, name: 'e-09-none-validation-off'});
            // two exports on one page: the second results tab
            o.twiceOnOnePage = await (async () => {
                await openOnix(P);
                await tab().locator('.listPanel__item').filter({hasText: S.B1.title}).first().locator('input[type=checkbox]').check();
                await tab().getByRole('button', {name: 'Export Submissions', exact: true}).click();
                await page.locator('#importExportTabs [role=tab]').nth(1).waitFor({timeout: T}).catch(() => {});
                await idle(page); await sleep(800);
                await page.getByRole('tab', {name: 'Export', exact: true}).first().click(); await sleep(500);
                await tab().getByRole('button', {name: 'Export Submissions', exact: true}).click();
                await sleep(2500); await idle(page);
                await snap('e-10-second-export-same-page');
                return {tabs: await tabsNow(), panel: flat(await page.locator('#importExportTabs [role="tabpanel"]:visible').first().innerText().catch(() => null), 400)};
            })();
            o.tempAll = tempFiles(P.id);
            return o;
        });
        fact('export', o);
    }

    // ============================================================ close: the results tab's "Close" (sweep)
    if (on('close')) {
        const o = await safe('close', async () => {
            const o = {};
            const P = S.PF;
            await as(P.mg, P.path);
            await openOnix(P);
            await tab().locator('.listPanel__item').filter({hasText: S.B1.title}).first().locator('input[type=checkbox]').check();
            await tab().getByRole('button', {name: 'Export Submissions', exact: true}).click();
            await page.locator('#importExportTabs [role=tab]').nth(1).waitFor({timeout: T});
            await page.locator('#importExportTabs [role="tabpanel"]:visible').first().getByText(/failed/).waitFor({timeout: 60_000}).catch(() => {});
            await idle(page);
            o.before = await tabsNow();
            const res = page.locator('#importExportTabs [role="tab"]').nth(1);
            await loc(page, 'ONIX tool: the results tab\'s "Close"', res.locator('a, button').filter({hasText: /Close/}));
            const t0 = Date.now();
            await res.locator('a, button').filter({hasText: /Close/}).first().click();
            await sleep(1200);
            await snap('x-01-results-tab-closed');
            o.after = await tabsNow();
            o.dialogs = dlgSince(t0);
            o.exportTabShown = await tab().isVisible().catch(() => null);
            o.tickKept = (await readList()).checked;
            return o;
        });
        fact('close', o);
    }

    // ------------------------------------------------------------ format window helpers (Publication Formats page)
    const fmtUrl = (P, id, pub) => cu(P.path, `/dashboard/editorial?workflowSubmissionId=${id}&workflowMenuKey=publication_${pub}_publicationFormats`);
    const wf = () => page.locator(VIS).first();
    async function openFormats(P, id, pub) {
        await page.goto(fmtUrl(P, id, pub)); await idle(page);
        await wf().locator('a').filter({hasText: 'Add publication format'}).first().waitFor({timeout: T});
        await wf().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
    }
    const fmtRow = (n) => wf().locator('tr.gridRow').filter({has: page.locator('span.label', {has: page.locator('.onix_code'), hasText: new RegExp(`^\\s*${n}`)})}).first();
    async function fmtAction(n, label) {
        const r = fmtRow(n);
        await r.waitFor({timeout: T});
        const id = await r.getAttribute('id');
        const ctl = page.locator(`[id="${id}-control-row"]`);
        const a = ctl.getByRole('link', {name: label, exact: true}).first();
        if (!(await a.isVisible().catch(() => false))) { await r.locator('a.show_extras').first().click(); await a.waitFor({state: 'visible', timeout: 10_000}); }
        await a.click();
    }
    async function openEdit(n) {
        const n0 = await dialogCount();
        await fmtAction(n, 'Edit');
        await waitTop('[role=tab]', n0 + 1);
        await waitTop('form', n0 + 1);
        await idle(page); await sleep(300);
    }
    const metaForm = () => top().locator('form[id^="publicationMetadataEntryForm-"]');
    async function metaTab() {
        await top().locator('[role=tab]').filter({hasText: /^\s*Metadata\s*$/}).first().click();
        const f = metaForm();
        await f.waitFor({state: 'visible', timeout: T});
        for (const g of ['identificationCodeGridContainer', SR, MK, 'publicationDateGridContainer']) await f.locator(`[id^="${g}"] table`).first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(300);
        return f;
    }
    async function openMeta(P, id, pub, fmt) { await openFormats(P, id, pub); await openEdit(fmt); return metaTab(); }
    const grid = (g) => metaForm().locator(`div[id^="${g}"]`).first();
    const gridRows = (g) => grid(g).locator('tbody tr.gridRow').evaluateAll((trs) => trs.filter((e) => e.getClientRects().length).map((tr) => [...tr.querySelectorAll(':scope > td')].map((td) => td.textContent.replace(/\s+/g, ' ').trim()).join(' | '))).catch(() => []);
    async function openAdd(g, linkName, formSel) {
        const n0 = await dialogCount();
        await grid(g).locator('.header a').filter({hasText: new RegExp(`^\\s*${linkName}\\s*$`)}).first().click();
        await waitTop(formSel, n0 + 1);
        await idle(page); await sleep(400);
    }
    async function subOK(formSel, opRe) {
        const t0 = Date.now();
        const n0 = await dialogCount();
        const resp = page.waitForResponse((r) => opRe.test(r.url()) && r.request().method() === 'POST', {timeout: 15_000}).catch(() => null);
        await top().locator(formSel).getByRole('button', {name: 'OK', exact: true}).first().click();
        const r = await resp;
        await idle(page); await sleep(900);
        const closed = await waitCount(n0 - 1);
        await sleep(600);
        return {answer: r ? r.status() : 'no request', closed, notices: noticesSince(t0), dialogs: dlgSince(t0)};
    }
    async function rowAction(g, rowText, action) {
        const row = grid(g).locator('tr.gridRow').filter({hasText: rowText}).first();
        const id = await row.getAttribute('id');
        const ctl = page.locator(`[id="${id}-control-row"]`);
        const a = ctl.getByRole('link', {name: action, exact: true}).first();
        if (!(await a.isVisible().catch(() => false))) { await row.locator('a.show_extras').first().click(); await a.waitFor({state: 'visible', timeout: 10_000}); }
        await a.click();
    }
    async function answerDelete(answer, name) {
        const t0 = Date.now();
        const q = page.locator('[role=dialog]:visible, [role=alertdialog]:visible').filter({hasText: /Are you sure|delete/i}).last();
        await q.waitFor({timeout: 15_000});
        await sleep(300);
        const text = flat(await q.innerText().catch(() => null), 300);
        if (name) await snap(name);
        await q.getByRole('button', {name: answer, exact: true}).first().click();
        await idle(page); await sleep(1500);
        return {text, notices: noticesSince(t0), dialogs: dlgSince(t0), posts: since(t0).filter((p) => p.method !== 'GET').map((p) => `${p.method} ${p.status} ${p.url.slice(0, 90)}`)};
    }
    async function closeFormatWindow() {
        const n0 = await dialogCount();
        await top().getByRole('button', {name: 'Close', exact: true}).first().click();
        await waitCount(n0 - 1);
        await sleep(700);
    }

    // ============================================================ native: Rule 19, td22 (PF)
    if (on('native')) {
        const o = await safe('native', async () => {
            const o = {};
            const P = S.PF;
            await as(P.mg, P.path);
            o.b1 = await nativeExport(P, [S.B1.title], 'n-01-native-b1');
            o.b1NoValidation = await nativeExport(P, [S.B1.title], 'n-02-native-b1-validation-off', {validation: false});
            // (exact) Tenth Grade on the Audience page, saved, exported again
            o.exact = await (async () => {
                await page.goto(cu(P.path, `/dashboard/editorial?workflowSubmissionId=${S.B1.id}&workflowMenuKey=marketing_audience`)); await idle(page);
                const form = page.locator('[data-cy="workflow-primary-items"]').first();
                await form.locator('select').first().waitFor({timeout: T});
                const id = await form.locator('label').filter({hasText: /\(exact\)/}).first().getAttribute('for');
                await page.locator(`[id="${id}"]`).selectOption({label: 'Tenth Grade (10)'});
                const t0 = Date.now();
                await form.getByRole('button', {name: 'Save', exact: true}).click();
                await form.locator('.pkpFormPage__status').filter({hasText: /Saved/}).first().waitFor({timeout: 10_000}).catch(() => {});
                const r = {status: flat(await form.locator('.pkpFormPage__status').allInnerTexts().catch(() => [])), posts: since(t0).filter((p) => p.method !== 'GET').map((p) => `${p.method} ${p.status}`)};
                r.exp = await nativeExport(P, [S.B1.title], 'n-03-native-b1-exact');
                return r;
            })();
            o.b6PriceTen = await nativeExport(P, [S.B6.title], 'n-04-native-b6-price-ten');
            o.b6PriceTenNoValidation = await nativeExport(P, [S.B6.title], 'n-05-native-b6-price-ten-validation-off', {validation: false});
            // B7: page counts typed "xii" on the Print format's Metadata tab
            o.b7 = await (async () => {
                const r = {};
                const f = await openMeta(P, S.B7.id, S.B7.pub, 'Print');
                await f.locator('input[name="frontMatter"]').fill('xii');
                if (!(await f.locator('select[name="productCompositionCode"]').inputValue())) await f.locator('select[name="productCompositionCode"]').selectOption('00');
                const t0 = Date.now();
                await f.getByRole('button', {name: 'Save', exact: true}).first().click();
                await idle(page); await sleep(1500);
                r.save = {posts: since(t0).filter((p) => p.method !== 'GET').map((p) => `${p.method} ${p.status} ${p.url.slice(0, 80)}`), notices: noticesSince(t0)};
                if (await dialogCount() > 1) await closeFormatWindow();
                r.db = sql(`select front_matter, back_matter from publication_formats where publication_id=${S.B7.pub}`);
                r.exp = await nativeExport(P, [S.B7.title], 'n-06-native-b7-xii');
                return r;
            })();
            // the three together: does one bad book fail the whole file?
            o.mixed = await nativeExport(P, [S.B1.title, S.B6.title], 'n-07-native-b1-and-b6');
            // control: Publisher Code emptied on the Masthead
            const f = await openMasthead(P);
            await f.locator('[name="codeValue"]').first().fill('');
            o.codeEmptied = await saveMasthead(f);
            o.b1CodeEmpty = await nativeExport(P, [S.B1.title], 'n-08-native-b1-code-empty');
            o.b6CodeEmpty = await nativeExport(P, [S.B6.title], 'n-09-native-b6-code-empty');
            const f2 = await openMasthead(P);
            await f2.locator('[name="codeValue"]').first().fill('K5-0001');
            o.codeRestored = (await saveMasthead(f2)).saved;
            return o;
        });
        fact('native', o);
    }

    // ------------------------------------------------------------ Activity Log, Tasks, mail
    async function readActivityLog(P, sid, name) {
        await page.goto(cu(P.path, `/dashboard/editorial?workflowSubmissionId=${sid}`)); await idle(page);
        const btn = page.locator(VIS).first().getByRole('button', {name: 'Activity Log', exact: true}).first();
        await btn.waitFor({timeout: T});
        await btn.click();
        const d = page.getByRole('dialog').filter({hasText: 'Activity Log'}).last();
        await d.locator('tr.gridRow, td:has-text("No Items")').first().waitFor({timeout: 45_000}).catch(() => {});
        await idle(page); await sleep(500);
        await snap(name);
        const rows = await d.locator('tr.gridRow').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.replace(/\s+/g, ' ').trim()).join(' | '))).catch(() => []);
        return rows;
    }
    async function tasksCount(user, ctx, dash) {
        await as(user, ctx);
        await page.goto(cu(ctx, `/dashboard/${dash}`)); await idle(page);
        const b = page.getByRole('button', {name: /^Tasks/}).first();
        return flat(await b.getAttribute('aria-label').catch(() => null) || await b.innerText().catch(() => null), 100);
    }
    const mailCounts = async (P) => {
        const o = {};
        for (const x of [`${P.mg}@mail.test`, `${P.au}@mail.test`, P.contact, 'admin@mail.test']) o[x] = await app.mail.count({to: x}).catch((e) => `err ${String(e.message).slice(0, 60)}`);
        return o;
    };

    // ============================================================ side: Side effects 370–376, td7, td25 (PF, B8)
    if (on('side')) {
        const o = await safe('side', async () => {
            const o = {};
            const P = S.PF; const B = S.B8;
            o.before = {
                mail: await mailCounts(P),
                tasksManager: await tasksCount(P.mg, P.path, 'editorial'),
                tasksAuthor: await tasksCount(P.au, P.path, 'mySubmissions'),
                notifications: sql(`select count(*) from notifications where context_id=${P.id}`),
                logDb: sql(`select count(*) from event_log where assoc_type=1048585 and assoc_id=${B.id}`),
                emailLog: sql(`select count(*) from email_log where assoc_type=1048585 and assoc_id=${B.id}`),
                tasksDb: sql(`select count(*) from edit_tasks where assoc_type=1048585 and assoc_id=${B.id}`),
            };
            await as(P.mg, P.path);
            o.before.log = await readActivityLog(P, B.id, 's-00-activity-log-before');
            // ---- Representatives: add, edit (no change), delete; refused delete
            const repGrid = () => page.locator('div[id^="component-grid-catalogentry-representativesgrid"]').first();
            const repForm = () => page.locator('form#representativeForm:visible');
            await page.goto(cu(P.path, `/dashboard/editorial?workflowSubmissionId=${B.id}&workflowMenuKey=marketing_representatives`)); await idle(page);
            await repGrid().waitFor({timeout: T}); await idle(page);
            const repOk = async () => {
                const t0 = Date.now();
                await repForm().getByRole('button', {name: 'OK', exact: true}).click();
                const closed = await page.locator('form#representativeForm').waitFor({state: 'hidden', timeout: 8000}).then(() => true).catch(() => false);
                await idle(page); await sleep(1200);
                return {closed, notices: noticesSince(t0), dialogs: dlgSince(t0)};
            };
            const repEntry = async (name, label) => {
                const row = repGrid().locator('tr.gridRow').filter({hasText: name}).first();
                const id = await row.getAttribute('id');
                const ctl = page.locator(`[id="${id}-control-row"]`);
                const a = ctl.locator('a:visible').filter({hasText: new RegExp(`^\\s*${label}\\s*$`)});
                if (!(await a.count())) await row.locator('a.show_extras').click();
                await ctl.locator('a').filter({hasText: new RegExp(`^\\s*${label}\\s*$`)}).first().click();
            };
            o.rep = {};
            await page.locator('a').filter({hasText: /^\s*Add Representative\s*$/}).first().click();
            await repForm().locator('input[name="name"]').waitFor({timeout: T}); await idle(page);
            await repForm().locator('input[name="isSupplier"][value="0"]').check(); await sleep(200);
            await repForm().locator('select[name="agentRole"]').selectOption({label: 'Exclusive sales agent (05)'});
            await repForm().locator('input[name="name"]').fill('Alpha Agency');
            o.rep.add = await repOk();
            await snap('s-01-rep-added');
            await repEntry('Alpha Agency', 'Edit');
            await repForm().locator('input[name="name"]').waitFor({timeout: T}); await idle(page); await sleep(300);
            o.rep.edit = await repOk();
            await repEntry('Alpha Agency', 'Delete');
            const cd = page.getByRole('dialog', {name: 'Delete', exact: true});
            await cd.waitFor({timeout: T});
            let t0 = Date.now();
            await cd.getByRole('button', {name: 'OK', exact: true}).click();
            await cd.waitFor({state: 'detached', timeout: 8000}).catch(() => {});
            await idle(page); await sleep(1500);
            o.rep.del = {notices: noticesSince(t0), dialogs: dlgSince(t0)};
            await snap('s-02-rep-deleted');
            // refused: "Named Agency" is named by the seeded market
            await repEntry('Named Agency', 'Delete');
            await cd.waitFor({timeout: T});
            t0 = Date.now();
            await cd.getByRole('button', {name: 'OK', exact: true}).click();
            const gone = await cd.waitFor({state: 'detached', timeout: 6000}).then(() => true).catch(() => false);
            await sleep(1500);
            const sr = await snap('s-03-rep-delete-refused');
            o.rep.refused = {confirmClosed: gone, notices: noticesSince(t0), dialogs: dlgSince(t0), screenNotices: sr.notices, dialogText: flat(sr.text && sr.text.dialog, 300),
                posts: since(t0).filter((p) => p.method !== 'GET').map((p) => `${p.method} ${p.status} ${p.url.slice(0, 80)} ${p.body.slice(0, 200)}`)};
            if (!gone) { await cd.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {}); await cd.waitFor({state: 'detached', timeout: 8000}).catch(() => {}); await sleep(800); }
            o.rep.rowsAfter = await repGrid().locator('tr.gridRow').allInnerTexts().then((a) => a.map((x) => flat(x, 80))).catch(() => []);
            // ---- Audience: choose and Save
            await page.goto(cu(P.path, `/dashboard/editorial?workflowSubmissionId=${B.id}&workflowMenuKey=marketing_audience`)); await idle(page);
            const af = page.locator('[data-cy="workflow-primary-items"]').first();
            await af.locator('select').first().waitFor({timeout: T});
            const aid = await af.locator('label').filter({hasText: /^\s*Audience\s*\*?\s*$/}).first().getAttribute('for');
            await page.locator(`[id="${aid}"]`).selectOption({label: 'Children (02)'});
            t0 = Date.now();
            await af.getByRole('button', {name: 'Save', exact: true}).click();
            await af.locator('.pkpFormPage__status').filter({hasText: /Saved/}).first().waitFor({timeout: 10_000}).catch(() => {});
            const sa = await snap('s-04-audience-saved');
            o.audience = {status: flat(await af.locator('.pkpFormPage__status').allInnerTexts().catch(() => [])), notices: noticesSince(t0), screenNotices: sa.notices,
                statusNearButton: await af.evaluate((f) => { const b = [...f.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Save'); const s = f.querySelector('.pkpFormPage__status'); if (!b || !s) return null; const rb = b.getBoundingClientRect(); const rs = s.getBoundingClientRect(); return {button: [Math.round(rb.x), Math.round(rb.y)], status: [Math.round(rs.x), Math.round(rs.y)]}; }).catch(() => null)};
            // ---- Sales Rights and Market Territories on Paperback: add, edit (no change), delete
            await openMeta(P, B.id, B.pub, 'Paperback');
            o.sr = {};
            await openAdd(SR, 'Add Sales Rights', SRFORM);
            await top().locator(SRFORM).locator('select[name="countriesIncluded[]"]').selectOption(['CA']);
            o.sr.add = await subOK(SRFORM, /update-rights|updateRights/);
            const srRow = (await gridRows(SR))[0] || '';
            await rowAction(SR, srRow.split(' | ')[0].slice(0, 30), 'Edit');
            await waitTop(SRFORM, 3); await idle(page); await sleep(400);
            o.sr.edit = await subOK(SRFORM, /update-rights|updateRights/);
            await rowAction(SR, srRow.split(' | ')[0].slice(0, 30), 'Delete');
            o.sr.del = await answerDelete('OK', 's-05-sr-delete-question');
            o.mk = {};
            await openAdd(MK, 'Add Market', MKFORM);
            const mf = top().locator(MKFORM);
            await mf.locator('input[name="date"]').fill('20250401');
            await mf.locator('input[name="price"]').fill('19');
            await mf.locator('select[name="countriesIncluded[]"]').selectOption(['US']);
            o.mk.add = await subOK(MKFORM, /update-market|updateMarket/);
            o.mk.rows = await gridRows(MK);
            await rowAction(MK, 'US', 'Edit');
            await waitTop(MKFORM, 3); await idle(page); await sleep(400);
            o.mk.edit = await subOK(MKFORM, /update-market|updateMarket/);
            await rowAction(MK, 'US', 'Delete');
            o.mk.del = await answerDelete('OK', 's-06-mk-delete-question');
            await snap('s-07-lists-after');
            await closeFormatWindow();
            // ---- after: log, mail, tasks
            o.drain = await drainJobs(app).then((r) => ({passes: r.passes, counts: r.counts, output: flat(r.output, 600)})).catch((e) => String(e.message).slice(0, 100));
            await sleep(3000);
            o.after = {
                log: await readActivityLog(P, B.id, 's-08-activity-log-after'),
                mail: await mailCounts(P),
                tasksManager: await tasksCount(P.mg, P.path, 'editorial'),
                tasksAuthor: await tasksCount(P.au, P.path, 'mySubmissions'),
                notifications: sql(`select count(*) from notifications where context_id=${P.id}`),
                logDb: sql(`select count(*) from event_log where assoc_type=1048585 and assoc_id=${B.id}`),
                emailLog: sql(`select count(*) from email_log where assoc_type=1048585 and assoc_id=${B.id}`),
                tasksDb: sql(`select count(*) from edit_tasks where assoc_type=1048585 and assoc_id=${B.id}`),
            };
            return o;
        });
        fact('side', o);
    }

    // ============================================================ version: Side effects 377–378 (PF, B9)
    if (on('version')) {
        const o = await safe('version', async () => {
            const o = {};
            const P = S.PF; const B = S.B9;
            await as(P.mg, P.path);
            const lists = (pub) => sql(`select pf.publication_format_id, (select count(*) from sales_rights s where s.publication_format_id=pf.publication_format_id), (select count(*) from markets m where m.publication_format_id=pf.publication_format_id) from publication_formats pf where pf.publication_id=${pub} order by 1`);
            o.v1Before = lists(B.pub);
            if (!S.B9.pub2) {
                await openFormats(P, B.id, B.pub);
                const {WorkflowPage} = require(path.resolve(__dirname, '../../../pages/WorkflowPage.js'));
                const w = new WorkflowPage(page, null);
                const item = await w.revealPublicationEntry('Create New Version');
                await w.expectVersionLoaded();
                await item.click();
                const dlg = page.getByRole('dialog', {name: 'Create New Version'});
                await dlg.getByRole('button', {name: 'Confirm', exact: true}).waitFor({timeout: T});
                await idle(page);
                const created = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
                await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
                const resp = await created;
                o.created = resp.status();
                S.B9.pub2 = (await resp.json().catch(() => ({}))).id; save();
                await dlg.waitFor({state: 'detached', timeout: T}).catch(() => {});
                await idle(page);
            }
            o.pub2 = S.B9.pub2;
            o.v2Db = lists(S.B9.pub2);
            for (const fmt of ['Paperback', 'Hardback']) {
                await openMeta(P, B.id, S.B9.pub2, fmt);
                await snap(`v-01-new-version-${fmt.toLowerCase()}`);
                o[`v2_${fmt}`] = {salesRights: await gridRows(SR), markets: await gridRows(MK)};
                await closeFormatWindow();
            }
            // delete "Hardback" on the new version
            await openFormats(P, B.id, S.B9.pub2);
            const hbId = sql(`select publication_format_id from publication_formats pf join publication_format_settings s using (publication_format_id) where pf.publication_id=${S.B9.pub2} and s.setting_name='name' and s.setting_value='Hardback' limit 1`);
            await fmtAction('Hardback', 'Delete');
            o.delFormat = await answerDelete('OK', 'v-02-format-delete-question');
            await snap('v-03-after-format-delete');
            o.hardbackId = hbId;
            o.afterDelete = {rowsLeft: sql(`select (select count(*) from sales_rights where publication_format_id=${Number(hbId) || 0}), (select count(*) from markets where publication_format_id=${Number(hbId) || 0}), (select count(*) from publication_formats where publication_format_id=${Number(hbId) || 0})`),
                v2: lists(S.B9.pub2), v1: lists(B.pub)};
            // the first version's Hardback still has its lists on screen
            await openMeta(P, B.id, B.pub, 'Hardback');
            await snap('v-04-first-version-hardback');
            o.v1Hardback = {salesRights: await gridRows(SR), markets: await gridRows(MK)};
            await closeFormatWindow();
            return o;
        });
        fact('version', o);
    }

    await close();
});
