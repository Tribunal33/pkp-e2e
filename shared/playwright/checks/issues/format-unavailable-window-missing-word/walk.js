// U73 A11 (docs/issues/U73-A11-format-unavailable-window-missing-word.md): on a press's
// "Publication Formats" page, the "Format Availability" window of an available format reads
// "This format will unavailable to readers." OMP only, on PKP's default test dataset (main or
// stable-3_5_0), freshly loaded.
//
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/format-unavailable-window-missing-word/walk.js
//   WALK_MODE=neighbour …   the neighbour check alone (a fix trial): book 4's "PDF" is "Not
//                           Available", and its "Format Availability" window keeps "Make this
//                           format available to readers. …"; nothing of the Steps is walked.
const {forEachApp, launch, signIn, screen, record, shot, loc, sql} = require('../../../probe');
const L = require('../format-controls-offered-then-refused/lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const BOOK = MODE === 'steps'
    ? {id: 14, title: 'From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots', link: 'Available'}
    : {id: 4, title: 'How Canadians Communicate: Contexts of Canadian Popular Culture', link: 'Not Available'};
const TITLE = 'Format Availability';

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const facts = {mode: MODE, line: app.line};
    const fact = (k, v) => { facts[k] = v; record('facts', {[k]: v}, {merge: true}); console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const guard = async (label, fn) => { try { return await fn(); } catch (e) { fact(`ERROR ${label}`, String(e.stack || e).slice(0, 1200)); return null; } };
    const pubId = (sub) => sql(app, `select current_publication_id from submissions where submission_id=${sub}`).trim();
    const stored = (sub) => sql(app, `select publication_format_id, is_available, is_approved from publication_formats where publication_id=${pubId(sub)} order by 1`);

    const {page, close} = await launch(app);
    const w = L.watch(page);
    try {
        fact('stored.before', stored(BOOK.id));
        // Step 1
        await signIn(page, 'dbarnes');
        let f;
        // Steps 2–3
        await guard('open', async () => {
            fact('open.via', await L.openBook(page, app, BOOK.id, BOOK.title));
            const opened = await L.openFormatsPage(page, app, BOOK.id, pubId(BOOK.id));
            f = opened.formats;
            fact('open.formatsVia', opened.via);
            fact('open.row', await L.rowState(f, 'PDF'));
            record('formats-page', await screen(page));
        });
        // Steps 4–5
        await guard('window', async () => {
            w.mark('window');
            await loc(page, `PDF row: ${BOOK.link}`, f.rowLink(f.formatRow('PDF'), BOOK.link));
            const win = await f.openStatus(f.formatRow('PDF'), BOOK.link, TITLE);
            await L.settle(page, 1000);
            fact('window.text', await L.windowText(page, TITLE));
            fact('window.buttons', await L.windowButtons(page, TITLE));
            record('window', await screen(page));
            await shot(page, 'format-availability-window');
            await win.cancelLink().first().click();
            await win.dialog().waitFor({state: 'detached', timeout: 15_000}).catch(() => {});
            await L.settle(page, 1500);
            fact('window.afterCancel', await L.windowText(page, TITLE));
            fact('window.calls', w.of('window'));
            fact('afterCancel.row', await L.rowState(f, 'PDF'));
        });
        fact('stored.after', stored(BOOK.id));
    } finally {
        record('walk', {facts, dialogs: w.log.dialogs, calls: w.log.calls});
        await close();
    }
});
