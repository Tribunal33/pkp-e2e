// Kept walk for docs/issues/U44-A8-urn-suffix-pattern-refusal-text-code.md (spec U44 register A8).
// Takes the report's Steps on a fresh load of PKP's default test dataset, through the screens, as `rvaca`:
//   Settings › Website › "Plugins": tick "URN", its "Settings"; tick every kind under "Journal Content"
//   ("Press Content"), prefix urn:nbn:de:0000-, "Use the pattern entered below…", three spaces in every
//   pattern box, namespace urn:nbn:de, resolver https://nbn-resolving.de/, "Save".
//   Control: the same window with the pattern boxes empty ("This field is required.", the browser's own check).
// Records every screen with screen(); prints one line per step. No assertions: the script records.
// Run (main):  PROBE_FEATURE=issues-r26 PROBE_AGENT=r26 node bin/probe.js all shared/playwright/checks/issues/urn-suffix-pattern-refusal-text-code/walk.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r26-3_5 PROBE_AGENT=r26 node bin/probe.js all …
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const facts = {line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    if (!L.KINDS[app.name]) { fact('surface', 'no URN plugin on this app'); record('w-facts', facts); return; }
    const {page, close} = await launch(app);
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
    try {
        // 1-4.
        await signIn(page, 'rvaca');
        fact('step1-4: settings window', await L.openUrnSettings(page, app, 'w-01-urn-settings-open'));
        // Control: every box empty.
        await L.fillWindow(page, app, {boxText: () => ''});
        const c = await L.save(page, app, 'w-02-control-empty-boxes');
        fact('control: empty boxes', {saveStatus: c.saveStatus, boxes: c.boxes, top: c.top, notices: c.notices});
        // 5-10: three spaces in every box.
        fact('step5-9: typed', await L.fillWindow(page, app, {boxText: () => '   '}));
        const s = await L.save(page, app, 'w-03-step10-spaces-saved');
        fact('step10: Save', {saveStatus: s.saveStatus, windowOpen: s.windowOpen, top: s.top, boxes: s.boxes, notices: s.notices, rawKeys: s.rawKeys});
        fact('step10: window text', s.window);
    } finally {
        fact('page errors', errors);
        record('w-facts', facts);
        await close();
    }
});
