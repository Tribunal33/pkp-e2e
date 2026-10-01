// Issue report walk: docs/issues/U57-A3-language-block-lands-on-site-home.md
// (spec U57 register A3). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// which serves on a port of its own (127.0.0.1:<base+60+n>):
//   1-6  `rvaca` places "Language Toggle Block" under "Sidebar" on Settings ›
//        Website › "Appearance" › "Setup" and saves; signed out, "About the
//        Journal" (Press, Server), "Français" in the "Language" block.
//   7-12 `admin` creates a second journal (press, server) "u57w51 Journal"
//        on Administration › Hosted Journals, since a one-context site's
//        "Site Settings" have no "Appearance"; places the block in the site's
//        "Sidebar" (Administration › "Site Settings" › "Appearance" ›
//        "Setup"); signed out, the site's login page, "Français" in the block.
// Then the control and the neighbour checks, which a fix must leave as they
// are (or, for the block, bring to the expected page): `rvaca` choosing
// "Français" under "Change Language" in the user menu on Settings › Website;
// the block from the journal's home page, from a search result page with a
// query, and from the French "About" page back to "English".
// The kit builds nothing. Records every screen with screen(), each link's
// href, the redirect hops and where the browser landed.
//
// Run (main, then stable-3_5_0); reset the fleet first, the walk changes the
// dataset:
//   PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w51 --dataset 1 --reset
//   PROBE_FEATURE=issues-w51 PROBE_AGENT=w51 node bin/probe.js all shared/playwright/checks/issues/language-block-lands-on-site-home/walk.js
//   PATH=… PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w51-3_5 --dataset 1 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w51-3_5 PROBE_AGENT=w51 node bin/probe.js all shared/playwright/checks/issues/language-block-lands-on-site-home/walk.js
// With the fix applied (node bin/try-fix.js apply …/fix-<app>.diff <app>), run with PROBE_RUN=fix.
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const {createSecondContext, openAppearanceSetup, sidebarBoxes, placeBlockAndSave, languageBlock, chooseInBlock, changeLanguageInUserMenu} = require('./lib');

const FR = /^\s*fran/i;
const EN = /^\s*English\s*$/;

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const facts = {line: app.line || 'main', baseURL: app.baseURL};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const rel = (u) => (u ? String(u).replace(app.baseURL, '') : u);
    const ctx = app.contextPath;
    let n = 0;
    const snap = async (page, name, extra = {}) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}`, {...s, ...extra}); return s; };
    const choose = async (page, name, label) => {
        const r = await chooseInBlock(page, label);
        const out = {href: rel(r.href), hops: r.hops.map((h) => ({url: rel(h.url), status: h.status, location: rel(h.location)})), landed: rel(r.landed), lang: r.lang};
        await snap(page, name, {choice: out});
        return out;
    };

    try {
        // ---- the journal's sidebar (steps 1-6)
        {
            const {page, close} = await launch(app);
            try {
                await signIn(page, 'rvaca');                                                            // 1
                await idle(page);
                await openAppearanceSetup(page, app.url(`/index.php/${ctx}/en/management/settings/website`)); // 2
                fact('step2-sidebar-before', (await sidebarBoxes(page)).map((b) => `${b.label}:${b.checked}`));
                await snap(page, 'journal-appearance-setup');
                fact('step3-save', await placeBlockAndSave(page, 'languagetoggleblockplugin'));         // 3
                await snap(page, 'journal-appearance-setup-saved');
                await signOut(page);                                                                    // 4
                await page.goto(app.url(`/index.php/${ctx}/en/about`));                                 // 5
                await idle(page);
                fact('step5-about', {url: rel(page.url()), block: await languageBlock(page)});
                await snap(page, 'about-en');
                fact('step6-francais-from-about', await choose(page, 'after-francais-from-about', FR)); // 6
            } finally { await close(); }
        }

        // ---- the site's sidebar (steps 7-11)
        {
            const {page, close} = await launch(app);
            try {
                await signIn(page, 'admin');                                                            // 7
                await idle(page);
                const made = await createSecondContext(page, app, {path: 'u57w51', name: 'u57w51 Journal'}); // 8
                fact('step8-second-context', {status: made.status, landed: rel(made.landed)});
                await snap(page, 'second-context-created');
                await openAppearanceSetup(page, app.url('/index.php/index/en/admin/settings'));        // 9
                fact('step9-site-sidebar-before', (await sidebarBoxes(page)).map((b) => `${b.label}:${b.checked}`));
                await snap(page, 'site-appearance-setup');
                fact('step10-save', await placeBlockAndSave(page, 'languagetoggleblockplugin'));        // 10
                await signOut(page);                                                                    // 11
                await page.goto(app.url('/index.php/index/en/login'));
                await idle(page);
                fact('step11-site-login', {url: rel(page.url()), block: await languageBlock(page)});
                await snap(page, 'site-login-en');
                fact('step12-francais-from-site-login', await choose(page, 'after-francais-from-site-login', FR)); // 12
            } finally { await close(); }
        }

        // ---- control and neighbours (fresh browsers; the block stays placed)
        {
            const {page, close} = await launch(app);
            try {
                await signIn(page, 'rvaca');
                await page.goto(app.url(`/index.php/${ctx}/en/management/settings/website`));
                await idle(page);
                const r = await changeLanguageInUserMenu(page, FR);
                fact('control-change-language-from-settings', {href: rel(r.href), landed: rel(r.landed), lang: r.lang});
                await snap(page, 'control-change-language');
            } catch (e) {
                fact('control-change-language-from-settings', {error: String(e).slice(0, 300)});
            } finally { await close(); }
        }
        {
            const {page, close} = await launch(app);
            try {
                await page.goto(app.url(`/index.php/${ctx}/en`));
                await idle(page);
                fact('neighbour-francais-from-home', await choose(page, 'neighbour-from-home', FR));
                await page.goto(app.url(`/index.php/${ctx}/en/search/search?query=water`));
                await idle(page);
                fact('neighbour-francais-from-search', await choose(page, 'neighbour-from-search', FR));
                await page.goto(app.url(`/index.php/${ctx}/fr_CA/about`));
                await idle(page);
                fact('neighbour-english-from-french-about', await choose(page, 'neighbour-english-from-about', EN));
            } finally { await close(); }
        }
    } finally {
        record('facts', facts);
    }
});
