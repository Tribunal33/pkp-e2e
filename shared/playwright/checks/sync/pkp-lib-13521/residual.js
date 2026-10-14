// PR review of pkp/pkp-lib#13521 (U01 A13): an Administration screen the PR leaves without the
// gate. Site Settings › "Navigation Menus" loads two grids; the PR gates the menus grid
// (NavigationMenusGridHandler) at the site level but not the menu items grid
// (NavigationMenuItemsGridHandler). On PKP's default dataset, `[security] password_timeout = 1`:
//   1. admin: Site Settings (Confirm Access, the password); the site's menu item ids from the
//      items grid
//   2. two minutes untouched (twice the window)
//   3. from the same page, as the grid's "Remove" sends it: delete the last site menu item; and the
//      menus grid's fetch, for comparison (gated at the head)
//   4. Site Settings again (Confirm Access, the password): the items grid's ids
//   Reset first: npm run fleet-prep -- --feature pr13520 --dataset 1 --reset
//   PROBE_FEATURE=pr13520 PROBE_AGENT=<base|head> node bin/probe.js all shared/playwright/checks/sync/pkp-lib-13521/residual.js
// Facts: .reports/pr13520/<agent>/residual-<app>.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('../../issues/admin-changes-skip-confirm-access/lib.js');

const SETTINGS = '/index.php/index/en/admin/settings';
const GRID = '/index.php/index/$$$call$$$/grid/navigation-menus';

/** Send one request from the open page, with its cookies and CSRF token. */
function send(page, url, method = 'GET', form = null) {
    return page.evaluate(
        async ({url, method, form}) => {
            const body = form ? new URLSearchParams({...form, csrfToken: pkp.currentUser.csrfToken}) : undefined;
            const r = await fetch(url, {method, body});
            const text = await r.text();
            let j = null;
            try {
                j = JSON.parse(text);
            } catch (e) {}
            return {status: r.status, ok: j ? j.status : null, said: j && j.status === false ? String(j.content).slice(0, 200) : null, content: j ? String(j.content || '') : text};
        },
        {url, method, form},
    );
}

async function itemIds(page, app) {
    const r = await send(page, app.url(`${GRID}/navigation-menu-items-grid/fetch-grid`));
    const ids = [...new Set([...r.content.matchAll(/navigationmenuitemsgrid-row-(\d+)/gi)].map((m) => Number(m[1])))];
    return {status: r.status, ok: r.ok, ids};
}

async function openSettings(page, app) {
    const r = await L.openAdmin(page, app, SETTINGS);
    if (r.confirmAccess) await L.answerConfirmAccess(page);
    return {asked: !!r.confirmAccess, landed: L.path(page)};
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('residual.js runs on a dataset fleet');
    const facts = {app: app.name};
    const cfg = L.setPasswordTimeout(app, 1);
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        facts.open = await openSettings(page, app);
        facts.before = await itemIds(page, app);
        const victim = facts.before.ids[facts.before.ids.length - 1];
        await L.sleep(120_000);
        const menus = await send(page, app.url(`${GRID}/navigation-menus-grid/fetch-grid`));
        facts.expired = {
            menusGridFetch: {status: menus.status, ok: menus.ok, said: menus.said},
            deleteItem: victim,
            delete: await send(page, app.url(`${GRID}/navigation-menu-items-grid/delete-navigation-menu-item?navigationMenuItemId=${victim}`), 'POST', {}),
        };
        delete facts.expired.delete.content;
        facts.reopen = await openSettings(page, app);
        facts.after = await itemIds(page, app);
        facts.deleted = !facts.after.ids.includes(victim);
    } finally {
        record('residual', facts);
        cfg.restore();
        await close();
    }
});
