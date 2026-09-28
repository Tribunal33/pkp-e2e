const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U45 claim check, chunk K3: the DOIs page — list, item, editing, search, filters, bulk assign and mark.
// Spec: docs/specs/U45-dois.md lines 115–130 (Fields: the DOIs page), 230–232 (Rule 9), 263–303 (Rules 14–19),
// 312–368 (Rules 21–28), 545–546 (Side effects: nothing logged or mailed), register A3, A7, OMP1.
//
// Per app, scratch contexts (tag prefix u45k3):
//   C  main: DOIs on, prefix 10.1234, kinds OJS publication+representation+issue, OMP publication+file,
//      OPS publication+representation; "Automatic DOI Assignment" left at the first option.
//      Works (submitter au1 / au2): at Submission (OJS/OMP), at Review (OJS/OMP), at Copyediting (OJS/OMP),
//      in Production with a galley (OJS), a draft (OPS), four published (with a galley / a format file),
//      OJS: one scheduled into the unpublished issue; issues Vol. 1 No. 1 (2025) published, Vol. 1 No. 2 (2026) not.
//   D2 (OJS, made by the assign phase) custom pattern "%j.v%vi%i.%a": one work at Copyediting with no issue, one published
//      in an issue whose DOI is cleared on screen first (Assign DOIs: one failure, one DOI).
//   E  prefix 10.5555, custom pattern "k3same<tag>": two published works (made DOIs not checked for uniqueness;
//      the DOI another journal carries, typed in C).
//   X  DOIs on, no prefix: one listed work (warning, no "Assign DOIs").
//   A  (OJS, OPS) Crossref configured: Bulk Actions with "Export DOIs" / "Deposit DOIs", "Deposit All".
//   F  (OMP) "Files" ticked alone: OMP1.
//   P  paging: 31 published works.
// Users per context: mgr (manager), ed (editor, OJS/OMP), au1, au2 (authors); admin reads C.
//
//   PROBE_FEATURE=U45 PROBE_AGENT=ccK3 node bin/probe.js all shared/playwright/checks/U45/K3/k3.js
//   The error phase runs the fleet's queued jobs (a deposit that fails at the dead proxy); on 2026-09-26 the runner stopped
//   at another feature's failing job first, so the Error row was not reached.
//   PHASES=seed,page,list,row,search,edit,assign,mark,filters,bulk,unmark,issues,agency,error,omp1,paging,roles,leave,draft,log
//   (default all; state in k3-state-<app>.json; mutating phases run once per seed: delete the state file for a
//   fresh run). No assertions: the script records, the reader judges.
// Database reads (psql SELECT) are evidence only; nothing is written there.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const ALL = ['seed', 'page', 'list', 'row', 'search', 'edit', 'assign', 'mark', 'filters', 'bulk', 'unmark', 'issues',
    'agency', 'error', 'omp1', 'paging', 'roles', 'leave', 'draft', 'log'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log(...a);
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 600));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 30000;
const stateFile = (app) => path.join(outDir(), `k3-state-${app.name}.json`);

function psql(app, sql) {
    try {
        return execFileSync('psql', [`${dbName(app.name)}`, '-At', '-F', '|', '-c', sql], {encoding: 'utf8'}).trim();
    } catch (e) {
        return `psql error: ${flat(e.message, 200)}`;
    }
}

async function sect(name, fn) {
    try { await fn(); } catch (e) {
        log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 6).join(' | '));
        record(`${name.replace(/[^a-z0-9]+/gi, '-')}-FAILED`, {error: String(e.stack || e).slice(0, 2000)});
    }
}

const TITLES = {
    sub: 'Zebra stripe thermoregulation',
    rev: 'Quokka dental records',
    copy: 'Narwhal tusk acoustics',
    prod: 'Pangolin scale chemistry',
    pub1: 'Axolotl limb memory',
    pub2: 'Okapi forest census',
    pub3: 'Tapir seed dispersal',
    pub4: 'Wombat burrow geometry',
    sched: 'Ibex cliff balance',
    draft: 'Dugong seagrass grazing',
};

forEachApp(async (app) => {
    const sf = stateFile(app);
    const sc = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(sc, null, 2));
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const done = (p) => (sc.done || []).includes(p);
    const markDone = (p) => { sc.done = [...(sc.done || []), p]; save(); };
    const galleyFile = isOPS ? 'preprint.pdf' : 'article.pdf';
    const kindsC = isOJS ? ['publication', 'representation', 'issue'] : isOMP ? ['publication', 'file'] : ['publication', 'representation'];
    const toCopy = ['skipExternalReview'];
    const toReview = isOMP ? ['sendInternalReview'] : ['sendExternalReview'];

    // ---- seed ---------------------------------------------------------------------------------
    if (on('seed') && !sc.C) {
        const t = tag('u45k3');
        sc.t = t;
        const mkUsers = (p) => [
            {username: `${p}mgr`, roles: ['manager'], givenName: 'Mira', familyName: 'Manager'},
            ...(isOPS ? [] : [{username: `${p}ed`, roles: ['editor'], givenName: 'Edda', familyName: 'Editor'}]),
            {username: `${p}au1`, roles: ['author'], givenName: 'Ada', familyName: 'Lovelace'},
            {username: `${p}au2`, roles: ['author'], givenName: 'Grace', familyName: 'Hopper'},
        ];
        const mkCtx = async (key, extra) => {
            const p = `${t}${key.toLowerCase()}`;
            const res = await app.api.createContext({tag: p, context: {name: `U45 K3 ${key} ${t}`, acronym: `K3${key}`,
                contactName: 'K3 Contact', contactEmail: `${p}c@mail.test`, ...(extra.context || {})},
            users: mkUsers(p), ...Object.fromEntries(Object.entries(extra).filter(([k]) => k !== 'context'))});
            sc[key] = {path: res.path || p, id: res.contextId, p, mgr: `${p}mgr`, ed: isOPS ? null : `${p}ed`, au1: `${p}au1`, au2: `${p}au2`,
                issues: res.issues || null};
            save();
            return sc[key];
        };
        const pubExtra = (withFile) => (isOMP ? (withFile ? {publicationFormats: [{name: 'PDF', file: 'article.pdf'}]} : {})
            : (withFile ? {galleys: [{label: 'PDF', file: galleyFile}]} : {}));
        const mkSub = async (C, key, spec) => {
            try {
                const r = await app.api.createSubmission({tag: `${C.p}${key}`, context: C.path, submitter: spec.submitter || C.au1,
                    title: spec.title, ...Object.fromEntries(Object.entries(spec).filter(([k]) => !['submitter', 'title'].includes(k)))});
                C.subs = C.subs || {};
                C.subs[key] = {id: r.submissionId, publicationId: r.publicationId, stageId: r.stageId, status: r.status,
                    title: spec.title, galleys: r.galleys || null, formats: r.publicationFormats || null};
                save();
            } catch (e) {
                C.subErr = C.subErr || {};
                C.subErr[key] = String(e.message).slice(0, 600);
                save();
                log(`[seed ${key}]`, String(e.message).slice(0, 400));
            }
        };
        const issueKey = (n) => ({issue: {volume: 1, number: n, year: n === 1 ? 2025 : 2026}});

        // C
        const C = await mkCtx('C', {doiPrefix: '10.1234', enabledDoiTypes: kindsC,
            ...(isOJS ? {issues: [{volume: 1, number: 1, year: 2025, published: true}, {volume: 1, number: 2, year: 2026}]} : {})});
        if (!isOPS) {
            await mkSub(C, 'sub', {title: TITLES.sub});
            await mkSub(C, 'rev', {title: TITLES.rev, decisions: toReview});
            await mkSub(C, 'copy', {title: TITLES.copy, decisions: toCopy});
        } else {
            await mkSub(C, 'draft', {title: TITLES.draft, submitted: false});
            await mkSub(C, 'copy', {title: TITLES.copy});
        }
        if (isOJS) await mkSub(C, 'prod', {title: TITLES.prod, decisions: ['skipExternalReview', 'sendToProduction'], galleys: [{label: 'PDF', file: galleyFile}]});
        if (isOMP) await mkSub(C, 'prod', {title: TITLES.prod, decisions: ['skipExternalReview', 'sendToProduction'], ...pubExtra(true)});
        if (isOPS) await mkSub(C, 'prod', {title: TITLES.prod, galleys: [{label: 'PDF', file: galleyFile}]});
        await mkSub(C, 'pub1', {title: TITLES.pub1, published: true, ...pubExtra(true), ...(isOJS ? issueKey(1) : {})});
        await mkSub(C, 'pub2', {title: TITLES.pub2, submitter: C.au2, published: true, ...pubExtra(false), ...(isOJS ? issueKey(1) : {})});
        await mkSub(C, 'pub3', {title: TITLES.pub3, published: true, ...pubExtra(false), ...(isOJS ? issueKey(1) : {})});
        await mkSub(C, 'pub4', {title: TITLES.pub4, published: true, ...pubExtra(false), ...(isOJS ? issueKey(1) : {})});
        if (isOJS) await mkSub(C, 'sched', {title: TITLES.sched, published: true, ...issueKey(2)});

        // E: fixed pattern, two published works share a made DOI
        const E = await mkCtx('E', {doiPrefix: '10.5555', doiSuffixType: 'customPattern', doiPublicationSuffixPattern: `k3same${t}`});
        await mkSub(E, 'e1', {title: 'Heron wading depth', published: true});
        await mkSub(E, 'e2', {title: 'Egret plume moult', published: true});
        // X: no prefix
        const X = await mkCtx('X', {});
        await mkSub(X, 'x1', {title: 'Gecko toe adhesion', ...(isOPS ? {} : {decisions: toCopy})});
        await mkSub(X, 'x2', {title: 'Kiwi nocturnal foraging', published: true});
        // A: agency configured (OJS, OPS)
        if (!isOMP) {
            const A = await mkCtx('A', {doiPrefix: '10.1234', plugins: {crossrefplugin: {enabled: true,
                settings: {depositorName: 'K3 Depositor', depositorEmail: `${t}dep@mail.test`}}}, registrationAgency: 'crossrefplugin',
            ...(isOJS ? {publisherInstitution: 'K3 Press', onlineIssn: '0378-5955'} : {})});
            await mkSub(A, 'a1', {title: 'Puffin burrow sharing', published: true});
            await mkSub(A, 'a2', {title: 'Walrus haul-out timing', ...(isOPS ? {} : {decisions: toCopy})});
        }
        // F (OMP): Files alone
        if (isOMP) {
            const F = await mkCtx('F', {doiPrefix: '10.1234', enabledDoiTypes: ['file']});
            await mkSub(F, 'f1', {title: 'Otter tool use', published: true, publicationFormats: [{name: 'PDF', file: 'article.pdf'}]});
            await mkSub(F, 'f2', {title: 'Beaver dam hydrology', decisions: toCopy});
        }
        // P: paging, 31 published works
        const P = await mkCtx('P', {doiPrefix: '10.1234'});
        for (let i = 1; i <= 31; i++) await mkSub(P, `p${i}`, {title: `Paging work ${String(i).padStart(2, '0')}`, published: true});
        // evidence: the DOIs the seed left
        sc.seedDois = psql(app, `select d.doi_id, d.context_id, d.doi, d.status from dois d where d.context_id in (${['C', 'E', 'X', 'A', 'F'].filter((k) => sc[k]).map((k) => sc[k].id).join(',')}) order by 1`);
        save();
        log('[seed]', JSON.stringify({C: sc.C, subErr: Object.fromEntries(['C', 'E', 'X', 'A', 'F', 'P'].filter((k) => sc[k] && sc[k].subErr).map((k) => [k, sc[k].subErr]))}).slice(0, 3000));
    }
    if (!sc.C) { log('no seed'); return; }
    const C = sc.C;

    const {page, close} = await launch(app);
    page.setDefaultTimeout(T);
    const ctxUrl = (p, ctx) => app.url(`/index.php/${ctx || C.path}${p}`);
    let seq = 0;
    const snap = async (name, extra) => {
        const s = await screen(page);
        const n = `${String(++seq).padStart(2, '0')}-${name}`;
        record(n, extra ? {...s, extra} : s);
        await shot(page, n).catch(() => {});
        return s;
    };
    const signInAs = async (u, ctx) => { await signIn(page, u, {contextPath: ctx || C.path}); await idle(page); };
    // Every toast the page shows (they expire after five seconds), and the DOI requests the screen sends with the
    // body of any refusal (the browser's own traffic).
    await page.addInitScript(() => {
        window.__k3notes = [];
        const seen = new WeakSet();
        const scan = () => document.querySelectorAll('.app__notifications .pkpNotification, .app__notifications [class*="otification"]').forEach((n) => {
            if (seen.has(n)) return;
            seen.add(n);
            const t = n.innerText.replace(/\s+/g, ' ').trim();
            const c = document.querySelector('.app__notifications');
            const r = c ? c.getBoundingClientRect() : null;
            if (t && t !== '× Close') window.__k3notes.push(r ? `${t} @(${Math.round(r.left)},${Math.round(r.top)} of ${window.innerWidth}x${window.innerHeight})` : t);
        });
        window.__k3dialogs = [];
        const seenD = new WeakSet();
        const scanD = () => document.querySelectorAll('[role="dialog"], [role="alertdialog"]').forEach((n) => {
            const t = n.innerText.replace(/\s+/g, ' ').trim();
            if (!t) return;
            if (seenD.has(n) && n.__k3t === t) return;
            seenD.add(n); n.__k3t = t;
            window.__k3dialogs.push({t: t.slice(0, 400), at: Date.now()});
        });
        new MutationObserver(() => { scan(); scanD(); }).observe(document, {childList: true, subtree: true, characterData: true});
    });
    const takeDialogs = async () => page.evaluate(() => { const n = window.__k3dialogs || []; window.__k3dialogs = []; return n.map((d) => d.t); }).catch(() => []);
    const takeNotes = async () => page.evaluate(() => { const n = window.__k3notes || []; window.__k3notes = []; return n; }).catch(() => []);
    let doiTraffic = [];
    page.on('response', async (r) => {
        const u = r.url();
        if (!/\/api\/v1\/(_)?dois/.test(u) || r.request().method() === 'GET') return;
        const e = {method: r.request().method(), override: r.request().headers()['x-http-method-override'] || null,
            url: u.replace(/^https?:\/\/[^/]+/, ''), status: r.status(), post: flat(r.request().postData(), 300)};
        if (r.status() >= 400) e.body = flat(await r.text().catch(() => null), 800);
        doiTraffic.push(e);
    });
    const takeTraffic = () => { const t = doiTraffic; doiTraffic = []; return t; };
    const mailCounts = async () => {
        const o = {};
        for (const u of [C.mgr, C.ed, C.au1, C.au2].filter(Boolean)) o[u] = await app.mail.count({to: `${u}@mail.test`}).catch((e) => `err ${String(e.message).slice(0, 80)}`);
        o.total = await app.mail.messageCount().catch((e) => `err ${String(e.message).slice(0, 80)}`);
        return o;
    };
    const dbDois = (ctx) => psql(app, `select 'pub' k, s.submission_id, p.publication_id, d.doi, d.status from submissions s join publications p on p.submission_id=s.submission_id left join dois d on d.doi_id=p.doi_id where s.context_id=${ctx.id} order by 2,3`);

    // DOIs page helpers
    const gotoDois = async (ctx, hash) => {
        await page.goto(ctxUrl(`/dois${hash || ''}`, ctx));
        await idle(page);
        await page.locator('.listPanel__item--doi, .listPanel__empty, .listPanel__items').first().waitFor({timeout: 15000}).catch(() => {});
        await sleep(800);
    };
    const panel = () => page.locator('.doiListPanel:visible').first();
    const rowOf = (id) => page.locator(`[id$="-${id}"].listPanel__item--doi:visible`).first();
    const rowsText = async () => page.locator('.listPanel__item--doi:visible').evaluateAll((els) => els.map((e) => ({
        id: e.id, text: e.querySelector('.listPanel__itemSummary')?.innerText.replace(/\s+/g, ' ').trim(),
        href: e.querySelector('.listPanel__itemTitle a')?.getAttribute('href'),
        target: e.querySelector('.listPanel__itemTitle a')?.getAttribute('target'),
        badge: e.querySelector('.listPanel__itemSummary .doiListItem__itemMetadata--badge')?.innerText.trim(),
    })));
    const expanded = async (id) => rowOf(id).evaluate((e) => {
        const x = e.querySelector('.listPanel__itemExpanded');
        if (!x) return null;
        return {
            text: x.innerText.replace(/\s+/g, ' ').trim(),
            header: [...x.querySelectorAll('th')].map((c) => c.innerText.trim()),
            rows: [...x.querySelectorAll('tbody tr')].map((r) => ({
                type: r.querySelector('td label')?.innerText.trim(),
                value: r.querySelector('input')?.value, readonly: r.querySelector('input')?.readOnly, disabled: r.querySelector('input')?.disabled,
                badge: r.querySelector('.doiListItem__itemMetadata--badge')?.innerText.trim(),
                actions: r.querySelectorAll('td')[3]?.innerText.trim(),
            })),
            buttons: [...x.querySelectorAll('button')].map((b) => ({text: b.innerText.trim(), disabled: b.disabled || b.getAttribute('aria-disabled') === 'true'})),
        };
    }).catch((e) => ({error: String(e.message).slice(0, 200)}));
    const expand = async (id) => {
        const r = rowOf(id);
        if (!(await r.locator('.listPanel__itemExpanded').count())) {
            await r.locator('.listPanel__itemActions button').last().click();
            await sleep(500);
        }
        return expanded(id);
    };
    const notifyText = async () => page.locator('.app__notifications, [role="alert"], .pkpNotify, .vue-notification, [class*="notif" i]')
        .evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
    const dialogText = async () => page.getByRole('dialog').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
    const search = async (phrase, {enter = true} = {}) => {
        const box = panel().locator('input[type="search"]');
        await box.fill(phrase);
        await sleep(1500);
        const before = await rowsText();
        let after = null;
        let api = null;
        if (enter) {
            const w = page.waitForResponse((r) => r.request().method() === 'GET' && /\/api\/v1\/(submissions|issues)\?/.test(r.url())
                && new URL(r.url()).searchParams.get('searchPhrase') === phrase, {timeout: 20000}).catch(() => null);
            await box.press('Enter');
            const resp = await w;
            if (resp) { const j = await resp.json().catch(() => null); api = j ? {status: resp.status(), itemsMax: j.itemsMax, ids: (j.items || []).map((i) => i.id)} : {status: resp.status()}; }
            await idle(page); await sleep(1200);
            after = await rowsText();
        }
        return {typedNoEnter: before.map((r) => r.text), afterEnter: after && after.map((r) => r.text), api};
    };
    const openBulk = async () => {
        if (!(await page.locator('.pkpDropdown__action:visible').count())) {
            await panel().getByRole('button', {name: 'Bulk Actions'}).click();
            await sleep(400);
        }
        return page.locator('.pkpDropdown__content:visible, .doiListPanel__bulkActions [role="menu"]:visible').first()
            .innerText().then((s) => s.replace(/\s+/g, ' ').trim()).catch(() => null);
    };
    const closeBulk = async () => {
        if (await page.locator('.pkpDropdown__action:visible').count()) {
            await panel().getByRole('button', {name: 'Bulk Actions'}).click().catch(() => {});
            await sleep(300);
        }
    };
    const bulkItem = (label) => page.locator('.pkpDropdown__action:visible', {hasText: label}).first();
    const tick = async (ids) => { for (const id of ids) await rowOf(id).locator('input[type="checkbox"]').first().check(); await sleep(200); };
    const runBulk = async (label, ids, name, {confirm = true} = {}) => {
        if (ids) await tick(ids);
        const menu = await openBulk();
        await bulkItem(label).click();
        const dlg = page.getByRole('dialog').filter({hasText: label}).last();
        await dlg.waitFor({timeout: 10000}).catch(() => {});
        // The menu closes once the window holds the focus; answered before that, it stays open over the rows
        // (DoisPage.chooseBulkAction, .reports/flake-s28/u45-expand/diagnosis.md).
        await page.locator('.pkpDropdown__action:visible').first().waitFor({state: 'detached', timeout: 10000}).catch(() => {});
        await sleep(400);
        const before = {menu, dialog: await dialogText(), buttons: await dlg.getByRole('button').allInnerTexts().catch(() => [])};
        await snap(`${name}-confirm`);
        if (!confirm) {
            await dlg.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
            await sleep(600);
            return {before, cancelled: true, dialogAfter: await dialogText(), ticked: await tickedIds()};
        }
        const w = page.waitForResponse((r) => r.url().includes('/dois/') && r.request().method() !== 'GET', {timeout: 20000}).catch(() => null);
        await takeDialogs();
        await dlg.getByRole('button', {name: label, exact: true}).click();
        const resp = await w;
        await idle(page); await sleep(1500);
        const after = {status: resp ? resp.status() : null, url: resp ? resp.url().replace(/^https?:\/\/[^/]+/, '') : null,
            dialog: await dialogText(), dialogsSeen: await takeDialogs(), notify: await notifyText(), rows: await rowsText(), ticked: await tickedIds()};
        await snap(`${name}-after`);
        // close a result window
        const ok = page.getByRole('dialog').getByRole('button', {name: /^(OK|Ok|Close)$/}).first();
        if (await ok.count()) { await ok.click().catch(() => {}); await sleep(700); }
        return {before, after};
    };
    const tickedIds = async () => page.locator('.listPanel__item--doi:visible input[type="checkbox"]:checked').evaluateAll((els) => els.map((e) => e.value)).catch(() => []);

    try {
        // =========================================================================================
        // page: the DOIs page as the manager on C: heading, tabs, list header, filters, rows; Bulk Actions menu.
        if (on('page')) await sect('page', async () => {
            await signInAs(C.mgr);
            await gotoDois();
            const s = await snap('page-c');
            const out = {
                h1: await page.locator('main h1, .app__pageHeading').allInnerTexts().catch(() => []),
                tabs: await page.getByRole('tab').allInnerTexts().catch(() => []),
                listTitle: await page.locator('.doiListPanel:visible h2').allInnerTexts().catch(() => []),
                headerButtons: await panel().locator('.pkpHeader').first().getByRole('button').allInnerTexts().catch(() => []),
                searchBox: await panel().locator('input[type="search"]').getAttribute('placeholder').catch(() => null),
                filtersSide: flat(await panel().locator('.listPanel__sidebar').innerText().catch(() => null)),
                infoButton: await panel().locator('.doiListPanel__statusInfoButton').evaluate((b) => ({text: b.innerText, aria: b.getAttribute('aria-label'), title: b.getAttribute('title')})).catch(() => null),
                rows: await rowsText(),
                pagination: await panel().locator('.pkpPagination, nav[aria-label*="agination" i]').count(),
                notice: flat(await page.locator('.pkpNotification, [class*="pkpNotification"]').allInnerTexts().then((a) => a.join(' | ')).catch(() => null)),
            };
            out.bulkMenu = await openBulk();
            await snap('page-c-bulk-menu');
            await closeBulk();
            await sleep(300);
            await loc(page, 'DOIs page: list title (h2)', page.locator('.doiListPanel:visible h2'));
            await loc(page, 'DOIs page: Bulk Actions button', panel().getByRole('button', {name: 'Bulk Actions'}));
            await loc(page, 'DOIs page: Search box', panel().locator('input[type="search"]'));
            await loc(page, 'DOIs page: status info button', panel().locator('.doiListPanel__statusInfoButton'));
            record('page-summary', out);
            log('[page]', JSON.stringify(out).slice(0, 3000));
            if (!sc.mail0) { sc.mail0 = await mailCounts(); save(); }
        });

        // =========================================================================================
        // list: Rule 14 tabs and Rule 15 which works are listed and in which order (q17).
        if (on('list')) await sect('list', async () => {
            await signInAs(C.mgr);
            await gotoDois();
            const out = {rows: await rowsText(), seeded: C.subs,
                db: psql(app, `select submission_id, stage_id, status, date_submitted, submission_progress from submissions where context_id=${C.id} order by date_submitted desc, submission_id`)};
            await snap('list-c');
            if (isOJS) {
                await page.getByRole('tab', {name: 'Issues', exact: true}).click();
                await idle(page); await sleep(1200);
                out.issuesTab = {h1: await page.locator('main h1:visible').allInnerTexts(), listTitle: await page.locator('.doiListPanel:visible h2').allInnerTexts(),
                    rows: await rowsText(), filters: flat(await panel().locator('.listPanel__sidebar').innerText().catch(() => null)),
                    url: page.url().replace(/^https?:\/\/[^/]+/, '')};
                await snap('list-c-issues-tab');
                out.issuesDb = psql(app, `select i.issue_id, i.volume, i.number, i.year, i.published, d.doi, d.status from issues i left join dois d on d.doi_id=i.doi_id where i.journal_id=${C.id} order by 1`);
            }
            record('list-summary', out);
            log('[list]', JSON.stringify(out).slice(0, 2500));
        });

        // =========================================================================================
        // row: Rules 16, 17: a row, its link, number, badge; expanded views.
        if (on('row')) await sect('row', async () => {
            await signInAs(C.mgr);
            await gotoDois();
            const out = {};
            for (const k of ['copy', 'prod', 'pub1', 'sched', 'draft']) {
                if (!C.subs[k]) continue;
                if (!(await rowOf(C.subs[k].id).count())) { out[k] = 'not listed'; continue; }
                out[k] = await expand(C.subs[k].id);
            }
            await snap('row-expanded');
            await loc(page, 'DOIs page: a row by submission id', rowOf(C.subs.pub1.id));
            await loc(page, 'DOIs page: the row expander', rowOf(C.subs.pub1.id).getByRole('button', {name: `Show more details about ${C.subs.pub1.id}`}));
            await loc(page, 'DOIs page: expanded Edit button', rowOf(C.subs.pub1.id).getByRole('button', {name: 'Edit', exact: true}));
            // The title link opens the public page in a new tab (published and unpublished work).
            for (const k of ['pub1', 'copy']) {
                const pop = page.waitForEvent('popup', {timeout: 15000}).catch(() => null);
                await rowOf(C.subs[k].id).locator('.listPanel__itemTitle a').click();
                const p2 = await pop;
                if (p2) {
                    await p2.waitForLoadState('domcontentloaded').catch(() => {});
                    await sleep(800);
                    out[`link-${k}`] = {url: p2.url().replace(/^https?:\/\/[^/]+/, ''), title: await p2.title().catch(() => null),
                        h1: flat(await p2.locator('h1').first().innerText().catch(() => null), 200)};
                    await p2.close().catch(() => {});
                } else out[`link-${k}`] = 'no popup';
            }
            out.db = dbDois(C);
            record('row-summary', out);
            log('[row]', JSON.stringify(out).slice(0, 3500));
        });

        // =========================================================================================
        // search: Rule 21 (q18). Typed without Enter, then Enter; a contributor; a DOI's first characters; clear.
        if (on('search')) await sect('search', async () => {
            await signInAs(C.mgr);
            await gotoDois();
            const out = {};
            const doiOf = (k) => psql(app, `select d.doi from publications p join dois d on d.doi_id=p.doi_id where p.publication_id=${C.subs[k].publicationId}`);
            out.word = await search('Okapi');
            await snap('search-word');
            out.titleMiddleWord = await search('forest');
            out.contributor = await search('Hopper');
            await snap('search-contributor');
            out.givenName = await search('Grace');
            const d1 = doiOf('pub1');
            out.pub1Doi = d1;
            out.doiStart = await search(d1.slice(0, 10));
            await snap('search-doi-start');
            out.doiWhole = await search(d1);
            out.doiSuffixOnly = await search(d1.split('/')[1]);
            if (!isOMP) {
                const g = psql(app, `select d.doi from publication_galleys g join dois d on d.doi_id=g.doi_id where g.publication_id=${C.subs.pub1.publicationId}`);
                out.galleyDoi = g;
                if (g && !g.startsWith('psql')) out.galleyDoiStart = await search(g.slice(0, 10));
            } else {
                const f = psql(app, `select d.doi from submission_files sf join dois d on d.doi_id=sf.doi_id where sf.submission_id=${C.subs.pub1.id}`);
                out.fileDoi = f;
                if (f && !f.startsWith('psql')) out.fileDoiStart = await search(f.slice(0, 10));
            }
            out.prefixOnly = await search('10.1234/');
            // the clear button
            const clear = panel().getByRole('button', {name: 'Clear search phrase'});
            out.clearCount = await clear.count();
            await loc(page, 'DOIs page: Clear search phrase', clear);
            await clear.click().catch((e) => { out.clearErr = String(e.message).slice(0, 120); });
            await idle(page); await sleep(1000);
            out.afterClear = (await rowsText()).map((r) => r.text);
            out.boxAfterClear = await panel().locator('input[type="search"]').inputValue();
            await snap('search-cleared');
            record('search-summary', out);
            log('[search]', JSON.stringify(out).slice(0, 3500));
        });

        // =========================================================================================
        // edit: Rule 18 (q9), Rule 9, A3, A7 on pub2; each changed box on its own (prod: article + galley); unchanged Save.
        if (on('edit') && !done('edit')) await sect('edit', async () => {
            await signInAs(C.mgr);
            await gotoDois();
            const out = {steps: []};
            const E = sc.E;
            const eDoi = E ? psql(app, `select d.doi from submissions s join publications p on p.publication_id=s.current_publication_id join dois d on d.doi_id=p.doi_id where s.context_id=${E.id} limit 1`) : null;
            const pub3Doi = psql(app, `select d.doi from publications p join dois d on d.doi_id=p.doi_id where p.publication_id=${C.subs.pub3.publicationId}`);
            out.eDoi = eDoi; out.pub3Doi = pub3Doi;
            const id = C.subs.pub2.id;
            const box = (i = 0) => rowOf(id).locator('.listPanel__itemExpanded tbody tr input').nth(i);
            await expand(id);
            out.beforeEdit = await expanded(id);
            out.boxReadonlyBeforeEdit = await box().evaluate((e) => ({readOnly: e.readOnly, disabled: e.disabled, cls: e.className}));
            const attempt = async (label, value, i = 0, targetId = id) => {
                const r = rowOf(targetId);
                const b = r.locator('.listPanel__itemExpanded tbody tr input').nth(i);
                await r.getByRole('button', {name: 'Edit', exact: true}).click();
                await sleep(300);
                const editing = {readOnly: await b.evaluate((e) => e.readOnly), buttons: await r.locator('.listPanel__itemExpanded button').allInnerTexts()};
                await b.fill(value);
                takeTraffic(); await takeNotes();
                await r.getByRole('button', {name: 'Save', exact: true}).click();
                await r.getByRole('button', {name: 'Edit', exact: true}).waitFor({timeout: 15000}).catch(() => {});
                await idle(page); await sleep(1200);
                const st = {label, typed: value, editing, traffic: takeTraffic(), notes: await takeNotes(), after: await expanded(targetId),
                    badge: (await rowsText()).find((x) => x.id.endsWith(`-${targetId}`))?.badge};
                await snap(`edit-${label}`);
                // the reload read
                await gotoDois();
                if (!(await rowOf(targetId).count())) {
                    st.afterReload = 'row not listed after reload';
                    st.listedAfterReload = (await rowsText()).map((x) => x.text);
                    out.steps.push(st);
                    log(`[edit ${label}]`, JSON.stringify(st).slice(0, 1500));
                    return st;
                }
                await expand(targetId);
                st.afterReload = await expanded(targetId);
                st.badgeAfterReload = (await rowsText()).find((x) => x.id.endsWith(`-${targetId}`))?.badge;
                out.steps.push(st);
                log(`[edit ${label}]`, JSON.stringify(st).slice(0, 1500));
                return st;
            };
            await attempt('valid-same-prefix', `10.1234/${sc.t}abc`);
            await attempt('other-prefix', `10.9999/${sc.t}abc`);
            await attempt('no-prefix-shape', 'abc');
            await attempt('space', '10.1234/a b');
            await attempt('bad-char', `10.1234/${sc.t}<x>`);
            await attempt('prefix-no-dot-digits', `10/${sc.t}x`);
            if (eDoi && !eDoi.startsWith('psql')) await attempt('dup-other-journal', eDoi);
            await attempt('dup-same-journal', pub3Doi);
            await attempt('empty', '');
            await attempt('typed-on-none', `10.1234/${sc.t}new`);
            // Save with no change: no request, editing closes
            const r = rowOf(id);
            await r.getByRole('button', {name: 'Edit', exact: true}).click(); await sleep(300);
            takeTraffic(); await takeNotes();
            await r.getByRole('button', {name: 'Save', exact: true}).click(); await sleep(1500);
            out.unchangedSave = {traffic: takeTraffic(), notes: await takeNotes(), buttons: await r.locator('.listPanel__itemExpanded button').allInnerTexts(),
                readOnly: await box().evaluate((e) => e.readOnly)};
            // two boxes in one Save: prod's article box refused, its galley box accepted (OJS/OPS; OMP: pub1's file row)
            const two = isOMP ? C.subs.pub1 : C.subs.prod;
            await expand(two.id);
            const rr = rowOf(two.id);
            out.twoBefore = await expanded(two.id);
            await rr.getByRole('button', {name: 'Edit', exact: true}).click(); await sleep(300);
            await rr.locator('.listPanel__itemExpanded tbody tr input').nth(0).fill('bad value');
            await rr.locator('.listPanel__itemExpanded tbody tr input').nth(1).fill(`10.1234/${sc.t}second${Date.now() % 100000}`);
            takeTraffic(); await takeNotes();
            await rr.getByRole('button', {name: 'Save', exact: true}).click();
            await rr.getByRole('button', {name: 'Edit', exact: true}).waitFor({timeout: 15000}).catch(() => {});
            await idle(page); await sleep(1500);
            out.twoBoxes = {traffic: takeTraffic(), notes: await takeNotes(), after: await expanded(two.id)};
            await snap('edit-two-boxes');
            await gotoDois(); await expand(two.id);
            out.twoBoxes.afterReload = await expanded(two.id);
            // clear an unpublished item's DOI (sched on OJS, copy elsewhere): badge and row read
            record('edit-summary', out);
            const un = C.subs.copy;
            await expand(un.id);
            await attempt('empty-unpublished', '', 0, un.id);
            out.db = dbDois(C);
            record('edit-summary', out);
            markDone('edit');
        });

        // =========================================================================================
        // assign: Rule 25. C: prod (galley without DOI, article with one), pub1 (all carried), pub4 (cleared first).
        if (on('assign') && !done('assign')) await sect('assign', async () => {
            await signInAs(C.mgr);
            await gotoDois();
            const out = {};
            // clear pub4 by hand first
            const r4 = rowOf(C.subs.pub4.id);
            await expand(C.subs.pub4.id);
            await r4.getByRole('button', {name: 'Edit', exact: true}).click(); await sleep(300);
            await r4.locator('.listPanel__itemExpanded tbody tr input').nth(0).fill('');
            await r4.getByRole('button', {name: 'Save', exact: true}).click();
            await r4.getByRole('button', {name: 'Edit', exact: true}).waitFor({timeout: 15000}).catch(() => {});
            await idle(page); await sleep(800);
            await takeNotes();
            out.dbBefore = dbDois(C) + '\n' + (isOMP ? psql(app, `select sf.submission_file_id, sf.submission_id, d.doi from submission_files sf left join dois d on d.doi_id=sf.doi_id where sf.submission_id in (select submission_id from submissions where context_id=${C.id}) and sf.file_stage=10`)
                : psql(app, `select g.galley_id, g.publication_id, d.doi from publication_galleys g left join dois d on d.doi_id=g.doi_id join publications p on p.publication_id=g.publication_id join submissions s on s.submission_id=p.submission_id where s.context_id=${C.id}`));
            await gotoDois();
            const ids = [C.subs.prod.id, C.subs.pub1.id, C.subs.pub4.id, C.subs.copy.id];
            out.run = await runBulk('Assign DOIs', ids, 'assign-c');
            out.run.notes = await takeNotes();
            out.traffic = takeTraffic();
            out.dbAfter = dbDois(C) + '\n' + (isOMP ? psql(app, `select sf.submission_file_id, sf.submission_id, d.doi from submission_files sf left join dois d on d.doi_id=sf.doi_id where sf.submission_id in (select submission_id from submissions where context_id=${C.id}) and sf.file_stage=10`)
                : psql(app, `select g.galley_id, g.publication_id, d.doi from publication_galleys g left join dois d on d.doi_id=g.doi_id join publications p on p.publication_id=g.publication_id join submissions s on s.submission_id=p.submission_id where s.context_id=${C.id}`));
            for (const k of ['prod', 'pub1', 'pub4', 'copy']) out[`exp-${k}`] = await expand(C.subs[k].id);
            await snap('assign-c-expanded');
            record('assign-summary', out);
            // D2 (OJS): the issue pattern: one at Copyediting without an issue, one published in an issue (its DOI cleared first)
            if (isOJS && !sc.D2) {
                const p = `${sc.t}d2`;
                const res = await app.api.createContext({tag: p, context: {name: `U45 K3 D2 ${sc.t}`, acronym: 'K3D', contactName: 'K3 Contact', contactEmail: `${p}c@mail.test`},
                    users: [{username: `${p}mgr`, roles: ['manager']}, {username: `${p}au1`, roles: ['author'], givenName: 'Ada', familyName: 'Lovelace'}],
                    doiPrefix: '10.1234', doiSuffixType: 'customPattern', doiPublicationSuffixPattern: '%j.v%vi%i.%a',
                    issues: [{volume: 3, number: 1, year: 2026, published: true}]});
                sc.D2 = {path: res.path || p, id: res.contextId, p, mgr: `${p}mgr`, au1: `${p}au1`, subs: {}};
                for (const [k, spec] of [['noissue', {title: 'Marmot hibernation clocks', decisions: toCopy}],
                    ['inissue', {title: 'Lemur tail signals', published: true, issue: {volume: 3, number: 1, year: 2026}}]]) {
                    const r = await app.api.createSubmission({tag: `${p}${k}`, context: sc.D2.path, submitter: sc.D2.au1, title: spec.title, ...spec});
                    sc.D2.subs[k] = {id: r.submissionId, publicationId: r.publicationId, title: spec.title};
                }
                save();
            }
            if (sc.D2) {
                const D = sc.D2;
                await signInAs(D.mgr, D.path);
                out.dBefore = dbDois(D);
                await gotoDois(D.path);
                await snap('assign-d-page');
                out.dRows = await rowsText();
                // clear a DOI the seed may have given the scheduled one
                const sId = D.subs.inissue.id;
                const sExp = await expand(sId);
                out.dSchedBefore = sExp;
                if (sExp && sExp.rows && sExp.rows[0] && sExp.rows[0].value) {
                    const rs = rowOf(sId);
                    await rs.getByRole('button', {name: 'Edit', exact: true}).click(); await sleep(300);
                    await rs.locator('.listPanel__itemExpanded tbody tr input').nth(0).fill('');
                    await rs.getByRole('button', {name: 'Save', exact: true}).click();
                    await rs.getByRole('button', {name: 'Edit', exact: true}).waitFor({timeout: 15000}).catch(() => {});
                    await idle(page); await sleep(800); await takeNotes();
                    await gotoDois(D.path);
                }
                takeTraffic();
                out.dMid = dbDois(D);
                out.dRun = await runBulk('Assign DOIs', [D.subs.noissue.id, sId], 'assign-d');
                out.dRun.notes = await takeNotes();
                out.dTraffic = takeTraffic();
                out.dAfter = dbDois(D);
                await gotoDois(D.path);
                out.dRowsAfter = await rowsText();
                await snap('assign-d-after-reload');
            }
            record('assign-summary', out);
            log('[assign]', JSON.stringify(out).slice(0, 4000));
            markDone('assign');
        });

        // =========================================================================================
        // mark: Rules 26, 28, 19. Registered: pub3 + copy (unpublished) → refused; pub3 alone; pub1 alone.
        // Needs Sync: pub3 + pub4 (Unregistered) → refused; pub3 alone.
        if (on('mark') && !done('mark')) await sect('mark', async () => {
            await signInAs(C.mgr);
            await gotoDois();
            const out = {};
            const st = () => dbDois(C);
            out.regMixed = await runBulk('Mark DOIs Registered', [C.subs.pub3.id, C.subs.copy.id], 'mark-reg-mixed');
            out.regMixed.notes = await takeNotes(); out.regMixed.traffic = takeTraffic(); out.regMixed.db = st();
            await gotoDois();
            out.regOne = await runBulk('Mark DOIs Registered', [C.subs.pub3.id], 'mark-reg-pub3');
            out.regOne.notes = await takeNotes(); out.regOne.traffic = takeTraffic();
            await gotoDois();
            out.regPub1 = await runBulk('Mark DOIs Registered', [C.subs.pub1.id], 'mark-reg-pub1');
            out.regPub1.notes = await takeNotes(); out.regPub1.traffic = takeTraffic(); out.regPub1.db = st();
            // Rule 19: Edit on a Registered item
            await gotoDois();
            out.pub1Registered = await expand(C.subs.pub1.id);
            await snap('mark-pub1-registered-expanded');
            const edit1 = rowOf(C.subs.pub1.id).getByRole('button', {name: 'Edit', exact: true});
            out.pub1EditDisabled = await edit1.isDisabled().catch(() => null);
            await loc(page, 'DOIs page: Edit on a Registered item', edit1);
            // Needs Sync
            out.syncMixed = await runBulk('Mark DOIs Needs Sync', [C.subs.pub3.id, C.subs.pub4.id], 'mark-sync-mixed');
            out.syncMixed.notes = await takeNotes(); out.syncMixed.traffic = takeTraffic(); out.syncMixed.db = st();
            await gotoDois();
            out.syncOne = await runBulk('Mark DOIs Needs Sync', [C.subs.pub3.id], 'mark-sync-pub3');
            out.syncOne.notes = await takeNotes(); out.syncOne.traffic = takeTraffic(); out.syncOne.db = st();
            await gotoDois();
            out.pub3Stale = await expand(C.subs.pub3.id);
            await snap('mark-pub3-stale-expanded');
            // Needs Sync on an unpublished item that carries a DOI (copy): refused?
            out.syncUnpub = await runBulk('Mark DOIs Needs Sync', [C.subs.copy.id], 'mark-sync-unpub');
            out.syncUnpub.notes = await takeNotes(); out.syncUnpub.traffic = takeTraffic();
            record('mark-summary', out);
            log('[mark]', JSON.stringify(out).slice(0, 4000));
            markDone('mark');
        });

        // =========================================================================================
        // filters: Rule 22 (q8) and the "DOI Statuses" window.
        if (on('filters')) await sect('filters', async () => {
            await signInAs(C.mgr);
            await gotoDois();
            // prep: prod keeps its work DOI but loses its galley's (file's) DOI, so one item misses one kind only
            if (!sc.prodGalleyCleared) {
                const rp = rowOf(C.subs.prod.id);
                const ex = await expand(C.subs.prod.id);
                if (ex && ex.rows && ex.rows.length > 1 && ex.rows[1].value) {
                    await rp.getByRole('button', {name: 'Edit', exact: true}).click(); await sleep(300);
                    await rp.locator('.listPanel__itemExpanded tbody tr input').nth(1).fill('');
                    await rp.getByRole('button', {name: 'Save', exact: true}).click();
                    await rp.getByRole('button', {name: 'Edit', exact: true}).waitFor({timeout: 15000}).catch(() => {});
                    await idle(page); await sleep(800);
                }
                sc.prodGalleyCleared = await expanded(C.subs.prod.id); save();
                await gotoDois();
            }
            const out = {prodRows: sc.prodGalleyCleared, all: (await rowsText()).map((r) => `${r.text}`), db: dbDois(C), filters: {}};
            const side = () => panel().locator('.listPanel__sidebar');
            const fbtn = (name) => side().locator('button.pkpFilter__label', {hasText: new RegExp(`^\\s*${name}\\s*$`)}).first();
            const press = async (name) => {
                await fbtn(name).click();
                await idle(page); await sleep(1200);
                return {rows: (await rowsText()).map((r) => r.text),
                    active: await side().locator('button.pkpFilter__label.-isActive').allInnerTexts(),
                    removeButtons: await side().locator('.pkpFilter__remove').allInnerTexts()};
            };
            const names = ['Needs DOI', 'DOI Assigned', 'Unregistered', 'Submitted', 'Registered', 'Has Error', 'Needs Sync'];
            for (const n of names) {
                takeTraffic();
                const a = await press(n);
                a.apiUrls = await page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).filter((u) => /\/api\/v1\/(_submissions|issues|submissions)/.test(u)).slice(-1));
                await snap(`filter-${n.replace(/\s+/g, '-').toLowerCase()}`);
                const b = await press(n); // press again: lifted?
                a.pressedAgain = b;
                out.filters[n] = a;
            }
            // Needs DOI then DOI Assigned: is the first lifted?
            await press('Needs DOI');
            out.needsThenAssigned = await press('DOI Assigned');
            await snap('filter-needs-then-assigned');
            // Unregistered then Registered, then lift Registered with its Clear filter button
            await press('DOI Assigned');
            await press('Unregistered');
            out.unregThenReg = await press('Registered');
            out.unregThenReg.apiUrl = await page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).filter((u) => /\/api\/v1\//.test(u)).slice(-1));
            const rm = side().locator('.pkpFilter__remove').first();
            out.clearButtonName = await rm.innerText().catch(() => null);
            await loc(page, 'DOIs page: a filter\'s Clear filter button', rm);
            await rm.click().catch(() => {});
            await idle(page); await sleep(1200);
            out.afterClearButton = {rows: (await rowsText()).map((r) => r.text), active: await side().locator('button.pkpFilter__label.-isActive').allInnerTexts(),
                apiUrl: await page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).filter((u) => /\/api\/v1\//.test(u)).slice(-1))};
            await snap('filter-after-clear-button');
            // Status + Registration together
            await gotoDois();
            await press('DOI Assigned');
            out.assignedPlusRegistered = await press('Registered');
            // app-specific filters
            await gotoDois();
            if (isOJS) {
                const is = side().locator('input').first();
                out.issueInput = await is.evaluate((e) => ({role: e.getAttribute('role'), aria: e.getAttribute('aria-label'), type: e.type})).catch(() => null);
                out.issueSuggest = {};
                for (const q of ['Vol', '1', '2026', 'Vol. 1 No. 1', '2025']) {
                    await is.click(); await is.fill(''); await is.pressSequentially(q, {delay: 80});
                    await idle(page); await sleep(1500);
                    out.issueSuggest[q] = await page.getByRole('option').allInnerTexts().catch(() => []);
                }
                await snap('filter-issues-suggest');
                const opt = page.getByRole('option').first();
                if (await opt.count()) { await opt.click(); await idle(page); await sleep(1200); }
                out.issueChosen = {rows: (await rowsText()).map((r) => r.text), side: flat(await side().innerText(), 600)};
                await snap('filter-issue-chosen');
            } else {
                for (const n of [isOPS ? 'Posted' : 'Published', 'Unpublished']) {
                    out.filters[n] = await press(n);
                    await snap(`filter-${n.toLowerCase()}`);
                    await press(n);
                }
            }
            // the DOI Statuses window
            await gotoDois();
            await panel().locator('.doiListPanel__statusInfoButton').click();
            const sm = page.getByRole('dialog').filter({hasText: 'Needs DOI'}).last();
            await sm.waitFor({timeout: 10000}).catch(() => {});
            await sleep(600);
            out.statusWindow = {text: await dialogText(),
                rows: await sm.locator('tr').evaluateAll((els) => els.map((r) => [...r.querySelectorAll('th,td')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()))).catch(() => null),
                buttonAria: await panel().locator('.doiListPanel__statusInfoButton').evaluate((b) => ({name: b.getAttribute('aria-label'), text: b.innerText, title: b.getAttribute('title')}))};
            await snap('filter-status-window');
            await loc(page, 'DOIs page: DOI Statuses window', sm);
            await sm.getByRole('button', {name: /Close/}).first().click().catch(() => {});
            record('filters-summary', out);
            log('[filters]', JSON.stringify(out).slice(0, 5000));
        });

        // =========================================================================================
        // bulk: Rule 24 (q19): every action with nothing ticked; Select All / None, Expand / Collapse all; Cancel.
        if (on('bulk')) await sect('bulk', async () => {
            await signInAs(C.mgr);
            await gotoDois();
            const out = {empty: {}};
            for (const a of ['Mark DOIs Registered', 'Mark DOIs Unregistered', 'Mark DOIs Needs Sync', 'Assign DOIs']) {
                await gotoDois();
                takeTraffic(); await takeNotes();
                out.empty[a] = await runBulk(a, null, `bulk-empty-${a.replace(/\s+/g, '-').toLowerCase()}`);
                out.empty[a].traffic = takeTraffic();
                out.empty[a].notes = await takeNotes();
                record('bulk-summary', out);
                // close any leftover window
                for (const b of await page.getByRole('dialog').getByRole('button', {name: /^(OK|Close|Cancel)$/}).all()) await b.click().catch(() => {});
                await sleep(500);
            }
            await gotoDois();
            out.total = (await rowsText()).length;
            await openBulk();
            await bulkItem('Select All').click(); await sleep(500);
            out.afterSelectAll = {ticked: (await tickedIds()).length, menu: await openBulk()};
            await snap('bulk-select-all');
            await bulkItem('Select None').click().catch(() => {}); await sleep(500);
            out.afterSelectNone = {ticked: (await tickedIds()).length, menu: await openBulk()};
            await bulkItem('Expand all').click(); await sleep(800);
            out.afterExpandAll = {expanded: await page.locator('.listPanel__itemExpanded:visible').count(), menu: await openBulk()};
            await snap('bulk-expand-all');
            await bulkItem('Collapse all').click().catch(() => {}); await sleep(800);
            out.afterCollapseAll = {expanded: await page.locator('.listPanel__itemExpanded:visible').count()};
            await closeBulk();
            // tick two by hand: the menu's count; Cancel in the window keeps them ticked and sends nothing
            await gotoDois();
            await tick([C.subs.pub2.id, C.subs.pub4.id]);
            out.menuTwoTicked = await openBulk();
            await closeBulk();
            await sleep(300);
            takeTraffic();
            out.cancel = await runBulk('Mark DOIs Unregistered', null, 'bulk-cancel', {confirm: false});
            out.cancel.traffic = takeTraffic();
            // one ticked item per row, then one unticked: Select All reads "Select None" only when all ticked
            record('bulk-summary', out);
            log('[bulk]', JSON.stringify(out).slice(0, 5000));
        });

        // =========================================================================================
        // unmark: Rule 27, Rule 19's way back: pub1 (Registered) + copy (unpublished).
        if (on('unmark') && !done('unmark')) await sect('unmark', async () => {
            await signInAs(C.mgr);
            await gotoDois();
            const out = {before: dbDois(C)};
            out.run = await runBulk('Mark DOIs Unregistered', [C.subs.pub1.id, C.subs.copy.id], 'unmark');
            out.run.notes = await takeNotes(); out.run.traffic = takeTraffic();
            out.after = dbDois(C);
            await gotoDois();
            out.pub1 = await expand(C.subs.pub1.id);
            out.pub1EditDisabled = await rowOf(C.subs.pub1.id).getByRole('button', {name: 'Edit', exact: true}).isDisabled().catch(() => null);
            await snap('unmark-pub1-expanded');
            record('unmark-summary', out);
            log('[unmark]', JSON.stringify(out).slice(0, 3000));
            markDone('unmark');
        });

        // =========================================================================================
        // issues (OJS): the Issues tab's rows and actions.
        if (on('issues') && isOJS && !done('issues')) await sect('issues', async () => {
            await signInAs(C.mgr);
            await gotoDois(null, '#issue-doi-management');
            await page.getByRole('tab', {name: 'Issues', exact: true}).click().catch(() => {});
            await idle(page); await sleep(1200);
            const out = {rows: await rowsText()};
            const [i1, i2] = C.issues.map((i) => i.id);
            out.exp1 = await expand(i1);
            out.exp2 = await expand(i2);
            await snap('issues-expanded');
            out.regUnpub = await runBulk('Mark DOIs Registered', [i1, i2], 'issues-reg-mixed');
            out.regUnpub.notes = await takeNotes(); out.regUnpub.traffic = takeTraffic();
            out.assign = await runBulk('Assign DOIs', [i1, i2], 'issues-assign');
            out.assign.notes = await takeNotes(); out.assign.traffic = takeTraffic();
            out.db = psql(app, `select i.issue_id, i.published, d.doi, d.status from issues i left join dois d on d.doi_id=i.doi_id where i.journal_id=${C.id} order by 1`);
            out.regPub = await runBulk('Mark DOIs Registered', [i1], 'issues-reg-pub');
            out.regPub.notes = await takeNotes(); out.regPub.traffic = takeTraffic();
            out.dbAfter = psql(app, `select i.issue_id, i.published, d.doi, d.status from issues i left join dois d on d.doi_id=i.doi_id where i.journal_id=${C.id} order by 1`);
            record('issues-summary', out);
            log('[issues]', JSON.stringify(out).slice(0, 4000));
            markDone('issues');
        });

        // =========================================================================================
        // agency (OJS, OPS: A with Crossref configured); X (no prefix); E (made DOIs alike).
        if (on('agency')) await sect('agency', async () => {
            const out = {};
            if (sc.A) {
                await signInAs(sc.A.mgr, sc.A.path);
                await gotoDois(sc.A.path);
                out.A = {headerButtons: await panel().locator('.pkpHeader').first().getByRole('button').allInnerTexts(), menu: await openBulk(), rows: await rowsText()};
                await snap('agency-a-menu');
                await closeBulk();
                out.A.exp = await expand(sc.A.subs.a1.id);
                await snap('agency-a-expanded');
            }
            if (sc.X) {
                await signInAs(sc.X.mgr, sc.X.path);
                await gotoDois(sc.X.path);
                out.X = {notice: flat(await page.locator('main').innerText(), 500), menu: await openBulk(), rows: await rowsText()};
                await snap('agency-x-noprefix');
                await closeBulk();
                // a DOI typed by hand without a prefix set (incidental)
                const id = sc.X.subs.x2.id;
                await expand(id);
                const rx = rowOf(id);
                await rx.getByRole('button', {name: 'Edit', exact: true}).click(); await sleep(300);
                await rx.locator('.listPanel__itemExpanded tbody tr input').nth(0).fill(`10.4321/${sc.t}x`);
                takeTraffic(); await takeNotes();
                await rx.getByRole('button', {name: 'Save', exact: true}).click();
                await rx.getByRole('button', {name: 'Edit', exact: true}).waitFor({timeout: 15000}).catch(() => {});
                await idle(page); await sleep(1200);
                out.X.typed = {traffic: takeTraffic(), notes: await takeNotes(), after: await expanded(id)};
                out.X.db = dbDois(sc.X);
            }
            if (sc.E) {
                await signInAs(sc.E.mgr, sc.E.path);
                await gotoDois(sc.E.path);
                out.E = {rows: await rowsText()};
                for (const k of ['e1', 'e2']) out.E[k] = await expand(sc.E.subs[k].id);
                await snap('agency-e-same-made-doi');
                out.E.db = dbDois(sc.E);
            }
            record('agency-summary', out);
            log('[agency]', JSON.stringify(out).slice(0, 4000));
        });

        // =========================================================================================
        // omp1 (OMP): F with "Files" alone; C with Monographs + Files.
        if (on('omp1') && isOMP) await sect('omp1', async () => {
            const F = sc.F;
            const out = {};
            await signInAs(F.mgr, F.path);
            await page.goto(ctxUrl('/submissions', F.path)); await idle(page);
            out.sideMenuDois = await page.getByRole('link', {name: 'DOIs', exact: true}).count();
            await gotoDois(F.path);
            out.F = {tabs: await page.getByRole('tab').allInnerTexts(), h: await page.locator('main h1:visible, .doiListPanel:visible h2').allInnerTexts(),
                rows: await rowsText(), main: flat(await page.locator('main').innerText(), 800), menu: await openBulk()};
            await snap('omp1-files-alone');
            await closeBulk();
            out.F.db = psql(app, `select sf.submission_file_id, sf.submission_id, sf.file_stage, d.doi from submission_files sf left join dois d on d.doi_id=sf.doi_id where sf.submission_id in (select submission_id from submissions where context_id=${F.id})`);
            out.F.search = await search('Otter');
            await signInAs(C.mgr);
            await gotoDois();
            out.C = {pub1: await expand(C.subs.pub1.id), prod: await expand(C.subs.prod.id)};
            await snap('omp1-c-file-rows');
            record('omp1-summary', out);
            log('[omp1]', JSON.stringify(out).slice(0, 3000));
        });

        // =========================================================================================
        // paging: Rule 23, and Select All on a page.
        if (on('paging')) await sect('paging', async () => {
            const P = sc.P;
            await signInAs(P.mgr, P.path);
            await gotoDois(P.path);
            const out = {page1: (await rowsText()).length, pager: flat(await panel().locator('.listPanel__footer, .pkpPagination').first().innerText().catch(() => null), 300)};
            await snap('paging-1');
            await loc(page, 'DOIs page: pagination', panel().locator('.pkpPagination, nav').first());
            await openBulk();
            await bulkItem('Select All').click(); await sleep(500);
            out.selectAllTicked = (await tickedIds()).length;
            out.menuAfter = await openBulk();
            await closeBulk();
            const next = panel().getByRole('button', {name: /Page 2|Go to Next|^2$/}).first();
            out.pagerButtons = await panel().getByRole('navigation').getByRole('button').evaluateAll((els) => els.map((b) => `${b.innerText.trim()}|${b.getAttribute('aria-label')}`)).catch(() => null);
            out.nextCount = await next.count();
            await next.click().catch((e) => { out.nextErr = String(e.message).slice(0, 100); });
            await idle(page); await sleep(1200);
            out.page2 = (await rowsText()).map((r) => r.text);
            out.tickedOnPage2 = (await tickedIds()).length;
            await snap('paging-2');
            record('paging-summary', out);
            log('[paging]', JSON.stringify(out).slice(0, 2000));
        });

        // =========================================================================================
        // roles: the editor (manager level, OJS/OMP) and the site admin on C: same controls?
        if (on('roles')) await sect('roles', async () => {
            const out = {};
            for (const u of [C.ed, 'admin'].filter(Boolean)) {
                await signInAs(u);
                await gotoDois();
                out[u] = {tabs: await page.getByRole('tab').allInnerTexts(), headerButtons: await panel().locator('.pkpHeader').first().getByRole('button').allInnerTexts(),
                    menu: await openBulk(), rows: (await rowsText()).length};
                await closeBulk();
                out[u].exp = await expand(C.subs.pub2.id);
                await snap(`roles-${u === 'admin' ? 'admin' : 'editor'}`);
            }
            record('roles-summary', out);
            log('[roles]', JSON.stringify(out).slice(0, 3000));
        });

        // =========================================================================================
        // leave: an unsaved edit left by switching tab (OJS) and by leaving the page.
        if (on('leave')) await sect('leave', async () => {
            await signInAs(C.mgr);
            await gotoDois();
            const out = {dialogs: []};
            const onDialog = async (d) => { out.dialogs.push({type: d.type(), message: d.message()}); await d.accept().catch(() => {}); };
            page.on('dialog', onDialog);
            const id = C.subs.pub2.id;
            await expand(id);
            const r = rowOf(id);
            const before = await r.locator('.listPanel__itemExpanded tbody tr input').nth(0).inputValue();
            await r.getByRole('button', {name: 'Edit', exact: true}).click(); await sleep(300);
            await r.locator('.listPanel__itemExpanded tbody tr input').nth(0).fill(`10.1234/${sc.t}unsaved`);
            await r.locator('.listPanel__itemExpanded tbody tr input').nth(0).blur();
            takeTraffic();
            if (isOJS) {
                await page.getByRole('tab', {name: 'Issues', exact: true}).click(); await sleep(800);
                await page.getByRole('tab', {name: 'Articles', exact: true}).click(); await sleep(800);
                out.afterTabSwitch = {value: await r.locator('.listPanel__itemExpanded tbody tr input').nth(0).inputValue().catch(() => null),
                    buttons: await r.locator('.listPanel__itemExpanded button').allInnerTexts().catch(() => null)};
                await snap('leave-after-tab-switch');
            }
            // collapse and reopen the row
            await r.getByRole("button", {name: new RegExp(`details about ${id}$`)}).click(); await sleep(400);
            await r.getByRole("button", {name: new RegExp(`details about ${id}$`)}).click(); await sleep(400);
            out.afterCollapse = {value: await r.locator('.listPanel__itemExpanded tbody tr input').nth(0).inputValue().catch(() => null),
                buttons: await r.locator('.listPanel__itemExpanded button').allInnerTexts().catch(() => null)};
            await page.goto(ctxUrl('/submissions')); await idle(page);
            out.leftTo = page.url().replace(/^https?:\/\/[^/]+/, '');
            out.trafficOnLeave = takeTraffic();
            await gotoDois(); await expand(id);
            out.back = {value: await rowOf(id).locator('.listPanel__itemExpanded tbody tr input').nth(0).inputValue(), before};
            await snap('leave-back');
            page.off('dialog', onDialog);
            record('leave-summary', out);
            log('[leave]', JSON.stringify(out).slice(0, 2000));
        });

        // =========================================================================================
        // error (OJS, OPS on A): a deposit that fails at the dead proxy, so a row reads "Error" with its "View Error" (Rule 17).
        // Runs the fleet's queued jobs (php lib/pkp/tools/jobs.php run) once.
        if (on('error') && sc.A && !done('error')) await sect('error', async () => {
            const out = {};
            const A = sc.A;
            await signInAs(A.mgr, A.path);
            await gotoDois(A.path);
            const id = A.subs.a1.id;
            await expand(id);
            const ra = rowOf(id);
            await ra.getByRole('button', {name: 'Deposit DOI(s)'}).click();
            const dlg = page.getByRole('dialog').filter({hasText: 'Deposit DOIs'}).last();
            await dlg.waitFor({timeout: 10000}).catch(() => {});
            out.confirm = await dialogText();
            await dlg.getByRole('button', {name: 'Deposit DOIs', exact: true}).click();
            await idle(page); await sleep(1500);
            out.afterQueue = {notes: await takeNotes(), traffic: takeTraffic(), exp: await expanded(id), db: dbDois(A)};
            const root = path.resolve(__dirname, '../../../../..', 'checkouts', app.name);
            try {
                out.jobs = flat(execFileSync('php', ['lib/pkp/tools/jobs.php', 'run'], {cwd: root, env: {...process.env, PKP_CONFIG_FILE: path.join(root, 'config.test.inc.php')}, encoding: 'utf8', timeout: 240000}), 400);
            } catch (e) { out.jobsErr = flat(e.message, 400); }
            out.dbAfterJobs = dbDois(A);
            await gotoDois(A.path);
            out.rowAfter = (await rowsText()).find((x) => x.id.endsWith(`-${id}`));
            out.exp = await expand(id);
            await snap('error-row');
            const ve = ra.locator('.listPanel__itemExpanded tbody tr').first().getByRole('button', {name: 'View Error'});
            out.viewErrorInRow = await ve.count();
            await loc(page, 'DOIs page: a row\'s View Error link (status Error)', ve);
            if (out.viewErrorInRow) {
                await ve.click(); await sleep(800);
                out.viewErrorDialog = await dialogText();
                await snap('error-view-error-dialog');
                await page.getByRole('dialog').getByRole('button', {name: 'OK', exact: true}).last().click().catch(() => {});
            }
            record('error-summary', out);
            log('[error]', JSON.stringify(out).slice(0, 3000));
            markDone('error');
        });

        // =========================================================================================
        // draft: an unfinished draft started on screen by an Author (wizard start page, "Begin Submission"): listed? (q17)
        if (on('draft') && !done('draft')) await sect('draft', async () => {
            const out = {};
            await signInAs(C.au1);
            await page.goto(ctxUrl('/submission'));
            await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: T});
            await idle(page);
            const body = page.frameLocator('iframe.tox-edit-area__iframe').first().locator('body');
            await body.click();
            await body.fill('Manatee screen draft');
            for (const box of [page.getByRole('checkbox', {name: /meets all of these requirements/}), page.getByRole('checkbox', {name: /agree to have my data collected/})]) {
                if (await box.count()) await box.check();
            }
            const radios = await page.getByRole('radio').evaluateAll((els) => els.map((e) => ({name: e.name, checked: e.checked})));
            const groups = {};
            for (const r of radios) (groups[r.name] ||= []).push(r);
            for (const [g, list] of Object.entries(groups)) if (!list.some((r) => r.checked)) await page.locator(`input[type=radio][name="${g}"]`).first().check();
            await page.getByRole('button', {name: 'Begin Submission'}).click();
            await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45000});
            out.draftId = Number(new URL(page.url()).searchParams.get('id'));
            sc.screenDraft = out.draftId; save();
            await idle(page);
            await snap('draft-started');
            out.db = psql(app, `select submission_id, stage_id, status, date_submitted, submission_progress from submissions where submission_id=${out.draftId}`);
            await signInAs(C.mgr);
            await gotoDois();
            out.rows = (await rowsText()).map((r) => r.text);
            out.listed = await rowOf(out.draftId).count();
            if (out.listed) out.exp = await expand(out.draftId);
            await snap('draft-dois-page');
            record('draft-summary', out);
            log('[draft]', JSON.stringify(out).slice(0, 2000));
            markDone('draft');
        });

        // =========================================================================================
        // log: Side effects "Nothing is logged or mailed" after the phases above.
        if (on('log')) await sect('log', async () => {
            await signInAs(C.mgr);
            const out = {mail0: sc.mail0, mail1: await mailCounts()};
            out.eventLog = psql(app, `select assoc_id, event_type, message, date_logged, user_id from event_log where assoc_type=1048585 and assoc_id in (${Object.values(C.subs).map((s) => s.id).join(',')}) and date_logged > now() - interval '3 hours' order by date_logged`);
            out.notifications = psql(app, `select n.type, n.assoc_type, n.assoc_id, n.user_id, n.date_created from notifications n where n.context_id=${C.id} and n.date_created > (select min(date_submitted) from submissions where context_id=${C.id}) + interval '2 minutes' order by n.date_created`);
            for (const k of ['pub3', 'pub2', 'pub4', 'prod']) {
                await page.goto(ctxUrl(`/dashboard/editorial?workflowSubmissionId=${C.subs[k].id}`));
                await idle(page); await sleep(1500);
                const b = page.getByRole('button', {name: 'Activity Log', exact: true}).first();
                if (await b.count()) {
                    await b.click();
                    const d = page.getByRole('dialog').filter({hasText: 'Activity Log'}).last();
                    await d.getByText('Event', {exact: true}).first().waitFor({timeout: T}).catch(() => {});
                    await idle(page); await sleep(800);
                    out[`log-${k}`] = await d.getByRole('row').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => null);
                    await snap(`log-${k}`);
                    await d.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
                } else out[`log-${k}`] = 'no Activity Log button';
            }
            record('log-summary', out);
            log('[log]', JSON.stringify(out).slice(0, 4000));
        });
    } finally {
        await close();
    }
});
