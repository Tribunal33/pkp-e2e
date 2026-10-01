// Issue report docs/issues/U45-OMP1-file-dois-ignored-on-dois-page.md
// (U45 OMP1): the report's Steps to reproduce, walked through the screens
// on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"), as the dataset's `dbarnes`, on its press `publicknowledge`,
// with the dataset's own published books 5 and 14. The kit builds nothing.
//
//   1. sign in as dbarnes
//   2. Settings › Distribution › "DOIs" › "Setup": "DOI Prefix" 10.1234, "Save"
//   3. "DOIs": tick book 5, "Bulk Actions" › "Assign DOIs", confirm
//   4. "Setup": untick "Monographs", tick "Files", "Save"
//   5. "DOIs": read the list
//   6. "Setup": tick "Monographs" too, "Save"
//   7. "DOIs": expand book 5, read its rows
//   8. press "Needs DOI", read the list
//
// WALK=neighbour (fix in and out): steps 1-3, then with "Monographs" alone
// the list, "Needs DOI" and "DOI Assigned" (file DOIs must not count while
// "Files" is unticked).
// WALK=reach (fix in only: unfixed, "Files" alone lists nothing): "Files"
// alone, tick book 14, "Assign DOIs", "Mark DOIs Registered"; "Monographs"
// ticked too; the "Registered" filter.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir2 PROBE_AGENT=ir5 node bin/probe.js omp shared/playwright/checks/issues/file-dois-ignored-on-dois-page/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=ir5 node bin/probe.js omp shared/playwright/checks/issues/file-dois-ignored-on-dois-page/walk.js
// Facts: .reports/<feature>/ir5/[<mode>-]facts[-<run>]-omp.json
const {forEachApp, launch, signIn, screen, shot, record, sql} = require('../../../probe');

const T = 20_000;
const MODE = process.env.WALK || 'walk';
const PREFIX = '10.1234';
const BOMB = 5; // "Bomb Canada and Other Unkind Remarks in the American Media"
const BRICKS = 14; // "From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots"

forEachApp(async (app) => {
    if (app.name !== 'omp') return; // file DOIs exist only on a press
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {DoiSettings, DoisPage, recordNotices} = require('../../../pages/DoisPages.js');
    const {expect} = require('@playwright/test');
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 900)}`);
    };
    const name = (s) => (MODE === 'walk' ? s : `${MODE}-${s}`);
    const stored = () =>
        sql(
            app,
            `select 'book', p.submission_id, d.doi, d.status from publications p join submissions s on s.current_publication_id = p.publication_id join dois d on d.doi_id = p.doi_id
             union all select 'file', sf.submission_id, d.doi, d.status from submission_files sf join dois d on d.doi_id = sf.doi_id order by 1, 2`
        );

    const {page, close} = await launch(app);
    await recordNotices(page);
    const settings = new DoiSettings(page, app.contextPath);
    const dois = new DoisPage(page, app.contextPath);

    /** "Setup": the prefix, the kinds ticked as `kinds` says, "Save". */
    const setKinds = async (label, kinds) => {
        await settings.goto('Setup');
        if ((await settings.prefixBox().inputValue()) !== PREFIX) await settings.prefixBox().fill(PREFIX);
        for (const [kind, want] of Object.entries(kinds)) {
            if (want) await settings.kindBox(kind).check();
            else await settings.kindBox(kind).uncheck();
        }
        const r = await settings.pressSave(settings.setup);
        await expect(settings.savedStatus(settings.setup)).toBeVisible({timeout: T});
        fact(`${label} save`, {status: r.status(), kinds: await settings.kinds()});
        record(name(`${label}-setup`), await screen(page));
    };

    /** The list shown: its row numbers, names, and the empty line. */
    const readList = async (label) => {
        await dois.expectListSettled();
        const ids = await dois.rows().evaluateAll((rows) => rows.map((r) => r.id.replace('list-item-submission-', '')));
        const empty = (await dois.emptyLine().count()) ? (await dois.emptyLine().innerText()).trim() : null;
        const out = {ids, names: await dois.rowNames(), empty};
        fact(`${label} list`, out);
        record(name(`${label}-dois`), await screen(page));
        await shot(page, name(`${label}-dois`)).catch(() => {});
        return out;
    };

    /** Expand a row and read its DOI table: [{type, doi, badge}]. */
    const readRow = async (label, id) => {
        const row = dois.row(id);
        await dois.expand(row, id);
        const out = [];
        for (const type of await dois.doiTypes(row)) {
            out.push({type, doi: await dois.doiBox(row, type).inputValue(), badge: (await dois.doiBadge(row, type).innerText().catch(() => '')).trim()});
        }
        fact(`${label} row ${id}`, {rowBadge: (await dois.rowBadge(row).innerText().catch(() => '')).trim(), rows: out});
        record(name(`${label}-row-${id}`), await screen(page));
        await dois.collapse(row, id);
        return out;
    };

    /** "DOIs": tick `ids`, run a bulk action, confirm. */
    const bulk = async (label, action, ids) => {
        await dois.goto();
        const response = await dois.runBulk(action, ids);
        await page.waitForTimeout(500);
        fact(`${label} ${action}`, {status: response.status(), notices: await page.evaluate(() => [.../** @type {any} */ (window).__doiNotices || []])});
    };

    try {
        // steps 1-3 (every mode)
        await signIn(page, 'dbarnes');
        await setKinds('2', {});
        await bulk('3', 'Assign DOIs', [BOMB]);
        fact('3 stored', stored());

        if (MODE === 'walk') {
            // "Files" alone: steps 4-5
            await setKinds('4', {Monographs: false, Files: true});
            await dois.goto();
            await readList('5');
            // both kinds: steps 6-8
            await setKinds('6', {Monographs: true, Files: true});
            await dois.goto();
            await readList('7');
            await readRow('7', BOMB);
            await dois.pressFilter('Needs DOI');
            await readList('8-needs-doi');
            fact('8 stored', stored());
        } else if (MODE === 'neighbour') {
            // "Monographs" alone: file DOIs must not count
            await dois.goto();
            await readList('n1');
            await readRow('n1', BOMB);
            await dois.pressFilter('Needs DOI');
            await readList('n2-needs-doi');
            await dois.pressFilter('Needs DOI');
            await dois.pressFilter('DOI Assigned');
            await readList('n3-doi-assigned');
        } else if (MODE === 'reach') {
            // the Registration filters, fix in only
            await setKinds('r1', {Monographs: false, Files: true});
            await bulk('r2', 'Assign DOIs', [BRICKS]);
            await bulk('r3', 'Mark DOIs Registered', [BRICKS]);
            fact('r3 stored', stored());
            await setKinds('r4', {Monographs: true, Files: true});
            await dois.goto();
            await readRow('r4', BRICKS);
            await dois.pressFilter('Registered');
            await readList('r5-registered');
        }
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
