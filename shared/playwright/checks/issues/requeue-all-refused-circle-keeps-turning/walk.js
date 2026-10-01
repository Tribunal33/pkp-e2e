// Walk of docs/issues/U61-A6-requeue-all-refused-circle-keeps-turning.md (U61 A6), on an
// install freshly loaded from PKP's default test dataset: 51 failed jobs made with the
// application's own job tool (lib.js makeFailedJobs), then as `admin` Failed Jobs open in two
// tabs; "Requeue All Failed Jobs" in the first empties the list, the same button in the second
// is refused ("Error" window), and after "OK" the page is read at once and 3 s and 10 s later.
//
// Run:  PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/requeue-all-refused-circle-keeps-turning/walk.js
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib');

const FAILED = 51;

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line || 'main'};
    f.precondition = {failedJobs: L.makeFailedJobs(app, FAILED)};

    const {context, page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    try {
        // 1–2: admin, Administration › "View Failed Jobs".
        await signIn(page, 'admin');
        f.s2 = {list: await L.openFromAdministration(page, app), ...(await L.state(page))};
        record('a6-2-first-tab', await screen(page));

        // 3: the same page in a second tab.
        const second = await context.newPage();
        second.setDefaultTimeout(20_000);
        f.s3 = {list: await L.openByAddress(second, app), ...(await L.state(second))};

        // 4: the first tab empties the list (the control: no circle once done).
        await page.bringToFront();
        const loaded = page.waitForResponse(L.isListLoad, {timeout: 30_000});
        f.s4 = {answer: await L.pressRequeueAll(page)};
        await loaded;
        await page.locator('main').getByRole('row', {name: 'No Items', exact: true}).waitFor({timeout: 20_000});
        f.s4.notices = await L.notices(page);
        f.s4.page = await L.state(page);
        record('a6-4-first-tab-requeued', await screen(page));

        // 5: the second tab, still listing the 51, presses the same button.
        await second.bringToFront();
        f.s5 = {answer: await L.pressRequeueAll(second)};
        await second.getByRole('dialog', {name: 'Error'}).waitFor({timeout: 20_000});
        f.s5.page = await L.state(second);
        record('a6-5-error-window', await screen(second));
        await shot(second, 'a6-5-error-window').catch(() => {});

        // 6: "OK", then the page at once, 3 s and 10 s later.
        await L.pressOk(second);
        f.s6 = {atOnce: await L.state(second)};
        await second.waitForTimeout(3000);
        f.s6.after3s = await L.state(second);
        await second.waitForTimeout(7000);
        f.s6.after10s = await L.state(second);
        record('a6-6-after-ok', await screen(second));
        await shot(second, 'a6-6-after-ok').catch(() => {});
        f.dbAfter = {failedJobs: Number(require('../../../probe').sql(app, 'select count(*) from failed_jobs') || 0)};
    } finally {
        record('a6-facts', f);
        console.log(JSON.stringify(f, null, 1));
        await close();
    }
});
