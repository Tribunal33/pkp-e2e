// U01 claim check, chunk I29 (housekeeping 2026-09-29): incidentals row 9 for Login & sessions.
// Chunk: .reports/hk29/chunks/U01.md — row 9: after a disabled account's refused sign-in ("Your account has been
// disabled…"), the next sign-in with a valid account in the same browser lands back on the Login page with no
// message; a second try succeeds.
// Spec: docs/specs/U01-login-and-sessions.md — Actors row "Sign in / sign out", Rule 2, Rule 3, footnotes a, b.
//
//   PROBE_FEATURE=U01 PROBE_AGENT=ccI29 RUN=1 node bin/probe.js <ojs|omp|ops|all> shared/playwright/checks/U01/I29/i29.js
//   PHASES=disable,seq (default: both). RUN names the facts file (i29-facts-run<RUN>) and prefixes every snapshot
//   (r<RUN>-…); every run seeds its own scratch context (tag prefix u01i29).
//
// Scratch context per app and run (J): mg (manager), ok and o2 (authors), dz (author, seeded disabled, no reason),
// dr (author, disabled on screen by mg with a typed reason in phase "disable").
//   disable  mg: Settings › Users & Roles › dr's "…" › "Disable User", the window, a typed reason, "OK"; the list after
//            the save and after a reload.
//   seq      each sequence in a fresh browser, every landing recorded with screen():
//            A   J's Login: dz (correct password, "Keep me logged in" as it arrives) → ok → ok again
//            A2  the same with "Keep me logged in" unticked on dz's attempt
//            B   J's Login: dr (reason) → mg → mg again (a manager's landing)
//            C   J's Login: dz → J's Login opened afresh → ok → ok again
//            D   the site-level Login: dz → ok → ok again
//            E   J's Login: dz → o2 → dz again (after the bounce) → o2, o2, o2 (until it gets in)
//            ctl1 J's Login: ok with a wrong password → ok
//            ctl2 J's Login: an unknown username → ok
//            ctl3 J's Login: dz with a wrong password → ok
//            base a fresh browser: ok, mg, and ok at the site-level Login, first try
// publicknowledge and the roster users are read only. No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const RUN = process.env.RUN || '1';
const PHASES = (process.env.PHASES || 'disable,seq').split(',');
const on = (p) => PHASES.includes(p);
const T0 = Date.now();
const log = (...a) => console.log(`[i29 r${RUN} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const strip = (u) => (u || '').replace(/^https?:\/\/127\.0\.0\.1:\d+/, '');

forEachApp(async (app) => {
    const statePath = path.join(outDir(), `i29-state-r${RUN}-${app.name}.json`);
    const S = fs.existsSync(statePath) && process.env.RESEED !== '1' ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`i29-facts-run${RUN}`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    await app.api.bootstrapProbe(app.contextPath);

    // ── crash and dialog watch, per browser ────────────────────────────────────
    let CUR = 'init';
    const CRASH = [];
    const DIALOGS = [];
    async function browser() {
        const b = await launch(app);
        b.page.on('response', (r) => { if (r.status() >= 500) CRASH.push({phase: CUR, what: `server ${r.status()} ${r.request().method()} ${strip(r.url()).slice(0, 200)}`}); });
        b.page.on('pageerror', (e) => CRASH.push({phase: CUR, what: `script ${String(e.message || e).slice(0, 200)}`}));
        b.page.on('dialog', (d) => { DIALOGS.push({phase: CUR, type: d.type(), message: d.message().slice(0, 300)}); d.accept().catch(() => {}); });
        // Document requests, to show the redirect chain of each sign-in.
        b.docs = [];
        b.page.on('response', (r) => { if (r.request().resourceType() === 'document') b.docs.push(`${r.request().method()} ${r.status()} ${strip(r.url()).slice(0, 160)}`); });
        return b;
    }
    async function snap(page, name, extra = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        Object.assign(s, extra);
        record(`r${RUN}-${name}`, s);
        await shot(page, `r${RUN}-${name}`).catch(() => {});
        return s;
    }
    async function sect(name, fn) {
        CUR = name;
        log(`== ${app.name} ${name}`);
        const c0 = CRASH.length, d0 = DIALOGS.length;
        try { await fn(); } catch (e) {
            log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | '));
            fact(`${name}.FAILED`, String(e.message || e).slice(0, 600));
        }
        fact(`${name}.crashes`, CRASH.slice(c0).map((c) => c.what));
        fact(`${name}.dialogs`, DIALOGS.slice(d0));
    }

    // What the page shows after a sign-in attempt: where it is, whether the form is there, the form's error line,
    // the explanatory line above the form, what "Username or Email" and "Keep me logged in" hold.
    async function read(page, name, b, d0) {
        const s = await snap(page, name);
        const form = (await page.locator('form#login').count()) > 0;
        return {
            url: strip(page.url()),
            title: await page.title().catch(() => null),
            h1: flat(await page.locator('main h1, h1').first().innerText({timeout: 3000}).catch(() => null), 120),
            form,
            error: form ? flat(await page.locator('form#login .pkp_form_error').allInnerTexts().then((a) => a.join(' | ')).catch(() => null), 300) : null,
            username: form ? await page.locator('input#username').inputValue().catch(() => null) : null,
            remember: form ? await page.locator('form#login input[name="remember"]').isChecked().catch(() => null) : null,
            userNav: flat(await page.locator('[data-cy="app-user-nav"] > button').first().innerText({timeout: 1500}).catch(() => null), 40),
            main: flat(s && s.text && (s.text.main || s.text.body), 300),
            docs: b.docs.slice(d0),
        };
    }
    // Sign in by the form on the page already open, and wait for whatever it lands on.
    async function attempt(page, b, name, username, password, {remember} = {}) {
        const d0 = b.docs.length;
        const typed = {username, remember: remember === undefined ? 'as it arrives' : remember};
        await page.locator('input#username').fill(username);
        await page.locator('input#password').evaluate((el) => el.removeAttribute('maxlength'));
        await page.locator('input#password').fill(password);
        if (remember !== undefined) await page.locator('form#login input[name="remember"]').setChecked(remember);
        typed.rememberAtSubmit = await page.locator('form#login input[name="remember"]').isChecked().catch(() => null);
        await Promise.all([page.waitForNavigation({timeout: T}).catch(() => {}), page.locator('form#login button[type="submit"]').click()]);
        await page.waitForLoadState('load').catch(() => {});
        await idle(page).catch(() => {});
        await sleep(600);
        return {typed, ...(await read(page, name, b, d0))};
    }
    const pw = (u) => `${u}${u}`;

    // ── seed ───────────────────────────────────────────────────────────────────
    if (!S.t) {
        const t = tag('u01i29');
        const U = (k, roles, g, f, extra = {}) => ({username: `${t}${k}`, roles, givenName: g, familyName: f, ...extra});
        const users = [U('mg', ['manager'], 'Mona', 'Manager'), U('ok', ['author'], 'Otto', 'Okay'), U('o2', ['author'], 'Olga', 'Second'),
            U('dz', ['author'], 'Dora', 'Zed', {disabled: true}), U('dr', ['author'], 'Dana', 'Reason')];
        const body = {tag: t, context: {name: `U01 I29 ${t}`, acronym: 'I29', contactName: 'I29 Contact', contactEmail: `${t}contact@mail.test`}, users};
        const ctx = await app.api.createContext(body);
        Object.assign(S, {t, ctxId: ctx.contextId,
            u: Object.fromEntries(users.map((x) => [x.username.slice(t.length), {username: x.username, name: `${x.givenName} ${x.familyName}`, email: `${x.username}@mail.test`}]))});
        save();
        fact('seed', S);
    }
    const t = S.t, J = t;
    const un = (k) => S.u[k].username;
    const ctxLogin = cu(J, '/login');
    const siteLogin = app.url('/index.php/index/login');

    // ════════════════════════════════════════════════════════════════════════
    // disable — dr disabled by mg on screen, with a reason (Rule 2's second message)
    // ════════════════════════════════════════════════════════════════════════
    if (on('disable') && !S.drDisabled) await sect('disable', async () => {
        const {UsersListPage, DisableUserWindow} = require('../../../pages/UsersManagementPages.js');
        const b = await browser();
        const page = b.page;
        try {
            await page.goto(ctxLogin);
            await attempt(page, b, 'dis-mg-signin', un('mg'), pw(un('mg')));
            const list = new UsersListPage(page, J);
            await list.goto();
            await idle(page);
            await snap(page, 'dis-list');
            const row = list.row(S.u.dr.email);
            const labels = await list.menuLabels(row);
            await list.chooseAction(row, 'Disable User');
            const win = new DisableUserWindow(page, `Disable ${S.u.dr.name}`);
            await win.expectForm();
            await snap(page, 'dis-window');
            await loc(page, 'Disable window reason box', win.reason);
            S.reason = `Reason ${t}`;
            await win.reason.fill(S.reason);
            await win.ok();
            await idle(page);
            const after = await snap(page, 'dis-list-after');
            const iconAfter = await list.disabledIcon(list.row(S.u.dr.email)).count();
            await page.reload(); await idle(page);
            await list.table.locator('tbody tr').first().waitFor({timeout: T}).catch(() => {});
            await snap(page, 'dis-list-reload');
            const iconReload = await list.disabledIcon(list.row(S.u.dr.email)).count();
            const labelsAfter = await list.menuLabels(list.row(S.u.dr.email));
            S.drDisabled = true; save();
            fact('disable', {labels, labelsAfter, iconAfter, iconReload, notices: after.notices || null});
        } finally { await b.close(); }
    });

    // ════════════════════════════════════════════════════════════════════════
    // seq — row 9 and its controls
    // ════════════════════════════════════════════════════════════════════════
    // Each step: [label, the Login page to open first (or null: sign in on the page already open), user key, password
    // kind ('right' | 'wrong' | 'unknown'), options].
    const SEQS = {
        A: [['dz', ctxLogin, 'dz', 'right'], ['ok1', null, 'ok', 'right'], ['ok2', null, 'ok', 'right']],
        A2: [['dz', ctxLogin, 'dz', 'right', {remember: false}], ['ok1', null, 'ok', 'right'], ['ok2', null, 'ok', 'right']],
        B: [['dr', ctxLogin, 'dr', 'right'], ['mg1', null, 'mg', 'right'], ['mg2', null, 'mg', 'right']],
        C: [['dz', ctxLogin, 'dz', 'right'], ['ok1', ctxLogin, 'ok', 'right'], ['ok2', null, 'ok', 'right']],
        D: [['dz', siteLogin, 'dz', 'right'], ['ok1', null, 'ok', 'right'], ['ok2', null, 'ok', 'right']],
        E: [['dz', ctxLogin, 'dz', 'right'], ['o21', null, 'o2', 'right'], ['dz2', null, 'dz', 'right'], ['o22', null, 'o2', 'right'],
            ['o23', null, 'o2', 'right'], ['o24', null, 'o2', 'right']],
        ctl1: [['okbad', ctxLogin, 'ok', 'wrong'], ['ok1', null, 'ok', 'right']],
        ctl2: [['unknown', ctxLogin, 'nobody', 'unknown'], ['ok1', null, 'ok', 'right']],
        ctl3: [['dzbad', ctxLogin, 'dz', 'wrong'], ['ok1', null, 'ok', 'right']],
        base: [['ok1', ctxLogin, 'ok', 'right'], ['mg1', 'fresh-ctx', 'mg', 'right'], ['oksite', 'fresh-site', 'ok', 'right']],
    };
    if (on('seq')) {
        for (const [seqName, steps] of Object.entries(SEQS)) {
            if (process.env.ONLYSEQ && !process.env.ONLYSEQ.split(',').includes(seqName)) continue;
            await sect(`seq.${seqName}`, async () => {
                let b = await browser();
                try {
                    const out = [];
                    for (const [label, open, who, kind, opts = {}] of steps) {
                        if (open === 'fresh-ctx' || open === 'fresh-site') {
                            await b.close();
                            b = await browser();
                        }
                        const page = b.page;
                        const target = open === 'fresh-ctx' ? ctxLogin : open === 'fresh-site' ? siteLogin : open;
                        if (target) { await page.goto(target); await idle(page).catch(() => {}); }
                        if (!(await page.locator('form#login').count())) { out.push({label, skipped: 'no login form on the page', url: strip(page.url())}); break; }
                        const username = kind === 'unknown' ? `${t}nobody` : un(who);
                        const password = kind === 'right' ? pw(username) : `${pw(username)}x`;
                        const r = await attempt(page, b, `seq-${seqName}-${label}`, username, password, opts);
                        out.push({label, who: kind === 'unknown' ? 'unknown' : who, kind, ...r});
                    }
                    fact(`seq.${seqName}`, out);
                } finally { await b.close(); }
            });
        }
    }
    if (RUN === '1' && app.name === 'ojs') note(`Login (I29): the form's error line is \`form#login .pkp_form_error\`; a sign-in bounced back to Login is read by \`form#login\` being present on the landing plus the document chain (POST signIn 302 → dashboard 302 → login?source=…) — Playwright's waitForNavigation resolves on the first hop, so wait for 'load' and idle() after it (ccI29, ${app.name}).`);
});
