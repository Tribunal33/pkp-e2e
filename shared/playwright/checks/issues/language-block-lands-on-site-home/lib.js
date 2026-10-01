// Helpers for the language-block-lands-on-site-home walk. Requiring this file
// runs nothing.
const {idle, loc} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** The form on "Appearance" › "Setup" (a journal's Website settings or the site's Settings). */
const setupForm = (page) => page.locator('form').filter({has: page.locator('input[name="sidebar"]')}).first();

/** Open "Appearance" › "Setup" from a settings page address (journal: …/management/settings/website; site: /index/en/admin/settings). */
async function openAppearanceSetup(page, address) {
    await page.goto(address);
    await idle(page);
    await page.locator('#appearance-button').first().click();
    await idle(page);
    await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click();
    await idle(page);
    await setupForm(page).waitFor({timeout: T});
    await pause(600);
}

/** The "Sidebar" boxes as {value, checked, label}. */
async function sidebarBoxes(page) {
    return page.locator('input[name="sidebar"]').evaluateAll((els) => els.map((e) => ({
        value: e.value, checked: e.checked, label: ((e.closest('label') || e.parentElement).innerText || '').replace(/\s+/g, ' ').trim(),
    })));
}

/** Tick one "Sidebar" box (by its plugin name) and press the form's "Save"; returns the save request and its status. */
async function placeBlockAndSave(page, value) {
    await page.locator(`input[name="sidebar"][value="${value}"]`).first().check();
    await pause(300);
    const form = setupForm(page);
    const w = page.waitForResponse((r) => /\/api\/v1\/(contexts\/\d+|site)(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await loc(page, 'Appearance › Setup: Save', form.getByRole('button', {name: 'Save', exact: true}));
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await w;
    await pause(800);
    await idle(page);
    return r ? {url: r.url().replace(/^https?:\/\/[^/]+/, ''), method: r.request().method(), status: r.status()} : null;
}

/** The sidebar "Language" block as data: heading and links (text and href). */
async function languageBlock(page) {
    const block = page.locator('.block_language').first();
    if (!(await block.count())) return null;
    return block.evaluate((b) => ({
        heading: (b.querySelector('.title') || {}).innerText?.trim() || null,
        links: [...b.querySelectorAll('a')].map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')})),
    }));
}

/** Choose a language in the sidebar block; returns the link's href and where the browser landed. */
async function chooseInBlock(page, name) {
    const link = page.locator('.block_language a').filter({hasText: name}).first();
    await loc(page, `"Language" block: the ${name} link`, link);
    const href = await link.getAttribute('href', {timeout: T});
    const hops = [];
    const onResp = (r) => { if (r.request().isNavigationRequest() && r.request().frame() === page.mainFrame()) hops.push({url: r.url(), status: r.status(), location: r.headers().location || null}); };
    page.on('response', onResp);
    await Promise.all([page.waitForLoadState('load'), link.click()]);
    await pause(300);
    await idle(page);
    page.off('response', onResp);
    return {href, hops, landed: page.url(), lang: await page.evaluate(() => document.documentElement.lang)};
}

const LABELS = {
    ojs: {noun: 'Journal', hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal'},
    omp: {noun: 'Press', hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press'},
    ops: {noun: 'Server', hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server'},
};

/**
 * Administration › Hosted Journals (Presses, Servers) › "Create Journal": a
 * second context in English, enabled, so the site's own settings offer
 * "Appearance" (a one-context site has none). `page` is signed in as admin.
 * Returns the save's status and where the page landed.
 */
async function createSecondContext(page, app, {path, name}) {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const L = LABELS[app.name];
    const hosted = new HostedJournalsPage(page, L);
    await page.goto(app.url('/index.php/index/en/admin/contexts'));
    await hosted.expectOpen();
    const win = await hosted.openCreate();
    await win.type(win.title('en'), name);
    await win.type(win.initials('en'), 'UJ');
    if (await win.abbreviation('en').isVisible().catch(() => false)) await win.type(win.abbreviation('en'), 'UJ');
    await win.type(win.contactName, `${name} Contact`);
    await win.type(win.contactEmail, `${path}@mailinator.com`);
    await win.country.selectOption({label: 'Canada'});
    await win.type(win.path, path);
    if (await win.languageBox('en').count()) {
        await win.setBox(win.languageBox('en'), true);
        await win.setBox(win.primaryChoice('en'), true);
    }
    if (await win.enableBox.count()) await win.setBox(win.enableBox, true);
    const r = await win.pressSave();
    await page.waitForURL(/\/admin\/wizard\/\d+/, {timeout: T}).catch(() => {});
    await idle(page);
    return {status: r.status(), landed: page.url()};
}

/** "Change Language" in the user menu (initials, top right) of an editorial screen. */
async function changeLanguageInUserMenu(page, name) {
    const btn = page.locator('[data-cy="app-user-nav"] button').first();
    await loc(page, 'user menu: the initials button', btn);
    await btn.click();
    const menu = page.locator('[data-cy="app-user-nav"] nav').first();
    await menu.waitFor({timeout: T});
    const link = menu.locator('a').filter({hasText: name}).first();
    await loc(page, `user menu: the ${name} link`, link);
    const href = await link.getAttribute('href');
    await Promise.all([page.waitForLoadState('load'), link.click()]);
    await pause(300);
    await idle(page);
    return {href, landed: page.url(), lang: await page.evaluate(() => document.documentElement.lang)};
}

module.exports = {createSecondContext, openAppearanceSetup, sidebarBoxes, placeBlockAndSave, languageBlock, chooseInBlock, changeLanguageInUserMenu};
