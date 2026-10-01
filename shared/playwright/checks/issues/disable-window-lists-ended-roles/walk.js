// Issue report U53 A6: on Settings › Users & Roles, the "Disable {name}" and
// "Enable {name}" windows open with a line "Current Roles : {roles}" that
// names every role the user ever held in the journal, ended ones included,
// while the list's "Roles" column shows only the current ones; and the line
// has a space before the colon.
//
// Walks the report's Steps on PKP's default test dataset (a dataset fleet):
//   1-4  rvaca: Zita Woods's (OMP Zayan Zedd's) row › "Edit" › "Remove Role"
//        on "Reader", confirmed; back on the list, the row's "Roles"; "More
//        Actions" › "Disable User", the line under the heading; "Cancel"
//   5-7  rvaca: Carlo Corino's (OMP Arthur Clark's) row › "Remove User" ›
//        "OK"; "Disable User", the line, "OK"; "Enable User", the line, "Cancel"
// Control: David Buskins (no ended role) › "Disable User", the line, "Cancel".
// Neighbour check (fix in and out): Stephen Hellier (OJS, OMP) or Catherine
// Kwantes (OPS), two current roles, keep both on the line; the list's "Roles"
// column is the same with and without the fix.
//
// Run, on an install freshly loaded from the default dataset:
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/disable-window-lists-ended-roles/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both, --feature issues-3_5 and
// PROBE_FEATURE=issues-3_5.
// The fix check: node bin/try-fix.js apply <this folder>/fix.diff ojs omp ops
// (rebuilds the JavaScript), reset the dataset, walk, then
// node bin/try-fix.js revert ojs omp ops.
const {forEachApp, launch, signIn, screen, record, idle, sql} = require('../../../probe');
const {closeMenu} = require('../../../support/menus');

const T = 30_000;
const ENDED = {ojs: ['zwoods', 'Woods', 'Zita Woods'], omp: ['zzedd', 'Zedd', 'Zayan Zedd'], ops: ['zwoods', 'Woods', 'Zita Woods']};
const REMOVED = {ojs: ['ccorino', 'Corino', 'Carlo Corino'], omp: ['aclark', 'Clark', 'Arthur Clark'], ops: ['ccorino', 'Corino', 'Carlo Corino']};
const CONTROL = ['dbuskins', 'Buskins', 'David Buskins'];
const NEIGHBOUR = {ojs: ['shellier', 'Hellier', 'Stephen Hellier'], omp: ['shellier', 'Hellier', 'Stephen Hellier'], ops: ['ckwantes', 'Kwantes', 'Catherine Kwantes']};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

forEachApp(async (app) => {
    const {expect} = require('@playwright/test');
    const facts = {app: app.name, line: app.line, dataset: app.dataset, startedAt: new Date().toISOString()};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    const snap = async (name) => {
        const s = await screen(page);
        record(name, s);
        return s;
    };
    const ct = app.contextTables;
    const rolesOf = (u) => sql(app, `SELECT ugs.setting_value || ' end=' || coalesce(uug.date_end::text, '-') FROM user_user_groups uug
        JOIN users us ON us.user_id = uug.user_id JOIN user_groups ug ON ug.user_group_id = uug.user_group_id
        JOIN ${ct.table} c ON c.${ct.id} = ug.context_id
        LEFT JOIN user_group_settings ugs ON ugs.user_group_id = ug.user_group_id AND ugs.setting_name = 'name' AND ugs.locale = 'en'
        WHERE us.username = '${u}' AND c.path = '${app.contextPath}' ORDER BY uug.user_user_group_id`).split('\n').filter(Boolean);

    // ── the Users list ────────────────────────────────────────────────────
    const users = page.getByRole('table', {name: /^Current Users \(/});
    const rowOf = (email) => users.locator('tbody tr').filter({hasText: email});
    const openList = async () => {
        await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/access`));
        await expect(users.locator('tbody tr').first()).toBeVisible({timeout: T});
        await idle(page);
    };
    const findRow = async (email, family) => {
        if (await rowOf(email).count()) return 'first page';
        await page.getByRole('searchbox').first().fill(family);
        await page.getByRole('searchbox').first().press('Enter');
        await idle(page);
        await expect(rowOf(email)).toBeVisible({timeout: 15_000});
        return `searched "${family}"`;
    };
    // The row's cells, by the table's column headers.
    const rowCells = async (email) => {
        const heads = (await users.locator('thead th').allInnerTexts()).map((t) => flat(t));
        const cells = (await rowOf(email).locator('td').allInnerTexts()).map((t) => flat(t));
        return Object.fromEntries(heads.map((h, i) => [h || `#${i}`, cells[i]]));
    };
    const menuOf = async (email) => {
        await rowOf(email).getByRole('button').last().click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10_000});
        return (await page.getByRole('menuitem').allInnerTexts()).map((t) => t.trim());
    };

    // "Disable User" / "Enable User": the window's heading and the line under it;
    // then "OK" (ok) or "Cancel".
    const disableWindow = async (who, key, {ok = false, reason = ''} = {}) => {
        const [username, family] = who;
        const email = `${username}@mailinator.com`;
        const out = {};
        await openList();
        out.found = await findRow(email, family);
        out.listRow = await rowCells(email);
        out.menu = await menuOf(email);
        const item = out.menu.find((t) => t === 'Disable User' || t === 'Enable User');
        if (!item) {
            out.offered = false;
            await closeMenu(page);
            return out;
        }
        out.offered = item;
        const legacy = page.waitForResponse((r) => r.url().includes('edit-disable-user'), {timeout: T});
        await page.getByRole('menuitem', {name: item, exact: true}).click();
        out.formStatus = (await legacy).status();
        const dlg = page.getByRole('dialog').filter({hasText: /Reason for (dis|en)abling user|sufficient permissions/}).last();
        await expect(dlg).toBeVisible({timeout: T});
        await idle(page);
        await sleep(500);
        const s = await snap(key);
        out.heading = flat(await dlg.getByRole('heading').first().innerText().catch(() => null), 200);
        out.description = flat(await dlg.locator('p.text-lg-normal').first().innerText().catch(() => null), 400);
        out.descriptionRaw = await dlg.locator('p.text-lg-normal').first().textContent().catch(() => null);
        out.windowText = flat(s.text.dialog, 600);
        if (ok) {
            if (reason) await dlg.locator('textarea[name="disableReason"]').fill(reason);
            const post = page.waitForResponse((x) => /\/disable-user/.test(x.url()) && x.request().method() === 'POST', {timeout: T});
            await dlg.getByRole('button', {name: 'OK', exact: true}).click();
            out.okStatus = (await post).status();
            await idle(page);
            await sleep(800);
        } else {
            const cancel = dlg.getByRole('link', {name: 'Cancel', exact: true});
            if (await cancel.count()) await cancel.first().click();
            else await dlg.getByRole('button', {name: 'Cancel', exact: true}).first().click();
            await expect(page.getByRole('dialog')).toHaveCount(0, {timeout: 10_000});
            await sleep(600); // the modal store's close slot (patterns.md pitfall 4)
        }
        return out;
    };

    // The roles page ("Edit"): "Remove Role" on one role, confirmed.
    const removeRole = async (who, roleName, key) => {
        const [username, family] = who;
        const email = `${username}@mailinator.com`;
        const o = {};
        await openList();
        await findRow(email, family);
        await menuOf(email);
        await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
        await page.waitForURL(/management\/settings\/user\/\d+/, {timeout: T});
        await idle(page);
        await sleep(800);
        o.rolesPage = flat((await snap(`${key}-roles-page`)).text.main, 1200);
        const row = page.getByRole('row').filter({has: page.getByRole('cell', {name: roleName, exact: true})})
            .filter({has: page.getByRole('button', {name: 'Remove Role'})}).first();
        o.row = flat(await row.innerText(), 200);
        const ended = [];
        const onResp = (r) => { if (/\/endRole\//.test(r.url())) ended.push({method: r.request().method(), status: r.status()}); };
        page.on('response', onResp);
        await row.getByRole('button', {name: 'Remove Role'}).click();
        const dlg = page.getByRole('dialog').last();
        await dlg.waitFor({timeout: 10_000});
        o.confirm = flat(await dlg.innerText(), 300);
        await dlg.getByRole('button', {name: 'Remove Role'}).click();
        await idle(page);
        await sleep(1500);
        page.off('response', onResp);
        o.endRole = ended;
        o.dialogsAfter = await page.getByRole('dialog').count();
        o.rolesPageAfter = flat((await snap(`${key}-roles-page-after`)).text.main, 1200);
        return o;
    };

    // "Remove User" › "OK" on the list.
    const removeUser = async (who, key) => {
        const [username, family] = who;
        const email = `${username}@mailinator.com`;
        const o = {};
        await openList();
        await findRow(email, family);
        o.menu = await menuOf(email);
        await page.getByRole('menuitem', {name: 'Remove User'}).click();
        const dlg = page.getByRole('dialog').filter({hasText: 'Remove this user'});
        await expect(dlg).toBeVisible({timeout: 10_000});
        o.confirm = flat(await dlg.innerText(), 300);
        const resp = page.waitForResponse((r) => r.url().includes('remove-user'), {timeout: T});
        await dlg.getByRole('button', {name: 'OK', exact: true}).click();
        const r = await resp;
        o.request = {status: r.status(), body: flat(await r.text().catch(() => ''), 200)};
        await idle(page);
        await sleep(1000);
        o.dialogsAfter = await page.getByRole('dialog').count();
        await snap(`${key}-after`);
        return o;
    };

    try {
        const [eUser] = ENDED[app.name];
        const [rUser] = REMOVED[app.name];
        facts.before = {ended: rolesOf(eUser), removed: rolesOf(rUser)};
        await signIn(page, 'rvaca');

        // 1-4. A role ended on the roles page; the list; "Disable User"; "Cancel".
        facts.step2 = await removeRole(ENDED[app.name], 'Reader', '02-remove-reader');
        facts.endedRolesInDb = rolesOf(eUser);
        facts.step4 = await disableWindow(ENDED[app.name], '04-ended-disable');

        // 5-7. "Remove User"; "Disable User" › "OK"; "Enable User" › "Cancel".
        facts.step5 = await removeUser(REMOVED[app.name], '05-remove-user');
        facts.removedRolesInDb = rolesOf(rUser);
        facts.step6 = await disableWindow(REMOVED[app.name], '06-removed-disable', {ok: true});
        facts.step7 = await disableWindow(REMOVED[app.name], '07-removed-enable');
        facts.removedAccount = sql(app, `SELECT 'disabled=' || disabled FROM users WHERE username = '${rUser}'`);

        // Control and neighbour.
        facts.control = await disableWindow(CONTROL, '08-control-disable');
        facts.neighbour = await disableWindow(NEIGHBOUR[app.name], '09-neighbour-disable');
        facts.neighbourRolesInDb = rolesOf(NEIGHBOUR[app.name][0]);
    } finally {
        record('facts', facts);
        await close();
    }
});
