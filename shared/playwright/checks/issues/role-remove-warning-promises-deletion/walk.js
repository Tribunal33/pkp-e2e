// Issue report docs/issues/U54-A4-role-remove-warning-promises-deletion.md (U54 A4): the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"), as the dataset's manager `rvaca`, on its own
// context `publicknowledge`. The kit builds nothing; the one role the steps need is made with
// "Create New Role".
//   1-3. "Remove" on a role the dataset's users hold ("Copyeditor"; OPS "Moderator"): the
//        "Confirm" window's text and buttons, then "OK".
//   4.   "Remove" › "OK" on a role the journal was created with that nobody holds ("Production
//        editor"; OPS "Editorial Board Member").
//   5-6. "Create New Role" "u54i Spare desk", then its "Remove" › "OK".
//   7.   A reload: which of the three roles are still listed.
// With the fix applied the same walk checks that it reaches no further than it should: the rows
// of the roles the journal was created with offer "Edit" and no "Remove", and the new role's
// "Remove" shows the new words and still removes it. ended.js holds the steps of a role whose
// only member has left it (OJS).
//
// Reset first:  npm run fleet-prep -- --feature issues-u54i --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u54i PROBE_AGENT=u54i node bin/probe.js all shared/playwright/checks/issues/role-remove-warning-promises-deletion/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u54i-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u54i-3_5 PROBE_AGENT=u54i node bin/probe.js all shared/playwright/checks/issues/role-remove-warning-promises-deletion/walk.js
// Facts: .reports/<feature>/u54i/walk[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const {rolesTab} = require('../roles-list-first-row-no-edit-stale-rows/lib.js');
const {removeRole} = require('./lib.js');

/** Per app: a role the dataset's users hold, and a role the journal was created with that nobody holds. */
const ROLES = {
    ojs: {held: 'Copyeditor', unheldDefault: 'Production editor'},
    omp: {held: 'Copyeditor', unheldDefault: 'Production editor'},
    ops: {held: 'Moderator', unheldDefault: 'Editorial Board Member'},
};
const NEW_ROLE = {name: 'u54i Spare desk', abbrev: 'U54I', level: 'Assistant'};

forEachApp(async (app) => {
    const r = ROLES[app.name];
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        // 1. Settings › Users & Roles › "Roles".
        await signIn(page, 'rvaca');
        const tab = rolesTab(page, app);
        await tab.goto();
        await screen(page); // drop the sign-in's notices

        // 2-3. A role its users hold.
        facts.held = await removeRole(page, tab, r.held, '01-held');

        // 4. A role the journal was created with, held by nobody.
        facts.unheldDefault = await removeRole(page, tab, r.unheldDefault, '02-unheld-default');

        // 5-6. A role made here, held by nobody.
        const win = await tab.openCreate();
        await win.chooseLevel(NEW_ROLE.level);
        await win.nameBox().fill(NEW_ROLE.name);
        await win.abbrevBox().fill(NEW_ROLE.abbrev);
        facts.create = {status: (await win.save()).status()};
        await idle(page);
        await screen(page);
        facts.created = await removeRole(page, tab, NEW_ROLE.name, '03-created');

        // 7. A reload.
        await tab.reload();
        facts.afterReload = {
            [r.held]: await tab.row(r.held).count(),
            [r.unheldDefault]: await tab.row(r.unheldDefault).count(),
            [NEW_ROLE.name]: await tab.row(NEW_ROLE.name).count(),
        };
        record('04-after-reload', await screen(page));
        record('walk', facts);
    } catch (error) {
        facts.error = String(error.stack || error).slice(0, 1500);
        record('walk', facts);
        throw error;
    } finally {
        await close();
    }
});
