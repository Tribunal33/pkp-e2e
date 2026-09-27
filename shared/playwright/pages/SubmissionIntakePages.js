// @ts-check
/**
 * @file shared/playwright/pages/SubmissionIntakePages.js
 *
 * Page objects for U58 "Submission intake configuration"
 * (docs/specs/U58-submission-intake-configuration.md), shared by the OJS,
 * OMP and OPS suites and by later features on these screens. App-neutral:
 * every word that differs per app (the list's title "Article Components" /
 * "Monograph Components" / "Preprint Components", the not-accepting
 * sentence, the component names) is passed in by the suite; the locators
 * are the markup the three apps share (lib/pkp's Workflow Settings page,
 * its ui-library forms, the legacy genre grid and its AjaxModal window,
 * and the default theme's About › "Submissions" page).
 *
 * Surfaces:
 * - WorkflowSubmissionSettings — Settings › Workflow ("Workflow Settings")
 *   on its top tab "Submission": the side tabs, their panels and the page
 *   address; the three forms below and the components list hang off it.
 * - GuidanceForm — the "Author Guidance" side tab's form: a box's label,
 *   its formatted text (read and typed), "Save".
 * - MetadataForm — the "Metadata" side tab's form: an item by its box
 *   ("Enable keyword metadata"), the item's choices, the choice selected,
 *   the dependent boxes, "Save".
 * - saveWatchingStatus — "Save" on any of these forms, recording the
 *   statuses shown beside the button ("Saving", then "Saved") and bounded
 *   by the save's answer; saveShowingStatus — the same, asserting 200,
 *   "Saving" before "Saved" and no page notice; pageNotices, the notices
 *   at the top right.
 * - ComponentsList — the "Components" side tab's list: title, header
 *   buttons, rows in order, a row's arrow and its "Edit" / "Delete",
 *   the typed programming-interface address of the components,
 *   "Restore Defaults", "Order" with "Done" / "Cancel ordering" and the
 *   mouse drag.
 * - ComponentWindow — the "Add a Component" / "Edit" window: heading,
 *   "Name", the "File Type" and "File Variants" boxes, "File Metadata",
 *   "Require with Submissions", "Key", the required-fields note, "Save"
 *   (the answer awaited, or the browser's own refusal), "Cancel", the
 *   window's "Close".
 * - AboutSubmissionsPage — About › "Submissions": the page's parts in
 *   order (headings without the "Edit" words), the notice line (read as
 *   rendered) and its links, the sidebar's "Make a Submission" block link, a part's "Edit" link, the
 *   section policy blocks {OJS OPS}; the header's "About" menu and the
 *   breadcrumb come from ContextIdentityPages' AboutPages.
 *
 * DOM facts from the U58 claim check (.reports/U58/screen-notes.md, the
 * kept scripts under shared/playwright/checks/U58/) and the OJS suite's
 * runs, 2026-09-27:
 * - the side tabs are `#<id>-button` (disableSubmissions, instructions,
 *   metadata, components, contributorRoles), their panels `#<id>`; a
 *   press writes `#<id>` into the address; a reload keeps the side tab;
 * - the "Author Guidance" boxes are TinyMCE editors
 *   `submissionGuidanceSettings-<field>-control-<locale>`;
 * - the "Metadata" boxes and choices carry no `name`: a choice is a radio
 *   (value enable / request / require) inside the item's fieldset;
 * - the components list is the legacy grid `[id^="component-grid-settings-genre"]`,
 *   a row's controls sit in the next `tr` after its `a.show_extras`; the
 *   window is `form#genreForm`; its "Cancel" is a link; the key refusals
 *   show as a notice at the top right; a refused delete is a browser
 *   `alert()`.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {waitForJQueryIdle} = require('../support/legacy.js');
const {SettingsForm, AboutPages, SettingsPages} = require('./ContextIdentityPages.js');
const {ConfirmWindow, pastCloseWindow, notices, whole, flat} = require('./SectionsPages.js');

const T = 30_000;

/** Escape a string for a RegExp. */
function esc(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The "Submission" tab's side tabs, by on-screen name, and the id each writes. */
const SIDE_TABS = {
    'Disable Submissions': 'disableSubmissions',
    'Author Guidance': 'instructions',
    Metadata: 'metadata',
    Components: 'components',
    'Contributor Roles': 'contributorRoles',
    'Author Screening': 'screening',
};

/** The "Author Guidance" boxes by label, and the field each edits. */
const GUIDANCE_FIELDS = {
    'Author Guidelines': 'authorGuidelines',
    'Before you begin': 'beginSubmissionHelp',
    'Submission Checklist': 'submissionChecklist',
    'Upload Files': 'uploadFilesHelp',
    Contributors: 'contributorsHelp',
    Details: 'detailsHelp',
    'For the Editors': 'forTheEditorsHelp',
    'For Readers': 'forTheEditorsHelp',
    'Review and Submit': 'reviewHelp',
    'Copyright Notice': 'copyrightNotice',
    'Copyright notice': 'copyrightNotice',
    'For Reviewer Suggestion': 'reviewerSuggestionsHelp',
};

/** The notices at the top right (the Vue notification area). */
function pageNotices(page, text) {
    return notices(page, text);
}

/**
 * Press a Vue settings form's "Save" and record every status shown beside
 * the button until "Saved" (a MutationObserver armed before the press, so
 * the short "Saving" is not missed). Bounded by the save's answer.
 *
 * @param {import('@playwright/test').Page} page
 * @param {SettingsForm} form
 * @returns {Promise<{response: import('@playwright/test').Response, statuses: string[]}>}
 */
async function saveWatchingStatus(page, form) {
    const handle = await form.form.elementHandle({timeout: T});
    if (!handle) throw new Error('saveWatchingStatus: no form');
    await handle.evaluate((f) => {
        const seen = [];
        // @ts-ignore
        f.__u58statuses = seen;
        const read = () => {
            f.querySelectorAll('.pkpFormPage__status').forEach((s) => {
                const t = (s.textContent || '').replace(/\s+/g, ' ').trim();
                if (t && seen[seen.length - 1] !== t) seen.push(t);
            });
        };
        const obs = new MutationObserver(read);
        obs.observe(f, {subtree: true, childList: true, characterData: true, attributes: true});
        // @ts-ignore
        f.__u58observer = obs;
    });
    const response = await form.pressSave();
    await expect(form.savedStatus).toBeVisible({timeout: T});
    const statuses = await handle.evaluate((f) => {
        // @ts-ignore
        f.__u58observer.disconnect();
        // @ts-ignore
        return f.__u58statuses;
    });
    return {response, statuses};
}

/**
 * "Save" on a settings form of these tabs (Rule 2): answered 200, "Saving"
 * and then "Saved" beside the button, and no notice on the page (read once
 * "Saved" shows).
 *
 * @param {import('@playwright/test').Page} page
 * @param {SettingsForm} form
 */
async function saveShowingStatus(page, form) {
    const {response, statuses} = await saveWatchingStatus(page, form);
    expect(response.status(), 'the settings save answers 200').toBe(200);
    expect(statuses, '"Saving" and then "Saved" beside the button').toEqual(expect.arrayContaining(['Saving', 'Saved']));
    expect(statuses.indexOf('Saving')).toBeLessThan(statuses.lastIndexOf('Saved'));
    await expect(form.savedStatus).toBeVisible();
    await expect(pageNotices(page)).toHaveCount(0);
    return response;
}

// ---------------------------------------------------------------------------
// Settings › Workflow › "Submission"
// ---------------------------------------------------------------------------

class WorkflowSubmissionSettings extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {{locale?: string, listTitle?: string}} [options] listTitle: the
     *   components list's title ("Article Components", "Monograph
     *   Components", "Preprint Components")
     */
    constructor(page, contextPath, {locale = '', listTitle = 'Article Components'} = {}) {
        super(page);
        this.contextPath = contextPath;
        this.locale = locale;
        this.settings = new SettingsPages(page, contextPath, {locale});
        this.heading = page.locator('main h1').first();
        this.submissionTab = page.getByRole('main').getByRole('tab', {name: 'Submission', exact: true}).first();
        this.submissionPanel = page.locator('#submission');
        this.disableForm = new SettingsForm(page, 'input[name="disableSubmissions"]');
        this.guidance = new GuidanceForm(page);
        this.metadata = new MetadataForm(page);
        this.components = new ComponentsList(page, {title: listTitle});
    }

    /** The Workflow Settings address, optionally with a hash. */
    url(hash = '') {
        return this.settings.url('workflow', hash);
    }

    /** A side tab of "Submission" by its on-screen name. */
    sideTab(name) {
        return this.page.locator(`#${SIDE_TABS[name]}-button`);
    }

    /** The side tabs of "Submission", in screen order (for `toHaveText([...])`). */
    sideTabs() {
        return this.submissionPanel.getByRole('tablist').first().getByRole('tab');
    }

    /** The side tab that is open. */
    selectedSideTab() {
        return this.sideTabs().and(this.page.locator('[aria-selected="true"]'));
    }

    /** A side tab's panel. */
    sidePanel(name) {
        return this.page.locator(`#${SIDE_TABS[name]}`);
    }

    /** Wait until the page shows its heading and the "Submission" tab's side tabs. */
    async waitLoaded() {
        await expect(this.heading).toHaveText(whole('Workflow Settings'), {timeout: T});
        await expect(this.sideTabs().first()).toBeVisible({timeout: T});
    }

    /** Open the page by address and, when named, a side tab. */
    async goto(sideTab = null) {
        await this.page.goto(this.url());
        await this.waitLoaded();
        if (sideTab) await this.openSideTab(sideTab);
    }

    /** From any backend page: the side menu's "Settings" › "Workflow". */
    async openFromSideMenu() {
        await this.settings.openSettingsEntry('Workflow');
        await this.waitLoaded();
    }

    /** Reload the page (it keeps the side tab that was open). */
    async reload() {
        await this.page.reload();
        await this.waitLoaded();
    }

    /** Press a side tab and wait for its panel and the address. */
    async openSideTab(name) {
        await this.sideTab(name).click();
        await expect(this.sideTab(name)).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await expect(this.sidePanel(name)).toBeVisible({timeout: T});
        await this.page.waitForURL((url) => url.hash.includes(SIDE_TABS[name]), {waitUntil: 'commit', timeout: T});
        if (name === 'Author Guidance') await this.guidance.ready();
        if (name === 'Metadata') await this.metadata.ready();
        if (name === 'Components') await this.components.waitLoaded();
        if (name === 'Disable Submissions') await this.disableForm.ready();
    }

    /** "Disable Submissions": the heading of the side tab's form. */
    disableHeading() {
        return this.sidePanel('Disable Submissions').locator('.pkpFormFieldLabel, legend').filter({hasText: whole('Disable Submissions')}).first();
    }

    /** "Disable Submissions": the box. */
    disableBox() {
        return this.sidePanel('Disable Submissions').getByRole('checkbox', {name: 'Disable Submissions', exact: true});
    }
}

// ---------------------------------------------------------------------------
// "Author Guidance"
// ---------------------------------------------------------------------------

class GuidanceForm extends SettingsForm {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page, '[id^="submissionGuidanceSettings-authorGuidelines-control"]');
    }

    /** A box's editor id prefix by its label. */
    controlId(label) {
        const field = GUIDANCE_FIELDS[label];
        if (!field) throw new Error(`GuidanceForm: unknown box "${label}"`);
        return `submissionGuidanceSettings-${field}-control`;
    }

    /** A box's label on the form (the visible field label). */
    label(label) {
        return this.form.locator('.pkpFormFieldLabel').filter({hasText: whole(label)});
    }

    /** Every box label on the form, in order (for `toHaveText([...])`). */
    labels() {
        return this.form.locator('.pkpFormField--richTextarea .pkpFormFieldLabel');
    }

    /** A box's text as the editor holds it, tags removed, white space collapsed. */
    async text(label) {
        const html = await this.richContent(this.controlId(label));
        return flat(String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#39;|&rsquo;/g, "'"));
    }

    /** Replace a box's text by typing; an empty text empties it. */
    async type(label, text) {
        await this.typeRich(this.controlId(label), text);
    }
}

// ---------------------------------------------------------------------------
// "Metadata"
// ---------------------------------------------------------------------------

class MetadataForm extends SettingsForm {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page, 'input[type="checkbox"][value="enable"]');
        this.panel = page.locator('#metadata');
    }

    /** An item's "Enable … metadata" box (or any other box of the tab) by its label. */
    box(label) {
        return this.panel.getByRole('checkbox', {name: label, exact: true});
    }

    /** The item's fieldset, found by its box. */
    item(boxLabel) {
        return this.panel.locator('fieldset.pkpFormField').filter({has: this.page.getByRole('checkbox', {name: boxLabel, exact: true})}).first();
    }

    /** The item's choices (radios; none while the box is unticked). */
    choices(boxLabel) {
        return this.item(boxLabel).getByRole('radio');
    }

    /** One choice by its label ("Require the author to suggest keywords before accepting their submission."). */
    choice(boxLabel, label) {
        return this.item(boxLabel).getByRole('radio', {name: label, exact: true});
    }

    /** One choice by its opening words ("Do not request"). */
    choiceStartingWith(boxLabel, words) {
        return this.item(boxLabel).getByRole('radio', {name: new RegExp(`^\\s*${esc(words)}`)});
    }
}

// ---------------------------------------------------------------------------
// "Components"
// ---------------------------------------------------------------------------

/** A component window's server answer (the component router's kebab-cased ops). */
function isGenreOp(op) {
    return (r) => r.request().method() === 'POST' && new RegExp(`/genre-grid/${op}(\\?|$)`).test(r.url());
}

class ComponentsList extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {{title?: string}} [options]
     */
    constructor(page, {title = 'Article Components'} = {}) {
        super(page);
        this.title = title;
    }

    /** The grid's container. */
    grid() {
        return this.page.locator('[id^="component-grid-settings-genre"]').filter({visible: true}).first();
    }

    /** Wait until the list holds its rows. */
    async waitLoaded() {
        await expect(this.grid().locator('tr.gridRow').first()).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** The list's title. */
    heading() {
        return this.grid().locator('.header').getByRole('heading', {name: this.title, exact: true});
    }

    /** The header's links, in screen order ("Order", "Add a Component", "Restore Defaults"). */
    headerLinks() {
        return this.grid().locator('.header ul.actions a:visible');
    }

    addLink() {
        return this.grid().locator('.header').getByRole('link', {name: 'Add a Component', exact: true});
    }

    restoreLink() {
        return this.grid().locator('.header').getByRole('link', {name: 'Restore Defaults', exact: true});
    }

    orderLink() {
        return this.grid().locator('.header').getByRole('link', {name: 'Order', exact: true});
    }

    /** The rows (the controls rows and the "No Items" line excluded). */
    rows() {
        return this.grid().locator('tbody tr.gridRow');
    }

    /** Each row's name cell (reads "Settings <name>": the arrow's screen-reader word). */
    nameCells() {
        return this.rows().locator('td:first-child');
    }

    /** A matcher for a row's first cell reading `name` (after the arrow's word). */
    static cellText(name) {
        return new RegExp(`^\\s*(Settings\\s*)?${esc(name)}\\s*$`);
    }

    /** The rows whose name is `name` (none, one, or several). */
    row(name) {
        return this.rows().filter({has: this.page.locator('td:first-child').filter({hasText: ComponentsList.cellText(name)})});
    }

    /**
     * The rows' names in screen order, read once the list is settled (a
     * locator read; wrap in `expect.poll` where the list is redrawing).
     */
    async names() {
        await waitForJQueryIdle(this.page);
        const texts = await this.nameCells().allInnerTexts();
        return texts.map((t) => flat(t).replace(/^Settings\s*/, ''));
    }

    /**
     * The programming interface's components address
     * (`{context}/api/v1/genres`), typed in the browser (spec footnote s):
     * whether it answered with success, the names it lists (null when it
     * lists none) and the refusal's message.
     *
     * @param {string} contextPath
     * @returns {Promise<{ok: boolean, status: number, names: string[]|null, errorMessage: string|null}>}
     */
    async readComponentsAddress(contextPath) {
        const response = await this.page.goto(this.contextUrl(contextPath, '/api/v1/genres'));
        expect(response, 'the components address answers').not.toBeNull();
        const answer = /** @type {import('@playwright/test').Response} */ (response);
        let json = null;
        try {
            json = JSON.parse(await answer.text());
        } catch (e) {
            json = null;
        }
        const names =
            json && Array.isArray(json.items)
                ? json.items.map((g) => (g.name && typeof g.name === 'object' ? g.name.en || Object.values(g.name)[0] : g.name))
                : null;
        return {ok: answer.ok(), status: answer.status(), names, errorMessage: (json && json.errorMessage) || null};
    }

    /** Press a row's arrow and return its controls row (the next `tr`). */
    async rowControls(name) {
        const row = this.row(name).first();
        const controls = row.locator('xpath=following-sibling::tr[1]');
        for (let attempt = 0; attempt < 3; attempt++) {
            const toggle = row.locator('a.show_extras');
            if (await toggle.count()) await toggle.click();
            try {
                await expect(controls.getByRole('link', {name: 'Edit', exact: true})).toBeVisible({timeout: 10_000});
                return controls;
            } catch (e) {
                if (attempt === 2) throw e;
            }
        }
        return controls;
    }

    /** The arrow's accessible name (a screen reader hears "Settings"). */
    rowToggle(name) {
        return this.row(name).first().locator('a.show_extras');
    }

    /** "Add a Component": the window, once loaded. */
    async openAdd() {
        await this.addLink().click();
        const win = new ComponentWindow(this.page);
        await win.waitLoaded();
        return win;
    }

    /** A row's arrow, then "Edit": the window, once loaded. */
    async openEdit(name) {
        const controls = await this.rowControls(name);
        await controls.getByRole('link', {name: 'Edit', exact: true}).click();
        const win = new ComponentWindow(this.page);
        await win.waitLoaded();
        return win;
    }

    /** A row's arrow, then "Delete": the "Delete" window. */
    async openDelete(name) {
        const controls = await this.rowControls(name);
        await controls.getByRole('link', {name: 'Delete', exact: true}).click();
        const win = new ConfirmWindow(this.page, 'Delete');
        await expect(win.root()).toBeVisible({timeout: T});
        return win;
    }

    /**
     * "OK" in an open "Delete" window: waits for the delete's answer, the
     * window's going and the grid's redraw.
     *
     * @param {ConfirmWindow} win
     */
    async confirmDelete(win) {
        const answered = this.page.waitForResponse(isGenreOp('delete-genre'), {timeout: T});
        await win.answer('OK');
        const response = await answered;
        await waitForJQueryIdle(this.page);
        await pastCloseWindow(this.page);
        return response;
    }

    /**
     * "OK" in the "Delete" window of a component a file carries: returns
     * the browser pop-up's message (the pop-up is closed) and leaves the
     * window open.
     *
     * @param {ConfirmWindow} win
     * @returns {Promise<string>}
     */
    async confirmDeleteRefused(win) {
        const popup = new Promise((resolve) => {
            this.page.once('dialog', async (d) => {
                const message = d.message();
                await d.accept().catch(() => {});
                resolve(message);
            });
        });
        const answered = this.page.waitForResponse(isGenreOp('delete-genre'), {timeout: T});
        await win.button('OK').click();
        await answered;
        return /** @type {string} */ (await popup);
    }

    /**
     * "Cancel" in an open "Delete" / "Confirm" window: the window goes, and
     * the closed window's slot is waited out so the next opener works.
     *
     * @param {ConfirmWindow} win
     */
    async dismiss(win) {
        await win.answer('Cancel');
        await waitForJQueryIdle(this.page);
        await pastCloseWindow(this.page);
    }

    /** "Restore Defaults": the "Confirm" window. */
    async openRestore() {
        await this.restoreLink().click();
        const win = new ConfirmWindow(this.page, 'Confirm');
        await expect(win.root()).toBeVisible({timeout: T});
        return win;
    }

    /** "OK" in the "Restore Defaults" window: waits for the answer and the redraw. */
    async confirmRestore(win) {
        const answered = this.page.waitForResponse(isGenreOp('restore-genres'), {timeout: T});
        await win.answer('OK');
        const response = await answered;
        await waitForJQueryIdle(this.page);
        await pastCloseWindow(this.page);
        return response;
    }

    // ---- "Order"

    doneLink() {
        return this.grid().getByRole('link', {name: 'Done', exact: true});
    }

    cancelOrderingLink() {
        return this.grid().getByRole('link', {name: 'Cancel ordering', exact: true});
    }

    /** The rows' drag handles (shown while ordering). */
    dragHandles() {
        return this.rows().locator('.pkp_linkaction_moveItem:visible');
    }

    /** "Order": the rows become drag handles, "Done" and "Cancel ordering" show. */
    async startOrdering() {
        await this.orderLink().click();
        await expect(this.doneLink()).toBeVisible({timeout: T});
    }

    /**
     * Drag the row `from` onto the top of the row `to` with the mouse (the
     * jQuery UI sortable needs a real press and several steps of move).
     */
    async drag(from, to) {
        await this.dragIntoView();
        const source = this.row(from).first();
        const target = this.row(to).first();
        const sb = await source.boundingBox();
        const tb = await target.boundingBox();
        if (!sb || !tb) throw new Error(`drag: no box for "${from}" or "${to}"`);
        await this.page.mouse.move(sb.x + 40, sb.y + sb.height / 2);
        await this.page.mouse.down();
        await this.page.mouse.move(sb.x + 40, sb.y + sb.height / 2 - 5, {steps: 5});
        await this.page.mouse.move(tb.x + 40, tb.y + 3, {steps: 20});
        await this.page.mouse.move(tb.x + 40, tb.y + 2, {steps: 2});
        await this.page.mouse.up();
    }

    /**
     * Scroll the list's top to the viewport's top, so a drag from a low row
     * (a press's fifteen rows put "Other" below the fold) to the first one
     * happens on screen: a mouse drag outside the viewport silently does
     * nothing (added by the OMP author, 2026-09-27).
     */
    async dragIntoView() {
        await this.grid().evaluate((g) => g.scrollIntoView({block: 'start'}));
    }

    /** "Done": waits for the order's save and the mode's end. */
    async done() {
        const saved = this.page.waitForResponse((r) => r.request().method() === 'POST' && /save-sequence/.test(r.url()), {timeout: T});
        await this.doneLink().click();
        const response = await saved;
        await expect(this.doneLink()).toBeHidden({timeout: T});
        await waitForJQueryIdle(this.page);
        return response;
    }

    /** "Cancel ordering": the mode ends. */
    async cancelOrdering() {
        await this.cancelOrderingLink().click();
        await expect(this.cancelOrderingLink()).toBeHidden({timeout: T});
        await waitForJQueryIdle(this.page);
    }
}

class ComponentWindow extends BasePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);
    }

    form() {
        return this.page.locator('form#genreForm');
    }

    /** The window (the dialog around the form). */
    root() {
        return this.page.getByRole('dialog').filter({has: this.page.locator('form#genreForm')});
    }

    /** The window's heading ("Add a Component", "Edit"). */
    heading() {
        return this.root().getByRole('heading', {level: 1});
    }

    /** Wait until the form's name box is there and jQuery is idle (the form loads by AJAX). */
    async waitLoaded() {
        await expect(this.nameBox()).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** "Name" in a language (the second language's box shows while the first is focused). */
    nameBox(locale = 'en') {
        return this.form().locator(`input[name="name[${locale}]"]`);
    }

    keyBox() {
        return this.form().locator('input[name="key"]');
    }

    /** A box by its label (the "File Type" and "File Variants" boxes). */
    checkbox(label) {
        return this.form().getByRole('checkbox', {name: label, exact: true});
    }

    /** The "File Type" boxes. */
    dependentBox() {
        return this.form().locator('input[type="checkbox"][name="dependent"]');
    }

    supplementaryBox() {
        return this.form().locator('input[type="checkbox"][name="supplementary"]');
    }

    variantsBox() {
        return this.form().locator('input[type="checkbox"][name="supportsFileVariants"]');
    }

    /** "File Metadata"'s chosen entry (for `toHaveText`). */
    metadataChoice() {
        return this.form().locator('select[name="category"] option:checked');
    }

    /** "Require with Submissions": a choice by its label. */
    requiredChoice(label) {
        return this.form().getByRole('radio', {name: label, exact: true});
    }

    /** The note above the window's foot. */
    requiredNote() {
        return this.form().locator('.formRequired');
    }

    /** The message under "Name". */
    nameError(locale = 'en') {
        return this.form().locator(`[name="name[${locale}]"] ~ label.error, label.error[for^="name-${locale}"]`);
    }

    /** Every message under a box. */
    visibleErrors() {
        return this.form().locator('label.error:visible');
    }

    saveButton() {
        return this.form().getByRole('button', {name: 'Save', exact: true});
    }

    cancelLink() {
        return this.form().getByRole('link', {name: 'Cancel', exact: true});
    }

    /** The window's own "Close" (the arrow at its top). */
    closeButton() {
        return this.root().getByRole('button', {name: /^Close/}).first();
    }

    /** Replace "Name" (the first language). */
    async typeName(text, locale = 'en') {
        await this.nameBox(locale).fill(text);
    }

    async typeKey(text) {
        await this.keyBox().fill(text);
    }

    /**
     * "Save" the server answers: returns the answer (the caller asserts
     * the window's state and any notice).
     */
    async save() {
        const answered = this.page.waitForResponse(isGenreOp('update-genre'), {timeout: T});
        await this.saveButton().click();
        const response = await answered;
        await waitForJQueryIdle(this.page);
        return response;
    }

    /** "Save" that closes the window: bounded by the answer and the window's going. */
    async saveAndClose() {
        const response = await this.save();
        await expect(this.form()).toHaveCount(0, {timeout: T});
        await pastCloseWindow(this.page);
        return response;
    }

    /**
     * "Save" the browser refuses before sending: counts the saves posted
     * until `refusal` shows (the bound) and returns that count.
     *
     * @param {import('@playwright/test').Locator} refusal
     */
    async saveRefusedInPlace(refusal) {
        let sent = 0;
        const onRequest = (request) => {
            if (request.method() === 'POST' && /\/genre-grid\/update-genre/.test(request.url())) sent += 1;
        };
        this.page.on('request', onRequest);
        try {
            await this.saveButton().click();
            await expect(refusal).toBeVisible({timeout: T});
            await waitForJQueryIdle(this.page);
        } finally {
            this.page.off('request', onRequest);
        }
        return sent;
    }

    /**
     * "Cancel": the window closes at once; returns the browser questions
     * asked on the way (none expected).
     */
    async cancel() {
        const asked = [];
        const onDialog = (d) => {
            asked.push(d.message());
            d.dismiss().catch(() => {});
        };
        this.page.on('dialog', onDialog);
        try {
            await this.cancelLink().click();
            await expect(this.form()).toHaveCount(0, {timeout: T});
            await pastCloseWindow(this.page);
        } finally {
            this.page.off('dialog', onDialog);
        }
        return asked;
    }

    /**
     * The window's "Close" after a change: returns the browser question it
     * asks, answered with `accept` (the window then closes unsaved).
     */
    async closeAsked({accept = true} = {}) {
        // The question opens while the press is still being performed, so it
        // is answered by a handler armed before the press (awaiting the
        // event after the click would deadlock).
        const asked = new Promise((resolve) => {
            this.page.once('dialog', async (d) => {
                const message = d.message();
                if (accept) await d.accept().catch(() => {});
                else await d.dismiss().catch(() => {});
                resolve(message);
            });
        });
        await this.closeButton().click();
        const message = await asked;
        if (accept) {
            await expect(this.form()).toHaveCount(0, {timeout: T});
            await pastCloseWindow(this.page);
        }
        return message;
    }
}

// ---------------------------------------------------------------------------
// About › "Submissions"
// ---------------------------------------------------------------------------

/** The page's parts by heading, and the class each block carries. */
const PART_CLASSES = {
    'Author Guidelines': 'author_guidelines',
    'Submission Preparation Checklist': 'submission_checklist',
    'Copyright Notice': 'copyright_notice',
    'Privacy Statement': 'privacy_statement',
};

class AboutSubmissionsPage extends AboutPages {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {{locale?: string}} [options]
     */
    constructor(page, contextPath, {locale = ''} = {}) {
        super(page, contextPath, {locale});
        this.root = page.locator('.page_submissions');
    }

    /** Open the page by its address and wait for its heading. */
    async open() {
        await this.page.goto(this.url('submissions'));
        await expect(this.pageHeading()).toBeVisible({timeout: T});
    }

    /** Reload and wait for the heading. */
    async reload() {
        await this.page.reload();
        await expect(this.pageHeading()).toBeVisible({timeout: T});
    }

    /** From the page open now: the header's "About" › "Submissions". */
    async openFromMenu() {
        await this.chooseFromAboutMenu('Submissions');
        await expect(this.pageHeading()).toBeVisible({timeout: T});
    }

    /** The heading "Submissions". */
    pageHeading() {
        return this.root.getByRole('heading', {name: 'Submissions', level: 1, exact: true});
    }

    /** The notice line under the heading. */
    notice() {
        return this.root.locator('.cmp_notification');
    }

    /** A link of the notice line by its words ("Login", "Register", "Make a new submission"). */
    noticeLink(name) {
        return this.notice().getByRole('link', {name, exact: true});
    }

    /** Every link of the notice line. */
    noticeLinks() {
        return this.notice().locator('a');
    }

    /** The parts' headings, in page order (for `toHaveText([...])`). */
    partHeadings() {
        return this.root.locator(':scope > div h2');
    }

    /**
     * The parts' headings in page order, each without its "Edit" link's
     * words (a read of the server-rendered page, taken once the first
     * heading shows; poll it where the page may still be changing).
     */
    async partHeadingNames() {
        await expect(this.partHeadings().first()).toBeVisible({timeout: T});
        return this.partHeadings().evaluateAll((hs) =>
            hs.map((h) => {
                const copy = /** @type {HTMLElement} */ (h.cloneNode(true));
                copy.querySelectorAll('a').forEach((a) => a.remove());
                return (copy.textContent || '').replace(/\s+/g, ' ').trim();
            })
        );
    }

    /** The notice line reads `sentence`, as the page renders it (a whole-text match). */
    async expectLine(sentence) {
        await expect(this.notice()).toHaveText(sentence, {useInnerText: true, timeout: T});
    }

    /** A part's block by its heading (the named parts; a section's block by its title). */
    part(heading) {
        const cls = PART_CLASSES[heading];
        if (cls) return this.root.locator(`:scope > div.${cls}`);
        return this.root.locator(':scope > div.section_policy').filter({has: this.page.locator('h2').filter({hasText: whole(heading)})});
    }

    /** A part's words after its heading (white space collapsed, "Edit" left out). */
    async partText(heading) {
        const block = this.part(heading);
        await expect(block).toHaveCount(1, {timeout: T});
        return flat(
            await block.evaluate((el) => {
                const copy = /** @type {HTMLElement} */ (el.cloneNode(true));
                copy.querySelectorAll('h2').forEach((h) => h.remove());
                return copy.textContent || '';
            })
        );
    }

    /** A part's "Edit" link (beside its heading). */
    partEditLink(heading) {
        return this.part(heading).locator('h2 a.cmp_edit_link');
    }

    /** The sidebar's "Make a Submission" block's link {OJS OMP}. */
    makeSubmissionBlockLink() {
        return this.page.locator('.block_make_submission a').first();
    }

    /** Every "Edit" link on the page. */
    editLinks() {
        return this.root.locator('a.cmp_edit_link');
    }
}

module.exports = {
    WorkflowSubmissionSettings,
    GuidanceForm,
    MetadataForm,
    ComponentsList,
    ComponentWindow,
    AboutSubmissionsPage,
    saveWatchingStatus,
    saveShowingStatus,
    pageNotices,
    SIDE_TABS,
    GUIDANCE_FIELDS,
};
