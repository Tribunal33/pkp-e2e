// U54 A11 walk (issue report docs/issues/U54-A11-own-role-ok-removes-settings-access.md).
// On PKP's default test dataset:
//   P. (OPS only) the preconditions: rvaca creates "u54c manager" at the "Manager" level with
//      "Permit changes to Settings" ticked and invites dbuskins to it; dbuskins accepts from the email.
//   A. the steps: the role's only holder (OJS, OMP dbarnes on "Journal editor" / "Press editor";
//      OPS dbuskins on "u54c manager") opens Settings > Users & Roles > "Roles", the role's "Edit",
//      reads "Permit changes to Settings", presses "OK" with nothing changed, and reloads
//      Settings > Users & Roles; rvaca opens the role's "Edit" and reads the box. Around the "OK"
//      the walk records the browser dialogs and the Roles list's redraw answers.
//   N. the neighbour checks: N1 rvaca unticks the open box on "Production editor" (OPS: on
//      "u54c manager" when ticked) and presses "OK" (stored unticked, with the fix and without);
//      N2 the way round, only when the steps unticked the role: rvaca ticks it back, and the
//      holder opens Settings > Users & Roles again.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/own-role-ok-removes-settings-access/walk.js
const {forEachApp, launch, signIn, signOut, record, screen, idle} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', role: c.role, user: c.user};
    const {page, close} = await launch(app);
    try {
        // P. a role created at the manager level, and its only holder (OPS)
        if (c.create) {
            const {inviteAndAccept} = require('../subscription-manager-offered-institutions-refused/lib.js');
            await signIn(page, 'rvaca');
            facts.create = await H.createRole(page, app, {name: c.role, abbrev: c.abbrev, level: c.level});
            facts.invite = await inviteAndAccept(page, app, {email: c.email, roleName: c.role});
        }
        facts.storedBefore = H.stored(app, c.role);

        // A. the steps
        await signIn(page, c.user);
        facts.pageBefore = await H.usersAndRoles(page, app);
        let tab = await H.rolesTab(page, app);
        record('01-roles', await screen(page));
        let win = await tab.openEdit(c.role);
        facts.box = await H.boxState(win);
        record('02-edit-window', await screen(page));
        const seen = H.watch(page);
        const redraw = page.waitForResponse((r) => /user-group-grid\/fetch-grid/.test(r.url()), {timeout: 15_000}).catch(() => null);
        facts.save = await H.saveWindow(page, win);
        await redraw; // the list's redraw after the save, and what its answer raises
        await idle(page);
        facts.notices = (await screen(page)).notices;
        seen.stop();
        facts.afterSave = {dialogs: seen.dialogs, grids: seen.grids};
        facts.storedAfter = H.stored(app, c.role);
        facts.pageAfter = await H.usersAndRoles(page, app);
        record('03-users-and-roles-after', await screen(page));
        await signOut(page);

        await signIn(page, 'rvaca');
        tab = await H.rolesTab(page, app);
        win = await tab.openEdit(c.role);
        facts.boxForManager = await H.boxState(win);
        record('04-manager-edit-window', await screen(page));
        await win.cancel();

        // N1. a box the window leaves open still unticks
        const n = {};
        const target = c.neighbour || c.role;
        n.n1Role = target;
        n.n1StoredBefore = H.stored(app, target);
        win = await tab.openEdit(target);
        n.n1Box = await H.boxState(win);
        if (n.n1Box.checked) await win.optionBox(H.BOX).uncheck();
        n.n1Save = await H.saveWindow(page, win);
        n.n1StoredAfter = H.stored(app, target);

        // N2. the way round, when the steps took the box away
        if (H.stored(app, c.role) === '0' && target !== c.role) {
            win = await tab.openEdit(c.role);
            await win.optionBox(H.BOX).check();
            n.n2Save = await H.saveWindow(page, win);
            n.n2Stored = H.stored(app, c.role);
            await signOut(page);
            await signIn(page, c.user);
            n.n2Page = await H.usersAndRoles(page, app);
        }
        facts.neighbour = n;
        record('05-neighbour', await screen(page));
        await signOut(page);
    } finally {
        record('facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
