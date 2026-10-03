// Issue report docs/issues/U39-A1-submission-library-file-403-for-participants.md: the Steps,
// taken through the screens on PKP's default test dataset, on every app.
//
//   node bin/probe.js all shared/playwright/checks/issues/submission-library-file-403-for-participants/walk.js
//   node bin/probe.js all shared/playwright/checks/issues/submission-library-file-403-for-participants/walk.js neighbour
//
// The walk: the editor adds "u39a agreement" to a submission's Library and downloads it; each
// assigned person the report names opens the same window and presses the file's name (the first
// also a file of their own; a preprint server's Moderator also "Download" under a decision
// email's "Library Files"); then the people who download today (the control).
//
// `neighbour` runs alone, for the fix trial: an assigned person downloads a Publisher Library file
// from "View Document Library", opens the "Submission Library" window, is removed from the
// submission by the editor in a second browser, and presses the file's name in the window still
// open. That press must stay refused with the fix and without it.
//
// Every step records what it met instead of throwing, so the same script reads the fixed and the
// unfixed code. Facts: facts-<app>.json in the run folder.
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const L = require('./lib');

const NEIGHBOUR = process.argv.includes('neighbour');
const FILE = 'u39a agreement';
const OWN = 'u39a own note';
const GUIDE = 'u39a guide';

/** One person's read of the "Submission Library" window, and their press on a file's name. */
async function readAndPress(page, app, C, person, name, label) {
    const out = {user: person.user, role: person.role};
    const wf = await L.openWorkflow(page, app, C.id, {author: !!person.author});
    out.workflow = wf.open;
    out.headerButtons = wf.buttons;
    const grid = await L.openLibrary(page);
    if (!grid) {
        out.library = false;
        record(`${label}-no-library`, await screen(page));
        return out;
    }
    out.library = true;
    out.list = await L.readList(grid);
    const link = grid.getByRole('link', {name, exact: true}).first();
    out.listed = (await link.count()) > 0;
    if (!out.listed) return out;
    out.rowLinks = await L.rowLinks(page, grid, name);
    record(`${label}-window`, await screen(page));
    out.press = await L.press(page, link, `${label}-after-press`);
    return out;
}

async function walk(app, C, page, facts) {
    const pdf = L.pdfOf(app);

    // Steps 1–4: the editor adds the file and downloads it.
    await signIn(page, C.editor);
    const ed = {user: C.editor};
    const wf = await L.openWorkflow(page, app, C.id);
    ed.headerButtons = wf.buttons;
    let grid = await L.openLibrary(page);
    ed.added = await L.addFile(page, grid, {name: FILE, type: 'Permissions', file: pdf});
    ed.list = await L.readList(grid);
    record('editor-window', await screen(page));
    ed.press = await L.press(page, grid.getByRole('link', {name: FILE, exact: true}).first(), 'editor-after-press');
    facts.editor = ed;

    // Steps 5–10: the assigned people the report names.
    facts.refused = [];
    for (const [i, person] of C.refused.entries()) {
        await signIn(page, person.user);
        const r = await readAndPress(page, app, C, person, FILE, `refused-${person.user}`);
        if (i === 0 && r.library) {
            // Step 7: a file of their own.
            await L.openWorkflow(page, app, C.id, {author: !!person.author});
            grid = await L.openLibrary(page);
            r.own = {added: await L.addFile(page, grid, {name: OWN, type: 'Other', file: pdf})};
            r.own.list = await L.readList(grid);
            r.own.press = await L.press(page, grid.getByRole('link', {name: OWN, exact: true}).first(), `refused-${person.user}-own-after-press`);
        }
        if (person.composer) {
            // Step 10: "Download" under a decision email's "Library Files".
            await L.openWorkflow(page, app, C.id);
            const lib = await L.openDeclineLibraryFiles(page);
            const c = {stopped: lib.stopped || null, url: lib.url || null, items: lib.items || null};
            if (lib.win) {
                record(`refused-${person.user}-library-files`, await screen(page));
                const item = lib.win.locator('.selectSubmissionFileListItem').filter({hasText: FILE}).first();
                c.listed = (await item.count()) > 0;
                if (c.listed) c.press = await L.press(page, item.getByRole('link', {name: 'Download'}).first(), `refused-${person.user}-composer-after-press`);
                c.emailPageStayed = /decision/.test(page.url());
            }
            r.composer = c;
        }
        facts.refused.push(r);
    }

    // Step 11: the control.
    facts.controls = [];
    for (const person of C.controls) {
        await signIn(page, person.user);
        facts.controls.push(await readAndPress(page, app, C, person, FILE, `control-${person.user}`));
    }
}

async function neighbour(app, C, page, facts) {
    const pdf = L.pdfOf(app);
    // The person removed must be listed under the Production stage's "Participants".
    const person = C.refused.find((p) => ['Layout Editor', 'Moderator'].includes(p.role));

    // The editor adds a Publisher Library file and the submission's file.
    await signIn(page, C.editor);
    const pub = await L.openPublisherLibrary(page, app);
    facts.guideAdded = await L.addFile(page, pub, {name: GUIDE, type: 'Other', file: pdf});
    await L.openWorkflow(page, app, C.id);
    const edGrid = await L.openLibrary(page);
    facts.fileAdded = await L.addFile(page, edGrid, {name: FILE, type: 'Permissions', file: pdf});

    // The person, in a browser of their own.
    const second = await launch(app);
    try {
        const p2 = second.page;
        await signIn(p2, person.user);
        const n = {user: person.user, role: person.role};
        await L.openWorkflow(p2, app, C.id);
        let grid = await L.openLibrary(p2);
        const view = await L.openViewDocumentLibrary(p2, grid);
        record('neighbour-view-document-library', await screen(p2));
        n.publisherFile = await L.press(p2, view.getByRole('link', {name: GUIDE, exact: true}).first(), 'neighbour-guide-after-press');

        // The window they leave open.
        await L.openWorkflow(p2, app, C.id);
        grid = await L.openLibrary(p2);
        n.listBeforeRemoval = await L.readList(grid);

        // The editor removes them.
        await L.openWorkflow(page, app, C.id);
        n.removal = await L.removeParticipant(page, person.name);
        record('neighbour-participants-after-removal', await screen(page));

        // They press the name in the window still open.
        n.pressAfterRemoval = await L.press(p2, grid.getByRole('link', {name: FILE, exact: true}).first(), 'neighbour-after-removal-press');
        facts.neighbour = n;
    } finally {
        await second.close().catch(() => {});
    }
}

forEachApp(async (app) => {
    const C = L.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', mode: NEIGHBOUR ? 'neighbour' : 'walk', run: process.env.PROBE_RUN || null, submission: C.id};
    const {page, close} = await launch(app);
    try {
        if (NEIGHBOUR) await neighbour(app, C, page, facts);
        else await walk(app, C, page, facts);
    } catch (e) {
        facts.error = String(e && e.stack ? e.stack : e).slice(0, 1200);
        record('error-screen', await screen(page).catch(() => null));
    } finally {
        await idle(page).catch(() => {});
        record('facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
