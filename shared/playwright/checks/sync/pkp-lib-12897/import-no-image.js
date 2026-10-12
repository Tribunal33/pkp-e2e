// PR review of pkp/pkp-lib#12897 (ui-library#979), third round: how long "Uploading images…" shows
// when a Word file without images is sent to "Body Text" (U48 Rule 20). PKP's default test dataset
// (a dataset fleet), OJS at the PR head, submission 5 "Genetic transformation of forest trees"
// (Production), as dbarnes: "Production Ready Files" › "Upload" noimage.docx (k3-figure.docx with its
// figure taken out: a heading, two paragraphs, a caption line), its row's "Send to Text Editor", the
// existing version, "Confirm"; the import box's states recorded every 20 ms.
//
// Run: PROBE_FEATURE=pr12897r3 PROBE_AGENT=noimg node bin/probe.js ojs shared/playwright/checks/sync/pkp-lib-12897/import-no-image.js
const path = require('path');
const {forEachApp, launch, signIn, shot, record} = require('../../../probe');
const L = require('../../issues/body-text-opens-with-unsaved-changes/lib');

const FILE = path.join(__dirname, 'noimage.docx');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const fact = (k, v) => { record('noimg-facts', {[k]: v}, {merge: true}); console.log('[noimg]', k, JSON.stringify(v).slice(0, 2000)); };
    const {page, close} = await launch(app);
    await L.watchPanel(page);
    try {
        await signIn(page, 'dbarnes');
        await L.openWorkflow(page, app);
        await L.uploadProductionReady(page, app, FILE);
        const {window, t0} = await L.sendToTextEditor(page, path.basename(FILE));
        fact('window', window.chosen);
        fact('import', {...(await L.bodyText(page)), boxStates: (await L.panelLog(page, t0)).ui});
        await shot(page, 'noimg-01-after-import');
    } finally {
        await close();
    }
});
