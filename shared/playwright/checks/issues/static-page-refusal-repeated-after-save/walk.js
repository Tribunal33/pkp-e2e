// Issue report docs/issues/U09-A11-static-page-refusal-repeated-after-save.md (U09 A11):
// the report's Steps to reproduce, walked through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets").
// Static pages on OJS and OMP (OPS ships no Static Pages plugin). The kit
// builds nothing. Fact keys follow the report's steps:
//   1–3.  `dbarnes` ticks "Static Pages Plugin", opens the "Static Pages" tab
//   4–5.  "Add Static Page", Path `u09ir12 about` refused; Path `u09ir12-about` saved
//   6–8.  "Add Static Page", Path `u09ir12-about` refused (taken); the back arrow; "Editor Dashboard", then Settings › Website
//   c.    the control: a page saved with no refusal before it (`u09ir12-third`)
// The neighbour check (the fix must not reach further) is neighbour.js.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir12 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir12 PROBE_AGENT=ir12 node bin/probe.js all shared/playwright/checks/issues/static-page-refusal-repeated-after-save/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir12-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir12-3_5 PROBE_AGENT=ir12 node bin/probe.js all shared/playwright/checks/issues/static-page-refusal-repeated-after-save/walk.js
// Facts: .reports/<feature>/ir12/walk-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib');

const SP = 'staticpagesplugin';
const {T, sleep} = L;

forEachApp(async (app) => {
    if (app.name === 'ops') { console.log('[walk] ops: no Static Pages plugin, nothing to walk'); return; }
    const {StaticPagesTab} = require('../../../pages/CustomContentPages.js');
    const fact = (k, v) => { record('walk-facts', {[k]: v}, {merge: true}); console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 900)); };
    const snap = async (page, name) => { await shot(page, name).catch(() => {}); };
    const {page} = await launch(app);
    const errs = L.scriptErrors(page);
    const fetches = L.watchFetches(page);
    page.on('dialog', async (d) => { await d.accept(); });

    await signIn(page, 'dbarnes');                                                   // 1
    await L.openPlugins(app, page);                                                  // 2
    fact('2-enable', await L.setPluginEnabled(page, SP, true));
    const tab = new StaticPagesTab(page, app.contextPath);                           // 3
    await tab.goto();
    await tab.tabButton.click();
    await tab.waitList();
    fact('3-list', {rows: await tab.rowCells(), empty: await tab.emptyRow.isVisible()});

    // A refusal, then a good save
    let win = await tab.addPage();                                                   // 4
    await win.pathInput.fill('u09ir12 about');
    await win.titleInput('en').fill('u09ir12 about');
    await win.content('en').type('u09ir12 text');
    const s4 = await L.noticesAfter(page, fetches, () => win.save());
    fact('4-refused', {...s4, open: await win.form.isVisible(), errors: await L.windowErrors(win)});
    await snap(page, 'a11-4-refused');
    await win.pathInput.fill('u09ir12-about');                                       // 5
    const s5 = await L.noticesAfter(page, fetches, async () => {
        const r = await win.save();
        await win.form.waitFor({state: 'hidden', timeout: T}).catch(() => {});
        return r;
    });
    fact('5-saved', {...s5, open: await win.form.isVisible().catch(() => false), rows: await tab.rowCells()});
    await snap(page, 'a11-5-saved');

    // A refusal, then the window closed
    win = await tab.addPage();                                                       // 6
    await win.pathInput.fill('u09ir12-about');
    await win.titleInput('en').fill('u09ir12 second');
    const s6 = await L.noticesAfter(page, fetches, () => win.save());
    fact('6-refused', {...s6, open: await win.form.isVisible(), errors: await L.windowErrors(win)});
    const s7 = await L.noticesAfter(page, fetches, async () => {                     // 7
        await win.closeButton.click();
        await win.form.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    });
    fact('7-closed', {...s7, open: await win.form.isVisible().catch(() => false), rows: await tab.rowCells()});
    const s8a = await L.noticesAfter(page, fetches, async () => {                    // 8
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
        await idle(page);
    });
    fact('8-submissions', {...s8a, url: page.url()});
    await snap(page, 'a11-8-submissions');
    const s8b = await L.noticesAfter(page, fetches, async () => {
        await tab.goto();
    });
    fact('8-website', {...s8b, url: page.url()});
    await snap(page, 'a11-8-website');

    // Control: a save with no refusal before it
    await tab.tabButton.click();
    await tab.waitList();
    win = await tab.addPage();
    await win.pathInput.fill('u09ir12-third');
    await win.titleInput('en').fill('u09ir12 third');
    const sc = await L.noticesAfter(page, fetches, async () => {
        const r = await win.save();
        await win.form.waitFor({state: 'hidden', timeout: T}).catch(() => {});
        return r;
    });
    fact('c-saved', {...sc, open: await win.form.isVisible().catch(() => false), rows: await tab.rowCells()});
    fact('scriptErrors-all', errs);
    await sleep(100);
});
