// Issue report docs/issues/U46-A7-galley-format-moves-in-list-when-saved.md
// (U46 A7, U73 A14): saving a galley (journal, preprint server) or a
// publication format (press) moves it in its list, and on the reader's
// page, while no order has been saved. Takes the report's Steps through the
// screens on a dataset fleet freshly reset to PKP's default test dataset,
// as `dbarnes`.
//
// OJS submission 17 and OPS submission 2 (published, one galley "PDF"):
//   2.   Publication (Preprint) › "Galleys": "PDF"
//   3-4. "Add galley" "Appendix u46w5" (Article Text / Preprint Text, a PDF),
//        "Add galley" "Data u46w5" (Data Set, a CSV)
//   5-6. the list; the item's public page
//   7.   "PDF" › "Edit" › "Save", nothing changed
//   8-9. the list, after a reload, and the public page
// OMP submission 5 (published, one format "PDF", approved and available):
//   2-5. "Publication Formats": "Add publication format" "EPUB u46w5", "OK";
//        "Print u46w5", "OK"; the list
//   6.   "PDF" › "Edit" › "OK", nothing changed; the list, after a reload
//   7.   "EPUB u46w5" › "Awaiting Approval" › "OK"; the list
//   8.   "PDF" › "Available" › "OK"; the list
//
// W5_MODE=nb is the fix's neighbour check, run alone (fix in and out):
// OJS/OPS: the two galleys added, "Order", "Data u46w5" to the top, "Save
// Order", a reload, "PDF" › "Edit" › "Save", then "Add galley" "Notes
// u46w5": the saved order must hold; where the new galley lands is read.
// OMP: the two formats added, the list, and the book's public page.
//
// Reset first:  npm run fleet-prep -- --feature issues-w5 --dataset 5 --reset
// Run (main):   PROBE_FEATURE=issues-w5 PROBE_AGENT=w5 node bin/probe.js all shared/playwright/checks/issues/galley-format-moves-in-list-when-saved/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both (and PROBE_RUN=r35), feature issues-w5-3_5.
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib');
const G = require('../listing-offers-galley-without-file/lib');

const NB = process.env.W5_MODE === 'nb';
const FACTS = NB ? 'w5-facts-nb' : 'w5-facts';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null, mode: NB ? 'nb' : 'walk'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const p = (s) => (NB ? `w5-nb-${s}` : `w5-${s}`);
    const {browser, page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        if (app.name === 'omp') {
            const ID = 5;
            const formats = await L.openFormats(page, app, ID, 5);
            fact('2 list', await L.formatList(page, formats));
            for (const name of ['EPUB u46w5', 'Print u46w5']) {
                const win = await formats.openAdd();
                await win.typeName(name);
                await win.ok().catch((e) => fact(`add ${name} error`, e.message));
            }
            fact('5 list after adding', await L.formatList(page, formats));
            record(p('omp-05-added'), await screen(page));
            if (NB) {
                await formats.reload();
                fact('nb list after reload', await L.formatList(page, formats));
                fact('nb book page', await L.bookFormats(browser, app, ID));
                return;
            }
            const edit = await formats.openEdit('PDF');
            await edit.ok().catch((e) => fact('6 OK error', e.message));
            fact('6 list after "PDF" Edit › OK', await L.formatList(page, formats));
            record(p('omp-06-edited'), await screen(page));
            await shot(page, p('omp-06-edited')).catch(() => {});
            await formats.reload();
            fact('6 list after reload', await L.formatList(page, formats));
            try {
                const st = await formats.openStatus(formats.formatRow('EPUB u46w5'), 'Awaiting Approval', 'Format Approval');
                await st.ok();
                fact('7 list after "EPUB u46w5" approval', await L.formatList(page, formats));
            } catch (e) {
                fact('7 approval error', L.flat(e.message, 300));
            }
            try {
                const st = await formats.openStatus(formats.formatRow('PDF'), 'Available', 'Format Availability');
                await st.ok();
                fact('8 list after "PDF" Not Available', await L.formatList(page, formats));
            } catch (e) {
                fact('8 availability error', L.flat(e.message, 300));
            }
            await formats.reload();
            fact('8 list after reload', await L.formatList(page, formats));
            record(p('omp-08-end'), await screen(page));
            return;
        }
        const ID = app.name === 'ops' ? 2 : 17;
        const kind = app.name === 'ops' ? 'preprint' : 'article';
        const text = app.name === 'ops' ? 'Preprint Text' : 'Article Text';
        const galleys = await G.openGalleys(page, app, ID);
        fact('2 list', await L.galleyList(page, galleys));
        await galleys.addGalley({label: 'Appendix u46w5', component: text, file: L.PDF, name: L.PDF.name});
        await galleys.addGalley({label: 'Data u46w5', component: 'Data Set', file: L.CSV, name: L.CSV.name});
        fact('5 list after adding', await L.galleyList(page, galleys));
        record(p('05-added'), await screen(page));
        if (NB) {
            await galleys.startOrdering();
            const now = await galleys.labels();
            await galleys.arrange(['Data u46w5', ...now.filter((l) => l !== 'Data u46w5')]);
            const saved = await galleys.saveOrder();
            fact('nb Save Order answered', saved.status());
            fact('nb list after Save Order', await L.galleyList(page, galleys));
            await galleys.reload();
            fact('nb list after reload', await L.galleyList(page, galleys));
            const edit = await galleys.openEdit('PDF');
            await edit.save();
            fact('nb list after "PDF" Edit › Save', await L.galleyList(page, galleys));
            await galleys.addGalley({label: 'Notes u46w5', component: 'Data Set', file: L.CSV, name: L.CSV.name});
            fact('nb list after adding "Notes u46w5"', await L.galleyList(page, galleys));
            await galleys.reload();
            fact('nb list at the end, reloaded', await L.galleyList(page, galleys));
            fact('nb public page', await L.publicGalleys(browser, app, kind, ID));
            return;
        }
        fact('6 public page before', await L.publicGalleys(browser, app, kind, ID));
        const edit = await galleys.openEdit('PDF');
        fact('7 window label box', await edit.labelBox().inputValue());
        await edit.save();
        fact('8 list after "PDF" Edit › Save', await L.galleyList(page, galleys));
        record(p('08-edited'), await screen(page));
        await shot(page, p('08-edited')).catch(() => {});
        await galleys.reload();
        fact('8 list after reload', await L.galleyList(page, galleys));
        fact('9 public page after', await L.publicGalleys(browser, app, kind, ID));
    } finally {
        record(FACTS, facts);
        await close();
    }
});
