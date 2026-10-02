// U53 A16 walk (issue report docs/issues/U53-A16-add-user-notify-stays-greyed.md).
// On PKP's default test dataset, as admin, on the Settings wizard's "Users" tab:
//   steps (default): "Add User"; "Notify User" read; "Generate Password" ticked, then unticked, the
//     password boxes and "Notify User" read after each; the details typed; a click on "Notify User";
//     "OK"; "Reader" ticked on step 2, "Save"; the welcome email looked for.
//   nb: the neighbour check of the fix: "Generate Password" ticked still ticks and locks "Notify User",
//     ticked again after unticking locks it again, and a user created with it gets the welcome email.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/add-user-notify-stays-greyed/walk.js [nb]
const {forEachApp, launch, signIn, signOut, record, screen, idle} = require('../../../probe');
const G = require('../users-grid-roles-admin-empty-ended-listed/lib.js');

const mode = process.argv[2] || 'steps';

/** The state of the password boxes and of "Notify User". */
async function boxes(win) {
    const one = async (loc) => loc.evaluate((e) => ({checked: e.checked, disabled: e.disabled, disabledAttr: e.getAttribute('disabled'), value: e.type === 'password' ? e.value : undefined}));
    return {
        generatePassword: await one(win.generatePassword),
        password: await one(win.password),
        password2: await one(win.password2),
        sendNotify: await one(win.sendNotify),
    };
}

/** "Add User" above the grid; the window, open. */
async function openAddUser(page, grid) {
    const {UserDetailsWindow} = require('../../../pages/UsersManagementPages.js');
    await grid.addUserLink().click();
    const win = new UserDetailsWindow(page, 'Add User');
    await win.expectOpen();
    return win;
}

/** Steps 6-8: the details, a click on "Notify User", "OK", "Reader" on step 2, "Save"; the mailbox. */
async function createUser(app, page, win, u, {password}, facts, key) {
    await win.givenName.fill(u.given);
    await win.familyName.fill(u.family);
    await win.username.fill(u.username);
    await win.email.fill(u.email);
    if (password) {
        await win.password.fill(u.username);
        await win.password2.fill(u.username);
    }
    // a person's click on the box (force: Playwright would otherwise wait for an enabled box)
    await win.sendNotify.click({force: true, timeout: 5_000}).catch((e) => (facts[`${key}ClickError`] = String(e).slice(0, 200)));
    facts[`${key}BeforeOk`] = await boxes(win);
    record(`notify-${key}-filled`, await screen(page));
    const since = new Date();
    await win.pressOk();
    await win.expectStep2(`${u.given} ${u.family}`);
    await win.roleBox('Reader').check();
    await win.pressSave();
    await win.expectClosed();
    await idle(page);
    record(`notify-${key}-saved`, await screen(page));
    let mail = null;
    try {
        mail = await app.mail.find({to: u.email, since, timeoutMs: 15_000});
    } catch (e) {
        mail = null;
    }
    facts[`${key}WelcomeEmail`] = mail ? {subject: mail.Subject, to: (mail.To || []).map((t) => t.Address)} : null;
    facts[`${key}Stored`] = G.storedRoles(app, u.username);
}

async function steps(app, page, facts) {
    const {grid} = await G.openWizardUsers(page, app);
    const win = await openAddUser(page, grid);
    facts.opened = await boxes(win);
    record('notify-01-add-user', await screen(page));
    await win.generatePassword.check();
    facts.generateTicked = await boxes(win);
    record('notify-02-generate-ticked', await screen(page));
    await win.generatePassword.uncheck();
    facts.generateUnticked = await boxes(win);
    record('notify-03-generate-unticked', await screen(page));
    await createUser(app, page, win, {given: 'U53r7', family: 'Notify', username: 'u53r7notify', email: 'u53r7notify@mailinator.com'}, {password: true}, facts, 'typed');
}

async function neighbour(app, page, facts) {
    let {grid} = await G.openWizardUsers(page, app);
    let win = await openAddUser(page, grid);
    await win.generatePassword.check();
    await win.generatePassword.uncheck();
    await win.generatePassword.check();
    facts.nbRetick = await boxes(win);
    record('notify-nb-01-reticked', await screen(page));
    await createUser(app, page, win, {given: 'U53r7', family: 'Generated', username: 'u53r7gen', email: 'u53r7gen@mailinator.com'}, {password: false}, facts, 'nbGenerated');
}

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        if (mode === 'nb') {
            await neighbour(app, page, facts);
        } else {
            await steps(app, page, facts);
        }
        await signOut(page);
    } catch (e) {
        facts.error = String(e && e.stack || e).slice(0, 1500);
        record('notify-error', await screen(page).catch(() => ({})));
        throw e;
    } finally {
        record(mode === 'nb' ? 'notify-nb-facts' : 'notify-facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
