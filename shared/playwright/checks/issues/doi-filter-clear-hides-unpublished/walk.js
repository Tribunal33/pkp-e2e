// Issue report docs/issues/U45-A12-doi-filter-clear-hides-unpublished.md (U45
// A12): on the DOIs page, "Unregistered", then another "Registration" filter,
// then that filter's "Clear filter" leaves no filter chosen and a list of
// published works only. Takes the report's Steps through the screens on a
// dataset fleet freshly reset to PKP's default test dataset, as the dataset's
// `dbarnes` on `publicknowledge`. The kit builds nothing and nothing is saved.
//
// Steps (OJS, OMP, OPS):
//   1. sign in as dbarnes; side menu "DOIs"; count the list
//   2. "Filters" › "Registration": press "Unregistered"
//   3. press "Registered"
//   4. press "Clear filter: Registered"
//   5. reload the page
// Control: "Registered", then "Clear filter: Registered".
// Neighbours (what a fix must leave alone):
//   a. "Unregistered", then "Clear filter: Unregistered"
//   b. "DOI Assigned", "Registered", "Clear filter: Registered": "DOI Assigned" stays
//   c. (OMP, OPS) "Published"/"Posted", "Registered", "Clear filter: Registered":
//      the "Publication Status" filter stays
// Reach (OMP, OPS): "Unregistered", "Published"/"Posted", then its "Clear filter".
//
// Reset first:  npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir2 PROBE_AGENT=ir13 node bin/probe.js all shared/playwright/checks/issues/doi-filter-clear-hides-unpublished/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-ir2-3_5,
//               and PROBE_RUN=r35 in front of the run.
// PROBE_RUN=fix names the run with fix.diff applied.
// Facts: .reports/<feature>/ir13/filter-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');

const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {DoisPage, isListFetch} = require('../../../pages/DoisPages.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1600)}`);
    };

    const {page, close} = await launch(app);
    try {
        const dois = new DoisPage(page, app.contextPath);
        /** The query of the list's last fetch, as the page sent it. */
        let lastQuery = null;
        page.on('response', (r) => {
            if (isListFetch(r, 'submissions')) lastQuery = decodeURIComponent(r.url().split('?')[1] || '');
        });

        /** What the list and the "Filters" column show now. */
        const state = async (name) => {
            const s = await screen(page);
            record(`filter-${name}${run}`, s);
            await shot(page, `filter-${name}${run}`).catch(() => {});
            const sidebar = dois.panel().locator('.listPanel__sidebar');
            const rows = dois.rows();
            const n = await rows.count();
            const badges = {};
            for (let i = 0; i < n; i++) {
                const t = flat(await rows.nth(i).locator('.doiListItem__itemMetadata, .listPanel__itemSummary').first().innerText(), 2000);
                const b = /Unpublished/.test(t) ? 'unpublished' : 'published';
                badges[b] = (badges[b] || 0) + 1;
            }
            return {
                rows: n,
                emptyLine: (await dois.emptyLine().count()) ? flat(await dois.emptyLine().innerText()) : null,
                rowKinds: badges,
                chosen: (await sidebar.locator('.pkpFilter__label.-isActive').allInnerTexts()).map((t) => flat(t)),
                clearButtons: (await sidebar.locator('.pkpFilter__remove').allInnerTexts()).map((t) => flat(t)),
                query: lastQuery,
            };
        };
        const posted = app.name === 'ops' ? 'Posted' : 'Published';

        // Steps
        await signIn(page, 'dbarnes');
        await dois.goto();
        fact('1 the list as opened', await state('1-opened'));
        await dois.pressFilter('Unregistered');
        fact('2 Unregistered', await state('2-unregistered'));
        await dois.pressFilter('Registered');
        fact('3 Registered', await state('3-registered'));
        await dois.clearFilter('Registered');
        fact('4 Clear filter: Registered', await state('4-cleared'));
        await dois.goto();
        fact('5 reloaded', await state('5-reloaded'));

        // Control
        await dois.pressFilter('Registered');
        await dois.clearFilter('Registered');
        fact('control: Registered, cleared', await state('control'));

        // Neighbours
        await dois.goto();
        await dois.pressFilter('Unregistered');
        await dois.clearFilter('Unregistered');
        fact('neighbour a: Unregistered, cleared', await state('nb-a'));
        await dois.goto();
        await dois.pressFilter('DOI Assigned');
        await dois.pressFilter('Registered');
        await dois.clearFilter('Registered');
        fact('neighbour b: DOI Assigned, Registered, Registered cleared', await state('nb-b'));
        if (app.name !== 'ojs') {
            await dois.goto();
            await dois.pressFilter(posted);
            await dois.pressFilter('Registered');
            await dois.clearFilter('Registered');
            fact(`neighbour c: ${posted}, Registered, Registered cleared`, await state('nb-c'));

            // Reach
            await dois.goto();
            await dois.pressFilter('Unregistered');
            await dois.pressFilter(posted);
            fact(`reach: Unregistered, ${posted}`, await state('reach-1'));
            await dois.clearFilter(posted);
            fact(`reach: Unregistered, ${posted}, ${posted} cleared`, await state('reach-2'));
        }
    } finally {
        record(`filter-facts${run}`, facts);
        await close();
    }
});
