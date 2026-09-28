// U23 claim check, chunk I28 (housekeeping 2026-09-28): the incidental rows for the editorial dashboard.
// Chunk: .reports/hk28/chunks/U23.md — incidentals L42 (the pager's "Next" name), L90 and L123 (a Site
// Administrator whose remaining role in the journal is Reader, or who holds no manager role there).
// Spec: docs/specs/U23-submissions-dashboard.md — Actors table (rows "Open the editorial dashboard", "See a
// submission listed"), Rule 5 (pager controls), fn-a, fn-d, fn-f.
//
//   PROBE_FEATURE=U23 PROBE_AGENT=ccI28 RUN=1 node bin/probe.js <ojs|omp|ops|all> shared/playwright/checks/U23/I28/i28.js
//   PHASES=pager,admin (default: both). RUN names the facts file (i28-facts-run<RUN>) and prefixes every snapshot
//   (r<RUN>-…), so two runs sit side by side; every run seeds its own scratch contexts (tag prefix u23i28).
//
// Scratch contexts per app and run:
//   P  a Journal Manager (mg), an author (au), 31 submitted submissions: the pager on "Active submissions".
//   R  admin seeded with Reader beside the auto-enrolled manager role; 2 submissions. The manager role is ended on
//      the admin's own Users & Roles › Edit page ("Remove Role"), then the dashboard is read in the same session
//      and after a fresh sign-in.
//   E  admin seeded with Section Editor beside the manager role; 2 submissions, admin a participant (as Section
//      Editor) on one; the manager role ended the same way: the "no manager role, but an editorial one" end.
// publicknowledge and the roster users are read only. No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const RUN = process.env.RUN || '1';
const PHASES = (process.env.PHASES || 'pager,admin').split(',');
const on = (p) => PHASES.includes(p);
const T0 = Date.now();
const log = (...a) => console.log(`[i28 r${RUN} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const DENIED = /The current role does not have access to this operation/;

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs', isOMP = app.name === 'omp';
    const statePath = path.join(outDir(), `i28-state-r${RUN}-${app.name}.json`);
    const S = fs.existsSync(statePath) && process.env.RESEED !== '1' ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`i28-facts-run${RUN}`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };
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
    const requests = [];
    page.on('request', (r) => { if (/_submissions/.test(r.url())) requests.push({at: Date.now(), m: r.method(), u: strip(r.url()).replace(/^\/index\.php\//, '').replace(/assignedWithRoles%5B%5D=/g, 'r=').slice(0, 200)}); });
    const reqSince = (t0) => requests.filter((x) => x.at >= t0).map((x) => `${x.m} ${x.u}`);
    const errors = [];
    page.on('pageerror', (e) => errors.push({at: Date.now(), msg: String(e.message).slice(0, 300)}));
    const mark = () => Date.now();
    const since = (t0, re = /_submissions|\/api\/v1\/(?!_i18n)/) => traffic.filter((x) => x.at >= t0 && (x.s >= 400 || re.test(x.u))).map((x) => `${x.m} ${x.s} ${x.u.replace(/assignedWithRoles%5B%5D=/g, 'r=').slice(0, 220)}`);
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
    const go = async (url) => { const r = await page.goto(url).catch((e) => ({err: String(e.message).slice(0, 200)})); await idle(page).catch(() => {}); return r; };

    /** The dashboard as data: heading, rows, the sidebar's Editor Dashboard group, an open dialog. */
    async function readDashboard() {
        const out = {url: strip(page.url())};
        out.h1 = flat(await page.locator('main h1, #app-main h1').first().innerText({timeout: 5000}).catch(() => null), 200);
        out.rows = await page.locator('main table tbody tr').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 140))).catch(() => []);
        out.sideNav = flat(await page.locator('#app-nav').innerText({timeout: 3000}).catch(() => null), 1200);
        out.dialog = flat(await page.locator('[role="dialog"]:visible').last().innerText({timeout: 1500}).catch(() => null), 400);
        out.denied = DENIED.test(await page.locator('body').innerText().catch(() => ''));
        return out;
    }

    // ============================================================ seed
    async function seedP() {
        const p = tag('u23i28p');
        S.P = await app.api.createContext({tag: p, users: [{username: `${p}mg`, roles: ['manager'], givenName: 'Mara', familyName: 'Manager'},
            {username: `${p}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'}]});
        S.P.tag = p;
        const titles = Array.from({length: 31}, (u, i) => `row${String(i + 1).padStart(2, '0')} ${p}`);
        for (let i = 0; i < titles.length; i += 4) {
            await Promise.all(titles.slice(i, i + 4).map((title, j) => app.api.createSubmission({tag: `${p}s${i + j}`, context: p, submitter: `${p}au`, title})));
        }
        save();
    }
    async function seedAdm(key, role) {
        const t = tag(`u23i28${key.toLowerCase()}`);
        const users = [{username: `${t}mg`, roles: ['manager'], givenName: 'Mara', familyName: 'Manager'},
            {username: `${t}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
            {username: 'admin', roles: [role]}];
        S[key] = await app.api.createContext({tag: t, users});
        S[key].tag = t;
        S[key].subs = [];
        S[key].subs.push(await app.api.createSubmission({tag: `${t}a`, context: t, submitter: `${t}au`, title: `First ${t}`,
            participants: key === 'E' ? [{username: 'admin', role: 'sectionEditor'}] : undefined}));
        S[key].subs.push(await app.api.createSubmission({tag: `${t}b`, context: t, submitter: `${t}au`, title: `Second ${t}`}));
        save();
    }

    try {
        // ============================================================ pager (L42)
        if (on('pager')) await sect('pager', async () => {
            if (!S.P) await seedP();
            const C = S.P.path || S.P.tag;
            const o = {ctx: C};
            await as(`${S.P.tag}mg`, C);
            o.landing = strip(page.url());
            await go(cu(C, '/en/dashboard/editorial'));
            // open "Active submissions" from the sidebar, as a manager would
            const link = page.locator('#app-nav a').filter({has: page.getByText('Active submissions', {exact: true})}).first();
            let t0 = mark();
            await link.click();
            await idle(page); await sleep(800);
            o.openActive = since(t0);
            const nav = page.locator('nav.pkpPagination');
            await nav.first().waitFor({state: 'visible', timeout: T}).catch(() => {});
            const readPager = async () => ({
                navCount: await nav.count(),
                navAriaLabel: await nav.first().getAttribute('aria-label').catch(() => null),
                aria: await nav.first().ariaSnapshot({timeout: 5000}).catch((e) => `err ${String(e.message).slice(0, 80)}`),
                buttons: await nav.first().locator('button').evaluateAll((els) => els.map((b) => ({text: b.innerText.trim(), ariaLabel: b.getAttribute('aria-label'), ariaCurrent: b.getAttribute('aria-current'), disabled: b.disabled}))).catch(() => []),
                around: flat(await nav.first().locator('xpath=..').innerText().catch(() => null), 300),
                byName: {
                    goToNext: await page.getByRole('button', {name: 'Go to Next', exact: true}).count(),
                    next: await page.getByRole('button', {name: 'Next', exact: true}).count(),
                    goToPrevious: await page.getByRole('button', {name: 'Go to Previous', exact: true}).count(),
                    goToPage2: await page.getByRole('button', {name: 'Go to Page 2', exact: true}).count(),
                },
                url: strip(page.url()),
                h1: flat(await page.locator('main h1').first().innerText().catch(() => null), 120),
                rowCount: await page.locator('main table tbody tr').count(),
                firstRow: flat(await page.locator('main table tbody tr').first().innerText().catch(() => null), 120),
            });
            // after a press: the rows over time (0.5 s, 2 s, 6 s) and the requests the page sent, so a late fetch is seen
            const rowsOverTime = async () => {
                const out = [];
                for (const ms of [500, 1500, 4000]) {
                    await sleep(ms);
                    out.push({at: ms, rows: await page.locator('main table tbody tr').count(), first: flat(await page.locator('main table tbody tr').first().innerText().catch(() => null), 40)});
                }
                return out;
            };
            await snap('p01-active-page1', {}, {png: true});
            o.page1 = await readPager();
            await loc(page, 'Dashboard pager: nav', nav.first());
            await loc(page, 'Dashboard pager: "Next" by exact name', page.getByRole('button', {name: 'Next', exact: true}));
            await loc(page, 'Dashboard pager: "Go to Next" (absent)', page.getByRole('button', {name: 'Go to Next', exact: true}));
            await loc(page, 'Dashboard pager: "Go to Previous"', page.getByRole('button', {name: 'Go to Previous', exact: true}));
            await loc(page, 'Dashboard pager: "Go to Page 2"', page.getByRole('button', {name: 'Go to Page 2', exact: true}));
            // press "Next"
            t0 = mark();
            await nav.first().locator('button').filter({hasText: /^\s*Next\s*$/}).first().click();
            await idle(page);
            o.nextRows = await rowsOverTime();
            o.nextTraffic = since(t0); o.nextRequests = reqSince(t0);
            await snap('p02-after-next');
            o.page2 = await readPager();
            // press "Previous"
            t0 = mark();
            await page.getByRole('button', {name: 'Go to Previous', exact: true}).click();
            await idle(page);
            o.prevRows = await rowsOverTime();
            o.prevTraffic = since(t0); o.prevRequests = reqSince(t0);
            await snap('p03-after-previous', {}, {png: true});
            o.afterPrev = await readPager();
            // press "Go to Page 2", then "Go to Page 1"
            t0 = mark();
            await page.getByRole('button', {name: 'Go to Page 2', exact: true}).click();
            await idle(page);
            o.page2Rows = await rowsOverTime();
            o.page2Traffic = since(t0); o.page2Requests = reqSince(t0);
            await snap('p04-after-page-2');
            o.afterPage2 = await readPager();
            t0 = mark();
            await page.getByRole('button', {name: 'Go to Page 1', exact: true}).click();
            await idle(page);
            o.page1Rows = await rowsOverTime();
            o.page1Traffic = since(t0); o.page1Requests = reqSince(t0);
            await snap('p04b-after-page-1', {}, {png: true});
            o.afterPage1 = await readPager();
            // a reload on the address the page shows after going back to page 1
            await go(page.url()); await sleep(1500);
            await snap('p04c-reload-after-page-1');
            o.afterReload = await readPager();
            // leaving with a phrase typed and not submitted (Enter not pressed): what asks on the way out
            await page.getByRole('textbox', {name: /Search submissions, ID/}).first().fill('unsubmitted phrase').catch(() => {});
            const d0 = jsDialogs.length;
            await go(cu(C, '/en/dashboard/editorial'));
            o.leaveWithTypedPhrase = {dialogs: jsDialogs.slice(d0), url: strip(page.url())};
            // control: a view of one page (Assigned to me: nothing assigned to the manager) has no pager
            await snap('p05-assigned-no-pager');
            o.control = {h1: flat(await page.locator('main h1').first().innerText().catch(() => null), 120), navCount: await nav.count(), rows: await page.locator('main table tbody tr').count()};
            o.crashes = traffic.filter((x) => x.s >= 500).map((x) => `${x.m} ${x.s} ${x.u.slice(0, 160)}`);
            o.pageErrors = errors.map((e) => e.msg);
            fact('pager', o);
            await signOut(page).catch(() => {});
        });

        // ============================================================ admin (L90, L123)
        async function endOwnManagerRole(C) {
            const rem = {};
            await go(cu(C, '/en/management/settings/access'));
            const table = page.locator('table').filter({hasText: /\badmin\b/}).first();
            await table.waitFor({state: 'visible', timeout: T}).catch(() => {});
            const adminRow = table.locator('tr').filter({hasText: /\badmin\b/}).first();
            await adminRow.locator('button').last().click().catch(() => {}); await idle(page);
            await page.getByRole('menuitem', {name: /^Edit$/}).first().click().catch(() => {});
            await page.waitForURL(/management\/settings\/user\/\d+/, {timeout: T}).catch(() => {});
            await idle(page);
            await page.getByRole('button', {name: /Remove Role/i}).first().waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
            rem.rolesBefore = await page.locator('tr').filter({has: page.getByRole('button', {name: /Remove Role/i})}).evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
            const roleRow = page.locator('tr').filter({hasText: /manager/i}).filter({has: page.getByRole('button', {name: /Remove Role/i})}).first();
            if (await roleRow.count()) {
                await roleRow.getByRole('button', {name: /Remove Role/i}).click(); await idle(page);
                const dlg = page.locator('[role="dialog"]:visible').filter({hasText: /Remove Role/i}).last();
                await dlg.waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
                const t0 = mark();
                await dlg.getByRole('button', {name: /^Remove Role$/i}).click().catch(() => {});
                await idle(page); await sleep(1200);
                rem.traffic = since(t0);
            } else rem.noManagerRow = true;
            rem.rolesAfter = await page.locator('tr').filter({has: page.getByRole('button', {name: /Remove Role/i})}).evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
            return rem;
        }
        async function dashRead(C, name, query = '', {png = false, wait = 0} = {}) {
            const t0 = mark();
            const r = await go(cu(C, `/en/dashboard/editorial${query}`));
            if (wait) await sleep(wait);
            await idle(page).catch(() => {});
            await snap(name, {}, {png});
            const d = await readDashboard();
            d.httpStatus = r && typeof r.status === 'function' ? r.status() : (r && r.err) || null;
            d.traffic = since(t0);
            d.pageErrors = errsSince(t0);
            return d;
        }
        async function adminLeg(key, role) {
            if (!S[key]) await seedAdm(key, role);
            const C = S[key].path || S[key].tag;
            const o = {ctx: C, role};
            await as('admin', C);
            o.controlLanding = strip(page.url());
            // control: the administrator still a Journal Manager here
            o.control = await dashRead(C, `a-${key}01-admin-manager-dashboard`);
            o.controlActive = await dashRead(C, `a-${key}02-admin-manager-active`, '?currentViewId=active');
            o.remove = await endOwnManagerRole(C);
            await snap(`a-${key}03-admin-roles-after-remove`);
            // the same session, straight after ending its own role
            o.staleSession = await dashRead(C, `a-${key}04-dashboard-same-session`, '', {wait: 1500});
            // a fresh sign-in
            await signOut(page).catch(() => {});
            await as('admin', C);
            o.freshLanding = strip(page.url());
            o.fresh = await dashRead(C, `a-${key}05-dashboard-fresh-signin`, '', {png: true, wait: 6500});
            await loc(page, `Dashboard, admin (${key}) no manager role: an open dialog`, page.locator('[role="dialog"]:visible'));
            // the dialog's own button, then what the page shows behind it
            const okBtn = page.locator('[role="dialog"]:visible').getByRole('button', {name: 'OK', exact: true});
            if (await okBtn.count()) {
                const t0 = mark();
                await okBtn.first().click(); await idle(page); await sleep(500);
                await snap(`a-${key}06-after-ok`);
                o.afterOk = await readDashboard();
                o.afterOk.traffic = since(t0);
            }
            // the list's own controls, pressed: "More Actions" (its entries), "Filters" (the panel's fields)
            o.moreActions = {count: await page.getByRole('button', {name: 'More Actions', exact: true}).count()};
            if (o.moreActions.count) {
                const t0 = mark();
                await page.getByRole('button', {name: 'More Actions', exact: true}).click(); await sleep(600);
                o.moreActions.items = await page.getByRole('menuitem').evaluateAll((els) => els.map((e) => ({text: e.innerText.trim(), ariaDisabled: e.getAttribute('aria-disabled')}))).catch(() => []);
                await snap(`a-${key}06b-more-actions`);
                await page.getByRole('button', {name: 'More Actions', exact: true}).click().catch(() => {}); await sleep(400);
                o.moreActions.traffic = since(t0);
            }
            o.filters = {count: await page.getByRole('button', {name: 'Filters', exact: true}).count()};
            if (o.filters.count) {
                const t0 = mark();
                await page.getByRole('button', {name: 'Filters', exact: true}).click(); await idle(page); await sleep(800);
                const panel = page.locator('[data-cy="active-modal"]').filter({has: page.getByRole('button', {name: 'Apply Filters', exact: true})});
                o.filters.panel = flat(await panel.innerText({timeout: 5000}).catch(() => null), 600);
                await snap(`a-${key}06c-filters-panel`);
                o.filters.traffic = since(t0);
                await panel.getByRole('button', {name: /^Close/}).first().click().catch(() => {}); await idle(page); await sleep(800);
            }
            // the sidebar's view entries, as the administrator would press them
            const sideLinks = await page.locator('#app-nav a').evaluateAll((els) => els.map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')}))).catch(() => []);
            o.sideLinks = sideLinks.slice(0, 40);
            const activeLink = page.locator('#app-nav a').filter({has: page.getByText('Active submissions', {exact: true})}).first();
            if (await activeLink.count()) {
                const t0 = mark();
                await activeLink.click(); await idle(page); await sleep(1500);
                await snap(`a-${key}07-active-from-sidebar`);
                o.activeFromSidebar = await readDashboard();
                o.activeFromSidebar.traffic = since(t0);
            }
            o.activeByAddress = await dashRead(C, `a-${key}08-active-by-address`, '?currentViewId=active');
            // the sidebar's global search, Enter
            const gs = page.locator('#app-nav input[type="search"]').first();
            o.globalSearchBox = {count: await gs.count(), visible: await gs.isVisible().catch(() => false)};
            if (o.globalSearchBox.visible) {
                const t0 = mark();
                await gs.fill('First'); await gs.press('Enter'); await idle(page); await sleep(1500);
                await snap(`a-${key}09-global-search`);
                o.globalSearch = await readDashboard();
                o.globalSearch.traffic = since(t0);
            }
            // a submission's workflow by its address (the row's "View" target), for what the role gets there
            const sid = S[key].subs[0] && S[key].subs[0].submissionId;
            if (sid) {
                o.workflow = await dashRead(C, `a-${key}10-workflow-by-address`, `?workflowSubmissionId=${sid}`, {wait: 1000});
                o.workflow.dialogText = flat((await screen(page).catch(() => ({text: {}}))).text?.dialog, 300);
            }
            // a submission the account is not assigned to, by its workflow address
            const sid2 = S[key].subs[1] && S[key].subs[1].submissionId;
            if (sid2) {
                o.workflowUnassigned = await dashRead(C, `a-${key}11-workflow-unassigned-by-address`, `?workflowSubmissionId=${sid2}`, {wait: 1000});
                o.workflowUnassigned.dialogText = flat((await screen(page).catch(() => ({text: {}}))).text?.dialog, 300);
            }
            o.dialogs = jsDialogs.slice();
            await signOut(page).catch(() => {});
            return o;
        }
        if (on('admin')) {
            await sect('adminReader', async () => fact('adminReader', await adminLeg('R', 'reader')));
            await sect('adminSectionEditor', async () => fact('adminSectionEditor', await adminLeg('E', 'sectionEditor')));
        }
        fact('end', {crashes: traffic.filter((x) => x.s >= 500).map((x) => `${x.m} ${x.s} ${x.u.slice(0, 160)}`), pageErrors: errors.map((e) => e.msg), dialogs: jsDialogs});
    } finally {
        save();
        await close();
    }
});
