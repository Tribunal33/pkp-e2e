// Helpers for walk.js (U63 OMP1). Requiring this file runs nothing.
const {idle} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');

/** Open Tools from the side menu's address; returns the Import/Export tab's tool names. */
async function openTools(app, page) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/tools`));
    const tab = page.locator('#managementTabs');
    await tab.getByRole('link', {name: 'Native XML Plugin', exact: true}).waitFor();
    await idle(page).catch(() => {});
    const links = await tab.locator('.pkp_page_importexport_plugins li > a').allInnerTexts();
    return {heading: native.flat(await page.locator('h1').first().innerText(), 80), tools: links.map((t) => t.trim())};
}

/** Press a tool's name in the Tools list; returns what the browser got back and showed. */
async function pressTool(page, name) {
    const link = page.locator('#managementTabs').getByRole('link', {name, exact: true});
    const respP = page.waitForResponse((r) => r.url().includes('/management/importexport/plugin/') && r.request().resourceType() === 'document');
    await link.click();
    const resp = await respP;
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
    const body = native.flat(await page.locator('body').innerText().catch(() => ''), 400);
    return {
        url: native.rel(resp.url()),
        status: resp.status(),
        type: (resp.headers()['content-type'] || '').split(';')[0],
        bytes: (await resp.body().catch(() => Buffer.alloc(0))).length,
        heading: native.flat(await page.locator('h1').first().innerText({timeout: 2000}).catch(() => null), 120),
        trail: native.flat(await page.locator('nav[aria-label="Breadcrumb"], .pkp_breadcrumbs').first().innerText({timeout: 1000}).catch(() => null), 160),
        body,
    };
}

module.exports = {openTools, pressTool};
