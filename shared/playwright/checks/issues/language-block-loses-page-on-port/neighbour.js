// Neighbour check for the fix of docs/issues/U57-A3-language-block-loses-page-on-port.md
// (U57 A3), walked with the fix in and out: the paths the fix must leave working.
//   n1. `dbarnes` places "Language Toggle Block"; signed out, the journal's home › "français"
//       (the bare context address the router's replacement must still match)
//   n2. a search result page (`search/search?query=lactation`) › "English"
//       (from French back to English, the query kept)
//       then the browser's Back: which page, in which language, with which search terms
//   n4. "About" › "français", then Back (the way round the report names)
//   n3. `dbarnes`, dashboard, initials menu › "Change Language" › "français"
//       (the editorial menu, which the fix does not touch)
//
// Reset first:  npm run fleet-prep -- --feature issues-u2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u2 PROBE_AGENT=u2 [PROBE_RUN=fix] node bin/probe.js all shared/playwright/checks/issues/language-block-loses-page-on-port/neighbour.js
// Facts: .reports/<feature>/u2/neighbour-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, record, idle} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const ctx = app.contextPath;
    const fact = (k, v) => { record('neighbour-facts', {[k]: v}, {merge: true}); console.log('[neighbour]', app.name, k, JSON.stringify(v).slice(0, 700)); };
    const {page} = await launch(app);

    await signIn(page, 'dbarnes');
    await L.openSidebarList(app, page, ctx);
    fact('n0-save', await L.placeLanguageBlock(page));
    await signOut(page);
    await page.goto(app.url(`/index.php/${ctx}/en`));
    await idle(page);
    fact('n1-home', await L.chooseInBlock(page, 'français'));
    await page.goto(app.url(`/index.php/${ctx}/fr_CA/search/search?query=lactation`));
    await idle(page);
    fact('n2-search', await L.chooseInBlock(page, 'English'));
    fact('n2-back', await L.goBack(page));
    await page.goto(app.url(`/index.php/${ctx}/en/about`));
    await idle(page);
    fact('n4-about', await L.chooseInBlock(page, 'français'));
    fact('n4-back', await L.goBack(page));

    await signIn(page, 'dbarnes');
    await page.goto(app.url(`/index.php/${ctx}/en/dashboard/editorial`));
    await idle(page);
    const before = L.rel(page.url());
    await L.changeLanguage(page, /^\s*fran/i, 'fr_CA');
    fact('n3-change-language', {from: before, landed: L.rel(page.url()), title: await page.title()});
});
