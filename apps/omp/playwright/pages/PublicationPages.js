// @ts-check
/**
 * @file playwright/pages/PublicationPages.js
 *
 * OMP publication-page helpers the workflow frame's tests share: the
 * "Unpublish" dialog a press's "Title & Abstract" offers on a published
 * monograph (U49's dialog; U24 S8 drives it to watch the submission leave
 * Done by itself), and the "Permissions & Disclosure" license boxes typed
 * and saved (U72 S8's given), and "Create New Version" (U73 S9). The frame itself (header, menu, status box, the return
 * and delete dialogs) is the shared `WorkflowPage`.
 */
const {expect} = require('@playwright/test');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');

/** The Unpublish dialog's verbatim question (U49 Rule 9). */
const UNPUBLISH_QUESTION = "Are you sure you don't want this to be published?";

/**
 * Press "Unpublish" in the open publication page's right control region
 * and confirm its dialog. Resolves once the unpublish endpoint has
 * answered and the dialog has closed; what the panel shows next (the
 * bubble, the stripe, the header) is the caller's to assert. Live
 * 2026-09-13 (OMP): the dialog is titled "Unpublish", carries the question
 * and the buttons "Unpublish" / "Cancel".
 *
 * @param {import('@playwright/test').Page} page
 */
async function unpublishFromWorkflow(page) {
    await page
        .locator('[data-cy="workflow-controls-right"]')
        .getByRole('button', {name: 'Unpublish', exact: true})
        .click();
    const dialog = page.getByRole('dialog', {name: 'Unpublish', exact: true});
    await expect(dialog).toBeVisible({timeout: 30_000});
    await expect(dialog.getByText(UNPUBLISH_QUESTION)).toBeVisible();
    const unpublished = page.waitForResponse(
        (r) => r.url().includes('/unpublish') && r.ok(),
        {timeout: 30_000}
    );
    await dialog.getByRole('button', {name: 'Unpublish', exact: true}).click();
    await unpublished;
    await expect(dialog).toHaveCount(0, {timeout: 30_000});
}

/**
 * On the open version's "Permissions & Disclosure" page, type the given
 * boxes ("License URL", and on an Edited Volume "Default Chapter License
 * URL") and press the form's "Save", bounded by the publication PUT (POST
 * with the override header). The boxes must be open: on a press without a
 * license they are; with one they arrive greyed out behind "Override"
 * (seed-facts.md), which this helper does not press. Added for U72 S8,
 * whose scratch press has no license and whose context scenario refuses
 * `licenseUrl`.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{licenseUrl?: string, chapterLicenseUrl?: string}} fields
 */
async function saveLicenseFields(page, {licenseUrl, chapterLicenseUrl} = {}) {
    const main = page.locator('[data-cy="workflow-primary-items"]');
    const licenseBox = main.getByRole('textbox', {name: 'License URL', exact: true});
    const chapterBox = main.getByRole('textbox', {name: 'Default Chapter License URL', exact: true});
    await expect(licenseBox).toBeEditable({timeout: 30_000});
    if (licenseUrl !== undefined) {
        await licenseBox.fill(licenseUrl);
    }
    if (chapterLicenseUrl !== undefined) {
        await chapterBox.fill(chapterLicenseUrl);
    }
    const saved = page.waitForResponse(
        (r) => /\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST',
        {timeout: 30_000}
    );
    await licenseBox.locator('xpath=ancestor::form[1]').getByRole('button', {name: 'Save', exact: true}).click();
    const response = await saved;
    expect(response.ok(), `the Permissions & Disclosure save answered ${response.status()}`).toBe(true);
}

/**
 * The side menu's "Create New Version" on an open workflow, confirmed as
 * it arrives (U49 Rule 11); resolves with the new publication's id once
 * the version call has answered and the window has closed. Added for U73
 * S9 (U72 S10 carries its own copy).
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>}
 */
async function createNewVersion(page) {
    const frame = new WorkflowPage(page, null);
    const item = await frame.revealPublicationEntry('Create New Version');
    await frame.expectVersionLoaded();
    await item.click();
    const dialog = page.getByRole('dialog', {name: 'Create New Version'});
    await expect(dialog).toBeVisible({timeout: 30_000});
    await expect(dialog.getByLabel('Publication Stage')).toBeVisible({timeout: 30_000});
    const created = page.waitForResponse(
        (r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST' && r.ok(),
        {timeout: 30_000}
    );
    await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
    const body = await (await created).json();
    await expect(dialog).toHaveCount(0, {timeout: 30_000});
    return body.id;
}

module.exports = {UNPUBLISH_QUESTION, unpublishFromWorkflow, saveLicenseFields, createNewVersion};
