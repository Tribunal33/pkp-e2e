// Helpers for the U42 A12 walk (arXiv IDs losing their version): the workflow's Publication pages
// "References" and "Data", the "Edit citation" panel, the data citation panel and Settings › Workflow ›
// "Metadata". Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The workflow, itself a dialog over the dashboard. */
const wf = (page) => page.locator('[role="dialog"]:visible').first();

const SUPPORTING = 'Supporting data without specifying whether they were generated or analyzed (supporting).';

/** Settings › Workflow › "Metadata": tick lookup and data citations ("Ask the author…"), Save. */
async function enableLookupAndDataCitations(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/workflow`));
    await idle(page);
    const tab = page.locator('#metadata-button');
    if (await tab.count()) { await tab.first().click(); await idle(page); }
    const lookup = page.getByRole('checkbox', {name: 'Enable references structuring and metadata lookup', exact: true});
    await lookup.waitFor({state: 'visible', timeout: T});
    const out = {lookupBefore: await lookup.isChecked()};
    await lookup.check();
    const dc = page.getByRole('checkbox', {name: 'Enable data citation metadata', exact: true});
    out.dataCitationsBefore = await dc.isChecked();
    await dc.check();
    const group = page.getByRole('group', {name: 'Data Citations', exact: true});
    await group.getByRole('radio', {name: /^Ask the author for data citation metadata/}).check();
    const form = page.locator('form').filter({has: lookup});
    const saved = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    out.saveStatus = r ? r.status() : null;
    await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10_000}).catch(() => {});
    out.lookupAfter = await lookup.isChecked();
    out.dataCitationsAfter = await dc.isChecked();
    return out;
}

/** Open a submission's workflow as an editor. */
async function gotoWorkflow(page, app, id) {
    await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${id}`));
    await idle(page);
    await wf(page).getByRole('link', {name: /^(Title & Abstract|Publication|Preprint|References)$/}).first()
        .waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(page);
}

/** A Publication-area entry ("References", "Data"), opening its group first when needed. */
async function openEntry(page, name) {
    const dialog = wf(page);
    const entry = dialog.getByRole('link', {name, exact: true}).first();
    if (!(await entry.isVisible().catch(() => false))) {
        const group = dialog.getByRole('link', {name: /^(Publication|Preprint)$/}).first();
        if (await group.count()) { await group.click(); await idle(page); }
    }
    await entry.click();
    const heading = dialog.getByRole('heading', {name: new RegExp(`^(Publication|Preprint): ${name}$`, 'i')}).first();
    await heading.waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(page);
    return flat(await heading.innerText().catch(() => null));
}

const refsTable = (page) => page.locator('table[aria-label="Structured References"]:visible').first();
const refRow = (page, text) => refsTable(page).locator('tbody tr').filter({hasText: text}).first();

/** Type lines in the References "Add" box and press "Add"; wait for the row. */
async function addReference(page, text) {
    const box = wf(page).getByRole('textbox', {name: /^References/}).first();
    await box.fill(text);
    const resp = page.waitForResponse((r) => /\/citations/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await wf(page).getByRole('button', {name: 'Add', exact: true}).click();
    const r = await resp;
    await refRow(page, text.split('\n')[0].slice(0, 30)).waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(page);
    return {status: r ? r.status() : null};
}

/** "More Actions" › item on a references row; a refetch can detach the open menu, so retry once. */
async function refRowAction(page, text, action) {
    for (let i = 0; i < 2; i++) {
        try {
            await refRow(page, text).getByRole('button', {name: 'More Actions'}).click({timeout: 10_000});
            const item = page.getByRole('menuitem', {name: action, exact: true});
            await item.waitFor({state: 'visible', timeout: 5000});
            await item.click({timeout: 5000});
            return true;
        } catch (e) {
            if (i) throw e;
            await sleep(1000);
        }
    }
    return false;
}

const editPanel = (page) => page.getByRole('dialog', {name: 'Edit citation'});
const editField = (page, label) => editPanel(page).getByRole('textbox', {name: new RegExp(`^${label}`)}).first();

async function openEditCitation(page, text) {
    await refRowAction(page, text, 'Edit');
    await editPanel(page).getByRole('button', {name: 'Save', exact: true}).waitFor({state: 'visible', timeout: T});
    await idle(page);
    await sleep(300);
}

/** The "Arxiv" box with its help text, and any field errors in the panel. */
async function readArxiv(page) {
    const p = editPanel(page);
    return {
        value: await editField(page, 'Arxiv').inputValue(),
        help: flat(await p.locator('.pkpFormField').filter({has: page.getByRole('textbox', {name: /^Arxiv/})})
            .locator('.pkpFormField__description').first().innerText().catch(() => null)),
        errors: (await p.locator('.pkpFieldError').allInnerTexts().catch(() => [])).map((x) => flat(x)),
    };
}

/** Press "Save" on "Edit citation": the request's status and body, and whether the panel closed. */
async function saveEditCitation(page) {
    const p = editPanel(page);
    const resp = page.waitForResponse((r) => /\/citations\/\d+$/.test(r.url().split('?')[0]) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
    await p.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await resp;
    const closed = await p.waitFor({state: 'detached', timeout: 10_000}).then(() => true).catch(() => false);
    await idle(page);
    let stored = null;
    if (r) {
        try { const b = await r.json(); stored = b && 'arxiv' in b ? b.arxiv : b; } catch (e) { stored = null; }
    }
    const out = {status: r ? r.status() : null, closed, response: stored};
    if (!closed) {
        out.errors = (await p.locator('.pkpFieldError').allInnerTexts().catch(() => [])).map((x) => flat(x));
        out.foot = ((await p.innerText().catch(() => '')) || '').split('\n').map((l) => l.trim()).filter((l) => /Please correct/.test(l));
    }
    return out;
}

async function closeEditCitation(page) {
    const p = editPanel(page);
    if (await p.isVisible().catch(() => false)) {
        await p.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await p.waitFor({state: 'detached', timeout: 10_000}).catch(() => {});
        await idle(page);
    }
}

/** Type a value in "Arxiv", Save, reopen "Edit" and read what was stored. */
async function arxivRoundTrip(page, rowText, typed) {
    await openEditCitation(page, rowText);
    await editField(page, 'Arxiv').fill(typed);
    const saved = await saveEditCitation(page);
    if (!saved.closed) { await closeEditCitation(page); return {typed, saved}; }
    await openEditCitation(page, rowText);
    const reread = await readArxiv(page);
    await closeEditCitation(page);
    return {typed, saved, reread: reread.value};
}

// --- data citations

const dcPanel = (page, title) => page.getByRole('dialog', {name: title, exact: true});

async function dcRows(page) {
    const t = page.locator('table[aria-label="Data Citations"]:visible').first();
    if (!(await t.count())) return null;
    return t.locator('tbody tr').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
}

async function fillDataCitation(panel, d) {
    if (d.title !== undefined) await panel.getByRole('textbox', {name: /^Title/}).fill(d.title);
    if (d.identifierType) await panel.getByRole('combobox', {name: 'Identifier type', exact: true}).selectOption({label: d.identifierType});
    if (d.identifier !== undefined) await panel.getByRole('textbox', {name: 'Identifier', exact: true}).fill(d.identifier);
    if (d.relationship) await panel.getByRole('combobox', {name: /^Relationship type/}).selectOption({label: d.relationship});
}

/** Press "Save" on the data citation panel: status, the error under the box, whether it closed. */
async function saveDataCitation(page, panel) {
    const resp = page.waitForResponse((r) => /\/dataCitations(\/\d+)?$/.test(r.url().split('?')[0]) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await resp;
    const closed = await panel.waitFor({state: 'detached', timeout: 8000}).then(() => true).catch(() => false);
    await idle(page);
    const out = {status: r ? r.status() : null, closed};
    if (r) { try { const b = await r.json(); out.response = b && b.identifier !== undefined ? {identifier: b.identifier, identifierType: b.identifierType} : b; } catch (e) { /* none */ } }
    if (!closed) {
        out.errors = (await panel.locator('.pkpFieldError').allInnerTexts().catch(() => [])).map((x) => flat(x));
        out.foot = ((await panel.innerText().catch(() => '')) || '').split('\n').map((l) => l.trim()).filter((l) => /Please correct/.test(l));
    }
    return out;
}

/** "Add Data Citation", fill, Save. Leaves the panel open when refused. */
async function addDataCitation(page, d) {
    await wf(page).getByRole('button', {name: 'Add Data Citation', exact: true}).first().click();
    const panel = dcPanel(page, 'Add Data Citation');
    await panel.waitFor({state: 'visible', timeout: T});
    await idle(page);
    await fillDataCitation(panel, d);
    return {panel, saved: await saveDataCitation(page, panel)};
}

async function closeDataCitation(page, panel) {
    if (await panel.isVisible().catch(() => false)) {
        await panel.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await panel.waitFor({state: 'detached', timeout: 10_000}).catch(() => {});
        await idle(page);
    }
}

module.exports = {
    T, sleep, flat, wf, SUPPORTING,
    enableLookupAndDataCitations, gotoWorkflow, openEntry,
    refsTable, refRow, addReference, refRowAction,
    editPanel, editField, openEditCitation, readArxiv, saveEditCitation, closeEditCitation, arxivRoundTrip,
    dcPanel, dcRows, fillDataCitation, saveDataCitation, addDataCitation, closeDataCitation,
};
