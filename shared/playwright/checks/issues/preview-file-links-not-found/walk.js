// Issue report docs/issues/U69-A24-book-preview-file-links-not-found.md
// (U69 A24): on the preview of a new version of a published book, or of a
// book never published, every file link opens "404 Not Found". Takes the
// report's Steps on PKP's default test dataset (OMP):
//   A: dbarnes, submission 14, "Create New Version", "Title & Abstract",
//      "Preview", the side column's "Segmentation of Vascular Ultrasound
//      Imag.pdf", back, the first chapter's "PDF"; mdawson (the book's
//      author) opens the preview and presses the same file. Control: signed
//      out, the published book's page, the same file.
//   B: dbarnes, submission 4, "Publication Formats", "Add publication
//      format" "u69h13p PDF", "Change File" u69h13p-book.pdf, "Set Terms"
//      "Open Access", "Not Available" › "OK", "Title & Abstract",
//      "Preview", "u69h13p PDF" (the format's one file).
// WALK=nb (the neighbour a fix must leave alone; runs alone): dbarnes makes
//   a new version of submission 14 and reads its preview's file addresses;
//   signed out, and as aclark (an author of another book), each address
//   typed must stay "404 Not Found"; signed out, the published file opens.
// Reset the dataset fleet first; the walk changes the dataset.
// Run:   PROBE_FEATURE=issues-h13p PROBE_AGENT=h13p node bin/probe.js omp shared/playwright/checks/issues/preview-file-links-not-found/walk.js
// 3.5:   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-h13p-3_5 PROBE_AGENT=h13p node bin/probe.js omp …/walk.js
// GROUP=A or GROUP=B takes one group alone.
// nb:    WALK=nb PROBE_RUN=nb-out PROBE_FEATURE=issues-h13p PROBE_AGENT=h13p node bin/probe.js omp …/walk.js
const {forEachApp, launch, signIn, signOut, record, idle} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.WALK || 'steps';
const GROUPS = (process.env.GROUP || 'A,B').split(',');
const SIDE_FILE = 'Segmentation of Vascular Ultrasound Imag.pdf';

function log(app, facts, key, value) {
    facts[key] = value;
    console.log(`[fact] ${app.name} ${key}: ${JSON.stringify(value)}`);
}

/** Run one step, keeping its error as a fact instead of stopping the walk. */
async function step(app, facts, key, fn) {
    try {
        const v = await fn();
        log(app, facts, key, v);
        return v;
    } catch (e) {
        log(app, facts, key, {error: L.flat(e.message, 300)});
        return null;
    }
}

async function groupA(app, page, facts, stable35) {
    const frame = L.workflow(page, app);
    // A1-A2.
    await signIn(page, 'dbarnes');
    await frame.gotoEditorial(14);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    // A3.
    await step(app, facts, 'A3 create version', () => L.createNewVersion(page, frame, stable35));
    await L.snap(page, 'A3-created');
    // A4.
    const preview = await step(app, facts, 'A4 preview', () => L.openPreview(page, frame, stable35));
    await L.snap(page, 'A4-preview');
    const previewUrl = preview && preview.url;
    // A5.
    await step(app, facts, 'A5 side file', () => L.pressFile(page, SIDE_FILE));
    await L.snap(page, 'A5-side-file');
    // A6.
    if (previewUrl) {
        await page.goto(app.url(previewUrl));
        await idle(page);
        await step(app, facts, 'A6 chapter pdf', () => L.pressFile(page, 'PDF', 0));
        await L.snap(page, 'A6-chapter-pdf');
    }
    await signOut(page);
    // A7.
    if (previewUrl) {
        await signIn(page, 'mdawson');
        await page.goto(app.url(previewUrl));
        await idle(page);
        log(app, facts, 'A7 author preview', await L.readBookPage(page));
        await step(app, facts, 'A7 author side file', () => L.pressFile(page, SIDE_FILE));
        await L.snap(page, 'A7-author-side-file');
        await signOut(page);
    }
    // Control: signed out, the published book's page, the same file.
    await page.goto(app.url(`/index.php/${app.contextPath}/catalog/book/14`));
    await idle(page);
    await step(app, facts, 'A control published file', () => L.pressFile(page, SIDE_FILE));
    await L.snap(page, 'A-control');
}

async function groupB(app, page, facts, stable35) {
    const frame = L.workflow(page, app);
    // B1.
    await signIn(page, 'dbarnes');
    await frame.gotoEditorial(4);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    // B2-B5.
    const pdf = L.bookPdf(app);
    const added = await step(app, facts, 'B2-5 format with file', async () => {
        const formats = await L.openFormats(page, app, frame, stable35);
        return L.addFormatWithFile(page, app, formats, 'u69h13p PDF', pdf);
    });
    await L.snap(page, 'B5-formats');
    // B6.
    await frame.gotoEditorial(4);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    const preview = await step(app, facts, 'B6 preview', () => L.openPreview(page, frame, stable35));
    await L.snap(page, 'B6-preview');
    // B7.
    if (added && preview) {
        // A format holding one file is linked by the format's name.
        await step(app, facts, 'B7 file', () => L.pressFile(page, 'u69h13p PDF'));
        await L.snap(page, 'B7-file');
    }
    await signOut(page);
}

async function neighbour(app, page, facts, stable35) {
    const frame = L.workflow(page, app);
    await signIn(page, 'dbarnes');
    await frame.gotoEditorial(14);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    await step(app, facts, 'nb create version', () => L.createNewVersion(page, frame, stable35));
    const preview = await step(app, facts, 'nb preview', () => L.openPreview(page, frame, stable35));
    await signOut(page);
    const hrefs = ((preview && preview.files) || []).map((f) => f.href).filter((h) => /\/version\//.test(h));
    log(app, facts, 'nb new version file addresses', hrefs);
    for (const [who, user] of [['visitor', null], ['aclark', 'aclark']]) {
        if (user) await signIn(page, user);
        const out = [];
        for (const h of hrefs.slice(0, 2)) out.push(await L.openAddress(page, app, h));
        log(app, facts, `nb ${who} typed`, out);
        await L.snap(page, `nb-${who}`);
        if (user) await signOut(page);
    }
    await page.goto(app.url(`/index.php/${app.contextPath}/catalog/book/14`));
    await idle(page);
    await step(app, facts, 'nb visitor published file', () => L.pressFile(page, SIDE_FILE));
    await L.snap(page, 'nb-published-file');
}

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const stable35 = app.line === 'stable-3_5_0';
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    try {
        if (MODE === 'nb') {
            await neighbour(app, page, facts, stable35);
        } else {
            if (GROUPS.includes('A')) await groupA(app, page, facts, stable35);
            if (GROUPS.includes('B')) await groupB(app, page, facts, stable35);
        }
    } catch (e) {
        facts.error = L.flat(e.stack || e.message, 800);
        await L.snap(page, 'error');
        throw e;
    } finally {
        record(MODE === 'nb' ? 'nb-facts' : 'facts', facts);
        await close();
    }
});
