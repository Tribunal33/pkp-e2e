// Issue report U53 A2: a manager's "Remove User" on the Site Administrator's
// row of Settings › Users & Roles ends in "An unexpected error has occurred.
// Please reload the page and try again." instead of the server's refusal.
//
// Walks the report's Steps on PKP's default test dataset (a dataset fleet):
//   1-5  rvaca: Users & Roles › admin admin's row › "More Actions" ›
//        "Remove User" › "OK" › the dialog that follows › reload.
// Neighbour check (fix in and out): the same action on an author (Author and Reader:
// Zita Woods, zwoods, on OJS and OPS; Zayan Zedd, zzedd, on OMP, which has no
// zwoods), which must still succeed with no dialog after "OK".
//
// Run, on an install freshly loaded from the default dataset:
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/remove-site-administrator-unexplained-error/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both, --feature issues-3_5 and
// PROBE_FEATURE=issues-3_5.
// The fix check: node bin/try-fix.js apply <this folder>/fix.diff ojs omp ops
// (rebuilds the JavaScript), reset the dataset, walk, then
// node bin/try-fix.js revert ojs omp ops.
const {forEachApp, launch, signIn, screen, record, idle, sql} = require('../../../probe');

const NEIGHBOUR = {ojs: ['zwoods', 'Woods'], omp: ['zzedd', 'Zedd'], ops: ['zwoods', 'Woods']};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    const {expect} = require('@playwright/test');
    const facts = {app: app.name, line: app.line, dataset: app.dataset, startedAt: new Date().toISOString()};
    const {page, close} = await launch(app);
    const snap = async (name) => {
        const s = await screen(page);
        record(name, s);
        return s;
    };
    const rolesOf = (username) => sql(app, `SELECT ugs.setting_value || ' end=' || coalesce(uug.date_end::text, '-') FROM user_user_groups uug
        JOIN users u ON u.user_id = uug.user_id JOIN user_groups ug ON ug.user_group_id = uug.user_group_id
        JOIN user_group_settings ugs ON ugs.user_group_id = ug.user_group_id AND ugs.setting_name = 'name' AND ugs.locale = 'en'
        WHERE u.username = '${username}' AND ug.context_id IS NOT NULL ORDER BY 1`);
    const users = page.getByRole('table', {name: /^Current Users \(/});
    const openList = async () => {
        await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/access`));
        await expect(users.locator('tbody tr').first()).toBeVisible({timeout: 30_000});
        await idle(page);
    };
    const rowOf = (email) => users.locator('tbody tr').filter({hasText: email});
    const findRow = async (email, name) => {
        if (await rowOf(email).count()) return 'first page';
        await page.getByRole('searchbox').first().fill(name);
        await page.getByRole('searchbox').first().press('Enter');
        await idle(page);
        await expect(rowOf(email)).toBeVisible({timeout: 15_000});
        return `searched "${name}"`;
    };
    const menuOf = async (email) => {
        const row = rowOf(email);
        await row.getByRole('button').last().click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10_000});
        const items = (await page.getByRole('menuitem').allInnerTexts()).map((t) => t.trim());
        return items;
    };
    const removeViaMenu = async (email, key) => {
        const out = {};
        out.menu = await menuOf(email);
        await page.getByRole('menuitem', {name: 'Remove User'}).click();
        const dlg = page.getByRole('dialog').filter({hasText: 'Remove this user'});
        await expect(dlg).toBeVisible({timeout: 10_000});
        out.confirm = (await snap(`${key}-confirm`)).text.dialog;
        const resp = page.waitForResponse((r) => r.url().includes('remove-user'), {timeout: 30_000});
        await dlg.getByRole('button', {name: 'OK', exact: true}).click();
        const r = await resp;
        out.request = {method: r.request().method(), url: r.url().replace(app.baseURL, ''), status: r.status(),
            body: (await r.text().catch(() => '')).slice(0, 600)};
        await idle(page);
        await sleep(1000);
        const after = await snap(`${key}-after-ok`);
        out.dialogAfterOk = after.text.dialog;
        out.dialogsOpen = await page.getByRole('dialog').count();
        if (out.dialogsOpen) {
            await page.getByRole('dialog').last().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
            await idle(page);
        }
        out.rowTextAfter = (await rowOf(email).innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
        return out;
    };
    try {
        facts.adminRolesBefore = rolesOf('admin');
        // 1. Sign in as rvaca.
        await signIn(page, 'rvaca');
        // 2. Settings › Users & Roles.
        await openList();
        const list = await snap('02-users-roles');
        facts.heading = (list.text.main || '').split('\n').find((l) => /Current Users/.test(l));
        facts.adminRowFound = await findRow('pkpadmin@mailinator.com', 'admin');
        facts.adminRowText = (await rowOf('pkpadmin@mailinator.com').innerText()).replace(/\s+/g, ' ').trim();
        // 3-4. admin admin's row › "More Actions" › "Remove User" › "OK".
        facts.admin = await removeViaMenu('pkpadmin@mailinator.com', '03-admin');
        // 5. Reload.
        await openList();
        await findRow('pkpadmin@mailinator.com', 'admin');
        await snap('05-reloaded');
        facts.adminRowAfterReload = (await rowOf('pkpadmin@mailinator.com').innerText()).replace(/\s+/g, ' ').trim();
        facts.adminMenuAfterReload = await menuOf('pkpadmin@mailinator.com');
        await page.getByRole('menuitem').first().press('Escape').catch(() => {});
        facts.adminRolesAfter = rolesOf('admin');

        // Neighbour: an author (Author, Reader) must still be removed with no dialog after "OK".
        const [nb, nbName] = NEIGHBOUR[app.name];
        const nbEmail = `${nb}@mailinator.com`;
        facts.neighbour = {username: nb, rolesBefore: rolesOf(nb)};
        await openList();
        facts.neighbour.rowFound = await findRow(nbEmail, nbName);
        facts.neighbour.remove = await removeViaMenu(nbEmail, `06-${nb}`);
        await openList();
        await findRow(nbEmail, nbName);
        facts.neighbour.rowAfterReload = (await rowOf(nbEmail).innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
        facts.neighbour.rolesAfter = rolesOf(nb);
    } finally {
        record('facts', facts);
        await close();
    }
});
