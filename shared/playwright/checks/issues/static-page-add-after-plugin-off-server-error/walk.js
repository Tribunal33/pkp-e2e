// Issue report docs/issues/U09-A12-static-page-add-after-plugin-off-server-error.md (U09 A12):
// the report's Steps to reproduce, walked through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"), OJS and
// OMP (OPS ships no Static Pages plugin). The kit builds nothing.
// Fact keys follow the report's steps:
//   1–3. `dbarnes` opens Settings › Website › "Plugins", ticks "Static Pages Plugin"
//   4.   reloads Settings › Website: the "Static Pages" tab shows
//   5.   "Plugins" again, unticks "Static Pages Plugin", "OK"
//   6–7. without a reload, "Static Pages" tab › "Add Static Page": what answers
//   8.   control: a reload, the tab is gone
// Then a neighbour check (the fix must leave these alone):
//   n1.  the plugin ticked again: "Add Static Page" opens its window
//   n2.  another instance: a typed address naming no component at all
// neighbour.js beside it: a real grid's missing operation, and the grid's own requests, with the fix in and out.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir6 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir6 PROBE_AGENT=ir6 ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/static-page-add-after-plugin-off-server-error/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir6-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir6-3_5 PROBE_AGENT=ir6 ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/static-page-add-after-plugin-off-server-error/walk.js
// Facts: .reports/<feature>/ir6/walk-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('../setup-save-refused-disabled-block/lib');

const SP = 'staticpagesplugin';
const {T, sleep} = L;
const flat = (s, n = 400) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);

/** The top tabs of Settings › Website, by their labels. */
const topTabs = (page) => page.locator('[role="tablist"]').first().locator('[role="tab"]').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));

/** "Add Static Page" on the open "Static Pages" tab; returns the request's answer and what the screen shows. */
async function pressAdd(page) {
    const answered = page.waitForResponse((r) => /add-?static-?page/i.test(r.url()), {timeout: T});
    await page.locator('#staticPageGridContainer').getByRole('link', {name: 'Add Static Page', exact: true}).click();
    const r = await answered;
    let body = null;
    try { body = flat(await r.text(), 600); } catch { body = null; }
    await idle(page);
    await sleep(800);
    const dialogs = await page.locator('[role="dialog"]:visible').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 300)));
    const form = await page.locator('form#staticPageForm:visible').count();
    return {request: `${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`, status: r.status(), body, dialogs, formShown: form > 0};
}

/** Close whatever windows the press left open, by their own buttons. */
async function closeWindows(page) {
    for (let i = 0; i < 3; i++) {
        const err = page.locator('[role="dialog"]:visible').filter({hasText: 'An unexpected error'}).last();
        if (await err.count()) { await err.getByRole('button', {name: 'OK', exact: true}).click().catch(() => {}); await sleep(600); continue; }
        const close = page.locator('[role="dialog"]:visible').last().getByRole('button', {name: /^Close/}).first();
        if (await close.count()) { await close.click().catch(() => {}); await sleep(600); continue; }
        break;
    }
}

forEachApp(async (app) => {
    if (app.name === 'ops') { console.log('[walk] ops: no Static Pages plugin'); return; }
    const fact = (k, v) => { record('walk-facts', {[k]: v}, {merge: true}); console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 900)); };
    const snap = async (page, name) => { record(name, await screen(page)); await shot(page, name).catch(() => {}); };
    const {page} = await launch(app);
    const errs = L.scriptErrors(page);

    await signIn(page, 'dbarnes');                                                   // 1
    await L.openPlugins(app, page);                                                  // 2
    fact('3-enable', await L.setPluginEnabled(page, SP, true));                      // 3
    await L.openPlugins(app, page);                                                  // 4 (a reload of Settings › Website)
    fact('4-tabs', await topTabs(page));
    fact('5-disable', await L.setPluginEnabled(page, SP, false));                    // 5
    fact('6-tabs', await topTabs(page));                                             // 6
    await page.locator('#staticPages-button').click();
    await idle(page);
    await page.locator('#staticPageGridContainer').getByRole('link', {name: 'Add Static Page', exact: true}).waitFor({timeout: T});
    const log = L.serverLog(app);
    let from = log.size();
    fact('7-add', await pressAdd(page));                                             // 7
    fact('7-server-log', log.since(from, /error|exception|Stack|#0 /i).slice(0, 6));
    await snap(page, 'a12-7-add');
    await closeWindows(page);
    await page.reload();                                                             // 8 control
    await idle(page);
    fact('8-tabs-after-reload', await topTabs(page));

    // Neighbour checks
    await L.openPlugins(app, page);
    fact('n1-enable', await L.setPluginEnabled(page, SP, true));
    await L.openPlugins(app, page);
    await page.locator('#staticPages-button').click();
    await idle(page);
    const n1 = await pressAdd(page);
    fact('n1-add-enabled', {...n1, body: n1.body ? n1.body.slice(0, 120) : null});
    await closeWindows(page);
    from = log.size();
    const bogus = await page.goto(app.url(`/index.php/${app.contextPath}/$$$call$$$/grid/no-such/no-such-grid/fetch-grid`));
    fact('n2-unknown-component', {status: bogus.status(), body: flat(await page.locator('body').innerText().catch(() => ''), 300),
        log: log.since(from, /error|exception/i).slice(0, 3)});
    fact('scriptErrors-all', errs);
});
