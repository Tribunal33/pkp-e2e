// Helpers of walk.js here and of ../review-reads-unanswered-relation-as-not-published/neighbour.js
// (issue reports U75 A8 and A9). Requiring this file runs nothing. Every helper drives the screens.
const path = require('path');
const {idle} = require('../../../probe');
const W = require('../wizard-refused-save-hangs-saving/lib.js');
const D = require('../double-submit-empty-problems-banner/lib.js');
const S = require('../section-editors-not-assigned-second-journal/lib.js');

const {T, sleep, flat} = W;
const L = (app) => (app.line && /3_[34]/.test(app.line) ? '' : '/en');
const AUTHOR = 'ccorino';
const EDITOR = 'dbarnes';
const RELATION = {
    unknown: "This preprint's relations have not been entered.",
    none: 'This preprint has not been published elsewhere.',
    published: 'This preprint has been published elsewhere.',
};

/**
 * From the step the wizard is on to "Review": a PDF galley on "Upload Files", an abstract on
 * "Details", and on "For Readers" the relation choice `relation` (a label) or none when null.
 * Returns what "For Readers" showed for the question before "Continue".
 */
async function toReview(page, app, {relation = null} = {}) {
    const W2 = require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPages.js'));
    const done = new Set();
    let forReaders = null;
    for (let i = 0; i < 10; i++) {
        const step = (await W.currentStep(page)).replace(/^\d+\s*/, '');
        if (/(^|\s)Review$/.test(step)) break;
        if (!done.has(step)) {
            done.add(step);
            if (step === 'Upload Files') {
                await W2.addGalleyFile(page, {label: 'PDF'});
            } else if (step === 'Details') {
                await S.typeAbstract(page, 'An abstract for the u75r4 walk.');
            } else if (step === 'For Readers') {
                forReaders = await readQuestion(page);
                if (relation) {
                    await page.getByRole('radio', {name: relation, exact: true}).check();
                    await idle(page);
                }
            }
        }
        await W.pressContinue(page);
        await idle(page);
        await sleep(500);
    }
    await D.reviewChecked(page);
    return forReaders;
}

/** "For Readers": the "Relation status" field's text and which choice is ticked. */
async function readQuestion(page) {
    const field = page.locator('.pkpFormField').filter({has: page.getByRole('radio', {name: RELATION.none, exact: true})}).first();
    const text = flat(await field.innerText({timeout: T}).catch(() => null), 600);
    const ticked = await field.getByRole('radio').evaluateAll((rs) => rs.filter((r) => r.checked).map((r) => r.closest('label')?.innerText.trim() || r.value)).catch(() => null);
    return {text, ticked};
}

/** "Review": the "Relation status" panel's line, and the step's problems and controls. */
async function readReviewRelation(page) {
    const panel = page.locator('.submissionWizard__reviewPanel').filter({has: page.locator('#review-relation')});
    const body = panel.locator('.submissionWizard__reviewPanel__body--relation');
    return {
        panel: flat(await panel.innerText({timeout: T}).catch(() => null), 400),
        line: flat(await body.innerText({timeout: T}).catch(() => null), 300),
        review: await D.readReview(page),
    };
}

/** "Submit" and its confirmation when "Submit" is enabled; otherwise only the button's state. */
async function submitIfOffered(page) {
    const submit = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true});
    const enabled = await submit.isEnabled({timeout: 10_000}).catch(() => false);
    if (!enabled) return {enabledBefore: false, pressed: false};
    return {pressed: true, ...(await D.pressSubmit(page))};
}

/** As the editor: open submission `id`, "Title & Abstract", "Relations"; read which choice is ticked. */
async function readRelations(page, app, id) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Preprint'}});
    await frame.gotoEditorial(id);
    await frame.expectVersionLoaded().catch(() => {});
    const entry = await frame.revealPublicationEntry('Title & Abstract');
    await entry.click();
    await idle(page);
    await sleep(1000);
    const button = page.getByRole('button', {name: 'Relations', exact: true}).first();
    await button.click({timeout: T});
    await sleep(700);
    const panel = page.locator('.pkpWorkflow__publicationRelation .pkpDropdown__content');
    const radios = panel.getByRole('radio');
    const choices = await radios.evaluateAll((rs) => rs.map((r) => ({label: r.closest('label')?.innerText.trim() || r.value, checked: r.checked}))).catch(() => null);
    const text = flat(await panel.innerText({timeout: T}).catch(() => null), 600);
    await button.click().catch(() => {});
    await sleep(500);
    return {choices, text};
}

/** The header's "Post": read the window's "Related Publication" table, then close it without posting. */
async function readPostWindow(page) {
    const stageAction = page.getByRole('button', {name: 'Post the preprint', exact: true});
    const post = page.getByRole('button', {name: 'Post', exact: true});
    await stageAction.or(post).first().waitFor({timeout: T});
    if (await stageAction.isVisible().catch(() => false)) await stageAction.click();
    await post.first().click({timeout: T});
    const dialog = page.getByRole('dialog').filter({hasText: /Related Publication|Are you sure/}).last();
    await dialog.waitFor({timeout: T});
    await idle(page);
    await sleep(500);
    const text = flat(await dialog.innerText(), 1500);
    const related = flat(await dialog.locator('table').filter({hasText: 'Related Publication'}).innerText().catch(() => null), 400);
    const closer = dialog.getByRole('button', {name: /^(Cancel|Close)$/}).first();
    await closer.click({timeout: 10_000}).catch(() => {});
    await idle(page).catch(() => {});
    return {text, related};
}

module.exports = {T, sleep, flat, L, AUTHOR, EDITOR, RELATION, toReview, readQuestion, readReviewRelation, submitIfOffered, readRelations, readPostWindow, beginSubmission: W.beginSubmission};
