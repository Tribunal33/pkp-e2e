// U74 A9 {OMP}: a book's chosen "Audience" reaches its ONIX product the wrong way round: the
// audience's code (ONIX list 28) as `AudienceCodeType` and "01" as `AudienceCodeValue`, where
// ONIX wants "01" (list 29, "ONIX audience codes") as the type and the code as the value.
// The issue report's Steps, on PKP's default test dataset (submission 4, "How Canadians
// Communicate", its format "PDF"), as `dbarnes`; the product is read inside the Native XML
// export (the ONIX 3.0 tool's own export fails for every book on main, U74 A1).
// Spec: docs/specs/U74-onix-metadata-export.md, register A9 (Rule 20).
//
// Run (main; reset the dataset fleet first):
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js omp \
//     shared/playwright/checks/issues/onix-audience-code-type-value-swapped/walk.js
// The walk keeps its step 3 file as `children-step3.xml` in the run folder.
// MODE=neighbour runs the neighbour check alone: submission 4 on "Children (02)" with a grade
// range, submission 14 on "General / adult (01)", submission 5 with no audience, exported
// together; that file imported, and (LEGACY=<path of a step 3 file from the unpatched code>)
// that file imported too, and (EDITED=<path>) a file whose Audience names another scheme
// (type 03, value "PG"), each new book's "Audience" page read. Records the screens, asserts
// nothing.
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const BOOK5 = {id: 5, title: 'Bomb Canada and Other Unkind Remarks in the American Media'};

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const {page, close} = await launch(app);
    const facts = {mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        const brief = v && typeof v === 'object' ? {...v, screen: undefined} : v;
        console.log(`[${MODE}] ${k}:`, JSON.stringify(brief).slice(0, 1800));
    };
    try {
        await signIn(page, 'dbarnes');
        fact('pre-identity', await L.step(page, 'identity', () => L.publisherIdentity(app, page)));
        fact('pre-stored', L.stored(app, [L.BOOK.id, L.OTHER_BOOK.id, BOOK5.id]));

        if (MODE === 'walk') {
            // Steps 1-2: "Marketing" › "Audience", "Children (02)", "Save".
            fact('s1-audience-page', await L.step(page, 's1', async () => (await L.readAudience(app, page, L.BOOK.id)).chosen));
            fact('s2-save-children', await L.step(page, 's2', () => L.setAudience(app, page, L.BOOK.id, {audience: 'Children (02)'})));
            fact('s2-stored', L.stored(app));
            // Steps 3-4: export, download, read the product's Audience.
            fact('s3-export-children', await L.step(page, 's3', () => L.nativeExport(app, page, [L.BOOK.title], 'children-step3.xml')));
            // Steps 5-6: "Professional and scholarly (06)", export again.
            fact('s5-save-scholarly', await L.step(page, 's5', () => L.setAudience(app, page, L.BOOK.id, {audience: 'Professional and scholarly (06)'})));
            fact('s5-stored', L.stored(app));
            fact('s6-export-scholarly', await L.step(page, 's6', () => L.nativeExport(app, page)));
        } else {
            // Neighbour: what the fix must leave alone, and the round trip.
            fact('n1-save-children-range', await L.step(page, 'n1', () =>
                L.setAudience(app, page, L.BOOK.id, {
                    audience: 'Children (02)',
                    audienceRangeQualifier: 'US school grade range (11)',
                    audienceRangeFrom: 'Ninth Grade (9)',
                    audienceRangeTo: 'Twelfth Grade (12)',
                })));
            fact('n2-save-general', await L.step(page, 'n2', () => L.setAudience(app, page, L.OTHER_BOOK.id, {audience: 'General / adult (01)'})));
            fact('n2-stored', L.stored(app, [L.BOOK.id, L.OTHER_BOOK.id, BOOK5.id]));
            const ex = await L.step(page, 'n3', () => L.nativeExport(app, page, [L.BOOK.title, L.OTHER_BOOK.title, BOOK5.title], 'neighbour-three-books.xml'));
            fact('n3-export-three', ex);
            if (ex.kept) fact('n4-import-own-file', await L.step(page, 'n4', () => L.nativeImport(app, page, ex.kept)));
            if (process.env.LEGACY) fact('n5-import-legacy-file', await L.step(page, 'n5', () => L.nativeImport(app, page, process.env.LEGACY)));
            else fact('n5-import-legacy-file', 'skipped: no LEGACY');
            // A file whose Audience names another scheme (type 03, MPAA, value "PG"): no OMP audience.
            if (process.env.EDITED) fact('n5b-import-other-scheme-file', await L.step(page, 'n5b', () => L.nativeImport(app, page, process.env.EDITED)));
            const ids = [L.BOOK.id, L.OTHER_BOOK.id, BOOK5.id, ...[ex.kept && facts['n4-import-own-file'], facts['n5-import-legacy-file'], facts['n5b-import-other-scheme-file']].flatMap((r) => (r && r.ids) || [])];
            fact('n6-stored-all', L.stored(app, ids));
        }
    } finally {
        record(`a9-${MODE}`, facts);
        await close();
    }
});
