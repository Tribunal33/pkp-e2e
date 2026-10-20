// U64 UNASSIGNED drive UA1: AFFM-170, OMP `templates/management/tools/form/statisticsSettingsForm.tpl`
// (housekeeping 2026-10-20, quiet-morning UNASSIGNED drive, MAINTENANCE step 12).
//
// The entry's claims, driven through the screens:
//   typed     what `management/tools/saveStatisticsSettings` (the template's post target) and
//             `management/statistics` (an op `pages/management/index.php` routes to PKPToolsHandler)
//             answer when typed, per permission level: Press (Journal, Server) Manager, Editor
//             (manager level, OJS OMP), Series (Section) Editor / Moderator, Author, Reader, the
//             site admin, signed out; `management/tools` is the positive control. Roster accounts
//             on publicknowledge (GET only, nothing changes) and the scratch context's own users.
//             OJS and OPS run as read-only controls.
//   ctrl      controls: an unknown `tools/<path>` and an unknown management op typed beside the two;
//             the blank page's raw HTML
//   crawl     every management, statistics and administration page a manager or admin opens, every
//             top tab pressed: does any of them render `#statisticsSettingsForm`, a form posting to
//             `saveStatisticsSettings`, or the metric-type field the template includes?
//   tabs      the live statistics settings: Settings › Distribution › "Statistics" (scratch
//             manager, editor, reader typing it, admin) and Administration › Site Settings ›
//             "Site Setup" › "Statistics" (admin; manager, editor, reader typing it), each left
//             once with a change unsaved (nothing is saved).
//
// Run (one app per process; each run seeds its own scratch context, so r1 and r2 are independent):
//   bin/app-lock.sh shared omp -- env PROBE_FEATURE=U64 PROBE_AGENT=ccUA1 PROBE_RUN=r1 \
//     node bin/probe.js omp shared/playwright/checks/U64/UA1/ua1.js
//   PHASES=typed,ctrl,crawl,tabs picks steps (default all four; ctrl was added after the first runs).
// Outputs: .reports/U64/ccUA1/ (ua1-<phase>-<run>-<app>.json facts, s-<…>-<run>-<app>.json screens).
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, serverLog} = require('../../../probe');

const PHASES = (process.env.PHASES || 'typed,ctrl,crawl,tabs').split(',');
const flat = (s, n = 600) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SCRATCH_ROLES = {
    ojs: [['mgr', 'manager'], ['ed', 'editor'], ['se', 'sectionEditor'], ['au', 'author'], ['rd', 'reader']],
    omp: [['mgr', 'manager'], ['ed', 'editor'], ['se', 'sectionEditor'], ['au', 'author'], ['rd', 'reader']],
    ops: [['mgr', 'manager'], ['se', 'sectionEditor'], ['au', 'author'], ['rd', 'reader']],
};
const ROSTER = {
    ojs: ['admin', 'manager.maya', 'editor.diana', 'sectioneditor.ana', 'author.alex', 'reader.rosa'],
    omp: ['admin', 'manager.maya', 'editor.diana', 'sectioneditor.ana', 'author.alex', 'reader.rosa'],
    ops: ['admin', 'manager.maya', 'sectioneditor.ana', 'author.alex', 'reader.rosa'],
};
const TYPED = ['management/tools/saveStatisticsSettings', 'management/statistics', 'management/tools'];

// What the page holds of the dead template: its form id, a form posting to its target, the metric-type field.
async function templateTrace(page) {
    return page.evaluate(() => ({
        statisticsSettingsForm: document.querySelectorAll('#statisticsSettingsForm').length,
        formsPostingSave: [...document.querySelectorAll('form')].filter((f) => /saveStatisticsSettings/.test(f.getAttribute('action') || '')).length,
        defaultMetricType: document.querySelectorAll('[name="defaultMetricType"], [id^="defaultMetricType"]').length,
        anySaveStatisticsLink: [...document.querySelectorAll('a[href], [data-url], [action]')].filter((e) => /saveStatisticsSettings/.test(e.getAttribute('href') || e.getAttribute('data-url') || e.getAttribute('action') || '')).length,
        htmlHasSaveStatistics: document.documentElement.outerHTML.includes('saveStatisticsSettings'),
    })).catch((e) => ({error: String(e).slice(0, 200)}));
}

forEachApp(async (app) => {
    const RUN = process.env.PROBE_RUN || 'r0';
    const T = tag(`u64ua1${RUN}`);
    const facts = {app: app.name, run: RUN, startedAt: new Date().toISOString()};
    const ctx = await app.api.createContext({
        tag: T,
        context: {name: {en: `UA1 Context ${T}`}},
        users: SCRATCH_ROLES[app.name].map(([s, r]) => ({username: `${T}${s}`, givenName: s.toUpperCase(), familyName: 'Uaone', roles: [r]})),
    });
    const P = ctx.path || T;
    facts.scratch = {path: P, contextId: ctx.contextId};
    const log = serverLog(app);

    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({at: new Date().toISOString(), type: d.type(), message: d.message(), url: page.url()});
        await d.accept().catch(() => {});
    });
    const snap = async (name) => {
        const s = await screen(page);
        record(`s-${name}`, s);
        return s;
    };
    const visit = async (name, url) => {
        const from = log.mark();
        const d0 = dialogs.length;
        let resp = null, err = null;
        try {
            resp = await page.goto(app.url(url), {timeout: 45_000});
        } catch (e) {
            err = flat(e.message, 300);
        }
        await idle(page);
        const s = await snap(name);
        const body = await page.content().catch(() => '');
        return {
            url,
            status: resp ? resp.status() : null,
            error: err,
            finalURL: page.url().replace(app.baseURL, ''),
            title: await page.title().catch(() => null),
            h1: flat(await page.locator('main h1, h1').first().innerText({timeout: 2000}).catch(() => null), 120),
            mainText: flat(s.text && (s.text.main || s.text.body), 400),
            bodyBytes: body.length,
            bodyTextBytes: (await page.evaluate(() => document.body ? document.body.innerText.length : -1).catch(() => -1)),
            notices: s.notices,
            dialogs: dialogs.slice(d0),
            trace: await templateTrace(page),
            serverLog: log.since(from).slice(0, 12),
        };
    };

    try {
        // ------------------------------------------------------------------ typed
        if (PHASES.includes('typed')) {
            const R = {};
            await signOut(page).catch(() => {});
            for (const a of TYPED) {
                R[`signedOut ${a} @publicknowledge`] = await visit(`typed-out-pk-${a.replace(/\//g, '_')}`, `/index.php/${app.contextPath}/en/${a}`);
            }
            for (const u of ROSTER[app.name]) {
                await signIn(page, u);
                for (const a of TYPED) {
                    R[`${u} ${a} @publicknowledge`] = await visit(`typed-${u}-pk-${a.replace(/\//g, '_')}`, `/index.php/${app.contextPath}/en/${a}`);
                }
                await signOut(page).catch(() => {});
            }
            for (const [s] of SCRATCH_ROLES[app.name]) {
                await signIn(page, `${T}${s}`, {contextPath: P});
                for (const a of TYPED) {
                    R[`scratch-${s} ${a} @${P}`] = await visit(`typed-sc${s}-${a.replace(/\//g, '_')}`, `/index.php/${P}/en/${a}`);
                }
                await signOut(page).catch(() => {});
            }
            // admin on the scratch context too (enrolled as manager there by the test API)
            await signIn(page, 'admin');
            for (const a of TYPED) {
                R[`admin ${a} @${P}`] = await visit(`typed-admin-sc-${a.replace(/\//g, '_')}`, `/index.php/${P}/en/${a}`);
            }
            // the Tools page's own tabs, pressed once each (manager-level positive control, nothing changes)
            await page.goto(app.url(`/index.php/${P}/en/management/tools`));
            await idle(page);
            const tabs = await page.getByRole('tab').allInnerTexts().catch(() => []);
            R.toolsTabs = [];
            for (let i = 0; i < tabs.length; i++) {
                const t = page.getByRole('tab').nth(i);
                await t.click().catch(() => {});
                await idle(page);
                const s = await snap(`typed-admin-tools-tab${i}`);
                R.toolsTabs.push({tab: flat(tabs[i], 60), text: flat(s.text && s.text.main, 500), trace: await templateTrace(page)});
            }
            await loc(page, 'Tools page tabs', page.getByRole('tab'));
            await signOut(page).catch(() => {});
            facts.typed = R;
            record('ua1-typed', R);
        }

        // ------------------------------------------------------------------ ctrl
        // Controls for the two typed answers: an unknown `tools/<path>` beside `tools/saveStatisticsSettings`
        // (is the blank page the template's, or every unknown Tools path's?) and an unknown management op
        // beside `management/statistics` (is its 404 the routed op's, or every unknown op's?); the blank
        // page's raw HTML and content type.
        if (PHASES.includes('ctrl')) {
            const CTRL = ['management/tools/saveStatisticsSettings', 'management/tools/u64ua1nosuchpath', 'management/statistics', 'management/u64ua1nosuchop'];
            const R = {};
            const one = async (who, base) => {
                for (const a of CTRL) {
                    const v = await visit(`ctrl-${who}-${a.replace(/\//g, '_')}`, `/index.php/${base}/en/${a}`);
                    const html = await page.content().catch(() => null);
                    const head = await page.request.get(app.url(`/index.php/${base}/en/${a}`), {maxRedirects: 0}).then(async (r) => ({status: r.status(), contentType: r.headers()['content-type'], location: r.headers().location || null, bytes: (await r.body()).length})).catch((e) => ({error: flat(e.message, 200)}));
                    R[`${who} ${a}`] = {status: v.status, finalURL: v.finalURL, title: v.title, h1: v.h1, bodyTextBytes: v.bodyTextBytes, html: v.bodyTextBytes < 50 ? flat(html, 500) : null, sameContextRequest: head, serverLog: v.serverLog, notices: v.notices, dialogs: v.dialogs};
                }
            };
            await signOut(page).catch(() => {});
            await one('signedOut', app.contextPath);
            for (const [s] of SCRATCH_ROLES[app.name].filter(([s]) => ['mgr', 'ed', 'rd'].includes(s))) {
                await signIn(page, `${T}${s}`, {contextPath: P});
                await one(`sc${s}`, P);
                await signOut(page).catch(() => {});
            }
            await signIn(page, 'admin');
            await one('admin', P);
            await signOut(page).catch(() => {});
            facts.ctrl = R;
            record('ua1-ctrl', R);
        }

        // ------------------------------------------------------------------ crawl
        if (PHASES.includes('crawl')) {
            const pages = [
                'management/tools', 'management/settings/context', 'management/settings/website', 'management/settings/workflow',
                'management/settings/distribution', 'management/settings/access', 'management/settings/institutions',
                'stats/publications/publications', 'stats/context/context', 'stats/counterR5/counterR5',
                'stats/editorial/editorial', 'stats/users/users', 'stats/reports',
                ...(app.name === 'ojs' ? ['stats/issues/issues'] : []),
            ];
            const C = {};
            const crawlAs = async (who, base, list) => {
                for (const p of list) {
                    const key = `${who} ${base}/${p}`;
                    const v = await visit(`crawl-${who}-${p.replace(/\//g, '_')}`, `/index.php/${base}/en/${p}`);
                    const tabs = await page.locator('[role="tab"]').evaluateAll((ts) => ts.map((t) => (t.innerText || t.textContent || '').trim()).filter(Boolean)).catch(() => []);
                    const perTab = [];
                    const n = await page.locator('[role="tab"]:visible').count().catch(() => 0);
                    for (let i = 0; i < n; i++) {
                        const t = page.locator('[role="tab"]:visible').nth(i);
                        const label = flat(await t.innerText().catch(() => ''), 60);
                        await t.click({timeout: 5000}).catch(() => {});
                        await idle(page);
                        perTab.push({tab: label, trace: await templateTrace(page)});
                    }
                    C[key] = {status: v.status, finalURL: v.finalURL, h1: v.h1, trace: v.trace, tabs, perTab, serverLog: v.serverLog, notices: v.notices, dialogs: v.dialogs};
                }
            };
            await signIn(page, 'manager.maya');
            await crawlAs('manager.maya', app.contextPath, pages);
            await signOut(page).catch(() => {});
            await signIn(page, 'admin');
            await crawlAs('admin', 'index', ['admin', 'admin/settings', 'admin/contexts', 'admin/systemInfo']);
            await signOut(page).catch(() => {});
            facts.crawl = C;
            const hits = Object.entries(C).filter(([, v]) => v.trace.statisticsSettingsForm || v.trace.formsPostingSave || v.trace.defaultMetricType || v.trace.htmlHasSaveStatistics
                || v.perTab.some((t) => t.trace.statisticsSettingsForm || t.trace.formsPostingSave || t.trace.defaultMetricType || t.trace.htmlHasSaveStatistics));
            facts.crawlHits = hits.map(([k]) => k);
            record('ua1-crawl', C);
        }

        // ------------------------------------------------------------------ tabs
        if (PHASES.includes('tabs')) {
            const D = {};
            const distTab = async (who, base) => {
                const v = await visit(`tabs-${who}-distribution`, `/index.php/${base}/en/management/settings/distribution`);
                const out = {status: v.status, finalURL: v.finalURL, h1: v.h1, tabs: await page.getByRole('tab').allInnerTexts().then((a) => a.map((x) => flat(x, 40))).catch(() => []), trace: v.trace, serverLog: v.serverLog};
                const btn = page.locator('#statistics-button').first();
                if (!(await btn.count())) return {...out, statisticsTab: false};
                await btn.click();
                const panel = page.locator('[id="statistics"]');
                await panel.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: 20_000}).catch(() => {});
                await idle(page);
                const s = await snap(`tabs-${who}-distribution-statistics`);
                out.statisticsTab = true;
                out.panelText = flat(s.text && s.text.main, 900);
                out.vueForm = await panel.locator('.pkpForm').count();
                out.legacyForms = await panel.locator('form.pkp_form').count();
                out.boxes = await panel.locator('input[type=checkbox], input[type=radio]').evaluateAll((is) => is.map((i) => `${i.type}:${(i.closest('label') || {}).innerText || i.value}${i.checked ? ' [x]' : ''}`.replace(/\s+/g, ' ').trim()));
                await loc(page, 'Distribution › Statistics panel', panel);
                await loc(page, 'Distribution › Statistics Public API box', panel.getByLabel('Make the COUNTER SUSHI statistics publicly available'));
                return out;
            };
            // Press Manager, Editor (manager level), Reader typing the address, admin; the scratch context.
            for (const [s] of SCRATCH_ROLES[app.name].filter(([s]) => ['mgr', 'ed', 'se', 'rd'].includes(s))) {
                await signIn(page, `${T}${s}`, {contextPath: P});
                D[`scratch-${s} distribution`] = await distTab(`sc${s}`, P);
                await signOut(page).catch(() => {});
            }
            await signIn(page, 'admin');
            D['admin distribution @scratch'] = await distTab('admin-sc', P);

            // Left once with a change unsaved: the journal's "Public API" box unticked, another tab and back, then away.
            {
                const panel = page.locator('[id="statistics"]');
                const box = panel.getByLabel('Make the COUNTER SUSHI statistics publicly available');
                const L = {};
                if (await box.count()) {
                    L.before = await box.isChecked();
                    await box.uncheck();
                    L.afterUntick = await box.isChecked();
                    const other = page.getByRole('tab').filter({hasNotText: 'Statistics'}).first();
                    L.otherTab = flat(await other.innerText().catch(() => null), 40);
                    await other.click();
                    await idle(page);
                    await page.locator('#statistics-button').first().click();
                    await idle(page);
                    L.afterTabSwitch = await box.isChecked();
                    await snap('tabs-admin-sc-distribution-unsaved');
                    const d0 = dialogs.length;
                    await page.goto(app.url(`/index.php/${P}/en/management/settings/context`));
                    await idle(page);
                    L.leaveDialogs = dialogs.slice(d0);
                    L.landed = page.url().replace(app.baseURL, '');
                    const back = await distTab('admin-sc-reopen', P);
                    L.reopenedBoxes = back.boxes;
                } else {
                    L.noBox = true;
                }
                D.distributionLeaveUnsaved = L;
            }

            // The site's tab, admin.
            const siteTab = async (who) => {
                const v = await visit(`tabs-${who}-site`, '/index.php/index/en/admin/settings');
                const out = {status: v.status, finalURL: v.finalURL, h1: v.h1, trace: v.trace, serverLog: v.serverLog};
                const setup = page.locator('#setup-button').first();
                if (!(await setup.count())) return {...out, siteTab: false};
                await setup.click().catch(() => {});
                const btn = page.locator('#statistics-button').first();
                if (!(await btn.count())) return {...out, siteTab: true, statisticsTab: false};
                await btn.click();
                const panel = page.locator('[id="statistics"]');
                await panel.getByRole('button', {name: 'Save', exact: true}).first().waitFor({timeout: 20_000}).catch(() => {});
                await idle(page);
                const s = await snap(`tabs-${who}-site-statistics`);
                out.siteTab = true;
                out.statisticsTab = true;
                out.sideTabs = await page.getByRole('tab').allInnerTexts().then((a) => a.map((x) => flat(x, 40))).catch(() => []);
                out.panelText = flat(s.text && s.text.main, 1200);
                out.vueForm = await panel.locator('.pkpForm').count();
                out.legacyForms = await panel.locator('form.pkp_form').count();
                out.trace = await templateTrace(page);
                out.boxes = await panel.locator('input[type=checkbox], input[type=radio]').evaluateAll((is) => is.map((i) => `${i.type}:${(i.closest('label') || {}).innerText || i.value}${i.checked ? ' [x]' : ''}`.replace(/\s+/g, ' ').trim()));
                await loc(page, 'Site Settings › Site Setup › Statistics panel', panel);
                return out;
            };
            D['admin site'] = await siteTab('admin');
            {
                const panel = page.locator('[id="statistics"]');
                const radio = panel.getByLabel('Track daily and monthly statistics', {exact: true});
                const L = {};
                if (await radio.count()) {
                    await radio.check();
                    L.checked = await radio.isChecked();
                    await snap('tabs-admin-site-unsaved');
                    const d0 = dialogs.length;
                    await page.goto(app.url('/index.php/index/en/admin'));
                    await idle(page);
                    L.leaveDialogs = dialogs.slice(d0);
                    L.landed = page.url().replace(app.baseURL, '');
                    const back = await siteTab('admin-reopen');
                    L.reopenedBoxes = back.boxes;
                } else {
                    L.noRadio = true;
                }
                D.siteLeaveUnsaved = L;
            }
            await signOut(page).catch(() => {});
            // Lower roles typing the site's address (roster, read-only).
            for (const u of ROSTER[app.name].filter((x) => ['manager.maya', 'editor.diana', 'reader.rosa'].includes(x))) {
                await signIn(page, u);
                D[`${u} site`] = await siteTab(u.replace('.', '_'));
                await signOut(page).catch(() => {});
            }
            facts.tabs = D;
            record('ua1-tabs', D);
        }
        await shot(page, 'ua1-last');
    } finally {
        facts.dialogs = dialogs;
        facts.endedAt = new Date().toISOString();
        record('ua1-facts', facts);
        await close();
    }
});
