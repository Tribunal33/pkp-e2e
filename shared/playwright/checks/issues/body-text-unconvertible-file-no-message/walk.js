// Issue report docs/issues/U48-A18-body-text-unconvertible-file-no-message.md (U48 A18): a file
// sent to the Body Text editor that the converter cannot read ends the "Importing document" box
// with no message. Walked through the screens on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), OJS only. The kit builds nothing.
//
// MODE=walk (default), submission 5 "Genetic transformation of forest trees" (Production):
//   1. sign in as dbarnes; 2. open the workflow; 3. "Production" › "Production Ready Files" ›
//   "Upload" u48r4-broken.docx (a text file with a .docx name; Article Text); 4. its row's
//   "Send to Text Editor", the existing version, "Confirm": the box's states recorded every 20 ms;
//   "Dismiss" pressed when offered.
// MODE=nb, the neighbour alone (with the fix in and out): a real Word file
//   (../body-text-import-reads-saved-while-unsaved/u48r4-figure.docx) still imports, with no
//   failure box.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --apps ojs --reset
// Run (main):   PROBE_FEATURE=issues-u48r4 PROBE_AGENT=u48r4 node bin/probe.js ojs shared/playwright/checks/issues/body-text-unconvertible-file-no-message/walk.js
// Facts: .reports/<feature>/u48r4/a18-facts[-<run>]-ojs.json
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('../body-text-opens-with-unsaved-changes/lib');

const MODE = process.env.MODE || 'walk';
const FILE = MODE === 'walk'
    ? path.join(__dirname, 'u48r4-broken.docx')
    : path.join(__dirname, '..', 'body-text-import-reads-saved-while-unsaved', 'u48r4-figure.docx');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const fact = (k, v) => { record('a18-facts', {[k]: v}, {merge: true}); console.log('[a18]', MODE, k, JSON.stringify(v).slice(0, 1800)); };
    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => { dialogs.push(`${d.type()}: ${d.message()}`); try { await d.accept(); } catch (e) { /* gone */ } });
    const consoleLines = [];
    page.on('console', (m) => { if (/pandoc|WASI|import|convert/i.test(m.text())) consoleLines.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
    await L.watchPanel(page);
    try {
        await signIn(page, 'dbarnes');
        await L.openWorkflow(page, app);
        await L.uploadProductionReady(page, app, FILE);
        const {window, t0} = await L.sendToTextEditor(page, path.basename(FILE));
        fact(`${MODE}.window`, window);
        const after = await L.bodyText(page);
        const log = await L.panelLog(page, t0);
        fact(`${MODE}.import`, {url: (page.url().match(/workflowMenuKey=([^&]+)/) || [])[1], ...after, boxStates: log.ui, console: consoleLines});
        record(`a18-${MODE}-01-after-import`, await screen(page));
        await shot(page, `a18-${MODE}-01-after-import`);
        if (after.dismiss) {
            await page.locator('.sciflow-body-text__main [role=status]').getByRole('button', {name: 'Dismiss', exact: true}).click();
            await L.sleep(800);
            fact(`${MODE}.afterDismiss`, await L.bodyText(page));
        }
        fact(`${MODE}.dialogs`, dialogs);
    } finally {
        await close();
    }
});
