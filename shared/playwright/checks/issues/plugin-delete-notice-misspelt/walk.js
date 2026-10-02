// U62 A7: the notice after deleting a plugin reads "successfuly".
// Report: docs/issues/U62-A7-plugin-delete-notice-misspelt.md. Steps: as the Site Administrator (`admin`), on
// Settings › Website › "Plugins", upload a scratch plugin package with "Upload A New Plugin", then the row's
// "Delete" › "OK"; record the notice.
//
//   npm run fleet-prep -- --feature issues-g5 --dataset 5 --reset
//   PROBE_FEATURE=issues-g5 PROBE_AGENT=g5 node bin/probe.js all shared/playwright/checks/issues/plugin-delete-notice-misspelt/walk.js
//
// MODE=nb (the neighbour check, run alone): the same steps in the French interface (fr_CA), whose notice is the
// French translation and must read the same with the fix in and out. Run the trial's walks under PROBE_RUN=fix,
// nb-in, nb-out; a 3.5 walk under PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 with its line fleet's feature.
//
// The package is built here (shared/playwright/support/pluginPackages.js) under the product name u62g5test, the
// only plugin this script installs or deletes. Its folder (plugins/generic/u62g5test of the app checkout, which
// every fleet of the slot serves) is removed in `finally` if the delete left it, and `git status` of the app's and
// lib/pkp's plugins/ is recorded. No assertions: the script records, the reader judges.
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, outDir} = require('../../../probe');
const {buildPlugin, pluginNames, pluginFolders, removePluginFolders} = require('../../../support/pluginPackages');
const L = require('./lib');

const MODE = process.env.MODE === 'nb' ? 'nb' : 'steps';
const LOCALE = MODE === 'nb' ? 'fr_CA' : 'en';
const PRODUCT = 'u62g5test';
const NAME = 'U62g5 Test Plugin';
const {id: ROW} = pluginNames(PRODUCT);

forEachApp(async (app) => {
    const R = `g5-${MODE}`;
    const fact = (k, v) => { record(R, {[k]: v}, {merge: true}); console.log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 1500)); };
    const root = path.resolve(app.root);
    const gitPlugins = () => {
        const gs = (dir) => { try { return execFileSync('git', ['-C', dir, 'status', '--porcelain', '--', 'plugins']).toString().trim(); } catch (e) { return `git failed ${L.flat(e.message, 80)}`; } };
        return {app: gs(root), lib: gs(path.join(root, 'lib', 'pkp'))};
    };
    fact('before', {mode: MODE, locale: LOCALE, folders: pluginFolders(root, [PRODUCT]), git: gitPlugins()});
    const pkg = buildPlugin(outDir(), {product: PRODUCT, version: '1.0.0.0', displayName: NAME});
    const {page, close} = await launch(app);
    try {
        // 1. Sign in as admin.
        await signIn(page, 'admin');
        // 2. Settings › Website › "Plugins".
        fact('open', await L.openWebsitePlugins(page, app, app.contextPath, LOCALE));
        record(`${R}-list`, await screen(page));
        // 3. "Upload A New Plugin", the package, "Save".
        try { fact('upload', await L.uploadPlugin(page, pkg)); } catch (e) { fact('upload-error', L.flat(e.stack, 600)); }
        fact('listedAfterUpload', await L.rowLoc(page, ROW).count() > 0);
        record(`${R}-installed`, await screen(page));
        // 4–5. The row's arrow › "Delete" › "OK".
        try { fact('delete', await L.deletePlugin(page, ROW)); } catch (e) { fact('delete-error', L.flat(e.stack, 600)); }
        record(`${R}-deleted`, await screen(page));
        await shot(page, `${R}-deleted`);
        // The list after a reload.
        await L.openWebsitePlugins(page, app, app.contextPath, LOCALE);
        fact('listedAfterReload', await L.rowLoc(page, ROW).count() > 0);
        await signOut(page).catch(() => {});
    } finally {
        await close();
        const left = removePluginFolders(root, [PRODUCT]);
        fact('after', {foldersRemovedByScript: left, folders: pluginFolders(root, [PRODUCT]), git: gitPlugins()});
    }
});
