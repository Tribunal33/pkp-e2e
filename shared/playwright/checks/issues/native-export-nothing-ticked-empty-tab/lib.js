// Helpers for pressing the Native XML Plugin's export buttons, shared by walk.js and
// neighbour.js. The page helpers come from the sibling issue walk's lib.js.
// Requiring this file runs nothing.
const {idle} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');

/** Record every browser dialog (alert) the page raises, and accept it. */
function dialogs(page) {
    const seen = [];
    page.on('dialog', async (d) => {
        seen.push({type: d.type(), message: native.flat(d.message(), 300)});
        await d.accept().catch(() => {});
    });
    return seen;
}

/** Open the "Export Issues" tab {OJS}; waits for its issues grid. */
async function openIssuesTab(page) {
    await page.locator('#importExportTabs > ul').getByRole('tab', {name: 'Export Issues', exact: true}).click();
    await idle(page).catch(() => {});
    await page.locator('#exportIssues-tab tr.gridRow').first().waitFor({timeout: 20_000}).catch(() => {});
    await idle(page).catch(() => {});
}

/** The export button of a tab: 'submissions', 'issues' {OJS} or 'onix' {OMP}. */
function exportButton(app, page, which) {
    if (which === 'issues') return page.locator('#exportIssuesXmlForm').getByRole('button', {name: 'Export Issues', exact: true});
    if (which === 'onix') return page.locator('#export-tab').getByRole('button', {name: 'Export Submissions', exact: true});
    return page.locator('#exportSubmissions-tab').getByRole('button', {name: native.LABELS[app.name].exportBtn, exact: true});
}

/** {OMP} Settings › Press › "Masthead": fill the four "Publisher Identity" details the ONIX tool needs, "Save". */
async function fillPublisherIdentity(app, page, d) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/context`));
    await idle(page).catch(() => {});
    await page.getByRole('tab', {name: 'Masthead'}).first().click().catch(() => {});
    await page.locator('[name="publisher"]').first().waitFor({timeout: 20_000});
    await idle(page).catch(() => {});
    const f = page.locator('form').filter({has: page.locator('[name=publisher]')}).first();
    await f.locator('[name="publisher"]').first().fill(d.publisher);
    await f.locator('[name="location"]').first().fill(d.location);
    await f.locator('select[name="codeType"]').first().selectOption({label: d.codeType});
    await f.locator('[name="codeValue"]').first().fill(d.codeValue);
    await f.getByRole('button', {name: 'Save', exact: true}).first().click();
    return page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 15_000}).then(() => true).catch(() => false);
}

/** {OMP} Tools › Import/Export › "ONIX 3.0 Monograph Export Plugin", its "Export" tab. */
async function openOnix(app, page) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/importexport/plugin/Onix30ExportPlugin`));
    await page.locator('#importExportTabs').waitFor({timeout: 20_000});
    await idle(page).catch(() => {});
    await page.locator('#export-tab .listPanel__item').first().waitFor({timeout: 15_000}).catch(() => {});
    await idle(page).catch(() => {});
}

const tabs = (page) => page.locator('#importExportTabs > ul [role="tab"]').evaluateAll((ts) => ts.map((t) => `${t.innerText.trim()}${t.getAttribute('aria-selected') === 'true' ? '*' : ''}`)).catch(() => []);
const panelText = async (page) => native.flat(await page.locator('#importExportTabs [role="tabpanel"]:visible').first().innerText().catch(() => null), 1500);

/** Press a button; wait for a tab to be added and its request to settle, or for ten seconds without one. */
async function pressAndWait(page, button) {
    const before = (await tabs(page)).length;
    await button.click();
    for (let i = 0; i < 40; i++) {
        await native.sleep(500);
        if ((await tabs(page)).length > before) {
            await idle(page).catch(() => {});
            for (let j = 0; j < 30; j++) {
                if (!(await page.locator('#importExportTabs [role="tabpanel"][aria-busy="true"]').count())) break;
                await native.sleep(500);
            }
            break;
        }
        if (i === 20) break;
    }
    await idle(page).catch(() => {});
    await native.sleep(1000);
    return {tabs: await tabs(page), panel: await panelText(page)};
}

/** Press a tab's export button; returns the tabs, the visible panel, the requests and the alerts it gave. */
async function pressExport(app, page, which, w, alerts) {
    const m = w.seen.length;
    const a = alerts.length;
    const res = await pressAndWait(page, exportButton(app, page, which));
    return {tabs: res.tabs, panel: res.panel, requests: w.seen.slice(m), alerts: alerts.slice(a)};
}

/** Tick the first issue of the "Export Issues" grid; returns its name. */
async function tickFirstIssue(page) {
    const row = page.locator('#exportIssues-tab tr.gridRow').first();
    await row.locator('input[type=checkbox]').check();
    return native.flat(await row.innerText(), 120);
}

module.exports = {tabs, panelText, dialogs, openIssuesTab, fillPublisherIdentity, openOnix, exportButton, pressExport, tickFirstIssue};
