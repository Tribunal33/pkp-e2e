// PR review of pkp/pkp-lib#13521 (issue pkp/pkp-lib#13520, pkp-e2e-sec#6, U01 A13): the in-page
// requests of Administration that the issue walk (checks/issues/admin-changes-skip-confirm-access/
// walk.js) does not press, sent from an open Administration page the way its grids and forms send
// them, on PKP's default dataset with `[security] password_timeout = 1`.
//   gate on, admin:
//     1. sign in, Site Settings (Confirm Access, the password), the requests below: "in window"
//     2. two minutes untouched (twice the window), the same requests from the same page: "expired"
//     3. Site Settings again (Confirm Access, the password), the same requests: "reconfirmed"
//   gate off (password_timeout = 0), admin: Site Settings, the same requests: "gate off"
//   the manager `rvaca` (gate on): the journal's own settings requests and the site-level
//   contexts list a manager's screens could call: "manager"
// Requests (all read-only but "jobs redispatch all", which retries no job on a fresh dataset):
//   API: GET site, GET site/theme, GET contexts (site level), GET announcements and highlights
//   (site level), GET jobs/all, GET jobs/failed/all, POST jobs/redispatch/all;
//   grids: Languages, Plugins, Hosted Journals, site Navigation Menus, site announcement types.
//   Reset first: npm run fleet-prep -- --feature pr13520 --dataset 1 --reset
//   PROBE_FEATURE=pr13520 PROBE_AGENT=<base|head> node bin/probe.js all shared/playwright/checks/sync/pkp-lib-13521/surfaces.js
// Facts: .reports/pr13520/<agent>/surfaces-<app>.json
const {forEachApp, launch, signIn, record, serverLog} = require('../../../probe');
const L = require('../../issues/admin-changes-skip-confirm-access/lib.js');

const SETTINGS = '/index.php/index/en/admin/settings';
const API = '/index.php/index/api/v1';
const GRID = '/index.php/index/$$$call$$$/grid';
const ADMIN_REQUESTS = [
    ['GET', `${API}/site`],
    ['GET', `${API}/site/theme`],
    ['GET', `${API}/contexts`],
    ['GET', `${API}/announcements`],
    ['GET', `${API}/highlights`],
    ['GET', `${API}/jobs/all`],
    ['GET', `${API}/jobs/failed/all`],
    ['POST', `${API}/jobs/redispatch/all`],
    ['GET', `${GRID}/admin/languages/admin-language-grid/fetch-grid`],
    ['GET', `${GRID}/admin/plugins/admin-plugin-grid/fetch-grid`],
    ['GET', `${GRID}/admin/context/context-grid/fetch-grid`],
    ['GET', `${GRID}/navigation-menus/navigation-menus-grid/fetch-grid`],
    ['GET', `${GRID}/announcements/announcement-type-grid/fetch-grid`],
];

/** Send the requests from the open page (its cookies and CSRF token), as its scripts would. */
async function sendAll(page, app, requests) {
    const out = {};
    for (const [method, address] of requests) {
        out[`${method} ${address.replace(/^\/index\.php\/[^/]+/, '')}`] = await page.evaluate(
            async ({method, url}) => {
                const r = await fetch(url, {
                    method,
                    headers: {'X-Csrf-Token': (window.pkp && pkp.currentUser && pkp.currentUser.csrfToken) || '', 'Content-Type': 'application/json'},
                    body: method === 'GET' ? undefined : '{}',
                });
                const text = await r.text();
                let said = null;
                try {
                    const j = JSON.parse(text);
                    said = j.errorMessage || j.error || (j.status === false ? j.content : null) || null;
                } catch (e) {
                    said = text.slice(0, 120);
                }
                return {status: r.status, said: said && String(said).replace(/\s+/g, ' ').slice(0, 200)};
            },
            {method, url: app.url(address)},
        ).catch((e) => ({error: L.flat(String(e), 200)}));
    }
    return out;
}

/** Open Site Settings, answering Confirm Access when it asks. */
async function openSettings(page, app) {
    const r = await L.openAdmin(page, app, SETTINGS);
    if (r.confirmAccess) r.answered = await L.answerConfirmAccess(page);
    return {landed: r.landed, asked: !!r.confirmAccess};
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('surfaces.js runs on a dataset fleet');
    const facts = {app: app.name};
    const log = serverLog(app);
    const from = log.mark();
    const cfg = L.setPasswordTimeout(app, 1);
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        facts.open = await openSettings(page, app);
        facts['in window'] = await sendAll(page, app, ADMIN_REQUESTS);
        await L.sleep(120_000);
        facts['expired'] = await sendAll(page, app, ADMIN_REQUESTS);
        facts.reopen = await openSettings(page, app);
        facts['reconfirmed'] = await sendAll(page, app, ADMIN_REQUESTS);

        await signIn(page, 'rvaca', {contextPath: app.contextPath});
        await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/context`));
        await page.waitForLoadState('networkidle').catch(() => {});
        facts['manager'] = await sendAll(page, app, [
            ['GET', `/index.php/${app.contextPath}/api/v1/contexts/1`],
            ['GET', `/index.php/${app.contextPath}/api/v1/contexts`],
            ['GET', `/index.php/${app.contextPath}/api/v1/announcements`],
            ['GET', `/index.php/${app.contextPath}/$$$call$$$/grid/navigation-menus/navigation-menus-grid/fetch-grid`],
            ['GET', `/index.php/${app.contextPath}/$$$call$$$/grid/announcements/announcement-type-grid/fetch-grid`],
            ['GET', `${API}/contexts`],
        ]);

        L.setPasswordTimeout(app, 0);
        await signIn(page, 'admin');
        facts.gateOffOpen = await openSettings(page, app);
        facts['gate off'] = await sendAll(page, app, ADMIN_REQUESTS);
    } finally {
        facts.serverLog = log.since(from).map((l) => L.flat(l, 400)).slice(0, 12);
        record('surfaces', facts);
        cfg.restore();
        await close();
    }
});
