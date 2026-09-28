// U74 claim check K6 — what an ONIX product carries, read from the Native XML export, and the Native XML import {OMP},
// with a read-only control on OJS and OPS (their Native XML file carries no ONIX product).
// Spec: docs/specs/U74-onix-metadata-export.md — Rules 20–25 (301–367); register A9, A10 (584–607);
// footnotes k, m, l, td22, td23, td24, f-a9, f-a10.
//
// Run: RUN=r1 PROBE_FEATURE=U74 PROBE_AGENT=ccK6 node bin/probe.js all shared/playwright/checks/U74/K6/k6.js
//      RUN=r2 …  (a second, independent run: its own scratch presses, its own facts file k6-<RUN>-facts-<app>.json)
//      PHASES=seed,pages,hand,export,ten,import,imported,reexport,leave,extra,dup,nocode (OMP) · control (OJS, OPS)
//      Default: all. Later phases read k6-state-<RUN>-<app>.json; FRESH=1 seeds anew. A full OMP run can outlast the
//      Bash cap: launch it detached (nohup … &).
//
// Scratch contexts per run (tag u74k6…), OMP:
//   P1  a press with its four ONIX details and a principal contact; manager {t}amg drives every screen.
//       Book A (at Production): audience "Children (02)", "US school grade range (11)", from "Ninth Grade (9)" to
//         "Twelfth Grade (12)"; keywords; representatives agents "Alpha Agency" (website, phone, email, GLN id),
//         "Beta Agency" (nothing but a role and name), "Omega Agency" (named by no market; id, phone, email, website),
//         suppliers "Gamma Distribution" (phone, email, website, SAN id) and "Sigma Supply" (no website).
//         "Paperback": codes, a publication date, the Metadata tab saved (Available (20), returnable Y); the three
//           td23 sales-rights entries; market M1 (CA, Alpha, Gamma, 25, RRP excl. tax (01), GST (02), Zero-rated,
//           discount 10) and M2 (US, nothing chosen, no supplier, 30).
//         "Ebook": three more sales-rights shapes (countries + regions + exclusions; countries + WORLD; regions only);
//           market M3 (WORLD with exclusions, Alpha, Sigma, 15 USD, RRP incl. tax (02) with GST/Zero-rated) and
//           M4 (GB, Beta, Gamma, 12); its Metadata tab set by hand to "In stock (21)" and "No, not returnable (N)";
//           then M4's agent switched by hand to a second "Alpha Agency" with another website (Rule 25's other end).
//         "Hardback": nothing (no market: no ProductSupply).
//       Book B: audience "General / adult (01)", qualifier 11, "(exact)" "Tenth Grade (10)" and "(from)" "Ninth Grade (9)";
//         "Paperback" with one market (CA, 20, no representatives), Metadata tab never saved.
//       Book C: no audience, "(from)" "Ninth Grade (9)" alone (no qualifier); "Paperback" with one market.
//       Book D: audience "Teenage (03)", qualifier 11 with "(to)" "Tenth Grade (10)" alone; "Paperback".
//       Book E: "Paperback" with a market priced "ten" (td22).
//   P2  a press with its four ONIX details, the Native XML import's target; manager {t}bmg.
// OJS, OPS: a scratch journal / server with one galley "PDF"; its Native XML export read for ONIX elements.
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const RUN = process.env.RUN || 'r1';
const ALL = ['seed', 'pages', 'hand', 'export', 'ten', 'import', 'imported', 'reexport', 'leave', 'extra', 'dup', 'nocode', 'control'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',').map((s) => s.trim());
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k6]', RUN, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const VIS = '[role="dialog"]:visible';
const SR = 'salesRightsGridContainer';
const MK = 'marketsGridContainer';
const SRFORM = 'form#addSalesRightsForm';
const MKFORM = 'form#marketForm';
const PARSER = path.join(__dirname, 'parse-native.py');

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const sf = path.join(outDir(), `k6-state-${RUN}-${app.name}.json`);
    let S = (!process.env.FRESH && fs.existsSync(sf)) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`k6-${RUN}-facts`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const sql = (q) => { try { return execFileSync('psql', ['-d', `${app.name}_test`, '-tA', '-F', '|', '-c', q], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim(); } catch (e) { return `SQL ERROR ${String(e.stderr).trim()}`; } };
    const cu = (ctx, p) => app.url(`/index.php/${ctx}${p}`);

    const {page, close} = await launch(app);
    let policy = 'dismiss';
    const jsDialogs = [];
    page.on('dialog', async (d) => {
        jsDialogs.push({at: Date.now(), type: d.type(), message: d.message(), answered: d.type() === 'beforeunload' ? 'accept' : policy});
        if (d.type() === 'beforeunload' || policy === 'accept') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    const dlgSince = (t0) => jsDialogs.filter((d) => d.at >= t0).map(({at, ...d}) => d);
    const notices = [];
    await page.exposeFunction('__k6Notice', (text) => notices.push({at: Date.now(), text}));
    await page.addInitScript(() => {
        const seen = new WeakSet();
        new MutationObserver(() => {
            document.querySelectorAll('.app__notifications .pkpNotification, .pkp_notification').forEach((e) => {
                if (seen.has(e)) return;
                const t = (e.textContent || '').replace(/\s+/g, ' ').trim();
                if (!t) return;
                seen.add(e);
                window.__k6Notice(t);
            });
        }).observe(document, {childList: true, subtree: true});
    });
    const noticesSince = (t0) => notices.filter((n) => n.at >= t0).map((n) => n.text);
    const posts = [];
    page.on('response', async (r) => {
        const m = r.request().method();
        if (m === 'GET' && r.status() < 400) return;
        const u = r.url();
        if (/\.(js|css|png|svg|woff2?)(\?|$)/.test(u)) return;
        let body = '';
        if (m !== 'GET') { try { body = (await r.text()).slice(0, 400); } catch { /* ignore */ } }
        posts.push({at: Date.now(), method: m, status: r.status(), url: u.replace(/^.*\/index\.php/, '').replace(/csrfToken=[^&]+/, 'csrf').slice(0, 180), body: flat(body, 250)});
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
    const parse = (file) => { try { return JSON.parse(execFileSync('python3', [PARSER, file], {encoding: 'utf8', maxBuffer: 50e6})); } catch (e) { return {error: String(e.stderr || e.message).slice(0, 400)}; } };

    /** Tools › Native XML Plugin › Export: tick the lines holding any of `words`, export, download and parse. */
    async function nativeExport(ctx, words, name, tabName = 'Export') {
        const r = {};
        await page.goto(cu(ctx, '/management/importexport/plugin/NativeImportExportPlugin')); await idle(page);
        await page.getByRole('tab', {name: tabName, exact: true}).first().click();
        const et = page.locator('#exportSubmissions-tab');
        await et.locator('.listPanel__item').first().waitFor({timeout: T});
        await idle(page); await sleep(500);
        const items = et.locator('.listPanel__item');
        r.items = []; r.ticked = [];
        for (let i = 0; i < await items.count(); i++) {
            const it = items.nth(i);
            const txt = flat(await it.innerText(), 200);
            r.items.push(txt);
            if (words.some((w) => txt.includes(w))) { await it.locator('input[type=checkbox]').check(); r.ticked.push(txt); }
        }
        const tabsBefore = await page.locator('#importExportTabs [role=tab]').count();
        const t0 = Date.now();
        const btn = isOMP ? 'Export Submissions' : tabName;
        await et.getByRole('button', {name: btn, exact: true}).click();
        for (let i = 0; i < 90; i++) { await sleep(500); if ((await page.locator('#importExportTabs [role=tab]').count()) > tabsBefore) break; }
        await idle(page); await sleep(1000);
        const panel = page.locator('#importExportTabs [role="tabpanel"]:visible').first();
        await panel.getByText(/Download Exported File|failed|error/i).first().waitFor({timeout: 60_000}).catch(() => {});
        await snap(name);
        r.tabs = (await page.locator('#importExportTabs [role=tab]').allInnerTexts().catch(() => [])).map((x) => flat(x));
        r.results = flat(await panel.innerText().catch(() => null), 2500);
        r.errorAnswers = since(t0).filter((p) => p.status >= 400).slice(0, 5);
        const b = panel.getByRole('button', {name: 'Download Exported File'});
        if (await b.count()) {
            const dl = page.waitForEvent('download', {timeout: 30_000}).catch(() => null);
            await b.first().click();
            const d = await dl;
            if (d) {
                const xml = fs.readFileSync(await d.path(), 'utf8');
                const file = path.join(outDir(), `${RUN}-${name}-${app.name}.xml`);
                fs.writeFileSync(file, xml);
                r.file = path.relative(process.cwd(), file); r.bytes = xml.length;
                r.onixMentions = (xml.match(/onix:/g) || []).length;
                r.parsed = parse(file);
            } else r.download = 'none';
        }
        return r;
    }

    // ============================================================ OJS / OPS: the read-only control
    if (!isOMP) {
        if (!on('control')) { await close(); return; }
        const isOJS = app.name === 'ojs';
        if (!S.J) {
            const t = tag('u74k6');
            const FILE = isOJS ? 'article.pdf' : 'preprint.pdf';
            const c = await app.api.createContext({tag: `${t}j`, context: {name: `U74 K6 control ${t}`, contactName: 'K6 Contact', contactEmail: `${t}jc@mail.test`},
                users: [{username: `${t}jmg`, roles: ['manager']}, {username: `${t}jau`, roles: ['author']}]});
            const sub = await app.api.createSubmission({tag: `${t}s`, context: c.path, submitter: `${t}jau`, title: `K6 control ${t}`,
                ...(isOJS ? {files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction']} : {}), galleys: [{label: 'PDF', file: FILE}]});
            S = {t, J: c.path, mg: `${t}jmg`, sid: sub.submissionId};
            save();
        }
        const o = await safe('control', async () => {
            await as(S.mg, S.J);
            const tabName = isOJS ? 'Export Articles' : 'Export Preprints';
            const x = await nativeExport(S.J, ['K6 control'], 'c-01-native-export', tabName);
            // the import tab: what it offers
            await page.goto(cu(S.J, '/management/importexport/plugin/NativeImportExportPlugin')); await idle(page);
            await page.getByRole('tab', {name: 'Import', exact: true}).first().click(); await sleep(500);
            await snap('c-02-native-import-tab');
            const tags = x.file ? [...new Set((fs.readFileSync(x.file, 'utf8').match(/<([A-Za-z_:]+)[\s>]/g) || []).map((m) => m.slice(1, -1).trim()))] : [];
            return {results: x.results, file: x.file, onixMentions: x.onixMentions, tradeTags: tags.filter((t) => /onix|Product|Audience|SalesRights|Market|Supplier|Agent/i.test(t)), tagCount: tags.length,
                importTab: flat(await page.locator('#importExportTabs [role="tabpanel"]:visible').first().innerText().catch(() => null), 600)};
        });
        fact('control', o);
        await close();
        return;
    }

    // ============================================================ OMP: seed
    const REP = {
        alpha: {type: 'agent', role: 'Exclusive sales agent (05)', name: 'Alpha Agency', idType: 'GLN (06)', idValue: 'K6AGTID4711', phone: '+1 604 555 0101', email: 'alpha.k6@agency.test', website: 'https://alpha.example.test'},
        beta: {type: 'agent', role: 'Sales agent (08)', name: 'Beta Agency'},
        omega: {type: 'agent', role: 'Non-exclusive sales agent (06)', name: 'Omega Agency', idValue: 'K6OMEGAID99', phone: '+1 604 555 0909', email: 'omega.k6@agency.test', website: 'https://omega.example.test'},
        gamma: {type: 'supplier', role: 'Distributor to end-customers (12)', name: 'Gamma Distribution', idType: 'SAN (07)', idValue: 'K6SUPID0815', phone: '+1 604 555 0202', email: 'gamma.k6@dist.test', website: 'https://gamma.example.test'},
        sigma: {type: 'supplier', role: 'Wholesaler to retailers (04)', name: 'Sigma Supply'},
    };
    const BASE = {files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction']};
    const T01 = 'For sale with exclusive rights in the specified countries or territories (01)';
    const T02 = 'For sale with non-exclusive rights in the specified countries or territories (02)';
    const T03 = 'Not for sale in the specified countries or territories (reason unspecified) (03)';
    const mkt = (price, extra = {}) => ({date: '20250301', dateFormat: 'YYYYMMDD', price, ...extra});
    if (on('seed') && !S.P1) {
        const t = tag('u74k6');
        S.t = t;
        const mk = async (k, extra) => {
            const users = [{username: `${t}${k}mg`, roles: ['manager'], givenName: 'Mona', familyName: `K6${k}`},
                {username: `${t}${k}au`, roles: ['author'], givenName: 'Abe', familyName: `K6${k}`}];
            const r = await app.api.createContext({tag: `${t}${k}`, context: {name: `U74 K6 ${k} ${t}`, acronym: 'K6P', country: 'CA', contactName: `K6 Contact ${k}`, contactEmail: `${t}${k}c@mail.test`}, users, ...extra});
            return {path: r.path, id: r.contextId, mg: `${t}${k}mg`, au: `${t}${k}au`, contact: `${t}${k}c@mail.test`};
        };
        S.P1 = await mk('a', {publisher: 'K6 Press Ltd', location: 'Vancouver, Canada', codeType: 'Proprietary (01)', codeValue: 'K6-0001'});
        S.P2 = await mk('b', {publisher: 'K6 Import Press', location: 'Toronto, Canada', codeType: 'Proprietary (01)', codeValue: 'K6-0002'});
        const sub = async (k, title, extra) => {
            const r = await app.api.createSubmission({tag: `${t}${k}`, context: S.P1.path, submitter: S.P1.au, title: `${title} ${t}`, ...BASE, ...extra});
            return {id: r.submissionId, pub: r.publicationId, formats: r.publicationFormats, reps: r.representatives, title: `${title} ${t}`};
        };
        S.A = await sub('x', 'K6 A-book', {
            keywords: ['k6 keyword one', 'k6 keyword two'],
            audience: {audience: 'Children (02)', rangeQualifier: 'US school grade range (11)', rangeFrom: 'Ninth Grade (9)', rangeTo: 'Twelfth Grade (12)'},
            representatives: [REP.alpha, REP.beta, REP.omega, REP.gamma, REP.sigma],
            publicationFormats: [
                {name: 'Paperback',
                    identificationCodes: [{type: 'ISBN-13 (15)', value: '9780000000002'}],
                    publicationDates: [{role: 'Publication date (01)', date: '20250301', dateFormat: 'YYYYMMDD'}],
                    metadata: {productComposition: 'Single-component retail product (00)', height: '200', width: '130'},
                    salesRights: [
                        {type: T01, restOfWorld: true, countriesIncluded: ['Canada (CA)']},
                        {type: T02, countriesIncluded: ['Canada (CA)', 'United States (US)'], countriesExcluded: ['United Kingdom (GB)']},
                        {type: T03, regionsIncluded: ['World (WORLD)'], countriesExcluded: ['Germany (DE)']},
                    ],
                    markets: [
                        mkt('25', {countriesIncluded: ['Canada (CA)'], agent: 'Alpha Agency', supplier: 'Gamma Distribution', priceType: 'RRP excluding tax (01)', taxType: 'GST (Sales tax) (02)', taxRate: 'Zero-rated (Z)', discount: '10'}),
                        mkt('30', {countriesIncluded: ['United States (US)']}),
                    ]},
                {name: 'Ebook',
                    salesRights: [
                        {type: T01, countriesIncluded: ['Canada (CA)'], regionsIncluded: ['England (GB-ENG)'], regionsExcluded: ['Quebec (CA-QC)'], countriesExcluded: ['Germany (DE)']},
                        {type: T02, countriesIncluded: ['United States (US)'], regionsIncluded: ['World (WORLD)'], regionsExcluded: ['California (US-CA)'], countriesExcluded: ['France (FR)']},
                        {type: T03, regionsIncluded: ['Alberta (CA-AB)'], countriesExcluded: ['Italy (IT)'], regionsExcluded: ['Scotland (GB-SCT)']},
                    ],
                    markets: [
                        mkt('15', {regionsIncluded: ['World (WORLD)'], countriesExcluded: ['Germany (DE)'], regionsExcluded: ['Scotland (GB-SCT)'], agent: 'Alpha Agency', supplier: 'Sigma Supply', currency: 'US Dollar (USD)', priceType: 'RRP including tax (02)', taxType: 'GST (Sales tax) (02)', taxRate: 'Zero-rated (Z)'}),
                        mkt('12', {countriesIncluded: ['United Kingdom (GB)'], agent: 'Beta Agency', supplier: 'Gamma Distribution'}),
                    ]},
                {name: 'Hardback'},
            ]});
        S.B = await sub('y', 'K6 B-book', {
            audience: {audience: 'General / adult (01)', rangeQualifier: 'US school grade range (11)', rangeExact: 'Tenth Grade (10)', rangeFrom: 'Ninth Grade (9)'},
            publicationFormats: [{name: 'Paperback', markets: [mkt('20', {countriesIncluded: ['Canada (CA)']})]}]});
        S.C = await sub('z', 'K6 C-book', {
            audience: {rangeFrom: 'Ninth Grade (9)'},
            publicationFormats: [{name: 'Paperback', markets: [mkt('21', {countriesIncluded: ['Canada (CA)']})]}]});
        S.D = await sub('w', 'K6 D-book', {
            audience: {audience: 'Teenage (03)', rangeQualifier: 'US school grade range (11)', rangeTo: 'Tenth Grade (10)'},
            publicationFormats: [{name: 'Paperback'}]});
        S.E = await sub('v', 'K6 E-book', {publicationFormats: [{name: 'Paperback', markets: [mkt('ten', {countriesIncluded: ['Canada (CA)']})]}]});
        save();
        log('[seed]', JSON.stringify(S).slice(0, 3000));
        note(`ccK6 (${RUN}): scratch presses P1 ${S.P1.path} (ONIX details; books A ${S.A.id} (audience, 5 reps, Paperback/Ebook/Hardback with lists), B ${S.B.id} (General/adult, exact), C ${S.C.id} (no audience, from only), D ${S.D.id} (Teenage, to only), E ${S.E.id} (price "ten")), P2 ${S.P2.path} (import target); managers <path>mg`);
    }
    if (!S.P1) { log('no state; run the seed phase'); await close(); return; }

    // ------------------------------------------------------------ helpers
    const fmtUrl = (P, id, pub) => cu(P.path, `/dashboard/editorial?workflowSubmissionId=${id}&workflowMenuKey=publication_${pub}_publicationFormats`);
    const wf = () => page.locator(VIS).first();
    async function openFormats(P, id, pub) {
        await page.goto(fmtUrl(P, id, pub)); await idle(page);
        await wf().locator('a').filter({hasText: 'Add publication format'}).first().waitFor({timeout: T});
        await wf().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
    }
    const fmtRow = (n) => wf().locator('tr.gridRow').filter({has: page.locator('span.label', {hasText: new RegExp(`^\\s*${n}`)})}).first();
    async function openEdit(n) {
        const r = fmtRow(n);
        await r.waitFor({timeout: T});
        const id = await r.getAttribute('id');
        const ctl = page.locator(`[id="${id}-control-row"]`);
        const edit = ctl.getByRole('link', {name: 'Edit', exact: true}).first();
        if (!(await edit.isVisible().catch(() => false))) { await r.locator('a.show_extras').first().click(); await edit.waitFor({state: 'visible', timeout: 10_000}); }
        const n0 = await dialogCount();
        await edit.click();
        await waitTop('[role=tab]', n0 + 1);
        await waitTop('form', n0 + 1);
        await idle(page); await sleep(300);
    }
    const metaForm = () => top().locator('form[id^="publicationMetadataEntryForm-"]');
    async function metaTab() {
        await top().locator('[role=tab]').filter({hasText: /^\s*Metadata\s*$/}).first().click();
        const f = metaForm();
        await f.waitFor({state: 'visible', timeout: T});
        for (const g of ['identificationCodeGridContainer', SR, MK, 'publicationDateGridContainer']) {
            await f.locator(`[id^="${g}"] table`).first().waitFor({timeout: T}).catch(() => {});
        }
        await idle(page); await sleep(300);
        return f;
    }
    async function openMeta(P, id, pub, fmt) { await openFormats(P, id, pub); await openEdit(fmt); return metaTab(); }
    const grid = (g) => metaForm().locator(`div[id^="${g}"]`).first();
    const readGrid = (g) => grid(g).evaluate((el) => {
        const vis = (e) => !!(e && e.getClientRects().length);
        return {
            columns: [...el.querySelectorAll('thead th')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()),
            rows: [...el.querySelectorAll('tbody tr.gridRow')].filter(vis).map((tr) => ({
                id: tr.id,
                cells: [...tr.querySelectorAll(':scope > td')].map((td) => { const c = td.cloneNode(true); c.querySelectorAll('script').forEach((n) => n.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); }),
                rowTick: [...tr.querySelectorAll(':scope > td')].map((td) => !!td.querySelector('.checked')),
            })),
            empty: [...el.querySelectorAll('tbody.empty')].filter(vis).map((e) => e.innerText.replace(/\s+/g, ' ').trim()),
        };
    });
    const readFormFields = (formSel) => top().evaluate((d, formSel) => {
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const form = d.querySelector(formSel);
        return [...form.querySelectorAll('select, input:not([type=hidden]), textarea')].map((e) => {
            const lab = e.id ? d.querySelector(`label[for="${e.id}"]`) : null;
            const o = {name: e.name, label: t(lab)};
            if (e.tagName === 'SELECT') o.selected = [...e.selectedOptions].map((x) => `${x.value}|${x.text.trim()}`);
            else if (e.type === 'checkbox' || e.type === 'radio') o.checked = e.checked;
            else o.value = e.value;
            return o;
        });
    }, formSel);
    async function rowAction(g, rowText, action) {
        const row = grid(g).locator('tr.gridRow').filter({hasText: rowText}).first();
        const id = await row.getAttribute('id');
        const ctl = page.locator(`[id="${id}-control-row"]`);
        const a = ctl.getByRole('link', {name: action, exact: true}).first();
        if (!(await a.isVisible().catch(() => false))) { await row.locator('a.show_extras').first().click(); await a.waitFor({state: 'visible', timeout: 10_000}); }
        await a.click();
    }
    async function rowIndexEdit(g, i, formSel) {
        const rows = grid(g).locator('tr.gridRow');
        const row = rows.nth(i);
        const id = await row.getAttribute('id');
        const ctl = page.locator(`[id="${id}-control-row"]`);
        const a = ctl.getByRole('link', {name: 'Edit', exact: true}).first();
        if (!(await a.isVisible().catch(() => false))) { await row.locator('a.show_extras').first().click(); await a.waitFor({state: 'visible', timeout: 10_000}); }
        const n0 = await dialogCount();
        await a.click();
        await waitTop(formSel, n0 + 1); await idle(page); await sleep(400);
    }
    async function subCancel(formSel) {
        const n0 = await dialogCount();
        await top().locator(formSel).getByRole('link', {name: 'Cancel', exact: true}).first().click();
        await waitCount(n0 - 1); await sleep(700);
    }
    async function closeFormatWindow() {
        const n0 = await dialogCount();
        await top().getByRole('button', {name: 'Close', exact: true}).first().click();
        const closed = await waitCount(n0 - 1);
        await sleep(700);
        return closed;
    }
    /** The format's two lists, and each sales-rights entry's and market's Edit window read (Cancel). */
    async function readFormatLists(P, id, pub, fmt, name, {edits = true} = {}) {
        await openMeta(P, id, pub, fmt);
        const o = {salesRights: await readGrid(SR), markets: await readGrid(MK)};
        await snap(name);
        if (edits) {
            o.srEdits = [];
            for (let i = 0; i < o.salesRights.rows.length; i++) {
                await rowIndexEdit(SR, i, SRFORM);
                o.srEdits.push((await readFormFields(SRFORM)).filter((f) => f.checked || (f.selected && f.selected.length)));
                if (i === 0) await snap(`${name}-sr-first-edit`);
                await subCancel(SRFORM);
            }
            o.mkEdits = [];
            for (let i = 0; i < o.markets.rows.length; i++) {
                await rowIndexEdit(MK, i, MKFORM);
                o.mkEdits.push((await readFormFields(MKFORM)).filter((f) => (f.value !== undefined && f.value !== '') || (f.selected && f.selected.length && f.selected.join() !== '|')));
                if (i === 0) await snap(`${name}-mk-first-edit`);
                await subCancel(MKFORM);
            }
            o.metaTab = (await readFormFields('form[id^="publicationMetadataEntryForm-"]')).filter((f) => /productAvailability|returnable|productComposition/.test(f.name));
        }
        await closeFormatWindow();
        return o;
    }
    const audUrl = (P, id) => cu(P.path, `/dashboard/editorial?workflowSubmissionId=${id}&workflowMenuKey=marketing_audience`);
    const repUrl = (P, id) => cu(P.path, `/dashboard/editorial?workflowSubmissionId=${id}&workflowMenuKey=marketing_representatives`);
    async function readAudience(P, id, name) {
        await page.goto(audUrl(P, id)); await idle(page);
        const box = page.locator('[data-cy="workflow-primary-items"]');
        await box.locator('select').first().waitFor({timeout: T});
        await idle(page); await sleep(300);
        await snap(name);
        return box.evaluate((root) => [...root.querySelectorAll('select')].map((s) => {
            const lab = s.id ? root.querySelector(`label[for="${s.id}"]`) : null;
            return {label: lab ? lab.innerText.replace(/\s+/g, ' ').trim() : s.name, selected: s.selectedIndex >= 0 ? s.options[s.selectedIndex].text.trim() : null};
        }));
    }
    const repGrid = () => page.locator('div[id^="component-grid-catalogentry-representativesgrid"]').first();
    const repForm = () => page.locator('form#representativeForm:visible');
    async function readReps(P, id, name, {edits = false} = {}) {
        await page.goto(repUrl(P, id)); await idle(page);
        await repGrid().locator('table').first().waitFor({timeout: T});
        await idle(page); await sleep(300);
        await snap(name);
        const rows = await repGrid().evaluate((g) => {
            const vis = (e) => !!(e.getClientRects().length);
            const out = [];
            let group = null;
            for (const tb of g.querySelectorAll('table tbody')) {
                if (!vis(tb)) continue;
                for (const tr of tb.querySelectorAll('tr')) {
                    if (!vis(tr) || /control-row/.test(tr.id)) continue;
                    const c = tr.cloneNode(true); c.querySelectorAll('script, .pkp_screen_reader').forEach((n) => n.remove());
                    const cells = [...c.querySelectorAll(':scope > td, :scope > th')].map((x) => x.innerText.replace(/\s+/g, ' ').trim());
                    if (/empty/.test(tb.className)) { out.push({group, empty: cells.join(' ')}); continue; }
                    if (cells.length >= 2 && cells[1] === '' && /^(Agents|Suppliers)$/.test(cells[0])) { group = cells[0]; continue; }
                    out.push({group, id: tr.id, name: cells[0], role: cells[1]});
                }
            }
            return out;
        });
        if (edits) {
            for (const r of rows.filter((x) => x.id)) {
                const row = page.locator(`[id="${r.id}"]`);
                const ctl = page.locator(`[id="${r.id}-control-row"]`);
                const a = ctl.getByRole('link', {name: 'Edit', exact: true}).first();
                if (!(await a.isVisible().catch(() => false))) { await row.locator('a.show_extras').first().click(); await a.waitFor({state: 'visible', timeout: 10_000}); }
                await a.click();
                await repForm().locator('input[name="name"]').waitFor({timeout: T}); await idle(page); await sleep(300);
                r.fields = await repForm().evaluate((f) => Object.fromEntries([...f.querySelectorAll('input, select')].filter((e) => e.type !== 'hidden' && e.type !== 'radio').map((e) => [e.name, e.tagName === 'SELECT' ? (e.selectedIndex >= 0 ? e.options[e.selectedIndex].text.trim() : null) : e.value])));
                r.fields.isSupplier = await repForm().locator('input[name="isSupplier"]:checked').getAttribute('value').catch(() => null);
                await repForm().getByRole('link', {name: 'Cancel', exact: true}).first().click();
                await repForm().waitFor({state: 'hidden', timeout: T}).catch(() => {});
                await sleep(700);
            }
        }
        return rows;
    }

    // ============================================================ pages: what the screens hold before the export
    if (on('pages') && !S.pagesDone) {
        const o = await safe('pages', async () => {
            const o = {};
            await as(S.P1.mg, S.P1.path);
            for (const k of ['A', 'B', 'C', 'D']) o[`audience${k}`] = await readAudience(S.P1, S[k].id, `p-01-audience-${k}`);
            o.repsA = await readReps(S.P1, S.A.id, 'p-02-representatives-A', {edits: true});
            // A10: the window's fields for an agent and for a supplier (read, then Cancel)
            await page.locator('a').filter({hasText: /^\s*Add Representative\s*$/}).first().click();
            await repForm().locator('input[name="name"]').waitFor({timeout: T}); await idle(page); await sleep(300);
            const readW = () => repForm().evaluate((f) => [...f.querySelectorAll('input, select')].filter((e) => e.type !== 'hidden' && e.getClientRects().length).map((e) => {
                const l = e.id ? f.querySelector(`label[for="${e.id}"]`) : null;
                const sec = e.closest('.section, fieldset');
                return {name: e.name, type: e.type, label: l ? l.innerText.replace(/\s+/g, ' ').trim() : null, section: sec ? (sec.querySelector('label.label, legend, .label') || {}).innerText : null};
            }));
            await repForm().locator('input[name="isSupplier"][value="0"]').check(); await sleep(300);
            o.windowAgent = await readW();
            await snap('p-03-rep-window-agent');
            await repForm().locator('input[name="isSupplier"][value="1"]').check(); await sleep(300);
            o.windowSupplier = await readW();
            await snap('p-04-rep-window-supplier');
            await repForm().getByRole('link', {name: 'Cancel', exact: true}).first().click(); await sleep(700);
            o.paperbackA = await readFormatLists(S.P1, S.A.id, S.A.pub, 'Paperback', 'p-05-A-paperback', {edits: false});
            o.ebookA = await readFormatLists(S.P1, S.A.id, S.A.pub, 'Ebook', 'p-06-A-ebook', {edits: false});
            o.hardbackA = await readFormatLists(S.P1, S.A.id, S.A.pub, 'Hardback', 'p-07-A-hardback', {edits: false});
            await loc(page, 'Audience page: the five lists', page.locator('[data-cy="workflow-primary-items"] select'));
            S.pagesDone = true; save();
            return o;
        });
        fact('pages', o);
    }

    // ============================================================ hand: Ebook's Metadata tab by hand; a second "Alpha Agency"; M4 renamed to it
    if (on('hand') && !S.handDone) {
        const o = await safe('hand', async () => {
            const o = {};
            await as(S.P1.mg, S.P1.path);
            // Ebook's Metadata tab: composition, "In stock (21)", "No, not returnable (N)" where offered
            const f = await openMeta(S.P1, S.A.id, S.A.pub, 'Ebook');
            o.metaFieldsBefore = (await readFormFields('form[id^="publicationMetadataEntryForm-"]')).filter((x) => /productAvailability|returnable|productComposition/.test(x.name));
            await f.locator('select[name="productCompositionCode"]').selectOption({value: '00'});
            await f.locator('select[name="productAvailabilityCode"]').selectOption({value: '21'});
            o.returnableOffered = await f.locator('select[name="returnableIndicatorCode"]').count();
            if (o.returnableOffered) await f.locator('select[name="returnableIndicatorCode"]').selectOption({value: 'N'}).catch((e) => { o.returnableErr = String(e.message).slice(0, 200); });
            const t0 = Date.now();
            await f.getByRole('button', {name: 'Save', exact: true}).first().click();
            await idle(page); await sleep(1500);
            o.metaSave = {notices: noticesSince(t0), posts: since(t0).filter((p) => p.method !== 'GET').map((p) => ({status: p.status, url: p.url, body: p.body.slice(0, 120)}))};
            await snap('h-01-ebook-metadata-saved');
            await closeFormatWindow();
            const f2 = await openMeta(S.P1, S.A.id, S.A.pub, 'Ebook');
            o.metaFieldsAfterReopen = (await readFormFields('form[id^="publicationMetadataEntryForm-"]')).filter((x) => /productAvailability|returnable|productComposition/.test(x.name));
            await closeFormatWindow();
            // a second "Alpha Agency" with another website
            await page.goto(repUrl(S.P1, S.A.id)); await idle(page);
            await repGrid().locator('table').first().waitFor({timeout: T});
            await page.locator('a').filter({hasText: /^\s*Add Representative\s*$/}).first().click();
            await repForm().locator('input[name="name"]').waitFor({timeout: T}); await idle(page); await sleep(300);
            await repForm().locator('input[name="isSupplier"][value="0"]').check();
            await repForm().locator('select[name="agentRole"]').selectOption({label: 'Exclusive sales agent (05)'});
            await repForm().locator('input[name="name"]').fill('Alpha Agency');
            await repForm().locator('input[name="url"]').fill('https://alpha-two.example.test');
            const t1 = Date.now();
            await repForm().getByRole('button', {name: 'OK', exact: true}).first().click();
            await repForm().waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await idle(page); await sleep(800);
            o.secondAlpha = {notices: noticesSince(t1), posts: since(t1).filter((p) => p.method !== 'GET').map((p) => ({status: p.status, url: p.url}))};
            o.repsAfter = await readReps(S.P1, S.A.id, 'h-02-reps-with-second-alpha');
            // M4 (Ebook, "12CAD"): agent → the second "Alpha Agency"
            await openMeta(S.P1, S.A.id, S.A.pub, 'Ebook');
            const mrows = (await readGrid(MK)).rows;
            const i4 = mrows.findIndex((r) => r.cells.some((c) => /^12/.test(c)));
            await rowIndexEdit(MK, i4, MKFORM);
            const agentSel = top().locator(`${MKFORM} select[name="agentId"]`);
            o.agentOptions = await agentSel.evaluate((s) => [...s.options].map((x) => `${x.value}|${x.text.trim()}`));
            const alphas = o.agentOptions.filter((x) => /\|Alpha Agency$/.test(x)).map((x) => x.split('|')[0]);
            const firstAlpha = (S.A.reps || []).find((r) => r.name === 'Alpha Agency');
            const second = alphas.find((v) => !firstAlpha || String(firstAlpha.id) !== v) || alphas[alphas.length - 1];
            await agentSel.selectOption(second);
            o.taxTypeBefore = await top().locator(`${MKFORM} select[name="taxTypeCode"]`).evaluate((s) => s.value).catch(() => null);
            await top().locator(`${MKFORM} select[name="taxTypeCode"]`).selectOption('').catch(() => {});
            const t2 = Date.now();
            const n0 = await dialogCount();
            await top().locator(MKFORM).getByRole('button', {name: 'OK', exact: true}).first().click();
            o.m4Closed = await waitCount(n0 - 1); await idle(page); await sleep(800);
            o.m4Save = {notices: noticesSince(t2), posts: since(t2).filter((p) => p.method !== 'GET').map((p) => ({status: p.status, url: p.url}))};
            o.marketsAfter = await readGrid(MK);
            await snap('h-03-ebook-markets-after-m4');
            await closeFormatWindow();
            o.db = sql(`select m.market_id, m.price, m.agent_id, m.supplier_id, m.tax_type_code, m.tax_rate_code from markets m join publication_formats pf on pf.publication_format_id=m.publication_format_id where pf.publication_id=${S.A.pub} order by m.market_id`);
            o.dbReps = sql(`select representative_id, name, url, is_supplier from representatives where submission_id=${S.A.id} order by representative_id`);
            S.handDone = true; save();
            return o;
        });
        fact('hand', o);
    }

    // ============================================================ export: books A–D in one Native XML file (P1)
    if (on('export')) {
        const o = await safe('export', async () => {
            await as(S.P1.mg, S.P1.path);
            const x = await nativeExport(S.P1.path, ['K6 A-book', 'K6 B-book', 'K6 C-book', 'K6 D-book'], 'x-01-native-export-books-a-d');
            if (x.file) { S.exportFile = x.file; save(); }
            // the idents that must never appear
            if (x.file) {
                const xml = fs.readFileSync(x.file, 'utf8');
                x.leaks = Object.fromEntries(['K6AGTID4711', 'K6OMEGAID99', 'K6SUPID0815', '+1 604 555 0101', 'alpha.k6@agency.test', 'Omega Agency', '+1 604 555 0909', 'omega.k6@agency.test', '+1 604 555 0202', 'gamma.k6@dist.test', 'Beta Agency', 'Sigma Supply', 'alpha-two.example.test', 'RepresentativeID', 'AgentIdentifier', 'SupplierIdentifier', 'K6 Contact a', S.P1.contact].map((s) => [s, (xml.split(s).length - 1)]));
            }
            return x;
        });
        fact('export', o);
    }

    // ============================================================ ten: book E alone (price "ten")
    if (on('ten')) {
        const o = await safe('ten', async () => {
            await as(S.P1.mg, S.P1.path);
            return nativeExport(S.P1.path, ['K6 E-book'], 'x-02-native-export-book-e-ten');
        });
        fact('ten', o);
    }

    // ============================================================ import: the A–D file into P2
    if (on('import') && S.exportFile && !S.imported) {
        const o = await safe('import', async () => {
            const o = {};
            await as(S.P2.mg, S.P2.path);
            await page.goto(cu(S.P2.path, '/management/importexport/plugin/NativeImportExportPlugin')); await idle(page);
            await page.getByRole('tab', {name: 'Import', exact: true}).first().click(); await sleep(400);
            const up = page.waitForResponse((r) => r.url().includes('uploadImportXML'), {timeout: 30_000}).catch(() => null);
            await page.locator('#importXmlForm input[type=file]').first().setInputFiles(S.exportFile);
            const ur = await up;
            o.upload = ur ? ur.status() : 'no request';
            await page.waitForFunction(() => (document.querySelector('#importXmlForm input[name=temporaryFileId]') || {}).value, null, {timeout: 20_000}).catch(() => {});
            await idle(page);
            const tabsBefore = await page.locator('#importExportTabs [role=tab]').count();
            const t0 = Date.now();
            await page.locator('#importXmlForm').getByRole('button', {name: 'Import', exact: true}).click();
            for (let i = 0; i < 120; i++) {
                await sleep(500);
                if ((await page.locator('#importExportTabs [role=tab]').count()) > tabsBefore) {
                    const txt = await page.locator('#importExportTabs [role="tabpanel"]:visible').first().innerText().catch(() => '');
                    if (/completed|failed|error|warning|imported/i.test(txt)) break;
                }
            }
            await idle(page); await sleep(800);
            await snap('i-01-import-result');
            o.result = flat(await page.locator('#importExportTabs [role="tabpanel"]:visible').first().innerText().catch(() => null), 3000);
            o.errorAnswers = since(t0).filter((p) => p.status >= 400);
            const rows = sql(`select s.submission_id||'|'||s.current_publication_id||'|'||coalesce(ps.setting_value,'') from submissions s left join publication_settings ps on ps.publication_id=s.current_publication_id and ps.setting_name='title' where s.context_id=${S.P2.id} order by s.submission_id`);
            o.rows = rows;
            S.imp = {};
            for (const line of rows.split('\n').filter(Boolean)) {
                const [id, pub, title] = line.split('|');
                const k = (title.match(/K6 ([A-D])-book/) || [])[1];
                if (k) S.imp[k] = {id: Number(id), pub: Number(pub)};
            }
            S.imported = true; save();
            return o;
        });
        fact('import', o);
    }

    // ============================================================ imported: the books as imported on P2 (screens)
    if (on('imported') && S.imp && S.imp.A) {
        const o = await safe('imported', async () => {
            const o = {};
            await as(S.P2.mg, S.P2.path);
            for (const k of ['A', 'B', 'C', 'D']) if (S.imp[k]) o[`audience${k}`] = await readAudience(S.P2, S.imp[k].id, `m-01-imported-audience-${k}`);
            o.repsA = await readReps(S.P2, S.imp.A.id, 'm-02-imported-reps-A', {edits: true});
            o.repsB = await readReps(S.P2, S.imp.B.id, 'm-03-imported-reps-B', {edits: true});
            o.paperbackA = await readFormatLists(S.P2, S.imp.A.id, S.imp.A.pub, 'Paperback', 'm-04-imported-A-paperback');
            o.ebookA = await readFormatLists(S.P2, S.imp.A.id, S.imp.A.pub, 'Ebook', 'm-05-imported-A-ebook');
            o.paperbackB = await readFormatLists(S.P2, S.imp.B.id, S.imp.B.pub, 'Paperback', 'm-06-imported-B-paperback');
            // the source side's same windows, for the comparison (P1)
            await as(S.P1.mg, S.P1.path);
            o.srcPaperbackA = await readFormatLists(S.P1, S.A.id, S.A.pub, 'Paperback', 'm-07-source-A-paperback');
            o.srcEbookA = await readFormatLists(S.P1, S.A.id, S.A.pub, 'Ebook', 'm-08-source-A-ebook');
            o.srcRepsA = await readReps(S.P1, S.A.id, 'm-09-source-reps-A', {edits: true});
            o.dbImpReps = sql(`select representative_id, name, role, url, phone, email, is_supplier, representative_id_type, representative_id_value from representatives where submission_id=${S.imp.A.id} order by representative_id`);
            return o;
        });
        fact('imported', o);
    }

    // ============================================================ reexport: the imported books' file (P2)
    if (on('reexport') && S.imp && S.imp.A) {
        const o = await safe('reexport', async () => {
            await as(S.P2.mg, S.P2.path);
            return nativeExport(S.P2.path, ['K6 A-book', 'K6 B-book', 'K6 C-book', 'K6 D-book'], 'r-01-native-export-imported');
        });
        fact('reexport', o);
    }

    // ============================================================ leave: the import tab with a file uploaded, left unsent
    if (on('leave') && S.exportFile) {
        const o = await safe('leave', async () => {
            const o = {};
            await as(S.P2.mg, S.P2.path);
            await page.goto(cu(S.P2.path, '/management/importexport/plugin/NativeImportExportPlugin')); await idle(page);
            await page.getByRole('tab', {name: 'Import', exact: true}).first().click(); await sleep(400);
            await snap('l-01-import-tab');
            o.importTab = flat(await page.locator('#importExportTabs [role="tabpanel"]:visible').first().innerText().catch(() => null), 800);
            await page.locator('#importXmlForm input[type=file]').first().setInputFiles(S.exportFile);
            await page.waitForFunction(() => (document.querySelector('#importXmlForm input[name=temporaryFileId]') || {}).value, null, {timeout: 20_000}).catch(() => {});
            await idle(page);
            await snap('l-02-import-tab-file-chosen');
            // to the Export tab, then away
            let t0 = Date.now();
            await page.getByRole('tab', {name: 'Export', exact: true}).first().click(); await sleep(800);
            o.toExportTab = dlgSince(t0);
            await page.getByRole('tab', {name: 'Import', exact: true}).first().click(); await sleep(800);
            o.backOnImport = flat(await page.locator('#importExportTabs [role="tabpanel"]:visible').first().innerText().catch(() => null), 600);
            await snap('l-03-import-tab-back');
            t0 = Date.now();
            await page.goto(cu(S.P2.path, '/management/tools')); await idle(page);
            o.leaveDialogs = dlgSince(t0);
            o.landed = page.url().replace(/^.*\/index\.php/, '');
            const n = sql(`select count(*) from submissions where context_id=${S.P2.id}`);
            o.submissionsOnP2 = n;
            return o;
        });
        fact('leave', o);
    }

    // ============================================================ extra: the other ends — empty territories, an agent with no website,
    // a supplier with no website, a tax rate alone, a rate other than "Zero-rated", a never-saved Metadata tab
    if (on('extra')) {
        const o = await safe('extra', async () => {
            const o = {};
            if (!S.F) {
                const sub = async (k, title, extra) => {
                    const r = await app.api.createSubmission({tag: `${S.t}${k}`, context: S.P1.path, submitter: S.P1.au, title: `${title} ${S.t}`, ...BASE, ...extra});
                    return {id: r.submissionId, pub: r.publicationId, title: `${title} ${S.t}`};
                };
                S.F = await sub('f', 'K6 F-book', {publicationFormats: [{name: 'Paperback', salesRights: [{type: T01}]}]});
                S.G = await sub('g', 'K6 G-book', {publicationFormats: [{name: 'Paperback', markets: [mkt('22')]}]});
                S.H = await sub('h', 'K6 H-book', {representatives: [REP.beta, {type: 'supplier', role: 'Distributor to end-customers (12)', name: 'Kappa Books', phone: '+1 604 555 0303', email: 'kappa.k6@books.test'}],
                    publicationFormats: [{name: 'Paperback', markets: [mkt('23', {countriesIncluded: ['Canada (CA)'], agent: 'Beta Agency', supplier: 'Kappa Books', taxRate: 'Zero-rated (Z)'})]}]});
                S.I = await sub('i', 'K6 I-book', {publicationFormats: [{name: 'Paperback', markets: [mkt('24', {countriesIncluded: ['Canada (CA)'], priceType: 'RRP excluding tax (01)', taxType: 'VAT (Value-added tax) (01)', taxRate: 'Standard rate (S)'})]}]});
                save();
                note(`ccK6 (${RUN}): on ${S.P1.path} also books F ${S.F.id} (sales-rights entry with nothing chosen), G ${S.G.id} (market with no territory), H ${S.H.id} (agent with no website, supplier without website, rate Z alone), I ${S.I.id} (VAT + Standard rate)`);
            }
            await as(S.P1.mg, S.P1.path);
            o.metaTabNeverSavedB = await (async () => {
                await openMeta(S.P1, S.B.id, S.B.pub, 'Paperback');
                const f = (await readFormFields('form[id^="publicationMetadataEntryForm-"]')).filter((x) => /productAvailability|returnable|productComposition/.test(x.name));
                await snap('e-00-b-paperback-metadata-never-saved');
                await closeFormatWindow();
                return f;
            })();
            for (const [k, n] of [['F', 'e-01-export-f-empty-sales-rights'], ['G', 'e-02-export-g-market-no-territory'], ['H', 'e-03-export-h-no-websites-rate-only'], ['I', 'e-04-export-i-standard-rate']]) {
                const x = await nativeExport(S.P1.path, [`K6 ${k}-book`], n);
                o[k] = {results: x.results, file: x.file, ticked: x.ticked, formats: x.parsed && x.parsed.formats && x.parsed.formats.map((f) => ({format: f.format, salesRights: f.salesRights, productSupply: f.productSupply}))};
            }
            return o;
        });
        fact('extra', o);
    }

    // ============================================================ dup: Rule 25's matching for suppliers — two "Delta Supply" alike but for the phone
    if (on('dup')) {
        const o = await safe('dup', async () => {
            const o = {};
            if (!S.P3) {
                const k = 'c';
                const users = [{username: `${S.t}${k}mg`, roles: ['manager'], givenName: 'Mona', familyName: `K6${k}`}, {username: `${S.t}${k}au`, roles: ['author'], givenName: 'Abe', familyName: `K6${k}`}];
                const r = await app.api.createContext({tag: `${S.t}${k}`, context: {name: `U74 K6 ${k} ${S.t}`, acronym: 'K6P', country: 'CA', contactName: 'K6 Contact c', contactEmail: `${S.t}${k}c@mail.test`}, users,
                    publisher: 'K6 Third Press', location: 'Victoria, Canada', codeType: 'Proprietary (01)', codeValue: 'K6-0003'});
                S.P3 = {path: r.path, id: r.contextId, mg: `${S.t}${k}mg`, au: `${S.t}${k}au`};
                const DELTA = {type: 'supplier', role: 'Distributor to end-customers (12)', name: 'Delta Supply', phone: '+1 604 555 0404', email: 'delta.k6@supply.test', website: 'https://delta.example.test'};
                const b = await app.api.createSubmission({tag: `${S.t}j`, context: S.P3.path, submitter: S.P3.au, title: `K6 J-book ${S.t}`, ...BASE, representatives: [DELTA],
                    publicationFormats: [{name: 'Paperback', markets: [mkt('26', {countriesIncluded: ['Canada (CA)'], supplier: 'Delta Supply'}), mkt('27', {countriesIncluded: ['United States (US)'], supplier: 'Delta Supply'})]}]});
                S.J = {id: b.submissionId, pub: b.publicationId};
                save();
                note(`ccK6 (${RUN}): press P3 ${S.P3.path} (ONIX details) with book J ${S.J.id}: supplier "Delta Supply" named by two markets; a second "Delta Supply" (same role, website, email; phone +1 604 555 0505) added on screen`);
            }
            await as(S.P3.mg, S.P3.path);
            if (!S.dupHand) {
                await page.goto(repUrl(S.P3, S.J.id)); await idle(page);
                await repGrid().locator('table').first().waitFor({timeout: T});
                await page.locator('a').filter({hasText: /^\s*Add Representative\s*$/}).first().click();
                await repForm().locator('input[name="name"]').waitFor({timeout: T}); await idle(page); await sleep(300);
                await repForm().locator('input[name="isSupplier"][value="0"]').check(); await sleep(200);
                await repForm().locator('input[name="isSupplier"][value="1"]').check(); await sleep(200);
                await repForm().locator('select[name="supplierRole"]').selectOption({label: 'Distributor to end-customers (12)'});
                await repForm().locator('input[name="name"]').fill('Delta Supply');
                await repForm().locator('input[name="phone"]').fill('+1 604 555 0505');
                await repForm().locator('input[name="email"]').fill('delta.k6@supply.test');
                await repForm().locator('input[name="url"]').fill('https://delta.example.test');
                const t1 = Date.now();
                await repForm().getByRole('button', {name: 'OK', exact: true}).first().click();
                await repForm().waitFor({state: 'hidden', timeout: T}).catch(() => {});
                await idle(page); await sleep(800);
                o.secondDelta = {notices: noticesSince(t1), posts: since(t1).filter((p) => p.method !== 'GET').map((p) => ({status: p.status, url: p.url}))};
                o.repsSource = await readReps(S.P3, S.J.id, 'd-01-source-reps-J');
                await openMeta(S.P3, S.J.id, S.J.pub, 'Paperback');
                const rows = (await readGrid(MK)).rows;
                const i = rows.findIndex((r) => r.cells.some((c) => /^27/.test(c)));
                await rowIndexEdit(MK, i, MKFORM);
                const sel = top().locator(`${MKFORM} select[name="supplierId"]`);
                const opts = await sel.evaluate((s) => [...s.options].map((x) => `${x.value}|${x.text.trim()}`));
                const deltas = opts.filter((x) => /\|Delta Supply$/.test(x)).map((x) => Number(x.split('|')[0])).sort((a, b) => a - b);
                o.supplierOptions = opts;
                await sel.selectOption(String(deltas[deltas.length - 1]));
                await top().locator(`${MKFORM} select[name="taxTypeCode"]`).selectOption('').catch(() => {});
                const n0 = await dialogCount();
                await top().locator(MKFORM).getByRole('button', {name: 'OK', exact: true}).first().click();
                o.mbClosed = await waitCount(n0 - 1); await idle(page); await sleep(800);
                o.marketsSource = await readGrid(MK);
                await snap('d-02-source-markets-J');
                await closeFormatWindow();
                o.dbSource = sql(`select m.price, m.supplier_id, r.phone from markets m join representatives r on r.representative_id=m.supplier_id join publication_formats pf on pf.publication_format_id=m.publication_format_id where pf.publication_id=${S.J.pub} order by m.market_id`);
                S.dupHand = true; save();
            }
            const x = await nativeExport(S.P3.path, ['K6 J-book'], 'd-03-export-J');
            o.export = {results: x.results, file: x.file, productSupply: x.parsed && x.parsed.formats && x.parsed.formats.map((f) => f.productSupply)};
            if (x.file && !S.dupImported) {
                await as(S.P2.mg, S.P2.path);
                await page.goto(cu(S.P2.path, '/management/importexport/plugin/NativeImportExportPlugin')); await idle(page);
                await page.getByRole('tab', {name: 'Import', exact: true}).first().click(); await sleep(400);
                await page.locator('#importXmlForm input[type=file]').first().setInputFiles(x.file);
                await page.waitForFunction(() => (document.querySelector('#importXmlForm input[name=temporaryFileId]') || {}).value, null, {timeout: 20_000}).catch(() => {});
                await idle(page);
                const tabsBefore = await page.locator('#importExportTabs [role=tab]').count();
                await page.locator('#importXmlForm').getByRole('button', {name: 'Import', exact: true}).click();
                for (let i = 0; i < 120; i++) {
                    await sleep(500);
                    if ((await page.locator('#importExportTabs [role=tab]').count()) > tabsBefore) {
                        const txt = await page.locator('#importExportTabs [role="tabpanel"]:visible').first().innerText().catch(() => '');
                        if (/completed|failed|error|warning|imported/i.test(txt)) break;
                    }
                }
                await idle(page); await sleep(800);
                await snap('d-04-import-J');
                o.importResult = flat(await page.locator('#importExportTabs [role="tabpanel"]:visible').first().innerText().catch(() => null), 800);
                const line = sql(`select s.submission_id||'|'||s.current_publication_id from submissions s join publication_settings ps on ps.publication_id=s.current_publication_id and ps.setting_name='title' where s.context_id=${S.P2.id} and ps.setting_value like 'K6 J-book%' order by s.submission_id desc limit 1`);
                const [id, pub] = line.split('|').map(Number);
                S.impJ = {id, pub}; S.dupImported = true; save();
            }
            if (S.impJ) {
                await as(S.P2.mg, S.P2.path);
                o.repsImported = await readReps(S.P2, S.impJ.id, 'd-05-imported-reps-J', {edits: true});
                o.listsImported = await readFormatLists(S.P2, S.impJ.id, S.impJ.pub, 'Paperback', 'd-06-imported-J-paperback', {edits: false});
            }
            return o;
        });
        fact('dup', o);
    }

    // ============================================================ nocode: "Publisher Code" emptied on P1, book A's export (td22's control)
    if (on('nocode')) {
        const o = await safe('nocode', async () => {
            const o = {};
            await as(S.P1.mg, S.P1.path);
            await page.goto(cu(S.P1.path, '/management/settings/context')); await idle(page);
            await page.getByRole('tab', {name: 'Masthead'}).click();
            const form = page.locator('form').filter({has: page.locator('input[name="publisher"]')});
            await form.locator('input[name="codeValue"]').waitFor({timeout: T});
            o.before = await form.locator('input[name="codeValue"]').inputValue();
            await form.locator('input[name="codeValue"]').fill('');
            const saved = page.waitForResponse((r) => /\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await form.getByRole('button', {name: 'Save', exact: true}).click();
            const s = await saved; o.save = s ? s.status() : 'no request';
            await idle(page); await sleep(800);
            await snap('n-01-masthead-code-emptied');
            o.x = await nativeExport(S.P1.path, ['K6 A-book'], 'n-02-native-export-without-code');
            o.x = {results: o.x.results, file: o.x.file, onixMentions: o.x.onixMentions, formats: o.x.parsed && o.x.parsed.formats && o.x.parsed.formats.map((f) => ({book: f.book, format: f.format, products: f.products}))};
            return o;
        });
        fact('nocode', o);
    }

    await close();
});
