// Helpers of the U36 A2 walks (docs/issues/U36-A2-*.md): the Author's row menu on a workflow file
// list and what "Update File Details" and "Delete" answer. Requiring this file runs nothing.
// The upload wizard's helpers are change-file-keeps-first-upload/lib.js's.
const fs = require('fs');
const os = require('os');
const path = require('path');
const {idle, sql, settled} = require('../../../probe');
const W = require('../change-file-keeps-first-upload/lib.js');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A small text file under `name` in a temp folder: {path, name}. */
function smallFile(name) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u36e-'));
    const p = path.join(dir, name);
    fs.writeFileSync(p, 'u36e notes\n');
    return {path: p, name};
}

/** Open a submission's workflow from the dashboard's address: "My Submissions" for an author, else "Submissions". */
async function openWorkflow(page, app, id, {author = false} = {}) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/${author ? 'mySubmissions' : 'editorial'}?workflowSubmissionId=${Number(id)}`));
    await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: 60_000});
    await idle(page);
}

/** The row of the list `list` that names `name`. */
const row = (page, list, name) => W.listRows && page.getByRole('table', {name: list, exact: true}).first().locator('tbody tr').filter({hasText: name}).first();

/** The row's "More Actions" button (none when the row offers nothing). */
const menuButton = (page, list, name) => row(page, list, name).locator('button[aria-haspopup="menu"]');

/** What the row's "More Actions" menu offers: null when the row has no menu button, else the entries. The menu is closed again. */
async function rowMenu(page, list, name) {
    const r = row(page, list, name);
    await r.waitFor({timeout: T});
    const button = menuButton(page, list, name);
    if (!(await button.count())) return null;
    await button.first().click();
    await page.getByRole('menuitem').first().waitFor({timeout: 10_000});
    const items = (await page.getByRole('menuitem').allInnerTexts()).map((x) => flat(x, 60));
    await button.first().click(); // its own button closes it (patterns.md pitfall 7)
    await page.getByRole('menuitem').first().waitFor({state: 'hidden', timeout: 5_000}).catch(() => {});
    return items;
}

/** The window on top of the workflow. */
const topWindow = (page) => page.locator('[role="dialog"]:visible').last();

/**
 * "More Actions" > `entry` on the row. Returns {offered: false, entries} when the row has no such
 * entry, else the legacy request the entry sent and its answer.
 */
async function choose(page, list, name, entry, urlTest) {
    const button = menuButton(page, list, name);
    if (!(await button.count())) return {offered: false, entries: null};
    await button.first().click();
    await page.getByRole('menuitem').first().waitFor({timeout: 10_000});
    const item = page.getByRole('menuitem', {name: entry, exact: true});
    if (!(await item.count())) {
        const entries = (await page.getByRole('menuitem').allInnerTexts()).map((x) => flat(x, 60));
        await button.first().click();
        return {offered: false, entries};
    }
    const answered = urlTest ? page.waitForResponse((r) => urlTest.test(r.url()), {timeout: T}).catch(() => null) : null;
    await item.first().click();
    const r = answered ? await answered : null;
    return {offered: true, request: r ? {method: r.request().method(), url: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 220), status: r.status(), body: flat(await r.text().catch(() => null), 300)} : null};
}

/** The window's name box: a legacy form's on 3.5, the Vue form's first text box on `main`. */
const nameBoxOf = (win) => win.locator('input[name^="name["], form input[type="text"]').first();

/** "Update File Details" (3.5 names the entry "Edit") on the row, and what the window that opens shows. */
async function openEdit(page, list, name, entry = 'Update File Details') {
    const out = await choose(page, list, name, entry, /edit-metadata/);
    if (!out.offered) return out;
    const win = topWindow(page);
    await settled(page, win);
    await idle(page);
    const nameBox = nameBoxOf(win);
    out.window = {
        title: flat(await win.locator('h1, h2').first().innerText().catch(() => null), 80),
        text: flat(await win.innerText().catch(() => null), 500),
        nameBox: (await nameBox.count()) ? await nameBox.inputValue() : null,
        buttons: (await win.locator('button:visible, a.cancelButton:visible').allInnerTexts()).map((x) => flat(x, 40)).filter(Boolean),
    };
    return out;
}

/** In the open "Edit a file" window: type `newName` in the name box and "Save"; returns the save's answer. */
async function rename(page, newName) {
    const win = topWindow(page);
    await nameBoxOf(win).fill(newName);
    const answered = page.waitForResponse((r) => r.request().method() !== 'GET' && /save-metadata|\/submissions\/\d+\/files\/\d+/.test(r.url()), {timeout: T}).catch(() => null);
    await win.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answered;
    await idle(page);
    await sleep(700); // the closed window's slot (patterns.md pitfall 4)
    return r ? {status: r.status(), body: flat(await r.text().catch(() => null), 200)} : null;
}

/** Close the window on top with its own "Close" (a refusal), "Cancel" (the form) or its header's close button. */
async function closeTop(page) {
    const win = topWindow(page);
    for (const control of [
        win.getByRole('button', {name: 'Close', exact: true}).last(),
        win.getByRole('link', {name: 'Cancel', exact: true}).last(),
        win.getByRole('button', {name: 'Cancel', exact: true}).last(),
    ]) {
        if (await control.isVisible().catch(() => false)) {
            await control.click();
            await idle(page);
            await sleep(700);
            return true;
        }
    }
    return false;
}

/** "Delete" on the row, "OK" in its question; returns the delete's answer and what the window on top shows afterwards. */
async function deleteRow(page, list, name) {
    const out = await choose(page, list, name, 'Delete');
    if (!out.offered) return out;
    const question = page.getByRole('dialog').filter({hasText: 'Are you sure'}).last();
    await question.waitFor({timeout: T});
    out.question = flat(await question.innerText(), 200);
    const answered = page.waitForResponse((r) => /delete-file/.test(r.url()), {timeout: T}).catch(() => null);
    await question.getByRole('button', {name: 'OK', exact: true}).click();
    const r = await answered;
    out.request = r ? {method: r.request().method(), status: r.status(), body: flat(await r.text().catch(() => null), 300)} : null;
    await idle(page);
    await sleep(700);
    out.after = flat(await topWindow(page).innerText().catch(() => null), 300);
    return out;
}

/** As the editor, in the open workflow: "Upload" above `list`, the component, the file, "Continue", "Continue", "Complete". */
async function editorUpload(page, list, component, file) {
    await W.uploadButton(page, list).click();
    await W.uploadBox(page).waitFor({state: 'attached', timeout: T});
    await idle(page);
    await W.wizard(page).locator('select[id^="genreId"]').selectOption({label: component});
    const uploaded = await W.pick(page, file);
    const done = await W.finish(page);
    return {uploaded: uploaded && (uploaded.id || uploaded.submissionFileId || uploaded), ...done};
}

/** The submission's stored files: id, file stage, uploader, name. */
function stored(app, submissionId) {
    const rows = sql(app, `select sf.submission_file_id, sf.file_stage, u.username,
        (select string_agg(distinct setting_value, '/') from submission_file_settings s where s.submission_file_id = sf.submission_file_id and s.setting_name = 'name' and s.locale = 'en')
        from submission_files sf left join users u on u.user_id = sf.uploader_user_id where sf.submission_id = ${Number(submissionId)} order by 1`);
    return rows ? rows.split('\n').map((l) => { const [id, stage, uploader, name] = l.split('|'); return {id: Number(id), stage: Number(stage), uploader, name}; }) : [];
}

module.exports = {T, flat, sleep, smallFile, openWorkflow, row, rowMenu, choose, openEdit, rename, closeTop, deleteRow, editorUpload, stored, listRows: W.listRows, topWindow};
