// U08 A22 walk: a Site Administrator holding Reader alone in a journal opens its editorial pages.
// On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), context
// `publicknowledge`, users of the dataset only; the kit builds nothing.
//   steps (default): `admin` ticks "Reader" on View Profile › "Roles", removes their own
//     "Journal manager" ("Press manager", "Preprint Server manager") role on Settings › Users &
//     Roles › Users › "Edit" › "Remove Role", then opens "Editor Dashboard", "Tools", "DOIs",
//     "Statistics" › "Articles" and "Settings" › "Website": each page's Error window, side menu
//     and the side menu's count request. Step 7 runs only when "Editor Dashboard" lists
//     "Active submissions" (fix.diff applied): that view and its first submission's "View".
//   noreader: the same without step 2: "Remove Role" on the last role is refused ("You cannot
//     remove the role. At least one role must be assigned to the user."), so the pages read as a
//     manager's.
//   nb: the neighbour check, alone: `rvaca` (manager), `dbuskins` (section editor) and an author
//     open "Editor Dashboard": the same reads.
// Reset first:  npm run fleet-prep -- --feature issues-u08e --dataset 1 --reset
// Run:          PROBE_FEATURE=issues-u08e PROBE_AGENT=u08e node bin/probe.js all shared/playwright/checks/issues/admin-without-role-dashboard-error/walk.js [noreader|nb]
// 3.5:          PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u08e-3_5 PROBE_AGENT=u08e node bin/probe.js all …/walk.js
const {forEachApp, launch, signIn, signOut, record, screen} = require('../../../probe');
const {CASES, readPage, tickReader} = require('./lib.js');
const U = require('../remove-user-upcoming-role-error/lib.js');

const MODE = process.argv[2] || 'steps';

forEachApp(async (app) => {
    const c = CASES[app.name];
    const at = (path) => app.url(`/index.php/${app.contextPath}/en/${path}`);
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    try {
        if (MODE === 'nb') {
            for (const who of ['rvaca', 'dbuskins', c.author]) {
                await signIn(page, who);
                facts[who] = await readPage(page, at('dashboard/editorial'), `nb-${who}`);
                record(`nb-${who}`, facts[who]);
                await signOut(page);
            }
            record('nb', facts);
            return;
        }
        // 1. Sign in as admin.
        await signIn(page, 'admin');
        facts.before = await readPage(page, at('dashboard/editorial'), '00-before');
        // 2. View Profile › Roles: tick Reader, Save (skipped in mode `noreader`).
        if (MODE !== 'noreader') facts.reader = await tickReader(page, app);
        // 3-4. Users & Roles › Users › admin › Edit › Remove Role on the manager role.
        const list = await U.openList(page, app);
        const row = await U.findRow(page, list, 'admin', 'pkpadmin@mailinator.com');
        facts.rolesBefore = await U.rolesPage(page, list, row);
        facts.remove = await U.removeRole(page, c.managerRole);
        // 5-6. The editorial pages.
        const pages = [
            ['05-dashboard', 'dashboard/editorial'],
            ['06-tools', 'management/tools'],
            ['06-dois', 'dois'],
            ['06-statistics', 'stats/publications/publications'],
            ['06-settings-website', 'management/settings/website'],
        ];
        facts.pages = {};
        for (const [name, path] of pages) {
            const out = await readPage(page, at(path), name);
            record(name, out);
            facts.pages[name] = {status: out.status, url: out.url, errorWindow: out.errorWindow, denied: out.denied, heading: out.heading, viewsCount: out.viewsCount.map((v) => v.status), menu: out.menu.text};
        }
        // 7. Only when "Editor Dashboard" lists "Active submissions" (the fix): open that view and
        // its first submission; record the list, the workflow window and the API answers.
        if (/Active submissions/.test(facts.pages['05-dashboard'].menu || '')) {
            const apis = [];
            const onResponse = (r) => /\/api\/v1\/(submissions|_submissions)/.test(r.url()) && apis.push(`${r.status()} ${r.url().replace(/.*index\.php/, '').split('?')[0]}`);
            page.on('response', onResponse);
            const active = await readPage(page, at('dashboard/editorial?currentViewId=active'), '07-active');
            record('07-active', active);
            facts.active = {errorWindow: active.errorWindow, heading: active.heading};
            const view = page.getByRole('button', {name: /^View/}).first();
            if (await view.count()) {
                await view.click();
                const wf = page.getByRole('dialog').first();
                await wf.waitFor({timeout: 30_000}).catch(() => {});
                await page.waitForTimeout(3000);
                const s = await screen(page);
                record('07-workflow', s);
                facts.workflow = {dialog: (s.text.dialog || '').replace(/\s+/g, ' ').slice(0, 400)};
            } else facts.workflow = 'no View button';
            page.off('response', onResponse);
            facts.activeApis = [...new Set(apis)];
        }
        record('walk', facts);
    } catch (error) {
        facts.error = String(error.stack || error).slice(0, 1500);
        record('walk', facts);
        throw error;
    } finally {
        await close();
    }
});
