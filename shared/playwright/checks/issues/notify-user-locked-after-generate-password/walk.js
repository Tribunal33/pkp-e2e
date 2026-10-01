// Issue report docs/issues/U53-A16-notify-user-locked-after-generate-password.md
// (U53 A16): on the Site Administrator's "Add User" window, ticking "Generate
// Password" and then unticking it leaves "Notify User" greyed out, so a typed
// password cannot be sent in the welcome email. Takes the report's Steps
// through the screens on a dataset fleet (PKP's default test dataset), freshly
// reset, on OJS, OMP and OPS. Step numbers are the report's:
//   1-4.  sign in as admin; Administration › "Hosted Journals" (Presses,
//         Servers) › publicknowledge › "Settings wizard" › "Users"
//   5.    "Add User": "Notify User" as the window opens
//   6.    tick "Generate Password": the password boxes and "Notify User"
//   7-8.  untick it: the password boxes and "Notify User"
//   9-11. type the new account's details and password, tick "Notify User"
//         (a click on the box, as a person would), press "OK"; then the
//         window's step and the welcome email to the new address (Mailpit)
// NEIGHBOUR=1 (the fix's neighbour check): steps 1-8, then tick "Generate
// Password" again: "Notify User" must be ticked and greyed out again (step 6's
// state), and unticking once more must open it again; then "Cancel".
//
// Reset first:  npm run fleet-prep -- --feature issues-r45 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-r45 PROBE_AGENT=r45 node bin/probe.js all shared/playwright/checks/issues/notify-user-locked-after-generate-password/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r45-3_5 PROBE_AGENT=r45 node bin/probe.js all <this file>
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const NEIGHBOUR = !!process.env.NEIGHBOUR;
const HOSTED = {ojs: 'Hosted Journals', omp: 'Hosted Presses', ops: 'Hosted Servers'};
const USERNAME = 'u53r45rdelgado';
const EMAIL = `${USERNAME}@example.com`;
const PASSWORD = 'u53r45pass';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null, neighbour: NEIGHBOUR};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const rec = async (page, name) => {
        const s = await screen(page).catch((e) => ({error: flat(e.message, 200)}));
        record(name, s);
        await shot(page, name).catch(() => {});
        return s;
    };
    const {HostedContextsPage, UserDetailsWindow} = require('../../../pages/UsersManagementPages.js');
    const {page, close} = await launch(app);
    page.setDefaultTimeout(T);
    // The state of the three boxes as the window shows them.
    const boxes = async (w) => {
        const one = (loc) =>
            loc.evaluate((e) => ({
                checked: e.type === 'checkbox' ? e.checked : undefined,
                disabled: e.disabled,
                disabledAttribute: e.getAttribute('disabled'),
                value: e.type === 'password' ? e.value : undefined,
            }));
        return {
            password: await one(w.password),
            repeatPassword: await one(w.password2),
            generatePassword: await one(w.generatePassword),
            notifyUser: await one(w.sendNotify),
        };
    };
    try {
        // 1-4
        await signIn(page, 'admin');
        const hosted = new HostedContextsPage(page, {hostedLabel: HOSTED[app.name]});
        await hosted.gotoFromAdministration();
        await hosted.openSettingsWizard(app.contextPath);
        await hosted.openWizardTab('Users');
        await rec(page, 's4-wizard-users');

        // 5
        await hosted.wizardGridPanel().getByRole('link', {name: 'Add User', exact: true}).first().click();
        const w = new UserDetailsWindow(page, 'Add User');
        await w.expectOpen();
        const notifyLabel = flat(await w.form.locator(`label[for="${await w.sendNotify.getAttribute('id')}"]`).first().innerText().catch(() => ''));
        const generateLabel = flat(await w.form.locator(`label[for="${await w.generatePassword.getAttribute('id')}"]`).first().innerText().catch(() => ''));
        await rec(page, 's5-add-user-open');
        fact('5 window opens', {labels: {notifyLabel, generateLabel}, boxes: await boxes(w)});

        // 6
        await w.generatePassword.check();
        await idle(page);
        await rec(page, 's6-generate-ticked');
        fact('6 generate ticked', await boxes(w));

        // 7-8
        await w.generatePassword.uncheck();
        await idle(page);
        await rec(page, 's8-generate-unticked');
        fact('8 generate unticked', await boxes(w));

        if (NEIGHBOUR) {
            await w.generatePassword.check();
            await idle(page);
            await rec(page, 'n-generate-ticked-again');
            fact('n generate ticked again', await boxes(w));
            await w.generatePassword.uncheck();
            await idle(page);
            fact('n generate unticked again', await boxes(w));
            await w.cancel();
            await rec(page, 'n-cancelled');
            await signOut(page);
            return;
        }

        // 9
        await w.givenName.fill('Rosa');
        await w.familyName.fill('Delgado');
        await w.username.fill(USERNAME);
        await w.email.fill(EMAIL);
        await w.password.fill(PASSWORD);
        await w.password2.fill(PASSWORD);

        // 10: a person's click on the box (a disabled box ignores it)
        await w.sendNotify.click({force: true, timeout: 5000}).catch((e) => fact('10 click error', flat(e.message, 200)));
        await pause(300);
        await rec(page, 's10-notify-clicked');
        fact('10 after clicking Notify User', (await boxes(w)).notifyUser);

        // 11
        const sentAt = new Date();
        await w.pressOk();
        let step2 = null;
        try {
            await w.expectStep2('Rosa Delgado');
            step2 = flat(await w.roleForm.locator('h3').first().innerText());
        } catch (e) {
            step2 = `no step 2: ${flat(e.message, 200)}`;
        }
        await rec(page, 's11-after-ok');
        // Only a message that arrived after "OK" counts: an earlier walk on
        // another app or line may have mailed the same address.
        let mail = `none within 15 s of OK`;
        for (const deadline = Date.now() + 15_000; Date.now() < deadline; await pause(500)) {
            const fresh = (await app.mail._search({to: EMAIL})).messages.filter((m) => new Date(m.Created) >= new Date(sentAt.getTime() - 2000));
            if (!fresh.length) continue;
            const m = fresh[0];
            const full = await app.mail.fullMessage(m.ID);
            mail = {subject: m.Subject, to: (m.To || []).map((t) => t.Address), created: m.Created, count: fresh.length,
                textHasPassword: String(full.Text || '').includes(PASSWORD), textHasUsername: String(full.Text || '').includes(USERNAME)};
            break;
        }
        fact('11 step 2 heading', step2);
        fact('11 welcome email', mail);
        fact('11 db account', sql(app, `select username, email, must_change_password from users where username = '${USERNAME}'`).split('\n').filter(Boolean));
        await signOut(page);
    } finally {
        record('facts', facts);
        await close();
    }
});
