// Kept walk of issue report docs/issues/U01-A11-refused-password-form-tab-loses-name.md (U01 A11; U01 A3).
// On PKP's default test dataset: `admin` flags `minoue` for a password change in the "Settings
// wizard" › "Users" › "Edit User"; `minoue` signs in, lands on "Change Password" and presses "OK" with
// a wrong current password. Signed out, "Forgot your password?" for dbuskins@mailinator.com, the
// emailed link's "Reset Password" form, and "Save" with two different passwords. Each page's browser
// tab, heading and form errors are recorded before and after the refusal.
//
// `neighbour` as argument walks only the paths a fix must leave alone instead: the same flag and
// sign-in, then the right current password (the change is taken and `minoue` lands as after any
// sign-in); the same reset request, then the same password in both boxes (the "password updated"
// page). No argument walks the steps alone. No assertions: the script records, the reader judges.
//
// Reset first:  npm run fleet-prep -- --feature issues-u01b --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u01b PROBE_AGENT=u01b node bin/probe.js all shared/playwright/checks/issues/refused-password-form-tab-loses-name/walk.js [neighbour]
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-u01b-3_5), PROBE_RUN=r35
const {forEachApp, launch, signIn, signOut, screen, shot, record, serverLog} = require('../../../probe');
const H = require('./lib.js');

const neighbour = process.argv.slice(2).includes('neighbour');
const FLAGGED = 'minoue';
const RESET = {username: 'dbuskins', email: 'dbuskins@mailinator.com'};
const NEW = 'u01bnewpass';

async function flag(app, facts) {
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        facts.flag = await H.flagForChange(page, app, FLAGGED);
        await signOut(page);
    } finally {
        await close();
    }
}

async function changeSteps(app, facts) {
    const {page, close} = await launch(app);
    try {
        facts.changeShown = await H.signInAt(page, app, FLAGGED, `${FLAGGED}${FLAGGED}`);
        record('05-change-password', await screen(page));
        await shot(page, '05-change-password');
        if (neighbour) {
            facts.changeRight = await H.changePassword(page, {current: `${FLAGGED}${FLAGGED}`, next: NEW});
            record('nb-change-right', await screen(page));
        } else {
            facts.changeWrong = await H.changePassword(page, {current: 'wrongwrong', next: NEW});
            record('06-change-refused', await screen(page));
            await shot(page, '06-change-refused');
        }
    } catch (e) {
        facts.changeError = String(e.message || e).slice(0, 400);
    } finally {
        await close();
    }
}

async function resetSteps(app, facts) {
    const {page, close} = await launch(app);
    try {
        await page.goto(app.url(`/index.php/${app.contextPath}/en/login`));
        const since = new Date();
        facts.resetRequested = await H.PW.requestReset(page, RESET.email);
        const mail = await H.PW.resetLink(app, RESET.email, since);
        facts.resetMail = {subject: mail.subject, linkFound: !!mail.link};
        if (!mail.link) return;
        await page.goto(mail.link);
        await page.locator('form#updateResetPassword').waitFor({timeout: H.T});
        facts.resetShown = await H.tabAndHeading(page);
        record('08-reset-form', await screen(page));
        await shot(page, '08-reset-form');
        if (neighbour) {
            facts.resetSaved = await H.saveReset(page, {password: NEW, repeat: NEW});
            record('nb-reset-saved', await screen(page));
        } else {
            facts.resetRefused = await H.saveReset(page, {password: NEW, repeat: 'u01bother'});
            record('09-reset-refused', await screen(page));
            await shot(page, '09-reset-refused');
        }
    } catch (e) {
        facts.resetError = String(e.message || e).slice(0, 400);
    } finally {
        await close();
    }
}

forEachApp(async (app) => {
    const log = serverLog(app);
    const from = log.mark();
    const facts = {mode: neighbour ? 'neighbour' : 'steps', line: app.line || 'main'};
    await flag(app, facts);
    await changeSteps(app, facts);
    await resetSteps(app, facts);
    facts.serverLog = log.since(from);
    record(neighbour ? 'nb-facts' : 'facts', facts);
    console.log(app.name, JSON.stringify(facts, null, 1));
});
