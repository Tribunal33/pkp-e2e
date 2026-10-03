// Issue report docs/issues/U73-A19-select-files-text-names-missing-controls.md (U73 A19): a
// publication format's "Select Files" window tells the user to tick an "Include checkbox" and
// press "Search", neither of which the window has. Walked through the screens on PKP's default
// test dataset (a dataset fleet, harness.md "Dataset fleets"), press `publicknowledge`. The kit
// builds nothing. OJS and OPS have no such window (a galley has no "Select Files").
//
// MODE=walk (default), OMP book 4 "How Canadians Communicate" (in Production, `dbarnes` assigned):
//   1. sign in as dbarnes   2. "View" on book 4   3. "Publication" › "Publication Formats"
//   4. "Add publication format": "PDF u73k", "OK"   5. its "Select Files"
//   6. read the window's text, list, boxes and buttons
//   7. tick "Show files from all accessible workflow stages." and read the list again
// MODE=nb, the neighbour alone (fix trial, with the fix in and out), OMP book 7 "Accessible
//   Elements" (in Copyediting): "Draft Files" › "Upload/Select Files", the other window built on
//   the same list and box, must keep its list, its box and no text of its own.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/select-files-text-names-missing-controls/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<feature>-3_5 PROBE_AGENT=<id> node bin/probe.js omp …/walk.js
// Neighbour:    MODE=nb PROBE_RUN=nb-in|nb-out … node bin/probe.js omp …/walk.js
// Facts: .reports/<feature>/<id>/a19-facts[-<run>]-omp.json
const {forEachApp, launch, signIn, screen, shot, record, sql} = require('../../../probe');
const F = require('../format-controls-offered-then-refused/lib');
const C = require('../select-files-other-stage-row-actions-refused/lib');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const BOOK = {id: 4, title: 'How Canadians Communicate: Contexts of Canadian Popular Culture'};
const NB_BOOK = 7;
const NAME = 'PDF u73k';
const OLD = 'Any files that have already been uploaded to any submission stage can be added to the Proof Files listing by checking the Include checkbox below and clicking Search: all available files will be listed and can be chosen for inclusion.';

forEachApp(async (app) => {
    const fact = (k, v) => { record('a19-facts', {[`${MODE}:${k}`]: v}, {merge: true}); console.log('[a19]', app.name, MODE, k, JSON.stringify(v).slice(0, 1500)); };
    const step = async (k, fn, must = false) => {
        try { return await fn(); } catch (e) {
            fact(`${k}-FAILED`, String(e.stack || e).split('\n').slice(0, 5).join(' | '));
            if (must) throw e;
            return null;
        }
    };
    if (app.name !== 'omp') { fact('surface', 'none: no publication formats, a galley has no "Select Files"'); return; }

    const {page} = await launch(app);
    await signIn(page, 'dbarnes');                                                                        // 1

    if (MODE === 'nb') {
        await step('open', () => C.openCopyediting(page, app, NB_BOOK), true);
        await step('window', () => C.openSelect(page, 'Draft Files'), true);
        const w = await step('read', () => C.readSelect(page));
        fact('window', w);
        fact('windowText', await step('text', () => C.selectWindow(page).evaluate((d) => {
            const form = d.querySelector('form');
            const p = form && form.querySelector(':scope > p');
            return p ? p.innerText.trim() : null;
        })));
        record('a19-nb-window', await screen(page));
        await step('allStages', () => C.tickAllStages(page));
        const after = await step('read2', () => C.readSelect(page));
        fact('afterAllStages', after && {allStages: after.allStages, rowCount: after.rows.length, rows: after.rows.slice(0, 12)});
        await step('cancel', () => C.cancel(page));
        return;
    }

    const pubId = () => sql(app, `select current_publication_id from submissions where submission_id=${BOOK.id}`).trim();
    let f;
    await step('open', async () => {                                                                     // 2, 3
        fact('open.via', await F.openBook(page, app, BOOK.id, BOOK.title));
        f = (await F.openFormatsPage(page, app, BOOK.id, pubId())).formats;
    }, true);
    fact('add', await step('add', () => F.addFormat(page, f, NAME), true));                               // 4
    await step('select-files', () => L.openSelectFiles(page, f, NAME), true);                             // 5
    const w = await step('read', () => L.readSelectFiles(page));                                          // 6
    fact('window', w);
    fact('textIsOld', w ? w.text === OLD : null);
    record('a19-walk-window', await screen(page));
    await shot(page, 'a19-walk-window');
    fact('allStagesRequests', await step('tick', () => L.tickAllStages(page)));                           // 7
    const after = await step('read2', () => L.readSelectFiles(page));
    fact('afterAllStages', after && {boxes: after.boxes, rows: after.rows, controls: after.controls});
    record('a19-walk-all-stages', await screen(page));
    await shot(page, 'a19-walk-all-stages');
    await step('cancel', () => L.cancel(page));
});
