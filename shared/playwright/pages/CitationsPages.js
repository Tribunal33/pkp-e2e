// @ts-check
/**
 * @file shared/playwright/pages/CitationsPages.js
 *
 * Page objects for the Citations & references feature (spec:
 * docs/specs/U42-citations-and-references.md), shared by the OJS, OMP and
 * OPS suites. App-neutral (PRINCIPLES M2): the one per-app string, the
 * Publication area's name ("Publication" on a journal and a press,
 * "Preprint" on a preprint server), comes from the shared `WorkflowPage`
 * frame's `labels.publicationGroup` / `publicationHeading`, which the suite
 * passes in.
 *
 * Surfaces:
 * - ReferencesPage — the workflow's "References" page: the "Add" box and
 *   its button, "Saved", "Delete all references", "Reprocess all
 *   references", the lookup heading and text, the progress box, the
 *   "Structured References" table with its line, search box, "Expand All"
 *   header, rows (text, DOI link, expander, small-print raw text) and row
 *   "More Actions" menus, and the two confirmations.
 * - EditCitationPanel — the "Edit citation" side panel: "Edit Raw
 *   Citation" and (lookup on) the structured fields and the Author
 *   Information rows; the refused save and the bounded save.
 * - DataCitationsTable — the Data Citations table wherever it is mounted:
 *   the workflow's "Data" page, the wizard's Details › "Data" section, the
 *   Reviewer's "View All Submission Details" window (pass that window as
 *   the scope). Top controls, rows, row menus, ordering mode, the delete
 *   confirmation.
 * - DataCitationPanel — "Add Data Citation" / "Edit Data Citation" /
 *   "View Data Citation": the fields, Creators rows, the refused and the
 *   bounded save, "Close".
 * - WizardCitations — the submission wizard's Details-step "References"
 *   box and "Data" section, and the Review step's "References" and "Data
 *   Citations" items.
 * - landingReferences — the published item's "References" block.
 *
 * DOM facts (lib/ui-library src/managers/CitationManager/*,
 * DataCitationManager/*, components/Table/*; lib/pkp
 * templates/submission/review-details.tpl; confirmed live 2026-09-24 by
 * the U42 claim check, `.reports/U42/screen-notes.md`, and the OJS suite):
 * - both tables are `PkpTable`s carrying `aria-label` ("Structured
 *   References", "Data Citations"); they are read by that attribute through
 *   CSS, because a closed side panel leaves the workflow dialog aria-hidden
 *   for a beat (patterns.md pitfall 4) and a role read taken then finds
 *   nothing; an empty table is one row with the empty text;
 * - a row's first cell holds what the row shows; a references row's
 *   second cell holds the expander (a button named "Collapse" in both
 *   states, zero-size on a row with nothing to expand, A16), its third the
 *   "More Actions" menu, hidden (`v-show`) for a viewer who may not edit;
 * - row menus are headlessui menus portalled to the document root; a menu
 *   is closed by pressing its own button again, never Escape, which can
 *   close the whole workflow dialog (screen notes ccK2, ccK4);
 * - with lookup on and a structured reference not processed (always, on a
 *   test install), the page refetches the publication every 7 s and the
 *   rows re-render: an open menu's item can detach, so a menu action is
 *   retried once from a fresh open;
 * - the side panels are dialogs named by their title; the field messages
 *   are `.pkpFieldError`; the foot's "Please correct one error." is a
 *   substring of its element; the author rows of both panels are
 *   `.pkpFormField--authors tbody tr` holding `input[name=givenName]`,
 *   `familyName`, `orcid` (an empty table carries one text-only row).
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');

/** Strings the spec quotes (Fields & validation, Rules 3–24). */
const TEXT = {
    addHelp:
        'Enter each reference on a new line so that they can be individually processed. You can add one or multiple references at a time.',
    wizardHelp: 'Enter each reference on a new line so that they can be extracted and recorded separately.',
    required: 'This field is required.',
    notValidString: 'This is not a valid string.',
    oneError: 'Please correct one error.',
    tableLine: 'The above references have been organised here in a structured format.',
    emptyReferences: 'The citations list is empty, please add citations above.',
    deleteQuestion: 'Are you sure you wish to delete this item? This action cannot be undone.',
    deleteAllQuestion:
        "This will remove all references currently listed. You'll need to re-enter and process your citations again if you continue.",
    lookupText:
        'Structuring and Metadata Lookup is enabled for this Journal. The system will process your references and retrieve DOIs and other metadata from external sources. This may take some time, but you can continue working on your submission and return to this page later to view the updated structured citations.',
    lookupTextStart: 'Structuring and Metadata Lookup is enabled',
    dataLine:
        'Add formal data citations, ensuring datasets are properly credited and appear alongside other references in the publication.',
    emptyData: 'No data citations have been added.',
    wizardDataLine: 'Information about the research data associated with your submission.',
    noneProvided: 'None provided',
    wizardProblems:
        'There are one or more problems that need to be fixed before you can submit. Please review the information below and make the requested changes.',
    fourDigits: 'This must be 4 digits long.',
    orcidInvalid:
        'The ORCID iD you specified is invalid. Please include the full URI (e.g. "https://orcid.org/0000-0002-1825-0097").',
};
exports.CITATIONS_TEXT = TEXT;

/** The data citation panel's "Relationship type" choices, by stored value (Fields & validation). */
const RELATIONSHIP = {
    supporting: 'Supporting data without specifying whether they were generated or analyzed (supporting).',
    generated: 'Supporting data that were generated for the study (generated).',
    analyzed: 'Supporting data that were analyzed but not generated for the study (analyzed).',
    'non-analyzed': 'Referenced data that were neither generated nor analyzed for the study (non-analyzed).',
};
exports.RELATIONSHIP = RELATIONSHIP;

/** A citations/data-citations write answering OK (useFetch tunnels PUT and DELETE through POST). */
function apiWrite(page, pattern) {
    return page.waitForResponse(
        (r) => pattern.test(r.url().split('?')[0]) && r.request().method() === 'POST' && r.ok(),
        {timeout: 30_000}
    );
}

/** A confirmation dialog found by its question (reka-ui; patterns.md pitfall 8). */
function confirmation(page, question) {
    return page.getByRole('dialog').filter({hasText: question});
}

/**
 * Open a row's "More Actions" menu and press an item; when the table
 * re-renders under the open menu (a refetch), the item detaches: open the
 * menu once more and press it again.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} row
 * @param {string} action
 */
async function pressRowAction(page, row, action) {
    for (let attempt = 1; ; attempt++) {
        await row.getByRole('button', {name: 'More Actions'}).click();
        const item = page.getByRole('menuitem', {name: action, exact: true});
        try {
            await expect(item).toBeVisible({timeout: 10_000});
            await item.click({timeout: 10_000});
            return;
        } catch (error) {
            if (attempt >= 2) {
                throw error;
            }
            // A menu left open would swallow the next press: close it by
            // pressing outside it (never Escape, screen notes ccK2).
            if (await page.getByRole('menuitem').count()) {
                await page.mouse.click(2, 2);
            }
        }
    }
}

/**
 * Open a row's menu and return its items (read them with `toHaveText`);
 * close it with `closeRowMenu`.
 */
async function openRowMenu(page, row) {
    await row.getByRole('button', {name: 'More Actions'}).click();
    const items = page.getByRole('menuitem');
    await expect(items.first()).toBeVisible({timeout: 30_000});
    return items;
}

/** Close an open row menu by pressing its own button again (never Escape). */
async function closeRowMenu(page, row) {
    await row.getByRole('button', {name: 'More Actions'}).click();
    await expect(page.getByRole('menuitem')).toHaveCount(0, {timeout: 30_000});
}

/**
 * Assert that the given locators stand on screen in this order, top to
 * bottom (each one's top edge below the previous one's).
 *
 * @param {import('@playwright/test').Locator[]} locators
 */
async function expectTopToBottom(locators) {
    for (const locator of locators) {
        await expect(locator).toBeVisible({timeout: 30_000});
    }
    // The whole read of the boxes repeats until the order holds: a list
    // still drawing (a save's refetch) can move an element between two
    // reads of one pass (.reports/flake-s26/fixC/diagnosis.md).
    await expect(async () => {
        let previous = -Infinity;
        for (const locator of locators) {
            const box = await locator.boundingBox({timeout: 2_000});
            expect(box, 'an element with a layout box').not.toBeNull();
            expect(box.y).toBeGreaterThan(previous);
            previous = box.y;
        }
    }).toPass({timeout: 30_000});
}
exports.expectTopToBottom = expectTopToBottom;

// ---------------------------------------------------------------------------
// The workflow's "References" page (Rules 3–15)
// ---------------------------------------------------------------------------

exports.ReferencesPage = class ReferencesPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {import('./WorkflowPage.js').WorkflowPage} frame the open workflow panel
     */
    constructor(page, frame) {
        super(page);
        this.frame = frame;
    }

    /** The page's heading text ("Publication: References", "Preprint: References"). */
    headingText() {
        return `${this.frame.labels.publicationHeading}: References`;
    }

    /** The Publication area's "References" entry (a single-version item). */
    menuEntry() {
        return this.frame.pageLink('References');
    }

    /** Open "References" from the open workflow panel (the newest version) and wait for its table. */
    async open() {
        await this.frame.selectPage('References');
        await this.expectLoaded();
    }

    /**
     * Open "References" under a named version (an item with several
     * versions nests each one's pages under its tree item).
     *
     * @param {string} versionLabel e.g. "Version of Record 1.1"
     */
    async openInVersion(versionLabel) {
        await openVersionPage(this.frame, versionLabel, 'References');
        await this.expectLoaded();
    }

    /** The page's heading shows and its table holds a row (the empty line counts). */
    async expectLoaded() {
        await this.frame.expectHeading(this.headingText());
        await expect(this.table().locator('tbody tr').first()).toBeVisible({timeout: 30_000});
    }

    /** The "Add" form (a PkpForm holding the box). */
    addForm() {
        return this.page.locator('form').filter({has: this.addBox()});
    }

    /** The "Add" box, labelled "References" (marked required). */
    addBox() {
        return this.page.getByRole('textbox', {name: /^References/});
    }

    addButton() {
        return this.addForm().getByRole('button', {name: 'Add', exact: true});
    }

    /** The "Add" form's field message ("This field is required."). */
    addError() {
        return this.addForm().locator('.pkpFieldError');
    }

    /** The inline "Saved" status beside "Add" (patterns.md pitfall 14). */
    savedStatus() {
        return this.addForm().locator('[role="status"]').filter({hasText: 'Saved'});
    }

    /**
     * Type lines into the box and press "Add", bounded by the import
     * answering OK and the box emptying.
     *
     * @param {string|string[]} lines
     */
    async add(lines) {
        const text = Array.isArray(lines) ? lines.join('\n') : lines;
        await this.addBox().fill(text);
        const added = apiWrite(this.page, /importAdditionalCitations$/);
        await this.addButton().click();
        await added;
        await expect(this.addBox()).toHaveValue('', {timeout: 30_000});
    }

    /** "Delete all references" (a button styled as a link). */
    deleteAllButton() {
        return this.page.getByRole('button', {name: 'Delete all references', exact: true});
    }

    /** "Reprocess all references" (lookup on; kept in the DOM, hidden, with lookup off). */
    reprocessAllButton() {
        return this.page.getByRole('button', {name: 'Reprocess all references', exact: true});
    }

    /**
     * The h3 headings reading "Structured References": with lookup on, the
     * lookup heading above the "Add" box first, then the table's title;
     * with lookup off, the table's title alone.
     */
    structuredHeadings() {
        return this.frame.dialog().locator('h3').filter({hasText: /^\s*Structured References\s*$/});
    }

    /** The lookup heading above the "Add" box (lookup on). */
    lookupHeading() {
        return this.structuredHeadings().first();
    }

    /** The lookup text (Rule 10), found by its opening words. */
    lookupText() {
        return this.page.getByText(TEXT.lookupTextStart);
    }

    /** The progress box's title ("Processing references - {n}/{total}", "All {n} references successfully processed", "{n} of {total} references processed, {failed} failed"). */
    progressTitle() {
        return this.page.getByText(/^(Processing references - \d+\/\d+|All \d+ references successfully processed|\d+ of \d+ references processed, \d+ failed)$/);
    }

    /** The "Expand All" / "Collapse All" header button (lookup on). */
    expandAllButton() {
        return this.page.getByRole('button', {name: /^(Expand All|Collapse All)$/});
    }

    /** The table's second column header (holds "Expand All" with lookup on). */
    secondColumnHeader() {
        return this.table().locator('thead th').nth(1);
    }

    /** The "Search references here" box. */
    searchBox() {
        return this.page.getByRole('searchbox', {name: 'Search references here'});
    }

    /** The search box's "Clear search phrase" (×). */
    clearSearchButton() {
        return this.page.getByRole('button', {name: 'Clear search phrase'});
    }

    /** Type a phrase into the search box, without committing it. */
    async typeSearch(phrase) {
        await this.searchBox().click();
        await this.searchBox().pressSequentially(phrase, {delay: 15});
    }

    /** Commit the typed phrase (the search box commits on Enter only). */
    async commitSearch() {
        await this.searchBox().press('Enter');
    }

    /** The "Structured References" table (CSS on its aria-label, see the file header). */
    table() {
        return this.page.locator('table[aria-label="Structured References"]');
    }

    /** The table's line (Rule 3). */
    tableLine() {
        return this.page.getByText(TEXT.tableLine);
    }

    /** The table's rows (the empty line is one row). */
    rows() {
        return this.table().locator('tbody tr');
    }

    /** Each row's first cell — what the row shows — in order (read with `toHaveText`). */
    rowCells() {
        return this.table().locator('tbody tr > :first-child');
    }

    /** The row whose shown text contains `text`. */
    row(text) {
        return this.rows().filter({hasText: text});
    }

    /** A row's "More Actions" button (hidden for a viewer who may not edit). */
    rowMenuButton(text) {
        return this.row(text).getByRole('button', {name: 'More Actions'});
    }

    /** Every visible "More Actions" in the table. */
    menuButtons() {
        return this.table().getByRole('button', {name: 'More Actions'});
    }

    /** A row's expander (named "Collapse" in both states, A16). */
    rowExpander(text) {
        return this.row(text).getByRole('button', {name: 'Collapse'});
    }

    /** A row's DOI link (lookup on). */
    rowDoiLink(text, doi) {
        return this.row(text).getByRole('link', {name: doi, exact: true});
    }

    /** A structured row's raw text in small print (the expanded details). */
    rowSmallPrint(text) {
        return this.row(text).locator('.text-xs-normal');
    }

    async openRowMenu(text) {
        return openRowMenu(this.page, this.row(text));
    }

    async closeRowMenu(text) {
        await closeRowMenu(this.page, this.row(text));
    }

    /** Press a row's "More Actions" › `action` ("Edit", "Delete", "Reprocess"). */
    async rowAction(text, action) {
        await pressRowAction(this.page, this.row(text), action);
    }

    /** Open a row's "Edit" and return the "Edit citation" panel, its Save shown. */
    async edit(text) {
        await this.rowAction(text, 'Edit');
        const panel = new EditCitationPanel(this.page);
        await expect(panel.saveButton()).toBeVisible({timeout: 30_000});
        return panel;
    }

    /** The row "Delete" confirmation. */
    deleteDialog() {
        return confirmation(this.page, TEXT.deleteQuestion);
    }

    /** The "Delete all references" confirmation. */
    deleteAllDialog() {
        return confirmation(this.page, TEXT.deleteAllQuestion);
    }

    /** Answer an open confirmation "OK", bounded by the write answering OK. */
    async confirmOk(dialog, pattern) {
        const written = apiWrite(this.page, pattern);
        await dialog.getByRole('button', {name: 'OK', exact: true}).click();
        await written;
        await expect(dialog).toHaveCount(0, {timeout: 30_000});
    }

    /** Answer an open confirmation "Cancel". */
    async confirmCancel(dialog) {
        await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
        await expect(dialog).toHaveCount(0, {timeout: 30_000});
    }

    /** "…" › "Delete" › "OK" on a row, bounded by the delete answering OK and the row going. */
    async deleteRow(text) {
        await this.rowAction(text, 'Delete');
        const dialog = this.deleteDialog();
        await expect(dialog).toBeVisible({timeout: 30_000});
        await this.confirmOk(dialog, /\/citations\/\d+$/);
        await expect(this.row(text)).toHaveCount(0, {timeout: 30_000});
    }
};

/**
 * Open a Publication page under a named version's tree item, waiting for
 * its heading.
 *
 * @param {import('./WorkflowPage.js').WorkflowPage} frame
 * @param {string} versionLabel
 * @param {string} entry
 */
async function openVersionPage(frame, versionLabel, entry) {
    const item = frame.menu().getByRole('treeitem', {name: versionLabel, exact: true});
    await expect(item).toBeVisible({timeout: 30_000});
    const link = item.getByRole('link', {name: entry, exact: true});
    if (!(await link.isVisible())) {
        await item.getByRole('link', {name: versionLabel, exact: true}).click();
    }
    await expect(link).toBeVisible({timeout: 30_000});
    await link.click();
    await frame.expectHeading(`${frame.labels.publicationHeading}: ${entry}`);
}

// ---------------------------------------------------------------------------
// The "Edit citation" panel (Fields & validation; Rules 6, 14)
// ---------------------------------------------------------------------------

class EditCitationPanel extends BasePage {
    dialog() {
        return this.page.getByRole('dialog', {name: 'Edit citation'});
    }

    /** A structured field's box by the start of its label ("DOI", "Title", "Source Name", "Volume"). */
    field(label) {
        return this.dialog().getByRole('textbox', {name: new RegExp(`^${label}`)}).first();
    }

    /** Every text box in the panel. */
    textboxes() {
        return this.dialog().getByRole('textbox');
    }

    /** "Edit Raw Citation". */
    rawBox() {
        return this.field('Edit Raw Citation');
    }

    /** The "Edit Raw Citation" field (label, required mark, message). */
    rawField() {
        return this.dialog()
            .locator('.pkpFormField')
            .filter({has: this.page.getByRole('textbox', {name: /^Edit Raw Citation/})});
    }

    /** The "* Required" mark on "Edit Raw Citation". */
    rawRequiredMark() {
        return this.rawField().locator('.pkpFormFieldLabel__required');
    }

    /** The messages under "Edit Raw Citation". */
    rawErrors() {
        return this.rawField().locator('.pkpFieldError');
    }

    /** The foot's "Please correct one error." */
    errorSummary() {
        return this.dialog().getByText(TEXT.oneError);
    }

    saveButton() {
        return this.dialog().getByRole('button', {name: 'Save', exact: true});
    }

    closeButton() {
        return this.dialog().getByRole('button', {name: 'Close', exact: true}).first();
    }

    /** The Author Information field. */
    authorsField() {
        return this.dialog().locator('.pkpFormField--authors');
    }

    /** The Author Information rows that hold boxes. */
    authorRows() {
        return this.authorsField().locator('tbody tr:has(input[name="givenName"])');
    }

    /** Press the authors' "Add" and fill the new row. */
    async addAuthor({givenName, familyName, orcid} = {}) {
        const before = await this.authorRows().count();
        await this.authorsField().getByRole('button', {name: 'Add', exact: true}).click();
        await expect(this.authorRows()).toHaveCount(before + 1, {timeout: 30_000});
        const row = this.authorRows().nth(before);
        if (givenName !== undefined) await row.locator('input[name="givenName"]').fill(givenName);
        if (familyName !== undefined) await row.locator('input[name="familyName"]').fill(familyName);
        if (orcid !== undefined) await row.locator('input[name="orcid"]').fill(orcid);
    }

    /** Press "Save", bounded by the citation write answering OK and the panel closing. */
    async save() {
        const saved = apiWrite(this.page, /\/citations\/\d+$/);
        await this.saveButton().click();
        await saved;
        await expect(this.dialog()).toHaveCount(0, {timeout: 30_000});
    }

    /** Press "Save" on a panel the form refuses in place: the panel stays open with the message. */
    async saveRefused(message) {
        await this.saveButton().click();
        await expect(this.dialog().locator('.pkpFieldError').filter({hasText: message}).first()).toBeVisible({
            timeout: 30_000,
        });
        await expect(this.dialog()).toBeVisible();
    }

    /** Press the panel's "Close" and wait for it to go. */
    async close() {
        await this.closeButton().click();
        await expect(this.dialog()).toHaveCount(0, {timeout: 30_000});
    }
}
exports.EditCitationPanel = EditCitationPanel;

// ---------------------------------------------------------------------------
// The Data Citations table and its panels (Rules 18–25)
// ---------------------------------------------------------------------------

/** The Data Citations table (visible: the wizard keeps other steps in the DOM). */
const DATA_TABLE = 'table[aria-label="Data Citations"]:visible';

exports.DataCitationsTable = class DataCitationsTable extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {{frame?: import('./WorkflowPage.js').WorkflowPage, scope?: import('@playwright/test').Locator}} [options]
     *   `frame` for the workflow's "Data" page; `scope` for a window that mounts the table (the Reviewer's)
     */
    constructor(page, {frame = null, scope = null} = {}) {
        super(page);
        this.frame = frame;
        this.scope = scope;
    }

    /** The page's heading text ("Publication: Data", "Preprint: Data"). */
    headingText() {
        return `${this.frame.labels.publicationHeading}: Data`;
    }

    /** Open the workflow's "Data" page (the newest version) and wait for the table. */
    async open() {
        await this.frame.selectPage('Data');
        await this.expectLoaded();
    }

    /** Open "Data" under a named version. */
    async openInVersion(versionLabel) {
        await openVersionPage(this.frame, versionLabel, 'Data');
        await this.expectLoaded();
    }

    async expectLoaded() {
        await expect(this.table().locator('tbody tr').first()).toBeVisible({timeout: 30_000});
    }

    /** The table (CSS on its aria-label; visible, because the wizard keeps other steps in the DOM). */
    table() {
        return (this.scope || this.page).locator(DATA_TABLE);
    }

    /** The table's header block (label, line, top controls) and the table: the innermost div holding both. */
    block() {
        return (this.scope || this.page)
            .locator('div')
            .filter({has: this.page.locator(DATA_TABLE)})
            .filter({hasText: 'Data Citations'})
            .last();
    }

    /** The line under the heading (only for a viewer who may edit). */
    line() {
        return this.block().getByText(TEXT.dataLine);
    }

    orderButton() {
        return this.block().getByRole('button', {name: 'Order', exact: true});
    }

    saveOrderButton() {
        return this.block().getByRole('button', {name: 'Save Order', exact: true});
    }

    addButton() {
        return this.block().getByRole('button', {name: 'Add Data Citation', exact: true});
    }

    /** The table's column header(s). */
    columnHeaders() {
        return this.table().locator('thead th');
    }

    rows() {
        return this.table().locator('tbody tr');
    }

    /** Each row's first cell (identifier above title), in order. */
    rowCells() {
        return this.table().locator('tbody tr > :first-child');
    }

    /** The row whose cell shows `title`. */
    row(title) {
        return this.rows().filter({hasText: title});
    }

    menuButtons() {
        return this.table().getByRole('button', {name: 'More Actions'});
    }

    async openRowMenu(title) {
        return openRowMenu(this.page, this.row(title));
    }

    async closeRowMenu(title) {
        await closeRowMenu(this.page, this.row(title));
    }

    async rowAction(title, action) {
        await pressRowAction(this.page, this.row(title), action);
    }

    /** The panel a title names ("Add Data Citation", "Edit Data Citation", "View Data Citation"). */
    panel(title) {
        return new DataCitationPanel(this.page, title);
    }

    /** Press "Add Data Citation" and return the open panel. */
    async openAdd() {
        await this.addButton().click();
        const panel = this.panel('Add Data Citation');
        await expect(panel.saveButton()).toBeVisible({timeout: 30_000});
        return panel;
    }

    /** Add one data citation through the panel and wait for its row. */
    async add(data) {
        const panel = await this.openAdd();
        await panel.fill(data);
        await panel.save();
        await expect(this.row(data.title)).toBeVisible({timeout: 30_000});
    }

    /** Press a row's "Edit" and return the open "Edit Data Citation" panel. */
    async edit(title) {
        await this.rowAction(title, 'Edit');
        const panel = this.panel('Edit Data Citation');
        await expect(panel.saveButton()).toBeVisible({timeout: 30_000});
        return panel;
    }

    /** Press a row's "View" and return the open "View Data Citation" panel. */
    async view(title) {
        await this.rowAction(title, 'View');
        const panel = this.panel('View Data Citation');
        await expect(panel.dialog()).toBeVisible({timeout: 30_000});
        return panel;
    }

    /** The row "Delete" confirmation. */
    deleteDialog() {
        return confirmation(this.page, TEXT.deleteQuestion);
    }

    /** "…" › "Delete" › "OK", bounded by the delete answering OK and the row going. */
    async deleteRow(title) {
        await this.rowAction(title, 'Delete');
        const dialog = this.deleteDialog();
        await expect(dialog).toBeVisible({timeout: 30_000});
        const written = apiWrite(this.page, /\/dataCitations\/\d+$/);
        await dialog.getByRole('button', {name: 'OK', exact: true}).click();
        await written;
        await expect(dialog).toHaveCount(0, {timeout: 30_000});
        await expect(this.row(title)).toHaveCount(0, {timeout: 30_000});
    }

    /** In ordering mode: a row's arrows (no names, A19; the first moves the row up). */
    rowArrows(title) {
        return this.row(title).locator('button');
    }

    /** In ordering mode: move a row up once. */
    async moveUp(title) {
        await this.rowArrows(title).first().click();
    }

    /** Press "Save Order", bounded by the order write answering OK and "Order" coming back. */
    async saveOrder() {
        const written = apiWrite(this.page, /\/dataCitations\/order$/);
        await this.saveOrderButton().click();
        await written;
        await expect(this.orderButton()).toBeVisible({timeout: 30_000});
    }
};

class DataCitationPanel extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} title
     */
    constructor(page, title) {
        super(page);
        this.title = title;
    }

    dialog() {
        return this.page.getByRole('dialog', {name: this.title, exact: true});
    }

    titleBox() {
        return this.dialog().getByRole('textbox', {name: /^Title/});
    }

    identifierTypeSelect() {
        return this.dialog().getByRole('combobox', {name: 'Identifier type', exact: true});
    }

    identifierBox() {
        return this.dialog().getByRole('textbox', {name: 'Identifier', exact: true});
    }

    relationshipSelect() {
        return this.dialog().getByRole('combobox', {name: /^Relationship type/});
    }

    repositoryBox() {
        return this.dialog().getByRole('textbox', {name: 'Repository', exact: true});
    }

    yearBox() {
        return this.dialog().getByRole('textbox', {name: 'Year', exact: true});
    }

    urlBox() {
        return this.dialog().getByRole('textbox', {name: 'URL', exact: true});
    }

    /** The messages under "Title". */
    titleErrors() {
        return this.dialog()
            .locator('.pkpFormField')
            .filter({has: this.page.getByRole('textbox', {name: /^Title/})})
            .locator('.pkpFieldError');
    }

    /** The messages under "Relationship type". */
    relationshipErrors() {
        return this.dialog()
            .locator('.pkpFormField')
            .filter({has: this.page.getByRole('combobox', {name: /^Relationship type/})})
            .locator('.pkpFieldError');
    }

    /** Every field message in the panel. */
    errors() {
        return this.dialog().locator('.pkpFieldError');
    }

    creatorsField() {
        return this.dialog().locator('.pkpFormField--authors');
    }

    creatorRows() {
        return this.creatorsField().locator('tbody tr:has(input[name="givenName"])');
    }

    /** Press the Creators' "Add" and fill the new row. */
    async addCreator({givenName, familyName, orcid} = {}) {
        const before = await this.creatorRows().count();
        await this.creatorsField().getByRole('button', {name: 'Add', exact: true}).click();
        await expect(this.creatorRows()).toHaveCount(before + 1, {timeout: 30_000});
        const row = this.creatorRows().nth(before);
        if (givenName !== undefined) await row.locator('input[name="givenName"]').fill(givenName);
        if (familyName !== undefined) await row.locator('input[name="familyName"]').fill(familyName);
        if (orcid !== undefined) await row.locator('input[name="orcid"]').fill(orcid);
    }

    /**
     * Fill any subset of the fields ({title, relationshipType (stored value),
     * identifierType (label), identifier, repository, year, url}).
     */
    async fill({title, relationshipType, identifierType, identifier, repository, year, url} = {}) {
        if (title !== undefined) await this.titleBox().fill(title);
        if (relationshipType !== undefined) {
            await this.relationshipSelect().selectOption({label: RELATIONSHIP[relationshipType]});
        }
        if (identifierType !== undefined) await this.identifierTypeSelect().selectOption({label: identifierType});
        if (identifier !== undefined) await this.identifierBox().fill(identifier);
        if (repository !== undefined) await this.repositoryBox().fill(repository);
        if (year !== undefined) await this.yearBox().fill(String(year));
        if (url !== undefined) await this.urlBox().fill(url);
    }

    saveButton() {
        return this.dialog().getByRole('button', {name: 'Save', exact: true});
    }

    /** Press "Save", bounded by the data citations write answering OK and the panel closing. */
    async save() {
        const saved = apiWrite(this.page, /\/dataCitations(\/\d+)?$/);
        await this.saveButton().click();
        await saved;
        await expect(this.dialog()).toHaveCount(0, {timeout: 30_000});
    }

    /** Press "Save" on a panel that refuses: the message shows and the panel stays open. */
    async saveRefused(message) {
        await this.saveButton().click();
        await expect(this.dialog().getByText(message).first()).toBeVisible({timeout: 30_000});
        await expect(this.dialog()).toBeVisible();
    }

    /**
     * The buttons of the panel's body (every side panel also carries the
     * app's top bar, "Tasks" and the user menu, above its own header).
     */
    bodyButtons() {
        return this.dialog().locator('.pkp-modal-scroll-container').getByRole('button');
    }

    /** The buttons of the panel's header beside its title (none on these panels). */
    headerActions() {
        return this.dialog().locator('[data-cy="sidemodal-header"]').getByRole('button');
    }

    closeButton() {
        return this.dialog().getByRole('button', {name: 'Close', exact: true}).first();
    }

    async close() {
        await this.dialog().getByRole('button', {name: 'Close', exact: true}).first().click();
        await expect(this.dialog()).toHaveCount(0, {timeout: 30_000});
    }
}
exports.DataCitationPanel = DataCitationPanel;

// ---------------------------------------------------------------------------
// The submission wizard (Rules 16, 24)
// ---------------------------------------------------------------------------

exports.WizardCitations = class WizardCitations extends BasePage {
    /** The Details step's "References" box. */
    referencesBox() {
        return this.page.getByRole('textbox', {name: /^References/});
    }

    /** Its field: label, required mark, help text. */
    referencesField() {
        return this.page.locator('.pkpFormField').filter({has: this.referencesBox()});
    }

    referencesRequiredMark() {
        return this.referencesField().locator('.pkpFormFieldLabel__required');
    }

    referencesHelp() {
        return this.referencesField().getByText(TEXT.wizardHelp);
    }

    /** The current step's sections (every step sits in the DOM; the shown ones are the current step's). */
    sections() {
        return this.page.locator('.panelSection:visible');
    }

    /** The Details step's "Data" section (the one holding the Data Citations table). */
    dataSection() {
        return this.sections().filter({has: this.page.locator('table[aria-label="Data Citations"]')});
    }

    /** The Data Citations table as mounted in the wizard. */
    dataTable() {
        return new exports.DataCitationsTable(this.page);
    }

    /** A Review-step item of the "Details" panel ("References", "Data Citations"). */
    reviewItem(label) {
        return this.page
            .locator('.submissionWizard__reviewPanel__item:visible')
            .filter({has: this.page.locator('h4', {hasText: new RegExp(`^\\s*${label}\\s*$`)})});
    }

    /** A Review item's listed entries, one per line. */
    reviewEntries(label) {
        return this.reviewItem(label).locator('.submissionWizard__reviewPanel__citation');
    }

    /** A Review item's value (the entries, or "None provided"). */
    reviewValue(label) {
        return this.reviewItem(label).locator('.submissionWizard__reviewPanel__item__value');
    }

    /** A Review item's warnings (notifications above its heading). */
    reviewWarnings(label) {
        return this.reviewItem(label).locator('.pkpNotification');
    }
};

// ---------------------------------------------------------------------------
// The published item's page (Rule 27)
// ---------------------------------------------------------------------------

/**
 * The landing page's "References" block (`.item.references`: an h2, then a
 * `.value` holding one paragraph per reference).
 *
 * @param {import('@playwright/test').Page} page
 */
exports.landingReferences = function landingReferences(page) {
    const block = page.locator('.item.references');
    return {
        block,
        heading: block.getByRole('heading', {name: 'References'}),
        paragraphs: block.locator('.value p'),
    };
};
