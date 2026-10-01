// Kept walk for docs/issues/U44-A9-urn-assign-offered-without-edit-permission.md (spec U44 register A9).
// Takes the report's Steps on a fresh load of PKP's default test dataset, through the screens:
//   Preconditions, as `rvaca`: Settings › Website › Plugins: tick "URN"; its "Settings": "Articles" ("Monographs"),
//     prefix urn:nbn:de:0000-, "Use default patterns.", namespace urn:nbn:de, resolver; "Save".
//   1-4  OJS `shellier` (Layout Editor) on submission 1, version 2; OMP `gcox` (Layout Editor) on submission 4:
//        the version's "Identifiers": "Save" and "Assign" as offered; "Assign"; "Metadata" and back.
//   5    OJS `sberardo` (Section Editor whose assignment has "Permissions" unticked in the dataset): the same.
//   6    Control: `dbarnes` presses "Assign", then "Save"; reload.
//   7    The Layout Editor again: "Clear" as offered; "Clear"; reload.
// Records every screen with screen(); prints one line per step. No assertions: the script records.
// Run (main):
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/urn-assign-offered-without-edit-permission/walk.js
// 3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front of both commands (feature issues-3_5).
const {forEachApp, launch, signOut, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const cfg = L.SETUP[app.name];
    const facts = {line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1200)}`); };
    if (!cfg) { fact('surface', 'no URN plugin on this app'); record('w-facts', facts); return; }
    const sid = cfg.submission;
    const pid = L.pubIdOf(app, sid, cfg.version);
    fact('submission', {sid, version: cfg.version, pid, assignments: L.assignments(app, sid)});
    const {page, close} = await launch(app);
    let n = 0;
    const nm = (x) => `w-${String(++n).padStart(2, '0')}-${x}`;
    try {
        // Preconditions: the URN plugin on, default patterns.
        await L.signIn(page, 'rvaca');
        fact('pre: URN plugin set up', await L.configureUrn(page, app, nm('pre-urn-settings'), {kinds: cfg.kinds, suffix: 'default', checkNo: false}));
        await signOut(page);

        const readOnlyRole = async (user, tagName) => {
            await L.signIn(page, user);
            fact(`${tagName} 1-2: ${user} Identifiers`, await L.openIdentifiers(page, app, sid, pid, nm(`${tagName}-identifiers`)));
            fact(`${tagName} 3: ${user} Assign`, await L.pressFieldButton(page, 'Assign', nm(`${tagName}-assign`)));
            fact(`${tagName} 4: ${user} Metadata and back`, await L.viaMetadataAndBack(page, nm(`${tagName}-back`)));
            await signOut(page);
        };

        await readOnlyRole(cfg.layout, 'layout');
        if (cfg.noPerm) await readOnlyRole(cfg.noPerm, 'noperm');

        // 6. Control: dbarnes "Assign", "Save", reload.
        await L.signIn(page, 'dbarnes');
        fact('6: dbarnes Identifiers', await L.openIdentifiers(page, app, sid, pid, nm('control-identifiers')));
        fact('6: dbarnes Assign', await L.pressFieldButton(page, 'Assign', nm('control-assign')));
        fact('6: dbarnes Save and reload', await L.saveAndReload(page, app, sid, pid, nm('control')));
        await signOut(page);

        // 7. The Layout Editor: "Clear" on the saved URN, then reload.
        await L.signIn(page, cfg.layout);
        fact(`7: ${cfg.layout} Identifiers`, await L.openIdentifiers(page, app, sid, pid, nm('layout-clear-identifiers')));
        fact(`7: ${cfg.layout} Clear`, await L.pressFieldButton(page, 'Clear', nm('layout-clear')));
        fact(`7: ${cfg.layout} reload`, await L.openIdentifiers(page, app, sid, pid, nm('layout-clear-reload')));
        await signOut(page);
    } finally {
        record('w-facts', facts);
        await close();
    }
});
