// Issue report docs/issues/U09-A3-static-page-no-breadcrumbs-or-main-heading.md (U09 A3):
// the report's Steps to reproduce, walked through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets").
// OJS and OMP (OPS ships no Static Pages plugin). The kit builds nothing.
// Fact keys follow the report's steps:
//   1–2.  `dbarnes` ticks "Static Pages Plugin"
//   3.    "Add Static Page": `u09ir13-about`, "u09ir13 About us"
//   4.    a "Custom Page" navigation item: `u09ir13-policies`, "u09ir13 Policies"
//   5–6.  signed out, each page's address: breadcrumbs and headings
// Then a neighbour check (the fix must leave these alone, or reach them on purpose):
//   n1.   the journal's home page and "About the Journal": their headings unchanged
//   n2.   `dbarnes`: the static page window's "Preview" (the same template: gains them with the fix)
//
// Reset first:  npm run fleet-prep -- --feature issues-ir13 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir13 PROBE_AGENT=ir13 node bin/probe.js all shared/playwright/checks/issues/static-page-no-breadcrumbs-or-main-heading/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir13-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir13-3_5 PROBE_AGENT=ir13 node bin/probe.js all shared/playwright/checks/issues/static-page-no-breadcrumbs-or-main-heading/walk.js
// Facts: .reports/<feature>/ir13/walk-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const L = require('../setup-save-refused-disabled-block/lib');

const SP = 'staticpagesplugin';
const {T, sleep} = L;

/** What a visitor's page offers: the browser title, the breadcrumbs, every heading in page order. */
async function outline(page) {
    return page.evaluate(() => {
        const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const bc = document.querySelector('nav.cmp_breadcrumbs');
        const heads = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')];
        return {
            title: document.title,
            breadcrumbs: bc ? flat(bc.innerText) : null,
            h1: heads.filter((h) => h.tagName === 'H1').map((h) => flat(h.textContent)),
            headings: heads.map((h) => `${h.tagName.toLowerCase()}${h.className ? `.${h.className.split(/\s+/).join('.')}` : ''}: ${flat(h.textContent).slice(0, 80)}`),
        };
    });
}

/** Type an address and read the page. */
async function open(app, page, rel) {
    const r = await page.goto(app.url(`/index.php/${app.contextPath}/${rel}`));
    await idle(page).catch(() => {});
    return {status: r ? r.status() : null, ...(await outline(page))};
}

forEachApp(async (app) => {
    if (app.name === 'ops') { console.log('[walk] ops: no Static Pages plugin, skipped'); return; }
    const {StaticPagesTab, StaticPageWindow, CustomPageWindow} = require('../../../pages/CustomContentPages.js');
    const {NavigationTab} = require('../../../pages/NavigationChromePages.js');
    const fact = (k, v) => { record('walk-facts', {[k]: v}, {merge: true}); console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 700)); };
    const snap = async (page, name) => { record(name, await screen(page)); await shot(page, name).catch(() => {}); };
    const {page} = await launch(app);
    const errs = L.scriptErrors(page);

    await signIn(page, 'dbarnes');                                                   // 1
    await L.openPlugins(app, page);                                                  // 2
    fact('2-enable', await L.setPluginEnabled(page, SP, true));

    const tab = new StaticPagesTab(page, app.contextPath);                           // 3 (a reload, then the tab)
    await tab.goto();
    await tab.tabButton.click();
    await tab.waitList();
    const sp = await tab.addPage();
    await sp.pathInput.fill('u09ir13-about');
    await sp.titleInput('en').fill('u09ir13 About us');
    await sp.content('en').type('Welcome to our journal.');
    const spSaved = await sp.save();
    await sp.form.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    fact('3-save-static', {...spSaved, windowOpen: await sp.form.isVisible()});

    const nav = new NavigationTab(page, app.contextPath);                            // 4
    await nav.goto();
    await nav.addItem();
    const cp = new CustomPageWindow(page);
    await cp.waitOpen();
    await cp.chooseType('Custom Page');
    await cp.pathInput.waitFor({timeout: T});
    await cp.typeTitle('en', 'u09ir13 Policies');
    await cp.pathInput.fill('u09ir13-policies');
    await cp.content('en').type('Our policies.');
    await cp.blur();
    const cpSaved = await cp.save();
    fact('4-save-custom', {status: cpSaved.status, body: cpSaved.body ? {status: cpSaved.body.status} : null, windowOpen: await cp.form.isVisible()});

    await signOut(page);                                                             // 5–6
    fact('5-static-page', await open(app, page, 'u09ir13-about'));
    await snap(page, 'a3-5-static-page');
    fact('6-custom-page', await open(app, page, 'u09ir13-policies'));
    await snap(page, 'a3-6-custom-page');

    // Neighbour checks
    fact('n1-home', await open(app, page, ''));
    fact('n1-about', await open(app, page, 'about'));
    await signIn(page, 'dbarnes');
    await tab.goto();
    await tab.tabButton.click();
    await tab.waitList();
    const ed = await tab.editPage('u09ir13 About us');
    const win = ed instanceof StaticPageWindow ? ed : new StaticPageWindow(page);
    const popup = await win.preview();
    await idle(popup).catch(() => {});
    fact('n2-static-preview', await outline(popup));
    await snap(popup, 'a3-n2-static-preview');
    await popup.close();
    await sleep(300);
    fact('scriptErrors-all', errs);
});
