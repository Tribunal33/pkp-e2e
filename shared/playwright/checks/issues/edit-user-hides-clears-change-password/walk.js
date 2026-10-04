// Kept walk of issue report docs/issues/U01-A10-edit-user-hides-clears-change-password.md (U01 A10).
// On PKP's default test dataset, as `admin`, Administration › "Hosted …" › "Settings wizard" › "Users":
//   steps (default): "Edit User" on ccorino (OMP aclark), "Change Password" read, ticked, "OK";
//     reopened and read; "Cancel". "Edit User" on ckwantes (OMP afinkel), ticked, "OK"; reopened,
//     read, "OK" unchanged. Signed out: ccorino signs in (where it lands), then ckwantes in a fresh
//     browser (where it lands). Each box read and each stored flag is recorded.
//   nb: the neighbour of the fix: "Add User" opens with the box ticked (then "Cancel"); "Edit User" on
//     an unflagged account (cmontgomerie, OMP bbarnetson) opens unticked, "OK" unchanged, and its
//     sign-in lands as an ordinary one.
// No assertions: the script records, the reader judges.
//
// Reset first:  npm run fleet-prep -- --feature issues-u01f --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-u01f PROBE_AGENT=u01f node bin/probe.js all shared/playwright/checks/issues/edit-user-hides-clears-change-password/walk.js [nb]
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-u01f-3_5), PROBE_RUN=r35
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');
const L = require('./lib.js');

const mode = process.argv.slice(2).includes('nb') ? 'nb' : 'steps';

async function asAdmin(app, facts, fn) {
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        await fn(page);
        await signOut(page);
    } catch (e) {
        facts.adminError = String((e && e.stack) || e).slice(0, 1200);
        record('a10-error', await screen(page).catch(() => ({})));
    } finally {
        await close();
    }
}

async function landing(app, facts, key, username) {
    const {page, close} = await launch(app);
    try {
        facts[key] = await L.H.signInAt(page, app, username, `${username}${username}`);
        record(`a10-${key}`, await screen(page));
        await shot(page, `a10-${key}`);
    } catch (e) {
        facts[`${key}Error`] = String((e && e.message) || e).slice(0, 400);
    } finally {
        await close();
    }
}

async function steps(app, facts) {
    const {shown, cleared} = L.ACCOUNTS[app.name];
    facts.accounts = {shown, cleared};
    await asAdmin(app, facts, async (page) => {
        const grid = await L.openWizardUsers(page, app);
        // 3-4: the box on an unflagged account, ticked, "OK"
        let win = await L.openEditUser(page, grid, shown);
        facts.s3Opened = await L.changeBox(win);
        record('a10-03-edit-user', await screen(page));
        await shot(page, 'a10-03-edit-user');
        await win.mustChangePassword.check();
        facts.s4Ticked = await L.changeBox(win);
        await L.pressOk(page, win);
        facts.s4Stored = L.storedFlag(app, shown);
        // 5-6: reopened
        win = await L.openEditUser(page, grid, shown);
        facts.s5Reopened = await L.changeBox(win);
        record('a10-05-reopened', await screen(page));
        await shot(page, 'a10-05-reopened');
        await win.cancel();
        // 7: the second account flagged
        win = await L.openEditUser(page, grid, cleared);
        await win.mustChangePassword.check();
        await L.pressOk(page, win);
        facts.s7Stored = L.storedFlag(app, cleared);
        // 8: reopened, "OK" unchanged
        win = await L.openEditUser(page, grid, cleared);
        facts.s8Reopened = await L.changeBox(win);
        record('a10-08-reopened', await screen(page));
        await L.pressOk(page, win);
        facts.s8Stored = L.storedFlag(app, cleared);
    });
    // 9-10
    await landing(app, facts, 's9Shown', shown);
    await landing(app, facts, 's10Cleared', cleared);
}

async function neighbour(app, facts) {
    const {neighbour: who} = L.ACCOUNTS[app.name];
    facts.accounts = {neighbour: who};
    await asAdmin(app, facts, async (page) => {
        const grid = await L.openWizardUsers(page, app);
        let win = await L.openAddUser(page, grid);
        facts.nbAddUser = await L.changeBox(win);
        record('a10-nb-add-user', await screen(page));
        await win.cancel();
        win = await L.openEditUser(page, grid, who);
        facts.nbEditOpened = await L.changeBox(win);
        record('a10-nb-edit-user', await screen(page));
        await L.pressOk(page, win);
        facts.nbStored = L.storedFlag(app, who);
    });
    await landing(app, facts, 'nbLanding', who);
}

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode};
    try {
        await (mode === 'nb' ? neighbour(app, facts) : steps(app, facts));
    } finally {
        record(mode === 'nb' ? 'a10-nb-facts' : 'a10-facts', facts);
        console.log(JSON.stringify(facts, null, 1));
    }
});
