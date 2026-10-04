// Helpers for the U42 A2 and A3 walks (pasted-repeat-reference-dropped-saved,
// reference-search-keeps-rows-without-word). Requiring this file runs nothing.
const {expect} = require('@playwright/test');
const {screen, record, idle} = require('../../../probe');

const T = 30_000;

/** The dataset submission each app's walk opens (dataset.md): unpublished, open to dbarnes. */
const SUBMISSION = {ojs: 8, omp: 3, ops: 1};

/** The texts the app ships for the "Add" outcome (lib/pkp locale/en/submission.po). */
const ADD_MESSAGES = /duplicates|added to the list|cannot be empty|errors during adding/i;

/**
 * Sign-in done: open the submission's workflow and its "References" page.
 * Resolves with the ReferencesPage object.
 */
async function openReferences(page, app, submissionId, key) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {ReferencesPage} = require('../../../pages/CitationsPages.js');
    const group = app.name === 'ops' ? 'Preprint' : 'Publication';
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: group}});
    await frame.gotoEditorial(submissionId);
    await idle(page);
    const refs = new ReferencesPage(page, frame);
    await refs.open();
    await idle(page);
    record(`${key}-references-open`, await screen(page));
    return refs;
}

/** Each row's shown text, in order (an empty table gives its one text row). */
async function rowTexts(refs) {
    return (await refs.rowCells().allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim());
}

/**
 * Type `lines` into the "References" box and press "Add". Records the
 * request's status and body, the box afterwards, "Saved", every message
 * the page shows in the next four seconds that reads like one of the
 * shipped "Add" texts, and the rows.
 */
async function addLines(page, refs, lines, key) {
    await refs.addBox().fill(lines.join('\n'));
    const answered = page.waitForResponse(
        (r) => /importAdditionalCitations$/.test(r.url().split('?')[0]) && r.request().method() === 'POST',
        {timeout: T}
    );
    await refs.addButton().click();
    const r = await answered;
    const body = await r.text().catch(() => null);
    const seen = new Set();
    let saved = false;
    let toast = [];
    for (let i = 0; i < 16; i++) {
        const text = await page.locator('body').innerText().catch(() => '');
        for (const line of text.split('\n')) {
            if (ADD_MESSAGES.test(line)) seen.add(line.trim());
        }
        saved = saved || (await refs.savedStatus().isVisible().catch(() => false));
        const notes = await page.locator('.app__notifications, [role="alert"]').allInnerTexts().catch(() => []);
        for (const n of notes) if (n.trim()) toast.push(n.replace(/\s+/g, ' ').trim());
        await page.waitForTimeout(250);
    }
    await idle(page);
    const out = {
        typed: lines,
        status: r.status(),
        body,
        boxAfter: await refs.addBox().inputValue(),
        saved,
        messages: [...seen],
        notifications: [...new Set(toast)],
        rows: await rowTexts(refs),
        fieldError: (await refs.addError().allInnerTexts().catch(() => [])).map((t) => t.trim()),
        footer: (await refs.addForm().locator('.pkpFormPage__footer').innerText().catch(() => '')).replace(/\s+/g, ' ').trim(),
    };
    record(`${key}`, await screen(page));
    console.log(`[fact] ${key}: ${JSON.stringify(out)}`);
    return out;
}

/** Clear the search, type `phrase`, press Enter; resolves with the rows kept. */
async function search(page, refs, phrase, key) {
    if (await refs.clearSearchButton().isVisible().catch(() => false)) {
        await refs.clearSearchButton().click();
        await idle(page);
    }
    await refs.searchBox().fill('');
    await refs.typeSearch(phrase);
    await refs.commitSearch();
    await page.waitForTimeout(500);
    const rows = await rowTexts(refs);
    record(`${key}`, await screen(page));
    console.log(`[fact] ${key} "${phrase}": ${JSON.stringify(rows)}`);
    return rows;
}

module.exports = {T, SUBMISSION, openReferences, rowTexts, addLines, search, expect};
