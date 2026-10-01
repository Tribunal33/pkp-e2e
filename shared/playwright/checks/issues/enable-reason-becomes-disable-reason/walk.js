// Issue report U53 A7: on Settings › Users & Roles, "Enable User" opens with
// the old disabling reason in "Reason for enabling user", and whatever that
// box holds on "OK" is kept as the account's disabling reason: the next
// "Disable User" offers it, and the Login page quotes it to the user.
//
// Walks the report's Steps on PKP's default test dataset (a dataset fleet):
//   1-2  rvaca: Settings › Users & Roles
//   3    "David Buskins"'s row › "More Actions" › "Disable User", type Spam, "OK"
//   4    "Enable User": read the box, replace it with Appeal accepted, "OK"
//   5    "Disable User": read the box, "OK" as it stands
//   6    dbuskins signs in: read the Login page's refusal
// Neighbour check (fix in and out): rvaca enables David with the box emptied,
// disables him with "Spam again", and dbuskins's sign-in quotes "Spam again":
// a reason typed when disabling is still kept and shown. Then "Enable User"
// is opened once more to read its box, and closed. WALK=nb in front runs the
// neighbour check alone, for the walk
// without the fix.
//
// Run, on an install freshly loaded from the default dataset:
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/enable-reason-becomes-disable-reason/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both, --feature issues-3_5 and
// PROBE_FEATURE=issues-3_5.
// The fix check: node bin/try-fix.js apply <this folder>/fix.diff ojs omp ops,
// reset the dataset, walk, then node bin/try-fix.js revert ojs omp ops.
const {forEachApp, launch, signIn, screen, record, idle, sql} = require('../../../probe');
const {closeMenu} = require('../../../support/menus');

const TARGET = ['dbuskins', 'Buskins', 'David Buskins'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();

forEachApp(async (app) => {
    const {expect} = require('@playwright/test');
    const {LoginPage} = require('../../../pages/LoginPage.js');
    const facts = {app: app.name, line: app.line, dataset: app.dataset, startedAt: new Date().toISOString(), steps: {}};
    const {page, close} = await launch(app);
    const snap = async (name) => {
        const s = await screen(page);
        record(name, s);
        return s;
    };
    const [tUser, tFamily, tName] = TARGET;
    const tEmail = `${tUser}@mailinator.com`;
    const account = () => sql(app, `SELECT 'disabled=' || disabled || ' reason=' || coalesce(disabled_reason, '(null)') FROM users WHERE username = '${tUser}'`);

    // ── the Users list ────────────────────────────────────────────────────
    const users = page.getByRole('table', {name: /^Current Users \(/});
    const openList = async () => {
        await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/access`));
        await expect(users.locator('tbody tr').first()).toBeVisible({timeout: 30_000});
        await idle(page);
    };
    const rowOf = () => users.locator('tbody tr').filter({hasText: tEmail});
    const findRow = async () => {
        if (await rowOf().count()) return 'first page';
        await page.getByRole('searchbox').first().fill(tFamily);
        await page.getByRole('searchbox').first().press('Enter');
        await idle(page);
        await expect(rowOf()).toBeVisible({timeout: 15_000});
        return `searched "${tFamily}"`;
    };
    // "More Actions" › "Disable User" / "Enable User"; read the window, then
    // type `reason` (null: leave the box as it is) and press "OK", or close it.
    const reasonWindow = async (want, key, {reason = null, ok = true} = {}) => {
        const out = {};
        await openList();
        out.found = await findRow();
        await rowOf().getByRole('button').last().click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10_000});
        out.menu = (await page.getByRole('menuitem').allInnerTexts()).map((t) => t.trim());
        if (!out.menu.includes(want)) {
            out.offered = false;
            await closeMenu(page);
            return out;
        }
        const legacy = page.waitForResponse((r) => r.url().includes('edit-disable-user'), {timeout: 30_000});
        await page.getByRole('menuitem', {name: want, exact: true}).click();
        out.openStatus = (await legacy).status();
        const dlg = page.getByRole('dialog').last();
        const box = dlg.locator('textarea[name="disableReason"]');
        await expect(box).toBeVisible({timeout: 20_000});
        await idle(page);
        const s = await snap(key);
        out.title = flat((s.text.dialog || '').split('\n')[0]);
        out.label = flat(await dlg.locator('label[for^="disableReason"], .label').first().innerText().catch(() => null));
        out.window = s.text.dialog;
        out.boxOnOpen = await box.inputValue();
        if (!ok) {
            await dlg.getByRole('button', {name: 'Close', exact: true}).first().click();
            await expect(page.getByRole('dialog')).toHaveCount(0, {timeout: 10_000});
            await sleep(600); // the modal store's close slot (patterns.md pitfall 4)
            return out;
        }
        if (reason !== null) await box.fill(reason);
        out.boxOnOk = await box.inputValue();
        const post = page.waitForResponse((x) => /\/disable-user/.test(x.url()) && x.request().method() === 'POST', {timeout: 30_000});
        await dlg.getByRole('button', {name: 'OK', exact: true}).click();
        out.okStatus = (await post).status();
        await idle(page);
        await sleep(800);
        out.rowAfter = flat(await rowOf().innerText().catch(() => ''));
        out.stored = account();
        return out;
    };
    // The user's own sign-in, in a browser of their own: read what the Login
    // page says. (The manager's browser stays signed in.)
    const userSignsIn = async (key) => {
        const other = await launch(app);
        try {
            const login = new LoginPage(other.page);
            await other.page.goto(app.url(`/index.php/${app.contextPath}${app.line && /3_[34]/.test(app.line) ? '' : '/en'}/login`));
            await login.usernameInput.waitFor({timeout: 20_000});
            await login.submitCredentials(tUser, `${tUser}${tUser}`);
            await other.page.waitForLoadState('load');
            await idle(other.page);
            const s = await screen(other.page);
            record(key, s);
            const text = s.text.main || '';
            return {
                url: other.page.url().replace(app.baseURL, ''),
                refusal: (text.match(/Your account has been disabled[^\n]*/) || [null])[0],
                stillOnLogin: (await login.usernameInput.count()) > 0,
            };
        } finally {
            await other.close();
        }
    };

    try {
        facts.before = account();
        if (process.env.WALK !== 'nb') {
        // 1-2
        await signIn(page, 'rvaca');
        await openList();
        await snap('02-users-roles');
        // 3
        facts.steps.s3disable = await reasonWindow('Disable User', '03-disable-window', {reason: 'Spam'});
        // 4
        facts.steps.s4enable = await reasonWindow('Enable User', '04-enable-window', {reason: 'Appeal accepted'});
        // 5
        facts.steps.s5disable = await reasonWindow('Disable User', '05-disable-again-window', {reason: null});
        // 6
        facts.steps.s6signIn = await userSignsIn('06-login-refusal');
        }

        // ── neighbour: a disabling reason is still kept and quoted ──────────
        // (WALK=nb runs it alone, on a freshly loaded dataset.)
        if (process.env.WALK === 'nb') await signIn(page, 'rvaca');
        facts.nb = {};
        facts.nb.enableEmptied = await reasonWindow('Enable User', '07-nb-enable', {reason: ''});
        facts.nb.disableSpamAgain = await reasonWindow('Disable User', '08-nb-disable', {reason: 'Spam again'});
        facts.nb.signIn = await userSignsIn('09-nb-login-refusal');
        facts.nb.enableWindow = await reasonWindow('Enable User', '10-nb-enable-window', {ok: false});
        facts.after = account();
    } finally {
        record('facts', facts);
        await close();
    }
});
