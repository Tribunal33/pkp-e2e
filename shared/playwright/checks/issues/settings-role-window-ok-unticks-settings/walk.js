// Issue report walk: docs/issues/U54-A11-settings-role-window-ok-unticks-settings.md
// (spec U54 register A11). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// on its own context `publicknowledge` and its own users:
//   journal, press: `dbarnes`, whose only role is "Journal editor" /
//     "Press editor" (manager level, "Permit changes to Settings" ticked).
//   preprint server: the installed manager role is the first row of "Roles"
//     and offers no "Edit" (U54 A1), so the preconditions make one on
//     screen: `rvaca` creates "u54w49 Managing editor" at the manager level
//     with the box ticked and invites `dbuskins` (Moderator) to it through
//     "Invite to a role"; `dbuskins` accepts from the emailed link.
// Steps: 1-2 the holder signs in, Settings › Users & Roles › "Roles";
//   3 the role's "Edit", the box read; 4 "OK" with nothing changed;
//   5 Users & Roles reloaded and Settings › Website opened;
//   6 `rvaca` opens the role's "Edit" and reads the box, "Cancel".
// After step 4 the stored permit_settings is read by SQL.
// Neighbour (what a fix must leave alone): `rvaca` (who also holds
// "Journal manager") unticks the box on the same role and presses "OK":
// stored unticked; ticks it and "OK": stored ticked. NEIGHBOUR_ONLY=1 takes
// the neighbour alone (journal and press only: the server's role is made by
// the full walk).
// MANAGER_ONLY=1 takes, instead, the reach check on the context's own
// manager role ("Journal manager", "Press manager", "Preprint Server
// manager"), whose row offers no "Edit" on `main` (the first row, U54 A1):
// `admin` (site administrator, holding it as the only Settings role) opens
// its "Edit", presses "OK" unchanged, then unticks and ticks it; `rvaca`,
// whose only role it is, opens it, presses "OK" unchanged and opens Users &
// Roles; `admin` ticks it back. On 3.5 with the fix, apply fix-3_5.diff
// (PKP_E2E_LINE=stable-3_5_0 in front of try-fix).
// The kit builds nothing.
//
// Reset first:  npm run fleet-prep -- --feature issues-w49 --dataset 5 --reset
// Run (main):   PROBE_FEATURE=issues-w49 PROBE_AGENT=w49 node bin/probe.js all shared/playwright/checks/issues/settings-role-window-ok-unticks-settings/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w49-3_5 --dataset 5 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w49-3_5 PROBE_AGENT=w49 node bin/probe.js all shared/playwright/checks/issues/settings-role-window-ok-unticks-settings/walk.js
// With the fix: node bin/try-fix.js apply shared/playwright/checks/issues/settings-role-window-ok-unticks-settings/fix.diff ojs omp ops
//   (fix-after-a10.diff on a checkout that holds the U54 A10 fix),
//   reset, run with PROBE_RUN=fix, then node bin/try-fix.js revert … ojs omp ops.
// Facts: .reports/<feature>/w49/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle, sql, tag} = require('../../../probe');
const {inviteToRole, acceptInvitation} = require('./lib.js');

const DENIED = /The current role does not have access to this operation\./;
const flat = (s, n = 400) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset n)');
    const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
    const ops = app.name === 'ops';
    const neighbourOnly = !!process.env.NEIGHBOUR_ONLY;
    const managerOnly = !!process.env.MANAGER_ONLY;
    if (ops && neighbourOnly) return;
    if (managerOnly) return managerReach(app);
    const path = app.contextPath;
    const t = tag('u54w49');
    const role = ops ? 'u54w49 Managing editor' : app.name === 'omp' ? 'Press editor' : 'Journal editor';
    const holder = ops ? 'dbuskins' : 'dbarnes';
    const facts = {line: app.line || 'main', dataset: app.dataset, role, holder, tag: t};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const cu = (p) => app.url(`/index.php/${path}/en${p}`);
    const stored = () => sql(app, `select ug.user_group_id || ':' || ug.permit_settings from user_groups ug join user_group_settings s on s.user_group_id = ug.user_group_id and s.setting_name = 'name' and s.locale = 'en' where ug.context_id is not null and s.setting_value = '${role.replace(/'/g, "''")}'`);
    const {page, close} = await launch(app);
    const scriptErrors = [];
    page.on('pageerror', (e) => scriptErrors.push(flat(`${e.name}: ${e.message}`, 300)));
    const posts = [];
    page.on('request', (r) => {
        if (r.url().includes('update-user-group') && r.method() === 'POST') {
            const body = new URLSearchParams(r.postData() || '');
            posts.push({permitSettings: body.has('permitSettings') ? body.get('permitSettings') : '(not sent)', userGroupId: body.get('userGroupId')});
        }
    });
    let n = 0;
    const snap = async (name) => {
        const s = await screen(page);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`);
        return s;
    };
    const box = () => page.locator('form#userGroupForm input[name="permitSettings"]');
    const boxState = async () => ({checked: await box().isChecked(), disabled: await box().isDisabled(),
        label: flat(await page.locator('form#userGroupForm').getByText('Permit changes to Settings').first().innerText().catch(() => null))});
    const notices = async () => flat(await page.locator('.app__notifications').innerText().catch(() => ''));
    const openPage = async (p, label) => {
        await page.goto(cu(p));
        await idle(page).catch(() => {});
        const s = await snap(label);
        const text = `${s.text.main || ''} ${s.text.dialog || ''}`;
        return {url: page.url().replace(/^https?:\/\/[^/]+/, ''), denied: DENIED.test(text), h1: flat(await page.locator('main h1, h1').first().innerText().catch(() => null), 120)};
    };
    // A save of the role's window as `who` sets the box to `want` (or leaves it).
    const saveRole = async (roles, want, label) => {
        await roles.goto();
        const win = await roles.openEdit(role);
        const before = await boxState();
        if (want === true) await box().check();
        if (want === false) await box().uncheck();
        const r = await win.save();
        fact(label, {before, set: want, answer: r.status(), notices: await notices(), post: posts[posts.length - 1], stored: stored()});
    };
    try {
        const roles = new RolesTab(page, path, {stages: []});
        if (!neighbourOnly) {
            if (ops) {
                // P1: rvaca creates the manager-level role with the box ticked.
                await signIn(page, 'rvaca', {contextPath: path});
                await roles.goto();
                const win = await roles.openCreate();
                await win.level.selectOption('16');
                await pause(700);
                fact('P1 level chosen', await win.levelLabel());
                await win.nameBox().fill(role);
                await win.abbrevBox().fill('u54w49');
                await box().check();
                fact('P1 box', await boxState());
                await snap('p1-create-role');
                const r = await win.save();
                fact('P1 created', {answer: r.status(), notices: await notices(), stored: stored()});
                // P2-P3: invite dbuskins; dbuskins accepts.
                await inviteToRole(page, app, {email: 'dbuskins@mailinator.com', roleName: role, snap});
                const subject = await acceptInvitation(page, app, {email: 'dbuskins@mailinator.com', contains: role, snap});
                fact('P3 accepted', {subject});
            }
            fact('holder roles (stored)', sql(app, `select string_agg(s.setting_value || '(permit_settings=' || ug.permit_settings || ')', ', ') from user_user_groups uug join users u on u.user_id = uug.user_id join user_groups ug on ug.user_group_id = uug.user_group_id join user_group_settings s on s.user_group_id = ug.user_group_id and s.setting_name = 'name' and s.locale = 'en' where u.username = '${holder}' and ug.context_id is not null`));

            // Steps 1-2.
            await signIn(page, holder, {contextPath: path});
            await roles.goto();
            fact('2 roles listed', await roles.rowNames());
            // Step 3.
            const win = await roles.openEdit(role);
            fact('3 box as the window opens', await boxState());
            await snap('3-edit-window');
            // Step 4.
            const r = await win.save();
            fact('4 OK', {answer: r.status(), notices: await notices(), post: posts[posts.length - 1], stored: stored()});
            await snap('4-after-ok');
            // Step 5.
            fact('5 Users & Roles reloaded', await openPage('/management/settings/access', '5-users-roles'));
            fact('5 Settings › Website', await openPage('/management/settings/website', '5-website'));
            // Step 6.
            await signIn(page, 'rvaca', {contextPath: path});
            await roles.goto();
            const win6 = await roles.openEdit(role);
            fact('6 rvaca: box', await boxState());
            await snap('6-rvaca-edit');
            await win6.cancel();
        } else {
            await signIn(page, 'rvaca', {contextPath: path});
        }

        // Neighbour: rvaca, who has another Settings role, may untick and tick it.
        await saveRole(roles, true, 'N0 rvaca: box ticked (restore if needed), OK');
        await saveRole(roles, false, 'N1 rvaca: box unticked, OK');
        await saveRole(roles, true, 'N2 rvaca: box ticked, OK');
        await snap('neighbour-after');
        fact('scriptErrors', scriptErrors);
    } catch (err) {
        fact('ERROR', String(err.stack || err).slice(0, 1200));
        await snap('ERROR').catch(() => {});
        throw err;
    } finally {
        record('facts', facts);
        await close();
    }
});

// Reach: the context's own manager role, edited by its only holder.
async function managerReach(app) {
    const {RolesTab, FirstRowError} = require('../../../pages/RolesConfigurationPages.js');
    const path = app.contextPath;
    const role = {ojs: 'Journal manager', omp: 'Press manager', ops: 'Preprint Server manager'}[app.name];
    const facts = {line: app.line || 'main', dataset: app.dataset, role, holder: 'rvaca'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const cu = (p) => app.url(`/index.php/${path}/en${p}`);
    const stored = () => sql(app, `select ug.user_group_id || ':' || ug.permit_settings from user_groups ug join user_group_settings s on s.user_group_id = ug.user_group_id and s.setting_name = 'name' and s.locale = 'en' where ug.context_id is not null and s.setting_value = '${role}'`);
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => {
        const s = await screen(page);
        record(`m${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `m${String(n).padStart(2, '0')}-${name}`);
        return s;
    };
    const box = () => page.locator('form#userGroupForm input[name="permitSettings"]');
    const boxState = async () => ({checked: await box().isChecked(), disabled: await box().isDisabled()});
    const notices = async () => flat(await page.locator('.app__notifications').innerText().catch(() => ''));
    const roles = new RolesTab(page, path, {stages: []});
    // Open the role's "Edit" as the signed-in user; null when the row has none (U54 A1).
    const openEdit = async (who) => {
        await roles.goto();
        try {
            return await roles.openEdit(role);
        } catch (e) {
            if (!(e instanceof FirstRowError)) throw e;
            fact(`${who}: no Edit (first row, U54 A1)`, (await roles.rowNames()).slice(0, 3));
            await snap(`${who}-no-edit`);
            return null;
        }
    };
    // As admin: set the box (when open) and press "OK".
    const adminSave = async (want, label) => {
        const w = await openEdit('admin');
        const before = await boxState();
        if (!before.disabled) await (want ? box().check() : box().uncheck());
        await w.save();
        fact(label, {before, stored: stored()});
    };
    try {
        // A: the site administrator, whose only Settings role in the context is this one.
        await signIn(page, 'admin', {contextPath: path});
        let win = await openEdit('admin');
        if (!win) return;
        fact('A1 admin: box as the window opens', await boxState());
        await snap('admin-edit');
        let r = await win.save();
        fact('A2 admin: OK with nothing changed', {answer: r.status(), notices: await notices(), stored: stored()});
        await adminSave(false, 'A3 admin: box unticked (when open), OK');
        await adminSave(true, 'A4 admin: box ticked, OK');
        // M: rvaca, whose only role it is.
        await signIn(page, 'rvaca', {contextPath: path});
        win = await openEdit('rvaca');
        fact('M2 rvaca: box as the window opens', await boxState());
        await snap('manager-edit');
        r = await win.save();
        fact('M3 rvaca: OK with nothing changed', {answer: r.status(), notices: await notices(), stored: stored()});
        await page.goto(cu('/management/settings/access'));
        await idle(page).catch(() => {});
        const s = await snap('rvaca-users-roles');
        fact('M4 rvaca: Users & Roles', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), denied: DENIED.test(`${s.text.main || ''}`)});
        // The site administrator ticks it back when it was lost.
        await signIn(page, 'admin', {contextPath: path});
        await adminSave(true, 'M5 admin: box ticked (when open), OK');
    } finally {
        record('facts-manager', facts);
        await close();
    }
}
