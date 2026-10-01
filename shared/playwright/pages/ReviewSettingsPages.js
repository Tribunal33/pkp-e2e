// @ts-check
/**
 * @file shared/playwright/pages/ReviewSettingsPages.js
 *
 * Settings › Workflow › "Review" (spec
 * docs/specs/U29-review-setup-and-review-forms.md): the page with its
 * side tabs, the "Setup" and "Reviewer Guidance" forms, the "Review Forms"
 * list with its row actions and the form window's three tabs, and the
 * "Reviewer Recommendations" table with its window. The screen is the same
 * pkp-lib page on a journal and a press, so it lives here; the strings a
 * press words differently (the library tab, a second guideline box) are
 * passed in by the suite or read through a parameter, never hard-coded
 * from one app (PRINCIPLES M2).
 *
 * DOM facts (screen notes `.reports/U29/screen-notes.md`, confirmed live
 * 2026-09-06 on OJS):
 * - the side tabs write `#reviewSetup`, `#reviewerGuidance`, `#reviewForms`,
 *   `#reviewerRecommendations` into the address and those ids are the tab
 *   panels; a reload lands on "Submission" › "Disable Submissions" whatever
 *   tab was open (register A4), so "reopen" runs the tab chain again;
 * - "Setup" and "Reviewer Guidance" are ui-library forms: a refused box's
 *   reason is `.pkpFieldError` inside its `.pkpFormField__control`, the
 *   footer summary `.pkpFormErrors`, the save status `.pkpFormPage__status`
 *   ("Saving" then "Saved", gone after about five seconds), the page notice
 *   `.pkpNotification`; the reminder sliders are PrimeVue sliders whose
 *   handle is `role=slider` named by its label, driven by keyboard, with
 *   the read-back box (`aria-valuetext` and the div beside the track);
 * - the guidance boxes are TinyMCE iframes `iframe[id^="reviewerGuidance-
 *   <setting>-control"]`; the anonymizing sentence's link words are a
 *   `button` inside the option label and its window has "Close" only;
 * - "Review Forms" is a legacy jQuery grid: a row's controls sit in the
 *   following `tr.row_controls` after one `a.show_extras` click; "Active"
 *   is a checkbox whose click opens a page modal "Confirm" (OK / Cancel),
 *   as do "Copy" and "Delete"; the windows are legacy modals: the form
 *   window carries `#editReviewFormTabs` (jQuery UI tabs, greyed ones
 *   `aria-disabled="true"`), the form's fields `form#reviewFormForm`, the
 *   item window `form#reviewFormElementForm` with a "Response Options"
 *   listbuilder that adds a row on mousedown of `.pkp_linkaction_addItem`
 *   (`input[name^="newRowId[possibleResponse]"]`), the preview
 *   `form#previewReviewForm`;
 * - "Reviewer Recommendations" is the Vue table
 *   `[data-cy="reviewer-recommendation-manager"]` (title in the row's `th`,
 *   tick `input[type=checkbox]`, menu button "More Actions" with menu items
 *   "Edit" / "Delete"); its side modal has `input[name^="title-"]`,
 *   `select[name="type"]`, `select[name="status"]` and "Save"; the tick and
 *   "Delete" open Vue dialogs with "Yes" / "No".
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {waitForJQueryIdle} = require('../support/legacy.js');

/** The side tabs, by on-screen name, and the panel id each writes. */
const SIDE_TABS = {
    Setup: 'reviewSetup',
    'Reviewer Guidance': 'reviewerGuidance',
    'Review Forms': 'reviewForms',
    'Reviewer Recommendations': 'reviewerRecommendations',
};
exports.REVIEW_SIDE_TABS = SIDE_TABS;

const SAVED_NOTICE = 'Your changes have been saved.';
exports.SAVED_NOTICE = SAVED_NOTICE;

/** The refusal under an empty required box (a Vue field or a legacy form's box). */
const REQUIRED_ERROR = 'This field is required.';
exports.REQUIRED_ERROR = REQUIRED_ERROR;

/** The item window's refusal of an empty "Item" once a type is chosen (a page notice). */
const ITEM_QUESTION_REQUIRED = 'A question is required for the form item. (English)';
exports.ITEM_QUESTION_REQUIRED = ITEM_QUESTION_REQUIRED;

/** The "Form Items" row's "Delete" question (the window shows it before removing). */
const ITEM_DELETE_CONFIRM = 'Confirm delete of a published form item...';
exports.ITEM_DELETE_CONFIRM = ITEM_DELETE_CONFIRM;

/** Select-all on the platform's key (TinyMCE ignores the other modifier). */
const SELECT_ALL = process.platform === 'darwin' ? 'Meta+A' : 'Control+A';

/** Replace a TinyMCE box's content by typing through the editor. */
async function typeRichText(page, body, text) {
    await body.click();
    await page.keyboard.press(SELECT_ALL);
    await page.keyboard.press('Delete');
    await body.pressSequentially(text);
}
exports.typeRichText = typeRichText;

/**
 * Settings › Workflow › "Review": the page, its top tab and the side tabs.
 */
exports.ReviewSettingsPage = class ReviewSettingsPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.heading = page.getByRole('heading', {name: 'Workflow Settings'});
        this.topTabs = page.locator('main').getByRole('tablist').first().getByRole('tab');
        this.reviewTab = page.getByRole('tab', {name: 'Review', exact: true});
        this.reviewPanel = page.getByRole('tabpanel', {name: 'Review', exact: true});
        this.setup = new SetupForm(page);
        this.guidance = new ReviewerGuidanceForm(page);
        this.forms = new ReviewFormsList(page);
        this.recommendations = new ReviewerRecommendationsTable(page);
    }

    /** The Workflow Settings address, optionally with a tab hash. */
    url(hash = '') {
        return this.contextUrl(this.contextPath, `/management/settings/workflow${hash}`);
    }

    /** Open Workflow Settings by address and, when named, "Review" › a side tab. */
    async goto(sideTab = null) {
        await this.page.goto(this.url());
        await expect(this.heading).toBeVisible({timeout: 30_000});
        if (sideTab) {
            await this.openReviewTab();
            await this.openSideTab(sideTab);
        }
    }

    /** Reload the page and run the tab chain again (the reload forgets the tab). */
    async reloadAndOpen(sideTab) {
        await this.page.reload();
        await expect(this.heading).toBeVisible({timeout: 30_000});
        await this.openReviewTab();
        await this.openSideTab(sideTab);
    }

    async openReviewTab() {
        await this.reviewTab.click();
        await expect(this.reviewTab).toHaveAttribute('aria-selected', 'true', {timeout: 30_000});
    }

    /** A side tab of "Review" by its on-screen name. */
    sideTab(name) {
        return this.reviewPanel.getByRole('tab', {name, exact: true});
    }

    /** Every side tab's name, in order. */
    async sideTabNames() {
        const names = await this.reviewPanel.getByRole('tablist').first().getByRole('tab').allInnerTexts();
        return names.map((s) => s.trim());
    }

    /** A side tab's panel (`#reviewSetup` and friends). */
    sidePanel(name) {
        return this.page.locator(`#${SIDE_TABS[name]}`);
    }

    /** Press a side tab and wait for its panel. */
    async openSideTab(name) {
        await this.sideTab(name).click();
        await expect(this.sidePanel(name)).toBeVisible({timeout: 30_000});
        await this.page.waitForURL((url) => url.hash.includes(SIDE_TABS[name]), {waitUntil: 'commit'});
    }

    /** A page notice (top of the page) carrying the text. */
    notice(text) {
        return this.page.locator('.pkpNotification').filter({hasText: text});
    }
};

/**
 * A ui-library settings form's shared mechanics: fields by label, the
 * footer status, the refusal markup, "Save".
 */
class VueSettingsForm extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} panelId
     */
    constructor(page, panelId) {
        super(page);
        this.form = page.locator(`#${panelId}`);
        this.saveButton = this.form.getByRole('button', {name: 'Save', exact: true});
        this.status = this.form.locator('.pkpFormPage__status');
        this.savedStatus = this.form.locator('.pkpFormPage__status', {hasText: 'Saved'});
        this.errorSummary = this.form.locator('.pkpFormErrors');
        this.jumpToErrorButton = this.form.getByRole('button', {name: 'Jump to next error'});
    }

    /** A text box by its label. */
    field(label) {
        return this.form.getByLabel(label, {exact: true});
    }

    /** The red reason under a labelled box (empty locator while none). */
    fieldError(label) {
        return this.field(label)
            .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " pkpFormField__control ")][1]')
            .locator('.pkpFieldError');
    }

    /** The field headings, in screen order. */
    async headings() {
        const texts = await this.form.locator('.pkpFormField__heading').allInnerTexts();
        return texts.map((s) => s.replace(/\s+/g, ' ').trim());
    }

    /** Press "Save" and wait for the footer's "Saved". */
    async save() {
        await this.saveButton.click();
        await expect(this.savedStatus).toBeVisible({timeout: 30_000});
    }
}

/**
 * The "Setup" side tab's form.
 */
class SetupForm extends VueSettingsForm {
    constructor(page) {
        super(page, SIDE_TABS.Setup);
    }

    /** A "Default Review Mode" radio by its label. */
    modeRadio(label) {
        return this.form.getByRole('radio', {name: label, exact: true});
    }

    /** A box by the sentence beside it (the public-visibility, access and suggestion boxes). */
    checkbox(label) {
        return this.form.getByRole('checkbox', {name: label});
    }

    /** The "Publicly Show Reviewer Comments" box, by its sentence. */
    get publicCommentsBox() {
        return this.checkbox('Make reviewer comments publicly visible with published content');
    }

    /** A reminder slider's handle by its label. */
    slider(label) {
        return this.form.getByRole('slider', {name: label});
    }

    /** The read-back box beside a slider ("No reminder set", "3 days before due date"). */
    sliderReadout(label) {
        return this.slider(label).locator('xpath=ancestor::div[contains(@class,"flex")][1]/div[last()]');
    }

    /** Set a slider by keyboard: focus, Home, then one ArrowRight per day. */
    async setSliderByKeyboard(label, days) {
        const handle = this.slider(label);
        await handle.focus();
        await this.page.keyboard.press('Home');
        for (let i = 0; i < days; i++) {
            await this.page.keyboard.press('ArrowRight');
        }
        await expect(handle).toHaveAttribute('aria-valuenow', String(days));
    }
}
exports.SetupForm = SetupForm;

/**
 * The "Reviewer Guidance" side tab's form.
 */
class ReviewerGuidanceForm extends VueSettingsForm {
    constructor(page) {
        super(page, SIDE_TABS['Reviewer Guidance']);
        this.anonymizeBox = this.form.locator('input[name="showEnsuringLink"]');
        this.anonymizeWords = this.form.locator('label button').filter({hasText: 'how to ensure all files are anonymized'});
    }

    /**
     * A rich-text box's editable body by its setting name
     * (`reviewGuidelines`, `competingInterests`, a press's
     * `internalReviewGuidelines`).
     */
    richBody(setting) {
        // The first editor is the primary language's: a bilingual journal shows one per language.
        return this.page.frameLocator(`iframe[id^="reviewerGuidance-${setting}-control"]`).first().locator('body');
    }

    /** Replace a rich-text box's content. */
    async typeInto(setting, text) {
        await typeRichText(this.page, this.richBody(setting), text);
    }

    /** The instructions window the link words open. */
    instructionsWindow() {
        return this.page.getByRole('dialog').filter({hasText: 'How to ensure all files are anonymized'}).last();
    }
}
exports.ReviewerGuidanceForm = ReviewerGuidanceForm;

/**
 * The "Review Forms" side tab: the list, its row actions and the windows.
 */
class ReviewFormsList extends BasePage {
    constructor(page) {
        super(page);
        this.panel = page.locator(`#${SIDE_TABS['Review Forms']}`);
        this.grid = this.panel.locator('.pkp_controllers_grid').first();
        this.createLink = this.panel.getByRole('link', {name: 'Create Review Form', exact: true});
        this.orderLink = this.grid.locator('.pkp_linkaction_orderItems');
        this.noItems = this.grid.getByText('No Items');
        // The form's fields (the "Create Review Form" window and the "Review Form" tab).
        this.formFields = page.locator('form#reviewFormForm');
        this.titleInput = this.formFields.locator('input[name^="title["]').first();
        this.formSaveButton = this.formFields.getByRole('button', {name: 'Save', exact: true});
        // The item window.
        this.itemForm = page.locator('form#reviewFormElementForm');
        this.itemQuestionBody = page.frameLocator('form#reviewFormElementForm iframe[id^="question"]').first().locator('body');
        this.itemRequiredBox = this.itemForm.locator('input[name="required"]');
        this.itemIncludedBox = this.itemForm.locator('input[name="included"]');
        this.itemTypeSelect = this.itemForm.locator('select[name="elementType"]');
        this.itemAddOptionLink = this.itemForm.locator('.pkp_linkaction_addItem').first();
        this.itemSaveButton = this.itemForm.getByRole('button', {name: 'Save', exact: true});
        // The preview.
        this.previewForm = page.locator('form#previewReviewForm');
    }

    /** The list's rows. */
    rows() {
        return this.grid.locator('tbody tr.gridRow');
    }

    /** Rows carrying a title (two after a copy). */
    row(title) {
        return this.rows().filter({hasText: title});
    }

    /**
     * A row's "In Review" and "Completed" counts.
     *
     * The grid redraws a row after every save, so this can be called while
     * the row is on screen but its cells are not in yet: a bare read of all
     * the cells then comes back short and the count is undefined. Wait on
     * the last cell the counts need, then read each one through its own
     * locator.
     */
    async rowCounts(row) {
        const cells = row.locator('td');
        await expect(cells.nth(2)).toBeVisible({timeout: 30_000});
        const inReview = await cells.nth(1).innerText();
        const completed = await cells.nth(2).innerText();
        return {inReview: Number(inReview.trim()), completed: Number(completed.trim())};
    }

    /** A row's "Active" tick. */
    activeBox(row) {
        return row.locator('input[type="checkbox"]');
    }

    /** Reveal a row's controls (behind "Settings") and return their row. */
    async rowControls(row) {
        const controls = row.locator('xpath=following-sibling::tr[contains(@class,"row_controls")][1]');
        // The expander's class flips show_extras → hide_extras once the grid's
        // handlers have bound; under load a click can land before that, so a
        // click that leaves the controls hidden is repeated (patterns.md 10).
        for (let attempt = 0; attempt < 3; attempt++) {
            const toggle = row.locator('a.show_extras');
            if (await toggle.count()) {
                await toggle.click();
            }
            try {
                await expect(controls).toBeVisible({timeout: 10_000});
                return controls;
            } catch (e) {
                if (attempt === 2) throw e;
            }
        }
        return controls;
    }

    /** A control link ("Edit", "Copy", "Preview", "Delete") in a controls row. */
    control(controls, name) {
        return controls.getByRole('link', {name, exact: true});
    }

    /** The "Confirm" window the tick, "Copy" and "Delete" open, by its question. */
    confirmWindow(question) {
        return this.page.getByRole('dialog').filter({hasText: question});
    }

    /** Answer an open "Confirm" window and wait for it to go. */
    async answerConfirm(question, button = 'OK') {
        const dialog = this.confirmWindow(question);
        await expect(dialog).toBeVisible({timeout: 30_000});
        await dialog.getByRole('button', {name: button, exact: true}).click();
        await expect(dialog).toBeHidden({timeout: 30_000});
        await waitForJQueryIdle(this.page);
    }

    /** The page notice a review-form action shows. */
    savedNotice() {
        return this.page.getByText(SAVED_NOTICE).first();
    }

    /** The form window (headed "Create Review Form", "Edit" or "Preview"). */
    formWindow() {
        return this.page.getByRole('dialog').filter({has: this.page.locator('#editReviewFormTabs, form#reviewFormForm')}).last();
    }

    /** The window's heading. */
    windowHeading() {
        return this.formWindow().getByRole('heading').first();
    }

    /** One of the window's three tabs. */
    windowTab(name) {
        return this.formWindow().locator('#editReviewFormTabs').getByRole('tab', {name, exact: true});
    }

    /** Press a window tab and wait for it to be the selected one. */
    async openWindowTab(name) {
        await this.windowTab(name).click();
        await expect(this.windowTab(name)).toHaveAttribute('aria-selected', 'true', {timeout: 30_000});
        await waitForJQueryIdle(this.page);
    }

    /** Close the form window through its "Close" control. */
    async closeWindow() {
        const window = this.formWindow();
        await window.getByRole('button', {name: /^Close/}).first().click();
        await expect(window).toBeHidden({timeout: 30_000});
    }

    /** "Create Review Form": open the window and wait for its "Title" box. */
    async openCreateForm() {
        await this.createLink.click();
        await expect(this.titleInput).toBeVisible({timeout: 30_000});
    }

    /** Press the form window's "Save" without waiting for an outcome (a refused save keeps the window). */
    async pressFormSave() {
        await this.formSaveButton.click();
    }

    /** The form window's "This field is required." reasons (under "Title" when refused empty). */
    formFieldErrors() {
        return this.formFields.getByText(REQUIRED_ERROR);
    }

    /** Type the title into the open form window and save; the window closes and the row appears. */
    async saveOpenForm(title) {
        await this.titleInput.fill(title);
        const saved = this.page.waitForResponse((r) => r.url().includes('/update-review-form') && r.request().method() === 'POST');
        await this.formSaveButton.click();
        await saved;
        await expect(this.formFields).toBeHidden({timeout: 30_000});
        await waitForJQueryIdle(this.page);
        await expect(this.row(title).first()).toBeVisible({timeout: 30_000});
    }

    /** "Create Review Form": open the window, type the title, save; the row appears. */
    async createForm(title) {
        await this.openCreateForm();
        await this.saveOpenForm(title);
    }

    /** The "Form Items" grid inside the window. */
    itemsGrid() {
        return this.formWindow().locator('.ui-tabs-panel:visible .pkp_controllers_grid').first();
    }

    itemRows() {
        return this.itemsGrid().locator('tbody tr.gridRow');
    }

    /** An item row by a plain substring of its question. */
    itemRow(text) {
        return this.itemRows().filter({hasText: text});
    }

    createItemLink() {
        return this.formWindow().getByRole('link', {name: 'Create New Item', exact: true});
    }

    /**
     * "Create New Item": open the item window. The grid redraws after a
     * save and can swallow a click on the just-replaced link, so the click
     * is retried until the window is open (never a timer).
     */
    async openCreateItem() {
        await expect(async () => {
            if (!(await this.itemForm.count())) {
                await this.createItemLink().click({timeout: 5_000});
            }
            await expect(this.itemForm).toBeVisible({timeout: 5_000});
        }).toPass({intervals: [500, 1_000, 2_000], timeout: 30_000});
    }

    /**
     * "Add Item" under "Response Options": a new editable row at the bottom,
     * filled with the text and fixed with Enter (a row still open when
     * "Save" is pressed races the save and left the window open once).
     */
    async addResponseOption(text) {
        const inputs = this.itemForm.locator('input[name^="newRowId[possibleResponse]"]');
        const before = await inputs.count();
        await this.itemAddOptionLink.dispatchEvent('mousedown');
        await expect(inputs).toHaveCount(before + 1, {timeout: 30_000});
        const input = inputs.last();
        await input.fill(text);
        await input.press('Enter');
        await waitForJQueryIdle(this.page);
        await expect(this.responseOptionRow(text)).toBeVisible({timeout: 30_000});
    }

    /** A fixed "Response Options" row by its text (the empty "No Items" row is not a gridRow). */
    responseOptionRow(text) {
        return this.itemForm.locator('#elementOptionsListbuilderContainer tbody tr.gridRow').filter({hasText: text});
    }

    /** The item window (headed "Create New Item" or "Edit"), as a dialog. */
    itemWindow() {
        return this.page.getByRole('dialog').filter({has: this.itemForm}).last();
    }

    /** The item window's heading. */
    itemWindowHeading() {
        return this.itemWindow().getByRole('heading').first();
    }

    /** Wait for the item window's question editor to be ready for typing. */
    async awaitItemWindowReady() {
        await expect(this.itemQuestionBody).toBeVisible({timeout: 30_000});
        // Type only once the editor is initialized: text typed before that
        // is wiped when the initialization loads the (empty) box.
        await this.page.waitForFunction(() => {
            const textarea = document.querySelector('form#reviewFormElementForm textarea[id^="question"]');
            const mce = window.tinyMCE || window.tinymce;
            return !!(textarea && mce?.get(textarea.id)?.initialized);
        }, undefined, {timeout: 30_000});
    }

    /**
     * Fill the open item window without saving: the question (when given),
     * the two boxes, the type and any response options.
     */
    async fillItem({question = null, required = false, included = true, type, options = []}) {
        await this.awaitItemWindowReady();
        if (question !== null) {
            await typeRichText(this.page, this.itemQuestionBody, question);
        }
        if (required) {
            await this.itemRequiredBox.check();
        }
        if (!included) {
            await this.itemIncludedBox.uncheck();
        }
        if (type) {
            await this.itemTypeSelect.selectOption({label: type});
        }
        for (const option of options) {
            await this.addResponseOption(option);
        }
    }

    /** Press the item window's "Save" without waiting for an outcome (a refused save keeps the window). */
    async pressItemSave() {
        await this.awaitItemWindowReady();
        await this.itemSaveButton.click();
    }

    /** The item window's "This field is required." reasons under its boxes (the type's, when refused unchosen). */
    itemFieldErrors() {
        return this.itemForm.getByText(REQUIRED_ERROR);
    }

    /** The page notice refusing an empty "Item" once a type is chosen. */
    itemQuestionNotice() {
        return this.page.getByText(ITEM_QUESTION_REQUIRED).first();
    }

    /**
     * Fill and save the open item window: the question, the two boxes, the
     * type and any response options; waits for the window to close and the
     * item's row to list.
     */
    async saveItem({question, required = false, included = true, type, options = []}) {
        await this.fillItem({question, required, included, type, options});
        const saved = this.page.waitForResponse((r) => r.url().includes('/update-review-form-element') && r.request().method() === 'POST');
        await this.itemSaveButton.click();
        const response = await saved;
        const result = await response.json().catch(() => null);
        if (result && result.status === false) {
            const text = String(result.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            throw new Error(`The item window refused the save: ${text.slice(0, 400)}`);
        }
        await expect(this.itemForm).toBeHidden({timeout: 30_000});
        await waitForJQueryIdle(this.page);
        await expect(this.itemRow(question)).toBeVisible({timeout: 30_000});
    }

    /**
     * A "Form Items" row's "Delete": press it, read the question and confirm
     * with "OK"; the row is gone once the grid redraws.
     */
    async deleteItem(row) {
        const controls = await this.rowControls(row);
        await this.control(controls, 'Delete').click();
        await this.answerConfirm(ITEM_DELETE_CONFIRM, 'OK');
        await expect(row).toHaveCount(0, {timeout: 30_000});
    }

    /** The preview's answer control for a question: the radio/checkbox by label, or the box. */
    previewRadio(label) {
        return this.previewForm.getByRole('radio', {name: label, exact: true});
    }
}
exports.ReviewFormsList = ReviewFormsList;

/**
 * The "Reviewer Recommendations" side tab (a journal only): the table and
 * its window.
 */
class ReviewerRecommendationsTable extends BasePage {
    constructor(page) {
        super(page);
        this.root = page.locator('[data-cy="reviewer-recommendation-manager"]');
        this.addButton = this.root.getByRole('button', {name: 'Add Recommendation'});
        this.window = page.getByRole('dialog').filter({has: page.locator('input[name^="title-"]')}).last();
        this.titleInput = this.window.locator('input[name^="title-"]').first();
        this.typeSelect = this.window.locator('select[name="type"]');
        this.statusSelect = this.window.locator('select[name="status"]');
        this.saveButton = this.window.getByRole('button', {name: 'Save', exact: true});
        // The refused save's foot: "Please correct 2 errors." and "Jump to next error".
        this.errorSummary = this.window.locator('.pkpFormErrors');
        this.jumpToErrorButton = this.window.getByRole('button', {name: 'Jump to next error'});
    }

    /** The red reason under one of the window's boxes (`title` or `type`; empty while none). */
    fieldError(field) {
        const control = field === 'type' ? this.typeSelect : this.titleInput;
        return control
            .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " pkpFormField__control ")][1]')
            .locator('.pkpFieldError');
    }

    /** "Add Recommendation": open the window and wait for its boxes. */
    async openAdd() {
        await this.addButton.click();
        await expect(this.titleInput).toBeVisible({timeout: 30_000});
    }

    /** Fill the open window and save; it closes and the row appears. */
    async saveOpenWindow({title, type, status = null}) {
        await this.titleInput.fill(title);
        await this.typeSelect.selectOption({label: type});
        if (status) {
            await this.statusSelect.selectOption({label: status});
        }
        await expect(this.saveButton).toBeEnabled({timeout: 30_000});
        await this.saveButton.click();
        await expect(this.titleInput).toBeHidden({timeout: 30_000});
        await expect(this.row(title)).toBeVisible({timeout: 30_000});
    }

    rows() {
        return this.root.locator('tbody tr');
    }

    /** A row by its exact title. */
    row(title) {
        return this.rows().filter({has: this.page.locator('th').getByText(title, {exact: true})});
    }

    /** The titles in the table's order. */
    async titles() {
        await expect(this.rows().first()).toBeVisible({timeout: 30_000});
        const texts = await this.rows().locator('th').allInnerTexts();
        return texts.map((s) => s.trim());
    }

    /** A row's "Activate" tick. */
    tick(row) {
        return row.locator('input[type="checkbox"]');
    }

    /** A row's "More Actions" button (absent on an entry in use). */
    menuButton(row) {
        return row.getByRole('button', {name: 'More Actions'});
    }

    /** Open a row's menu and return the page-wide menu items. */
    async openMenu(row) {
        await this.menuButton(row).click();
        const items = this.page.getByRole('menuitem');
        await expect(items.first()).toBeVisible({timeout: 30_000});
        return items;
    }

    /** A Vue confirm dialog by its text ("Are you sure you want to deactivate …"). */
    confirmDialog(text) {
        return this.page.getByRole('dialog').filter({hasText: text}).last();
    }

    /** Answer an open confirm dialog ("Yes" / "No") and wait for it to go. */
    async answerConfirm(text, button = 'Yes') {
        const dialog = this.confirmDialog(text);
        await expect(dialog).toBeVisible({timeout: 30_000});
        await dialog.getByRole('button', {name: button, exact: true}).click();
        await expect(dialog).toBeHidden({timeout: 30_000});
    }

    /** "Add Recommendation": fill the window and save; the row appears. */
    async add({title, type, status = null}) {
        await this.openAdd();
        await this.saveOpenWindow({title, type, status});
    }
}
exports.ReviewerRecommendationsTable = ReviewerRecommendationsTable;
