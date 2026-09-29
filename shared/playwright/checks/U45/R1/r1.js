const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U45 claim check, revision chunk R1: the DOIs page's "Monographs" tab on a press (chapter and publication-format rows).
// Spec: docs/specs/U45-dois.md Purpose 26–32; Fields 141; Rule 4 rows 186–187; Rule 17 329–330; Rule 21 368–369;
// Rule 22 376–377; Rules 45–47 649–681; Rule 49 696–703; Rules 51–52 713–727; register A11, OMP1.
//
// OMP scratch presses (tag prefix u45r1, one set per RUN):
//   P1 (q27, q29) four kinds, prefix 10.1234, "Upon publication": B1 published, chapters "Tides" (page) then
//      "Harbours" (no page), formats "PDF" (file) then "EPUB" (no file).
//   P2 (q28) Monographs+Chapters+Formats, "Upon publication": pub (published), copy (Copyediting), sub (Submission),
//      each with "Tides" (page) and "PDF" (file); kinds switched on screen: Monographs alone (mark own Registered),
//      Chapters alone, Formats alone, Files alone.
//   P3 (q31) acronym JPK, Chapters+Formats+Monographs, "Upon publication", Custom pattern %p.%m / %p.%m.c%c /
//      %p.%m.f%f.%c, Publisher ID on for chapters and formats: J1 published; J2 at Copyediting (patterns with %x, a
//      Publisher ID typed on "Tides", "Assign DOIs"); J3 published under "None".
//   P4 (q33) four kinds, "Never": books A–F published with "Tides" (page), "Harbours", "PDF" (file); DOIs typed by hand.
//   P5 (q34) four kinds, "Never": K1 (Production, published) marks, unpublish, publish again, a new version;
//      K2 (published) marked with "Chapters" unticked.
// OJS / OPS controls (read-only claims' other ends): C prefix, "Upon publication", work + galley published;
//   N the same under "None".
//
//   RUN=a PROBE_FEATURE=U45 PROBE_AGENT=ccR1 node bin/probe.js all shared/playwright/checks/U45/R1/r1.js
//   RUN=b … (a second, independent run: its own presses, its own facts names)
//   PHASES=seed,setup,rows,page47,alone,pattern,filters,marks,newver,leave,ctl (default all). State in
//   r1-state-<RUN>-<app>.json; each mutating phase runs once per state file. No assertions: the script records.
// Database reads (psql SELECT) are evidence only; nothing is written there.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const RUN = process.env.RUN || 'a';
const ALL = ['seed', 'setup', 'rows', 'page47', 'alone', 'pattern', 'filters', 'marks', 'newver', 'leave', 'ctl'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log(...a);
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 600));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const T = 30000;

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
        record(`${RUN}-${name}-FAILED`, {error: String(e.stack || e).slice(0, 2000)});
    }
}

forEachApp(async (app) => {
    const sf = path.join(outDir(), `r1-state-${RUN}-${app.name}.json`);
    const S = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(S, null, 2));
    const isOMP = app.name === 'omp';
    const done = (p) => (S.done || []).includes(p);
    const markDone = (p) => { S.done = [...(S.done || []), p]; save(); };
    const fact = (name, data) => record(`${RUN}-fact-${name}`, data);

    // ---- seed ---------------------------------------------------------------------------------
    if (on('seed') && !S.t) {
        const t = tag(`u45r1${RUN}`);
        S.t = t;
        S.mgr = `${t}mgr`;
        S.au = `${t}au`;
        S.errors = {};
        save();
        let first = true;
        const mkCtx = async (key, extra) => {
            const p = `${t}${key.toLowerCase()}`;
            const users = first
                ? [{username: S.mgr, roles: ['manager'], givenName: 'Mira', familyName: 'Manager'},
                    {username: S.au, roles: ['author'], givenName: 'Ada', familyName: 'Lovelace'}]
                : [{username: S.mgr, roles: ['manager']}, {username: S.au, roles: ['author']}];
            const {context, ...rest} = extra;
            try {
                const res = await app.api.createContext({tag: p, context: {name: `U45 R1 ${key} ${t}`, contactName: 'R1 Contact',
                    contactEmail: `${p}c@mail.test`, ...(context || {})}, users, ...rest});
                first = false;
                S[key] = {path: res.path || p, id: res.contextId, p, books: {}};
            } catch (e) {
                S.errors[key] = flat(e.message, 800);
                log(`[seed ctx ${key}]`, S.errors[key]);
            }
            save();
            return S[key];
        };
        const mkBook = async (C, key, spec) => {
            if (!C) return;
            try {
                const r = await app.api.createSubmission({tag: `${C.p}${key}`, context: C.path, submitter: S.au, ...spec});
                C.books[key] = {id: r.submissionId, publicationId: r.publicationId, title: spec.title,
                    chapters: r.chapters || null, formats: r.publicationFormats || null};
            } catch (e) {
                S.errors[`${C.p}${key}`] = flat(e.message, 800);
                log(`[seed ${key}]`, S.errors[`${C.p}${key}`]);
            }
            save();
        };
        if (isOMP) {
            const four = ['publication', 'chapter', 'representation', 'file'];
            const tidesHarbours = [{title: 'Tides', page: true}, {title: 'Harbours'}];
            const pdf = {name: 'PDF', file: 'article.pdf'};
            const P1 = await mkCtx('P1', {doiPrefix: '10.1234', enabledDoiTypes: four, doiCreationTime: 'publication'});
            await mkBook(P1, 'b1', {title: 'Estuary field notes', published: true, chapters: tidesHarbours,
                publicationFormats: [pdf, {name: 'EPUB'}]});
            const P2 = await mkCtx('P2', {doiPrefix: '10.1234', enabledDoiTypes: ['publication', 'chapter', 'representation'],
                doiCreationTime: 'publication'});
            const oneEach = {chapters: [{title: 'Tides', page: true}], publicationFormats: [pdf]};
            await mkBook(P2, 'sub', {title: 'Lagoon submission book', ...oneEach});
            await mkBook(P2, 'copy', {title: 'Lagoon copyediting book', decisions: ['skipExternalReview'], ...oneEach});
            await mkBook(P2, 'pub', {title: 'Lagoon published book', published: true, ...oneEach});
            const P3 = await mkCtx('P3', {context: {acronym: 'JPK'}, doiPrefix: '10.1234',
                enabledDoiTypes: ['publication', 'chapter', 'representation'], doiCreationTime: 'publication',
                doiSuffixType: 'customPattern', doiPublicationSuffixPattern: '%p.%m', doiChapterSuffixPattern: '%p.%m.c%c',
                doiRepresentationSuffixPattern: '%p.%m.f%f.%c', enablePublisherId: ['chapter', 'representation']});
            await mkBook(P3, 'j1', {title: 'Pattern book one', published: true, chapters: [{title: 'Tides', page: true}],
                publicationFormats: [pdf]});
            await mkBook(P3, 'j2', {title: 'Pattern book two', decisions: ['skipExternalReview'],
                chapters: [{title: 'Tides', page: true}, {title: 'Shoals', page: true}], publicationFormats: [pdf, {name: 'EPUB'}]});
            const P4 = await mkCtx('P4', {doiPrefix: '10.1234', enabledDoiTypes: four, doiCreationTime: 'never'});
            for (const k of ['a', 'b', 'c', 'd', 'e', 'f']) {
                await mkBook(P4, k, {title: `Filter book ${k.toUpperCase()}`, published: true, chapters: tidesHarbours, publicationFormats: [pdf]});
            }
            const P5 = await mkCtx('P5', {doiPrefix: '10.1234', enabledDoiTypes: four, doiCreationTime: 'never'});
            await mkBook(P5, 'k1', {title: 'Marks book one', decisions: ['skipExternalReview', 'sendToProduction'], published: true,
                chapters: [{title: 'Tides', page: true}], publicationFormats: [pdf]});
            await mkBook(P5, 'k2', {title: 'Marks book two', published: true, chapters: [{title: 'Tides', page: true}], publicationFormats: [pdf]});
            const ids = ['P1', 'P2', 'P3', 'P4', 'P5'].filter((k) => S[k]).map((k) => S[k].id).join(',');
            S.seedDois = psql(app, `select s.context_id, s.submission_id, 'pub' k, p.publication_id, d.doi, d.status from submissions s join publications p on p.submission_id=s.submission_id left join dois d on d.doi_id=p.doi_id where s.context_id in (${ids})
                union all select s.context_id, s.submission_id, 'ch:'||c.chapter_id, c.publication_id, d.doi, d.status from submissions s join publications p on p.submission_id=s.submission_id join submission_chapters c on c.publication_id=p.publication_id left join dois d on d.doi_id=c.doi_id where s.context_id in (${ids})
                union all select s.context_id, s.submission_id, 'fmt:'||f.publication_format_id, f.publication_id, d.doi, d.status from submissions s join publications p on p.submission_id=s.submission_id join publication_formats f on f.publication_id=p.publication_id left join dois d on d.doi_id=f.doi_id where s.context_id in (${ids}) order by 1,2,3`);
        } else {
            const kinds = ['publication', 'representation'];
            const gFile = app.name === 'ops' ? 'preprint.pdf' : 'article.pdf';
            const C = await mkCtx('C', {doiPrefix: '10.1234', enabledDoiTypes: kinds, doiCreationTime: 'publication'});
            await mkBook(C, 'w1', {title: 'Control article one', published: true, galleys: [{label: 'PDF', file: gFile}]});
            await mkBook(C, 'w2', {title: 'Control article two', published: true, galleys: [{label: 'PDF', file: gFile}]});
            const N = await mkCtx('N', {doiPrefix: '10.1234', enabledDoiTypes: kinds, doiCreationTime: 'publication', doiSuffixType: 'none'});
            await mkBook(N, 'w1', {title: 'None article', published: true, galleys: [{label: 'PDF', file: gFile}]});
            const ids = ['C', 'N'].filter((k) => S[k]).map((k) => S[k].id).join(',');
            S.seedDois = psql(app, `select s.context_id, s.submission_id, 'pub', d.doi, d.status from submissions s join publications p on p.submission_id=s.submission_id left join dois d on d.doi_id=p.doi_id where s.context_id in (${ids})
                union all select s.context_id, s.submission_id, 'galley:'||g.galley_id, d.doi, d.status from submissions s join publications p on p.submission_id=s.submission_id join publication_galleys g on g.publication_id=p.publication_id left join dois d on d.doi_id=g.doi_id where s.context_id in (${ids}) order by 1,2,3`);
        }
        save();
        log('[seed]', JSON.stringify({errors: S.errors, seedDois: S.seedDois}).slice(0, 3000));
    }
    if (!S.t) { log('no seed'); return; }

    const {page, close} = await launch(app);
    page.setDefaultTimeout(T);
    const ctxUrl = (ctx, p) => app.url(`/index.php/${ctx.path}${p}`);
    let seq = 0;
    const snap = async (name, extra) => {
        const s = await screen(page);
        const n = `${RUN}-${String(++seq).padStart(2, '0')}-${name}`;
        record(n, extra ? {...s, extra} : s);
        await shot(page, n).catch(() => {});
        return s;
    };
    await page.addInitScript(() => {
        window.__r1notes = [];
        const seen = new WeakSet();
        const scan = () => document.querySelectorAll('.app__notifications .pkpNotification').forEach((n) => {
            if (seen.has(n)) return;
            seen.add(n);
            const t = n.innerText.replace(/\s+/g, ' ').trim();
            if (t && t !== '× Close') window.__r1notes.push(t);
        });
        window.__r1dialogs = [];
        const seenD = new WeakSet();
        const scanD = () => document.querySelectorAll('[role="dialog"], [role="alertdialog"]').forEach((n) => {
            const t = n.innerText.replace(/\s+/g, ' ').trim();
            if (!t) return;
            if (seenD.has(n) && n.__r1t === t) return;
            seenD.add(n); n.__r1t = t;
            window.__r1dialogs.push(t.slice(0, 400));
        });
        new MutationObserver(() => { scan(); scanD(); }).observe(document, {childList: true, subtree: true, characterData: true});
    });
    const takeNotes = async () => page.evaluate(() => { const n = window.__r1notes || []; window.__r1notes = []; return n; }).catch(() => []);
    const takeDialogs = async () => page.evaluate(() => { const n = window.__r1dialogs || []; window.__r1dialogs = []; return n; }).catch(() => []);
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
    const jsDialogs = [];
    page.on('dialog', async (d) => {
        jsDialogs.push({type: d.type(), message: d.message()});
        await d.accept().catch(() => {});
    });

    let curCtx = null;
    const signInAs = async (ctx) => { curCtx = ctx; await signIn(page, S.mgr, {contextPath: ctx.path}); await idle(page); };
    // Every DOIs-page helper lands on the DOIs page first when another page is open.
    const ensureDois = async () => { if (!/\/dois(\?|#|$)/.test(page.url())) await gotoDois(curCtx); };
    // The DOIs page
    const gotoDois = async (ctx) => {
        await page.goto(ctxUrl(ctx, '/dois'));
        await idle(page);
        await page.locator('.listPanel__item--doi, .listPanel__empty').first().waitFor({timeout: 15000}).catch(() => {});
        await idle(page);
        await sleep(500);
    };
    const panel = () => page.locator('.doiListPanel:visible').first();
    const rowOf = (id) => page.locator(`[id$="-${id}"].listPanel__item--doi:visible`).first();
    const listRows = async () => page.locator('.listPanel__item--doi:visible').evaluateAll((els) => els.map((e) => ({
        id: e.id, text: e.querySelector('.listPanel__itemSummary')?.innerText.replace(/\s+/g, ' ').trim(),
        badge: e.querySelector('.listPanel__itemSummary .doiListItem__itemMetadata--badge')?.innerText.trim(),
    })));
    const listIds = async () => (await listRows()).map((r) => Number(r.id.replace(/.*-/, '')));
    const expanded = async (id) => rowOf(id).evaluate((e) => {
        const x = e.querySelector('.listPanel__itemExpanded');
        if (!x) return null;
        const table = x.querySelector('table');
        const t = (n) => (n ? n.innerText.replace(/\s+/g, ' ').trim() : null);
        const all = t(x);
        const tableText = t(table);
        return {
            text: all,
            afterTable: table ? all.slice(all.indexOf(tableText) + tableText.length).trim() : null,
            header: [...x.querySelectorAll('th')].map((c) => c.innerText.trim()),
            rows: [...x.querySelectorAll('tbody tr')].map((r) => {
                const lab = r.querySelector('td label');
                const inp = r.querySelector('input');
                return {
                    type: lab?.innerText.trim(), labelClass: lab?.className, labelColor: lab ? getComputedStyle(lab).color : null,
                    value: inp?.value, readOnly: inp?.readOnly, disabled: inp?.disabled,
                    badge: t(r.querySelector('.doiListItem__itemMetadata--badge')) || t(r.querySelectorAll('td')[2]),
                    actions: t(r.querySelectorAll('td')[3]),
                };
            }),
            buttons: [...x.querySelectorAll('button')].map((b) => ({text: b.innerText.trim(), disabled: b.disabled || b.getAttribute('aria-disabled') === 'true'})),
        };
    }).catch((err) => ({error: String(err.message).slice(0, 200)}));
    const expand = async (id) => {
        const r = rowOf(id);
        await r.waitFor({timeout: 15000}).catch(() => {});
        if (!(await r.count())) return {notListed: true};
        if (!(await r.locator('.listPanel__itemExpanded').count())) {
            await r.getByRole('button', {name: new RegExp(`^Show more details about ${id}$`)}).click();
            await r.locator('.listPanel__itemExpanded').waitFor({timeout: 10000}).catch(() => {});
            await sleep(300);
        }
        return expanded(id);
    };
    const trByLabel = (id, label) => rowOf(id).locator('.listPanel__itemExpanded tbody tr')
        .filter({has: page.locator('td label', {hasText: new RegExp(`^\\s*${esc(label)}\\s*$`)})}).first();
    // Type into rows of one book's expanded view, "Save"; read at once and after a reload.
    const editRows = async (ctx, id, map, name) => {
        curCtx = ctx;
        await ensureDois();
        await expand(id);
        const r = rowOf(id);
        await r.getByRole('button', {name: 'Edit', exact: true}).click();
        await sleep(300);
        const typeable = {};
        for (const [label, value] of Object.entries(map)) {
            const inp = trByLabel(id, label).locator('input');
            typeable[label] = await inp.evaluate((e) => ({readOnly: e.readOnly, disabled: e.disabled})).catch((e) => ({err: flat(e.message, 150)}));
            await inp.fill(value, {timeout: 4000}).catch((e) => { typeable[label].fillError = flat(e.message, 200); });
            typeable[label].valueAfterFill = await inp.inputValue().catch(() => null);
        }
        const editing = await expanded(id);
        takeTraffic(); await takeNotes();
        await r.getByRole('button', {name: 'Save', exact: true}).click();
        await r.getByRole('button', {name: 'Edit', exact: true}).waitFor({timeout: 15000}).catch(() => {});
        await idle(page); await sleep(800);
        const out = {typed: map, typeable, editing, traffic: takeTraffic(), notes: await takeNotes(), after: await expanded(id)};
        await snap(`${name}-after`);
        await gotoDois(ctx);
        out.reload = await expand(id);
        out.badgeAfterReload = (await listRows()).find((x) => x.id.endsWith(`-${id}`))?.badge;
        await snap(`${name}-reload`);
        return out;
    };
    const dialogText = async () => page.getByRole('dialog').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
    const tick = async (ids) => { for (const id of ids) await rowOf(id).locator('input[type="checkbox"]').first().check(); await sleep(200); };
    const runBulk = async (label, ids, name) => {
        await ensureDois();
        await tick(ids);
        await panel().getByRole('button', {name: 'Bulk Actions'}).click();
        await sleep(300);
        await page.locator('.pkpDropdown__action:visible', {hasText: label}).first().click();
        const dlg = page.getByRole('dialog').filter({hasText: label}).last();
        await dlg.waitFor({timeout: 10000}).catch(() => {});
        await page.locator('.pkpDropdown__action:visible').first().waitFor({state: 'detached', timeout: 10000}).catch(() => {});
        await sleep(300);
        const question = await dialogText();
        await snap(`${name}-confirm`);
        const w = page.waitForResponse((r) => r.url().includes('/dois/') && r.request().method() !== 'GET', {timeout: 20000}).catch(() => null);
        await takeNotes(); await takeDialogs();
        await dlg.getByRole('button', {name: label, exact: true}).click();
        const resp = await w;
        await idle(page); await sleep(1200);
        const after = {question, status: resp ? resp.status() : null, url: resp ? resp.url().replace(/^https?:\/\/[^/]+/, '') : null,
            body: resp && resp.status() >= 400 ? flat(await resp.text().catch(() => null), 600) : undefined,
            dialogs: await takeDialogs(), notes: await takeNotes(), rows: await listRows()};
        await snap(`${name}-after`);
        const ok = page.getByRole('dialog').getByRole('button', {name: /^(OK|Ok|Close)$/}).first();
        if (await ok.count()) { await ok.click().catch(() => {}); await sleep(600); }
        return after;
    };
    const side = () => panel().locator('.listPanel__sidebar');
    const fbtn = (name) => side().locator('button.pkpFilter__label', {hasText: new RegExp(`^\\s*${esc(name)}\\s*$`)}).first();
    const filterList = async (name, snapName) => {
        await ensureDois();
        await fbtn(name).click();
        await idle(page); await sleep(900);
        const out = {filter: name, active: await side().locator('button.pkpFilter__label.-isActive').allInnerTexts(),
            rows: (await listRows()).map((r) => r.text), ids: await listIds()};
        if (snapName) await snap(snapName);
        await fbtn(name).click();
        await idle(page); await sleep(600);
        return out;
    };
    const search = async (phrase, snapName) => {
        await ensureDois();
        const box = panel().locator('input[type="search"]');
        await box.fill(phrase);
        const w = page.waitForResponse((r) => r.request().method() === 'GET' && /\/api\/v1\/(submissions|_submissions)/.test(r.url())
            && new URL(r.url()).searchParams.get('searchPhrase') === phrase, {timeout: 20000}).catch(() => null);
        await box.press('Enter');
        const resp = await w;
        let api = null;
        if (resp) { const j = await resp.json().catch(() => null); api = {status: resp.status(), itemsMax: j && j.itemsMax, ids: j && (j.items || []).map((i) => i.id)}; }
        await idle(page); await sleep(700);
        const out = {phrase, rows: (await listRows()).map((r) => r.text), ids: await listIds(), api};
        if (snapName) await snap(snapName);
        const clear = panel().getByRole('button', {name: 'Clear search phrase'});
        if (await clear.count()) { await clear.click(); await idle(page); await sleep(500); }
        return out;
    };
    // Settings › Distribution › DOIs › Setup
    const setupPage = () => {
        const {DoiSettings} = require('../../../pages/DoisPages.js');
        return new DoiSettings(page, null);
    };
    const gotoSetup = async (ctx) => {
        await page.goto('about:blank');
        await page.goto(ctxUrl(ctx, '/management/settings/distribution#dois'));
        await idle(page);
        const s = setupPage();
        await s.openSideTab('Setup');
        await idle(page);
        return s;
    };
    const KIND_LABELS = {publication: 'Monographs', chapter: 'Chapters', representation: 'Publication Formats', file: 'Files'};
    const setKinds = async (ctx, kinds, name) => {
        const s = await gotoSetup(ctx);
        for (const [k, label] of Object.entries(KIND_LABELS)) {
            const box = s.kindBox(label);
            if (kinds.includes(k)) await box.check(); else await box.uncheck();
        }
        const resp = await s.pressSave(s.setup);
        await idle(page); await sleep(500);
        const out = {kinds, status: resp.status(), body: resp.status() >= 400 ? flat(await resp.text(), 400) : undefined,
            shown: await s.kinds(), savedStatus: await s.savedStatus(s.setup).count()};
        await snap(`${name}-setup-saved`, out);
        return out;
    };
    const bookDois = (ctx) => psql(app, `select s.submission_id, 'pub' k, p.publication_id, p.status, d.doi, d.status from submissions s join publications p on p.submission_id=s.submission_id left join dois d on d.doi_id=p.doi_id where s.context_id=${ctx.id}
        union all select s.submission_id, 'ch:'||c.chapter_id||':'||coalesce((select setting_value from submission_chapter_settings cs where cs.chapter_id=c.chapter_id and cs.setting_name='isPageEnabled'),'-'), c.publication_id, null, d.doi, d.status from submissions s join publications p on p.submission_id=s.submission_id join submission_chapters c on c.publication_id=p.publication_id left join dois d on d.doi_id=c.doi_id where s.context_id=${ctx.id}
        union all select s.submission_id, 'fmt:'||f.publication_format_id, f.publication_id, null, d.doi, d.status from submissions s join publications p on p.submission_id=s.submission_id join publication_formats f on f.publication_id=p.publication_id left join dois d on d.doi_id=f.doi_id where s.context_id=${ctx.id}
        union all select s.submission_id, 'file:'||sf.submission_file_id, null, null, d.doi, d.status from submissions s join submission_files sf on sf.submission_id=s.submission_id and sf.assoc_type=521 left join dois d on d.doi_id=sf.doi_id where s.context_id=${ctx.id} order by 1,2`);

    try {
        // =========================================================================================
        // setup: the "Items with DOIs" boxes of each app (Purpose; Rule 4's rows; the exclusivity of chapter and
        // format kinds). Read-only.
        if (on('setup')) await sect('setup', async () => {
            const ctx = isOMP ? S.P1 : S.C;
            await signInAs(ctx);
            const s = await gotoSetup(ctx);
            const out = {kinds: await s.kinds(), groupHelp: flat(await s.kindsGroup().innerText().catch(() => null), 500)};
            await snap('setup-kinds', out);
            await loc(page, 'Setup: the "Items with DOIs" group', s.kindsGroup());
            // Custom pattern group's boxes (unsaved; the page is left after)
            await s.formatRadio('Custom pattern').check();
            await sleep(400);
            out.patternBoxes = await s.patternGroup().locator('label').allInnerTexts().catch(() => null);
            out.patternHelp = flat(await s.patternGroup().innerText().catch(() => null), 900);
            await snap('setup-custom-pattern-unsaved', out);
            fact('setup', out);
            log('[setup]', JSON.stringify(out).slice(0, 1500));
        });

        // =========================================================================================
        // rows (q27): Rule 45's order, names, DOIs, badges; Rule 17's rider; typing into chapter and format boxes.
        if (isOMP && on('rows') && !done('rows')) await sect('rows', async () => {
            const P = S.P1; const B = P.books.b1;
            await signInAs(P);
            await gotoDois(P);
            await snap('p1-dois-list');
            const out = {db0: bookDois(P), seedChapters: B.chapters, seedFormats: B.formats};
            out.first = await expand(B.id);
            await snap('p1-b1-expanded');
            await loc(page, 'DOIs page: the expanded view\'s DOI table rows', rowOf(B.id).locator('.listPanel__itemExpanded tbody tr'));
            await loc(page, 'DOIs page: a chapter row\'s DOI box by its label', trByLabel(B.id, 'Tides').locator('input'));
            await loc(page, 'DOIs page: a format row\'s DOI box', trByLabel(B.id, 'Format / PDF').locator('input'));
            out.emptyPdf = await editRows(P, B.id, {'Format / PDF': ''}, 'p1-empty-format');
            out.typePdf = await editRows(P, B.id, {'Format / PDF': `10.1234/fmt-pdf-${S.t}`}, 'p1-type-format');
            out.emptyTides = await editRows(P, B.id, {Tides: ''}, 'p1-empty-chapter');
            out.typeTides = await editRows(P, B.id, {Tides: `10.1234/ch-tides-${S.t}`}, 'p1-type-chapter');
            out.db1 = bookDois(P);
            // The format order: save "PDF" from its "Edit" window on the Publication Formats page.
            const {PublicationFormatsPage} = require('../../../../../apps/omp/playwright/pages/PublicationFormatPages.js');
            const pf = new PublicationFormatsPage(page, P.path);
            await pf.gotoEditorial(B.id, B.publicationId);
            await idle(page);
            out.formatsPageBefore = flat(await page.locator('[id^="component-grid-catalogentry-publicationformatgrid"]').first().innerText().catch(() => null), 800);
            await snap('p1-formats-page-before');
            const win = await pf.openEdit('PDF');
            const w = page.waitForResponse((r) => /update-format/i.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            await win.ok();
            out.formatSave = (await w)?.status() || null;
            await idle(page); await sleep(800);
            await pf.gotoEditorial(B.id, B.publicationId);
            await idle(page);
            out.formatsPageAfter = flat(await page.locator('[id^="component-grid-catalogentry-publicationformatgrid"]').first().innerText().catch(() => null), 800);
            await snap('p1-formats-page-after-pdf-save');
            await gotoDois(P);
            out.afterFormatSave = await expand(B.id);
            await snap('p1-b1-after-format-save');
            // The chapter order: "Order" on the Chapters page, "Harbours" dragged above "Tides", "Done".
            const {ChaptersPage} = require('../../../../../apps/omp/playwright/pages/ChapterPages.js');
            const cp = new ChaptersPage(page, P.path);
            await cp.gotoEditorial(B.id, B.publicationId);
            await snap('p1-chapters-page');
            out.chaptersBefore = await cp.list.titleCells().allInnerTexts().catch(() => null);
            try {
                await cp.list.startOrdering();
                const from = cp.list.chapterRow('Harbours').locator('td').first();
                const to = cp.list.chapterRow('Tides');
                const a = await from.boundingBox(); const b = await to.boundingBox();
                await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
                await page.mouse.down();
                await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2 - 5, {steps: 5});
                await page.mouse.move(b.x + b.width / 2, b.y + 2, {steps: 25});
                await page.mouse.up();
                await sleep(400);
                await cp.list.finishOrdering();
                out.orderDone = true;
            } catch (e) { out.orderError = flat(e.message, 300); }
            await cp.gotoEditorial(B.id, B.publicationId);
            out.chaptersAfter = await cp.list.titleCells().allInnerTexts().catch(() => null);
            await snap('p1-chapters-page-after-order');
            await gotoDois(P);
            out.afterChapterOrder = await expand(B.id);
            await snap('p1-b1-after-chapter-order');
            out.db2 = bookDois(P);
            out.seq = psql(app, `select chapter_id, seq from submission_chapters where publication_id=${B.publicationId} order by seq`);
            fact('rows', out);
            markDone('rows');
            log('[rows]', JSON.stringify(out).slice(0, 4000));
        });

        // =========================================================================================
        // page47 (q29): Rule 47, Fields 141 — a chapter without its page: greyed, the note, "Assign DOIs".
        if (isOMP && on('page47') && !done('page47')) await sect('page47', async () => {
            const P = S.P1; const B = P.books.b1;
            await signInAs(P);
            await gotoDois(P);
            const out = {};
            out.view = await expand(B.id);
            const r = rowOf(B.id);
            await r.getByRole('button', {name: 'Edit', exact: true}).click();
            await sleep(300);
            const hb = trByLabel(B.id, 'Harbours').locator('input');
            out.harboursEditing = await hb.evaluate((e) => ({readOnly: e.readOnly, disabled: e.disabled})).catch((e) => flat(e.message));
            await hb.fill('10.1234/typed', {timeout: 3000}).catch((e) => { out.harboursFillError = flat(e.message, 200); });
            await hb.pressSequentially('x', {timeout: 3000}).catch(() => {});
            out.harboursValueAfterTyping = await hb.inputValue().catch(() => null);
            out.editingView = await expanded(B.id);
            await snap('p1-harbours-editing');
            await loc(page, 'DOIs page: the note under the table', rowOf(B.id).getByText('Chapters without a landing page cannot have a DOI.', {exact: true}));
            takeTraffic();
            await r.getByRole('button', {name: 'Save', exact: true}).click();
            await sleep(1200); await idle(page);
            out.saveTraffic = takeTraffic(); out.saveNotes = await takeNotes();
            // Tick "Harbours"'s Chapter Page.
            const {ChaptersPage} = require('../../../../../apps/omp/playwright/pages/ChapterPages.js');
            const cp = new ChaptersPage(page, P.path);
            const setPage = async (want, name) => {
                await cp.gotoEditorial(B.id, B.publicationId);
                const win = await cp.list.openEdit('Harbours');
                const box = win.chapterPageBox();
                const st = {before: await box.isChecked(), enabledBefore: await box.isEnabled(), note: await win.doiNote().count()};
                await snap(`${name}-window`, st);
                if (st.enabledBefore) { if (want) await box.check(); else await box.uncheck(); }
                st.afterClick = await box.isChecked();
                await win.save().catch((e) => { st.saveError = flat(e.message, 200); });
                return st;
            };
            out.tick = await setPage(true, 'p1-harbours-page-tick');
            await gotoDois(P);
            out.afterTick = await expand(B.id);
            await rowOf(B.id).getByRole('button', {name: 'Edit', exact: true}).click();
            await sleep(300);
            out.afterTickEditable = await hb.evaluate((e) => ({readOnly: e.readOnly, disabled: e.disabled})).catch((e) => flat(e.message));
            await snap('p1-after-tick-editing');
            await rowOf(B.id).getByRole('button', {name: 'Save', exact: true}).click();
            await sleep(800);
            out.untick = await setPage(false, 'p1-harbours-page-untick');
            await gotoDois(P);
            out.afterUntick = await expand(B.id);
            out.assign = await runBulk('Assign DOIs', [B.id], 'p1-assign-harbours-only');
            await gotoDois(P);
            out.afterAssign = await expand(B.id);
            out.dbAfterAssign = bookDois(P);
            await snap('p1-after-assign');
            // "or that already has a DOI": tick, type a DOI, untick.
            out.tick2 = await setPage(true, 'p1-harbours-page-tick2');
            out.typeHarbours = await editRows(P, B.id, {Harbours: `10.1234/ch-harbours-${S.t}`}, 'p1-type-harbours');
            out.untick2 = await setPage(false, 'p1-harbours-page-untick-with-doi');
            await cp.gotoEditorial(B.id, B.publicationId);
            const win = await cp.list.openEdit('Harbours');
            out.windowAfterUntick2 = {checked: await win.chapterPageBox().isChecked(), enabled: await win.chapterPageBox().isEnabled(), note: await win.doiNote().count()};
            await snap('p1-harbours-window-with-doi', out.windowAfterUntick2);
            await win.cancel().catch(() => {});
            await gotoDois(P);
            out.afterUntick2 = await expand(B.id);
            await snap('p1-after-untick-with-doi');
            out.db = bookDois(P);
            fact('page47', out);
            markDone('page47');
            log('[page47]', JSON.stringify(out).slice(0, 4000));
        });

        // =========================================================================================
        // alone (q28): Rule 46, Rule 4's "Listed on" — each new kind alone lists the books; the badge.
        if (isOMP && on('alone') && !done('alone')) await sect('alone', async () => {
            const P = S.P2; const Bk = P.books;
            await signInAs(P);
            const out = {db0: bookDois(P)};
            const read = async (label) => {
                await gotoDois(P);
                const o = {tabs: await page.getByRole('tab').allInnerTexts().catch(() => null), rows: await listRows(), views: {}};
                for (const k of ['pub', 'copy', 'sub']) if (Bk[k]) o.views[k] = await expand(Bk[k].id);
                await snap(`p2-${label}`);
                return o;
            };
            out.threeKinds = await read('three-kinds');
            out.monoOnly = await setKinds(P, ['publication'], 'p2-mono');
            out.markOwn = await runBulk('Mark DOIs Registered', [Bk.pub.id], 'p2-mark-own-registered');
            out.monoRead = await read('mono-alone');
            out.chOnly = await setKinds(P, ['chapter'], 'p2-chapters');
            out.chRead = await read('chapters-alone');
            out.fmtOnly = await setKinds(P, ['representation'], 'p2-formats');
            out.fmtRead = await read('formats-alone');
            out.fileOnly = await setKinds(P, ['file'], 'p2-files');
            out.fileRead = await read('files-alone');
            out.restore = await setKinds(P, ['publication', 'chapter', 'representation'], 'p2-restore');
            out.db1 = bookDois(P);
            fact('alone', out);
            markDone('alone');
            log('[alone]', JSON.stringify(out).slice(0, 4000));
        });

        // =========================================================================================
        // pattern (q31): Rule 49 — custom patterns for chapters and formats, %x, the emptied box, "None".
        if (isOMP && on('pattern') && !done('pattern')) await sect('pattern', async () => {
            const P = S.P3; const Bk = P.books;
            await signInAs(P);
            const out = {db0: bookDois(P), seed: {j1: Bk.j1, j2: Bk.j2}};
            await gotoDois(P);
            out.j1 = await expand(Bk.j1.id);
            await snap('p3-j1-expanded');
            // The addresses on the book page: chapter page and format download link.
            await page.goto(ctxUrl(P, `/catalog/book/${Bk.j1.id}`));
            await idle(page);
            out.bookLinks = await page.locator('a[href*="/chapter/"], a[href*="/catalog/view/"]').evaluateAll((as) => as.map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})));
            await snap('p3-j1-book-page', {links: out.bookLinks});
            // The emptied "Chapters" box.
            const s = await gotoSetup(P);
            out.patternShown = {};
            for (const l of ['Submissions', 'Chapters', 'Publication Formats', 'Files']) out.patternShown[l] = await s.patternBox(l).inputValue().catch((e) => `absent: ${flat(e.message, 80)}`);
            await s.patternBox('Chapters').fill('');
            let resp = await s.pressSave(s.setup);
            await idle(page); await sleep(500);
            out.emptyChapters = {status: resp.status(), error: await s.fieldError(s.patternBox('Chapters')).allInnerTexts().catch(() => null),
                footer: flat(await s.setup.locator('.pkpFormPage__footer, .pkpForm__footer').first().innerText().catch(() => null), 300)};
            await snap('p3-empty-chapters-refused', out.emptyChapters);
            await loc(page, 'Setup: the error under the "Chapters" pattern box', s.fieldError(s.patternBox('Chapters')));
            // Patterns with %x, then the Publisher ID on "Tides" of J2 and "Assign DOIs".
            await s.patternBox('Chapters').fill('%p.c%c.%x');
            await s.patternBox('Publication Formats').fill('%p.f%f.%x');
            resp = await s.pressSave(s.setup);
            await idle(page); await sleep(500);
            out.xSave = resp.status();
            await snap('p3-x-patterns-saved');
            const {ChaptersPage} = require('../../../../../apps/omp/playwright/pages/ChapterPages.js');
            const cp = new ChaptersPage(page, P.path);
            await cp.gotoEditorial(Bk.j2.id, Bk.j2.publicationId);
            const win = await cp.list.openEdit('Tides');
            const top = page.getByRole('dialog', {name: 'Edit Chapter', exact: true});
            out.chapterTabs = await top.getByRole('tab').allInnerTexts().catch(() => null);
            await top.getByRole('tab', {name: 'Identifiers', exact: true}).click();
            await idle(page);
            const form = top.locator('#publicIdentifiersForm').first();
            await form.waitFor({timeout: 20000}).catch(() => {});
            await snap('p3-tides-identifiers-tab');
            await form.locator('input[name="publisherId"]').fill(`tpid${RUN}`);
            const pw = page.waitForResponse((r) => r.request().method() === 'POST' && /identifiers|update-identifiers|updateIdentifiers/i.test(r.url()), {timeout: T}).catch(() => null);
            await form.getByRole('button', {name: 'Save', exact: true}).click();
            const pr = await pw;
            out.pidSave = pr ? {status: pr.status(), url: pr.url().replace(/^https?:\/\/[^/]+/, ''), body: flat(await pr.text().catch(() => null), 300)} : null;
            await idle(page); await sleep(600);
            await snap('p3-tides-pid-saved');
            if (await top.count()) await top.getByRole('button', {name: 'Close'}).first().click().catch(() => {});
            await sleep(600);
            out.pidDb = psql(app, `select c.chapter_id, cs.setting_name, cs.setting_value from submission_chapters c join submission_chapter_settings cs on cs.chapter_id=c.chapter_id where c.publication_id=${Bk.j2.publicationId} and cs.setting_name like 'pub-id%'`);
            await gotoDois(P);
            out.j2Before = await expand(Bk.j2.id);
            out.j2Assign = await runBulk('Assign DOIs', [Bk.j2.id], 'p3-j2-assign');
            await gotoDois(P);
            out.j2After = await expand(Bk.j2.id);
            await snap('p3-j2-after-assign');
            // "None", then a book published.
            const s2 = await gotoSetup(P);
            await s2.formatRadio('None').check();
            resp = await s2.pressSave(s2.setup);
            await idle(page); await sleep(500);
            out.noneSave = resp.status();
            await snap('p3-none-saved');
            try {
                const r = await app.api.createSubmission({tag: `${P.p}j3`, context: P.path, submitter: S.au, title: 'Pattern book three',
                    published: true, chapters: [{title: 'Tides', page: true}], publicationFormats: [{name: 'PDF', file: 'article.pdf'}]});
                Bk.j3 = {id: r.submissionId, publicationId: r.publicationId, chapters: r.chapters, formats: r.publicationFormats};
                save();
            } catch (e) { out.j3Error = flat(e.message, 400); }
            if (Bk.j3) {
                await gotoDois(P);
                out.j3 = await expand(Bk.j3.id);
                await snap('p3-j3-none-expanded');
            }
            out.db1 = bookDois(P);
            fact('pattern', out);
            markDone('pattern');
            log('[pattern]', JSON.stringify(out).slice(0, 4000));
        });

        // =========================================================================================
        // filters (q33): Rule 51, Rule 22's press rider, OMP1, Rule 21's press rider / A11 (search).
        if (isOMP && on('filters') && !done('filters')) await sect('filters', async () => {
            const P = S.P4; const Bk = P.books;
            await signInAs(P);
            const out = {};
            const d = (k, w) => `10.1234/${S.t}-${k}-${w}`;
            await gotoDois(P);
            await snap('p4-list');
            out.assignA = await runBulk('Assign DOIs', [Bk.a.id], 'p4-assign-a');
            await gotoDois(P);
            out.typeB = await editRows(P, Bk.b.id, {Monograph: d('b', 'own'), 'Format / PDF': d('b', 'pdf')}, 'p4-type-b');
            out.typeC = await editRows(P, Bk.c.id, {Monograph: d('c', 'own'), Tides: d('c', 'tides')}, 'p4-type-c');
            out.typeD = await editRows(P, Bk.d.id, {Monograph: d('d', 'own'), Tides: d('d', 'tides'), 'Format / PDF': d('d', 'pdf')}, 'p4-type-d');
            out.typeE = await editRows(P, Bk.e.id, {Tides: d('e', 'tides')}, 'p4-type-e');
            const fileLabel = (out.typeB.reload && out.typeB.reload.rows || []).map((r) => r.type).find((x) => /^PDF \//.test(x || '')) || 'PDF / article.pdf';
            out.fileLabel = fileLabel;
            out.typeF = await editRows(P, Bk.f.id, {[fileLabel]: d('f', 'file')}, 'p4-type-f');
            out.db0 = bookDois(P);
            const name = (id) => Object.entries(Bk).find(([, v]) => v.id === id)?.[0] || id;
            const names = (ids) => ids.map(name);
            await gotoDois(P);
            out.allKinds = {needs: await filterList('Needs DOI', 'p4-needs-all-kinds'), assigned: await filterList('DOI Assigned', 'p4-assigned-all-kinds')};
            out.allKinds.needs.books = names(out.allKinds.needs.ids); out.allKinds.assigned.books = names(out.allKinds.assigned.ids);
            // Chapters alone: mark A registered (its "Tides" only); then all four again: "Registered".
            out.chOnly = await setKinds(P, ['chapter'], 'p4-chapters-alone');
            await gotoDois(P);
            out.aChaptersAlone = await expand(Bk.a.id);
            out.markA = await runBulk('Mark DOIs Registered', [Bk.a.id], 'p4-mark-a-chapters-alone');
            out.four = await setKinds(P, ['publication', 'chapter', 'representation', 'file'], 'p4-four');
            await gotoDois(P);
            out.aRowsAfter = await expand(Bk.a.id);
            await snap('p4-a-after-mark');
            // F: its file DOI alone, marked registered.
            out.markF = await runBulk('Mark DOIs Registered', [Bk.f.id], 'p4-mark-f-file-only');
            await gotoDois(P);
            out.fRowsAfter = await expand(Bk.f.id);
            out.db1 = bookDois(P);
            await gotoDois(P);
            out.registeredFour = await filterList('Registered', 'p4-registered-four');
            out.registeredFour.books = names(out.registeredFour.ids);
            out.unregisteredFour = await filterList('Unregistered', 'p4-unregistered-four');
            out.unregisteredFour.books = names(out.unregisteredFour.ids);
            // "Chapters" unticked.
            out.noCh = await setKinds(P, ['publication', 'representation', 'file'], 'p4-no-chapters');
            await gotoDois(P);
            out.noChapters = {registered: await filterList('Registered', 'p4-registered-no-chapters'),
                needs: await filterList('Needs DOI', 'p4-needs-no-chapters'), assigned: await filterList('DOI Assigned', 'p4-assigned-no-chapters')};
            for (const k of Object.keys(out.noChapters)) out.noChapters[k].books = names(out.noChapters[k].ids);
            // "Publication Formats" unticked (the other end of "for the ticked kinds").
            out.noFmt = await setKinds(P, ['publication', 'chapter', 'file'], 'p4-no-formats');
            await gotoDois(P);
            out.noFormats = {needs: await filterList('Needs DOI', 'p4-needs-no-formats'), assigned: await filterList('DOI Assigned', 'p4-assigned-no-formats'),
                registered: await filterList('Registered', 'p4-registered-no-formats')};
            for (const k of Object.keys(out.noFormats)) out.noFormats[k].books = names(out.noFormats[k].ids);
            // Search (Rule 21 / A11), four kinds ticked.
            out.four2 = await setKinds(P, ['publication', 'chapter', 'representation', 'file'], 'p4-four-again');
            const aRows = {};
            for (const r of out.aRowsAfter.rows || []) aRows[r.type] = r.value;
            out.aRows = aRows;
            await gotoDois(P);
            const start = (v) => (v ? v.slice(0, v.length - 3) : null);
            const phrases = [];
            if (aRows.Tides) phrases.push(['tides-start', start(aRows.Tides)]);
            if (aRows['Format / PDF']) phrases.push(['pdf-start', start(aRows['Format / PDF'])]);
            if (aRows[fileLabel]) phrases.push(['file-start', start(aRows[fileLabel])]);
            if (aRows.Monograph) phrases.push(['own-whole', aRows.Monograph], ['own-start', start(aRows.Monograph)]);
            phrases.push(['d-own-whole', d('d', 'own')], ['e-tides-whole', d('e', 'tides')], ['prefix', '10.1234/']);
            out.search = {};
            for (const [k, ph] of phrases) { out.search[k] = await search(ph, `p4-search-${k}`); out.search[k].books = names(out.search[k].ids); }
            // Chapters unticked: the same chapter phrase.
            out.noCh2 = await setKinds(P, ['publication', 'representation', 'file'], 'p4-no-chapters-search');
            await gotoDois(P);
            if (aRows.Tides) { out.searchNoCh = await search(start(aRows.Tides), 'p4-search-tides-no-chapters'); out.searchNoCh.books = names(out.searchNoCh.ids); }
            out.restore = await setKinds(P, ['publication', 'chapter', 'representation', 'file'], 'p4-restore');
            fact('filters', out);
            markDone('filters');
            log('[filters]', JSON.stringify(out).slice(0, 5000));
        });

        // =========================================================================================
        // marks (q34): Rule 52 — the marks on chapter and format rows; unpublish and publish again.
        if (isOMP && on('marks') && !done('marks')) await sect('marks', async () => {
            const P = S.P5; const Bk = P.books;
            await signInAs(P);
            const out = {};
            await gotoDois(P);
            out.assign = await runBulk('Assign DOIs', [Bk.k1.id, Bk.k2.id], 'p5-assign');
            const rows = async (id, label) => { await gotoDois(P); const v = await expand(id); await snap(`p5-${label}`); return {badge: (await listRows()).find((x) => x.id.endsWith(`-${id}`))?.badge, rows: v && v.rows && v.rows.map((r) => `${r.type}: ${r.value} [${r.badge}]`)}; };
            out.k1Assigned = await rows(Bk.k1.id, 'k1-assigned');
            for (const [label, key] of [['Mark DOIs Registered', 'reg'], ['Mark DOIs Needs Sync', 'sync'], ['Mark DOIs Unregistered', 'unreg'], ['Mark DOIs Registered', 'reg2']]) {
                await gotoDois(P);
                out[`${key}Action`] = await runBulk(label, [Bk.k1.id], `p5-k1-${key}`);
                out[`${key}Rows`] = await rows(Bk.k1.id, `k1-${key}-rows`);
            }
            // Unpublish, then publish again.
            const pp = require('../../../../../apps/omp/playwright/pages/PublicationPages.js');
            const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
            const wf = new WorkflowPage(page, P.path);
            await wf.gotoEditorial(Bk.k1.id, {menuKey: `publication_${Bk.k1.publicationId}_titleAbstract`});
            await idle(page);
            await snap('p5-k1-workflow-published');
            try { await pp.unpublishFromWorkflow(page); out.unpublished = true; } catch (e) { out.unpublishError = flat(e.message, 300); }
            await idle(page);
            await snap('p5-k1-unpublished-workflow');
            out.unpubRows = await rows(Bk.k1.id, 'k1-after-unpublish');
            out.dbUnpub = bookDois(P);
            await wf.gotoEditorial(Bk.k1.id, {menuKey: `publication_${Bk.k1.publicationId}_titleAbstract`});
            await idle(page);
            try { await pp.publishShownVersion(page); out.republished = true; } catch (e) { out.republishError = flat(e.message, 300); }
            await idle(page);
            await snap('p5-k1-republished-workflow');
            out.repubRows = await rows(Bk.k1.id, 'k1-after-republish');
            // K2: "Chapters" unticked while marking; ticked again.
            out.noCh = await setKinds(P, ['publication', 'representation', 'file'], 'p5-no-chapters');
            await gotoDois(P);
            out.k2Mark = await runBulk('Mark DOIs Registered', [Bk.k2.id], 'p5-k2-mark-no-chapters');
            out.four = await setKinds(P, ['publication', 'chapter', 'representation', 'file'], 'p5-four');
            out.k2Rows = await rows(Bk.k2.id, 'k2-after-retick');
            out.db = bookDois(P);
            fact('marks', out);
            markDone('marks');
            log('[marks]', JSON.stringify(out).slice(0, 5000));
        });

        // newver: K1 marked Registered, a new version (DOI Versioning "No") published: the shared chapter and format DOIs.
        if (isOMP && on('newver') && !done('newver') && done('marks')) await sect('newver', async () => {
            const P = S.P5; const Bk = P.books;
            await signInAs(P);
            const out = {};
            await gotoDois(P);
            out.mark = await runBulk('Mark DOIs Registered', [Bk.k1.id], 'p5-k1-mark-before-version');
            const pp = require('../../../../../apps/omp/playwright/pages/PublicationPages.js');
            const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
            const wf = new WorkflowPage(page, P.path);
            await wf.gotoEditorial(Bk.k1.id, {menuKey: `publication_${Bk.k1.publicationId}_titleAbstract`});
            await idle(page);
            try {
                const nid = await pp.createNewVersion(page);
                out.newPublicationId = nid;
                await idle(page);
                await gotoDois(P);
                out.rowsNewUnpublished = await expand(Bk.k1.id);
                await snap('p5-k1-new-version-unpublished');
                await wf.gotoEditorial(Bk.k1.id, {menuKey: `publication_${nid}_titleAbstract`});
                await idle(page);
                await pp.publishShownVersion(page);
                out.published = true;
            } catch (e) { out.error = flat(e.message, 300); }
            await gotoDois(P);
            out.rowsAfter = await expand(Bk.k1.id);
            await snap('p5-k1-new-version-published');
            out.db = bookDois(P);
            fact('newver', out);
            markDone('newver');
            log('[newver]', JSON.stringify(out).slice(0, 3000));
        });

        // =========================================================================================
        // leave: the sweep's unsaved change on the way out (a chapter box typed, the page left; a kind ticked, left).
        if (isOMP && on('leave')) await sect('leave', async () => {
            const P = S.P1; const B = P.books.b1;
            await signInAs(P);
            await gotoDois(P);
            await expand(B.id);
            await rowOf(B.id).getByRole('button', {name: 'Edit', exact: true}).click();
            await sleep(300);
            await trByLabel(B.id, 'Format / EPUB').locator('input').fill(`10.1234/unsaved-${S.t}`);
            const before = jsDialogs.length;
            takeTraffic();
            await page.goto(ctxUrl(P, '/submissions'));
            await idle(page);
            const out = {dialogs: jsDialogs.slice(before), traffic: takeTraffic()};
            await gotoDois(P);
            out.after = await expand(B.id);
            await snap('p1-leave-after', out);
            const s = await gotoSetup(P);
            const was = await s.kindBox('Files').isChecked();
            await s.kindBox('Files').setChecked(!was);
            const b2 = jsDialogs.length;
            await page.goto(ctxUrl(P, '/dois'));
            await idle(page);
            out.setupDialogs = jsDialogs.slice(b2);
            const s2 = await gotoSetup(P);
            out.filesAfterLeave = {was, now: await s2.kindBox('Files').isChecked()};
            await snap('p1-setup-leave-after', out);
            fact('leave', out);
            log('[leave]', JSON.stringify(out).slice(0, 2000));
        });

        // =========================================================================================
        // ctl (OJS, OPS): the other ends — the expanded view's rows and no chapter note; search by a DOI's start;
        // "Needs DOI" with the galley DOI cleared; "None".
        if (!isOMP && on('ctl') && !done('ctl')) await sect('ctl', async () => {
            const C = S.C; const w1 = C.books.w1;
            await signInAs(C);
            await gotoDois(C);
            await snap('ctl-list');
            const out = {db0: psql(app, `select 1`)};
            out.w1 = await expand(w1.id);
            await snap('ctl-w1-expanded');
            const own = out.w1 && out.w1.rows && out.w1.rows[0] && out.w1.rows[0].value;
            const galley = out.w1 && out.w1.rows && out.w1.rows[1] && out.w1.rows[1].value;
            out.search = {};
            const start = (v) => (v ? v.slice(0, v.length - 3) : null);
            for (const [k, ph] of [['own-start', start(own)], ['own-whole', own], ['galley-start', start(galley)], ['prefix', '10.1234/']]) {
                if (ph) out.search[k] = await search(ph, `ctl-search-${k}`);
            }
            // The galley DOI cleared: "Needs DOI".
            const glabel = out.w1 && out.w1.rows && out.w1.rows[1] && out.w1.rows[1].type;
            if (glabel) out.clearGalley = await editRows(C, w1.id, {[glabel]: ''}, 'ctl-clear-galley');
            await gotoDois(C);
            out.needs = await filterList('Needs DOI', 'ctl-needs');
            out.assigned = await filterList('DOI Assigned', 'ctl-assigned');
            // "None"
            const N = S.N;
            await signInAs(N);
            await gotoDois(N);
            out.none = await expand(N.books.w1.id);
            await snap('ctl-none-expanded');
            fact('ctl', out);
            markDone('ctl');
            log('[ctl]', JSON.stringify(out).slice(0, 4000));
        });
    } finally {
        await close();
    }
});
