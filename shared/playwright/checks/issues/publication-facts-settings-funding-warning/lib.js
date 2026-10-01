// Helpers for walk.js (U13 OJS2). Requiring this file runs nothing.
const {idle, shot, screen, loc} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Settings › Workflow › Submission › "Metadata": the "Enable funder metadata" box. */
async function openMetadata(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/workflow`));
    await idle(page);
    await page.locator('#metadata-button').first().click();
    const box = page.getByRole('checkbox', {name: 'Enable funder metadata', exact: true});
    await box.waitFor({state: 'visible', timeout: T});
    await idle(page);
    await loc(page, 'Metadata: Enable funder metadata', box);
    return box;
}

/** The "Funders" field's state: the box, and the submission radio chosen. */
async function readFunders(page, app) {
    // 3.5 has no "Funders" metadata setting (funders came into the core in 3.6): record its absence.
    const box = await openMetadata(page, app).catch(() => null);
    if (!box) {
        await shot(page, 'metadata-funders').catch(() => {});
        return {funderMetadataField: false, metadataTab: flat((await screen(page)).text.main, 600)};
    }
    const field = page.locator('fieldset, .pkpFormField').filter({has: box}).last();
    const radios = await field
        .locator('input[type=radio]')
        .evaluateAll((els) => els.filter((e) => e.checked).map((e) => ((e.closest('label') || {}).textContent || e.value).replace(/\s+/g, ' ').trim()))
        .catch(() => []);
    const out = {funderMetadataTicked: await box.isChecked(), submissionOption: radios, field: flat(await field.innerText().catch(() => null), 500)};
    await shot(page, 'metadata-funders').catch(() => {});
    return out;
}

/** Tick or untick "Enable funder metadata" and "Save" the Metadata form (bounded by the context API's answer). */
async function setFunders(page, app, want) {
    const box = await openMetadata(page, app);
    if (want) await box.check();
    else await box.uncheck();
    const form = page.locator('form').filter({has: box}).first();
    const saved = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await idle(page);
    return {want, status: r.status(), ticked: await box.isChecked()};
}

/**
 * Settings › Website › "Plugins", the "Publication Facts Label plugin"
 * row's arrow, then "Settings": the window's text, with what comes before
 * "Journal Information" (where a warning sits).
 */
async function openPflSettings(page, app, shotName = 'pfl-settings') {
    const {CitationStyleSettings} = require('../../../pages/ArticleLandingPages');
    const s = new CitationStyleSettings(page, app.contextPath);
    s.pluginId = 'pflplugin';
    await s.openPlugins();
    const form = page.locator('#pflPluginSettingsForm');
    for (let i = 0; i < 5 && !(await form.isVisible()); i++) {
        if (!(await s.settingsLink().isVisible())) await s.row().locator('a.show_extras').click({timeout: 5_000}).catch(() => {});
        await s.settingsLink().waitFor({state: 'visible', timeout: 5_000}).catch(() => {});
        await s.settingsLink().click({timeout: 5_000}).catch(() => {});
        await form.waitFor({state: 'visible', timeout: 8_000}).catch(() => {});
    }
    await form.getByText('Journal Information').first().waitFor({state: 'visible', timeout: T});
    await idle(page);
    const dialog = page.getByRole('dialog').filter({has: form}).last();
    const text = await dialog.innerText();
    const sc = await screen(page);
    await shot(page, shotName).catch(() => {});
    await loc(page, 'PFL settings window', dialog);
    const sections = await form.locator('fieldset legend, .pkp_formSectionTitle, h3').allInnerTexts().catch(() => []);
    return {
        title: flat(await dialog.locator('h1, h2, .pkp_modal_title, [class*="title"]').first().innerText().catch(() => null), 200),
        beforeJournalInformation: flat(text.split('Journal Information')[0], 800),
        sections: sections.map((x) => flat(x, 120)).filter(Boolean),
        fundingPluginWarning: /Funding Plugin Not Present/.test(text),
        funderMetadataWarning: /funder metadata/i.test(text.split('Journal Information')[0]),
        dialogText: flat(sc.text.dialog || text, 1500),
    };
}

/**
 * The open settings window's "OK" (nothing changed in it): the save's
 * answer, the notice shown and whether the window closed.
 */
async function okPflSettings(page) {
    const form = page.locator('#pflPluginSettingsForm');
    const answered = page.waitForResponse((r) => /plugin-grid\/manage/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    const notice = page.getByText('Your changes have been saved.').first();
    await form.getByRole('button', {name: 'OK', exact: true}).click();
    const r = await answered;
    await idle(page);
    const seen = await notice.waitFor({state: 'visible', timeout: 10_000}).then(() => true, () => false);
    await sleep(1000);
    await shot(page, 'pfl-settings-ok').catch(() => {});
    return {status: r.status(), body: flat(await r.text().catch(() => null), 300), notice: seen, windowClosed: !(await form.isVisible())};
}

module.exports = {T, sleep, flat, openMetadata, readFunders, setFunders, openPflSettings, okPflSettings};
