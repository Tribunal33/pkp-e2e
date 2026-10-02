// Helpers of walk.js (issue report docs/issues/U64-A11-counter-report-tsv-comma-separated.md).
// Requiring this file runs nothing. Every helper presses what a person presses.
const fs = require('fs');
const {idle} = require('../../../probe');
const {flat, rel} = require('../download-issues-stops-at-30/lib');

const T = 30_000;
const REPORT_API = /\/api\/v1\/stats\/sushi\/reports\/[a-z0-9_]+/i;

const attempt = async (fn) => {
    try {
        return await fn();
    } catch (e) {
        return {error: flat(e.message, 300)};
    }
};

/**
 * The precondition no screen can set: an install old enough to have COUNTER months. The two dates the
 * app itself writes (the install's and each publication's) are moved back to `day`.
 */
const AGE_SQL = (day) => [
    `UPDATE versions SET date_installed = '${day} 12:00:00' WHERE product_type = 'core'`,
    `UPDATE publications SET date_published = '${day}' WHERE date_published IS NOT NULL`,
];

/** The "Counter R5" page as it stands: the warning, and each row's name. */
async function readList(page) {
    const panel = page.locator('.counterReportsListPanel').first();
    await panel.locator('.listPanel__item').first().waitFor({timeout: T}).catch(() => {});
    return {
        heading: flat(await page.locator('h1').first().innerText().catch(() => null), 80),
        warning: await page.getByText('There are no COUNTER R5 usage statistics available yet.', {exact: true}).isVisible().catch(() => false),
        rows: (await panel.locator('.listPanel__item').allInnerTexts().catch(() => [])).map((s) => flat(s.replace(/\bEdit\b/, ''), 100)),
    };
}

/** "Edit" on the row whose name is `name` ("Platform Master Report (PR)"): the open window's dates. */
async function editReport(page, name) {
    const row = page.locator('.counterReportsListPanel .listPanel__item').filter({hasText: name}).first();
    await row.getByRole('button', {name: 'Edit', exact: true}).click();
    const dialog = page.getByRole('dialog').filter({hasText: 'Report Settings'});
    await dialog.getByRole('button', {name: 'Download', exact: true}).waitFor({timeout: T});
    await idle(page);
    return {
        dialog,
        title: flat(await dialog.locator('h1, h2').first().innerText().catch(() => null), 60),
        start: await dialog.locator('input[name="begin_date"]').inputValue().catch(() => null),
        end: await dialog.locator('input[name="end_date"]').inputValue().catch(() => null),
    };
}

/** A downloaded file as written: name, whether it holds a tab, its first lines verbatim (tabs shown as <TAB>). */
function readFile(name, text) {
    const lines = text.replace(/^﻿/, '').split(/\r?\n/);
    return {
        name,
        bom: text.charCodeAt(0) === 0xfeff,
        tabs: (text.match(/\t/g) || []).length,
        lineCount: lines.length,
        head: lines.slice(0, 16).map((l) => l.replace(/\t/g, '<TAB>').slice(0, 200)),
    };
}

/**
 * "Download" in the open "Report Settings" window: the request the page sent and its answer's headers,
 * the file that arrived (null when none did within `wait` ms), and what the window shows afterwards.
 */
async function pressDownload(page, dialog, {wait = 12_000} = {}) {
    const arrived = page.waitForEvent('download', {timeout: wait}).catch(() => null);
    const answered = page.waitForResponse((r) => REPORT_API.test(r.url()), {timeout: T}).catch(() => null);
    await dialog.getByRole('button', {name: 'Download', exact: true}).click();
    const r = await answered;
    const out = {};
    if (r) {
        const h = r.headers();
        out.request = `${r.request().method()} ${rel(r.url()).replace(/^.*\/api\/v1/, '/api/v1')}`;
        out.accept = r.request().headers().accept;
        out.status = r.status();
        out.contentType = h['content-type'] || null;
        out.contentDisposition = h['content-disposition'] || null;
    }
    // A refusal is drawn from the answer, so a file would have come with it: wait less for one.
    const file = r && r.status() >= 400 ? await Promise.race([arrived, new Promise((res) => setTimeout(() => res(null), 2000))]) : await arrived;
    out.file = file ? readFile(file.suggestedFilename(), fs.readFileSync(await file.path(), 'utf8')) : null;
    await page.waitForTimeout(500);
    out.windowOpen = await dialog.isVisible().catch(() => false);
    if (out.windowOpen) out.errors = (await dialog.locator('.pkpFormFieldError, .pkpFieldError, [id$="-error"]').allInnerTexts().catch(() => [])).map((s) => flat(s, 200)).filter(Boolean);
    return out;
}

/** Close the open "Report Settings" window, when it is still open. */
async function closeWindow(page, dialog) {
    if (!(await dialog.isVisible().catch(() => false))) return;
    await dialog.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
    await dialog.waitFor({state: 'hidden', timeout: 8000}).catch(() => {});
}

/** An address typed in the browser: the answer's status, content type and first characters. */
async function typeAddress(page, url) {
    const r = await page.goto(url);
    const body = r ? await r.text().catch(() => '') : '';
    return {address: rel(url), status: r ? r.status() : null, contentType: r ? r.headers()['content-type'] || null : null, tabs: (body.match(/\t/g) || []).length, start: flat(body, 220)};
}

module.exports = {T, flat, rel, attempt, AGE_SQL, readList, editReport, readFile, pressDownload, closeWindow, typeAddress};
