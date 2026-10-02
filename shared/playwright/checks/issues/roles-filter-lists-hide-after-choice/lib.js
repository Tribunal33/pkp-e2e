// Helpers of walk.js and neighbour.js here (issue report
// docs/issues/U54-A9-roles-filter-lists-hide-after-choice.md). Requiring this file runs nothing.
// Every helper drives Settings > Users & Roles > "Roles" as a person does, through the U54 page
// objects (shared/playwright/pages/RolesConfigurationPages.js).

/** Per app: the stage columns of the roles list (PKP's default test dataset). */
const STAGES = {
    ojs: ['Submission', 'Review', 'Copyediting', 'Production'],
    omp: ['Submission', 'Internal Review', 'External Review', 'Copyediting', 'Production'],
    ops: ['Production'],
};

/** The Roles tab page object for this app (required inside forEachApp's fn). */
function rolesTab(page, app) {
    const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
    return new RolesTab(page, app.contextPath, {stages: STAGES[app.name]});
}

/**
 * What the manager sees of the list's filter: whether the two lists show, the entry each holds,
 * whether "Search" is marked open, the count line and the visible rows' names.
 */
async function filterState(tab) {
    const chosen = async (select) =>
        (await select.count()) ? select.evaluate((s) => (s.selectedOptions[0] ? s.selectedOptions[0].textContent.trim() : null)) : null;
    return {
        listsShown: await tab.filterForm.isVisible(),
        stageChosen: await chosen(tab.stageFilter),
        levelChosen: await chosen(tab.levelFilter),
        searchMarkedOpen: await tab.searchLink.evaluate((a) => a.classList.contains('is_open')),
        pagingLine: await tab.pagingLine(),
        itemsPerPageShown: await tab.itemsPerPage.isVisible(),
        rows: await tab.rowNames(),
    };
}

/** Press the "Users" tab, then the "Roles" tab again. */
async function usersTabAndBack(page, tab) {
    await tab.usersTab.click();
    await page.getByRole('tabpanel').filter({visible: true}).first().waitFor();
    await tab.tab.click();
    await tab.rows().first().waitFor();
}

module.exports = {STAGES, rolesTab, filterState, usersTabAndBack};
