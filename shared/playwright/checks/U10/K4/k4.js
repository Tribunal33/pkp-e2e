// U10 claim check, chunk K4: Settings › Website › "Appearance" › "Editorial
// Masthead" and "Advanced"; Settings › Website › "Setup" › "Lists" and
// "Date & Time"; the public masthead pages, paged lists, the dates on public
// and editorial pages, a style sheet uploaded and removed, a favicon. All
// three apps.
// Spec: docs/specs/U10-appearance-and-theming.md lines 100–141, 349–418,
// 485–502, 507–510, 515–523; register A3, A5 (the "Date (Short)" choice back: no register entry; did not reproduce); footnotes h, i, j, m, t,
// u, v, w, y, f-a3, f-a5, td4–td7, td28–td35.
//
// Seeds per app (scratch, tag prefix u10k4):
//   A  en + fr_CA (UI and Forms): a member in each masthead role, two past
//      members, an author with one published item: "Editorial Masthead",
//      "Advanced" (style sheet, favicon, OMP cover sizes' refusals)
//   L  en only, 13 published items titled "Zephyr item NN" (no issue), the
//      search index built (the app's own queue worker), two readers:
//      "Lists" (td6, td31, td32), the Roles grid, the Users list
//   R  {OJS} three published issues: the archive's paging
//   C  one category "K4 Category" and three published items that the
//      phase places in it on screen (unpublish, "Select Categories", publish):
//      a category's page at 25 / 1 items per page
//   D  en + fr_CA Forms: announcements on with one announcement, one
//      published item (OJS inside a published issue), OJS/OMP a submission
//      file with a note, a Publisher Library file: "Date & Time" (td7,
//      td33–td35); {OMP} a cover uploaded at two thumbnail sizes
// Phases (PHASES=a,…; default all): seed, fresh, masthead, advanced, lists,
// paging, cats, covers, dates; STEPS=<step names> narrows a phase;
// RESEED=L,R recreates those contexts. State: .reports/U10/ccK4/k4-state-<app>.json.
// Order matters inside "dates": d-custom leaves "Date & Time (Short)" on
// "Custom" with the time alone (the finding), which d-time-g resets.
// 2026-09-29 (s29, upstream sync pkp-lib#13370 / #13390): "Editorial Masthead"
// gains "Enrollment-based Masthead" ("Present a masthead based on user
// enrollments") and, on OJS/OMP, the "Enable listing of reviewers on the
// masthead" box. Phases added:
//   E  (seeded by the "enroll" phase itself, en + fr_CA, country and initials
//      set) a member in each masthead role, a past member, an Editorial
//      History text, [OJS/OMP] a reviewer with a review completed last year
//   enroll   E: the tab as it opens (the two boxes, the list's rows and
//            handles), the reviewers box ticked/unticked (same page, reload,
//            public masthead), "Present a masthead…" unticked unsaved (side
//            tab switch, reload), then saved (the list hidden, public
//            masthead and editorialHistory address), ticked again; a role
//            moved while the box is off; the Journal editor's save; a
//            Section editor's typed address; {OJS} "Publishing Mode"
//   mfr      E in the French interface: "Entête", the new boxes' labels
// RUN=r1 suffixes facts, snapshots and the state file, so two runs keep their
// own records; m-drag now drags inside the roles list only (the new boxes are
// rows of the same class).
// Run: PROBE_FEATURE=U10 PROBE_AGENT=ccK4s29 RUN=r1 PHASES=seed,fresh,masthead,enroll,mfr node bin/probe.js <app|all> shared/playwright/checks/U10/K4/k4.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {forEachApp, launch, signIn, signOut, screen, shot: shot0, record: rec0, loc, note, idle, tag, outDir} =
    require('../../../probe');
const SFX = process.env.RUN ? `-${process.env.RUN}` : '';
const record = (name, data, opts) => rec0(`${name}${SFX}`, data, opts);
const shot = (p, name) => shot0(p, `${name}${SFX}`);

const ALL = ['seed', 'fresh', 'masthead', 'enroll', 'mfr', 'advanced', 'lists', 'paging', 'cats', 'covers', 'dates'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 400) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const log = (...a) => console.log('[k4]', new Date().toISOString().slice(11, 19), ...a);
const stateFile = (app) => path.join(outDir(), `k4-state${SFX}-${app.name}.json`);
const PINNED = '2026-09-24T15:05:00';   // the spec's example moment, the browser's clock (UTC on this VM)

// ---- files -----------------------------------------------------------------
const crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
};
const png = (w, h, [r, g, b]) => {
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) {
        raw[y * (w * 3 + 1)] = 0;
        for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; }
    }
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};
// a minimal baseline JPEG (1×1) for the favicon refusal
const JPG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
const FILES = {
    css: {name: 'k4-red-headings.css', mimeType: 'text/css', buffer: Buffer.from('h1, h2, h3, h4, h5, h6 { color: rgb(255, 0, 0); }\n')},
    fav: {name: 'k4-favicon.png', mimeType: 'image/png', buffer: png(32, 32, [0, 120, 0])},
    favFr: {name: 'k4-favicon-fr.png', mimeType: 'image/png', buffer: png(32, 32, [0, 0, 160])},
    jpg: {name: 'k4-favicon.jpg', mimeType: 'image/jpeg', buffer: JPG},
    ico: {name: 'k4-favicon.ico', mimeType: 'image/x-icon', buffer: Buffer.concat([Buffer.from([0, 0, 1, 0, 1, 0, 32, 32, 0, 0, 1, 0, 32, 0]), (() => { const b = Buffer.alloc(4); b.writeUInt32LE(0); return b; })(), (() => { const b = Buffer.alloc(4); b.writeUInt32LE(22); return b; })()])},
};

// the app's own queue worker, once (the search index jobs the publish queued); support/jobs.js's
// runJobs() waits on worker 0's server (basePort), which a probe run does not have up
const {execFileSync} = require('child_process');
const drainJobs = (app) => {
    try {
        return execFileSync('php', ['lib/pkp/tools/jobs.php', 'run'], {cwd: app.root, env: {...process.env, PKP_CONFIG_FILE: app.configFile}, encoding: 'utf8', timeout: 180_000})
            .split('\n').filter((l) => l.trim()).slice(-3).join(' | ');
    } catch (e) { return `error: ${String(e.message).split('\n')[0]}`; }
};
// L: thirteen published items titled "Zephyr item NN" (no issue), the search index built;
// R {OJS}: three published issues and nothing else, for the archive's paging
function seeders(app, t) {
    const isOjs = app.name === 'ojs';
    const u = (tg, key, roles, given, family) => ({username: `${tg}${key}`, roles, givenName: given, familyName: family});
    const mkL = async (suffix = 'l') => {
        const tL = `${t}${suffix}`;
        const usersL = [u(tL, 'mgr', ['manager'], 'Lena', 'Manager'), u(tL, 'r1', ['reader'], 'Rolf', 'Readerone'), u(tL, 'r2', ['reader'], 'Rita', 'Readertwo'), u(tL, 'au', ['author'], 'Lars', 'Author')];
        const resL = await app.api.createContext({tag: tL, context: {name: `U10 K4 L ${tL}`, acronym: 'K4L'}, users: usersL});
        const subs = [];
        for (let i = 1; i <= 13; i++) {
            const r = await app.api.createSubmission({tag: `${tL}s${i}`, context: tL, submitter: `${tL}au`, title: `Zephyr item ${String(i).padStart(2, '0')}`, published: true});
            subs.push(r && r.submissionId);
        }
        const jobs = drainJobs(app);
        return {path: tL, mgr: `${tL}mgr`, contextId: resL && resL.contextId, subs, jobs};
    };
    const mkR = async (suffix = 'r') => {
        const tR = `${t}${suffix}`;
        const res = await app.api.createContext({tag: tR, context: {name: `U10 K4 R ${tR}`, acronym: 'K4R'}, users: [u(tR, 'mgr', ['manager'], 'Remy', 'Manager')],
            issues: [{volume: 1, number: 1, year: 2024, published: true}, {volume: 1, number: 2, year: 2025, published: true}, {volume: 2, number: 1, year: 2026, published: true}]});
        return {path: tR, mgr: `${tR}mgr`, contextId: res && res.contextId, issues: res && res.issues};
    };
    return {mkL, mkR};
}

forEachApp(async (app) => {
    const isOjs = app.name === 'ojs', isOmp = app.name === 'omp', isOps = app.name === 'ops';
    const ctxUrl = (ctx, p = '', locale = 'en') => app.url(`/index.php/${ctx}${locale ? '/' + locale : ''}${p}`);
    let st = fs.existsSync(stateFile(app)) ? JSON.parse(fs.readFileSync(stateFile(app), 'utf8')) : null;
    const fact = (k, v) => { record('facts', {[k]: v}, {merge: true}); log(app.name, k, JSON.stringify(v).slice(0, 1200)); };
    const saveState = () => fs.writeFileSync(stateFile(app), JSON.stringify(st, null, 2));

    // ---- seed ----------------------------------------------------------------
    if (on('seed') || !st) {
        const t = tag('u10k4');
        const tA = `${t}a`, tD = `${t}d`;
        const bi = {primaryLocale: 'en', supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']};
        const u = (tg, key, roles, given, family, extra = {}) => ({username: `${tg}${key}`, roles, givenName: given, familyName: family, ...extra});
        // A: a member in each masthead role
        const usersA = [u(tA, 'mgr', ['manager'], 'Mona', 'Manager'), u(tA, 'au', ['author'], 'Alan', 'Author')];
        if (!isOps) usersA.push(u(tA, 'ed', ['editor'], 'Edna', 'Editor'), u(tA, 'ce', ['copyeditor'], 'Cora', 'Copyeditor'));
        usersA.push(u(tA, 'se', ['sectionEditor'], 'Sami', 'Sectioneditor'), u(tA, 'eb', ['editorialBoardMember'], 'Ebba', 'Boardmember'));
        usersA.push(u(tA, 'px', ['reader'], 'Pia', 'Pastmember', {pastRoles: [{role: 'sectionEditor'}]}), u(tA, 'py', ['reader'], 'Paul', 'Pastboard', {pastRoles: [{role: 'editorialBoardMember'}]}));
        const resA = await app.api.createContext({tag: tA, context: {name: `U10 K4 A ${tA}`, acronym: 'K4A', ...bi}, users: usersA});
        const subA = await app.api.createSubmission({tag: `${tA}s1`, context: tA, submitter: `${tA}au`, title: `K4 styled item ${tA}`, published: true});
        const {mkL, mkR} = seeders(app, t);
        const L = await mkL();
        const R = isOjs ? await mkR() : null;
        // D: dates
        const usersD = [u(tD, 'mgr', ['manager'], 'Dora', 'Manager'), u(tD, 'au', ['author'], 'Dave', 'Author')];
        const restD = {enableAnnouncements: true, announcements: [{title: {en: 'K4 dated news'}, descriptionShort: {en: '<p>Short.</p>'}}],
            libraryFiles: [{name: {en: 'K4 library file'}, type: 'Other'}]};
        if (isOjs) restD.issues = [{volume: 3, number: 1, year: 2026, published: true}];
        const resD = await app.api.createContext({tag: tD, context: {name: `U10 K4 D ${tD}`, acronym: 'K4D', primaryLocale: 'en', supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']}, users: usersD, ...restD});
        const pubD = await app.api.createSubmission({tag: `${tD}s1`, context: tD, submitter: `${tD}au`, title: `K4 dated item ${tD}`, published: true, ...(isOjs ? {issue: {volume: 3, number: 1, year: 2026}} : {})});
        let noteD = null;
        if (!isOps) noteD = await app.api.createSubmission({tag: `${tD}s2`, context: tD, submitter: `${tD}au`, title: `K4 noted item ${tD}`, files: [{file: 'article.pdf', note: 'K4 note on the file'}]});
        const id = (r) => r && (r.submissionId || r.id || (r.submission && r.submission.id));
        st = {t, A: {path: tA, mgr: `${tA}mgr`, contextId: resA && resA.contextId, users: resA && resA.users, sub: id(subA)},
            L, R,
            D: {path: tD, mgr: `${tD}mgr`, contextId: resD && resD.contextId, issues: resD && resD.issues, announcements: resD && resD.announcements, libraryFiles: resD && resD.libraryFiles, pub: id(pubD), noted: id(noteD)},
            keys: {subA: subA && Object.keys(subA), note: noteD && Object.keys(noteD)}};
        saveState();
        fact('seed', st);
    }

    // RESEED=L,R: recreate those scratch contexts (fresh suffix) on a later build or after a failed drive
    if (process.env.RESEED && st) {
        const {mkL, mkR} = seeders(app, st.t);
        const sfx = Date.now().toString(36).slice(-3);
        for (const L of process.env.RESEED.split(',')) {
            if (L === 'L') st.L = await mkL(`l${sfx}`);
            if (L === 'R' && isOjs) st.R = await mkR(`r${sfx}`);
        }
        saveState();
        fact('reseed', {L: st.L, R: st.R});
    }

    const M = await launch(app);
    const V = await launch(app);
    const page = M.page;
    const vis = V.page;
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push({type: d.type(), message: d.message(), url: page.url()}); d.accept().catch(() => {}); });

    const snap = async (p, name, extra = {}) => {
        const s = await screen(p).catch((e) => ({error: String(e.message || e)}));
        record(name, {...s, ...extra});
        await shot(p, name).catch(() => {});
        return s;
    };
    const STEPS = process.env.STEPS ? process.env.STEPS.split(',') : null;
    const step = async (name, fn) => {
        if (STEPS && !STEPS.includes(name)) return null;
        log(app.name, '== step', name);
        try { return await fn(); } catch (e) {
            fact(`ERROR-${name}`, String(e.stack || e).slice(0, 900));
            await shot(page, `error-${name}`).catch(() => {});
            if (process.env.STOP === '1') throw e;
            return null;
        }
    };
    const asMgr = async (ctx, p = page) => { await signIn(p, st[ctx].mgr, {contextPath: st[ctx].path}); await idle(p); };

    // ---- Settings › Website ---------------------------------------------------
    const SIDE = {'Editorial Masthead': ['appearance', 'appearance-masthead'], Advanced: ['appearance', 'advanced'], Theme: ['appearance', 'theme'], Setup: ['appearance', 'appearance-setup'], Lists: ['setup', 'lists'], 'Date & Time': ['setup', 'dateTime'], Information: ['setup', 'information']};
    const openSide = async (ctx, side, p = page) => {
        const [top, id] = SIDE[side];
        await p.goto(ctxUrl(st[ctx].path, '/management/settings/website'));
        await idle(p);
        await p.locator(`#${top}-button`).first().click();
        await idle(p); await sleep(400);
        await p.locator(`#${id}-button`).first().click();
        await idle(p); await sleep(700);
        return p.locator(`[role="tabpanel"]#${id}`).first();
    };
    const panel = (side, p = page) => p.locator(`[role="tabpanel"]#${SIDE[side][1]}`).first();
    // the form as data: every field with its label, description, inputs, buttons
    const formDump = async (root) => root.evaluate((el) => {
        const vis = (e) => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length));
        const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const fields = [...el.querySelectorAll('.pkpFormField')].filter((f) => !f.parentElement.closest('.pkpFormField')).map((f) => ({
            cls: f.className.split(' ').filter((c) => /pkpForm/.test(c)).join(' '),
            visible: vis(f),
            label: txt(f.querySelector('legend, .pkpFormFieldLabel, label')),
            description: [...f.querySelectorAll('.pkpFormField__description, .pkpFormGroup__description')].map(txt).filter(Boolean),
            inputs: [...f.querySelectorAll('input, textarea, select')].map((i) => {
                const lab = i.id ? el.querySelector(`label[for="${i.id}"]`) : i.closest('label');
                return {tag: i.tagName, type: i.type, name: i.name, id: i.id, value: i.type === 'file' ? null : i.value, checked: ['radio', 'checkbox'].includes(i.type) ? i.checked : undefined, visible: vis(i), label: lab ? txt(lab) : null, required: i.required || i.getAttribute('aria-required'), size: i.getAttribute('size'), accept: i.accept || undefined, min: i.min || undefined};
            }),
            buttons: [...f.querySelectorAll('button')].map((b) => ({text: txt(b), aria: b.getAttribute('aria-label'), visible: vis(b), disabled: b.disabled})),
            links: [...f.querySelectorAll('a')].map((a) => ({text: txt(a), href: a.getAttribute('href'), target: a.getAttribute('target')})),
            text: txt(f).slice(0, 1500),
        }));
        const buttons = [...el.querySelectorAll('button')].filter(vis).map((b) => txt(b) || b.getAttribute('aria-label'));
        const links = [...el.querySelectorAll('a')].filter(vis).map((a) => ({text: txt(a), href: a.getAttribute('href'), target: a.getAttribute('target')}));
        return {text: txt(el).slice(0, 4000), fields, buttons, links};
    });
    const saveForm = async (root, p = page) => {
        const form = root.locator('form').first();
        const w = p.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 8000}).catch(() => null);
        await form.getByRole('button', {name: 'Save', exact: true}).last().click({timeout: 8000});
        const r = await w;
        let body = null;
        try { body = r ? await r.json() : null; } catch { body = null; }
        const saved = await form.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 6000}).then(() => true).catch(() => false);
        await sleep(400);
        const errors = await form.locator('.pkpFieldError').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => {
            const f = e.closest('.pkpFormField, fieldset');
            const lab = f ? (f.querySelector('legend, label') || {}).textContent : null;
            return {field: lab ? lab.replace(/\s+/g, ' ').trim() : null, text: e.textContent.replace(/\s+/g, ' ').trim()};
        })).catch(() => []);
        const foot = (await form.locator('.pkpFormPage__footer, .pkpFormPage__errors, .pkpFormPage__status').allInnerTexts().catch(() => [])).map((x) => flat(x, 300)).filter(Boolean);
        const bodyErr = body && typeof body === 'object' && !body.id ? JSON.stringify(body).slice(0, 600) : null;
        const pickKeys = ['itemsPerPage', 'numPageLinks', 'dateFormatLong', 'dateFormatShort', 'timeFormat', 'datetimeFormatLong', 'datetimeFormatShort', 'styleSheet', 'favicon', 'mastheadUserGroupIds', 'enableEnrollmentMasthead', 'enableEnrollmentMastheadReviewers', 'coverThumbnailsMaxWidth', 'coverThumbnailsMaxHeight'];
        const stored = body && body.id ? Object.fromEntries(pickKeys.filter((k) => k in body).map((k) => [k, body[k]])) : undefined;
        return {status: r ? r.status() : null, sent: !!r, saved, errors, foot, bodyErr, stored};
    };

    try {
        // ======================= fresh: the four tabs as a new context has them =====
        if (on('fresh')) {
            await asMgr('A');
            await step('fresh-masthead', async () => {
                const pn = await openSide('A', 'Editorial Masthead');
                await snap(page, 'fresh-masthead');
                const d = await formDump(pn);
                const arrows = await pn.locator('button').evaluateAll((bs) => bs.map((b) => ({text: b.innerText.replace(/\s+/g, ' ').trim(), aria: b.getAttribute('aria-label'), sr: [...b.querySelectorAll('.-screenReader, .sr-only')].map((s) => s.textContent.trim()), title: b.getAttribute('title')})));
                const aria = await pn.ariaSnapshot().catch(() => null);
                fact('fresh-masthead', {d, arrows, aria});
            });
            await step('fresh-advanced', async () => {
                const pn = await openSide('A', 'Advanced');
                await snap(page, 'fresh-advanced');
                fact('fresh-advanced', await formDump(pn));
                const langBtns = await pn.locator('.pkpFormLocales button').allInnerTexts().catch(() => []);
                fact('fresh-advanced-locales', langBtns);
            });
            await step('fresh-lists', async () => {
                const pn = await openSide('A', 'Lists');
                await snap(page, 'fresh-lists');
                fact('fresh-lists', await formDump(pn));
                await loc(page, 'Lists: Items per page', pn.locator('input[name="itemsPerPage"]'));
                await loc(page, 'Lists: Page links', pn.locator('input[name="numPageLinks"]'));
            });
            await step('fresh-dates', async () => {
                // the browser's clock pinned at the spec's example moment
                const p2 = await M.context.newPage();
                await p2.clock.setFixedTime(new Date(PINNED));
                const pn = await openSide('A', 'Date & Time', p2);
                await snap(p2, 'fresh-dates-pinned');
                const d = await formDump(pn);
                fact('fresh-dates-pinned', d);
                const langBtns = await pn.locator('.pkpFormLocales button').allInnerTexts().catch(() => []);
                fact('fresh-dates-locales', langBtns);
                await p2.close();
                // a browser far east of the server (UTC+14): whose date do the labels take?
                const ctx2 = await M.browser.newContext({baseURL: app.baseURL, viewport: {width: 1280, height: 900}, timezoneId: 'Pacific/Kiritimati', storageState: await M.context.storageState()});
                const p3 = await ctx2.newPage();
                const pn3 = await openSide('A', 'Date & Time', p3);
                const browserNow = await p3.evaluate(() => new Date().toString());
                const d3 = await formDump(pn3);
                await snap(p3, 'fresh-dates-kiritimati', {browserNow});
                fact('fresh-dates-kiritimati', {browserNow, serverUtc: new Date().toISOString(), groups: d3.fields.map((f) => ({label: f.label, opts: f.inputs.filter((i) => i.type === 'radio').map((i) => `${i.checked ? '*' : ''}${i.label}`)}))});
                await ctx2.close();
            });
        }

        // ---- shared readers ----------------------------------------------------------
        const mastheadOrder = async (pn) => pn.locator('button').evaluateAll((bs) => bs.map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter((t) => /^Decrease position of /.test(t)).map((t) => t.replace(/^Decrease position of /, '')));
        const readList = async (p) => p.evaluate(() => {
            const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
            const root = document.querySelector('.page_masthead') || document.querySelector('.pkp_structure_main') || document.body;
            const out = [];
            let cur = null;
            for (const e of root.querySelectorAll('h2, li')) {
                if (e.tagName === 'H2') { cur = {heading: txt(e), items: []}; out.push(cur); } else if (cur) cur.items.push(txt(e).slice(0, 80));
            }
            return out;
        });
        const openRoleForm = async (ctx, roleName) => {
            const row = page.getByRole('row', {name: new RegExp(`^Settings ${roleName} `)}).first();
            // the Roles grid loads by AJAX and once (OPS, s29 r2) stayed empty: one more load before giving up
            for (let attempt = 0; attempt < 2; attempt++) {
                await page.goto(ctxUrl(st[ctx].path, '/management/settings/access'));
                await idle(page);
                await page.getByRole('tab', {name: 'Roles'}).click();
                await idle(page);
                if (await row.waitFor({timeout: T}).then(() => true).catch(() => false)) break;
            }
            await row.getByRole('link', {name: 'Settings'}).click();
            await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Edit', exact: true}).click();
            const form = page.locator('#userGroupForm');
            await form.waitFor({timeout: T});
            await idle(page);
            return form;
        };
        const setMasthead = async (ctx, roleName, value, name) => {
            const form = await openRoleForm(ctx, roleName);
            const box = form.getByRole('checkbox', {name: 'Consider role in masthead list'});
            const before = await box.isChecked();
            if (value) await box.check(); else await box.uncheck();
            await snap(page, `${name}-roleform`);
            const w = page.waitForResponse((r) => r.url().includes('update-user-group'), {timeout: T}).catch(() => null);
            await form.getByRole('button', {name: 'OK'}).click();
            const r = await w;
            await idle(page);
            return {before, after: value, status: r ? r.status() : null};
        };
        const pubItemUrl = (ctx, id) => ctxUrl(st[ctx].path, isOjs ? `/article/view/${id}` : isOmp ? `/catalog/book/${id}` : `/preprint/view/${id}`);
        const headStyles = async (p) => p.evaluate(() => {
            const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
            const sheets = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href').replace(/^https?:\/\/[^/]+/, ''));
            const heads = [...document.querySelectorAll('h1, h2, h3')].filter((h) => h.getClientRects().length).slice(0, 8).map((h) => ({tag: h.tagName, cls: h.className, text: txt(h).slice(0, 60), color: getComputedStyle(h).color}));
            const icons = [...document.querySelectorAll('link[rel~="icon"]')].map((l) => ({rel: l.rel, href: (l.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, ''), type: l.type}));
            return {sheets, heads, icons};
        });
        const openFile = async (p, href) => {
            const url = /^https?:/.test(href) ? href : app.url(href);
            const r = await p.goto(url).catch((e) => ({err: String(e.message).slice(0, 200)}));
            if (!r || r.err) return {url, err: r && r.err};
            let body = null; try { body = (await r.text()).slice(0, 120); } catch { body = null; }
            return {url: url.replace(/^https?:\/\/[^/]+/, ''), status: r.status(), type: r.headers()['content-type'], body};
        };
        const upload = async (pn, inputId, file) => {
            const w = page.waitForResponse((r) => /temporaryFiles/.test(r.url()), {timeout: 8000}).catch(() => null);
            await pn.locator(`[id="${inputId}"]`).setInputFiles(file);
            const r = await w;
            await sleep(1200); await idle(page);
            return {status: r ? r.status() : null};
        };
        const boxOf = (pn, ctlPrefix) => pn.locator(`[id^="${ctlPrefix}"]`).first().locator('xpath=ancestor::div[contains(@class,"pkpFormField")][1]');
        const boxState = async (pn, ctlPrefix) => boxOf(pn, ctlPrefix).evaluate((root) => {
            const vis = (e) => e && e.getClientRects().length;
            const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
            return {text: txt(root), buttons: [...root.querySelectorAll('button')].filter(vis).map((b) => txt(b)), links: [...root.querySelectorAll('a')].filter(vis).map((a) => ({text: txt(a), href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')})), errors: [...root.querySelectorAll('.pkpFieldError, .dz-error-message')].filter(vis).map(txt).filter(Boolean)};
        }).catch((e) => ({error: String(e.message).slice(0, 200)}));
        const dropOn = async (pn, dzId, file) => {
            const sent = [];
            const onReq = (r) => { if (/temporaryFiles/.test(r.url())) sent.push(r.method()); };
            page.on('request', onReq);
            await pn.locator(`[id="${dzId}"]`).evaluate((el, f) => {
                const bytes = Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0));
                const dt = new DataTransfer();
                dt.items.add(new File([bytes], f.name, {type: f.mimeType}));
                for (const type of ['dragenter', 'dragover', 'drop']) el.dispatchEvent(new DragEvent(type, {bubbles: true, cancelable: true, dataTransfer: dt}));
            }, {b64: file.buffer.toString('base64'), name: file.name, mimeType: file.mimeType});
            await sleep(2000); await idle(page);
            page.off('request', onReq);
            return {sent};
        };

        // ======================= masthead (td5, td30, A3, Rule 28, Settings 15/24) =====
        if (on('masthead')) {
            await asMgr('A');
            await step('m-fresh', async () => {
                const pn = await openSide('A', 'Editorial Masthead');
                const order0 = await mastheadOrder(pn);
                const aria = await pn.ariaSnapshot().catch(() => null);
                await snap(page, 'm01-fresh');
                const pubM = await (async () => { await vis.goto(ctxUrl(st.A.path, '/about/editorialMasthead')); await idle(vis); await snap(vis, 'm02-public-masthead-before'); return readList(vis); })();
                const pubH = await (async () => { await vis.goto(ctxUrl(st.A.path, '/about/editorialHistory')); await idle(vis); await snap(vis, 'm03-public-history-before'); return readList(vis); })();
                fact('m-fresh', {order0, aria, pubM, pubH});
                await loc(page, 'Editorial Masthead: an up arrow by its text', pn.locator('button').filter({hasText: /^Increase position of /}));
                await loc(page, 'Editorial Masthead: the Reviewers note', pn.getByText('Reviewers who completed a review in the previous calendar year'));
            });
            // a role ticked for the masthead before the tab was ever saved (OJS/OMP Copyeditor, OPS Author)
            const late1 = isOps ? 'Author' : 'Copyeditor';
            const late2 = isOps ? 'Reader' : 'Layout Editor';
            await step('m-tick-unsaved', async () => {
                const r = await setMasthead('A', late1, true, 'm04-tick1');
                const pn = await openSide('A', 'Editorial Masthead');
                const order = await mastheadOrder(pn);
                await snap(page, 'm05-after-tick1');
                fact('m-tick-unsaved', {late1, r, order});
            });
            await step('m-move-save', async () => {
                const pn = await openSide('A', 'Editorial Masthead');
                const before = await mastheadOrder(pn);
                const second = before[1];
                // the arrow whose text says "Increase position of <second>"
                await pn.locator('button').filter({hasText: `Increase position of ${second}`}).first().click();
                await sleep(500);
                const afterUp = await mastheadOrder(pn);
                const aria = await pn.ariaSnapshot().catch(() => null);
                await snap(page, 'm06-moved-unsaved');
                // the other arrow on the (now first) role: its "Decrease" text
                const save = await saveForm(pn);
                await openSide('A', 'Editorial Masthead');
                const reloaded = await mastheadOrder(panel('Editorial Masthead'));
                await vis.goto(ctxUrl(st.A.path, '/about/editorialMasthead')); await idle(vis);
                await snap(vis, 'm07-public-masthead-after');
                const pubM = await readList(vis);
                await vis.goto(ctxUrl(st.A.path, '/about/editorialHistory')); await idle(vis);
                await snap(vis, 'm08-public-history-after');
                const pubH = await readList(vis);
                fact('m-move-save', {before, second, afterUp, aria, save, reloaded, pubM, pubH});
            });
            await step('m-tick-after-save', async () => {
                const r = await setMasthead('A', late2, true, 'm09-tick2');
                const pn = await openSide('A', 'Editorial Masthead');
                const order = await mastheadOrder(pn);
                await snap(page, 'm10-after-tick2');
                // unticked again: does it leave the list?
                const r2 = await setMasthead('A', late2, false, 'm11-untick2');
                const pn2 = await openSide('A', 'Editorial Masthead');
                const order2 = await mastheadOrder(pn2);
                fact('m-tick-after-save', {late2, r, order, r2, order2});
            });
            await step('m-down-and-leave', async () => {
                // the down arrow of the first role, unsaved, then a reload
                const pn = await openSide('A', 'Editorial Masthead');
                const before = await mastheadOrder(pn);
                await pn.locator('button').filter({hasText: `Decrease position of ${before[0]}`}).first().click();
                await sleep(400);
                const afterDown = await mastheadOrder(pn);
                // side-tab switch and back
                await page.locator('#advanced-button').first().click(); await idle(page); await sleep(400);
                await page.locator('#appearance-masthead-button').first().click(); await idle(page); await sleep(400);
                const afterSwitch = await mastheadOrder(panel('Editorial Masthead'));
                const n0 = dialogs.length;
                await page.reload(); await idle(page);
                await page.locator('#appearance-button').first().click(); await idle(page);
                await page.locator('#appearance-masthead-button').first().click(); await idle(page); await sleep(500);
                const afterReload = await mastheadOrder(panel('Editorial Masthead'));
                fact('m-down-and-leave', {before, afterDown, afterSwitch, afterReload, dialogs: dialogs.slice(n0)});
            });
            await step('m-tick-prod', async () => {
                // on D, whose masthead tab was never saved: a manager-level role ticked
                const role = isOps ? 'Author' : 'Production editor';
                await asMgr('D');
                const pn0 = await openSide('D', 'Editorial Masthead');
                const before = await mastheadOrder(pn0);
                const r = await setMasthead('D', role, true, 'm12-tick-prod');
                const pn = await openSide('D', 'Editorial Masthead');
                const order = await mastheadOrder(pn);
                await snap(page, 'm13-after-tick-prod');
                await vis.goto(ctxUrl(st.D.path, '/about/editorialMasthead')); await idle(vis);
                const pubM = await readList(vis);
                const r2 = await setMasthead('D', role, false, 'm14-untick-prod');
                fact('m-tick-prod', {role, before, r, order, pubM, r2});
                await asMgr('A');
            });
            await step('m-role-defaults', async () => {
                // Settings 24: "Consider role in masthead list" as a new context has it (L, whose roles were never edited)
                await asMgr('L');
                const roles = isOjs ? ['Journal editor', 'Section editor', 'Editorial Board Member', 'Reviewer', 'Production editor', 'Copyeditor']
                    : isOmp ? ['Press editor', 'Series editor', 'Editorial Board Member', 'External Reviewer', 'Internal Reviewer', 'Production editor', 'Copyeditor']
                        : ['Moderator', 'Editorial Board Member', 'Author', 'Reader'];
                const out = {};
                for (const r of roles) {
                    try {
                        const form = await openRoleForm('L', r);
                        const box = form.getByRole('checkbox', {name: 'Consider role in masthead list'});
                        out[r] = (await box.count()) ? {checked: await box.isChecked(), enabled: await box.isEnabled()} : 'no box';
                    } catch (e) { out[r] = `error ${String(e.message).slice(0, 80)}`; }
                }
                await snap(page, 'm16-role-defaults-last');
                fact('m-role-defaults', out);
                await asMgr('A');
            });
            await step('m-drag', async () => {
                const pn = await openSide('A', 'Editorial Masthead');
                const before = await mastheadOrder(pn);
                // the arrows' own attributes, for the screen-reader names (A3)
                const attrs = await pn.locator('button').evaluateAll((bs) => bs.slice(0, 2).map((b) => ({html: b.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>').replace(/\s+/g, ' ').slice(0, 400)})));
                // the roles list's rows only: the two boxes above and below are rows of the same class
                const rows = pn.locator('fieldset.pkpFormField--options').filter({has: page.locator('[id^="appearanceMasthead-mastheadUserGroupIds"]')}).locator('.pkpFormField--options__option');
                const rowHtml = await rows.first().evaluate((e) => e.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>').replace(/\s+/g, ' ').slice(0, 900)).catch(() => null);
                const handles = await rows.locator('.orderer__dragDrop').count();
                const boxesInList = await rows.locator('input[type="checkbox"]').count();
                // drag the last role's handle to the top of the list
                const n = await rows.count();
                let dragged = null;
                if (n >= 2) {
                    await rows.nth(n - 1).locator('.orderer__dragDrop').dragTo(rows.nth(0), {targetPosition: {x: 30, y: 3}}).catch(() => {});
                    await sleep(600);
                    dragged = await mastheadOrder(pn);
                }
                await snap(page, 'm15-after-drag');
                fact('m-drag', {before, attrs, rowHtml, rows: n, handles, boxesInList, dragged});
                await page.reload(); await idle(page);
            });
            await step('m-sidebar-names', async () => {
                const pn = await openSide('A', 'Setup');
                const f = pn.locator('fieldset.pkpFormField--optionsOrderable').first();
                const aria = await f.ariaSnapshot().catch(() => null);
                fact('m-sidebar-names', {aria: aria && aria.slice(0, 3000)});
            });
        }

        // ======================= enroll / mfr (s29: pkp-lib#13370, the two masthead boxes) =====
        if (on('enroll') || on('mfr')) {
            const LAST = new Date().getFullYear() - 1;
            if (!st.E) {
                const tE = `${st.t}e`;
                const uE = (key, roles, given, family, extra = {}) => ({username: `${tE}${key}`, roles, givenName: given, familyName: family, ...extra});
                const usersE = [uE('mgr', ['manager'], 'Elsa', 'Manager'), uE('au', ['author'], 'Aldo', 'Author')];
                if (!isOps) usersE.push(uE('ed', ['editor'], 'Ezra', 'Editor'), uE('rv', ['externalReviewer'], 'Rhea', 'Reviewer'));
                usersE.push(uE('se', ['sectionEditor'], 'Seth', 'Sectioneditor'), uE('eb', ['editorialBoardMember'], 'Emma', 'Boardmember'));
                usersE.push(uE('px', ['reader'], 'Petra', 'Pastmember', {pastRoles: [{role: 'sectionEditor'}]}));
                const resE = await app.api.createContext({tag: tE, context: {name: `U10 K4 E ${tE}`, acronym: 'K4E', country: 'CA', primaryLocale: 'en', supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']}, users: usersE});
                let rev = null;
                if (!isOps) {
                    rev = await app.api.createSubmission({tag: `${tE}x`, context: tE, submitter: `${tE}au`, title: `K4 reviewed item ${tE}`, decisions: ['sendExternalReview'],
                        reviewRounds: [{reviewers: [{username: `${tE}rv`, status: 'completed', dateCompleted: `${LAST}-05-10`}]}]}).catch((e) => ({error: String(e.message).slice(0, 300)}));
                }
                st.E = {path: tE, mgr: `${tE}mgr`, ed: isOps ? null : `${tE}ed`, se: `${tE}se`, contextId: resE && resE.contextId, rev: rev && (rev.submissionId || rev.error)};
                saveState();
                fact('seed-E', st.E);
            }
            const E = st.E;
            const enrollBox = (pn) => pn.locator('input[name="enableEnrollmentMasthead"]');
            const revBox = (pn) => pn.locator('input[name="enableEnrollmentMastheadReviewers"]');
            const rolesField = (pn) => pn.locator('fieldset.pkpFormField--options').filter({has: page.locator('[id^="appearanceMasthead-mastheadUserGroupIds"]')});
            const tabState = async (pn) => ({
                enroll: await enrollBox(pn).count() ? await enrollBox(pn).isChecked() : 'absent',
                enrollVisible: await enrollBox(pn).isVisible().catch(() => false),
                reviewers: await revBox(pn).count() ? await revBox(pn).isChecked() : 'absent',
                reviewersVisible: await revBox(pn).isVisible().catch(() => false),
                rolesVisible: await rolesField(pn).isVisible().catch(() => false),
                order: await mastheadOrder(pn),
                fieldLabels: await pn.locator('fieldset.pkpFormField').evaluateAll((fs) => fs.filter((f) => f.getClientRects().length).map((f) => (f.querySelector('legend') || {}).innerText || '').map((x) => x.replace(/\s+/g, ' ').trim())),
                text: flat(await pn.innerText().catch(() => ''), 1500),
            });
            const pubRead = async (name, p = vis, pth = '/about/editorialMasthead') => {
                const chain = [];
                const onResp = (r) => { if (r.request().isNavigationRequest() && r.frame() === p.mainFrame()) chain.push({status: r.status(), url: r.url().replace(/^https?:\/\/[^/]+/, '')}); };
                p.on('response', onResp);
                await p.goto(ctxUrl(E.path, pth)); await idle(p);
                p.off('response', onResp);
                const s = await snap(p, name);
                const main = await p.evaluate(() => {
                    const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
                    const root = document.querySelector('.page_masthead') || document.querySelector('.pkp_structure_main') || document.body;
                    return {h1: [...root.querySelectorAll('h1')].map(txt), h2: [...root.querySelectorAll('h2')].map(txt), text: txt(root).slice(0, 1500),
                        links: [...root.querySelectorAll('a')].map((a) => ({text: txt(a), href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')})).slice(0, 20),
                        about: [...document.querySelectorAll('.pkp_navigation_primary a, nav a')].map((a) => txt(a)).filter(Boolean).slice(0, 30)};
                });
                return {url: p.url().replace(/^https?:\/\/[^/]+/, ''), title: s && s.title, chain, ...main, list: await readList(p)};
            };
            const openE = async (locale = 'en') => {
                await page.goto(ctxUrl(E.path, '/management/settings/website', locale));
                await idle(page);
                await page.locator('#appearance-button').first().click();
                await idle(page); await sleep(400);
                await page.locator('#appearance-masthead-button').first().click();
                await idle(page); await sleep(700);
                return panel('Editorial Masthead');
            };

            if (on('enroll')) {
                await signIn(page, E.mgr, {contextPath: E.path}); await idle(page);
                // the Editorial History text the disabled masthead page prints (Settings › Journal › Masthead)
                await step('e-histtext', async () => {
                    await page.goto(ctxUrl(E.path, '/management/settings/context')); await idle(page);
                    await page.locator('#masthead-button').first().click().catch(() => {}); await idle(page);
                    const ta = page.locator('textarea[id^="masthead-editorialHistory-control"]').first();
                    const id = await ta.getAttribute('id');
                    await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T});
                    await page.frameLocator(`[id="${id}_ifr"]`).locator('body').click();
                    await page.keyboard.type('K4 history: founded in 2001.');
                    await sleep(300);
                    const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                    await page.locator('form').filter({has: ta}).first().getByRole('button', {name: 'Save', exact: true}).click();
                    const r = await w;
                    const saved = await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
                    await snap(page, 'e00-history-text-saved');
                    fact('e-histtext', {status: r ? r.status() : null, saved});
                });
                await step('e-fresh', async () => {
                    const pn = await openE();
                    await snap(page, 'e01-tab-fresh');
                    const d = await formDump(pn);
                    const tabs = (await page.getByRole('tab').allInnerTexts().catch(() => [])).map((x) => flat(x, 60));
                    const rows = rolesField(pn).locator('.pkpFormField--options__option');
                    const rowInfo = {rows: await rows.count(), handles: await rows.locator('.orderer__dragDrop').count(), up: await rows.locator('button.orderer__up').count(), down: await rows.locator('button.orderer__down').count(), boxes: await rows.locator('input').count()};
                    const order = await mastheadOrder(pn);
                    const aria = await pn.ariaSnapshot().catch(() => null);
                    await loc(page, 'Editorial Masthead: "Present a masthead based on user enrollments"', pn.getByRole('checkbox', {name: 'Present a masthead based on user enrollments'}));
                    await loc(page, 'Editorial Masthead: "Enable listing of reviewers on the masthead"', pn.getByRole('checkbox', {name: 'Enable listing of reviewers on the masthead'}));
                    await loc(page, 'Editorial Masthead: the roles list rows', rows);
                    await loc(page, 'Editorial Masthead: a row\'s drag handle', rows.locator('.orderer__dragDrop'));
                    const pub = await pubRead('e02-pub-masthead-fresh');
                    fact('e-fresh', {state: await tabState(pn), tabs, fields: d.fields.map((f) => ({label: f.label, description: f.description, inputs: f.inputs.map((i) => ({type: i.type, name: i.name, checked: i.checked, label: i.label}))})), rowInfo, order, aria, pub});
                });
                if (!isOps) await step('e-reviewers', async () => {
                    let pn = await openE();
                    await revBox(pn).check();
                    const unsaved = await tabState(pn);
                    const save = await saveForm(pn);
                    const samePage = await tabState(pn);
                    await snap(page, 'e03-reviewers-on-saved');
                    pn = await openE();
                    const reloaded = await tabState(pn);
                    const pubOn = await pubRead('e04-pub-reviewers-on');
                    await revBox(pn).uncheck();
                    const save2 = await saveForm(pn);
                    const samePage2 = await tabState(pn);
                    pn = await openE();
                    const reloaded2 = await tabState(pn);
                    await snap(page, 'e05-reviewers-off-reloaded');
                    const pubOff = await pubRead('e06-pub-reviewers-off');
                    fact('e-reviewers', {unsaved, save, samePage, reloaded, pubOn, save2, samePage2, reloaded2, pubOff});
                });
                await step('e-enroll-unsaved', async () => {
                    let pn = await openE();
                    await enrollBox(pn).uncheck();
                    await sleep(300);
                    const unsaved = await tabState(pn);
                    await snap(page, 'e07-enroll-off-unsaved');
                    await page.locator('#advanced-button').first().click(); await idle(page); await sleep(400);
                    await page.locator('#appearance-masthead-button').first().click(); await idle(page); await sleep(400);
                    const afterSwitch = await tabState(panel('Editorial Masthead'));
                    const n0 = dialogs.length;
                    await page.reload(); await idle(page);
                    await page.locator('#appearance-button').first().click(); await idle(page);
                    await page.locator('#appearance-masthead-button').first().click(); await idle(page); await sleep(500);
                    const afterReload = await tabState(panel('Editorial Masthead'));
                    await snap(page, 'e08-enroll-after-leave');
                    fact('e-enroll-unsaved', {unsaved, afterSwitch, afterReload, dialogs: dialogs.slice(n0)});
                });
                await step('e-enroll-off', async () => {
                    let pn = await openE();
                    await enrollBox(pn).uncheck();
                    const save = await saveForm(pn);
                    const samePage = await tabState(pn);
                    await snap(page, 'e09-enroll-off-saved');
                    pn = await openE();
                    const reloaded = await tabState(pn);
                    await snap(page, 'e10-enroll-off-reloaded');
                    const pubM = await pubRead('e11-pub-masthead-off');
                    const pubH = await pubRead('e12-pub-history-off', vis, '/about/editorialHistory');
                    const pubAbout = await pubRead('e13-pub-about-off', vis, '/about');
                    const mgrM = await pubRead('e14-mgr-masthead-off', page);
                    // the manager's "Edit" link on the disabled page: where it lands
                    let edit = null;
                    const el = page.locator('.page_masthead a').filter({hasText: 'Edit'}).first();
                    if (await el.count()) {
                        await el.click(); await idle(page); await sleep(800);
                        const selTab = await page.locator('[role="tab"][aria-selected="true"]').allInnerTexts().catch(() => []);
                        const histBox = await page.locator('textarea[id^="masthead-editorialHistory-control"]').first().isVisible().catch(() => false);
                        await snap(page, 'e14b-mgr-edit-link-landed');
                        edit = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), selectedTabs: selTab.map((x) => flat(x, 60)), historyBoxVisible: histBox};
                    }
                    fact('e-enroll-off', {save, samePage, reloaded, pubM, pubH, pubAbout: {about: pubAbout.about, links: pubAbout.links}, mgrM: {h1: mgrM.h1, links: mgrM.links, text: mgrM.text}, edit});
                });
                await step('e-move-while-off', async () => {
                    // the box ticked (unsaved) shows the list; a role moved; the box unticked again; Save
                    let pn = await openE();
                    await enrollBox(pn).check(); await sleep(300);
                    const shown = await tabState(pn);
                    const second = shown.order[1];
                    if (second) await pn.locator('button').filter({hasText: `Increase position of ${second}`}).first().click();
                    await sleep(400);
                    const moved = await tabState(pn);
                    await enrollBox(pn).uncheck(); await sleep(300);
                    const save = await saveForm(pn);
                    pn = await openE();
                    await enrollBox(pn).check(); await sleep(300);
                    const reopened = await tabState(pn);
                    await snap(page, 'e15-move-while-off-reopened');
                    fact('e-move-while-off', {shown, second, moved, save, reopened});
                });
                await step('e-enroll-on', async () => {
                    let pn = await openE();
                    await enrollBox(pn).check(); await sleep(300);
                    const save = await saveForm(pn);
                    const samePage = await tabState(pn);
                    pn = await openE();
                    const reloaded = await tabState(pn);
                    await snap(page, 'e16-enroll-on-reloaded');
                    const pubM = await pubRead('e17-pub-masthead-on');
                    const pubH = await pubRead('e18-pub-history-on', vis, '/about/editorialHistory');
                    fact('e-enroll-on', {save, samePage, reloaded, pubM, pubH});
                });
                if (E.ed) await step('e-editor', async () => {
                    await signIn(page, E.ed, {contextPath: E.path}); await idle(page);
                    let pn = await openE();
                    const before = await tabState(pn);
                    await snap(page, 'e19-editor-tab');
                    await revBox(pn).check();
                    const save = await saveForm(pn);
                    pn = await openE();
                    const reloaded = await tabState(pn);
                    await revBox(pn).uncheck();
                    const save2 = await saveForm(pn);
                    fact('e-editor', {before: {enroll: before.enroll, reviewers: before.reviewers, order: before.order}, save, reloaded: {reviewers: reloaded.reviewers}, save2});
                });
                await step('e-se-typed', async () => {
                    await signIn(page, E.se, {contextPath: E.path}); await idle(page);
                    const r = await page.goto(ctxUrl(E.path, '/management/settings/website')).catch(() => null);
                    await idle(page);
                    const s = await snap(page, 'e20-sectioneditor-typed');
                    fact('e-se-typed', {status: r && r.status(), url: page.url().replace(/^https?:\/\/[^/]+/, ''), title: s && s.title, text: flat(s && s.text && (s.text.main || s.text.body || JSON.stringify(s.text)), 300), mastheadTab: await page.locator('#appearance-masthead-button').count()});
                });
                await step('e-pubmode', async () => {
                    await signIn(page, E.mgr, {contextPath: E.path}); await idle(page);
                    await page.goto(ctxUrl(E.path, '/management/settings/distribution')); await idle(page);
                    const tabs = (await page.getByRole('tab').allInnerTexts().catch(() => [])).map((x) => flat(x, 60));
                    await page.getByRole('tab', {name: 'Access', exact: true}).click().catch(() => {}); await idle(page); await sleep(500);
                    const radios = page.locator('input[name="publishingMode"]');
                    const modes = await radios.evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked, label: (e.closest('label') || e.parentElement).innerText.replace(/\s+/g, ' ').trim()})));
                    const legends = await page.locator('[role="tabpanel"]:visible fieldset legend, [role="tabpanel"]:visible .pkpFormFieldLabel').allInnerTexts().catch(() => []);
                    await snap(page, 'e21-access-tab');
                    fact('e-pubmode', {tabs, modes, legends: legends.map((x) => flat(x, 80))});
                });
            }
            if (on('mfr')) {
                await signIn(page, E.mgr, {contextPath: E.path}); await idle(page);
                await step('f-entete', async () => {
                    let pn = await openE('fr_CA');
                    const tabLabel = flat(await page.locator('#appearance-masthead-button').first().innerText().catch(() => ''), 80);
                    const d = await formDump(pn);
                    const arrows = await pn.locator('button').evaluateAll((bs) => bs.slice(0, 4).map((b) => b.innerText.replace(/\s+/g, ' ').trim()));
                    const state = await tabState(pn);
                    await snap(page, 'f01-entete-fr');
                    // the box unticked (unsaved): what the French tab keeps
                    await enrollBox(pn).uncheck(); await sleep(300);
                    const off = await tabState(pn);
                    await snap(page, 'f02-entete-fr-box-off-unsaved');
                    await page.reload(); await idle(page);
                    fact('f-entete', {tabLabel, fields: d.fields.map((f) => ({label: f.label, description: f.description, inputs: f.inputs.map((i) => ({type: i.type, name: i.name, checked: i.checked, label: i.label}))})), arrows, order: state.order, off: {rolesVisible: off.rolesVisible, reviewersVisible: off.reviewersVisible}});
                });
            }
            await signIn(page, st.A.mgr, {contextPath: st.A.path}).catch(() => {});
        }

        // ======================= advanced (td28, td29, A5, Rules 26–27, Settings 16–19) ==
        if (on('advanced')) {
            await asMgr('A');
            await step('a-baseline', async () => {
                await vis.goto(ctxUrl(st.A.path)); await idle(vis);
                const home = await headStyles(vis);
                await snap(vis, 'a01-home-baseline');
                await page.goto(ctxUrl(st.A.path, '/dashboard/editorial')); await idle(page);
                const dash = await headStyles(page);
                fact('a-baseline', {home, dash});
            });
            await step('a-toolbars', async () => {
                const pn = await openSide('A', 'Advanced');
                await page.waitForFunction(() => window.tinymce && window.tinymce.get('appearanceAdvanced-additionalHomeContent-control-en'), null, {timeout: T}).catch(() => {});
                await sleep(800);
                const tb = async (pnl) => pnl.locator('.tox-toolbar button, .tox-toolbar__primary button, .tox-tbtn').evaluateAll((bs) => [...new Set(bs.filter((b) => b.getClientRects().length).map((b) => b.getAttribute('aria-label') || b.title || b.innerText.trim()))]);
                const adv = await tb(pn);
                const pn2 = await openSide('A', 'Setup');
                await sleep(1000);
                const setupTb = await tb(pn2);
                fact('a-toolbars', {advanced: adv, setup: setupTb});
            });
            await step('a-style-upload', async () => {
                const pn = await openSide('A', 'Advanced');
                const up = await upload(pn, 'appearanceAdvanced-styleSheet-hiddenFileId', FILES.css);
                const boxUnsaved = await boxState(pn, 'appearanceAdvanced-styleSheet-control');
                const save = await saveForm(pn);
                const pnR = await openSide('A', 'Advanced');
                const boxSaved = await boxState(pnR, 'appearanceAdvanced-styleSheet-control');
                await snap(page, 'a02-style-saved');
                await loc(page, 'Advanced: the style sheet file link', boxOf(pnR, 'appearanceAdvanced-styleSheet-control').locator('a'));
                await vis.goto(ctxUrl(st.A.path)); await idle(vis);
                const home = await headStyles(vis);
                await snap(vis, 'a03-home-styled');
                await vis.goto(pubItemUrl('A', st.A.sub)); await idle(vis);
                const item = await headStyles(vis);
                await page.goto(ctxUrl(st.A.path, '/dashboard/editorial')); await idle(page);
                const dash = await headStyles(page);
                await snap(page, 'a04-dashboard-styled');
                await openSide('A', 'Advanced');
                const settings = await headStyles(page);
                const link = (boxSaved.links || [])[0];
                const file = link ? await openFile(vis, link.href) : null;
                st.A.cssHref = link && link.href; saveState();
                fact('a-style-upload', {up, boxUnsaved, save, boxSaved, home, item, dash: {sheets: dash.sheets, heads: dash.heads}, settingsSheets: settings.sheets, file});
            });
            await step('a-style-remove', async () => {
                const pn = await openSide('A', 'Advanced');
                await boxOf(pn, 'appearanceAdvanced-styleSheet-control').getByRole('button', {name: 'Remove', exact: true}).first().click();
                await sleep(600);
                const boxRemoved = await boxState(pn, 'appearanceAdvanced-styleSheet-control');
                const save = await saveForm(pn);
                await snap(page, 'a05-style-removed-saved');
                const pnR = await openSide('A', 'Advanced');
                const boxAfter = await boxState(pnR, 'appearanceAdvanced-styleSheet-control');
                await vis.goto(ctxUrl(st.A.path)); await idle(vis);
                const home = await headStyles(vis);
                await snap(vis, 'a06-home-after-remove');
                const file = st.A.cssHref ? await openFile(vis, st.A.cssHref) : null;
                const fileBare = st.A.cssHref ? await openFile(vis, st.A.cssHref.replace(/\?.*$/, '')) : null;
                fact('a-style-remove', {boxRemoved, save, boxAfter, home, file, fileBare});
            });
            await step('a-favicon', async () => {
                // none: the home page's icon links
                await vis.goto(ctxUrl(st.A.path)); await idle(vis);
                const none = (await headStyles(vis)).icons;
                const pn = await openSide('A', 'Advanced');
                // a .jpg dropped on the box
                const jpg = await dropOn(pn, 'appearanceAdvanced-favicon-dropzone-en', FILES.jpg);
                const jpgBox = await boxState(pn, 'appearanceAdvanced-favicon-control-en');
                await snap(page, 'a07-favicon-jpg-refused');
                const pn2 = await openSide('A', 'Advanced');
                const up = await upload(pn2, 'appearanceAdvanced-favicon-hiddenFileId-en', FILES.fav);
                const box = await boxState(pn2, 'appearanceAdvanced-favicon-control-en');
                const save = await saveForm(pn2);
                await snap(page, 'a08-favicon-saved');
                await vis.goto(ctxUrl(st.A.path)); await idle(vis);
                const home = (await headStyles(vis)).icons;
                await vis.goto(pubItemUrl('A', st.A.sub)); await idle(vis);
                const item = (await headStyles(vis)).icons;
                await vis.goto(ctxUrl(st.A.path, '', 'fr_CA')); await idle(vis);
                const homeFr = (await headStyles(vis)).icons;
                await page.goto(ctxUrl(st.A.path, '/dashboard/editorial')); await idle(page);
                const dash = (await headStyles(page)).icons;
                await openSide('A', 'Lists');
                const settings = (await headStyles(page)).icons;
                const favFile = home[0] ? await openFile(vis, home[0].href) : null;
                st.A.favHref = home[0] && home[0].href; saveState();
                fact('a-favicon', {none, jpg, jpgBox, up, box, save, home, item, homeFr, dash, settings, favFile});
            });
            await step('a-favicon-fr', async () => {
                const pn = await openSide('A', 'Advanced');
                await pn.locator('.pkpFormLocales button').filter({hasText: 'French'}).first().click(); await sleep(500);
                await upload(pn, 'appearanceAdvanced-favicon-hiddenFileId-fr_CA', FILES.favFr);
                const save = await saveForm(pn);
                await vis.goto(ctxUrl(st.A.path, '', 'fr_CA')); await idle(vis);
                const homeFr = (await headStyles(vis)).icons;
                await vis.goto(ctxUrl(st.A.path, '', 'en')); await idle(vis);
                const homeEn = (await headStyles(vis)).icons;
                fact('a-favicon-fr', {save, homeFr, homeEn});
            });
            await step('a-favicon-remove', async () => {
                const pn = await openSide('A', 'Advanced');
                await boxOf(pn, 'appearanceAdvanced-favicon-control-en').getByRole('button', {name: 'Remove', exact: true}).first().click();
                await sleep(500);
                const save = await saveForm(pn);
                await vis.goto(ctxUrl(st.A.path, '', 'en')); await idle(vis);
                const homeEn = (await headStyles(vis)).icons;
                const old = st.A.favHref ? await openFile(vis, st.A.favHref) : null;
                fact('a-favicon-remove', {save, homeEn, old: old && {status: old.status, type: old.type}});
            });
            if (isOmp) await step('a-covers', async () => {
                const out = {};
                for (const [w, h] of [['0', '100'], ['abc', '100'], ['', '100'], ['1', '1'], ['5000', '5000'], ['106', '100']]) {
                    const pn = await openSide('A', 'Advanced');
                    await pn.locator('input[name="coverThumbnailsMaxWidth"]').fill(w);
                    await pn.locator('input[name="coverThumbnailsMaxHeight"]').fill(h);
                    const r = await saveForm(pn);
                    out[`${w}x${h}`] = r;
                    if (w === '0') await snap(page, 'a09-covers-zero');
                }
                fact('a-covers', out);
            });
        }

        // ======================= lists (td6, td31, td32, Rules 29–30, Settings 20–21) ==
        if (on('lists')) {
            await asMgr('L');
            await step('l-validation', async () => {
                const out = {};
                for (const [field, val] of [['itemsPerPage', ''], ['itemsPerPage', '0'], ['itemsPerPage', 'abc'], ['itemsPerPage', '2.5'], ['itemsPerPage', '-1'], ['numPageLinks', '0'], ['numPageLinks', ''], ['itemsPerPage', ' 7 ']]) {
                    const pn = await openSide('L', 'Lists');
                    await pn.locator(`input[name="${field}"]`).fill(val);
                    const r = await saveForm(pn).catch((e) => ({err: String(e.message).slice(0, 200)}));
                    const saveDisabled = await pn.getByRole('button', {name: 'Save', exact: true}).isDisabled().catch(() => null);
                    const k = `${field}=${JSON.stringify(val)}`;
                    out[k] = {...r, saveDisabled};
                    await snap(page, `l01-${field}-${val.trim() || 'empty'}`.replace(/[^a-z0-9-]/gi, '_'));
                }
                const pn = await openSide('L', 'Lists');
                out.after = {ipp: await pn.locator('input[name="itemsPerPage"]').inputValue(), npl: await pn.locator('input[name="numPageLinks"]').inputValue()};
                fact('l-validation', out);
            });
            await step('l-big', async () => {
                const pn = await openSide('L', 'Lists');
                await pn.locator('input[name="itemsPerPage"]').fill('100000');
                await pn.locator('input[name="numPageLinks"]').fill('100000');
                const r = await saveForm(pn);
                const pnR = await openSide('L', 'Lists');
                const back = {ipp: await pnR.locator('input[name="itemsPerPage"]').inputValue(), npl: await pnR.locator('input[name="numPageLinks"]').inputValue()};
                await vis.goto(ctxUrl(st.L.path, '/search/search?query=Zephyr')); await idle(vis);
                const search = await vis.locator('.cmp_article_list > li, .search_results > li, ul.cmp_article_list li, .obj_article_summary, .obj_monograph_summary, .obj_preprint_summary').count();
                fact('l-big', {r, back, searchCount: search});
            });
            await step('l-leave', async () => {
                const pn = await openSide('L', 'Lists');
                await pn.locator('input[name="itemsPerPage"]').fill('7');
                await page.locator('#dateTime-button').first().click(); await idle(page); await sleep(400);
                await page.locator('#lists-button').first().click(); await idle(page); await sleep(400);
                const afterSwitch = await panel('Lists').locator('input[name="itemsPerPage"]').inputValue();
                await page.locator('#appearance-button').first().click(); await idle(page); await sleep(400);
                await page.locator('#setup-button').first().click(); await idle(page); await sleep(400);
                await page.locator('#lists-button').first().click(); await idle(page); await sleep(400);
                const afterTop = await panel('Lists').locator('input[name="itemsPerPage"]').inputValue();
                const n0 = dialogs.length;
                await page.reload(); await idle(page);
                await page.locator('#setup-button').first().click(); await idle(page);
                await page.locator('#lists-button').first().click(); await idle(page); await sleep(400);
                const afterReload = await panel('Lists').locator('input[name="itemsPerPage"]').inputValue();
                fact('l-leave', {afterSwitch, afterTop, afterReload, dialogs: dialogs.slice(n0)});
            });
        }

        // ======================= paging (td31, td32; both ends 25 and 1) =================
        if (on('paging')) {
            await asMgr('L');
            const readPaging = async (p) => p.evaluate(() => {
                const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
                const items = document.querySelectorAll('.obj_article_summary, .obj_monograph_summary, .obj_preprint_summary, .obj_issue_summary, .search_results > li').length;
                const pag = [...document.querySelectorAll('.cmp_pagination, .pkp_pagination, nav[aria-label*="agination"], .pagination, [class*="page_links"], [class*="pagination"]')].filter((n, i, all) => !all.some((o) => o !== n && o.contains(n))).map((n) => ({cls: n.className, text: txt(n), links: [...n.querySelectorAll('a')].map((a) => ({text: txt(a), href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')}))}));
                const current = [...document.querySelectorAll('.cmp_pagination .current, [aria-current="page"], .pkp_pagination strong')].map(txt);
                const counter = [...document.querySelectorAll('div, nav, p')].filter((n) => /^\d+ - \d+ of \d+ items/.test(txt(n) || '') && ![...n.children].some((c) => /^\d+ - \d+ of \d+ items/.test(txt(c) || ''))).map((n) => ({cls: n.className, text: txt(n)}));
                return {items, pag, current, counter, titles: [...document.querySelectorAll('.obj_article_summary .title, .obj_monograph_summary .title, .obj_preprint_summary .title, .obj_issue_summary .title')].map(txt).slice(0, 30)};
            });
            const lists = isOjs ? [['home', ''], ['search', '/search/search?query=Zephyr']]
                : isOmp ? [['home', ''], ['catalog', '/catalog'], ['search', '/search/search?query=Zephyr']]
                    : [['home', ''], ['preprints', '/preprints'], ['search', '/search/search?query=Zephyr']];
            const readAll = async (label) => {
                const out = {};
                for (const [k, pth] of lists) {
                    await vis.goto(ctxUrl(st.L.path, pth)); await idle(vis);
                    out[k] = await readPaging(vis);
                    await snap(vis, `p-${label}-${k}`);
                }
                return out;
            };
            const setLists = async (ipp, npl) => {
                const pn = await openSide('L', 'Lists');
                await pn.locator('input[name="itemsPerPage"]').fill(String(ipp));
                await pn.locator('input[name="numPageLinks"]').fill(String(npl));
                return saveForm(pn);
            };
            const usersRows = async (label) => {
                await page.goto(ctxUrl(st.L.path, '/management/settings/access')); await idle(page); await sleep(800);
                const s = await snap(page, `p-${label}-users`);
                const t = page.getByRole('table', {name: /Current Users/}).first();
                const rows = await t.locator('tbody tr').count().catch(() => null);
                const cap = flat(await t.locator('caption').innerText().catch(() => ''), 100);
                const pag = flat(await page.locator('nav[aria-label*="agination"], .pkpPagination, [class*="agination"]').allInnerTexts().then((a) => a.join(' | ')).catch(() => ''), 300);
                const ippSelect = flat(await page.getByText('Items per page').allInnerTexts().then((a) => a.join(' | ')).catch(() => ''), 200);
                const selects = await page.locator('select').evaluateAll((els) => els.map((e) => ({name: e.name, id: e.id, value: e.value, options: [...e.options].map((o) => o.textContent.trim())})));
                // the list's own "Items per page" select: another number, then the context's number again
                const sel = page.locator('select:visible').filter({hasText: '100'}).last();
                const selSteps = [];
                if (await sel.count()) {
                    const opts = await sel.evaluate((e) => [...e.options].map((o) => o.value));
                    for (const v of [opts.includes('10') ? '10' : opts[0], opts[0]]) {
                        const w = page.waitForResponse((r) => /\/api\/v1\/users\?/.test(r.url()), {timeout: 8000}).catch(() => null);
                        await sel.selectOption(v);
                        const r = await w; await idle(page); await sleep(500);
                        selSteps.push({picked: v, request: r ? r.url().replace(/^.*api\/v1/, '') : null, rows: await page.getByRole('table', {name: /Current Users/}).first().locator('tbody tr').count().catch(() => null), showing: flat(await page.getByText(/^Showing \d+ to \d+ of \d+/).allInnerTexts().then((a) => a.join(' | ')).catch(() => ''), 100)});
                    }
                    await snap(page, `p-${label}-users-select`);
                }
                // the submissions list too
                await page.goto(ctxUrl(st.L.path, '/dashboard/editorial')); await idle(page); await sleep(1000);
                const subRows = await page.locator('table tbody tr').count().catch(() => null);
                const subPag = flat(await page.locator('nav[aria-label*="agination"], [class*="agination"]').allInnerTexts().then((a) => a.join(' | ')).catch(() => ''), 300);
                await snap(page, `p-${label}-dashboard`);
                return {rows, cap, pag, ippSelect, selects, selSteps, subRows, subPag};
            };
            await step('p-25', async () => {
                const r = await setLists(25, 10);
                fact('p-25', {save: r.saved, pages: await readAll('25'), users: await usersRows('25')});
            });
            await step('p-1-10', async () => {
                const r = await setLists(1, 10);
                const pages = await readAll('1-10');
                const users = await usersRows('1-10');
                // page 7 of the numbered lists: follow the link whose text is 7, else 5
                const deep = {};
                for (const [k, pth] of lists) {
                    await vis.goto(ctxUrl(st.L.path, pth)); await idle(vis);
                    const l7 = vis.locator('a').filter({hasText: /^\s*7\s*$/}).first();
                    if (await l7.count()) { await l7.click(); await idle(vis); deep[k] = {url: vis.url().replace(/^https?:\/\/[^/]+/, ''), ...(await readPaging(vis))}; await snap(vis, `p-1-10-${k}-page7`); } else {
                        // Next links, pressed six times
                        let n = 0;
                        for (; n < 6; n++) { const nx = vis.locator('a').filter({hasText: /Next|›|»/}).first(); if (!(await nx.count())) break; await nx.click(); await idle(vis); }
                        deep[k] = {viaNext: n, url: vis.url().replace(/^https?:\/\/[^/]+/, ''), ...(await readPaging(vis))};
                        await snap(vis, `p-1-10-${k}-page7`);
                    }
                }
                fact('p-1-10', {save: r.saved, pages, users, deep});
            });
            await step('p-1-3', async () => {
                const r = await setLists(1, 3);
                const pages = await readAll('1-3');
                const deep = {};
                for (const [k, pth] of lists) {
                    await vis.goto(ctxUrl(st.L.path, pth)); await idle(vis);
                    const first = await readPaging(vis);
                    const link = first.pag.flatMap((p) => p.links).find((l) => /^\d+$/.test(l.text) && l.text !== '1');
                    if (!link) { deep[k] = {none: true}; continue; }
                    // walk forward along the highest number offered until page 7
                    let guard = 0;
                    while (guard++ < 8) {
                        const cur = await readPaging(vis);
                        const nums = cur.pag.flatMap((p) => p.links).filter((l) => /^\d+$/.test(l.text));
                        const to7 = nums.find((l) => l.text === '7');
                        const tgt = to7 || nums.sort((a, b) => Number(b.text) - Number(a.text))[0];
                        if (!tgt) break;
                        await vis.goto(app.url(tgt.href.replace(/^.*\/index\.php/, '/index.php'))); await idle(vis);
                        if (to7) break;
                    }
                    deep[k] = {url: vis.url().replace(/^https?:\/\/[^/]+/, ''), ...(await readPaging(vis))};
                    await snap(vis, `p-1-3-${k}-page7`);
                }
                fact('p-1-3', {save: r.saved, pages, deep});
            });
            await step('p-grids', async () => {
                // an older (grid) list: Settings › Users & Roles › "Roles", at 25 and at 1; the home page at page 7 with 3 links {OJS}
                const out = {};
                for (const [ipp, npl] of [[25, 10], [1, 3]]) {
                    const r = await setLists(ipp, npl);
                    await page.goto(ctxUrl(st.L.path, '/management/settings/access')); await idle(page);
                    await page.getByRole('tab', {name: 'Roles'}).click(); await idle(page); await sleep(800);
                    const grid = page.locator('div[id^="component-grid-settings-roles-usergroupgrid"]').first();
                    const g = {saved: r.saved, rows: await grid.locator('tr.gridRow').count().catch(() => null),
                        paging: flat(await grid.locator('.gridPaging').innerText().catch(() => ''), 300),
                        select: await grid.locator('select').evaluateAll((els) => els.map((e) => ({value: e.value, options: [...e.options].map((o) => o.textContent.trim()), visible: !!e.getClientRects().length})))};
                    await snap(page, `p-roles-grid-${ipp}`);
                    if (ipp === 1) {
                        const nx = grid.locator('.gridPaging a').filter({hasText: /^\s*2\s*$|>/}).first();
                        if (await nx.count()) { await nx.click(); await idle(page); await sleep(800); g.page2 = {rows: await grid.locator('tr.gridRow').count(), first: flat(await grid.locator('tr.gridRow').first().innerText().catch(() => ''), 80), paging: flat(await grid.locator('.gridPaging').innerText().catch(() => ''), 300)}; }
                        const sel = grid.locator('select').first();
                        if (await sel.count()) { await sel.selectOption('10').catch(() => {}); await idle(page); await sleep(800); g.after10 = {rows: await grid.locator('tr.gridRow').count(), paging: flat(await grid.locator('.gridPaging').innerText().catch(() => ''), 300)}; }
                        if (isOjs) { await vis.goto(ctxUrl(st.L.path, '?publishedPublicationsPage=7')); await idle(vis); await snap(vis, 'p-1-3-home-page7'); g.home7 = flat(await vis.locator('body').innerText(), 3000).replace(/^.*Latest Publications/, '').slice(0, 200); }
                    }
                    out[`${ipp}-${npl}`] = g;
                }
                fact('p-grids', out);
            });
            await step('p-restore', async () => { fact('p-restore', await setLists(25, 10)); });
            if (isOjs && st.R) await step('p-archive', async () => {
                await asMgr('R');
                const setR = async (ipp, npl) => { const pn = await openSide('R', 'Lists'); await pn.locator('input[name="itemsPerPage"]').fill(String(ipp)); await pn.locator('input[name="numPageLinks"]').fill(String(npl)); return saveForm(pn); };
                const out = {};
                for (const [ipp, npl] of [[25, 10], [1, 10], [1, 1]]) {
                    out[`${ipp}-${npl}`] = {save: (await setR(ipp, npl)).saved};
                    await vis.goto(ctxUrl(st.R.path, '/issue/archive')); await idle(vis);
                    out[`${ipp}-${npl}`].p1 = await readPaging(vis);
                    await snap(vis, `p-archive-${ipp}-${npl}`);
                    const nx = vis.locator('.cmp_pagination a').filter({hasText: 'Next'}).first();
                    if (await nx.count()) { await nx.click(); await idle(vis); out[`${ipp}-${npl}`].p2 = {url: vis.url().replace(/^https?:\/\/[^/]+/, ''), ...(await readPaging(vis))}; }
                }
                await setR(25, 10);
                fact('p-archive', out);
                await asMgr('L');
            });
        }

        // ======================= a category's page (Rules 29–30): items placed on screen ====
        if (on('cats')) {
            if (!st.C) {
                const tC = `${st.t}c`;
                const res = await app.api.createContext({tag: tC, context: {name: `U10 K4 C ${tC}`, acronym: 'K4C'}, users: [{username: `${tC}mgr`, roles: ['manager'], givenName: 'Cleo', familyName: 'Manager'}, {username: `${tC}au`, roles: ['author'], givenName: 'Carl', familyName: 'Author'}], categories: [{path: 'k4cat', title: 'K4 Category'}]});
                const subs = [];
                for (let i = 1; i <= 3; i++) { const r = await app.api.createSubmission({tag: `${tC}s${i}`, context: tC, submitter: `${tC}au`, title: `Catitem ${i}`, published: true}); subs.push(r.submissionId); }
                st.C = {path: tC, mgr: `${tC}mgr`, contextId: res.contextId, subs};
                saveState();
            }
            await asMgr('C');
            const MENU = {ojs: 'Publication Settings', omp: 'Catalog Entry', ops: 'Preprint entry'}[app.name];
            const UNPUB = isOps ? 'Unpost' : 'Unpublish';
            const PUB = isOps ? /^(Post|Schedule For Posting)$/ : /^(Publish|Schedule For Publication)$/;
            st.C.placed = st.C.placed || [];
            for (const [i, id] of st.C.subs.entries()) {
                if (st.C.placed.includes(id)) continue;
                await step(`c-place-${i + 1}`, async () => {
                    const o = {};
                    await page.goto(ctxUrl(st.C.path, `/dashboard/editorial?workflowSubmissionId=${id}`)); await idle(page); await sleep(1500);
                    const wf = page.locator('[role="dialog"]').first();
                    // unpublish, with its confirmation
                    const unBtn = wf.getByRole('button', {name: UNPUB, exact: true}).first();
                    if (await unBtn.isVisible().catch(() => false)) {
                        await unBtn.click(); await sleep(800);
                        const conf = page.locator('[role="dialog"]').filter({hasText: /unpublish|unpost|Are you sure/i}).last();
                        o.confirm = flat(await conf.innerText().catch(() => ''), 300);
                        await conf.getByRole('button', {name: new RegExp(`^(${UNPUB}|OK|Yes)$`)}).last().click(); await idle(page); await sleep(1500);
                    }
                    // the entry form with the categories
                    await wf.getByRole('link', {name: MENU, exact: true}).first().click(); await idle(page); await sleep(1500);
                    // "Select Categories" opens a picker window
                    const selBtn = wf.getByRole('button', {name: 'Select Categories'}).first();
                    o.selectButton = await selBtn.count();
                    let form = null;
                    if (o.selectButton) {
                        form = selBtn.locator('xpath=ancestor::form[1]');
                        await selBtn.click(); await sleep(1200); await idle(page);
                        const picker = page.locator('[role="dialog"]').last();
                        o.picker = flat(await picker.innerText().catch(() => ''), 400);
                        await snap(page, `c-picker-${i + 1}`);
                        const pbox = picker.getByRole('checkbox', {name: /K4 Category/}).first();
                        if (await pbox.count()) await pbox.check(); else await picker.getByText('K4 Category').first().click();
                        await sleep(300);
                        o.pickerButtons = (await picker.getByRole('button').allInnerTexts()).map((x) => x.trim()).filter(Boolean);
                        await picker.getByRole('button', {name: /^(Select|Save|Done|Apply|OK|Confirm|Add)$/}).last().click(); await sleep(800);
                    } else {
                        const box = wf.getByRole('checkbox', {name: 'K4 Category'}).first();
                        o.box = await box.count();
                        if (!o.box) { await snap(page, `c-place-nobox-${i + 1}`); o.formText = flat(await wf.innerText(), 1200); fact(`c-place-${i + 1}`, o); return; }
                        await box.check(); await sleep(300);
                        form = box.locator('xpath=ancestor::form[1]');
                    }
                    o.selectedLine = flat(await wf.getByText(/^Selected:/).first().innerText().catch(() => ''), 200);
                    const w = page.waitForResponse((r) => /publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                    await form.getByRole('button', {name: 'Save', exact: true}).last().click();
                    const r = await w; o.saveStatus = r ? r.status() : null; await idle(page); await sleep(800);
                    // publish again
                    await wf.getByRole('button', {name: PUB}).first().click(); await sleep(1500); await idle(page);
                    // the publishing window(s): press their last publish-like button until the publish request goes
                    let r2 = null; o.windows = [];
                    for (let k = 0; k < 3 && !r2; k++) {
                        const pd = page.locator('[role="dialog"]:visible').last();
                        const btns = (await pd.getByRole('button').allInnerTexts().catch(() => [])).map((x) => x.trim()).filter(Boolean);
                        o.windows.push({text: flat(await pd.innerText().catch(() => ''), 200), buttons: btns.slice(-6)});
                        const b = pd.getByRole('button', {name: /^(Publish|Post|Schedule For Publication|Schedule For Posting|Continue|Confirm|Schedule|Next)$/}).last();
                        if (!(await b.count())) break;
                        const w2 = page.waitForResponse((x) => /\/publish/.test(x.url()) && x.request().method() !== 'GET', {timeout: 8000}).catch(() => null);
                        await b.click(); await sleep(1200);
                        r2 = await w2;
                    }
                    o.publishStatus = r2 ? r2.status() : null; await idle(page); await sleep(1000);
                    await snap(page, `c-placed-${i + 1}`);
                    if (o.publishStatus === 200) { st.C.placed.push(id); saveState(); }
                    fact(`c-place-${i + 1}`, o);
                });
            }
            await step('c-pages', async () => {
                // the category page lists from the search index: the publish's index job must have run
                fact('c-jobs', drainJobs(app));
                const catUrl = ctxUrl(st.C.path, isOps ? '/preprints/category/k4cat' : '/catalog/category/k4cat');
                const out = {};
                const setC = async (ipp, npl) => { const pn = await openSide('C', 'Lists'); await pn.locator('input[name="itemsPerPage"]').fill(String(ipp)); await pn.locator('input[name="numPageLinks"]').fill(String(npl)); return (await saveForm(pn)).saved; };
                for (const [ipp, npl] of [[25, 10], [1, 10], [1, 2]]) {
                    out[`${ipp}-${npl}`] = {saved: await setC(ipp, npl)};
                    await vis.goto(catUrl); await idle(vis);
                    const txt = flat(await vis.locator('body').innerText(), 4000);
                    out[`${ipp}-${npl}`].p1 = {items: await vis.locator('.obj_article_summary, .obj_monograph_summary, .obj_preprint_summary').count(), tail: txt.slice(Math.max(0, txt.indexOf('K4 Category')), txt.indexOf('K4 Category') + 500)};
                    await snap(vis, `c-category-${ipp}-${npl}`);
                    const two = vis.locator('a').filter({hasText: /^\s*(2|Next)\s*$/}).first();
                    if (await two.count()) { await two.click(); await idle(vis); const t2 = flat(await vis.locator('body').innerText(), 4000); out[`${ipp}-${npl}`].p2 = {url: vis.url().replace(/^https?:\/\/[^/]+/, ''), tail: t2.slice(Math.max(0, t2.indexOf('K4 Category')), t2.indexOf('K4 Category') + 500)}; await snap(vis, `c-category-${ipp}-${npl}-p2`); }
                }
                await setC(25, 10);
                fact('c-pages', out);
            });
        }

        // ======================= {OMP} cover thumbnail sizes (Settings 19), both ends =====
        if (on('covers') && isOmp) {
            if (!st.D.cover2) { const r = await app.api.createSubmission({tag: `${st.D.path}s3`, context: st.D.path, submitter: `${st.D.path}au`, title: `K4 cover item ${st.D.path}`}); st.D.cover2 = r.submissionId; saveState(); }
            await asMgr('D');
            const COVER = {name: 'k4-cover.png', mimeType: 'image/png', buffer: png(400, 300, [200, 120, 0])};
            const setSizes = async (w, h) => { const pn = await openSide('D', 'Advanced'); await pn.locator('input[name="coverThumbnailsMaxWidth"]').fill(String(w)); await pn.locator('input[name="coverThumbnailsMaxHeight"]').fill(String(h)); return (await saveForm(pn)).stored; };
            const out = {};
            for (const [book, w, h] of [[st.D.noted, 106, 100], [st.D.cover2, 50, 40]]) {
                await step(`cv-${w}x${h}`, async () => {
                    const o = {sizes: await setSizes(w, h)};
                    await page.goto(ctxUrl(st.D.path, `/dashboard/editorial?workflowSubmissionId=${book}`)); await idle(page); await sleep(1500);
                    const wf = page.locator('[role="dialog"]').first();
                    await wf.getByRole('link', {name: 'Catalog Entry', exact: true}).click(); await idle(page); await sleep(1500);
                    const wu = page.waitForResponse((r) => /temporaryFiles/.test(r.url()), {timeout: 8000}).catch(() => null);
                    await wf.locator('[id="catalogEntry-coverImage-hiddenFileId-en"]').setInputFiles(COVER);
                    o.upload = (await wu) ? 'sent' : 'none'; await sleep(1500); await idle(page);
                    const form = wf.locator('[id="catalogEntry-coverImage-control-en"]').locator('xpath=ancestor::form[1]');
                    const w1 = page.waitForResponse((r) => /publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                    await form.getByRole('button', {name: 'Save', exact: true}).last().click();
                    const r1 = await w1; o.saveStatus = r1 ? r1.status() : null; await idle(page); await sleep(800);
                    let r2 = null; o.windows = [];
                    await wf.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first().click(); await sleep(1500);
                    for (let k = 0; k < 3 && !r2; k++) {
                        const pd = page.locator('[role="dialog"]:visible').last();
                        o.windows.push(flat(await pd.innerText().catch(() => ''), 200));
                        const b = pd.getByRole('button', {name: /^(Publish|Continue|Confirm)$/}).last();
                        if (!(await b.count())) break;
                        const w2 = page.waitForResponse((x) => /\/publish/.test(x.url()) && x.request().method() !== 'GET', {timeout: 8000}).catch(() => null);
                        await b.click(); await sleep(1200); r2 = await w2;
                    }
                    o.publishStatus = r2 ? r2.status() : null;
                    await vis.goto(ctxUrl(st.D.path, `/catalog/book/${book}`)); await idle(vis);
                    o.bookImgs = await vis.locator('img').evaluateAll((els) => els.filter((i) => /cover/i.test(i.src)).map((i) => ({src: i.getAttribute('src').replace(/^https?:\/\/[^/]+/, ''), natural: [i.naturalWidth, i.naturalHeight]})));
                    await vis.goto(ctxUrl(st.D.path, '/catalog')); await idle(vis);
                    o.catalogImgs = await vis.locator('img').evaluateAll((els) => els.filter((i) => /cover/i.test(i.src)).map((i) => ({src: i.getAttribute('src').replace(/^https?:\/\/[^/]+/, ''), natural: [i.naturalWidth, i.naturalHeight], alt: i.alt})));
                    await snap(vis, `cv-catalog-${w}x${h}`);
                    out[`${w}x${h}`] = o;
                    fact(`cv-${w}x${h}`, o);
                });
            }
            await setSizes(106, 100);
        }

        // ======================= dates (td33–td35, Rules 31–33; choice back: no register entry; did not reproduce) ======================
        if (on('dates')) {
            await asMgr('D');
            const readDates = async (label) => {
                const out = {};
                const ann = (st.D.announcements || [])[0];
                const pagesV = [['home', ''], ['announcements', '/announcement'], ann ? ['announcement', `/announcement/view/${ann.id}`] : null, ['item', isOjs ? `/article/view/${st.D.pub}` : isOmp ? `/catalog/book/${st.D.pub}` : `/preprint/view/${st.D.pub}`],
                    isOjs && st.D.issues ? ['issue', `/issue/view/${st.D.issues[0].id}`] : null, isOjs ? ['archive', '/issue/archive'] : isOmp ? ['catalog', '/catalog'] : ['preprints', '/preprints']].filter(Boolean);
                for (const [k, pth] of pagesV) {
                    await vis.goto(ctxUrl(st.D.path, pth)); await idle(vis);
                    out[k] = await vis.evaluate(() => {
                        const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
                        const sel = '.date, .published, .item.published, .obj_announcement_summary .date, .obj_announcement_full .date, .item.date_published, .sub_item .value, .meta .published, .details .published, .item.date, .monograph_date, .obj_preprint_summary .meta, .obj_article_summary .meta, .obj_issue_summary .published, .item.published .value';
                        return [...new Set([...document.querySelectorAll(sel)].map(txt).filter((t) => t && /\d/.test(t)))].slice(0, 12);
                    });
                    await snap(vis, `d-${label}-${k}`);
                }
                // French visitor on the announcement
                if (ann) { await vis.goto(ctxUrl(st.D.path, `/announcement/view/${ann.id}`, 'fr_CA')); await idle(vis); out.announcementFr = await vis.locator('.date, .obj_announcement_full .date').allInnerTexts().catch(() => []); }
                return out;
            };
            const readEditorial = async (label) => {
                const out = {};
                // the Publisher Library file's "Date uploaded"
                const TAB = {ojs: 'Publisher Library', omp: 'Press Library', ops: 'Preprint Server Library'}[app.name];
                await page.goto(ctxUrl(st.D.path, '/management/settings/workflow')); await idle(page);
                await page.getByRole('tab', {name: TAB, exact: true}).click();
                const grid = page.locator('div[id^="component-grid-settings-library-libraryfileadmingrid"]').first();
                await grid.waitFor({timeout: T}); await idle(page);
                const row = grid.locator('tr.gridRow').filter({hasText: 'K4 library file'}).first();
                await row.locator('a.show_extras').first().click(); await sleep(400);
                await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Edit', exact: true}).click();
                const f = page.locator('form').filter({has: page.locator('input[name^="libraryFileName"]')}).last();
                await f.waitFor({timeout: T}); await idle(page); await sleep(500);
                out.library = flat(await f.locator('table').first().innerText().catch(() => ''), 300);
                await snap(page, `e-${label}-library`);
                // OJS/OMP: the file's note
                if (!isOps && st.D.noted) {
                    await page.goto(ctxUrl(st.D.path, `/dashboard/editorial?workflowSubmissionId=${st.D.noted}&workflowMenuKey=workflow_1`)); await idle(page); await sleep(1500);
                    const fileRow = page.locator('[role="dialog"]').getByRole('row').filter({hasText: 'article.pdf'}).first();
                    await fileRow.waitFor({timeout: T}).catch(() => {});
                    await fileRow.getByRole('button', {name: /More Actions/}).first().click().catch(() => {});
                    await page.getByRole('menuitem', {name: 'More Information'}).first().click().catch(() => {});
                    await sleep(1500); await idle(page);
                    const win = page.locator('[role="dialog"]:visible').last();
                    const ft = win.getByRole('tab', {name: 'Notes'});
                    if (await ft.count()) { await ft.click(); await idle(page); await sleep(1000); }
                    out.note = flat(await win.innerText().catch(() => ''), 600);
                    const hist = win.getByRole('tab', {name: 'History'});
                    if (await hist.count()) { await hist.click(); await idle(page); await sleep(1000); out.history = flat(await win.innerText().catch(() => ''), 600); }
                    await snap(page, `e-${label}-note`);
                }
                return out;
            };
            const dateTab = async () => openSide('D', 'Date & Time');
            const groupState = async (pn, group) => pn.locator(`input[type=radio][name="${group}"]`).evaluateAll((els) => els.map((e) => {
                const lab = e.closest('label'); return {value: e.value, checked: e.checked, label: lab ? lab.innerText.replace(/\s+/g, ' ').trim() : null};
            }));
            const pick = async (pn, group, value) => { await pn.locator(`input[type=radio][name="${group}"][value="${value}"]`).first().check(); await sleep(400); };
            await step('d-baseline', async () => {
                fact('d-baseline', {pub: await readDates('base'), ed: await readEditorial('base')});
            });
            await step('d-back', async () => {
                const pn = await dateTab();
                const o = {start: await groupState(pn, 'datetimeFormatShort-en')};
                await pick(pn, 'dateFormatShort-en', 'd-m-Y');
                o.changed = await groupState(pn, 'datetimeFormatShort-en');
                o.changedLong = await groupState(pn, 'datetimeFormatLong-en');
                await snap(page, 'd01-short-changed');
                await pick(pn, 'dateFormatShort-en', 'Y-m-d');
                o.back = await groupState(pn, 'datetimeFormatShort-en');
                await snap(page, 'd02-short-back');
                o.save = await saveForm(pn);
                const pnR = await dateTab();
                o.reloaded = await groupState(pnR, 'datetimeFormatShort-en');
                o.reloadedShort = await groupState(pnR, 'dateFormatShort-en');
                // the same with Time
                await pick(pnR, 'timeFormat-en', 'H:i');
                o.tChanged = {short: await groupState(pnR, 'datetimeFormatShort-en'), long: await groupState(pnR, 'datetimeFormatLong-en')};
                await pick(pnR, 'timeFormat-en', 'h:i A');
                o.tBack = {short: await groupState(pnR, 'datetimeFormatShort-en'), long: await groupState(pnR, 'datetimeFormatLong-en')};
                o.tSave = await saveForm(pnR);
                const pnR2 = await dateTab();
                o.tReloaded = {short: await groupState(pnR2, 'datetimeFormatShort-en'), long: await groupState(pnR2, 'datetimeFormatLong-en')};
                await snap(page, 'd03-short-back-reloaded');
                fact('d-back', o);
                o.ed = await readEditorial('after-back');
                fact('d-back-ed', o.ed);
            });
            await step('d-td33', async () => {
                const pn = await dateTab();
                await pick(pn, 'dateFormatShort-en', 'd.m.Y');
                await pick(pn, 'dateFormatLong-en', 'j F Y');
                const combined = {short: await groupState(pn, 'datetimeFormatShort-en'), long: await groupState(pn, 'datetimeFormatLong-en')};
                const save = await saveForm(pn);
                const pub = await readDates('td33');
                const ed = await readEditorial('td33');
                const pn2 = await dateTab();
                await pick(pn2, 'timeFormat-en', 'H:i');
                const combined2 = {short: await groupState(pn2, 'datetimeFormatShort-en'), long: await groupState(pn2, 'datetimeFormatLong-en')};
                const save2 = await saveForm(pn2);
                const ed2 = await readEditorial('td33-time');
                fact('d-td33', {combined, save, pub, ed, combined2, save2, ed2});
            });
            await step('d-perlang', async () => {
                const pn = await dateTab();
                await pn.locator('.pkpFormLocales button').filter({hasText: 'French'}).first().click(); await sleep(500);
                await pick(pn, 'dateFormatShort-fr_CA', 'm/d/Y');
                const save = await saveForm(pn);
                const ann = (st.D.announcements || [])[0];
                await vis.goto(ctxUrl(st.D.path, `/announcement/view/${ann.id}`, 'fr_CA')); await idle(vis);
                const fr = await vis.locator('.date').allInnerTexts().catch(() => []);
                await snap(vis, 'd04-perlang-fr');
                await vis.goto(ctxUrl(st.D.path, `/announcement/view/${ann.id}`, 'en')); await idle(vis);
                const en = await vis.locator('.date').allInnerTexts().catch(() => []);
                fact('d-perlang', {save, fr, en});
            });
            const customOf = (pn, group) => pn.locator('label.pkpFormField--options__option').filter({has: page.locator(`input[type=radio][name="${group}"]`)}).filter({hasText: 'Custom'}).first();
            await step('d-custom', async () => {
                const pn = await dateTab();
                const lab = customOf(pn, 'dateFormatShort-en');
                await lab.locator('input[type=radio]').check(); await sleep(300);
                const tb = lab.locator('input[type=text]');
                await tb.fill('d/m/Y');
                await snap(page, 'd05-custom-typed');
                const save = await saveForm(pn);
                const pub = await readDates('custom');
                const ed = await readEditorial('custom');
                const pnR = await dateTab();
                const labR = customOf(pnR, 'dateFormatShort-en');
                const after = {radios: await groupState(pnR, 'dateFormatShort-en'), customChecked: await labR.locator('input[type=radio]').isChecked(), box: await labR.locator('input[type=text]').inputValue(), dts: await groupState(pnR, 'datetimeFormatShort-en')};
                // "Custom" with the box emptied
                await labR.locator('input[type=radio]').check();
                await labR.locator('input[type=text]').fill('');
                await snap(page, 'd06-custom-empty');
                const save2 = await saveForm(pnR);
                const pub2 = await readDates('custom-empty');
                const pnR2 = await dateTab();
                const labR2 = customOf(pnR2, 'dateFormatShort-en');
                const dtsLab = customOf(pnR2, 'datetimeFormatShort-en');
                const after2 = {radios: await groupState(pnR2, 'dateFormatShort-en'), customChecked: await labR2.locator('input[type=radio]').isChecked(), box: await labR2.locator('input[type=text]').inputValue(),
                    dts: await groupState(pnR2, 'datetimeFormatShort-en'), dtsCustomChecked: await dtsLab.locator('input[type=radio]').isChecked(), dtsBox: await dtsLab.locator('input[type=text]').inputValue()};
                const ed2 = await readEditorial('custom-empty');
                await snap(page, 'd07-custom-empty-reloaded');
                fact('d-custom', {save, pub, ed, after, save2, pub2, after2, ed2});
            });
            await step('d-back-saved', async () => {
                // The choice back across a save (no register entry; did not reproduce): change, save, reload; then back, save, reload
                const o = {};
                let pn = await dateTab();
                await pick(pn, 'dateFormatShort-en', 'Y-m-d');
                await pick(pn, 'timeFormat-en', 'h:i A');
                o.s0 = await saveForm(pn);
                pn = await dateTab();
                o.r0 = {dts: await groupState(pn, 'datetimeFormatShort-en')};
                await pick(pn, 'dateFormatShort-en', 'd-m-Y');
                o.c1 = {dts: await groupState(pn, 'datetimeFormatShort-en')};
                o.s1 = await saveForm(pn);
                pn = await dateTab();
                o.r1 = {dts: await groupState(pn, 'datetimeFormatShort-en')};
                await pick(pn, 'dateFormatShort-en', 'Y-m-d');
                o.c2 = {dts: await groupState(pn, 'datetimeFormatShort-en')};
                await snap(page, 'd08-back-saved-back-unsaved');
                o.s2 = await saveForm(pn);
                pn = await dateTab();
                o.r2 = {ds: await groupState(pn, 'dateFormatShort-en'), dts: await groupState(pn, 'datetimeFormatShort-en')};
                await snap(page, 'd09-back-saved-back-reloaded');
                o.ed = await readEditorial('back-saved');
                fact('d-back-saved', o);
            });
            await step('d-time-g', async () => {
                // the "3:05PM" choice: what the pages print with it
                const pn = await dateTab();
                const lab = (await groupState(pn, 'timeFormat-en')).find((x) => x.value === 'g:ia');
                // the combined group back on its ready choice first
                await pn.locator('input[type=radio][name="datetimeFormatShort-en"]').first().check(); await sleep(300);
                await pick(pn, 'timeFormat-en', 'g:ia');
                const dts = await groupState(pn, 'datetimeFormatShort-en');
                const save = await saveForm(pn);
                const ed = await readEditorial('time-g');
                fact('d-time-g', {lab, dts, save, ed});
            });
            await step('d-search', async () => {
                // the Search page's results: the summary's date (OJS prints it there only)
                const jobs = drainJobs(app);
                const pn = await dateTab();
                await pick(pn, 'dateFormatShort-en', 'd.m.Y');
                const save = await saveForm(pn);
                await vis.goto(ctxUrl(st.D.path, '/search/search?query=dated')); await idle(vis);
                const results = await vis.evaluate(() => [...document.querySelectorAll('.obj_article_summary, .obj_monograph_summary, .obj_preprint_summary')].map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 200)));
                await snap(vis, 'd10-search-results');
                // the issue page's table of contents and the home page's lists: summaries without a date?
                fact('d-search', {jobs, saved: save.saved, results});
            });
            await step('d-leave', async () => {
                // an unsaved choice, a side-tab switch and back, then a reload
                const pn = await dateTab();
                await pick(pn, 'dateFormatLong-en', 'Y F j');
                await page.locator('#lists-button').first().click(); await idle(page); await sleep(400);
                await page.locator('#dateTime-button').first().click(); await idle(page); await sleep(400);
                const afterSwitch = (await groupState(panel('Date & Time'), 'dateFormatLong-en')).find((x) => x.checked);
                const n0 = dialogs.length;
                await page.reload(); await idle(page);
                await page.locator('#setup-button').first().click(); await idle(page);
                await page.locator('#dateTime-button').first().click(); await idle(page); await sleep(400);
                const afterReload = (await groupState(panel('Date & Time'), 'dateFormatLong-en')).find((x) => x.checked);
                fact('d-leave', {afterSwitch, afterReload, dialogs: dialogs.slice(n0)});
            });
        }
    } finally {
        fact('dialogs', dialogs);
        await M.close(); await V.close();
    }
});
