// Issue report docs/issues/U36-A5-galley-change-file-names-no-current-file.md (U36 A5): a galley's
// "Change File" opens the upload wizard with the heading "Current file" and no file name under it.
// Walked through the screens on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"), context `publicknowledge`. The kit builds nothing.
//
// MODE=walk (default), OJS submission 1 (galley "PDF Version 2" of its unpublished version 1.1) and
// OPS preprint 1 (galley "PDF"); a press has no "Galleys" page:
//   1. sign in as dbarnes
//   2. open the submission's workflow
//   3. "Galleys" under the newest version
//   4. the galley's "More Actions" › "Change File": "Upload a File Ready for Publication", step 1
//   5. read what stands under "Current file"
//   6. "Upload File": u36j-replacement.pdf; read the step again
//   7. "Cancel"
// MODE=nb, the neighbour alone (OJS submission 4, OMP submission 3; with the fix in and out):
//   "Upload" above "Submission Files". Step 1 must have no "Current file" heading and its
//   revise drop-down must name the list's files, the same either way. "Cancel" closes it.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/galley-change-file-names-no-current-file/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature <feature>-3_5 --dataset <n> --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<feature>-3_5 PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/galley-change-file-names-no-current-file/walk.js
// Facts: .reports/<feature>/<id>/a5-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');
const L = require('./lib');
const W = require('../change-file-keeps-first-upload/lib');

const MODE = process.env.MODE || 'walk';
const CASE = {
    walk: {ojs: {id: 1, galley: 'PDF Version 2'}, ops: {id: 1, galley: 'PDF'}},
    nb: {ojs: {id: 4}, omp: {id: 3}},
}[MODE];

forEachApp(async (app) => {
    const fact = (k, v) => { record('a5-facts', {[`${MODE}:${k}`]: v}, {merge: true}); console.log('[a5]', app.name, MODE, k, JSON.stringify(v).slice(0, 1500)); };
    // A step that fails is recorded, not thrown, so a trial with the fix in still reads the rest;
    // the opening steps (`must`) end the walk, since nothing after them can be read.
    const step = async (k, fn, must = false) => {
        try { return await fn(); } catch (e) {
            fact(`${k}-FAILED`, String(e.stack || e).split('\n').slice(0, 5).join(' | '));
            if (must) throw e;
            return null;
        }
    };
    const c = CASE[app.name];
    if (!c) { fact('surface', MODE === 'walk' ? 'none: a press has no "Galleys" page' : 'none: a preprint server has no file list'); return; }
    const {page} = await launch(app);
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push(`${d.type()}: ${d.message()}`); d.accept().catch(() => {}); });
    const requests = W.watchWizard(page);

    await signIn(page, 'dbarnes');                                                                  // 1

    if (MODE === 'nb') {
        await step('open', () => W.openWorkflow(page, app, c.id), true);
        const rows = await step('list', () => W.listRows(page, 'Submission Files'), true);
        fact('list', rows);
        await step('open-wizard', async () => {
            await W.uploadButton(page, 'Submission Files').click();
            await W.uploadBox(page).waitFor({state: 'attached', timeout: W.T});
            await idle(page);
        }, true);
        fact('step1', await step('step1', () => W.stepOne(page)));
        fact('current-file', await step('current-file', () => L.currentFile(W.wizard(page))));
        record(`a5-nb-step1`, await screen(page));
        await step('cancel', async () => {
            await W.wizard(page).getByRole('link', {name: 'Cancel', exact: true}).click();
            await W.wizard(page).waitFor({state: 'hidden', timeout: W.T});
        });
        fact('dialogs', dialogs);
        return;
    }

    const galleyFile = () => sql(app, `select g.galley_id, g.label, g.submission_file_id,
        (select setting_value from submission_file_settings s where s.submission_file_id = g.submission_file_id and s.setting_name = 'name' and s.locale = 'en'),
        (select count(*) from submission_file_revisions r where r.submission_file_id = g.submission_file_id)
        from publication_galleys g join publications p on p.publication_id = g.publication_id
        where p.submission_id = ${c.id} and g.label = '${c.galley}' order by 1 desc limit 1`);
    fact('galley-before', galleyFile());

    const {openGalleys} = require('../listing-offers-galley-without-file/lib');
    const galleys = await step('galleys', () => openGalleys(page, app, c.id), true);                // 2, 3
    fact('galleys', await step('labels', () => galleys.labels()));
    record('a5-walk-galleys', await screen(page));

    const wizard = await step('change-file', () => galleys.openChangeFile(c.galley), true);         // 4
    await idle(page);
    fact('title', L.flat(await wizard.heading().innerText().catch(() => null), 80));
    fact('step5-current-file', await step('step5', () => L.currentFile(wizard.dialog())));          // 5
    fact('step5-step1', await step('step5-step1', () => W.stepOne(page)));
    record('a5-walk-step5', await screen(page));
    await shot(page, 'a5-walk-step5');

    const file = L.replacementFile();
    fact('upload', await step('upload', () => W.pick(page, file)));                                 // 6
    fact('step6-current-file', await step('step6', () => L.currentFile(wizard.dialog())));
    fact('step6-step1', await step('step6-step1', () => W.stepOne(page)));
    record('a5-walk-step6', await screen(page));
    await shot(page, 'a5-walk-step6');

    fact('cancel', await step('cancel', async () => { await wizard.cancel({uploaded: true}); return 'closed'; }));   // 7
    await idle(page);
    fact('galley-after', galleyFile());
    fact('requests', requests);
    fact('dialogs', dialogs);
});
