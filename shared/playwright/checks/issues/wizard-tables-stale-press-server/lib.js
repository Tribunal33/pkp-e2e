// Helpers of walk.js (U42 A10 with U43 A4: on a press or a preprint server the submission wizard's
// Data Citations and Funders tables, and its Review step, stay stale after a save until a reload).
// Requiring this file runs nothing. The wizard's start page, "Continue", the rail and the reload come
// from the U21 A20 walk's helpers (../plain-summary-required-refuses-other-saves/lib).
const {idle} = require('../../../probe');
const W = require('../plain-summary-required-refuses-other-saves/lib');

const {T, sleep, flat} = W;

const AUTHOR = {ojs: 'ccorino', omp: 'afinkel', ops: 'ccorino'};
const SUPPORTING = 'Supporting data without specifying whether they were generated or analyzed (supporting).';

/** Every /api/v1/ request the page sends from now on, with its time: {all, since(t)}. */
function watchApi(page) {
    const all = [];
    page.on('response', (r) => {
        const q = r.request();
        const u = new URL(r.url());
        if (!u.pathname.includes('/api/v1/')) return;
        all.push({
            t: Date.now(),
            method: q.headers()['x-http-method-override'] || q.method(),
            path: u.pathname.replace(/^.*\/api\/v1/, ''),
            status: r.status(),
        });
    });
    return {all, since: (t) => all.filter((x) => x.t >= t).map(({t: _t, ...x}) => x)};
}

/** As a manager: Settings › Workflow › "Metadata", "Data Citations" enabled at "Ask the author…", "Save". */
async function askForDataCitations(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/workflow`));
    await idle(page);
    await page.locator('#metadata-button').click();
    await idle(page);
    const group = page.getByRole('group', {name: 'Data Citations', exact: true});
    await group.waitFor({state: 'visible', timeout: T});
    await group.getByRole('checkbox', {name: 'Enable data citation metadata', exact: true}).check();
    await group.getByRole('radio', {name: 'Ask the author for data citation metadata during submission.', exact: true}).check();
    const form = page.locator('form').filter({has: group});
    const saved = page
        .waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: T})
        .catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10_000}).catch(() => {});
    return r ? r.status() : null;
}

/** The current step's visible sections, each as {heading, text}. */
async function sections(page) {
    return page.locator('.panelSection:visible').evaluateAll((els) =>
        els.map((e) => {
            const h = e.querySelector('h2, h3, .panelSection__header');
            return {heading: h ? h.innerText.replace(/\s+/g, ' ').trim() : null, text: e.innerText.replace(/\s+/g, ' ').trim().slice(0, 900)};
        })
    );
}

/** The rows of a visible table by its accessible name ("Data Citations", "Funders"), each as flat text. */
async function tableRows(page, name) {
    const t = page.locator(`table[aria-label="${name}"]:visible`).first();
    if (!(await t.count())) return null;
    return (await t.locator('tbody tr').allInnerTexts()).map((x) => flat(x, 200));
}

/** The Review step's "Details" items for the given headings: {heading: value text}. */
async function reviewItems(page, headings) {
    const out = {};
    for (const h of headings) {
        const item = page
            .locator('.submissionWizard__reviewPanel__item:visible')
            .filter({has: page.locator('h4', {hasText: new RegExp(`^\\s*${h}\\s*$`)})})
            .first();
        out[h] = (await item.count()) ? flat(await item.innerText().catch(() => null), 400) : null;
    }
    return out;
}

/** After a save: give the page time to refresh, then read both tables. */
async function settle(page) {
    await idle(page).catch(() => {});
    await sleep(2000);
    return {dataCitations: await tableRows(page, 'Data Citations'), funders: await tableRows(page, 'Funders')};
}

/** "Add Data Citation", a title and the "supporting" relationship, "Save". Returns the save's status. */
async function addDataCitation(page, title) {
    await page.getByRole('button', {name: 'Add Data Citation', exact: true}).locator('visible=true').first().click();
    const panel = page.getByRole('dialog', {name: 'Add Data Citation', exact: true});
    await panel.getByRole('textbox', {name: /^Title/}).waitFor({timeout: T});
    await panel.getByRole('textbox', {name: /^Title/}).fill(title);
    await panel.getByRole('combobox', {name: /^Relationship type/}).selectOption({label: SUPPORTING});
    const saved = page
        .waitForResponse((r) => /\/dataCitations(\/\d+)?$/.test(r.url()) && r.request().method() !== 'GET', {timeout: T})
        .catch(() => null);
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await panel.waitFor({state: 'detached', timeout: T}).catch(() => {});
    return r ? r.status() : null;
}

/** A row's "More Actions" › "Edit", the title replaced, "Save". Returns the save's status (null when no row). */
async function editDataCitation(page, oldTitle, newTitle) {
    const row = page.locator('table[aria-label="Data Citations"]:visible tbody tr').filter({hasText: oldTitle}).first();
    if (!(await row.count())) return {status: null, reason: 'no row'};
    await row.getByRole('button', {name: /More Actions/}).click();
    await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
    const panel = page.getByRole('dialog', {name: 'Edit Data Citation', exact: true});
    await panel.getByRole('textbox', {name: /^Title/}).waitFor({timeout: T});
    await panel.getByRole('textbox', {name: /^Title/}).fill(newTitle);
    const saved = page
        .waitForResponse((r) => /\/dataCitations\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: T})
        .catch(() => null);
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await panel.waitFor({state: 'detached', timeout: T}).catch(() => {});
    return {status: r ? r.status() : null};
}

/** "Add Funder", the name typed, the typed text itself picked from the suggestions, "Save". */
async function addFunder(page, name) {
    await page.getByRole('button', {name: 'Add Funder', exact: true}).locator('visible=true').first().click();
    const panel = page.getByRole('dialog', {name: 'Add Funder', exact: true});
    const box = panel.locator('input.pkpAutosuggest__input').first();
    await box.waitFor({timeout: T});
    await box.click();
    await box.pressSequentially(name, {delay: 20});
    const items = panel.locator('li.autosuggest__results-item');
    await items.first().waitFor({timeout: T});
    const options = (await items.allInnerTexts()).map((t) => flat(t, 120));
    await items.filter({hasText: name}).filter({hasNot: page.locator('a[target="_blank"]')}).first().click();
    const saved = page
        .waitForResponse((r) => /\/funders(\/\d+)?(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T})
        .catch(() => null);
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await panel.waitFor({state: 'detached', timeout: T}).catch(() => {});
    return {status: r ? r.status() : null, options};
}

/** OMP neighbour: the Details step's "Chapters" grid, "Add Chapter", a title, "Save". */
async function addChapter(page, title) {
    const grid = page.locator('#chaptersGridContainer');
    await grid.locator('table, .pkp_controllers_grid').first().waitFor({timeout: T});
    await grid.getByRole('link', {name: 'Add Chapter', exact: true}).click();
    const box = page.locator('input[name="title[en]"]:visible').first();
    await box.waitFor({timeout: T});
    await idle(page);
    await box.fill(title);
    const saved = page.waitForResponse((r) => /update-chapter/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await page.getByRole('dialog').filter({has: box}).getByRole('button', {name: 'Save', exact: true}).last().click();
    const r = await saved;
    await idle(page).catch(() => {});
    await sleep(1500);
    return {status: r ? r.status() : null, rows: (await grid.locator('tr.gridRow').allInnerTexts()).map((x) => flat(x, 200))};
}

/** OPS neighbour: the Upload Files step's galleys grid, "Add File", a label, a remote URL, "Save". */
async function addRemoteGalley(page, label, url) {
    const grid = page.locator('#galleysGridUrl');
    await grid.locator('table, .pkp_controllers_grid').first().waitFor({timeout: T});
    await grid.getByRole('link', {name: 'Add File', exact: true}).click(); // the grid's "Add File" (common.addFile)
    const box = page.locator('input[name="label"]:visible').first();
    await box.waitFor({timeout: T});
    await idle(page);
    await box.fill(label);
    const form = page.getByRole('dialog').filter({has: box});
    await form.locator('input[name="remotelyHostedContent"]').check();
    await form.locator('input[name="urlRemote"]').fill(url);
    const saved = page.waitForResponse((r) => /update-galley/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).last().click();
    const r = await saved;
    await idle(page).catch(() => {});
    await sleep(1500);
    return {status: r ? r.status() : null, rows: (await grid.locator('tr.gridRow').allInnerTexts()).map((x) => flat(x, 200))};
}

/** As a manager: Settings › Workflow › "Metadata", "Data Citations" and "Funders" both at "Require the author…", "Save". */
async function requireBoth(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/workflow`));
    await idle(page);
    await page.locator('#metadata-button').click();
    await idle(page);
    const groups = [
        ['Data Citations', 'Enable data citation metadata', 'Require the author to add data citation metadata before accepting their submission.'],
        ['Funders', 'Enable funder metadata', 'Require the author to add funder metadata before accepting their submission.'],
    ];
    for (const [name, box, radio] of groups) {
        const group = page.getByRole('group', {name, exact: true});
        await group.waitFor({state: 'visible', timeout: T});
        await group.getByRole('checkbox', {name: box, exact: true}).check();
        await group.getByRole('radio', {name: radio, exact: true}).check();
    }
    const form = page.locator('form').filter({has: page.getByRole('group', {name: 'Funders', exact: true})});
    const saved = page
        .waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: T})
        .catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10_000}).catch(() => {});
    return r ? r.status() : null;
}

/** A data citation row's "More Actions" › "Delete" › "OK". Returns the delete's status (null when no row). */
async function deleteDataCitation(page, title) {
    const row = page.locator('table[aria-label="Data Citations"]:visible tbody tr').filter({hasText: title}).first();
    if (!(await row.count())) return {status: null, reason: 'no row'};
    await row.getByRole('button', {name: /More Actions/}).click();
    await page.getByRole('menuitem', {name: 'Delete', exact: true}).click();
    const dialog = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'OK', exact: true})}).last();
    await dialog.waitFor({timeout: T});
    const question = flat(await dialog.innerText().catch(() => null), 200);
    const done = page
        .waitForResponse((r) => /\/dataCitations\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: T})
        .catch(() => null);
    await dialog.getByRole('button', {name: 'OK', exact: true}).click();
    const r = await done;
    await dialog.waitFor({state: 'detached', timeout: T}).catch(() => {});
    return {status: r ? r.status() : null, question};
}

/** What is stored for the submission (a read, not a step): data citation titles and funder names. */
function stored(app, submissionId) {
    const {sql} = require('../../../probe');
    const sid = Number(submissionId);
    return {
        dataCitations: sql(app, `select coalesce(string_agg(s.setting_value, ' | ' order by d.data_citation_id), '') from data_citations d join publications p on p.publication_id = d.publication_id left join data_citation_settings s on s.data_citation_id = d.data_citation_id and s.setting_name = 'title' where p.submission_id = ${sid}`),
        funders: sql(app, `select coalesce(string_agg(s.setting_value, ' | ' order by f.funder_id), '') from funders f left join funder_settings s on s.funder_id = f.funder_id and s.setting_name = 'name' where f.submission_id = ${sid}`),
        submissionStatus: sql(app, `select submission_progress || '/' || status from submissions where submission_id = ${sid}`),
    };
}

/** Every request the browser sends to the ROR registry, with its answer (or failure). */
function watchRor(page) {
    const list = [];
    page.on('requestfinished', async (q) => {
        if (!q.url().includes('api.ror.org')) return;
        const r = await q.response().catch(() => null);
        list.push({url: q.url().slice(0, 120), status: r ? r.status() : null});
    });
    page.on('requestfailed', (q) => {
        if (q.url().includes('api.ror.org')) list.push({url: q.url().slice(0, 120), failed: q.failure() && q.failure().errorText});
    });
    return list;
}

module.exports = {
    T, sleep, flat, W, AUTHOR, watchApi, askForDataCitations, sections, tableRows, reviewItems, settle,
    addDataCitation, editDataCitation, addFunder, addChapter, addRemoteGalley, requireBoth, deleteDataCitation, stored, watchRor,
};
