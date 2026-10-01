// Neighbour check for docs/issues/U44-A8-urn-suffix-pattern-refusal-text-code.md (spec U44 register A8),
// walked with the proposed fix in and out: the fix must change nothing but the pattern boxes' refusal text.
// On a fresh load of PKP's default test dataset, as `rvaca`, in the URN plugin's settings window:
//   1. every kind ticked, the pattern choice, a real pattern in every box, "URN Prefix" nbn:de:0000- (no "urn:"):
//      refused on the server with the prefix's own message and nothing under the pattern boxes;
//   2. "URN Prefix" urn:nbn:de:0000-: saved, "Your changes have been saved.";
//   3. "Settings" again: the window shows the patterns as saved.
// Run (main): PROBE_FEATURE=issues-r26 PROBE_AGENT=r26 node bin/probe.js all shared/playwright/checks/issues/urn-suffix-pattern-refusal-text-code/neighbour.js
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const facts = {line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    if (!L.KINDS[app.name]) { fact('surface', 'no URN plugin on this app'); record('n-facts', facts); return; }
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        await L.openUrnSettings(page, app, 'n-01-urn-settings-open');
        await L.fillWindow(page, app, {boxText: (k) => k.pattern, prefix: 'nbn:de:0000-'});
        const r = await L.save(page, app, 'n-02-bad-prefix');
        fact('n1: patterns + bad prefix', {saveStatus: r.saveStatus, windowOpen: r.windowOpen, top: r.top, boxes: r.boxes, notices: r.notices, rawKeys: r.rawKeys});
        await L.fillWindow(page, app, {boxText: (k) => k.pattern});
        const s = await L.save(page, app, 'n-03-saved');
        fact('n2: patterns saved', {saveStatus: s.saveStatus, windowOpen: s.windowOpen, saveAnswer: s.saveAnswer, notices: s.notices});
        await L.openUrnSettings(page, app, 'n-04-reopened');
        const kept = {};
        for (const k of L.KINDS[app.name]) kept[k.label] = await L.form(page).locator(`input[name="${k.box}"]`).inputValue();
        kept.patternChoice = await L.form(page).locator('input[type=radio][name="urnSuffix"][value="pattern"]').isChecked();
        fact('n3: reopened', kept);
    } finally {
        record('n-facts', facts);
        await close();
    }
});
