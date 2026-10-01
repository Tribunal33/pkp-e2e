// Issue report docs/issues/U45-A11-doi-search-finds-different-sets.md
// (U45 A11): the report's Steps to reproduce, walked through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"), as the dataset's `dbarnes`, on its own context
// `publicknowledge`, with the dataset's own submissions. The kit builds
// nothing.
//
//   1. sign in as dbarnes
//   2. Settings › Distribution › "DOIs" › "Setup": "DOI Prefix" 10.1234, "Save"
//   3. "DOIs": tick A, "Bulk Actions" › "Assign DOIs", confirm
//   4. expand A, read its DOI (D_A)
//   5. "Search": D_A whole, Enter
//   6. "Setup": tick the second kind (galleys / "Publication Formats"), "Save"
//   7. "DOIs": tick B, "Assign DOIs", confirm
//   8. expand B, read its own DOI and its galley's / format's DOI (G_B)
//   9. "Search": G_B whole, Enter
//  10. "Search": "10.1234/", Enter
// Each search reads the list on screen and the list request's answer
// (status, itemsMax, the item ids), as the page itself fetched it.
//
// NEIGHBOUR=1 adds, after step 10, the paths a fix must leave alone or
// must reach: n1 a title word of B; n2 "10.9999/"; n3 the second kind
// unticked, G_B again (must find nothing); n4 the editorial dashboard's
// "Search submissions" with D_A (the same collector).
//
// Reset first:  npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir1 PROBE_AGENT=ir6 node bin/probe.js all shared/playwright/checks/issues/doi-search-finds-different-sets/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=ir6 node bin/probe.js all shared/playwright/checks/issues/doi-search-finds-different-sets/walk.js
// Facts: .reports/<feature>/ir6/[nb-]facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, sql} = require('../../../probe');

const T = 20_000;
const NEIGHBOUR = process.env.NEIGHBOUR === '1';
const PREFIX = '10.1234';

const ITEMS = {
    // A: the work's own kind only; B: with the second kind ticked
    ojs: {a: 5, b: 17, second: 'Article galleys, such as a published PDF', titleWord: 'Antimicrobial'},
    omp: {a: 5, b: 14, second: 'Publication Formats', titleWord: 'Bricks'},
    ops: {a: 5, b: 2, second: 'Preprint galleys, such as a published PDF', titleWord: 'Facets'},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const it = ITEMS[app.name];
    const {DoiSettings, DoisPage, recordNotices, isListFetch} = require('../../../pages/DoisPages.js');
    const {expect} = require('@playwright/test');
    const facts = {app: app.name, line: app.line || 'main', neighbour: NEIGHBOUR, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 900)}`);
    };
    const name = (s) => `${NEIGHBOUR ? 'nb-' : ''}${s}`;
    const stored = () =>
        sql(
            app,
            `select 'own', p.submission_id, d.doi from publications p join dois d on d.doi_id = p.doi_id
             union all select '${app.name === 'omp' ? 'format' : 'galley'}', p.submission_id, d.doi from ${app.name === 'omp' ? 'publication_formats' : 'publication_galleys'} g
               join publications p on p.publication_id = g.publication_id join dois d on d.doi_id = g.doi_id
             order by 1, 2`
        );

    const {page, close} = await launch(app);
    await recordNotices(page);
    const settings = new DoiSettings(page, app.contextPath);
    const dois = new DoisPage(page, app.contextPath);

    /** "Setup": the prefix, the second kind as `second` says, "Save". */
    const setup = async (label, second) => {
        await settings.goto('Setup');
        if ((await settings.prefixBox().inputValue()) !== PREFIX) await settings.prefixBox().fill(PREFIX);
        if (second === true) await settings.kindBox(it.second).check();
        if (second === false) await settings.kindBox(it.second).uncheck();
        const r = await settings.pressSave(settings.setup);
        await expect(settings.savedStatus(settings.setup)).toBeVisible({timeout: T});
        fact(`${label} save`, {status: r.status(), kinds: await settings.kinds()});
        record(name(`${label}-setup`), await screen(page));
    };

    /** "DOIs": tick `id`, "Assign DOIs", confirm. */
    const assign = async (label, id) => {
        await dois.goto();
        const response = await dois.runBulk('Assign DOIs', [id]);
        await page.waitForTimeout(500);
        fact(`${label} assign`, {status: response.status(), notices: await page.evaluate(() => [.../** @type {any} */ (window).__doiNotices || []])});
    };

    /** Expand a row and read its DOI table: [{type, doi}]. */
    const readRow = async (label, id) => {
        const row = dois.row(id);
        await dois.expand(row, id);
        const out = [];
        for (const type of await dois.doiTypes(row)) out.push({type, doi: await dois.doiBox(row, type).inputValue()});
        fact(`${label} row ${id}`, out);
        record(name(`${label}-row-${id}`), await screen(page));
        await dois.collapse(row, id);
        return out;
    };

    /** The list's "Search": type `phrase`, Enter; the list request's answer and the list shown. */
    const search = async (label, phrase) => {
        if (await dois.clearSearchButton().isVisible().catch(() => false)) await dois.clearSearch();
        await dois.searchBox().fill(phrase);
        const fetched = page.waitForResponse((r) => isListFetch(r) && new URL(r.url()).searchParams.get('searchPhrase') === phrase, {timeout: T});
        await dois.searchBox().press('Enter');
        const response = await fetched;
        const status = response.status();
        let body = null;
        try {
            body = await response.json();
        } catch {
            body = {raw: (await response.text().catch(() => '')).slice(0, 600)};
        }
        if (status === 200) await dois.expectListSettled();
        else await page.waitForTimeout(1500);
        const ids = await dois.rows().evaluateAll((rows) => rows.map((r) => r.id.replace('list-item-submission-', '')));
        const empty = (await dois.emptyLine().count()) ? (await dois.emptyLine().innerText()).trim() : null;
        const out = {
            phrase,
            status,
            itemsMax: body && body.itemsMax,
            apiIds: body && Array.isArray(body.items) ? body.items.map((i) => i.id) : body,
            listIds: ids,
            names: await dois.rowNames(),
            empty,
        };
        fact(`${label} search`, out);
        record(name(`${label}-search`), await screen(page));
        await shot(page, name(`${label}-search`)).catch(() => {});
        return out;
    };

    try {
        await signIn(page, 'dbarnes');
        // 2-5: the work's own kind only
        await setup('2', undefined);
        await assign('3', it.a);
        fact('3 stored', stored());
        const rowA = await readRow('4', it.a);
        const dA = rowA[0] && rowA[0].doi;
        await search('5', dA);
        // 6-10: the second kind ticked too
        await setup('6', true);
        await assign('7', it.b);
        fact('7 stored', stored());
        const rowB = await readRow('8', it.b);
        const gB = rowB.length > 1 ? rowB[rowB.length - 1].doi : null;
        fact('8 G_B', gB);
        await search('9', gB);
        await search('10', `${PREFIX}/`);

        if (NEIGHBOUR) {
            await search('n1', it.titleWord);
            await search('n2', '10.9999/');
            await setup('n3', false);
            await dois.goto();
            await search('n3', gB);
            // n4: the editorial dashboard's "Search submissions"
            const {EditorialDashboardPage} = require('../../../pages/EditorialDashboardPage.js');
            const dash = new EditorialDashboardPage(page, app.contextPath);
            await dash.goto();
            const fetched = page.waitForResponse((r) => /\/api\/v1\/_submissions\?/.test(r.url()) && new URL(r.url()).searchParams.get('searchPhrase') === dA, {timeout: T});
            await dash.globalSearch(dA);
            const response = await fetched;
            const body = await response.json().catch(() => null);
            await page.waitForTimeout(800);
            const s = await screen(page);
            fact('n4 dashboard search', {
                phrase: dA,
                status: response.status(),
                itemsMax: body && body.itemsMax,
                apiIds: body && Array.isArray(body.items) ? body.items.map((i) => i.id) : null,
                heading: (await page.locator('main h1, #app-main h1').first().innerText().catch(() => '')).trim(),
            });
            record(name('n4-dashboard'), s);
            await shot(page, name('n4-dashboard')).catch(() => {});
        }
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
