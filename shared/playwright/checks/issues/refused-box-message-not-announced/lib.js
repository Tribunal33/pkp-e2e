// Helpers for the walk of docs/issues/U42-A24-refused-box-message-not-announced.md. Requiring this
// file runs nothing. The Data page moves are copied from
// ../data-citation-added-after-order-goes-first/lib.js and the accessibility read from the U42 I07b
// kept check (shared/playwright/checks/U42/I07b/i07b.js), so this folder stands alone.
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

/**
 * Open the submission's workflow (its newest version) and its "Data" page; returns the
 * "Data Citations" table locator, or null when the page is absent.
 */
async function openData(page, app, sid = SUBMISSION[app.name]) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const group = app.name === 'ops' ? 'Preprint' : 'Publication';
    const wf = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: group}});
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

/** Settings > Journal (Press, Server): open a tab ("contact", "masthead") and return its form. */
async function openContextTab(page, app, tab) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/context`));
    await idle(page);
    await page.locator(`#${tab}-button`).first().click();
    const form = page.locator(`[id="${tab}"] form`).first();
    await form.waitFor({state: 'visible', timeout: T});
    await idle(page);
    return form;
}

/** Role, name, description and invalid state of a box as Chromium's accessibility tree computes them. */
async function axOf(page, locator) {
    const cdp = await page.context().newCDPSession(page);
    try {
        const handle = await locator.first().elementHandle();
        await handle.evaluate((el) => {
            window.__axProbe = el;
        });
        const {result} = await cdp.send('Runtime.evaluate', {expression: 'window.__axProbe'});
        const {nodes} = await cdp.send('Accessibility.getPartialAXTree', {objectId: result.objectId, fetchRelatives: false});
        const node = nodes[0] || {};
        const prop = (name) => ((node.properties || []).find((p) => p.name === name) || {value: {}}).value.value ?? null;
        return {
            role: node.role ? node.role.value : null,
            name: node.name ? node.name.value : null,
            description: node.description ? node.description.value : null,
            invalid: prop('invalid'),
        };
    } finally {
        await cdp.detach().catch(() => {});
    }
}

/**
 * A box as the browser builds it, after putting the cursor in it: aria-invalid, aria-describedby and
 * what each id there points at, the message drawn in its own field, and its accessibility node.
 */
async function boxFacts(page, box) {
    await box.focus().catch(() => {});
    const dom = await box.evaluate((el) => {
        const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const count = (id) => (id ? document.querySelectorAll(`[id="${CSS.escape(id)}"]`).length : 0);
        const ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
        const field = el.closest('.pkpFormField');
        return {
            name: el.getAttribute('name'),
            focused: document.activeElement === el,
            ariaInvalid: el.getAttribute('aria-invalid'),
            ariaDescribedby: el.getAttribute('aria-describedby'),
            describedByPointsAt: ids.map((id) => ({id, elementsWithId: count(id), text: f(document.getElementById(id)?.innerText).slice(0, 200)})),
            messageUnderIt: field ? [...field.querySelectorAll('.pkpFieldError')].map((e) => ({id: e.id, text: f(e.innerText)})) : null,
        };
    });
    return {...dom, ax: await axOf(page, box)};
}

module.exports = {T, SUPPORTING, SUBMISSION, flat, sleep, enableDataCitations, openData, openContextTab, axOf, boxFacts};
