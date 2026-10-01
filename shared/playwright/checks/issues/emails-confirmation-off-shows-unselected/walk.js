// Walk of U21 A12 (issue report docs/issues/U21-A12-emails-confirmation-off-shows-unselected.md):
// as rvaca, Settings › Workflow › "Emails", "Submission Confirmation" set to "Do not send an email.",
// "Save", reload: which option is selected? Control: the same with "Send an email to the submitting
// author only.". On PKP's default test dataset, fleet reset first.
//   PROBE_FEATURE=issues-ir32 PROBE_AGENT=ir32 node bin/probe.js all shared/playwright/checks/issues/emails-confirmation-off-shows-unselected/walk.js
const {forEachApp, launch, signIn, signOut, screen, record} = require('../../../probe');
const H = require('./lib.js');

const OFF = 'Do not send an email.';
const SUBMITTING = 'Send an email to the submitting author only.';

/** Select a "Submission Confirmation" option by its label (OPS's "Posted" group repeats the labels). */
const choose = (p, label) => p.field('submissionAcknowledgement').getByRole('radio', {name: label, exact: true}).check();

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        const p = H.emailsPage(page, app);
        await p.goto();
        facts.opened = await H.readConfirmation(p);
        record('a12-1-opened', await screen(page));

        await choose(p, OFF);
        facts.afterPick = await H.readConfirmation(p);
        await p.save();
        record('a12-2-saved-off', await screen(page));

        await page.reload();
        await p.openTab();
        facts.reopened = await H.readConfirmation(p);
        facts.storedAfterOff = await H.storedSetting(app, 'submissionAcknowledgement');
        record('a12-3-reopened', await screen(page));

        // control: another option survives the reload
        await choose(p, SUBMITTING);
        await p.save();
        await page.reload();
        await p.openTab();
        facts.control = await H.readConfirmation(p);
        facts.storedAfterControl = await H.storedSetting(app, 'submissionAcknowledgement');
        record('a12-4-control-reopened', await screen(page));
        await signOut(page);

        facts.observed = {
            reopenedSelected: facts.reopened.selected,
            expectedSelected: OFF,
            reproduced: facts.reopened.selected !== OFF,
            controlSelected: facts.control.selected,
        };
    } finally {
        record('a12-facts', facts);
        console.log(JSON.stringify(facts));
        await close();
    }
});
