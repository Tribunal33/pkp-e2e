// Kept walk for docs/issues/U44-A14-cleared-urn-stays-on-tab.md (spec U44 register A14).
// Takes the report's Steps on a fresh load of PKP's default test dataset, through the screens:
//   Setup, as `rvaca`: Settings › Website › Plugins: tick "URN"; its "Settings": "Articles" and "Galleys"
//     (OMP: "Monographs", "Chapters" and "Publication Formats"), prefix urn:nbn:de:0000-, "Use default
//     patterns.", "Check Number" unticked, namespace urn:nbn:de, resolver; "Save".
//   As `dbarnes`, on each item (OJS submission 1 version 2's galley "PDF Version 2"; OMP submission 4's
//     chapter "Introduction: Contexts of Popular Culture" and a format "u44r24 EPUB" added on screen):
//     "Edit" › "Identifiers", "Save" (assigns the previewed URN); reopen; "Clear" › "OK"; read the tab;
//     close and reopen.
// After each step the script reads the item's settings table (read only) to show what is stored.
// Records every screen with screen(); prints one line per step. No assertions: the script records.
// Run (main): PROBE_FEATURE=issues-r24 PROBE_AGENT=r24 node bin/probe.js all shared/playwright/checks/issues/cleared-urn-stays-on-tab/walk.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r24-3_5 PROBE_AGENT=r24 node bin/probe.js all …
const {forEachApp, launch, signOut, record} = require('../../../probe');
const L = require('./lib');

const APPS = {
    ojs: {sid: 1, version: 2, kinds: ['enablePublicationURN', 'enableRepresentationURN'],
        items: [{kind: 'galley', label: 'PDF Version 2'}]},
    omp: {sid: 4, version: null, kinds: ['enablePublicationURN', 'enableChapterURN', 'enableRepresentationURN'],
        items: [{kind: 'chapter', label: 'Introduction: Contexts of Popular Culture'}, {kind: 'format', label: 'u44r24 EPUB', create: true}]},
};

forEachApp(async (app) => {
    const cfg = APPS[app.name];
    const facts = {line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    if (!cfg) { fact('surface', 'no URN plugin on this app'); record('w-facts', facts); return; }
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const {page, close} = await launch(app);
    let n = 0;
    const nm = (x) => `w-${String(++n).padStart(2, '0')}-${x}`;
    const pid = L.pubIdOf(app, cfg.sid, cfg.version);
    fact('publication', {sid: cfg.sid, version: cfg.version, pid});
    const open = (item, name) => (item.kind === 'galley' ? L.openGalleyWindow(page, app, cfg.sid, pid, item.label, name)
        : item.kind === 'chapter' ? L.openChapterWindow(page, app, cfg.sid, pid, item.label, name)
            : L.openFormatWindow(page, app, cfg.sid, pid, item.label, name));
    try {
        // Setup 1-3
        await L.signIn(page, 'rvaca');
        fact('setup: URN plugin', await L.configureUrn(page, app, nm('setup-urn'), {kinds: cfg.kinds, suffix: 'default', checkNo: false}));
        await signOut(page);
        // 4
        await L.signIn(page, 'dbarnes');
        for (const item of cfg.items) {
            const k = item.kind;
            if (item.create) fact(`${k}: Add publication format`, await L.addFormat(page, app, cfg.sid, pid, item.label, nm(`${k}-add`)));
            // 5-6
            fact(`${k} step5: window`, await open(item, nm(`${k}-step5-window`)));
            fact(`${k} step6: Identifiers`, await L.openIdTab(page, nm(`${k}-step6-identifiers`)));
            fact(`${k} step6: Save`, {...(await L.saveTab(page, nm(`${k}-step6-save`))), stored: L.storedUrns(app, k)});
            // 7
            await open(item, nm(`${k}-step7-window`));
            fact(`${k} step7: Identifiers`, await L.openIdTab(page, nm(`${k}-step7-identifiers`)));
            // 8
            fact(`${k} step8: Clear › OK`, {...(await L.clearUrn(page, 'ok', nm(`${k}-step8-clear`))), stored: L.storedUrns(app, k)});
            // 9
            await L.closeTopWin(page);
            await open(item, nm(`${k}-step9-window`));
            fact(`${k} step9: reopened`, await L.openIdTab(page, nm(`${k}-step9-identifiers`)));
            await L.closeTopWin(page);
        }
        await signOut(page);
    } catch (e) {
        fact('error', String(e.message || e).slice(0, 600));
        await L.snap(page, nm('error')).catch(() => {});
    } finally {
        record('w-facts', facts);
        await close();
    }
});
