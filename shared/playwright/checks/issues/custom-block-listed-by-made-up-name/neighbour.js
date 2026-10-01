// Neighbour check for the fix of docs/issues/U09-A1-custom-block-listed-by-made-up-name.md:
// what the fix must leave as it is (the block's identifier and place in the sidebar, the
// other blocks' "Sidebar" labels, the public pages), and the French interface's reading
// of a block with an English title only. Walked with the fix in and out, each on a fleet
// freshly reset to the default dataset; everything through the screens.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
// Run:          PROBE_FEATURE=issues-ir2 PROBE_AGENT=ir2 PROBE_RUN=<fixin|fixout> node bin/probe.js all shared/playwright/checks/issues/custom-block-listed-by-made-up-name/neighbour.js
const {forEachApp, launch, signIn, record, idle} = require('../../../probe');
const L = require('../custom-block-stuck-with-unusable-name/lib');

forEachApp(async (app) => {
    const ctx = app.contextPath;
    const fact = (k, v) => { record('a1-neighbour', {[k]: v}, {merge: true}); console.log('[neighbour]', app.name, k, JSON.stringify(v).slice(0, 900)); };
    const {page} = await launch(app);
    const visitor = (await launch(app)).page;
    const errs = L.scriptErrors(page);
    const entries = (list) => list.map((o) => `${o.checked ? '[x]' : '[ ]'} ${o.value} = ${o.label.split('\n')[0]}`);

    await signIn(page, 'rvaca');
    await L.openPlugins(app, page);
    await L.enablePlugin(page);
    await L.openManager(page);
    const {rows} = await L.addBlock(page, 'Our Partners', 'Partner list');
    const name = rows[0].name;
    fact('sidebar-before', entries(await L.openSidebarList(app, page, ctx)));
    fact('sidebar-save', await L.placeAndRead(page, [name]));
    fact('sidebar-after', entries(await L.openSidebarList(app, page, ctx)));
    fact('public-en', await L.publicSidebar(app, visitor, ctx));
    await visitor.goto(app.url(`/index.php/${ctx}/fr_CA`));
    await idle(visitor);
    fact('public-fr', await visitor.locator('.pkp_structure_sidebar .pkp_block').evaluateAll((els) => els.map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)));
    await L.changeLanguage(page, /^\s*français\s*$/i, 'fr_CA');
    await L.openPlugins(app, page, 'fr_CA');
    fact('list-fr', await L.openManager(page));
    await page.goto(app.url(`/index.php/${ctx}/fr_CA/management/settings/website`));
    await idle(page);
    await page.locator('#appearance-button').first().click();
    await idle(page);
    await page.locator('#appearance [role="tab"]').filter({hasText: /Configuration|Setup/}).first().click();
    await page.locator('input[name="sidebar"]').first().waitFor({timeout: L.T});
    fact('sidebar-fr', await page.locator('input[name="sidebar"]').evaluateAll((els) => els.map((e) => `${e.checked ? '[x]' : '[ ]'} ${e.value} = ${(e.closest('label') || e.parentElement).innerText.trim().split('\n')[0]}`)));
    fact('scriptErrors', errs.filter((e) => !/Failed to load resource/.test(e)));
});
