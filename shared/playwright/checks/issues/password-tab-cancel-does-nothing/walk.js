// Kept walk of issue report docs/issues/U03-A12-password-tab-cancel-does-nothing.md (U03 A12).
// On PKP's default test dataset, through the screens; the kit builds nothing. Fact keys follow the
// report's steps:
//   1-2  `dbarnes` signs in; the Profile page by its address; every tab's buttons under its form
//   3-4  "Password"; the three boxes typed
//   5    "Cancel": what it sent, which tab is open, what the boxes hold
//   6    "Contact" pressed: the question (answered "Cancel"), then the tab that is open
//   7-8  the control: a fresh visit, "Password", the same three boxes, "Contact" pressed without "Cancel"
//
// `neighbour` as argument walks only the paths a fix must leave alone instead: on the Password tab a
// wrong current password is still refused, and a correct change is still saved ("Your changes have
// been saved.").
//
// Reset first:  npm run fleet-prep -- --feature issues-u03d --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u03d PROBE_AGENT=u03d node bin/probe.js all shared/playwright/checks/issues/password-tab-cancel-does-nothing/walk.js [neighbour]
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-u03d-3_5), PROBE_RUN=r35
const {forEachApp, launch, signIn, screen, shot, record, serverLog} = require('../../../probe');
const L = require('./lib.js');

const CURRENT = 'dbarnesdbarnes';
const NEW = 'u03rdNewPass';
const neighbour = process.argv.slice(2).includes('neighbour');

async function steps(app, page, dialogs, fact) {
    await signIn(page, 'dbarnes'); // 1
    let profile = await L.openProfile(app, page, 'identity'); // 2
    const buttons = {};
    for (const t of L.TABS) {
        if (t !== 'identity') await L.pressTab(page, profile, dialogs, t, {answer: 'accept'});
        buttons[t] = await L.formButtons(profile, t);
    }
    fact('2-buttons', buttons);

    profile = await L.openProfile(app, page, 'identity');
    fact('3-password', await L.pressTab(page, profile, dialogs, 'password')); // 3
    fact('3-buttons', await L.formButtons(profile, 'password'));
    record('03-password', await screen(page));
    await L.typePasswords(profile, CURRENT, NEW); // 4
    fact('4-values', await L.passwordValues(profile));

    fact('5-cancel', await L.pressCancel(page, profile)); // 5
    fact('5-values', await L.passwordValues(profile));
    record('05-after-cancel', await screen(page));
    await shot(page, '05-after-cancel');

    const s6 = await L.pressTab(page, profile, dialogs, 'contact', {answer: 'dismiss'}); // 6
    fact('6-contact', s6);
    fact('6-password-values', await L.passwordValues(profile));
    record('06-contact', await screen(page));

    profile = await L.openProfile(app, page, 'identity'); // 7 (control)
    fact('7-password', await L.pressTab(page, profile, dialogs, 'password'));
    await L.typePasswords(profile, CURRENT, NEW);
    fact('7-values', await L.passwordValues(profile));
    fact('8-contact', await L.pressTab(page, profile, dialogs, 'contact', {answer: 'dismiss'})); // 8
    fact('8-password-values', await L.passwordValues(profile));
    record('08-control', await screen(page));
}

async function neighbourChecks(app, page, dialogs, fact) {
    await signIn(page, 'dbarnes');
    let profile = await L.openProfile(app, page, 'identity');
    fact('n0-password', await L.pressTab(page, profile, dialogs, 'password'));
    fact('n0-buttons', await L.formButtons(profile, 'password'));
    // n1: a wrong current password is still refused
    await L.typePasswords(profile, 'not-the-password', NEW);
    fact('n1-wrong-current', await L.pressSave(page, profile));
    record('n1-wrong-current', await screen(page));
    // n2: a correct change is still saved
    profile = await L.openProfile(app, page, 'identity');
    await L.pressTab(page, profile, dialogs, 'password');
    await L.typePasswords(profile, CURRENT, NEW);
    fact('n2-saved', await L.pressSave(page, profile));
    record('n2-saved', await screen(page));
    await shot(page, 'n2-saved');
}

forEachApp(async (app) => {
    const name = neighbour ? 'neighbour-facts' : 'walk-facts';
    const fact = (k, v) => {
        record(name, {[k]: v}, {merge: true});
        console.log(`[${name}]`, app.name, k, JSON.stringify(v).slice(0, 600));
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
