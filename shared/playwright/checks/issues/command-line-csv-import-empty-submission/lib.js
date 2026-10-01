// Helpers for the walk of docs/issues/U63-OMP4-command-line-csv-import-empty-submission.md.
// Requiring this file runs nothing.
const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');
const {screen, shot, record, idle, sql} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const HEADER = 'pressPath,authorString,title,abstract,seriesPath,year,isEditedVolume,locale,filename,doi';

/** The Steps' CSV file: the plugin's sample.csv row with the given title and a PDF the checkout ships. */
function csvText(title) {
    return `${HEADER}\npublicknowledge,Author1 Surname1<author@pkp.sfu.ca>;Author2 Surname2<author2@sfu.pkp.ca>,${title},Abstract text,,2024,1,en,cypress/fixtures/dummy.pdf,https://doi.org/10.1111/hex.12487\n`;
}

/** Step 2: run the tool from the OMP directory, under the install's config. */
function runImport(app, csvFile, username) {
    const r = spawnSync('php', ['tools/importExport.php', 'CSVImportExportPlugin', csvFile, username],
        {cwd: app.root, env: {...process.env, PKP_CONFIG_FILE: app.configFile}, encoding: 'utf8', timeout: 120_000});
    const strip = (s) => String(s || '').split(app.root).join('<omp>');
    return {command: `php tools/importExport.php CSVImportExportPlugin ${path.basename(csvFile)} ${username}`, exit: r.status,
        stdout: strip(r.stdout).slice(0, 3000), stderr: strip(r.stderr).slice(0, 3000)};
}

/** What the database holds for the press's submissions (Evidence only; the steps read the screens). */
function dbFacts(app) {
    const q = (s) => { try { return sql(app, s); } catch (e) { return `ERR ${flat(e.message, 200)}`; } };
    return {
        submissions: q(`select count(*) from submissions s join presses p on p.press_id = s.context_id where p.path = 'publicknowledge'`),
        newest: q(`select s.submission_id, s.status, s.stage_id, s.submission_progress, s.locale,
            (select count(*) from authors a where a.publication_id = s.current_publication_id) as authors,
            (select string_agg(setting_value, ' / ') from publication_settings ps where ps.publication_id = s.current_publication_id and ps.setting_name = 'title') as title,
            (select count(*) from publication_formats f where f.publication_id = s.current_publication_id) as formats,
            (select count(*) from submission_files sf where sf.submission_id = s.submission_id) as files,
            (select pub.status from publications pub where pub.publication_id = s.current_publication_id) as pubstatus
            from submissions s order by s.submission_id desc limit 1`).replace(/\s+/g, ' '),
        roles: q(`select a.author_id, a.contributor_type, (select count(*) from credit_contributor_roles r where r.contributor_id = a.author_id and r.contributor_role_id is not null) from authors a
            join submissions s on s.current_publication_id = a.publication_id where s.submission_id = (select max(submission_id) from submissions)`),
    };
}

async function snap(page, name) {
    const s = await screen(page);
    record(name, s);
    await shot(page, name).catch(() => {});
    return {url: s.url, main: flat(s.text && s.text.main, 1500), dialog: flat(s.text && s.text.dialog, 1500)};
}

async function openDashboard(app, page) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
    await idle(page).catch(() => {});
    await page.locator('table, [role="table"]').first().waitFor({timeout: 20_000}).catch(() => {});
    await idle(page).catch(() => {});
}

/** The side menu's views and their counts. */
async function views(page) {
    return page.locator('nav a, nav button').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 40)).catch(() => []);
}

/** The rows of the list on screen. */
async function rows(page) {
    return page.locator('tbody tr').evaluateAll((trs) => trs.map((t) => t.innerText.replace(/\s+/g, ' ').trim()).slice(0, 25)).catch(() => []);
}

/** Step 3: type in the Dashboard's search box. */
async function search(page, text) {
    const box = page.getByRole('searchbox').first().or(page.locator('input[type=search]').first()).first();
    await box.fill(text);
    await box.press('Enter').catch(() => {});
    await sleep(1500);
    await idle(page).catch(() => {});
    return rows(page);
}

/** Press a side menu view by its name. */
async function openView(page, name) {
    await page.locator('nav').getByRole('link', {name: new RegExp(name)}).first()
        .or(page.locator('nav').getByRole('button', {name: new RegExp(name)}).first()).first().click();
    await sleep(800);
    await idle(page).catch(() => {});
    return rows(page);
}

/** Step 4: the row whose ID cell is `id`: its text, and a press on its own button ("View", "Complete submission"). */
async function openRow(app, page, id) {
    const row = page.locator('tbody tr').filter({has: page.locator('td').first().filter({hasText: new RegExp(`^\\s*${id}\\s*$`)})}).first();
    const out = {row: flat(await row.innerText().catch(() => null), 300)};
    const btn = row.getByRole('button').or(row.getByRole('link')).last();
    out.button = flat(await btn.innerText().catch(() => null), 80);
    await btn.click();
    await page.locator('[role="dialog"], form, h1').first().waitFor({timeout: 20_000}).catch(() => {});
    await idle(page).catch(() => {});
    await sleep(1500);
    out.url = page.url();
    return out;
}

/** In the open workflow, press a menu entry (e.g. "Contributors") and read the window. */
async function workflowEntry(page, name) {
    const d = page.locator('[role="dialog"]').last();
    const link = d.getByRole('link', {name, exact: true}).last();
    if (!(await link.isVisible().catch(() => false))) {
        await d.getByRole('link', {name: /^Publication$/}).first().click().catch(() => {});
        await sleep(500);
    }
    await link.click({timeout: 10_000});
    await idle(page).catch(() => {});
    await sleep(1500);
    return flat(await d.innerText().catch(() => null), 2000);
}

module.exports = {sleep, flat, csvText, runImport, dbFacts, snap, openDashboard, views, rows, search, openView, openRow, workflowEntry};
