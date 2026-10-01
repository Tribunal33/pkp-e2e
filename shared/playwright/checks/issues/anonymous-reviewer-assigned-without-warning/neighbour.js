// Neighbour check for the fix of docs/issues/U35-A11-anonymous-reviewer-assigned-without-warning.md:
// what the fix must leave alone, walked with the fix in and out. Signed in as
// dbarnes on a dataset fleet (PKP's default test dataset), freshly reset, on
// the same submission and stage as walk.js (OJS 12, OMP 17):
//   "Assign", role "Author", "Search", then an author with no review request
//   on the submission (OJS "Carlo Corino", OMP "Arthur Clark"): no warning.
// Nothing is saved ("Cancel" is never pressed; the page is left as it is).
// Run: PROBE_FEATURE=issues-w29 PROBE_AGENT=w29 PROBE_RUN=<fix|nofix> node bin/probe.js all shared/playwright/checks/issues/anonymous-reviewer-assigned-without-warning/neighbour.js
//      (reset first: npm run fleet-prep -- --feature issues-w29 --dataset 2 --reset)
const {forEachApp, launch, signIn, screen, record} = require('../../../probe');

const RUN = process.env.PROBE_RUN || 'main';
const CASE = {
    ojs: {sid: 12, search: 'Corino', name: 'Carlo Corino'},
    omp: {sid: 17, search: 'Clark', name: 'Arthur Clark'},
};
const WARNING = 'The participant you selected has been assigned to conduct an anonymous review.';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    const c = CASE[app.name];
    if (!c) return;
    const SP = require('../../../pages/StageParticipantsPages.js');
    const facts = {app: app.name, line: app.line || 'main', run: RUN};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const panel = new SP.ParticipantsPanel(page, app.contextPath);
        await panel.goto(c.sid);
        const win = await panel.openAssign();
        await win.chooseRole('Author');
        await win.search(c.search);
        await win.choosePerson(c.name);
        facts.warningShown = await page.getByText(WARNING).first()
            .waitFor({state: 'visible', timeout: 5_000}).then(() => true, () => false);
        console.log(`[fact] ${app.name} ${RUN} ${c.name} warningShown: ${facts.warningShown}`);
        record(`neighbour-${RUN}`, await screen(page));
    } finally {
        record(`neighbour-facts-${RUN}`, facts);
        await close();
    }
});
