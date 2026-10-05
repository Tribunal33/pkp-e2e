// pkp-lib#12016 (cb32f21f94, for issue pkp/pkp-lib#11583): on `main` a configuration file with no
// `strict` line runs in strict mode (`Config::getVar('general', 'strict', true)`), where 3.5 and 3.4
// read it as Off. Report docs/reports/2026-10-05-pkp-lib-12016.md. Takes the report's Steps on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), every app: signed in as
// `dbarnes`, the editorial dashboard's "Search submissions" box, a word of one of the dataset's
// titles ("cashmere" on OJS and OPS, "Imagined" on OMP).
//
// MODE=noline (default): the script removes the `strict` line from the fleet's config file for the
// run and puts the file back afterwards (a configuration file written for 3.3 has no such line).
// MODE=off: the file as the reset writes it (`strict = Off`), the control.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset 1 --reset
// Run:          MODE=noline PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/sync/pkp-lib-12016/no-strict-line.js
// Fixed when `search.heading` reads "Search Results (1)" with MODE=noline (as with MODE=off), and
// the `_submissions?searchPhrase=` answer is 200.
// 3.5 (the control side): PKP_E2E_LINE=stable-3_5_0 in front of both commands; its box sits above
// the "All Active" list.
// Facts: .reports/<feature>/<id>/facts-<mode>-<app>.json
const fs = require('fs');
const {forEachApp, launch, signIn, record, outFile, idle} = require('../../../probe');
const L = require('../../issues/library-delete-strict-mode-error/lib.js');

const MODE = process.env.MODE || 'noline';
const PHRASE = {ojs: 'cashmere', omp: 'Imagined', ops: 'cashmere'};

/**
 * 3.5's dashboard has the "Search submissions" box above the list rather than in the side menu:
 * the "All Active" view, the phrase typed and Enter pressed, read as main's reader reads it.
 */
async function search35(page, app, phrase) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?currentViewId=active`));
    await idle(page);
    const box = page.getByRole('searchbox', {name: /^Search submissions/}).first();
    await box.click({timeout: 30_000});
    await box.pressSequentially(phrase, {delay: 25});
    await box.press('Enter');
    await L.sleep(1_500);
    await idle(page);
    return {
        heading: L.flat(await page.locator('#app-main h1, main h1').first().innerText().catch(() => null), 120),
        rows: (await page.locator('#app-main table tbody tr, main table tbody tr').allInnerTexts().catch(() => []))
            .slice(0, 6).map((t) => L.flat(t, 120)),
    };
}

forEachApp(async (app) => {
    if (!app.dataset || !app.configFile) throw new Error('no-strict-line.js runs on a dataset fleet');
    const original = fs.readFileSync(app.configFile, 'utf8');
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    try {
        if (MODE === 'noline') fs.writeFileSync(app.configFile, original.replace(/^strict\s*=.*\n/m, ''));
        const cfg = fs.readFileSync(app.configFile, 'utf8');
        facts.strictLine = (cfg.match(/^strict\s*=.*$/m) || [null])[0];
        const {page, close} = await launch(app);
        const net = L.watchCalls(page, /_submissions\?/);
        try {
            await signIn(page, 'dbarnes');
            net.step = 'search';
            facts.search = app.line === 'stable-3_5_0'
                ? await search35(page, app, PHRASE[app.name])
                : await L.dashboardSearch(page, app, PHRASE[app.name]);
            facts.search.calls = net.since('search').filter((c) => /searchPhrase=/.test(c.url))
                .map((c) => ({status: c.status, url: c.url, body: c.body.slice(0, 200)}));
            record(`search-${MODE}-${app.name}`, facts.search);
        } finally {
            await close();
        }
    } finally {
        fs.writeFileSync(app.configFile, original);
        fs.writeFileSync(outFile(`facts-${MODE}-${app.name}.json`), JSON.stringify(facts, null, 2));
        console.log('[fact]', JSON.stringify(facts).slice(0, 1200));
    }
});
