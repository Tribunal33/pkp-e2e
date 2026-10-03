// Helpers of walk.js (U73 A12: "Approve Proof" and "Revoke Proof Approval" on a format file write
// the same two "History" lines; docs/issues/U73-A12-proof-approval-revoke-logged-as-sign-off.md).
// Requiring this file runs nothing. The format page's helpers are the U73 A1/A2 walk's, the
// history reader the U36 A3 walk's.
const fs = require('fs');
const os = require('os');
const path = require('path');
const {idle, sql} = require('../../../probe');
const F = require('../format-controls-offered-then-refused/lib');
const H = require('../assistant-file-history-keeps-loading/lib');

/** A small PDF named `name` in a temp folder: {path, name}. */
function aFile(name = 'u73h-proof.pdf') {
    const src = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files', 'article.pdf');
    const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'u73h-')), name);
    fs.copyFileSync(src, p);
    return {path: p, name};
}

/** The window on top. */
const top = (page) => page.locator('[role="dialog"]:visible').last();

/**
 * The file's arrow › "More Information" › "History": the window's title and the History lines as
 * "<user> | <event>", newest first; the window closed again with its "Close".
 */
async function history(page, formats, format, fileName) {
    await formats.pressRowEntry(formats.fileRow(format, fileName), 'More Information');
    const win = page.getByRole('dialog').filter({hasText: /Information Center/}).last();
    await win.waitFor({timeout: 30_000});
    await idle(page);
    const title = F.flat(await win.locator('h1').first().innerText().catch(() => null));
    await H.selectTab(page, 'History');
    const read = await H.readHistory(page, 15_000);
    await top(page).getByRole('button', {name: 'Close', exact: true}).first().click();
    await win.waitFor({state: 'detached', timeout: 15_000}).catch(() => {});
    await F.sleep(700);
    return {title, lines: read.lines.map((l) => `${l.user} | ${l.event}`)};
}

/**
 * The file's approval link `link` ("Awaiting Approval" | "Approved") pressed: the window `title`
 * read, then "OK"; returns the window's text and the link the file shows after.
 */
async function approval(page, formats, format, fileName, link, title) {
    const win = await formats.openStatus(formats.fileRow(format, fileName), link, title);
    const text = F.flat(await win.dialog().last().innerText().catch(() => null));
    await win.ok();
    await idle(page);
    return {window: text, after: await fileStatus(formats, format, fileName)};
}

/** The approval link a file row shows now. */
async function fileStatus(formats, format, fileName) {
    const row = formats.fileRow(format, fileName);
    const links = (await row.locator('a:visible').allInnerTexts()).map(F.flat);
    return links.find((t) => /^(Awaiting Approval|Approved)$/.test(t)) || links.join(' / ');
}

/** The lines added since `before` (both newest first). */
function added(before, after) {
    return after.slice(0, Math.max(0, after.length - before.length));
}

/**
 * The file's arrow › "Edit": the "Edit a file" window, "Save" pressed with nothing changed;
 * returns the window's title and whether it closed.
 */
async function editSave(page, formats, format, fileName) {
    await formats.pressRowEntry(formats.fileRow(format, fileName), 'Edit');
    const win = page.getByRole('dialog').filter({hasText: /Edit a file/}).last();
    await win.waitFor({timeout: 30_000});
    await idle(page);
    const save = win.getByRole('button', {name: 'Save', exact: true}).first();
    await save.waitFor({state: 'visible', timeout: 30_000});
    await save.click();
    const closed = await win.waitFor({state: 'detached', timeout: 20_000}).then(() => true, () => false);
    await F.sleep(700);
    await idle(page);
    return {closed};
}

/** Evidence only: the file's stored event_log rows (id|assoc type|event type|message). */
function storedLog(app, fileName) {
    return sql(app, `select e.log_id, e.assoc_type, e.event_type, e.message from event_log e
        where (e.assoc_type = 515 and e.assoc_id in (select submission_file_id from submission_file_settings where setting_name = 'name' and setting_value = '${fileName}'))
           or (e.assoc_type = 1048585 and e.log_id in (select log_id from event_log_settings where setting_name = 'filename' and setting_value = '${fileName}'))
        order by e.log_id`).split('\n').filter(Boolean);
}

module.exports = {aFile, history, approval, fileStatus, added, editSave, storedLog};
