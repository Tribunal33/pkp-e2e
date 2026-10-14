// PR review of pkp/pkp-lib#13521 (U01 A13), the regression reader's reproduction of S1–S4
// (.reports/sync/rr13520/suspicions.md) on the campaign fleet: S1 an API key minted in the expired
// window passes the gate cookieless; S2 the site Navigation Menu Items grid, the site Plugin Gallery
// and a journal's Plugins upload stay ungated; S3 a manager refused at the newly gated handlers reads
// the Administration message; S4 the site Highlights save (U11 A5) reachable through HasRoles.
//   npm run fleet-prep -- --feature sync --reset
//   PROBE_FEATURE=sync PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/sync/pkp-lib-13521/reader.js
const path = require('path');
const R = path.resolve(__dirname, '../../..');
const {forEachApp, launch, signIn, record, serverLog} = require(path.join(R, 'probe'));
const L = require(path.join(R, 'checks/issues/admin-changes-skip-confirm-access/lib.js'));

const SETTINGS = '/index.php/index/en/admin/settings';
const API = '/index.php/index/api/v1';
const SG = '/index.php/index/$$$call$$$/grid';

/** fetch from the open page, its cookies and CSRF token. body: object (json) or URLSearchParams string with form:true */
async function send(page, app, method, address, {json, form} = {}) {
    return page.evaluate(
        async ({method, url, json, form}) => {
            const csrf = (window.pkp && pkp.currentUser && pkp.currentUser.csrfToken) || '';
            const headers = {'X-Csrf-Token': csrf};
            let body;
            if (form) {
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
                const p = new URLSearchParams(form);
                p.set('csrfToken', csrf);
                body = p.toString();
            } else if (method !== 'GET') {
                headers['Content-Type'] = 'application/json';
                body = JSON.stringify(json || {});
            }
            const r = await fetch(url, {method, headers, body});
            const text = await r.text();
            let said = null;
            try {
                const j = JSON.parse(text);
                said = j.errorMessage || j.error || (j.status === false ? j.content : null) || (j.status === true ? 'status:true ' + String(j.content || '').replace(/<[^>]+>/g, ' ').slice(0, 120) : null) || JSON.stringify(j).slice(0, 160);
            } catch (e) {
                said = text.replace(/<[^>]+>/g, ' ').slice(0, 160);
            }
            return {status: r.status, said: said && String(said).replace(/\s+/g, ' ').slice(0, 220)};
        },
        {method, url: app.url(address), json, form},
    ).catch((e) => ({error: L.flat(String(e), 200)}));
}

/** cookieless request with a Bearer token (an API client) */
async function tokenCall(app, method, address, token, json) {
    const r = await fetch(app.url(address), {
        method,
        headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
        body: method === 'GET' || method === 'DELETE' ? undefined : JSON.stringify(json || {}),
    });
    const text = await r.text();
    let j = null;
    try { j = JSON.parse(text); } catch (e) { /* not json */ }
    return {status: r.status, said: L.flat(j ? (j.errorMessage || j.error || JSON.stringify(j)) : text, 220), json: j};
}

async function openSettings(page, app) {
    const r = await L.openAdmin(page, app, SETTINGS);
    if (r.confirmAccess) r.answered = await L.answerConfirmAccess(page);
    return {landed: r.landed, asked: !!r.confirmAccess, after: r.answered && r.answered.landed};
}

const S2 = (app) => [
    ['site nav menus grid (gated by PR)', 'GET', `${SG}/navigation-menus/navigation-menus-grid/fetch-grid`],
    ['site nav menu ITEMS grid', 'GET', `${SG}/navigation-menus/navigation-menu-items-grid/fetch-grid`],
    ['site nav menu ITEMS add form', 'GET', `${SG}/navigation-menus/navigation-menu-items-grid/add-navigation-menu-item`],
    ['site admin plugin grid upload form (gated by PR)', 'GET', `${SG}/admin/plugins/admin-plugin-grid/upload-plugin`],
    ['site plugin gallery install (rowId 0)', 'POST-FORM', `${SG}/plugins/plugin-gallery-grid/install-plugin`, {rowId: '0'}],
    ['journal settings plugin grid upload form', 'GET', `/index.php/${app.contextPath}/$$$call$$$/grid/settings/plugins/settings-plugin-grid/upload-plugin`],
];

async function runS2(page, app) {
    const out = {};
    for (const [label, m, addr, form] of S2(app)) {
        out[label] = m === 'POST-FORM' ? await send(page, app, 'POST', addr, {form}) : await send(page, app, m, addr);
    }
    return out;
}

const S3 = [
    ['GET', `${API}/announcements`],
    ['GET', `${API}/highlights`],
    ['GET', `${API}/contexts`],
    ['GET', `${API}/site`],
    ['GET', `${SG}/navigation-menus/navigation-menus-grid/fetch-grid`],
    ['GET', `${SG}/admin/context/context-grid/fetch-grid`],
    ['GET', `${SG}/admin/plugins/admin-plugin-grid/fetch-grid`],
    ['GET', `${SG}/admin/languages/admin-language-grid/fetch-grid`],
    ['GET', `${SG}/announcements/announcement-type-grid/fetch-grid`],
];

async function runS3(page, app) {
    await signIn(page, 'manager.maya', {contextPath: app.contextPath});
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/context`));
    await page.waitForLoadState('networkidle').catch(() => {});
    const out = {};
    for (const [m, a] of S3) out[`${m} ${a.replace(/^\/index\.php\/index/, '')}`] = await send(page, app, m, a);
    return out;
}

forEachApp(async (app) => {
    const facts = {app: app.name, configFile: app.configFile};
    const log = serverLog(app);
    const from = log.mark();
    const cfg = L.setPasswordTimeout(app, 1);
    facts.timeoutBefore = cfg.before;
    const {page, close} = await launch(app);
    const tag = `rr${Date.now().toString(36).slice(-5)}`;
    try {
        // ---- admin, gate on, in window
        await signIn(page, 'admin');
        facts.open = await openSettings(page, app);
        // S4: site highlight add (HasRoles) in window
        const hl = await send(page, app, 'POST', `${API}/highlights`, {json: {title: {en: `${tag} hl`}, url: 'https://example.org/', urlText: {en: 'Go'}}});
        facts.S4 = {add: hl, list: await send(page, app, 'GET', `${API}/highlights`)};
        try {
            const m = /"id":(\d+)/.exec(hl.said || '');
            if (m) facts.S4.del = await send(page, app, 'DELETE', `${API}/highlights/${m[1]}`);
        } catch (e) { /* ignore */ }
        facts.S2inWindow = await runS2(page, app);

        // ---- wait out the window (1 min) twice
        await L.sleep(125_000);
        facts.S2expired = await runS2(page, app);
        // a real save on the ungated site navigation-menu-items grid
        facts.S2expiredMenuItemSave = await send(page, app, 'POST', `${SG}/navigation-menus/navigation-menu-items-grid/update-navigation-menu-item`, {
            form: {'title[en]': `${tag} item`, 'content[en]': '', path: '', menuItemType: 'NMI_TYPE_REMOTE_URL', 'remoteUrl[en]': 'https://example.org/'},
        });
        // S1 control: the cookie path is refused
        const ctx = {name: {en: `${tag} Tok`}, acronym: {en: tag.toUpperCase()}, urlPath: tag, contactName: 'Tok', contactEmail: `${tag}@mailinator.com`, country: 'CA', enabled: false, supportedLocales: ['en'], primaryLocale: 'en'};
        facts.S1cookieAdd = await send(page, app, 'POST', `${API}/contexts`, {json: ctx});

        // S1: mint an API key on the profile, past the window
        const {ProfilePage} = require(path.join(R, 'pages/ProfilePage.js'));
        const prof = new ProfilePage(page, 'index');
        await prof.goto('apiKey');
        facts.S1profileLanded = L.path(page);
        facts.S1profileConfirmAccess = await L.confirmAccessShown(page);
        const before = await prof.apiKeyBox().inputValue();
        if (await prof.createApiKeyButton().count()) {
            await prof.save().catch(async () => { await prof.createApiKeyButton().click(); await L.sleep(2000); });
        }
        await prof.goto('apiKey');
        const token = await prof.apiKeyBox().inputValue();
        facts.S1key = {before: L.flat(before, 20), minted: token && token !== before && token !== 'None', len: token && token.length, landed: L.path(page)};
        // browser with cookie + ?apiToken=: still refused
        facts.S1cookiePlusToken = await send(page, app, 'GET', `${API}/site?apiToken=${encodeURIComponent(token)}`);
        // cookieless client with the token
        facts.S1token = {};
        facts.S1token.getSite = await tokenCall(app, 'GET', `${API}/site`, token);
        const add = await tokenCall(app, 'POST', `${API}/contexts`, token, ctx);
        facts.S1token.addContext = {status: add.status, said: add.json && add.json.id ? `id ${add.json.id} urlPath ${add.json.urlPath}` : add.said};
        if (add.json && add.json.id) {
            const del = await tokenCall(app, 'DELETE', `${API}/contexts/${add.json.id}`, token);
            facts.S1token.deleteContext = {status: del.status, said: L.flat(del.said, 120)};
        }
        facts.S1token.jobsFailed = await tokenCall(app, 'GET', `${API}/jobs/failed/all`, token);
        delete facts.S1token.jobsFailed.json;
        delete facts.S1token.getSite.json;
        // and the cookie path still refused after all that
        facts.S1cookieAfter = await send(page, app, 'GET', `${API}/site`);

        // ---- S3 manager, gate on
        facts.S3gateOn = await runS3(page, app);
        // ---- S3 manager, gate off
        L.setPasswordTimeout(app, 0);
        facts.S3gateOff = await runS3(page, app);
        // admin gate off: the cookie path to the same API (control)
        await signIn(page, 'admin');
        facts.gateOffAdmin = {site: await send(page, app, 'GET', `${API}/site`), contexts: await send(page, app, 'GET', `${API}/contexts`)};
    } finally {
        facts.serverLog = log.since(from).map((l) => L.flat(l, 300)).slice(0, 12);
        record('s-all', facts);
        cfg.restore();
        await close();
    }
});
