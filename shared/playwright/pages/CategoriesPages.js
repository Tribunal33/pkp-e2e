// @ts-check
/**
 * @file shared/playwright/pages/CategoriesPages.js
 *
 * Page objects for U16 "Categories" (docs/specs/U16-categories.md), shared
 * by the OJS, OMP and OPS suites. App-neutral: every on-screen word that
 * differs per app (the address word "catalog" / "preprints", the role
 * names under "Editorial Assignments") is passed in by the suite; the
 * locators are the markup the three apps share (lib/pkp's Vue settings
 * page, its category window and picker, and the default theme's category
 * page and "Browse" block).
 *
 * Surfaces:
 * - CategoriesTab — Settings › Journal (Press, Server) › "Categories": the
 *   table, its rows in order, a row's "Assigned To", its "More Actions"
 *   menu, its arrow, its indent, "Add Category", and the "Category saved"
 *   notice.
 * - CategoryWindow — the "Add Category" / "Edit Category" window: the
 *   language button, the boxes per language, "Path" and its address line,
 *   the "Order of …" list, the "Cover Image" upload, the "Description"
 *   editor, the "Editorial Assignments" boxes, the refusal messages and
 *   the footer's "Go to" links, "Save" (bounded by the answer) and a save
 *   refused in the browser (bounded by the message, counting requests).
 * - DeleteCategoryDialog — "Are you absolutely sure…": its box, its two
 *   buttons, and the "Category Deleted" dialog that follows.
 * - CategoryPicker — the "Categories" field of the Publication Settings
 *   ("Catalog Entry", "Preprint entry") page, the wizard's step and the
 *   lists' "Filters" window: its typing box, the suggestions, the chips
 *   and their "Remove …" buttons, "Select Categories".
 * - SelectCategoriesWindow — the "Select Categories" window: its rows,
 *   boxes, bold top-level names, "Save" and "Close".
 * - CategoryPage — a category's public page: breadcrumb, heading, count,
 *   picture, description, "Subcategories", the item list and its paging,
 *   and the bare "404 Not Found" page an unknown path answers.
 * - BrowseBlock — the sidebar's "Browse" block: heading, the line
 *   "Categories", the links as a tree, and how a link is drawn (the marked
 *   one grayed with a grey bar at its left); a press's block adds its
 *   sub-lists ("Categories", "Series") as lines of plain text and its
 *   category links as one flat list, each with its indent.
 * - BrowseBlockSettings — {OMP} the press's "Browse Block" "Settings"
 *   window (Settings › Website › "Plugins"): "Browse Possibilities", its
 *   three boxes, "Save".
 * - PublicationEntryPage — the workflow's page that holds the "Categories"
 *   field ("Publication Settings", "Catalog Entry", "Preprint entry"; the
 *   page's name passed in): opened from the side menu, its "Save".
 *
 * DOM shapes from the U16 claim check (.reports/U16/screen-notes.md, the
 * kept scripts under shared/playwright/checks/U16/) and the OJS suite's
 * runs, 2026-09-25.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {closeMenu} = require('../support/menus.js');

const T = 30_000;

/** Text with runs of white space collapsed. */
function flat(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

/** Escape a string for a RegExp. */
function esc(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A whole-text matcher (trimmed), for `filter({hasText})`. */
function whole(text) {
    return new RegExp(`^\\s*${esc(text)}\\s*$`);
}

/** A context-relative address: '/index.php/<path>[/<locale>]<pathname>'. */
function contextAddress(contextPath, locale, pathname = '') {
    return `/index.php/${contextPath}${locale ? `/${locale}` : ''}${pathname}`;
}

/** The categories API's writes (add, edit, delete: PUT and DELETE ride POST with an override). */
function isCategoryWrite(response) {
    return /\/api\/v1\/categories(\/\d+)?(\?|$)/.test(response.url()) && response.request().method() === 'POST';
}

// ---------------------------------------------------------------------------
// Settings › Journal › "Categories"
// ---------------------------------------------------------------------------

class CategoriesTab extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {{locale?: string}} [options]
     */
    constructor(page, contextPath, {locale = ''} = {}) {
        super(page);
        this.contextPath = contextPath;
        this.locale = locale;
    }

    url() {
        return contextAddress(this.contextPath, this.locale, '/management/settings/context');
    }

    /** The "Categories" tab button of Settings › Journal (Press, Server). */
    tabButton() {
        return this.page.locator('#categories-button');
    }

    /** Open the settings page on the "Categories" tab and wait for its table. */
    async goto() {
        await this.page.goto(this.url());
        await this.tabButton().click();
        await expect(this.table()).toBeVisible({timeout: T});
    }

    /** Reload the page (every row closes, Rule 3) and reopen the tab. */
    async reload() {
        await this.page.reload();
        await this.tabButton().click();
        await expect(this.table()).toBeVisible({timeout: T});
    }

    /** The table headed "Categories". */
    table() {
        return this.page.getByRole('table', {name: 'Categories'});
    }

    /** A column header by its words ("Category Name", "Assigned To"). */
    columnHeader(name) {
        return this.table().getByRole('columnheader', {name, exact: true});
    }

    /** "Add Category" at the table's top right. */
    addButton() {
        return this.page.getByRole('button', {name: 'Add Category', exact: true});
    }

    /** Every body row of the table (the rows showing now). */
    rows() {
        return this.table().locator('tbody tr');
    }

    /** The name cell of every row. */
    nameCells() {
        return this.rows().locator(':scope > :first-child');
    }

    /** The name cell of every row drawn now (a closed row's sub-rows left out). */
    shownNameCells() {
        return this.rows().filter({visible: true}).locator(':scope > :first-child');
    }

    /** A row by its name cell. */
    row(name) {
        return this.rows().filter({has: this.page.getByRole('cell', {name, exact: true})}).first();
    }

    /** A row's "Assigned To" cell. */
    assignedTo(name) {
        return this.row(name).locator(':scope > *').nth(1);
    }

    /** A row's "More Actions" button. */
    moreActions(name) {
        return this.row(name).getByRole('button', {name: 'More Actions'});
    }

    /** The open row menu's items (the menu portals to the page, pitfall 3). */
    menuItems() {
        return this.page.getByRole('menuitem');
    }

    /** Open a row's "More Actions" menu and wait for its items. */
    async openMenu(name) {
        await this.moreActions(name).click();
        await expect(this.menuItems().first()).toBeVisible({timeout: T});
    }

    /**
     * Close an open row menu without choosing: Escape pressed on the
     * headlessui menu itself (`closeMenu()` of support/menus.js), so the key
     * reaches the menu whatever the frame timing of its focus hand-off (an
     * Escape sent to the page before the focus landed was seen once at four
     * workers on OPS).
     */
    async closeMenu() {
        await closeMenu(this.page);
    }

    /** Choose an item of a row's menu ("Add", "Edit", "Delete Category"). */
    async rowAction(name, item) {
        await this.openMenu(name);
        await this.page.getByRole('menuitem', {name: item, exact: true}).click();
    }

    /** A row's arrow (the button of its last cell; 0 × 0 on a row with nothing under it). */
    arrow(name) {
        return this.row(name).locator('td:last-child button');
    }

    /** Press a row's arrow with the pointer (only a pointer works it, Rule 3a). */
    async toggle(name) {
        await this.arrow(name).click();
    }

    /** How far a row's name is indented: the left padding of its name, in pixels. */
    async indent(name) {
        return this.row(name)
            .locator(':scope > :first-child')
            .evaluate((cell) => parseFloat(getComputedStyle(cell.firstElementChild || cell).paddingLeft) || 0);
    }

    /** The notice "Category saved" at the top right after a save (Rule 4). */
    savedNotice() {
        return this.page.getByRole('status').filter({hasText: 'Category saved'});
    }

    /** Press "Add Category" and wait for the window. */
    async openAdd() {
        await this.addButton().click();
        const window = new CategoryWindow(this.page, 'Add Category');
        await window.expectOpen();
        return window;
    }

    /** A row's "More Actions" › "Add": the same "Add Category" window. */
    async openRowAdd(name) {
        await this.rowAction(name, 'Add');
        const window = new CategoryWindow(this.page, 'Add Category');
        await window.expectOpen();
        return window;
    }

    /** A row's "More Actions" › "Edit", waiting until the form holds the saved path. */
    async openEdit(name) {
        await this.rowAction(name, 'Edit');
        const window = new CategoryWindow(this.page, 'Edit Category');
        await window.expectOpen();
        await expect(window.pathBox()).not.toHaveValue('', {timeout: T});
        return window;
    }

    /** A row's "More Actions" › "Delete Category". */
    async openDelete(name) {
        await this.rowAction(name, 'Delete Category');
        const dialog = new DeleteCategoryDialog(this.page);
        await expect(dialog.root()).toBeVisible({timeout: T});
        return dialog;
    }
}

// ---------------------------------------------------------------------------
// The category window
// ---------------------------------------------------------------------------

class CategoryWindow extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} title "Add Category" or "Edit Category"
     */
    constructor(page, title) {
        super(page);
        this.title = title;
    }

    /** The window (a side dialog named by its title). */
    root() {
        return this.page.getByRole('dialog', {name: this.title}).last();
    }

    /** The window's title. */
    heading() {
        return this.root().getByRole('heading', {name: this.title, exact: true});
    }

    /** Wait until the window shows its form. */
    async expectOpen() {
        await expect(this.pathBox()).toBeVisible({timeout: T});
    }

    /** A form-language button at the top ("French"). */
    languageButton(label) {
        return this.root().getByRole('button', {name: label, exact: true});
    }

    /** The "Name" box of a language. */
    nameBox(locale = 'en') {
        return this.root().locator(`#editCategory-title-control-${locale}`);
    }

    /** The "Path" box. */
    pathBox() {
        return this.root().locator('#editCategory-path-control');
    }

    /**
     * A field of the form by the words its label starts with ("Name",
     * "Path", "Description", "Order of articles", "Editorial Assignments"),
     * after the language name a label carries while two languages show
     * ("English Name").
     */
    field(label) {
        return this.root()
            .locator('.pkpFormField')
            .filter({has: this.page.locator('.pkpFormFieldLabel, legend').filter({hasText: new RegExp(`^\\s*(?:[A-Z][a-z]+\\s+)?${esc(label)}\\b`)})})
            .first();
    }

    /**
     * A field label anywhere in the window by its words ("Name in French");
     * with two languages shown a label also carries its language's name
     * before its words ("French Name in French").
     */
    label(text) {
        return this.root().locator('.pkpFormFieldLabel, legend, label').filter({hasText: new RegExp(`\\b${esc(text)}\\b`)}).first();
    }

    /** A field's inline messages (`.pkpFieldError`). */
    fieldErrors(label) {
        return this.field(label).locator('.pkpFieldError');
    }

    /** The error summary beside "Save" ("Please correct 2 errors." and its "Go to" links). */
    errorSummary() {
        return this.root().locator('.pkpFormErrors');
    }

    /** The summary's "Go to {field}" link. */
    goToButton(field) {
        return this.root().getByRole('button', {name: new RegExp(`^Go to ${esc(field)}\\b`)});
    }

    /** The "Order of …" list. */
    orderSelect() {
        return this.root().locator('select[name="sortOption"]');
    }

    /** The "Order of …" list's chosen entry, as shown. */
    async orderChosen() {
        return this.orderSelect().evaluate((el) => {
            const s = /** @type {HTMLSelectElement} */ (el);
            return (s.options[s.selectedIndex] || {text: ''}).text.trim();
        });
    }

    /** An "Editorial Assignments" box by its words ("Assign Eve Editor as Journal editor"). */
    editorBox(label) {
        return this.root().getByRole('checkbox', {name: label, exact: true});
    }

    /** Every "Editorial Assignments" box. */
    editorBoxes() {
        return this.root().locator('input[name^="subEditors"]');
    }

    /** The "Cover Image" file input (hidden under the drop zone). */
    coverInput() {
        return this.root().locator('input[type=file]').first();
    }

    /** The "Alternate text" box that appears once a picture is in. */
    altTextBox() {
        return this.root().getByRole('textbox', {name: /Alternate text/i}).first();
    }

    /** Put a picture in "Cover Image": waits for the upload's answer and the "Alternate text" box. */
    async uploadCover(filePath) {
        const uploaded = this.page.waitForResponse(
            (r) => /temporaryFiles/.test(r.url()) && r.request().method() === 'POST',
            {timeout: T}
        );
        await this.coverInput().setInputFiles(filePath);
        const response = await uploaded;
        await expect(this.altTextBox()).toBeVisible({timeout: T});
        return response;
    }

    /** The "Description" editor's id for a language. */
    descriptionId(locale = 'en') {
        return `editCategory-description-control-${locale}`;
    }

    /** Type into "Description" once its editor is ready (text typed earlier is wiped). */
    async typeDescription(text, locale = 'en') {
        const id = this.descriptionId(locale);
        await this.page.waitForFunction(
            (editorId) => {
                // @ts-ignore
                const editor = window.tinymce && window.tinymce.get(editorId);
                return !!(editor && editor.initialized);
            },
            id,
            {timeout: T}
        );
        const body = this.page.frameLocator(`#${id}_ifr`).locator('body');
        await body.click();
        await body.pressSequentially(text);
        await expect(body).toHaveText(text, {timeout: T});
    }

    /** "Save" at the window's foot. */
    saveButton() {
        return this.root().getByRole('button', {name: 'Save', exact: true});
    }

    /** Press "Save" and return the categories API's answer (accepted or refused). */
    async save() {
        const answered = this.page.waitForResponse(isCategoryWrite, {timeout: T});
        await this.saveButton().click();
        return answered;
    }

    /**
     * Press "Save" on a form the browser refuses before sending anything:
     * counts the category writes fired until `refusal` shows (the bound).
     *
     * @param {import('@playwright/test').Locator} refusal
     */
    async saveRefusedInPlace(refusal) {
        let sent = 0;
        const onRequest = (request) => {
            if (/\/api\/v1\/categories/.test(request.url()) && request.method() === 'POST') sent += 1;
        };
        this.page.on('request', onRequest);
        try {
            await this.saveButton().click();
            await expect(refusal).toBeVisible({timeout: T});
        } finally {
            this.page.off('request', onRequest);
        }
        return sent;
    }

    /** The window's "Close". */
    closeButton() {
        return this.root().getByRole('button', {name: 'Close', exact: true}).first();
    }
}

// ---------------------------------------------------------------------------
// The delete dialog
// ---------------------------------------------------------------------------

class DeleteCategoryDialog extends BasePage {
    /** The dialog "Are you absolutely sure you want to delete "{name}" category?". */
    root() {
        return this.page.getByRole('dialog').filter({hasText: /Are you absolutely sure/});
    }

    /** The dialog's title. */
    heading() {
        return this.root().getByRole('heading').first();
    }

    /** The confirmation box (it has no name, A18). */
    confirmBox() {
        return this.root().locator('input');
    }

    /** "I understand the consequences, delete this category". */
    deleteButton() {
        return this.root().getByRole('button', {name: /I understand the consequences/});
    }

    cancelButton() {
        return this.root().getByRole('button', {name: 'Cancel', exact: true});
    }

    /** The dialog's bulleted points. */
    points() {
        return this.root().getByRole('listitem');
    }

    /**
     * Press "Cancel" and wait for the dialog to go, then past the modal
     * store's close window (an opener pressed within it opens nothing,
     * patterns.md pitfall 4).
     */
    async cancel() {
        await this.cancelButton().click();
        await expect(this.root()).toHaveCount(0, {timeout: T});
        await this.page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 500)));
    }

    /** Press the delete button; returns the answer of the delete. */
    async confirm() {
        const answered = this.page.waitForResponse(isCategoryWrite, {timeout: T});
        await this.deleteButton().click();
        return answered;
    }

    /** The "Category Deleted" dialog that follows. */
    deletedDialog() {
        return this.page.getByRole('dialog', {name: 'Category Deleted'});
    }

    backButton() {
        return this.deletedDialog().getByRole('button', {name: 'Back to Categories', exact: true});
    }
}

// ---------------------------------------------------------------------------
// The category picker and the "Select Categories" window
// ---------------------------------------------------------------------------

class CategoryPicker extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {import('@playwright/test').Locator | import('@playwright/test').Page} [scope]
     *   where the field sits (the Filters window); the page when absent
     */
    constructor(page, scope) {
        super(page);
        this.scope = scope || page;
    }

    /** The field labelled "Categories" (the innermost element carrying the label). */
    field() {
        return this.scope
            .locator('.pkpFormField, .pkpAutosuggest')
            .filter({has: this.page.locator('.pkpFormFieldLabel, legend, label, .pkpFormField__heading').filter({hasText: /^\s*Categories\b/})})
            .last();
    }

    /** The field's own label. */
    label() {
        return this.field().locator('.pkpFormFieldLabel, legend, label, .pkpFormField__heading').filter({hasText: /^\s*Categories\b/}).first();
    }

    /** The line under the label. */
    description() {
        return this.field().locator('.pkpFormField__description').first();
    }

    /** The group heading the field stands under ("Placement"). */
    groupHeading() {
        return this.field()
            .locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " pkpFormGroup ")][1]')
            .locator('.pkpFormGroup__heading, legend, h2, h3')
            .first();
    }

    /** The line of the group the field stands under (on a preprint server "Assign categories to help organize and filter this publication."). */
    groupDescription() {
        return this.field()
            .locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " pkpFormGroup ")][1]')
            .locator('.pkpFormGroup__description')
            .first();
    }

    /** The typing box. */
    typingBox() {
        return this.field().locator('input:not([type=hidden])').first();
    }

    /** The suggestions the box offers now (its own list; a page's native selects are role=option too). */
    options() {
        return this.page.locator('[role=listbox]:visible [role=option]');
    }

    /** Type into the box (replacing what is there). */
    async type(text) {
        const box = this.typingBox();
        await box.click();
        await box.fill('');
        await box.pressSequentially(text, {delay: 30});
    }

    /** Type, then choose the suggestion reading `line` exactly. */
    async choose(text, line) {
        await this.type(text);
        const option = this.options().filter({hasText: whole(line)}).first();
        await expect(option).toBeVisible({timeout: T});
        await option.click();
        await expect(this.removeButton(line)).toBeVisible({timeout: T});
        await this.typingBox().fill('');
    }

    /**
     * Empty the box and close its list. The Escape goes to the box itself:
     * the emptying's input event has just opened the headlessui combobox,
     * whose Escape then calls preventDefault(), so the workflow dialog around
     * the field (a reka layer, which ignores a prevented Escape) stays open.
     * An Escape reaching the page with the combobox closed would close the
     * workflow instead (.reports/flake-s26/esc/diagnosis.md H2).
     */
    async clearTyping() {
        const box = this.typingBox();
        await box.fill('');
        await box.press('Escape');
        await expect(this.options()).toHaveCount(0, {timeout: T});
    }

    /** Every chip's remove button ("Remove {line}"). */
    removeButtons() {
        return this.field().getByRole('button', {name: /^Remove /});
    }

    /** A chip's remove button. */
    removeButton(line) {
        return this.field().getByRole('button', {name: `Remove ${line}`, exact: true});
    }

    /** The lines the chips read, in order. */
    async chipLines() {
        const names = await this.removeButtons().evaluateAll((buttons) =>
            buttons.map((b) => (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim())
        );
        return names.map((n) => n.replace(/^Remove /, ''));
    }

    /** "Select Categories" under the box. */
    selectButton() {
        return this.field().getByRole('button', {name: 'Select Categories', exact: true});
    }

    /**
     * Press "Select Categories" and wait for its window's rows. A press
     * within the modal store's close window of an earlier side window opens
     * nothing (patterns.md pitfall 4), so the press is repeated while no
     * window came, at most three times.
     */
    async openWindow() {
        const window = new SelectCategoriesWindow(this.page);
        for (let attempt = 0; ; attempt++) {
            await this.selectButton().click();
            try {
                await expect(window.rows().first()).toBeVisible({timeout: attempt < 2 ? 5_000 : T});
                return window;
            } catch (error) {
                if (attempt >= 2) throw error;
            }
        }
    }
}

class SelectCategoriesWindow extends BasePage {
    /** The window headed "Select Categories". */
    root() {
        return this.page.getByRole('dialog', {name: 'Select Categories'}).last();
    }

    /** The column "Name". */
    nameHeader() {
        return this.root().getByRole('columnheader', {name: 'Name', exact: true});
    }

    rows() {
        return this.root().locator('tbody tr');
    }

    /** A row by its category's name (a row's text also carries its arrow's name, so match the label). */
    row(name) {
        return this.rows().filter({has: this.page.locator('label').filter({hasText: whole(name)})}).first();
    }

    /** A row's box. */
    box(name) {
        return this.row(name).locator('input[type=checkbox]').first();
    }

    /**
     * Every row as `{name, bold, checked, visible}`, top to bottom, read
     * once the window's table has drawn a row (a read taken before is
     * `[]`, .reports/flake-s26/fixC/diagnosis.md).
     */
    async read() {
        await expect(this.rows().first()).toBeAttached({timeout: T});
        return this.rows().evaluateAll((trs) =>
            trs.map((tr) => {
                const label = tr.querySelector('label') || tr.querySelector('td span');
                const box = /** @type {HTMLInputElement|null} */ (tr.querySelector('input[type=checkbox]'));
                return {
                    name: label ? (label.textContent || '').replace(/\s+/g, ' ').trim() : '',
                    bold: label ? Number(getComputedStyle(label).fontWeight) >= 600 : false,
                    checked: box ? box.checked : null,
                    visible: tr.getClientRects().length > 0,
                };
            })
        );
    }

    /** Press the window's "Save" and wait for it to close. */
    async save() {
        await this.root().getByRole('button', {name: 'Save', exact: true}).click();
        await expect(this.root()).toHaveCount(0, {timeout: T});
    }

    /** Press the window's "Close" and wait for it to close. */
    async close() {
        await this.root().getByRole('button', {name: 'Close', exact: true}).first().click();
        await expect(this.root()).toHaveCount(0, {timeout: T});
    }
}

// ---------------------------------------------------------------------------
// The visitor's side: a category's page, the "Browse" block
// ---------------------------------------------------------------------------

class CategoryPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {{word?: string, locale?: string, testInfo?: import('@playwright/test').TestInfo}} [options]
     *   `word` the address word before "category" ("catalog"; "preprints" on
     *   a preprint server), `locale` a language segment for every address,
     *   `testInfo` (OMP only) switches on the re-open of a dropped answer
     *   (`navigate()`); without it every navigation is a single attempt
     */
    constructor(page, contextPath, {word = 'catalog', locale = '', testInfo = null} = {}) {
        super(page);
        this.contextPath = contextPath;
        this.word = word;
        this.locale = locale;
        this.testInfo = testInfo;
    }

    /**
     * Run one navigation of this page (`goto`, `reload`) and return its
     * response. With `testInfo` set, a navigation the server drops without
     * an answer is run again until it answers, each drop kept as an
     * `app-crash` test annotation and a log line. Why (OMP only): PHP 8.3's
     * OPcache inheritance cache (php-src GH-20469, fixed in 8.4.23+) ends
     * the first category page a `php -S` process renders once an earlier
     * request of that process loaded the press's publication classes in
     * the unlucky order (the catalog, search, scenario seeding, a settings
     * save); the harness respawns the server within a second and the
     * respawned process renders the page (app-changes row 18, U16 T-omp-2).
     *
     * @param {() => Promise<import('@playwright/test').Response|null>} navigation
     * @param {string} what the address, for the annotation
     */
    async navigate(navigation, what) {
        if (!this.testInfo) {
            return navigation();
        }
        const testInfo = this.testInfo;
        let response = null;
        await expect(async () => {
            try {
                response = await navigation();
            } catch (error) {
                const message = String((error && error.message) || error).split('\n')[0];
                if (/ERR_EMPTY_RESPONSE|ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET/.test(message)) {
                    testInfo.annotations.push({type: 'app-crash', description: `no answer for ${what}: ${message}`});
                    console.log(`[U16 ${testInfo.title.split(':')[0]}] no answer for ${what} (GH-20469, app-changes row 18); opened again`);
                }
                throw error;
            }
        }).toPass({timeout: 60_000, intervals: [1_000, 2_000]});
        return response;
    }

    /** A category's address by its path. */
    url(path, {locale} = {}) {
        const lang = locale === undefined ? this.locale : locale;
        return contextAddress(this.contextPath, lang, `/${this.word}/category/${path}`);
    }

    /** Open a category's page and wait for its heading; returns the response. */
    async goto(path, options = {}) {
        const address = this.url(path, options);
        const response = await this.navigate(() => this.page.goto(address), address);
        await expect(this.heading()).toBeVisible({timeout: T});
        return response;
    }

    /** Reload and wait for the heading. */
    async reload() {
        // A dropped answer leaves the browser's error page, so a retry opens
        // the address instead of reloading.
        const address = this.page.url();
        let attempts = 0;
        await this.navigate(() => (attempts++ ? this.page.goto(address) : this.page.reload()), address);
        await expect(this.heading()).toBeVisible({timeout: T});
    }

    /** The page's own part (below the site header). */
    root() {
        return this.page.locator('.page_catalog_category');
    }

    heading() {
        return this.root().getByRole('heading', {level: 1});
    }

    breadcrumb() {
        return this.root().locator('.cmp_breadcrumbs');
    }

    /** The breadcrumb's steps, each without its separator. */
    async crumbs() {
        const texts = await this.breadcrumb().locator('li').allInnerTexts();
        return texts.map((t) => flat(t).replace(/\s*\/\s*$/, ''));
    }

    /** A breadcrumb link by its words. */
    crumbLink(name) {
        return this.breadcrumb().getByRole('link', {name, exact: true});
    }

    /** The breadcrumb's links, in order. */
    crumbLinks() {
        return this.breadcrumb().getByRole('link');
    }

    /** The breadcrumb's last step (the category itself). */
    currentCrumb() {
        return this.breadcrumb().locator('li[aria-current="page"]');
    }

    /** The count line ("3 Items"; "3 Titles" on a press). */
    count() {
        return this.root().locator('.article_count, .monograph_count, .preprint_count').first();
    }

    /** The category's picture. */
    picture() {
        return this.root().locator('.about_section .cover img');
    }

    /** The picture's drawn and natural size, and whether it loaded. */
    async pictureSize() {
        return this.picture().evaluate((el) => {
            const img = /** @type {HTMLImageElement} */ (el);
            return {complete: img.complete, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, width: img.clientWidth, height: img.clientHeight};
        });
    }

    description() {
        return this.root().locator('.about_section .description');
    }

    /** The "Subcategories" part. */
    subcategories() {
        return this.root().locator('nav.subcategories');
    }

    subcategoryLinks() {
        return this.subcategories().getByRole('link');
    }

    /** The listed items' summaries. */
    items() {
        return this.root().locator('.obj_article_summary, .obj_preprint_summary, .obj_monograph_summary');
    }

    /** The listed items' titles. */
    itemTitles() {
        return this.items().locator('.title');
    }

    /** A listed item by its title. */
    item(title) {
        return this.items().filter({has: this.page.locator('.title', {hasText: title})});
    }

    /** A page link under the list by its words ("2", ">"). */
    pageLink(label) {
        return this.root().getByRole('link', {name: label, exact: true});
    }

    /**
     * Open an address expected to answer the bare not-found page: the
     * status, its "404 Not Found" heading (the positive control), and no
     * site header and no link at all.
     */
    async expectBareNotFound(path, options = {}) {
        const address = this.url(path, options);
        const response = await this.navigate(() => this.page.goto(address), address);
        expect(response && response.status(), `${this.url(path, options)} answers 404`).toBe(404);
        await expect(this.page.getByRole('heading', {level: 1})).toHaveText('404 Not Found');
        await expect(this.page.locator('header, .pkp_structure_head')).toHaveCount(0);
        await expect(this.page.locator('a')).toHaveCount(0);
    }
}

class BrowseBlock extends BasePage {
    /** The block in the sidebar. */
    root() {
        return this.page.locator('.pkp_structure_sidebar .block_browse');
    }

    /** The block's heading ("Browse"). */
    title() {
        return this.root().locator('.title').first();
    }

    /** The line "Categories" over the list. */
    categoriesLine() {
        return this.root().locator('.category_header');
    }

    /** Every link of the block. */
    links() {
        return this.root().locator('nav a');
    }

    link(name) {
        return this.root().getByRole('link', {name, exact: true});
    }

    /**
     * The category links as a tree, `[{name, children: [...]}]`, following
     * the block's nested lists from its "Categories" list down.
     */
    async tree() {
        return this.root().evaluate((block) => {
            const walk = (ul) =>
                [...ul.children]
                    .filter((li) => li.tagName === 'LI')
                    .map((li) => {
                        const a = li.querySelector(':scope > a');
                        const sub = li.querySelector(':scope > ul');
                        return {name: a ? (a.textContent || '').replace(/\s+/g, ' ').trim() : '', children: sub ? walk(sub) : []};
                    });
            const list = block.querySelector('.categories_list') || block.querySelector('nav ul');
            return list ? walk(list) : [];
        });
    }

    /** How a link is drawn: its colour and its left bar (once the page's stylesheets are in). */
    async look(name) {
        await this.stylesApplied();
        return this.link(name).evaluate((a) => {
            const s = getComputedStyle(a);
            return {color: s.color, barWidth: s.borderLeftWidth, barStyle: s.borderLeftStyle, barColor: s.borderLeftColor};
        });
    }

    /**
     * The names of the links drawn with a left bar (the marked ones). The
     * mark is the theme's CSS on the server's `li.current`, so the read waits
     * for the page's stylesheets first (`stylesApplied()`): read before the
     * theme's stylesheet lands, no link has a bar and this returns `[]`.
     */
    async markedNames() {
        await this.stylesApplied();
        return this.links().evaluateAll((as) =>
            as
                .filter((a) => {
                    const s = getComputedStyle(a);
                    return s.borderLeftStyle !== 'none' && parseFloat(s.borderLeftWidth) > 0;
                })
                .map((a) => (a.textContent || '').replace(/\s+/g, ' ').trim())
        );
    }

    /**
     * {OMP} A press's sub-list by the line of plain text it opens with
     * ("Categories", "Series"): the list item carrying that line and its
     * links (`li.has_submenu`; no `.category_header` on a press).
     */
    submenu(label) {
        return this.root()
            .locator('li.has_submenu')
            .filter({has: this.page.locator(':scope > ul')})
            .filter({hasText: new RegExp(`^\\s*${esc(label)}\\b`)});
    }

    /** {OMP} The links of a press's sub-list ("Categories"), in order. */
    submenuLinks(label) {
        return this.submenu(label).locator(':scope > ul > li > a');
    }

    /**
     * {OMP} A press's category links as drawn, `[{name, x}]` top to bottom:
     * `x` the link's left edge in pixels, so a sub-category's indent is its
     * `x` against a top-level one's (the theme's CSS: read once the page's
     * stylesheets are in).
     */
    async flatEntries(label = 'Categories') {
        await this.stylesApplied();
        return this.submenuLinks(label).evaluateAll((as) =>
            as.map((a) => ({name: (a.textContent || '').replace(/\s+/g, ' ').trim(), x: Math.round(a.getBoundingClientRect().x)}))
        );
    }
}

// ---------------------------------------------------------------------------
// {OMP} The press's "Browse Block" "Settings" window
// ---------------------------------------------------------------------------

class BrowseBlockSettings extends BasePage {
    /** The window "Browse Block". */
    root() {
        return this.page.getByRole('dialog', {name: 'Browse Block'}).last();
    }

    /**
     * Open the window from Settings › Website › "Plugins": the "Browse
     * Block" row's arrow, then its "Settings" link; waits for the boxes.
     *
     * @param {{openControls: (id: string) => Promise<import('@playwright/test').Locator>}} pluginsTab
     *   the Plugins tab (CustomContentPages.js `PluginsTab`), already open
     */
    async open(pluginsTab) {
        const controls = await pluginsTab.openControls('browseblockplugin');
        await controls.getByRole('link', {name: 'Settings', exact: true}).click();
        await expect(this.box('Categories')).toBeVisible({timeout: T});
        return this;
    }

    /** The group "Browse Possibilities". */
    group() {
        return this.root().getByRole('group', {name: 'Browse Possibilities'});
    }

    /** A box by its words ("New releases", "Categories", "Series"). */
    box(name) {
        return this.root().getByRole('checkbox', {name, exact: true});
    }

    /** Every box of the group as `{name, checked}`, in order. */
    async boxes() {
        return this.group()
            .locator('input[type=checkbox]')
            .evaluateAll((els) =>
                els.map((e) => {
                    const box = /** @type {HTMLInputElement} */ (e);
                    return {name: box.labels && box.labels[0] ? box.labels[0].innerText.trim() : '', checked: box.checked};
                })
            );
    }

    /** Press "Save": waits for the plugin grid's save answer and the window to close; returns the status. */
    async save() {
        const answered = this.page.waitForResponse(
            (r) => r.request().method() === 'POST' && /settings-plugin-grid\/manage/.test(r.url()) && /save=true/.test(r.url()),
            {timeout: T}
        );
        await this.root().getByRole('button', {name: 'Save', exact: true}).click();
        const response = await answered;
        await expect(this.root()).toHaveCount(0, {timeout: T});
        return response.status();
    }
}

// ---------------------------------------------------------------------------
// The workflow page that holds the "Categories" field
// ---------------------------------------------------------------------------

class PublicationEntryPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {{entry?: string, heading?: string}} [options] `entry` the side
     *   menu's page ("Publication Settings", "Catalog Entry", "Preprint
     *   entry"), `heading` the word before it in the page's heading
     *   ("Publication"; "Preprint" on a preprint server)
     */
    constructor(page, contextPath, {entry = 'Publication Settings', heading = 'Publication'} = {}) {
        super(page);
        this.contextPath = contextPath;
        this.entry = entry;
        this.headingWord = heading;
    }

    /** Open a submission's workflow from the editorial dashboard and wait for the side menu's "Publication". */
    async gotoWorkflow(submissionId) {
        await this.page.goto(`/index.php/${this.contextPath}/dashboard/editorial?workflowSubmissionId=${submissionId}`);
        await expect(this.page.getByRole('link', {name: 'Publication', exact: true})).toBeVisible({timeout: T});
    }

    /** The heading of a publication page ("Publication: Catalog Entry"). */
    heading(name = this.entry) {
        return this.page.getByRole('heading', {name: `${this.headingWord}: ${name}`});
    }

    /**
     * Open a page of the open workflow's side menu ("Title & Abstract", this
     * page by default) and wait for its heading; the "Publication" group is
     * opened first when the entry is hidden.
     */
    async openPage(name = this.entry) {
        const link = this.page.getByRole('link', {name, exact: true}).first();
        if (!(await link.isVisible())) {
            await this.page.getByRole('link', {name: 'Publication', exact: true}).click();
        }
        await link.click();
        await expect(this.heading(name)).toBeVisible({timeout: T});
    }

    /** Open the workflow and this page. */
    async goto(submissionId) {
        await this.gotoWorkflow(submissionId);
        await this.openPage();
    }

    /** The page form's "Save". */
    saveButton() {
        return this.page.getByRole('button', {name: 'Save', exact: true});
    }

    /** Press "Save": waits for the publication's write (200) and the form's "Saved"; returns the answer. */
    async save() {
        const saved = this.page.waitForResponse(
            (r) => /\/publications\/\d+/.test(r.url()) && r.request().method() === 'POST',
            {timeout: T}
        );
        await this.saveButton().click();
        const response = await saved;
        await expect(this.page.locator('[role="status"]').filter({hasText: 'Saved'}).first()).toBeVisible({timeout: T});
        return response;
    }
}

module.exports = {
    CategoriesTab,
    CategoryWindow,
    DeleteCategoryDialog,
    CategoryPicker,
    SelectCategoriesWindow,
    CategoryPage,
    BrowseBlock,
    BrowseBlockSettings,
    PublicationEntryPage,
    whole,
};
