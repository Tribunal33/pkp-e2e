// U73 A17 {OMP}: a format's "Metadata" tab saves page counts and dimensions that are not
// numbers ("xii", "tall"), and the book's Native XML export then fails on them. The issue
// report's Steps, on PKP's default test dataset (submission 4, "How Canadians Communicate"), as
// `dbarnes`, with a physical format "Paperback u73d" added on screen.
// Spec: docs/specs/U73-publication-formats-proof-terms.md, register A17 (Fields, the "Metadata" tab).
// Report: docs/issues/U74-A7-A8-sales-rights-market-values-fail-native-export.md (joined).
//
// Run (main; reset the dataset fleet first):
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js omp \
//     shared/playwright/checks/issues/page-counts-dimensions-fail-native-export/walk.js
// MODE=reach runs the reach checks alone (0, "12abc", "12,5", "-3"; a size on the digital "PDF").
// MODE=neighbour runs the neighbour check alone (values the fix must still save, and the export).
// Records the screens, asserts nothing.
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const PAPERBACK = 'Paperback u73d';
const COMPOSITION = 'Single-component retail product (00)';

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const {page, close} = await launch(app);
    const facts = {mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        const brief = v && typeof v === 'object' ? {...v, screen: undefined, afterCancel: undefined} : v;
        console.log(`[${MODE}] ${k}:`, JSON.stringify(brief).slice(0, 2500));
    };
    const meta = (format = PAPERBACK) => L.openMeta(app, page, L.BOOK.id, format, L.BOOK.publicationId);
    const tab = (name, format) => L.step(page, name, async () => ({boxes: await L.readBoxes(await meta(format))}));
    try {
        await signIn(page, 'dbarnes');
        fact('pre-identity', await L.step(page, 'identity', () => L.publisherIdentity(app, page)));
        // Steps 1-2: a physical format.
        fact('s2-add-paperback', await L.step(page, 's2', () => L.addFormat(app, page, {name: PAPERBACK, kind: /Paperback/, physical: true})));

        if (MODE === 'walk') {
            // Step 3: words in the six boxes, "Save".
            fact('s3-save-words', await L.step(page, 's3', async () =>
                L.saveBoxes(page, await meta(), {frontMatter: 'xii', backMatter: 'abc', height: 'tall', width: 'wide', thickness: 'thick', weight: 'heavy'}, {composition: COMPOSITION})));
            fact('s3-reopened', await tab('s3r'));
            fact('s3-stored', L.stored(app));
            // Step 4: the export.
            fact('s4-export', await L.step(page, 's4', () => L.nativeExport(app, page)));
            // Steps 5-6: the control, numbers.
            fact('s5-save-numbers', await L.step(page, 's5', async () =>
                L.saveBoxes(page, await meta(), {frontMatter: '12', backMatter: '3', height: '240', width: '160', thickness: '20', weight: '500'}, {composition: COMPOSITION})));
            fact('s5-stored', L.stored(app));
            fact('s6-export', await L.step(page, 's6', () => L.nativeExport(app, page)));
        } else if (MODE === 'reach') {
            fact('r1-save-edge-values', await L.step(page, 'r1', async () =>
                L.saveBoxes(page, await meta(), {frontMatter: '0', backMatter: '12abc', height: '12,5', width: '0', thickness: '-3', weight: '500'}, {composition: COMPOSITION})));
            fact('r1-stored', L.stored(app));
            fact('r1-export', await L.step(page, 'r1x', () => L.nativeExport(app, page)));
            // The Paperback set right again; a word in "Height" on the digital "PDF".
            fact('r2-paperback-numbers', await L.step(page, 'r2a', async () =>
                L.saveBoxes(page, await meta(), {frontMatter: '12', backMatter: '3', height: '240', width: '160', thickness: '20', weight: '500'})));
            fact('r2-pdf-height-word', await L.step(page, 'r2', async () =>
                L.saveBoxes(page, await meta('PDF'), {height: 'tall'}, {composition: COMPOSITION})));
            fact('r2-stored', L.stored(app));
            fact('r2-export', await L.step(page, 'r2x', () => L.nativeExport(app, page)));
        } else {
            // Neighbour: values the fix must still save (decimals, an empty box), and the export.
            fact('n1-save-valid', await L.step(page, 'n1', async () =>
                L.saveBoxes(page, await meta(), {frontMatter: '12', backMatter: '', height: '228.6', width: '152.4', thickness: '20', weight: '500'}, {composition: COMPOSITION})));
            fact('n1-reopened', await tab('n1r'));
            fact('n2-pdf-save-empty', await L.step(page, 'n2', async () =>
                L.saveBoxes(page, await meta('PDF'), {}, {composition: COMPOSITION})));
            fact('n-stored', L.stored(app));
            fact('n3-export', await L.step(page, 'n3', () => L.nativeExport(app, page)));
        }
    } finally {
        record(`u73-a17-${MODE}`, facts);
        await close();
    }
});
