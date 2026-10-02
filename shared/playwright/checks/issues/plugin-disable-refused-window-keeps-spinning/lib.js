// Helpers of walk.js (U62 A9 issue walk: a Site Administrator with no manager role in a
// journal ticks and unticks its plugins in the Settings Wizard). Requiring this file runs
// nothing. Every helper presses what a person presses on PKP's default test dataset.
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** Per app: the "Hosted …" link and the manager role the dataset gives `admin`. */
const CASES = {
    ojs: {hosted: 'Hosted Journals', manager: 'Journal manager', components: 'Article Components', component: 'Article Text'},
    omp: {hosted: 'Hosted Presses', manager: 'Press manager', components: 'Monograph Components', component: 'Book Manuscript'},
    ops: {hosted: 'Hosted Servers', manager: 'Preprint Server manager', components: 'Preprint Components', component: 'Preprint Text'},
};

const GRID = '.pkp_controllers_grid[id^="component-grid-settings-plugins-settingsplugingrid-"]:visible';
const rowLoc = (page, id) => page.locator(GRID).first().locator(`tr.gridRow[id$="-row-${id}"]`).first();

/** Administration › "Hosted …" › the context's arrow › "Settings wizard"; returns the wizard page object. */
async function openWizard(page, app) {
    const {HostedContextsPage} = require('../../../pages/UsersManagementPages.js');
    const hosted = new HostedContextsPage(page, {hostedLabel: CASES[app.name].hosted});
    await hosted.gotoFromAdministration();
    await hosted.openSettingsWizard(app.contextPath);
    await idle(page);
    return hosted;
}

/**
 * In the wizard: tab "Users", "Search" for admin, "Edit User", tick `add`, untick `remove`, "OK".
 * Returns the boxes' states before and after, and the window's own state after "OK".
 */
async function swapAdminRole(page, hosted, {add, remove}) {
    const {UserDetailsWindow} = require('../../../pages/UsersManagementPages.js');
    const grid = await hosted.openWizardTab('Users');
    await grid.search({text: 'admin'});
    const who = 'pkpadmin@mailinator.com';
    await grid.chooseAction(who, 'Edit User');
    const win = new UserDetailsWindow(page, 'Edit User');
    await win.expectOpen();
    const o = {before: {[add]: await win.roleBox(add).isChecked(), [remove]: await win.roleBox(remove).isChecked()}};
    await win.roleBox(add).check();
    await win.roleBox(remove).uncheck();
    const answer = page.waitForResponse((r) => /update-user/i.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await win.pressOk();
    const res = await answer;
    o.status = res ? res.status() : 'no request';
    await pause(800);
    o.windowOpen = (await win.form.count()) > 0;
    o.formError = o.windowOpen ? flat(await win.form.innerText().catch(() => ''), 300) : null;
    await idle(page);
    o.rowRoles = flat(await grid.row(who).first().innerText().catch(() => ''), 200);
    return o;
}

/** In the wizard: tab "Plugins", the journal's plugin list loaded. */
async function openPluginsTab(page) {
    await page.locator('#plugins-button').first().click();
    await page.locator(GRID).first().locator('tr.gridRow').first().waitFor({timeout: T});
    await idle(page);
    await pause(400);
}

/** The notices on the page (toasts) within `ms`. */
async function notices(page, ms = 3000) {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
        const t = await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => []);
        if (t.length) return t.map((x) => flat(x, 200));
        await pause(150);
    }
    return [];
}

/**
 * Press a plugin's box. When the "Disable" window opens, press `answer` there. Records the
 * enable/disable request's answer, browser dialogs, page notices, the box and the window
 * afterwards (and 3 s later). Never throws on the state a fix brings.
 */
async function pressBox(page, id, {answer = 'OK', dialogs}) {
    const o = {};
    const row = rowLoc(page, id);
    await row.waitFor({timeout: T});
    o.name = flat(await row.locator('td').first().innerText().catch(() => ''), 60);
    const box = row.locator('input[type=checkbox]').first();
    o.before = await box.isChecked();
    const firstDialog = dialogs.length;
    const bodies = [];
    const onResp = (r) => {
        if (r.request().method() === 'POST' && /\/(enable|disable)(\?|$)/.test(r.url())) {
            bodies.push(r.text().then((t) => ({status: r.status(), body: flat(t, 400)})).catch(() => ({status: r.status(), body: null})));
        }
    };
    page.on('response', onResp);
    await box.click({noWaitAfter: true});
    await pause(800);
    const dlg = page.getByRole('dialog').filter({hasText: /disable/i}).last();
    if (await dlg.isVisible().catch(() => false)) {
        o.window = {text: flat(await dlg.innerText()), buttons: (await dlg.getByRole('button').allInnerTexts()).map((b) => flat(b, 30)).filter(Boolean)};
        await dlg.getByRole('button', {name: answer, exact: true}).first().click();
        o.answered = answer;
    }
    o.notices = await notices(page);
    await idle(page).catch(() => {});
    await pause(500);
    o.after = await rowLoc(page, id).locator('input[type=checkbox]').first().isChecked().catch(() => null);
    const open = async () => {
        const d = page.getByRole('dialog').filter({hasText: /disable/i}).last();
        if (!(await d.isVisible().catch(() => false))) return null;
        return {
            text: flat(await d.innerText().catch(() => '')),
            spinner: await d.locator('.pkpSpinner, [class*="spinner"], [class*="Spinner"]').count().catch(() => 0),
            busyButtons: await d.locator('button[disabled], button[aria-disabled="true"]').count().catch(() => 0),
        };
    };
    o.windowAfter = await open();
    if (o.windowAfter) {
        await pause(3000);
        o.windowAfter3s = await open();
        // The way round: "Cancel" in the window still open.
        const d = page.getByRole('dialog').filter({hasText: /disable/i}).last();
        const cancel = d.getByRole('button', {name: 'Cancel', exact: true}).first();
        o.cancelEnabled = await cancel.isEnabled().catch(() => null);
        try {
            await cancel.click({timeout: 5000});
            await pause(1000);
            o.afterCancel = {windowOpen: !!(await open()), box: await rowLoc(page, id).locator('input[type=checkbox]').first().isChecked().catch(() => null)};
        } catch (e) {
            o.afterCancel = {error: flat(e.message, 200)};
        }
    }
    page.off('response', onResp);
    o.requests = await Promise.all(bodies);
    o.browserDialogs = dialogs.slice(firstDialog);
    return o;
}

/**
 * As the signed-in manager: Settings › Workflow › "Submission" › "Components", the arrow of a
 * component the dataset's submission files carry, "Delete", "OK". Records the delete's answer,
 * browser dialogs, the window afterwards (and 3 s later), then "Cancel" when it is still open,
 * and whether the row is still listed. Never throws on the state a fix brings.
 */
async function componentRefusal(page, app, {dialogs}) {
    const {WorkflowSubmissionSettings} = require('../../../pages/SubmissionIntakePages.js');
    const c = CASES[app.name];
    const settings = new WorkflowSubmissionSettings(page, app.contextPath, {listTitle: c.components});
    await settings.goto('Components');
    await idle(page);
    const o = {component: c.component};
    const controls = await settings.components.rowControls(c.component);
    await controls.getByRole('link', {name: 'Delete', exact: true}).click();
    const dlg = page.getByRole('dialog').filter({hasText: /delete/i}).last();
    await dlg.waitFor({timeout: T});
    o.window = flat(await dlg.innerText());
    const firstDialog = dialogs.length;
    const answer = page.waitForResponse((r) => /\/genre-grid\/delete-genre/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await dlg.getByRole('button', {name: 'OK', exact: true}).click();
    const res = await answer;
    o.request = {status: res.status(), body: flat(await res.text().catch(() => ''), 400)};
    await idle(page).catch(() => {});
    await pause(1000);
    const open = async () => {
        const d = page.getByRole('dialog').filter({hasText: /delete/i}).last();
        if (!(await d.isVisible().catch(() => false))) return null;
        return {
            text: flat(await d.innerText().catch(() => '')),
            spinner: await d.locator('.pkpSpinner, [class*="spinner"], [class*="Spinner"]').count().catch(() => 0),
            busyButtons: await d.locator('button[disabled], button[aria-disabled="true"]').count().catch(() => 0),
        };
    };
    o.windowAfter = await open();
    if (o.windowAfter) {
        await pause(3000);
        o.windowAfter3s = await open();
        const cancel = page.getByRole('dialog').filter({hasText: /delete/i}).last().getByRole('button', {name: 'Cancel', exact: true}).first();
        o.cancelEnabled = await cancel.isEnabled().catch(() => null);
        try {
            await cancel.click({timeout: 5000});
            await pause(1000);
            o.afterCancel = {windowOpen: !!(await open())};
        } catch (e) {
            o.afterCancel = {error: flat(e.message, 200)};
        }
    }
    o.browserDialogs = dialogs.slice(firstDialog);
    o.rowStillListed = (await settings.components.row(c.component).count()) > 0;
    return o;
}


/**
 * As the signed-in manager: the component delete of componentRefusal() up to the refusal's alert,
 * then, with the window still open, Escape; if it is still open, a click on the page outside it.
 * Records whether the window is open after each.
 */
async function componentDismiss(page, app, {dialogs}) {
    const {WorkflowSubmissionSettings} = require('../../../pages/SubmissionIntakePages.js');
    const c = CASES[app.name];
    const settings = new WorkflowSubmissionSettings(page, app.contextPath, {listTitle: c.components});
    await settings.goto('Components');
    await idle(page);
    const o = {component: c.component};
    const controls = await settings.components.rowControls(c.component);
    await controls.getByRole('link', {name: 'Delete', exact: true}).click();
    const dlg = () => page.getByRole('dialog').filter({hasText: /delete/i}).last();
    await dlg().waitFor({timeout: T});
    const firstDialog = dialogs.length;
    const answer = page.waitForResponse((r) => /\/genre-grid\/delete-genre/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await dlg().getByRole('button', {name: 'OK', exact: true}).click();
    o.status = (await answer).status();
    await idle(page).catch(() => {});
    await pause(1500);
    const state = async () => {
        const d = dlg();
        if (!(await d.isVisible().catch(() => false))) return {open: false};
        return {open: true, spinner: await d.locator('[class*="pinner"]').count().catch(() => 0), disabledButtons: await d.locator('button[disabled]').count().catch(() => 0)};
    };
    o.before = await state();
    if (o.before.open) {
        await page.keyboard.press('Escape');
        await pause(1500);
        o.afterEscape = await state();
        if (o.afterEscape.open) {
            await page.mouse.click(8, 450);
            await pause(1500);
            o.afterClickOutside = await state();
        }
    }
    o.browserDialogs = dialogs.slice(firstDialog);
    o.rowStillListed = (await settings.components.row(c.component).count()) > 0;
    return o;
}

/** The side menu's entries on the context's editorial dashboard, opened by its address. */
async function sideMenu(page, app) {
    const o = {};
    const res = await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial`)).catch(() => null);
    o.status = res ? res.status() : null;
    await idle(page).catch(() => {});
    await pause(800);
    o.url = page.url().replace(/^https?:\/\/[^/]+/, '');
    o.nav = flat(await page.locator('nav').first().innerText().catch(() => ''), 600);
    o.settingsLinks = await page.locator('a[href*="/management/settings/"]').evaluateAll((as) => as.map((a) => (a.innerText || a.textContent || '').trim() + ' ' + a.getAttribute('href').replace(/^https?:\/\/[^/]+/, ''))).catch(() => []);
    o.errorWindow = flat(await page.getByRole('dialog').allInnerTexts().catch(() => []).then((a) => a.join(' | ')), 200) || null;
    return o;
}

module.exports = {componentDismiss, sideMenu, T, flat, pause, CASES, GRID, rowLoc, openWizard, swapAdminRole, openPluginsTab, notices, pressBox, componentRefusal};
