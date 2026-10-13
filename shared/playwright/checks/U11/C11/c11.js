// U11 claim check, chunk C11 (housekeeping 2026-10-13, incidentals row 23):
// the highlights REST API's `_href` for a journal's (press's, server's)
// highlight, an API answer no screen reads (HighlightsListPanel builds
// `apiUrl + '/' + id` itself), so it is checked directly as the Frame allows.
//
// Per app: a scratch context with a manager; the manager adds one highlight
// through the Highlights panel (the screen's own POST); then, through the
// browser's session, GET {ctx}/api/v1/highlights and read `_href`; GET the
// `_href` as the manager, as the site administrator and signed out; GET the
// context-scoped single-item address {ctx}/api/v1/highlights/{id} the same
// three ways; and the site's own list as the administrator, for its
// highlights' `_href` (read as found, nothing added at site scope).
//
//   PROBE_FEATURE=U11 PROBE_AGENT=ccC11 PROBE_RUN=r1 node bin/probe.js ojs shared/playwright/checks/U11/C11/c11.js
const {forEachApp, launch, signIn, signOut, screen, shot, record, note, idle, tag, serverLog} =
    require('../../../probe');

const log = (...a) => console.log('[c11]', ...a);
const flat = (s, n = 400) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

async function snap(page, name, extra) {
    let s; try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
    if (extra) Object.assign(s, extra);
    record(name, s); await shot(page, name).catch(() => {}); return s;
}
async function apiGet(page, url) {
    return page.evaluate(async (u) => {
        const r = await fetch(u, {credentials: 'same-origin', headers: {Accept: 'application/json'}});
        const text = await r.text();
        let body = text; try { body = JSON.parse(text); } catch { /* not JSON */ }
        return {url: u, status: r.status, body};
    }, url);
}
const short = (r) => ({url: r.url, status: r.status, body: typeof r.body === 'string' ? flat(r.body, 300) : r.body});

const highlightsPanel = (page) => page.locator('.listPanel').filter({has: page.getByRole('button', {name: 'Add Highlight'})}).first();
async function openHighlightsTab(page, url) {
    await page.goto(url); await idle(page);
    const setup = page.locator('#setup-button').first();
    if ((await setup.count()) && !String(await setup.getAttribute('aria-selected')).includes('true')) await setup.click();
    const tab = page.getByRole('tab', {name: 'Highlights', exact: true});
    if ((await tab.count()) === 0) return false;
    await tab.click(); await idle(page);
    await highlightsPanel(page).waitFor({state: 'visible', timeout: 15000}).catch(() => {});
    return true;
}
async function addHighlight(page, title) {
    await highlightsPanel(page).getByRole('button', {name: 'Add Highlight'}).click();
    const dlg = page.getByRole('dialog', {name: /Add Highlight/}).first();
    await dlg.waitFor({state: 'visible', timeout: 15000}); await idle(page);
    const iframe = dlg.locator('.pkpFormField:has(#highlight-title-control-en) iframe').first();
    const body = iframe.contentFrame().locator('body');
    await body.waitFor({state: 'visible', timeout: 15000});
    await body.click(); await body.pressSequentially(title);
    await dlg.getByRole('textbox', {name: /^URL/}).fill('https://example.org/c11');
    await dlg.getByRole('textbox', {name: /^Button Label/}).fill('Read more');
    const saved = page.waitForResponse((r) => /\/api\/v1\/highlights/.test(r.url()) && r.request().method() === 'POST', {timeout: 30000}).catch(() => null);
    await dlg.getByRole('button', {name: 'Save', exact: true}).click();
    const resp = await saved;
    await dlg.waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
    await idle(page);
    return resp ? {status: resp.status(), body: await resp.json().catch(() => null)} : null;
}

forEachApp(async (app) => {
    const t = tag('u11c11');
    const ctx = await app.api.createContext({tag: t, context: {name: `U11 C11 ${t}`, acronym: 'U11C11'},
        users: [{username: `${t}mgr`, roles: ['manager'], givenName: 'Cal', familyName: 'Manager'}]});
    const P = ctx.path, mgr = `${t}mgr`;
    log(app.name, 'scratch', JSON.stringify({path: P, contextId: ctx.contextId}));
    const out = {app: app.name, path: P, contextId: ctx.contextId};
    const slog = serverLog(app);
    const {page, close} = await launch(app);
    try {
        // 1. the manager adds one highlight through the panel
        await signIn(page, mgr, {contextPath: P});
        const found = await openHighlightsTab(page, app.url(`/index.php/${P}/management/settings/website`));
        await snap(page, 'c11-panel-empty', {found});
        out.add = await addHighlight(page, `C11 ${t}`);
        await snap(page, 'c11-panel-one');
        const id = out.add?.body?.id;
        out.addHref = out.add?.body?._href;
        log(app.name, 'POST', out.add?.status, 'id', id, '_href', out.addHref);

        // 2. the list, and the `_href` it gives, as the manager
        const list = await apiGet(page, app.url(`/index.php/${P}/api/v1/highlights`));
        const item = (list.body?.items || []).find((i) => i.id === id) || (list.body?.items || [])[0];
        out.list = {status: list.status, itemsTotal: list.body?.itemsMax, item};
        const href = item?._href;
        const ctxItem = app.url(`/index.php/${P}/api/v1/highlights/${id}`);
        log(app.name, 'list', list.status, '_href', href, 'contextId', item?.contextId);
        let from = slog.mark();
        out.mgrHref = short(await apiGet(page, href));
        out.mgrCtxItem = short(await apiGet(page, ctxItem));
        out.mgrLog = slog.since(from).slice(0, 6);
        await page.goto(href); await idle(page); await snap(page, 'c11-href-manager');
        log(app.name, 'manager: _href', out.mgrHref.status, '| ctx item', out.mgrCtxItem.status);
        await signOut(page);

        // 3. the administrator
        await signIn(page, 'admin');
        from = slog.mark();
        out.adminHref = short(await apiGet(page, href));
        out.adminCtxItem = short(await apiGet(page, ctxItem));
        const site = await apiGet(page, app.url('/index.php/index/api/v1/highlights'));
        out.siteList = {status: site.status, items: (site.body?.items || []).map((i) => ({id: i.id, contextId: i.contextId, _href: i._href}))};
        const sid = out.siteList.items[0]?.id;
        if (sid) out.adminSiteItem = short(await apiGet(page, out.siteList.items[0]._href));
        out.adminLog = slog.since(from).slice(0, 6);
        await page.goto(href); await idle(page); await snap(page, 'c11-href-admin');
        log(app.name, 'admin: _href', out.adminHref.status, '| ctx item', out.adminCtxItem.status, '| site list', site.status, JSON.stringify(out.siteList.items));
        await signOut(page);

        // 4. signed out
        await page.goto(app.url(`/index.php/${P}`)); await idle(page);
        out.anonHref = short(await apiGet(page, href));
        out.anonCtxItem = short(await apiGet(page, ctxItem));
        await page.goto(href); await idle(page); await snap(page, 'c11-href-signedout');
        log(app.name, 'signed out: _href', out.anonHref.status, '| ctx item', out.anonCtxItem.status);
    } finally {
        record('c11-api', out);
        console.log('[c11] RESULT', JSON.stringify(out));
        await close();
    }
});
