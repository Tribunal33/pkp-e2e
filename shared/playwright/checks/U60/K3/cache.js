// U60 claim check K3, a follow-up: does a visitor who already had the site's
// home page open see a changed "Colour" on the next page they open? The
// visitor's browser keeps its cache between the loads; the admin saves the
// site's "Theme" tab in another browser, and the colour is put back after.
// Run: PROBE_FEATURE=U60 PROBE_AGENT=ccK3 node bin/probe.js <app|all> shared/playwright/checks/U60/K3/cache.js
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const visB = await page.context().browser().newContext({baseURL: app.baseURL});
    const vis = await visB.newPage();
    const home = app.url('/index.php/index/en');
    const login = app.url('/index.php/index/en/login');
    const bg = async () => vis.evaluate(() => getComputedStyle(document.querySelector('.pkp_structure_head')).backgroundColor);
    const cssHeaders = [];
    vis.on('response', (r) => { if (/css\?name=stylesheet/.test(r.url())) cssHeaders.push({status: r.status(), fromCache: r.fromServiceWorker(), url: r.url().replace(/^https?:\/\/[^/]+/, ''), lastModified: r.headers()['last-modified'] || null, cacheControl: r.headers()['cache-control'] || null}); });
    const out = {};
    const panel = () => page.locator('#appearance').locator('[role="tabpanel"]').filter({has: page.locator('[id^="theme-"]')}).first();
    const setColour = async (hex) => {
        await page.goto(app.url('/index.php/index/en/admin/settings')); await idle(page);
        await page.locator('#appearance-button').first().click(); await idle(page);
        await page.locator('#appearance').getByRole('tab', {name: 'Theme', exact: true}).first().click(); await idle(page);
        const box = panel().locator('.pkpFormField').filter({hasText: /^Colour/}).first().locator('input').first();
        await box.click(); await box.fill(hex); await box.press('Enter').catch(() => {}); await box.blur().catch(() => {});
        await sleep(300);
        const w = page.waitForResponse((r) => /api\/v1\/site\/theme/.test(r.url()), {timeout: 20000});
        await panel().getByRole('button', {name: 'Save', exact: true}).last().click();
        return (await w).status();
    };
    try {
        await vis.goto(home); await idle(vis);
        out.before = await bg();
        await signIn(page, 'admin'); await idle(page);
        out.save = await setColour('#8B0000');
        await sleep(1500);
        await vis.goto(login); await idle(vis);
        out.nextPageLink = {bg: await bg()};
        record('cache-next-page', {out, screen: await screen(vis)});
        await vis.goto(home); await idle(vis);
        out.homeAgain = await bg();
        await vis.reload(); await idle(vis);
        out.afterReload = await bg();
        const fresh = await page.context().browser().newContext({baseURL: app.baseURL}).then((c) => c.newPage());
        await fresh.goto(home); await idle(fresh);
        out.freshBrowser = await fresh.evaluate(() => getComputedStyle(document.querySelector('.pkp_structure_head')).backgroundColor);
    } finally {
        out.restore = await setColour('#1E6292').catch((e) => String(e.message));
        out.cssResponses = cssHeaders;
        record('cache', out);
        console.log(JSON.stringify(out, null, 1));
        await signOut(page).catch(() => {});
        await visB.close().catch(() => {});
        await close();
    }
});
