// U07 A1 walk: a Site Administrator who holds no manager role in a press or preprint server
// opens the Settings pages the side menu offers. OJS is the control.
// On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), context
// `publicknowledge`, users of the dataset only; the kit builds nothing.
//   steps (default): `admin` ticks "Reader" on View Profile › "Roles", removes their own
//     "Press manager" ("Preprint Server manager", "Journal manager") role on Settings › Users &
//     Roles › Users › "Edit" › "Remove Role", then opens every entry of the side menu's
//     "Settings" group by its own address: each page's address, heading and refusal.
//   nb: the neighbour check, alone: `rvaca` (manager) and `dbuskins` (section editor, series
//     editor, moderator) open Settings › "Website" by its address.
//   wider: steps 1-4, then what the administrator reaches without the role: Administration ›
//     "Hosted Presses" (…) › "Settings wizard" (each tab and side tab, the first form's "Save"
//     pressed unchanged), and the Users & Roles page at `management/access`, the operation
//     the site admin keeps (its "Users" list and "Roles" tab).
//   wayround: alone, on the state the steps leave (no reset in between): `admin` gives
//     themselves the manager role back through Administration › "Hosted Presses" (…) ›
//     "Settings wizard" › "Users" › their row › "Edit User", then opens Settings › "Website".
// Reset first:  npm run fleet-prep -- --feature issues-u07a --dataset 1 --reset
// Run:          PROBE_FEATURE=issues-u07a PROBE_AGENT=u07a node bin/probe.js all shared/playwright/checks/issues/admin-without-press-role-settings-refused/walk.js [nb]
// 3.5:          PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u07a-3_5 PROBE_AGENT=u07a node bin/probe.js all …/walk.js
const {forEachApp, launch, signIn, signOut, record, idle, screen} = require('../../../probe');
const {CASES, readPage, tickReader} = require('../admin-without-role-dashboard-error/lib.js');
const U = require('../remove-user-upcoming-role-error/lib.js');
const G = require('../users-grid-roles-admin-empty-ended-listed/lib.js');

const MODE = process.argv[2] || 'steps';

/** The facts of one page read that the report needs. */
const brief = (out) => ({
    url: out.url.replace(/^https?:\/\/[^/]+/, ''),
    status: out.status,
    denied: out.denied,
    heading: out.heading,
    errorWindow: out.errorWindow,
    title: out.screen.title,
    main: (out.screen.text?.main || '').replace(/\s+/g, ' ').slice(0, 200),
});

/** What the role-less administrator reaches: the Settings wizard's tabs and `management/access`. */
async function wider(page, app, at, facts) {
    const {HostedContextsPage} = require('../../../pages/UsersManagementPages.js');
    const hosted = new HostedContextsPage(page, {hostedLabel: G.CASES[app.name].hosted});
    await hosted.gotoFromAdministration();
    await hosted.openSettingsWizard(app.contextPath);
    await idle(page);
    facts.wizardTabs = await page.getByRole('tab').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
    facts.wizard = {};
    const tabs = page.getByRole('tab');
    const readTab = async (i) => {
        await tabs.nth(i).click();
        await idle(page);
        await new Promise((r) => setTimeout(r, 800));
        const panel = page.locator('[role="tabpanel"]:visible').last();
        facts.wizard[facts.wizardTabs[i]] = {
            text: (await panel.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300),
            saveButtons: await panel.getByRole('button', {name: 'Save', exact: true}).count(),
            gridRows: await panel.locator('tr.gridRow').count(),
        };
        return panel;
    };
    // The top tabs (Setup, Plugins, Users), then Setup's side tabs.
    for (const i of [1, 2]) await readTab(i);
    await tabs.nth(0).click();
    await idle(page);
    for (let i = 3; i < facts.wizardTabs.length; i++) await readTab(i);
    // The first side tab's form (the press's or server's identity), saved unchanged.
    const panel = await readTab(3);
    const answer = page.waitForResponse((r) => /\/api\/v1\/contexts\//.test(r.url()) && r.request().method() !== 'GET', {timeout: 30_000}).catch(() => null);
    await panel.getByRole('button', {name: 'Save', exact: true}).first().click();
    const r = await answer;
    await idle(page);
    await new Promise((res) => setTimeout(res, 800));
    facts.wizardSave = {status: r ? r.status() : null, url: r ? r.url().replace(/^https?:\/\/[^/]+/, '') : null, form: (await panel.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(-120)};
    record('wider-wizard', await screen(page));
    // Users & Roles at the `access` operation.
    const out = await readPage(page, at('management/access'), 'wider-access');
    record('wider-access', out);
    facts.access = brief(out);
    facts.access.tabs = await page.getByRole('tab').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
    facts.access.userRows = await page.locator('table tbody tr').count();
    const roles = page.getByRole('tab', {name: 'Roles', exact: true}).first();
    if (await roles.count()) {
        await roles.click();
        await idle(page);
        await new Promise((r) => setTimeout(r, 1500));
        const p2 = page.locator('[role="tabpanel"]:visible').last();
        facts.access.rolesTab = {rows: await p2.locator('tr.gridRow').count(), text: (await p2.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)};
    }
}

forEachApp(async (app) => {
    const c = CASES[app.name];
    const at = (path) => app.url(`/index.php/${app.contextPath}/en/${path}`);
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    try {
        if (MODE === 'nb') {
            for (const who of ['rvaca', 'dbuskins']) {
                await signIn(page, who);
                const out = await readPage(page, at('management/settings/website'), `nb-${who}`);
                record(`nb-${who}`, out);
                facts[who] = brief(out);
                await signOut(page);
            }
            record('nb', facts);
            return;
        }
        if (MODE === 'wayround') {
            await signIn(page, 'admin');
            const {grid} = await G.openWizardUsers(page, app);
            facts.row = await G.searchGrid(grid, 'admin');
            const win = await G.openEditUser(page, grid, 'admin');
            facts.ticked = await G.tickedRoles(win);
            await win.roleBox(c.managerRole).check();
            await win.pressOk();
            facts.closed = await win.expectClosed().then(() => true).catch(() => false);
            facts.rowAfter = await G.gridRowCells(grid, 'admin');
            const out = await readPage(page, at('management/settings/website'), 'wayround-website');
            record('wayround-website', out);
            facts.website = brief(out);
            record('wayround', facts);
            return;
        }
        // 1. Sign in as admin.
        await signIn(page, 'admin');
        // 2. View Profile › Roles: tick Reader, Save.
        facts.reader = await tickReader(page, app);
        // 3-4. Users & Roles › Users › admin › Edit › Remove Role on the manager role.
        const list = await U.openList(page, app);
        const row = await U.findRow(page, list, 'admin', 'pkpadmin@mailinator.com');
        facts.rolesBefore = await U.rolesPage(page, list, row);
        facts.remove = await U.removeRole(page, c.managerRole);
        if (MODE === 'wider') {
            await wider(page, app, at, facts);
            record('wider', facts);
            return;
        }
        // 5. The side menu, read on the dashboard: the "Settings" group's entries.
        const dash = await readPage(page, at('dashboard/editorial'), '05-dashboard');
        record('05-dashboard', dash);
        const entries = dash.menu.entries.filter((e) => e.href && /\/management\/settings\//.test(e.href));
        facts.menu = dash.menu.text;
        facts.settingsEntries = entries.map((e) => `${e.text} ${e.href.replace(/^https?:\/\/[^/]+/, '')}`);
        // 6. Each "Settings" entry, opened at its own address.
        facts.pages = {};
        for (const e of entries) {
            const name = `06-${e.href.split('/').pop().split('?')[0]}`;
            const out = await readPage(page, e.href, name);
            record(name, out);
            facts.pages[`${e.text}`] = brief(out);
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
