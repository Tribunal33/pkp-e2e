// Helpers of walk.js (U36 A14: "Change File" in step 1 of the upload wizard keeps the first upload;
// docs/issues/U36-A14-change-file-keeps-first-upload.md). Requiring this file runs nothing.
const fs = require('fs');
const os = require('os');
const path = require('path');
const {idle, sql} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Two small PDFs under their own names in a temp folder: {first, second}, each {path, name}. */
function twoFiles() {
    const src = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files', 'article.pdf');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u36c-'));
    const mk = (name) => { const p = path.join(dir, name); fs.copyFileSync(src, p); return {path: p, name}; };
    return {first: mk('u36c-first.pdf'), second: mk('u36c-second.pdf')};
}

/** Open a submission's workflow by address (the dashboard's "View"), optionally on a side-menu page. */
async function openWorkflow(page, app, id, menuKey, view = 'editorial') {
    const locale = app.line === 'stable-3_4_0' || app.line === 'stable-3_3_0' ? '' : '/en';
    await page.goto(app.url(`/index.php/${app.contextPath}${locale}/dashboard/${view}?workflowSubmissionId=${id}${menuKey ? `&workflowMenuKey=${menuKey}` : ''}`));
    await idle(page);
}

/** The table named `title` in the workflow ("Submission Files"). */
const listTable = (page, title) => page.getByRole('table', {name: title, exact: true});

/** The rows of the list `title`, each as its flat text; waits for the table to show. */
async function listRows(page, title = 'Submission Files') {
    const table = listTable(page, title);
    await table.first().waitFor({state: 'visible', timeout: T});
    await idle(page);
    const rows = table.first().locator('tbody tr').filter({has: page.getByRole('rowheader')});
    return (await rows.allInnerTexts()).map((t) => flat(t, 200));
}

/** "Upload" above the list `title`. */
function uploadButton(page, title = 'Submission Files') {
    return page.locator('div')
        .filter({has: page.getByRole('heading', {name: title, exact: true, level: 3})})
        .filter({has: listTable(page, title)})
        .last()
        .getByRole('button', {name: /^Upload( File)?$/});
}

/** What happened to the submission since event log entry `after`: its review rounds' statuses and the new log lines. */
function sideEffects(app, submissionId, after) {
    const rounds = sql(app, `select review_round_id, status from review_rounds where submission_id = ${Number(submissionId)} order by 1`);
    const log = sql(app, `select e.log_id, e.user_id, e.message, coalesce((select setting_value from event_log_settings s where s.log_id = e.log_id and s.setting_name = 'filename' limit 1), '') from event_log e where e.log_id > ${Number(after)} order by 1`);
    return {rounds: rounds ? rounds.split('\n') : [], log: log ? log.split('\n') : []};
}
const lastLogId = (app) => Number(sql(app, 'select coalesce(max(log_id), 0) from event_log'));

/** The open upload wizard (whatever its title). */
const wizard = (page) => page.getByRole('dialog').filter({has: page.locator('.pkp_controller_fileUpload')}).last();
const uploadBox = (page) => wizard(page).locator('.pkp_controller_fileUpload').first();

/** What step 1 shows: the window's title, both drop-downs and the upload box. */
async function stepOne(page) {
    const w = wizard(page);
    const sel = async (s) => ((await s.count()) ? {
        options: (await s.locator('option').allInnerTexts()).map((x) => flat(x, 80)),
        chosen: flat(await s.evaluate((e) => e.options[e.selectedIndex] && e.options[e.selectedIndex].text), 80),
        disabled: await s.isDisabled(),
    } : null);
    return {
        title: flat(await w.locator('h1, h2').first().innerText().catch(() => null), 80),
        revise: await sel(w.locator('select[id^="revisedFileId"]')),
        component: await sel(w.locator('select[id^="genreId"]')),
        box: flat(await uploadBox(page).innerText().catch(() => null), 200),
        changeFile: await uploadBox(page).getByRole('button', {name: 'Change File', exact: true}).isVisible().catch(() => false),
        continueEnabled: await w.getByRole('button', {name: 'Continue', exact: true}).isEnabled().catch(() => null),
    };
}

/**
 * Every request the wizard sends to the upload and delete endpoints from now on, with the form
 * fields posted (the CSRF token masked) and the answer's body. `list` fills as they are answered.
 */
function watchWizard(page) {
    const list = [];
    const mine = (u) => /upload-file|delete-file|cancel-file-upload|uploadFile|deleteFile/.test(u);
    page.on('response', async (r) => {
        const q = r.request();
        if (!mine(q.url())) return;
        const op = (q.url().match(/upload-file|delete-file|cancel-file-upload/) || [q.url()])[0];
        const post = op === 'upload-file' ? undefined : decodeURIComponent(q.postData() || '').replace(/csrfToken=[^&]*/, 'csrfToken=…').slice(0, 400);
        const body = flat(await r.text().catch(() => null), 400);
        list.push({op, query: q.url().replace(/^[^?]*\?/, '').slice(0, 200), post, status: r.status(), body});
    });
    return list;
}

/**
 * Choose `file` in the upload box and wait for its upload's answer and for the box to name it.
 * The box's button ("Upload File", then "Change File") opens the system's file window; the script
 * hands the file to the same input instead.
 */
async function pick(page, file) {
    const answered = page.waitForResponse((r) => /upload-file/.test(r.url()) && r.request().method() === 'POST', {timeout: 60_000});
    await wizard(page).locator('input[type="file"]').first().setInputFiles(file.path);
    const r = await answered;
    const body = await r.json().catch(() => null);
    await uploadBox(page).getByText(file.name).first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(page);
    return body && body.uploadedFile ? body.uploadedFile : body;
}

/** "Continue", "Continue", "Complete"; returns the step names passed and whether the window closed. */
async function finish(page) {
    const w = wizard(page);
    const passed = [];
    const current = async () => flat(await page.getByRole('dialog').last().locator('[role="tab"][aria-selected="true"]').first().innerText().catch(() => null), 40);
    for (const next of ['2. Review Details', '3. Confirm']) {
        const dlg = page.getByRole('dialog').filter({has: page.getByRole('tab', {name: next, exact: true})}).last();
        await dlg.getByRole('button', {name: 'Continue', exact: true}).click();
        await dlg.getByRole('tab', {name: next, exact: true}).and(page.locator('[aria-selected="true"]')).waitFor({timeout: T});
        await idle(page);
        passed.push(await current());
    }
    const dlg = page.getByRole('dialog').filter({has: page.getByRole('tab', {name: '3. Confirm', exact: true})}).last();
    const confirm = flat(await dlg.innerText().catch(() => null), 300);
    await dlg.getByRole('button', {name: 'Complete', exact: true}).click();
    await dlg.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    await sleep(600); // the closed window's slot (patterns.md pitfall 4)
    return {passed, confirm, closed: !(await w.isVisible().catch(() => false))};
}

/** The submission's stored files, as the database holds them: id, stage, component, what it hangs on, name, its uploads' file ids. */
function stored(app, submissionId) {
    const rows = sql(app, `select sf.submission_file_id, sf.file_stage, coalesce(sf.genre_id::text,''), coalesce(sf.assoc_type::text,''), coalesce(sf.assoc_id::text,''),
        (select string_agg(distinct setting_value, '/') from submission_file_settings s where s.submission_file_id = sf.submission_file_id and s.setting_name = 'name' and s.locale = 'en'),
        (select string_agg(r.file_id::text, ',' order by r.revision_id) from submission_file_revisions r where r.submission_file_id = sf.submission_file_id), sf.file_id
        from submission_files sf where sf.submission_id = ${Number(submissionId)} order by 1`);
    return rows ? rows.split('\n').map((l) => { const [id, stage, genre, assocType, assocId, name, uploads, fileId] = l.split('|'); return {id: Number(id), stage: Number(stage), genre, assocType, assocId, name, uploads, fileId: Number(fileId)}; }) : [];
}

module.exports = {T, flat, sleep, twoFiles, openWorkflow, listRows, uploadButton, wizard, uploadBox, stepOne, watchWizard, pick, finish, stored, sideEffects, lastLogId};
