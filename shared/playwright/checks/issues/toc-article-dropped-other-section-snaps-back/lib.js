// Helpers for walk.js (U50 A10). Requiring this file runs nothing.
// Reuses the issue walks' helpers of the A17/A18 report (the table of contents, the issue's page).
const {expect} = require('@playwright/test');
const {screen, record, shot, idle} = require('../../../probe');
const L17 = require('../issue-lists-version-published-outside-it/lib');

const {T, sleep, flat, ISSUE, frameFor, openToc, readIssuePage} = L17;

async function snap(page, name) {
    record(name, await screen(page));
    await shot(page, name).catch(() => {});
}

/**
 * Publish a submission in Production into `issueName` (an issue already published), as the editor:
 * main: "Publish", "Issue Assignment" "Assign To Current/Back Issue", the issue, "Confirm", "Publish".
 * 3.5: the "Issue" page, "Assign to Issue", the issue, "Save"; then "Publish" and its "Publish".
 */
async function publishIntoIssue(page, app, submissionId, issueName, label) {
    const out = {};
    const frame = frameFor(page, app);
    await frame.gotoEditorial(submissionId);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    if (app.line === 'stable-3_5_0') {
        await frame.menuLink('Issue').last().click();
        await idle(page);
        await page.getByRole('button', {name: /^(Assign to Issue|Change Issue)$/}).first().click();
        const dialog = page.getByRole('dialog').filter({has: page.locator('select[name="issueId"]')}).last();
        const select = dialog.locator('select[name="issueId"]');
        await expect(select).toBeVisible({timeout: T});
        const value = await select.locator('option').filter({hasText: issueName}).first().getAttribute('value');
        await select.selectOption(value || '');
        const saved = page.waitForResponse((r) => /\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T});
        await dialog.getByRole('button', {name: /^(Save|Assign|OK)$/}).last().click();
        out.issueSave = (await saved).status();
        await idle(page);
        await sleep(1000);
        const button = page.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first();
        await expect(button).toBeVisible({timeout: T});
        const published = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 60_000});
        await button.click();
        const confirm = page.getByRole('dialog').getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).last();
        await confirm.waitFor({state: 'visible', timeout: T});
        await sleep(800);
        out.window = flat(await page.getByRole('dialog').last().innerText().catch(() => null), 600);
        await snap(page, `${label}-window`);
        await confirm.click();
        out.publish = (await published).status();
    } else {
        const path = require('path');
        const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
        const pub = new PublicationScreen(page, app.contextPath);
        await frame.menuLink('Title & Abstract').last().click();
        await idle(page);
        const panel = await pub.pressPublish();
        await panel.getByRole('combobox', {name: /^Publication Stage/}).selectOption({label: 'Version of Record (VoR)'});
        await panel.getByRole('combobox', {name: /^Revision Significance/}).selectOption({label: 'Major Revision'});
        await panel.getByRole('radio', {name: 'Assign To Current/Back Issue', exact: true}).check();
        const select = panel.locator('select[name="issueId"]');
        await expect(select).toBeVisible({timeout: T});
        const value = await select.locator('option').filter({hasText: issueName}).first().getAttribute('value');
        await select.selectOption(value || '');
        await sleep(400);
        out.panel = flat(await panel.innerText().catch(() => null), 900);
        await snap(page, `${label}-panel`);
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
        const question = page.getByRole('dialog').filter({hasText: 'Are you sure you want to publish this?'});
        await expect(question).toBeVisible({timeout: T});
        const published = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 60_000});
        await question.getByRole('button', {name: 'Publish', exact: true}).click();
        out.publish = (await published).status();
    }
    await idle(page);
    await sleep(1000);
    out.status = flat(await page.locator('[data-cy="workflow-controls-left"]').innerText().catch(() => null), 200);
    await snap(page, `${label}-published`);
    return out;
}

/**
 * The table of contents as the DOM holds it: each section block (`tbody`) with its rows in
 * order, a heading row as `# {title}`; beside what the eye reads top to bottom (`tocOutline`).
 */
async function tocBlocks(win) {
    return win.tocGrid().evaluate((root) =>
        [...root.querySelectorAll('tbody.category_grid_body')].map((tb) => ({
            block: tb.id.replace(/^.*-category-/, 'section '),
            rows: [...tb.querySelectorAll('tr.gridRow')].filter((tr) => tr.getClientRects().length).map((tr) => {
                const t = ((tr.querySelector('td .gridCellContainer') || {}).textContent || '').replace(/\s+/g, ' ').trim();
                return tr.classList.contains('has_extras') ? t : `# ${t}`;
            }),
        }))
    );
}

/** Collect the `data` the browser posts with "Done" (save-sequence), decoded. */
function watchSaveSequence(page) {
    const posts = [];
    page.on('request', (req) => {
        if (/save-sequence/.test(req.url()) && req.method() === 'POST') {
            const body = req.postData() || '';
            const data = new URLSearchParams(body).get('data');
            posts.push(data ? JSON.parse(data) : body);
        }
    });
    return posts;
}

/** The workflow's "Publication Settings" page (3.5: "Issue") of a submission: its "Section" and "Issue" as shown. */
async function sectionShown(page, app, submissionId, label) {
    const frame = frameFor(page, app);
    await frame.gotoEditorial(submissionId);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    await frame.menuLink(app.line === 'stable-3_5_0' ? 'Issue' : 'Publication Settings').last().click();
    await idle(page);
    const select = page.locator('select[name="sectionId"]').last();
    await expect(select).toBeAttached({timeout: T}).catch(() => {});
    await sleep(800);
    const out = {
        section: flat(await select.locator('option:checked').innerText({timeout: 5000}).catch(() => null)),
        issue: flat(await page.locator('select[name="issueId"] option:checked').last().innerText({timeout: 3000}).catch(() => null)),
    };
    if (!out.section) out.text = flat(await page.getByRole('dialog').last().innerText().catch(() => null), 900);
    await snap(page, `${label}-issue-page`);
    return out;
}

module.exports = {T, sleep, flat, ISSUE, snap, openToc, readIssuePage, publishIntoIssue, tocBlocks, watchSaveSequence, sectionShown};
