// Neighbour check for the fix of docs/issues/U61-A6-requeue-all-refused-circle-keeps-turning.md:
// the busy sign must stay where work is under way and go once it is done. With 51 failed jobs
// (lib.js makeFailedJobs), as `admin` on Failed Jobs: page link "2" held in flight shows the
// circles, and they go once page 2 is shown; "Requeue All Failed Jobs" held in flight shows the
// circle beside the button, and once the list reloads it reads "No Items" with no circle.
// The held requests are the page's own, only delayed. Walk with the fix in and out.
//
// Run:  PROBE_FEATURE=<feature> PROBE_AGENT=<agent> PROBE_RUN=<fix|nofix> node bin/probe.js all shared/playwright/checks/issues/requeue-all-refused-circle-keeps-turning/neighbour.js
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line || 'main'};
    f.precondition = {failedJobs: L.makeFailedJobs(app, 51)};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    try {
        await signIn(page, 'admin');
        f.landed = {list: await L.openFromAdministration(page, app), ...(await L.state(page))};

        // Page link "2", held in flight, then let through.
        let held = await L.hold(page, (req) => req.method() === 'GET' && /[?&]page=2\b/.test(req.url()));
        const page2 = page.waitForResponse((r) => L.isListLoad(r) && /[?&]page=2\b/.test(r.url()), {timeout: 30_000});
        await page.locator('main').getByRole('navigation', {name: 'View additional pages'}).getByRole('button', {name: 'Go to Page 2', exact: true}).click();
        await page.locator('main .pkpPagination__loading').waitFor({timeout: 10_000}).catch(() => {});
        f.page2InFlight = await L.state(page);
        held.release();
        await page2;
        await page.locator('main tbody tr').first().waitFor();
        await page.waitForFunction(() => document.querySelectorAll('main tbody tr').length === 1, null, {timeout: 10_000}).catch(() => {});
        f.page2Shown = await L.state(page);
        await held.stop();

        // "Requeue All Failed Jobs", held in flight, then let through.
        held = await L.hold(page, (req) => req.method() === 'POST' && /\/jobs\/redispatch\/all$/.test(new URL(req.url()).pathname));
        const reload = page.waitForResponse(L.isListLoad, {timeout: 30_000});
        const answered = page.waitForResponse(L.isRequeueAll, {timeout: 30_000});
        await page.locator('main').getByRole('button', {name: 'Requeue All Failed Jobs', exact: true}).click();
        await page.locator('main').getByRole('button', {name: 'Requeue All Failed Jobs', exact: true}).locator('xpath=..').locator('.pkpSpinner').waitFor({timeout: 5000}).catch(() => {});
        f.requeueInFlight = await L.state(page);
        held.release();
        f.requeueAnswer = (await answered).status();
        await reload;
        await page.locator('main').getByRole('row', {name: 'No Items', exact: true}).waitFor();
        f.requeueDone = {notices: await L.notices(page), ...(await L.state(page))};
        await held.stop();
    } finally {
        record('a6-neighbour', f);
        console.log(JSON.stringify(f));
        await close();
    }
});
