// Neighbour check of the U21 A12 fix (issue report
// docs/issues/U21-A12-emails-confirmation-off-shows-unselected.md): on PKP's default test dataset
// as loaded, rvaca opens Settings › Workflow, › Distribution and › Website and the script reads which
// option every radio group and select on those pages shows selected. Walked with the fix in and out:
// the fix gives null only to a field that offers null as an option, so these must read the same.
//   PROBE_FEATURE=issues-ir32 PROBE_AGENT=ir32 PROBE_RUN=fixout node bin/probe.js all shared/playwright/checks/issues/emails-confirmation-off-shows-unselected/neighbour.js
const {forEachApp, launch, signIn, signOut, record, idle} = require('../../../probe');
const H = require('./lib.js');

const PAGES = ['workflow', 'distribution', 'website', 'context'];

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null, pages: {}};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        for (const name of PAGES) {
            await page.goto(app.url(`/index.php/${app.contextPath}${H.L(app)}/management/settings/${name}`));
            await idle(page);
            await page.locator('form').first().waitFor({timeout: 30_000});
            facts.pages[name] = await H.choicesOnPage(page);
        }
        await signOut(page);
    } finally {
        record('a12-neighbour', facts);
        console.log(JSON.stringify(facts));
        await close();
    }
});
