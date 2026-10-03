// U73 A6 {OMP}: a publication format's "Metadata" tab always shows the physical groups ("Page
// Counts", "Returnable Indicator", "Physical Dimensions") and never "Digital Information", whatever
// the format's "Physical format" box and remote URL say. The issue report's Steps, on PKP's default
// test dataset (book 4, "How Canadians Communicate", whose "PDF" is hosted at another website), as
// `dbarnes`; "E-book u73b" (digital) and "Paperback u73b" (physical) are added on screen.
// Spec: docs/specs/U73-publication-formats-proof-terms.md, register A6 (Rule 17b).
// Issue report: docs/issues/U73-A6-digital-format-metadata-tab-asks-physical-details.md
//
// Run (reset the dataset fleet first):
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js omp \
//     shared/playwright/checks/issues/format-metadata-tab-always-physical/walk.js
// MODE=neighbour runs alone the case the fix must leave alone: a physical format's tab keeps the
// physical groups, and a "Height" saved there is kept.
// Records the screens and what each tab offers; asserts nothing.
const {forEachApp, launch, signIn, record, screen, shot} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const EBOOK = 'E-book u73b';
const PAPERBACK = 'Paperback u73b';
const COMPOSITION = 'Single-component retail product (00)';

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const {page, close} = await launch(app);
    page.setDefaultTimeout(30_000);
    const facts = {mode: MODE, line: app.line || 'main'};
    const fact = (k, v) => {
        facts[k] = v;
        const brief = v && typeof v === 'object' ? {...v, screen: undefined, labels: undefined} : v;
        console.log(`[${MODE}] ${k}:`, JSON.stringify(brief).slice(0, 1500));
    };
    const S = (name, fn) => L.step(page, name, fn);
    /** Open `name`'s window, record its "Edit" tab, press "Metadata", record the tab. */
    const tabOf = async (key, name) => {
        const {win, edit} = await L.openWindow(app, page, name);
        fact(`${key}-edit-tab`, edit);
        const meta = await win.openMetadata();
        const groups = await L.tabGroups(meta);
        groups.screen = await screen(page);
        await shot(page, `${key}-metadata`);
        fact(`${key}-metadata`, groups);
        return meta;
    };
    try {
        await signIn(page, 'dbarnes');
        if (MODE === 'walk') {
            // Steps 1-3: a digital format held by the press.
            fact('s2-add-ebook', await S('s2', () => L.addFormat(app, page, {name: EBOOK, kind: /\(DA\)/, physical: false})));
            let meta = await S('s3', () => tabOf('s3-ebook', EBOOK));
            // With the fix: the digital fields saved and read back (records "not offered" without it).
            if (meta && !meta.error) {
                fact('s3x-save-digital', await S('s3x', () => L.saveDigital(meta, {composition: COMPOSITION, size: '12', protection: /DRM/})));
                if (facts['s3x-save-digital'].offered === false) await L.close(page, meta);
                else {
                    const again = await S('s3y', () => tabOf('s3y-ebook-again', EBOOK));
                    if (again && !again.error) {
                        fact('s3y-digital-kept', await L.readDigital(again));
                        await L.close(page, again);
                    }
                }
            }
            // Steps 4-5: the dataset's remotely hosted "PDF".
            meta = await S('s4', () => tabOf('s5-pdf', 'PDF'));
            if (meta && !meta.error) await L.close(page, meta);
            // Steps 6-7, the control: a physical format.
            fact('s6-add-paperback', await S('s6', () => L.addFormat(app, page, {name: PAPERBACK, kind: /\(BC\)/, physical: true})));
            meta = await S('s7', () => tabOf('s7-paperback', PAPERBACK));
            if (meta && !meta.error) await L.close(page, meta);
        } else if (MODE === 'neighbour') {
            fact('n1-add-paperback', await S('n1', () => L.addFormat(app, page, {name: PAPERBACK, kind: /\(BC\)/, physical: true})));
            const meta = await S('n2', () => tabOf('n2-paperback', PAPERBACK));
            if (meta && !meta.error) fact('n3-save-height', await S('n3', () => L.savePhysical(meta, {composition: COMPOSITION, height: '210'})));
            const again = await S('n4', () => tabOf('n4-paperback-again', PAPERBACK));
            if (again && !again.error) {
                fact('n4-height-kept', await L.readHeight(again));
                await L.close(page, again);
            }
        }
    } finally {
        record(`a6-${MODE}`, facts);
        await close();
    }
});
