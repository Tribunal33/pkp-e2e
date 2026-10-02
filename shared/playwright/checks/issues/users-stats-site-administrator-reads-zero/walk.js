// Issue report docs/issues/U65-A6-users-stats-site-administrator-reads-zero.md (U65 A6): the report's
// Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"). The kit builds nothing; nothing is changed, the page is only read.
//
// Default mode (the three apps), as `admin` (the site administrator, also the context's manager):
//   the context's dashboard, then the side menu's "Statistics" › "Users" (the address when the menu
//   has no such entry, recorded), then the "Registered users" table read.
// `neighbour` as the argument (the fix in and out; runs alone), as `rvaca` (a manager who is not a
//   site administrator): the same page read, so the rows other than "Site Administrator" can be
//   compared across the two runs.
// Each step records what it finds rather than throwing, so the same script reads the fix.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir6 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir6 PROBE_AGENT=ir6 node bin/probe.js all shared/playwright/checks/issues/users-stats-site-administrator-reads-zero/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir6-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir6-3_5 PROBE_AGENT=ir6 node bin/probe.js all shared/playwright/checks/issues/users-stats-site-administrator-reads-zero/walk.js
// Facts: .reports/<feature>/ir6/facts[-neighbour][-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle, serverLog} = require('../../../probe');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : 'steps';
const T = 30_000;
const flat = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

/** The "Registered users" table: its column names and `[name, total]` rows. */
async function readUsers(page) {
    const table = page.getByRole('table', {name: 'Registered users'});
    try {
        await table.locator('tbody tr').first().waitFor({state: 'visible', timeout: T});
    } catch (e) {
        return {error: flat(e.message).slice(0, 200)};
    }
    const columns = (await table.locator('thead th').allInnerTexts()).map(flat);
    const rows = [];
    for (const r of await table.locator('tbody tr').all()) rows.push((await r.locator('td, th').allInnerTexts()).map(flat));
    return {columns, rows};
}

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const log = serverLog(app);
    const from = log.mark();
    const locale = app.line === 'stable-3_4_0' || app.line === 'stable-3_3_0' ? '' : '/en';
    const ctx = `/index.php/${app.contextPath}${locale}`;
    const facts = {mode: MODE, line: app.line, dataset: app.dataset};
    try {
        const user = MODE === 'steps' ? 'admin' : 'rvaca';
        facts.user = user;
        await signIn(page, user);
        // Step 2: the context's dashboard.
        await page.goto(app.url(`${ctx}/dashboard/editorial`));
        await idle(page);
        facts.dashboard = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), title: await page.title()};
        // Step 3: the side menu's "Statistics" › "Users".
        const link = page.locator('nav a[href*="stats/users"]').first();
        if (!(await link.isVisible().catch(() => false))) {
            await page.locator('nav').getByRole('button', {name: 'Statistics', exact: true})
                .or(page.locator('nav').getByText('Statistics', {exact: true})).first().click().catch(() => {});
            await page.waitForTimeout(500);
        }
        if (await link.isVisible().catch(() => false)) {
            facts.menuEntry = flat(await link.innerText());
            await link.click();
            await page.waitForURL(/stats\/users/, {timeout: T}).catch(() => {});
        } else {
            facts.menuEntry = null;
            await page.goto(app.url(`${ctx}/stats/users`));
        }
        await idle(page);
        facts.page = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), title: await page.title()};
        // Step 4: the table.
        facts.table = await readUsers(page);
        record(`${MODE}-users`, await screen(page));
        await shot(page, `${MODE}-users`);
    } catch (e) {
        facts.error = flat(e.message).slice(0, 400);
    } finally {
        facts.serverErrors = log.since(from);
        record(MODE === 'steps' ? 'facts' : 'facts-neighbour', facts);
        await close();
    }
});
