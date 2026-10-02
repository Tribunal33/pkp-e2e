// U54 OPS1 neighbour check (issue report docs/issues/U54-OPS1-ops-open-access-sign-in-box-not-kept.md):
// the rest of the "Site Access Options" tab is untouched by the fix. On PKP's default test dataset,
// dbarnes opens Settings > Users & Roles > "Site Access Options" and reads the groups it offers;
// under "User Registration" chooses "The … Manager will register all user accounts…", "Save",
// reloads and reads the choice; then chooses "Visitors can register a user account with the …",
// "Save", reloads and reads it again. Walked with the fix in and out.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/ops-open-access-sign-in-box-not-kept/neighbour.js
const {forEachApp, launch, signIn, record, screen} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    const closed = (tab) => tab.panel.getByRole('radio', {name: /will register all user accounts/});
    const open = (tab) => tab.panel.getByRole('radio', {name: /^Visitors can register a user account/});
    try {
        await signIn(page, 'dbarnes');
        let tab = await H.accessTab(page, app);
        facts.groups = await H.groups(tab);
        facts.box = await H.boxState(tab, app);
        record('n-01-tab', await screen(page));

        await closed(tab).check();
        let r = await tab.save();
        facts.closeSave = {status: r.status()};
        await tab.reload();
        facts.closeKept = {closed: await closed(tab).isChecked(), open: await open(tab).isChecked(), stored: H.stored(app, 'disableUserReg')};
        record('n-02-closed-reloaded', await screen(page));

        await open(tab).check();
        r = await tab.save();
        facts.openSave = {status: r.status()};
        await tab.reload();
        facts.openKept = {closed: await closed(tab).isChecked(), open: await open(tab).isChecked(), stored: H.stored(app, 'disableUserReg')};
        record('n-03-open-reloaded', await screen(page));
    } finally {
        record('n-facts', facts);
        await close();
    }
});
