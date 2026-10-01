// Issue report docs/issues/U45-OMP2-file-row-doi-save-error.md (U45 OMP2):
// a DOI typed into a book's empty file row on a press's DOIs page is stored,
// but the save reports "Some DOI(s) could not be updated" and the box shows
// empty. Takes the report's Steps on PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"), as the dataset's `dbarnes`, on its
// press `publicknowledge`, with its published book 5. The kit builds nothing.
//
//   1. sign in as dbarnes
//   2. Settings › Distribution › "DOIs" › "Setup": "DOI Prefix" 10.1234,
//      tick "Files" ("Monographs" stays ticked), "Save"
//   3. "DOIs" ("Monographs" tab)
//   4. expand book 5, read its rows
//   5. "Edit", type 10.1234/u45ir9-file into "PDF / epilogue.pdf", "Save"
//   6. reload, expand book 5, read its rows
//   control: "Edit", type 10.1234/u45ir9-book into "Monograph", "Save"
//
// WALK=neighbour (fix in and out): steps 1-3, then tick book 5, "Bulk
// Actions" › "Assign DOIs"; expand it, "Edit", change the "Monograph" DOI
// and empty the file row's box, "Save"; reload and read. Those paths
// (PUT and DELETE api/v1/dois/{id}) must answer as before.
//
// WALK=retry (unfixed): steps 1-5, then "Save" again with the same DOI
// (r1), then with another DOI, 10.1234/u45ir9-file2 (r2); reload (r3);
// "Edit", change the file's DOI back to 10.1234/u45ir9-file, "Save" (r4);
// the dois table is read after each.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir2 PROBE_AGENT=ir9 node bin/probe.js omp shared/playwright/checks/issues/file-row-doi-save-error/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=ir9 node bin/probe.js omp shared/playwright/checks/issues/file-row-doi-save-error/walk.js
// Facts: .reports/<feature>/ir9/[<mode>-]facts[-<run>]-omp.json
const {forEachApp, launch, signIn, screen, shot, record, sql} = require('../../../probe');

const T = 20_000;
const MODE = process.env.WALK || 'walk';
const PREFIX = '10.1234';
const BOMB = 5; // "Bomb Canada and Other Unkind Remarks in the American Media"
const FILE_ROW = 'PDF / epilogue.pdf';
const BOOK_ROW = 'Monograph';

forEachApp(async (app) => {
    if (app.name !== 'omp') return; // file DOIs exist only on a press
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {DoiSettings, DoisPage, recordNotices} = require('../../../pages/DoisPages.js');
    const {expect} = require('@playwright/test');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `${MODE === 'walk' ? '' : `${MODE}-`}${s}${run}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 900)}`);
    };
    const stored = () =>
        sql(
            app,
            `select 'book', p.submission_id, d.doi, d.status from publications p join dois d on d.doi_id = p.doi_id where p.submission_id = ${BOMB}
             union all select 'file', sf.submission_id, d.doi, d.status from submission_files sf join dois d on d.doi_id = sf.doi_id where sf.submission_id = ${BOMB} order by 1`
        );

    const {page, close} = await launch(app);
    await recordNotices(page);
    const settings = new DoiSettings(page, app.contextPath);
    const dois = new DoisPage(page, app.contextPath);

    // every non-GET DOI request a save sends (api/v1/dois… and api/v1/_dois/…)
    /** @type {{method: string, override: string|null, url: string, status: number, body: string}[]} */
    let sent = [];
    page.on('response', async (r) => {
        if (!/\/api\/v1\/_?dois/.test(r.url()) || r.request().method() === 'GET') return;
        const h = r.request().headers();
        let body = '';
        try {
            body = (await r.text()).slice(0, 300);
        } catch {
            body = '(unread)';
        }
        sent.push({method: r.request().method(), override: h['x-http-method-override'] || null, url: r.url().replace(/^https?:\/\/[^/]+/, ''), status: r.status(), body});
    });
    const notices = () => page.evaluate(() => [.../** @type {any} */ (window).__doiNotices || []]);
    const clearNotices = () =>
        page.evaluate(() => {
            /** @type {any} */ (window).__doiNotices = [];
        });

    /** Expand book 5 and read its DOI rows: [{type, doi, badge}]. */
    const readBook = async (label) => {
        const row = dois.row(BOMB);
        await dois.expand(row, BOMB);
        const out = [];
        for (const type of await dois.doiTypes(row)) {
            out.push({type, doi: await dois.doiBox(row, type).inputValue(), badge: (await dois.doiBadge(row, type).innerText().catch(() => '')).trim()});
        }
        fact(`${label} rows`, out);
        record(name(`${label}-dois`), await screen(page));
        await shot(page, name(`${label}-dois`)).catch(() => {});
        return row;
    };

    /** "Edit", type each value into its row's box, "Save"; read requests, notices, rows. */
    const editAndSave = async (label, values) => {
        const row = dois.row(BOMB);
        await dois.startEditing(row);
        for (const [type, value] of Object.entries(values)) await dois.doiBox(row, type).fill(value);
        sent = [];
        await clearNotices();
        await dois.editButton(row).click();
        await expect(dois.editButton(row)).toHaveText(/^\s*Edit\s*$/, {timeout: T});
        await page.waitForTimeout(1500);
        fact(`${label} requests`, sent);
        fact(`${label} notices`, await notices());
        await readBook(`${label}-after`);
        fact(`${label} stored`, stored());
    };

    try {
        // 1-2
        await signIn(page, 'dbarnes');
        await settings.goto('Setup');
        await settings.prefixBox().fill(PREFIX);
        await settings.kindBox('Files').check();
        const r = await settings.pressSave(settings.setup);
        await expect(settings.savedStatus(settings.setup)).toBeVisible({timeout: T});
        fact('2 save', {status: r.status(), kinds: await settings.kinds()});
        // 3
        await dois.goto();
        await dois.expectListSettled();

        if (MODE === 'walk') {
            // 4-5
            await readBook('4');
            await editAndSave('5', {[FILE_ROW]: `${PREFIX}/u45ir9-file`});
            // 6
            await dois.reload();
            await dois.expectListSettled();
            await readBook('6');
            // control: the book's own row
            await editAndSave('c', {[BOOK_ROW]: `${PREFIX}/u45ir9-book`});
        } else if (MODE === 'neighbour') {
            const response = await dois.runBulk('Assign DOIs', [BOMB]);
            await page.waitForTimeout(500);
            fact('n1 assign', {status: response.status(), notices: await notices(), stored: stored()});
            await dois.goto();
            await dois.expectListSettled();
            await readBook('n1');
            await editAndSave('n2', {[BOOK_ROW]: `${PREFIX}/u45ir9-book`, [FILE_ROW]: ''});
            await dois.reload();
            await dois.expectListSettled();
            await readBook('n3');
        } else if (MODE === 'retry') {
            const all = () => sql(app, 'select doi_id, doi from dois order by doi_id');
            await readBook('4');
            await editAndSave('5', {[FILE_ROW]: `${PREFIX}/u45ir9-file`});
            fact('5 dois', all());
            await editAndSave('r1', {[FILE_ROW]: `${PREFIX}/u45ir9-file`});
            fact('r1 dois', all());
            await editAndSave('r2', {[FILE_ROW]: `${PREFIX}/u45ir9-file2`});
            fact('r2 dois', all());
            await dois.reload();
            await dois.expectListSettled();
            await readBook('r3');
            await editAndSave('r4', {[FILE_ROW]: `${PREFIX}/u45ir9-file`});
            fact('r4 dois', all());
        }
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
