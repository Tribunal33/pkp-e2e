// Helpers for docs/issues/U13-OJS2-publication-facts-settings-warn-missing-funding-plugin.md
// (walk.js, neighbour.js). Requiring this runs nothing.
const {screen, shot, record, idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const text = async (l) => ((await l.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();

// Settings › Workflow › "Submission" › "Metadata": the "Funders" field as the
// screen shows it. Returns null where the form has no "Funders" (3.5).
async function openFundersSetting(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/workflow`)); await idle(page);
    await page.getByRole('tab', {name: 'Submission', exact: true}).first().click().catch(() => {}); await idle(page);
    await page.getByRole('tab', {name: 'Metadata', exact: true}).first().click(); await idle(page); await pause(500);
    const box = page.getByLabel('Enable funder metadata', {exact: true});
    if (!(await box.count())) return null;
    return box.first();
}

// Untick "Enable funder metadata" and press the Metadata form's "Save".
async function turnFundersOff(page, box) {
    if (await box.isChecked()) await box.click();
    const panel = page.locator('[role="tabpanel"]').filter({has: box}).last();
    const saved = page.waitForResponse((r) => /\/api\/v1\/contexts\//.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await panel.getByRole('button', {name: 'Save', exact: true}).first().click();
    const r = await saved; await idle(page); await pause(500);
    return r ? r.status() : null;
}

// Settings › Website › "Plugins": the "Publication Facts Label plugin" row.
async function openPflRow(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/website`)); await idle(page);
    await page.getByRole('tab', {name: 'Plugins', exact: true}).first().click(); await idle(page);
    const row = page.locator('tr.gridRow[id$="-row-pflplugin"]').first();
    await row.waitFor({state: 'visible', timeout: T});
    return row;
}

// Tick the plugin when it is off; returns the enable request's status (null when already on).
async function enablePfl(page, row) {
    const box = row.locator('input[type=checkbox]');
    if (await box.isChecked()) return {wasTicked: true, status: null, ticked: true};
    const en = page.waitForResponse((r) => /enable/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await box.click();
    const r = await en; await idle(page); await pause(500);
    return {wasTicked: false, status: r ? r.status() : null, ticked: await box.isChecked()};
}

// The arrow beside the plugin's name, then its "Settings"; reads the window.
async function readPflSettings(page, row, key) {
    await row.locator('a.show_extras').click();
    const link = row.locator('xpath=following-sibling::tr[1]').locator('a').filter({hasText: /^\s*Settings\s*$/}).first();
    await link.waitFor({state: 'visible', timeout: T});
    const fetched = page.waitForResponse((r) => /verb=settings/.test(r.url()), {timeout: T}).catch(() => null);
    await link.click();
    const form = page.locator('form#pflPluginSettingsForm');
    await form.waitFor({state: 'visible', timeout: T}); const fr = await fetched; await idle(page);
    await form.getByText('Journal Information', {exact: true}).first().waitFor({state: 'visible', timeout: T}); await pause(500);
    const s = await screen(page); record(key, s); await shot(page, key);
    const modal = page.locator('.pkp_modal_panel, [role="dialog"]').filter({has: form}).last();
    const areas = await form.locator('fieldset > legend, .pkp_formArea > legend, legend').allInnerTexts();
    // Whatever the window shows above its first field group, "Journal Information".
    const head = (await text(form)).split('Journal Information')[0].trim();
    return {
        settingsRequest: fr ? fr.status() : null,
        windowTitle: await text(modal.locator('h1, .header, .pkp_modal_header').first()),
        firstSections: areas.map((a) => a.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 3),
        warning: head || null,
    };
}

module.exports = {T, pause, openFundersSetting, turnFundersOff, openPflRow, enablePfl, readPflSettings};
