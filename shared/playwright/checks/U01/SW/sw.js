// U01 drift sweep SW (housekeeping 2026-10-06): the spec lines the kept checks I28 and I29 own that their snapshots
// do not settle. Spec: docs/specs/U01-login-and-sessions.md — Actors rows "Sign in / sign out", "Complete a forced
// password change", "Return to their own account", "See the access-denied page", Rules 2, 3, 4, 11, 13, 15, 17,
// register A5, footnotes a, b, g, j, l, f-a5. Run I28 and I29 first (or beside it); this script adds:
//
//   PROBE_FEATURE=U01 PROBE_AGENT=ccSW PROBE_RUN=r1 node bin/probe.js <ojs|omp|ops|all> shared/playwright/checks/U01/SW/sw.js
//   PHASES=login,landing,resume,forced,newrev,imp,denied (default: all). PROBE_RUN names every file (state, facts
//   `sw-facts`, snapshots `sw-…`); every run seeds its own scratch contexts (tag prefix u01sw).
//
// Scratch contexts per app and run: J (mg manager, au and au2 authors, rd reader, se section editor, rv external
// reviewer {OJS OMP}, fz author, gone: an author role ended, nothing current), K (kx author, enrolled nowhere else),
// and on OJS L (a journal requiring subscriptions, one published issue, one published article with a PDF galley).
// One submission S in J by au with se as participant (OJS: in external review; OMP: external review; OPS: submitted).
//   login    J's Login: an empty submit, a username with an empty password, au's email with a wrong password, an
//            unknown email, au's email with the right password, then the user menu's "Logout" (Rule 2, Actors row 1).
//   landing  publicknowledge's Login, one account per permission level from the roster; J's Login for gone (no
//            current role) and kx (roles only in K); the site Login for admin (Rule 3).
//   resume   signed out: `{J}/dashboard` and `{J}/en/dashboard` (A7), `{J}/en/dashboard/editorial`, S's workflow
//            address and `{J}/en/management/settings/context` typed, each followed by mg's sign-in; on OJS, L's article
//            galley typed signed out (the explanatory sentence) (Rule 4).
//   forced   admin flags rv (OPS: se) and fz through Hosted Journals › "Settings wizard" › "Users" › "Edit User";
//            rv signs in at J's Login: the divert, J's dashboard typed right after it, the change completed;
//            fz signs in at the site-level Login: the divert and the completion (Rule 11).
//   newrev   {OJS OMP} mg on S's review stage: "Add Reviewer" › "Create New Reviewer"; the emailed password's
//            sign-in (A5, "Create New Reviewer" flags the account it creates).
//   imp      admin on J's Users & Roles: "Login As" on mg; the top bar's two avatars (Rule 13); mg's own Users & Roles
//            and S's Participants panel while impersonating (A4); the second "Login As" (on au) and its "Logout as";
//            admin again: au from Users & Roles, "Logout as" pressed off a workflow screen (Rule 15 "elsewhere");
//            admin again: the copied "Logout" address typed while impersonating au (Rule 15).
//   denied   one account per level (sectioneditor.ana, reviewer.julia, assistant.rita, author.alex) typing
//            `index/en/admin/index` and publicknowledge's `management/settings/context`; au2 typing S's author
//            dashboard and workflow addresses (the sentence varies, Rule 17).
// publicknowledge and the roster users are read only. No assertions: the script records, the reader judges.
const fs = require('fs');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outFile} = require('../../../probe');

const T = 30_000;
const RUN = process.env.PROBE_RUN || 'r0';
const PHASES = (process.env.PHASES || 'login,landing,resume,forced,newrev,imp,denied').split(',');
const on = (p) => PHASES.includes(p);
const T0 = Date.now();
const log = (...a) => console.log(`[sw ${RUN} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const strip = (u) => (u || '').replace(/^https?:\/\/127\.0\.0\.1:\d+/, '');

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs', isOMP = app.name === 'omp', isOPS = app.name === 'ops';
    const statePath = outFile('sw-state.json');
    const S = fs.existsSync(statePath) && process.env.RESEED !== '1' ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('sw-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2000)); };
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    await app.api.bootstrapProbe(app.contextPath);

    // ── crash, dialog and document watch, per browser ──────────────────────────
    let CUR = 'init';
    const CRASH = [];
    const DIALOGS = [];
    const OPEN = [];
    async function browser() {
        const b = await launch(app);
        b.docs = [];
        b.page.on('response', (r) => {
            if (r.status() >= 500) CRASH.push({phase: CUR, what: `server ${r.status()} ${r.request().method()} ${strip(r.url()).slice(0, 200)}`});
            if (r.request().resourceType() === 'document') b.docs.push(`${r.request().method()} ${r.status()} ${strip(r.url()).slice(0, 200)}`);
        });
        b.page.on('pageerror', (e) => CRASH.push({phase: CUR, what: `script ${String(e.message || e).slice(0, 200)}`}));
        b.page.on('dialog', (d) => { DIALOGS.push({phase: CUR, type: d.type(), message: d.message().slice(0, 300)}); d.accept().catch(() => {}); });
        OPEN.push(b);
        return b;
    }
    async function snap(page, name, extra = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        Object.assign(s, extra);
        record(`sw-${name}`, s);
        await shot(page, `sw-${name}`).catch(() => {});
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
    async function where(page, s) {
        const form = (await page.locator('form#login').count()) > 0;
        return {url: strip(page.url()), title: await page.title().catch(() => null), h1: await h1(page),
            loginForm: form,
            formError: form ? flat(await page.locator('form#login .pkp_form_error').allInnerTexts().then((a) => a.join(' | ')).catch(() => null), 300) : undefined,
            userNav: flat(await page.locator('[data-cy="app-user-nav"] > button').first().innerText({timeout: 1500}).catch(() => null), 80),
            publicUser: flat(await page.locator('#navigationUser').first().innerText({timeout: 1500}).catch(() => null), 80),
            main: flat(s && s.text && (s.text.main || s.text.body), 500)};
    }
    async function go(b, url, name) {
        const d0 = b.docs.length;
        const r = await b.page.goto(url).catch((e) => ({err: String(e.message).slice(0, 200)}));
        await b.page.waitForLoadState('load').catch(() => {}); await idle(b.page).catch(() => {}); await sleep(400);
        const s = await snap(b.page, name);
        return {status: r && r.status ? r.status() : r && r.err, ...(await where(b.page, s)), docs: b.docs.slice(d0)};
    }
    // Sign in by the form on the page already open; wait for whatever it lands on.
    async function submitLogin(b, username, password, name) {
        const page = b.page;
        const d0 = b.docs.length;
        await page.locator('input#username').fill(username);
        await page.locator('input#password').evaluate((el) => el.removeAttribute('maxlength'));
        await page.locator('input#password').fill(password);
        await Promise.all([page.waitForNavigation({timeout: T}).catch(() => {}), page.locator('form#login button[type="submit"]').click()]);
        await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {}); await sleep(600);
        const s = await snap(page, name);
        return {...(await where(page, s)), docs: b.docs.slice(d0)};
    }
    const pw = (u) => (u === 'admin' ? 'admin' : `${u}${u}`);

    // ── seed ───────────────────────────────────────────────────────────────────
    if (!S.t) {
        const t = tag('u01sw');
        const U = (k, roles, g, f, extra = {}) => ({username: `${t}${k}`, roles, givenName: g, familyName: f, ...extra});
        const users = [U('mg', ['manager'], 'Mona', 'Manager'), U('au', ['author'], 'Ava', 'Authored'), U('au2', ['author'], 'Abe', 'Second'),
            U('rd', ['reader'], 'Rae', 'Readonly'), U('se', ['sectionEditor'], 'Sid', 'Sectioned'), U('fz', ['author'], 'Fay', 'Sitelevel'),
            U('gone', [], 'Gus', 'Gone', {pastRoles: [{role: 'author'}]})];
        if (!isOPS) users.push(U('rv', ['externalReviewer'], 'Rita', 'Reviewer'));
        const body = {tag: t, context: {name: `U01 SW ${t}`, acronym: 'USW', contactName: 'SW Contact', contactEmail: `${t}contact@mail.test`}, users};
        if (isOJS) body.sections = [{abbrev: 'ART', title: 'Articles'}];
        if (isOPS) body.sections = [{abbrev: 'PRE', title: 'Preprints'}];
        const ctx = await app.api.createContext(body);
        const k = `${t}k`;
        const ctxK = await app.api.createContext({tag: k, context: {name: `U01 SW K ${t}`, acronym: 'USK', contactName: 'K Contact', contactEmail: `${k}contact@mail.test`},
            users: [{username: `${t}kx`, roles: ['author'], givenName: 'Kim', familyName: 'Elsewhere'}],
            ...(isOJS ? {sections: [{abbrev: 'ART', title: 'Articles'}]} : {}), ...(isOPS ? {sections: [{abbrev: 'PRE', title: 'Preprints'}]} : {})});
        const subSpec = {tag: `${t}s`, context: t, submitter: `${t}au`, title: `SW Login ${t}`, abstract: `Abstract ${t}.`,
            participants: [{username: `${t}se`, role: 'sectionEditor'}]};
        if (isOJS) subSpec.decisions = ['sendExternalReview'];
        if (isOMP) Object.assign(subSpec, {decisions: ['skipInternalReview'], reviewRounds: [{stage: 'external'}]});
        const sub = await app.api.createSubmission(subSpec);
        Object.assign(S, {t, k, ctxId: ctx.contextId, ctxKId: ctxK.contextId,
            ids: Object.fromEntries((ctx.users || []).map((u) => [u.username.slice(t.length), u.id])),
            u: Object.fromEntries(users.map((x) => [x.username.slice(t.length), {username: x.username, name: `${x.givenName} ${x.familyName}`, email: `${x.username}@mail.test`}])),
            sub: sub.submissionId, stage: sub.stageId});
        S.u.kx = {username: `${t}kx`, name: 'Kim Elsewhere', email: `${t}kx@mail.test`};
        if (isOJS) {
            const l = `${t}l`;
            await app.api.createContext({tag: l, context: {name: `U01 SW L ${t}`, acronym: 'USL', contactName: 'L Contact', contactEmail: `${l}contact@mail.test`},
                sections: [{abbrev: 'ART', title: 'Articles'}], publishingMode: 'subscription',
                issues: [{volume: 1, number: 1, year: 2026, published: true}],
                users: [{username: `${t}la`, roles: ['author'], givenName: 'Lou', familyName: 'Locked'}]});
            const ls = await app.api.createSubmission({tag: `${t}ls`, context: l, submitter: `${t}la`, title: `SW Locked ${t}`, abstract: `Abstract ${t}.`,
                published: true, issue: {volume: 1, number: 1, year: 2026}, galleys: [{label: 'PDF', file: 'article.pdf'}]});
            Object.assign(S, {l, lsub: ls.submissionId, lsubResp: JSON.stringify(ls).slice(0, 600)});
        }
        save();
        fact('seed', S);
    }
    const t = S.t, J = t;
    const un = (k) => S.u[k].username;

    // ════════════════════════════════════════════════════════════════════════
    // login — Rule 2 (empty boxes, an email address), Actors row 1 (sign out from the menu)
    // ════════════════════════════════════════════════════════════════════════
    if (on('login')) await sect('login', async () => {
        const b = await browser();
        const page = b.page;
        const R = {};
        R.page = await go(b, cu(J, '/en/login'), 'login-page');
        R.controls = await page.locator('main a, main button, main input:not([type=hidden])').evaluateAll((els) => els.filter((e) => e.getClientRects().length)
            .map((e) => `${e.tagName}${e.type ? ':' + e.type : ''} ${(e.innerText || e.value || e.name || '').replace(/\s+/g, ' ').trim().slice(0, 40)}${e.required ? ' (required)' : ''}${e.checked ? ' [x]' : ''}`)).catch(() => null);
        // an empty submit: the browser's own check
        const d0 = b.docs.length;
        const req0 = [];
        const onReq = (r) => { if (r.method() === 'POST') req0.push(strip(r.url())); };
        page.on('request', onReq);
        await page.locator('form#login button[type="submit"]').click();
        await sleep(1200);
        R.emptyBoth = {url: strip(page.url()), posts: [...req0], docs: b.docs.slice(d0),
            username: await page.locator('input#username').evaluate((e) => ({valid: e.checkValidity(), message: e.validationMessage, focused: document.activeElement === e})),
            password: await page.locator('input#password').evaluate((e) => ({valid: e.checkValidity(), message: e.validationMessage, focused: document.activeElement === e}))};
        await snap(page, 'login-empty-both');
        await page.locator('input#username').fill(un('au'));
        await page.locator('form#login button[type="submit"]').click();
        await sleep(1200);
        R.emptyPassword = {url: strip(page.url()), posts: [...req0],
            password: await page.locator('input#password').evaluate((e) => ({valid: e.checkValidity(), message: e.validationMessage, focused: document.activeElement === e}))};
        await snap(page, 'login-empty-password');
        page.off('request', onReq);
        // an email address with the wrong password; an unknown email; the right password
        R.emailWrong = await submitLogin(b, S.u.au.email, `${pw(un('au'))}x`, 'login-email-wrong');
        R.emailWrong.usernameKept = await page.locator('input#username').inputValue().catch(() => null);
        R.unknownEmail = await submitLogin(b, `${t}nobody@mail.test`, 'whatever-password', 'login-unknown-email');
        R.emailRight = await submitLogin(b, S.u.au.email, pw(un('au')), 'login-email-right');
        // the user menu's Logout
        const nav = page.locator('[data-cy="app-user-nav"]');
        await nav.locator('> button').first().click();
        const lo = nav.getByRole('link', {name: 'Logout', exact: true});
        await lo.waitFor({timeout: 8000});
        R.menu = flat(await nav.locator('nav').innerText().catch(() => null), 200);
        await loc(page, 'user menu: Logout', lo);
        const d1 = b.docs.length;
        await Promise.all([page.waitForNavigation({timeout: T}).catch(() => {}), lo.click()]);
        await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {}); await sleep(500);
        const s = await snap(page, 'login-after-logout');
        R.afterLogout = {...(await where(page, s)), docs: b.docs.slice(d1), username: await page.locator('input#username').inputValue().catch(() => null)};
        fact('login', R);
        await b.close();
    });

    // ════════════════════════════════════════════════════════════════════════
    // landing — Rule 3, one account per level
    // ════════════════════════════════════════════════════════════════════════
    if (on('landing')) await sect('landing', async () => {
        const roster = isOPS ? ['manager.maya', 'sectioneditor.ana', 'assistant.rita', 'author.alex', 'reader.rosa']
            : ['manager.maya', 'editor.diana', 'sectioneditor.ana', 'reviewer.julia', 'copyeditor.carla', 'assistant.rita', 'author.alex', 'reader.rosa'];
        const runs = [...roster.map((u) => [app.contextPath, u, `pk-${u.split('.')[0]}`]), [J, un('gone'), 'j-gone'], [J, un('kx'), 'j-kx'],
            [J, un('rd'), 'j-rd'], ['index', 'admin', 'site-admin'], [J, 'admin', 'j-admin'], [S.k, un('kx'), 'k-kx']];
        for (const [ctx, u, label] of runs) {
            const b = await browser();
            await go(b, cu(ctx, '/en/login'), `land-${label}-login`);
            const r = await submitLogin(b, u, pw(u), `land-${label}`);
            fact(`landing.${label}`, {who: u, at: ctx, ...r});
            await b.close();
        }
    });

    // ════════════════════════════════════════════════════════════════════════
    // resume — Rule 4 (A7; the held address; the explanatory sentence on OJS)
    // ════════════════════════════════════════════════════════════════════════
    if (on('resume')) await sect('resume', async () => {
        const R = {};
        for (const [label, addr] of [['bare', `/dashboard`], ['bare-en', `/en/dashboard`], ['bare-slash', `/en/dashboard/`]]) {
            const b = await browser();
            const c0 = CRASH.length;
            R[label] = await go(b, cu(J, addr), `resume-${label}`);
            R[label].crashes = CRASH.slice(c0).map((c) => c.what);
            await b.close();
        }
        const wf = `/en/dashboard/editorial?workflowSubmissionId=${S.sub}`;
        for (const [label, addr] of [['editorial', '/en/dashboard/editorial'], ['workflow', wf], ['settings', '/en/management/settings/context']]) {
            const b = await browser();
            const typed = await go(b, cu(J, addr), `resume-${label}-typed`);
            typed.aboveForm = flat(await b.page.locator('main .pkp_page_content > p, main .cmp_notification, main form#login').first().evaluate((e) => {
                const out = []; let n = e.closest('main') ? e.closest('main').querySelector('form#login') : null;
                if (n) { let p = n.previousElementSibling; while (p) { out.unshift(p.innerText); p = p.previousElementSibling; } }
                return out.join(' / ');
            }).catch(() => null), 400);
            let then = null;
            if (typed.loginForm) {
                then = await submitLogin(b, un('mg'), pw(un('mg')), `resume-${label}-signin`);
                if (label === 'workflow') {
                    await b.page.locator('[role="dialog"]').first().waitFor({timeout: 15_000}).catch(() => {});
                    await idle(b.page).catch(() => {}); await sleep(800);
                    const s = await snap(b.page, `resume-${label}-signin-dialog`);
                    then.dialog = flat(s.text && s.text.dialog, 300);
                }
            }
            R[label] = {typed, then};
            await b.close();
        }
        if (isOJS && S.l) {
            // a signed-out visitor on L's article: the galley link, as a reader presses it
            const b = await browser();
            const art = await go(b, cu(S.l, `/en/article/view/${S.lsub}`), 'resume-sub-article');
            const links = await b.page.locator('a.obj_galley_link, a.galley_link, .galleys_links a').evaluateAll((as) => as.map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href'), cls: a.className}))).catch(() => []);
            let pressed = null;
            if (links.length) {
                const d0 = b.docs.length;
                await Promise.all([b.page.waitForNavigation({timeout: T}).catch(() => {}), b.page.locator('a.obj_galley_link, a.galley_link, .galleys_links a').first().click()]);
                await b.page.waitForLoadState('load').catch(() => {}); await idle(b.page).catch(() => {}); await sleep(500);
                const s = await snap(b.page, 'resume-sub-galley');
                pressed = {...(await where(b.page, s)), docs: b.docs.slice(d0),
                    aboveForm: flat(await b.page.locator('main').evaluate((m) => { const f = m.querySelector('form#login'); const out = []; let p = f && f.previousElementSibling; while (p) { out.unshift(p.innerText); p = p.previousElementSibling; } return out.join(' / '); }).catch(() => null), 400)};
                if (pressed.loginForm) pressed.then = await submitLogin(b, `${t}la`, pw(`${t}la`), 'resume-sub-galley-signin');
            }
            R.subscription = {article: {url: art.url, status: art.status, main: art.main}, links, pressed};
            await b.close();
        }
        fact('resume', R);
    });

    // ════════════════════════════════════════════════════════════════════════
    // forced — Rule 11 (a reviewer's landing; the divert leaves the browser signed out; the site-level Login)
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
    async function flag(page, k) {
        const p = await openWizardUsers(page);
        const row = p.locator('tr.gridRow').filter({hasText: un(k)}).first();
        const next = row.locator('xpath=following-sibling::tr[1]');
        const link = next.locator('a').filter({hasText: /^\s*Edit User\s*$/}).first();
        if (!(await link.isVisible().catch(() => false))) await row.locator('a.show_extras').click();
        await link.waitFor({timeout: 8000});
        await link.click();
        const form = page.locator('form#userDetailsForm').last();
        await form.waitFor({timeout: T}); await idle(page); await sleep(700);
        await form.locator('input[name="mustChangePassword"]').check();
        await form.getByRole('button', {name: 'OK', exact: true}).click();
        await sleep(1500); await idle(page);
        return {formOpen: await form.isVisible().catch(() => false)};
    }
    async function completeChange(b, oldPw, newPw, name) {
        const cf = b.page.locator('form#loginChangePassword');
        if (!(await cf.count())) return {noForm: true, url: strip(b.page.url())};
        await cf.locator('input[name="oldPassword"]').evaluate((el) => el.removeAttribute('maxlength'));
        await cf.locator('input[name="oldPassword"]').fill(oldPw);
        for (const n of ['password', 'password2']) {
            const i = cf.locator(`input[name="${n}"]`).first();
            await i.evaluate((el) => el.removeAttribute('maxlength'));
            await i.fill(newPw);
        }
        const d0 = b.docs.length;
        await Promise.all([b.page.waitForNavigation({timeout: T}).catch(() => {}), cf.getByRole('button', {name: 'OK', exact: true}).click()]);
        await b.page.waitForLoadState('load').catch(() => {}); await idle(b.page).catch(() => {}); await sleep(800);
        const s = await snap(b.page, name);
        return {...(await where(b.page, s)), docs: b.docs.slice(d0)};
    }
    if (on('forced')) await sect('forced', async () => {
        const R = {};
        const target = isOPS ? 'se' : 'rv';
        {
            const a = await browser();
            await signIn(a.page, 'admin');
            R.flagTarget = await flag(a.page, target);
            R.flagFz = await flag(a.page, 'fz');
            await a.close();
        }
        const NW = (k) => `Nw-${k}-${t}`.slice(0, 30);
        {
            const b = await browser();
            await go(b, cu(J, '/en/login'), 'forced-j-login');
            R.divert = await submitLogin(b, un(target), pw(un(target)), 'forced-divert');
            // the browser right after the divert: J's dashboard typed
            R.dashboardAfterDivert = await go(b, cu(J, '/en/dashboard/editorial'), 'forced-dashboard-after-divert');
            // back to the form through its own address, then the change
            R.formAgain = await go(b, cu(J, `/en/login/changePassword/${un(target)}`), 'forced-form-again');
            R.completed = await completeChange(b, pw(un(target)), NW(target), 'forced-completed');
            await b.close();
        }
        {
            const b = await browser();
            await go(b, cu('index', '/en/login'), 'forced-site-login');
            R.siteDivert = await submitLogin(b, un('fz'), pw(un('fz')), 'forced-site-divert');
            R.siteCompleted = await completeChange(b, pw(un('fz')), NW('fz'), 'forced-site-completed');
            await b.close();
        }
        fact('forced', R);
    });

    // ════════════════════════════════════════════════════════════════════════
    // newrev — A5: "Create New Reviewer" {OJS OMP} flags the account it creates
    // ════════════════════════════════════════════════════════════════════════
    if (on('newrev') && !isOPS) await sect('newrev', async () => {
        const R = {};
        const b = await browser();
        const page = b.page;
        await signIn(page, un('mg'), {contextPath: J});
        await page.goto(cu(J, `/en/dashboard/editorial?workflowSubmissionId=${S.sub}`)); await idle(page);
        const modal = page.locator('[role="dialog"]').first();
        await modal.waitFor({timeout: T});
        const rm = page.locator('[data-cy="reviewer-manager"]').first();
        await rm.waitFor({timeout: T}).catch(() => {});
        await snap(page, 'newrev-review-stage');
        await rm.getByRole('button', {name: 'Add Reviewer'}).first().click();
        const addModal = page.locator('[data-cy="active-modal"]').last();
        const cnr = page.getByRole('link', {name: 'Create New Reviewer'}).last();
        await cnr.waitFor({timeout: T});
        await snap(page, 'newrev-add-reviewer');
        await cnr.click();
        const form = page.locator('form#createReviewerForm').last();
        await form.waitFor({timeout: T}); await idle(page); await sleep(800);
        R.formText = flat(await form.innerText().catch(() => null), 1500);
        R.formHasMustChangeBox = await form.locator('input[name="mustChangePassword"]').count();
        await snap(page, 'newrev-form');
        const ru = `${t}n${Math.random().toString(36).slice(2, 5)}`;
        await form.locator('input[name^="givenName"]').first().fill('Nora');
        await form.locator('input[name^="familyName"]').first().fill('Created').catch(() => {});
        await form.locator('input[name="username"]').fill(ru);
        await form.locator('input[name="email"]').fill(`${ru}@mail.test`);
        await addModal.frameLocator('iframe[id^="personalMessage"]').locator('body').filter({hasText: /\w/}).first().waitFor({timeout: 20_000}).catch(() => {});
        const since = new Date(Date.now() - 2000);
        await form.getByRole('button', {name: 'Add Reviewer'}).click();
        await sleep(2500); await idle(page);
        await snap(page, 'newrev-added');
        const msg = await app.mail.find({to: `${ru}@mail.test`, subject: 'Registration as Reviewer', since, timeoutMs: 30_000}).catch((e) => ({err: String(e.message).slice(0, 200)}));
        R.mail = {subject: msg && msg.Subject, err: msg && msg.err};
        R.allMail = (await app.mail.count({to: `${ru}@mail.test`, since}).catch(() => null));
        let gen = null;
        if (msg && msg.ID) {
            const full = await app.mail.fullMessage(msg.ID);
            const text = full.Text || (full.HTML || '').replace(/<[^>]+>/g, ' ');
            gen = (text.match(/Password:\s*(\S+)/) || [])[1];
            R.mailUsername = (text.match(/Username:\s*(\S+)/) || [])[1];
        }
        R.gotPassword = !!gen;
        await b.close();
        if (gen) {
            const c = await browser();
            await go(c, cu(J, '/en/login'), 'newrev-login');
            R.signIn = await submitLogin(c, ru, gen, 'newrev-signin');
            R.completed = await completeChange(c, gen, `Nw-nr-${t}`.slice(0, 30), 'newrev-completed');
            await c.close();
        }
        fact('newrev', R);
    });

    // ════════════════════════════════════════════════════════════════════════
    // imp — Rules 13 (the avatars), 15 ("elsewhere", the typed sign-out address), A4 (Login As while impersonating)
    // ════════════════════════════════════════════════════════════════════════
    const userNav = (page) => page.locator('[data-cy="app-user-nav"]').last();
    async function readMenu(page, name) {
        const nav = userNav(page);
        if (!(await nav.count())) return {absent: true};
        const btn = nav.locator('> button').first();
        const avatars = await btn.evaluate((bt) => [...bt.querySelectorAll('div')].filter((d) => /rounded-full|h-8|h-6/.test(d.className) && d.getClientRects().length)
            .map((d) => { const cs = getComputedStyle(d); return {text: d.innerText.trim(), cls: d.className, bg: cs.backgroundColor, color: cs.color, opacity: cs.opacity}; })).catch((e) => String(e.message));
        await btn.click();
        await nav.locator('nav').waitFor({timeout: 8000}).catch(() => {});
        await sleep(300);
        const menu = flat(await nav.locator('nav').innerText().catch(() => null), 600);
        const links = await nav.locator('nav a').evaluateAll((as) => as.map((a) => `${a.innerText.replace(/\s+/g, ' ').trim()} -> ${(a.getAttribute('href') || '').replace(/^https?:\/\/127\.0\.0\.1:\d+/, '')}`)).catch(() => []);
        await snap(page, name, {menu, links});
        await btn.click().catch(() => {});
        await sleep(300);
        return {button: flat(await btn.innerText().catch(() => null), 120), avatars, menu, links};
    }
    async function usersList(page) {
        const {UsersListPage} = require('../../../pages/UsersManagementPages.js');
        const list = new UsersListPage(page, J);
        await list.goto(); await idle(page);
        return list;
    }
    async function loginAsFromList(page, email, name) {
        const list = await usersList(page);
        const row = list.row(email);
        const labels = await list.menuLabels(row);
        if (!labels.includes('Login As')) return {labels};
        await list.chooseAction(row, 'Login As');
        const confirm = page.getByRole('dialog').filter({hasText: 'Log in as this user?'}).last();
        await confirm.waitFor({timeout: 15_000});
        await Promise.all([page.waitForNavigation({timeout: T}).catch(() => {}), confirm.getByRole('button', {name: 'OK', exact: true}).click()]);
        await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {}); await sleep(1200);
        const s = await snap(page, name);
        return {labels, landed: {url: strip(page.url()), h1: await h1(page), main: flat(s.text && s.text.main, 200)}};
    }
    async function pressLogoutAs(b, name) {
        const page = b.page;
        const nav = userNav(page);
        await nav.locator('> button').first().click(); await sleep(300);
        const lo = nav.locator('nav').getByRole('link', {name: /^Logout as/}).first();
        const href = await lo.getAttribute('href').catch(() => null);
        const d0 = b.docs.length;
        await Promise.all([page.waitForNavigation({timeout: T}).catch(() => {}), lo.click()]);
        await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {}); await sleep(1000);
        const s = await snap(page, name);
        return {href: strip(href || ''), ...(await where(page, s)), docs: b.docs.slice(d0)};
    }
    if (on('imp')) await sect('imp', async () => {
        const R = {};
        // 1. admin › Login As mg; the avatars; A4 on Users & Roles and on the Participants panel
        {
            const b = await browser();
            const page = b.page;
            await signIn(page, 'admin', {contextPath: J});
            await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {});
            await userNav(page).locator('> button').first().waitFor({timeout: T}).catch(() => {});
            R.adminOwn = await readMenu(page, 'imp-admin-own-menu');
            R.asMg = await loginAsFromList(page, S.u.mg.email, 'imp-as-mg');
            R.asMgMenu = await readMenu(page, 'imp-as-mg-menu');
            // the Participants panel of S while wearing mg
            await page.goto(cu(J, `/en/dashboard/editorial?workflowSubmissionId=${S.sub}`)); await idle(page);
            const panel = page.locator('[data-cy="participant-manager"]').last();
            await panel.waitFor({timeout: 20_000}).catch(() => {});
            await idle(page); await sleep(600);
            await snap(page, 'imp-as-mg-workflow');
            const more = panel.getByRole('button', {name: `${S.u.au.name} More Actions`, exact: true});
            R.panelAuMore = await more.count();
            if (R.panelAuMore) {
                await more.first().click();
                await page.getByRole('menuitem').first().waitFor({timeout: 10_000}).catch(() => {});
                R.panelAuMenu = await page.getByRole('menuitem').evaluateAll((els) => els.map((e) => e.textContent.trim().replace(/\s+/g, ' '))).catch(() => null);
                await snap(page, 'imp-as-mg-panel-au-menu');
                await more.first().click().catch(() => {});
                await sleep(400);
            }
            R.panelFirst = flat(await panel.locator('li').first().innerText().catch(() => null), 120);
            // Users & Roles while wearing mg: the offer, then its use (the second impersonation)
            R.second = await loginAsFromList(page, S.u.au.email, 'imp-second-as-au');
            R.secondMenu = await readMenu(page, 'imp-second-menu');
            if (R.secondMenu.links && R.secondMenu.links.some((l) => /^Logout as/.test(l))) {
                R.secondBack = await pressLogoutAs(b, 'imp-second-back');
                R.secondBackMenu = await readMenu(page, 'imp-second-back-menu');
            }
            await b.close();
        }
        // 2. admin › Login As au; "Logout as" pressed from a page that is not a workflow screen (au's profile)
        {
            const b = await browser();
            const page = b.page;
            await signIn(page, 'admin', {contextPath: J});
            R.asAu = await loginAsFromList(page, S.u.au.email, 'imp-as-au');
            await page.goto(cu(J, '/en/user/profile')); await idle(page); await sleep(500);
            await snap(page, 'imp-as-au-profile');
            R.elsewhereBack = await pressLogoutAs(b, 'imp-elsewhere-back');
            R.elsewhereBackMenu = await readMenu(page, 'imp-elsewhere-back-menu');
            await b.close();
        }
        // 3. admin › the copied "Logout" address; Login As au; the address typed
        {
            const b = await browser();
            const page = b.page;
            await signIn(page, 'admin', {contextPath: J});
            await page.goto(cu(J, '/en/dashboard/editorial')); await idle(page);
            const nav = userNav(page);
            await nav.locator('> button').first().click(); await sleep(300);
            const lo = nav.getByRole('link', {name: 'Logout', exact: true});
            R.copiedLogout = strip(await lo.getAttribute('href').catch(() => null));
            await nav.locator('> button').first().click().catch(() => {}); await sleep(300);
            R.asAu2 = await loginAsFromList(page, S.u.au.email, 'imp-as-au-2');
            R.typedSignOut = await go(b, app.url(R.copiedLogout.startsWith('/') ? R.copiedLogout : `/${R.copiedLogout}`), 'imp-typed-signout');
            R.afterTypedUsers = await go(b, cu(J, '/en/management/settings/access'), 'imp-typed-signout-users');
            R.afterTypedAuDash = await go(b, cu(J, '/en/dashboard/mySubmissions'), 'imp-typed-signout-mysubs');
            await b.close();
        }
        fact('imp', R);
    });

    // ════════════════════════════════════════════════════════════════════════
    // denied — Rule 17 / Actors row "See the access-denied page", per level; the sentence on other screens
    // ════════════════════════════════════════════════════════════════════════
    if (on('denied')) await sect('denied', async () => {
        const who = isOPS ? ['sectioneditor.ana', 'assistant.rita', 'author.alex'] : ['sectioneditor.ana', 'reviewer.julia', 'assistant.rita', 'author.alex'];
        for (const u of who) {
            const b = await browser();
            await signIn(b.page, u, {contextPath: app.contextPath}); await idle(b.page).catch(() => {});
            const k = u.split('.')[0];
            const D = {landed: strip(b.page.url())};
            D.site = await go(b, cu('index', '/en/admin/index'), `den-${k}-site`);
            D.journal = await go(b, cu(app.contextPath, '/en/management/settings/context'), `den-${k}-journal`);
            fact(`denied.${k}`, D);
            await b.close();
        }
        const b = await browser();
        await signIn(b.page, un('au2'), {contextPath: J});
        const D = {landed: strip(b.page.url())};
        D.authorDash = await go(b, cu(J, `/en/authorDashboard/submission/${S.sub}`), 'den-au2-authordash');
        D.workflowAccess = await go(b, cu(J, `/en/workflow/access/${S.sub}`), 'den-au2-workflow');
        D.editorialList = await go(b, cu(J, '/en/dashboard/editorial'), 'den-au2-editorial');
        D.wfDialog = await go(b, cu(J, `/en/dashboard/mySubmissions?workflowSubmissionId=${S.sub}`), 'den-au2-mysubs-wf');
        fact('denied.au2', D);
        await b.close();
    });

    for (const x of OPEN) await x.close().catch(() => {});
    fact('crashes.all', CRASH);
});
