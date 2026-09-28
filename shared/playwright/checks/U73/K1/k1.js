// U73 claim check, chunk K1: framing and who may do what {OMP}, with the OJS/OPS absence controls.
// Spec: docs/specs/U73-publication-formats-proof-terms.md — Purpose 10–35 (with the absence paragraph),
// Actors & permissions 37–63, Rule 3 (the Author's view) 177–180, Cross-feature interactions, Canonical
// preamble, Coverage 422–547, A1 and A2 548–571; footnotes a, b, c, s, td1–td6, f-a1, f-a2.
//
//   RUN=r1 PROBE_FEATURE=U73 PROBE_AGENT=ccK1 node bin/probe.js <all|omp|ojs|ops> shared/playwright/checks/U73/K1/k1.js
//   PHASES=seed,offer,author,manage,light,pub,purpose,cross,extra (OMP) · seed,absence (OJS, OPS). Default: all of them.
//   K1_OFFER=b2-au,b2-se narrows the offer phase to those book-account pairs.
//   RUN names the run (r1, r2): each run seeds its own scratch contexts (state k1-state-<RUN>-<app>.json), writes
//   its facts to k1-<RUN>-facts-<app>.json and its snapshots as <RUN>-<name>-<app>.json/png. A full OMP run
//   outlasts the Bash cap: launch it detached (nohup … &).
//
// Scratch contexts (OMP):
//   P  a new press. Users: mg manager, ed editor (Press editor), pe productionEditor, se sectionEditor (assigned),
//      sn sectionEditor (assigned, "Permit submission metadata edit." off), su sectionEditor (not assigned),
//      le layoutEditor (assigned), lm layoutEditor (assigned, permission on), ce copyeditor, de designer, ix indexer,
//      pr proofreader, mk marketing, fu funding (each assigned), au author (the submitter), a2 author (a
//      participant, permission on), ax author (no book), rd reader.
//      b1 Production, a production-ready replacement.pdf, a chapter, the seeded format "PDF" (file, Open Access,
//         approved, available) and a remote format "Web" added on screen: who is offered the page (offer), the
//         Author's view (author, td1), each managing level's controls (manage, td2–td6, A1, A2), the axis of the
//         metadata-edit permission (light).
//      b2 Copyediting: which assistant role is offered the page (offer).
//      b3 published with "PDF": every assistant role on a published version (offer, pub); Sales Rights and the
//         book page (purpose, line 28).
//   X  "Enable for Publication Formats" and "Enable for Files" (Publisher ID) and URN for formats: x1 Production:
//      the "Identifiers" tabs and the URN step of "Format Approval" (cross, lines 431–433).
// OJS / OPS: J with one submission and a PDF galley: the side menu, the Galleys page and its row menu, and the
//   Publication Formats address typed (absence, lines 32–35).
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const T = 30_000;
const RUN = process.env.RUN || 'r1';
const ALL = ['seed', 'offer', 'author', 'manage', 'light', 'pub', 'purpose', 'cross', 'extra', 'absence'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',').map((s) => s.trim());
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k1]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k1-state-${RUN}-${app.name}.json`);
const fx = (app, f) => path.join(REPO, `apps/${app}/playwright/fixtures/files/${f}`);
const vis = '[role="dialog"]:visible';
const ASSIST = {le: 'layoutEditor', ce: 'copyeditor', de: 'designer', ix: 'indexer', pr: 'proofreader', mk: 'marketing', fu: 'funding'};

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`k1-${RUN}-facts`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };
    const PDF = fx(isOPS ? 'ops' : 'omp', isOPS ? 'preprint.pdf' : 'article.pdf');

    // ------------------------------------------------------------------ seed
    if (on('seed') && !S.seeded) {
        const t = tag('u73k1');
        S.t = t;
        if (isOMP) {
            const U = [
                ['mg', 'manager', 'Kim', 'Manager'], ['ed', 'editor', 'Eda', 'Editor'], ['pe', 'productionEditor', 'Pete', 'Production'],
                ['se', 'sectionEditor', 'Sam', 'Series'], ['sn', 'sectionEditor', 'Nina', 'Nometa'], ['su', 'sectionEditor', 'Uma', 'Unassigned'],
                ['le', 'layoutEditor', 'Lea', 'Layout'], ['lm', 'layoutEditor', 'Lou', 'Metalayout'], ['ce', 'copyeditor', 'Cara', 'Copy'],
                ['de', 'designer', 'Dee', 'Designer'], ['ix', 'indexer', 'Ian', 'Indexer'], ['pr', 'proofreader', 'Pia', 'Proof'],
                ['mk', 'marketing', 'Mark', 'Marketing'], ['fu', 'funding', 'Fay', 'Funding'],
                ['au', 'author', 'Ada', 'Author'], ['a2', 'author', 'Abe', 'Coauthor'], ['ax', 'author', 'Axel', 'Stranger'], ['rd', 'reader', 'Rae', 'Reader'],
            ];
            const p = `${t}p`;
            const c = await app.api.createContext({tag: p, users: U.map(([k, role, g, f]) => ({username: `${p}${k}`, roles: [role], givenName: g, familyName: f}))});
            S.P = {path: c.path, u: Object.fromEntries(U.map(([k]) => [k, `${p}${k}`])), subs: {}};
            const u = S.P.u;
            const assist = Object.entries(ASSIST).map(([k, role]) => ({username: u[k], role}));
            const staff = [
                {username: u.se, role: 'sectionEditor'},
                {username: u.sn, role: 'sectionEditor', canChangeMetadata: false},
                ...assist,
                {username: u.lm, role: 'layoutEditor', canChangeMetadata: true},
            ];
            const sub = async (s, extra) => {
                const r = await app.api.createSubmission({tag: `${p}${s}`, context: c.path, submitter: u.au, title: `K1 ${s} ${t}`, ...extra});
                S.P.subs[s] = {id: r.submissionId, pub: r.publicationId, formats: r.publicationFormats || null};
                return r;
            };
            const b1 = {files: [{file: 'article.pdf'}, {file: 'replacement.pdf', list: 'productionReady'}], decisions: ['skipExternalReview', 'sendToProduction'],
                chapters: [{title: 'K1 Chapter'}], publicationFormats: [{name: 'PDF', file: 'article.pdf'}]};
            try {
                await sub('b1', {...b1, participants: [...staff, {username: u.a2, role: 'author', canChangeMetadata: true}]});
                S.a2Participant = true;
            } catch (e) {
                S.a2Participant = flat(e.message, 400);
                await sub('b1', {...b1, participants: staff});
            }
            await sub('b2', {files: [{file: 'article.pdf'}], decisions: ['skipExternalReview'], participants: staff});
            await sub('b3', {files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction'], published: true,
                publicationFormats: [{name: 'PDF', file: 'article.pdf'}], participants: staff});
            // X: Publisher ID for formats and files, URN for formats
            const x = `${t}x`;
            const cx = await app.api.createContext({tag: x, users: [{username: `${x}mg`, roles: ['manager'], givenName: 'Xia', familyName: 'Manager'}, {username: `${x}au`, roles: ['author'], givenName: 'Xan', familyName: 'Author'}],
                enablePublisherId: ['representation', 'file'], plugins: {urnpubidplugin: {enabled: true, settings: {
                    urnPrefix: 'urn:nbn:de:0000-', urnResolver: 'https://nbn-resolving.de/', urnNamespace: 'urn:nbn:de', urnCheckNo: false,
                    enableRepresentationURN: true, urnSuffix: 'default'}}}});
            const rx = await app.api.createSubmission({tag: `${x}1`, context: cx.path, submitter: `${x}au`, title: `K1 X1 ${t}`, files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction']});
            S.X = {path: cx.path, mg: `${x}mg`, subs: {x1: {id: rx.submissionId, pub: rx.publicationId}}};
        } else {
            const p = `${t}j`;
            const c = await app.api.createContext({tag: p, users: [{username: `${p}mg`, roles: ['manager'], givenName: 'Kim', familyName: 'Manager'}, {username: `${p}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'}]});
            S.J = {path: c.path, mg: `${p}mg`, au: `${p}au`, subs: {}};
            const r = await app.api.createSubmission({tag: `${p}1`, context: c.path, submitter: S.J.au, title: `K1 J1 ${t}`,
                galleys: [{label: 'PDF', locale: 'en', file: isOPS ? 'preprint.pdf' : 'article.pdf'}]});
            S.J.subs['1'] = {id: r.submissionId, pub: r.publicationId};
        }
        S.seeded = true;
        save();
        log('seeded', JSON.stringify(S).slice(0, 2500));
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
    await page.exposeFunction('__k1Notice', (text) => notices.push({at: Date.now(), text}));
    await page.addInitScript(() => {
        const seen = new WeakSet();
        new MutationObserver(() => {
            document.querySelectorAll('.app__notifications .pkpNotification, .pkp_notification').forEach((e) => {
                if (seen.has(e)) return;
                const t = (e.textContent || '').replace(/\s+/g, ' ').trim();
                if (!t) return;
                seen.add(e);
                window.__k1Notice(t);
            });
        }).observe(document, {childList: true, subtree: true});
    });
    const noticesSince = (t0) => notices.filter((n) => n.at >= t0).map((n) => n.text);
    // ---- the grids' own requests (op, status, JSON head) and download answers
    const posts = [];
    page.on('response', async (r) => {
        const m = r.request().method();
        const u = r.url();
        if (!/\$\$\$call\$\$\$|\/api\/v1\/|catalog\/(view|download|book)/.test(u)) return;
        if (/_test\//.test(u)) return;
        const h = r.headers();
        let body = '';
        if (!/download/i.test(u)) { try { body = (await r.text()).slice(0, 600); } catch { /* */ } }
        posts.push({at: Date.now(), method: m, status: r.status(), url: u.replace(/^.*\/index\.php\/[^/]+/, '').slice(0, 200), body: flat(body, 300), cd: h['content-disposition'] || null, ct: (h['content-type'] || '').slice(0, 40)});
    });
    const postsSince = (t0, all = false) => posts.filter((p) => p.at >= t0).filter((p) => all || p.method !== 'GET' || p.status >= 400 || /fetch-grid|fetchGrid|download/i.test(p.url))
        .map((p) => `${p.method} ${p.status} ${p.url.slice(0, 110)}${p.cd ? ` [cd ${p.cd.slice(0, 60)}]` : ''} ${p.body.slice(0, 160)}`);

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
    const out = async () => { await signOut(page).catch(() => {}); who = null; };

    const wf = () => page.locator(vis).first();
    const top = () => page.locator(vis).last();
    const winCount = () => page.locator(vis).count();
    const grid = () => wf().locator('[id^="component-grid-catalogentry-publicationformatgrid"]').first();

    async function openWf(ctx, id, key, {author = false, name, extra} = {}) {
        const t0 = Date.now();
        const resp = await page.goto(wfUrl(ctx, id, key, author));
        await idle(page);
        await wf().waitFor({timeout: 15000}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page);
        await sleep(300);
        const r = {status: resp ? resp.status() : null, url: page.url().replace(/^.*\/index\.php/, ''), posts: postsSince(t0).filter((x) => !/^GET 2/.test(x))};
        if (name) await snap(name, {...extra, open: r});
        return r;
    }
    const menuItems = async () => wf().getByRole('navigation').first().evaluate((nav) => [...nav.querySelectorAll('a, button')].map((a) => a.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => null);
    async function formatsPage(k, s, {name, author, ctx} = {}) {
        const sub = (ctx || S[k]).subs[s];
        const open = await openWf((ctx || S[k]).path, sub.id, `publication_${sub.pub}_publicationFormats`, {author});
        await grid().waitFor({timeout: 15000}).catch(() => {});
        await idle(page);
        const info = await gridInfo();
        info.open = open;
        info.menu = await menuItems();
        info.lines = await wfLines(/published|can not be edited|Warning|access|permission|not found|Error/i);
        if (name) await snap(name, {grid: info});
        return info;
    }
    const wfLines = async (re) => ((await wf().innerText().catch(() => '')) || '').split('\n').map((x) => x.trim()).filter((x) => re.test(x)).slice(0, 12);
    const reload = async () => { await page.reload(); await idle(page); await grid().waitFor({timeout: 20000}).catch(() => {}); await idle(page); await sleep(300); };
    // The page as data: heading, the grid's heading and add link, columns, each row's cells and links.
    async function gridInfo() {
        return wf().evaluate((d) => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const tc = (e) => { if (!e) return ''; const c = e.cloneNode(true); c.querySelectorAll('script, style').forEach((x) => x.remove()); return c.textContent; };
            const v = (e) => e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
            const heading = [...d.querySelectorAll('h1, h2')].filter(v).map((h) => f(h.textContent)).filter(Boolean).slice(0, 4);
            const g = d.querySelector('[id^="component-grid-catalogentry-publicationformatgrid"]');
            if (!g) return {present: false, heading, text: f(d.innerText).slice(0, 900)};
            const gridHeading = f(g.querySelector('.header h4')?.textContent);
            const actions = [...g.querySelectorAll('.header .actions a')].filter(v).map((a) => f(a.textContent));
            const cols = [...g.querySelectorAll('thead th')].filter(v).map((t) => f(t.textContent));
            const rows = [...g.querySelectorAll('tbody tr')].filter(v).map((tr) => {
                if (tr.classList.contains('row_controls')) return null;
                const onix = tr.querySelector('.onix_code');
                const label = tr.querySelector('.label');
                const nameLink = label ? label.querySelector('a') : null;
                return {
                    id: tr.id || null, kind: onix ? 'format' : tr.querySelector('a.pkp_linkaction_downloadFile') ? 'file' : 'other',
                    cells: [...tr.children].map((c) => f(tc(c))),
                    arrow: !!tr.querySelector('a.show_extras, a.hide_extras'),
                    nameLink: nameLink ? {text: f(tc(nameLink)), href: nameLink.getAttribute('href'), target: nameLink.getAttribute('target'), cls: nameLink.className.slice(0, 80)} : null,
                    number: tr.querySelector('.file_extension') ? f(tr.querySelector('.file_extension').textContent) : null,
                    links: [...tr.querySelectorAll('a')].filter(v).map((a) => f(tc(a)) || `[${f(a.querySelector('.pkp_screen_reader')?.textContent) || a.className.slice(0, 40)}]`),
                };
            }).filter(Boolean);
            return {present: true, heading, gridHeading, actions, cols, rows};
        }).catch((e) => ({error: String(e.message).slice(0, 300)}));
    }
    const rowsBrief = (g) => (g.rows || []).map((r) => `${r.kind}: ${r.cells.join(' | ')}${r.arrow ? ' [arrow]' : ''}${r.nameLink && r.kind === 'format' ? ` [link ${r.nameLink.href} ${r.nameLink.target}]` : ''} {${r.links.join(', ')}}`);
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const fmtBody = (n) => grid().locator('tbody.category_grid_body').filter({has: page.locator('span.label', {has: page.locator('.onix_code'), hasText: new RegExp(`^\\s*${esc(n)}`)})}).first();
    const formatRow = (n) => fmtBody(n).locator('tr.gridRow').filter({has: page.locator('.onix_code')}).first();
    const fileRow = (n, text = '', nth = 0) => fmtBody(n).locator('tr.gridRow').filter({has: page.locator('a.pkp_linkaction_downloadFile')}).filter({hasText: text}).nth(nth);
    async function rowArrow(row, press) {
        await row.waitFor({timeout: 20000});
        const id = await row.getAttribute('id');
        if (!(await row.locator('a.show_extras, a.hide_extras').count())) return {arrow: false, entries: []};
        if (await row.locator('a.show_extras').count()) await row.locator('a.show_extras').first().click();
        await sleep(400);
        const ctl = page.locator(`[id="${id}-control-row"]`);
        const entries = await ctl.locator('a').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
        if (press) {
            const a = ctl.getByRole('link', {name: press, exact: true}).first();
            if (!(await a.count())) return {arrow: true, entries, missing: press};
            await a.click();
            await idle(page);
        }
        return {arrow: true, entries};
    }
    // The top window as data.
    async function winInfo(w = top()) {
        return w.evaluate((d) => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const v = (e) => e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
            const lab = d.getAttribute('aria-labelledby');
            const title = d.getAttribute('aria-label') || (lab && document.getElementById(lab)?.textContent.trim()) || null;
            const headings = [...d.querySelectorAll('h1,h2,h3,h4,legend')].filter(v).map((h) => f(h.textContent)).filter(Boolean).slice(0, 12);
            const tabs = [...d.querySelectorAll('[role=tab]')].filter(v).map((t) => `${f(t.textContent)}${t.getAttribute('aria-selected') === 'true' ? '*' : ''}`);
            const fields = [...d.querySelectorAll('form input:not([type=hidden]), form select, form textarea')].filter(v).map((e) => {
                const lbl = e.id ? d.querySelector(`label[for="${e.id}"]`) : null;
                return `${e.name}${lbl ? `〔${f(lbl.textContent).slice(0, 60)}〕` : ''}=${JSON.stringify(e.type === 'checkbox' || e.type === 'radio' ? e.checked : (e.value || '').slice(0, 40))}${e.disabled ? '(dis)' : ''}`;
            });
            const errors = [...d.querySelectorAll('label.error, .pkp_form_error, .pkpFormError')].filter(v).map((e) => f(e.textContent)).filter(Boolean);
            const buttons = [...d.querySelectorAll('button, a.pkp_button, input[type=submit], form a')].filter(v).map((b) => `${f(b.textContent || b.value || b.getAttribute('aria-label'))}${b.disabled ? '(disabled)' : ''}`).filter(Boolean);
            const clone = d.cloneNode(true);
            clone.querySelectorAll('option, script, style').forEach((x) => x.remove());
            return {title, headings, tabs, fields: fields.slice(0, 40), errors, buttons: buttons.slice(0, 30), text: f(clone.innerText || clone.textContent).slice(0, 2500)};
        }).catch((e) => ({error: String(e.message).slice(0, 300)}));
    }
    const brief = (w) => ({title: w.title, headings: w.headings, tabs: w.tabs, text: flat(w.text, 700), buttons: w.buttons, errors: w.errors});
    async function winSnap(name, extra = {}) {
        const w = await winInfo();
        await snap(name, {win: w, ...extra});
        return w;
    }
    async function waitNewWindow(n0, ms = 15000) {
        await page.waitForFunction((n) => [...document.querySelectorAll('[role="dialog"]')].filter((e) => e.getClientRects().length).length > n, n0, {timeout: ms}).catch(() => {});
        await idle(page); await sleep(900); await idle(page);
    }
    async function closeTop(ans = 'accept') {
        const t0 = Date.now();
        answer = ans;
        const before = await winCount();
        await top().getByRole('button', {name: 'Close', exact: true}).first().click({timeout: 5000}).catch(() => {});
        await sleep(1000);
        await idle(page);
        answer = 'dismiss';
        return {windowsBefore: before, windowsAfter: await winCount(), dialogs: dialogsSince(t0)};
    }
    // Close every window above the workflow dialog.
    async function closeAbove() {
        for (let i = 0; i < 4 && (await winCount()) > 1; i++) await closeTop('accept');
    }
    async function pressIn(label, {ans = 'dismiss'} = {}) {
        const t0 = Date.now();
        answer = ans;
        const before = await winCount();
        const b = top().getByRole('button', {name: label, exact: true}).or(top().getByRole('link', {name: label, exact: true})).last();
        let err = null;
        await b.click({timeout: 5000}).catch((e) => { err = flat(e.message, 160); });
        await sleep(1500); await idle(page); await sleep(500);
        answer = 'dismiss';
        const after = await winCount();
        const r = {err, windowsBefore: before, windowsAfter: after, notices: noticesSince(t0), posts: postsSince(t0), dialogs: dialogsSince(t0)};
        if (after >= before) r.topAfter = brief(await winInfo());
        return r;
    }
    const nameBox = () => top().locator('input[name^="name"]:visible').first();
    async function waitForm() {
        await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog] form input[name^="name"]')].some((e) => e.getClientRects().length), null, {timeout: T}).catch(() => {});
        await idle(page); await sleep(400);
    }
    async function openAdd() {
        await grid().getByRole('link', {name: 'Add publication format'}).first().click();
        await waitForm();
    }
    // A status link in a row ("Awaiting Approval", "Not Available", "Set Terms"…) › its window › a button.
    async function statusWindow(row, linkRe, name, {press = 'OK'} = {}) {
        const t0 = Date.now();
        const a = row.locator('a').filter({hasText: linkRe}).first();
        const exists = await a.count();
        if (!exists) return {missing: String(linkRe), rowText: flat(await row.innerText().catch(() => null), 200)};
        const linkText = flat(await a.textContent(), 40);
        const n0 = await winCount();
        await a.click();
        await waitNewWindow(n0);
        const w = await winSnap(name);
        const r = {linkText, windowsOpened: (await winCount()) - n0, win: brief(w), openPosts: postsSince(t0), openNotices: noticesSince(t0), openDialogs: dialogsSince(t0)};
        if (press && (await winCount()) > n0) {
            r.press = await pressIn(press);
            if (r.press.windowsAfter > n0) await snap(`${name}-after-press`, {press: r.press});
        }
        await closeAbove();
        return r;
    }
    // ---- the upload wizard ("Change File")
    const wizard = () => page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
    const contBtn = () => wizard().getByRole('button', {name: 'Continue', exact: true});
    async function wizUpload(file) {
        await wizard().locator('input[type="file"]').waitFor({state: 'attached', timeout: T});
        await idle(page);
        const g = wizard().locator('select[id^="genreId"]');
        if (await g.count() && await g.isVisible().catch(() => false)) {
            const genres = await g.locator('option').evaluateAll((els) => els.map((o) => o.value).filter(Boolean));
            await g.selectOption(genres[0]);
        }
        await wizard().locator('input[type="file"]').setInputFiles(file);
        const until = Date.now() + 30000;
        while (Date.now() < until) { if (await contBtn().isEnabled().catch(() => false)) break; await sleep(200); }
        for (const n of [2, 3]) {
            await contBtn().click();
            await wizard().getByRole('tab', {name: new RegExp(`^${n}\\.`)}).and(page.locator('[aria-selected="true"]')).waitFor({timeout: 30000}).catch(() => {});
            await idle(page);
        }
        await wizard().getByRole('button', {name: 'Complete', exact: true}).waitFor({timeout: 20000}).catch(() => {});
        await wizard().getByRole('button', {name: 'Complete', exact: true}).click();
        await wizard().waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
        await idle(page); await sleep(900); await idle(page);
    }
    async function changeFile(fmt, file) {
        const t0 = Date.now();
        const link = formatRow(fmt).getByRole('link', {name: 'Change File', exact: true}).first();
        if (!(await link.count())) return {offered: false};
        await link.click();
        let err = null;
        await wizUpload(file).catch((e) => { err = flat(e.message, 200); });
        await sleep(600);
        return {offered: true, err, notices: noticesSince(t0), posts: postsSince(t0), dialogs: dialogsSince(t0)};
    }
    async function addFormat(nm, {fill} = {}) {
        const t0 = Date.now();
        const link = grid().getByRole('link', {name: 'Add publication format'}).first();
        if (!(await link.count())) return {offered: false};
        await openAdd();
        await nameBox().fill(nm);
        if (fill) await fill();
        const r = await pressIn('OK');
        return {offered: true, ...r, allNotices: noticesSince(t0)};
    }
    const metaForm = () => top().locator('form[id^="publicationMetadataEntryForm-"]');
    const G4 = ['identificationCodeGridContainer', 'salesRightsGridContainer', 'marketsGridContainer', 'publicationDateGridContainer'];
    async function metaTab() {
        const t0 = Date.now();
        await top().locator('[role=tab]').filter({hasText: /^\s*Metadata\s*$/}).first().click();
        await metaForm().waitFor({state: 'visible', timeout: T}).catch(() => {});
        for (const g of G4) await metaForm().locator(`[id^="${g}"] table`).first().waitFor({timeout: 12000}).catch(() => {});
        await idle(page); await sleep(800); await idle(page);
        const lists = await metaForm().evaluate((form, ids) => ids.map((id) => {
            const g = form.querySelector(`[id^="${id}"]`);
            if (!g) return {id, container: false};
            const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
            return {id, container: true, table: !!g.querySelector('table'), title: t(g.querySelector('.header h4')), links: [...g.querySelectorAll('a')].filter((a) => a.getClientRects().length).map(t).filter(Boolean),
                text: t(g).slice(0, 300), html: g.innerHTML.replace(/\s+/g, ' ').slice(0, 300)};
        }), G4).catch((e) => `ERR ${flat(e.message, 200)}`);
        // any other window that opened on the way in (an error window)
        const windows = await page.locator(vis).evaluateAll((ds) => ds.map((d) => (d.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200)));
        return {lists, windows, posts: postsSince(t0, true).filter((x) => /catalogEntry|grid/i.test(x)).slice(0, 12), notices: noticesSince(t0), dialogs: dialogsSince(t0)};
    }
    async function openEditWindow(fmt) {
        const n0 = await winCount();
        const r = await rowArrow(formatRow(fmt), 'Edit');
        if (r.missing || !r.arrow) return r;
        await waitNewWindow(n0);
        await waitForm();
        return r;
    }
    async function readDownload(link) {
        const t0 = Date.now();
        const dl = page.waitForEvent('download', {timeout: 15000}).catch(() => null);
        await link.click().catch(() => {});
        const d = await dl;
        await sleep(800);
        return {download: d ? d.suggestedFilename() : null, url: page.url().replace(/^.*\/index\.php/, ''), posts: postsSince(t0, true).filter((x) => /download|file/i.test(x)).slice(0, 4)};
    }

    // =================================================================== phases
    try {
        // ---------------------------------------------------------------- offer (lines 39–52: who is offered the page)
        if (isOMP && on('offer')) {
            const P = S.P;
            const u = P.u;
            const res = {};
            const cases = [
                ['b1', ['mg', 'admin', 'ed', 'pe', 'se', 'sn', 'su', 'le', 'lm', 'ce', 'de', 'ix', 'pr', 'mk', 'fu', 'au', 'a2', 'ax', 'rd']],
                ['b2', ['se', 'le', 'lm', 'ce', 'de', 'ix', 'pr', 'mk', 'fu', 'au']],
                ['b3', ['le', 'lm', 'ce', 'de', 'ix', 'pr', 'mk', 'fu', 'au']],
            ];
            for (const [b, keys] of cases) {
                const sub = P.subs[b];
                for (const k of keys) {
                    if (process.env.K1_OFFER && !process.env.K1_OFFER.split(',').includes(`${b}-${k}`)) continue;
                    const user = k === 'admin' ? 'admin' : u[k];
                    const author = ['au', 'a2', 'ax'].includes(k);
                    await as(user, P.path);
                    // the workflow as a person opens it (no page chosen): the side menu
                    const o1 = await openWf(P.path, sub.id, null, {author});
                    const menu = await menuItems();
                    // the Publication Formats address typed
                    const g = await formatsPage('P', b, {author, name: `o-${b}-${k}`});
                    res[`${b}-${k}`] = {open: o1, menu, typed: {present: g.present, actions: g.actions, cols: g.cols, rows: rowsBrief(g), heading: g.heading, menu: g.menu, lines: g.lines, status: g.open.status, url: g.open.url, posts: g.open.posts, text: g.present ? undefined : flat(g.text, 400)}};
                    fact(`offer-${b}-${k}`, res[`${b}-${k}`]);
                }
            }
        }

        // ---------------------------------------------------------------- the remote format "Web" on b1 (needed by author, manage)
        if (isOMP && (on('author') || on('manage')) && !S.webAdded) {
            const P = S.P;
            await as(P.u.mg, P.path);
            await formatsPage('P', 'b1');
            const r = await addFormat('Web', {fill: async () => {
                await top().locator('input[name="remotelyHostedContent"]').check();
                await sleep(300);
                await top().locator('input[name="remoteURL"]').fill('https://example.org/k1-web');
            }});
            S.webAdded = true; save();
            fact('web-added', r);
        }

        // ---------------------------------------------------------------- author (td1; Actors row 1; Rule 3)
        if (isOMP && on('author')) {
            const P = S.P;
            const res = {};
            for (const k of ['au', 'a2']) {
                await as(P.u[k], P.path);
                const g = await formatsPage('P', 'b1', {author: true, name: `a-${k}-page`});
                const r = {heading: g.heading, gridHeading: g.gridHeading, actions: g.actions, cols: g.cols, rows: rowsBrief(g), lines: g.lines,
                    nameLinks: (g.rows || []).map((x) => x.nameLink).filter(Boolean)};
                // the arrow, status links: counts in the grid
                r.counts = await grid().evaluate((gg) => ({arrows: gg.querySelectorAll('a.show_extras').length,
                    statusLinks: [...gg.querySelectorAll('a')].filter((a) => /Awaiting Approval|Approved|Not Available|Available|Set Terms|Open Access|Direct Sales/.test(a.textContent)).length,
                    changeFile: [...gg.querySelectorAll('a')].filter((a) => /Change File|Select Files/.test(a.textContent)).length})).catch((e) => flat(e.message, 100));
                // press the file's name
                const fl = fileRow('PDF').locator('a.pkp_linkaction_downloadFile').first();
                if (await fl.count()) {
                    r.fileName = flat(await fl.textContent(), 80);
                    r.download = await readDownload(fl);
                    await snap(`a-${k}-after-file-press`, {download: r.download});
                }
                // the remote format's name
                const wl = formatRow('Web').locator('.label a').first();
                if (await wl.count()) {
                    r.webLink = {href: await wl.getAttribute('href'), target: await wl.getAttribute('target')};
                    const pop = page.waitForEvent('popup', {timeout: 8000}).catch(() => null);
                    await wl.click().catch(() => {});
                    const pp = await pop;
                    r.webPopup = pp ? pp.url() : null;
                    if (pp) await pp.close().catch(() => {});
                }
                // the author types the editorial address of the same page
                const ge = await formatsPage('P', 'b1', {name: `a-${k}-editorial-typed`});
                r.editorialTyped = {present: ge.present, actions: ge.actions, cols: ge.cols, rows: rowsBrief(ge), status: ge.open.status, url: ge.open.url, text: ge.present ? undefined : flat(ge.text, 300)};
                res[k] = r;
                fact(`author-${k}`, r);
            }
            await loc(page, 'Author view: the Publication Formats grid', grid());
        }

        // ---------------------------------------------------------------- manage (td2–td6; Actors rows 2–6; A1, A2)
        if (isOMP && on('manage')) {
            const P = S.P;
            for (const k of (process.env.K1_ROLES || 'mg,se,le').split(',')) {
                const F = `F${k}`;
                const r = {};
                await as(P.u[k], P.path);
                const g0 = await formatsPage('P', 'b1', {name: `m-${k}-01-page`});
                r.page = {actions: g0.actions, cols: g0.cols, rows: rowsBrief(g0)};
                r.arrowSeeded = await rowArrow(formatRow('PDF'));
                r.arrowSeededFile = await rowArrow(fileRow('PDF'));
                await snap(`m-${k}-02-arrows`, {arrows: [r.arrowSeeded, r.arrowSeededFile]});
                // td2: add a format
                if (!S[`added-${k}`]) {
                    r.add = await addFormat(F);
                    const g1 = await gridInfo();
                    await snap(`m-${k}-03-after-add`, {grid: g1, add: r.add});
                    r.afterAdd = rowsBrief(g1);
                    await reload();
                    r.afterAddReload = rowsBrief(await gridInfo());
                    S[`added-${k}`] = true; save();
                }
                r.arrowNew = await rowArrow(formatRow(F));
                await snap(`m-${k}-04-new-arrow`, {arrow: r.arrowNew});
                // td3: Change File on the new format
                r.change = await changeFile(F, PDF);
                const g2 = await gridInfo();
                await snap(`m-${k}-05-after-upload`, {grid: g2, change: r.change});
                r.afterUpload = rowsBrief(g2);
                // td3: Select Files
                {
                    const t0 = Date.now();
                    const sl = formatRow(F).getByRole('link', {name: 'Select Files', exact: true}).first();
                    if (await sl.count()) {
                        const n0 = await winCount();
                        await sl.click();
                        await waitNewWindow(n0);
                        await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog] #manageProofFilesForm tbody tr')].some((e) => e.getClientRects().length), null, {timeout: 12000}).catch(() => {});
                        await idle(page); await sleep(800);
                        const w = await winSnap(`m-${k}-06-select-files`);
                        const listRows = await top().locator('#manageProofFilesForm tbody tr').evaluateAll((trs) => trs.filter((x) => x.getClientRects().length).map((x) => x.innerText.replace(/\s+/g, ' ').trim())).catch(() => null);
                        const listHtml = await top().locator('#manageProofFilesForm').evaluate((f) => {
                            const c = f.querySelector('[id*="ManageProofFiles"], [id*="manageprooffiles"], [id^="component-grid-files-proof"]');
                            return c ? c.innerHTML.replace(/\s+/g, ' ').slice(0, 400) : f.innerHTML.replace(/\s+/g, ' ').slice(0, 600);
                        }).catch(() => null);
                        r.select = {windowsOpened: (await winCount()) - n0, win: brief(w), listRows, listHtml, openPosts: postsSince(t0, true).filter((x) => /proof|ManageProof|select/i.test(x)), notices: noticesSince(t0), dialogs: dialogsSince(t0)};
                        const box = top().locator('#manageProofFilesForm tbody tr').filter({hasText: 'replacement.pdf'}).locator('input[type=checkbox]').first();
                        if (await box.count()) { await box.check().catch(() => {}); r.select.ticked = true; }
                        r.select.ok = await pressIn('OK');
                        if ((await winCount()) > 1) await snap(`m-${k}-06b-select-after-ok`, {ok: r.select.ok});
                        await closeAbove();
                        const g3 = await gridInfo();
                        r.select.after = rowsBrief(g3);
                    } else r.select = {offered: false};
                }
                await reload();
                // td4: approve the format, revoke, approve its file
                r.fmtApprove = await statusWindow(formatRow(F), /^\s*Awaiting Approval\s*$/, `m-${k}-07-format-approval`);
                await reload();
                r.fmtAfterApprove = flat(await formatRow(F).innerText().catch(() => null), 200);
                r.fmtRevoke = await statusWindow(formatRow(F), /^\s*Approved\s*$/, `m-${k}-08-format-approved`);
                await reload();
                r.fmtAfterRevoke = flat(await formatRow(F).innerText().catch(() => null), 200);
                r.fileApprove = await statusWindow(fileRow(F), /^\s*Awaiting Approval\s*$/, `m-${k}-09-approve-proof`);
                await reload();
                r.fileAfterApprove = flat(await fileRow(F).innerText().catch(() => null), 200);
                // td5: availability, then the file's terms
                r.avail = await statusWindow(formatRow(F), /^\s*Not Available\s*$/, `m-${k}-10-format-availability`);
                r.availSamePage = flat(await formatRow(F).innerText().catch(() => null), 200);
                await reload();
                r.availAfterReload = flat(await formatRow(F).innerText().catch(() => null), 200);
                await snap(`m-${k}-11-after-availability`, {row: r.availAfterReload});
                {
                    const t0 = Date.now();
                    const a = fileRow(F).locator('a').filter({hasText: /^\s*(Set Terms|Open Access|Direct Sales|Not Available)\s*$/}).first();
                    if (await a.count()) {
                        const n0 = await winCount();
                        r.terms = {link: flat(await a.textContent(), 40)};
                        await a.click();
                        await waitNewWindow(n0);
                        const w = await winSnap(`m-${k}-12-terms`);
                        r.terms.windowsOpened = (await winCount()) - n0;
                        r.terms.win = brief(w);
                        r.terms.form = await page.locator('form#approvedProofForm:visible').count();
                        r.terms.openPosts = postsSince(t0, true).filter((x) => /Proof|approved/i.test(x));
                        r.terms.notices = noticesSince(t0);
                        if (r.terms.form) {
                            await page.locator('form#approvedProofForm:visible input[type=radio][value="openAccess"]').click().catch(() => {});
                            r.terms.save = await pressIn('Save');
                            if ((await winCount()) > n0) await snap(`m-${k}-12b-terms-after-save`, {save: r.terms.save});
                        }
                        await closeAbove();
                        r.terms.samePage = flat(await fileRow(F).innerText().catch(() => null), 200);
                        await reload();
                        r.terms.afterReload = flat(await fileRow(F).innerText().catch(() => null), 200);
                    } else r.terms = {offered: false};
                }
                // Edit (rename) — td2's "edit"
                {
                    const e = await openEditWindow(F);
                    r.editArrow = e.entries;
                    if (!e.missing && e.arrow) {
                        const w = await winSnap(`m-${k}-13-edit-window`);
                        r.editWin = {title: w.title, tabs: w.tabs};
                        // A2 / td6: the Metadata tab
                        r.meta = await metaTab();
                        await snap(`m-${k}-14-metadata`, {meta: r.meta});
                        const comp = metaForm().locator('select[name="productCompositionCode"]');
                        if (await comp.count()) {
                            await comp.selectOption({label: 'Single-component retail product (00)'}).catch(() => {});
                            // leave the tab with the change unsaved: the Edit tab
                            const t0 = Date.now();
                            answer = 'dismiss';
                            await top().getByRole('tab', {name: 'Edit', exact: true}).first().click().catch(() => {});
                            await sleep(1200); await idle(page);
                            r.meta.leaveUnsaved = {dialogs: dialogsSince(t0), tabs: (await winInfo()).tabs};
                            // save
                            const t1 = Date.now();
                            await metaForm().getByRole('button', {name: 'Save', exact: true}).first().click().catch(() => {});
                            await sleep(1800); await idle(page);
                            r.meta.save = {windows: await winCount(), notices: noticesSince(t1), posts: postsSince(t1), dialogs: dialogsSince(t1)};
                            await snap(`m-${k}-15-metadata-saved`, {save: r.meta.save});
                        }
                        await closeAbove();
                        await reload();
                        // reopen: kept?
                        const e2 = await openEditWindow(F);
                        if (!e2.missing && e2.arrow) {
                            const m2 = await metaTab();
                            r.meta.reopened = await metaForm().locator('select[name="productCompositionCode"]').evaluate((s) => s.options[s.selectedIndex]?.text || '').catch(() => null);
                            r.meta.reopenedLists = m2.lists;
                            await snap(`m-${k}-16-metadata-reopened`, {meta: m2, composition: r.meta.reopened});
                            // back to Edit: ISBN-13 and a new name
                            await top().getByRole('tab', {name: 'Edit', exact: true}).first().click().catch(() => {});
                            await waitForm();
                            await top().locator('input[name="isbn13"]').fill('978-951-98548-9-2').catch(() => {});
                            await nameBox().fill(`R${k}`);
                            r.editSave = await pressIn('OK');
                            await closeAbove();
                            await reload();
                            r.afterEdit = rowsBrief(await gridInfo()).filter((x) => /R\w\w|F\w\w/.test(x));
                            await snap(`m-${k}-17-after-edit`, {rows: r.afterEdit});
                        }
                    }
                }
                // Delete: a format added for it
                {
                    const D = `D${k}`;
                    r.delAdd = await addFormat(D);
                    await reload();
                    const t0 = Date.now();
                    const e = await rowArrow(formatRow(D), 'Delete');
                    if (!e.missing && e.arrow) {
                        await sleep(800);
                        const w = await winSnap(`m-${k}-18-delete-dialog`);
                        r.del = {win: brief(w), ok: await pressIn('OK')};
                        await closeAbove();
                        r.del.samePage = rowsBrief(await gridInfo()).filter((x) => new RegExp(`^format: ${D}`).test(x));
                        await reload();
                        r.del.afterReload = rowsBrief(await gridInfo()).filter((x) => new RegExp(`^format: ${D}`).test(x));
                    } else r.del = {arrow: e};
                    r.del.notices = noticesSince(t0);
                }
                const gEnd = await formatsPage('P', 'b1', {name: `m-${k}-19-end`});
                r.end = rowsBrief(gEnd);
                fact(`manage-${k}`, r);
            }
            // the Press manager reads the Layout Editor's and the Series editor's format: the ISBN typed on "Edit"
            await as(S.P.u.mg, S.P.path);
            await formatsPage('P', 'b1');
            const isbn = {};
            for (const k of ['se', 'le']) {
                if (!(await formatRow(`R${k}`).count())) { isbn[k] = 'no such format'; continue; }
                const e = await openEditWindow(`R${k}`);
                if (!e.missing && e.arrow) {
                    const m = await metaTab();
                    isbn[k] = {lists: m.lists.map ? m.lists.map((x) => `${x.id}: ${x.text}`) : m.lists,
                        composition: await metaForm().locator('select[name="productCompositionCode"]').evaluate((s) => s.options[s.selectedIndex]?.text || '').catch(() => null)};
                    await snap(`m-mg-20-reads-${k}-metadata`, {meta: m});
                    await closeAbove();
                } else isbn[k] = e;
            }
            fact('manage-mg-reads', isbn);
        }

        // ---------------------------------------------------------------- light (the metadata-edit permission's axis; Actors row 1, 50–52)
        if (isOMP && on('light')) {
            const P = S.P;
            for (const k of ['sn', 'lm', 'admin']) {
                const user = k === 'admin' ? 'admin' : P.u[k];
                await as(user, P.path);
                const g = await formatsPage('P', 'b1', {name: `l-${k}-page`});
                const r = {actions: g.actions, cols: g.cols, rows: rowsBrief(g)};
                r.arrowFmt = await rowArrow(formatRow('PDF'));
                r.arrowFile = await rowArrow(fileRow('PDF'));
                const e = await openEditWindow('PDF');
                if (!e.missing && e.arrow) {
                    r.meta = await metaTab();
                    await snap(`l-${k}-metadata`, {meta: r.meta});
                    await closeAbove();
                }
                // availability on the seeded (available) format: the window and Cancel only
                r.availWindow = await statusWindow(formatRow('PDF'), /^\s*Available\s*$/, `l-${k}-availability`, {press: 'Cancel'});
                fact(`light-${k}`, r);
            }
        }

        // ---------------------------------------------------------------- pub (every assistant role on a published version)
        if (isOMP && on('pub')) {
            const P = S.P;
            for (const k of ['le', 'ix', 'ce']) {
                await as(P.u[k], P.path);
                const g = await formatsPage('P', 'b3', {name: `p-${k}-page`});
                const r = {actions: g.actions, cols: g.cols, rows: rowsBrief(g), lines: g.lines};
                if (!g.present) { r.text = flat(g.text, 600); fact(`pub-${k}`, r); continue; }
                r.arrowFmt = await rowArrow(formatRow('PDF'));
                r.add = await addFormat(`P${k}`);
                await reload();
                r.after = rowsBrief(await gridInfo());
                await snap(`p-${k}-after-add`, {rows: r.after});
                r.avail = await statusWindow(formatRow(`P${k}`), /^\s*Not Available\s*$/, `p-${k}-availability`);
                fact(`pub-${k}`, r);
            }
        }

        // ---------------------------------------------------------------- purpose (lines 12–30, as the Press manager)
        if (isOMP && on('purpose')) {
            const P = S.P;
            const r = {};
            await as(P.u.mg, P.path);
            await formatsPage('P', 'b1', {name: 'u-01-page'});
            await openAdd();
            const w = await winSnap('u-02-add-window');
            r.addWin = {title: w.title, tabs: w.tabs, fields: w.fields};
            r.kinds = await top().locator('select[name="entryKey"] option').allTextContents().then((a) => a.map((x) => x.trim())).catch(() => null);
            r.labels = await top().locator('form').first().evaluate((f) => [...f.querySelectorAll('label')].map((l) => l.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => null);
            await closeTop('accept');
            // the seeded file's terms window
            const tw = await statusWindow(fileRow('PDF'), /^\s*(Open Access|Set Terms)\s*$/, 'u-03-terms', {press: null});
            r.terms = tw;
            r.termsLabels = null;
            // approval and availability window titles on the seeded format and file
            r.fmtApproved = await statusWindow(formatRow('PDF'), /^\s*Approved\s*$/, 'u-04-format-approved', {press: null});
            r.fileAwaiting = await statusWindow(fileRow('PDF'), /^\s*Awaiting Approval\s*$/, 'u-05-file-approval', {press: null});
            r.fmtAvailable = await statusWindow(formatRow('PDF'), /^\s*Available\s*$/, 'u-06-format-available', {press: 'Cancel'});
            // the "Metadata" tab's lists
            const e = await openEditWindow('PDF');
            if (!e.missing) {
                r.editTabs = (await winInfo()).tabs;
                r.meta = await metaTab();
                await snap('u-07-metadata', {meta: r.meta});
                await closeAbove();
            }
            fact('purpose', r);
            // line 28: a Sales Rights entry on the published book's format, then the book page
            const s = {};
            await formatsPage('P', 'b3');
            const e3 = await openEditWindow('PDF');
            if (!e3.missing) {
                await metaTab();
                const add = metaForm().locator('[id^="salesRightsGridContainer"]').getByRole('link', {name: /Add Sales Rights/}).first();
                if (await add.count()) {
                    const n0 = await winCount();
                    await add.click();
                    await waitNewWindow(n0);
                    const sw = await winSnap('u-08-sales-rights-window');
                    s.win = brief(sw);
                    s.types = await top().locator('select[name="type"] option').allTextContents().catch(() => null);
                    const ty = top().locator('select[name="type"]');
                    const opts = await ty.locator('option').evaluateAll((els) => els.map((o) => ({v: o.value, t: o.text.trim()})).filter((o) => o.v)).catch(() => []);
                    if (opts.length) { await ty.selectOption(opts[0].v).catch(() => {}); s.chosen = opts[0].t; }
                    await top().locator('input[name="ROWSetting"]').check().catch(() => {});
                    s.ok = await pressIn('OK');
                    s.rows = await metaForm().locator('[id^="salesRightsGridContainer"] tr.gridRow').allInnerTexts().catch(() => null);
                    await snap('u-09-sales-rights-added', {s});
                }
                await closeAbove();
            }
            await out();
            await page.goto(cUrl(P.path, `/catalog/book/${P.subs.b3.id}`));
            await idle(page);
            const bt = await page.locator('body').innerText().catch(() => '');
            await snap('u-10-book-page', {});
            s.bookPage = {hasSalesRights: /Sales Rights/i.test(bt), hasChosen: s.chosen ? bt.includes(s.chosen.replace(/\s*\(\d+\)$/, '')) : null, hasMarket: /Market/i.test(bt), hasRepresent: /Representative|Agent/i.test(bt), hasWorld: /World/i.test(bt), text: flat(bt, 1500)};
            fact('purpose-sales-rights', s);
        }

        // ---------------------------------------------------------------- cross (Cross-feature pointers 424–456, as the Press manager)
        if (isOMP && on('cross')) {
            const P = S.P;
            const X = S.X;
            const r = {};
            await as(P.u.mg, P.path);
            // "DOI (06)" in the code list on a new press (DOIs on by default)
            await formatsPage('P', 'b1');
            const e = await openEditWindow('PDF');
            if (!e.missing) {
                await metaTab();
                const add = metaForm().locator('[id^="identificationCodeGridContainer"]').getByRole('link', {name: /Add Code/}).first();
                const n0 = await winCount();
                await add.click().catch(() => {});
                await waitNewWindow(n0);
                r.codeTypes = await top().locator('select[name="code"] option').allTextContents().then((a) => a.map((x) => x.trim())).catch(() => null);
                r.doi06 = (r.codeTypes || []).some((x) => /DOI \(06\)/.test(x));
                await snap('c-01-add-code', {codeTypes: r.codeTypes});
                await closeAbove();
            }
            // a chapter's "Files" list offers the format file
            {
                const sub = P.subs.b1;
                await openWf(P.path, sub.id, `publication_${sub.pub}_chapters`);
                const a = wf().locator('a.pkp_linkaction_editChapter').filter({hasText: 'K1 Chapter'}).first();
                await a.waitFor({timeout: 20000}).catch(() => {});
                const n0 = await winCount();
                await a.click().catch(() => {});
                await waitNewWindow(n0);
                await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog] form')].some((f) => f.getClientRects().length && /Files/.test(f.innerText)), null, {timeout: 15000}).catch(() => {});
                const w = await winSnap('c-02-chapter-window');
                r.chapterFiles = await top().locator('input[type=checkbox]').evaluateAll((els) => els.map((x) => (x.closest('tr, li, label, div')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 140))).catch(() => null);
                r.chapterText = flat(w.text, 800);
                await closeAbove();
            }
            // Activity Log lines of a format
            {
                const sub = P.subs.b1;
                await openWf(P.path, sub.id, null);
                const b = wf().getByRole('button', {name: 'Activity Log', exact: true}).first();
                if (await b.count()) {
                    const n0 = await winCount();
                    await b.click();
                    await waitNewWindow(n0);
                    await sleep(1500);
                    const w = await winSnap('c-03-activity-log');
                    r.activity = (w.text || '').split(/(?=\d{4}-\d{2}-\d{2})/).filter((x) => /format|proof|Format/i.test(x)).slice(0, 12).map((x) => flat(x, 200));
                    await closeAbove();
                } else r.activity = 'no Activity Log button';
            }
            // OAI: records of the published book
            {
                const oaiUrl = cUrl(P.path, '/oai?verb=ListRecords&metadataPrefix=oai_dc');
                await page.goto(oaiUrl);
                await idle(page);
                const x = await (await page.request.get(oaiUrl)).text();
                r.oai = {records: (x.match(/<record>/g) || []).length, identifiers: (x.match(/<identifier>[^<]+<\/identifier>/g) || []).slice(0, 10), error: (x.match(/<error[^>]*>[^<]*<\/error>/) || [null])[0]};
                await snap('c-04-oai', {oai: r.oai});
            }
            fact('cross-P', r);
            // X: the Identifiers tabs and the URN step
            const rx = {};
            await as(X.mg, X.path);
            const gx = await formatsPage('X', 'x1', {name: 'c-05-x-page'});
            rx.page = rowsBrief(gx);
            if (!S.xAdded) {
                rx.add = await addFormat('PDF');
                await reload();
                rx.upload = await changeFile('PDF', PDF);
                S.xAdded = true; save();
                await reload();
            }
            const ex = await openEditWindow('PDF');
            if (!ex.missing) {
                rx.formatTabs = (await winInfo()).tabs;
                const idt = top().getByRole('tab', {name: 'Identifiers', exact: true}).first();
                if (await idt.count()) {
                    await idt.click();
                    await sleep(1500); await idle(page);
                    const w = await winSnap('c-06-x-format-identifiers');
                    rx.formatIdentifiers = {text: flat(w.text, 600), fields: w.fields};
                }
                await closeAbove();
            }
            rx.approval = await statusWindow(formatRow('PDF'), /^\s*Awaiting Approval\s*$/, 'c-07-x-format-approval', {press: null});
            const fe = await rowArrow(fileRow('PDF'), 'Edit');
            rx.fileArrow = fe.entries;
            if (!fe.missing) {
                await waitNewWindow(1);
                const w = await winSnap('c-08-x-file-edit');
                rx.fileEditTabs = w.tabs;
                rx.fileEditTitle = w.title;
                await closeAbove();
            }
            fact('cross-X', rx);
        }

        // ---------------------------------------------------------------- extra (a file's own actions per level; the cross-feature
        // pointers that need their own state: a new version, an HTML format with an image, the visitor's book page, the seed's
        // Activity Log lines)
        if (isOMP && on('extra')) {
            const P = S.P;
            const r = {};
            // a) a format file's "More Information", "Edit", "Delete" as the Series editor and the Layout Editor
            for (const k of ['se', 'le']) {
                const o = {};
                await as(P.u[k], P.path);
                await formatsPage('P', 'b1', {name: `e-${k}-page`});
                for (const act of ['More Information', 'Edit']) {
                    const t0 = Date.now();
                    const n0 = await winCount();
                    const a = await rowArrow(fileRow('PDF'), act);
                    if (a.missing || !a.arrow) { o[act] = a; continue; }
                    await waitNewWindow(n0);
                    const w = await winSnap(`e-${k}-${act === 'Edit' ? 'file-edit' : 'file-info'}`);
                    o[act] = {entries: a.entries, win: brief(w), posts: postsSince(t0), dialogs: dialogsSince(t0)};
                    await closeAbove();
                    await reload();
                }
                // Delete: the file this role uploaded under its own format (R<k>, the older of its two files)
                const own = fileRow(`R${k}`, 'article.pdf');
                if (await own.count()) {
                    const t0 = Date.now();
                    const n0 = await winCount();
                    const a = await rowArrow(own, 'Delete');
                    await waitNewWindow(n0, 8000);
                    const w = await winSnap(`e-${k}-file-delete`);
                    o.Delete = {entries: a.entries, win: brief(w), ok: await pressIn('OK')};
                    await closeAbove();
                    o.Delete.samePage = rowsBrief(await gridInfo()).filter((x) => /^file: .*article\.pdf/.test(x));
                    await reload();
                    o.Delete.afterReload = rowsBrief(await gridInfo()).filter((x) => /^file: .*article\.pdf/.test(x));
                    o.Delete.notices = noticesSince(t0);
                } else o.Delete = 'no own file';
                r[`files-${k}`] = o;
                fact(`extra-files-${k}`, o);
            }
            // b) a new version of the published book (as the Press manager): its formats
            await as(P.u.mg, P.path);
            if (!S.b3v2) {
                const sub = P.subs.b3;
                await openWf(P.path, sub.id, `publication_${sub.pub}_titleAbstract`);
                await wf().getByRole('link', {name: 'Create New Version', exact: true}).or(wf().getByRole('button', {name: 'Create New Version', exact: true})).first().click();
                const dlg = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
                await dlg.locator('select[name="versionStage"]').waitFor({timeout: T});
                await idle(page); await sleep(1200);
                const st = dlg.locator('select[name="versionStage"]');
                if (!(await st.inputValue())) await st.selectOption('VoR');
                const minor = dlg.locator('select[name="versionIsMinor"]');
                if (await minor.isVisible().catch(() => false)) { if (!(await minor.inputValue())) await minor.selectOption('false'); }
                await snap('e-01-new-version-window');
                const w = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
                await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
                const resp = await w;
                try { S.b3v2 = (await resp.json()).id; } catch { S.b3v2 = null; }
                save();
                await idle(page); await sleep(800);
            }
            if (S.b3v2) {
                const sub = P.subs.b3;
                await openWf(P.path, sub.id, `publication_${S.b3v2}_publicationFormats`);
                await grid().waitFor({timeout: 15000}).catch(() => {});
                const g = await gridInfo();
                await snap('e-02-new-version-formats', {grid: g});
                r.newVersion = {id: S.b3v2, rows: rowsBrief(g)};
            }
            // c) an HTML format with an image, on a published book seeded for it
            if (!S.b4) {
                const b4 = await app.api.createSubmission({tag: `${P.path}b4`, context: P.path, submitter: P.u.au, title: `K1 b4 ${S.t}`, files: [{file: 'article.pdf'}],
                    decisions: ['skipExternalReview', 'sendToProduction'], published: true, mediaFiles: [{file: 'figure.png'}], publicationFormats: [{name: 'HTML', file: 'article.html'}]}).catch((e) => ({error: flat(e.message, 300)}));
                S.b4 = b4.error ? b4 : {id: b4.submissionId, pub: b4.publicationId};
                save();
            }
            await out();
            if (S.b4 && S.b4.id) {
                await page.goto(cUrl(P.path, `/catalog/book/${S.b4.id}`));
                await idle(page);
                const links = await page.locator('a').evaluateAll((as) => as.filter((a) => /catalog\/view|download/.test(a.href)).map((a) => ({text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})));
                await snap('e-03-html-book-page', {links});
                r.html = {links};
                if (links[0]) {
                    const t0 = Date.now();
                    const resp = await page.goto(links[0].href);
                    await idle(page); await sleep(800);
                    const frame = page.frames().find((f) => /download|view/.test(f.url()) && f !== page.mainFrame());
                    const imgs = frame ? await frame.locator('img').evaluateAll((is) => is.map((i) => ({src: i.getAttribute('src'), w: i.naturalWidth}))).catch(() => null) : null;
                    await snap('e-04-html-view', {imgs});
                    r.html.view = {status: resp ? resp.status() : null, frames: page.frames().map((f) => f.url().replace(/^.*index\.php/, '')), imgs, posts: postsSince(t0, true).slice(0, 8)};
                }
            } else r.html = S.b4;
            // d) the visitor's book page of b3 and its download
            {
                const t0 = Date.now();
                await page.goto(cUrl(P.path, `/catalog/book/${P.subs.b3.id}`));
                await idle(page);
                const links = await page.locator('a').evaluateAll((as) => as.filter((a) => /catalog\/view|download/.test(a.href)).map((a) => ({text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})));
                await snap('e-05-visitor-book-page', {links});
                r.visitor = {links};
                if (links[0]) {
                    const resp = await page.goto(links[0].href);
                    await idle(page); await sleep(800);
                    await snap('e-06-visitor-view');
                    r.visitor.view = {status: resp ? resp.status() : null, url: page.url().replace(/^.*index\.php/, ''), frames: page.frames().map((f) => f.url().replace(/^.*index\.php/, '')), posts: postsSince(t0, true).filter((x) => /catalog/.test(x)).slice(0, 8)};
                }
            }
            // e) the seed's Activity Log lines of the seeded "PDF" (who they name)
            await as(P.u.mg, P.path);
            {
                const sub = P.subs.b3;
                await openWf(P.path, sub.id, null);
                const b = wf().getByRole('button', {name: 'Activity Log', exact: true}).first();
                if (await b.count()) {
                    const n0 = await winCount();
                    await b.click();
                    await waitNewWindow(n0);
                    await sleep(1500);
                    const w = await winSnap('e-07-b3-activity-log');
                    r.b3Activity = (w.text || '').split(/(?=\d{4}-\d{2}-\d{2} )/).map((x) => flat(x, 200)).filter((x) => /format|proof|PDF/i.test(x)).slice(0, 20);
                    await closeAbove();
                }
            }
            fact('extra', r);
        }

        // ---------------------------------------------------------------- absence (OJS, OPS: lines 32–35)
        if (!isOMP && on('absence')) {
            const J = S.J;
            const sub = J.subs['1'];
            const r = {};
            await as(J.mg, J.path);
            r.open = await openWf(J.path, sub.id, null, {name: 'x-01-workflow'});
            r.menu = await menuItems();
            // the version's pages: the galleys page
            r.galleys = await openWf(J.path, sub.id, `publication_${sub.pub}_galleys`, {name: 'x-02-galleys'});
            r.menuOnGalleys = await menuItems();
            r.galleysText = flat(await wf().innerText().catch(() => null), 1200);
            const row = wf().locator('tbody tr').filter({hasText: 'PDF'}).first();
            await row.waitFor({timeout: 20000}).catch(() => {});
            r.galleyRow = flat(await row.innerText().catch(() => null), 300);
            const btn = row.locator('button').last();
            await btn.click().catch(() => {});
            await sleep(600);
            r.galleyMenu = (await page.getByRole('menuitem').allInnerTexts().catch(() => [])).map((x) => x.trim());
            await snap('x-03-galley-menu', {menu: r.galleyMenu});
            await btn.click().catch(() => {});
            await sleep(400);
            r.galleyWords = /Set Terms|Select Files|Awaiting Approval|Approved|Open Access|Direct Sales|Not Available|Available/.test(r.galleysText || '');
            // the Publication Formats address typed
            r.typed = await openWf(J.path, sub.id, `publication_${sub.pub}_publicationFormats`, {name: 'x-04-formats-typed'});
            r.typedMenu = await menuItems();
            r.typedText = flat(await wf().innerText().catch(() => null), 800);
            r.typedGrid = await page.locator('[id^="component-grid-catalogentry-publicationformatgrid"]').count();
            fact('absence', r);
            await loc(page, 'Workflow side menu', wf().getByRole('navigation').first());
        }
    } catch (e) {
        log('ERROR', e && e.stack ? e.stack.slice(0, 1500) : e);
        await snap('error').catch(() => {});
        fact('error', String(e && e.stack).slice(0, 1200));
    } finally {
        await close();
    }
});
