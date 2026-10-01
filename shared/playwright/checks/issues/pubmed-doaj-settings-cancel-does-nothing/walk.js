// Issue report docs/issues/U63-OJS5-pubmed-doaj-settings-cancel-does-nothing.md (U63 OJS5) {OJS}:
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets").
//
//   1-2   (as dbarnes) Tools › Import/Export › "PubMed XML Export Plugin" (opens on "Settings")
//   3-4   type "J Pub Knowl u63ir19" in "NLM Title Abbreviation", press "Cancel"
//   5-7   "Export Articles" tab (asked or not), "Settings" again, reload
//   8-12  the same on "DOAJ Export Plugin": "DOAJ API Key" and the automatic-deposit box, "Cancel",
//         "Articles" (or "Publications"), "Settings", reload
//   C     control: type on PubMed "Settings" and press "Export Articles" without "Cancel"
//
// The browser's questions are answered "OK" and recorded. The kit builds nothing.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir19 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir19 PROBE_AGENT=ir19 node bin/probe.js ojs shared/playwright/checks/issues/pubmed-doaj-settings-cancel-does-nothing/walk.js
// The fix:      node bin/try-fix.js apply shared/playwright/checks/issues/pubmed-doaj-settings-cancel-does-nothing/fix.diff ojs
//               (reset, walk, neighbour.js), then node bin/try-fix.js revert …/fix.diff ojs
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir19-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir19-3_5 PROBE_AGENT=ir19 node bin/probe.js ojs shared/playwright/checks/issues/pubmed-doaj-settings-cancel-does-nothing/walk.js
const {forEachApp, launch, signIn, screen, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // the PubMed and DOAJ tools are OJS's alone
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const {page, close} = await launch(app);
    const asked = L.answerDialogs(page);
    try {
        // 1-2
        await signIn(page, 'dbarnes');
        fact('2 PubMed opened', {status: await L.openTool(page, app, 'pubmed'), tabs: await L.tabNames(page, 'pubmed')});
        fact('2 PubMed form', await L.readForm(page, 'pubmed'));
        record('2-pubmed-settings', await screen(page));

        // 3-4
        await L.typeChange(page, 'pubmed', 'J Pub Knowl u63ir19');
        fact('3 typed', await L.readForm(page, 'pubmed'));
        fact('4 Cancel', await L.pressCancel(page, 'pubmed'));
        fact('4 form after Cancel', await L.readForm(page, 'pubmed'));
        fact('4 asked', asked.take());
        record('4-pubmed-after-cancel', await screen(page));

        // 5-7
        fact('5 Export Articles tab', {open: await L.pressTab(page, 'pubmed', 'Export Articles'), asked: asked.take()});
        fact('6 Settings tab', {open: await L.pressTab(page, 'pubmed', 'Settings'), form: await L.readForm(page, 'pubmed')});
        await L.openTool(page, app, 'pubmed');
        fact('7 after reload', {form: await L.readForm(page, 'pubmed'), asked: asked.take()});
        record('7-pubmed-reloaded', await screen(page));

        // 8-12
        fact('8 DOAJ opened', {status: await L.openTool(page, app, 'doaj'), tabs: await L.tabNames(page, 'doaj')});
        fact('8 DOAJ form', await L.readForm(page, 'doaj'));
        record('8-doaj-settings', await screen(page));
        await L.typeChange(page, 'doaj', 'u63ir19-key');
        fact('9 typed', await L.readForm(page, 'doaj'));
        fact('10 Cancel', await L.pressCancel(page, 'doaj'));
        fact('10 form after Cancel', await L.readForm(page, 'doaj'));
        fact('10 asked', asked.take());
        record('10-doaj-after-cancel', await screen(page));
        const list = (await L.tabNames(page, 'doaj')).find((n) => n !== 'Settings');
        fact('11 list tab', {name: list, open: await L.pressTab(page, 'doaj', list), asked: asked.take()});
        fact('12 Settings tab', {open: await L.pressTab(page, 'doaj', 'Settings'), form: await L.readForm(page, 'doaj')});
        await L.openTool(page, app, 'doaj');
        fact('12 after reload', {form: await L.readForm(page, 'doaj'), asked: asked.take()});
        record('12-doaj-reloaded', await screen(page));

        // C. control: the same change, no Cancel, then another tab
        await L.openTool(page, app, 'pubmed');
        await L.typeChange(page, 'pubmed', 'J Pub Knowl u63ir19');
        fact('C Export Articles tab without Cancel', {open: await L.pressTab(page, 'pubmed', 'Export Articles'), asked: asked.take()});
    } finally {
        record('facts', facts);
        await close();
    }
});
