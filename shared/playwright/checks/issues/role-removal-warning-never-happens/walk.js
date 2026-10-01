// Issue report walk: docs/issues/U54-A4-role-removal-warning-never-happens.md
// (spec U54 register A4). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
//   A role its members hold: 1 sign in as `rvaca`; 2 Settings › Users &
//     Roles › "Roles"; 3 "Copyeditor" (OPS: "Moderator") › "Remove";
//     4 the "Confirm" window's text, "OK"; 5 reload.
//   A created role with one member: 6 "Create New Role" ("Author",
//     "u54w51 Data curator", "u54w51", "Allow user self-registration");
//     7 sign in as the dataset's author `amwandenga` (OMP `aclark`, OPS
//     `ccorino`); 8 "Edit Profile" › "Roles", tick the role, "Save";
//     9 sign in as `rvaca`, "Roles"; 10 the role › "Remove" › "OK".
//   A default role nobody holds: 11 "Designer" (OPS: "Editorial Board
//     Member") › "Remove" › "OK".
//   A created role nobody holds (the path a fix must leave alone): 12
//     "Create New Role" "u54w51 Spare desk" (Assistant); 13 its "Remove" ›
//     "OK"; 14 reload: the row is gone.
// Each "Remove" first records the row's "Settings" line (with the fix, a
// role "OK" would refuse offers "Edit" and no "Remove"), then the window's
// text and buttons, the answer and the notice. CONTROL_ONLY=1 (with its own
// PROBE_RUN) takes steps 12-14 alone. The kit builds nothing.
//
// Run (main, then stable-3_5_0); reset the fleet first:
//   npm run fleet-prep -- --feature issues-w51 --dataset 7 --reset
//   PROBE_FEATURE=issues-w51 PROBE_AGENT=w51 node bin/probe.js all shared/playwright/checks/issues/role-removal-warning-never-happens/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w51-3_5 --dataset 7 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w51-3_5 PROBE_AGENT=w51 node bin/probe.js all shared/playwright/checks/issues/role-removal-warning-never-happens/walk.js
// With the fix applied (node bin/try-fix.js apply …/fix.diff ojs), run with PROBE_RUN=fix.
// Facts: .reports/<feature>/w51/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 500) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const CREATED = 'u54w51 Data curator';
const SPARE = 'u54w51 Spare desk';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
    const facts = {line: app.line || 'main', baseURL: app.baseURL};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const HELD = app.name === 'ops' ? 'Moderator' : 'Copyeditor';
    const UNHELD_DEFAULT = app.name === 'ops' ? 'Editorial Board Member' : 'Designer';
    const AUTHOR = {ojs: 'amwandenga', omp: 'aclark', ops: 'ccorino'}[app.name];
    const steps = !process.env.CONTROL_ONLY;
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => {
        const s = await screen(page);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`);
        return s;
    };
    const notices = async () => flat(await page.locator('.app__notifications').innerText().catch(() => ''));
    // Members of a role as stored (current and ended), read after the screens acted.
    const members = async (name) => (await sql(app, `select count(*), count(uug.date_end) from user_user_groups uug join user_group_settings s on s.user_group_id = uug.user_group_id and s.setting_name = 'name' and s.locale = 'en' where s.setting_value = '${name.replace(/'/g, "''")}'`)).trim();
    const roles = new RolesTab(page, app.contextPath, {stages: []});

    // "Remove" on a row: the window's text and buttons, then "OK": its answer and the notice.
    const remove = async (label, name) => {
        const actions = await roles.rowActionLabels(name);
        if (!actions.includes('Remove')) {
            fact(label, {actions, removeOffered: false});
            await snap(`${label}-no-remove`);
            return null;
        }
        const dialog = await roles.openRemove(name);
        const text = await dialog.text();
        const buttons = await dialog.buttonLabels();
        await snap(`${label}-confirm`);
        const r = await dialog.ok();
        await pause(1200);
        const out = {actions, window: text, buttons, status: r.status(), notice: await notices(), rowStillListed: await roles.row(name).count()};
        fact(label, out);
        await snap(`${label}-ok`);
        return out;
    };
    // "Create New Role" with a level, name, abbreviation and options ticked.
    const create = async (label, {level, name, abbrev, options = []}) => {
        const win = await roles.openCreate();
        const levels = await win.levelOptions();
        const choice = levels.find((l) => l === level);
        if (!choice) throw new Error(`no "${level}" level: ${levels.join(', ')}`);
        await win.chooseLevel(choice);
        await win.nameBox('en').fill(name);
        await win.abbrevBox('en').fill(abbrev);
        for (const o of options) await win.optionBox(o).check();
        const saved = await win.save();
        await pause(1000);
        fact(label, {status: saved.status(), notice: await notices(), listed: await roles.row(name).count(),
            first: (await roles.rowNames())[0]});
        await snap(label);
    };

    try {
        await signIn(page, 'rvaca');
        await roles.goto();
        fact('02-roles', await roles.rowNames());
        await snap('roles');

        if (steps) {
            // 3-4: a role its members hold.
            fact('03-stored members before', {role: HELD, 'count|ended': await members(HELD)});
            await remove('04-remove held role', HELD);
            // 5: reload.
            await roles.reload();
            fact('05-after reload', {listed: await roles.row(HELD).count(), 'count|ended': await members(HELD)});
            await snap('05-after-reload');

            // 6: a created role that allows self-registration.
            await create('06-create', {level: 'Author', name: CREATED, abbrev: 'u54w51', options: ['Allow user self-registration']});

            // 7-8: an author takes it on their profile.
            await signOut(page);
            await signIn(page, AUTHOR);
            await page.goto(app.url(`/index.php/${app.contextPath}${app.line && /3_[34]/.test(app.line) ? '' : '/en'}/user/profile`));
            await idle(page);
            await page.getByRole('tab', {name: 'Roles', exact: true}).click();
            const form = page.locator('form#rolesForm');
            await form.waitFor({timeout: 30_000});
            const box = form.getByRole('checkbox', {name: CREATED, exact: true});
            fact('08-profile roles', {offered: await box.count(),
                boxes: await form.locator('input[type="checkbox"]').evaluateAll((bs) => bs.map((b) => `${(b.labels[0] || {}).innerText || b.name}:${b.checked}`))});
            await box.check();
            const saved = page.waitForResponse((r) => /saveRoles|save-roles/.test(r.url()), {timeout: 30_000});
            await form.getByRole('button', {name: 'Save', exact: true}).click();
            const sr = await saved;
            await idle(page);
            await pause(1000);
            fact('08-saved', {status: sr.status(), page: flat(await form.innerText(), 300), notice: await notices(),
                'count|ended': await members(CREATED)});
            await snap('08-profile-saved');

            // 9-10: the manager removes it.
            await signOut(page);
            await signIn(page, 'rvaca');
            await roles.goto();
            await remove('10-remove created held role', CREATED);
            await roles.reload();
            fact('10-after reload', {listed: await roles.row(CREATED).count(), 'count|ended': await members(CREATED)});

            // 11: control, a default role nobody holds.
            fact('11-stored members', {role: UNHELD_DEFAULT, 'count|ended': await members(UNHELD_DEFAULT)});
            await remove('11-remove default unheld role', UNHELD_DEFAULT);
        }

        // 12-14: a created role nobody holds is removed.
        await create('12-create spare', {level: 'Assistant', name: SPARE, abbrev: 'u54w51s'});
        await remove('13-remove spare', SPARE);
        await roles.reload();
        fact('14-after reload', {listed: await roles.row(SPARE).count()});
        await snap('14-after-reload');
    } finally {
        record('facts', facts);
        await close();
    }
});
