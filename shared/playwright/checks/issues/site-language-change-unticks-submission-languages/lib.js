// Helpers for walk.js (U57 A1). Requiring this file runs nothing.
const {idle} = require('../../../probe');

const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();

/** A "Submission Languages" row as read: present, "Default" radio, "Submissions" and "Metadata" boxes. */
async function submissionRow(tab, code) {
    const present = (await tab.submission.row(code).count()) > 0;
    if (!present) return {present};
    const read = async (col) => tab.submission.cell(code, col).isChecked().catch(() => null);
    return {
        present,
        default: await read('defaultSubmissionLocale'),
        submissions: await read('submissionLocale'),
        metadata: await read('submissionMetadataLocale'),
    };
}

/** "Make a Submission": the start page's "Submission Language" choices (empty when it asks none). */
async function startPageLanguages(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/submission`));
    await idle(page);
    await page.getByRole('button', {name: /Begin Submission/}).first().waitFor({timeout: 30_000}).catch(() => {});
    // The language field: the radios under the legend "Submission Language" (the form's other
    // fields are fieldsets of their own on main, inside one fieldset on 3.5, so read the field itself).
    const field = page.locator('.pkpFormField--options').filter({hasText: 'Submission Language'}).first();
    if (!(await field.count())) return {asked: false, options: []};
    const options = (await field.locator('label').allInnerTexts()).map(flat).filter(Boolean);
    return {asked: true, options};
}

/** The author of the default dataset each app's steps sign in as, and the section the start page asks for. */
const AUTHOR = {ojs: {username: 'ccorino', section: 'Articles'}, omp: {username: 'aclark', section: null}, ops: {username: 'ccorino', section: 'Preprints'}};

/**
 * Steps 13-14: on the open "Make a Submission", type the title, choose the section when asked
 * (and English when a "Submission Language" is asked), tick the two boxes, "Begin Submission";
 * then read the "Details" step. Returns the new submission's id and what the step shows.
 */
async function beginAndReadDetails(page, app, title) {
    const {beginSubmission} = require('../section-editors-not-assigned-second-journal/lib.js');
    const id = await beginSubmission(page, app, app.contextPath, {title, section: AUTHOR[app.name].section});
    await idle(page);
    // main opens on "Upload Files" with "Details" second: "Continue" once (3.5 opens on "Details").
    const {currentStep, pressContinue} = require('../wizard-refused-save-hangs-saving/lib.js');
    const opened = await currentStep(page);
    if (!/Details$/.test(opened)) {
        await pressContinue(page);
        await idle(page);
    }
    const current = await currentStep(page);
    const bar = flat(await page.locator('.pkpFormLocales').first().innerText().catch(() => ''));
    const selected = flat(await page.locator('.pkpFormLocales [aria-pressed="true"], .pkpFormLocales .pkpFormLocales__locale--isPrimary').allInnerTexts().catch(() => []).then((a) => a.join(' | ')));
    const titleBox = page.locator('[id^="titleAbstract-title-control"]').first();
    const titleBoxId = await titleBox.getAttribute('id').catch(() => null);
    const fieldLabels = (await page.locator('.pkpFormFieldLabel, .pkpFormField__localization, .pkpFormLocales').allInnerTexts().catch(() => [])).map(flat).filter(Boolean).slice(0, 20);
    return {id, opened, current, bar, selected, titleBoxId, fieldLabels};
}

module.exports = {flat, submissionRow, startPageLanguages, AUTHOR, beginAndReadDetails};
