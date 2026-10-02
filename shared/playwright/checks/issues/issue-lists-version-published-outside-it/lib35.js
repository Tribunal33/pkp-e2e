// stable-3_5_0 steps 3-5 for walk.js (no "Don't Assign To An Issue" there).
// Requiring this file runs nothing.
const {expect} = require('@playwright/test');
const {screen, record, shot, idle} = require('../../../probe');
const {T, sleep, flat, FUTURE, frameFor} = require('./lib');

/**
 * On the open workflow (version 1.1 shown): its "Issue" page set to the
 * future issue and saved, "Schedule For Publication" confirmed, then Issues ›
 * "Future Issues" › that issue › "Publish Issue" › "OK".
 */
async function publishInOtherIssue(page, app, submissionId) {
    const out = {};
    const frame = frameFor(page, app);
    await frame.menuLink('Issue').last().click();
    await idle(page);
    await page.getByRole('button', {name: 'Change Issue', exact: true}).click();
    const dialog = page.getByRole('dialog').filter({has: page.locator('select[name="issueId"]')}).last();
    const select = dialog.locator('select[name="issueId"]');
    await expect(select).toBeVisible({timeout: T});
    out.issueBefore = flat(await select.locator('option:checked').innerText().catch(() => null));
    const option = select.locator('option').filter({hasText: FUTURE});
    await select.selectOption((await option.first().getAttribute('value')) || '');
    const saved = page.waitForResponse((r) => /\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T});
    await dialog.getByRole('button', {name: /^(Save|Assign|OK)$/}).last().click();
    out.issueSave = (await saved).status();
    await idle(page);
    await sleep(1200);
    out.issueLine = flat(await page.getByText(/This has been (assigned|scheduled)/).first().innerText().catch(() => null), 200);
    record('step3-35-issue-saved', await screen(page));

    const button = page.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first();
    await expect(button).toBeVisible({timeout: T});
    out.button = flat(await button.innerText());
    const scheduled = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 60_000});
    await button.click();
    const confirm = page.getByRole('dialog').getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).last();
    await confirm.waitFor({state: 'visible', timeout: T});
    await sleep(800);
    out.window = flat(await page.getByRole('dialog').last().innerText().catch(() => null), 600);
    record('step4-35-window', await screen(page));
    await shot(page, 'step4-35-window').catch(() => {});
    await confirm.click();
    out.schedule = (await scheduled).status();
    await idle(page);
    await sleep(1000);
    out.statusAfterSchedule = flat(await page.locator('[data-cy="workflow-controls-left"]').innerText().catch(() => null), 200);

    const {IssuesAdmin, PublishIssueDialog} = require('../../../pages/IssuesPages.js');
    const admin = new IssuesAdmin(page, app.contextPath);
    await admin.goto('Future Issues');
    const win = await admin.openPublish(FUTURE);
    out.publishIssueWindow = await win.outline().catch(() => null);
    await win.ok();
    out.issuePublished = true;
    record('step5-35-issue-published', await screen(page));
    return out;
}

module.exports = {publishInOtherIssue};
