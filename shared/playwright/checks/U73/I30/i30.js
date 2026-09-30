// U73 claim check, chunk I30 (housekeeping incidentals, 2026-09-30). {OMP}
// Incidentals row R1: what moves a publication format in the list — the "Edit" › "OK" save (nothing changed, and with
// a change), the "Metadata" tab's "Save", emptying / setting / changing its DOI on the DOIs page — and whether the DOIs
// page's expanded view lists a book's formats in the Publication Formats order.
//   Spec: docs/specs/U73-publication-formats-proof-terms.md, Fields "The Publication Formats page" (lines 77-80), A14
//   (1219-1234) and its note f-a14 (2289-2307); the register table row (1055); note d's mechanism (1461-1463).
//   Earlier drives: shared/playwright/checks/U73/I29/i29.js (approval, availability, terms, proof cases, reused here),
//   shared/playwright/checks/U45/R1/r1.js (the DOIs page helpers, reused here).
//
//   RUN=r1 PROBE_FEATURE=U73 PROBE_AGENT=ccI30u73 node bin/probe.js omp shared/playwright/checks/U73/I30/i30.js
//   RUN=r2 … (a second, independent run: its own press, its own facts). A run outlasts the Bash cap: launch it detached.
//   PHASES=seed,order,author (default all). CASES=… narrows the order phase (names below).
//   State i30-state-<RUN>-omp.json; facts i30-<RUN>-facts-omp.json; snapshots <RUN>-<name>-omp.json/png.
//
// Scratch press O (tag prefix u73i30): DOIs on, prefix 10.1234, "Items with DOIs" Monographs + Publication Formats,
// "Upon publication"; users mg (manager), au (author). One published book per case, formats Alpha, Bravo, Charlie,
// Delta seeded in that order (each with article.pdf, "Open Access", "Approved", "Available"); the case acts on Bravo:
//   ctl      nothing: two reloads (both pages)
//   edit     Bravo's "Edit" › "OK" with nothing changed, three times
//   editchg  Bravo's "Edit" › name changed › "OK", twice; then the unsaved-leave sweep (name typed, "Metadata" tab
//            pressed, header close arrow)
//   meta     Bravo's "Edit" › "Metadata" › "Save" as it opens; if refused, a "Product Composition" chosen › "Save";
//            then "Metadata" › "Save" unchanged again
//   doiempty DOIs page: Bravo's DOI emptied › "Save"; typed again › "Save"; emptied again › "Save"
//   doiset   DOIs page: Bravo's DOI changed to a new value › "Save", twice
//   doinoop  DOIs page: "Edit" › "Save" with nothing changed, twice; then the unsaved-leave sweep (a box typed, page left)
//   doiother DOIs page: the monograph's own DOI changed › "Save" (no format row touched), twice
//   rev, na, reapp, reav, terms, proof   as in I29 (approval revoked; "Not Available"; approval back; availability
//            back; a file's terms saved unchanged then "Direct Sales" 10.00; "Approve Proof")
//   pair     the incidental's book: "PDF" (article.pdf) then "EPUB" (no file); "PDF"'s "Edit" › "OK" twice, then its DOI
//            emptied on the DOIs page, then typed again
// Each step is read on the page it was taken on at once, after a reload, then on the other page (Publication Formats
// or the DOIs page's expanded view) and the book page. Database reads (psql SELECT, physical row order) are evidence
// of the mechanism only; nothing is written there. No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {dbName} = require('../../../../../bin/apps.js');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const RUN = process.env.RUN || 'r1';
const ALL = ['seed', 'order', 'author'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',').map((s) => s.trim());
const CASE_LIST = ['ctl', 'edit', 'editchg', 'meta', 'doiempty', 'doiset', 'doinoop', 'doiother', 'rev', 'na', 'reapp', 'reav', 'terms', 'proof', 'pair'];
const CASES = (process.env.CASES || CASE_LIST.join(',')).split(',').map((s) => s.trim());
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[i30]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const statePath = (app) => path.join(outDir(), `i30-state-${RUN}-${app.name}.json`);
const vis = '[role="dialog"]:visible';
const FORMATS = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
const PAIR = ['PDF', 'EPUB'];

function psql(app, sql) {
    try {
        return execFileSync('psql', [dbName(app.name), '-At', '-F', '|', '-c', sql], {encoding: 'utf8'}).trim();
    } catch (e) {
        return `psql error: ${flat(e.message, 200)}`;
    }
}

forEachApp(async (app) => {
    if (app.name !== 'omp') { log(`${app.name}: no publication formats (U73 is {OMP}); nothing to drive`); return; }
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`i30-${RUN}-facts`, {[k]: v}, {merge: true}); log(`[${k}]`, JSON.stringify(v).slice(0, 4000)); };

    // ------------------------------------------------------------------ seed
    if (on('seed') && !S.seeded) {
        const t = tag('u73i30');
        const p = `${t}o`;
        const users = [
            {username: `${p}mg`, roles: ['manager'], givenName: 'Kim', familyName: 'Manager'},
            {username: `${p}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
        ];
        const c = await app.api.createContext({tag: p, users, doiPrefix: '10.1234', enabledDoiTypes: ['publication', 'representation'],
            doiCreationTime: 'publication'});
        S.O = {path: c.path, id: c.contextId, mg: `${p}mg`, au: `${p}au`, subs: {}};
        const prod = {files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction'], published: true};
        for (const k of CASE_LIST) {
            const formats = k === 'pair' ? [{name: 'PDF', file: 'article.pdf'}, {name: 'EPUB'}] : FORMATS.map((name) => ({name, file: 'article.pdf'}));
            try {
                const r = await app.api.createSubmission({tag: `${S.O.path}${k}`, context: S.O.path, submitter: S.O.au,
                    title: `I30 ${k} ${t}`, ...prod, publicationFormats: formats});
                S.O.subs[k] = {id: r.submissionId, pub: r.publicationId, formats: r.publicationFormats || null};
            } catch (e) { S.O.subs[k] = {error: String(e.message).slice(0, 600)}; log(`[seed ${k} FAILED]`, S.O.subs[k].error); }
            save();
        }
        S.seeded = true;
        save();
        S.seedDois = psql(app, `select s.submission_id, f.publication_format_id, f.seq, d.doi from submissions s join publications p on p.submission_id=s.submission_id join publication_formats f on f.publication_id=p.publication_id left join dois d on d.doi_id=f.doi_id where s.context_id=${S.O.id} order by 1,2`);
        save();
        log('seeded', JSON.stringify(S).slice(0, 3000));
    }
    if (!S.seeded) { log('no state: run the seed phase'); return; }

    const cUrl = (p) => app.url(`/index.php/${S.O.path}${p}`);
    const wfUrl = (id, key, author) => cUrl(`/dashboard/${author ? 'mySubmissions' : 'editorial'}?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const names = (k) => (k === 'pair' ? PAIR : FORMATS);
    const actOn = (k) => (k === 'pair' ? 'PDF' : 'Bravo');

    const {page, close} = await launch(app);
    page.setDefaultTimeout(T);
    // ---- browser dialogs (confirm/alert): answered by `answer`, recorded with a time
    const jsDialogs = [];
    let answer = 'dismiss';
    page.on('dialog', async (d) => {
        jsDialogs.push({at: Date.now(), type: d.type(), message: d.message(), answered: d.type() === 'beforeunload' ? 'accept' : answer});
        if (d.type() === 'beforeunload' || answer === 'accept') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    const dialogsSince = (t0) => jsDialogs.filter((d) => d.at >= t0).map(({at, ...d}) => d);
    // ---- page notices with a time
    const notices = [];
    await page.exposeFunction('__i30Notice', (text) => notices.push({at: Date.now(), text}));
    await page.addInitScript(() => {
        const seen = new WeakSet();
        new MutationObserver(() => {
            document.querySelectorAll('.app__notifications .pkpNotification, .pkp_notification, [role="alert"]').forEach((e) => {
                if (seen.has(e)) return;
                const t = (e.textContent || '').replace(/\s+/g, ' ').trim();
                if (!t || t === '× Close') return;
                seen.add(e);
                window.__i30Notice(t);
            });
        }).observe(document, {childList: true, subtree: true});
    });
    const noticesSince = (t0) => notices.filter((n) => n.at >= t0).map((n) => n.text);
    // ---- the grid's own posts and the API's writes (op, status, body head)
    const posts = [];
    page.on('response', async (r) => {
        const m = r.request().method();
        const u = r.url();
        if (!/\$\$\$call\$\$\$|\/api\/v1\//.test(u)) return;
        if (m === 'GET') return;
        let body = '';
        try { body = (await r.text()).slice(0, 300); } catch { /* */ }
        posts.push({at: Date.now(), method: m, override: r.request().headers()['x-http-method-override'] || null, status: r.status(),
            url: u.replace(/^.*\/index\.php\/[^/]+/, '').slice(0, 160), post: flat(r.request().postData(), 200), body: flat(body, 160)});
    });
    const postsSince = (t0) => posts.filter((p) => p.at >= t0).map((p) => `${p.method}${p.override ? `(${p.override})` : ''} ${p.status} ${p.url.slice(0, 110)} ${p.post ? `post=${p.post.slice(0, 120)} ` : ''}→ ${p.body.slice(0, 100)}`);

    const N = (name) => `${RUN}-${name}`;
    async function snap(name, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        if (extra) Object.assign(s, extra);
        record(N(name), s);
        await shot(page, N(name)).catch(() => {});
        return s;
    }
    let who = null;
    const as = async (user) => {
        if (who === user) return;
        await signIn(page, user, {contextPath: S.O.path});
        await idle(page);
        who = user;
    };
    const physical = (k) => psql(app, `select string_agg(coalesce((select setting_value from publication_format_settings s where s.publication_format_id=f.publication_format_id and s.setting_name='name' and s.locale='en'),'?')||'#'||f.publication_format_id||'@'||f.c::text||':seq'||f.seq, ', ') from (select ctid as c, * from publication_formats where publication_id=${S.O.subs[k].pub}) f`);

    // =================================================================== the Publication Formats page (from i29.js)
    const wf = () => page.locator(vis).first();
    const top = () => page.locator(vis).last();
    const winCount = () => page.locator(vis).count();
    const grid = () => wf().locator('[id^="component-grid-catalogentry-publicationformatgrid"]').first();
    async function openWf(id, key, author) {
        await page.goto(wfUrl(id, key, author));
        await idle(page);
        await wf().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page);
        await sleep(300);
    }
    async function formatsPage(k, name, author) {
        const sub = S.O.subs[k];
        await openWf(sub.id, `publication_${sub.pub}_publicationFormats`, author);
        await grid().waitFor({timeout: 20000}).catch(() => {});
        await idle(page);
        const info = await gridInfo();
        if (name) await snap(name, {grid: info});
        return info;
    }
    const reloadPage = async () => { await page.reload(); await idle(page); await grid().waitFor({timeout: 20000}).catch(() => {}); await idle(page); await sleep(300); };
    async function gridInfo() {
        return wf().evaluate((d) => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const tc = (e) => { if (!e) return ''; const c = e.cloneNode(true); c.querySelectorAll('script, style').forEach((x) => x.remove()); return c.textContent; };
            const v = (e) => e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
            const g = d.querySelector('[id^="component-grid-catalogentry-publicationformatgrid"]');
            if (!g) return {present: false, text: f(d.innerText).slice(0, 800)};
            const rows = [...g.querySelectorAll('tbody tr')].filter(v).map((tr) => {
                if (tr.classList.contains('row_controls')) return null;
                const onix = tr.querySelector('.onix_code');
                return {id: tr.id || null, kind: onix ? 'format' : tr.querySelector('a.pkp_linkaction_downloadFile') ? 'file' : 'other', cells: [...tr.children].map((c) => f(tc(c)))};
            }).filter(Boolean);
            return {present: true, rows};
        }).catch((e) => ({error: String(e.message).slice(0, 300)}));
    }
    const pick = (k, text) => names(k).find((x) => text.includes(x)) || text.slice(0, 20);
    const order = (k, g) => (g.rows || []).filter((r) => r.kind === 'format').map((r) => {
        const m = pick(k, r.cells[0]);
        return `${m}[${(r.cells[1] || '').replace('Awaiting Approval', 'AA').replace('Approved', 'Ap')}/${(r.cells[2] || '').replace('Not Available', 'NA').replace('Available', 'Av')}]`;
    });
    const bare = (arr) => (arr || []).map((x) => x.replace(/\[.*$/, ''));
    const rowsBrief = (g) => (g.rows || []).map((r) => `${r.kind}: ${r.cells.join(' | ')}`);
    const fmtBody = (label) => grid().locator('tbody.category_grid_body').filter({has: page.locator('span.label', {hasText: label})}).first();
    const formatRow = (label) => fmtBody(label).locator('tr.gridRow').filter({has: page.locator('.onix_code')}).first();
    const fileRow = (fmt, text, nth = 0) => fmtBody(fmt).locator('tr.gridRow').filter({has: page.locator('a.pkp_linkaction_downloadFile')}).filter({hasText: text}).nth(nth);
    async function rowArrow(row, press) {
        await row.waitFor({timeout: 20000});
        const id = await row.getAttribute('id');
        if (await row.locator('a.show_extras').count()) await row.locator('a.show_extras').first().click();
        await sleep(400);
        const ctl = page.locator(`[id="${id}-control-row"]`);
        const entries = await ctl.locator('a').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
        if (press) {
            const a = ctl.getByRole('link', {name: press, exact: true}).first();
            if (!(await a.count())) return {entries, missing: press};
            await a.click();
            await idle(page);
        }
        return {entries};
    }
    async function winInfo(w = top()) {
        return w.evaluate((d) => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const v = (e) => e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
            const h = d.querySelector('h1, h2');
            const tabs = [...d.querySelectorAll('[role=tab]')].filter(v).map((t) => `${f(t.textContent)}${t.getAttribute('aria-selected') === 'true' ? '*' : ''}`);
            const fields = [...d.querySelectorAll('input:not([type=hidden]), select, textarea')].filter(v).map((e) => ({name: e.name, type: e.type,
                value: e.type === 'checkbox' || e.type === 'radio' ? e.checked : e.tagName === 'SELECT' ? (e.selectedOptions[0] ? e.selectedOptions[0].textContent.trim() : '') : e.value}));
            const buttons = [...d.querySelectorAll('button, a.pkp_button, a[role=button], input[type=submit], form a')].filter(v).map((b) => `${f(b.textContent || b.value || b.getAttribute('aria-label'))}${b.disabled ? '(disabled)' : ''}`).filter(Boolean);
            return {title: h ? f(h.textContent) : null, tabs, fields, buttons, text: f(d.innerText).slice(0, 2500)};
        }).catch((e) => ({error: String(e.message).slice(0, 300)}));
    }
    async function winSnap(name, extra = {}) {
        const w = await winInfo();
        await snap(name, {win: w, ...extra});
        return {title: w.title, tabs: w.tabs, buttons: w.buttons};
    }
    async function waitNewWindow(n0) {
        await page.waitForFunction((n) => [...document.querySelectorAll('[role="dialog"]')].filter((e) => e.getClientRects().length).length > n, n0, {timeout: 20000}).catch(() => {});
        await idle(page); await sleep(900); await idle(page);
    }
    async function pressIn(label, scope) {
        const t0 = Date.now();
        const before = await winCount();
        const sc = scope || top();
        const b = sc.getByRole('button', {name: label, exact: true}).or(sc.getByRole('link', {name: label, exact: true})).last();
        let err = null;
        await b.click({timeout: 5000}).catch((e) => { err = flat(e.message, 160); });
        await sleep(1500); await idle(page); await sleep(300);
        return {pressed: label, err, windowsBefore: before, windowsAfter: await winCount(), notices: noticesSince(t0), posts: postsSince(t0), dialogs: dialogsSince(t0)};
    }
    async function openLink(row, linkText) {
        const a = row.getByRole('link', {name: linkText, exact: true}).first();
        await a.waitFor({timeout: 15000});
        const n0 = await winCount();
        await a.click();
        await waitNewWindow(n0);
    }
    async function statusLink(k, fmt, from) {
        await openLink(formatRow(fmt), from);
        const w = await winSnap(`o-${k}-${fmt}-${from.replace(/\s+/g, '')}-window`);
        const p = await pressIn('OK');
        return {title: w.title, windowsAfter: p.windowsAfter, notices: p.notices, posts: p.posts, err: p.err};
    }
    const termsForm = () => page.locator('form#approvedProofForm:visible').last();
    const editNameBox = () => top().locator('input[name="name[en]"]');
    async function openEditWindow(k, fmt, name) {
        const arrow = await rowArrow(formatRow(fmt), 'Edit');
        await editNameBox().waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(500);
        const w = await winSnap(name);
        return {arrowEntries: arrow.entries, missing: arrow.missing, win: w, name: await editNameBox().inputValue().catch(() => null)};
    }

    // =================================================================== the book page
    async function bookOrder(k, name) {
        const sub = S.O.subs[k];
        const t0 = Date.now();
        const resp = await page.goto(cUrl(`/catalog/book/${sub.id}`));
        await idle(page);
        await sleep(400);
        const data = await page.evaluate(() => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const box = document.querySelector('.entry_details .item.files') || document.querySelector('.item.files');
            const side = box ? [...box.querySelectorAll('a')].map((a) => f(a.textContent)) : null;
            return {side};
        }).catch((e) => ({error: String(e.message)}));
        await snap(name, {book: data, status: resp ? resp.status() : null, responses: postsSince(t0)});
        return {status: resp ? resp.status() : null, links: data.side};
    }

    // =================================================================== the DOIs page (from r1.js)
    const gotoDois = async () => {
        await page.goto(cUrl('/dois'));
        await idle(page);
        await page.locator('.listPanel__item--doi, .listPanel__empty').first().waitFor({timeout: 15000}).catch(() => {});
        await idle(page);
        await sleep(500);
    };
    const rowOf = (id) => page.locator(`[id$="-${id}"].listPanel__item--doi:visible`).first();
    const listBadge = async (id) => rowOf(id).locator('.listPanel__itemSummary .doiListItem__itemMetadata--badge').first().innerText().catch(() => null);
    const expanded = async (id) => rowOf(id).evaluate((e) => {
        const x = e.querySelector('.listPanel__itemExpanded');
        if (!x) return null;
        const t = (n) => (n ? n.innerText.replace(/\s+/g, ' ').trim() : null);
        return {
            rows: [...x.querySelectorAll('tbody tr')].map((r) => {
                const lab = r.querySelector('td label');
                const inp = r.querySelector('input');
                return {type: lab ? lab.innerText.trim() : null, value: inp ? inp.value : null, readOnly: inp ? inp.readOnly : null,
                    badge: t(r.querySelector('.doiListItem__itemMetadata--badge')) || t(r.querySelectorAll('td')[2])};
            }),
            buttons: [...x.querySelectorAll('button')].map((b) => ({text: b.innerText.trim(), disabled: b.disabled || b.getAttribute('aria-disabled') === 'true'})),
            text: t(x).slice(0, 1200),
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
    const doiOrder = (x) => ((x && x.rows) || []).map((r) => r.type).filter(Boolean);
    const trByLabel = (id, label) => rowOf(id).locator('.listPanel__itemExpanded tbody tr')
        .filter({has: page.locator('td label', {hasText: new RegExp(`^\\s*${esc(label)}\\s*$`)})}).first();
    async function doisRead(k, name) {
        const id = S.O.subs[k].id;
        if (!/\/dois(\?|#|$)/.test(page.url())) await gotoDois();
        const x = await expand(id);
        await snap(name, {expanded: x});
        return {order: doiOrder(x), values: (x && x.rows || []).map((r) => `${r.type}=${r.value}`), badge: await listBadge(id)};
    }
    // Type into rows of one book's expanded view (label → value; {} = nothing typed), "Save"; read at once.
    async function doisEdit(k, map, name) {
        const id = S.O.subs[k].id;
        await gotoDois();
        const before = await expand(id);
        const r = rowOf(id);
        const t0 = Date.now();
        await r.getByRole('button', {name: 'Edit', exact: true}).click();
        await sleep(400);
        const typed = {};
        for (const [label, value] of Object.entries(map)) {
            const inp = trByLabel(id, label).locator('input');
            await inp.fill(value, {timeout: 5000}).catch((e) => { typed[label] = `fill failed: ${flat(e.message, 120)}`; });
            if (!typed[label]) typed[label] = await inp.inputValue().catch(() => null);
        }
        await snap(`${name}-typed`, {expanded: await expanded(id)});
        await r.getByRole('button', {name: 'Save', exact: true}).click();
        await r.getByRole('button', {name: 'Edit', exact: true}).waitFor({timeout: 15000}).catch(() => {});
        await idle(page); await sleep(900);
        const x = await expanded(id);
        await snap(`${name}-saved-atonce`, {expanded: x});
        return {before: doiOrder(before), typed, posts: postsSince(t0), notices: noticesSince(t0), dialogs: dialogsSince(t0),
            atOnce: doiOrder(x), valuesAtOnce: (x && x.rows || []).map((rr) => `${rr.type}=${rr.value}`)};
    }

    // =================================================================== reads after a step
    // Taken on the Publication Formats page: the page at once, a reload, the DOIs page, the book page.
    async function readFromFormats(k, key) {
        const r = {};
        const g0 = await gridInfo();
        r.atOnce = order(k, g0);
        await snap(`o-${k}-${key}-atonce`, {grid: g0});
        await reloadPage();
        const g1 = await gridInfo();
        r.reloaded = order(k, g1);
        await snap(`o-${k}-${key}-reloaded`, {grid: g1});
        r.dois = (await doisRead(k, `o-${k}-${key}-dois`)).order;
        r.book = (await bookOrder(k, `o-${k}-${key}-book`)).links;
        r.db = physical(k);
        await formatsPage(k);
        return r;
    }
    // Taken on the DOIs page (after doisEdit): the DOIs page after a reload, the Publication Formats page, the book page.
    async function readFromDois(k, key, edit) {
        const r = {atOnce: edit.atOnce};
        await gotoDois();
        const d = await doisRead(k, `o-${k}-${key}-dois-reloaded`);
        r.reloaded = d.order;
        r.valuesReloaded = d.values;
        r.badge = d.badge;
        r.formats = order(k, await formatsPage(k, `o-${k}-${key}-formats`));
        r.book = (await bookOrder(k, `o-${k}-${key}-book`)).links;
        r.db = physical(k);
        return r;
    }
    const brief = (a) => (a ? {windowsAfter: a.windowsAfter, notices: a.notices, posts: a.posts, dialogs: a.dialogs, err: a.err} : a);
    const fmtLabel = (fmt) => `Format / ${fmt}`;

    // =================================================================== phases
    try {
        if (on('order')) {
            await as(S.O.mg);
            for (const k of CASES) {
                const sub = S.O.subs[k];
                if (!sub || sub.error) { fact(`order-${k}`, {skipped: sub && sub.error}); continue; }
                const B = actOn(k);
                const o = {steps: []};
                const step = (label, extra) => { o.steps.push({label, ...extra}); };
                try {
                    const g = await formatsPage(k, `o-${k}-00-before`);
                    o.before = order(k, g);
                    o.beforeDois = await doisRead(k, `o-${k}-00-before-dois`);
                    o.beforeBook = (await bookOrder(k, `o-${k}-00-before-book`)).links;
                    o.beforeDb = physical(k);
                    await formatsPage(k);
                    if (k === 'ctl') {
                        step('reload 1', {read: await readFromFormats(k, '01-reload')});
                        step('reload 2', {read: await readFromFormats(k, '02-reload')});
                    } else if (k === 'edit' || (k === 'pair')) {
                        const n = k === 'edit' ? 3 : 2;
                        for (let i = 1; i <= n; i++) {
                            const w = await openEditWindow(k, B, `o-${k}-0${i}-edit-window`);
                            const a = await pressIn('OK');
                            step(`"Edit" › "OK" unchanged #${i}`, {window: w.win.tabs, name: w.name, act: brief(a), read: await readFromFormats(k, `0${i}-edit-ok`)});
                        }
                        if (k === 'pair') {
                            let e = await doisEdit(k, {[fmtLabel(B)]: ''}, `o-${k}-03-doi-emptied`);
                            step('DOI emptied', {act: e, read: await readFromDois(k, '03-doi-emptied', e)});
                            e = await doisEdit(k, {[fmtLabel(B)]: `10.1234/i30-${RUN}-pair-pdf`}, `o-${k}-04-doi-typed`);
                            step('DOI typed', {act: e, read: await readFromDois(k, '04-doi-typed', e)});
                        }
                    } else if (k === 'editchg') {
                        for (let i = 1; i <= 2; i++) {
                            const w = await openEditWindow(k, 'Bravo', `o-${k}-0${i}-edit-window`);
                            await editNameBox().fill(`Bravo x${i}`);
                            await editNameBox().blur();
                            const a = await pressIn('OK');
                            step(`"Edit" › name "Bravo x${i}" › "OK"`, {nameBefore: w.name, act: brief(a), read: await readFromFormats(k, `0${i}-edit-renamed`)});
                        }
                        // the unsaved-leave sweep: name typed, "Metadata" pressed (the question dismissed), then the close arrow.
                        {
                            const w = await openEditWindow(k, 'Bravo', `o-${k}-03-leave-window`);
                            await editNameBox().fill('Bravo unsaved');
                            await editNameBox().blur();
                            let t0 = Date.now();
                            answer = 'dismiss';
                            await top().getByRole('tab', {name: 'Metadata', exact: true}).click().catch(() => {});
                            await sleep(1500); await idle(page); await sleep(2000);
                            const tabSwitch = {dialogs: dialogsSince(t0), windowInfo: await winInfo(), name: await editNameBox().inputValue().catch(() => '(no name box)')};
                            await snap(`o-${k}-03-leave-metadata-pressed`, {tabSwitch});
                            t0 = Date.now();
                            answer = 'accept';
                            await top().getByRole('button', {name: 'Close', exact: true}).last().click().catch(() => {});
                            await sleep(1500); await idle(page); await sleep(2000);
                            answer = 'dismiss';
                            const closed = {dialogs: dialogsSince(t0), windowsAfter: await winCount(), posts: postsSince(t0), notices: noticesSince(t0)};
                            await snap(`o-${k}-03-leave-closed`, {closed});
                            const read = await readFromFormats(k, '03-leave');
                            const w2 = await openEditWindow(k, 'Bravo', `o-${k}-03-leave-reopened`);
                            await top().getByRole('button', {name: 'Close', exact: true}).last().click().catch(() => {});
                            await sleep(1500); await idle(page);
                            step('leave unsaved', {nameBefore: w.name, tabs: w.win.tabs, tabSwitch: {dialogs: tabSwitch.dialogs, tabs: tabSwitch.windowInfo.tabs, name: tabSwitch.name}, closed, read, nameReopened: w2.name});
                        }
                    } else if (k === 'meta') {
                        for (let i = 1; i <= 2; i++) {
                            await openEditWindow(k, 'Bravo', `o-${k}-0${i}-edit-window`);
                            const loaded = page.waitForResponse((r) => /edit-format-metadata/.test(r.url()), {timeout: T}).catch(() => null);
                            await top().getByRole('tab', {name: 'Metadata', exact: true}).click();
                            await loaded;
                            await idle(page); await sleep(1200);
                            const mform = () => top().locator('form[id^="publicationMetadataEntryForm-"]');
                            const comp = mform().locator('select[name="productCompositionCode"]');
                            const compBefore = await comp.evaluate((e) => (e.selectedOptions[0] ? e.selectedOptions[0].textContent.trim() : '')).catch(() => null);
                            await winSnap(`o-${k}-0${i}-metadata-tab`);
                            let a = await pressIn('Save', mform());
                            let refused = await top().locator('form[id^="publicationMetadataEntryForm-"] label.error:visible').allInnerTexts().catch(() => []);
                            const s1 = {compBefore, act: brief(a), refused, windowStillOpen: a.windowsAfter >= 2};
                            if (a.windowsAfter >= 2) {
                                await snap(`o-${k}-0${i}-metadata-refused`);
                                const opts = await comp.locator('option').evaluateAll((os) => os.map((x) => ({v: x.value, t: x.textContent.trim()})).filter((x) => x.v));
                                if (opts.length) await comp.selectOption(opts[0].v);
                                s1.chose = opts[0] && opts[0].t;
                                a = await pressIn('Save', mform());
                                s1.act2 = brief(a);
                                s1.refused2 = await top().locator('form[id^="publicationMetadataEntryForm-"] label.error:visible').allInnerTexts().catch(() => []);
                                if (a.windowsAfter >= 2) {
                                    await snap(`o-${k}-0${i}-metadata-refused-again`);
                                    await top().getByRole('button', {name: 'Close', exact: true}).last().click().catch(() => {});
                                    await sleep(1500);
                                }
                            }
                            step(`"Metadata" › "Save" #${i}`, {...s1, read: await readFromFormats(k, `0${i}-metadata-saved`)});
                        }
                    } else if (k === 'doiempty') {
                        const seq = [['emptied', ''], ['typed', `10.1234/i30-${RUN}-bravo`], ['emptied-again', '']];
                        for (let i = 0; i < seq.length; i++) {
                            const [lab, v] = seq[i];
                            const e = await doisEdit(k, {[fmtLabel('Bravo')]: v}, `o-${k}-0${i + 1}-doi-${lab}`);
                            step(`DOI ${lab}`, {act: e, read: await readFromDois(k, `0${i + 1}-doi-${lab}`, e)});
                        }
                    } else if (k === 'doiset') {
                        for (let i = 1; i <= 2; i++) {
                            const e = await doisEdit(k, {[fmtLabel('Bravo')]: `10.1234/i30-${RUN}-bravo-v${i}`}, `o-${k}-0${i}-doi-changed`);
                            step(`DOI changed #${i}`, {act: e, read: await readFromDois(k, `0${i}-doi-changed`, e)});
                        }
                    } else if (k === 'doinoop') {
                        for (let i = 1; i <= 2; i++) {
                            const e = await doisEdit(k, {}, `o-${k}-0${i}-doi-save-unchanged`);
                            step(`"Edit" › "Save" unchanged #${i}`, {act: e, read: await readFromDois(k, `0${i}-doi-save-unchanged`, e)});
                        }
                        // the unsaved-leave sweep on the DOIs page: Bravo's box typed, the page left by the side menu's address.
                        {
                            const id = sub.id;
                            await gotoDois();
                            await expand(id);
                            await rowOf(id).getByRole('button', {name: 'Edit', exact: true}).click();
                            await sleep(300);
                            await trByLabel(id, fmtLabel('Bravo')).locator('input').fill(`10.1234/i30-${RUN}-unsaved`);
                            await trByLabel(id, fmtLabel('Bravo')).locator('input').blur();
                            const t0 = Date.now();
                            await page.goto(cUrl('/dashboard/editorial'));
                            await idle(page); await sleep(1000);
                            const left = {dialogs: dialogsSince(t0), posts: postsSince(t0), url: page.url().replace(/^https?:\/\/[^/]+/, '')};
                            await gotoDois();
                            const d = await doisRead(k, `o-${k}-03-leave-back`);
                            step('leave unsaved', {left, after: d});
                        }
                    } else if (k === 'doiother') {
                        const first = (o.beforeDois.order || []).find((l) => !/^Format \//.test(l));
                        for (let i = 1; i <= 2; i++) {
                            const e = await doisEdit(k, {[first]: `10.1234/i30-${RUN}-book-v${i}`}, `o-${k}-0${i}-own-doi-changed`);
                            step(`the book's own DOI ("${first}") changed #${i}`, {act: e, read: await readFromDois(k, `0${i}-own-doi-changed`, e)});
                        }
                    } else if (k === 'rev') {
                        const a = await statusLink(k, 'Bravo', 'Approved');
                        step('approval revoked', {act: a, read: await readFromFormats(k, '01-revoked')});
                    } else if (k === 'na') {
                        const a = await statusLink(k, 'Bravo', 'Available');
                        step('"Not Available"', {act: a, read: await readFromFormats(k, '01-not-available')});
                    } else if (k === 'reapp') {
                        let a = await statusLink(k, 'Bravo', 'Approved');
                        step('approval revoked', {act: a, read: await readFromFormats(k, '01-revoked')});
                        a = await statusLink(k, 'Bravo', 'Awaiting Approval');
                        step('approval given back', {act: a, read: await readFromFormats(k, '02-approved-again')});
                    } else if (k === 'reav') {
                        let a = await statusLink(k, 'Bravo', 'Available');
                        step('"Not Available"', {act: a, read: await readFromFormats(k, '01-not-available')});
                        a = await statusLink(k, 'Bravo', 'Not Available');
                        step('availability given back', {act: a, read: await readFromFormats(k, '02-available-again')});
                    } else if (k === 'terms') {
                        const link = () => fileRow('Bravo', 'article').locator('a').filter({hasText: /^\s*(Set Terms|Open Access|Direct Sales|Not Available)\s*$/}).first();
                        await link().click();
                        await termsForm().waitFor({timeout: 20000}).catch(() => {});
                        await idle(page); await sleep(500);
                        await winSnap(`o-${k}-01-terms-window`);
                        let a = await pressIn('Save');
                        step('terms saved unchanged', {act: brief(a), read: await readFromFormats(k, '01-terms-saved-unchanged')});
                        await link().click();
                        await termsForm().waitFor({timeout: 20000}).catch(() => {});
                        await idle(page); await sleep(500);
                        await termsForm().getByLabel('Direct Sales').check().catch(() => {});
                        await sleep(300);
                        const pr = termsForm().locator('input[id^="price"]').first();
                        await pr.click().catch(() => {});
                        await page.keyboard.press('Control+A').catch(() => {});
                        await page.keyboard.type('10.00').catch(() => {});
                        await pr.blur().catch(() => {});
                        await sleep(300);
                        await winSnap(`o-${k}-02-terms-direct-typed`);
                        a = await pressIn('Save');
                        step('"Direct Sales" 10.00', {act: brief(a), read: await readFromFormats(k, '02-terms-direct-sales')});
                    } else if (k === 'proof') {
                        await openLink(fileRow('Bravo', 'article'), 'Awaiting Approval');
                        await winSnap(`o-${k}-01-approve-proof-window`);
                        const a = await pressIn('OK');
                        step('"Approve Proof"', {act: brief(a), read: await readFromFormats(k, '01-proof-approved')});
                    }
                } catch (e) {
                    o.error = String(e.stack || e).split('\n').slice(0, 4).join(' | ');
                    log(`[${k} FAILED]`, o.error);
                    await snap(`o-${k}-error`).catch(() => {});
                }
                // a compact trace: the list after each step, per read
                o.trace = [`before: formats ${bare(o.before).join(',')} | dois ${(o.beforeDois && o.beforeDois.order || []).join(',')}`].concat(o.steps.map((s) => {
                    if (!s.read) return `${s.label}: dois ${((s.after && s.after.order) || []).join(',')} | dialogs on leaving ${JSON.stringify((s.left && s.left.dialogs) || [])}`;
                    const r = s.read;
                    if ('formats' in r) return `${s.label}: dois at once ${(r.atOnce || []).join(',')} | dois reload ${(r.reloaded || []).join(',')} | formats ${bare(r.formats).join(',')} | book ${(r.book || []).join(',')}`;
                    return `${s.label}: formats at once ${bare(r.atOnce).join(',')} | reload ${bare(r.reloaded).join(',')} | dois ${(r.dois || []).join(',')} | book ${(r.book || []).join(',')}`;
                }));
                fact(`order-${k}`, o);
            }
            await formatsPage('ctl');
            await loc(page, 'Publication Formats: a format row by its name', formatRow('Alpha'));
            await gotoDois();
            await expand(S.O.subs.ctl.id);
            await loc(page, 'DOIs page: a format row of a book\'s expanded view, by its label ("Format / <name>")', trByLabel(S.O.subs.ctl.id, fmtLabel('Alpha')));
            await loc(page, 'DOIs page: the expanded view\'s "Edit" button', rowOf(S.O.subs.ctl.id).getByRole('button', {name: 'Edit', exact: true}));
        }

        // ---------------------------------------------------------------- author: the Author's list follows the order
        if (on('author')) {
            await as(S.O.au);
            for (const k of ['edit', 'doiempty', 'pair'].filter((x) => CASES.includes(x))) {
                const g = await formatsPage(k, `o-${k}-author-view`, true);
                fact(`author-${k}`, {order: (g.rows || []).filter((r) => r.kind === 'format').map((r) => pick(k, r.cells[0])), rows: rowsBrief(g)});
            }
        }
    } catch (e) {
        log('ERROR', e.stack);
        await snap('error').catch(() => {});
        fact('error', String(e.stack).slice(0, 1500));
    } finally {
        await close();
    }
});
