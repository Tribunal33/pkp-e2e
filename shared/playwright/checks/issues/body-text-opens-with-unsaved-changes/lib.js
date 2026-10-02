// Helpers for the four "Body Text" issue walks (U48 A14, A15, A18):
//   body-text-opens-with-unsaved-changes, body-text-import-reads-saved-while-unsaved,
//   body-text-leaving-loses-text-unasked, body-text-unconvertible-file-no-message.
// Requiring this file runs nothing.
const path = require('path');
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

// The dataset's submission in Production that the walks use: 5 "Genetic transformation of forest trees".
const SUBMISSION = 5;

/**
 * Before any page loads: record every `editor-change` the Body Text editor sends (its document as
 * JSON, cut short) and every change of the panel's "Save" label and "Unsaved Changes" badge, with
 * the time, so a label shown for 1.5 s is not missed between two reads. Reads only.
 */
async function watchPanel(page) {
    await page.addInitScript(() => {
        window.__u48r4 = {changes: [], ui: []};
        document.addEventListener('editor-change', (e) => {
            try {
                window.__u48r4.changes.push({t: Date.now(), ops: (e.detail?.operations || []).length, doc: JSON.stringify(e.detail?.doc).slice(0, 400)});
            } catch (err) { /* ignore */ }
        }, true);
        let last = '';
        setInterval(() => {
            const root = document.querySelector('.sciflow-body-text');
            if (!root) return;
            const v = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none';
            const save = root.querySelector('.sciflow-body-text__save-row button');
            const badge = root.querySelector('.sciflow-body-text__unsaved');
            const box = document.querySelector('.sciflow-body-text__main [role=status]');
            const now = `${save ? save.innerText.trim() : '-'}|${v(badge) ? 'Unsaved Changes' : ''}|${box ? box.innerText.replace(/\s+/g, ' ').trim() : ''}`;
            if (now !== last) { last = now; window.__u48r4.ui.push({t: Date.now(), state: now}); }
        }, 20);
    });
}

/** The recorded editor changes and panel states since `t0` (ms), and clear nothing. */
async function panelLog(page, t0 = 0) {
    return page.evaluate((t0) => {
        const w = window.__u48r4 || {changes: [], ui: []};
        return {changes: w.changes.filter((c) => c.t >= t0), ui: w.ui.filter((c) => c.t >= t0).map((c) => `${c.t - t0}ms ${c.state}`)};
    }, t0).catch((e) => ({error: String(e.message)}));
}

/** The "Body Text" page as data: editor text, the badge, the "Save" label, the import box. */
async function bodyText(page) {
    return page.evaluate(() => {
        const v = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
        const f = (x) => (x || '').replace(/\s+/g, ' ').trim();
        const root = document.querySelector('.sciflow-body-text');
        if (!root) return {present: false};
        const ce = root.querySelector('sciflow-editor [contenteditable]') || root.querySelector('sciflow-editor')?.shadowRoot?.querySelector('[contenteditable]');
        const save = root.querySelector('.sciflow-body-text__save-row button');
        const box = document.querySelector('.sciflow-body-text__main [role=status]');
        return {
            present: true,
            editorText: ce ? f(ce.innerText).slice(0, 600) : null,
            figures: ce ? ce.querySelectorAll('img').length : null,
            unsavedBadge: v(root.querySelector('.sciflow-body-text__unsaved')),
            save: save ? f(save.innerText) : null,
            importBox: box ? f(box.innerText) : null,
            dismiss: box ? !!box.querySelector('button') : false,
        };
    }).catch((e) => ({error: String(e.message)}));
}

/** Open the submission's workflow from the editorial dashboard (the address a dashboard row opens). */
async function openWorkflow(page, app, id = SUBMISSION) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    await idle(page).catch(() => {});
    await page.getByRole('link', {name: 'Body Text', exact: true}).first().waitFor({timeout: T}).catch(() => {});
}

/** The side menu's entry by its name, pressed. */
async function sideMenu(page, name) {
    await page.getByRole('link', {name, exact: true}).first().click();
    await idle(page).catch(() => {});
    await sleep(1200);
}

/** Press "Body Text" in the side menu and wait for the editor to have loaded its text. */
async function openBodyText(page) {
    await sideMenu(page, 'Body Text');
    await page.locator('sciflow-editor [contenteditable]').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    await page.waitForResponse((r) => /\/bodyText/.test(r.url()) && r.request().method() === 'GET', {timeout: 5_000}).catch(() => {});
    await idle(page).catch(() => {});
    await sleep(1500);
}

/** Click at the end of the editor's text and type. */
async function typeInEditor(page, text) {
    await page.locator('sciflow-editor [contenteditable]').first().click();
    await page.keyboard.press('Control+End').catch(() => {});
    await page.keyboard.type(text, {delay: 15});
    await sleep(600);
}

/** Press "Save" and wait for its request. */
async function pressSave(page) {
    const resp = page.waitForResponse((r) => /\/bodyText/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await page.locator('.sciflow-body-text__save-row button').first().click();
    const r = await resp;
    await idle(page).catch(() => {});
    await sleep(2000);
    return r ? r.status() : null;
}

/** "Production Ready Files" › "Upload": the file through the upload window, component "Article Text". */
async function uploadProductionReady(page, app, file) {
    await sideMenu(page, 'Production');
    const {PublishScreen} = require(path.join(app.suiteDir, 'pages', 'PublishSchedulePages.js'));
    const p = new PublishScreen(page, app.contextPath);
    await p.uploadProductionReadyFile(file, path.basename(file));
    await idle(page).catch(() => {});
}

/**
 * A "Production Ready Files" row's "More Actions" › "Send to Text Editor", the existing version in
 * "To which version would you like to send this file?", "Confirm"; then wait for the import box to
 * come and go (or show its failure). Returns the window's text and the panel log since the press.
 */
async function sendToTextEditor(page, fileName) {
    const table = page.getByRole('table', {name: 'Production Ready Files', exact: true}).first();
    await table.locator('tbody tr').filter({hasText: fileName}).first().getByRole('button', {name: /More Actions/}).click();
    await page.getByRole('menuitem', {name: 'Send to Text Editor', exact: true}).first().click();
    const dlg = page.getByRole('dialog', {name: 'Send File to Text Editor'});
    const select = dlg.locator('select[name="sendToVersion"]');
    await select.waitFor({timeout: T});
    const options = await select.locator('option').allInnerTexts();
    const values = await select.locator('option').evaluateAll((os) => os.map((o) => o.value));
    // the existing version: the first option whose value is a publication id
    const idx = values.findIndex((v) => /^\d+$/.test(v));
    await select.selectOption(values[idx]);
    const window = {text: flat(await dlg.innerText(), 500), options, chosen: options[idx]};
    const t0 = Date.now();
    await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
    let seen = false;
    for (let i = 0; i < 400; i++) {
        const b = await bodyText(page);
        if (b.importBox) seen = true;
        if (seen && (!b.importBox || /Import failed/.test(b.importBox))) break;
        if (!seen && i > 120) break;
        await sleep(150);
    }
    await idle(page).catch(() => {});
    await sleep(2500);
    return {window, t0};
}

module.exports = {T, sleep, flat, SUBMISSION, watchPanel, panelLog, bodyText, openWorkflow, sideMenu, openBodyText, typeInEditor, pressSave, uploadProductionReady, sendToTextEditor};
