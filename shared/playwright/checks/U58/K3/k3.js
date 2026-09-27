// U58 claim check, chunk K3: Settings › Workflow › "Submission" › "Components" (the list, its
// "Add a Component" / "Edit" window, "Delete", "Restore Defaults", "Order"), where a
// component's settings land (upload wizard list, "Media" page, galley upload, submit gate),
// the components through /api/v1/genres, {OPS} "Author Screening", the side effects, and
// OMP3 (a press's list, its "Type" metadata default, its "Submissions" notice).
// Spec: docs/specs/U58-submission-intake-configuration.md lines 117–141, 253–313, 364–379,
// 406–408, 421–425; register A1, A2, A3, A4, A8, OMP3, OPS2.
//
// Per app, scratch contexts (state in .reports/U58/ccK3/k3-state-<app>.json):
//   A  install defaults, one form language. a1 draft (no file; the submit gate), a2 in
//      production with article.pdf (the upload wizard list, a galley's wizard).
//      The window, refused saves, add / delete / re-add a key, edit, order.
//   D  a1-like: d1 in production carrying a "Data Set" file (OMP "Index"; OPS a "Data Set"
//      galley). The refused delete, a dependent component deleted, the "Media" page, the
//      programming interface as each role, the side effects.
//   R  English + French form languages. r1 draft. Rename, un-require, delete, add, then
//      "Restore Defaults".
//   P  (OMP) a press for OMP3: "Metadata" type default, a restricted series, the
//      "Submissions" notice with "Disable Submissions" off and on.
//
//   PROBE_FEATURE=U58 PROBE_AGENT=ccK3 node bin/probe.js all shared/playwright/checks/U58/K3/k3.js
//   PHASES=seed,list,refuse,edit,order,gate,delete,api,restore,screening,omp3,galley (default all)
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const ALL = ['seed', 'list', 'refuse', 'spaces', 'edit', 'order', 'gate', 'delete', 'inuse', 'api', 'restore', 'french', 'screening', 'omp3', 'galley', 'article'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log(...a);
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 400));
const stateFile = (app) => path.join(outDir(), `k3-state-${app.name}.json`);
const T = 30000;

forEachApp(async (app) => {
    const sf = stateFile(app);
    const sc = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(sc, null, 2));
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const FIX = path.join(REPO, `apps/${app.name}/playwright/fixtures/files`);
    const PDF = path.join(FIX, isOPS ? 'preprint.pdf' : 'article.pdf');
    const PNG = fs.existsSync(path.join(FIX, 'figure.png')) ? path.join(FIX, 'figure.png') : path.join(REPO, 'apps/ojs/playwright/fixtures/files/figure.png');
    const MAIN = isOMP ? 'Book Manuscript' : (isOPS ? 'Preprint Text' : 'Article Text');
    const INUSE = isOMP ? 'Index' : 'Data Set';          // td6: a component a file carries
    const DEP = isOMP ? 'HTML Stylesheet' : 'Multimedia'; // td8: a dependent component deleted
    const GONE = isOMP ? 'Prospectus' : 'Transcripts';    // td7 / td12: a component deleted
    const REN = isOMP ? 'Glossary' : 'Research Materials'; // Rule 15: a component renamed and saved
    const ctxUrl = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    const edUrl = (ctx, id, key) => ctxUrl(ctx, `/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);

    // ---- seed ---------------------------------------------------------------
    if (on('seed') && !sc.A) {
        const roleUsers = [['mgr', 'manager', 'Mira', 'Manager'], ['au', 'author', 'Ava', 'Author'], ['se', 'sectionEditor', 'Sid', 'Section'],
            ['rd', 'reader', 'Rex', 'Reader'], ...(isOPS ? [['asst', 'editorialBoardMember', 'Abe', 'Board']] : [['asst', 'copyeditor', 'Cleo', 'Copyeditor'], ['rv', 'externalReviewer', 'Rae', 'Reviewer']])];
        const mk = async (prefix, ctxExtra, extra = {}) => {
            const t = tag(prefix);
            const users = roleUsers.map(([k, role, g, f]) => ({username: `${t}${k}`, roles: [role], givenName: g, familyName: f}));
            const ctx = await app.api.createContext({tag: t, context: {name: `U58 K3 ${t}`, acronym: 'U58K3', contactName: 'K3 Contact', contactEmail: `${t}contact@mail.test`, ...ctxExtra}, users, ...extra});
            record(`seed-context-${prefix}`, ctx);
            return {path: ctx.path || t, u: Object.fromEntries(roleUsers.map(([k]) => [k, `${t}${k}`])), roles: Object.fromEntries(roleUsers.map(([k, r]) => [k, r])), subs: {}};
        };
        const sub = async (C, k, spec) => {
            try {
                const r = await app.api.createSubmission({tag: `${C.path}${k}`.slice(0, 32), context: C.path, submitter: C.u.au, title: `K3 ${k} Quokkery`, ...spec});
                C.subs[k] = {id: r.submissionId, pub: r.publicationId, stageId: r.stageId, files: r.files, galleys: r.galleys};
                log(`[seed ${C.path} ${k}]`, r.submissionId, 'stage', r.stageId);
            } catch (e) { log(`[seed ${k} FAILED]`, String(e.message).slice(0, 700)); C.subs[k] = {error: String(e.message).slice(0, 700)}; }
        };
        const prod = isOPS ? {participants: []} : {decisions: ['skipExternalReview', 'sendToProduction']};
        sc.A = await mk('u58k3a', {});
        sc.D = await mk('u58k3d', {});
        sc.R = await mk('u58k3r', {supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']});
        if (isOMP) sc.P = await mk('u58k3p', {});
        save();
        await sub(sc.A, 'a1', {submitted: false});
        await sub(sc.A, 'a2', isOPS ? {} : {files: [{file: 'article.pdf'}], ...prod});
        await sub(sc.R, 'r1', {submitted: false});
        if (isOPS) await sub(sc.D, 'd1', {galleys: [{label: 'PDF', file: 'preprint.pdf'}, {label: 'Data', file: 'preprint.pdf', genre: INUSE}]});
        else await sub(sc.D, 'd1', {files: [{file: 'article.pdf'}, {file: 'notes.md', genre: INUSE}], ...prod});
        save(); record('seed', sc);
    }
    if (!sc.A) { log('[k3] no state; run the seed phase first'); return; }
    if (PHASES.length === 1 && PHASES[0] === 'seed') return;

    const {page, close} = await launch(app);
    // dialogs: record every one; `policy` decides confirm() (accept by default); beforeunload always accepted
    const jsDialogs = [];
    let policy = 'accept';
    page.on('dialog', (d) => {
        jsDialogs.push({at: Date.now(), type: d.type(), message: d.message().slice(0, 300), answered: d.type() === 'beforeunload' ? 'accept' : policy});
        if (d.type() === 'beforeunload' || policy === 'accept') d.accept().catch(() => {}); else d.dismiss().catch(() => {});
    });
    const traffic = [];
    page.on('response', (r) => {
        const u = r.url();
        if (r.request().method() !== 'GET' || /genre|api\/v1/.test(u)) {
            if (/\.(js|css|png|woff2?|svg)(\?|$)/.test(u)) return;
            traffic.push({at: Date.now(), method: r.request().method(), url: u.replace(/^.*\/index\.php/, '').slice(0, 220), status: r.status()});
        }
    });
    await page.context().addInitScript(() => {
        window.__notices = [];
        const seen = new WeakSet();
        const sweep = () => {
            document.querySelectorAll('[role="alert"], [role="status"], .pkpNotification, .pkp_notification, [class*="toast"], [class*="Toast"], .ui-pnotify').forEach((e) => {
                const t = (e.innerText || '').trim();
                if (t && !seen.has(e)) { seen.add(e); window.__notices.push({t: t.slice(0, 300), at: Date.now()}); }
            });
        };
        new MutationObserver(sweep).observe(document, {subtree: true, childList: true, characterData: true});
    });
    const mark = () => ({t: Date.now(), d: jsDialogs.length, r: traffic.length});
    const since = async (m) => ({dialogs: jsDialogs.slice(m.d).map(({type, message, answered}) => ({type, message, answered})), traffic: traffic.slice(m.r).map(({method, url, status}) => `${method} ${status} ${url}`),
        notices: await page.evaluate((s) => (window.__notices || []).filter((n) => n.at >= s).map((n) => n.t), m.t).catch(() => [])});
    const sleep = (ms) => page.waitForTimeout(ms);
    const signInAs = async (user, ctx) => { await signIn(page, user, {contextPath: ctx}); await idle(page); };
    async function snap(name, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        if (extra) Object.assign(s, extra);
        record(name, s);
        await shot(page, name).catch(() => {});
        return s;
    }
    async function sect(name, fn) {
        try { await fn(); } catch (e) {
            log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | '));
            record(`${name}-FAILED`, {error: String(e.stack || e).slice(0, 1500)});
            await snap(`${name}-FAILED-screen`).catch(() => {});
        }
    }
    const topWin = () => page.locator('[role="dialog"]:visible').last();
    const dialogTexts = () => page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').evaluateAll((els) =>
        els.map((d) => ({
            name: d.getAttribute('aria-label') || (d.getAttribute('aria-labelledby') && document.getElementById(d.getAttribute('aria-labelledby'))?.innerText) || null,
            text: d.innerText.replace(/\s+/g, ' ').trim().slice(0, 2500),
            buttons: [...d.querySelectorAll('button, a')].filter((b) => b.getClientRects().length).map((b) => (b.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()).filter(Boolean),
        }))).catch(() => []);

    // ---- the Components tab ---------------------------------------------------------------
    const grid = () => page.locator('[id^="component-grid-settings-genre"]').filter({visible: true}).first();
    async function readGrid() {
        return page.evaluate(() => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const g = [...document.querySelectorAll('[id^="component-grid-settings-genre"]')].find((e) => e.getClientRects().length);
            if (!g) return null;
            return {
                id: g.id,
                heading: f((g.querySelector('.header h4, .header h3, h4, h3') || {}).innerText),
                columns: [...g.querySelectorAll('thead th')].map((th) => f(th.innerText)),
                actions: [...g.querySelectorAll('.header a, .header button, .actions a, .actions button')].filter((a) => a.getClientRects().length).map((a) => f(a.innerText || a.getAttribute('aria-label'))).filter(Boolean),
                rows: [...g.querySelectorAll('tbody tr.gridRow')].map((tr) => ({id: tr.id, name: f(tr.querySelector('td') ? tr.querySelector('td').innerText : tr.innerText).replace(/^Settings\s*/, ''), text: f(tr.innerText)})),
                emptyVisible: !!([...g.querySelectorAll('tbody.empty')].find((e) => e.getClientRects().length)),
            };
        });
    }
    const names = (g) => (g ? g.rows.map((r) => r.name) : null);
    async function componentsTab(ctx, label) {
        await page.goto(ctxUrl(ctx, '/management/settings/workflow')); await idle(page);
        const sub = page.getByRole('tab', {name: 'Submission', exact: true}).first();
        if (await sub.count()) { await sub.click(); await idle(page); }
        const comp = page.getByRole('tab', {name: 'Components', exact: true}).first();
        await comp.click(); await idle(page);
        await page.locator('[id^="component-grid-settings-genre"] tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(300);
        const g = await readGrid();
        if (label) await snap(label, {grid: g});
        return g;
    }
    const rowOf = (name) => grid().locator('tr.gridRow').filter({has: page.locator('td').first().filter({hasText: new RegExp(`^\\s*(Settings\\s*)?${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`)})}).first();
    async function rowLinks(name) {
        const tr = rowOf(name);
        await tr.waitFor({timeout: T});
        const tog = tr.locator('a.show_extras');
        if (await tog.count()) { await tog.first().click(); await sleep(300); }
        const id = await tr.getAttribute('id');
        const acts = page.locator(`tr#${id} + tr`);
        return {id, acts, links: (await acts.locator('a:visible').allInnerTexts().catch(() => [])).map((t) => flat(t)),
            toggle: await tog.first().evaluate((a) => ({text: a.innerText.trim(), title: a.title, aria: a.getAttribute('aria-label'), sr: (a.querySelector('.pkp_screen_reader, .-screenReader') || {}).innerText || null})).catch(() => null)};
    }
    const form = () => page.locator('#genreForm').last();
    async function readForm() {
        await form().waitFor({timeout: T}); await idle(page); await sleep(300);
        const win = topWin();
        const data = await form().evaluate((f0) => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const lab = (e) => f((e.closest('label') || f0.querySelector(`label[for="${e.id}"]`) || {}).innerText);
            const sectionOf = (e) => { const s = e.closest('.section, fieldset'); return s ? f((s.querySelector('legend, label.label, .label, label') || {}).innerText) : null; };
            return {
                nameBoxes: [...f0.querySelectorAll('input[name^="name"]')].map((i) => ({name: i.name, value: i.value, maxlength: i.getAttribute('maxlength'), required: i.required || i.getAttribute('aria-required'), visible: i.getClientRects().length > 0})),
                boxes: [...f0.querySelectorAll('input[type=checkbox]')].map((c) => ({section: sectionOf(c), label: lab(c), checked: c.checked, name: c.name})),
                metadata: (() => { const s = f0.querySelector('select[name="category"]'); return s ? {section: sectionOf(s), selected: s.options[s.selectedIndex].text, options: [...s.options].map((o) => o.text)} : null; })(),
                required: [...f0.querySelectorAll('input[name="required"]')].map((r) => ({label: lab(r), checked: r.checked})),
                key: (() => { const k = f0.querySelector('input[name="key"]'); return k ? {value: k.value, readonly: k.readOnly, maxlength: k.getAttribute('maxlength'), section: sectionOf(k)} : null; })(),
                text: f(f0.innerText).slice(0, 3000),
                buttons: [...f0.querySelectorAll('button, a')].filter((b) => b.getClientRects().length).map((b) => f(b.innerText || b.getAttribute('aria-label'))).filter(Boolean),
                errors: [...f0.querySelectorAll('.error, label.error, .pkp_form_error, [class*="rror"]')].filter((e) => e.getClientRects().length).map((e) => f(e.innerText)).filter(Boolean),
            };
        });
        const title = await win.evaluate((d) => d.getAttribute('aria-label') || (d.getAttribute('aria-labelledby') && document.getElementById(d.getAttribute('aria-labelledby'))?.innerText) || (d.querySelector('h1, h2, .pkp_modal_title, [class*="title"]') || {}).innerText || null).catch(() => null);
        const winButtons = await win.evaluate((d) => [...d.querySelectorAll('button, a')].filter((b) => b.getClientRects().length).map((b) => (b.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
        return {title: flat(title), winButtons, ...data};
    }
    async function openEdit(name) {
        const {acts} = await rowLinks(name);
        await acts.getByRole('link', {name: 'Edit', exact: true}).first().click();
        return readForm();
    }
    async function openAdd() {
        await grid().getByRole('link', {name: 'Add a Component', exact: true}).first().click();
        return readForm();
    }
    const saveBtn = () => form().getByRole('button', {name: 'Save', exact: true}).first();
    async function pressSave(label, {settle = 1500} = {}) {
        const m = mark();
        await saveBtn().click();
        await sleep(settle); await idle(page).catch(() => {});
        const open = await form().isVisible().catch(() => false);
        const out = {windowOpen: open, form: open ? await readForm().catch((e) => ({error: String(e.message).slice(0, 200)})) : null, ...(await since(m))};
        out.gridSamePage = names(await readGrid());
        await snap(label, {save: out});
        return out;
    }
    async function cancelWin() {
        const c = form().getByRole('link', {name: 'Cancel', exact: true}).or(form().getByRole('button', {name: 'Cancel', exact: true})).first();
        await c.click().catch(() => {});
        await sleep(900); await idle(page);
    }
    async function closeWinX() {
        await topWin().getByRole('button', {name: /^Close/}).first().click().catch(() => {});
        await sleep(900); await idle(page);
    }
    // the upload wizard's component list on a submission (OJS/OMP "Submission Files" › Upload; OPS a galley)
    const wizardDialog = () => page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
    async function uploadWizardList(ctx, s, label) {
        const out = {};
        if (!isOPS) {
            await page.goto(edUrl(ctx, s.id, 'workflow_1')); await idle(page);
            const wf = page.locator('[role="dialog"]:visible').first();
            await wf.waitFor({timeout: T}); await idle(page); await sleep(500);
            const tbl = wf.getByRole('table', {name: 'Submission Files', exact: true}).first();
            await tbl.waitFor({timeout: T}).catch(() => {});
            const container = wf.locator('div').filter({has: page.getByRole('table', {name: 'Submission Files', exact: true})}).last();
            const direct = container.getByRole('button', {name: 'Upload', exact: true});
            if (await direct.count()) await direct.first().click();
            else {
                await container.getByRole('button', {name: 'Upload/Select Files', exact: true}).click();
                const w = page.getByRole('dialog').filter({has: page.locator('input[name="allStages"]')}).last();
                await w.waitFor({timeout: T}); await idle(page);
                await w.getByRole('link', {name: /Upload/}).first().click();
            }
        } else {
            await page.goto(edUrl(ctx, s.id, `publication_${s.pub}_galleys`)); await idle(page);
            await page.locator('[role="dialog"]:visible').first().getByRole('button', {name: /^Add galley$/i}).first().click(); await idle(page);
            const f = topWin();
            await f.locator('input[name="label"]').waitFor({timeout: T});
            await f.locator('input[name="label"]').fill('K3');
            await f.getByRole('button', {name: /^(Save|OK)$/}).last().click(); await idle(page);
        }
        await wizardDialog().locator('select[id^="genreId"]').waitFor({state: 'attached', timeout: T}).catch(() => {});
        await idle(page); await sleep(400);
        out.options = await wizardDialog().locator('select[id^="genreId"]').first().evaluate((s) => [...s.options].map((o) => o.text.trim())).catch(() => null);
        await snap(label, {wizardOptions: out.options});
        const c = wizardDialog().getByRole('link', {name: 'Cancel', exact: true}).or(wizardDialog().getByRole('button', {name: 'Cancel', exact: true})).first();
        await c.click().catch(() => {});
        await sleep(1000); await idle(page);
        return out;
    }

    try {
        // =====================================================================
        // Phase list: the tab as a new context shows it, every row's window, the Add window, the tabs.
        if (on('list')) await sect('list', async () => {
            const A = sc.A; const out = {};
            await signInAs(A.u.mgr, A.path);
            out.tabs = await page.goto(ctxUrl(A.path, '/management/settings/workflow')).then(() => idle(page)).then(() => page.getByRole('tab').evaluateAll((els) => els.map((e) => ({text: e.innerText.replace(/\s+/g, ' ').trim(), id: e.id, selected: e.getAttribute('aria-selected')}))));
            await snap('list-00-workflow-settings', {tabs: out.tabs});
            out.grid = await componentsTab(A.path, 'list-01-components-tab');
            out.subTabs = await page.getByRole('tab').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
            await loc(page, 'Components tab', page.getByRole('tab', {name: 'Components', exact: true}).first());
            await loc(page, 'Components grid', grid());
            await loc(page, '"Add a Component"', grid().getByRole('link', {name: 'Add a Component', exact: true}));
            await loc(page, '"Restore Defaults"', grid().getByRole('link', {name: 'Restore Defaults', exact: true}));
            await loc(page, '"Order"', grid().getByRole('link', {name: 'Order', exact: true}));
            out.forms = [];
            for (const n of names(out.grid)) {
                try {
                    const rl = await rowLinks(n);
                    await rl.acts.getByRole('link', {name: 'Edit', exact: true}).first().click();
                    const f = await readForm();
                    out.forms.push({row: n, links: rl.links, toggle: rl.toggle, ...f});
                    if (n === MAIN) { await snap('list-02-edit-window-main', {form: f}); await loc(page, 'component window (#genreForm)', form()); }
                    await cancelWin();
                } catch (e) { out.forms.push({row: n, error: String(e.message).slice(0, 200)}); await componentsTab(A.path).catch(() => {}); }
            }
            out.add = await openAdd();
            await snap('list-03-add-window', {form: out.add});
            await cancelWin();
            out.gridAfter = names(await readGrid());
            record('list-summary', out);
            log('[list]', app.name, JSON.stringify({heading: out.grid.heading, cols: out.grid.columns, actions: out.grid.actions, rows: names(out.grid), subTabs: out.subTabs}));
            log('[list forms]', app.name, JSON.stringify(out.forms.map((f) => ({r: f.row, t: f.title, links: f.links, tog: f.toggle, box: (f.boxes || []).filter((b) => b.checked).map((b) => b.label.slice(0, 20)), md: f.metadata && f.metadata.selected, req: (f.required || []).filter((r) => r.checked).map((r) => r.label.slice(0, 10)), key: f.key}))).slice(0, 6000));
            log('[list add]', app.name, JSON.stringify(out.add).slice(0, 4000));
        });

        // =====================================================================
        // Phase refuse (A): td4, td5, A1, A3. Empty name, 81 characters, bad and taken keys,
        // an added component's place, delete (Cancel end, then Delete), the key re-used.
        if (on('refuse')) await sect('refuse', async () => {
            const A = sc.A; const out = {};
            await signInAs(A.u.mgr, A.path);
            await componentsTab(A.path, 'ref-00-tab');
            const mainKey = ((await openEdit(MAIN)).key || {}).value; await cancelWin();
            out.mainKey = mainKey;
            // td4: empty name
            await openAdd();
            out.emptyName = await pressSave('ref-01-empty-name-saved', {settle: 1200});
            await loc(page, 'component window: "Save"', saveBtn());
            const nameBox = form().locator('input[name^="name"]').first();
            // spaces only: past the browser's check, to the server's (td4's raw-key question)
            await nameBox.fill('   ');
            out.spacesName = await pressSave('ref-01b-spaces-name-saved', {settle: 1800});
            await nameBox.fill('');
            // 81 characters typed in Name, 31 in Key
            await nameBox.click(); await nameBox.pressSequentially('N'.repeat(81), {delay: 2});
            const keyBox = form().locator('input[name="key"]');
            await keyBox.click(); await keyBox.pressSequentially('k'.repeat(31), {delay: 2});
            out.lengths = {name: (await nameBox.inputValue()).length, key: (await keyBox.inputValue()).length};
            await snap('ref-02-81-typed', {lengths: out.lengths});
            await nameBox.fill('Probe Component');
            // malformed key
            await keyBox.fill('-bad');
            out.badKey = await pressSave('ref-03-bad-key', {settle: 1800});
            // a key another component carries (the main-work component's fixed key)
            await keyBox.fill(mainKey || 'SUBMISSION');
            out.takenDefaultKey = await pressSave('ref-04-taken-default-key', {settle: 1800});
            // PROBE-1 saves
            await keyBox.fill('PROBE-1');
            out.saved = await pressSave('ref-05-saved-probe', {settle: 2000});
            out.afterReload = names(await componentsTab(A.path, 'ref-06-after-reload'));
            out.afterReload2 = names(await componentsTab(A.path, 'ref-06b-after-second-reload'));
            // the upload list's order on a2
            out.uploadList = await uploadWizardList(A.path, A.subs.a2, 'ref-07-upload-wizard-list');
            // delete Probe Component: Cancel end first
            await componentsTab(A.path);
            let rl = await rowLinks('Probe Component');
            out.probeRowLinks = rl.links;
            let m = mark();
            await rl.acts.getByRole('link', {name: 'Delete', exact: true}).first().click(); await sleep(900);
            out.deleteAsk = await dialogTexts();
            await snap('ref-08-delete-asks', {dialogs: out.deleteAsk});
            const confirmDlg = () => page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').filter({hasText: /Are you sure/}).last();
            await confirmDlg().getByRole('button', {name: 'Cancel', exact: true}).first().click().catch(async () => { await confirmDlg().getByRole('link', {name: 'Cancel', exact: true}).first().click(); });
            await sleep(900); await idle(page);
            out.deleteCancel = {...(await since(m)), grid: names(await readGrid())};
            await snap('ref-09-delete-cancelled', {res: out.deleteCancel});
            await sleep(600);
            rl = await rowLinks('Probe Component');
            m = mark();
            await rl.acts.getByRole('link', {name: 'Delete', exact: true}).first().click(); await sleep(900);
            const btns = (await dialogTexts()).slice(-1)[0];
            await confirmDlg().getByRole('button', {name: /^(Delete|OK|Yes)$/}).first().click();
            await sleep(1500); await idle(page);
            out.deleted = {buttons: btns && btns.buttons, ...(await since(m)), gridSamePage: names(await readGrid())};
            await snap('ref-10-deleted-same-page', {res: out.deleted});
            out.deletedReload = names(await componentsTab(A.path, 'ref-11-deleted-reload'));
            // the key again (td5)
            await openAdd();
            await form().locator('input[name^="name"]').first().fill('Probe Again');
            await form().locator('input[name="key"]').fill('PROBE-1');
            out.reusedKey = await pressSave('ref-12-reused-key', {settle: 1800});
            if (out.reusedKey.windowOpen) await cancelWin();
            out.gridEnd = names(await componentsTab(A.path, 'ref-13-end'));
            record('ref-summary', out);
            log('[refuse]', app.name, JSON.stringify({empty: {open: out.emptyName.windowOpen, err: out.emptyName.form && out.emptyName.form.errors, n: out.emptyName.notices, tr: out.emptyName.traffic},
                spaces: {open: out.spacesName.windowOpen, err: out.spacesName.form && out.spacesName.form.errors, n: out.spacesName.notices, tr: out.spacesName.traffic, grid: out.spacesName.gridSamePage}, lengths: out.lengths,
                bad: {open: out.badKey.windowOpen, err: out.badKey.form && out.badKey.form.errors, n: out.badKey.notices}, taken: {open: out.takenDefaultKey.windowOpen, err: out.takenDefaultKey.form && out.takenDefaultKey.form.errors, n: out.takenDefaultKey.notices},
                saved: {open: out.saved.windowOpen, n: out.saved.notices, grid: out.saved.gridSamePage}, reload: out.afterReload, reload2: out.afterReload2, upload: out.uploadList,
                ask: out.deleteAsk, cancel: out.deleteCancel, deleted: out.deleted, delReload: out.deletedReload, reused: {open: out.reusedKey.windowOpen, err: out.reusedKey.form && out.reusedKey.form.errors, n: out.reusedKey.notices, grid: out.reusedKey.gridSamePage}, end: out.gridEnd}).slice(0, 9000));
        });

        // =====================================================================
        // Phase spaces (A, a second run of td4's server end): "Name" of spaces only.
        if (on('spaces')) await sect('spaces', async () => {
            const A = sc.A; const out = {};
            await signInAs(A.u.mgr, A.path);
            await componentsTab(A.path);
            await openAdd();
            await form().locator('input[name^="name"]').first().fill('   ');
            out.spaces = await pressSave('spc-01-spaces-name', {settle: 2000});
            if (out.spaces.windowOpen) await cancelWin();
            out.grid = names(await componentsTab(A.path));
            record('spc-summary', out);
            log('[spaces]', app.name, JSON.stringify({open: out.spaces.windowOpen, n: out.spaces.notices, err: out.spaces.form && out.spaces.form.errors, tr: out.spaces.traffic, grid: out.grid}));
        });

        // =====================================================================
        // Phase edit (A): td13, Rule 15, Rule 13 (the name shows where a component is chosen).
        if (on('edit')) await sect('edit', async () => {
            const A = sc.A; const out = {};
            await signInAs(A.u.mgr, A.path);
            await componentsTab(A.path, 'ed-00-tab');
            const nameBox = () => form().locator('input[name^="name"]').first();
            // Cancel after a change: first the dismiss end, then leave
            await openEdit('Other');
            await nameBox().fill('Other Changed');
            policy = 'dismiss';
            let m = mark();
            await cancelWin();
            out.cancelDismiss = {...(await since(m)), windowOpen: await form().isVisible().catch(() => false)};
            await snap('ed-01-cancel-dismissed', {res: out.cancelDismiss});
            policy = 'accept';
            m = mark();
            if (out.cancelDismiss.windowOpen) await cancelWin();
            out.cancelAccept = {...(await since(m)), windowOpen: await form().isVisible().catch(() => false), grid: names(await readGrid())};
            await snap('ed-02-cancel-left', {res: out.cancelAccept});
            out.cancelReload = names(await componentsTab(A.path));
            // the same with the box left first (Tab), so the form has seen the change
            await openEdit('Other');
            await nameBox().fill('Other Changed');
            await page.keyboard.press('Tab'); await sleep(300);
            policy = 'dismiss';
            m = mark();
            await cancelWin();
            out.cancelAfterBlur = {...(await since(m)), windowOpen: await form().isVisible().catch(() => false)};
            await snap('ed-02b-cancel-after-blur', {res: out.cancelAfterBlur});
            policy = 'accept';
            if (out.cancelAfterBlur.windowOpen) await cancelWin();
            out.cancelAfterBlurGrid = names(await componentsTab(A.path));
            // Close (the window's own close button) after a change
            await openEdit('Other');
            await nameBox().fill('Other Changed');
            m = mark();
            await closeWinX();
            out.closeX = {...(await since(m)), windowOpen: await form().isVisible().catch(() => false), grid: names(await readGrid())};
            await snap('ed-03-close-after-change', {res: out.closeX});
            // Cancel with no change: asks nothing?
            await componentsTab(A.path);
            await openEdit('Other');
            m = mark();
            await cancelWin();
            out.cancelUnchanged = {...(await since(m)), windowOpen: await form().isVisible().catch(() => false)};
            // leave the page with a change in the window
            await openEdit('Other');
            await nameBox().fill('Other Changed');
            await page.locator('#genreForm input[name="key"]').click().catch(() => {});
            m = mark();
            await page.goto(ctxUrl(A.path, '/management/settings/website')).catch((e) => { out.leaveErr = String(e.message).slice(0, 200); });
            await idle(page);
            out.leavePage = {...(await since(m)), url: page.url()};
            out.leaveReload = names(await componentsTab(A.path, 'ed-04-after-leaving'));
            // Save a change: no notice, the list's name, reopened values, reload
            await openEdit(REN);
            await nameBox().fill(`${REN} Edited`);
            await form().locator('input[name="supportsFileVariants"]').check();
            m = mark();
            out.saved = await pressSave('ed-05-saved', {settle: 2000});
            out.reopened = await openEdit(`${REN} Edited`).catch((e) => ({error: String(e.message).slice(0, 200)}));
            await snap('ed-06-reopened', {form: out.reopened});
            await cancelWin();
            out.savedReload = names(await componentsTab(A.path, 'ed-07-saved-reload'));
            // the upload list offers the new name
            out.uploadList = await uploadWizardList(A.path, A.subs.a2, 'ed-08-upload-list-after-rename');
            record('ed-summary', out);
            log('[edit]', app.name, JSON.stringify({cancelDismiss: out.cancelDismiss, cancelAfterBlur: out.cancelAfterBlur, cancelAfterBlurGrid: out.cancelAfterBlurGrid, cancelAccept: out.cancelAccept, cancelReload: out.cancelReload, closeX: out.closeX, cancelUnchanged: out.cancelUnchanged,
                leave: out.leavePage, leaveReload: out.leaveReload, saved: {open: out.saved.windowOpen, n: out.saved.notices, tr: out.saved.traffic, grid: out.saved.gridSamePage},
                reopened: out.reopened && {name: out.reopened.nameBoxes, boxes: (out.reopened.boxes || []).map((b) => `${b.name}:${b.checked}`)}, savedReload: out.savedReload, upload: out.uploadList}).slice(0, 9000));
        });

        // =====================================================================
        // Phase order (A): Rule 19. Cancel ordering, then Done; the upload list's order.
        if (on('order')) await sect('order', async () => {
            const A = sc.A; const out = {};
            await signInAs(A.u.mgr, A.path);
            const drag = async (fromName, toName) => {
                const sb = await rowOf(fromName).boundingBox();
                const tb = await rowOf(toName).boundingBox();
                await page.mouse.move(sb.x + 40, sb.y + sb.height / 2);
                await page.mouse.down();
                await page.mouse.move(sb.x + 40, sb.y + sb.height / 2 - 5, {steps: 5});
                await page.mouse.move(tb.x + 40, tb.y + 3, {steps: 20});
                await sleep(300);
                await page.mouse.move(tb.x + 40, tb.y + 2, {steps: 2});
                await page.mouse.up();
                await sleep(700);
            };
            const doOrder = async (finish, label) => {
                const o = {before: names(await componentsTab(A.path))};
                await grid().getByRole('link', {name: 'Order', exact: true}).first().click(); await sleep(800);
                o.controlsWhileOrdering = await grid().locator('a:visible, button:visible').evaluateAll((els) => els.map((e) => (e.innerText || e.title || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
                o.rowHandles = await grid().locator('tr.gridRow').first().evaluate((tr) => ({cls: tr.className, cursor: getComputedStyle(tr).cursor, handle: !!tr.querySelector('.pkp_helpers_move_handle, [class*="drag"], [class*="order"]'), html: tr.innerHTML.slice(0, 500)})).catch(() => null);
                await snap(`${label}-ordering`, {ord: o});
                await drag(o.before[o.before.length - 1], o.before[1]);
                o.whileOrdering = names(await readGrid());
                const m = mark();
                await grid().getByRole('link', {name: finish, exact: true}).first().click();
                await sleep(1800); await idle(page);
                o.samePage = names(await readGrid());
                Object.assign(o, await since(m));
                await snap(label, {ord: o});
                o.afterReload = names(await componentsTab(A.path));
                return o;
            };
            out.cancel = await doOrder('Cancel ordering', 'ord-01-cancel-ordering');
            out.done = await doOrder('Done', 'ord-02-done');
            out.uploadList = await uploadWizardList(A.path, A.subs.a2, 'ord-03-upload-list-after-order');
            record('ord-summary', out);
            log('[order]', app.name, JSON.stringify(out).slice(0, 7000));
        });

        // =====================================================================
        // Phase gate (A): the required component at submit, as the author on the draft a1.
        const toReview = async () => {
            const seen = [];
            for (let i = 0; i < 9; i++) {
                const cur = flat(await page.locator('.pkpSteps__step__label--current').first().innerText().catch(() => ''), 60);
                seen.push(cur);
                if (/^Review$/.test(cur)) break;
                const b = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true});
                if (!(await b.count())) break;
                await b.click(); await idle(page); await sleep(700);
            }
            await page.locator('.submissionWizard__loadingReview').waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
            await idle(page);
            return seen;
        };
        const reviewState = async () => {
            const submit = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true});
            return {submitPresent: await submit.count(), submitDisabled: await submit.isDisabled().catch(() => null),
                errors: await page.locator('.submissionWizard .pkpNotification, .submissionWizard [class*="rror"]').evaluateAll((els) => [...new Set(els.filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean))].slice(0, 12)).catch(() => [])};
        };
        async function gateRead(C, sub, label) {
            await signInAs(C.u.au, C.path);
            await page.goto(ctxUrl(C.path, `/submission?id=${sub.id}`)); await idle(page);
            await page.locator('.submissionWizard').first().waitFor({timeout: T}).catch(() => {});
            await idle(page); await sleep(500);
            const steps = await toReview();
            const st = await reviewState();
            await snap(label, {steps, review: st});
            return {steps, ...st};
        }
        if (on('gate')) await sect('gate', async () => {
            const out = {a1: await gateRead(sc.A, sc.A.subs.a1, 'gate-01-a1-review-defaults')};
            record('gate-summary', out);
            log('[gate]', app.name, JSON.stringify(out).slice(0, 3000));
        });

        // =====================================================================
        // Phase delete (D): td6, td8 / A2, side effects.
        const mailCount = async (C) => { const o = {}; for (const [k, u] of Object.entries(C.u)) o[k] = await app.mail.count({to: `${u}@mail.test`}).catch((e) => `err ${String(e.message).slice(0, 80)}`); return o; };
        const headerText = async () => flat(await page.locator('header, .app__header, [class*="header"]').first().innerText().catch(() => ''), 300);
        if (on('delete')) await sect('delete', async () => {
            const D = sc.D; const out = {};
            out.mailBefore = await mailCount(D);
            await signInAs(D.u.mgr, D.path);
            await page.goto(ctxUrl(D.path, '/dashboard/editorial')); await idle(page);
            out.headerBefore = await headerText();
            await snap('del-00-dashboard-before', {header: out.headerBefore});
            // a save on a sibling tab: "Metadata" saved as it is
            await page.goto(ctxUrl(D.path, '/management/settings/workflow')); await idle(page);
            await page.getByRole('tab', {name: 'Metadata', exact: true}).first().click(); await idle(page); await sleep(600);
            let m = mark();
            await page.locator('[role="tabpanel"]:visible').getByRole('button', {name: 'Save', exact: true}).first().click().catch((e) => { out.metaSaveErr = String(e.message).slice(0, 200); });
            await sleep(2000); await idle(page);
            out.metaSave = await since(m);
            await componentsTab(D.path, 'del-01-tab');
            const confirmDlg = () => page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').filter({hasText: /Are you sure/}).last();
            const del = async (n, label) => {
                const rl = await rowLinks(n);
                const mm = mark();
                await rl.acts.getByRole('link', {name: 'Delete', exact: true}).first().click(); await sleep(900);
                const ask = (await dialogTexts()).slice(-1)[0];
                await confirmDlg().getByRole('button', {name: /^(Delete|OK|Yes)$/}).first().click();
                await sleep(2000); await idle(page); await sleep(3000);
                const o = {ask, ...(await since(mm)), dialogsOpen: await dialogTexts(), samePage: names(await readGrid())};
                o.spinner = await page.locator('[role="dialog"]:visible .pkpSpinner, [role="dialog"]:visible [class*="pinner"]').count().catch(() => null);
                await snap(label, {res: o});
                // a confirmation left open: its own "Cancel"
                if (o.dialogsOpen.length) {
                    const b = confirmDlg().getByRole('button', {name: 'Cancel', exact: true}).first();
                    o.cancelPresent = await b.count();
                    if (o.cancelPresent) { await b.click().catch(() => {}); await sleep(1000); }
                    o.afterCancel = {dialogsOpen: (await dialogTexts()).map((d) => d.text.slice(0, 120)), grid: names(await readGrid())};
                    await snap(`${label}-after-cancel`, {res: o.afterCancel});
                }
                o.afterReload = names(await componentsTab(D.path));
                return o;
            };
            out.inUse = await del(INUSE, 'del-02-in-use-refused');
            out.dep = await del(DEP, 'del-03-dependent-deleted');
            out.gone = await del(GONE, 'del-04-second-deleted');
            // the upload list on d1
            out.uploadList = await uploadWizardList(D.path, D.subs.d1, 'del-05-upload-list');
            // the "Media" page on d1
            const s = D.subs.d1;
            await page.goto(edUrl(D.path, s.id, `publication_${s.pub}_media`)); await idle(page);
            await page.getByRole('button', {name: 'Add Media File', exact: true}).waitFor({timeout: T});
            await snap('del-06-media-page');
            await page.getByRole('button', {name: 'Add Media File', exact: true}).click();
            const upWin = () => page.getByRole('dialog').filter({hasText: 'Upload Media File'}).last();
            await upWin().waitFor({timeout: T}); await idle(page); await sleep(400);
            const chooserP = page.waitForEvent('filechooser', {timeout: T});
            await upWin().getByRole('button', {name: 'Click to upload files', exact: true}).click();
            await (await chooserP).setFiles(PNG);
            await upWin().locator('select').first().waitFor({timeout: 60000}).catch(() => {});
            await idle(page); await sleep(500);
            out.mediaSelects = await upWin().locator('select').evaluateAll((els) => els.map((s) => ({id: s.id, label: ((s.id && document.querySelector(`label[for="${s.id}"]`)) || {}).innerText || null, options: [...s.options].map((o) => o.text.trim())})));
            await snap('del-07-media-upload-card', {selects: out.mediaSelects});
            await loc(page, 'Upload Media File: "What kind of media is this?"', upWin().locator('select[id*="genreId"]'));
            m = mark();
            await upWin().getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
            await sleep(1200);
            const still = await dialogTexts();
            out.mediaClose = {...(await since(m)), open: still.map((d) => d.text.slice(0, 200))};
            const confirmClose = page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').last().getByRole('button', {name: /^(Yes|OK|Close|Discard|Leave)/}).first();
            if (still.some((d) => /sure|discard|lose/i.test(d.text)) && await confirmClose.count()) { await confirmClose.click().catch(() => {}); await sleep(800); }
            // Activity Log of d1
            await page.goto(edUrl(D.path, s.id)); await idle(page);
            const wf = page.locator('[role="dialog"]:visible').first();
            await wf.waitFor({timeout: T}).catch(() => {});
            const act = wf.getByRole('button', {name: /Activity Log/}).or(wf.getByRole('link', {name: /Activity Log/})).or(page.getByRole('button', {name: /Activity Log/})).first();
            if (await act.count()) {
                await act.click(); await idle(page); await sleep(1200);
                const lg = page.getByRole('dialog').filter({hasText: /Activity Log/}).last();
                out.activityLog = flat(await lg.innerText().catch(() => null), 3000);
                await snap('del-08-activity-log', {log: out.activityLog});
            } else out.activityLog = 'no Activity Log control';
            await page.goto(ctxUrl(D.path, '/dashboard/editorial')); await idle(page);
            out.headerAfter = await headerText();
            await snap('del-09-dashboard-after', {header: out.headerAfter});
            await sleep(3000);
            out.mailAfter = await mailCount(D);
            record('del-summary', out);
            log('[delete]', app.name, JSON.stringify(out).slice(0, 9000));
        });

        // =====================================================================
        // Phase inuse (D, a second run of td6): the refused delete, the window after the alert.
        if (on('inuse')) await sect('inuse', async () => {
            const D = sc.D; const out = {};
            await signInAs(D.u.mgr, D.path);
            await componentsTab(D.path, 'inu-00-tab');
            const cdlg = () => page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').filter({hasText: /Are you sure/}).last();
            const rl = await rowLinks(INUSE);
            const m = mark();
            await rl.acts.getByRole('link', {name: 'Delete', exact: true}).first().click(); await sleep(900);
            await cdlg().getByRole('button', {name: /^(Delete|OK|Yes)$/}).first().click();
            await sleep(6000); await idle(page);
            out.after6s = {...(await since(m)), dialogsOpen: (await dialogTexts()).map((d) => ({text: d.text.slice(0, 160), buttons: d.buttons})), grid: names(await readGrid())};
            await snap('inu-01-after-alert-6s', {res: out.after6s});
            const okAgain = cdlg().getByRole('button', {name: /^(OK)$/}).first();
            out.okEnabled = await okAgain.isEnabled().catch(() => null);
            await cdlg().getByRole('button', {name: 'Cancel', exact: true}).first().click().catch((e) => { out.cancelErr = String(e.message).slice(0, 200); });
            await sleep(1000);
            out.afterCancel = {dialogsOpen: (await dialogTexts()).map((d) => d.text.slice(0, 120)), grid: names(await readGrid())};
            await snap('inu-02-after-cancel', {res: out.afterCancel});
            out.afterReload = names(await componentsTab(D.path));
            record('inu-summary', out);
            log('[inuse]', app.name, JSON.stringify(out).slice(0, 4000));
        });

        // =====================================================================
        // Phase api (D): td12 and Rule 28, the typed address /api/v1/genres, one account per level.
        if (on('api')) await sect('api', async () => {
            const D = sc.D; const out = {};
            const read = async (who) => {
                const r = await page.goto(ctxUrl(D.path, '/api/v1/genres')).catch((e) => ({err: String(e.message).slice(0, 200)}));
                const body = await page.locator('body').innerText().catch(() => '');
                let j = null; try { j = JSON.parse(body); } catch (e) { /* not JSON */ }
                const o = {status: r && r.status ? r.status() : r, itemsMax: j && j.itemsMax, count: j && j.items ? j.items.length : null,
                    items: j && j.items ? j.items.map((i) => `${(i.name && (i.name.en || Object.values(i.name)[0])) || i.name}|enabled=${i.enabled}|dep=${i.dependent}|key=${i.key}`) : null,
                    fields: j && j.items && j.items[0] ? Object.keys(j.items[0]) : null, error: j && !j.items ? j : (j ? null : body.slice(0, 300))};
                record(`api-${who}`, o);
                return o;
            };
            for (const k of Object.keys(D.u)) {
                await signInAs(D.u[k], D.path);
                out[k] = await read(k);
            }
            await signInAs('admin', D.path);
            out.admin = await read('admin');
            await signOut(page);
            out.visitor = await read('visitor');
            // a single row, one deleted
            await signInAs(D.u.mgr, D.path);
            record('api-summary', out);
            log('[api]', app.name, JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, {s: v.status, max: v.itemsMax, n: v.count, err: v.error}]))));
            log('[api mgr]', app.name, JSON.stringify(out.mgr).slice(0, 3000));
        });

        // =====================================================================
        // Phase restore (R, two form languages): td7, Rule 18, the gate's other end.
        if (on('restore')) await sect('restore', async () => {
            const R = sc.R; const out = {};
            await signInAs(R.u.mgr, R.path);
            await componentsTab(R.path, 'res-00-tab');
            out.otherForm = await openEdit('Other');
            await snap('res-01-other-two-languages', {form: out.otherForm});
            // the French box: through the multilingual control
            const en = form().locator('input[name="name[en]"]');
            const fr = form().locator('input[name="name[fr_CA]"]');
            await en.fill('Other Files');
            await en.focus(); await sleep(400);
            out.frVisible = await fr.isVisible().catch(() => false);
            if (!out.frVisible) { const g = form().locator('.localization_popover_container, .pkpFormLocales, [class*="locale"]').first(); await g.click().catch(() => {}); await sleep(300); out.frVisible2 = await fr.isVisible().catch(() => false); }
            await snap('res-02-french-box', {frVisible: out.frVisible, frVisible2: out.frVisible2});
            await fr.fill('Autres fichiers', {force: true}).catch(async () => { await fr.evaluate((e) => { e.value = 'Autres fichiers'; e.dispatchEvent(new Event('change', {bubbles: true})); }); });
            out.renamed = await pressSave('res-03-renamed', {settle: 2000});
            await openEdit(MAIN);
            await form().getByRole('radio', {name: /^No, allow new submissions/}).check();
            out.unrequired = await pressSave('res-04-main-unrequired', {settle: 2000});
            // delete GONE
            const confirmDlg = () => page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').filter({hasText: /Are you sure/}).last();
            let rl = await rowLinks(GONE);
            await rl.acts.getByRole('link', {name: 'Delete', exact: true}).first().click(); await sleep(900);
            await confirmDlg().getByRole('button', {name: /^(Delete|OK|Yes)$/}).first().click(); await sleep(1800); await idle(page);
            // add Probe Component, dependent ticked, required yes
            await componentsTab(R.path);
            await openAdd();
            await form().locator('input[name="name[en]"]').fill('Probe Component');
            await form().locator('input[name="dependent"]').check();
            await form().locator('input[name="key"]').fill('PROBE-R');
            out.added = await pressSave('res-05-added', {settle: 2000});
            out.before = names(await componentsTab(R.path, 'res-06-before-restore'));
            // the gate's other end: nothing required
            out.gate = await gateRead(R, R.subs.r1, 'res-07-r1-review-nothing-required');
            await signInAs(R.u.mgr, R.path);
            await componentsTab(R.path);
            // Restore Defaults: Cancel end
            let m = mark();
            await grid().getByRole('link', {name: 'Restore Defaults', exact: true}).first().click(); await sleep(900);
            out.ask = (await dialogTexts()).slice(-1)[0];
            await snap('res-08-restore-asks', {ask: out.ask});
            await loc(page, '"Restore Defaults" confirmation', page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').filter({hasText: /restore the defaults/}).last());
            const rdlg = () => page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').filter({hasText: /restore the defaults/}).last();
            await rdlg().getByRole('button', {name: 'Cancel', exact: true}).first().click().catch(() => {});
            await sleep(900); await idle(page);
            out.cancelled = {...(await since(m)), grid: names(await readGrid())};
            await sleep(600);
            m = mark();
            await grid().getByRole('link', {name: 'Restore Defaults', exact: true}).first().click(); await sleep(900);
            out.buttons = ((await dialogTexts()).slice(-1)[0] || {}).buttons;
            await rdlg().getByRole('button', {name: /^(OK|Yes|Restore|Confirm)/}).first().click();
            await sleep(2500); await idle(page);
            out.restored = {...(await since(m)), samePage: names(await readGrid())};
            await snap('res-09-restored-same-page', {res: out.restored});
            out.afterReload = names(await componentsTab(R.path, 'res-10-restored-reload'));
            out.forms = {};
            for (const n of [MAIN, 'Other', GONE, 'Probe Component']) {
                try { out.forms[n] = await openEdit(n); await cancelWin(); } catch (e) { out.forms[n] = {error: String(e.message).slice(0, 200)}; await componentsTab(R.path).catch(() => {}); }
            }
            await openEdit('Other');
            await snap('res-11-other-after-restore', {form: out.forms.Other});
            await cancelWin();
            out.gateAfter = await gateRead(R, R.subs.r1, 'res-12-r1-review-after-restore');
            record('res-summary', out);
            log('[restore]', app.name, JSON.stringify({otherNames: out.otherForm.nameBoxes, fr: [out.frVisible, out.frVisible2], renamed: out.renamed.gridSamePage, before: out.before, gate: out.gate, ask: out.ask, cancelled: out.cancelled, buttons: out.buttons, restored: out.restored, afterReload: out.afterReload,
                forms: Object.fromEntries(Object.entries(out.forms).map(([k, f]) => [k, f.error || {names: f.nameBoxes && f.nameBoxes.map((b) => `${b.name}=${b.value}`), boxes: (f.boxes || []).filter((b) => b.checked).map((b) => b.name), req: (f.required || []).filter((r) => r.checked).map((r) => r.label.slice(0, 3)), key: f.key}])), gateAfter: out.gateAfter}).slice(0, 9000));
        });

        // =====================================================================
        // Phase french (R): every component's French name, and the list with the interface in French.
        if (on('french')) await sect('french', async () => {
            const R = sc.R; const out = {rows: {}};
            await signInAs(R.u.mgr, R.path);
            const g = await componentsTab(R.path, 'fr-00-tab-english');
            for (const n of names(g)) {
                try { const f = await openEdit(n); out.rows[n] = (f.nameBoxes || []).map((b) => `${b.name}=${b.value}`); await cancelWin(); } catch (e) { out.rows[n] = String(e.message).slice(0, 120); await componentsTab(R.path).catch(() => {}); }
            }
            await page.goto(app.url(`/index.php/${R.path}/fr_CA/management/settings/workflow`)); await idle(page);
            await page.locator('#components-button').first().click().catch(() => {}); await idle(page);
            await page.locator('[id^="component-grid-settings-genre"] tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            await idle(page); await sleep(300);
            const gf = await readGrid();
            out.frenchList = gf && {heading: gf.heading, actions: gf.actions, rows: names(gf)};
            await snap('fr-01-list-in-french', {grid: gf});
            // the upload list in French (the author's draft r1 has no upload list; a2-like: the wizard on r1's files step is Vue) — skip
            record('fr-summary', out);
            log('[french]', app.name, JSON.stringify(out).slice(0, 5000));
        });

        // =====================================================================
        // Phase screening: the "Submission" side tabs on every app (seeded, read-only; scratch);
        // the "Metadata" type box (OMP3 / its controls); the OPS plugin gallery.
        if (on('screening')) await sect('screening', async () => {
            const out = {};
            const sideTabs = async (ctx, label) => {
                await page.goto(ctxUrl(ctx, '/management/settings/workflow')); await idle(page);
                const tabs = await page.getByRole('tab').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
                await page.getByRole('tab', {name: 'Metadata', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(700);
                const type = await page.locator('#metadata').first().evaluate((p) => {
                    const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
                    const box = [...p.querySelectorAll('input[type=checkbox]')].find((c) => /type/i.test(f((c.closest('label') || {}).innerText)) && /Enable/i.test(f((c.closest('label') || {}).innerText)));
                    const fs = box && (box.closest('fieldset') || box.closest('.pkpFormField'));
                    return box ? {label: f(box.closest('label').innerText), checked: box.checked, radios: fs ? [...fs.querySelectorAll('input[type=radio]')].map((r) => ({label: f((r.closest('label') || {}).innerText), checked: r.checked, visible: r.getClientRects().length > 0})) : null} : null;
                }).catch((e) => ({error: String(e.message).slice(0, 200)}));
                await snap(label, {tabs, type});
                return {tabs, type};
            };
            await signInAs('manager.maya', app.contextPath);
            out.seeded = await sideTabs(app.contextPath, 'scr-01-seeded-manager');
            await signInAs(sc.A.u.mgr, sc.A.path);
            out.scratch = await sideTabs(sc.A.path, 'scr-02-scratch-manager');
            if (isOMP && sc.P) { await signInAs(sc.P.u.mgr, sc.P.path); out.press = await sideTabs(sc.P.path, 'scr-03-scratch-press'); }
            if (isOPS) {
                await signInAs('admin', app.contextPath);
                await page.goto(ctxUrl(app.contextPath, '/management/settings/website')); await idle(page);
                await page.getByRole('tab', {name: 'Plugins', exact: true}).first().click().catch(() => {}); await idle(page);
                await page.getByRole('tab', {name: 'Plugin Gallery', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(3000); await idle(page);
                const txt = await page.locator('[role="tabpanel"]:visible').last().innerText().catch(() => '');
                out.gallery = {screenHits: txt.split('\n').filter((l) => /screen/i.test(l)).slice(0, 20), length: txt.length, head: flat(txt, 600)};
                await snap('scr-04-ops-plugin-gallery', {gallery: out.gallery});
                const inst = await page.goto(ctxUrl(app.contextPath, '/management/settings/website')).then(() => idle(page)).then(() => page.getByRole('tab', {name: 'Plugins', exact: true}).first().click()).then(() => idle(page)).then(() => page.locator('[role="tabpanel"]:visible').last().innerText()).catch(() => '');
                out.installedScreenHits = inst.split('\n').filter((l) => /screen/i.test(l));
                await snap('scr-05-ops-installed-plugins', {hits: out.installedScreenHits});
            }
            record('scr-summary', out);
            log('[screening]', app.name, JSON.stringify(out).slice(0, 5000));
        });

        // =====================================================================
        // Phase omp3 (OMP, P): a restricted only series; the "Submissions" notice off and on.
        if (on('omp3') && isOMP) await sect('omp3', async () => {
            const P = sc.P; const out = {};
            const aboutRead = async (who, label) => {
                if (who === 'visitor') await signOut(page); else await signInAs(P.u[who], P.path);
                await page.goto(ctxUrl(P.path, '/about/submissions')); await idle(page);
                const t = await page.locator('.page_submissions, main, body').first().innerText().catch(() => '');
                const notice = flat(await page.locator('.cmp_notification').first().innerText().catch(() => null));
                await snap(label, {notice});
                return {notice, head: flat(t, 300)};
            };
            await signInAs(P.u.mgr, P.path);
            await page.goto(ctxUrl(P.path, '/management/settings/context')); await idle(page);
            await page.getByRole('tab', {name: 'Series', exact: true}).first().click(); await idle(page); await sleep(700);
            const sgrid = page.locator('#seriesGridContainer').first();
            out.seriesBefore = flat(await sgrid.innerText().catch(() => null), 500);
            await snap('omp-01-series-tab', {series: out.seriesBefore});
            await sgrid.getByRole('link', {name: /Add Series/}).first().click();
            const sf = page.locator('form#seriesForm').first();
            await sf.locator('input[name^="title"]').first().waitFor({timeout: T}); await idle(page); await sleep(800);
            await sf.locator('input[name="title[en]"]').fill('K3 Only');
            await sf.locator('input[name="path"]').fill('k3-only');
            await sf.getByRole('checkbox', {name: /Don't allow authors to submit directly/}).first().check();
            await sf.getByRole('button', {name: 'Save', exact: true}).click(); await sleep(2000); await idle(page);
            out.seriesSaved = {open: await sf.isVisible().catch(() => false)};
            await page.goto(ctxUrl(P.path, '/management/settings/context')); await idle(page);
            await page.getByRole('tab', {name: 'Series', exact: true}).first().click(); await idle(page); await sleep(700);
            out.seriesAfter = flat(await page.locator('#seriesGridContainer').first().innerText().catch(() => null), 500);
            await snap('omp-02-series-after', {series: out.seriesAfter});
            out.offVisitor = await aboutRead('visitor', 'omp-03-about-off-visitor');
            out.offAuthor = await aboutRead('au', 'omp-04-about-off-author');
            out.offMgr = await aboutRead('mgr', 'omp-05-about-off-manager');
            // Disable Submissions ticked
            await page.goto(ctxUrl(P.path, '/management/settings/workflow')); await idle(page);
            await page.getByRole('tab', {name: 'Disable Submissions', exact: true}).first().click(); await idle(page); await sleep(800);
            const panel = page.locator('[role="tabpanel"]:visible').filter({has: page.getByRole('checkbox')}).last();
            await panel.getByRole('checkbox').first().check();
            const m = mark();
            await panel.getByRole('button', {name: 'Save', exact: true}).click(); await sleep(2500); await idle(page);
            out.disableSave = await since(m);
            await snap('omp-06-disabled-saved', {res: out.disableSave});
            out.onVisitor = await aboutRead('visitor', 'omp-07-about-on-visitor');
            out.onAuthor = await aboutRead('au', 'omp-08-about-on-author');
            out.onMgr = await aboutRead('mgr', 'omp-09-about-on-manager');
            out.mail = await mailCount(P);
            record('omp-summary', out);
            log('[omp3]', app.name, JSON.stringify(out).slice(0, 5000));
        });

        // =====================================================================
        // Phase galley (OJS, OPS; A4): the galley upload's component list on A (install defaults).
        if (on('galley') && !isOMP) await sect('galley', async () => {
            const A = sc.A; const out = {};
            await signInAs(A.u.mgr, A.path);
            const s = A.subs.a2;
            await page.goto(edUrl(A.path, s.id, `publication_${s.pub}_galleys`)); await idle(page);
            await snap('gal-01-galleys');
            await page.locator('[role="dialog"]:visible').first().getByRole('button', {name: /^Add galley$/i}).first().click(); await idle(page);
            const f = topWin();
            await f.locator('input[name="label"]').waitFor({timeout: T});
            out.galleyForm = flat(await f.innerText().catch(() => null), 800);
            await f.locator('input[name="label"]').fill('K3');
            await f.getByRole('button', {name: /^(Save|OK)$/}).last().click(); await idle(page);
            await wizardDialog().locator('select[id^="genreId"]').waitFor({state: 'attached', timeout: T}).catch(() => {});
            await idle(page); await sleep(400);
            out.options = await wizardDialog().locator('select[id^="genreId"]').first().evaluate((s0) => [...s0.options].map((o) => o.text.trim())).catch(() => null);
            await snap('gal-02-galley-wizard', {options: out.options});
            const c = wizardDialog().getByRole('link', {name: 'Cancel', exact: true}).or(wizardDialog().getByRole('button', {name: 'Cancel', exact: true})).first();
            await c.click().catch(() => {}); await sleep(1000); await idle(page);
            record('gal-summary', out);
            log('[galley]', app.name, JSON.stringify(out).slice(0, 3000));
        });
        // =====================================================================
        // Phase article (OJS, OPS; Rule 20's article page): a supplementary component's galley on the landing page.
        if (on('article') && !isOMP) await sect('article', async () => {
            const A = sc.A; const out = {};
            if (!A.subs.a3) {
                try {
                    const r = await app.api.createSubmission({tag: `${A.path}a3`.slice(0, 32), context: A.path, submitter: A.u.au, title: 'K3 a3 Quokkery published',
                        ...(isOPS ? {} : {files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction']}), published: true,
                        galleys: [{label: 'PDF', file: isOPS ? 'preprint.pdf' : 'article.pdf'}, {label: 'Data', file: isOPS ? 'preprint.pdf' : 'article.pdf', genre: 'Data Set'}]});
                    A.subs.a3 = {id: r.submissionId, pub: r.publicationId, galleys: r.galleys}; save();
                } catch (e) { A.subs.a3 = {error: String(e.message).slice(0, 600)}; save(); }
            }
            out.seed = A.subs.a3;
            await signOut(page).catch(() => {});
            await page.goto(ctxUrl(A.path, `/${isOPS ? 'preprint' : 'article'}/view/${A.subs.a3.id}`)); await idle(page);
            out.page = await page.evaluate(() => {
                const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
                const hs = [...document.querySelectorAll('h2, h3, .label')].map((h) => f(h.innerText)).filter((t) => /upplementar|Download|galley/i.test(t));
                const supp = document.querySelector('.supplementary_galleys_links, .item.supplementary, [class*="supplementary"]');
                return {headings: hs, suppBlock: supp ? {cls: supp.className, text: f(supp.innerText)} : null, mainGalleys: [...document.querySelectorAll('ul.galleys_links a, .galleys_links a, a.obj_galley_link')].map((a) => f(a.innerText))};
            });
            await snap('art-01-landing-visitor', {res: out.page});
            record('art-summary', out);
            log('[article]', app.name, JSON.stringify(out).slice(0, 3000));
        });
    } finally {
        await signOut(page).catch(() => {});
        await close();
    }
    save();
    log('[done]', app.name);
});
