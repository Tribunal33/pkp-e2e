// U53 claim check, chunk I28 (housekeeping 2026-09-28): the incidental rows for Users management.
// Chunk: .reports/hk28/chunks/U53.md — incidental L122 (Users & Roles typed at `…/management/access` by a
// manager-level member) and the U01 fold's pointer U01-I28 (the Hosted Journals "Edit User" "OK" notice "User edited.",
// the "Change Password" box on "Edit User", the Cross-feature "Login & sessions" bullet).
// Spec: docs/specs/U53-users-management.md — Actors row "Open the "Users" list…" (td1), Fields "Change Password",
// Rules 23 and 24 (fn-l, fn-m), the Cross-feature "Login & sessions" bullet.
//
//   PROBE_FEATURE=U53 PROBE_AGENT=ccI28 RUN=1 node bin/probe.js <ojs|omp|ops|all> shared/playwright/checks/U53/I28/i28.js
//   PHASES=access,edit (default: both). RUN names the facts file (i28-facts-run<RUN>) and prefixes every snapshot
//   (r<RUN>-…); every run seeds its own scratch context (tag prefix u53i28).
//
// Scratch context per app and run (J): mg (manager), ed (editor; not OPS), pe (productionEditor; not OPS),
// se (sectionEditor), x (author: the "Edit User" target for the notice), y (author: the "Change Password" target).
//   access  on publicknowledge (read only): manager.maya, editor.diana (not OPS), admin, and as the other end
//           sectioneditor.ana and reader.rosa, each typing `{ctx}/management/access` and `{ctx}/management/settings/access`;
//           the side menu's "Users & Roles" address; on J the same two addresses for mg, ed, pe (the third
//           manager-level role) and se.
//   edit    admin, Administration › Hosted Journals › J's "Settings wizard" › "Users": "Edit User" on x "OK" with
//           nothing changed, then with "Reader" ticked (the notice, on the page and after a reload); "Edit User" on
//           y with "Change Password" ticked, "OK", the box read back on the same page and after a reload, y's
//           sign-in, then "OK" unchanged and y's next sign-in; "Edit User" left by its "Close" with a change unsaved.
// publicknowledge and the roster users are read only. No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const RUN = process.env.RUN || '1';
const PHASES = (process.env.PHASES || 'access,edit').split(',');
const on = (p) => PHASES.includes(p);
const T0 = Date.now();
const log = (...a) => console.log(`[u53i28 r${RUN} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const strip = (u) => (u || '').replace(/^https?:\/\/127\.0\.0\.1:\d+/, '');
const DENIED = 'The current role does not have access to this operation.';

forEachApp(async (app) => {
    const isOPS = app.name === 'ops';
    const statePath = path.join(outDir(), `i28-state-r${RUN}-${app.name}.json`);
    const S = fs.existsSync(statePath) && process.env.RESEED !== '1' ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`i28-facts-run${RUN}`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2000)); };
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    await app.api.bootstrapProbe(app.contextPath);

    // ── crash, dialog and notice watch, per browser ─────────────────────────────
    let CUR = 'init';
    const CRASH = [];
    const DIALOGS = [];
    const API = [];
    async function browser() {
        const b = await launch(app);
        // every element whose own text reads like a page notice, as it is added (the kit's watcher reads only
        // `.app__notifications .pkpNotification`)
        await b.context.addInitScript(() => {
            window.__u53n = [];
            new MutationObserver((ms) => {
                for (const m of ms) for (const n of m.addedNodes) {
                    if (n.nodeType !== 1) continue;
                    const cls = String(n.className || '');
                    const txt = (n.textContent || '').replace(/\s+/g, ' ').trim();
                    if (txt && (/notif|pnotify|alert|toast/i.test(cls) || /User edited/.test(txt)) && txt.length < 400) {
                        window.__u53n.push({at: Date.now(), cls: cls.slice(0, 80), text: txt.slice(0, 200)});
                    }
                }
            }).observe(document, {childList: true, subtree: true});
        });
        b.page.on('response', (r) => {
            const u = strip(r.url());
            if (r.status() >= 500) CRASH.push({phase: CUR, what: `server ${r.status()} ${r.request().method()} ${u.slice(0, 200)}`});
            if (/\/api\/|fetchNotification|notification|grid\/settings\/user|management\//.test(u)) API.push({phase: CUR, at: Date.now(), m: r.request().method(), s: r.status(), url: u.slice(0, 180)});
        });
        b.page.on('pageerror', (e) => CRASH.push({phase: CUR, what: `script ${String(e.message || e).slice(0, 200)}`}));
        b.page.on('dialog', (d) => { DIALOGS.push({phase: CUR, type: d.type(), message: d.message().slice(0, 300)}); d.accept().catch(() => {}); });
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
    const h1 = async (page) => flat(await page.locator('main h1, h1').first().innerText({timeout: 3000}).catch(() => null), 150);

    // ── seed ───────────────────────────────────────────────────────────────────
    if (!S.t) {
        const t = tag('u53i28');
        const U = (k, roles, g, f) => ({username: `${t}${k}`, roles, givenName: g, familyName: f});
        const users = [U('mg', ['manager'], 'Mona', 'Manager'), U('se', ['sectionEditor'], 'Sid', 'Sectioned'),
            U('x', ['author'], 'Xena', 'Edited'), U('y', ['author'], 'Yuri', 'Flagged')];
        if (!isOPS) users.push(U('ed', ['editor'], 'Eda', 'Editor'), U('pe', ['productionEditor'], 'Pat', 'Producer'));
        const body = {tag: t, context: {name: `U53 I28 ${t}`, acronym: 'I28', contactName: 'I28 Contact', contactEmail: `${t}contact@mail.test`}, users};
        const ctx = await app.api.createContext(body);
        Object.assign(S, {t, ctxId: ctx.contextId, u: Object.fromEntries(users.map((x) => [x.username.slice(t.length), {username: x.username, name: `${x.givenName} ${x.familyName}`}]))});
        save();
        fact('seed', S);
    }
    const J = S.t;
    const un = (k) => S.u[k].username;

    // ════════════════════════════════════════════════════════════════════════
    // access — L122: the Actors row "Open the "Users" list…", td1
    // ════════════════════════════════════════════════════════════════════════
    async function visit(page, url, label) {
        const r = await page.goto(url).catch((e) => ({err: String(e.message)}));
        await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {}); await sleep(500);
        const s = await snap(page, label);
        const main = flat(s.text && (s.text.main || s.text.body), 600) || '';
        const dlg = await page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').allInnerTexts().catch(() => []);
        return {
            status: r && r.status ? r.status() : r && r.err, url: strip(page.url()), title: await page.title().catch(() => null), h1: await h1(page),
            denied: main.includes(DENIED), usersList: /Current Users/.test(main), tabs: (await page.getByRole('tab').allInnerTexts().catch(() => [])).map((x) => flat(x, 40)).slice(0, 12),
            dialogs: dlg.map((x) => flat(x, 200)), main: main.slice(0, 300),
        };
    }
    async function sideMenuUsersLink(page) {
        return page.evaluate(() => [...document.querySelectorAll('a')].filter((a) => /Users\s*&\s*Roles/.test(a.textContent || ''))
            .map((a) => ({text: a.textContent.replace(/\s+/g, ' ').trim(), href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')}))).catch(() => []);
    }

    if (on('access')) await sect('access', async () => {
        const {page} = await browser();
        const pk = app.contextPath;
        const who = ['manager.maya', ...(isOPS ? [] : ['editor.diana']), 'admin', 'sectioneditor.ana', 'reader.rosa'];
        for (const u of who) {
            const k = u.split('.')[0];
            await signIn(page, u); await idle(page).catch(() => {});
            const A = {landed: strip(page.url())};
            A.short = await visit(page, cu(pk, '/en/management/access'), `ac-${k}-pk-access`);
            A.long = await visit(page, cu(pk, '/en/management/settings/access'), `ac-${k}-pk-settings-access`);
            A.sideMenuUsersRoles = await sideMenuUsersLink(page);
            if (u === 'manager.maya') {
                await page.goto(cu(pk, '/en/management/access')); await idle(page).catch(() => {});
                await loc(page, 'typed …/management/access: the access-denied line', page.getByText(DENIED, {exact: true}));
                // what the denied page offers: its links in main
                A.deniedOffers = (await page.locator('main a:visible, .pkp_structure_main a:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)).filter(Boolean).slice(0, 20);
                // the side menu's own Users & Roles entry, pressed from Settings
                await page.goto(cu(pk, '/en/management/settings/context')); await idle(page).catch(() => {});
                const link = page.getByRole('link', {name: /Users\s*&\s*Roles/}).first();
                if (await link.isVisible().catch(() => false)) {
                    await link.click(); await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {}); await sleep(400);
                    A.sideMenuPressed = {url: strip(page.url()), h1: await h1(page)};
                    await snap(page, 'ac-manager-sidemenu-users-roles');
                } else A.sideMenuPressed = {visible: false};
            }
            fact(`access.pk.${k}`, A);
            await signOut(page).catch(() => {});
        }
        // the scratch context: every manager-level role, and a sub-editor as the other end
        for (const k of ['mg', ...(isOPS ? [] : ['ed', 'pe']), 'se']) {
            await signIn(page, un(k)); await idle(page).catch(() => {});
            const A = {};
            A.short = await visit(page, cu(J, '/en/management/access'), `ac-j${k}-access`);
            A.long = await visit(page, cu(J, '/en/management/settings/access'), `ac-j${k}-settings-access`);
            fact(`access.J.${k}`, A);
            await signOut(page).catch(() => {});
        }
    });

    // ════════════════════════════════════════════════════════════════════════
    // edit — U01-I28: Rule 24 ("OK" shows "User edited."), Fields "Change Password", Rule 23
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
    async function rowCells(p, rowText) {
        const row = p.locator('tr.gridRow').filter({hasText: rowText}).first();
        return (await row.locator('td').allInnerTexts().catch(() => [])).map((c) => flat(c, 80));
    }
    async function userForm(page) {
        const form = page.locator('form#userDetailsForm').last();
        await form.waitFor({timeout: T});
        await form.locator('input[name="givenName[en]"]').waitFor({timeout: T});
        await idle(page); await sleep(700);
        return form;
    }
    async function box(form, name) {
        return form.evaluate((f, n) => {
            const el = f.querySelector(`input[name="${n}"]`);
            if (!el) return {present: false};
            const l = (el.id && f.querySelector(`label[for="${CSS.escape(el.id)}"]`)) || el.closest('label');
            return {present: true, checked: el.checked, disabled: el.disabled, label: l ? l.innerText.replace(/\s+/g, ' ').trim() : null};
        }, name).catch((e) => ({error: String(e.message)}));
    }
    async function roleBoxes(form) {
        return form.locator('input[name="userGroupIds[]"]').evaluateAll((els) => els.map((e) => {
            const l = e.closest('label') || document.querySelector(`label[for="${e.id}"]`);
            return `${l ? l.innerText.replace(/\s+/g, ' ').trim() : e.value}${e.checked ? '[x]' : '[ ]'}`;
        })).catch(() => []);
    }
    const pageNotes = (page) => page.evaluate(() => (window.__u53n || []).map((n) => ({...n}))).catch(() => []);
    // Press "OK" and watch for "User edited." for up to 8 s, the way the suites read it (anywhere on the page);
    // return what showed, when, and the notification requests of that window.
    async function okAndWatch(page, form) {
        const a0 = API.length, n0 = (await pageNotes(page)).length;
        const t0 = Date.now();
        await form.getByRole('button', {name: 'OK', exact: true}).click();
        let seenAt = null;
        const target = page.getByText('User edited.', {exact: false}).first();
        try { await target.waitFor({state: 'visible', timeout: 8000}); seenAt = Date.now() - t0; } catch (e) { /* not seen */ }
        const where = seenAt != null ? await target.evaluate((e) => {
            const c = e.closest('.app__notifications, .pkpNotification, [class*="pnotify"], [class*="notif"]');
            return {container: c ? String(c.className).slice(0, 80) : null, text: (c || e).textContent.replace(/\s+/g, ' ').trim().slice(0, 200)};
        }).catch(() => null) : null;
        await idle(page).catch(() => {});
        const shotNow = await snap(page, `ed-${CUR}-after-ok-${Date.now() % 100000}`);
        return {
            userEditedVisibleWithin8s: seenAt != null, msToVisible: seenAt, where,
            formStillOpen: await form.isVisible().catch(() => false),
            observed: (await pageNotes(page)).slice(n0).map((n) => ({ms: n.at - t0, cls: n.cls, text: n.text})),
            screenNotices: shotNow.notices,
            requests: API.slice(a0).filter((x) => /notification|grid\/settings\/user/.test(x.url)).map((x) => `+${x.at - t0}ms ${x.m} ${x.s} ${x.url}`),
        };
    }
    const cu2 = (p) => cu(J, p);
    async function submitLogin(page, username, password) {
        await page.locator('input#username').fill(username);
        await page.locator('input#password').evaluate((el) => el.removeAttribute('maxlength'));
        await page.locator('input#password').fill(password);
        await Promise.all([page.waitForNavigation({timeout: T}).catch(() => {}), page.locator('form#login button[type="submit"]').click()]);
        await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {}); await sleep(600);
    }
    async function yLanding(label) {
        const b = await browser();
        try {
            await b.page.goto(cu2('/en/login')); await idle(b.page);
            await submitLogin(b.page, un('y'), `${un('y')}${un('y')}`);
            const s = await snap(b.page, label);
            return {url: strip(b.page.url()), h1: await h1(b.page), main: flat(s.text && (s.text.main || s.text.body), 200)};
        } finally { await b.close().catch(() => {}); }
    }

    if (on('edit')) await sect('edit', async () => {
        const {page} = await browser();
        await signIn(page, 'admin');
        await page.goto(app.url('/index.php/index/en/admin/contexts')); await idle(page);
        await snap(page, 'ed-hosted');
        let p = await openWizardUsers(page);
        await snap(page, 'ed-wizard-users');
        await loc(page, 'Wizard Users grid: a row\'s "Edit User" link', p.locator('tr.gridRow').filter({hasText: un('x')}).first().locator('xpath=following-sibling::tr[1]').locator('a').filter({hasText: /^\s*Edit User\s*$/}));
        const E = {rowBefore: await rowCells(p, un('x'))};

        // 1. x: "OK" with nothing changed
        CUR = 'edit-unchanged';
        await rowLink(page, p, un('x'), 'Edit User');
        let form = await userForm(page);
        E.xOpen = {heading: flat(await form.locator('h3').first().innerText().catch(() => null), 80), roles: await roleBoxes(form), mustChange: await box(form, 'mustChangePassword')};
        await snap(page, 'ed-x-open');
        await loc(page, 'Edit User: the "OK" button', form.getByRole('button', {name: 'OK', exact: true}));
        E.xUnchanged = await okAndWatch(page, form);
        await page.reload(); await idle(page); await sleep(800);
        E.xUnchangedAfterReload = {notices: (await snap(page, 'ed-x-unchanged-reloaded')).notices, userEditedOnPage: await page.getByText('User edited.').count()};

        // 2. x: "Reader" ticked, "OK"
        CUR = 'edit-role';
        p = await openWizardUsers(page);
        await rowLink(page, p, un('x'), 'Edit User');
        form = await userForm(page);
        await form.locator('input[name="userGroupIds[]"]').and(form.getByRole('checkbox', {name: 'Reader', exact: true})).check();
        E.xRole = await okAndWatch(page, form);
        p = gridPanel(page);
        E.xRole.rowAfter = await rowCells(p, un('x')).catch(() => null);

        // 3. y: "Change Password" ticked, "OK"; the box read back on the page and after a reload
        CUR = 'edit-flag';
        p = await openWizardUsers(page);
        await rowLink(page, p, un('y'), 'Edit User');
        form = await userForm(page);
        E.yOpen = await box(form, 'mustChangePassword');
        await loc(page, 'Edit User: the "Change Password" box', form.locator('input[name="mustChangePassword"]'));
        await form.locator('input[name="mustChangePassword"]').check();
        await snap(page, 'ed-y-ticked');
        E.yFlag = await okAndWatch(page, form);
        p = gridPanel(page);
        if (!(await p.isVisible().catch(() => false))) p = await openWizardUsers(page);
        await rowLink(page, p, un('y'), 'Edit User');
        form = await userForm(page);
        E.yReadSamePage = await box(form, 'mustChangePassword');
        await snap(page, 'ed-y-readback-same-page');
        await form.getByRole('link', {name: 'Cancel', exact: true}).click();
        await form.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
        await page.reload(); await idle(page);
        p = await openWizardUsers(page);
        await rowLink(page, p, un('y'), 'Edit User');
        form = await userForm(page);
        E.yReadAfterReload = await box(form, 'mustChangePassword');
        await snap(page, 'ed-y-readback-reload');
        await form.getByRole('link', {name: 'Cancel', exact: true}).click();
        await form.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
        E.ySignInFlagged = await yLanding('ed-y-signin-flagged');

        // 4. y: "OK" with nothing changed, then y's next sign-in
        CUR = 'edit-resave';
        await page.reload(); await idle(page);
        p = await openWizardUsers(page);
        await rowLink(page, p, un('y'), 'Edit User');
        form = await userForm(page);
        E.yResaveOpen = await box(form, 'mustChangePassword');
        E.yResave = await okAndWatch(page, form);
        E.ySignInAfterResave = await yLanding('ed-y-signin-resaved');

        // 5. the way out: a change typed, then the window's own "Close" (the × at its top)
        CUR = 'edit-close';
        await page.reload(); await idle(page);
        p = await openWizardUsers(page);
        await rowLink(page, p, un('x'), 'Edit User');
        form = await userForm(page);
        const d0 = DIALOGS.length;
        await form.locator('input[name="familyName[en]"]').fill('Changed');
        await form.locator('input[name="givenName[en]"]').click();
        const close = page.getByRole('dialog', {name: 'Edit User', exact: true}).last().getByRole('button', {name: 'Close', exact: true});
        E.closeButton = await close.count();
        if (E.closeButton) await close.click();
        await form.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
        await sleep(800);
        E.closeWay = {dialogs: DIALOGS.slice(d0), formStillOpen: await form.isVisible().catch(() => false)};
        await snap(page, 'ed-x-closed-unsaved');
        p = gridPanel(page);
        E.closeWay.rowAfter = await rowCells(p, un('x')).catch(() => null);
        await page.reload(); await idle(page);
        p = await openWizardUsers(page);
        E.closeWay.rowAfterReload = await rowCells(p, un('x'));
        fact('edit', E);
    });
});
