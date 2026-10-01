// Helpers for walk.js and neighbour.js (U63 OJS2). Requiring this file runs nothing.
const {idle} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const a1 = require('../tool-address-without-tool-raw-text/lib');

/** Settings › Website › "Plugins" with a row handle for `pluginId` (Citation Style Language page object, another row id). */
function plugins(app, page, pluginId) {
    const {CitationStyleSettings} = require('../../../pages/ArticleLandingPages');
    const s = new CitationStyleSettings(page, app.contextPath);
    s.pluginId = pluginId;
    return s;
}

/** Open Settings › Website › "Plugins" (a fresh page load) and wait for the grid. */
async function openPlugins(app, page) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/website`));
    await page.locator('#plugins-button').click();
    await page.locator('#pluginGridContainer tr.gridRow').first().waitFor();
    await idle(page).catch(() => {});
}

/** One row's state on the Plugins list, or {listed: false}. */
async function rowState(app, page, pluginId) {
    const s = plugins(app, page, pluginId);
    if (!(await s.row().count())) return {pluginId, listed: false};
    const box = s.enabledBox();
    return {
        pluginId,
        listed: true,
        text: native.flat(await s.row().innerText(), 160),
        ticked: await box.isChecked().catch(() => null),
        pressable: await box.isEnabled().catch(() => null),
    };
}

/** The plugin names under the "Import/Export Plugins" heading of the Plugins list (row ids carry the category). */
async function importExportRows(page) {
    return page.evaluate(() => [...document.querySelectorAll('#pluginGridContainer tr.gridRow[id*="-category-importexport-row-"]')]
        .filter((tr) => !/-row-importexport$/.test(tr.id))
        .map((tr) => tr.id.replace(/^.*-row-/, '')));
}

/** The side menu's "Tools": the "Import/Export" tab's tool names. */
async function toolsList(app, page) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/tools`));
    const tab = page.locator('#managementTabs');
    await tab.getByRole('link', {name: 'Native XML Plugin', exact: true}).waitFor();
    await idle(page).catch(() => {});
    return (await tab.locator('.pkp_page_importexport_plugins li > a').allInnerTexts()).map((t) => t.trim());
}

/** Tick or untick a row's "Enabled" box (unticking answers "OK"); returns the question and notice. */
async function setEnabled(app, page, pluginId, want) {
    const s = plugins(app, page, pluginId);
    const question = await s.setEnabled(want);
    const notice = await page.locator('.pkpNotification, [role="status"], .pkp_notification').last()
        .innerText({timeout: 3000}).catch(() => null);
    return {question: native.flat(question, 120), notice: native.flat(notice, 120)};
}

/** Press a row's arrow, then the link `name` it reveals; returns where the browser went and what it shows. */
async function pressRowLink(app, page, pluginId, name) {
    const s = plugins(app, page, pluginId);
    const arrow = s.row().locator('a.show_extras');
    if (!(await arrow.count())) return {arrow: false};
    await arrow.click();
    const link = s.grid().locator(`tr[id$="-row-${pluginId}"] + tr`).getByRole('link', {name, exact: true});
    if (!(await link.count())) return {arrow: true, link: false};
    const respP = page.waitForResponse((r) => r.request().resourceType() === 'document');
    await link.click();
    const resp = await respP;
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
    const body = native.flat(await page.locator('body').innerText().catch(() => ''), 300);
    return {
        arrow: true,
        link: true,
        url: native.rel(resp.url()),
        status: resp.status(),
        type: (resp.headers()['content-type'] || '').split(';')[0],
        heading: native.flat(await page.locator('h1').first().innerText({timeout: 2000}).catch(() => null), 120),
        body,
        rawJson: /^\{"status":/.test(body),
    };
}

module.exports = {plugins, openPlugins, rowState, importExportRows, toolsList, setEnabled, pressRowLink, open: a1.open};
