// Issue report docs/issues/U40-OMP5-book-page-license-link-no-address.md (U40 OMP5): a press with
// License Terms and no license shows, on a book's page, a "License" link with no address above the
// terms. Takes the report's Steps on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"): the press `publicknowledge` and its published book 14, which carries no
// License URL; on a journal (article 17) and a preprint server (preprint 2) the same steps are the
// control. The steps create nothing but the License Terms text; the kit builds nothing.
//
//   1-3. sign in as dbarnes; Settings > Distribution > "License": License Terms typed, "Save"
//   4-5. sign out; the item's page: the "License" block, then a click on its link (OMP)
//
// WALK=neighbour (OMP alone, fix in and out; the press's terms set as in steps 1-3): book 14
// unpublished on screen ("Unpublish"), its "Permissions & Disclosure" License URL set to another
// license's address, then to a Creative Commons one, the book's page (the editor's preview) read
// after each: the link keeps its address, the badge shows with no link beside it.
//
// Reset first:  npm run fleet-prep -- --feature issues-r4 --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-r4 PROBE_AGENT=r4 node bin/probe.js all shared/playwright/checks/issues/book-page-license-link-no-address/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-r4-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r4-3_5 PROBE_AGENT=r4 node bin/probe.js all shared/playwright/checks/issues/book-page-license-link-no-address/walk.js
// Facts: .reports/<feature>/r4/omp5-[neighbour-]facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, sql, serverLog, idle} = require('../../../probe');
const {setLicenseTerms, readLicenseBlock, ITEM} = require('./lib');

const MODE = process.env.WALK || 'walk';
const TERMS = 'Books of this press may be shared for teaching u40r4.';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    if (MODE === 'neighbour' && app.name !== 'omp') return;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
    };
    const name = (s) => (MODE === 'walk' ? `omp5-${s}` : `omp5-${MODE}-${s}`);
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    try {
        const ctx = app.contextTables;
        fact('before: context license settings', sql(app, `select setting_name, locale, left(setting_value, 80) from ${ctx.settings} where setting_name in ('licenseUrl', 'licenseTerms') order by 1, 2`));
        // 1-3
        await signIn(page, 'dbarnes');
        try {
            fact('3 License tab, Save', await setLicenseTerms(page, app, TERMS));
        } catch (e) {
            fact('3 License tab error', String(e.message).slice(0, 300));
        }
        record(name('3-license-tab'), await screen(page).catch((e) => ({error: e.message})));
        await shot(page, name('3-license-tab')).catch(() => {});
        fact('after: context license settings', sql(app, `select setting_name, locale, left(setting_value, 80) from ${ctx.settings} where setting_name in ('licenseUrl', 'licenseTerms') order by 1, 2`));
        if (MODE === 'walk') {
            // 4
            await signOut(page);
            await page.goto(app.url(`/index.php/${app.contextPath}/${ITEM[app.name].path}`));
            await idle(page);
            fact('4 item page', ITEM[app.name].path);
            fact('5 License block', await readLicenseBlock(page));
            record(name('4-item'), await screen(page));
            await shot(page, name('4-item')).catch(() => {});
            // 5: the link, when there is one
            const link = page.locator('.item.license a, .item.copyright a').filter({hasText: /^\s*License\s*$/}).first();
            if (await link.count()) {
                const before = page.url();
                const navs = [];
                const onNav = (r) => { if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) navs.push(`${r.status()} ${r.url()}`); };
                page.on('response', onNav);
                await link.click();
                await page.waitForLoadState('load').catch(() => {});
                await idle(page);
                page.off('response', onNav);
                fact('5 click on "License"', {before, after: page.url(), navigations: navs, samePage: page.url() === before});
            } else {
                fact('5 click on "License"', 'no link labelled "License" in the block');
            }
        } else {
            const nb = require('./lib');
            fact('nb unpublish', await nb.unpublish(page, app, 14));
            for (const [label, url] of [['other', 'https://example.org/u40r4-license'], ['cc', 'https://creativecommons.org/licenses/by/4.0/']]) {
                fact(`nb ${label} save`, await nb.setPublicationLicenseUrl(page, app, 14, url));
                fact(`nb ${label} stored`, sql(app, `select setting_value from publication_settings where publication_id = 14 and setting_name = 'licenseUrl'`));
                await page.goto(app.url(`/index.php/${app.contextPath}/catalog/book/14`));
                await idle(page);
                fact(`nb ${label} License block (preview)`, await readLicenseBlock(page));
                record(name(`book-${label}`), await screen(page));
            }
        }
        fact('server log', log.since(from));
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
