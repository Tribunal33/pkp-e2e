// Helpers of walk.js (U26 A9: deleting the only revised file brings the round back to "Revisions
// have been requested." but never returns the author's revisions task;
// docs/issues/U26-A9-deleted-revision-no-task-back.md). Requiring this file runs nothing.
// Reused: the decision, Tasks and stored-notification helpers of
// ../internal-revisions-request-gives-author-no-task/lib.js, the upload helpers of
// ../author-revisions-upload-offered-then-refused/lib.js, the row "Delete" and the window helpers of
// ../author-update-file-details-offered-then-refused/lib.js, the list helpers of
// ../change-file-keeps-first-upload/lib.js.
const {idle} = require('../../../probe');
const H = require('../internal-revisions-request-gives-author-no-task/lib.js');
const A = require('../author-revisions-upload-offered-then-refused/lib.js');
const L = require('../author-update-file-details-offered-then-refused/lib.js');
const W = require('../change-file-keeps-first-upload/lib.js');

const LIST = 'Revisions Uploaded';
const COPYEDITED = 'Copyedited Files';
const STATUS_RE = /(Revisions have been requested\.|Revisions have been submitted and a decision is needed\.|Revisions requested from the author to be taken to a new review round\.|Awaiting responses from reviewers\.|New reviews have been submitted\.|Waiting for reviewers to be assigned\.)/;
const NOTICE_RE = /(Assign a copyeditor using the Assign link in the Participants list\.|Awaiting Copyedits\.)/;

/** The round's status sentence and the "Revisions Uploaded" rows of the open workflow. */
async function round(page) {
    const text = await H.workflow(page).innerText().catch(() => '');
    const m = text.match(STATUS_RE);
    return {status: m ? m[1] : null, revisions: await W.listRows(page, LIST).catch((e) => `threw ${L.flat(e.message, 120)}`)};
}

/** As the signed-in author: open submission `id` from "My Submissions" by its address and read the round. */
async function authorRound(page, app, id) {
    await A.openWorkflow(page, app, id, {author: true});
    return round(page);
}

/** As the signed-in author, in the open workflow: "Upload revisions", the component, the file, "Continue", "Continue", "Complete". */
async function authorUpload(page, component, file) {
    const out = await A.uploadThrough(page, A.uploadRevisionsButton(page), component, file);
    await idle(page);
    return {...out, after: await round(page)};
}

/** In the open workflow: "More Actions" > "Delete" on the row `name` of `list`, "OK". */
async function deleteFrom(page, list, name) {
    const out = await L.deleteRow(page, list, name);
    await idle(page);
    return out;
}

/** As the signed-in editor: open submission `id` on its Copyediting page and read the notice and "Copyedited Files". */
async function copyediting(page, app, id) {
    await page.goto('about:blank');
    await W.openWorkflow(page, app, id, 'workflow_4');
    await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: 60_000});
    await page.getByRole('table', {name: COPYEDITED, exact: true}).first().waitFor({state: 'visible', timeout: 60_000});
    await idle(page);
    const text = await H.workflow(page).innerText().catch(() => '');
    const m = text.match(NOTICE_RE);
    return {notice: m ? m[1] : null, copyedited: await W.listRows(page, COPYEDITED).catch((e) => `threw ${L.flat(e.message, 120)}`)};
}

/**
 * As the editor, on the open Copyediting page: "Upload/Select Files" above "Copyedited Files", the
 * window's "Upload", the component, the file, "Continue", "Continue", "Complete", then "OK" in the window
 * (the U22 I28 idiom: the stage's second "Upload/Select Files" button is the "Copyedited Files" one).
 */
async function copyeditUpload(page, component, file) {
    await page.getByRole('button', {name: 'Upload/Select Files', exact: true}).nth(1).click();
    await idle(page);
    const win = L.topWindow(page);
    await win.waitFor({timeout: L.T});
    let up = win.getByRole('link', {name: /^Upload/}).first();
    if (!(await up.count())) up = win.getByRole('button', {name: /^Upload/}).first();
    await up.click();
    await idle(page);
    const wiz = page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
    await wiz.locator('input[type="file"]').waitFor({state: 'attached', timeout: L.T});
    await wiz.locator('select[id^="genreId"]').selectOption({label: component});
    const answered = page.waitForResponse((r) => /upload-file/.test(r.url()), {timeout: L.T}).catch(() => {});
    await wiz.locator('input[type="file"]').setInputFiles(file.path);
    await answered;
    await idle(page);
    for (const label of ['Continue', 'Continue', 'Complete']) {
        await wiz.getByRole('button', {name: label, exact: true}).click();
        await idle(page);
        await L.sleep(400);
    }
    await wiz.waitFor({state: 'hidden', timeout: L.T}).catch(() => {});
    await L.topWindow(page).locator(`tr:has-text("${file.name}") input[type=checkbox]:checked`).first().waitFor({timeout: 15_000}).catch(() => {});
    await L.sleep(800);
    await L.topWindow(page).getByRole('button', {name: /^(OK|Save)$/}).last().click();
    await idle(page);
    await L.sleep(700); // the closed window's slot (patterns.md pitfall 4)
    return {rows: await W.listRows(page, COPYEDITED).catch((e) => `threw ${L.flat(e.message, 120)}`)};
}

module.exports = {LIST, COPYEDITED, round, authorRound, authorUpload, deleteFrom, copyediting, copyeditUpload};
