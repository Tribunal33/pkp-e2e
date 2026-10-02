// Neighbour check of docs/issues/U54-A9-roles-filter-lists-hide-after-choice.md (U54 A9), walked
// with the fix in and out: the fix keeps the filter lists shown across a redraw only when they
// were shown before it, so
//   A. with the lists closed, "Items per page:" "10" redraws the list and the lists stay hidden
//      (fix in and out alike);
//   B. with the lists open, "Items per page:" "25" redraws it (the same redraw as a choice) and the
//      lists stay shown with the fix, hide without it;
//   C. with the lists open, "Search" pressed after the redraw closes them (the link still toggles).
// A preprint server's list shows no "Items per page:" when it holds too few roles: A and B are
// then recorded as not reachable.
//
// Reset first:  npm run fleet-prep -- --feature issues-u54k --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u54k PROBE_AGENT=u54k node bin/probe.js all shared/playwright/checks/issues/roles-filter-lists-hide-after-choice/neighbour.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        const tab = H.rolesTab(page, app);
        await tab.goto();
        facts.landing = await H.filterState(tab);

        if (facts.landing.itemsPerPageShown) {
            // A. Lists closed, "Items per page:" "10".
            await tab.chooseItemsPerPage('10');
            await idle(page);
            facts.closedThenPaged = await H.filterState(tab);

            // B. Lists open, "Items per page:" "25".
            await tab.openFilters();
            await tab.chooseItemsPerPage('25');
            await idle(page);
            facts.openThenPaged = await H.filterState(tab);
            record('01-open-then-paged', await screen(page));
        } else {
            facts.paging = 'no "Items per page:" on this list';
            await tab.openFilters();
        }

        // C. "Search" after a choice closes the lists (open them first when hidden).
        await tab.chooseFilter('level', 'Author');
        await idle(page);
        facts.afterChoice = await H.filterState(tab);
        if (!facts.afterChoice.listsShown) {
            await tab.searchLink.click();
            await idle(page);
        }
        await tab.searchLink.click();
        await idle(page);
        facts.searchClosesAgain = await H.filterState(tab);
        record('neighbour', facts);
    } catch (error) {
        facts.error = String(error.stack || error).slice(0, 1500);
        record('neighbour', facts);
        throw error;
    } finally {
        await close();
    }
});
