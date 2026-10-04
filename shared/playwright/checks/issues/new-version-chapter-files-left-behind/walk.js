// U72 A3: after "Create New Version", a book's chapters in the new version lose every file but the
// proofs copied with the formats, and a proof made later in the new version from a chapter's
// production-ready file shows under no chapter on the book's page. Takes the report's Steps on PKP's
// default test dataset, OMP (OJS and OPS have no chapters):
//   dbarnes, submission 14 "From Bricks to Brains…": the published version's "Chapter 1: …" window
//   read; "Create New Version" ("Minor Revision"); the new version's and the earlier version's
//   "Chapter 1: …" windows read; the new version's "PDF" › "Select Files" › "chapter2.pdf" › "OK",
//   approved, "Open Access"; the new version's "Chapter 2: …" window read; the new version
//   published; the book's page read signed out.
// The last argument picks another mode:
//   neighbour: creates the new version and reads, as the case a fix must leave alone, the earlier
//     version's "Chapter 1: …" window and, signed out, the book's page (still the earlier version).
//   repair: the steps, then the hidden proof's own page opened by its address, then the repair on
//     screen: the earlier version's "Chapter 2: …" window with the new proof unticked, "Save"; the new
//     version's "Chapter 2: …" with it ticked, "Save"; the book's page read again.
//   wayround: a new version, its "PDF" › "Change File" with the corrected chapter file (the fixture
//     replacement.pdf) as a "Book Manuscript", approved and "Open Access"; the new version's "Chapter
//     2: …" with it ticked, "Save"; the version published; the book's page read.
//   older-source (main): a new version published, then "Create New Version" from "Version of Record
//     1.0": the newest version's "Chapter 1: …" window read.
// Records each window's "Files" boxes (label, ticked, the box's file number), the book page's
// chapter and download links, and the stored chapter of each file (Evidence).
// Reset the dataset fleet first; the walk changes the book.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/new-version-chapter-files-left-behind/walk.js [neighbour|repair|wayround|older-source]
const {forEachApp, launch, signIn, signOut, record, note} = require('../../../probe');
const L = require('./lib');

const MODES = ['neighbour', 'repair', 'wayround', 'older-source'];
const MODE = MODES.find((m) => process.argv.includes(m)) || 'steps';
const SID = 14;
const PUB = 14;
const CH1 = 'Chapter 1: Mind Control—Internal or External?';
const CH2 = 'Chapter 2: Classical Music and the Classical Mind';
const FIXTURE = require('path').resolve(__dirname, '../../../../../apps/omp/playwright/fixtures/files/replacement.pdf');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'omp') {
        note(`u72c walk: ${app.name} skipped, no chapters`);
        return;
    }
    const {page, close} = await launch(app);
    const facts = {line: app.line || 'main', mode: MODE};
    const step = async (key, fn) => {
        try {
            facts[key] = await fn();
        } catch (e) {
            facts[key] = {error: String(e.message).split('\n')[0].slice(0, 300)};
        }
        return facts[key];
    };
    const chapters = async (pubId, n35 = null) => L.openChapters(page, app, SID, pubId, n35);
    try {
        facts.storedBefore = L.stored(app, SID);
        await signIn(page, 'dbarnes');
        if (MODE === 'steps' || MODE === 'repair') {
            await step('s3-v1-chapter1', async () => L.readChapterFiles(page, await chapters(PUB), CH1, 's3-v1-chapter1'));
        }
        const made = await step('s4-new-version', () => L.newVersion(page, app, SID));
        const v2 = made && made.id;
        if (MODE === 'steps' || MODE === 'repair') {
            await step('s5-v2-chapter1', async () => L.readChapterFiles(page, await chapters(v2), CH1, 's5-v2-chapter1'));
        }
        if (MODE !== 'wayround' && MODE !== 'older-source') {
            await step('s6-v1-chapter1-after', async () => L.readChapterFiles(page, await chapters(PUB, 1), CH1, 's6-v1-chapter1-after'));
        }
        facts.storedAfterVersion = L.stored(app, SID);
        if (MODE === 'neighbour') {
            await signOut(page, {origin: app.baseURL});
            await step('n-book-page', () => L.readBookPage(page, app, SID, null, 'n-book-page'));
        } else if (MODE === 'older-source') {
            await step('o-publish-v2', () => L.publishNewest(page, app, SID, 'Publish'));
            const v3 = await step('o-new-version-from-1.0', () => L.newVersionFrom(page, app, SID, 'Version of Record 1.0'));
            await step('o-v3-chapter1', async () => L.readChapterFiles(page, await chapters(v3 && v3.id), CH1, 'o-v3-chapter1'));
            facts.storedAfterV3 = L.stored(app, SID);
        } else if (MODE === 'wayround') {
            await step('w-upload', () => L.uploadProof(page, app, SID, v2, 'PDF', FIXTURE));
            await step('w-v2-chapter2-tick', async () => L.setChapterFile(page, await chapters(v2), CH2, {label: 'replacement.pdf', from: false}, true, 'w-v2-chapter2-tick'));
            await step('w-v2-chapter2-after', async () => L.readChapterFiles(page, await chapters(v2), CH2, 'w-v2-chapter2-after'));
            await step('w-publish', () => L.publishNewest(page, app, SID, 'Publish'));
            facts.storedAfterWayRound = L.stored(app, SID);
            await signOut(page, {origin: app.baseURL});
            await step('w-book-page', () => L.readBookPage(page, app, SID, null, 'w-book-page'));
        } else {
            const proof = await step('s7-s8-proof', () => L.addProofFromList(page, app, SID, v2, 'PDF', 'chapter2.pdf'));
            await step('s9-v2-chapter2', async () => L.readChapterFiles(page, await chapters(v2), CH2, 's9-v2-chapter2'));
            await step('s10-publish', () => L.publishNewest(page, app, SID, 'Publish'));
            facts.storedAfterProof = L.stored(app, SID);
            await signOut(page, {origin: app.baseURL});
            const book = await step('s11-book-page', () => L.readBookPage(page, app, SID, null, 's11-book-page'));
            await step('s11-earlier-version-page', () => L.readBookPage(page, app, SID, PUB, 's11-earlier-version-page'));
            if (MODE === 'repair') {
                // The new proof is the highest number in the format's list; its format, the number in
                // the book page's "Chapter 2" link.
                const nums = ((proof && proof.rowsAfter) || []).map((r) => Number((r.match(/\b(\d+) chapter2\.pdf/) || [])[1])).filter(Boolean);
                const newId = nums.length ? Math.max(...nums) : null;
                const href = (((book && book.chapters) || [])[1] || {links: [{}]}).links[0].href || '';
                const formatId = (href.match(/\/catalog\/view\/\d+\/(\d+)\//) || [])[1];
                facts.newProof = {fileId: newId, formatId};
                await step('r1-file-page', () => L.openFilePage(page, app, `/index.php/${app.contextPath}/catalog/view/${SID}/${formatId}/${newId}`));
                await signIn(page, 'dbarnes');
                await step('r2-v1-chapter2-untick', async () => L.setChapterFile(page, await chapters(PUB, 1), CH2, {fileId: newId}, false, 'r2-v1-chapter2-untick'));
                await step('r3-v2-chapter2-tick', async () => L.setChapterFile(page, await chapters(v2), CH2, {fileId: newId}, true, 'r3-v2-chapter2-tick'));
                facts.storedAfterRepair = L.stored(app, SID);
                await signOut(page, {origin: app.baseURL});
                await step('r4-book-page', () => L.readBookPage(page, app, SID, null, 'r4-book-page'));
                await step('r4-earlier-version-page', () => L.readBookPage(page, app, SID, PUB, 'r4-earlier-version-page'));
            }
        }
    } finally {
        record(MODE === 'steps' ? 'walk' : MODE, facts);
        console.log(`[fact] ${JSON.stringify(facts)}`);
        await close();
    }
});
