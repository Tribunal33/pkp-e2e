// Neighbour check for docs/issues/U09-A12-static-page-add-after-plugin-off-server-error.md:
// the fix must change only the answer to a component address no handler serves.
// Signed in as `dbarnes` on PKP's default test dataset (OJS, OMP):
//   n3. the Plugins grid's own list loads (Settings › Website › "Plugins"): 200
//   n4. a typed address naming that real grid and an operation it lacks: 404, no server error
// Run with the fix in and out (PROBE_RUN=fix | nofix):
//   PROBE_RUN=nofix PROBE_FEATURE=issues-ir6 PROBE_AGENT=ir6 ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/static-page-add-after-plugin-off-server-error/neighbour.js
const {forEachApp, launch, signIn, record, idle} = require('../../../probe');
const L = require('../setup-save-refused-disabled-block/lib');

forEachApp(async (app) => {
    if (app.name === 'ops') return;
    const fact = (k, v) => { record('neighbour-facts', {[k]: v}, {merge: true}); console.log('[neighbour]', app.name, k, JSON.stringify(v).slice(0, 600)); };
    const {page} = await launch(app);
    const log = L.serverLog(app);
    await signIn(page, 'dbarnes');
    const grid = page.waitForResponse((r) => /settings-plugin-grid\/fetch-grid/.test(r.url()), {timeout: L.T});
    await L.openPlugins(app, page);
    fact('n3-plugins-grid', {status: (await grid).status(), rows: await page.locator('tr.gridRow').count()});
    const from = log.size();
    const r = await page.goto(app.url(`/index.php/${app.contextPath}/$$$call$$$/grid/settings/plugins/settings-plugin-grid/no-such-op`));
    await idle(page).catch(() => {});
    fact('n4-unknown-operation', {status: r.status(), log: log.since(from, /error|exception/i).slice(0, 3)});
});
