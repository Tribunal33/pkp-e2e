// U73 claim check, chunk I29 (housekeeping incidentals, 2026-09-29).
// Row 33 (U73): what moves a publication format in the list order, besides a save from its "Edit" window?
//   Spec: U73 Fields "The Publication Formats page" (the order sentence), A14 and its note f-a14. {OMP}
// Row 19 (U36): the close arrow of "Edit a file" with the name changed — a format file's "Edit" {OMP},
//   and the other end, a list file's "Update File Details" (U36 Rule 10) {OJS OMP}; OPS: no file lists (control).
//
//   RUN=r1 PROBE_FEATURE=U73 PROBE_AGENT=ccI29 node bin/probe.js <omp|ojs|ops> shared/playwright/checks/U73/I29/i29.js
//   PHASES=seed,order,fileedit,listedit,opsctl (default all that apply to the app). CASES=ctl,edit,rev,na,reapp,reav,terms,proof
//   narrows the order phase. Each RUN seeds its own scratch context (state i29-state-<RUN>-<app>.json), writes its
//   facts to i29-<RUN>-facts-<app>.json and its snapshots as <RUN>-<name>-<app>.json/png.
//
// Scratch context O (OMP), users mg (manager), au (author), le (layoutEditor, assigned on "fe"):
//   one published book per order case, each with the formats Alpha, Bravo, Charlie, Delta (seeded in that order; each
//   with article.pdf, "Open Access", "Approved", "Available"). The case acts on Bravo only and reads the Publication
//   Formats order at once, after a reload, and the book page's side column, after each step.
//     ctl   nothing (two reloads)                        edit  Bravo's "Edit" › "OK" unchanged (the known A14 move)
//     rev   "Approved" › "OK" (revoke)                   na    "Available" › "OK" (Not Available)
//     reapp revoke, then "Awaiting Approval" › "OK"      reav  Not Available, then "Not Available" › "OK"
//     terms Bravo's file "Open Access" › "Save" unchanged, then "Direct Sales" 10.00 › "Save"
//     proof Bravo's file "Awaiting Approval" › "OK" (Approve Proof)
//   fe  Production, a format "FE PDF" with article.pdf (not published): the file's "Edit" ("Edit a file"), name changed, close arrow.
//   lf  Submission stage with article.pdf: "Submission Files" › "Update File Details", name changed, close arrow (OJS too).
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const RUN = process.env.RUN || 'r1';
const ALL = ['seed', 'order', 'fileedit', 'listedit', 'opsctl'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',').map((s) => s.trim());
const CASE_LIST = ['ctl', 'edit', 'rev', 'na', 'reapp', 'reav', 'terms', 'proof'];
const CASES = (process.env.CASES || CASE_LIST.join(',')).split(',').map((s) => s.trim());
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[i29]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `i29-state-${RUN}-${app.name}.json`);
const vis = '[role="dialog"]:visible';
const FORMATS = ['Alpha', 'Bravo', 'Charlie', 'Delta'];

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`i29-${RUN}-facts`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };

    // ------------------------------------------------------------------ seed
    if (on('seed') && !S.seeded) {
        const t = tag('u73i29');
        const p = `${t}o`;
        const users = [
            {username: `${p}mg`, roles: ['manager'], givenName: 'Kim', familyName: 'Manager'},
            {username: `${p}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
        ];
        if (isOMP) users.push({username: `${p}le`, roles: ['layoutEditor'], givenName: 'Lee', familyName: 'Layout'});
        const c = await app.api.createContext({tag: p, users});
        S.O = {path: c.path, mg: `${p}mg`, au: `${p}au`, le: `${p}le`, subs: {}};
        const sub = async (k, extra) => {
            try {
                const r = await app.api.createSubmission({tag: `${S.O.path}${k}`, context: S.O.path, submitter: S.O.au, title: `I29 ${k} ${t}`, ...extra});
                S.O.subs[k] = {id: r.submissionId, pub: r.publicationId, formats: r.publicationFormats || null};
            } catch (e) { S.O.subs[k] = {error: String(e.message).slice(0, 600)}; log(`[seed ${k} FAILED]`, S.O.subs[k].error); }
        };
        const prod = {files: [{file: 'article.pdf'}], decisions: [isOMP ? 'skipExternalReview' : 'skipExternalReview', 'sendToProduction']};
        if (isOMP) {
            for (const k of CASE_LIST) {
                await sub(k, {...prod, published: true, publicationFormats: FORMATS.map((name) => ({name, file: 'article.pdf'}))});
                log('[seed]', k, JSON.stringify(S.O.subs[k]));
            }
            await sub('fe', {...prod, participants: [{username: S.O.le, role: 'layoutEditor'}], publicationFormats: [{name: 'FE PDF', file: 'article.pdf'}]});
            await sub('lf', {files: [{file: 'article.pdf'}]});
        } else if (isOPS) {
            await sub('g', {galleys: [{label: 'PDF', locale: 'en', file: 'preprint.pdf'}]});
        } else {
            await sub('lf', {files: [{file: 'article.pdf'}]});
        }
        S.seeded = true;
        save();
        log('seeded', JSON.stringify(S).slice(0, 3000));
    }
    if (!S.seeded) { log('no state: run the seed phase'); return; }

    const cUrl = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    const wfUrl = (ctx, id, key, author) => cUrl(ctx, `/dashboard/${author ? 'mySubmissions' : 'editorial'}?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);

    const {page, close} = await launch(app);
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
    await page.exposeFunction('__i29Notice', (text) => notices.push({at: Date.now(), text}));
    await page.addInitScript(() => {
        const seen = new WeakSet();
        new MutationObserver(() => {
            document.querySelectorAll('.app__notifications .pkpNotification, .pkp_notification, [role="alert"], [role="status"]').forEach((e) => {
                if (seen.has(e)) return;
                const t = (e.textContent || '').replace(/\s+/g, ' ').trim();
                if (!t) return;
                seen.add(e);
                window.__i29Notice(t);
            });
        }).observe(document, {childList: true, subtree: true});
    });
    const noticesSince = (t0) => notices.filter((n) => n.at >= t0).map((n) => n.text);
    // ---- the grid's own posts (op, status, JSON head)
    const posts = [];
    page.on('response', async (r) => {
        const m = r.request().method();
        const u = r.url();
        if (!/\$\$\$call\$\$\$|\/api\/v1\//.test(u)) return;
        if (m === 'GET' && !/fetch-row|fetch-category|fetch-grid/.test(u)) return;
        let body = '';
        try { body = (await r.text()).slice(0, 400); } catch { /* */ }
        posts.push({at: Date.now(), method: m, status: r.status(), url: u.replace(/^.*\/index\.php\/[^/]+/, '').slice(0, 180), body: flat(body, 200)});
    });
    const postsSince = (t0) => posts.filter((p) => p.at >= t0).map((p) => `${p.method} ${p.status} ${p.url.slice(0, 110)} ${p.body.slice(0, 120)}`);

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
    const as = async (user, ctxPath) => {
        if (who === `${user}@${ctxPath}`) return;
        await signIn(page, user, {contextPath: ctxPath});
        await idle(page);
        who = `${user}@${ctxPath}`;
    };

    const wf = () => page.locator(vis).first();
    const top = () => page.locator(vis).last();
    const winCount = () => page.locator(vis).count();
    const grid = () => wf().locator('[id^="component-grid-catalogentry-publicationformatgrid"]').first();

    async function openWf(ctx, id, key, name, author) {
        await page.goto(wfUrl(ctx, id, key, author));
        await idle(page);
        await wf().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page);
        await sleep(300);
        if (name) return snap(name);
        return null;
    }
    async function formatsPage(k, name) {
        const sub = S.O.subs[k];
        await openWf(S.O.path, sub.id, `publication_${sub.pub}_publicationFormats`);
        await grid().waitFor({timeout: 20000}).catch(() => {});
        await idle(page);
        const info = await gridInfo();
        if (name) await snap(name, {grid: info});
        return info;
    }
    const reload = async () => { await page.reload(); await idle(page); await grid().waitFor({timeout: 20000}).catch(() => {}); await idle(page); await sleep(300); };
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
    const order = (g) => (g.rows || []).filter((r) => r.kind === 'format').map((r) => {
        const m = FORMATS.find((x) => r.cells[0].includes(x));
        return `${m || r.cells[0].slice(0, 20)}[${(r.cells[1] || '').replace('Awaiting Approval', 'AA').replace('Approved', 'Ap')}/${(r.cells[2] || '').replace('Not Available', 'NA').replace('Available', 'Av')}]`;
    });
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
            const lab = d.getAttribute('aria-labelledby');
            const title = d.getAttribute('aria-label') || (lab && document.getElementById(lab)?.textContent.trim()) || null;
            const tabs = [...d.querySelectorAll('[role=tab]')].filter(v).map((t) => `${f(t.textContent)}${t.getAttribute('aria-selected') === 'true' ? '*' : ''}`);
            const fields = [...d.querySelectorAll('input:not([type=hidden]), select, textarea')].filter(v).map((e) => {
                const lbl = e.id ? d.querySelector(`label[for="${e.id}"]`) : null;
                return {name: e.name, id: e.id, type: e.type, disabled: e.disabled, value: e.type === 'checkbox' || e.type === 'radio' ? e.checked : e.value, label: lbl ? f(lbl.textContent) : null};
            });
            const buttons = [...d.querySelectorAll('button, a.pkp_button, a[role=button], input[type=submit], form a')].filter(v).map((b) => `${f(b.textContent || b.value || b.getAttribute('aria-label'))}${b.disabled ? '(disabled)' : ''}`).filter(Boolean);
            return {title, tabs, fields, buttons, text: f(d.innerText).slice(0, 2500)};
        }).catch((e) => ({error: String(e.message).slice(0, 300)}));
    }
    async function winSnap(name, extra = {}) {
        const w = await winInfo();
        await snap(name, {win: w, ...extra});
        log(`[${name}]`, JSON.stringify({title: w.title, tabs: w.tabs, buttons: w.buttons, fields: (w.fields || []).map((x) => `${x.name}〔${x.label}〕=${JSON.stringify(x.value)}`), text: flat(w.text, 400)}).slice(0, 2000));
        return w;
    }
    async function waitNewWindow(n0) {
        await page.waitForFunction((n) => [...document.querySelectorAll('[role="dialog"]')].filter((e) => e.getClientRects().length).length > n, n0, {timeout: 20000}).catch(() => {});
        await idle(page); await sleep(900); await idle(page);
    }
    async function pressIn(label) {
        const t0 = Date.now();
        const before = await winCount();
        const b = top().getByRole('button', {name: label, exact: true}).or(top().getByRole('link', {name: label, exact: true})).last();
        let err = null;
        await b.click({timeout: 5000}).catch((e) => { err = flat(e.message, 160); });
        await sleep(1500); await idle(page); await sleep(300);
        return {pressed: label, err, windowsBefore: before, windowsAfter: await winCount(), notices: noticesSince(t0), posts: postsSince(t0), dialogs: dialogsSince(t0)};
    }
    // The header close arrow ("Close") of the top window; `ans` answers any browser question.
    async function closeArrow(ans, w = top()) {
        const t0 = Date.now();
        answer = ans;
        const before = await winCount();
        await w.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await sleep(1200);
        await idle(page);
        await sleep(2000); // a leave question read right after a close is real only if it is still there 2 s later
        answer = 'dismiss';
        return {windowsBefore: before, windowsAfter: await winCount(), dialogs: dialogsSince(t0), notices: noticesSince(t0), posts: postsSince(t0)};
    }
    async function openLink(row, linkText) {
        const a = row.getByRole('link', {name: linkText, exact: true}).first();
        await a.waitFor({timeout: 15000});
        const n0 = await winCount();
        await a.click();
        await waitNewWindow(n0);
    }
    // The book page's side column: format blocks in page order (as a signed-in user; the page does not depend on it).
    async function bookOrder(k, name) {
        const sub = S.O.subs[k];
        const t0 = Date.now();
        const resp = await page.goto(cUrl(S.O.path, `/catalog/book/${sub.id}`));
        await idle(page);
        await sleep(500);
        const data = await page.evaluate(() => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const box = document.querySelector('.entry_details .item.files') || document.querySelector('.item.files');
            const side = box ? [...box.querySelectorAll('a')].map((a) => f(a.textContent)) : null;
            const blocks = box ? [...box.querySelectorAll(':scope > div')].map((d) => f(d.innerText)) : null;
            const details = [...document.querySelectorAll('.item.publication_format')].map((b) => f(b.innerText).slice(0, 80));
            return {side, blocks, details};
        }).catch((e) => ({error: String(e.message)}));
        await snap(name, {book: data, status: resp ? resp.status() : null, responses: postsSince(t0)});
        return {status: resp ? resp.status() : null, links: data.side, details: data.details};
    }
    // One read: the page at once (no navigation), after a reload, and the book page.
    async function readAll(k, key) {
        const r = {};
        const g0 = await gridInfo();
        r.atOnce = order(g0);
        await snap(`o-${k}-${key}-atonce`, {grid: g0});
        await reload();
        const g1 = await gridInfo();
        r.reloaded = order(g1);
        await snap(`o-${k}-${key}-reloaded`, {grid: g1});
        const b = await bookOrder(k, `o-${k}-${key}-book`);
        r.book = b.links;
        r.bookStatus = b.status;
        await formatsPage(k);
        return r;
    }
    async function statusLink(k, fmt, from) {
        await openLink(formatRow(fmt), from);
        const w = await winSnap(`o-${k}-${fmt}-${from.replace(/\s+/g, '')}-window`);
        const p = await pressIn('OK');
        return {title: w.title, text: flat(w.text, 300), windowsAfter: p.windowsAfter, notices: p.notices, posts: p.posts};
    }
    const termsForm = () => page.locator('form#approvedProofForm:visible').last();

    // =================================================================== phases
    try {
        // ---------------------------------------------------------------- order (row 33; A14, f-a14)
        if (isOMP && on('order')) {
            await as(S.O.mg, S.O.path);
            for (const k of CASES) {
                const sub = S.O.subs[k];
                if (!sub || sub.error) { fact(`order-${k}`, {skipped: sub && sub.error}); continue; }
                const o = {};
                const g = await formatsPage(k, `o-${k}-00-before`);
                o.before = order(g);
                o.beforeBook = (await bookOrder(k, `o-${k}-00-before-book`)).links;
                await formatsPage(k);
                if (k === 'ctl') {
                    o.step1 = await readAll(k, '01-reload');
                    o.step2 = await readAll(k, '02-reload');
                } else if (k === 'edit') {
                    await rowArrow(formatRow('Bravo'), 'Edit');
                    await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog] form input[name^="name"]')].some((e) => e.getClientRects().length), null, {timeout: T}).catch(() => {});
                    await idle(page); await sleep(500);
                    await winSnap(`o-${k}-01-edit-window`);
                    o.act1 = await pressIn('OK');
                    o.step1 = await readAll(k, '01-edit-ok');
                } else if (k === 'rev') {
                    o.act1 = await statusLink(k, 'Bravo', 'Approved');
                    o.step1 = await readAll(k, '01-revoked');
                } else if (k === 'na') {
                    o.act1 = await statusLink(k, 'Bravo', 'Available');
                    o.step1 = await readAll(k, '01-not-available');
                } else if (k === 'reapp') {
                    o.act1 = await statusLink(k, 'Bravo', 'Approved');
                    o.step1 = await readAll(k, '01-revoked');
                    o.act2 = await statusLink(k, 'Bravo', 'Awaiting Approval');
                    o.step2 = await readAll(k, '02-approved-again');
                } else if (k === 'reav') {
                    o.act1 = await statusLink(k, 'Bravo', 'Available');
                    o.step1 = await readAll(k, '01-not-available');
                    o.act2 = await statusLink(k, 'Bravo', 'Not Available');
                    o.step2 = await readAll(k, '02-available-again');
                } else if (k === 'terms') {
                    const link = () => fileRow('Bravo', 'article').locator('a').filter({hasText: /^\s*(Set Terms|Open Access|Direct Sales|Not Available)\s*$/}).first();
                    await link().click();
                    await termsForm().waitFor({timeout: 20000}).catch(() => {});
                    await idle(page); await sleep(500);
                    await winSnap(`o-${k}-01-terms-window`);
                    o.act1 = await pressIn('Save');
                    o.step1 = await readAll(k, '01-terms-saved-unchanged');
                    await link().click();
                    await termsForm().waitFor({timeout: 20000}).catch(() => {});
                    await idle(page); await sleep(500);
                    await termsForm().locator('input[type=radio][value="2"], input[type=radio][value="directSales"]').first().click().catch(() => {});
                    // fall back: the radio labelled "Direct Sales"
                    if (!(await termsForm().locator('input[type=radio]:checked').evaluate((e) => /direct/i.test(e.closest('li, div')?.innerText || '')).catch(() => false))) {
                        await termsForm().getByLabel('Direct Sales').check().catch(() => {});
                    }
                    await sleep(300);
                    const pr = termsForm().locator('input[id^="price"]').first();
                    await pr.fill('10.00').catch(() => {});
                    await pr.blur().catch(() => {});
                    await sleep(300);
                    await winSnap(`o-${k}-02-terms-direct-typed`);
                    o.act2 = await pressIn('Save');
                    o.step2 = await readAll(k, '02-terms-direct-sales');
                } else if (k === 'proof') {
                    await openLink(fileRow('Bravo', 'article'), 'Awaiting Approval');
                    await winSnap(`o-${k}-01-approve-proof-window`);
                    o.act1 = await pressIn('OK');
                    o.step1 = await readAll(k, '01-proof-approved');
                }
                if (o.act1) o.act1 = {windowsAfter: o.act1.windowsAfter, notices: o.act1.notices, posts: o.act1.posts, err: o.act1.err};
                if (o.act2) o.act2 = {windowsAfter: o.act2.windowsAfter, notices: o.act2.notices, posts: o.act2.posts, err: o.act2.err};
                fact(`order-${k}`, o);
            }
            await loc(page, 'Publication Formats: a format row by its name', formatRow('Alpha'));
            await loc(page, 'Publication Formats: a format\'s "Approved" link', formatRow('Alpha').getByRole('link', {name: 'Approved', exact: true}));
            // the Author's view of one book's list (same order?)
            {
                await as(S.O.au, S.O.path);
                const k = CASES.includes('rev') ? 'rev' : CASES[0];
                const sub = S.O.subs[k];
                await openWf(S.O.path, sub.id, `publication_${sub.pub}_publicationFormats`, null, true);
                await grid().waitFor({timeout: 20000}).catch(() => {});
                await idle(page);
                const g = await gridInfo();
                await snap(`o-${k}-author-view`, {grid: g});
                fact(`order-author-${k}`, {rows: rowsBrief(g)});
            }
        }

        // ---------------------------------------------------------------- fileedit (row 19, a format file's "Edit")
        if (isOMP && on('fileedit')) {
            const o = {};
            for (const [role, user] of [['mg', S.O.mg], ['le', S.O.le]]) {
                const r = {};
                await as(user, S.O.path);
                const g = await formatsPage('fe', `fe-${role}-00-page`);
                r.rows = rowsBrief(g);
                const openEdit = async () => {
                    const n0 = await winCount();
                    const a = await rowArrow(fileRow('FE PDF', /\S/), 'Edit');
                    await waitNewWindow(n0);
                    await top().locator('input[type="text"]:visible').first().waitFor({timeout: 20000}).catch(() => {});
                    await idle(page); await sleep(500);
                    return a;
                };
                r.arrow = (await openEdit()).entries;
                const w = await winSnap(`fe-${role}-01-edit-window`);
                r.window = {title: w.title, tabs: w.tabs, buttons: w.buttons, fields: (w.fields || []).map((x) => `${x.name}〔${x.label}〕=${JSON.stringify(x.value)}`)};
                const nameBox = () => top().locator('input[type="text"]:visible').first();
                r.nameBefore = await nameBox().inputValue().catch(() => null);
                const newName = `fe-${role}-renamed-${RUN}`;
                // (1) name changed, close arrow, a question dismissed if one comes
                await nameBox().fill(newName);
                await nameBox().blur().catch(() => {});
                await sleep(300);
                await winSnap(`fe-${role}-02-name-typed`);
                r.closeChanged = await closeArrow('dismiss');
                if (r.closeChanged.windowsAfter >= r.closeChanged.windowsBefore) {
                    await winSnap(`fe-${role}-03-still-open`);
                    r.closeChangedAccept = await closeArrow('accept');
                }
                r.rowsAtOnce = rowsBrief(await gridInfo());
                await snap(`fe-${role}-04-after-close`);
                await reload();
                r.rowsReloaded = rowsBrief(await gridInfo());
                await openEdit();
                r.nameReopened = await nameBox().inputValue().catch(() => null);
                await winSnap(`fe-${role}-05-reopened`);
                // (2) other end: name changed, the bottom "Cancel"
                await nameBox().fill(`${newName}-cancel`);
                await nameBox().blur().catch(() => {});
                {
                    const t0 = Date.now();
                    answer = 'dismiss';
                    const c = top().getByRole('button', {name: 'Cancel', exact: true}).or(top().getByRole('link', {name: 'Cancel', exact: true})).first();
                    if (role === 'mg') await loc(page, '"Edit a file" (format file) bottom "Cancel"', c);
                    await c.click().catch(() => {});
                    await sleep(3000); await idle(page);
                    r.cancelChanged = {windowsAfter: await winCount(), dialogs: dialogsSince(t0)};
                    if (await winCount() > 1) await closeArrow('accept');
                }
                await reload();
                r.rowsAfterCancel = rowsBrief(await gridInfo());
                // (3) name changed, "Save" (the kept end)
                await openEdit();
                await nameBox().fill(`${newName}-saved`);
                r.save = await pressIn('Save');
                r.save = {windowsAfter: r.save.windowsAfter, notices: r.save.notices, posts: r.save.posts, dialogs: r.save.dialogs, err: r.save.err};
                r.rowsAfterSaveAtOnce = rowsBrief(await gridInfo());
                await reload();
                r.rowsAfterSaveReloaded = rowsBrief(await gridInfo());
                await snap(`fe-${role}-06-after-save-reloaded`);
                if (role === 'mg') {
                    await openEdit();
                    await loc(page, '"Edit a file" (format file) header close arrow', top().getByRole('button', {name: 'Close', exact: true}));
                    await loc(page, '"Edit a file" (format file) name box', top().locator('input[type="text"]:visible').first());
                    await closeArrow('accept');
                }
                o[role] = r;
            }
            fact('fileedit', o);
        }

        // ---------------------------------------------------------------- listedit (row 19's other end, U36 Rule 10)
        if (!isOPS && on('listedit')) {
            const o = {};
            await as(S.O.mg, S.O.path);
            const sub = S.O.subs.lf;
            await openWf(S.O.path, sub.id, 'workflow_1', 'lf-00-submission-stage');
            const table = () => wf().getByRole('table', {name: 'Submission Files', exact: true}).first();
            await table().locator('tbody tr').first().waitFor({timeout: 20000}).catch(() => {});
            const rowsOf = async () => table().evaluate((el) => [...el.querySelectorAll('tbody tr')].map((tr) => tr.innerText.trim().replace(/\s+/g, ' '))).catch((e) => `ERR ${flat(e.message, 100)}`);
            o.rows = await rowsOf();
            const editDialog = () => page.getByRole('dialog').filter({hasText: 'Edit a file'}).last();
            const openEdit = async () => {
                const row = table().locator('tbody tr').filter({hasText: 'article'}).first();
                await row.getByRole('button', {name: /More Actions/}).first().click();
                await sleep(300);
                const items = await page.locator('[role="menuitem"]:visible').evaluateAll((els) => els.map((e) => e.textContent.trim().replace(/\s+/g, ' '))).catch(() => []);
                await page.getByRole('menuitem', {name: 'Update File Details'}).first().click();
                await idle(page); await sleep(600);
                await editDialog().locator('input[type="text"]:visible').first().waitFor({timeout: 20000}).catch(() => {});
                await idle(page);
                return items;
            };
            o.menu = await openEdit();
            const w = await winSnap('lf-01-edit-window');
            o.window = {title: w.title, tabs: w.tabs, buttons: w.buttons, fields: (w.fields || []).map((x) => `${x.name}〔${x.label}〕=${JSON.stringify(x.value)}`)};
            const nameBox = () => editDialog().locator('input[type="text"]:visible').first();
            o.nameBefore = await nameBox().inputValue().catch(() => null);
            await nameBox().fill(`lf-renamed-${RUN}`);
            await nameBox().blur().catch(() => {});
            await sleep(300);
            await winSnap('lf-02-name-typed');
            o.closeChanged = await closeArrow('dismiss', editDialog());
            if (await editDialog().isVisible().catch(() => false)) {
                await winSnap('lf-03-still-open');
                o.closeChangedAccept = await closeArrow('accept', editDialog());
            }
            o.rowsAtOnce = await rowsOf();
            await snap('lf-04-after-close');
            await page.reload(); await idle(page);
            await table().locator('tbody tr').first().waitFor({timeout: 20000}).catch(() => {});
            await idle(page);
            o.rowsReloaded = await rowsOf();
            await openEdit();
            o.nameReopened = await nameBox().inputValue().catch(() => null);
            await winSnap('lf-05-reopened');
            await loc(page, '"Update File Details" ("Edit a file") header close arrow', editDialog().getByRole('button', {name: 'Close', exact: true}));
            await closeArrow('accept', editDialog());
            fact('listedit', o);
        }

        // ---------------------------------------------------------------- opsctl: a preprint server has no file lists
        if (isOPS && on('opsctl')) {
            await as(S.O.mg, S.O.path);
            const sub = S.O.subs.g;
            const s = await openWf(S.O.path, sub.id, null, 'ops-00-workflow');
            const tables = await wf().getByRole('table').evaluateAll((ts) => ts.map((t) => t.getAttribute('aria-label') || t.querySelector('caption')?.textContent.trim() || t.id || '?')).catch(() => []);
            const galleyMenu = [];
            const btn = wf().getByRole('button', {name: /More Actions/}).first();
            if (await btn.count()) {
                await btn.click().catch(() => {}); await sleep(300);
                galleyMenu.push(...await page.locator('[role="menuitem"]:visible').evaluateAll((els) => els.map((e) => e.textContent.trim().replace(/\s+/g, ' '))).catch(() => []));
                await page.keyboard.press('Escape').catch(() => {});
            }
            fact('opsctl', {tables, galleyMenu, updateFileDetails: /Update File Details/.test(s && s.text ? JSON.stringify(s.text) : '')});
        }
    } catch (e) {
        log('ERROR', e.stack);
        await snap('error').catch(() => {});
        fact('error', String(e.stack).slice(0, 1500));
    } finally {
        await close();
    }
});
