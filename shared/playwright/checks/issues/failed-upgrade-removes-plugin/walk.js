// Issue report docs/issues/U62-A5-failed-upgrade-removes-plugin.md (U62 A5): the report's Steps to
// reproduce, walked through the screens on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"). The packages are built by ./lib.js (product `u62g3test`,
// shared/playwright/support/pluginPackages.js; the failing 1.0.1.0 adds an upgrade.xml whose
// migration alters a table the install does not have).
//   (default)  as `admin`, Settings › Website › "Plugins": "Upload A New Plugin" 1.0.0.0; tick its
//              box; the row's "Upgrade" with the failing 1.0.1.0; the list, then the page reloaded;
//              "Upload A New Plugin" 1.0.0.0 again (the way round).
//   neighbour  (the fix's check): "Upload A New Plugin" 1.0.0.0; tick it; "Upgrade" with the plain
//              1.0.1.0 (the successful upgrade still replaces the files); the page reloaded.
// The walk writes checkouts/<app>/plugins/generic/u62g3test: hold the app's checkout for its whole
// length; the script removes the folder at its end.
//
// Run (main):   npm run fleet-prep -- --feature issues-g3 --dataset 3 --reset   (before each mode)
//               PROBE_FEATURE=issues-g3 PROBE_AGENT=g3 node bin/probe.js all shared/playwright/checks/issues/failed-upgrade-removes-plugin/walk.js [neighbour]
// 3.5: the same with PKP_E2E_LINE=stable-3_5_0, feature issues-g3-3_5, PROBE_RUN=r35.
// Facts: .reports/<feature>/g3/a5-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, record, outDir, serverLog, sql} = require('../../../probe');
const L = require('./lib');

const MODE = process.argv[2] || 'steps';

forEachApp(async (app) => {
    const fact = (k, v) => {
        record('a5-facts', {[k]: v}, {merge: true});
        console.log('[a5]', app.name, k, JSON.stringify(v).slice(0, 700));
    };
    const versions = () => sql(app, `SELECT major||'.'||minor||'.'||revision||'.'||build||' current='||current FROM versions WHERE product='${L.PRODUCT}' ORDER BY date_installed`);
    const pkg = L.buildPackages(outDir());
    fact('mode', MODE);
    fact('foldersBefore', L.ourFolders(app));
    const {page, close} = await launch(app);
    try {
        // 1: sign in as admin; Settings › Website › "Plugins".
        await signIn(page, 'admin');
        const w = await L.openWebsitePlugins(page, app.contextPath);
        const list = w.list;
        // 2: "Upload A New Plugin" 1.0.0.0.
        fact('install100', await L.sendPackage(page, list, 'upload', pkg.v100));
        // 3: tick its box.
        fact('tick', await L.tick(page, list));
        fact('folder.before', L.folderRelease(app));
        await L.snap(page, 'a5-01-installed-ticked');
        // 4: "Upgrade" with the failing (or, as the neighbour, the plain) 1.0.1.0.
        const log = serverLog(app);
        const from = log.mark();
        const file = MODE === 'neighbour' ? pkg.v101 : pkg.v101fail;
        fact('upgrade', await L.sendPackage(page, list, 'upgrade', file));
        fact('upgrade.serverLog', log.since(from));
        fact('folder.afterUpgrade', L.folderRelease(app));
        fact('versions.afterUpgrade', versions());
        await L.snap(page, 'a5-02-after-upgrade');
        // 5: reload the page, "Plugins" again.
        await w.reload().catch((e) => fact('reloadError', L.flat(e.message, 200)));
        fact('row.afterReload', await L.rowFacts(list));
        await L.snap(page, 'a5-03-reloaded');
        if (MODE === 'neighbour') return;
        // 6: the way round: "Upload A New Plugin" 1.0.0.0 again.
        fact('reinstall100', await L.sendPackage(page, list, 'upload', pkg.v100));
        fact('folder.afterReinstall', L.folderRelease(app));
        fact('versions.afterReinstall', versions());
        await L.snap(page, 'a5-04-reinstalled');
    } finally {
        await close().catch(() => {});
        fact('foldersRemoved', L.removeOurFolders(app));
    }
});
