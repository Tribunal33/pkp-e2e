// Issue report docs/issues/U09-A19-static-page-content-change-lost-on-close.md (U09 A19):
// the report's Steps to reproduce, walked through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets").
// Static pages on OJS and OMP (OPS ships no Static Pages plugin). The kit
// builds nothing. Fact keys follow the report's steps:
//   1–3.  `dbarnes` ticks "Static Pages Plugin", opens the "Static Pages" tab
//   4–6.  "Add Static Page", text in "Content" only, the back arrow; then "Add Static Page" again
//   7–9.  a saved page `u09ir9`, "Edit", text added in "Content" only, the back arrow; then "Edit" again
//   c.    the control: "x" in "Title" only, the back arrow (the question; "Cancel" keeps the window)
// The neighbour checks (the fix must not reach further) are neighbour.js.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir9 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir9 PROBE_AGENT=ir9 node bin/probe.js all shared/playwright/checks/issues/static-page-content-change-lost-on-close/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir9-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir9-3_5 PROBE_AGENT=ir9 node bin/probe.js all shared/playwright/checks/issues/static-page-content-change-lost-on-close/walk.js
// Facts: .reports/<feature>/ir9/walk-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib');

const SP = 'staticpagesplugin';
const {T, sleep} = L;

forEachApp(async (app) => {
    if (app.name === 'ops') { console.log('[walk] ops: no Static Pages plugin, nothing to walk'); return; }
    const {StaticPagesTab} = require('../../../pages/CustomContentPages.js');
    const fact = (k, v) => { record('walk-facts', {[k]: v}, {merge: true}); console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 700)); };
    const snap = async (page, name) => { record(name, await screen(page)); await shot(page, name).catch(() => {}); };
    const {page} = await launch(app);
    const errs = L.scriptErrors(page);

    await signIn(page, 'dbarnes');                                                   // 1
    await L.openPlugins(app, page);                                                  // 2
    fact('2-enable', await L.setPluginEnabled(page, SP, true));
    const tab = new StaticPagesTab(page, app.contextPath);                           // 3
    await tab.goto();
    await tab.tabButton.click();
    await tab.waitList();
    fact('3-list', {rows: await tab.rowCells(), empty: await tab.emptyRow.isVisible()});

    // Adding
    let win = await tab.addPage();                                                   // 4
    await win.content('en').type('u09ir9 a long text the manager has just written');   // 5
    fact('5-content-held', await L.editorText(page, win.content('en').textarea));
    await snap(page, 'a19-5-typed');
    fact('6-close', await L.closeWindow(page, win.closeButton, win.form, {answer: 'cancel'}));   // 6
    await snap(page, 'a19-6-after-close');
    if (await win.form.isVisible()) { fact('6-close-again', await L.closeWindow(page, win.closeButton, win.form)); }
    win = await tab.addPage();
    fact('6-reopened-content', await L.editorText(page, win.content('en').textarea));
    await win.closeButton.click();
    await win.form.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    fact('6-list', {rows: await tab.rowCells(), empty: await tab.emptyRow.isVisible()});

    // Editing
    win = await tab.addPage();                                                       // 7
    await win.pathInput.fill('u09ir9');
    await win.titleInput('en').fill('u09ir9 page');
    await win.content('en').type('u09ir9 first text');
    fact('7-save', await win.save());
    await win.form.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await sleep(500);
    fact('7-list', await tab.rowCells());
    win = await tab.editPage('u09ir9 page');                                         // 8
    await win.content('en').type(' and a second paragraph');
    fact('8-content-held', await L.editorText(page, win.content('en').textarea));
    fact('9-close', await L.closeWindow(page, win.closeButton, win.form, {answer: 'cancel'}));   // 9
    if (await win.form.isVisible()) { fact('9-close-again', await L.closeWindow(page, win.closeButton, win.form)); }
    await tab.goto();                                                                // the row's arrow is open: reload the list
    await tab.tabButton.click();
    await tab.waitList();
    win = await tab.editPage('u09ir9 page');
    fact('9-reopened-content', await L.editorText(page, win.content('en').textarea));
    await snap(page, 'a19-9-reopened');
    await win.closeButton.click();
    await win.form.waitFor({state: 'hidden', timeout: T}).catch(() => {});

    // Control: a change in "Title" only
    win = await tab.addPage();
    await win.titleInput('en').fill('x');
    await win.blur();
    const c = await L.closeWindow(page, win.closeButton, win.form, {answer: 'cancel'});
    fact('c-title-close', {...c, titleKept: await win.titleInput('en').inputValue().catch(() => null)});
    await snap(page, 'a19-c-title-cancelled');
    if (await win.form.isVisible()) fact('c-title-ok', await L.closeWindow(page, win.closeButton, win.form));
    fact('scriptErrors-all', errs);
});
