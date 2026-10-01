// Who else meets the page of U21 OPS7 (issue report docs/issues/U21-OPS7-preprint-not-allowed-page-raw-key.md):
// as dbarnes, untick "Allow user self-registration" on "Author"; the Moderator dbuskins signs in and
// opens "New Submission" once. Control: before the change, the Manager rvaca opens it. Fleet reset first.
//   PROBE_FEATURE=issues-ir34 PROBE_AGENT=ir34 ONLY=ops node bin/probe.js all shared/playwright/checks/issues/preprint-not-allowed-page-raw-key/moderator.js
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    if (app.name !== 'ops') return;
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        const manager = await H.openStart(page, app);
        facts.manager = {heading: manager.heading, startForm: manager.startForm};
        await signOut(page);

        await signIn(page, 'dbarnes');
        facts.selfRegistration = await H.turnOffSelfRegistration(page, app, 'Author');
        await signOut(page);

        await signIn(page, 'dbuskins');
        const mod = await H.openStart(page, app);
        record('ops7-moderator', mod.screen);
        facts.moderator = {status: mod.status, heading: mod.heading, main: mod.main.slice(-300), rawKeys: mod.rawKeys, startForm: mod.startForm};
        await signOut(page);
    } finally {
        record('ops7-moderator-facts', facts);
        console.log(JSON.stringify(facts));
        await close();
    }
});
