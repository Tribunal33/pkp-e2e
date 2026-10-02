// Helpers of walk.js and neighbour.js here (issue report
// docs/issues/U54-A13-roles-list-order-moves-and-pages-repeat.md). Requiring this file runs
// nothing. Every helper drives Settings > Users & Roles > "Roles" as a person does, through the
// U54 page objects (shared/playwright/pages/RolesConfigurationPages.js).

/** Per app, on PKP's default test dataset: the stage columns and the roles the steps save. */
const CASES = {
    ojs: {stages: ['Submission', 'Review', 'Copyediting', 'Production'], saved: 'Copyeditor', other: 'Production editor', otherManager: 'admin'},
    omp: {stages: ['Submission', 'Internal Review', 'External Review', 'Copyediting', 'Production'], saved: 'Copyeditor', other: 'Production editor', otherManager: 'admin'},
    ops: {stages: ['Production'], saved: 'Author', other: null, otherManager: null},
};

const MASTHEAD = 'Consider role in masthead list';

/** The Roles tab page object for this app (required inside forEachApp's fn). */
function rolesTab(page, app) {
    const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
    return new RolesTab(page, app.contextPath, {stages: CASES[app.name].stages});
}

/** The visible rows' names, top to bottom, and the count line. */
async function listed(tab) {
    return {line: await tab.pagingLine(), names: await tab.rowNames()};
}

/**
 * A row's "Settings" > "Edit", a role option ticked (or unticked), "OK". Returns the option's
 * state before, the save's status and the list's names right after the window closed.
 */
async function saveOption(tab, role, label, checked = true) {
    const win = await tab.openEdit(role);
    const box = win.optionBox(label);
    const before = await box.isChecked();
    if (checked) {
        await box.check();
    } else {
        await box.uncheck();
    }
    const response = await win.save();
    return {role, option: label, before, after: checked, status: response.status(), listAfter: await listed(tab)};
}

/** "Create New Role": a level, a "Role Name" and an "Abbreviation", "OK". */
async function createRole(tab, {name, abbrev, level}) {
    const win = await tab.openCreate();
    await win.chooseLevel(level);
    await win.nameBox().fill(name);
    await win.abbrevBox().fill(abbrev);
    const response = await win.save();
    return {name, status: response.status(), listAfter: await listed(tab)};
}

/** Where `name` sits (1-based) in `names`, or null. */
function place(names, name) {
    const i = names.indexOf(name);
    return i < 0 ? null : i + 1;
}

/** The names two pages repeat, and the names of `all` neither page holds. */
function overlap(page1, page2, all) {
    return {
        repeated: page2.filter((n) => page1.includes(n)),
        missing: all.filter((n) => !page1.includes(n) && !page2.includes(n)),
    };
}

module.exports = {CASES, MASTHEAD, rolesTab, listed, saveOption, createRole, place, overlap};
