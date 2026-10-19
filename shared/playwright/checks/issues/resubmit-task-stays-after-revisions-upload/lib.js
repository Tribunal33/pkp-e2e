// Helpers of walk.js (U26 A13: the Author's "Resubmit for review." task stays after their upload;
// docs/issues/U26-A13-resubmit-task-stays-after-revisions-upload.md). Requiring this file runs
// nothing. Copied, so the folder stands alone: the upload wizard's helpers from
// change-file-keeps-first-upload/lib.js, the Tasks and stored-notification reads from
// internal-revisions-request-gives-author-no-task/lib.js. The decision wizard and the
// Participants "Assign" are the suite's page object (apps/omp/playwright/pages/ReviewStagePages.js,
// the same screens on a journal), required inside forEachApp's fn.
const fs = require('fs');
const os = require('os');
const path = require('path');
const {idle, sql, settled} = require('../../../probe');

const T = 30_000;
const LIST = 'Revisions Uploaded';
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STATUS_RE = /(Revisions have been requested\.|Revisions have been submitted and a decision is needed\.|Revisions requested from the author to be taken to a new review round\.|Revisions submitted\. A new review round needs to be created\.|Awaiting responses from reviewers\.|New reviews have been submitted\.|Waiting for reviewers to be assigned\.|All reviews are confirmed and a decision is needed\.)/;

/** A small text file under `name` in a temp folder: {path, name}. */
function smallFile(name) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'h19v-'));
    const p = path.join(dir, name);
    fs.writeFileSync(p, 'h19v revised text\n');
    return {path: p, name};
}

/** The workflow window (the page's first dialog) and the window on top of it. */
const workflow = (page) => page.locator('[role="dialog"]').first();
const topWindow = (page) => page.locator('[role="dialog"]:visible').last();

/** Open submission `id`'s workflow by its address: "My Submissions" for an author, else "Submissions". */
async function openWorkflow(page, app, id, {author = false} = {}) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/${author ? 'mySubmissions' : 'editorial'}?workflowSubmissionId=${Number(id)}`));
    await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: 60_000});
    await idle(page);
}

/** The rows of the list `title` in the open workflow, each as its flat text. */
async function listRows(page, title = LIST) {
    const table = page.getByRole('table', {name: title, exact: true}).first();
    await table.waitFor({state: 'visible', timeout: T});
    await idle(page);
    const rows = table.locator('tbody tr').filter({has: page.getByRole('rowheader')});
    return (await rows.allInnerTexts()).map((t) => flat(t, 200));
}

/** The round's status sentence, the "Upload revisions" button and the "Revisions Uploaded" rows of the open workflow. */
async function round(page) {
    const text = await workflow(page).innerText().catch(() => '');
    const m = text.match(STATUS_RE);
    return {
        status: m ? m[1] : null,
        uploadRevisions: await page.getByRole('button', {name: /^Upload revisions$/i}).first().isVisible().catch(() => false),
        revisions: await listRows(page).catch((e) => `threw ${flat(e.message, 120)}`),
    };
}

/** The open upload wizard and its upload box. */
const wizard = (page) => page.getByRole('dialog').filter({has: page.locator('.pkp_controller_fileUpload')}).last();
const uploadBox = (page) => wizard(page).locator('.pkp_controller_fileUpload').first();

/** "Upload" above the "Revisions Uploaded" list. */
function listUploadButton(page) {
    return page.locator('div')
        .filter({has: page.getByRole('heading', {name: LIST, exact: true, level: 3})})
        .filter({has: page.getByRole('table', {name: LIST, exact: true})})
        .last()
        .getByRole('button', {name: /^Upload( File)?$/});
}

/**
 * As the signed-in author, in the open workflow: "Upload revisions" (or `button`), the component,
 * the file, "Continue", "Continue", "Complete".
 */
async function uploadRevisions(page, component, file, button = null) {
    await (button || page.getByRole('button', {name: /^Upload revisions$/i})).first().click();
    await uploadBox(page).waitFor({state: 'attached', timeout: T});
    await idle(page);
    await wizard(page).locator('select[id^="genreId"]').selectOption({label: component});
    const answered = page.waitForResponse((r) => /upload-file/.test(r.url()) && r.request().method() === 'POST', {timeout: 60_000});
    await wizard(page).locator('input[type="file"]').first().setInputFiles(file.path);
    const r = await answered;
    const out = {upload: r.status()};
    await uploadBox(page).getByText(file.name).first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(page);
    out.passed = [];
    for (const next of ['2. Review Details', '3. Confirm']) {
        const dlg = page.getByRole('dialog').filter({has: page.getByRole('tab', {name: next, exact: true})}).last();
        await dlg.getByRole('button', {name: 'Continue', exact: true}).click();
        await dlg.getByRole('tab', {name: next, exact: true}).and(page.locator('[aria-selected="true"]')).waitFor({timeout: T});
        await idle(page);
        out.passed.push(next);
    }
    const dlg = page.getByRole('dialog').filter({has: page.getByRole('tab', {name: '3. Confirm', exact: true})}).last();
    out.confirm = flat(await dlg.innerText().catch(() => null), 300);
    await dlg.getByRole('button', {name: 'Complete', exact: true}).click();
    await dlg.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    await sleep(600); // the closed window's slot (patterns.md pitfall 4)
    await page.getByRole('table', {name: LIST, exact: true}).first().getByText(file.name).first().waitFor({timeout: T}).catch(() => {});
    out.after = await round(page);
    return out;
}

/**
 * As the signed-in user: "My Submissions", the row of submission `id`, then the header's "Tasks":
 * the button's text and what the panel lists.
 */
async function tasks(page, app, id) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/mySubmissions`));
    await idle(page);
    const row = page.locator('tr').filter({has: page.getByRole('cell', {name: String(id), exact: true})}).first();
    const out = {row: flat(await row.innerText().catch(() => null), 300)};
    const button = page.getByRole('button', {name: /^Tasks/}).first();
    out.header = flat(await button.innerText().catch(() => null), 30);
    await button.click();
    await idle(page);
    const panel = topWindow(page);
    await panel.getByRole('table').first().waitFor({state: 'visible', timeout: 20_000}).catch(() => {});
    await settled(page, panel);
    out.panel = flat(await panel.innerText().catch(() => null), 600);
    return out;
}

/** The task and notice records `username` holds on submission `id`, as stored: type (hex) and level. */
function stored(app, username, id) {
    const rows = sql(app, `select n.notification_id, n.type, n.level from notifications n join users u on u.user_id = n.user_id
        where u.username = '${username}' and n.assoc_type = 1048585 and n.assoc_id = ${Number(id)} order by 1`);
    return rows ? rows.split('\n').map((l) => { const [nid, type, level] = l.split('|').map(Number); return {id: nid, type: `0x${type.toString(16)}`, level}; }) : [];
}

/** The authors assigned to submission `id`, by assignment id. */
function stageAuthors(app, id) {
    const rows = sql(app, `select sa.stage_assignment_id, u.username from stage_assignments sa join users u on u.user_id = sa.user_id
        join user_groups ug on ug.user_group_id = sa.user_group_id where sa.submission_id = ${Number(id)} and ug.role_id = 65536 order by 1`);
    return rows ? rows.split('\n').map((l) => l.split('|').join(':')) : [];
}

module.exports = {T, LIST, flat, sleep, smallFile, workflow, topWindow, openWorkflow, listRows, round, listUploadButton, uploadRevisions, tasks, stored, stageAuthors};
