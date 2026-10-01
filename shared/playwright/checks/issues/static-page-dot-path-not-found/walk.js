// Issue report docs/issues/U09-A10-static-page-dot-path-not-found.md (U09 A10):
// the report's Steps to reproduce, walked through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets").
// Static pages on OJS and OMP (OPS ships no Static Pages plugin); the
// custom page group on all three apps. The kit builds nothing.
// Fact keys follow the report's steps:
//   1–3.  `dbarnes` ticks "Static Pages Plugin", opens the "Static Pages" tab
//   4–6.  "Add Static Page" at `dot.only`, `deep/Mixed_1.x`, `one/two/three.x`
//   7.    the list's "Path" link for `dot.only`, then each address typed
//   8–9.  a "Custom Page" item at `nav.dot`, then its address typed
// Then a neighbour check (the fix must leave these alone):
//   n1.   `ab.out`, which no page holds: the router still opens "About the Journal" (the cleaned "about")
//   n2.   the "/en/" form of `dot.only` and `nav.dot` (the language part before the path)
//   n3.   a built-in page, `about/editorialMasthead`, and an unknown `no.such/page`
//
// Reset first:  npm run fleet-prep -- --feature issues-ir8 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir8 PROBE_AGENT=ir8 node bin/probe.js all shared/playwright/checks/issues/static-page-dot-path-not-found/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir8-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir8-3_5 PROBE_AGENT=ir8 node bin/probe.js all shared/playwright/checks/issues/static-page-dot-path-not-found/walk.js
// Facts: .reports/<feature>/ir8/walk-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('../setup-save-refused-disabled-block/lib');

const SP = 'staticpagesplugin';
const {T, sleep} = L;
const flat = (s, n = 300) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);

const PAGES = [
    ['dot.only', 'u09ir8 dot only'],
    ['deep/Mixed_1.x', 'u09ir8 deep'],
    ['one/two/three.x', 'u09ir8 third'],
];

/** What a page shows: its answer's status, the browser title, the main heading, the start of its text. */
async function reading(page, status) {
    const h1 = await page.locator('h1').first().innerText({timeout: 2000}).catch(() => null);
    const main = await page.locator('.pkp_structure_main').first().innerText({timeout: 2000}).catch(() => null);
    return {status, url: page.url().replace(/^https?:\/\/[^/]+/, ''), title: await page.title(), h1: flat(h1, 120),
        text: flat(main ?? await page.locator('body').innerText().catch(() => ''), 200)};
}

/** Type an address (with a language part when given) and read the page. */
async function open(app, page, rel, locale = '') {
    const r = await page.goto(app.url(`/index.php/${app.contextPath}${locale ? `/${locale}` : ''}/${rel}`));
    await idle(page).catch(() => {});
    return reading(page, r ? r.status() : null);
}

forEachApp(async (app) => {
    const {StaticPagesTab} = require('../../../pages/CustomContentPages.js');
    const {CustomPageWindow} = require('../../../pages/CustomContentPages.js');
    const {NavigationTab} = require('../../../pages/NavigationChromePages.js');
    const fact = (k, v) => { record('walk-facts', {[k]: v}, {merge: true}); console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 700)); };
    const snap = async (page, name) => { record(name, await screen(page)); await shot(page, name).catch(() => {}); };
    const {page} = await launch(app);
    const errs = L.scriptErrors(page);
    const log = L.serverLog(app);

    await signIn(page, 'dbarnes');                                                   // 1
    if (app.name !== 'ops') {
        await L.openPlugins(app, page);                                              // 2
        fact('2-enable', await L.setPluginEnabled(page, SP, true));
        const tab = new StaticPagesTab(page, app.contextPath);                       // 3 (a reload, then the tab)
        await tab.goto();
        await tab.tabButton.click();
        await tab.waitList();
        for (const [path, title] of PAGES) {                                         // 4–6
            const win = await tab.addPage();
            await win.pathInput.fill(path);
            await win.titleInput('en').fill(title);
            await win.content('en').type('u09ir8 text');
            const saved = await win.save();
            await win.form.waitFor({state: 'hidden', timeout: T}).catch(() => {});
            fact(`save-${path}`, {...saved, windowOpen: await win.form.isVisible()});
        }
        await sleep(500);
        fact('6-list', await tab.rowCells());
        await snap(page, 'a10-6-list');

        // 7: the list's own "Path" link for dot.only, in its new tab
        const [popup] = await Promise.all([
            page.context().waitForEvent('page', {timeout: T}),
            tab.pathLink('u09ir8 dot only').click(),
        ]);
        const answer = await popup.waitForEvent('response', {predicate: (r) => r.request().resourceType() === 'document', timeout: T}).catch(() => null);
        await popup.waitForLoadState('load');
        fact('7-link-dot.only', await reading(popup, answer ? answer.status() : null));
        await snap(popup, 'a10-7-link-dot-only');
        await popup.close();
        let from = log.size();
        for (const [path] of PAGES) fact(`7-typed-${path}`, await open(app, page, path));
        fact('7-server-log', log.since(from, /error|exception|Stack|#0 /i).slice(0, 6));
        await page.goto(app.url(`/index.php/${app.contextPath}/deep/Mixed_1.x`));
        await snap(page, 'a10-7-typed-deep');
    }

    // 8–9: a "Custom Page" item at nav.dot
    const nav = new NavigationTab(page, app.contextPath);
    await nav.goto();
    await nav.addItem();
    const win = new CustomPageWindow(page);
    await win.waitOpen();
    await win.chooseType('Custom Page');
    await win.pathInput.waitFor({timeout: T});
    await win.pathInput.fill('nav.dot');
    await win.typeTitle('en', 'u09ir8 nav dot');
    await win.blur();
    const saved = await win.save();
    fact('8-save-nav.dot', {status: saved.status, body: saved.body ? {status: saved.body.status} : null, windowOpen: await win.form.isVisible()});
    let from = log.size();
    fact('9-typed-nav.dot', await open(app, page, 'nav.dot'));
    fact('9-server-log', log.since(from, /error|exception|Stack|#0 /i).slice(0, 6));
    await snap(page, 'a10-9-typed-nav-dot');

    // Neighbour checks
    fact('n1-ab.out', await open(app, page, 'ab.out'));
    if (app.name !== 'ops') fact('n2-en-dot.only', await open(app, page, 'dot.only', 'en'));
    fact('n2-en-nav.dot', await open(app, page, 'nav.dot', 'en'));
    fact('n3-masthead', await open(app, page, 'about/editorialMasthead'));
    fact('n3-unknown', await open(app, page, 'no.such/page'));
    fact('scriptErrors-all', errs);
});
