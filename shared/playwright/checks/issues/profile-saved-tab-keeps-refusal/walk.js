// Kept walk of U03 A11 and A15 (docs/specs/U03-user-profile.md); no report: neither headline reproduced on 2026-10-03 (see the issues session notes).
// On PKP's default test dataset, through the screens; the kit builds nothing. Fact keys follow the
// report's steps:
//   1-2  `dbarnes` signs in; the Profile page by its address; "Public"
//   3    "Homepage URL" := example.org/u03rc, "Save" (refused in the browser)
//   4    corrected to https://example.org/u03rc (state before "Save"), "Save"
//   5    reload, "Public" (control)
//   6    "Password": the line under "New password"
//   7    wrong current password + two different new ones, "Save" (refused)
//   8    the right current password + the new one twice, "Save"
//   9    control: sign out, sign in with the new password
//
// `neighbour` as argument walks only what a fix must leave alone instead: a homepage saved with no
// refusal before it (saved message, value kept, no question on leaving the tab), a wrong current
// password still refused, and a valid password change with no refusal before it.
//
// Reset first:  npm run fleet-prep -- --feature issues-u03c --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u03c PROBE_AGENT=u03c node bin/probe.js all shared/playwright/checks/issues/profile-saved-tab-keeps-refusal/walk.js [neighbour]
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-u03c-3_5), PROBE_RUN=r35
const {forEachApp, launch, signIn, signOut, screen, shot, record, serverLog} = require('../../../probe');
const L = require('./lib.js');

const CURRENT = 'dbarnesdbarnes';
const NEW = 'u03rcNew1';
const neighbour = process.argv.slice(2).includes('neighbour');

async function steps(app, page, dialogs, fact) {
    await signIn(page, 'dbarnes'); // 1
    let profile = await L.openProfile(app, page, 'identity'); // 2
    fact('2-public', await L.pressTab(page, profile, dialogs, 'public'));
    fact('2-homepage', await L.homepageState(profile));

    await L.retype(profile.homepage(), 'example.org/u03rc'); // 3
    fact('3-save', await L.pressSave(page, profile, 'public'));
    fact('3-homepage', await L.homepageState(profile));
    await shot(page, '03-refused');

    await L.retype(profile.homepage(), 'https://example.org/u03rc'); // 4
    await L.sleep(800);
    fact('4-typed', await L.homepageState(profile));
    await profile.homepage().blur();
    await L.sleep(800);
    fact('4-typed-blurred', await L.homepageState(profile));
    fact('4-save', await L.pressSave(page, profile, 'public'));
    fact('4-homepage', await L.homepageState(profile));
    record('04-saved', await screen(page));
    await shot(page, '04-saved');

    profile = await L.openProfile(app, page, 'public'); // 5
    fact('5-reloaded', await L.homepageState(profile));

    fact('6-password', await L.pressTab(page, profile, dialogs, 'password', {answer: 'accept'})); // 6
    fact('6-state', await L.passwordState(profile));

    await L.typePasswords(profile, 'wrongpass', NEW, 'u03rcNew2'); // 7
    fact('7-save', await L.pressSave(page, profile, 'password'));
    fact('7-state', await L.passwordState(profile));
    await shot(page, '07-refused');

    await L.typePasswords(profile, CURRENT, NEW); // 8
    fact('8-save', await L.pressSave(page, profile, 'password'));
    fact('8-state', await L.passwordState(profile));
    record('08-saved', await screen(page));
    await shot(page, '08-saved');

    await signOut(page); // 9 (control)
    let signedIn = true;
    await signIn(page, 'dbarnes', {password: NEW}).catch((e) => { signedIn = String(e).slice(0, 200); });
    fact('9-new-password', {signedIn, url: page.url()});
}

async function neighbourChecks(app, page, dialogs, fact) {
    await signIn(page, 'dbarnes');
    let profile = await L.openProfile(app, page, 'public');
    // n1: a homepage saved with no refusal before it
    await L.retype(profile.homepage(), 'https://example.org/u03rc-nb');
    fact('n1-save', await L.pressSave(page, profile, 'public'));
    fact('n1-homepage', await L.homepageState(profile));
    record('n1-saved', await screen(page));
    await shot(page, 'n1-saved');
    fact('n1-leave', await L.pressTab(page, profile, dialogs, 'contact'));
    profile = await L.openProfile(app, page, 'public');
    fact('n1-reloaded', await L.homepageState(profile));
    // n2: a wrong current password is still refused
    await L.pressTab(page, profile, dialogs, 'password', {answer: 'accept'});
    await L.typePasswords(profile, 'wrongpass', NEW);
    fact('n2-save', await L.pressSave(page, profile, 'password'));
    fact('n2-state', await L.passwordState(profile));
    // n3: a valid change with no refusal before it
    profile = await L.openProfile(app, page, 'password');
    await L.typePasswords(profile, CURRENT, NEW);
    fact('n3-save', await L.pressSave(page, profile, 'password'));
    fact('n3-state', await L.passwordState(profile));
    record('n3-saved', await screen(page));
    await shot(page, 'n3-saved');
    fact('n3-leave', await L.pressTab(page, profile, dialogs, 'contact'));
    await signOut(page);
    let signedIn = true;
    await signIn(page, 'dbarnes', {password: NEW}).catch((e) => { signedIn = String(e).slice(0, 200); });
    fact('n3-new-password', {signedIn, url: page.url()});
}

forEachApp(async (app) => {
    const name = neighbour ? 'neighbour-facts' : 'walk-facts';
    const fact = (k, v) => {
        record(name, {[k]: v}, {merge: true});
        console.log(`[${name}]`, app.name, k, JSON.stringify(v).slice(0, 700));
    };
    fact('run', {app: app.name, line: app.line || 'main', dataset: app.dataset});
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    const dialogs = L.dialogRecorder(page);
    try {
        if (neighbour) await neighbourChecks(app, page, dialogs, fact);
        else await steps(app, page, dialogs, fact);
    } catch (error) {
        fact('error', String(error.stack || error).slice(0, 1500));
        throw error;
    } finally {
        fact('dialogs', dialogs.seen);
        fact('serverLog', log.since(from));
        await close();
    }
});
