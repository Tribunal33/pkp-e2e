// Helpers for walk.js (U42 A25). Requiring this file runs nothing. The workflow helpers are copied from
// ../arxiv-id-loses-version/lib.js and ../press-server-lookup-text-says-journal/lib.js (kept scripts stand alone).
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {idle} = require('../../../probe');

const REPO_ROOT = path.resolve(__dirname, '../../../../..');
const abs = (p) => (path.isAbsolute(p) ? p : path.join(REPO_ROOT, p));

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The workflow, itself a dialog over the dashboard. */
const wf = (page) => page.locator('[role="dialog"]:visible').first();

/**
 * Settings > Workflow > "Metadata": tick "Enable references structuring and metadata lookup", Save.
 * Returns {absent: true} when the screen has no such box (stable-3_5_0 has no metadata lookup).
 */
async function enableLookup(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/workflow`));
    await idle(page);
    const tab = page.locator('#metadata-button');
    if (await tab.count()) {
        await tab.first().click();
        await idle(page);
    }
    const lookup = page.getByRole('checkbox', {name: 'Enable references structuring and metadata lookup', exact: true});
    if (!(await lookup.waitFor({state: 'visible', timeout: 10_000}).then(() => true).catch(() => false))) {
        const boxes = await page.getByRole('checkbox').evaluateAll((els) => els.filter((e) => e.offsetParent).map((e) => (e.labels && e.labels[0] ? e.labels[0].innerText.trim() : e.name)));
        return {absent: true, checkboxesShown: boxes};
    }
    const out = {lookupBefore: await lookup.isChecked()};
    await lookup.check();
    const form = page.locator('form').filter({has: lookup});
    const saved = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    out.saveStatus = r ? r.status() : null;
    out.savedShown = await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10_000}).then(() => true).catch(() => false);
    out.lookupAfter = await lookup.isChecked();
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

/** A Publication-area entry ("References"), opening its group first when needed; returns the page heading. */
async function openEntry(page, name) {
    const dialog = wf(page);
    const entry = dialog.getByRole('link', {name, exact: true}).first();
    if (!(await entry.isVisible().catch(() => false))) {
        const group = dialog.getByRole('link', {name: /^(Publication|Preprint)$/}).first();
        if (await group.count()) {
            await group.click();
            await idle(page);
        }
    }
    await entry.click();
    const heading = dialog.getByRole('heading', {name: new RegExp(`^(Publication|Preprint): ${name}$`, 'i')}).first();
    await heading.waitFor({state: 'visible', timeout: T}).catch(() => {});
    await page.locator('table[aria-label="Structured References"]:visible tbody tr').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    return flat(await heading.innerText().catch(() => null));
}

const refsTable = (page) => page.locator('table[aria-label="Structured References"]:visible').first();
const refRow = (page, text) => refsTable(page).locator('tbody tr').filter({hasText: text}).first();

/** Type lines in the References "Add" box and press "Add"; wait for the row. */
async function addReference(page, text, needle) {
    const box = wf(page).getByRole('textbox', {name: /^References/}).first();
    await box.fill(text);
    const resp = page.waitForResponse((r) => /\/citations/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await wf(page).getByRole('button', {name: 'Add', exact: true}).click();
    const r = await resp;
    await refRow(page, needle).waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(page);
    return {status: r ? r.status() : null};
}

/** "More Actions" > item on a references row; a refetch can detach the open menu, so retry once. */
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

/** Press "Save" on "Edit citation": the request's status and the stored DOI it answered with. */
async function saveEditCitation(page) {
    const p = editPanel(page);
    const resp = page.waitForResponse((r) => /\/citations\/\d+$/.test(r.url().split('?')[0]) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
    await p.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await resp;
    const closed = await p.waitFor({state: 'detached', timeout: 10_000}).then(() => true).catch(() => false);
    await sleep(900); // the modal store keeps a closed side panel's slot 450 ms (patterns.md pitfall 4)
    await idle(page);
    const out = {status: r ? r.status() : null, closed};
    if (r) {
        try {
            const b = await r.json();
            out.answered = {doi: b.doi ?? null, processingStatus: b.processingStatus ?? null, title: b.title ?? null};
        } catch (e) {
            out.answered = null;
        }
    }
    if (!closed) out.errors = (await p.locator('.pkpFieldError').allInnerTexts().catch(() => [])).map((x) => flat(x));
    return out;
}

async function closeEditCitation(page) {
    const p = editPanel(page);
    if (await p.isVisible().catch(() => false)) {
        await p.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await p.waitFor({state: 'detached', timeout: 10_000}).catch(() => {});
        await sleep(900);
        await idle(page);
    }
}

/** A row as shown: its text and its links (DOI links open doi.org). */
async function readRow(page, needle) {
    const row = refRow(page, needle);
    return {
        shown: flat(await row.innerText({timeout: 5000}).catch(() => null), 400),
        links: await row.locator('a').evaluateAll((as) => as.map((a) => `${a.innerText.trim()} -> ${a.getAttribute('href')}`)).catch(() => []),
    };
}

/** "Edit" on a row, read the identifier boxes, "Close". */
async function readEditBoxes(page, needle) {
    await openEditCitation(page, needle);
    const out = {};
    for (const label of ['DOI', 'URL', 'Title']) out[label] = await editField(page, label).inputValue().catch(() => null);
    await closeEditCitation(page);
    return out;
}

/** The page notices shown (toasts, top right). */
async function notices(page) {
    return (await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => [])).map((x) => flat(x, 300));
}

/**
 * `[queues] job_runner` in the install's config (the dataset fleet's config file, which every reset writes
 * afresh with the dataset's own `On`). The Steps' precondition, as the team sets it in config.inc.php.
 */
function setJobRunner(app, on) {
    const file = abs(app.configFile);
    const text = fs.readFileSync(file, 'utf8');
    const next = text.replace(/^job_runner\s*=.*$/m, `job_runner = ${on ? 'On' : 'Off'}`);
    if (next !== text) fs.writeFileSync(file, next);
    return (next.match(/^job_runner\s*=.*$/m) || [null])[0];
}

/** Step 8: what the site's cron entry runs, `php lib/pkp/tools/jobs.php run`, against the install's config. */
function runSiteJobs(app) {
    try {
        return execFileSync('php', ['lib/pkp/tools/jobs.php', 'run'], {
            cwd: abs(app.root),
            env: {...process.env, PKP_CONFIG_FILE: abs(app.configFile)},
            encoding: 'utf8',
            timeout: 300_000,
            maxBuffer: 16 * 1024 * 1024,
        });
    } catch (e) {
        return `exit ${e.status}: ${e.stdout || ''}${e.stderr || ''}`;
    }
}

module.exports = {
    T, sleep, flat, wf,
    enableLookup, gotoWorkflow, openEntry, refsTable, refRow, addReference, refRowAction,
    editPanel, editField, openEditCitation, saveEditCitation, closeEditCitation,
    readRow, readEditBoxes, notices, setJobRunner, runSiteJobs,
};
