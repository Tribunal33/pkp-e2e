// Issue report docs/issues/U73-A3-format-change-file-only-adds.md (U73 A3): a publication
// format's "Change File" offers no way to say which of the format's files it replaces, so every
// upload adds one more file. Walked through the screens on PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"), press `publicknowledge`. The kit builds nothing.
//
// MODE=walk (default), OMP book 4 "How Canadians Communicate" (in Production, `dbarnes` assigned):
//   1. sign in as dbarnes   2. "View" on book 4   3. "Publication" › "Publication Formats"
//   4. "Add publication format": EPUB u73e, "OK"
//   5. its "Change File": component "Book Manuscript", u73e-first.pdf, Continue, Continue, Complete
//   6. its "Change File" again: read step 1
//   7. choose u73e-first.pdf as the file replaced when step 1 offers that; u73e-second.pdf,
//      Continue, Continue, Complete
//   8. read the files under EPUB u73e (and what the database stored)
// MODE=nb, the neighbour alone (fix trial, with the fix in and out), OJS submission 1's galley
//   "PDF Version 2" and OPS preprint 1's galley "PDF": "More Actions" › "Change File" must still
//   open step 1 with no list of files to replace (a galley holds one file), then "Cancel".
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/format-change-file-only-adds/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<feature>-3_5 PROBE_AGENT=<id> node bin/probe.js omp …/walk.js
// Neighbour:    MODE=nb ONLY=ojs,ops … node bin/probe.js all …/walk.js
// Facts: .reports/<feature>/<id>/a3-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');
const W = require('../change-file-keeps-first-upload/lib');
const F = require('../format-controls-offered-then-refused/lib');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const BOOK = {id: 4, title: 'How Canadians Communicate: Contexts of Canadian Popular Culture'};
const NAME = 'EPUB u73e';
const NB = {ojs: {id: 1, galley: 'PDF Version 2'}, ops: {id: 1, galley: 'PDF'}};

forEachApp(async (app) => {
    const fact = (k, v) => { record('a3-facts', {[`${MODE}:${k}`]: v}, {merge: true}); console.log('[a3]', app.name, MODE, k, JSON.stringify(v).slice(0, 1500)); };
    const step = async (k, fn, must = false) => {
        try { return await fn(); } catch (e) {
            fact(`${k}-FAILED`, String(e.stack || e).split('\n').slice(0, 5).join(' | '));
            if (must) throw e;
            return null;
        }
    };
    if (MODE === 'walk' && app.name !== 'omp') { fact('surface', 'none: no publication formats'); return; }
    if (MODE === 'nb' && !NB[app.name]) { fact('surface', 'none: no galleys'); return; }

    const {page} = await launch(app);
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push(`${d.type()}: ${d.message()}`); d.accept().catch(() => {}); });
    const requests = W.watchWizard(page);
    await signIn(page, 'dbarnes');                                                                        // 1

    if (MODE === 'nb') {
        const c = NB[app.name];
        const {openGalleys} = require('../listing-offers-galley-without-file/lib');
        const galleys = await step('galleys', () => openGalleys(page, app, c.id), true);
        fact('galleys', await step('labels', () => galleys.labels()));
        await step('change-file', () => galleys.openChangeFile(c.galley), true);
        await idle(page);
        fact('step1', await step('step1', () => W.stepOne(page)));
        record('a3-nb-step1', await screen(page));
        await step('cancel', () => galleys.cancelWizard());
        fact('dialogs', dialogs);
        return;
    }

    const pubId = () => sql(app, `select current_publication_id from submissions where submission_id=${BOOK.id}`).trim();
    const formatFiles = () => sql(app, `select sf.submission_file_id, sf.file_id, coalesce(sf.sales_type,''), sf.viewable,
        (select string_agg(distinct setting_value, '/') from submission_file_settings s where s.submission_file_id = sf.submission_file_id and s.setting_name = 'name' and s.locale = 'en'),
        (select string_agg(r.file_id::text, ',' order by r.revision_id) from submission_file_revisions r where r.submission_file_id = sf.submission_file_id)
        from submission_files sf join publication_formats pf on sf.assoc_type = 521 and sf.assoc_id = pf.publication_format_id
        join publication_format_settings n on n.publication_format_id = pf.publication_format_id and n.setting_name = 'name' and n.setting_value = '${NAME}'
        where pf.publication_id = ${pubId()} order by 1`).split('\n').filter(Boolean);

    let f;
    await step('open', async () => {                                                                     // 2, 3
        fact('open.via', await F.openBook(page, app, BOOK.id, BOOK.title));
        f = (await F.openFormatsPage(page, app, BOOK.id, pubId())).formats;
    }, true);
    fact('add', await step('add', () => F.addFormat(page, f, NAME), true));                               // 4

    const files = L.twoFiles('u73e');
    fact('first', await step('first', () => L.changeFile(page, f, NAME, files.first)));                   // 5
    fact('files-after-first', await step('files1', () => F.fileRowsState(f, NAME)));
    fact('stored-after-first', formatFiles());

    const second = await step('second', () => L.changeFile(page, f, NAME, files.second, {replace: 'u73e-first'})); // 6, 7
    fact('second', second);
    await idle(page);
    fact('files-after-second', await step('files2', () => F.fileRowsState(f, NAME)));                    // 8
    fact('row-after-second', await step('row2', () => F.rowState(f, NAME)));
    fact('stored-after-second', formatFiles());
    record('a3-walk-formats', await screen(page));
    await shot(page, 'a3-walk-formats');
    fact('requests', requests.map((r) => ({op: r.op, status: r.status, post: r.post, body: r.body && r.body.slice(0, 160)})));
    fact('dialogs', dialogs);
});
