// Issue report walk: docs/issues/U54-A10-role-name-spaces-window-broken.md
// (spec U54 register A10). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// signed in as `rvaca` (the context's manager):
//   Creating: 1-2 Settings › Users & Roles › "Roles"; 3 "Create New Role";
//     4 "Assistant"; 5 "Role Name" of three spaces, "Abbreviation"
//     "u54w46"; 6 "OK"; 7 "Role Name" "u54w46 Desk"; 8 "OK".
//   Editing: 9 the "Roles" tab again; 10 "Editorial Board Member" › "Edit";
//     11 "Abbreviation" of three spaces; 12 "OK"; 13 the old abbreviation
//     back and "Role Name" "Editorial Board Member u54w46"; 14 "OK".
// After each "OK": the answer, the window's text, its "Stage Assignment"
// boxes, its hidden role id, the page's address and the script errors.
// The roles listed (and the stored rows, by SQL) are read after each path.
// Neighbour (the paths a fix must leave alone), after step 14: an empty
// "Role Name" still refused by the window itself (nothing sent), and a
// plain "Create New Role" ("u54w46 Plain") and a plain "Edit" (the
// "Editorial Board Member" abbreviation changed) still saved at once.
// NEIGHBOUR_ONLY=1 takes the neighbour alone. The kit builds nothing.
//
// Run (main, then stable-3_5_0); reset the fleet first:
//   npm run fleet-prep -- --feature issues-w46 --dataset 2 --reset
//   PROBE_FEATURE=issues-w46 PROBE_AGENT=w46 node bin/probe.js all shared/playwright/checks/issues/role-name-spaces-window-broken/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w46-3_5 --dataset 2 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w46-3_5 PROBE_AGENT=w46 node bin/probe.js all shared/playwright/checks/issues/role-name-spaces-window-broken/walk.js
// With the fix applied (node bin/try-fix.js apply …/fix.diff ojs omp ops), run with PROBE_RUN=fix.
// Facts: .reports/<feature>/w46/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');

const flat = (s, n = 600) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const SPACES = '   ';
const NEW_ROLE = 'u54w46 Desk';
const EDIT_ROLE = 'Editorial Board Member';
const RENAMED = 'Editorial Board Member u54w46';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const {RolesTab, RoleWindow} = require('../../../pages/RolesConfigurationPages.js');
    const facts = {line: app.line || 'main', baseURL: app.baseURL};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const steps = !process.env.NEIGHBOUR_ONLY;
    const {page, close} = await launch(app);
    const errors = [];
    page.on('pageerror', (e) => errors.push(flat(`${e.name}: ${e.message}`, 300)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(flat(m.text(), 300)); });
    let n = 0;
    const snap = async (name) => {
        const s = await screen(page);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`);
        return s;
    };
    const stored = (name) => sql(app, `select ug.user_group_id || ':' || ug.role_id || ':' || coalesce((select setting_value from user_group_settings a where a.user_group_id = ug.user_group_id and a.setting_name = 'abbrev' and a.locale = 'en'), '') from user_groups ug join user_group_settings s on s.user_group_id = ug.user_group_id and s.setting_name = 'name' and s.locale = 'en' where s.setting_value = '${name.replace(/'/g, "''")}' order by 1`).split('\n').filter(Boolean);
    // What the window holds now.
    const windowState = async () => {
        const form = page.locator('form#userGroupForm');
        if (!(await form.count())) return {window: 'closed', url: page.url()};
        return {
            window: 'open',
            text: flat(await form.innerText().catch(() => ''), 900),
            stageBoxes: await form.locator('input[name="assignedStages[]"]').count(),
            hiddenRoleId: await form.locator('input[type="hidden"][name="userGroupId"]').getAttribute('value').catch(() => null),
            level: flat(await form.locator('select[name="roleId"] option:checked').innerText().catch(() => '')),
            levelDisabled: await form.locator('select[name="roleId"]').isDisabled().catch(() => null),
            errorsUnderBoxes: (await form.locator('label.error:visible').allInnerTexts()).map((t) => flat(t)),
        };
    };
    // Press "OK" and wait for what follows: an answer inside the page, or the
    // browser leaving it (a native form submit).
    const pressOk = async (label) => {
        const before = errors.length;
        const url = page.url();
        const answer = page.waitForResponse((r) => r.url().includes('update-user-group'), {timeout: 20_000}).catch(() => null);
        await page.locator('form#userGroupForm').getByRole('button', {name: 'OK', exact: true}).click();
        const r = await answer;
        let body = null;
        if (r) {
            try { body = flat(await r.text(), 400); } catch (e) { body = '(body not readable: the page left)'; }
        }
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        await idle(page).catch(() => {});
        await page.waitForTimeout(1200);
        const left = page.url() !== url;
        const out = {
            request: r ? {method: r.request().method(), status: r.status(), type: r.request().resourceType(),
                xhr: r.request().resourceType() === 'xhr' || r.request().resourceType() === 'fetch', body} : null,
            pageLeft: left, url: page.url(),
            pageText: left ? flat(await page.locator('body').innerText().catch(() => ''), 500) : null,
            ...(left ? {} : await windowState()),
            notices: flat(await page.locator('.app__notifications').innerText().catch(() => '')),
            scriptErrors: errors.slice(before),
        };
        fact(label, out);
        return out;
    };
    try {
        await signIn(page, 'rvaca');
        const roles = new RolesTab(page, app.contextPath, {stages: []});
        if (steps) {
            // --- Creating
            await roles.goto();
            fact('02-roles listed', await roles.rowNames());
            let win = await roles.openCreate();
            fact('03-window as opened', await windowState());
            await win.chooseLevel('Assistant');
            await win.nameBox().fill(SPACES);
            await win.abbrevBox().fill('u54w46');
            fact('05-window filled', await windowState());
            await snap('create-filled');
            await pressOk('06-OK, Role Name of spaces');
            await snap('create-refused');
            await page.locator('form#userGroupForm input[name="name[en]"]').fill(NEW_ROLE);
            await pressOk('08-OK, Role Name corrected');
            await snap('create-second-ok');
            fact('08-stored rows named "u54w46 Desk" (id:level:abbrev)', stored(NEW_ROLE));

            // --- Editing
            await roles.goto();
            fact('09-roles listed', await roles.rowNames());
            fact('09-stored "Editorial Board Member" (id:level:abbrev)', stored(EDIT_ROLE));
            win = await roles.openEdit(EDIT_ROLE);
            const oldAbbrev = await win.abbrevBox().inputValue();
            fact('10-window as opened', {...(await windowState()), abbrev: oldAbbrev});
            await win.abbrevBox().fill(SPACES);
            await snap('edit-filled');
            await pressOk('12-OK, Abbreviation of spaces');
            await snap('edit-refused');
            await page.locator('form#userGroupForm input[name="abbrev[en]"]').fill(oldAbbrev);
            await page.locator('form#userGroupForm input[name="name[en]"]').fill(RENAMED);
            await pressOk('14-OK, Abbreviation back, Role Name changed');
            await snap('edit-second-ok');
            fact('14-stored "Editorial Board Member" (id:level:abbrev)', stored(EDIT_ROLE));
            fact('14-stored "Editorial Board Member u54w46" (id:level:abbrev)', stored(RENAMED));
            await roles.goto();
            fact('14-roles listed after', await roles.rowNames());
            await snap('roles-after');
        }

        // --- Neighbour: an empty name refused by the window; plain saves.
        await roles.goto();
        let win = await roles.openCreate();
        await win.chooseLevel('Assistant');
        await win.abbrevBox().fill('u54w46p');
        const sent = [];
        const onReq = (r) => { if (r.url().includes('update-user-group')) sent.push(r.method()); };
        page.on('request', onReq);
        await win.pressOk();
        await page.waitForTimeout(1500);
        page.off('request', onReq);
        fact('N1-empty Role Name: window', {...(await windowState()), sent});
        await win.nameBox().fill('u54w46 Plain');
        const plain = await win.save().then((r) => r.status()).catch((e) => `not saved: ${flat(e.message, 200)}`);
        fact('N2-plain create', {answer: plain, notices: flat(await page.locator('.app__notifications').innerText().catch(() => '')),
            stored: stored('u54w46 Plain'), listed: (await roles.rowNames()).filter((r) => /u54w46/.test(r))});
        const editName = (await roles.row(RENAMED).count()) ? RENAMED : EDIT_ROLE;
        win = await roles.openEdit(editName);
        fact('N3-edit window as opened', await windowState());
        await win.abbrevBox().fill('EBMp');
        const edited = await win.save().then((r) => r.status()).catch((e) => `not saved: ${flat(e.message, 200)}`);
        fact('N3-plain edit', {role: editName, answer: edited, stored: stored(editName)});
        await snap('neighbour-after');
        fact('scriptErrors (all)', errors);
    } finally {
        record('facts', facts);
        await close();
    }
});
