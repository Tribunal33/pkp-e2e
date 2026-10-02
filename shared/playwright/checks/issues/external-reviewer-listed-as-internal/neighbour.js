// Neighbour check of the fix (docs/issues/U37-OMP1-external-reviewer-listed-as-internal.md):
// a journal has one reviewer role, "Reviewer", and the fix must leave it as it is. On PKP's
// default test dataset, OJS: dbarnes opens submission 10, "Condensing Water Availability
// Models…", Review › Round 1, "Add" under "Review Tasks & Discussions", and reads the lines of
// Aisla McCrae and Adela Gallego (both completed their reviews): "Reviewer" each. Read only,
// the window is cancelled. Run with the fix in and out:
//   PROBE_FEATURE=<dataset feature> PROBE_AGENT=<id> node bin/probe.js ojs \
//     shared/playwright/checks/issues/external-reviewer-listed-as-internal/neighbour.js
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib.js');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    const T = require('../../../pages/TasksDiscussionsPages.js');
    const panel = new T.TasksDiscussionsPanel(page, app.contextPath, {title: L.OMP.panel});
    try {
        await signIn(page, 'dbarnes');
        await panel.gotoEditorial(10, 'workflow_3_8');
        const add = await panel.openAdd();
        facts.add = await L.participantLines(add, 'amccrae');
        facts.amccrae = L.lineOf(facts.add, 'amccrae');
        facts.agallego = L.lineOf(facts.add, 'agallego');
        record('n1-add-review', await screen(page));
        await shot(page, 'n1-add-review');
        await add.cancelButton().click().catch(() => {});
    } catch (e) {
        facts.error = String(e && e.message).slice(0, 800);
        record('error-screen', await screen(page).catch(() => null));
    } finally {
        record('neighbour-facts', facts);
        console.log(`[${app.name}] ${JSON.stringify(facts, null, 1)}`);
        await close();
    }
});
