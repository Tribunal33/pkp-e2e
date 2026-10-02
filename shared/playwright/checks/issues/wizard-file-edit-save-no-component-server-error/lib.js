// Helpers of walk.js (U36 A11: the submission wizard's "Edit {file name}" saved with no component chosen).
// Requiring this file runs nothing.
const fs = require('fs');
const os = require('os');
const path = require('path');
const {idle} = require('../../../probe');
// "Make a Submission" up to "Upload Files" (3.5 opens on "Details") and "Add File" already exist:
const {startSubmission, panelUpload, sleep, flat, T} = require('../file-over-request-limit-server-error/lib');

/** A small text file named `name` in a temp folder of its own; returns {path, name}. */
function smallFile(name, text = 'u36a notes\n') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u36a-'));
    const f = path.join(dir, name);
    fs.writeFileSync(f, text);
    return {path: f, name};
}

const panel = (page) => page.locator('.submissionFilesListPanel');
/** The files panel's row of the file named `name`. */
const row = (page, name) => panel(page).locator('.listPanel__item--submissionFile').filter({hasText: name}).first();
/** The side panel "Edit {name}". */
const editWindow = (page, name) => page.getByRole('dialog').filter({hasText: `Edit ${name}`}).last();
/** An "An unexpected error has occurred…" window, should one open (on main and 3.5 the message is a page notice instead). */
const errorWindow = (page) => page.getByRole('dialog').filter({hasText: /An unexpected error has occurred/}).last();

/** What a row shows: its text, its badge (the component) and the question's links. */
async function readRow(page, name) {
    const r = row(page, name);
    if (!(await r.count())) return {present: false};
    return {
        present: true,
        text: flat(await r.innerText().catch(() => null), 300),
        badge: flat(await r.locator('.listPanel--submissionFiles__itemGenre').innerText({timeout: 1000}).catch(() => null), 80),
        links: await r.locator('.listPanel--submissionFiles__setGenreButton').allInnerTexts().then((a) => a.map((x) => flat(x, 60))).catch(() => []),
    };
}

/** Press `label` ("Other" or "Edit") on the row and wait for "Edit {name}"; returns the window's radios. */
async function openEdit(page, name, label) {
    await row(page, name).getByRole('button', {name: label, exact: true}).click();
    const w = editWindow(page, name);
    await w.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
    await idle(page);
    const radios = await w.getByRole('radio').evaluateAll((els) => els.map((e) => ({label: (e.closest('label') || e.parentElement).innerText.replace(/\s+/g, ' ').trim(), value: e.value, checked: e.checked})));
    return {open: true, text: flat(await w.innerText().catch(() => null), 700), radios};
}

/**
 * Press "Save" in "Edit {name}" and wait for what the screen does: the save's request (its operation, what
 * it posts, the answer), the error window, whether the edit window is still open and what it reads.
 */
async function pressSave(page, name) {
    const w = editWindow(page, name);
    const isSave = (u, m) => /\/submissions\/\d+\/files\/\d+/.test(u) && m !== 'GET';
    let sent = null;
    const onReq = (q) => { if (isSave(q.url(), q.method())) sent = {op: q.headers()['x-http-method-override'] || q.method(), url: q.url().replace(/^https?:\/\/[^/]+/, ''), posted: flat(q.postData(), 300)}; };
    page.on('request', onReq);
    const answered = page.waitForResponse((r) => isSave(r.url(), r.request().method()), {timeout: 8000}).catch(() => null);
    await w.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answered;
    page.off('request', onReq);
    const body = r ? flat(await r.text().catch(() => null), 500) : null;
    await sleep(1500);
    await idle(page);
    const err = errorWindow(page);
    const errorShown = await err.isVisible().catch(() => false);
    const stillOpen = await w.isVisible().catch(() => false);
    return {
        request: sent,
        status: r ? r.status() : null,
        body,
        errorWindow: errorShown ? flat(await err.innerText().catch(() => null), 300) : null,
        editWindowOpen: stillOpen,
        editWindowText: stillOpen ? flat(await w.innerText().catch(() => null), 700) : null,
        fieldErrors: stillOpen ? await w.locator('.pkpFormField__error, [id$="-error"]').allInnerTexts().then((a) => a.map((x) => flat(x, 200)).filter(Boolean)).catch(() => []) : [],
    };
}

module.exports = {T, sleep, flat, startSubmission, panelUpload, smallFile, panel, row, editWindow, errorWindow, readRow, openEdit, pressSave};
