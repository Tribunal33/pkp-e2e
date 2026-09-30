// Shared screen helpers for walk.js and neighbour.js (docs/issues/U44-A4-urn-resave-refused-already-in-use.md).
// Everything here goes through the screens a Journal/Press manager and an editor use; the only
// requests read directly are the ones the pages send themselves (the save's answer, the submission GET).
const {screen, shot, record, idle, signIn} = require('../../../probe');

const T = 30_000;
const PREFIX = 'urn:nbn:de:0000-';
const RESOLVER = 'https://nbn-resolving.de/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const wf = (page) => page.locator('[role="dialog"]:visible').first();
const isMain = (app) => !app.line || app.line === 'main';

async function snap(page, name, extra = {}) {
    const s = await screen(page);
    Object.assign(s, extra);
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

// ---- Settings › Website › Plugins: the "URN" row and its settings window

const urnRow = (page) => page.locator('#pluginGridContainer tr.gridRow[id$="-row-urnpubidplugin"]');

async function gotoPlugins(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/website`));
    await idle(page);
    await page.locator('#plugins-button').click();
    await page.locator('#pluginGridContainer tr.gridRow').first().waitFor({timeout: T});
    await idle(page);
    await sleep(300);
}

/** Tick "URN" on the Plugins list, open its "Settings", fill the window as the Steps say and "Save". */
async function setUpUrnPlugin(page, app, name) {
    const out = {};
    await gotoPlugins(page, app);
    const box = urnRow(page).getByRole('checkbox').first();
    out.rowFound = (await urnRow(page).count()) > 0;
    if (!out.rowFound) return out;
    out.checkedBefore = await box.isChecked();
    if (!out.checkedBefore) {
        const w = page.waitForResponse((r) => /settings-plugin-grid\/enable/.test(r.url()), {timeout: T}).catch(() => null);
        await box.click();
        const r = await w;
        out.enableStatus = r ? r.status() : null;
        await idle(page);
        await sleep(800);
    }
    out.checkedAfter = await urnRow(page).getByRole('checkbox').first().isChecked().catch(() => null);
    await snap(page, `${name}-plugins-urn-ticked`, {setup: out});
    const expander = urnRow(page).locator('a.show_extras').first();
    if (await expander.count()) { await expander.click(); await sleep(400); }
    const controls = page.locator('#pluginGridContainer tr[id$="-row-urnpubidplugin"] + tr');
    await controls.getByRole('link', {name: 'Settings', exact: true}).first().click();
    const f = page.locator('#urnSettingsForm');
    await f.locator('input[name="urnPrefix"]').waitFor({state: 'visible', timeout: T});
    await idle(page);
    await sleep(400);
    const art = f.locator('input[type=checkbox][name="enablePublicationURN"]');
    if (!(await art.isChecked())) await art.click();
    await f.locator('input[name="urnPrefix"]').fill(PREFIX);
    await f.locator('input[type=radio][name="urnSuffix"][value="customId"]').check();
    await f.locator('select[name="urnNamespace"]').selectOption('urn:nbn:de');
    await f.locator('input[name="urnResolver"]').fill(RESOLVER);
    out.window = flat(await f.innerText().catch(() => null), 3000);
    await snap(page, `${name}-urn-settings-filled`);
    const w = page.waitForResponse((r) => r.request().method() === 'POST' && /manage/.test(r.url()), {timeout: T}).catch(() => null);
    await f.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await w;
    out.saveStatus = r ? r.status() : null;
    await f.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    await idle(page);
    await sleep(600);
    out.windowClosed = !(await f.isVisible().catch(() => false));
    await snap(page, `${name}-urn-settings-saved`, {setup: out});
    return out;
}

// ---- The workflow: the Publication area of a version

/** The submission as the workflow page itself reads it (its versions, with each one's URN). */
async function readSubmission(page, app, sid) {
    return page.evaluate(async ({url}) => {
        const r = await fetch(url, {headers: {'X-Requested-With': 'XMLHttpRequest'}});
        const j = await r.json().catch(() => null);
        return j ? {status: r.status, currentPublicationId: j.currentPublicationId, publications: (j.publications || []).map((p) => ({id: p.id, status: p.status, version: p.version, versionString: p.versionString || null, urn: p['pub-id::other::urn'] ?? null}))} : {status: r.status};
    }, {url: app.url(`/index.php/${app.contextPath}/api/v1/submissions/${sid}`)});
}

/** Open the submission's workflow at a Publication page (main: the version's own page; 3.5: the selected version's). */
async function openPublicationPage(page, app, sid, pid, key) {
    const menuKey = isMain(app) ? `publication_${pid}_${key}` : `publication_${key}`;
    await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${sid}&workflowMenuKey=${menuKey}`));
    await idle(page);
    await wf(page).getByRole('heading').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(page);
    await sleep(500);
}

const urnFieldLoc = (page) => wf(page).locator('.pkpFormField').filter({hasText: 'URN'}).first();

/** The URN field of the "Identifiers" page, and the page's error summary, as data. */
async function urnField(page) {
    const data = await wf(page).evaluate((root) => {
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const fields = [...root.querySelectorAll('.pkpFormField')];
        const f = fields.find((x) => /\bURN\b/.test(t(x.querySelector('label, .pkpFormFieldLabel')) || ''));
        const heading = [...root.querySelectorAll('h1, h2')].map(t).filter(Boolean);
        if (!f) return {found: false, heading};
        const input = f.querySelector('input');
        return {
            found: true,
            heading,
            label: t(f.querySelector('label')),
            value: input ? input.value : null,
            disabled: input ? input.disabled : null,
            errors: [...f.querySelectorAll('.pkpFieldError, [id$="-error"]')].map(t).filter(Boolean),
        };
    }).catch((e) => ({error: String(e.message || e)}));
    data.summary = (await wf(page).locator('.pkpFormPage__errors, .pkpFormErrors, [class*="formErrors"]').allInnerTexts().catch(() => [])).map((x) => flat(x, 600));
    return data;
}

/** The "Identifiers" page of a version, landed and read. */
async function openIdentifiers(page, app, sid, pid, name) {
    await openPublicationPage(page, app, sid, pid, 'identifiers');
    await urnFieldLoc(page).waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
    await idle(page);
    await sleep(400);
    const field = await urnField(page);
    await snap(page, name, {urnField: field});
    return field;
}

async function typeUrn(page, text) {
    const input = urnFieldLoc(page).locator('input').first();
    await input.fill(text);
    await sleep(200);
}

/** Press the page's "Save"; the answer of the save the page sends, and what the page shows after. */
async function pressSave(page, name) {
    const button = wf(page).getByRole('button', {name: 'Save', exact: true});
    const enabled = await button.isEnabled().catch(() => null);
    if (!enabled) return {pressed: false, enabled};
    const w = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await button.click();
    const resp = await w;
    let body = null;
    try { body = resp ? await resp.json() : null; } catch { body = null; }
    const saved = await page.locator('[role="status"]:has-text("Saved")').first().waitFor({state: 'visible', timeout: 8_000}).then(() => true).catch(() => false);
    await sleep(600);
    const field = await urnField(page);
    const out = {pressed: true, status: resp ? resp.status() : null, errors: body && body.errors ? body.errors : null, storedUrn: body && !body.errors ? (body['pub-id::other::urn'] ?? null) : undefined, savedShown: saved, field};
    await snap(page, name, {save: out});
    return out;
}

/** "Create New Version" from the Publication area; returns the new version's number. */
async function createNewVersion(page, app, sid, pid, name) {
    await openPublicationPage(page, app, sid, pid, 'titleAbstract');
    const before = await snap(page, `${name}-publication`);
    const w = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    const out = {};
    if (isMain(app)) {
        // main: the side menu's "Create New Version", then the version window's "Confirm".
        const dialog = wf(page);
        const link = dialog.getByRole('link', {name: 'Create New Version', exact: true}).or(dialog.getByRole('button', {name: 'Create New Version', exact: true})).first();
        await link.click();
        const win = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
        await win.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: T});
        await idle(page);
        await sleep(1500);
        const stage = win.locator('select[name="versionStage"]');
        out.stageOffered = await stage.inputValue().catch(() => null);
        if (!out.stageOffered) await stage.selectOption('VoR');
        const minor = win.locator('select[name="versionIsMinor"]');
        if (await minor.isVisible().catch(() => false)) { out.minorOffered = await minor.inputValue(); if (!out.minorOffered) await minor.selectOption('false'); }
        await snap(page, `${name}-window`);
        await win.getByRole('button', {name: 'Confirm', exact: true}).click();
    } else {
        // 3.5: the button beside "Unpublish", then "Yes".
        await wf(page).getByRole('button', {name: 'Create New Version', exact: true}).click();
        const confirm = page.getByRole('dialog').filter({hasText: 'Create New Version'}).last();
        await confirm.getByRole('button', {name: 'Yes', exact: true}).waitFor({state: 'visible', timeout: T});
        await snap(page, `${name}-window`);
        await confirm.getByRole('button', {name: 'Yes', exact: true}).click();
    }
    const r = await w;
    out.status = r ? r.status() : null;
    const j = r ? await r.json().catch(() => null) : null;
    out.newId = j ? j.id : null;
    out.newUrn = j ? (j['pub-id::other::urn'] ?? null) : null;
    await idle(page);
    await sleep(1000);
    await snap(page, `${name}-done`, {version: out});
    return out;
}

module.exports = {T, PREFIX, sleep, flat, wf, isMain, snap, setUpUrnPlugin, readSubmission, openIdentifiers, typeUrn, pressSave, createNewVersion, urnField, signIn, idle};
