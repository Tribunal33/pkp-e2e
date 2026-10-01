// Shared screen helpers for walk.js and neighbour.js (docs/issues/U44-A9-urn-assign-offered-without-edit-permission.md).
// The URN settings window and the "Identifiers" page helpers come from U44 A4's and A6's kept scripts; this file
// adds what A9 reads: the page's footer "Save" and the URN field's own buttons, each with whether it can be pressed.
const A6 = require('../urn-check-number-wrong-digit/lib');
const {idle, sql} = require('../../../probe');

const {T, sleep, wf, isMain, snap} = A6;

// OJS: submission 1, version 2 (unpublished, in Vol. 1 No. 2 (2014)); OMP: submission 4 (Production).
const SETUP = {
    ojs: {kinds: ['enablePublicationURN'], submission: 1, version: 2, layout: 'shellier', noPerm: 'sberardo', withPerm: {user: 'dbuskins', submission: 1, version: 2}},
    omp: {kinds: ['enablePublicationURN'], submission: 4, version: 1, layout: 'gcox', noPerm: null, withPerm: {user: 'dbuskins', submission: 1, version: 1}},
};

/** The publication id of a version, and who is assigned with which "Permissions" (read for the record only). */
function pubIdOf(app, sid, version) {
    const rows = sql(app, `SELECT publication_id FROM publications WHERE submission_id = ${sid} ORDER BY publication_id`).trim().split('\n').filter(Boolean).map(Number);
    return rows[Math.min(version, rows.length) - 1];
}
function assignments(app, sid) {
    return sql(app, `SELECT u.username || ' ' || ugs.setting_value || ' canChangeMetadata=' || sa.can_change_metadata
        FROM stage_assignments sa JOIN users u ON u.user_id = sa.user_id
        JOIN user_group_settings ugs ON ugs.user_group_id = sa.user_group_id AND ugs.setting_name = 'name' AND ugs.locale = 'en'
        WHERE sa.submission_id = ${sid} ORDER BY 1`).trim().split('\n').filter(Boolean);
}

const urnFieldLoc = (page) => wf(page).locator('.pkpFormField--pubid').first();

/** The "Identifiers" page as data: the URN box, its buttons (enabled or not), the footer "Save". */
async function readPage(page) {
    const out = {};
    out.fieldFound = (await urnFieldLoc(page).count()) > 0;
    if (out.fieldFound) {
        const input = urnFieldLoc(page).locator('input').first();
        out.value = await input.inputValue().catch(() => null);
        out.boxDisabled = await input.isDisabled().catch(() => null);
        const bs = urnFieldLoc(page).getByRole('button');
        out.buttons = [];
        for (let i = 0; i < (await bs.count()); i++) {
            const b = bs.nth(i);
            out.buttons.push({text: (await b.innerText()).trim(), enabled: await b.isEnabled()});
        }
        out.fieldText = (await urnFieldLoc(page).innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    }
    const save = wf(page).getByRole('button', {name: 'Save', exact: true});
    out.saveCount = await save.count();
    out.saveEnabled = out.saveCount ? await save.first().isEnabled() : null;
    out.sideMenu = (await wf(page).locator('nav').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 600);
    return out;
}

/** Side menu › the version's "Identifiers" (opened by its address, which is what the side menu link sets). */
async function openIdentifiers(page, app, sid, pid, name) {
    const key = isMain(app) ? `publication_${pid}_identifiers` : 'publication_identifiers';
    await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${sid}&workflowMenuKey=${key}`));
    await idle(page);
    await urnFieldLoc(page).waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
    await idle(page);
    await sleep(500);
    const r = await readPage(page);
    await snap(page, name, {read: r});
    return r;
}

/** Press one of the URN field's buttons ("Assign" / "Clear"); what the field and "Save" show after. */
async function pressFieldButton(page, label, name) {
    const b = urnFieldLoc(page).getByRole('button', {name: label, exact: true});
    const out = {offered: (await b.count()) > 0};
    if (!out.offered) { out.read = await readPage(page); await snap(page, name, {press: out}); return out; }
    out.enabled = await b.isEnabled();
    if (!out.enabled) { out.read = await readPage(page); await snap(page, name, {press: out}); return out; }
    await b.click();
    await sleep(400);
    out.read = await readPage(page);
    await snap(page, name, {press: out});
    return out;
}

/** Leave by the side menu's "Metadata" and come back by its "Identifiers", inside the workflow (no reload). */
async function viaMetadataAndBack(page, name) {
    const out = {};
    const nav = wf(page).locator('nav').first();
    // The side menu lists every version's pages; only the open version's group is visible.
    const link = (label) => nav.getByText(label, {exact: true}).locator('visible=true');
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss().catch(() => {}); });
    await link('Metadata').first().click();
    await idle(page);
    await sleep(800);
    out.metadataHeading = (await wf(page).locator('h1, h2').allInnerTexts().catch(() => [])).map((x) => x.trim()).slice(0, 4);
    await snap(page, `${name}-metadata`);
    await link('Identifiers').first().click();
    await idle(page);
    await urnFieldLoc(page).waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
    await sleep(600);
    out.read = await readPage(page);
    out.browserDialogs = dialogs;
    out.windowsOpen = await page.locator('[role="dialog"]:visible').count();
    await snap(page, name, {back: out});
    return out;
}

/** The page's "Save": the answer of the save the page sends, and the URN the reload then shows. */
async function saveAndReload(page, app, sid, pid, name) {
    const save = wf(page).getByRole('button', {name: 'Save', exact: true});
    const out = {enabled: await save.isEnabled().catch(() => null)};
    if (!out.enabled) return out;
    const w = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await save.click();
    const resp = await w;
    out.status = resp ? resp.status() : null;
    const body = resp ? await resp.json().catch(() => null) : null;
    out.storedUrn = body ? (body['pub-id::other::urn'] ?? null) : null;
    out.savedShown = await wf(page).getByText('Saved', {exact: true}).first().waitFor({state: 'visible', timeout: 8_000}).then(() => true).catch(() => false);
    await snap(page, `${name}-saved`, {save: out});
    out.afterReload = await openIdentifiers(page, app, sid, pid, `${name}-reload`);
    return out;
}

module.exports = {...A6, SETUP, pubIdOf, assignments, readPage, openIdentifiers, pressFieldButton, viaMetadataAndBack, saveAndReload};
