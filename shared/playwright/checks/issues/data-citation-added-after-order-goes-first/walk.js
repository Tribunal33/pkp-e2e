// Issue report docs/issues/U42-A8-data-citation-added-after-order-goes-first.md (U42 A8): on a
// publication's "Data" page, a data citation added after an order was saved appears first, above
// every ordered row, and stays there after a reload; before any order is saved nothing holds the
// order (code; the walk records what the screen shows).
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default
// test dataset, as the dataset's editor `dbarnes` on `publicknowledge`: ticks "Enable data citation
// metadata" (Settings > Workflow > Submission > Metadata), then on submission 1 (OJS, OPS) or 4
// (OMP) adds "u42r6 Dataset A", "B", "C", reloads, orders C first ("Order", C's up arrow twice,
// "Save Order"), adds "u42r6 Dataset D" and reloads. The kit builds nothing.
//
// Modes (first argument):
//   steps (default)  the Steps above.
//   nb               run alone on a fresh reset: adds "u42r6 NB 1", "NB 2", "NB 3", moves "NB 3" up
//                    once and saves the order, adds "u42r6 NB X" and "NB Y" (several added after one
//                    save), publishes the version and creates a new one ("Create New Version", "Minor
//                    Revision"), then reads the new version's table: a copy keeps the order of the
//                    version it was made from.
//   nb-setup         the adds and the order of `nb` alone; nb-version the publish and the new version
//                    alone (rows stored before the fix, then copied with the fix applied).
//
// Reset first:  npm run fleet-prep -- --feature issues-u42r6 --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-u42r6 PROBE_AGENT=u42r6 node bin/probe.js all shared/playwright/checks/issues/data-citation-added-after-order-goes-first/walk.js [steps|nb]
// Fix trial:    with fix.diff applied, PROBE_RUN=fix (steps), nb-in / nb-out (nb).
// Facts: .reports/<feature>/u42r6/a8-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, record, idle, sql} = require('../../../probe');
const L = require('./lib.js');

const mode = process.argv[2] || 'steps';
const LABEL = {ojs: 'Publish', omp: 'Publish', ops: 'Post'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {app: app.name, line: app.line || 'main', mode, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1600)}`);
    };
    const part = async (name, fn) => {
        try {
            await fn();
        } catch (e) {
            fact(`${name} error`, L.flat(e.message, 400));
        }
    };
    const sid = L.SUBMISSION[app.name];
    /** Evidence only: the stored seq of each data citation of the submission, by version. */
    const stored = () =>
        sql(
            app,
            `select d.publication_id, d.data_citation_id, d.seq, s.setting_value from data_citations d
             join publications p on p.publication_id = d.publication_id
             left join data_citation_settings s on s.data_citation_id = d.data_citation_id and s.setting_name = 'title'
             where p.submission_id = ${sid} order by 1, 2`
        )
            .split('\n')
            .filter(Boolean);

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        await part('P1', async () => fact('P1 Enable data citation metadata', await L.enableDataCitations(page, app)));

        if (mode === 'steps') {
            let table;
            await part('S1-3', async () => {
                table = await L.openData(page, app);
                if (!table) return fact('S1 Data page', 'absent');
                fact('S1 rows on landing', await L.rowTexts(table));
                for (const t of ['A', 'B', 'C']) fact(`S2-3 add Dataset ${t}: status`, await L.addDataCitation(page, table, {title: `u42r6 Dataset ${t}`}));
                fact('S3 rows after the three adds', await L.rowTexts(table));
            });
            await part('S4', async () => {
                await page.reload();
                table = await L.openData(page, app);
                fact('S4 rows after a reload', await L.rowTexts(table));
                record(`a8-before-order${run}`, await screen(page));
            });
            await part('S5', async () => {
                await L.pressTop(page, table, 'Order');
                await L.moveUp(page, table, 'u42r6 Dataset C', 2);
                fact('S5 rows in ordering mode after C up twice', await L.rowTexts(table));
                fact('S5 Save Order status', await L.saveOrder(page, table));
                await idle(page);
                fact('S5 rows after Save Order', await L.rowTexts(table));
            });
            await part('S6', async () => {
                fact('S6 add Dataset D: status', await L.addDataCitation(page, table, {title: 'u42r6 Dataset D'}));
                fact('S6 rows after adding D', await L.rowTexts(table));
                record(`a8-after-add${run}`, await screen(page));
            });
            await part('S7', async () => {
                await page.reload();
                table = await L.openData(page, app);
                fact('S7 rows after a reload', await L.rowTexts(table));
                record(`a8-after-reload${run}`, await screen(page));
            });
            fact('stored (publication, id, seq, title)', stored());
        } else if (mode.startsWith('nb')) {
            let table;
            if (mode !== 'nb-version')
                await part('nb order', async () => {
                    table = await L.openData(page, app);
                    if (!table) return fact('nb Data page', 'absent');
                    for (const t of ['1', '2', '3']) await L.addDataCitation(page, table, {title: `u42r6 NB ${t}`});
                    await L.pressTop(page, table, 'Order');
                    await L.moveUp(page, table, 'u42r6 NB 3', 1);
                    fact('nb Save Order status', await L.saveOrder(page, table));
                    for (const t of ['X', 'Y']) await L.addDataCitation(page, table, {title: `u42r6 NB ${t}`});
                    await page.reload();
                    table = await L.openData(page, app);
                    fact('nb rows of the version: a saved order, then X and Y added', await L.rowTexts(table));
                });
            if (mode !== 'nb-setup') {
                await part('nb publish', async () => {
                    const {publishNewest} = require('../new-version-galley-publisher-id-refused/lib.js');
                    fact('nb publish', await publishNewest(page, app, sid, LABEL[app.name]));
                });
                await part('nb new version', async () => {
                    const {newVersion} = require('../new-version-galley-publisher-id-refused/lib.js');
                    fact('nb new version', await newVersion(page, app, sid));
                    await page.reload();
                    table = await L.openData(page, app);
                    fact('nb rows of the new version', await L.rowTexts(table));
                    record(`a8-nb-new-version${run}`, await screen(page));
                });
            }
            fact('nb stored (publication, id, seq, title)', stored());
        }
    } finally {
        record(`a8-facts${run}`, facts);
        await close();
    }
});
