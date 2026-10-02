// Helpers of walk.js here (issue report docs/issues/U44-OJS1-new-issue-galley-publisher-id-server-error.md).
// Requiring this file runs nothing. Every helper presses what a person presses, or reads what the
// screen shows. Page objects are required inside the functions (probe kit rule). The issue galley
// window, the list and the PDF come from the U50 A11 walk's lib.
const {idle, screen, record, shot, serverLog} = require('../../../probe');
const G = require('../issue-galley-interface-language-refused/lib');

const T = 30_000;

/** Settings › Workflow › Submission › "Metadata": tick the "Publisher ID" boxes named, "Save". */
async function enablePublisherIds(page, app, labels) {
    const {PublisherIdSettings} = require('../../../pages/IdentifiersPages.js');
    const settings = new PublisherIdSettings(page, app.contextPath);
    await settings.open();
    const before = await settings.boxes();
    await settings.setBoxes(Object.fromEntries(labels.map((l) => [l, true])));
    await settings.save();
    await settings.open();
    const after = await settings.boxes();
    await G.snap(page, 'publisher-id-settings');
    return {before, after};
}

/**
 * Press "Save" on an open issue galley window and read what follows: the answer (status, JSON
 * status, the start of a non-JSON body), the server log's error lines written since, whether the
 * window stayed open, the "Save" button's state and a spinner, the notices, the boxes marked.
 * Cancels a window left open. Returns the facts and the list after it.
 */
async function pressSave(page, app, win, gw, name) {
    const log = serverLog(app);
    const from = log.mark();
    await screen(page); // clears the notices seen so far
    const answered = page.waitForResponse((r) => /issue-galley-grid\/update/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await gw.saveButton().click();
    const r = await answered;
    let text = '';
    try { text = await r.text(); } catch (e) { text = ''; }
    let json = null;
    try { json = JSON.parse(text); } catch (e) { json = null; }
    await idle(page).catch(() => {});
    await G.sleep(1500); // a legacy window's close or the notice's arrival; bounded, read once
    const open = await gw.dialog.isVisible().catch(() => false);
    const saveState = open
        ? await gw.saveButton().evaluate((b) => ({disabled: b.disabled || b.getAttribute('aria-disabled') === 'true', classes: b.className})).catch(() => null)
        : null;
    const spinner = open ? await gw.dialog.locator('.pkp_spinner:visible').count().catch(() => 0) : 0;
    const marked = open ? (await gw.dialog.locator('label.error:visible').allInnerTexts().catch(() => [])).map((t) => G.flat(t, 160)).filter(Boolean) : [];
    const s = await screen(page);
    record(`${name}-after-save`, s);
    await shot(page, `${name}-after-save`).catch(() => {});
    if (open) await gw.cancel().catch(() => {});
    const list = await G.galleyList(win);
    await G.snap(page, `${name}-list`);
    return {
        url: r.url().replace(/^https?:\/\/[^/]+/, ''),
        status: r.status(),
        json_status: json ? json.status : null,
        json_content: json && typeof json.content === 'string' ? G.flat(json.content, 200) : null,
        body_start: json ? null : G.flat(text, 300),
        serverLog: log.since(from).map((l) => G.flat(l, 400)),
        windowOpen: open,
        saveButton: saveState,
        spinnerVisible: spinner,
        marked,
        notices: s.notices,
        list,
    };
}

/** "Create Issue Galley": upload `file`, type `label`, type `publisherId` when given, "Save". */
async function createGalley(page, app, win, {label, file, publisherId}, name) {
    const gw = await win.openCreateGalley();
    const pubIdBox = gw.dialog.locator('input[name="publicGalleyId"]');
    const hasPubIdBox = (await pubIdBox.count()) > 0;
    const up = await gw.upload(file);
    await gw.labelBox().fill(label);
    if (publisherId != null && hasPubIdBox) await pubIdBox.fill(publisherId);
    return {hasPubIdBox, typed: publisherId, upload: up.status(), ...(await pressSave(page, app, win, gw, name))};
}

/** A galley row's arrow › "Edit": the "Publisher ID" box as shown; type `label`/`publisherId`, "Save". */
async function editGalley(page, app, win, row, {label, publisherId}, name) {
    const gw = await win.openEditGalley(row);
    const pubIdBox = gw.dialog.locator('input[name="publicGalleyId"]');
    const shown = (await pubIdBox.count()) ? await pubIdBox.inputValue() : null;
    if (label != null) await gw.labelBox().fill(label);
    if (publisherId != null) await pubIdBox.fill(publisherId);
    return {shownPublisherId: shown, typed: publisherId, ...(await pressSave(page, app, win, gw, name))};
}

module.exports = {enablePublisherIds, pressSave, createGalley, editGalley};
