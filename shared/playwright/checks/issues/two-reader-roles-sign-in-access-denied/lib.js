// Helpers of walk.js (issue report docs/issues/U22-A7-two-reader-roles-sign-in-access-denied.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle, screen, signIn} = require('../../../probe');

const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => {
    try {
        const x = new URL(u);
        return x.pathname + x.search;
    } catch (e) {
        return u;
    }
};

/** Run a step, recording its error instead of throwing, so the state a fix brings is read too. */
async function step(facts, name, fn) {
    try {
        facts.steps[name] = await fn();
    } catch (e) {
        facts.steps[name] = {error: flat(e && e.stack ? e.stack : e, 800)};
    }
    console.log('[k22]', facts.app, name, JSON.stringify(facts.steps[name]).slice(0, 600));
    return facts.steps[name];
}

/**
 * Settings > Users & Roles > "Roles" > "Create New Role": "Permission Level" (by its label),
 * "Role Name", "Abbreviation", "Allow user self-registration" ticked when asked, "OK".
 */
async function createRole(page, app, {level, name, abbrev, selfRegistration}) {
    const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
    const tab = new RolesTab(page, app.contextPath, {stages: []});
    await tab.goto();
    const win = await tab.openCreate();
    const levels = await win.levelOptions();
    await win.chooseLevel(level);
    await win.nameBox().fill(name);
    await win.abbrevBox().fill(abbrev);
    const box = win.optionBox('Allow user self-registration');
    if (selfRegistration) await box.check();
    const response = await win.save();
    return {levels, status: response.status(), rowListed: (await tab.rowNames()).includes(name)};
}

/** The context's own "Register" page, filled for a newcomer and sent (password: the username twice). */
async function register(page, app, username) {
    const {registerReader} = require('../login-from-journal-not-public-forgets-page/lib.js');
    return registerReader(page, app, {givenName: 'hkk22', familyName: 'Newcomer', username});
}

/** Profile > "Roles" of the context: the boxes ticked; tick `name`, "Save"; the boxes ticked again after a reload. */
async function tickOwnRole(page, app, name) {
    const {ProfilePage} = require('../../../pages/ProfilePage.js');
    const profile = new ProfilePage(page, app.contextPath);
    const ticked = async () => {
        const boxes = profile.currentContextSection().getByRole('checkbox');
        const out = [];
        for (let i = 0; i < (await boxes.count()); i++) {
            const b = boxes.nth(i);
            const label = flat(await b.evaluate((el) => (el.closest('label') || el.parentElement).innerText));
            out.push(`${label}${(await b.isChecked()) ? ' [x]' : ' [ ]'}`);
        }
        return out;
    };
    await profile.goto('roles');
    await idle(page).catch(() => {});
    const before = await ticked();
    await profile.roleBox(name).check();
    await profile.save();
    await profile.goto('roles');
    await idle(page).catch(() => {});
    return {before, after: await ticked()};
}

/**
 * Sign in on the context's own "Login" page and read where the account lands: every address
 * the browser was sent through, the page's address, heading and text.
 */
async function landing(page, app, username) {
    const chain = [];
    const onNav = (frame) => {
        if (frame === page.mainFrame()) chain.push(rel(frame.url()));
    };
    const redirects = [];
    const onResp = (r) => {
        if (r.request().isNavigationRequest() && r.status() >= 300 && r.status() < 400) {
            redirects.push(`${r.status()} ${rel(r.url())} -> ${rel(r.headers().location || '')}`);
        }
    };
    page.on('framenavigated', onNav);
    page.on('response', onResp);
    try {
        await signIn(page, username, {contextPath: app.contextPath});
        await page.waitForLoadState('load');
        await idle(page).catch(() => {});
    } finally {
        page.off('framenavigated', onNav);
        page.off('response', onResp);
    }
    const s = await screen(page);
    return {url: rel(page.url()), redirects, chain, title: flat(await page.title()), main: flat(s.text && (s.text.main || s.text.body || s.text.header), 300)};
}

/** Type an address in the signed-in session and read where it lands. */
async function typed(page, app, path) {
    await page.goto(app.url(`/index.php/${app.contextPath}${path}`));
    await idle(page).catch(() => {});
    const s = await screen(page);
    return {url: rel(page.url()), title: flat(await page.title()), main: flat(s.text && (s.text.main || s.text.body || s.text.header), 300)};
}

/**
 * As the site administrator: Administration > "Hosted Journals" > the context's row >
 * "Settings wizard" > "Users": search the username, "Edit User", tick and untick role boxes, "OK".
 */
async function setRolesAsAdmin(page, app, {username, hostedLabel, tick = [], untick = []}) {
    const {HostedContextsPage, UserDetailsWindow} = require('../../../pages/UsersManagementPages.js');
    const hosted = new HostedContextsPage(page, {hostedLabel});
    await hosted.gotoFromAdministration();
    await hosted.openSettingsWizard(app.contextPath);
    const grid = await hosted.openWizardTab('Users');
    await grid.search({text: username});
    await grid.chooseAction(username, 'Edit User');
    const win = new UserDetailsWindow(page, 'Edit User');
    await win.expectOpen();
    for (const r of tick) await win.roleBox(r).check();
    for (const r of untick) await win.roleBox(r).uncheck();
    await win.pressOk();
    await win.expectClosed();
    await idle(page).catch(() => {});
    return {tick, untick, done: true};
}

module.exports = {flat, rel, step, createRole, register, tickOwnRole, landing, typed, setRolesAsAdmin};
