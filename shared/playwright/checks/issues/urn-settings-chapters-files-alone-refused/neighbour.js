// Neighbour check for the fix of spec U44 register OMP1 (fix.diff): the check must still refuse a window with no
// "Press Content" box ticked, and still let "Monographs" alone or "Publication Formats" alone through.
// Walk it with the fix in and out, each on a fresh load of the default dataset.
// Run: PROBE_FEATURE=issues-r30 PROBE_AGENT=r30 node bin/probe.js omp shared/playwright/checks/issues/urn-settings-chapters-files-alone-refused/neighbour.js
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const facts = {line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    if (app.name !== 'omp') { fact('surface', 'no "Chapters" or "Files" boxes on this app'); record('n-facts', facts); return; }
    const {page, close} = await launch(app);
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
    try {
        await signIn(page, 'rvaca');
        fact('none ticked', await L.trySave(page, app, [], 'n-01-none'));
        fact('monographs only', await L.trySave(page, app, ['Monographs'], 'n-02-monographs'));
        fact('publication formats only', await L.trySave(page, app, ['Publication Formats'], 'n-03-formats'));
    } finally {
        fact('page errors', errors);
        record('n-facts', facts);
        await close();
    }
});
