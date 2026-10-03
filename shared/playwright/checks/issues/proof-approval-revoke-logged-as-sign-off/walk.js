// Issue report docs/issues/U73-A12-proof-approval-revoke-logged-as-sign-off.md (U73 A12): approving a
// publication format's file and revoking that approval write the same two lines to the file's
// "History", so the history cannot tell one from the other. Walked through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"), press `publicknowledge`.
// The kit builds nothing. OJS and OPS have no publication formats.
//
// MODE=walk (default), OMP book 4 "How Canadians Communicate" (in Production, `dbarnes` assigned;
// its one format, "PDF", is remote and takes no files, so the steps add one):
//   1. sign in as dbarnes   2. "View" on book 4   3. "Publication" › "Publication Formats"
//   4. "Add publication format": Name "PDF u73h", "OK"
//   5. "PDF u73h" › "Change File": component "Book Manuscript", u73h-proof.pdf, Continue, Continue, Complete
//   6. the file's arrow › "More Information" › "History": read, "Close"
//   7. "Awaiting Approval" › "Approve Proof" › "OK"
//   8. "More Information" › "History" again
//   9. "Approved" › "Revoke Proof Approval" › "OK"
//  10. "More Information" › "History" again
// MODE=nb, the neighbour alone (fix trial, with the fix in and out): steps 1–6, then the file's
//   arrow › "Edit" › "Save" with nothing changed, then "History": the save must still add only the
//   "metadata … was edited" line, which the fix leaves alone.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/proof-approval-revoke-logged-as-sign-off/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<feature>-3_5 PROBE_AGENT=<id> node bin/probe.js omp …/walk.js
// Neighbour:    MODE=nb PROBE_RUN=nb-in|nb-out … node bin/probe.js omp …/walk.js
// Facts: .reports/<feature>/<id>/a12-facts[-<run>]-omp.json
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');
const F = require('../format-controls-offered-then-refused/lib');
const C = require('../format-change-file-only-adds/lib');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const BOOK = {id: 4, title: 'How Canadians Communicate: Contexts of Canadian Popular Culture'};
const FORMAT = 'PDF u73h';

forEachApp(async (app) => {
    const fact = (k, v) => { record('a12-facts', {[`${MODE}:${k}`]: v}, {merge: true}); console.log('[a12]', app.name, MODE, k, JSON.stringify(v).slice(0, 1500)); };
    const step = async (k, fn, must = false) => {
        try { return await fn(); } catch (e) {
            fact(`${k}-FAILED`, String(e.stack || e).split('\n').slice(0, 5).join(' | '));
            if (must) throw e;
            return null;
        }
    };
    if (app.name !== 'omp') { fact('surface', 'none: no publication formats'); return; }

    const {page} = await launch(app);
    const w = F.watch(page);
    await signIn(page, 'dbarnes');                                                                         // 1
    const pubId = () => sql(app, `select current_publication_id from submissions where submission_id=${BOOK.id}`).trim();

    let f;
    await step('open', async () => {                                                                      // 2, 3
        fact('open.via', await F.openBook(page, app, BOOK.id, BOOK.title));
        const o = await F.openFormatsPage(page, app, BOOK.id, pubId());
        f = o.formats;
        fact('formats.via', o.via);
    }, true);
    fact('format-before', await step('row0', () => F.rowState(f, 'PDF')));

    w.mark('add');
    fact('add', await step('add', () => F.addFormat(page, f, FORMAT), true));                             // 4
    const file = L.aFile('u73h-proof.pdf');
    w.mark('upload');
    fact('upload', await step('upload', () => C.changeFile(page, f, FORMAT, file), true));                 // 5
    await idle(page);
    fact('files-after-upload', await step('files1', () => F.fileRowsState(f, FORMAT)));
    fact('status-after-upload', await step('status1', () => L.fileStatus(f, FORMAT, file.name)));

    const h0 = await step('history0', () => L.history(page, f, FORMAT, file.name), true);              // 6
    fact('history-after-upload', h0);

    if (MODE === 'nb') {
        w.mark('edit');
        fact('edit-save', await step('edit', () => L.editSave(page, f, FORMAT, file.name)));
        const h1 = await step('history1', () => L.history(page, f, FORMAT, file.name));
        fact('history-after-edit', h1);
        fact('added-by-edit', h1 && L.added(h0.lines, h1.lines));
        fact('stored', L.storedLog(app, file.name));
        fact('calls', w.log.calls);
        fact('dialogs', w.log.dialogs);
        record('a12-nb-formats', await screen(page));
        return;
    }

    w.mark('approve');
    fact('approve', await step('approve', () => L.approval(page, f, FORMAT, file.name, 'Awaiting Approval', 'Approve Proof'))); // 7
    const h1 = await step('history1', () => L.history(page, f, FORMAT, file.name));                     // 8
    fact('history-after-approve', h1);
    fact('added-by-approve', h1 && L.added(h0.lines, h1.lines));

    w.mark('revoke');
    fact('revoke', await step('revoke', () => L.approval(page, f, FORMAT, file.name, 'Approved', 'Revoke Proof Approval'))); // 9
    const h2 = await step('history2', () => L.history(page, f, FORMAT, file.name));                     // 10
    fact('history-after-revoke', h2);
    fact('added-by-revoke', h1 && h2 && L.added(h1.lines, h2.lines));

    fact('stored', L.storedLog(app, file.name));
    fact('calls', w.log.calls);
    fact('dialogs', w.log.dialogs);
    record('a12-walk-formats', await screen(page));
    await shot(page, 'a12-walk-formats');
});
