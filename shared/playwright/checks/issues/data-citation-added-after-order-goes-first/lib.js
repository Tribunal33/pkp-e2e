// Helpers for the Data Citations table walks (issue reports U42-A8 and U42-A15). Requiring this
// file runs nothing. Built on the U46 A5 arrows walk's moves (../ordering-arrows-unnamed/walk.js):
// the workflow page object, the "Data" publication page, the "Add Data Citation" panel.
const {idle} = require('../../../probe');

const T = 30_000;
const SUPPORTING = 'Supporting data without specifying whether they were generated or analyzed (supporting).';
const SUBMISSION = {ojs: 1, omp: 4, ops: 1};
const flat = (s, n = 600) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Settings > Workflow > Submission > Metadata: tick "Enable data citation metadata" and save (no-op when ticked). */
async function enableDataCitations(page, app) {
    const {MetadataForm} = require('../../../pages/SubmissionIntakePages.js');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/workflow`));
    await idle(page);
    await page.locator('#submission-button').first().click();
    await page.locator('#metadata-button').click();
    const form = new MetadataForm(page);
    await form.ready();
    const box = form.box('Enable data citation metadata');
    if (!(await box.count())) return 'absent';
    if (await box.isChecked()) return 'already on';
    await box.check();
    await form.saveButton.click();
    await form.savedStatus.waitFor({timeout: T});
    return 'ticked and saved';
}

/** The workflow page object for the app (OPS heads its pages "Preprint: …"). */
function workflow(page, app) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const group = app.name === 'ops' ? 'Preprint' : 'Publication';
    return new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: group}});
}

/**
 * Open the submission's workflow (its newest version) and its "Data" page; returns the
 * "Data Citations" table locator, or null when the page is absent.
 */
async function openData(page, app, sid = SUBMISSION[app.name]) {
    const wf = workflow(page, app);
    const group = app.name === 'ops' ? 'Preprint' : 'Publication';
    await wf.gotoEditorial(sid);
    await wf.expectOpen(sid);
    await idle(page);
    await wf.expandLatestVersionNode().catch(() => {});
    if (!(await wf.menuLink('Data').count())) return null;
    await wf.select('Data', `${group}: Data`);
    await idle(page);
    const table = wf.dialog().getByRole('table', {name: 'Data Citations', exact: true});
    await table.waitFor({timeout: T});
    return table;
}

/** Press one of the buttons above the table ("Order", "Save Order", "Add Data Citation"). */
async function pressTop(page, table, name) {
    await page.getByRole('button', {name, exact: true}).first().click();
    await idle(page);
    await sleep(400);
}

/** The rows' text, one string per row (the identifier line, when there is one, then the title). */
async function rowTexts(table) {
    return (await table.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => (tr.cells[0] ? tr.cells[0].innerText : '')))).map((t) => flat(t, 120));
}

/**
 * "Add Data Citation", fill the panel ({title, identifierType, identifier, repository}), "Save";
 * waits for the row. Returns the save answer's status.
 */
async function addDataCitation(page, table, {title, identifierType, identifier, repository, year, url}) {
    await pressTop(page, table, 'Add Data Citation');
    const panel = page.getByRole('dialog', {name: 'Add Data Citation', exact: true});
    await panel.waitFor({timeout: T});
    await panel.getByRole('textbox', {name: /^Title/}).fill(title);
    if (identifierType) await panel.getByRole('combobox', {name: /^Identifier type/}).selectOption({label: identifierType});
    if (identifier) await panel.getByRole('textbox', {name: 'Identifier', exact: true}).fill(identifier);
    await panel.getByRole('combobox', {name: /^Relationship type/}).selectOption({label: SUPPORTING});
    if (repository) await panel.getByRole('textbox', {name: 'Repository', exact: true}).fill(repository);
    if (year) await panel.getByRole('textbox', {name: 'Year', exact: true}).fill(year);
    if (url) await panel.getByRole('textbox', {name: 'URL', exact: true}).fill(url);
    const saved = page.waitForResponse((r) => /\/dataCitations$/.test(r.url().split('?')[0]) && r.request().method() === 'POST', {timeout: T});
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await panel.waitFor({state: 'detached', timeout: T});
    await table.locator('tbody tr').filter({hasText: title}).first().waitFor({timeout: T});
    await idle(page);
    return r.status();
}

/** In ordering mode, press the row's up arrow `times` times (the row's first button in its last cell). */
async function moveUp(page, table, title, times = 1) {
    for (let i = 0; i < times; i++) {
        const row = table.locator('tbody tr').filter({hasText: title}).first();
        await row.locator('td:last-child button').first().click();
        await sleep(300);
    }
}

/** "Save Order" and wait for its answer; returns the status. */
async function saveOrder(page, table) {
    const saved = page.waitForResponse((r) => /\/dataCitations\/order/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    await pressTop(page, table, 'Save Order');
    return (await saved).status();
}

module.exports = {T, SUPPORTING, SUBMISSION, flat, sleep, enableDataCitations, workflow, openData, pressTop, rowTexts, addDataCitation, moveUp, saveOrder};

/** The row's "More Actions" menu, then its item ("View", "Edit", "Delete"). */
async function rowAction(page, table, title, item) {
    const row = table.locator('tbody tr').filter({hasText: title}).first();
    await row.getByRole('button', {name: /More Actions/}).click();
    await page.getByRole('menuitem', {name: item, exact: true}).click();
    await idle(page);
}

/** The open "Edit Data Citation" panel and the values and options of its fields. */
async function readEditPanel(page) {
    const panel = page.getByRole('dialog', {name: 'Edit Data Citation', exact: true});
    await panel.waitFor({timeout: T});
    await panel.getByRole('textbox', {name: /^Title/}).waitFor({timeout: T});
    await sleep(300);
    const type = panel.getByRole('combobox', {name: /^Identifier type/});
    return {
        panel,
        typeValue: await type.inputValue(),
        typeOptions: await type.locator('option').evaluateAll((os) => os.map((o) => ({value: o.value, label: o.textContent.trim()}))),
        identifier: await panel.getByRole('textbox', {name: 'Identifier', exact: true}).inputValue(),
        repository: await panel.getByRole('textbox', {name: 'Repository', exact: true}).inputValue(),
        year: await panel.getByRole('textbox', {name: 'Year', exact: true}).inputValue(),
        url: await panel.getByRole('textbox', {name: 'URL', exact: true}).inputValue(),
    };
}

/** Press the panel's "Save"; returns {status, body, open, errors} (errors: the panel's error lines). */
async function savePanel(page, panel) {
    const saved = page.waitForResponse((r) => /\/dataCitations\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    let body = null;
    try {
        body = await r.text();
    } catch (e) {
        body = `unread: ${e.message}`;
    }
    await idle(page);
    await sleep(800);
    const open = (await panel.count()) > 0 && (await panel.isVisible().catch(() => false));
    const errors = open ? await panel.locator('.pkpFormFieldError, .pkpFormField__error, [id$="-error"]').allInnerTexts().catch(() => []) : [];
    return {status: r.status(), body: flat(body, 400), open, errors: errors.map((e) => flat(e, 200)).filter(Boolean)};
}

/** Close an open side panel with its header's "Close". */
async function closePanel(page, panel) {
    if (!(await panel.isVisible().catch(() => false))) return;
    await panel.getByRole('button', {name: 'Close', exact: true}).first().click();
    await panel.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await sleep(600);
}

Object.assign(module.exports, {rowAction, readEditPanel, savePanel, closePanel});
