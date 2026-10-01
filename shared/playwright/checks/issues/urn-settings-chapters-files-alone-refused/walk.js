// Kept walk for spec U44 register OMP1: a press cannot save URN settings with only "Chapters" or "Files" ticked.
// Takes the report's Steps on a fresh load of PKP's default test dataset, through the screens, as `rvaca`:
//   Settings › Website › "Plugins": tick "URN"; its "Settings"; under "Press Content" tick only "Chapters"
//   (then only "Files", then "Chapters" and "Files"); prefix urn:nbn:de:0000-, "Use default patterns.",
//   namespace urn:nbn:de, resolver https://nbn-resolving.de/; "Save". After a save, reopen and read the boxes.
//   Control: "Chapters" with "Monographs".
// Records every screen with screen(); prints one line per step. No assertions: the script records.
// Only OMP has "Chapters" and "Files" (OJS has no such boxes, OPS no URN plugin).
// Run (main):  PROBE_FEATURE=issues-r30 PROBE_AGENT=r30 node bin/probe.js omp shared/playwright/checks/issues/urn-settings-chapters-files-alone-refused/walk.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r30-3_5 PROBE_AGENT=r30 node bin/probe.js omp …
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const facts = {line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    if (app.name !== 'omp') { fact('surface', 'no "Chapters" or "Files" boxes on this app'); record('w-facts', facts); return; }
    const {page, close} = await launch(app);
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
    try {
        await signIn(page, 'rvaca');
        fact('chapters only', await L.trySave(page, app, ['Chapters'], 'w-01-chapters'));
        fact('files only', await L.trySave(page, app, ['Files'], 'w-02-files'));
        fact('chapters and files', await L.trySave(page, app, ['Chapters', 'Files'], 'w-03-chapters-files'));
        fact('control: chapters and monographs', await L.trySave(page, app, ['Monographs', 'Chapters'], 'w-04-control-monographs-chapters'));
    } finally {
        fact('page errors', errors);
        record('w-facts', facts);
        await close();
    }
});
