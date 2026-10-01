// Issue report docs/issues/U57-A3-language-block-loses-page-on-port.md (U57 A3):
// the report's Steps to reproduce, walked through the screens on PKP's default
// test dataset (a dataset fleet, harness.md "Dataset fleets"), whose server
// answers on an address with a port of its own. The kit builds nothing.
// Fact keys carry the report's step numbers:
//   1–5.  `dbarnes` places "Language Toggle Block"; signed out, "About" › "français"
//   6–9.  `admin` creates a second journal, places the block in the site's sidebar;
//         signed out, the site's "Login" › "français"
//   c.    control: `dbarnes`, dashboard, initials menu › "Change Language" › "Français"
//
// Reset first:  npm run fleet-prep -- --feature issues-u2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u2 PROBE_AGENT=u2 node bin/probe.js all shared/playwright/checks/issues/language-block-loses-page-on-port/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u2-3_5 PROBE_AGENT=u2 node bin/probe.js all shared/playwright/checks/issues/language-block-loses-page-on-port/walk.js
// Facts: .reports/<feature>/u2/walk-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const ctx = app.contextPath;
    const fact = (k, v) => { record('walk-facts', {[k]: v}, {merge: true}); console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 900)); };
    const snap = async (page, name) => { record(name, await screen(page)); await shot(page, name).catch(() => {}); };
    const {page} = await launch(app);
    fact('0-base', app.baseURL);

    // Journal pages
    await signIn(page, 'dbarnes');                                                   // 1
    await L.openSidebarList(app, page, ctx);                                         // 2
    fact('2-save', await L.placeLanguageBlock(page));
    await signOut(page);                                                             // 3
    await page.goto(app.url(`/index.php/${ctx}/en/about`));                          // 4
    await idle(page);
    fact('4-about', {url: L.rel(page.url()), title: await page.title(), block: await L.readBlock(page)});
    await snap(page, 'a3-4-about');
    fact('5-chosen', await L.chooseInBlock(page, 'français'));                       // 5
    await snap(page, 'a3-5-landed');

    // Site pages (the site's sidebar is offered once the site hosts two journals)
    await signIn(page, 'admin');                                                     // 6
    fact('6-create', await L.createPublicContext(page, app, {name: 'u57u2 Second', initials: 'u57u2', path: 'u57u2', email: 'u57u2@mailinator.com'}));
    await L.openSiteSidebarList(app, page);                                          // 7
    fact('7-save', await L.placeLanguageBlock(page, {site: true}));
    await signOut(page);                                                             // 8
    await page.goto(app.url('/index.php/index/en/login'));
    await idle(page);
    fact('8-login', {url: L.rel(page.url()), title: await page.title(), block: await L.readBlock(page)});
    await snap(page, 'a3-8-site-login');
    fact('9-chosen', await L.chooseInBlock(page, 'français'));                       // 9
    await snap(page, 'a3-9-landed');

    // Control: "Change Language" on an editorial screen
    await signIn(page, 'dbarnes');
    await page.goto(app.url(`/index.php/${ctx}/en/dashboard/editorial`));
    await idle(page);
    const before = L.rel(page.url());
    await L.changeLanguage(page, /^\s*fran/i, 'fr_CA');
    fact('c-change-language', {from: before, landed: L.rel(page.url()), title: await page.title()});
});
