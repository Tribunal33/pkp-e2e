// Issue report docs/issues/U73-A4-remote-format-cannot-be-made-local.md (U73 A4): in a remote
// publication format's "Edit" tab, unticking "This format will be available at a separate
// website." hides the address but keeps it, so "OK" saves the format still remote. Takes the
// report's Steps through the screens on a dataset fleet freshly reset to PKP's default test
// dataset, as `dbarnes`. The kit builds nothing.
//
// MODE=walk (default).
//   OMP, book 4 "How Canadians Communicate" (Production), whose "PDF" the dataset holds as a
//   remote format:
//   1-3. sign in as dbarnes; the book's "Publication Formats"; the "PDF" row
//   4.   "PDF" › "Edit": the remote box and the address
//   5.   untick the box: the address box's value
//   6.   "OK": the "PDF" row
//   7.   "PDF" › "Edit" again: the box and the address
//   w1-w3 (way round): "Edit", empty the address with the box ticked, untick, "OK"; the row;
//         "Edit" again
//   OJS, the control: submission 5 "Genetic transformation of forest trees" › "Galleys" ›
//   "Add galley": tick the box, type an address, untick, tick again: the address box; "Cancel".
//   OPS: skipped (its galley window is OJS's form; the control is walked once).
// MODE=nb, the neighbour alone (with the fix in and out), OMP: "Add publication format"
//   "E-book u73f" with the box ticked and an address, "OK": the row stays remote; the dataset
//   "PDF"'s "Edit", "OK" with the box left ticked: the address kept.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH \
//               npm run fleet-prep -- --feature issues-u73f --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u73f PROBE_AGENT=u73f node bin/probe.js all \
//                 shared/playwright/checks/issues/remote-format-cannot-be-made-local/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-u73f-3_5, PROBE_RUN=r35.
// Neighbour:    MODE=nb (and PROBE_RUN=nb-in / nb-out) in front of the run.
// Records the screens and what each read shows; asserts nothing.
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const FORMAT = 'PDF';
const EBOOK = 'E-book u73f';
const EBOOK_ADDRESS = 'https://example.org/u73f-ebook';
const GALLEY_ADDRESS = 'https://example.org/u73f-paper';

forEachApp(async (app) => {
    if (app.name === 'ops') {
        console.log('[a4] ops: no publication formats; the galley control is walked on OJS');
        return;
    }
    if (app.name === 'ojs' && MODE !== 'walk') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[a4] ${app.name} ${MODE} ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const stored = () =>
        sql(app, `select pf.publication_format_id, pf.remote_url, pf.url_path, s.setting_value from publication_formats pf join publication_format_settings s on s.publication_format_id = pf.publication_format_id and s.setting_name = 'name' and s.locale = 'en' where pf.publication_id = ${L.BOOK.publicationId} order by 1`);
    const step = async (key, fn) => {
        try {
            return await fn();
        } catch (e) {
            fact(`${key} error`, L.flat(String(e && e.message), 600));
            return null;
        }
    };
    const {page, close} = await launch(app);
    page.setDefaultTimeout(30_000);
    try {
        await signIn(page, 'dbarnes');
        if (app.name === 'ojs') {
            // The control: the journal's galley window empties the address on untick.
            const galleys = await L.openGalleys(page, app, 5);
            const win = await galleys.openCreate();
            await win.setRemote(true);
            await win.type(win.remoteUrlBox(), GALLEY_ADDRESS);
            const typed = await win.remoteUrlBox().inputValue();
            await win.setRemote(false);
            const afterUntick = await win.remoteUrlBox().inputValue();
            await win.setRemote(true);
            const afterRetick = await win.remoteUrlBox().inputValue();
            record('a4-c-galley-retick', await screen(page));
            fact('c galley window: typed, after untick, after tick again', {typed, afterUntick, afterRetick});
            await win.cancel();
            return;
        }
        const pf = await L.openFormats(app, page, L.BOOK.id, L.BOOK.publicationId);
        if (MODE === 'walk') {
            fact('0 stored', stored());
            fact('3 PDF row', await L.readRow(pf, FORMAT));
            record('a4-03-formats', await screen(page));
            let win = await pf.openEdit(FORMAT);
            fact('4 edit tab', await L.readRemote(win));
            await L.setRemote(win, false);
            fact('5 after untick', await L.readRemote(win));
            record('a4-05-unticked', await screen(page));
            await shot(page, 'a4-05-unticked').catch(() => {});
            await step('6', () => L.ok(page, win));
            fact('6 PDF row', await L.readRow(pf, FORMAT));
            fact('6 stored', stored());
            record('a4-06-formats', await screen(page));
            await shot(page, 'a4-06-formats').catch(() => {});
            win = await pf.openEdit(FORMAT);
            fact('7 edit tab again', await L.readRemote(win));
            record('a4-07-edit-again', await screen(page));
            await shot(page, 'a4-07-edit-again').catch(() => {});
            // The way round, when the format is still remote: empty the address first.
            if (facts['7 edit tab again'].address) {
                await win.type(L.addressBox(win.form()), '');
                await L.setRemote(win, false);
                fact('w1 emptied, then unticked', await L.readRemote(win));
                await step('w2', () => L.ok(page, win));
                fact('w2 PDF row', await L.readRow(pf, FORMAT));
                fact('w2 stored', stored());
                record('a4-w2-formats', await screen(page));
                win = await pf.openEdit(FORMAT);
                fact('w3 edit tab again', await L.readRemote(win));
            }
            await win.cancel();
        } else {
            const add = await pf.openAdd();
            await add.typeName(EBOOK);
            await L.setRemote(add, true);
            await add.type(L.addressBox(add.form()), EBOOK_ADDRESS);
            fact('n1 add window', await L.readRemote(add));
            await step('n1', () => L.ok(page, add));
            fact('n1 e-book row', await L.readRow(pf, EBOOK));
            let win = await pf.openEdit(EBOOK);
            fact('n1 e-book edit again', await L.readRemote(win));
            await win.cancel();
            win = await pf.openEdit(FORMAT);
            fact('n2 PDF edit tab', await L.readRemote(win));
            await step('n2', () => L.ok(page, win));
            fact('n2 PDF row', await L.readRow(pf, FORMAT));
            win = await pf.openEdit(FORMAT);
            fact('n2 PDF edit again', await L.readRemote(win));
            await win.cancel();
            fact('n stored', stored());
            record('a4-nb-formats', await screen(page));
        }
        await idle(page).catch(() => {});
    } finally {
        record(`a4-facts${MODE === 'walk' ? '' : `-${MODE}`}`, facts);
        await close();
    }
});
