// Helpers of walk.js (issue report docs/issues/U44-OMP4-press-publish-window-urn-table.md).
// Requiring this file runs nothing. Every helper presses what a person presses, or reads what the
// screen shows; page objects are required inside the functions (probe kit rule).
const {idle, screen, serverLog} = require('../../../probe');
const {PREFIX, RESOLVER} = require('../article-own-urn-refused-as-in-use/lib');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const controls = (page) => page.locator('[data-cy="workflow-controls-right"]');

/**
 * Settings › Website › "Plugins": "Enabled" on the "URN" row when it is off, then the row's
 * "Settings": exactly the kind boxes in `want` ticked, the prefix, "Namespace" urn:nbn:de, the
 * resolver, "Save". Returns whether the plugin was on and the boxes as saved.
 */
async function setUrnKinds(page, app, kinds, want) {
    const {UrnPluginSettings} = require('../../../pages/IdentifiersPages.js');
    const plugins = new UrnPluginSettings(page, app.contextPath);
    await plugins.openPlugins();
    const wasEnabled = await plugins.enabledBox().isChecked();
    if (!wasEnabled) await plugins.setEnabled(true);
    await plugins.openSettings();
    for (const k of kinds) await plugins.setKind(k, want.includes(k));
    await plugins.prefixBox().fill(PREFIX);
    await plugins.namespaceSelect().selectOption('urn:nbn:de');
    await plugins.resolverBox().fill(RESOLVER);
    await plugins.saveAccepted();
    return {wasEnabled, ticked: want};
}

/**
 * On a journal's "Review Publishing Details" panel (OJS main): "Version of Record" and "Major
 * Revision" when empty, the first assignment choice and the first issue when none is set, then
 * "Confirm". Returns what was chosen.
 */
async function answerDetailsPanel(page, panel) {
    const out = {};
    const stage = panel.locator('select[name="versionStage"]');
    if (await stage.isVisible().catch(() => false)) {
        if (!(await stage.inputValue().catch(() => ''))) await stage.selectOption('VoR').catch(() => {});
        out.stage = await stage.inputValue().catch(() => null);
    }
    const minor = panel.locator('select[name="versionIsMinor"]');
    if (await minor.isVisible().catch(() => false)) {
        if (!(await minor.inputValue().catch(() => ''))) await minor.selectOption('false').catch(() => {});
        out.minor = await minor.inputValue().catch(() => null);
    }
    const radios = panel.locator('input[name="assignment"]');
    await radios.first().waitFor({timeout: 10_000}).catch(() => {});
    if ((await radios.count()) && !(await panel.locator('input[name="assignment"]:checked').count())) {
        await radios.first().check().catch(() => {});
    }
    out.assignment = flat(await panel.locator('input[name="assignment"]:checked').locator('xpath=..').innerText().catch(() => null), 120);
    const issue = panel.locator('select[name="issueId"]');
    if (await issue.isVisible().catch(() => false)) {
        if (!(await issue.inputValue().catch(() => ''))) {
            const values = await issue.locator('option').evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
            if (values.length) await issue.selectOption(values[0]).catch(() => {});
        }
        out.issue = flat(await issue.locator('option:checked').innerText().catch(() => null), 80);
    }
    await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
    return out;
}

/**
 * The workflow's header "Publish" ("Schedule For Publication" on a journal), through the
 * journal's "Review Publishing Details" panel when it opens first, to the confirmation window.
 * Reads the window's URN part (the one-line notice, or the table's rows), records the screen,
 * and closes the window with its "Close" button without publishing.
 */
async function readPublishWindow(page, app, label, record) {
    const log = serverLog(app);
    const from = log.mark();
    const header = controls(page).getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first();
    await header.waitFor({state: 'visible', timeout: T});
    const out = {button: flat(await header.innerText())};
    await header.click();
    const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
    const win = page.getByRole('dialog').filter({hasText: /publication requirements|Are you sure you want to/}).last();
    const which = await Promise.race([
        panel.getByRole('button', {name: 'Confirm', exact: true}).waitFor({state: 'visible', timeout: T}).then(() => 'panel'),
        win.waitFor({state: 'visible', timeout: T}).then(() => 'window'),
    ]).catch(() => null);
    if (which === 'panel') {
        await idle(page).catch(() => {});
        await sleep(1500);
        out.panel = await answerDetailsPanel(page, panel);
        await win.waitFor({state: 'visible', timeout: T}).catch(() => {});
    }
    await idle(page).catch(() => {});
    // The window's form is built from fetched config; wait until its text stops changing.
    let last = null;
    for (let i = 0; i < 10; i++) {
        const t = await win.innerText().catch(() => null);
        if (t && t === last) break;
        last = t;
        await sleep(500);
    }
    const urn = win.locator('.pkpFormField').filter({hasText: /URN/}).last();
    out.table = await win.locator('table.pkpTable').evaluateAll((ts) =>
        ts.map((t) => ({
            head: [...t.querySelectorAll('thead th')].map((th) => th.innerText.trim()),
            rows: [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => ({
                text: td.innerText.trim(),
                warningSign: !!td.querySelector('.fa-exclamation-triangle'),
            }))),
        }))
    ).catch(() => []);
    out.warning = flat(await win.locator('.pkpNotification--warning').filter({hasText: 'URN'}).allInnerTexts().catch(() => []), 300);
    out.urnLine = flat(await win.getByText(/The URN for this publication will be/).first().innerText().catch(() => null), 200);
    out.urnFieldText = flat(await urn.innerText().catch(() => null), 400);
    out.windowText = flat(await win.innerText().catch(() => null), 900);
    record(label, await screen(page));
    out.serverLog = log.since(from).map((l) => flat(l, 300));
    const close = win.getByRole('button', {name: 'Close', exact: true}).first();
    if (await close.isVisible().catch(() => false)) {
        await close.click();
        await win.waitFor({state: 'detached', timeout: T}).catch(() => {});
    }
    await idle(page).catch(() => {});
    const {pastCloseWindow} = require('../../../pages/IdentifiersPages.js');
    await pastCloseWindow(page);
    return out;
}

/**
 * Publication › "Identifiers" of the open workflow's version: "Assign" next to "URN", then "Save".
 * Returns the box's value before and after and the save's status.
 */
async function assignUrn(page, app, frame, sid, pubId) {
    const {openIdentifiers} = require('../article-own-urn-refused-as-in-use/lib');
    const ids = await openIdentifiers(page, app, frame, sid, pubId);
    const out = {before: await ids.box().inputValue().catch(() => null)};
    await ids.assignButton().click();
    await sleep(500);
    out.assigned = await ids.box().inputValue().catch(() => null);
    const saved = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await ids.saveButton().click();
    const r = await saved;
    out.status = r.status();
    await idle(page).catch(() => {});
    await sleep(800);
    return out;
}

module.exports = {T, sleep, flat, controls, setUrnKinds, readPublishWindow, assignUrn};
