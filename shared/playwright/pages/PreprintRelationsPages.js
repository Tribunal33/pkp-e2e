// @ts-check
/**
 * @file shared/playwright/pages/PreprintRelationsPages.js
 * Page objects for the Preprint relations feature (spec:
 * docs/specs/U75-preprint-relations.md). The feature is a preprint
 * server's alone ({OPS}); the journal's and the press's suites use these
 * locators for their absence reads (scenario 7), so nothing here names an
 * app and the frame (`WorkflowPage`) comes from the caller.
 * Surfaces:
 * - RelationsControl — the "Relations" button that follows the "Status: …"
 *   line in a publication page's left control region, and the panel it
 *   opens: the "Relation status" legend and its three choices, the "DOI of
 *   the published preprint" box (in the DOM only while "This preprint has
 *   been published elsewhere." is ticked), "Save" with its "Saved" status,
 *   and a refused box's readouts ("This is not a valid URL.", "Please
 *   correct one error.", "Go to …", "Jump to next error").
 * - The submission wizard's Review step: the "Relation status" panel and
 *   its one line (`reviewRelationPanel`, `reviewRelationLine`).
 * - The preprint page's notice (`relationNotice`) among the page's notices
 *   (`ArticleLandingPage.notices()`), and `lines()` for "on a second line"
 *   reads.
 * - PostWindow — the "Post the preprint" window "Post" opens: its
 *   "Related Publication" table line, "Close", and "Post" (the window's
 *   own button, read on screen: U75 claim check ccK2).
 * - `pressPreview` — a publication page's "Preview", which opens the
 *   preprint page in the same tab.
 * DOM shapes (U75 claim check, `.reports/U75/screen-notes.md`, ccK1 and
 * ccK2, 2026-09-27; lib/ui-library
 * WorkflowPublicationRelationDropdownOPS.vue, Dropdown.vue, FieldOptions.vue;
 * ops templates/submission/review-relation.tpl and
 * templates/frontend/objects/preprint_details.tpl; ops
 * PublishForm.php): the panel is `.pkpWorkflow__publicationRelation
 * .pkpDropdown__content`, mounted only while open; the radios are
 * `input[name="relationStatus"]` inside `label.pkpFormField--options__option`;
 * the box `input[name="vorDoi"]`; a save is POST
 * `…/submissions/{id}/publications/{id}` (X-Http-Method-Override PUT).
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');

const T = 30_000;

/** The feature's strings (ops locale/en/submission.po, lib/pkp common.po). */
const RELATIONS_TEXT = {
    button: 'Relations',
    legend: 'Relation status',
    unknown: "This preprint's relations have not been entered.",
    none: 'This preprint has not been published elsewhere.',
    published: 'This preprint has been published elsewhere.',
    doiLabel: 'DOI of the published preprint',
    withDoi: 'This preprint has been published.',
    postNoDoi: 'This preprint has been published, but no DOI is available yet.',
    relatedPublication: 'Related Publication',
    invalidUrl: 'This is not a valid URL.',
    oneError: 'Please correct one error.',
    goToError: 'Go to DOI of the published preprint: This is not a valid URL.',
    nextError: 'Jump to next error',
    notSaved: 'The form was not saved because 1 error(s) were encountered. Please correct these errors and try again.',
    saved: 'Saved',
    save: 'Save',
};
exports.RELATIONS_TEXT = RELATIONS_TEXT;

/** The three choices in the order the form lists them. */
const RELATION_CHOICES = [RELATIONS_TEXT.unknown, RELATIONS_TEXT.none, RELATIONS_TEXT.published];
exports.RELATION_CHOICES = RELATION_CHOICES;

/** Is `response` the relation form's save of a publication? */
function isPublicationSave(response) {
    return (
        response.request().method() === 'POST' &&
        /\/submissions\/\d+\/publications\/\d+(\?.*)?$/.test(response.url())
    );
}
exports.isPublicationSave = isPublicationSave;

/**
 * An element's visible lines (innerText split at line breaks, each line's
 * spaces folded, empty lines dropped). A one-shot read: call it inside
 * `expect.poll`, or after an auto-waited read of the same element.
 *
 * @param {import('@playwright/test').Locator} locator
 * @returns {Promise<string[]>}
 */
async function lines(locator) {
    const text = await locator.innerText();
    return text
        .split('\n')
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
}
exports.lines = lines;

/**
 * The "Relations" control of the open publication page and its panel.
 * `frame` is the shared `WorkflowPage` of the open workflow.
 */
class RelationsControl extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {any} frame the open workflow's `WorkflowPage`
     */
    constructor(page, frame) {
        super(page);
        this.frame = frame;
    }

    /** The "Relations" button of the left control region (its name carries no icon text). */
    button() {
        return this.frame.controlsLeft().getByRole('button', {name: /^\s*Relations\s*$/});
    }

    /** The down arrow inside the button (the dropdown icon). */
    buttonArrow() {
        return this.button().locator('svg');
    }

    /** The panel under the button (mounted only while open). */
    panel() {
        return this.frame.dialog().locator('.pkpWorkflow__publicationRelation .pkpDropdown__content');
    }

    /** The "Relation status" legend of the panel. */
    legend() {
        return this.panel().locator('legend');
    }

    /** The choices' labels, in the form's order. */
    choiceLabels() {
        return this.panel().locator('label.pkpFormField--options__option');
    }

    /** A choice's radio by its exact label. */
    choice(label) {
        return this.panel().getByRole('radio', {name: label, exact: true});
    }

    /** Every radio of the panel. */
    radios() {
        return this.panel().locator('input[name="relationStatus"]');
    }

    /** The ticked radios (none, or one). */
    tickedRadios() {
        return this.panel().locator('input[name="relationStatus"]:checked');
    }

    /** The "DOI of the published preprint" box. */
    doiBox() {
        return this.panel().locator('input[name="vorDoi"]');
    }

    /** The box's field wrapper (its label, its box, any help text or error). */
    doiField() {
        return this.panel().locator('.pkpFormField').filter({has: this.page.locator('input[name="vorDoi"]')});
    }

    /** The box's help text (a description under the label), if any. */
    doiHelp() {
        return this.doiField().locator('.pkpFormField__description');
    }

    saveButton() {
        return this.panel().getByRole('button', {name: RELATIONS_TEXT.save, exact: true});
    }

    /** The "Saved" status beside the button (patterns.md pitfall 14). */
    savedStatus() {
        return this.panel().getByRole('status').filter({hasText: RELATIONS_TEXT.saved});
    }

    /** The box's error line ("This is not a valid URL." under the box). */
    doiError() {
        return this.doiField().locator('.pkpFieldError');
    }

    /** The error summary above "Save" ("Please correct one error." and its two buttons). */
    errorSummary() {
        return this.panel().locator('.pkpFormErrors');
    }

    goToErrorButton() {
        return this.panel().getByRole('button', {name: RELATIONS_TEXT.goToError, exact: true});
    }

    nextErrorButton() {
        return this.panel().getByRole('button', {name: RELATIONS_TEXT.nextError, exact: true});
    }

    /** The page notice of a refused form ("The form was not saved because …"), a toast of about five seconds. */
    notSavedNotice() {
        return this.page.locator('.app__notifications').getByText(RELATIONS_TEXT.notSaved);
    }

    /** Press "Relations" when the panel is closed; returns once its legend shows. */
    async open() {
        await expect(this.button()).toBeVisible({timeout: T});
        if (!(await this.panel().isVisible())) {
            await this.button().click();
        }
        await expect(this.legend()).toHaveText(RELATIONS_TEXT.legend, {timeout: T});
        await expect(this.radios()).toHaveCount(3, {timeout: T});
    }

    /** Press "Relations" again to close the panel. */
    async close() {
        await this.button().click();
        await expect(this.panel()).toHaveCount(0, {timeout: T});
    }

    /** No choice ticked: a settled read (three radios drawn, none checked). */
    async expectNoneTicked() {
        await expect(this.radios()).toHaveCount(3, {timeout: T});
        await expect(this.tickedRadios()).toHaveCount(0);
    }

    /** Exactly `label` ticked. */
    async expectTicked(label) {
        await expect(this.choice(label)).toBeChecked({timeout: T});
        await expect(this.tickedRadios()).toHaveCount(1);
    }

    /** Tick a choice. */
    async choose(label) {
        await this.choice(label).check();
    }

    /** Type into the DOI box (replacing what it holds; '' empties it). */
    async typeDoi(value) {
        await this.doiBox().fill(value);
    }

    /**
     * Press "Save" and wait for the save's answer; returns the response.
     * The caller asserts what the screen shows (`save()` for an accepted one).
     */
    async pressSave() {
        await expect(this.saveButton()).toBeEnabled({timeout: T});
        const answered = this.page.waitForResponse(isPublicationSave, {timeout: T});
        await this.saveButton().click();
        return answered;
    }

    /** "Save", accepted: the request answers OK and "Saved" shows (Rule 5a). */
    async save() {
        const response = await this.pressSave();
        expect(response.status(), 'the relation save answers 200').toBe(200);
        await expect(this.savedStatus()).toBeVisible({timeout: T});
        return response;
    }

    /** The panel's visible lines (a settled read of an open panel). */
    async panelLines() {
        await expect(this.legend()).toBeVisible({timeout: T});
        return lines(this.panel());
    }
}
exports.RelationsControl = RelationsControl;

/** The wizard Review step's "Relation status" panel. */
function reviewRelationPanel(page) {
    return page.locator('.submissionWizard__reviewPanel').filter({has: page.locator('h3#review-relation')});
}
exports.reviewRelationPanel = reviewRelationPanel;

/** The panel's one line. */
function reviewRelationLine(page) {
    return reviewRelationPanel(page).locator('.submissionWizard__reviewPanel__item');
}
exports.reviewRelationLine = reviewRelationLine;

/**
 * The relation notice among the preprint page's notices (`notices` is
 * `ArticleLandingPage.notices()`): the one that says it was published
 * elsewhere.
 *
 * @param {import('@playwright/test').Locator} notices
 */
function relationNotice(notices) {
    return notices.filter({hasText: RELATIONS_TEXT.published});
}
exports.relationNotice = relationNotice;

/**
 * The "Post the preprint" window of the open publication page.
 */
class PostWindow extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {any} frame the open workflow's `WorkflowPage`
     */
    constructor(page, frame) {
        super(page);
        this.frame = frame;
    }

    /** The publication page's "Post" (right control region). */
    postControl() {
        return this.frame.controlsRight().getByRole('button', {name: 'Post', exact: true});
    }

    dialog() {
        return this.page.getByRole('dialog').filter({hasText: RELATIONS_TEXT.relatedPublication}).last();
    }

    /** The "Related Publication" table. */
    table() {
        return this.dialog().locator('table').filter({hasText: RELATIONS_TEXT.relatedPublication});
    }

    /** The table's one line. */
    relationLine() {
        return this.table().locator('tbody tr');
    }

    /** A link in the line. */
    relationLink() {
        return this.relationLine().getByRole('link');
    }

    closeButton() {
        return this.dialog().getByRole('button', {name: 'Close', exact: true});
    }

    /** The window's own "Post". */
    postButton() {
        return this.dialog().getByRole('button', {name: 'Post', exact: true});
    }

    /**
     * Press "Post" and wait for the window's table. A press within the
     * modal store's close window after an earlier window opens nothing
     * (patterns.md pitfall 4), so the press is repeated until it opens.
     */
    async open() {
        await expect(this.postControl()).toBeVisible({timeout: T});
        for (let attempt = 0; ; attempt++) {
            await this.postControl().click();
            try {
                await expect(this.table()).toBeVisible({timeout: attempt < 3 ? 5_000 : T});
                break;
            } catch (error) {
                if (attempt >= 3) throw error;
            }
        }
        await expect(this.relationLine()).toHaveCount(1);
    }

    /** Close the window without posting. */
    async close() {
        await this.closeButton().click();
        await expect(this.page.getByRole('dialog').filter({hasText: RELATIONS_TEXT.relatedPublication})).toHaveCount(0, {timeout: T});
    }

    /** Post from the window; returns the publish response. */
    async post() {
        const posted = this.page.waitForResponse(
            (r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET',
            {timeout: T}
        );
        await this.postButton().click();
        const response = await posted;
        await expect(this.page.getByRole('dialog').filter({hasText: RELATIONS_TEXT.relatedPublication})).toHaveCount(0, {timeout: T});
        return response;
    }
}
exports.PostWindow = PostWindow;

/**
 * Press a publication page's "Preview" and wait for the preprint page it
 * opens in the same tab (`/preprint/view/{id}[/version/{publicationId}]`).
 * A manager is offered two (the header's and the control region's); the
 * header's is pressed.
 *
 * @param {import('@playwright/test').Page} page
 * @param {any} frame the open workflow's `WorkflowPage`
 */
async function pressPreview(page, frame) {
    await frame.headerButton('Preview').click();
    await page.waitForURL((url) => /\/preprint\/view\/\d+/.test(url.pathname), {waitUntil: 'commit', timeout: T});
}
exports.pressPreview = pressPreview;
