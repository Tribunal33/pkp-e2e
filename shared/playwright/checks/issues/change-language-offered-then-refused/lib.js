// Helpers of walk.js (issue reports on U40 A19 and OJS1: "Change" beside "Current Submission
// Language" offered, then refused). Requiring this file runs nothing. Every helper presses what a
// person presses, or types an address.
const {idle, screen} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The workflow dialog (the workflow page is itself a dialog over the dashboard). */
const wf = (page) => page.locator('[role="dialog"]:visible').first();

/** Open a submission's workflow by its address and wait for it to settle. */
async function openWorkflow(page, app, sid) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${sid}`)).catch(() => {});
    await idle(page).catch(() => {});
    await wf(page).waitFor({timeout: T}).catch(() => {});
    await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15_000}).catch(() => {});
    await idle(page).catch(() => {});
}

/** A stage of the side menu ("Copyediting", "Production"), opened. */
async function openStage(page, name) {
    await page.getByRole('link', {name, exact: true}).last().click();
    await page.getByRole('heading', {name: `Workflow: ${name}`}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    await pause(500);
}

/** A Publication page of the side menu ("Title & Abstract"), opened; heading "Publication: …" ("Preprint: …"). */
async function openEntry(page, name) {
    const d = wf(page);
    const entry = d.getByRole('link', {name, exact: true}).first();
    if (!(await entry.isVisible().catch(() => false))) {
        const group = d.getByRole('link', {name: /^(Publication|Preprint)$/}).first();
        if (await group.count()) { await group.click().catch(() => {}); await idle(page).catch(() => {}); }
    }
    if (!(await entry.isVisible().catch(() => false))) return false;
    await entry.click();
    await d.getByRole('heading', {name: new RegExp(`^(Publication|Preprint): ${name}$`)}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    await pause(1200);
    return true;
}

/** The "Current Submission Language: …" readout and its "Change" button as the page shows them. */
async function readout(page) {
    const line = page.getByText('Current Submission Language:', {exact: false}).first();
    const present = (await line.count()) > 0 && (await line.isVisible().catch(() => false));
    const text = present ? flat(await line.locator('xpath=..').innerText().catch(() => null), 120) : null;
    const btn = page.getByRole('button', {name: 'Change', exact: true});
    const n = await btn.count().catch(() => 0);
    const change = n ? {present: true, enabled: await btn.first().isEnabled().catch(() => null)} : {present: false};
    const status = flat(await page.locator('[data-cy="workflow-controls-left"]').innerText().catch(() => null), 160);
    return {readout: text, change, controlsLeft: status};
}

/**
 * Press "Change", wait for the panel to settle (its subtitle shows the title), pick `language`,
 * type into every editor the panel reveals (Title; Abstract where the section asks for it), press
 * "Confirm". Returns what the browser sent and got, the toast, and whether the panel stayed.
 * Records nothing itself; `snap` is called at the panel's states.
 */
async function changeLanguage(page, {title, language, words, snap}) {
    const o = {};
    const btn = page.getByRole('button', {name: 'Change', exact: true}).first();
    if (!(await btn.count())) return {pressed: false};
    await btn.click();
    const panel = page.getByRole('dialog', {name: /Change Submission Language/i});
    await panel.getByRole('button', {name: 'Confirm', exact: true}).waitFor({state: 'visible', timeout: T}).catch(() => {});
    if (title) await panel.getByText(title).first().waitFor({state: 'visible', timeout: T}).catch(() => { o.titleNotSettled = true; });
    await idle(page).catch(() => {}); await pause(800);
    o.radios = await panel.getByRole('radio').evaluateAll((els) => els.map((e) => `${e.checked ? '(o)' : '( )'} ${(e.labels && e.labels[0] ? e.labels[0].innerText : e.value).trim()}`)).catch(() => []);
    if (snap) await snap('panel-open');
    const radio = panel.getByRole('radio', {name: language});
    if (!(await radio.count())) {
        o.noRadio = language;
        await panel.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
        return o;
    }
    await radio.first().check().catch((e) => { o.checkErr = flat(e.message, 120); });
    await pause(1200);
    const ids = await panel.locator('iframe[id$="_ifr"]').evaluateAll((els) => els.map((e) => e.id.replace(/_ifr$/, ''))).catch(() => []);
    o.editors = [];
    for (const id of ids) {
        await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T}).catch(() => {});
        const before = await page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent({format: 'text'}) : null), id).catch(() => null);
        if (!before || !before.trim()) {
            await page.frameLocator(`#${id}_ifr`).locator('body').click({timeout: 5000}).catch(() => {});
            await page.keyboard.type(/abstract/i.test(id) ? `${words} (abstract)` : words);
            await pause(300);
        }
        o.editors.push({id: id.replace(/-[a-z0-9]+$/i, ''), prefilled: !!(before && before.trim())});
    }
    if (snap) await snap('panel-filled');
    const answered = page.waitForResponse((r) => /\/changeLocale$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
    await panel.getByRole('button', {name: 'Confirm', exact: true}).click().catch((e) => { o.confirmErr = flat(e.message, 150); });
    const r = await answered;
    if (r) {
        let body = null;
        try { body = flat(await r.text(), 300); } catch { body = null; }
        o.request = {method: r.request().headers()['x-http-method-override'] || r.request().method(), path: new URL(r.url()).pathname.replace(/^.*\/api\/v1/, '/api/v1'), status: r.status(), body};
    } else o.request = null;
    await pause(1500);
    await idle(page).catch(() => {});
    o.panelOpenAfter = await panel.isVisible().catch(() => false);
    o.panelErrors = await panel.locator('.pkpFieldError').allInnerTexts().catch(() => []);
    const after = snap ? await snap('after-confirm') : await screen(page);
    o.toasts = ((after && after.notices) || []).map((x) => flat(typeof x === 'string' ? x : x.text, 200));
    if (o.panelOpenAfter) await panel.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
    await pause(600);
    return o;
}

/**
 * On a stage's Participants panel: "<name> More Actions" › "Edit", tick (or untick) "Allow this
 * person to make changes to the publication…", "OK". Returns the box's state before and the label.
 */
async function setParticipantPermission(page, displayName, allowed) {
    await page.getByRole('button', {name: `${displayName} More Actions`}).first().click();
    await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
    const dialog = page.getByRole('dialog').filter({hasText: 'Edit Assignment'});
    const box = dialog.locator('input[name="canChangeMetadata"]');
    await box.waitFor({state: 'visible', timeout: T});
    const label = flat(await box.evaluate((el) => (el.closest('label') || el.parentElement).innerText).catch(() => null), 240);
    const before = await box.isChecked();
    await box.setChecked(allowed);
    await dialog.getByRole('button', {name: 'OK', exact: true}).click();
    await box.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    await pause(500);
    return {before, after: allowed, label};
}

/**
 * Settings › Users & Roles: the signed-in user's own row (`username`) › "Edit"; on the row whose
 * role matches `roleRe`, "Remove Role", confirmed. Returns the role rows before and after.
 */
async function removeRole(page, app, username, roleRe) {
    const o = {};
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/access`));
    await idle(page).catch(() => {});
    const table = page.locator('table').filter({hasText: new RegExp(`\\b${username}\\b`)}).first();
    await table.waitFor({state: 'visible', timeout: T}).catch(() => {});
    const row = table.locator('tr').filter({hasText: new RegExp(`\\b${username}\\b`)}).first();
    await row.locator('button').last().click();
    await idle(page).catch(() => {});
    await page.getByRole('menuitem', {name: /^Edit$/}).first().click().catch(() => {});
    await page.waitForURL(/management\/settings\/user\/\d+/, {timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    const remove = () => page.getByRole('button', {name: /Remove Role/i});
    await remove().first().waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
    const rows = () => page.locator('tr').filter({has: remove()}).evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
    o.rolesBefore = await rows();
    const target = page.locator('tr').filter({hasText: roleRe}).filter({has: remove()}).first();
    if (!(await target.count())) { o.noRow = String(roleRe); return o; }
    await target.getByRole('button', {name: /Remove Role/i}).click();
    const dlg = page.locator('[role="dialog"]:visible').filter({hasText: /Remove Role/i}).last();
    await dlg.waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
    o.question = flat(await dlg.innerText().catch(() => null), 300);
    await dlg.getByRole('button', {name: /^Remove Role$/i}).click().catch((e) => { o.err = flat(e.message, 120); });
    await idle(page).catch(() => {}); await pause(1200);
    o.rolesAfter = await rows();
    return o;
}

module.exports = {T, pause, flat, wf, openWorkflow, openStage, openEntry, readout, changeLanguage, setParticipantPermission, removeRole, screen};
