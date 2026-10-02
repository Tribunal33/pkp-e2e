// Issue report docs/issues/U62-A3-upgrade-refusal-blames-gallery.md (U62 A3): the report's Steps to
// reproduce, walked through the screens on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"). The packages are built by ../failed-upgrade-removes-plugin/lib.js (product
// `u62g3test`, shared/playwright/support/pluginPackages.js).
//   (default)  as `admin`, Settings › Website › "Plugins": "Upload A New Plugin" 1.0.0.0; the row's
//              "Upgrade" with 1.0.0.0 (the same version); "Upgrade" with 1.0.1.0; "Upgrade" with
//              1.0.0.0 (an older version).
//   neighbour  (the fix's check): "Upload A New Plugin" 1.0.0.0; "Upload A New Plugin" 1.0.0.0
//              again (the install path's own refusal, which the fix leaves alone); "Upgrade" with
//              1.0.1.0 (still upgrades).
// The walk writes checkouts/<app>/plugins/generic/u62g3test: hold the app's checkout for its whole
// length; the script removes the folder at its end.
//
// Run (main):   npm run fleet-prep -- --feature issues-g3 --dataset 3 --reset   (before each mode)
//               PROBE_FEATURE=issues-g3 PROBE_AGENT=g3 node bin/probe.js all shared/playwright/checks/issues/upgrade-refusal-blames-gallery/walk.js [neighbour]
// 3.5: the same with PKP_E2E_LINE=stable-3_5_0, feature issues-g3-3_5, PROBE_RUN=r35.
// Facts: .reports/<feature>/g3/a3-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, record, outDir} = require('../../../probe');
const L = require('../failed-upgrade-removes-plugin/lib');

const MODE = process.argv[2] || 'steps';

forEachApp(async (app) => {
    const fact = (k, v) => {
        record('a3-facts', {[k]: v}, {merge: true});
        console.log('[a3]', app.name, k, JSON.stringify(v).slice(0, 700));
    };
    const pkg = L.buildPackages(outDir());
    fact('mode', MODE);
    fact('foldersBefore', L.ourFolders(app));
    const {page, close} = await launch(app);
    try {
        // 1–2: sign in as admin; Settings › Website › "Plugins".
        await signIn(page, 'admin');
        const w = await L.openWebsitePlugins(page, app.contextPath);
        const list = w.list;
        // 3: "Upload A New Plugin" 1.0.0.0.
        fact('install100', await L.sendPackage(page, list, 'upload', pkg.v100));
        fact('folder.afterInstall', L.folderRelease(app));
        await L.snap(page, 'a3-01-installed');
        if (MODE === 'neighbour') {
            fact('nb.upload100again', await L.sendPackage(page, list, 'upload', pkg.v100));
            await L.snap(page, 'a3-nb-02-upload-same');
            fact('nb.upgrade101', await L.sendPackage(page, list, 'upgrade', pkg.v101));
            fact('nb.folder', L.folderRelease(app));
            await L.snap(page, 'a3-nb-03-upgraded');
            return;
        }
        // 4: "Upgrade" with the same version.
        fact('upgradeSame100', await L.sendPackage(page, list, 'upgrade', pkg.v100));
        fact('folder.afterSame', L.folderRelease(app));
        await L.snap(page, 'a3-02-upgrade-same');
        // 5: "Upgrade" with 1.0.1.0.
        fact('upgrade101', await L.sendPackage(page, list, 'upgrade', pkg.v101));
        fact('folder.after101', L.folderRelease(app));
        await L.snap(page, 'a3-03-upgraded-101');
        // 6: "Upgrade" with the older 1.0.0.0.
        fact('upgradeOlder100', await L.sendPackage(page, list, 'upgrade', pkg.v100));
        fact('folder.afterOlder', L.folderRelease(app));
        await L.snap(page, 'a3-04-upgrade-older');
    } finally {
        await close().catch(() => {});
        fact('foldersRemoved', L.removeOurFolders(app));
    }
});
