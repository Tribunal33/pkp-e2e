// Issue report docs/issues/U07-A9-for-readers-privacy-link-opens-submissions.md (U07 A9): the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"), OJS and OMP (OPS has no Information pages).
// The report's Steps 1-4 are s3-s6 below; s1-s2 read the dataset journal's stored link first.
//
//   The dataset's journal (not signed in)
//   1. /publicknowledge/information/readers (the address the sidebar's "Information" block links
//      to once a manager places it; the dataset's sidebar has no blocks)
//   2. read the "Privacy Statement" link's address and follow it (the dataset's stored links
//      name http://localhost, the build's address: the walk opens the same path on the fleet)
//   A new journal (press)
//   3. admin › Administration › Hosted … › "Create …": u07c, English, enabled publicly
//   4. sign out; /u07c/information/readers
//   5. press "Privacy Statement"
//   Control
//   6. the top menu's "About" › "Privacy Statement"
//
// MODE=nb runs only the neighbour (for the fix trial): a journal (press) "u07cnb" created on
// screen, its "For Readers" and "For Authors" links other than "Privacy Statement" read (the fix
// must leave them alone), and the dataset journal's stored "For Readers" link (the fix does not
// rewrite stored texts).
//
// MODE=reload runs only the reload check: as admin, Settings › Website › "Setup" › "Languages",
// the English row › "Reload defaults" on publicknowledge, then its "For Readers" link (the fix
// reaches a stored text this way).
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u07c --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u07c PROBE_AGENT=u07c node bin/probe.js all shared/playwright/checks/issues/for-readers-privacy-link-opens-submissions/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u07c-3_5 PROBE_AGENT=u07c node bin/probe.js all (same script)
// Fix trial:    node bin/try-fix.js apply fix-ojs.diff ojs; … fix-omp.diff omp; PROBE_RUN=fix, then MODE=nb PROBE_RUN=nb-in; revert; MODE=nb PROBE_RUN=nb-out (a reset before each)
// Facts: .reports/<feature>/u07c/walk[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, record, screen} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    if (app.name === 'ops') return; // no Information pages on a preprint server
    const f = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const P = app.contextPath;
    const NEW = MODE === 'nb' ? 'u07cnb' : 'u07c';
    const noun = app.name === 'omp' ? 'Press' : 'Journal';
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const step = async (key, fn) => {
        try { f.steps[key] = await fn(); } catch (e) { f.steps[key] = {error: String(e.message || e).slice(0, 400)}; }
    };
    try {
        if (MODE === 'reload') {
            const {reloadDefaults} = require('../french-default-texts-stored-as-codes/lib');
            await step('r1-reload', async () => {
                await signIn(page, 'admin');
                const r = await reloadDefaults(page, app, P, 'en');
                record('r1-reload', await screen(page));
                await signOut(page);
                return r;
            });
            await step('r2-for-readers', async () => {
                await page.goto(app.url(`/index.php/${P}/information/readers`));
                const r = await L.landing(page);
                r.links = await L.contentLinks(page);
                return r;
            });
            return;
        }
        // The dataset's journal
        await step('s1-for-readers', async () => {
            await page.goto(app.url(`/index.php/${P}/information/readers`));
            const r = await L.landing(page);
            r.links = await L.contentLinks(page);
            record('s1-for-readers', await screen(page));
            return r;
        });
        await step('s2-privacy-link', async () => {
            const href = await page.locator('.page_information .description').getByRole('link', {name: 'Privacy Statement'}).getAttribute('href');
            const u = new URL(href);
            await page.goto(app.url(u.pathname + u.hash));
            const r = await L.landing(page, u.hash.slice(1) || null);
            record('s2-privacy-link', await screen(page));
            return {href, ...r};
        });
        if (MODE === 'nb') {
            f.steps.n0storedLink = f.steps['s2-privacy-link'] && f.steps['s2-privacy-link'].href;
        }
        // A new journal
        await step('s3-create', async () => {
            await signIn(page, 'admin');
            const status = await L.createEnabledContext(page, app, {name: `${NEW} ${noun}`, initials: NEW, path: NEW, email: `${NEW}@mailinator.com`});
            record('s3-create', await screen(page));
            await signOut(page);
            return {status, url: page.url()};
        });
        await step('s4-for-readers', async () => {
            await page.goto(app.url(`/index.php/${NEW}/information/readers`));
            const r = await L.landing(page);
            r.links = await L.contentLinks(page);
            record('s4-for-readers', await screen(page));
            return r;
        });
        if (MODE === 'nb') {
            await step('n1-for-authors', async () => {
                await page.goto(app.url(`/index.php/${NEW}/information/authors`));
                const r = await L.landing(page);
                r.links = await L.contentLinks(page);
                return r;
            });
        } else {
            await step('s5-privacy-link', async () => {
                const link = page.locator('.page_information .description').getByRole('link', {name: 'Privacy Statement'});
                const href = await link.getAttribute('href');
                await link.click();
                await page.waitForLoadState('load');
                const r = await L.landing(page, new URL(page.url()).hash.slice(1) || 'none');
                record('s5-privacy-link', await screen(page));
                return {href, ...r};
            });
            await step('s6-menu-privacy', async () => {
                const about = page.locator('.pkp_navigation_primary').getByRole('link', {name: 'About', exact: true});
                await about.hover();
                const link = page.locator('.pkp_navigation_primary').getByRole('link', {name: 'Privacy Statement', exact: true});
                const href = await link.getAttribute('href');
                await link.click();
                await page.waitForLoadState('load');
                const r = await L.landing(page);
                record('s6-menu-privacy', await screen(page));
                return {href, ...r};
            });
        }
    } finally {
        record('walk', f);
        await close();
    }
});
