// Issue report docs/issues/U54-A9-roles-filter-lists-hide-after-choice.md (U54 A9): the report's
// Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), as the dataset's manager `rvaca`, on its own context
// `publicknowledge`. The kit builds nothing and the steps create nothing.
//   1-2. Settings > Users & Roles, "Roles".
//   3.   "Search": the two filter lists show.
//   4.   "With permission level set to" "Author": the list redraws; are the two filter lists still shown?
//   (between 4 and 5, not a report step) "Users" tab and back to "Roles": still folded?
//   5.   "Search" again: the entry still chosen.
// Besides the screens it reads each request's answer and the console (the run record).
//
// Reset first:  npm run fleet-prep -- --feature issues-u54k --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u54k PROBE_AGENT=u54k node bin/probe.js all shared/playwright/checks/issues/roles-filter-lists-hide-after-choice/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u54k-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u54k-3_5 PROBE_AGENT=u54k node bin/probe.js all shared/playwright/checks/issues/roles-filter-lists-hide-after-choice/walk.js
// Facts: .reports/<feature>/u54k/walk[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        const tab = H.rolesTab(page, app);

        // 1-2. The "Roles" tab.
        await tab.goto();
        facts.landing = await H.filterState(tab);

        // 3. "Search".
        await tab.openFilters();
        facts.searchPressed = await H.filterState(tab);
        facts.levelOptions = await tab.filterOptions('level');
        record('01-search-open', await screen(page));
        await shot(page, '01-search-open');

        // 4. "With permission level set to" "Author".
        const answer = await tab.chooseFilter('level', 'Author');
        facts.filterAnswer = {status: answer.status()};
        await idle(page);
        facts.afterChoice = await H.filterState(tab);
        record('02-after-choice', await screen(page));
        await shot(page, '02-after-choice');

        // Between steps 4 and 5: "Users" tab and back.
        await H.usersTabAndBack(page, tab);
        await idle(page);
        facts.afterTabSwitch = await H.filterState(tab);
        record('03-after-tab-switch', await screen(page));
        await shot(page, '03-after-tab-switch');

        // 5. "Search" again.
        await tab.searchLink.click();
        await idle(page);
        facts.searchAgain = await H.filterState(tab);
        record('04-search-again', await screen(page));
        await shot(page, '04-search-again');

        record('walk', facts);
    } catch (error) {
        facts.error = String(error.stack || error).slice(0, 1500);
        record('walk', facts);
        throw error;
    } finally {
        await close();
    }
});
