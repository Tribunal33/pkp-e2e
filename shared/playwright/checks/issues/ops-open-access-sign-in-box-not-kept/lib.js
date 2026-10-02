// Helpers of walk.js (issue report docs/issues/U54-OPS1-ops-open-access-sign-in-box-not-kept.md).
// Requiring this file runs nothing. Every helper presses what a person presses, or types an address.
const {idle, sql} = require('../../../probe');

const BOX = 'Users must be registered and log in to view open access content.';

/**
 * Per app, on PKP's default test dataset: the box's group and stored name, the published item
 * whose file the visitor opens, and a signed-in reader for the neighbour check.
 */
const CASES = {
    ojs: {group: 'View Article Content', setting: 'restrictArticleAccess', item: '/article/view/17', reader: 'ckwantes'},
    omp: {group: 'View Monograph Content', setting: 'restrictMonographAccess', item: '/catalog/book/5', reader: 'aclark'},
    ops: {group: 'View Preprint Content', setting: 'restrictPreprintAccess', item: '/preprint/view/2', reader: 'ckwantes'},
};

const rel = (u) => (u || '').replace(/^https?:\/\/[^/]+/, '');
const flat = (t) => (t || '').replace(/\s+/g, ' ').trim();

/** Settings > Users & Roles, its "Site Access Options" tab opened. */
async function accessTab(page, app) {
    const {SiteAccessTab} = require('../../../pages/RolesConfigurationPages.js');
    const tab = new SiteAccessTab(page, app.contextPath);
    await tab.goto();
    return tab;
}

/** The box under the app's "View … Content" group: {group, checked}. */
async function boxState(tab, app) {
    const group = tab.group(CASES[app.name].group);
    const box = group.getByRole('checkbox', {name: BOX, exact: true});
    if (!(await group.count())) return {group: false, checked: null, groups: await groups(tab)};
    return {group: true, checked: await box.isChecked()};
}

/** The headings of the tab's groups, as the form shows them. */
async function groups(tab) {
    return (await tab.panel.locator('legend, .pkpFormFieldLabel').allInnerTexts()).map(flat).filter(Boolean);
}

/** Choose a "User Registration" radio by its label, "Save"; the answer's status and "Saved". */
async function chooseRegistration(page, tab, label) {
    await tab.radio(label).check();
    const response = await tab.save();
    return {status: response.status(), saved: await tab.saved.first().isVisible()};
}

/** Tick the box and press "Save": the request's posted field, the answer's status and whether it echoes the field, "Saved". */
async function tickAndSave(page, tab, app, tick = true) {
    const name = CASES[app.name].setting;
    const box = tab.group(CASES[app.name].group).getByRole('checkbox', {name: BOX, exact: true});
    if (!(await box.count())) return {offered: false};
    if (tick) await box.check();
    else await box.uncheck();
    const asked = page.waitForRequest((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.method() !== 'GET', {timeout: 30_000});
    const response = await tab.save();
    const post = (await asked).postData() || '';
    let echoed = null;
    try {
        const body = await response.json();
        echoed = Object.prototype.hasOwnProperty.call(body, name) ? body[name] : '(absent)';
    } catch (e) {
        echoed = `(unreadable: ${e.message.slice(0, 60)})`;
    }
    let posted = null;
    try {
        const j = JSON.parse(post);
        posted = Object.prototype.hasOwnProperty.call(j, name) ? j[name] : '(absent)';
    } catch {
        posted = post.slice(0, 200);
    }
    return {status: response.status(), posted, echoed, saved: await tab.saved.first().isVisible()};
}

/** The context's stored value of the app's setting ('' when no row). */
function stored(app, name) {
    const t = app.contextTables;
    return sql(
        app,
        `select coalesce(string_agg(s.setting_value, ','), '') from ${t.settings} s join ${t.table} c on c.${t.id} = s.${t.id} where c.path = '${app.contextPath}' and s.setting_name = '${name}'`
    ).trim();
}

/**
 * Open the item's page, press its file link (the galley link, or the book's format file), then the
 * viewer's download link: where each landed, the page heading, and the file when one downloaded.
 */
async function openFile(page, app) {
    const out = {};
    await page.goto(app.url(`/index.php/${app.contextPath}${CASES[app.name].item}`));
    await idle(page).catch(() => {});
    out.item = {url: rel(page.url()), h1: flat(await page.locator('h1').first().innerText({timeout: 3000}).catch(() => ''))};
    const link = app.name === 'omp' ? page.locator('a.cmp_download_link').first() : page.locator('a.obj_galley_link').filter({hasText: /PDF/}).first();
    out.link = (await link.count()) ? {text: flat(await link.innerText()), href: rel(await link.getAttribute('href'))} : null;
    if (!out.link) return out;
    const navs = [];
    const onResponse = (r) => {
        if (r.request().isNavigationRequest() && r.request().frame() === page.mainFrame()) navs.push(`${r.status()} ${rel(r.url())}`);
    };
    page.on('response', onResponse);
    const dl1 = page.waitForEvent('download', {timeout: 6000}).catch(() => null);
    await link.click();
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
    const d1 = await Promise.race([dl1, new Promise((r) => setTimeout(() => r(null), 1500))]);
    out.file = {landed: rel(page.url()), navigations: navs.splice(0), title: await page.title().catch(() => ''), h1: flat(await page.locator('h1').first().innerText({timeout: 2000}).catch(() => '')), download: d1 ? d1.suggestedFilename() : null};
    out.file.login = /\/login(\?|$|\/)/.test(out.file.landed);
    const dlLink = page.locator('a.download, a[href*="/download/"]').first();
    if (!out.file.login && (await dlLink.count())) {
        const href = rel(await dlLink.getAttribute('href'));
        const dl2 = page.waitForEvent('download', {timeout: 8000}).catch(() => null);
        const resp = await page.goto(app.url(href)).catch((e) => ({err: e.message.slice(0, 80)}));
        const d2 = await dl2;
        await idle(page).catch(() => {});
        out.download = {href, status: resp && resp.status ? resp.status() : resp && resp.err, landed: rel(page.url()), file: d2 ? d2.suggestedFilename() : null, navigations: navs.splice(0)};
    }
    page.off('response', onResponse);
    return out;
}

module.exports = {BOX, CASES, rel, flat, accessTab, boxState, groups, chooseRegistration, tickAndSave, stored, openFile};
