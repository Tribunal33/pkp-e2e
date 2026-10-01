// Issue report docs/issues/U13-A11-keywords-order-not-kept.md (U13 A11):
// the report's Steps to reproduce, walked through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// context `publicknowledge`, as the dataset's own `dbarnes`.
//
// The kit builds nothing. Through the screens:
//   1-3. dbarnes types the keywords "tide", "current" on a published
//        item's Publication › "Metadata", then "marée", "courant" in the
//        French box, and saves (OJS submission 17, OMP 14, OPS 5)
//   4.   the item's public page in English and in French: the keywords
//        line (OPS also the "Preprints" list, which reads every
//        preprint's keywords in one query)
//   5.   the one statement that is not a screen: a no-op UPDATE of the
//        "tide" entry (SET seq = seq), which makes PostgreSQL write the row
//        again at another place, as its own housekeeping does in time
//   6.   the public page again
//   7.   the Metadata form again: the chips, then "Save" with no change
//   8.   the stored seq of the entries (read with SQL)
// Neighbour (always read, compare a run with the fix in and out): the
// "Keywords:" line of dataset items the walk does not touch.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir25 --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-ir25 PROBE_AGENT=ir25 node bin/probe.js all shared/playwright/checks/issues/keywords-order-not-kept/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir25-3_5 --dataset 6 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir25-3_5 PROBE_AGENT=ir25 node bin/probe.js all shared/playwright/checks/issues/keywords-order-not-kept/walk.js
// Facts: .reports/<feature>/ir25/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, sql} = require('../../../probe');
const {openMetadata, keywordChips, typeKeywords, showFrench, saveForm, keywordsLine} = require('./lib');

const KEYWORDS = ['tide', 'current'];
const FRENCH = ['marée', 'courant'];
const ITEM = {
    ojs: {submission: 17, page: 'article/view/17', neighbours: ['article/view/1']},
    omp: {submission: 14, page: 'catalog/book/14', neighbours: ['catalog/book/5']},
    ops: {submission: 5, page: 'preprint/view/5', neighbours: ['preprint/view/14', 'preprint/view/11']},
};

// The keyword entries of the submission's current publication, in the
// order they lie in the table (ctid), with the seq the save wrote.
const rows = (app, submissionId) =>
    sql(
        app,
        `SELECT e.controlled_vocab_entry_id, e.seq, e.ctid, s.setting_value, s.locale
           FROM submissions su
           JOIN controlled_vocabs cv ON cv.assoc_type = 1048588 AND cv.assoc_id = su.current_publication_id AND cv.symbolic = 'submissionKeyword'
           JOIN controlled_vocab_entries e ON e.controlled_vocab_id = cv.controlled_vocab_id
           JOIN controlled_vocab_entry_settings s ON s.controlled_vocab_entry_id = e.controlled_vocab_entry_id AND s.setting_name = 'name'
          WHERE su.submission_id = ${submissionId}
          ORDER BY e.ctid`
    )
        .split('\n')
        .filter(Boolean)
        .map((l) => {
            const [id, seq, ctid, name, locale] = l.split('|');
            return {id: Number(id), seq: Number(seq), ctid, name, locale};
        });

forEachApp(async (app) => {
    const item = ITEM[app.name];
    const {page, close} = await launch(app);
    const facts = {line: app.line, dataset: app.dataset, item, steps: {}};
    try {
        facts.neighboursBefore = [];
        for (const n of item.neighbours) facts.neighboursBefore.push(await keywordsLine(page, app, n));

        // Steps 1-3.
        await signIn(page, 'dbarnes');
        await openMetadata(page, app, item.submission);
        facts.steps.chipsBefore = await keywordChips(page);
        await typeKeywords(page, KEYWORDS);
        await showFrench(page);
        await typeKeywords(page, FRENCH, 'fr_CA');
        facts.steps.saved = await saveForm(page);
        facts.steps.chipsTyped = await keywordChips(page);
        facts.steps.chipsTypedFr = await keywordChips(page, 'fr_CA');
        record('metadata-typed', await screen(page));
        await shot(page, 'metadata-typed');
        facts.steps.rowsTyped = rows(app, item.submission);

        // Step 4.
        facts.steps.pageTyped = await keywordsLine(page, app, item.page, 'page-typed');
        facts.steps.pageTypedFr = await keywordsLine(page, app, item.page, 'page-typed-fr', 'fr_CA');
        if (app.name === 'ops') facts.steps.homeTyped = await page.goto(app.url(`/index.php/${app.contextPath}/en/preprints`)).then(async () => (await screen(page)).text.main.match(/[^\n]*\n?[^\n]*tide[^\n]*\n?[^\n]*/)?.[0] ?? null).catch(() => null);

        // Step 5: the no-op rewrite of the "tide" row.
        const tide = facts.steps.rowsTyped.find((r) => r.name === 'tide');
        facts.steps.moved = tide ? sql(app, `UPDATE controlled_vocab_entries SET seq = seq WHERE controlled_vocab_entry_id = ${tide.id} RETURNING controlled_vocab_entry_id, seq, ctid`) : 'no tide row';
        facts.steps.rowsMoved = rows(app, item.submission);

        // Step 6.
        facts.steps.pageMoved = await keywordsLine(page, app, item.page, 'page-moved');
        facts.steps.pageMovedFr = await keywordsLine(page, app, item.page, 'page-moved-fr', 'fr_CA');
        if (app.name === 'ops') facts.steps.homeMoved = await page.goto(app.url(`/index.php/${app.contextPath}/en/preprints`)).then(async () => (await screen(page)).text.main.match(/[^\n]*\n?[^\n]*tide[^\n]*\n?[^\n]*/)?.[0] ?? null).catch(() => null);

        // Step 7.
        await openMetadata(page, app, item.submission);
        facts.steps.chipsMoved = await keywordChips(page);
        await showFrench(page);
        facts.steps.chipsMovedFr = await keywordChips(page, 'fr_CA');
        record('metadata-moved', await screen(page));
        await shot(page, 'metadata-moved');
        facts.steps.savedAgain = await saveForm(page);

        // Step 8.
        facts.steps.rowsSavedAgain = rows(app, item.submission);
        facts.steps.pageSavedAgain = await keywordsLine(page, app, item.page, 'page-saved-again');
        facts.steps.pageSavedAgainFr = await keywordsLine(page, app, item.page, 'page-saved-again-fr', 'fr_CA');

        await signOut(page);
        facts.neighboursAfter = [];
        for (const n of item.neighbours) facts.neighboursAfter.push(await keywordsLine(page, app, n));
    } catch (e) {
        facts.error = String(e && e.stack ? e.stack : e).slice(0, 1500);
        await shot(page, 'error').catch(() => {});
    } finally {
        record('facts', facts);
        console.log(JSON.stringify({app: app.name, ...facts}, null, 1));
        await close();
    }
});
