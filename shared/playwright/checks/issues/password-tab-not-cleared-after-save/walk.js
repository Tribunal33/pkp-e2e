// Kept walk of U03 A11 (docs/specs/U03-user-profile.md): after a successful password change the
// Password tab keeps the typed passwords, an earlier refusal's notice stays beside the saved
// message, and the hint under "New password" does not come back.
// On PKP's default test dataset, through the screens; the kit builds nothing. Fact keys follow
// the report's steps:
//   1    `dbarnes` signs in
//   2    the Profile page by its address, the "Password" tab: the line under "New password"
//   3    wrong current password + two different new ones, "Save" (refused)
//   4    the right current password + the new one twice, "Save": read at the answer and 8 s later
//   5    control: sign out, sign in with the new password
//
// `neighbour` as argument walks only what a fix must leave alone instead (one walk, no steps):
//   n1  a wrong current password is still refused (notice, sentence, password unchanged)
//   n2  a valid change with no refusal before it saves (message; sign-in with the new password)
// `again` as argument walks steps 1 to 4, then presses "Save" a second time on the kept boxes
// (a1: the boxes' type, a2: the second answer and the tab), then signs in with the new password.
//
// Reset first:  npm run fleet-prep -- --feature issues-h15c --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-h15c PROBE_AGENT=h15c node bin/probe.js all shared/playwright/checks/issues/password-tab-not-cleared-after-save/walk.js [neighbour]
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-h15c-3_5), PROBE_RUN=r35
const {forEachApp, launch, signIn, signOut, screen, shot, record, serverLog} = require('../../../probe');
const L = require('./lib.js');

const CURRENT = 'dbarnesdbarnes';
const NEW = 'h15cNew1';
const neighbour = process.argv.slice(2).includes('neighbour');
const again = process.argv.slice(2).includes('again');

async function signInWith(page, password) {
    let signedIn = true;
    await signIn(page, 'dbarnes', {password}).catch((e) => { signedIn = String(e).slice(0, 200); });
    return {signedIn, url: page.url()};
}

async function steps(app, page, fact) {
    await signIn(page, 'dbarnes'); // 1
    const profile = await L.openPasswordTab(app, page); // 2
    fact('2-state', await L.passwordState(page, profile));
    await shot(page, '02-password-tab');

    await L.typePasswords(profile, 'wrongpass', NEW, 'h15cNew2'); // 3
    const tRefused = Date.now();
    fact('3-save', await L.saveAndRead(page, profile, {laterMs: 0}));
    record('03-refused', await screen(page));
    await shot(page, '03-refused');

    await L.typePasswords(profile, CURRENT, NEW); // 4
    fact('4-typed-after-refusal-ms', Date.now() - tRefused);
    const saved = await L.saveAndRead(page, profile, {laterMs: 8000});
    fact('4-save', saved);
    if (again) {
        const types = {};
        for (const [k, box] of [['current', profile.currentPassword()], ['newPassword', profile.newPassword()], ['repeat', profile.repeatPassword()]]) {
            types[k] = await box.getAttribute('type').catch(() => null);
        }
        fact('a1-box-types', types);
        fact('a2-save-again', await L.saveAndRead(page, profile, {laterMs: 0}));
        record('a2-saved-again', await screen(page));
        await shot(page, 'a2-saved-again');
        await signOut(page);
        fact('a3-new-password', await signInWith(page, NEW));
        return;
    }
    await shot(page, '04-saved-later');
    record('04-saved-later', await screen(page));

    await signOut(page); // 5 (control)
    fact('5-new-password', await signInWith(page, NEW));
}

async function neighbourChecks(app, page, fact) {
    await signIn(page, 'dbarnes');
    let profile = await L.openPasswordTab(app, page);
    // n1: a wrong current password is still refused
    await L.typePasswords(profile, 'wrongpass', NEW);
    fact('n1-save', await L.saveAndRead(page, profile, {laterMs: 0}));
    await shot(page, 'n1-refused');
    // n2: a valid change with no refusal before it (the page loaded afresh)
    profile = await L.openPasswordTab(app, page);
    await L.typePasswords(profile, CURRENT, NEW);
    fact('n2-save', await L.saveAndRead(page, profile, {laterMs: 2000}));
    record('n2-saved', await screen(page));
    await shot(page, 'n2-saved');
    await signOut(page);
    fact('n2-old-password', await signInWith(page, CURRENT));
    if (fact.last && fact.last.signedIn === true) await signOut(page);
    fact('n2-new-password', await signInWith(page, NEW));
}

forEachApp(async (app) => {
    const name = neighbour ? 'neighbour-facts' : again ? 'again-facts' : 'walk-facts';
    const fact = (k, v) => {
        fact.last = v;
        record(name, {[k]: v}, {merge: true});
        console.log(`[${name}]`, app.name, k, JSON.stringify(v).slice(0, 900));
    };
    fact('run', {app: app.name, line: app.line || 'main', dataset: app.dataset});
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    try {
        if (neighbour) await neighbourChecks(app, page, fact);
        else await steps(app, page, fact);
    } catch (error) {
        fact('error', String(error.stack || error).slice(0, 1500));
        throw error;
    } finally {
        fact('serverLog', log.since(from));
        await close();
    }
});
