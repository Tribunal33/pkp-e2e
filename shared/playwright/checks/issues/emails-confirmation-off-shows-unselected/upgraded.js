// Upgraded-install walk of U21 A12 (issue report
// docs/issues/U21-A12-emails-confirmation-off-shows-unselected.md). Precondition, as SQL that writes
// exactly what the 3.4 upgrade writes for a journal whose 3.3 "Submission Acknowledgement" email
// was disabled (lib/pkp I5716_EmailTemplateAssignments::moveDisabledEmailTemplateSettings(): the
// context setting `submissionAcknowledgement` stored as ''). Then, as rvaca: Settings › Workflow ›
// "Emails" (which option is selected?) and "Manage Emails" (is "Submission Confirmation" listed?);
// then "Do not send an email." picked and saved, and both read again.
// With the proposed fix applied, REPAIR=1 runs its repair migration after the precondition.
//   PROBE_FEATURE=issues-ir32b PROBE_AGENT=ir32 node bin/probe.js all shared/playwright/checks/issues/emails-confirmation-off-shows-unselected/upgraded.js
const {forEachApp, launch, signIn, signOut, screen, record, sql} = require('../../../probe');
const H = require('./lib.js');

const OFF = 'Do not send an email.';

/** Is "Submission Confirmation" a row of Manage Emails? */
async function manageEmailsLists(page, app) {
    const {ManageEmailsPage} = require('../../../pages/EmailsPages.js');
    const m = new ManageEmailsPage(page, `${app.contextPath}${H.L(app)}`);
    await m.goto();
    const names = await m.rowNames();
    return {count: names.length, listsConfirmation: names.includes('Submission Confirmation'), names};
}

forEachApp(async (app) => {
    const t = app.contextTables;
    const facts = {app: app.name, line: app.line || 'main'};
    // the 3.4 upgrade's row for a context whose SUBMISSION_ACK template was disabled
    await sql(app, `DELETE FROM ${t.settings} WHERE ${t.id} = 1 AND setting_name = 'submissionAcknowledgement'`);
    await sql(app, `INSERT INTO ${t.settings} (${t.id}, setting_name, setting_value) VALUES (1, 'submissionAcknowledgement', '')`);
    facts.storedBefore = await H.storedSetting(app, 'submissionAcknowledgement');
    // REPAIR=1: run the proposed repair migration before the manager looks (fix trial only)
    if (process.env.REPAIR) {
        facts.repair = H.inApp(app, 'repair').trim();
        facts.storedAfterRepair = await H.storedSetting(app, 'submissionAcknowledgement');
    }
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        const p = H.emailsPage(page, app);
        await p.goto();
        facts.upgraded = await H.readConfirmation(p);
        record('a12u-1-upgraded-emails', await screen(page));
        facts.upgradedManage = await manageEmailsLists(page, app);
        record('a12u-2-upgraded-manage-emails', await screen(page));

        // the manager picks "Do not send an email." and saves
        await p.goto();
        await p.field('submissionAcknowledgement').getByRole('radio', {name: OFF, exact: true}).check();
        await p.save();
        await page.reload();
        await p.openTab();
        facts.saved = await H.readConfirmation(p);
        facts.storedAfterSave = await H.storedSetting(app, 'submissionAcknowledgement');
        facts.savedManage = await manageEmailsLists(page, app);
        record('a12u-3-saved-manage-emails', await screen(page));
        await signOut(page);
        facts.listedOnlyWhenUpgraded = facts.upgradedManage.names.filter((n) => !facts.savedManage.names.includes(n));
        delete facts.upgradedManage.names;
        delete facts.savedManage.names;
    } finally {
        record('a12u-facts', facts);
        console.log(JSON.stringify(facts));
        await close();
    }
});
