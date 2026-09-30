/**
 * @file shared/playwright/pages/AppearancePages.js
 *
 * Page objects for U10 "Appearance & theming"
 * (docs/specs/U10-appearance-and-theming.md), shared by the OJS, OMP and
 * OPS suites. App-neutral: every on-screen word that differs per app ("Journal
 * thumbnail" / "Press thumbnail", the role names, "About the Journal") and
 * each app's field names (`journalThumbnail`, `pressThumbnail`,
 * `serverThumbnail`) are passed in by the suite; the locators here are the
 * markup the three apps share (lib/pkp templates, the ui-library forms, the
 * default theme).
 *
 * Surfaces:
 * - WebsiteSettings — Settings › Website: the top tabs ("Appearance",
 *   "Setup", "Plugins"), the side tabs, and one form object per tab this
 *   feature owns (`theme`, `setup`, `masthead`, `advanced`, `lists`,
 *   `dateTime`).
 * - AppearanceForm — the shared base of those forms (U07's SettingsForm:
 *   "Save", "Saved", the red reasons, the rich-text boxes) plus the form's
 *   language buttons ("French").
 * - ThemeForm — "Appearance" › "Theme" (and the Settings Wizard's
 *   "Appearance", which holds the same fields): the theme list, the field
 *   labels in order, "Typography", "Colour", the boxes and choices.
 * - UploadBox — one upload box ("Logo", the thumbnail, "Homepage Image",
 *   the style sheet, "Favicon"): "Upload File" (the browser's file chooser),
 *   a dropped file, the preview, "Alternate text" and its guidance,
 *   "Remove", "Restore Original", the stored file's link, the refusal.
 * - AppearanceSetupForm — "Appearance" › "Setup": the three picture boxes,
 *   "Page Footer", the "Sidebar" list.
 * - OrderableList — an orderable options list ("Sidebar", "Editorial
 *   Masthead"): its rows, boxes, up and down arrows, drag handles.
 * - MastheadForm — "Appearance" › "Editorial Masthead".
 * - AdvancedForm — "Appearance" › "Advanced": the style sheet, "Favicon",
 *   "Additional Content".
 * - ListsForm, DateTimeForm — "Setup" › "Lists" and "Date & Time".
 * - SettingsWizard — Administration › Hosted Journals, a row's arrow and
 *   "Settings wizard", the wizard's tabs and its "Appearance" form.
 * - PublicLook — a public page of the context (U08's PublicChrome,
 *   extended): the home page's parts, the header's look, the logo, the
 *   footer text, the sidebar's blocks, the favicon and style sheets, the
 *   site's list of contexts with their thumbnails, and a preprint server's
 *   search box and "Latest preprints" (getters added by the OPS suite).
 * - EditorialLook — an editorial screen's header colour, font, favicon and
 *   headings (the controls of Rules 4, 26, 27).
 * - disablePlugin() — Settings › Website › "Plugins": untick a plugin and
 *   confirm (U09's PluginsTab covers the rest of that tab).
 *
 * DOM shapes from the U10 claim check (.reports/U10/screen-notes.md, the
 * kept scripts under shared/playwright/checks/U10/) and the OJS and OMP
 * suites' runs, 2026-09-24 (UploadBox.dropRefused / chooseByKeyboard,
 * AppearanceForm.saveRefused and PublicLook.openFromMenu came from the OMP
 * suite).
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {SettingsForm} = require('./ContextIdentityPages.js');
const {PublicChrome, whole} = require('./NavigationChromePages.js');
const {waitForJQueryIdle} = require('../support/legacy.js');

const T = 30_000;

/** The refusal an upload box shows for a file of a type it does not take. */
const WRONG_TYPE = "You can't upload files of this type.";

/** Text with runs of white space collapsed. */
function flat(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
}

/** A context-relative address: '/index.php/<path>[/<locale>]<pathname>'. */
function contextAddress(contextPath, locale, pathname = '') {
    return `/index.php/${contextPath}${locale ? `/${locale}` : ''}${pathname}`;
}

/** Pages whose file chooser is already intercepted for good. */
const ARMED = new WeakSet();

/**
 * Keep the page's file chooser intercepted from now on, with a listener that
 * never goes away. The interception a `waitForEvent('filechooser')` switches
 * on is sent without being awaited (and switched off again after the event),
 * so an Enter pressed right after it can open the chooser before it is
 * caught and no event arrives (the OPS suite's S3, 5 of 8 runs under load).
 * Called by every UploadBox, so the listener is in place long before any
 * upload; once per page.
 *
 * @param {import('@playwright/test').Page} page
 */
function armFileChooser(page) {
    if (ARMED.has(page)) return;
    ARMED.add(page);
    page.on('filechooser', () => {});
}

/** An XPath step to the nearest ancestor carrying the class token `pkpFormField`. */
const FIELD_ANCESTOR = 'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " pkpFormField ")][1]';

// ---------------------------------------------------------------------------
// The forms
// ---------------------------------------------------------------------------

class AppearanceForm extends SettingsForm {
    /** The form's language button ("French", "English") at the top of the form. */
    languageButton(label) {
        return this.form.locator('.pkpFormLocales button').filter({hasText: whole(label)});
    }

    /** Press a language button, so that language's boxes show. */
    async showLanguage(label) {
        await this.languageButton(label).click();
    }

    /**
     * The labels of the form's fields, top to bottom, as a sighted user
     * reads them (the legend of a group, the label of a box; the
     * screen-reader-only words and the "Required" mark left out).
     */
    async fieldLabels() {
        await expect(this.form).toBeVisible({timeout: T});
        return this.form.evaluate((form) =>
            [...form.querySelectorAll('.pkpFormField')]
                .filter((f) => !f.parentElement.closest('.pkpFormField') && f.offsetParent !== null)
                .map((f) => {
                    const head = f.querySelector('legend, .pkpFormFieldLabel, label');
                    if (!head) return '';
                    const clone = head.cloneNode(true);
                    clone.querySelectorAll('.-screenReader, .pkpFormFieldLabel__required').forEach((n) => n.remove());
                    return clone.textContent.replace(/\s+/g, ' ').trim();
                })
        );
    }

    /**
     * Press "Save" for a refusal: waits for the red reason under a control
     * (its id or id prefix, 'lists-itemsPerPage-control') to read `message`,
     * and returns how many settings requests left the page (a refusal the
     * browser makes sends none; the server's come back as 400).
     */
    async saveRefused(errorId, message) {
        const sent = [];
        const onRequest = (r) => {
            if (/\/api\/v1\/contexts\/\d+/.test(r.url()) && r.method() !== 'GET') sent.push(r.url());
        };
        this.page.on('request', onRequest);
        try {
            const answered = this.page
                .waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 3_000})
                .catch(() => null);
            await this.saveButton.click();
            await expect(this.fieldError(errorId)).toHaveText(message instanceof RegExp ? message : whole(message), {timeout: T});
            await answered;
            await expect(this.savedStatus).toHaveCount(0);
        } finally {
            this.page.off('request', onRequest);
        }
        return sent.length;
    }
}

class ThemeForm extends AppearanceForm {
    /**
     * @param {import('@playwright/test').Page} page
     *   (Settings › Website's "Theme" and the Settings Wizard's "Appearance"
     *   each hold the page's one theme form)
     */
    constructor(page) {
        super(page, 'input[name="typography"]');
        this.themeSelect = this.form.locator('select[name="themePluginPath"]');
        this.colourField = this.form.locator('.pkpFormField--color');
        // The picker's first text box is the colour's code (screen notes ccK1).
        this.colourBox = this.colourField.locator('input').first();
    }

    /** The entries of the "Theme" list, as read. */
    async themeChoices() {
        return (await this.themeSelect.locator('option').allInnerTexts()).map(flat);
    }

    /** A choice ("Typography", "Usage statistics display options") by its label. */
    choice(label) {
        return this.form.getByRole('radio', {name: label, exact: true});
    }

    /** A box by its label ("Show the journal summary on the homepage."). */
    box(label) {
        return this.form.getByRole('checkbox', {name: label, exact: true});
    }

    /** The labels of the chosen options of a field by its input name ('typography', 'journalContentOrganization'). */
    async chosen(name) {
        return this.form.locator(`input[name="${name}"]`).evaluateAll((inputs) =>
            inputs.filter((i) => i.checked).map((i) => (i.closest('label') || i.parentElement).innerText.replace(/\s+/g, ' ').trim())
        );
    }

    /** Type a colour's code in the colour box and leave it (Enter, then away). */
    async typeColour(code) {
        await this.colourBox.click();
        await this.colourBox.fill(code);
        await this.colourBox.press('Enter');
        await this.colourBox.blur();
    }
}

class UploadBox extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} formId the form's id ('appearanceSetup', 'appearanceAdvanced')
     * @param {string} field the field's name ('pageHeaderLogoImage', 'journalThumbnail', 'styleSheet', …)
     * @param {{locale?: string}} [options] the box's language ('en', 'fr_CA'); none for a one-language box (the style sheet)
     */
    constructor(page, formId, field, {locale = ''} = {}) {
        super(page);
        armFileChooser(page);
        const suffix = locale ? `-${locale}` : '';
        this.control = page.locator(`[id="${formId}-${field}-control${suffix}"]`);
        this.field = this.control.locator(FIELD_ANCESTOR);
        this.uploadButton = page.locator(`[id="${formId}-${field}-clickable${suffix}"]`);
        this.dropzone = page.locator(`[id="${formId}-${field}-dropzone${suffix}"]`);
        this.preview = this.control.locator('.pkpFormField--upload__preview');
        this.thumbnail = this.control.locator('img.pkpFormField--uploadImage__thumbnail');
        this.altText = this.control.locator('input.pkpFormField--uploadImage__altTextInput');
        this.altTextLabel = this.control.locator('.pkpFormField--upload__details label');
        this.altTextGuidance = this.control.locator('.pkpFormField--uploadImage__altTextDescription');
        this.fileName = this.control.locator('.pkpFormField--upload__fileName');
        this.fileLink = this.fileName.locator('a');
        this.removeButton = this.preview.getByRole('button', {name: 'Remove', exact: true});
        // Two "Restore Original" buttons: one beside the preview, one under
        // the emptied box; the one a sighted user sees is outside the box's
        // screen-reader-only part.
        this.restoreButton = this.control.locator('button:not(.-screenReader button)').filter({hasText: /^\s*Restore Original\s*$/});
        this.refusal = this.field.getByText(WRONG_TYPE, {exact: true});
    }

    /**
     * Press "Upload File" and choose a file in the browser's file chooser;
     * waits for the upload's answer and returns its status.
     *
     * @param {{name: string, mimeType: string, buffer: Buffer}} file
     */
    async choose(file) {
        const answered = this.page.waitForResponse((r) => /\/temporaryFiles/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
        const chooser = this.page.waitForEvent('filechooser', {timeout: T});
        await this.uploadButton.click();
        await (await chooser).setFiles(file);
        const r = await answered;
        return r.status();
    }

    /**
     * Drop a file on the box's "Drop files here to upload" area: the drop
     * events a browser fires for a file dragged from the desktop (screen
     * notes ccK3: a synthetic drop behaves like a real one).
     *
     * @param {{name: string, mimeType: string, buffer: Buffer}} file
     */
    async drop(file) {
        await expect(this.dropzone).toBeAttached({timeout: T});
        await this.dropzone.evaluate(
            (el, f) => {
                const bytes = Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0));
                const dt = new DataTransfer();
                dt.items.add(new File([bytes], f.name, {type: f.mimeType}));
                for (const type of ['dragenter', 'dragover', 'drop']) {
                    el.dispatchEvent(new DragEvent(type, {bubbles: true, cancelable: true, dataTransfer: dt}));
                }
            },
            {b64: file.buffer.toString('base64'), name: file.name, mimeType: file.mimeType}
        );
    }

    /**
     * Drop a file the box does not take: waits for the box's refusal and
     * returns how many uploads left the page meanwhile (the "nothing is
     * sent" read).
     *
     * @param {{name: string, mimeType: string, buffer: Buffer}} file
     */
    async dropRefused(file) {
        const sent = [];
        const onRequest = (r) => {
            if (/\/temporaryFiles/.test(r.url())) sent.push(r.url());
        };
        this.page.on('request', onRequest);
        try {
            await this.drop(file);
            await expect(this.refusal).toBeVisible({timeout: T});
        } finally {
            this.page.off('request', onRequest);
        }
        return sent.length;
    }

    /**
     * Choose a file with the keyboard: a box holding a picture keeps its
     * "Upload File" in its screen-reader-only part, where the preview covers
     * it from the mouse but the keyboard reaches it; Enter opens the
     * browser's file chooser. Waits for the upload's answer and returns its
     * status.
     *
     * With `{tab: true}` the focus reaches "Upload File" by Tab presses
     * (`tabToUpload`) instead of being put there.
     *
     * @param {{name: string, mimeType: string, buffer: Buffer}} file
     * @param {{tab?: boolean}} [options]
     */
    async chooseByKeyboard(file, {tab = false} = {}) {
        if (tab) await this.tabToUpload();
        else await this.uploadButton.focus();
        // A round trip to the page, so the interception armed with this box
        // has reached the browser before Enter.
        await this.page.evaluate(() => 0);
        const answered = this.page.waitForResponse((r) => /\/temporaryFiles/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
        const chooser = this.page.waitForEvent('filechooser', {timeout: T});
        await this.page.keyboard.press('Enter');
        await (await chooser).setFiles(file);
        return (await answered).status();
    }

    /**
     * Press Tab from the box's "Alternate text" (clicked first) until the
     * focus reaches the box's "Upload File"; throws after `max` presses.
     * Returns the number of presses.
     *
     * @param {{max?: number}} [options]
     */
    async tabToUpload({max = 10} = {}) {
        await this.altText.click();
        for (let n = 1; n <= max; n++) {
            await this.page.keyboard.press('Tab');
            if (await this.uploadButton.evaluate((b) => b === document.activeElement)) return n;
        }
        throw new Error(`"Upload File" not reached after ${max} Tab presses`);
    }

    /**
     * How a screen reader and a sighted user meet "Upload File": `announced`
     * (in the accessibility tree, enabled), `onScreen` (outside the box's
     * screen-reader-only part).
     */
    async uploadPresence() {
        await expect(this.uploadButton).toBeAttached({timeout: T});
        return this.uploadButton.evaluate((b) => ({
            announced: !b.disabled && !b.closest('[aria-hidden="true"]'),
            onScreen: !b.closest('.-screenReader'),
        }));
    }

    /**
     * Whether the box offers "Upload File" to a sighted user: the button is
     * enabled and not in the box's screen-reader-only part (where the box
     * keeps its drop area and button while it holds a file).
     */
    async uploadOffered() {
        await expect(this.uploadButton).toBeAttached({timeout: T});
        return this.uploadButton.evaluate((b) => !b.disabled && !b.closest('.-screenReader'));
    }

    /**
     * The box offers (true) or does not offer (false) "Upload File" to a
     * sighted user, polled until it holds. A file chosen shows its name in
     * the drop area at once, but the box turns into its preview ("Remove",
     * "Upload File" moved to the screen-reader-only part) only when the page
     * has handled the upload's answer, after `choose()` returns
     * (.reports/flake-s26/fixC/diagnosis.md).
     *
     * @param {boolean} offered
     */
    async expectUploadOffered(offered) {
        await expect.poll(() => this.uploadOffered(), {timeout: T}).toBe(offered);
    }

    /**
     * A button of the box a sighted user sees, by its words ("Remove",
     * "Upload File", "Restore Original"): visible and outside the box's
     * screen-reader-only part. A locator, for `toBeVisible()` /
     * `toHaveCount(0)`, which wait for the box to settle.
     *
     * @param {string} name
     */
    button(name) {
        return this.field
            .locator('button:not(.-screenReader button)')
            .filter({visible: true})
            .filter({hasText: new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`)});
    }
}

class OrderableList extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {import('@playwright/test').Locator} fieldset the list's field
     */
    constructor(page, fieldset) {
        super(page);
        this.fieldset = fieldset;
    }

    /** Every row, in list order. */
    rows() {
        return this.fieldset.locator('label.pkpFormField--options__option');
    }

    /** A row by its label. */
    row(label) {
        return this.rows().filter({has: this.page.locator('.pkpFormField--options__optionLabel').first().filter({hasText: whole(label)})});
    }

    /** The rows as read: each row's label and, where it has one, whether its box is ticked (null: no box). */
    async read() {
        return this.rows().evaluateAll((rows) =>
            rows.map((row) => {
                const label = row.querySelector('.pkpFormField--options__optionLabel');
                const box = row.querySelector('input[type="checkbox"], input[type="radio"]');
                return {label: label ? label.textContent.replace(/\s+/g, ' ').trim() : '', checked: box ? box.checked : null};
            })
        );
    }

    /** The labels in list order. */
    async labels() {
        return (await this.read()).map((r) => r.label);
    }

    /** A row's box. */
    box(label) {
        return this.row(label).locator('input[type="checkbox"]');
    }

    /** A row's up arrow (its text reads "Increase position of {label}"). */
    upArrow(label) {
        return this.row(label).locator('button.orderer__up');
    }

    /** A row's down arrow (its text reads "Decrease position of {label}"). */
    downArrow(label) {
        return this.row(label).locator('button.orderer__down');
    }

    /** A row's drag handle. */
    handle(label) {
        return this.row(label).locator('.orderer__dragDrop');
    }

    /** Press a row's up arrow until the row stands first; returns the presses made. */
    async moveToTop(label) {
        let presses = 0;
        for (let i = (await this.labels()).indexOf(label); i > 0; i--) {
            await this.upArrow(label).click();
            presses++;
            await expect.poll(() => this.labels().then((l) => l.indexOf(label)), {timeout: T}).toBe(i - 1);
        }
        return presses;
    }

    /** Drag a row by its handle onto the first row's top edge. */
    async dragToTop(label) {
        const handle = this.handle(label);
        await this.rows().first().scrollIntoViewIfNeeded();
        await expect(handle).toBeVisible({timeout: T});
        await handle.dragTo(this.rows().first(), {targetPosition: {x: 10, y: 3}});
    }
}

class AppearanceSetupForm extends AppearanceForm {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {{thumbnailField?: string}} [options] the app's thumbnail field
     *   name: 'journalThumbnail', 'pressThumbnail' or 'serverThumbnail'
     */
    constructor(page, {thumbnailField = 'journalThumbnail'} = {}) {
        super(page, '[id^="appearanceSetup-pageFooter-control"]');
        this.thumbnailField = thumbnailField;
        this.sidebar = new OrderableList(page, this.form.locator('fieldset').filter({has: page.locator('input[name="sidebar"]')}));
    }

    logo(locale = 'en') {
        return new UploadBox(this.page, 'appearanceSetup', 'pageHeaderLogoImage', {locale});
    }

    thumbnail(locale = 'en') {
        return new UploadBox(this.page, 'appearanceSetup', this.thumbnailField, {locale});
    }

    homepageImage(locale = 'en') {
        return new UploadBox(this.page, 'appearanceSetup', 'homepageImage', {locale});
    }

    /** The "Page Footer" box's id prefix in a language (for SettingsForm's rich-text helpers). */
    footerId(locale = 'en') {
        return `appearanceSetup-pageFooter-control-${locale}`;
    }

    /** Replace "Page Footer" in a language by typing. */
    async typeFooter(text, locale = 'en') {
        await this.typeRich(this.footerId(locale), text);
    }
}

class MastheadForm extends AppearanceForm {
    constructor(page) {
        // Anchored on the enrollment box, the one field shown in both its
        // states: the roles list leaves the form while it is unticked.
        super(page, '[id^="appearanceMasthead-enableEnrollmentMasthead-"]');
        const field = (name) =>
            this.form
                .locator('fieldset.pkpFormField--options')
                .filter({has: page.locator(`[id^="appearanceMasthead-${name}"]`)});
        // "Enrollment-based Masthead" and its one box (pkp-lib#13370); the
        // roles list and "Reviewers" show while the box is ticked.
        this.enrollmentField = field('enableEnrollmentMasthead-');
        this.enrollmentBox = this.enrollmentField.locator('input[type="checkbox"]');
        const rolesField = field('mastheadUserGroupIds');
        this.roles = new OrderableList(page, rolesField);
        this.description = rolesField.locator('.pkpFormField__description');
        // "Reviewers": its note and the "Enable listing of reviewers on the
        // masthead" box; none on OPS, which has no review stages.
        this.reviewersField = field('enableEnrollmentMastheadReviewers');
        this.reviewersBox = this.reviewersField.locator('input[type="checkbox"]');
    }
}

class AdvancedForm extends AppearanceForm {
    constructor(page) {
        super(page, '[id^="appearanceAdvanced-additionalHomeContent-control"]');
        this.styleSheet = new UploadBox(page, 'appearanceAdvanced', 'styleSheet');
    }

    favicon(locale = 'en') {
        return new UploadBox(this.page, 'appearanceAdvanced', 'favicon', {locale});
    }

    /** The "Additional Content" box's id prefix in a language. */
    additionalContentId(locale = 'en') {
        return `appearanceAdvanced-additionalHomeContent-control-${locale}`;
    }

    /** Replace "Additional Content" in a language by typing. */
    async typeAdditionalContent(text, locale = 'en') {
        await this.typeRich(this.additionalContentId(locale), text);
    }
}

class ListsForm extends AppearanceForm {
    constructor(page) {
        super(page, 'input[name="itemsPerPage"]');
        this.itemsPerPage = this.form.locator('input[name="itemsPerPage"]');
        this.pageLinks = this.form.locator('input[name="numPageLinks"]');
    }

    /** The red reason under "Items per page" ('itemsPerPage') or "Page links" ('numPageLinks'). */
    errorUnder(name) {
        return this.fieldError(`lists-${name}-control`);
    }
}

class DateTimeForm extends AppearanceForm {
    constructor(page) {
        super(page, 'input[name^="dateFormatShort-"]');
    }

    /**
     * A group of choices by its field name and language: 'dateFormatLong'
     * ("Date"), 'dateFormatShort' ("Date (Short)"), 'timeFormat' ("Time"),
     * 'datetimeFormatLong' ("Date & Time"), 'datetimeFormatShort' ("Date &
     * Time (Short)").
     */
    group(field, locale = 'en') {
        return this.form.locator('fieldset').filter({has: this.page.locator(`input[type="radio"][name="${field}-${locale}"]`)});
    }

    /** The group's legend, as read. */
    async legend(field, locale = 'en') {
        const legend = this.group(field, locale).locator('legend');
        return legend.evaluate((l) => {
            const clone = l.cloneNode(true);
            clone.querySelectorAll('.-screenReader').forEach((n) => n.remove());
            return clone.textContent.replace(/\s+/g, ' ').trim();
        });
    }

    /** The group's choices as read: each label and whether it is chosen. */
    async choices(field, locale = 'en') {
        return this.group(field, locale)
            .locator('label.pkpFormField--options__option')
            .evaluateAll((labels) =>
                labels.map((l) => {
                    const radio = l.querySelector('input[type="radio"]');
                    const clone = l.cloneNode(true);
                    clone.querySelectorAll('input').forEach((n) => n.remove());
                    return {label: clone.textContent.replace(/\s+/g, ' ').trim(), checked: !!(radio && radio.checked)};
                })
            );
    }

    /** The label of the chosen choice of a group. */
    async chosen(field, locale = 'en') {
        const chosen = (await this.choices(field, locale)).filter((c) => c.checked);
        return chosen.length === 1 ? chosen[0].label : chosen.map((c) => c.label);
    }

    /** A choice's radio by its label. */
    choice(field, label, locale = 'en') {
        return this.group(field, locale).locator('label.pkpFormField--options__option').filter({hasText: whole(label)}).locator('input[type="radio"]');
    }

    /** The "Custom" choice's radio (it has no value of its own, screen notes ccK4). */
    custom(field, locale = 'en') {
        return this.group(field, locale).locator('label.pkpFormField--options__option').filter({hasText: /^\s*Custom/}).locator('input[type="radio"]');
    }

    /** The "Custom" choice's pattern box. */
    customBox(field, locale = 'en') {
        return this.group(field, locale).locator('label.pkpFormField--options__option').filter({hasText: /^\s*Custom/}).locator('input[type="text"]');
    }
}

// ---------------------------------------------------------------------------
// Settings › Website
// ---------------------------------------------------------------------------

/** The side tabs by key: which top tab holds each. */
const SIDE_TABS = {
    theme: 'appearance',
    'appearance-setup': 'appearance',
    'appearance-masthead': 'appearance',
    advanced: 'appearance',
    lists: 'setup',
    dateTime: 'setup',
    languages: 'setup',
    installedPlugins: 'plugins',
};

class WebsiteSettings extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {{locale?: string, thumbnailField?: string}} [options]
     */
    constructor(page, contextPath, {locale = '', thumbnailField = 'journalThumbnail'} = {}) {
        super(page);
        this.contextPath = contextPath;
        this.locale = locale;
        this.theme = new ThemeForm(page);
        this.setup = new AppearanceSetupForm(page, {thumbnailField});
        this.masthead = new MastheadForm(page);
        this.advanced = new AdvancedForm(page);
        this.lists = new ListsForm(page);
        this.dateTime = new DateTimeForm(page);
    }

    url(hash = '') {
        return contextAddress(this.contextPath, this.locale, `/management/settings/website${hash}`);
    }

    /** A top tab's button: 'appearance', 'setup', 'plugins'. */
    topTab(key) {
        return this.page.locator(`[id="${key}-button"]`).first();
    }

    /** A side tab's button by key (SIDE_TABS). */
    sideTab(key) {
        return this.page.locator(`[id="${key}-button"]`).first();
    }

    /** A tab's panel by key. */
    panel(key) {
        return this.page.locator(`[role="tabpanel"][id="${key}"]`).first();
    }

    /**
     * Open the page at its bare address (leaving the page first, so a
     * reload really happens) and wait for "Appearance" › "Theme".
     */
    async goto() {
        await this.page.goto('about:blank');
        await this.page.goto(this.url());
        await expect(this.panel('theme').locator('input[name="typography"]').first()).toBeVisible({timeout: T});
    }

    /** Reload the page and wait for its landing tab. */
    async reload() {
        await this.page.reload();
        await expect(this.panel('theme').locator('input[name="typography"]').first()).toBeAttached({timeout: T});
    }

    /** Whether a tab button is the selected one. */
    async isSelected(button) {
        return (await button.getAttribute('aria-selected')) === 'true';
    }

    /** Open a side tab by key, its top tab first. */
    async openSideTab(key) {
        const top = this.topTab(SIDE_TABS[key]);
        await expect(top).toBeVisible({timeout: T});
        if (!(await this.isSelected(top))) await top.click();
        const side = this.sideTab(key);
        await expect(side).toBeVisible({timeout: T});
        if (!(await this.isSelected(side))) await side.click();
        await expect(this.panel(key)).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** Open a side tab and return its form, ready (rich-text boxes initialized). */
    async open(key) {
        await this.openSideTab(key);
        const form = {
            theme: this.theme,
            'appearance-setup': this.setup,
            'appearance-masthead': this.masthead,
            advanced: this.advanced,
            lists: this.lists,
            dateTime: this.dateTime,
        }[key];
        if (form) await form.ready();
        return form;
    }

    /** The side tabs' names under a top tab. */
    async sideTabNames(topKey) {
        return this.panel(topKey).getByRole('tab').allInnerTexts().then((names) => names.map(flat));
    }
}

/**
 * Untick a plugin's "Enabled" box on Settings › Website › "Plugins" (U09's
 * PluginsTab open on the tab) and confirm "Are you sure you want to disable
 * this plugin?" with "OK"; waits for the grid's answer.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('./CustomContentPages.js').PluginsTab} plugins
 * @param {string} pluginId
 */
async function disablePlugin(page, plugins, pluginId) {
    await plugins.enabledBox(pluginId).click();
    const dialog = page.locator('[role="dialog"]').filter({hasText: 'Are you sure you want to disable this plugin?'});
    await expect(dialog).toBeVisible({timeout: T});
    const answer = page.waitForResponse((r) => /plugin-grid\/disable/.test(r.url()), {timeout: T});
    await dialog.getByRole('button', {name: 'OK', exact: true}).click();
    const r = await answer;
    await waitForJQueryIdle(page);
    return r.status();
}

// ---------------------------------------------------------------------------
// The Settings Wizard
// ---------------------------------------------------------------------------

class SettingsWizard extends BasePage {
    constructor(page) {
        super(page);
        this.appearance = new ThemeForm(page);
    }

    /** Open Administration › Hosted Journals (Presses, Servers). */
    async gotoHostedContexts() {
        await this.page.goto(this.siteUrl('/admin/contexts'));
        await expect(this.page.locator('tr.gridRow').first()).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** A context's row by its name. */
    contextRow(name) {
        return this.page.locator('tr.gridRow').filter({hasText: name}).first();
    }

    /** Press the row's arrow; returns the links it offers, by their words. */
    async openRowActions(name) {
        const row = this.contextRow(name);
        await expect(row).toBeVisible({timeout: T});
        await row.locator('a.show_extras').click();
        const actions = row.locator('xpath=following-sibling::tr[1]');
        await expect(actions.getByRole('link').first()).toBeVisible({timeout: T});
        return (await actions.getByRole('link').allInnerTexts()).map(flat).filter(Boolean);
    }

    /** Choose "Settings wizard" under the open row's arrow and wait for the wizard. */
    async chooseWizard(name) {
        const actions = this.contextRow(name).locator('xpath=following-sibling::tr[1]');
        await actions.getByRole('link', {name: 'Settings wizard', exact: true}).click();
        await this.page.waitForURL(/\/admin\/wizard\//, {timeout: T, waitUntil: 'commit'});
        await expect(this.page.getByRole('tab').first()).toBeVisible({timeout: T});
    }

    /** The wizard's top tabs' names. */
    async topTabNames() {
        return this.page.getByRole('tablist').first().getByRole('tab').allInnerTexts().then((n) => n.map(flat));
    }

    /** The side tabs' names of the open top tab (the tab list inside its panel). */
    async sideTabNames() {
        return this.page.getByRole('tabpanel').first().getByRole('tablist').first().getByRole('tab').allInnerTexts().then((n) => n.map(flat));
    }

    /** Open a side tab by its name. */
    async openSideTab(name) {
        const tab = this.page.getByRole('tab', {name, exact: true}).first();
        await tab.click();
        await expect(tab).toHaveAttribute('aria-selected', 'true', {timeout: T});
        const panel = await tab.getAttribute('aria-controls');
        if (panel) await expect(this.page.locator(`[id="${panel}"]`)).toBeVisible({timeout: T});
    }

    /** Open "Appearance" and wait for its form. */
    async openAppearance() {
        await this.openSideTab('Appearance');
        await this.appearance.ready();
        return this.appearance;
    }
}

// ---------------------------------------------------------------------------
// The visitor's side
// ---------------------------------------------------------------------------

class PublicLook extends PublicChrome {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath the context's path, or 'index' for the site
     * @param {{locale?: string}} [options]
     */
    constructor(page, contextPath, {locale = ''} = {}) {
        super(page, contextPath, {locale});
        this.root = page.locator('.page_index_journal, .page_homepage, .page_index_server').first();
        this.about = page.locator('section.homepage_about');
        this.aboutHeading = this.about.locator('h2').first();
        this.additionalContent = page.locator('.additional_content');
        this.homepageImage = page.locator('.page_index_journal > .homepage_image img, .page_homepage > img, .page_index_server > img');
        this.categoryLinks = page.locator('.categoryHeader .categories_listing a');
        this.latest = page.locator('.latest_articles');
        this.latestHeading = this.latest.locator('h2').first();
        this.latestItems = this.latest.locator('.obj_article_summary');
        this.currentIssue = page.locator('section.current_issue');
        this.currentIssueHeading = this.currentIssue.locator('h2').first();
        this.currentIssueTitle = this.currentIssue.locator('.current_issue_title');
        this.currentIssueArticles = this.currentIssue.locator('.obj_article_summary');
        this.viewAllIssues = this.currentIssue.locator('a.read_more');
        this.announcementDate = page.locator('section.cmp_announcements article .date').first();
        this.logoLink = page.locator('.pkp_site_name a.is_img');
        this.logo = this.logoLink.locator('img');
        this.textNameLink = page.locator('.pkp_site_name a.is_text');
        this.footerContent = page.locator('.pkp_footer_content');
        this.footerBrand = page.locator('.pkp_brand_footer');
        this.favicons = page.locator('link[rel~="icon"]');
        this.content = page.locator('.pkp_structure_content');
    }

    /**
     * Open a page from the list under a top-level item of the header's
     * primary menu ('About', 'About the Journal'; `area: 'user'` for the
     * user menu) and wait for the new page's load: the old page's header
     * stays visible while the navigation runs, so a read right after the
     * click can land on the old page or on the new one unstyled.
     */
    async openFromMenu(menu, label, {area = 'primary'} = {}) {
        await this.pointAt(area, menu);
        const link = this.submenuLink(area, menu, label);
        const href = flat(await link.getAttribute('href'));
        await Promise.all([this.page.waitForURL(href, {waitUntil: 'load', timeout: T}), link.click()]);
        await expect(this.header).toBeVisible({timeout: T});
    }

    /** The home page's parts, top to bottom: each child of the page's root by its class. */
    async homeParts() {
        await expect(this.root).toBeAttached({timeout: T});
        return this.root.evaluate((root) => [...root.children].map((c) => (c.className || c.tagName.toLowerCase()).toString().trim()));
    }

    /** The page's visible text between the header and the footer, whitespace-collapsed. */
    async pageBodyText() {
        await expect(this.main).toBeAttached({timeout: T});
        return flat(await this.main.innerText());
    }

    /** The skip links: each one's address, and whether its target sits in the home page's "About" section. */
    async skipLinkTargets() {
        return this.skipLinks.evaluateAll((links) =>
            links.map((a) => {
                const href = a.getAttribute('href') || '';
                const target = href.startsWith('#') ? document.getElementById(href.slice(1)) : null;
                return {text: a.textContent.replace(/\s+/g, ' ').trim(), href, targetInsideAbout: !!(target && target.closest('.homepage_about'))};
            })
        );
    }

    /** The titles of the articles under "Latest Publications", in page order. */
    async latestTitles() {
        return (await this.latestItems.locator('.title').allInnerTexts()).map(flat);
    }

    /**
     * The count and page links under "Latest Publications": the words that
     * stand in the list outside its entries, the links among them and the
     * current page's number.
     */
    async latestPaging() {
        return this.latest.locator('ul.cmp_article_list').first().evaluate((ul) => {
            const nodes = [...ul.childNodes].filter((n) => !(n.nodeType === 1 && n.tagName === 'LI'));
            const text = nodes.map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
            const links = nodes.filter((n) => n.nodeType === 1 && n.tagName === 'A').map((a) => a.textContent.trim());
            const current = nodes.find((n) => n.nodeType === 1 && n.tagName === 'STRONG');
            return {text, links, current: current ? current.textContent.trim() : null};
        });
    }

    /** A page link under "Latest Publications" by its words ("2", ">", ">>"). */
    latestPageLink(label) {
        return this.latest.locator('ul.cmp_article_list > a').filter({hasText: whole(label)});
    }

    /** The header's look: its background colour and picture, and the colour of its name link and menu links. */
    async headerLook() {
        await expect(this.header).toBeVisible({timeout: T});
        return this.page.evaluate(() => {
            const head = document.querySelector('.pkp_structure_head');
            const cs = (el) => (el ? getComputedStyle(el) : null);
            const name = document.querySelector('.pkp_site_name a');
            const menu = document.querySelector('#navigationPrimary > li > a');
            return {
                background: cs(head).backgroundColor,
                backgroundImage: cs(head).backgroundImage,
                nameColour: name ? cs(name).color : null,
                menuColour: menu ? cs(menu).color : null,
            };
        });
    }

    /**
     * The font families of the page's first visible heading in the content
     * (null on a page with none), of the journal's name in the header, and
     * of the page's text.
     */
    async fonts() {
        await expect(this.header).toBeVisible({timeout: T});
        await this.page.evaluate(() => document.fonts && document.fonts.ready);
        return this.page.evaluate(() => {
            const heading = [...document.querySelectorAll('.pkp_structure_main h1, .pkp_structure_main h2, .pkp_structure_main h3')].find((h) => h.offsetParent !== null);
            const name = document.querySelector('.pkp_site_name a');
            const text = [...document.querySelectorAll('.pkp_structure_main p')].find((p) => p.offsetParent !== null) || document.body;
            return {
                heading: heading ? getComputedStyle(heading).fontFamily : null,
                siteName: name ? getComputedStyle(name).fontFamily : null,
                text: getComputedStyle(text).fontFamily,
            };
        });
    }

    /** An element's text colour. */
    async colourOf(locator) {
        await expect(locator).toBeVisible({timeout: T});
        return locator.evaluate((el) => getComputedStyle(el).color);
    }

    /** The logo's shown size and its description. */
    async logoShown() {
        await expect(this.logo).toBeVisible({timeout: T});
        await expect.poll(() => this.logo.evaluate((i) => i.complete && i.naturalWidth > 0), {timeout: T}).toBe(true);
        return this.logo.evaluate((i) => {
            const box = i.getBoundingClientRect();
            return {width: Math.round(box.width), height: Math.round(box.height), alt: i.getAttribute('alt'), src: i.src};
        });
    }

    /** Whether the footer's text stands above the application's logo. */
    async footerAboveBrand() {
        const text = await this.footerContent.boundingBox();
        const brand = await this.footerBrand.boundingBox();
        return !!(text && brand && text.y + text.height <= brand.y + 1);
    }

    /** The sidebar's blocks, top to bottom, by their block class ('block_web_feed', 'block_developed_by', …). */
    async sidebarBlocks() {
        return this.sidebar.locator('.pkp_block').evaluateAll((blocks) =>
            blocks.map((b) => [...b.classList].find((c) => c.startsWith('block_')) || b.className)
        );
    }

    /** The favicon addresses the page names. */
    async faviconHrefs() {
        return this.favicons.evaluateAll((links) => links.map((l) => l.href));
    }

    /** The style sheets the page loads, in order. */
    async styleSheets() {
        return this.page.locator('link[rel="stylesheet"]').evaluateAll((links) => links.map((l) => l.href));
    }

    /** The content column and the page's content area: left edges and widths. */
    async layout() {
        return this.page.evaluate(() => {
            const box = (sel) => {
                const el = document.querySelector(sel);
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return {left: Math.round(r.left), width: Math.round(r.width), right: Math.round(r.right)};
            };
            return {main: box('.pkp_structure_main'), content: box('.pkp_structure_content')};
        });
    }

    /** The homepage image's shown and own size, the main column's width, and its description. */
    async homepageImageShown() {
        await expect(this.homepageImage).toBeVisible({timeout: T});
        await expect.poll(() => this.homepageImage.evaluate((i) => i.complete && i.naturalWidth > 0), {timeout: T}).toBe(true);
        return this.homepageImage.evaluate((i) => {
            const main = document.querySelector('.pkp_structure_main');
            const box = i.getBoundingClientRect();
            return {
                width: Math.round(box.width),
                height: Math.round(box.height),
                naturalWidth: i.naturalWidth,
                naturalHeight: i.naturalHeight,
                mainWidth: main ? Math.round(main.getBoundingClientRect().width) : null,
                alt: i.getAttribute('alt'),
                hasAlt: i.hasAttribute('alt'),
            };
        });
    }

    /** The site's list of contexts: the entry of one context by its name (the site's home page). */
    siteEntry(name) {
        return this.page.locator('.page_index_site li').filter({has: this.page.locator('h3 a').filter({hasText: whole(name)})});
    }

    /** The thumbnail of a context's entry on the site's home page. */
    siteThumbnail(name) {
        return this.siteEntry(name).locator('.thumb img');
    }

    // A preprint server's home page {OPS} (Rules 12, 16): the search box
    // and category links, then "Latest preprints". Getters, so the
    // constructor the other suites use stays as it is.

    /** The search box and category links of a preprint server's home page. */
    get archiveHeader() {
        return this.page.locator('.page_index_server > section.archiveHeader');
    }

    /** The search box of a preprint server's home page. */
    get searchBox() {
        return this.archiveHeader.locator('input[name="query"]');
    }

    /** "Latest preprints": the section. */
    get latestPreprints() {
        return this.page.locator('.page_index_server > section.homepage_latest_preprints');
    }

    /** "Latest preprints": its heading. */
    get latestPreprintsHeading() {
        return this.latestPreprints.locator('h2').first();
    }

    /** "Latest preprints": its entries. */
    get latestPreprintItems() {
        return this.latestPreprints.locator('ul.cmp_preprint_list > li');
    }

    /**
     * "Latest preprints" as read: the entries' count and the links of the
     * section that are not an entry's own (a preprint's page or its
     * galleys, the author's words), which is where page links would stand.
     */
    async latestPreprintsRead() {
        await expect(this.latestPreprintsHeading).toBeVisible({timeout: T});
        return this.latestPreprints.evaluate((section) => ({
            count: section.querySelectorAll('ul.cmp_preprint_list > li').length,
            otherLinks: [...section.querySelectorAll('a')]
                .filter((a) => !a.closest('ul.cmp_preprint_list > li'))
                .map((a) => a.textContent.replace(/\s+/g, ' ').trim()),
            pagination: section.querySelectorAll('.cmp_pagination').length,
        }));
    }
}

class EditorialLook extends BasePage {
    /** The editorial screen's look: the top bar's colour, the text's font, the favicons, the headings' colours. */
    async read() {
        await expect(this.page.locator('header').first()).toBeVisible({timeout: T});
        return this.page.evaluate(() => {
            const head = document.querySelector('header');
            const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter((h) => h.offsetParent !== null);
            return {
                headerBackground: head ? getComputedStyle(head).backgroundColor : null,
                font: getComputedStyle(document.body).fontFamily,
                favicons: [...document.querySelectorAll('link[rel~="icon"]')].map((l) => l.href),
                headingColours: headings.map((h) => getComputedStyle(h).color),
                styleSheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href),
            };
        });
    }
}

module.exports = {
    AppearanceForm,
    ThemeForm,
    UploadBox,
    OrderableList,
    AppearanceSetupForm,
    MastheadForm,
    AdvancedForm,
    ListsForm,
    DateTimeForm,
    WebsiteSettings,
    SettingsWizard,
    PublicLook,
    EditorialLook,
    disablePlugin,
    WRONG_TYPE,
    flat,
};
