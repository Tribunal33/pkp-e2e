// U54 A3, the "Done" stage check (issue report docs/issues/U54-A3-manager-level-role-save-ticks-every-stage.md):
// on main the save also drops the "Done" stage (6) from "Journal editor". As dbarnes, submission 1 (OJS) or 14
// (OMP) and the "Published" list are read; rvaca saves the "Journal editor" ("Press editor") window
// unchanged; dbarnes reads both again.
//   ONLY=ojs PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/manager-level-role-save-ticks-every-stage/done-stage.js
const {forEachApp, launch, signIn, record, screen, idle} = require('../../../probe');
const H = require('./lib.js');
const IDS = {ojs: 1, omp: 14};
forEachApp(async (app) => {
    const role = app.name === 'ojs' ? 'Journal editor' : 'Press editor';
    const facts = {storedBefore: H.storedStages(app, role)};
    const {page, close} = await launch(app);
    const look = async (tag) => {
        await signIn(page, 'dbarnes');
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${IDS[app.name]}`));
        await page.getByRole('dialog').getByText('Activity Log').first().waitFor({timeout: 60_000});
        await idle(page);
        const s = await screen(page);
        record(`done-${tag}`, s);
        facts[tag] = (s.text.dialog || s.text.main || '').slice(0, 1500);
        // published tab of the dashboard
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?currentViewId=published`));
        await page.getByText(/^Showing \d+ to \d+ of \d+/).first().waitFor({timeout: 60_000});
        await idle(page);
        facts[tag + 'Published'] = ((await screen(page)).text.main || '').slice(0, 1500);
    };
    try {
        await look('before');
        await signIn(page, 'rvaca');
        const tab = await H.rolesTab(page, app);
        const win = await tab.openEdit(role);
        facts.save = await H.saveWindow(page, win);
        facts.storedAfter = H.storedStages(app, role);
        await look('afterSave');
    } finally {
        record('done-stage', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
