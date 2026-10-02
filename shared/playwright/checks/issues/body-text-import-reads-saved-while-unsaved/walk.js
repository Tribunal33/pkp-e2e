// Issue report docs/issues/U48-A14-body-text-import-reads-saved-while-unsaved.md (U48 A14, second
// symptom): sending a Word file with an image to a never-saved Body Text makes "Save" read "Saved"
// beside "Unsaved Changes", while the imported text is not saved. Walked through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), OJS only.
//
// MODE=walk (default), submission 5 "Genetic transformation of forest trees" (Production):
//   1. sign in as dbarnes; 2. open the workflow; 3. "Production" › "Production Ready Files" ›
//   "Upload" u48r4-figure.docx (Article Text); 4. its row's "Send to Text Editor", the existing
//   version, "Confirm": the panel's "Save" label and badge recorded every 20 ms;
//   5. reload without "Save": what is stored.
// MODE=nb, the neighbour alone (with the fix in and out): the person's own "Save" still reads
//   "Saved", and "Insert" › "Insert figure" on a never-saved page still stores the text typed
//   before it (reload without "Save").
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --apps ojs --reset
// Run (main):   PROBE_FEATURE=issues-u48r4 PROBE_AGENT=u48r4 node bin/probe.js ojs shared/playwright/checks/issues/body-text-import-reads-saved-while-unsaved/walk.js
// Facts: .reports/<feature>/u48r4/a14b-facts[-<run>]-ojs.json
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('../body-text-opens-with-unsaved-changes/lib');

const MODE = process.env.MODE || 'walk';
const HERE = __dirname;

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const fact = (k, v) => { record('a14b-facts', {[k]: v}, {merge: true}); console.log('[a14b]', MODE, k, JSON.stringify(v).slice(0, 1800)); };
    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => { dialogs.push(`${d.type()}: ${d.message()}`); try { await d.accept(); } catch (e) { /* gone */ } });
    await L.watchPanel(page);
    try {
        await signIn(page, 'dbarnes');
        await L.openWorkflow(page, app);
        if (MODE === 'walk') {
            await L.uploadProductionReady(page, app, path.join(HERE, 'u48r4-figure.docx'));
            record('a14b-walk-01-production', await screen(page));
            const {window, t0} = await L.sendToTextEditor(page, 'u48r4-figure.docx');
            fact('walk.window', window);
            const after = await L.bodyText(page);
            const log = await L.panelLog(page, t0);
            fact('walk.import', {url: (page.url().match(/workflowMenuKey=([^&]+)/) || [])[1], ...after, ui: log.ui, changes: log.changes && log.changes.length});
            record('a14b-walk-02-imported', await screen(page));
            await shot(page, 'a14b-walk-02-imported');
            await page.reload(); await idle(page).catch(() => {});
            await page.locator('sciflow-editor [contenteditable]').first().waitFor({state: 'visible', timeout: L.T}).catch(() => {});
            await L.sleep(3000);
            fact('walk.reloaded', await L.bodyText(page));
            await shot(page, 'a14b-walk-03-reloaded');
        } else {
            await L.openBodyText(page);
            await L.typeInEditor(page, 'Text before figure u48r4');
            const t0 = Date.now();
            const bar = page.locator('sciflow-formatbar');
            await bar.getByRole('button', {name: 'Insert', exact: true}).click(); await L.sleep(400);
            const chooserP = page.waitForEvent('filechooser', {timeout: 10_000}).catch(() => null);
            await bar.getByText(/Insert figure/i).first().click();
            const chooser = await chooserP;
            if (chooser) await chooser.setFiles(path.join(HERE, 'u48r4-figure.png'));
            await L.sleep(3000); await idle(page).catch(() => {});
            const log = await L.panelLog(page, t0);
            fact('nb.figure', {chooser: !!chooser, ...(await L.bodyText(page)), ui: log.ui});
            await page.reload(); await idle(page).catch(() => {});
            await page.locator('sciflow-editor [contenteditable]').first().waitFor({state: 'visible', timeout: L.T}).catch(() => {});
            await L.sleep(3000);
            fact('nb.figureReloaded', await L.bodyText(page));
            await L.typeInEditor(page, ' saved by hand');
            const t1 = Date.now();
            const st = await L.pressSave(page);
            fact('nb.ownSave', {status: st, ui: (await L.panelLog(page, t1)).ui});
            record('a14b-nb-01-own-save', await screen(page));
        }
        fact(`${MODE}.dialogs`, dialogs);
    } finally {
        await close();
    }
});
