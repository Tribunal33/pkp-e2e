// Kept walk for docs/issues/U44-A10-urn-prefix-refusal-written-out-brackets.md (spec U44 register A10).
// Takes the report's Steps on a fresh load of PKP's default test dataset, through the screens:
//   As `rvaca`: Settings › Website › "Plugins": tick "URN"; its "Settings": tick "Articles" ("Monographs"),
//   "URN Prefix" nbn:de:0000-, "Namespace" urn:nbn:de, "Resolver URL" https://nbn-resolving.de/; "Save"; then "URN Prefix" urn:nbn:de:0000-, "Save" again (the refusal's
//   notice at the top right shows only with the next notice the page fetches).
// Then reads the message under "URN Prefix" (its text and its markup) and the notice at the top right.
// OPS has no URN plugin.
// Records every screen with screen(); prints one line per step. No assertions: the script records.
// Run (main): PROBE_FEATURE=issues-r27 PROBE_AGENT=r27 node bin/probe.js all shared/playwright/checks/issues/urn-prefix-refusal-written-out-brackets/walk.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r27-3_5 PROBE_AGENT=r27 node bin/probe.js all …
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const facts = {line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1200)}`); };
    if (!['ojs', 'omp'].includes(app.name)) { fact('surface', 'no URN plugin on this app'); record('w-facts', facts); return; }
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        fact('steps 2-4: URN settings window', await L.openUrnSettings(page, app, 'w-01-urn-settings'));
        await L.fillWindow(page, app, {prefix: 'nbn:de:0000-'});
        fact('step 8: Save with prefix nbn:de:0000-', await L.save(page, 'w-02-save-prefix-refused'));
        // 9. The page shows the refusal's notice only with the next notice it fetches: correct the prefix, "Save".
        await page.locator('#urnSettingsForm input[name="urnPrefix"]').fill('urn:nbn:de:0000-');
        fact('step 9: Save with prefix urn:nbn:de:0000-', await L.save(page, 'w-03-save-prefix-corrected'));
        if (await page.locator('#urnSettingsForm').isVisible().catch(() => false)) await L.closeWindow(page);
        await signOut(page);
    } finally {
        record('w-facts', facts);
        await close();
    }
});
