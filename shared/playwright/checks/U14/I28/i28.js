// U14 claim check, chunk I28 (housekeeping 2026-09-28): the incidental rows for reader comments & moderation.
// Chunk: .reports/hk28/chunks/U14.md —
//   L71  the Comments page (Settings › Comments, …/management/settings/userComments): the browser title is the
//        journal name alone, where the Settings pages read "{heading} | {journal}" (U07 Rule 3).
//   A9   the U23 claim check's question: is the "Error" dialog a Site Administrator with Reader as the only journal
//        role gets over the Comments page the page's own, or the editorial screens' (the side menu's counts)?
// Spec: docs/specs/U14-reader-comments-and-moderation.md — Rule 10, Rule 17, A9 (fn-m, f-a9).
//
//   PROBE_FEATURE=U14 PROBE_AGENT=ccI28 RUN=1 node bin/probe.js <ojs|omp|ops|all> shared/playwright/checks/U14/I28/i28.js
//   PHASES=title,a9 (default: both, in that order: a9 ends admin's manager role in the run's scratch context C).
//   RUN names the facts file (i28-facts-run<RUN>) and prefixes every snapshot (r<RUN>-…); every run seeds its own
//   scratch contexts (tag prefix u14i28).
//
// Scratch contexts per app and run:
//   C  public comments on; a Journal Manager (mg), a Journal/Press Editor (ed, OJS and OMP: OPS has no second
//      manager-level role), two readers, an author; admin seeded with Reader beside the auto-enrolled manager role;
//      one published submission with a pending comment and an approved, reported one.
//   D  public comments off (the install default); a Journal Manager (mg): the other end of the setting.
// publicknowledge and the roster users are read only. No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const RUN = process.env.RUN || '1';
const PHASES = (process.env.PHASES || 'title,a9').split(',');
const on = (p) => PHASES.includes(p);
const T0 = Date.now();
const log = (...a) => console.log(`[u14i28 r${RUN} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const DENIED = /The current role does not have access to this operation/;

forEachApp(async (app) => {
    const isOPS = app.name === 'ops';
    const statePath = path.join(outDir(), `i28-state-r${RUN}-${app.name}.json`);
    const S = fs.existsSync(statePath) && process.env.RESEED !== '1' ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`i28-facts-run${RUN}`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const strip = (u) => (u || '').replace(/^https?:\/\/127\.0\.0\.1:\d+/, '').replace(/csrfToken=[^&]+/, '');
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);

    await app.api.bootstrapProbe(app.contextPath);
    const {page, close} = await launch(app);
    const jsDialogs = [];
    page.on('dialog', (d) => { jsDialogs.push({type: d.type(), message: d.message().slice(0, 300), url: strip(page.url())}); d.accept().catch(() => {}); });
    const traffic = [];
    page.context().on('response', (r) => {
        const u = r.url();
        if (r.status() >= 400 || /\/api\/v1\//.test(u)) traffic.push({at: Date.now(), m: r.request().method(), s: r.status(), u: strip(u).replace(/^\/index\.php\//, '')});
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push({at: Date.now(), msg: String(e.message).slice(0, 300)}));
    const mark = () => Date.now();
    const since = (t0) => traffic.filter((x) => x.at >= t0 && !/_i18n/.test(x.u))
        .map((x) => `+${x.at - t0}ms ${x.m} ${x.s} ${x.u.replace(/assignedWithRoles%5B%5D=/g, 'r=').slice(0, 200)}`);
    const errsSince = (t0) => errors.filter((e) => e.at >= t0).map((e) => e.msg);

    async function snap(name, extra = {}, {png = false} = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        Object.assign(s, extra);
        record(`r${RUN}-${name}`, s);
        if (png) await shot(page, `r${RUN}-${name}`).catch(() => {});
        return s;
    }
    async function sect(name, fn) {
        log(`== ${name}`);
        try { return await fn(); } catch (e) {
            log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | '));
            fact(`${name}.FAILED`, String(e.message || e).slice(0, 600));
            await snap(`zz-failed-${name}`, {}, {png: true}).catch(() => {});
            return null;
        }
    }
    const as = async (user, ctx) => { await signIn(page, user, ctx ? {contextPath: ctx} : {}); await idle(page).catch(() => {}); };
    const visiblePanel = () => page.locator('main [role="tabpanel"]:visible');
    const errorDialog = () => page.locator('[role="dialog"]:visible').filter({hasText: /^\s*Error/});

    /** Open an address and read it as data: the tab title, the heading, the dialog, the traffic. */
    async function readPage(name, url, {png = false, commentsTable = false, dialogWait = 6000} = {}) {
        const t0 = mark();
        const r = await page.goto(url).catch((e) => ({err: String(e.message).slice(0, 200)}));
        await idle(page).catch(() => {});
        if (commentsTable) {
            await page.locator('main [role="tabpanel"]:visible tbody tr').first().waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
            await page.locator('main [role="tabpanel"]:visible tbody tr').filter({hasText: 'Loading'}).first().waitFor({state: 'hidden', timeout: 15_000}).catch(() => {});
        }
        // a late dialog (a failed request answered after idle) is part of the screen
        let dialogAt = null;
        await errorDialog().first().waitFor({state: 'visible', timeout: dialogWait}).then(() => { dialogAt = mark() - t0; }).catch(() => {});
        const s = await snap(name, {}, {png});
        const o = {
            url: strip(page.url()),
            httpStatus: r && typeof r.status === 'function' ? r.status() : (r && r.err) || null,
            title: await page.title(),
            h1: flat(await page.locator('main h1, #app-main h1, h1').first().innerText({timeout: 3000}).catch(() => null), 200),
            breadcrumb: flat(await page.locator('nav[aria-label="Breadcrumb"], .pkp_structure_head .app__breadcrumb, [class*="readcrumb"]').first().innerText({timeout: 1000}).catch(() => null), 200),
            dialog: flat(s.text && s.text.dialog, 300),
            errorDialogs: await errorDialog().count(),
            dialogAtMs: dialogAt,
            denied: DENIED.test(await page.locator('body').innerText().catch(() => '')) && !(await errorDialog().count()),
            traffic: since(t0),
            pageErrors: errsSince(t0),
        };
        if (commentsTable) o.rows = await page.locator('main [role="tabpanel"]:visible tbody tr').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 120))).catch(() => []);
        return o;
    }

    // ============================================================ seed
    async function seed() {
        const c = tag('u14i28c');
        const users = [
            {username: `${c}mg`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
            {username: `${c}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
            {username: `${c}rd`, roles: ['reader'], givenName: 'Rita', familyName: 'Reader'},
            {username: `${c}rd2`, roles: ['reader'], givenName: 'Rob', familyName: 'Readertwo'},
            // admin is auto-enrolled as a manager; a second role lets the manager role be ended on its own edit page
            {username: 'admin', roles: ['reader']},
        ];
        if (!isOPS) users.push({username: `${c}ed`, roles: ['editor'], givenName: 'Eve', familyName: 'Editor'});
        S.C = await app.api.createContext({tag: c, enablePublicComments: true, users});
        S.C.tag = c;
        S.C.sub = await app.api.createSubmission({
            tag: `${c}s`, context: c, submitter: `${c}au`, published: true, title: `I28 article ${c}`,
            userComments: [
                {user: `${c}rd`, text: `I28 pending comment ${c}.`},
                {user: `${c}rd2`, text: `I28 approved comment ${c}.`, approved: true, reports: [{user: `${c}rd`, note: `I28 report ${c}.`}]},
            ],
        });
        const d = tag('u14i28d');
        S.D = await app.api.createContext({tag: d, users: [{username: `${d}mg`, roles: ['manager'], givenName: 'Dora', familyName: 'Manager'}]});
        S.D.tag = d;
        save();
        fact('seed', {C: {tag: c, path: S.C.path, name: S.C.name, id: S.C.id, submissionId: S.C.sub.submissionId, comments: S.C.sub.userComments},
            D: {tag: d, path: S.D.path, name: S.D.name}});
    }

    try {
        if (!S.C) await seed();
        const C = S.C.path || S.C.tag, D = S.D.path || S.D.tag;
        const commentIds = (S.C.sub.userComments || []).map((x) => x.id);

        // ============================================================ title (L71)
        if (on('title')) {
            await sect('titleManager', async () => {
                const o = {ctx: C};
                await as(`${S.C.tag}mg`, C);
                o.landing = strip(page.url());
                o.landingTitle = await page.title();
                // the side menu's Content › Comments, as a manager would reach it
                await page.goto(cu(C, '/en/dashboard/editorial')); await idle(page).catch(() => {});
                o.dashboard = {title: await page.title(), h1: flat(await page.locator('main h1').first().innerText({timeout: 3000}).catch(() => null), 120)};
                await snap('t01-dashboard');
                const nav = page.getByRole('navigation', {name: 'Site Navigation'});
                const contentHdr = nav.locator('[role="button"][aria-controls]').filter({hasText: /^\s*Content\s*$/}).first();
                o.contentHeader = await contentHdr.count();
                if (o.contentHeader) {
                    await contentHdr.click(); await sleep(400);
                    const t0 = mark();
                    await nav.locator('[role="treeitem"]').filter({hasText: /^\s*Comments\s*$/}).first().click();
                    await page.waitForURL(/userComments/, {timeout: T}).catch(() => {});
                    await idle(page).catch(() => {});
                    await page.locator('main [role="tabpanel"]:visible tbody tr').filter({hasText: 'Loading'}).first().waitFor({state: 'hidden', timeout: 15_000}).catch(() => {});
                    const s = await snap('t02-comments-from-menu', {}, {png: true});
                    o.fromMenu = {url: strip(page.url()), title: await page.title(), h1: flat(await page.locator('main h1').first().innerText().catch(() => null), 120),
                        traffic: since(t0), mainText: flat(s.text && s.text.main, 600)};
                    await loc(page, 'Comments page: the page heading (main h1)', page.locator('main h1'));
                }
                // by its address, then each tab, a panel, a reload
                o.byAddress = await readPage('t03-comments-by-address', cu(C, '/en/management/settings/userComments'), {commentsTable: true});
                o.tabs = {};
                for (const t of ['Approved', 'Hidden/Needs Approval', 'Reported', 'All']) {
                    await page.getByRole('tab', {name: t, exact: true}).click().catch(() => {});
                    await idle(page).catch(() => {}); await sleep(600);
                    o.tabs[t] = {title: await page.title(), url: strip(page.url())};
                }
                await snap('t04-comments-after-tabs');
                if (commentIds.length) {
                    o.panel = await readPage('t05-comments-panel-open', cu(C, `/en/management/settings/userComments?commentId=${commentIds[0]}#all`), {commentsTable: true, dialogWait: 1500});
                    o.panel.panelHeading = flat(await page.locator('[role="dialog"]:visible').filter({hasText: 'View comment details by'}).first().innerText({timeout: 5000}).catch(() => null), 120);
                }
                o.reload = await readPage('t06-comments-reload', cu(C, '/en/management/settings/userComments#reported'), {commentsTable: true, dialogWait: 1500});
                // the other editorial pages of the same side menu, for the title each carries
                const others = [['context', '/en/management/settings/context'], ['website', '/en/management/settings/website'],
                    ['workflow', '/en/management/settings/workflow'], ['distribution', '/en/management/settings/distribution'],
                    ['access', '/en/management/settings/access'], ['announcements', '/en/management/settings/announcements'],
                    ['institutions', '/en/management/settings/institutions'], ['manageEmails', '/en/management/settings/manageEmails']];
                o.others = {};
                for (const [k, p] of others) {
                    const r = await readPage(`t07-${k}`, cu(C, p), {dialogWait: 800});
                    o.others[k] = {title: r.title, h1: r.h1, httpStatus: r.httpStatus, url: r.url};
                }
                // the Website page's Content › Comments tab: the settings side of the feature
                await page.goto(cu(C, '/en/management/settings/website#content')); await idle(page).catch(() => {});
                await page.getByRole('tab', {name: 'Comments', exact: true}).first().click().catch(() => {}); await sleep(500);
                await snap('t08-website-content-comments');
                o.websiteCommentsTab = {title: await page.title(), url: strip(page.url())};
                // the frontend's title rule, for the context's own name
                await page.goto(cu(C, '/en/about')); await idle(page).catch(() => {});
                o.frontendAbout = {title: await page.title(), header: flat(await page.locator('.pkp_site_name, header').first().innerText().catch(() => null), 120)};
                // leaving the Comments page with a tab switched and a panel open: what asks on the way out
                await page.goto(cu(C, '/en/management/settings/userComments')); await idle(page).catch(() => {});
                await page.getByRole('tab', {name: 'Reported', exact: true}).click().catch(() => {}); await sleep(500);
                const d0 = jsDialogs.length;
                await page.goto(cu(C, '/en/management/settings/context')); await idle(page).catch(() => {});
                o.leave = {dialogs: jsDialogs.slice(d0), url: strip(page.url())};
                fact('titleManager', o);
                await signOut(page).catch(() => {});
            });

            if (!isOPS) await sect('titleEditor', async () => {
                await as(`${S.C.tag}ed`, C);
                const o = {landing: strip(page.url())};
                o.comments = await readPage('t10-editor-comments', cu(C, '/en/management/settings/userComments'), {commentsTable: true, dialogWait: 1500});
                o.context = await readPage('t11-editor-context', cu(C, '/en/management/settings/context'), {dialogWait: 800});
                fact('titleEditor', o);
                await signOut(page).catch(() => {});
            });

            await sect('titleOff', async () => {
                await as(`${S.D.tag}mg`, D);
                const o = {ctx: D};
                o.comments = await readPage('t20-off-comments-by-address', cu(D, '/en/management/settings/userComments'), {commentsTable: true, dialogWait: 1500, png: true});
                o.contentHeader = await page.getByRole('navigation', {name: 'Site Navigation'}).locator('[role="button"][aria-controls]').filter({hasText: /^\s*Content\s*$/}).count();
                o.context = await readPage('t21-off-context', cu(D, '/en/management/settings/context'), {dialogWait: 800});
                fact('titleOff', o);
                await signOut(page).catch(() => {});
            });
        }

        // ============================================================ A9
        async function endOwnManagerRole(ctx) {
            const rem = {};
            await page.goto(cu(ctx, '/en/management/settings/access')); await idle(page).catch(() => {});
            const table = page.locator('table').filter({hasText: /\badmin\b/}).first();
            await table.waitFor({state: 'visible', timeout: T}).catch(() => {});
            const adminRow = table.locator('tr').filter({hasText: /\badmin\b/}).first();
            await adminRow.locator('button').last().click().catch(() => {}); await idle(page).catch(() => {});
            await page.getByRole('menuitem', {name: /^Edit$/}).first().click().catch(() => {});
            await page.waitForURL(/management\/settings\/user\/\d+/, {timeout: T}).catch(() => {});
            await idle(page).catch(() => {});
            await page.getByRole('button', {name: /Remove Role/i}).first().waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
            rem.rolesBefore = await page.locator('tr').filter({has: page.getByRole('button', {name: /Remove Role/i})}).evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
            const roleRow = page.locator('tr').filter({hasText: /manager/i}).filter({has: page.getByRole('button', {name: /Remove Role/i})}).first();
            if (await roleRow.count()) {
                await roleRow.getByRole('button', {name: /Remove Role/i}).click(); await idle(page).catch(() => {});
                const dlg = page.locator('[role="dialog"]:visible').filter({hasText: /Remove Role/i}).last();
                await dlg.waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
                const t0 = mark();
                await dlg.getByRole('button', {name: /^Remove Role$/i}).click().catch(() => {});
                await idle(page).catch(() => {}); await sleep(1200);
                rem.traffic = since(t0);
            } else rem.noManagerRow = true;
            rem.rolesAfter = await page.locator('tr').filter({has: page.getByRole('button', {name: /Remove Role/i})}).evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
            return rem;
        }
        // Every editorial address the Reader-only administrator might open, the Comments page first; the dialog's
        // presence on pages that are not the Comments page says whose it is.
        const A9_PAGES = [
            ['comments', '/en/management/settings/userComments', {commentsTable: true}],
            ['context', '/en/management/settings/context', {}],
            ['website', '/en/management/settings/website', {}],
            ['announcements', '/en/management/settings/announcements', {}],
            ['access', '/en/management/settings/access', {}],
            ['dashboard', '/en/dashboard/editorial', {}],
            ['statsArticles', '/en/stats/publications/publications', {}],
            ['tools', '/en/management/tools', {}],
            ['home', '', {}],
        ];
        if (on('a9')) await sect('a9', async () => {
            const o = {ctx: C};
            await as('admin', C);
            o.controlLanding = strip(page.url());
            o.control = {};
            for (const [k, p, opt] of A9_PAGES.slice(0, 3)) o.control[k] = await readPage(`a01-mgr-${k}`, cu(C, p), {...opt, dialogWait: 2500});
            o.remove = await endOwnManagerRole(C);
            await snap('a02-admin-roles-after-remove');
            await signOut(page).catch(() => {});
            await as('admin', C);
            o.freshLanding = strip(page.url());
            o.freshLandingTitle = await page.title();
            await snap('a03-fresh-landing');
            o.reader = {};
            for (const [k, p, opt] of A9_PAGES) {
                o.reader[k] = await readPage(`a1-${k}`, cu(C, p), {...opt, png: ['comments', 'context', 'dashboard'].includes(k), dialogWait: 8000});
                o.reader[k].sideNavGroups = await page.getByRole('navigation', {name: 'Site Navigation'}).locator('[role="button"][aria-controls]').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
            }
            await loc(page, 'A9: the "Error" dialog over an editorial page', errorDialog());
            // the Comments page again: the dialog's "OK", then what the page offers the Reader-only administrator
            const cp = await readPage('a20-comments-again', cu(C, '/en/management/settings/userComments'), {commentsTable: true, dialogWait: 8000});
            o.sweep = {before: {errorDialogs: cp.errorDialogs, rows: cp.rows, title: cp.title}};
            const ok = errorDialog().getByRole('button', {name: 'OK', exact: true});
            if (await ok.count()) {
                const t0 = mark();
                await ok.first().click(); await idle(page).catch(() => {}); await sleep(600);
                o.sweep.afterOk = {errorDialogs: await errorDialog().count(), traffic: since(t0)};
                await snap('a21-comments-after-ok', {}, {png: true});
            }
            // a tab, then the pending comment's panel from its row menu, "Approve Comment"
            {
                const t0 = mark();
                await page.getByRole('tab', {name: 'Hidden/Needs Approval', exact: true}).click().catch(() => {});
                await idle(page).catch(() => {}); await sleep(800);
                await page.locator('main [role="tabpanel"]:visible tbody tr').filter({hasText: 'Loading'}).first().waitFor({state: 'hidden', timeout: 15_000}).catch(() => {});
                o.sweep.hiddenTab = {rows: await visiblePanel().locator('tbody tr').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 100))).catch(() => []),
                    errorDialogs: await errorDialog().count(), traffic: since(t0)};
                await snap('a22-comments-hidden-tab');
            }
            const row = visiblePanel().locator('tbody tr').filter({hasText: 'I28 pending comment'}).first();
            if (await row.count()) {
                await row.locator('button').last().click().catch(() => {}); await sleep(400);
                o.sweep.rowMenu = await page.getByRole('menuitem').evaluateAll((els) => els.map((e) => e.innerText.trim())).catch(() => []);
                await page.getByRole('menuitem', {name: 'View Comment'}).first().click().catch(() => {});
                const panel = page.getByRole('dialog', {name: /^View comment details by/});
                await panel.waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
                await idle(page).catch(() => {});
                await snap('a23-comment-panel');
                o.sweep.panel = {open: await panel.count(), buttons: await panel.getByRole('button').evaluateAll((els) => els.map((b) => `${b.innerText.trim()}${b.disabled ? ' (disabled)' : ''}`)).catch(() => [])};
                const approve = panel.getByRole('button', {name: 'Approve Comment', exact: true});
                if (await approve.count() && await approve.isEnabled().catch(() => false)) {
                    const t0 = mark();
                    await approve.click(); await idle(page).catch(() => {}); await sleep(1500);
                    const s = await snap('a24-after-approve');
                    o.sweep.approve = {traffic: since(t0), notices: s.notices, errorDialogs: await errorDialog().count(), panelOpen: await panel.count()};
                }
            }
            // the same account after the dialog: a reload of Settings › Journal once more (a second read of the dialog there)
            o.contextAgain = await readPage('a25-context-again', cu(C, '/en/management/settings/context'), {dialogWait: 8000});
            o.dialogs = jsDialogs.slice();
            fact('a9', o);
            await signOut(page).catch(() => {});
        });
        fact('end', {crashes: traffic.filter((x) => x.s >= 500).map((x) => `${x.m} ${x.s} ${x.u.slice(0, 160)}`), pageErrors: errors.map((e) => e.msg), dialogs: jsDialogs});
    } finally {
        save();
        await close();
    }
});
