// Walk of U21 OMP2 (issue report docs/issues/U21-OMP2-press-refuses-notify-anyone-list.md):
// as rvaca, Settings › Workflow › "Emails", "Notify Anyone" given two addresses separated by a
// comma, as its help text asks, then "Save". Control: one address alone. Run on all three apps
// (a journal and a preprint server are the comparison). On PKP's default test dataset, fleet reset first.
//   PROBE_FEATURE=issues-ir32 PROBE_AGENT=ir32 node bin/probe.js all shared/playwright/checks/issues/press-refuses-notify-anyone-list/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const H = require('../emails-confirmation-off-shows-unselected/lib.js');

const LIST = 'one@example.com,two@example.com';
const ONE = 'one@example.com';

/** Type `value` into "Notify Anyone", press "Save"; the answer's status, the box's message, the footer, the value after a reload. */
async function saveNotifyAnyone(page, p, value) {
    await p.notifyAnyoneBox().fill(value);
    const status = await p.pressSave();
    await idle(page);
    const error = (await p.fieldError('copySubmissionAckAddress').allInnerTexts()).map((t) => H.flat(t)).join(' | ');
    const footer = H.flat(await p.footer().innerText().catch(() => ''));
    const shown = await screen(page);
    await page.reload();
    await p.openTab();
    const afterReload = await p.notifyAnyoneBox().inputValue();
    return {typed: value, status, error, footer, notices: shown.notices, afterReload};
}

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        const p = H.emailsPage(page, app);
        await p.goto();
        facts.help = H.flat(await p.field('copySubmissionAckAddress').locator('.pkpFormField__description').innerText());
        record('omp2-1-opened', await screen(page));

        facts.list = await saveNotifyAnyone(page, p, LIST);
        record('omp2-2-list-saved', await screen(page));
        facts.storedAfterList = await H.storedSetting(app, 'copySubmissionAckAddress');

        // control: one address alone
        facts.one = await saveNotifyAnyone(page, p, ONE);
        record('omp2-3-one-saved', await screen(page));
        await signOut(page);

        facts.observed = {
            listRefused: facts.list.status !== 200,
            listMessage: facts.list.error,
            oneAccepted: facts.one.status === 200 && facts.one.afterReload === ONE,
        };
    } finally {
        record('omp2-facts', facts);
        console.log(JSON.stringify(facts));
        await close();
    }
});
