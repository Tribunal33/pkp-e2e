// U37 A2, the French interface (docs/issues/U37-A2-discussion-window-placeholder-subtitle.md):
// as dbarnes, the same Production stage opened at the fr_CA address, "Ajouter" in the tasks and
// discussions panel, the window's header read. Nothing is saved.
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=u37r9 node bin/probe.js all shared/playwright/checks/issues/discussion-window-placeholder-and-unnamed-message/french.js
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const L = require('./lib.js');

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        const {ItemWindow} = require('../../../pages/TasksDiscussionsPages.js');
        await signIn(page, 'dbarnes');
        const id = L.SUBMISSION[app.name];
        await page.goto(app.url(`/index.php/${app.contextPath}/fr_CA/dashboard/editorial?workflowSubmissionId=${id}&workflowMenuKey=workflow_5`));
        await idle(page);
        const panel = page.locator('[data-cy="active-modal"], [role="dialog"]').last();
        await panel.getByRole('button', {name: /^Ajouter$/}).first().click({timeout: 30_000});
        const win = new ItemWindow(page);
        await win.expectReady();
        facts.header = await L.header(win.root);
        record('fr-add-window', await screen(page));
        await signOut(page);
    } catch (e) {
        facts.failed = String(e.stack || e).split('\n').slice(0, 4).join(' | ');
    } finally {
        record('french', facts);
        console.log(`[${app.name}]`, JSON.stringify(facts));
        await close();
    }
});
