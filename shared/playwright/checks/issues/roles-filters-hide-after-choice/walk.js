// Issue report walk: docs/issues/U54-A9-roles-filters-hide-after-choice.md
// (spec U54 register A9). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// signed in as `rvaca` (the context's manager):
//   Level list: 1-2 Settings › Users & Roles › "Roles"; 3 "Search"; 4 "With
//     permission level set to" › "Assistant" (the filter form read as the
//     redraw answers and 1.5 s later); 5 "Site Access Options" and back to
//     "Roles"; 6 "Search".
//   Stage list: 7 reload, "Roles", "Search"; 8 "List roles assigned to" ›
//     "Production".
// It also reads, in the page, the jQuery version and whether a ready handler
// added after the page loaded runs at once (the Cause).
// Neighbour (what a fix must leave alone, and the reach it covers on purpose),
// after step 8: the second row's "Settings" arrow still opens "Edit" and
// "Remove" after the redraw; "Search" still folds the open filters away and
// shows them again; with the filters folded away, "Items per page" 10 (where
// shown) redraws the list and leaves them folded away; and Settings ›
// Website › Plugins: the "Installed Plugins" filter, a category chosen and
// its "Search" pressed (the same shared grid code). The kit builds nothing.
//
// Run (main, then stable-3_5_0); reset the fleet first:
//   npm run fleet-prep -- --feature issues-w54 --dataset 2 --reset
//   PROBE_FEATURE=issues-w54 PROBE_AGENT=w54 node bin/probe.js all shared/playwright/checks/issues/roles-filters-hide-after-choice/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w54-3_5 --dataset 2 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w54-3_5 PROBE_AGENT=w54 node bin/probe.js all shared/playwright/checks/issues/roles-filters-hide-after-choice/walk.js
// With the fix applied (node bin/try-fix.js apply …/fix.diff ojs omp ops), run with PROBE_RUN=fix.
// Facts: .reports/<feature>/w54/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const isFetchGrid = (r) => r.url().includes('user-group-grid/fetch-grid');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const {RolesTab, SiteAccessTab, settleRoles} = require('../../../pages/RolesConfigurationPages.js');
    const {WebsitePluginsPage} = require('../../../pages/PluginsPages.js');
    const facts = {line: app.line || 'main', baseURL: app.baseURL};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => {
        const s = await screen(page);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`);
        return s;
    };
    const roles = new RolesTab(page, app.contextPath, {stages: []});
    const chosen = (select) => select.evaluate((s) => s.options[s.selectedIndex]?.text.trim()).catch(() => null);
    // What the manager sees of the filters, and the list under them.
    const state = async () => ({
        filtersShown: await roles.filterForm.isVisible(),
        searchLinkOpen: await roles.searchLink.evaluate((a) => a.classList.contains('is_open')).catch(() => null),
        stageChosen: await chosen(roles.stageFilter),
        levelChosen: await chosen(roles.levelFilter),
        line: await roles.pagingLine(),
        rows: await roles.rowNames(),
    });
    // Choose a filter entry the way a person does (the form must be open);
    // read the filters as the redraw answers and 1.5 s later.
    const choose = async (select, label) => {
        const answer = page.waitForResponse(isFetchGrid, {timeout: 30_000});
        await select.selectOption({label});
        const r = await answer;
        await page.waitForFunction(() => !window.jQuery || window.jQuery.active === 0, null, {timeout: 30_000});
        const atAnswer = {status: r.status(), filtersShown: await roles.filterForm.isVisible()};
        await pause(1500);
        await settleRoles(page);
        return {atAnswer, after: await state()};
    };
    try {
        // 1-2
        await signIn(page, 'rvaca');
        await roles.goto();
        fact('02-landing', await state());
        await snap('roles-landing');

        // 3
        await roles.searchLink.click();
        await pause(300);
        fact('03-after Search', {...(await state()),
            stageOptions: await roles.filterOptions('stage'), levelOptions: await roles.filterOptions('level')});
        await snap('filters-shown');

        // The Cause: jQuery's version, and whether a ready handler added after
        // the page has loaded runs at once or later.
        fact('cause-jquery', await page.evaluate(() => {
            let ran = false;
            window.jQuery(function () { ran = true; });
            return {version: window.jQuery.fn.jquery, readyHandlerRanAtOnce: ran};
        }));

        // 4
        fact('04-level Assistant', await choose(roles.levelFilter, 'Assistant'));
        await snap('level-assistant');

        // 5
        await new SiteAccessTab(page, app.contextPath).openTab();
        await roles.openTab();
        await pause(500);
        fact('05-after Site Access Options and back', await state());
        await snap('after-tab-switch');

        // 6
        await roles.searchLink.click();
        await pause(300);
        fact('06-after Search', await state());
        await snap('search-again');

        // 7-8
        await roles.reload();
        await roles.searchLink.click();
        await pause(300);
        const production = (await roles.filterOptions('stage')).find((o) => /Production/.test(o));
        fact('08-stage Production', await choose(roles.stageFilter, production));
        await snap('stage-production');

        // Neighbour 1: a row's arrow still opens its actions after the redraw.
        const rowsNow = await roles.rowNames();
        if (rowsNow.length > 1) {
            fact('N1-second row actions', {row: rowsNow[1], actions: await roles.rowActionLabels(rowsNow[1]).catch((e) => `error: ${e.message.split('\n')[0]}`)});
        }
        // Neighbour 2: "Search" still folds the filters away and shows them.
        const toggles = [];
        for (let i = 0; i < 2; i++) {
            await roles.searchLink.click();
            await pause(300);
            toggles.push(await roles.filterForm.isVisible());
        }
        fact('N2-Search pressed twice', toggles);
        // Neighbour 3: a redraw with the filters folded away leaves them so.
        await roles.reload();
        if (await roles.itemsPerPage.isVisible()) {
            await roles.chooseItemsPerPage('10');
            await pause(1500);
            fact('N3-items per page 10, filters folded', await state());
        } else {
            fact('N3-items per page', 'no "Items per page:" on this list');
        }
        // Neighbour 4 (reach): Website › Plugins › "Installed Plugins".
        const plugins = new WebsitePluginsPage(page, app.contextPath);
        await plugins.goto();
        const list = plugins.list;
        await list.openFilter();
        const cats = (await list.categorySelect.locator('option').allInnerTexts()).map((s) => s.trim());
        const cat = cats.find((c) => /Generic/.test(c)) || cats[1];
        await list.categorySelect.selectOption({label: cat});
        const fetched = page.waitForResponse((r) => /-plugin-grid\/fetch-grid/.test(r.url()), {timeout: 30_000});
        await list.filterButton.click();
        const fr = await fetched;
        await pause(1500);
        fact('N4-plugins filter after Search', {category: cat, status: fr.status(), filtersShown: await list.filterForm.isVisible(),
            categoryChosen: await chosen(list.categorySelect)});
        await snap('plugins-after-search');
    } finally {
        record('facts', facts);
        await close();
    }
});
