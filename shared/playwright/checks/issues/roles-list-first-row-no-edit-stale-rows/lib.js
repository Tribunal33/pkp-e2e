// Helpers of walk.js and neighbour.js here (issue report
// docs/issues/U54-A1-A5-roles-list-first-row-no-edit-stale-rows.md). Requiring this file runs
// nothing. Every helper drives Settings > Users & Roles > "Roles" as a person does, through the
// U54 page objects (shared/playwright/pages/RolesConfigurationPages.js).
const {idle, screen} = require('../../../probe');

/**
 * Per app, on PKP's default test dataset (docs/process/dataset.md): the stage columns, the row
 * whose "Settings" arrow step 2 presses, and the row and stage whose box steps 6 to 9 press.
 */
const CASES = {
    ojs: {stages: ['Submission', 'Review', 'Copyediting', 'Production'], second: 'Journal editor', boxRole: 'Copyeditor', boxStage: 'Production', manager: 'Journal manager'},
    omp: {stages: ['Submission', 'Internal Review', 'External Review', 'Copyediting', 'Production'], second: 'Press editor', boxRole: 'Copyeditor', boxStage: 'Production', manager: 'Press manager'},
    ops: {stages: ['Production'], second: null, boxRole: 'Editorial Board Member', boxStage: 'Production', manager: 'Preprint Server manager'},
};

const NEW_ROLE = {name: 'u54a Spare desk', abbrev: 'U54A', level: 'Assistant'};

/** The Roles tab page object for this app (required inside forEachApp's fn). */
function rolesTab(page, app) {
    const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
    return new RolesTab(page, app.contextPath, {stages: CASES[app.name].stages});
}

/** The visible rows, top to bottom: name, DOM row id and whether the row has a "Settings" arrow. */
async function arrows(tab) {
    return tab.rows().evaluateAll((rows) =>
        rows.map((r) => ({
            name: (r.querySelector('[id$="-name"] .label')?.textContent || '').replace(/\s+/g, ' ').trim(),
            rowId: r.id.replace(/^.*-row-/, ''),
            arrow: !!r.querySelector('a.show_extras, a.hide_extras'),
        }))
    );
}

/** The count line, the visible rows with their arrows, and the "Items per page:" box. */
async function listState(tab) {
    return {
        pagingLine: await tab.pagingLine(),
        itemsPerPageShown: await tab.itemsPerPage.isVisible(),
        rows: await arrows(tab),
    };
}

/**
 * Press a row's stage box, unless it is greyed out. Returns the answer's status, the notices that
 * showed and the box's look afterwards, on the same page without a reload.
 */
async function pressBox(page, tab, role, stage) {
    const box = tab.stageBox(role, stage);
    const before = {checked: await box.isChecked(), disabled: await box.isDisabled()};
    if (before.disabled) {
        return {before, pressed: false};
    }
    const response = await tab.pressStageBox(role, stage);
    await idle(page);
    const after = {checked: await box.isChecked(), disabled: await box.isDisabled()};
    const shown = await screen(page);
    return {
        before,
        pressed: true,
        request: response.url().replace(/^https?:\/\/[^/]+/, '').replace(/csrfToken=[^&]+/, 'csrfToken=…'),
        status: response.status(),
        notices: shown.notices,
        after,
    };
}

module.exports = {CASES, NEW_ROLE, rolesTab, arrows, listState, pressBox};
