// Helpers of walk.js and neighbour.js (issue report
// docs/issues/U21-A21-submit-as-role-order-not-fixed.md). Requiring this file runs nothing.
// Every helper drives the screens a person uses; the start page's helpers are A14's, the Roles
// tab's U54 A13's.
const {sql} = require('../../../probe');
const H = require('../section-editor-submit-as-refused/lib.js');
const R = require('../roles-list-order-moves-and-pages-repeat/lib.js');

/** The editorial role `dbarnes` holds in the dataset, per app. */
const EDITOR_ROLE = {ojs: 'Journal editor', omp: 'Press editor', ops: 'Preprint Server manager'};

/**
 * Who changes that role on Settings > Users & Roles > "Roles": the Journal (Press) manager, and on
 * a preprint server the Site Administrator, since "Preprint Server manager" is `rvaca`'s own role
 * and "OK" in it takes his Settings access away (U54 A11).
 */
const ROLE_EDITOR = {ojs: 'rvaca', omp: 'rvaca', ops: 'admin'};

/** As `dbarnes`: open "Make a Submission" and read "Submit As" (order, selected). */
async function readStart(page, app) {
    await H.openStart(page, app);
    return H.readSubmitAs(page);
}

/**
 * As a manager on Settings > Users & Roles > "Roles": the role's "Edit", "Consider role in
 * masthead list" set to `checked` (null: changed from what it shows), "OK". The state the screen gives is recorded, never thrown:
 * a row without its "Settings" arrow comes back as {blocked}.
 */
async function setMasthead(page, app, role, checked) {
    const tab = R.rolesTab(page, app);
    await tab.goto();
    const before = await R.listed(tab).catch(() => null);
    try {
        if (checked === null) {
            const win = await tab.openEdit(role);
            checked = !(await win.optionBox(R.MASTHEAD).isChecked());
            await win.cancel();
        }
        const out = await R.saveOption(tab, role, R.MASTHEAD, checked);
        return {before: before && before.names, ...out, listAfter: out.listAfter && out.listAfter.names};
    } catch (e) {
        return {before: before && before.names, blocked: String(e && e.message || e).split('\n')[0].slice(0, 300)};
    }
}

/** Evidence only: the storage position (ctid) of the context's role rows, in the order PostgreSQL reads them. */
function storageOrder(app) {
    try {
        return sql(app, "select ug.user_group_id || ':' || coalesce(s.setting_value, '') || ':' || ug.ctid::text from user_groups ug left join user_group_settings s on s.user_group_id = ug.user_group_id and s.setting_name = 'name' and s.locale = 'en' where ug.context_id = 1").split('\n');
    } catch (e) {
        return String(e.message || e).slice(0, 200);
    }
}

module.exports = {H, R, EDITOR_ROLE, ROLE_EDITOR, readStart, setMasthead, storageOrder};
