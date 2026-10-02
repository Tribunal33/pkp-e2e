// U53 A13 + A17 walk (issue report docs/issues/U53-A13-A17-users-grid-roles-admin-empty-ended-listed.md).
// On PKP's default test dataset, as admin:
//   steps (default): the Settings wizard's "Users" grid reads admin's "Roles"; the Users & Roles list
//     reads it (control); the "Merge user" window (from Ramiro Vaca's row) reads it; then "Edit User"
//     on Julie Janssen (OPS: Minoti Inoue) unticks "Reviewer" ("Internal Reviewer", "Moderator") and
//     ticks "Reader", and the refreshed row is read at once, with the save's and the refresh's server
//     times; a reload a second later reads the row again.
//   redrive: that edit alone (OJS, main: the first walk had edited Carlo Corino, unticking "Author"
//     only, and its refresh fell a second after the save; the register footnote's shape, driven once).
//   nb: the neighbour check of the fix: the grid's "Roles" of rows the fix must leave alone (rvaca,
//     dbarnes, an author, a reviewer), and admin's on the Users & Roles list.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/users-grid-roles-admin-empty-ended-listed/walk.js [nb]
const {forEachApp, launch, signIn, signOut, record, screen, idle} = require('../../../probe');
const H = require('./lib.js');

const mode = process.argv[2] || 'steps';

async function steps(app, page, c, facts) {
    // 1-5. the wizard's grid, admin's row
    let {grid} = await H.openWizardUsers(page, app);
    facts.gridAdmin = await H.searchGrid(grid, 'admin');
    record('01-wizard-grid-admin', await screen(page));

    // 6. control: Settings > Users & Roles
    const control = await H.usersListRow(page, app, 'pkpadmin@mailinator.com');
    facts.usersListAdmin = control.cells;
    record('02-users-and-roles', await screen(page));

    // 7. "Merge user" from Ramiro Vaca's row: admin's row
    const merge = await H.openMergeWindow(page, control.list, control.list.row('rvaca@mailinator.com').first());
    facts.mergeAdmin = await H.searchGrid(merge.grid, 'admin');
    record('03-merge-window-admin', await screen(page));
    await H.closeMergeWindow(page, merge);

    // 8-11. the wizard again; "Edit User" on the moved user: one role unticked, "Reader" ticked, "OK";
    // the refreshed row read at once, with the save's and the refresh's server times and the stored dates
    ({grid} = await H.openWizardUsers(page, app));
    await editAndRead(app, page, grid, c.moved, facts, '');

    // 12. a reload, after a second has passed
    await page.waitForTimeout(1500);
    ({grid} = await H.openWizardUsers(page, app));
    facts.afterReload = await H.searchGrid(grid, c.moved.username);
    record('06-after-reload', await screen(page));
}

/** Search the user, "Edit User", untick m.from, tick m.to, "OK"; the refreshed row read at once. */
async function editAndRead(app, page, grid, m, facts, p) {
    facts[`${p}before`] = await H.searchGrid(grid, m.username);
    facts[`${p}storedBefore`] = H.storedRoles(app, m.username);
    const win = await H.openEditUser(page, grid, m.username);
    facts[`${p}editTicked`] = await H.tickedRoles(win);
    record(`${p || '04-'}edit-user`, await screen(page));
    await win.roleBox(m.from).uncheck();
    await win.roleBox(m.to).check();
    const times = [];
    const onResponse = (r) => {
        if (/update-user|fetch-row/.test(r.url())) {
            times.push({op: (r.url().match(/(update-user|fetch-row)/) || [])[1], status: r.status(), serverDate: r.headers()['date'], at: new Date().toISOString()});
        }
    };
    page.on('response', onResponse);
    const refreshed = page.waitForResponse((r) => /fetch-row/.test(r.url()), {timeout: 30_000}).catch(() => null);
    await win.okButton.click();
    await refreshed;
    await idle(page);
    facts[`${p}afterOk`] = await H.gridRowCells(grid, m.username);
    record(`${p || '05-'}after-ok`, await screen(page));
    page.off('response', onResponse);
    facts[`${p}requests`] = times;
    facts[`${p}storedAfter`] = H.storedRoles(app, m.username);
}

// The register footnote's own shape (f-a17), driven once when the steps did not show A17: one role
// ended and another ticked in the same "Edit User" save, the refreshed row read at once.
async function redrive(app, page, c, facts) {
    const {grid} = await H.openWizardUsers(page, app);
    await editAndRead(app, page, grid, c.moved, facts, 'rd');
}

async function neighbour(app, page, c, facts) {
    const {grid} = await H.openWizardUsers(page, app);
    facts.nb = {};
    for (const u of ['admin', 'rvaca', 'dbarnes', c.author, c.reviewer, c.edited.username].filter(Boolean)) {
        facts.nb[u] = await H.searchGrid(grid, u);
    }
    record('nb-grid', await screen(page));
    facts.nbUsersListAdmin = (await H.usersListRow(page, app, 'pkpadmin@mailinator.com')).cells;
}

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', mode, storedAdmin: H.storedRoles(app, 'admin')};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        if (mode === 'nb') {
            await neighbour(app, page, c, facts);
        } else if (mode === 'redrive') {
            await redrive(app, page, c, facts);
        } else {
            await steps(app, page, c, facts);
        }
        await signOut(page);
    } catch (e) {
        facts.error = String(e && e.stack || e).slice(0, 1500);
        record('error', await screen(page).catch(() => ({})));
        throw e;
    } finally {
        record(mode === 'steps' ? 'facts' : `${mode}-facts`, facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
