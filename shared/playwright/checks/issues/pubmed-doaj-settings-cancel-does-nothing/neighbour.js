// Neighbour check of issue report docs/issues/U63-OJS5-pubmed-doaj-settings-cancel-does-nothing.md (U63 OJS5) {OJS}:
// what the fix must leave alone, walked with the fix in and out. On each tool's "Settings" tab (as dbarnes):
//   N1  a typed change, then another tab: the browser still asks "The data on this form has changed. …"
//   N2  back on "Settings", the change still there; "Save" saves it ("Your changes have been saved."),
//       and a reload shows it kept
// Reset first:  npm run fleet-prep -- --feature issues-ir19 --dataset 1 --reset
// Run:          PROBE_FEATURE=issues-ir19 PROBE_AGENT=ir19 [PROBE_RUN=fix] node bin/probe.js ojs shared/playwright/checks/issues/pubmed-doaj-settings-cancel-does-nothing/neighbour.js
const {forEachApp, launch, signIn, screen, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const {page, close} = await launch(app);
    const asked = L.answerDialogs(page);
    try {
        await signIn(page, 'dbarnes');
        for (const [key, text] of [['pubmed', 'J Pub Knowl u63ir19'], ['doaj', 'u63ir19-key']]) {
            await L.openTool(page, app, key);
            fact(`${key} form`, await L.readForm(page, key));
            await L.typeChange(page, key, text);
            const other = (await L.tabNames(page, key)).find((n) => n !== 'Settings');
            fact(`${key} N1 ${other} tab`, {open: await L.pressTab(page, key, other), asked: asked.take()});
            await L.pressTab(page, key, 'Settings');
            fact(`${key} N2 Settings again`, await L.readForm(page, key));
            const status = await L.pressSave(page, key);
            fact(`${key} N2 Save`, {status, notices: (await screen(page)).notices});
            await L.openTool(page, app, key);
            fact(`${key} N2 after reload`, {form: await L.readForm(page, key), asked: asked.take()});
            record(`${key}-saved`, await screen(page));
        }
    } finally {
        record('neighbour-facts', facts);
        await close();
    }
});
