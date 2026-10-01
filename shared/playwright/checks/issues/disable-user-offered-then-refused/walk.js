// Issue report U53 A1: on Settings › Users & Roles a manager who is not the
// Site Administrator is offered "Disable User" / "Enable User" on rows they
// may not administer (the Site Administrator's, a user with a role in another
// journal), and the window then refuses with "You do not have sufficient
// permissions to administer this user. …".
//
// Walks the report's Steps on PKP's default test dataset (a dataset fleet):
//   pre  admin: Administration › Hosted Journals › "Create Journal" (path u53r20);
//        zwoods (OMP zzedd): Edit Profile › Roles › other journals › "Reader" › Save
//   1-4  rvaca: Users & Roles › "admin admin"'s row › "More Actions" ›
//        "Disable User"; the same on Zita Woods's (Zayan Zedd's) row
//   5-6  admin disables Zita; rvaca's "Enable User" on her row
// Control: rvaca's "Disable User" on David Buskins (dbuskins) opens the reason box.
// Neighbour check (fix in and out): admin enables Zita again, she unticks
// "Reader" in the second journal (the role ends), and rvaca's menu on her row
// still offers "Disable User", whose window holds the reason box: a role that
// has ended elsewhere does not stop a manager from disabling (the server
// counts current roles only). With the fix that row also offers "Login As"
// and "Merge user" again, which the same server rule allows.
//
// Run, on an install freshly loaded from the default dataset:
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/disable-user-offered-then-refused/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both, --feature issues-3_5 and
// PROBE_FEATURE=issues-3_5.
// The fix check: node bin/try-fix.js apply <this folder>/fix.diff ojs omp ops
// (rebuilds the JavaScript), reset the dataset, walk, then
// node bin/try-fix.js revert ojs omp ops.
const {forEachApp, launch, signIn, screen, record, idle, sql} = require('../../../probe');
const {closeMenu} = require('../../../support/menus');

const TARGET = {ojs: ['zwoods', 'Woods', 'Zita Woods'], omp: ['zzedd', 'Zedd', 'Zayan Zedd'], ops: ['zwoods', 'Woods', 'Zita Woods']};
const CONTROL = ['dbuskins', 'Buskins', 'David Buskins'];
const J2 = {path: 'u53r20', name: 'u53r20 Second Journal', acronym: 'U53'};
const REFUSAL = 'You do not have sufficient permissions to administer this user';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();

forEachApp(async (app) => {
    const {expect} = require('@playwright/test');
    const facts = {app: app.name, line: app.line, dataset: app.dataset, startedAt: new Date().toISOString()};
    const {page, close} = await launch(app);
    const snap = async (name) => {
        const s = await screen(page);
        record(name, s);
        return s;
    };
    const [tUser, tFamily, tName] = TARGET[app.name];
    const tEmail = `${tUser}@mailinator.com`;
    const ct = app.contextTables;
    const account = (u) => sql(app, `SELECT username || ' disabled=' || disabled || ' reason=' || coalesce(disabled_reason, '-') FROM users WHERE username = '${u}'`);
    const rolesOf = (u) => sql(app, `SELECT coalesce(c.path, 'site') || ' ' || ugs.setting_value || ' end=' || coalesce(uug.date_end::text, '-') FROM user_user_groups uug
        JOIN users u ON u.user_id = uug.user_id JOIN user_groups ug ON ug.user_group_id = uug.user_group_id
        LEFT JOIN user_group_settings ugs ON ugs.user_group_id = ug.user_group_id AND ugs.setting_name = 'name' AND ugs.locale = 'en'
        LEFT JOIN ${ct.table} c ON c.${ct.id} = ug.context_id
        WHERE u.username = '${u}' ORDER BY 1`);

    // ── the Users list ────────────────────────────────────────────────────
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
        await rowOf(email).getByRole('button').last().click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10_000});
        return (await page.getByRole('menuitem').allInnerTexts()).map((t) => t.trim());
    };
    // Choose "Disable User" / "Enable User" and read the window it opens.
    const disableWindow = async (email, family, key, {ok = false} = {}) => {
        const out = {};
        await findRow(email, family);
        out.menu = await menuOf(email);
        const item = out.menu.find((t) => t === 'Disable User' || t === 'Enable User');
        if (!item) {
            out.offered = false;
            await closeMenu(page);
            return out;
        }
        out.offered = item;
        const legacy = page.waitForResponse((r) => r.url().includes('edit-disable-user'), {timeout: 30_000});
        await page.getByRole('menuitem', {name: item, exact: true}).click();
        const r = await legacy;
        out.request = {method: r.request().method(), url: r.url().replace(app.baseURL, ''), status: r.status(),
            body: (await r.text().catch(() => '')).slice(0, 400)};
        const dlg = page.getByRole('dialog').last();
        await expect(dlg.getByText(new RegExp(`${REFUSAL}|Reason for (dis|en)abling user`)).first()).toBeVisible({timeout: 20_000});
        await idle(page);
        const s = await snap(key);
        out.window = s.text.dialog;
        out.refused = (s.text.dialog || '').includes(REFUSAL);
        out.buttons = (await dlg.getByRole('button').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
        out.reasonBox = await dlg.locator('textarea, input[type="text"]').count();
        if (ok && !out.refused) {
            const post = page.waitForResponse((x) => /\/disable-user/.test(x.url()) && x.request().method() === 'POST', {timeout: 30_000});
            await dlg.getByRole('button', {name: 'OK', exact: true}).click();
            const p = await post;
            out.okStatus = p.status();
            await idle(page);
            await sleep(800);
        } else {
            await dlg.getByRole('button', {name: 'Close', exact: true}).first().click();
            await expect(page.getByRole('dialog')).toHaveCount(0, {timeout: 10_000});
            await sleep(600); // the modal store's close slot (patterns.md pitfall 4)
        }
        out.rowAfter = flat(await rowOf(email).innerText().catch(() => ''));
        return out;
    };

    // ── profile › Roles › the second journal's "Reader" ───────────────────
    const readerBoxInJ2 = async () => {
        const id = sql(app, `SELECT ug.user_group_id FROM user_groups ug JOIN ${ct.table} c ON c.${ct.id} = ug.context_id
            WHERE c.path = '${J2.path}' AND ug.role_id = 1048576 ORDER BY ug.user_group_id LIMIT 1`).split("\n")[0];
        return page.locator(`input[name="readerGroup[${id}]"]`);
    };
    const setReaderInJ2 = async (want, key) => {
        await page.goto(app.url(`/index.php/${app.contextPath}/en/user/profile/roles`));
        await idle(page);
        const form = page.locator('#rolesForm');
        await expect(form).toBeVisible({timeout: 20_000});
        const fold = form.getByRole('link', {name: /^Register with other/});
        const out = {fold: flat(await fold.first().innerText().catch(() => null))};
        if (await fold.count()) await fold.first().click();
        const box = await readerBoxInJ2();
        await expect(box).toBeVisible({timeout: 10_000});
        out.label = flat(await page.locator(`label[for="${await box.getAttribute('id')}"]`).innerText().catch(() => null));
        if ((await box.isChecked()) !== want) await box.click();
        const save = page.waitForResponse((r) => /save-?roles/i.test(r.url()) && r.request().method() === "POST", {timeout: 30_000});
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        out.saveStatus = (await save).status();
        await idle(page);
        out.notice = (await snap(key)).text.main?.match(/Your changes have been saved\.?|Saved/)?.[0] || null;
        return out;
    };

    try {
        facts.before = {admin: account('admin'), target: account(tUser), targetRoles: rolesOf(tUser)};

        // ── preconditions, through the screens ───────────────────────────
        // A second journal, created by the Site Administrator.
        await signIn(page, 'admin');
        await page.goto(app.url(`/index.php/index/en/admin/contexts`));
        await idle(page);
        const create = page.locator('#contextGridContainer .header a[id*="createContext"]').first();
        facts.createLabel = flat(await create.innerText());
        await create.click();
        const cf = page.locator('form').filter({has: page.locator('[id^="context-name-control"]')}).last();
        await cf.locator('[id="context-name-control-en"]').waitFor({timeout: 30_000});
        await idle(page);
        const setText = async (id, v) => {
            const i = cf.locator(`[id="${id}"]`).first();
            await i.fill(v);
            await i.blur().catch(() => {});
        };
        await setText('context-name-control-en', J2.name);
        await setText('context-acronym-control-en', J2.acronym);
        await setText('context-contactName-control', 'admin admin');
        await setText('context-contactEmail-control', 'pkpadmin@mailinator.com');
        if (await cf.locator('select[name="country"]').count()) await cf.locator('select[name="country"]').first().selectOption({label: 'Iceland'});
        await setText('context-urlPath-control', J2.path);
        for (const [name, value] of [['supportedLocales', 'en'], ['primaryLocale', 'en'], ['enabled', 'true']]) {
            const b = cf.locator(`input[name="${name}"][value="${value}"]`).first();
            if ((await b.count()) && !(await b.isChecked())) await b.click();
        }
        const created = page.waitForResponse((r) => /\/api\/v1\/contexts/.test(r.url()) && r.request().method() === 'POST', {timeout: 30_000});
        await cf.getByRole('button', {name: 'Save', exact: true}).click();
        facts.createStatus = (await created).status();
        await page.waitForURL(/admin\/wizard/, {timeout: 30_000}).catch(() => {});
        await idle(page);
        facts.j2 = sql(app, `SELECT ${ct.id} || ' ' || path || ' enabled=' || enabled FROM ${ct.table} WHERE path = '${J2.path}'`);

        // The target user takes the Reader role there, on their profile.
        await signIn(page, tUser);
        facts.targetTakesReader = await setReaderInJ2(true, '00-profile-roles-reader');
        facts.targetRolesAfterPre = rolesOf(tUser);

        // ── 1-4: rvaca's "Disable User" ──────────────────────────────────
        await signIn(page, 'rvaca');
        await openList();
        const list = await snap('02-users-roles');
        facts.heading = (list.text.main || '').split('\n').find((l) => /Current Users/.test(l));
        facts.step3admin = await disableWindow('pkpadmin@mailinator.com', 'admin', '03-admin-disable');
        await openList();
        facts.step4target = await disableWindow(tEmail, tFamily, '04-target-disable');
        // Control: a user with a role in this journal only.
        await openList();
        facts.control = await disableWindow(`${CONTROL[0]}@mailinator.com`, CONTROL[1], '04c-control-disable');
        facts.afterStep4 = {admin: account('admin'), target: account(tUser)};

        // ── 5-6: admin disables the target; rvaca's "Enable User" ─────────
        await signIn(page, 'admin');
        await openList();
        facts.step5adminDisables = await disableWindow(tEmail, tFamily, '05-admin-disables-target', {ok: true});
        facts.afterStep5 = account(tUser);
        await signIn(page, 'rvaca');
        await openList();
        facts.step6target = await disableWindow(tEmail, tFamily, '06-target-enable');
        facts.afterStep6 = account(tUser);

        // ── neighbour: a role that ended elsewhere still lets rvaca disable ─
        await signIn(page, 'admin');
        await openList();
        facts.nbAdminEnables = await disableWindow(tEmail, tFamily, '07-admin-enables-target', {ok: true});
        await signIn(page, tUser);
        facts.nbTargetDropsReader = await setReaderInJ2(false, '07-profile-roles-unticked');
        facts.nbTargetRoles = rolesOf(tUser);
        await signIn(page, 'rvaca');
        await openList();
        facts.nbTarget = await disableWindow(tEmail, tFamily, '08-target-ended-elsewhere-disable');
        facts.after = {admin: account('admin'), target: account(tUser)};
    } finally {
        record('facts', facts);
        await close();
    }
});
