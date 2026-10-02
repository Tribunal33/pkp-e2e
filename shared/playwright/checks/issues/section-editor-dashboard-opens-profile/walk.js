// Issue report docs/issues/U08-A2-section-editor-dashboard-opens-profile.md (U08 A2, U05 A3):
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), as the dataset's `dbuskins` (Section editor;
// Series editor on OMP, Moderator on OPS) and `dbarnes` (Journal editor, the control), on its own
// context `publicknowledge`. Helpers: lib.js. The kit builds nothing.
//
// WALK_MODE=steps (default):
//   1. dbuskins signs in on the journal's login page: where it lands, the "Tasks" bell
//   2. the journal's home page
//   3n. the same page in an 800 px window, "Open Menu": the user menu's entries as displayed
//       (below 992 px the theme shows the count after "Dashboard" and hides the one after the name)
//   3. back at full width: the name in the header's user menu (and its count, if any), pressed open
//   4. press the name, then "Dashboard": where it lands
//   5. control: dbarnes, steps 1-4
// WALK_MODE=neighbour (runs alone; the fix must leave these as they are):
//   N1 an Author (ccorino; aclark on OMP): steps 1-4, the count after "Dashboard" and My Submissions
//   N2 jjanssen (Reviewer; OJS and OMP, the OPS dataset has no reviewer): steps 1-4, the count and the
//      review assignments
//   N3 dbuskins and N4 dbarnes on a site-level public page ("About this Publishing System" at the site's
//      address, /index.php/index/en/about/aboutThisPublishingSystem; with one journal the site's home page
//      redirects to it): the page loads, the user menu, "Dashboard" opens the Profile page for both (Rule 19c)
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u08c --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u08c PROBE_AGENT=u08c node bin/probe.js all shared/playwright/checks/issues/section-editor-dashboard-opens-profile/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 … fleet-prep -- --feature issues-u08c-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u08c-3_5 PROBE_AGENT=u08c node bin/probe.js all <this file>
// Neighbour:    WALK_MODE=neighbour PROBE_RUN=nb-out … (and nb-in with the fix applied)
// Facts: .reports/<feature>/u08c/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.WALK_MODE || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 900)}`);
    };
    const snap = async (page, name) => {
        record(name, await screen(page));
        await shot(page, name).catch(() => {});
    };
    const step = async (name, fn) => {
        try {
            return await fn();
        } catch (e) {
            const v = {failed: String(e).split('\n')[0].slice(0, 300)};
            fact(`${name} FAILED`, v);
            return v;
        }
    };

    const {page, close} = await launch(app);
    // Steps 1-4 for one user.
    const walkUser = async (key, username) => {
        await signIn(page, username, {contextPath: ctx});
        const landed = await step(`${key} 1 sign in`, () => L.readBell(page));
        await snap(page, `${key}-1-signed-in`);
        const home = await step(`${key} 2 home`, () => L.openPublic(page, app, `/index.php/${ctx}/en`));
        const narrow = await step(`${key} 3n narrow window`, () => L.readUserMenuNarrow(page));
        const menu = await step(`${key} 3 user menu`, () => L.readUserMenu(page));
        await snap(page, `${key}-3-user-menu`);
        const dashboard = await step(`${key} 4 Dashboard`, () => L.pressDashboard(page));
        await snap(page, `${key}-4-dashboard`);
        fact(key, {signedIn: landed, home, narrow, menu, dashboard});
    };
    // A site-level public page: the user menu, then "Dashboard".
    const walkSite = async (key, username) => {
        await signIn(page, username, {contextPath: ctx});
        const site = await step(`${key} site page`, () => L.openPublic(page, app, '/index.php/index/en/about/aboutThisPublishingSystem'));
        const menu = site.header ? await step(`${key} site user menu`, () => L.readUserMenu(page)) : null;
        await snap(page, `${key}-site-user-menu`);
        const dashboard = menu && !menu.failed ? await step(`${key} site Dashboard`, () => L.pressDashboard(page)) : null;
        fact(key, {site, menu, dashboard});
    };
    try {
        if (MODE === 'steps') {
            await walkUser('dbuskins', 'dbuskins');
            await walkUser('control dbarnes', 'dbarnes');
        } else {
            const author = app.name === 'omp' ? 'aclark' : 'ccorino';
            await walkUser(`N1 ${author}`, author);
            if (app.name !== 'ops') await walkUser('N2 jjanssen', 'jjanssen');
            await walkSite('N3 dbuskins site', 'dbuskins');
            await walkSite('N4 dbarnes site', 'dbarnes');
        }
    } finally {
        record('facts', facts);
        await close();
    }
});
