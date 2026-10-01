// U63 claim check, chunk I01 (housekeeping hk01, 2026-10-01): the incidentals rows of .reports/hk01/chunks/U63.md
// driven through the screens.
// Spec: docs/specs/U63-import-export.md — Rules 18, 20, 22a, 23, 26, 36, 36a, 43; register A1, A5, A13, OJS1, OJS4,
// OJS6; footnotes i, l, m, f-a1, f-a5, f-ojs1, f-ojs4, f-ojs6.
//
//   PROBE_FEATURE=U63 PROBE_AGENT=ccI01 PROBE_RUN=r1 node bin/probe.js <ojs|omp|ops|all> shared/playwright/checks/U63/I01/i01.js
//   PHASES=seed,r20,r22,r23,r3,leave,r16,r15,r13,r54,r21,r33 (default all, in order; a phase an app lacks is skipped).
//   State: i01-state-<PROBE_RUN>-<app>.json in the output folder (RESEED=1 starts over). Every run seeds its own
//   scratch contexts (tag prefix u63i01<run>), so r1 and r2 keep apart, except r33, which runs the installation's
//   daily DOAJ task and must not overlap another run's r33.
//   stable-3_5_0 (rows 21 and 54): PKP_E2E_LINE=stable-3_5_0 PROBE_FEATURE=hk01-3_5 PROBE_AGENT=ccI01 PROBE_RUN=r1
//   PHASES=r21,r54 node bin/probe.js ojs shared/playwright/checks/U63/I01/i01.js
//
// Rows: 3 (users.js), 13, 15, 33 (doaj.js), 16 (pubmed in journal.js), 20 (below), 21 (native.js), 22, 23 (users.js),
// 54 (journal.js). `publicknowledge` and the roster are only read (row 20's addresses, GET). DB reads (psql SELECT)
// and the probe server's log are evidence beside the screens; nothing is written there. No assertions: the script
// records, the reader judges.
const {forEachApp, launch, signIn, signOut, idle} = require('../../../probe');
const {T, sleep, flat, rel, makeCtx} = require('./lib');
const users = require('./users');

const ALL = ['seed', 'r20', 'r22', 'r23', 'r3', 'leave', 'r16', 'r15', 'r13', 'r54', 'r21', 'r33'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);

// ---------------------------------------------------------------------------------------------------------- row 20
async function row20(c) {
    const {page, fact, snap, app} = c;
    const o = {};
    const ctx = app.contextPath;
    // What the Tools page itself requests (the browser's own traffic) as it opens its "Import/Export" tab.
    const seen = [];
    const onResp = (r) => { if (/\/management\//.test(r.url()) && !/\.(js|css|png|svg|woff2?)(\?|$)/.test(r.url())) seen.push(`${r.request().method()} ${r.status()} ${rel(r.url()).slice(0, 160)} ${r.headers()['content-type'] || ''}`); };
    const typed = async (label, p) => {
        const r = await page.goto(c.cu(ctx, p)).catch(() => null);
        await page.waitForLoadState('load').catch(() => {});
        await idle(page).catch(() => {}); await sleep(300);
        const body = r ? (await r.body().catch(() => Buffer.alloc(0))).toString('utf8') : '';
        const s = await snap(label);
        return {address: p, status: r ? r.status() : null, contentType: r ? r.headers()['content-type'] || null : null, bodyStart: body.slice(0, 200),
            h1: await page.locator('h1').first().innerText({timeout: 1500}).catch(() => null), sideMenuTools: await page.getByRole('link', {name: 'Tools', exact: true}).count(), snap: s.label};
    };
    for (const user of ['manager.maya', 'sectioneditor.ana']) {
        const u = {};
        await signIn(page, user, {contextPath: ctx});
        if (user === 'manager.maya') {
            page.on('response', onResp);
            await c.go(c.cu(ctx, '/en/management/tools'));
            await page.locator('.pkp_page_importexport_plugins li').first().waitFor({timeout: T}).catch(() => {});
            await idle(page).catch(() => {});
            page.off('response', onResp);
            u.toolsPageRequests = seen.slice();
            u.toolsSnap = (await snap(`r20-tools-${user}`)).label;
            const sp = [];
            const onP = (r) => { if (/\/management\//.test(r.url())) sp.push(`${r.request().method()} ${r.status()} ${rel(r.url()).slice(0, 160)}`); };
            page.on('response', onP);
            await page.getByRole('tab', {name: 'Permissions', exact: true}).click().catch(() => {});
            await idle(page).catch(() => {}); await sleep(800);
            page.off('response', onP);
            u.permissionsTabRequests = sp;
        }
        u.bareImportexport = await typed(`r20-bare-importexport-${user}`, '/en/management/importexport');
        u.barePermissions = await typed(`r20-bare-permissions-${user}`, '/en/management/permissions');
        u.anything = await typed(`r20-importexport-anything-${user}`, '/en/management/importexport/u63i01anything');
        u.pluginNoName = await typed(`r20-importexport-plugin-${user}`, '/en/management/importexport/plugin');
        o[user] = u;
        await signOut(page).catch(() => {});
    }
    fact(`r20-${app.name}`, o);
}

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push({type: d.type(), message: flat(d.message(), 300), url: rel(page.url())}); d.accept().catch(() => {}); });
    const c = makeCtx(app, page);
    const isOJS = app.name === 'ojs';
    const hasUsers = app.name !== 'ops';
    const step = async (name, fn) => {
        if (!on(name)) return;
        c.log('== phase', name);
        try { await fn(); } catch (e) { c.log('phase FAILED', name, flat(e.stack, 1200)); c.fact(`${name}-error`, flat(e.stack, 1200)); await c.snap(`err-${name}`).catch(() => {}); }
        c.save();
    };
    try {
        await step('seed', async () => { if (hasUsers && (app.line || 'main') === 'main') await users.seedU(c); });
        await step('r20', () => row20(c));
        if (hasUsers) {
            await step('r22', () => users.row22(c));
            await step('r23', () => users.row23(c));
            await step('r3', () => users.row3(c));
            await step('leave', () => users.leaveUnsaved(c, dialogs));
        }
        if (isOJS) {
            await step('r16', () => require('./journal').row16(c));
            await step('r15', () => require('./doaj').row15(c));
            await step('r13', () => require('./doaj').row13(c));
            await step('r54', () => require('./journal').row54(c));
            await step('r33', () => require('./doaj').row33(c, dialogs));
        }
        await step('r21', () => require('./native').row21(c));
        c.fact(`dialogs-${app.name}`, dialogs);
    } finally {
        c.save();
        await close();
    }
});
