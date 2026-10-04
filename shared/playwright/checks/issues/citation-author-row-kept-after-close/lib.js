// Helpers of walk.js here (U42 A13) and of ../citation-author-boxes-unnamed/walk.js (U42 A14).
// Requiring this file runs nothing. Every helper drives the screens a person uses; the database
// reads are reads, never steps.
const {idle, sql, loc} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const L = (app) => (app.line && /3_[34]/.test(app.line) ? '' : '/en');

/** Per app, on PKP's default test dataset (`main`): an unpublished submission open to `dbarnes`. */
const SUBMISSION = {
    ojs: {id: 4, title: 'Computer Skill Requirements for New and Existing Teachers: Implications for Policy and Practice'},
    omp: {id: 3, title: 'The Political Economy of Workplace Injury in Canada'},
    ops: {id: 1, title: 'The influence of lactation on the quantity and quality of cashmere production'},
};

/** The "Metadata" boxes the steps tick (Settings › Workflow › Submission › "Metadata"). */
const BOX = {
    lookup: 'Enable references structuring and metadata lookup',
    dataCitations: 'Enable data citation metadata',
};
const DATA_NOT_REQUESTED = 'Do not request data citation metadata from the author during submission.';

/**
 * As a manager: Settings › Workflow › "Metadata"; tick each named box that is not ticked (for the
 * data citations box, also its "Do not request…" choice), "Save". Returns what each box was and
 * the save's status.
 */
async function tickMetadata(page, app, which) {
    await page.goto(app.url(`/index.php/${app.contextPath}${L(app)}/management/settings/workflow`));
    await idle(page);
    await page.locator('#metadata-button').click();
    const panel = page.locator('#metadata');
    await panel.waitFor({state: 'visible', timeout: T});
    const out = {before: {}};
    for (const key of which) {
        const box = panel.getByRole('checkbox', {name: BOX[key], exact: true});
        await loc(page, `Metadata: the "${BOX[key]}" box`, box);
        out.before[key] = await box.isChecked();
        if (!out.before[key]) await box.check();
        if (key === 'dataCitations') {
            const radio = panel.getByRole('radio', {name: DATA_NOT_REQUESTED, exact: true});
            if (!(await radio.isChecked())) await radio.check();
        }
    }
    const form = panel.locator('form').first();
    const saved = page.waitForResponse((r) => r.request().method() !== 'GET' && /\/contexts\/\d+/.test(r.url()), {timeout: T});
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    out.save = r.status();
    out.status = await form.locator('.pkpFormPage__status', {hasText: 'Saved'}).waitFor({timeout: T}).then(() => 'Saved').catch(() => null);
    return out;
}

/** The workflow frame for the app ("Preprint" on a preprint server). */
function workflow(page, app) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const group = app.name === 'ops' ? 'Preprint' : 'Publication';
    return new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: group}});
}

/** Open the submission from its dashboard address, then a Publication page ("References", "Data"). */
async function openPublicationPage(page, app, entry) {
    const C = require('../../../pages/CitationsPages.js');
    const wf = workflow(page, app);
    await wf.gotoEditorial(SUBMISSION[app.name].id);
    await idle(page);
    const pg = entry === 'Data' ? new C.DataCitationsTable(page, {frame: wf}) : new C.ReferencesPage(page, wf);
    await pg.open();
    await idle(page);
    return {wf, pg, C};
}

/** The author rows of an author table (a `.pkpFormField--authors` locator): each row's three values. */
async function authorRows(field) {
    const rows = field.locator('tbody tr:has(input[name="givenName"])');
    const n = await rows.count();
    const out = [];
    for (let i = 0; i < n; i++) {
        const r = rows.nth(i);
        out.push({
            givenName: await r.locator('input[name="givenName"]').inputValue(),
            familyName: await r.locator('input[name="familyName"]').inputValue(),
            orcid: await r.locator('input[name="orcid"]').inputValue(),
        });
    }
    return out;
}

/** A references row as shown: its text, whether it has an expander, and its menu's items. */
async function referenceRow(page, refs, text) {
    const row = refs.row(text);
    const out = {
        rows: await refs.rows().count(),
        text: flat(await row.first().innerText().catch(() => null), 300),
        expanderSize: await refs
            .rowExpander(text)
            .first()
            .boundingBox()
            .then((b) => (b ? `${Math.round(b.width)}x${Math.round(b.height)}` : null))
            .catch(() => null),
        progress: await refs.progressTitle().first().innerText({timeout: 1500}).catch(() => null),
    };
    try {
        const items = await refs.openRowMenu(text);
        out.menu = (await items.allInnerTexts()).map((s) => flat(s, 60));
        await refs.closeRowMenu(text);
    } catch (e) {
        out.menuError = flat(e.message, 200);
    }
    return out;
}

/**
 * Collect the body of every citation or data citation write the page sends (the browser's own
 * traffic: a Vue save is a POST carrying X-Http-Method-Override).
 */
function watchWrites(page) {
    const seen = [];
    page.on('request', (req) => {
        const u = req.url().split('?')[0];
        if (req.method() !== 'POST' || !/\/(citations|dataCitations)(\/\d+)?$/.test(u)) return;
        const raw = req.postData() || '';
        let authors = '(not sent)';
        try {
            const body = JSON.parse(raw);
            if (body && body.authors !== undefined) authors = body.authors;
        } catch (e) {
            // a form-encoded body: keep its authors keys as sent
            const keys = [...new URLSearchParams(raw).entries()].filter(([k]) => k.startsWith('authors'));
            if (keys.length) authors = keys;
        }
        seen.push({url: u.replace(/^.*\/api\/v1\//, ''), override: req.headers()['x-http-method-override'] || null, contentType: req.headers()['content-type'] || null, authors, raw: flat(raw, 300)});
    });
    return seen;
}

/** Read: the newest citation of the submission's current publication whose text holds `needle`: id, is_structured and its stored authors. */
function storedCitation(app, needle) {
    const sub = SUBMISSION[app.name].id;
    const id = sql(
        app,
        `select c.citation_id from citations c join submissions s on s.current_publication_id = c.publication_id where s.submission_id = ${sub} and c.raw_citation like '%${needle}%' order by c.citation_id desc limit 1`
    );
    if (!id) return null;
    const settings = sql(app, `select setting_name, setting_value from citation_settings where citation_id = ${id} and setting_name in ('authors', 'isStructured', 'title', 'doi', 'volume') order by setting_name`);
    return {id: Number(id), settings: settings ? settings.split('\n') : []};
}

/** Read: the stored creators of the submission's data citation titled `title`. */
function storedDataCitation(app, title) {
    const sub = SUBMISSION[app.name].id;
    let id = null;
    try {
        id = sql(
            app,
            `select d.data_citation_id from data_citations d join submissions s on s.current_publication_id = d.publication_id join data_citation_settings t on t.data_citation_id = d.data_citation_id and t.setting_name = 'title' where s.submission_id = ${sub} and t.setting_value = '${title}' order by 1 desc limit 1`
        );
    } catch (e) {
        return {error: flat(e.message, 300)};
    }
    if (!id) return null;
    return {id: Number(id), settings: sql(app, `select setting_name, setting_value from data_citation_settings where data_citation_id = ${id} and setting_name in ('authors', 'repository') order by 1`).split('\n')};
}

/** Wait out a closed side panel (the modal store keeps its slot for 450 ms; patterns.md pitfall 4). */
async function afterClose(page) {
    await sleep(900);
    await idle(page);
}

/** Open the submission's "Funding" page (Publication › Funding) and return the workflow frame. */
async function openFunding(page, app) {
    const wf = workflow(page, app);
    await wf.gotoEditorial(SUBMISSION[app.name].id);
    await idle(page);
    await wf.selectPage('Funding');
    await idle(page);
    return wf;
}

/**
 * "Add Funder": type a funder's name and choose the typed text (the registry search is answered
 * with no match by the caller's route), add one grant row per number, "Save".
 */
async function addFunder(page, wf, name, grantNumbers) {
    await wf.dialog().getByRole('button', {name: 'Add Funder', exact: true}).first().click();
    const panel = page.getByRole('dialog', {name: 'Add Funder'});
    await panel.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
    const search = panel.locator('input.pkpAutosuggest__input').first();
    await search.click();
    await search.pressSequentially(name, {delay: 15});
    await panel.locator('li.autosuggest__results-item').filter({hasText: name}).first().click();
    await sleep(400);
    const grants = panel.locator('.pkpFormField--funder-grants');
    for (const n of grantNumbers) {
        await grants.getByRole('button', {name: 'Add', exact: true}).click();
        await grants.locator('tbody tr:has(input[name="grantNumber"])').last().locator('input[name="grantNumber"]').fill(n);
    }
    const saved = page.waitForResponse((r) => /\/funders(\/\d+)?$/.test(r.url().split('?')[0]) && r.request().method() === 'POST', {timeout: T});
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await panel.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await afterClose(page);
    return r.status();
}

/** The Funders table row of `name`: "More Actions" › "Edit"; returns the open "Edit Funder" panel. */
async function editFunder(page, wf, name) {
    const row = wf.dialog().getByRole('table', {name: 'Funders', exact: true}).locator('tbody tr').filter({hasText: name}).first();
    await row.getByRole('button', {name: 'More Actions'}).click();
    await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
    const panel = page.getByRole('dialog', {name: 'Edit Funder'});
    await panel.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
    await idle(page);
    return panel;
}

/** The grant rows of an open funder panel: each row's three values. */
async function grantRows(panel) {
    const rows = panel.locator('.pkpFormField--funder-grants tbody tr:has(input[name="grantNumber"])');
    const out = [];
    for (let i = 0; i < (await rows.count()); i++) {
        const r = rows.nth(i);
        out.push({
            grantDoi: await r.locator('input[name="grantDoi"]').inputValue(),
            grantNumber: await r.locator('input[name="grantNumber"]').inputValue(),
            grantName: await r.locator('input[name="grantName"]').inputValue(),
        });
    }
    return out;
}

/** Read: the stored grants of the submission's funders. */
function storedGrants(app) {
    const sub = SUBMISSION[app.name].id;
    return sql(app, `select f.funder_id, coalesce((select setting_value from funder_settings s where s.funder_id = f.funder_id and s.setting_name = 'grants'), '-') from funders f where f.submission_id = ${sub} order by 1`).split('\n');
}

module.exports = {
    T,
    flat,
    sleep,
    SUBMISSION,
    BOX,
    tickMetadata,
    workflow,
    openPublicationPage,
    authorRows,
    referenceRow,
    watchWrites,
    storedCitation,
    storedDataCitation,
    afterClose,
    openFunding,
    addFunder,
    editFunder,
    grantRows,
    storedGrants,
};
