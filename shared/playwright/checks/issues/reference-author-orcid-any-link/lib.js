// Helpers of walk.js here (U42 A22). Requiring this file runs nothing. Every helper drives the
// screens a person uses; the database reads are reads, never steps.
const {idle, sql} = require('../../../probe');
const A13 = require('../citation-author-row-kept-after-close/lib');

const T = 30_000;
const {flat, sleep, tickMetadata, authorRows, afterClose} = A13;

/** Per app, on PKP's default test dataset (`main`): a submission, its author account and name. */
const SUBMISSION = {
    ojs: {id: 2, title: 'The influence of lactation on the quantity and quality of cashmere production', author: 'ccorino', authorName: 'Carlo Corino'},
    omp: {id: 2, title: 'The West and Beyond: New Perspectives on an Imagined Region', author: 'afinkel', authorName: 'Alvin Finkel'},
    ops: {id: 1, title: 'The influence of lactation on the quantity and quality of cashmere production', author: 'ccorino', authorName: 'Carlo Corino'},
};

/** The workflow frame for the app ("Preprint" on a preprint server). */
function workflow(page, app) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const group = app.name === 'ops' ? 'Preprint' : 'Publication';
    return new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: group}});
}

/** Open the submission (the author's "My Submissions" view or the editorial one) and its "References" page. */
async function openReferences(page, app, {author = false} = {}) {
    const C = require('../../../pages/CitationsPages.js');
    const wf = workflow(page, app);
    const id = SUBMISSION[app.name].id;
    if (author) await wf.gotoAuthor(id);
    else await wf.gotoEditorial(id);
    await idle(page);
    const refs = new C.ReferencesPage(page, wf);
    await refs.open();
    await idle(page);
    return {wf, refs};
}

/**
 * Participants › the person's row › "More Actions" › "Edit": set the "Permissions" box ("Allow this
 * person to make changes to the publication, …") and press "OK". On the current stage's page.
 */
async function allowMetadataEdit(page, app, name, role) {
    const {ParticipantsPanel} = require('../../../pages/StageParticipantsPages.js');
    const group = app.name === 'ops' ? 'Preprint' : 'Publication';
    const panel = new ParticipantsPanel(page, app.contextPath, {labels: {publicationGroup: group}});
    await panel.goto(SUBMISSION[app.name].id);
    await idle(page);
    const win = await panel.openEdit(name, role);
    const box = win.metadataBox();
    await box.waitFor({state: 'visible', timeout: T});
    const before = await box.isChecked();
    await box.setChecked(true);
    await win.ok();
    return {before, after: await sql(app, `select sa.can_change_metadata from stage_assignments sa join users u on u.user_id = sa.user_id where sa.submission_id = ${SUBMISSION[app.name].id} and u.username = '${SUBMISSION[app.name].author}'`)};
}

/**
 * Press the open "Edit citation" panel's "Save" and read what follows, whatever it is: the write's
 * status, whether the panel closed, and the messages under the boxes.
 */
async function saveAndRead(page, panel) {
    const written = page
        .waitForResponse((r) => /\/citations\/\d+$/.test(r.url().split('?')[0]) && r.request().method() === 'POST', {timeout: T})
        .catch(() => null);
    await panel.saveButton().click();
    const r = await written;
    const out = {status: r ? r.status() : null};
    if (r && !r.ok()) out.body = flat(await r.text().catch(() => ''), 600);
    await sleep(800);
    out.panelOpen = (await panel.dialog().count()) > 0;
    if (out.panelOpen) {
        out.fieldErrors = (await panel.dialog().locator('.pkpFieldError').allInnerTexts().catch(() => [])).map((s) => flat(s, 300));
        out.summary = flat(await panel.errorSummary().first().innerText({timeout: 1500}).catch(() => null), 200);
    } else {
        await afterClose(page);
    }
    return out;
}

/** The row's ORCID links once the row is expanded: their text (screen reader), href, target, rel. */
async function orcidLinks(refs, text) {
    const links = refs.row(text).locator('a:has(.sr-only)');
    const n = await links.count();
    const out = [];
    for (let i = 0; i < n; i++) {
        const a = links.nth(i);
        out.push({
            name: flat(await a.innerText().catch(() => null), 120),
            href: await a.getAttribute('href'),
            target: await a.getAttribute('target'),
            rel: await a.getAttribute('rel'),
        });
    }
    return out;
}

/** Expand the row when it is collapsed (its expander is named "Collapse" in both states, A16). */
async function expandRow(page, refs, text) {
    const before = await refs.row(text).locator('a:has(.sr-only)').count();
    if (before === 0) {
        await refs.rowExpander(text).filter({visible: true}).first().click({timeout: 10000});
        await sleep(400);
        await idle(page);
    }
}

/** Read: the newest citation of the submission's current publication whose text holds `needle`. */
function storedCitation(app, needle) {
    const sub = SUBMISSION[app.name].id;
    const id = sql(
        app,
        `select c.citation_id from citations c join submissions s on s.current_publication_id = c.publication_id where s.submission_id = ${sub} and c.raw_citation like '%${needle}%' order by c.citation_id desc limit 1`
    );
    if (!id) return null;
    const settings = sql(app, `select setting_name, setting_value from citation_settings where citation_id = ${id} and setting_name in ('authors', 'isStructured', 'title') order by setting_name`);
    return {id: Number(id), settings: settings ? settings.split('\n') : []};
}

/** Read: the citation lookup jobs waiting in the queue (class names). */
function citationJobs(app) {
    const rows = sql(app, `select substring(payload from 'citation[^A-Za-z]+([A-Za-z]+Job)') from jobs where payload like '%citation%'`);
    return rows ? rows.split('\n') : [];
}

module.exports = {citationJobs, T, flat, sleep, SUBMISSION, tickMetadata, authorRows, afterClose, workflow, openReferences, allowMetadataEdit, saveAndRead, orcidLinks, expandRow, storedCitation};
