// Kept walk for spec U44 register OMP4: with only "Monographs" ticked in the URN settings, a press's publish
// confirmation shows a one-row "URN" / "Item" table where a journal shows one sentence.
// Takes the report's Steps on a fresh load of PKP's default test dataset, through the screens, as `rvaca`:
//   1-3. Settings › Website › "Plugins": tick "URN"; "Settings": "Monographs" only, prefix urn:nbn:de:0000-,
//        "Use default patterns.", namespace urn:nbn:de, resolver https://nbn-resolving.de/; "Save".
//   4-6. Submission 4 › Publication › "Publish": read the URN part of the confirmation window; close it.
//   7.   Publication › "Identifiers": "Assign", "Save".
//   8-9. "Publish" again: read the URN part; close it. Nothing is published.
// Records every screen with screen(); prints one line per step. No assertions: the script records.
// Only OMP has this surface (OJS has its own notice code, OPS no URN plugin).
// Run (main):  PROBE_FEATURE=issues-r32 PROBE_AGENT=r32 node bin/probe.js omp shared/playwright/checks/issues/press-publish-urn-table-instead-of-sentence/walk.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r32-3_5 PROBE_AGENT=r32 node bin/probe.js omp …
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

const SID = 4; // "How Canadians Communicate: Contexts of Canadian Popular Culture" (Production)

forEachApp(async (app) => {
    const facts = {line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    if (app.name !== 'omp') { fact('surface', 'not a press: this notice code is OMP\'s'); record('w-facts', facts); return; }
    const {page, close} = await launch(app);
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
    try {
        await signIn(page, 'rvaca');
        fact('1-3 settings: Monographs only', await L.trySave(page, app, ['Monographs'], 'w-03-settings'));
        const sub = await L.readSubmission(page, app, SID);
        const pid = sub.currentPublicationId;
        fact('submission', sub);
        fact('4-6 publish window, no URN', await L.publishWindow(page, app, SID, pid, 'w-05-publish-no-urn'));
        fact('7 assign and save', await L.assignAndSave(page, app, SID, pid, 'w-07'));
        fact('8-9 publish window, URN assigned', await L.publishWindow(page, app, SID, pid, 'w-08-publish-with-urn'));
        fact('after: stored', (await L.readSubmission(page, app, SID)).publications);
    } finally {
        fact('page errors', errors);
        record('w-facts', facts);
        await close();
    }
});
