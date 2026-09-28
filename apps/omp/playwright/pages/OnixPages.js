// @ts-check
/**
 * @file playwright/pages/OnixPages.js
 *
 * OMP page objects for ONIX metadata & export (spec:
 * docs/specs/U74-onix-metadata-export.md). OMP-only: a journal and a
 * preprint server install no ONIX.
 *
 * Surfaces:
 * - AudiencePage — the editorial view's "Marketing" › "Audience": a Vue
 *   form of five plain `<select>`s (`select[name="audience"]`,
 *   `audienceRangeQualifier`, `audienceRangeFrom`, `audienceRangeTo`,
 *   `audienceRangeExact`, each labelled by `label[for=<id>]`), "Save" (the
 *   submission's PUT, tunnelled as POST) and the footer's "Saved".
 * - RepresentativesPage — "Marketing" › "Representatives": the legacy
 *   category grid `div[id^="component-grid-catalogentry-representativesgrid"]`,
 *   one `tbody.category_grid_body` per group (its first `tr.gridRow` the
 *   group's label "Agents" / "Suppliers", then one `tr.gridRow.has_extras`
 *   per representative with the name and the role in `span.label`); an
 *   empty group shows the `tbody` right after it ("No Items"). A row's
 *   arrow (`a.show_extras`) opens its control line (`<row id>-control-row`).
 * - RepresentativeWindow — "Add Representative" / "Edit":
 *   `form#representativeForm` (radios `isSupplier` 0/1, `agentRole`,
 *   `supplierRole`, `name`, `representativeIdType`, `representativeIdValue`,
 *   `phone`, `email`, `url`); a refusal in the page is `label.error[for=<id>]`.
 * - SalesRightsWindow, MarketWindow — the format window's "Metadata" tab's
 *   "Add Sales Rights" (`form#addSalesRightsForm`) and "Add Market"
 *   (`form#marketForm`) and their rows' "Edit". The tab and its lists are
 *   `MetadataTab` in PublicationFormatPages.js (`LISTS.salesRights`,
 *   `LISTS.markets`).
 * - OnixToolPage — Tools › "ONIX 3.0 Monograph Export Plugin"
 *   (`management/importexport/plugin/Onix30ExportPlugin`): the reminder
 *   while the press's ONIX details are incomplete, otherwise the "Export"
 *   tab (`#export-tab`) with its "Monographs" list, the validation box,
 *   "Select All" and "Export Submissions".
 * - onixProducts() — a Native XML export file's ONIX products, read with
 *   the browser's DOMParser, one tree per publication format.
 *
 * Every window is a dialog found by the form it holds (the format window
 * and a list row's "Edit" window share the title "Edit"), read by CSS so
 * it stays readable under a stacked confirmation. A browser confirm() or
 * alert() is answered through `watchDialogs(page)` (PublicationFormatPages).
 * DOM shapes: the U74 claim checks (`.reports/U74/screen-notes.md`) and the
 * test author's probes (`.reports/U74/tomp/`, 2026-09-29).
 */
const {expect} = require('@playwright/test');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {ToolPage, SubmissionExportList} = require('../../../../shared/playwright/pages/ImportExportPages.js');
const {exactly, pastCloseWindow, DeleteDialog} = require('./PublicationFormatPages.js');
const {waitForJQueryIdle} = require('../../../../shared/playwright/support/legacy.js');

const T = 30_000;

/** The screens' verbatim words (spec Fields and Rules). */
const TEXT = {
    audienceHeading: 'Marketing: Audience',
    representativesHeading: 'Marketing: Representatives',
    required: 'This field is required.',
    requiredNote: 'Required fields are marked with an asterisk: *',
    emailRefused: 'Please enter a valid email address.',
    urlRefused: 'Please enter a valid URL.',
    repAdded: 'Representative added.',
    repEdited: 'Representative edited.',
    repRemoved: 'Representative removed.',
    repInUse:
        'You can not delete this representative because they are assigned to the market metadata for one or more publication formats for this submission.',
    rightsAdded: 'Sales Rights added.',
    rightsEdited: 'Sales Rights edited.',
    rightsRemoved: 'Sales Rights removed.',
    marketAdded: 'Market added.',
    marketEdited: 'Market edited.',
    rowHelp:
        'Check this box to use this Sales Rights entry as a catch-all for your format. Countries and regions need not be chosen in this case.',
    agentHelp: 'You may assign an agent to represent you in this defined territory. It is not required.',
    formChanged: 'The data on this form has changed. Do you wish to continue without saving?',
    onixTool: 'ONIX 3.0 Monograph Export Plugin',
    onixMissing: 'This press is missing some required information. Please go to Press Settings and fill in the missing details.',
    validation: 'Validate XML before the export and registration.',
};

/** The "Audience" page's five lists: form field name → label. */
const AUDIENCE = {
    audience: 'Audience',
    audienceRangeQualifier: 'Audience Range Qualifier',
    audienceRangeFrom: 'Audience Range (from)',
    audienceRangeTo: 'Audience Range (to)',
    audienceRangeExact: 'Audience Range (exact)',
};

/** The agent roles, in list order (Fields, the representative window). */
const AGENT_ROLES = ['Exclusive sales agent (05)', 'Local publisher (07)', 'Non-exclusive sales agent (06)', 'Sales agent (08)'];

function esc(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The texts of a `<select>`'s options, in order ("" for the empty choice). */
function optionTexts(select) {
    return select.locator('option').evaluateAll((os) => os.map((o) => (o.textContent || '').replace(/\s+/g, ' ').trim()));
}

/** A select's chosen options' texts (none: []), for a settled `expect.poll`. */
function chosenTexts(select) {
    return select.evaluate((s) => [.../** @type {HTMLSelectElement} */ (s).selectedOptions].map((o) => (o.textContent || '').trim()));
}

/**
 * The labels of a legacy form, top to bottom: options, scripts and the
 * required-marks left out.
 *
 * @param {import('@playwright/test').Locator} form
 */
function formLabels(form) {
    return form.evaluate((f) => {
        const copy = /** @type {HTMLElement} */ (f.cloneNode(true));
        copy.querySelectorAll('option, script, .req, label.error').forEach((n) => n.remove());
        return [...copy.querySelectorAll('label')].map((n) => (n.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    });
}

/**
 * Open a legacy grid row's arrow (once) and press one of its entries.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} row
 * @param {string} label "Edit" | "Delete"
 */
async function pressRowEntry(page, row, label) {
    await expect(row).toHaveCount(1, {timeout: T});
    const id = await row.getAttribute('id');
    const controls = page.locator(`[id="${id}-control-row"]`);
    if (!(await controls.isVisible())) {
        await row.locator('a.show_extras').click();
    }
    await expect(controls).toBeVisible({timeout: T});
    await controls.locator('a:visible').filter({hasText: exactly(label)}).click();
}

/** A legacy grid row's cells, the arrow's screen-reader text and scripts left out. */
function rowCells(row) {
    return row.locator(':scope > td').evaluateAll((tds) =>
        tds.map((td) => {
            const copy = /** @type {HTMLElement} */ (td.cloneNode(true));
            copy.querySelectorAll('script, .pkp_screen_reader').forEach((n) => n.remove());
            return (copy.textContent || '').replace(/\s+/g, ' ').trim();
        })
    );
}

// ---------------------------------------------------------------------------
// "Marketing" › "Audience"
// ---------------------------------------------------------------------------

class AudiencePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {{appContext?: any}} [options]
     */
    constructor(page, contextPath, options = {}) {
        this.page = page;
        this.frame = new WorkflowPage(page, contextPath, options);
    }

    /** Open the book's "Audience" page by address in the editorial view. */
    async gotoEditorial(submissionId) {
        await this.frame.gotoEditorial(submissionId, {menuKey: 'marketing_audience'});
        await this.expectLoaded();
    }

    /** From an open workflow: the side menu's "Marketing" › "Audience". */
    async openFromMenu() {
        await this.frame.select('Audience', TEXT.audienceHeading);
        await this.expectLoaded();
    }

    /** The heading, then the form's five lists and "Save". */
    async expectLoaded() {
        await this.frame.expectHeading(TEXT.audienceHeading);
        await expect(this.list('audienceRangeExact')).toBeVisible({timeout: T});
        await expect(this.saveButton()).toBeVisible({timeout: T});
    }

    form() {
        return this.frame.primaryColumn().locator('form');
    }

    /** A list by its field name (`AUDIENCE`). */
    list(name) {
        return this.form().locator(`select[name="${name}"]`);
    }

    /** The label of a list. */
    label(name) {
        return this.form().locator(`label[for="audience-${name}-control"]`);
    }

    /** The form's labels, top to bottom. */
    labels() {
        return this.form().locator('label.pkpFormFieldLabel');
    }

    /** Choose an option of a list by its text. */
    async choose(name, option) {
        await this.list(name).selectOption({label: option});
    }

    /** Expect a list to read `option`, or nothing chosen when `option` is ''. */
    async expectChosen(name, option) {
        if (option === '') {
            await expect(this.list(name)).toHaveValue('', {timeout: T});
            await expect.poll(() => chosenTexts(this.list(name)), {timeout: T}).toEqual([]);
            return;
        }
        await expect(this.list(name).locator('option:checked')).toHaveText(exactly(option), {timeout: T});
    }

    saveButton() {
        return this.form().getByRole('button', {name: 'Save', exact: true});
    }

    /** "Saved" beside the button. */
    savedStatus() {
        return this.form().locator('.pkpFormPage__status', {hasText: 'Saved'});
    }

    /** Press "Save": the submission's write answers and "Saved" shows. */
    async save() {
        const saved = this.page.waitForResponse(
            (r) => /\/api\/v1\/submissions\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST',
            {timeout: T}
        );
        await this.saveButton().click();
        const response = await saved;
        expect(response.status(), 'the "Audience" save answers 200').toBe(200);
        await expect(this.savedStatus()).toBeVisible({timeout: T});
    }

    /** Reload the page and wait for its lists. */
    async reload() {
        await this.page.reload();
        await this.frame.expectOpen();
        await this.expectLoaded();
    }
}

// ---------------------------------------------------------------------------
// "Marketing" › "Representatives"
// ---------------------------------------------------------------------------

class RepresentativesPage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {{appContext?: any}} [options]
     */
    constructor(page, contextPath, options = {}) {
        this.page = page;
        this.frame = new WorkflowPage(page, contextPath, options);
    }

    /** Open the book's "Representatives" page by address in the editorial view. */
    async gotoEditorial(submissionId) {
        await this.frame.gotoEditorial(submissionId, {menuKey: 'marketing_representatives'});
        await this.expectLoaded();
    }

    /** From an open workflow: the side menu's "Marketing" › "Representatives". */
    async openFromMenu() {
        await this.frame.select('Representatives', TEXT.representativesHeading);
        await this.expectLoaded();
    }

    /** The heading, then the table drawn under it with both groups. */
    async expectLoaded() {
        await this.frame.expectHeading(TEXT.representativesHeading);
        await expect(this.gridHeading()).toHaveText(exactly('Representatives'), {timeout: T});
        await expect(this.groupBody('Agents')).toHaveCount(1, {timeout: T});
        await expect(this.groupBody('Suppliers')).toHaveCount(1, {timeout: T});
    }

    /** Reload and wait for the table again. */
    async reload() {
        await this.page.reload();
        await this.frame.expectOpen();
        await this.expectLoaded();
    }

    grid() {
        return this.page.locator('div[id^="component-grid-catalogentry-representativesgrid"]').first();
    }

    gridHeading() {
        return this.grid().locator('.header h4');
    }

    /** "Add Representative" at the table's top right. */
    addLink() {
        return this.grid().locator('.header a').filter({hasText: exactly('Add Representative')});
    }

    columnHeads() {
        return this.grid().locator('thead th');
    }

    /** A group's body ("Agents", "Suppliers"). */
    groupBody(group) {
        return this.grid()
            .locator('tbody.category_grid_body')
            .filter({has: this.page.locator('tr.gridRow:not(.has_extras) span.label', {hasText: exactly(group)})});
    }

    /** The "No Items" line under an empty group. */
    groupEmpty(group) {
        return this.groupBody(group).locator('xpath=following-sibling::tbody[1]').filter({visible: true});
    }

    /** A group's representative rows, in list order. */
    rows(group) {
        return this.groupBody(group).locator('tr.gridRow.has_extras');
    }

    /** A group's names, in list order (for `toHaveText`). */
    names(group) {
        return this.rows(group).locator('td.first_column span.label');
    }

    /** A representative's row in a group, by the exact name. */
    row(group, name) {
        return this.rows(group).filter({has: this.page.locator('td.first_column span.label', {hasText: exactly(name)})});
    }

    /** A representative's role cell in a group. */
    roleCell(group, name) {
        return this.row(group, name).locator(':scope > td').nth(1);
    }

    /** Expect `name` listed under `group` reading `role`. */
    async expectListed(group, name, role) {
        await expect(this.row(group, name)).toHaveCount(1, {timeout: T});
        await expect.poll(() => rowCells(this.row(group, name)), {timeout: T}).toEqual([name, role]);
    }

    /** Press "Add Representative": its window, open. */
    async openAdd() {
        await this.addLink().click();
        const win = new RepresentativeWindow(this.page);
        await win.expectOpen();
        return win;
    }

    /** A row's arrow › "Edit": its window, open. */
    async openEdit(group, name) {
        await pressRowEntry(this.page, this.row(group, name), 'Edit');
        const win = new RepresentativeWindow(this.page);
        await win.expectOpen();
        return win;
    }

    /** A row's arrow › "Delete": the confirmation. */
    async openDelete(group, name) {
        await pressRowEntry(this.page, this.row(group, name), 'Delete');
        const dialog = new DeleteDialog(this.page);
        await dialog.expectOpen();
        return dialog;
    }
}

/** "Add Representative" and a representative's "Edit". */
class RepresentativeWindow {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
    }

    dialog() {
        return this.page.locator('[role="dialog"]').filter({has: this.page.locator('form#representativeForm')});
    }

    /** The window's title ("Add Representative", "Edit"). */
    title() {
        return this.dialog().locator('h1').first();
    }

    form() {
        return this.page.locator('form#representativeForm:visible');
    }

    async expectOpen() {
        await expect(this.nameBox()).toBeVisible({timeout: T});
        await expect(this.okButton()).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** The form's labels, top to bottom. */
    labels() {
        return formLabels(this.form());
    }

    /** A "Representative Type" radio: 'agent' | 'supplier'. */
    typeRadio(type) {
        return this.form().locator(`input[name="isSupplier"][value="${type === 'supplier' ? 1 : 0}"]`);
    }

    /** Click a "Representative Type" choice. */
    async chooseType(type) {
        await this.typeRadio(type).click();
        await expect(this.typeRadio(type)).toBeChecked();
    }

    /** The "Role" list of a type: 'agent' | 'supplier'. */
    roleList(type) {
        return this.form().locator(`select[name="${type}Role"]`);
    }

    /** The role list's option texts, in order. */
    roleOptions(type) {
        return optionTexts(this.roleList(type));
    }

    nameBox() {
        return this.form().locator('input[name="name"]');
    }

    idTypeList() {
        return this.form().locator('select[name="representativeIdType"]');
    }

    idValueBox() {
        return this.form().locator('input[name="representativeIdValue"]');
    }

    phoneBox() {
        return this.form().locator('input[name="phone"]');
    }

    emailBox() {
        return this.form().locator('input[name="email"]');
    }

    websiteBox() {
        return this.form().locator('input[name="url"]');
    }

    /** "Required fields are marked with an asterisk: *" (a paragraph of the window, outside the form). */
    requiredNote() {
        return this.dialog().getByText(TEXT.requiredNote, {exact: true});
    }

    /** The refusal under a field (jQuery validation's `label.error[for=<id>]`). */
    async errorUnder(field) {
        const id = await field.getAttribute('id');
        return this.form().locator(`label.error[for="${id}"]`);
    }

    okButton() {
        return this.form().getByRole('button', {name: 'OK', exact: true});
    }

    cancelLink() {
        return this.form().getByRole('link', {name: 'Cancel', exact: true});
    }

    /** Press "OK" on a valid form: the save answers, the window closes. */
    async ok() {
        const saved = this.page.waitForResponse(
            (r) => /representatives-grid\/update-representative/.test(r.url()) && r.request().method() === 'POST',
            {timeout: T}
        );
        await this.okButton().click();
        const response = await saved;
        expect(response.ok(), `update-representative answered ${response.status()}`).toBe(true);
        await this.expectClosed();
    }

    async cancel() {
        await this.cancelLink().click();
        await this.expectClosed();
    }

    async expectClosed() {
        await expect(this.dialog()).toHaveCount(0, {timeout: T});
        await pastCloseWindow(this.page);
    }
}

// ---------------------------------------------------------------------------
// The "Metadata" tab's sales-rights and market windows
// ---------------------------------------------------------------------------

/** What the sales-rights and market windows share. */
class ListWindow {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} formId
     * @param {RegExp} saveUrl
     */
    constructor(page, formId, saveUrl) {
        this.page = page;
        this.formId = formId;
        this.saveUrl = saveUrl;
    }

    dialog() {
        return this.page.locator('[role="dialog"]').filter({has: this.page.locator(`form#${this.formId}`)});
    }

    /** The window's title ("Add Sales Rights", "Add Market", "Edit"). */
    title() {
        return this.dialog().locator('h1').first();
    }

    form() {
        return this.page.locator(`form#${this.formId}:visible`);
    }

    /** The form's labels, top to bottom. */
    labels() {
        return formLabels(this.form());
    }

    /** "Required fields are marked with an asterisk: *" (a refused save adds a second). */
    requiredNotes() {
        return this.dialog().getByText(TEXT.requiredNote, {exact: true});
    }

    /** The countries or regions list: `which` is 'countries' | 'regions', `side` 'Included' | 'Excluded'. */
    territoryList(which, side) {
        return this.form().locator(`select[name="${which}${side}[]"]`);
    }

    okButton() {
        return this.form().getByRole('button', {name: 'OK', exact: true});
    }

    cancelLink() {
        return this.form().getByRole('link', {name: 'Cancel', exact: true});
    }

    /** The window's close arrow. */
    closeArrow() {
        return this.dialog().locator('button.DialogClose').first();
    }

    async expectOpen() {
        await expect(this.okButton()).toBeVisible({timeout: T});
        await expect(this.territoryList('countries', 'Included').locator('option').nth(1)).toBeAttached({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** Press "OK" on a valid form: the save answers, the window closes. */
    async ok() {
        const saved = this.page.waitForResponse((r) => this.saveUrl.test(r.url()) && r.request().method() === 'POST', {timeout: T});
        await this.okButton().click();
        const response = await saved;
        expect(response.ok(), `the window's save answered ${response.status()}`).toBe(true);
        await this.expectClosed();
    }

    /**
     * Press "OK" on a form the server refuses: it answers 200 with the form
     * again, which replaces the window's content; resolves once that answer
     * has landed, the window still open.
     */
    async okRefusedByServer() {
        const answered = this.page.waitForResponse((r) => this.saveUrl.test(r.url()) && r.request().method() === 'POST', {timeout: T});
        await this.okButton().click();
        const response = await answered;
        expect(response.ok(), `the window's save answered ${response.status()}`).toBe(true);
        await waitForJQueryIdle(this.page);
        await expect(this.dialog()).toHaveCount(1);
        await expect(this.okButton()).toBeVisible({timeout: T});
    }

    async cancel() {
        await this.cancelLink().click();
        await this.expectClosed();
    }

    async expectClosed() {
        await expect(this.dialog()).toHaveCount(0, {timeout: T});
        await pastCloseWindow(this.page);
    }
}

/** "Add Sales Rights" and a sales-rights row's "Edit". */
class SalesRightsWindow extends ListWindow {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page, 'addSalesRightsForm', /sales-rights-grid\/update-rights/);
    }

    typeList() {
        return this.form().locator('select[name="type"]');
    }

    /** The "Sales Rights Type" option texts, in order. */
    typeOptions() {
        return optionTexts(this.typeList());
    }

    /** The chosen type's text. */
    chosenType() {
        return this.typeList().locator('option:checked');
    }

    rowBox() {
        return this.form().locator('input[name="ROWSetting"]');
    }
}

/** "Add Market" and a market row's "Edit". */
class MarketWindow extends ListWindow {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page, 'marketForm', /markets-grid\/update-market/);
    }

    dateBox() {
        return this.form().locator('input[name="date"]');
    }

    dateFormatList() {
        return this.form().locator('select[name="dateFormat"]');
    }

    dateRoleList() {
        return this.form().locator('select[name="dateRole"]');
    }

    agentList() {
        return this.form().locator('select[name="agentId"]');
    }

    supplierList() {
        return this.form().locator('select[name="supplierId"]');
    }

    priceBox() {
        return this.form().locator('input[name="price"]');
    }

    currencyList() {
        return this.form().locator('select[name="currencyCode"]');
    }

    priceTypeList() {
        return this.form().locator('select[name="priceTypeCode"]');
    }

    taxRateList() {
        return this.form().locator('select[name="taxRateCode"]');
    }

    taxTypeList() {
        return this.form().locator('select[name="taxTypeCode"]');
    }

    discountBox() {
        return this.form().locator('input[name="discount"]');
    }

    /** A list's chosen option (for `toHaveText`). */
    chosen(list) {
        return list.locator('option:checked');
    }

    /** Option texts of a list, in order. */
    options(list) {
        return optionTexts(list);
    }

    /** The refusal under a box (`label.error[for=<id>]`). */
    async errorUnder(box) {
        const id = await box.getAttribute('id');
        return this.form().locator(`label.error[for="${id}"]`);
    }
}

/**
 * The "Metadata" tab's list rows, as `MetadataTab` (PublicationFormatPages)
 * holds them, read and pressed here.
 */
const ListRows = {
    /** A sales-rights row by its type's text. */
    rightsRow(meta, type) {
        return meta.listRows('salesRightsGridContainer').filter({
            has: meta.page.locator('td:first-child span.label', {hasText: exactly(type)}),
        });
    },

    /** The "Rest of World?" tick of a sales-rights row. */
    rowTick(row) {
        return row.locator(':scope > td').nth(1).locator('.checked');
    },

    /** A market row by its "Representatives" cell. */
    marketRow(meta, representatives) {
        return meta.listRows('marketsGridContainer').filter({
            has: meta.page.locator(':scope > td:nth-child(2)', {hasText: exactly(representatives)}),
        });
    },

    /** A list's rows' cells (polled by the caller). */
    cells: rowCells,

    /** A row's arrow › "Edit": the window (`SalesRightsWindow` or `MarketWindow`), open. */
    async openEdit(page, row, Win) {
        await pressRowEntry(page, row, 'Edit');
        const win = new Win(page);
        await win.expectOpen();
        return win;
    },

    /** A row's arrow › "Delete": the confirmation. */
    async openDelete(page, row) {
        await pressRowEntry(page, row, 'Delete');
        const dialog = new DeleteDialog(page);
        await dialog.expectOpen();
        return dialog;
    },
};

/** Press a list's add link ("Add Sales Rights", "Add Market") and return its window, open. */
async function openAddSalesRights(meta) {
    await meta.listAddLink('salesRightsGridContainer', 'Add Sales Rights').click();
    const win = new SalesRightsWindow(meta.page);
    await win.expectOpen();
    return win;
}

async function openAddMarket(meta) {
    await meta.listAddLink('marketsGridContainer', 'Add Market').click();
    const win = new MarketWindow(meta.page);
    await win.expectOpen();
    return win;
}

// ---------------------------------------------------------------------------
// Tools › "ONIX 3.0 Monograph Export Plugin"
// ---------------------------------------------------------------------------

/** The "Export" tab's "Monographs" list: the Native list's shape in `#export-tab`. */
class OnixExportList extends SubmissionExportList {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page, 'Export Submissions');
        this.panel = page.locator('#export-tab');
    }
}

class OnixToolPage extends ToolPage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page, contextPath, 'Onix30ExportPlugin', TEXT.onixTool);
        this.list = new OnixExportList(page);
    }

    /** Open the page by address and wait for its heading alone (the reminder page has no tab). */
    async open() {
        await this.page.goto(this.url());
        await expect(this.heading()).toBeVisible({timeout: T});
    }

    /** The page's content under the heading. */
    contentPanel() {
        return this.page.locator('.app__contentPanel');
    }

    /** "Press Settings" in the reminder. */
    pressSettingsLink() {
        return this.contentPanel().getByRole('link', {name: 'Press Settings', exact: true});
    }

    /** Every tab of the page (none while the details are incomplete). */
    anyTab() {
        return this.contentPanel().locator('[role="tab"]');
    }

    /** Every list panel of the page. */
    anyList() {
        return this.contentPanel().locator('.listPanel');
    }

    /**
     * Expect the reminder alone: the content reads the sentence and
     * nothing else, with no tab and no list (the heading read first, so
     * the absences are read on a drawn page).
     */
    async expectReminderOnly() {
        await expect(this.heading()).toBeVisible({timeout: T});
        await expect(this.contentPanel()).toHaveText(TEXT.onixMissing, {timeout: T});
        await expect(this.pressSettingsLink()).toBeVisible();
        await expect(this.anyTab()).toHaveCount(0);
        await expect(this.anyList()).toHaveCount(0);
    }

    /** "Validate XML before the export and registration." */
    validationBox() {
        return this.page.locator('#export-tab input[name="validation"]');
    }

    validationLabel() {
        return this.page.locator('#export-tab label').filter({has: this.page.locator('input[name="validation"]')});
    }
}

// ---------------------------------------------------------------------------
// A Native XML file's ONIX products
// ---------------------------------------------------------------------------

/**
 * @typedef {{n: string, t: string, c: OnixNode[]}} OnixNode
 */

/**
 * Read a Native XML export file in the browser: one entry per publication
 * format of the file, by the format's name, holding its ONIX products as
 * trees (`{n: local name, t: own text, c: children}`), namespaces dropped.
 *
 * @param {import('@playwright/test').Page} page any open page (the parser is the browser's)
 * @param {string} xml
 * @returns {Promise<Record<string, OnixNode[]>>}
 */
async function onixProducts(page, xml) {
    return page.evaluate((text) => {
        const doc = new DOMParser().parseFromString(text, 'application/xml');
        const tree = (el) => ({
            n: el.localName,
            t: el.children.length ? '' : (el.textContent || '').trim(),
            c: [...el.children].map(tree),
        });
        /** @type {Record<string, any[]>} */
        const out = {};
        for (const format of doc.getElementsByTagNameNS('*', 'publication_format')) {
            const name = [...format.children]
                .filter((k) => k.localName === 'name')
                .map((k) => (k.textContent || '').trim())
                .join(' ');
            out[name] = [...format.children].filter((k) => k.localName === 'Product').map(tree);
        }
        return out;
    }, xml);
}

/** The descendants of a node named `name`, depth first. */
function descendants(node, name) {
    const out = [];
    const walk = (n) => {
        for (const k of n.c) {
            if (k.n === name) out.push(k);
            walk(k);
        }
    };
    walk(node);
    return out;
}

/** The texts of a node's descendants named `name`. */
function texts(node, name) {
    return descendants(node, name).map((k) => k.t);
}

/** A node's direct children named `name`. */
function children(node, name) {
    return node.c.filter((k) => k.n === name);
}

module.exports = {
    TEXT,
    AUDIENCE,
    AGENT_ROLES,
    esc,
    optionTexts,
    chosenTexts,
    pressRowEntry,
    rowCells,
    AudiencePage,
    RepresentativesPage,
    RepresentativeWindow,
    SalesRightsWindow,
    MarketWindow,
    ListRows,
    openAddSalesRights,
    openAddMarket,
    OnixExportList,
    OnixToolPage,
    onixProducts,
    descendants,
    texts,
    children,
};
