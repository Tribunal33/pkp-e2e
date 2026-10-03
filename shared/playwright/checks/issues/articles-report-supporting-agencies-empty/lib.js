// Helpers for walk.js (U65 OJS1). Requiring this file runs nothing.
const fs = require('fs');
const {idle, loc, launch, signIn, screen, shot, record} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** A CSV text (RFC 4180 quoting) as rows of cells. */
function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quoted) {
            if (c === '"' && text[i + 1] === '"') {
                cell += '"';
                i++;
            } else if (c === '"') {
                quoted = false;
            } else {
                cell += c;
            }
        } else if (c === '"') {
            quoted = true;
        } else if (c === ',') {
            row.push(cell);
            cell = '';
        } else if (c === '\n') {
            row.push(cell.replace(/\r$/, ''));
            rows.push(row);
            row = [];
            cell = '';
        } else {
            cell += c;
        }
    }
    if (cell !== '' || row.length) {
        row.push(cell);
        rows.push(row);
    }
    return rows;
}

/** Settings › Workflow › "Submission" › "Metadata": tick an item's "Enable …" box and save. */
async function enableMetadataItem(page, app, boxLabel) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/workflow`));
    await idle(page);
    await page.locator('#metadata-button').click();
    const panel = page.locator('#metadata');
    const box = panel.getByRole('checkbox', {name: boxLabel, exact: true});
    await box.waitFor({state: 'visible', timeout: T});
    await loc(page, `Settings › Workflow › Metadata: "${boxLabel}"`, box);
    const before = await box.isChecked();
    if (!before) await box.check();
    const form = panel.locator('form').first();
    const saved = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const response = await saved;
    await form.locator('.pkpFormPage__status', {hasText: 'Saved'}).waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(page);
    return {before, after: await box.isChecked(), status: response ? response.status() : null};
}

/** A submission's workflow, on Publication › "Metadata"; returns the form's "Keywords" input. */
async function openPublicationMetadata(page, app, submissionId) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${submissionId}`));
    await idle(page);
    const entry = page.getByRole('link', {name: 'Metadata', exact: true});
    await entry.first().waitFor({state: 'attached', timeout: T}).catch(() => {});
    if (!(await entry.first().isVisible().catch(() => false))) {
        await page.getByRole('link', {name: /^(Publication|Preprint)$/}).first().click();
    }
    await entry.first().click();
    await page.locator('input[id$="-keywords-control-en"]').first().waitFor({state: 'visible', timeout: T});
    await idle(page);
}

/** The chips of a controlled-vocabulary box ("supportingAgencies", "keywords") of the open Metadata form. */
async function vocabChips(page, field, locale = 'en') {
    const input = page.locator(`input[id$="-${field}-control-${locale}"]`).first();
    const block = input.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " pkpFormField ")][1]');
    const scope = (await block.count()) ? block : page;
    return scope.getByRole('button', {name: /^Remove /}).evaluateAll((bs) => bs.map((b) => (b.getAttribute('aria-label') || b.innerText).replace(/\s+/g, ' ').trim().replace(/^Remove /, '')));
}

/** Type each term into a controlled-vocabulary box (Enter makes the chip). */
async function typeVocab(page, field, terms, locale = 'en') {
    const input = page.locator(`input[id$="-${field}-control-${locale}"]`).first();
    await input.waitFor({state: 'visible', timeout: T});
    await loc(page, `Publication › Metadata: the ${field} box (${locale})`, input);
    for (const term of terms) {
        await input.click();
        await input.pressSequentially(term, {delay: 15});
        await input.press('Enter');
        await page.getByRole('button', {name: `Remove ${term}`}).first().waitFor({state: 'visible', timeout: T});
    }
}

/** Press the Metadata form's "Save"; the publication write's status. */
async function saveMetadata(page) {
    const saved = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await page.getByRole('button', {name: 'Save', exact: true}).first().click();
    const response = await saved;
    await page.locator('[role="status"]:has-text("Saved")').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(page);
    return response ? response.status() : null;
}

/**
 * In a fresh browser (a re-download may otherwise reuse the earlier file):
 * sign in, open Statistics › "Reports", press a report's link; the file's
 * name, bytes and parsed rows. `keep` names a path to write the bytes to.
 */
async function downloadReport(app, username, linkName, snapName, keep) {
    const {page, close} = await launch(app);
    try {
        await signIn(page, username);
        await page.goto(app.url(`/index.php/${app.contextPath}/en/stats/reports`));
        await idle(page);
        record(snapName, await screen(page));
        await shot(page, snapName);
        const link = page.locator('main').getByRole('link', {name: linkName, exact: true});
        await loc(page, `Statistics › Reports: "${linkName}"`, link);
        const dl = page.waitForEvent('download', {timeout: 90_000});
        await link.click();
        const d = await dl;
        const buf = fs.readFileSync(await d.path());
        if (keep) fs.writeFileSync(keep, buf);
        const bom = buf.subarray(0, 3).toString('hex') === 'efbbbf';
        const text = buf.toString('utf8').replace(/^﻿/, '');
        return {file: d.suggestedFilename(), bytes: buf.length, bom, rows: parseCsv(text), text};
    } finally {
        await close();
    }
}

/** One line of a parsed report as {column: value}, found by its first column. */
function rowById(rows, id) {
    const header = rows[0] || [];
    const line = rows.find((r) => r[0] === String(id));
    return line ? Object.fromEntries(header.map((h, i) => [h, line[i]])) : null;
}

module.exports = {T, flat, parseCsv, enableMetadataItem, openPublicationMetadata, vocabChips, typeVocab, saveMetadata, downloadReport, rowById};
