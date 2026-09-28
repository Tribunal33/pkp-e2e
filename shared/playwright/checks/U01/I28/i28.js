// U01 claim check, chunk I28 (housekeeping 2026-09-28): the incidental rows for Login & sessions.
// Chunk: .reports/hk28/chunks/U01.md — incidentals L57 b (the Participants panel's "Logout as" names the full
// name), L75 (Administration › Hosted Journals › "Settings wizard" › "Users" carries the "Change Password" box),
// L131 b (the header of the site-level access-denied page), L144 (a Reader-only sign-in on a press).
// Spec: docs/specs/U01-login-and-sessions.md — Actors (rows "Complete a forced password change", "Return to their
// own account", "See the access-denied page"), Rules 3, 4, 11, 13, 15, 17, register A5, footnotes b, g, j, l, f-a5.
//
//   PROBE_FEATURE=U01 PROBE_AGENT=ccI28 RUN=1 node bin/probe.js <ojs|omp|ops|all> shared/playwright/checks/U01/I28/i28.js
//   PHASES=loginas,forcepw,denied,reader (default: all). RUN names the facts file (i28-facts-run<RUN>) and prefixes
//   every snapshot (r<RUN>-…); every run seeds its own scratch context (tag prefix u01i28).
//
// Scratch context per app and run (J): mg (manager), pe (productionEditor; not OPS), se (sectionEditor), au (author,
// the submitter), rd (reader), x (author: the Edit User target). One submission S in Production (OPS: its only
// stage), au submitter, se and pe participants.
//   loginas  pe and admin (OPS: mg and admin) on S's Participants panel: "Login As" on au's row, the user menu,
//            "Logout as"; then "Login As" on se's row, the panel's own first entry, the user menu, the panel entry.
//   forcepw  admin, Hosted Journals › J's "Settings wizard" › "Users": "Add User" left ticked (fa) and unticked (fb),
//            each account's first sign-in; "Edit User" on x: the box, a ticked-then-Cancel, a ticked-and-OK read back
//            after the save and after a reload, x's earlier session, x's sign-in, the change form, the box after it;
//            Users & Roles › "Edit" for x (admin, mg) as the control; mg typing the wizard address.
//   denied   author.alex, reader.rosa, manager.maya: the site home page, index/en/admin/index, and (author, reader)
//            a journal-path denial; admin on Administration and a signed-out visitor on the site home as controls.
//   reader   reader.rosa and rd signing in at the context's own Login page (no source), at the site Login page,
//            after a manager's sign-in in the same browser, and after a typed private address (Rule 4).
// publicknowledge and the roster users are read only. No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const RUN = process.env.RUN || '1';
const PHASES = (process.env.PHASES || 'loginas,forcepw,denied,reader').split(',');
const on = (p) => PHASES.includes(p);
const T0 = Date.now();
const log = (...a) => console.log(`[i28 r${RUN} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const strip = (u) => (u || '').replace(/^https?:\/\/127\.0\.0\.1:\d+/, '');

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs', isOMP = app.name === 'omp', isOPS = app.name === 'ops';
    const statePath = path.join(outDir(), `i28-state-r${RUN}-${app.name}.json`);
    const S = fs.existsSync(statePath) && process.env.RESEED !== '1' ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`i28-facts-run${RUN}`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    await app.api.bootstrapProbe(app.contextPath);

    // ── crash and dialog watch, per browser ────────────────────────────────────
    let CUR = 'init';
    const CRASH = [];
    const DIALOGS = [];
    const OPEN = [];
    async function browser() {
        const b = await launch(app);
        b.page.on('response', (r) => { if (r.status() >= 500) CRASH.push({phase: CUR, what: `server ${r.status()} ${r.request().method()} ${strip(r.url()).slice(0, 200)}`}); });
        b.page.on('pageerror', (e) => CRASH.push({phase: CUR, what: `script ${String(e.message || e).slice(0, 200)}`}));
        b.page.on('dialog', (d) => { DIALOGS.push({phase: CUR, type: d.type(), message: d.message().slice(0, 300)}); (d.type() === 'beforeunload' ? d.accept() : d.accept()).catch(() => {}); });
        OPEN.push(b);
        return b;
    }
    async function snap(page, name, extra = {}, {png = true} = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        Object.assign(s, extra);
        record(`r${RUN}-${name}`, s);
        if (png) await shot(page, `r${RUN}-${name}`).catch(() => {});
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
    const h1 = async (page) => flat(await page.locator('main h1, h1').first().innerText({timeout: 3000}).catch(() => null), 150);
    const where = async (page, s) => ({url: strip(page.url()), title: await page.title().catch(() => null), h1: await h1(page), main: flat(s && s.text && (s.text.main || s.text.body), 400)});

    // Sign in by the form on the page already open (the context's or the site's own Login page), and wait for the
    // landing whatever it is (a changePassword divert keeps "/login" in the address).
    async function submitLogin(page, username, password) {
        await page.locator('input#username').fill(username);
        await page.locator('input#password').evaluate((el) => el.removeAttribute('maxlength'));
        await page.locator('input#password').fill(password);
        await Promise.all([page.waitForNavigation({timeout: T}).catch(() => {}), page.locator('form#login button[type="submit"]').click()]);
        await page.waitForLoadState('load').catch(() => {});
        await idle(page).catch(() => {});
        await sleep(600);
    }
    const pw = (u) => (u === 'admin' ? 'admin' : `${u}${u}`);

    // ── seed ───────────────────────────────────────────────────────────────────
    if (!S.t) {
        const t = tag('u01i28');
        const U = (k, roles, g, f) => ({username: `${t}${k}`, roles, givenName: g, familyName: f});
        const users = [U('mg', ['manager'], 'Mona', 'Manager'), U('se', ['sectionEditor'], 'Sid', 'Sectioned'),
            U('au', ['author'], 'Ava', 'Authored'), U('rd', ['reader'], 'Rae', 'Readonly'), U('x', ['author'], 'Xena', 'Target'),
            U('y', ['author'], 'Yuri', 'Resaved')];
        if (!isOPS) users.push(U('pe', ['productionEditor'], 'Pat', 'Producer'));
        const body = {tag: t, context: {name: `U01 I28 ${t}`, acronym: 'I28', contactName: 'I28 Contact', contactEmail: `${t}contact@mail.test`}, users};
        if (isOJS) body.sections = [{abbrev: 'ART', title: 'Articles'}];
        if (isOPS) body.sections = [{abbrev: 'PRE', title: 'Preprints'}];
        const ctx = await app.api.createContext(body);
        const parts = [{username: `${t}se`, role: 'sectionEditor'}];
        if (!isOPS) parts.push({username: `${t}pe`, role: 'productionEditor'});
        const sub = await app.api.createSubmission({tag: `${t}s`, context: t, submitter: `${t}au`, title: `I28 Login As ${t}`,
            abstract: `Abstract ${t}.`, participants: parts, ...(isOPS ? {} : {decisions: ['skipExternalReview', 'sendToProduction']})});
        Object.assign(S, {t, ctxId: ctx.contextId, ids: Object.fromEntries((ctx.users || []).map((u) => [u.username.slice(t.length), u.id])),
            u: Object.fromEntries(users.map((x) => [x.username.slice(t.length), {username: x.username, name: `${x.givenName} ${x.familyName}`}])),
            sub: sub.submissionId, stage: sub.stageId});
        save();
        fact('seed', S);
    }
    const t = S.t, J = t;
    const un = (k) => S.u[k].username;

    // ════════════════════════════════════════════════════════════════════════
    // loginas — L57 b: Rule 13, note j
    // ════════════════════════════════════════════════════════════════════════
    const wfUrl = (id) => cu(J, `/en/dashboard/editorial?workflowSubmissionId=${id}&workflowMenuKey=workflow_5`);
    const userNav = (page) => page.locator('[data-cy="app-user-nav"]').last();
    const panel = (page) => page.locator('[data-cy="participant-manager"]').last();
    async function readUserMenu(page, name) {
        const nav = userNav(page);
        if (!(await nav.count())) return {absent: true};
        const btn = nav.locator('> button');
        const button = flat(await btn.innerText().catch(() => null), 120);
        const buttonAria = await btn.getAttribute('aria-label').catch(() => null);
        await btn.click();
        await nav.locator('nav').waitFor({timeout: 8000}).catch(() => {});
        await sleep(300);
        const menu = flat(await nav.locator('nav').innerText().catch(() => null), 600);
        const links = await nav.locator('nav a').evaluateAll((as) => as.map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')}))).catch(() => []);
        await snap(page, name, {menu, links});
        await btn.click().catch(() => {});
        await sleep(300);
        return {button, buttonAria, menu, links: links.map((l) => `${l.text} -> ${strip(l.href || '').replace(/^\/index\.php\//, '')}`)};
    }
    async function openWf(page, label) {
        await page.goto(wfUrl(S.sub)); await idle(page);
        await page.locator('[role="dialog"]').first().waitFor({timeout: T}).catch(() => {});
        await panel(page).waitFor({timeout: 15_000}).catch(() => {});
        await idle(page); await sleep(500);
        const s = await snap(page, label);
        return {url: strip(page.url()), panel: await panelItems(page), dialog: flat(s.text && s.text.dialog, 300)};
    }
    async function panelItems(page) {
        if (!(await panel(page).count())) return null;
        return panel(page).evaluate((p) => {
            const vis = (e) => e.getClientRects().length > 0;
            return {
                first: (() => { const li = [...p.querySelectorAll('li')].filter(vis)[0]; return li ? li.innerText.replace(/\s+/g, ' ').trim() : null; })(),
                items: [...p.querySelectorAll('li')].filter(vis).map((li) => li.innerText.replace(/\s+/g, ' ').trim()).slice(0, 12),
                logoutAs: [...p.querySelectorAll('a, button')].filter(vis).map((b) => ({tag: b.tagName, text: b.innerText.replace(/\s+/g, ' ').trim(), aria: b.getAttribute('aria-label')})).filter((b) => /Logout as/.test(b.text + (b.aria || ''))),
            };
        }).catch((e) => ({error: String(e.message)}));
    }
    async function loginAsRow(page, k, label) {
        const who = S.u[k].name;
        const more = panel(page).getByRole('button', {name: `${who} More Actions`, exact: true});
        const out = {moreCount: await more.count()};
        if (!out.moreCount) return out;
        await more.first().click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10_000}).catch(() => {});
        out.menu = await page.getByRole('menuitem').evaluateAll((els) => els.map((e) => e.textContent.trim().replace(/\s+/g, ' '))).catch(() => null);
        const la = page.getByRole('menuitem', {name: 'Login As', exact: true});
        if (!(await la.count())) { await more.first().click().catch(() => {}); return out; }
        await la.click();
        const confirm = page.getByRole('dialog').filter({hasText: 'Log in as this user?'}).last();
        await confirm.waitFor({timeout: 15_000}).catch(() => {});
        out.confirm = flat(await confirm.innerText().catch(() => null), 300);
        await snap(page, `${label}-confirm`);
        await Promise.all([page.waitForNavigation({timeout: T}).catch(() => {}), confirm.getByRole('button', {name: 'OK', exact: true}).click()]);
        await page.waitForLoadState('load').catch(() => {});
        await idle(page); await sleep(1500);
        await page.locator('[role="dialog"]').first().waitFor({timeout: 15_000}).catch(() => {});
        await idle(page); await sleep(500);
        const s = await snap(page, `${label}-landed`);
        out.landed = await where(page, s);
        out.panel = await panelItems(page);
        return out;
    }

    if (on('loginas')) await sect('loginas', async () => {
        const imps = isOPS ? ['mg', 'admin'] : ['pe', 'admin'];
        for (const imp of imps) {
            const {page, close} = await browser();
            const who = imp === 'admin' ? 'admin' : un(imp);
            try {
                await signIn(page, who, {contextPath: J}); await idle(page);
                const R = {who};
                R.own = await readUserMenu(page, `la-${imp}-own-menu`);
                R.wf = await openWf(page, `la-${imp}-wf`);
                // "Login As" on the author's row
                R.au = await loginAsRow(page, 'au', `la-${imp}-au`);
                R.auMenu = await readUserMenu(page, `la-${imp}-au-menu`);
                const lo = userNav(page).locator('nav').getByRole('link', {name: /^Logout as/}).first();
                await userNav(page).locator('> button').click(); await sleep(300);
                R.auLogoutAsText = flat(await lo.innerText().catch(() => null), 100);
                if (await lo.count()) {
                    await loc(page, 'user menu: "Logout as {username}" while impersonating', lo);
                    await Promise.all([page.waitForNavigation({timeout: T}).catch(() => {}), lo.click()]);
                    await page.waitForLoadState('load').catch(() => {}); await idle(page); await sleep(800);
                    R.auBack = await where(page, await snap(page, `la-${imp}-au-back`));
                    R.auBackMenu = await readUserMenu(page, `la-${imp}-au-back-menu`);
                }
                // "Login As" on the section editor's row
                await openWf(page, `la-${imp}-wf2`);
                R.se = await loginAsRow(page, 'se', `la-${imp}-se`);
                R.seMenu = await readUserMenu(page, `la-${imp}-se-menu`);
                const entry = panel(page).getByRole('button', {name: /^Logout as/}).or(panel(page).getByRole('link', {name: /^Logout as/})).first();
                R.seEntryCount = await entry.count();
                if (R.seEntryCount) {
                    await loc(page, 'Participants panel: its own "Logout as …" entry while impersonating', entry);
                    R.seEntry = {text: flat(await entry.innerText(), 120), aria: await entry.getAttribute('aria-label').catch(() => null)};
                    await Promise.all([page.waitForNavigation({timeout: T}).catch(() => {}), entry.click()]);
                    await page.waitForLoadState('load').catch(() => {}); await idle(page); await sleep(1000);
                    R.seBack = await where(page, await snap(page, `la-${imp}-se-back`));
                    R.seBackPanel = await panelItems(page);
                    R.seBackMenu = await readUserMenu(page, `la-${imp}-se-back-menu`);
                }
                fact(`loginas.${imp}`, R);
                await signOut(page).catch(() => {});
            } finally { await close(); }
        }
    });

    // ════════════════════════════════════════════════════════════════════════
    // forcepw — L75: Rule 11, register A5, Actors "Complete a forced password change"
    // ════════════════════════════════════════════════════════════════════════
    const gridPanel = (page) => page.locator('[role="tabpanel"]:visible').filter({has: page.locator('.pkp_controllers_grid')}).last();
    async function openWizardUsers(page) {
        await page.goto(app.url(`/index.php/index/en/admin/wizard/${S.ctxId}`)); await idle(page);
        const tab = page.getByRole('tab', {name: 'Users', exact: true}).first();
        await tab.waitFor({timeout: T});
        await tab.click();
        const p = gridPanel(page);
        await p.locator('tr.gridRow').first().waitFor({timeout: T});
        await idle(page); await sleep(400);
        return p;
    }
    async function rowLink(page, p, rowText, name) {
        const row = p.locator('tr.gridRow').filter({hasText: rowText}).first();
        const next = row.locator('xpath=following-sibling::tr[1]');
        const link = next.locator('a').filter({hasText: new RegExp(`^\\s*${name}\\s*$`)}).first();
        if (!(await link.isVisible().catch(() => false))) await row.locator('a.show_extras').click();
        await link.waitFor({timeout: 8000});
        await link.click();
    }
    async function rowActions(p, rowText) {
        const row = p.locator('tr.gridRow').filter({hasText: rowText}).first();
        if (!(await row.count())) return null;
        const a = row.locator('a.show_extras');
        if (await a.count()) await a.click();
        const next = row.locator('xpath=following-sibling::tr[1]');
        await next.locator('a').first().waitFor({timeout: 5000}).catch(() => {});
        return {cells: (await row.locator('td').allInnerTexts()).map((c) => flat(c, 80)), links: (await next.locator('a').allInnerTexts()).map((x) => flat(x, 40)).filter(Boolean)};
    }
    async function userForm(page) {
        const form = page.locator('form#userDetailsForm').last();
        await form.waitFor({timeout: T});
        await idle(page); await sleep(700);
        return form;
    }
    async function boxFacts(form) {
        return form.evaluate((f) => {
            const el = f.querySelector('input[name="mustChangePassword"]');
            if (!el) return {present: false};
            const l = (el.id && f.querySelector(`label[for="${CSS.escape(el.id)}"]`)) || el.closest('label');
            const sec = el.closest('.section, fieldset');
            return {present: true, checked: el.checked, disabled: el.disabled, visible: !!(el.offsetWidth || el.getClientRects().length),
                label: l ? l.innerText.replace(/\s+/g, ' ').trim() : null, section: sec ? sec.innerText.replace(/\s+/g, ' ').trim().slice(0, 300) : null};
        }).catch((e) => ({error: String(e.message)}));
    }
    async function formText(form) {
        return form.evaluate((f) => ({
            inputs: [...f.querySelectorAll('input:not([type=hidden]), select, textarea')].filter((e) => e.getClientRects().length).map((e) => `${e.name}:${e.type}${e.type === 'checkbox' ? (e.checked ? '[x]' : '[ ]') : ''}`),
            text: f.innerText.replace(/\s+/g, ' ').trim().slice(0, 2500),
        })).catch((e) => ({error: String(e.message)}));
    }
    async function pressOK(page, form) {
        await form.getByRole('button', {name: 'OK', exact: true}).click();
        await sleep(1500); await idle(page);
    }
    async function cancelForm(page, form) {
        const c = form.getByRole('link', {name: 'Cancel', exact: true}).or(form.getByRole('button', {name: 'Cancel', exact: true}));
        await c.first().click();
        await form.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
        await sleep(800);
    }
    async function notices(page) {
        return (await page.locator('.pkpNotification:visible, .ui-pnotify:visible, [class*="pnotify"]:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)).filter(Boolean);
    }
    const PW = (k) => `Pw-${k}-${t}`.slice(0, 30);
    const NW = (k) => `Nw-${k}-${t}`.slice(0, 30);
    // A fresh browser signs `username` in at J's own Login page; if diverted, completes the change form (a wrong
    // current password first).
    async function firstSignIn(username, password, newPassword, label, {complete = true} = {}) {
        const b = await browser();
        const out = {};
        await b.page.goto(cu(J, '/en/login')); await idle(b.page);
        await submitLogin(b.page, username, password);
        const s = await snap(b.page, `${label}-signin`);
        out.landed = await where(b.page, s);
        const cf = b.page.locator('form#loginChangePassword');
        out.changeForm = (await cf.count()) ? await cf.evaluate((f) => ({
            fields: [...f.querySelectorAll('input:not([type=hidden])')].map((e) => `${e.name}=${e.type === 'password' ? '' : e.value}${e.readOnly ? '(ro)' : ''}${e.disabled ? '(dis)' : ''}`),
            text: f.innerText.replace(/\s+/g, ' ').trim().slice(0, 800), buttons: [...f.querySelectorAll('button, input[type=submit]')].map((x) => x.innerText || x.value),
        })) : null;
        if (out.changeForm) await loc(b.page, 'Change Password: the form', cf);
        if (out.changeForm && complete) {
            const fill = async (old) => {
                // every box of the form carries maxlength="32" (register A1); a scratch password can be longer
                await cf.locator('input[name="oldPassword"]').evaluate((el) => el.removeAttribute('maxlength'));
                await cf.locator('input[name="oldPassword"]').fill(old);
                for (const n of ['password', 'password2']) {
                    const i = cf.locator(`input[name="${n}"]`).first();
                    await i.evaluate((el) => el.removeAttribute('maxlength'));
                    await i.fill(newPassword);
                }
                await Promise.all([b.page.waitForNavigation({timeout: T}).catch(() => {}), cf.getByRole('button', {name: 'OK', exact: true}).click()]);
                await b.page.waitForLoadState('load').catch(() => {}); await idle(b.page).catch(() => {}); await sleep(800);
            };
            await fill('not-the-password');
            const w = await snap(b.page, `${label}-wrong-current`);
            out.wrongCurrent = {...(await where(b.page, w)), errors: (await b.page.locator('.pkp_form_error, #formErrors, .error, [role="alert"]').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)).filter(Boolean)};
            await fill(password);
            const d = await snap(b.page, `${label}-changed`);
            out.afterChange = await where(b.page, d);
            out.afterChangeHeader = flat(d.text && d.text.header, 200);
        }
        return {out, b};
    }

    if (on('forcepw')) await sect('forcepw', async () => {
        const {page} = await browser();
        const R = {};
        await signIn(page, 'admin');
        // the grid
        let p = await openWizardUsers(page);
        await snap(page, 'fp-wizard-users');
        R.gridHeaderLinks = (await p.locator('.header a, .actions a').allInnerTexts().catch(() => [])).map((x) => flat(x, 40)).filter(Boolean);
        R.rowX = await rowActions(p, un('x'));
        await snap(page, 'fp-row-x-open');
        fact('forcepw.grid', R);

        // Add User, box left ticked (fa)
        const add = async (k, given, family, tick) => {
            p = await openWizardUsers(page);
            await p.locator('a').filter({hasText: /^\s*Add User\s*$/}).first().click();
            const form = await userForm(page);
            const A = {boxOnOpen: await boxFacts(form)};
            if (k === 'fa') { A.form = await formText(form); await loc(page, 'Add User: the "Change Password" box', form.locator('input[name="mustChangePassword"]')); }
            await form.locator('input[name="givenName[en]"]').fill(given);
            await form.locator('input[name="familyName[en]"]').fill(family);
            await form.locator('input[name="username"]').fill(`${t}${k}`);
            await form.locator('input[name="email"]').fill(`${t}${k}@mail.test`);
            for (const n of ['password', 'password2']) { const i = form.locator(`input[name="${n}"]`); await i.evaluate((el) => el.removeAttribute('maxlength')).catch(() => {}); await i.fill(PW(k)); }
            await form.locator('input[name="mustChangePassword"]').setChecked(tick);
            A.boxBeforeOK = await boxFacts(form);
            await snap(page, `fp-add-${k}-step1`);
            await pressOK(page, form);
            const rf = page.locator('form#userRoleForm').last();
            await rf.waitFor({timeout: T}); await idle(page); await sleep(500);
            await snap(page, `fp-add-${k}-step2`);
            await rf.getByRole('checkbox', {name: 'Author', exact: true}).first().check();
            await rf.getByRole('button', {name: 'Save', exact: true}).click();
            await sleep(1500); await idle(page);
            A.notices = await notices(page);
            p = await openWizardUsers(page);
            A.row = (await rowActions(p, `${t}${k}`)) || 'no row';
            return A;
        };
        const fa = await add('fa', 'Faye', 'Forced', true);
        const faSign = await firstSignIn(`${t}fa`, PW('fa'), NW('fa'), 'fp-fa');
        fa.signIn = faSign.out;
        // a second sign-in with the new password: no divert
        await signOut(faSign.b.page).catch(() => {});
        await faSign.b.page.goto(cu(J, '/en/login')); await idle(faSign.b.page);
        await submitLogin(faSign.b.page, `${t}fa`, NW('fa'));
        fa.secondSignIn = await where(faSign.b.page, await snap(faSign.b.page, 'fp-fa-second-signin'));
        await faSign.b.close();
        fact('forcepw.addTicked', fa);

        const fb = await add('fb', 'Fern', 'Free', false);
        const fbSign = await firstSignIn(`${t}fb`, PW('fb'), NW('fb'), 'fp-fb');
        fb.signIn = fbSign.out;
        await fbSign.b.close();
        fact('forcepw.addUnticked', fb);

        // Edit User on x
        const E = {};
        p = await openWizardUsers(page);
        await rowLink(page, p, un('x'), 'Edit User');
        let form = await userForm(page);
        E.onOpen = await boxFacts(form);
        E.form = await formText(form);
        await snap(page, 'fp-edit-x-open');
        await loc(page, 'Edit User: the "Change Password" box', form.locator('input[name="mustChangePassword"]'));
        // ticked, then Cancel: the way out with a change unsaved
        const d0 = DIALOGS.length;
        await form.locator('input[name="mustChangePassword"]').check();
        await form.locator('input[name="familyName[en]"]').click();
        await cancelForm(page, form);
        E.cancel = {dialogs: DIALOGS.slice(d0), formStillOpen: await form.isVisible().catch(() => false)};
        await snap(page, 'fp-edit-x-cancelled');
        p = gridPanel(page);
        if (!(await p.isVisible().catch(() => false))) p = await openWizardUsers(page);
        await rowLink(page, p, un('x'), 'Edit User');
        form = await userForm(page);
        E.afterCancel = await boxFacts(form);
        // x signs in elsewhere before the flag
        const xb = await browser();
        await xb.page.goto(cu(J, '/en/login')); await idle(xb.page);
        await submitLogin(xb.page, un('x'), pw(un('x')));
        E.xSessionBefore = await where(xb.page, await snap(xb.page, 'fp-x-session-before'));
        // tick and OK
        await form.locator('input[name="mustChangePassword"]').check();
        await snap(page, 'fp-edit-x-ticked');
        await pressOK(page, form);
        E.saved = {notices: await notices(page), formOpen: await form.isVisible().catch(() => false)};
        await snap(page, 'fp-edit-x-saved');
        // read back on the same page, then after a reload
        p = gridPanel(page);
        if (!(await p.isVisible().catch(() => false))) p = await openWizardUsers(page);
        await rowLink(page, p, un('x'), 'Edit User');
        form = await userForm(page);
        E.readBackSamePage = await boxFacts(form);
        await cancelForm(page, form);
        await page.reload(); await idle(page);
        p = await openWizardUsers(page);
        await rowLink(page, p, un('x'), 'Edit User');
        form = await userForm(page);
        E.readBackAfterReload = await boxFacts(form);
        await snap(page, 'fp-edit-x-readback-reload');
        await cancelForm(page, form);
        // x's earlier session after the flag alone
        await xb.page.goto(cu(J, '/en/submissions')).catch(() => {}); await xb.page.waitForLoadState('load').catch(() => {}); await sleep(800);
        const xs1 = await snap(xb.page, 'fp-x-session-after-flag');
        E.xSessionAfterFlag = {...(await where(xb.page, xs1)), header: flat(xs1.text && xs1.text.header, 200)};
        // x signs in fresh: the divert, the change
        const xSign = await firstSignIn(un('x'), pw(un('x')), NW('x'), 'fp-x');
        E.xSignIn = xSign.out;
        await xSign.b.close();
        // x's earlier session after the change is completed
        await xb.page.goto(cu(J, '/en/submissions')).catch(() => {}); await xb.page.waitForLoadState('load').catch(() => {}); await sleep(800);
        const xs2 = await snap(xb.page, 'fp-x-session-after-change');
        E.xSessionAfterChange = {...(await where(xb.page, xs2)), header: flat(xs2.text && xs2.text.header, 200)};
        // signing in again on the Login page that ended session landed on (its address carries the source it holds)
        if (await xb.page.locator('input#username').count()) {
            await submitLogin(xb.page, un('x'), NW('x'));
            E.xSessionSignInAgain = await where(xb.page, await snap(xb.page, 'fp-x-session-signin-again'));
        }
        await xb.close();
        // the box after the change
        p = await openWizardUsers(page);
        await rowLink(page, p, un('x'), 'Edit User');
        form = await userForm(page);
        E.afterChangeBox = await boxFacts(form);
        await snap(page, 'fp-edit-x-after-change');
        await cancelForm(page, form);
        fact('forcepw.edit', E);

        // the flag set, then "Edit User" opened again and saved with nothing changed (y)
        const Y = {};
        p = await openWizardUsers(page);
        await rowLink(page, p, un('y'), 'Edit User');
        form = await userForm(page);
        await form.locator('input[name="mustChangePassword"]').check();
        await pressOK(page, form);
        p = gridPanel(page);
        if (!(await p.isVisible().catch(() => false))) p = await openWizardUsers(page);
        await rowLink(page, p, un('y'), 'Edit User');
        form = await userForm(page);
        Y.reopened = await boxFacts(form);
        await snap(page, 'fp-edit-y-reopened');
        await pressOK(page, form);
        Y.resaved = {notices: await notices(page), formOpen: await form.isVisible().catch(() => false)};
        const ySign = await firstSignIn(un('y'), pw(un('y')), NW('y'), 'fp-y', {complete: false});
        Y.signIn = ySign.out;
        await ySign.b.close();
        fact('forcepw.resave', Y);

        // the control: Users & Roles › "Edit" for x, as admin and as the manager
        const C = {};
        for (const who of ['admin', un('mg')]) {
            if (who !== 'admin') await signIn(page, who, {contextPath: J});
            await page.goto(cu(J, `/en/management/settings/user/${S.ids.x}`)); await idle(page); await sleep(1200);
            const s = await snap(page, `fp-usersroles-edit-${who === 'admin' ? 'admin' : 'mg'}`);
            C[who === 'admin' ? 'admin' : 'mg'] = {...(await where(page, s)), main: flat(s.text && s.text.main, 1200),
                passwordControls: await page.locator('main input[type=checkbox], main input[type=password]').evaluateAll((els) => els.map((e) => `${e.name || e.id}:${e.type}`)).catch(() => null),
                mentionsPassword: /password/i.test((s.text && s.text.main) || '')};
        }
        // the manager typing the wizard address
        await page.goto(app.url(`/index.php/index/en/admin/wizard/${S.ctxId}`)); await idle(page);
        C.mgWizard = await where(page, await snap(page, 'fp-mg-wizard-typed'));
        fact('forcepw.control', C);
        await signOut(page).catch(() => {});
    });

    // ════════════════════════════════════════════════════════════════════════
    // denied — L131 b: Rule 17 (U08 Rule 26a), the header of the site-level access-denied page
    // ════════════════════════════════════════════════════════════════════════
    async function headerFacts(page) {
        return page.evaluate(() => {
            const vis = (e) => !!(e && e.getClientRects().length);
            const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
            const h = document.querySelector('header.pkp_structure_head, header#headerNavigationContainer, .pkp_structure_head, header');
            const logo = document.querySelector('.pkp_site_name a, .pkp_site_name');
            const img = document.querySelector('.pkp_site_name img, .pkp_structure_head img');
            const prim = document.querySelector('#navigationPrimary, .pkp_navigation_primary');
            const user = document.querySelector('#navigationUser, .pkp_navigation_user');
            return {
                docTitle: document.title,
                header: h ? {visible: vis(h), text: txt(h).slice(0, 400)} : null,
                siteName: logo ? {text: txt(logo), href: logo.getAttribute('href'), visible: vis(logo)} : null,
                logoImg: img ? {alt: img.getAttribute('alt'), src: (img.getAttribute('src') || '').slice(-60), visible: vis(img)} : null,
                primaryMenu: prim ? {visible: vis(prim), items: [...prim.querySelectorAll(':scope > li > a')].map((a) => txt(a) || a.textContent.trim())} : null,
                userMenu: user ? {visible: vis(user), items: [...user.querySelectorAll('a')].map((a) => ({text: (a.textContent || '').replace(/\s+/g, ' ').trim(), href: a.getAttribute('href'), visible: vis(a)}))} : null,
                search: [...document.querySelectorAll('header a, .pkp_structure_head a')].filter((a) => /search/i.test(a.className + a.textContent)).map((a) => ({text: a.textContent.trim(), visible: vis(a)})),
                editorialNav: document.querySelectorAll('[data-cy="app-user-nav"]').length,
                breadcrumb: txt(document.querySelector('.cmp_breadcrumbs, nav.cmp_breadcrumbs')),
                headings: [...document.querySelectorAll('h1, h2')].filter(vis).map(txt).slice(0, 5),
                bodyClass: document.body.className,
            };
        }).catch((e) => ({error: String(e.message)}));
    }
    async function visit(page, url, label) {
        const r = await page.goto(url).catch((e) => ({err: String(e.message)}));
        await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {}); await sleep(400);
        const s = await snap(page, label);
        return {status: r && r.status ? r.status() : r && r.err, ...(await where(page, s)), headerText: flat(s.text && s.text.header, 300), hdr: await headerFacts(page)};
    }

    if (on('denied')) await sect('denied', async () => {
        const {page} = await browser();
        // a signed-out visitor on the site home: the header's control
        await signOut(page).catch(() => {});
        fact('denied.signedOut.siteHome', await visit(page, cu('index', '/en/index'), 'dn-signedout-site-home'));
        const who = ['author.alex', 'reader.rosa', 'manager.maya'];
        for (const u of who) {
            const k = u.split('.')[0];
            await signIn(page, u); await idle(page).catch(() => {});
            const D = {landedAfterSiteLogin: strip(page.url())};
            D.siteHome = await visit(page, cu('index', '/en/index'), `dn-${k}-site-home`);
            D.siteDenied = await visit(page, cu('index', '/en/admin/index'), `dn-${k}-site-denied`);
            if (u === 'author.alex') await loc(page, 'site-level access-denied page: the header', page.locator('header').first());
            // what the header's own controls do, pressed from the denied page: the logo or name, the user menu's entries
            D.pressed = [];
            const press = async (label, locator, opener) => {
                await page.goto(cu('index', '/en/admin/index')); await page.waitForLoadState('load').catch(() => {}); await sleep(300);
                if (opener) { await opener().catch(() => {}); await sleep(400); }
                const n = await locator.count();
                if (!n || !(await locator.first().isVisible().catch(() => false))) { D.pressed.push({label, count: n, visible: false}); return; }
                const href = await locator.first().getAttribute('href').catch(() => null);
                await Promise.all([page.waitForNavigation({timeout: 15_000}).catch(() => {}), locator.first().click().catch(() => {})]);
                await page.waitForLoadState('load').catch(() => {}); await sleep(400);
                D.pressed.push({label, href: strip((href || '').trim()), landed: strip(page.url()), title: await page.title().catch(() => null), h1: await h1(page)});
            };
            const userTop = page.locator('#navigationUser > li > a').first();
            await press('logo or name', page.locator('.pkp_site_name a'));
            await press('user menu: username', userTop);
            for (const item of ['Dashboard', 'View Profile']) {
                await press(`user menu: ${item}`, page.locator('#navigationUser ul a').filter({hasText: new RegExp(`^\\s*${item}`)}), () => userTop.click());
            }
            if (u !== 'manager.maya') D.journalDenied = await visit(page, cu(app.contextPath, '/en/management/settings/context'), `dn-${k}-journal-denied`);
            fact(`denied.${k}`, D);
            await signOut(page).catch(() => {});
        }
        await signIn(page, 'admin');
        fact('denied.admin.siteAdmin', await visit(page, cu('index', '/en/admin/index'), 'dn-admin-site-admin'));
        await signOut(page).catch(() => {});
    });

    // ════════════════════════════════════════════════════════════════════════
    // reader — L144: Rule 3 (a Reader-only sign-in), Rule 4 (an interrupted visit)
    // ════════════════════════════════════════════════════════════════════════
    if (on('reader')) await sect('reader', async () => {
        const ctxs = [[app.contextPath, 'reader.rosa', 'pk'], [J, un('rd'), 'sc']];
        const privateAddr = isOMP ? '/en/manageCatalog' : '/en/management/settings/context';
        for (const [ctx, u, k] of ctxs) {
            const Rr = {};
            // 1. the context's own Login page, typed, no source
            {
                const {page, close} = await browser();
                await page.goto(cu(ctx, '/en/login')); await idle(page);
                Rr.loginPage = await where(page, await snap(page, `rd-${k}-login-page`));
                await submitLogin(page, u, pw(u));
                const s = await snap(page, `rd-${k}-own-login-landed`);
                Rr.ownLogin = {...(await where(page, s)), header: flat(s.text && s.text.header, 200)};
                // reload the landing
                await page.reload().catch(() => {}); await page.waitForLoadState('load').catch(() => {}); await sleep(400);
                Rr.ownLoginReload = await where(page, await snap(page, `rd-${k}-own-login-reload`));
                await close();
            }
            // 2. the site's Login page
            {
                const {page, close} = await browser();
                await page.goto(cu('index', '/en/login')); await idle(page);
                await submitLogin(page, u, pw(u));
                Rr.siteLogin = await where(page, await snap(page, `rd-${k}-site-login-landed`));
                await close();
            }
            // 3. after a manager's session in the same browser (the kit's signIn signs out first)
            {
                const {page, close} = await browser();
                await signIn(page, ctx === J ? un('mg') : 'manager.maya', {contextPath: ctx}); await idle(page).catch(() => {});
                Rr.managerLanded = strip(page.url());
                await signIn(page, u, {contextPath: ctx}).catch((e) => { Rr.switchErr = String(e.message).slice(0, 200); });
                await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {}); await sleep(500);
                Rr.afterSwitch = await where(page, await snap(page, `rd-${k}-after-switch`));
                await close();
            }
            // 4. a private address typed signed out, then the sign-in (Rule 4)
            {
                const {page, close} = await browser();
                await page.goto(cu(ctx, privateAddr)); await idle(page).catch(() => {});
                Rr.typedSignedOut = await where(page, await snap(page, `rd-${k}-typed-signedout`));
                if (await page.locator('input#username').count()) {
                    await submitLogin(page, u, pw(u));
                    const s = await snap(page, `rd-${k}-typed-then-signin`);
                    Rr.typedThenSignIn = await where(page, s);
                }
                await close();
            }
            fact(`reader.${k}`, Rr);
        }
    });

    for (const b of OPEN) await b.close().catch(() => {});
    fact('crashes.all', CRASH);
});
