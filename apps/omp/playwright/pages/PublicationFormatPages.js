// @ts-check
/**
 * @file playwright/pages/PublicationFormatPages.js
 *
 * OMP page objects for Publication formats & proof terms (spec:
 * docs/specs/U73-publication-formats-proof-terms.md). OMP-only: a journal
 * and a preprint server install no publication formats.
 *
 * Surfaces:
 * - PublicationFormatsPage — the workflow's "Publication" › the version ›
 *   "Publication Formats" page: the legacy category grid
 *   `[id^="component-grid-catalogentry-publicationformatgrid"]`. A format
 *   and its files share one `tbody.category_grid_body` (the format row
 *   first, `tr.gridRow` with `span.label` reading "<name><kind>" and the
 *   kind in `span.onix_code`; then one `tr.gridRow` per file, with
 *   `a.pkp_linkaction_downloadFile`). A format without files draws the
 *   "No Items" line (a remote one "This item is remotely hosted.") in the
 *   NEXT tbody. A row's arrow (`a.show_extras`, screen-reader text
 *   "Settings") reveals its control line, the next `tr`
 *   (`<row id>-control-row`). Every read of the grid goes through CSS:
 *   the workflow dialog holding it is aria-hidden while a window is open
 *   over it and for the 450 ms slot after (patterns.md, pitfalls 4 and 6).
 * - FormatWindow — "Add publication format" / "Edit": the "Edit" tab's
 *   form (Name, "Publication Format", the boxes, "URL Path", the ISBN
 *   boxes, "OK", the "Cancel" link) and the tab strip.
 * - MetadataTab — the "Edit" window's "Metadata" tab: the four lists
 *   (`div[id^="<list>GridContainer"]`, each loaded by AJAX), the fields and
 *   "Save".
 * - CodeWindow, DateWindow — "Add Code" (`form#addIdentificationCodeForm`)
 *   and "Add publication date" (`form#addPubDateForm`).
 * - TermsWindow — "Set Terms for Downloading" (`form#approvedProofForm`).
 * - SelectFilesWindow — "Select Files" (`form#manageProofFilesForm`).
 * - StatusWindow — "Format Approval", "Format Availability", "Approve
 *   Proof", "Revoke Proof Approval": a text, "Cancel" and "OK".
 * - DeleteDialog — the Vue confirmation "Delete" ("OK" / "Cancel").
 * - The book page's format links (`.item.files`: `a.cmp_download_link`,
 *   a remote format's `a.remote_resource`), read by a visitor.
 *
 * Every window is a dialog named by its title; windows are found by CSS
 * (the dialog holding an `h1` of that title) so a window under a stacked
 * confirmation stays readable. The browser's own confirm() and alert()
 * are answered through `watchDialogs(page)`. A notice (or its absence) is
 * read from the `notification/fetchNotification` answer the page fetches
 * after each grid action: its `content` is "" when there is none. Screen
 * shapes: the U73 claim checks (`.reports/U73/screen-notes.md`) and the
 * test author's probe (2026-09-28).
 */
const {expect} = require('@playwright/test');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {expectNotice} = require('../../../../shared/playwright/pages/SectionsPages.js');
const {waitForJQueryIdle} = require('../../../../shared/playwright/support/legacy.js');

const T = 30_000;

/** The five kinds of the "Publication Format" list, in its order (Fields). */
const KINDS = [
    'Audio (AA)',
    'Digital (delivered electronically) (EA)',
    'Digital (on physical carrier) (DA)',
    'Hardback (BB)',
    'Paperback / softback (BC)',
];

/** The kind a new format arrives on. */
const DEFAULT_KIND = 'Digital (on physical carrier) (DA)';

/** Verbatim screen strings the suite reads. */
const TEXT = {
    pageHeading: 'Publication: Publication Formats',
    gridHeading: 'Publication Formats',
    add: 'Add publication format',
    noItems: 'No Items',
    remote: 'This item is remotely hosted.',
    required: 'This field is required.',
    requiredNote: 'Required fields are marked with an asterisk: *',
    formChanged: 'The data on this form has changed. Do you wish to continue without saving?',
    deleteQuestion: 'Are you sure you wish to delete this item? This action cannot be undone.',
    urlPathRefused: 'This may only contain letters, numbers, dashes, underscores and periods.',
    publishedWarning: 'Warning: This version has been published. Editing it may impact the published content.',
    publishedAuthor: 'This version has been published and can not be edited.',
    uploadWizard: 'Upload a File Ready for Publication',
    formatApprove: 'Approve the metadata for this format. Metadata can be checked from the Edit panel for each format.',
    formatUnapprove: 'Indicate that the metadata for this format has not been approved.',
    makeAvailable:
        "Make this format available to readers. Downloadable files and any other distributions will appear in the book's catalog entry.",
    proofApprove: 'Approve this proof to indicate proofreading is complete and the file is ready to be published.',
    proofRevoke:
        'Revoke approval for this proof to indicate proofreading is no longer complete and the file is not ready to be published.',
    termsIntro:
        'File formats can be made available for downloading from the press website through open access at no cost to readers or direct sales (using an online payment processor, as configured in Distribution). For this file indicate the basis of access.',
    priceHelp: 'Prices should be numeric only. Do not include currency symbols.',
    formErrors: 'Errors occurred processing this form',
    priceRefused: 'A valid price is required.',
    selectFilesText:
        'Any files that have already been uploaded to any submission stage can be added to the Proof Files listing by checking the Include checkbox below and clicking Search: all available files will be listed and can be chosen for inclusion.',
    allStages: 'Show files from all accessible workflow stages.',
    removed: 'Publication Format removed.',
    codeAdded: 'Identification Code added.',
    codeEdited: 'Identification Code edited.',
    codeRemoved: 'Identification Code removed.',
    dateAdded: 'Publication Date added.',
};

/** The terms choices: the radio values behind "Open Access", "Direct Sales", "Not Available". */
const SALES = {openAccess: 'openAccess', directSales: 'directSales', notAvailable: 'notAvailable'};

/** The Metadata tab's four lists, by their container id prefix. */
const LISTS = {
    codes: 'identificationCodeGridContainer',
    salesRights: 'salesRightsGridContainer',
    markets: 'marketsGridContainer',
    dates: 'publicationDateGridContainer',
};

/** A regex matching `text` exactly, whitespace around it allowed. */
function exactly(text) {
    return new RegExp(`^\\s*${esc(text)}\\s*$`);
}

function esc(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The `workflowMenuKey` of a version's Publication Formats page. */
function formatsMenuKey(publicationId) {
    return `publication_${publicationId}_publicationFormats`;
}

/**
 * Wait out the slot a closed window keeps for 450 ms on the app's timer:
 * an opener pressed within it opens nothing (patterns.md, pitfall 4).
 *
 * @param {import('@playwright/test').Page} page
 */
async function pastCloseWindow(page) {
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 500)));
}

/**
 * Answer the browser's own dialogs: a page-leave question is accepted;
 * a confirm() or alert() takes the next answer queued in `answers`
 * ('accept' | 'dismiss'), dismissed when none is queued; `seen` records
 * each one's type and message. Install before the press that may ask.
 *
 * @param {import('@playwright/test').Page} page
 */
function watchDialogs(page) {
    /** @type {{type: string, message: string}[]} */
    const seen = [];
    /** @type {string[]} */
    const answers = [];
    page.on('dialog', (dialog) => {
        seen.push({type: dialog.type(), message: dialog.message()});
        const answer = dialog.type() === 'beforeunload' ? 'accept' : answers.shift() || 'dismiss';
        (answer === 'accept' ? dialog.accept() : dialog.dismiss()).catch(() => {});
    });
    return {seen, answers};
}

/** The page's notice fetch (every legacy grid action ends in one). */
function isNoticeFetch(response) {
    return /\/notification\/fetchNotification/.test(response.url()) && response.request().method() === 'GET';
}

/**
 * Run `action` and read the notice fetch it ends in: it must carry no
 * notice (its `content` is empty). The fetch is the page's own, so the
 * silence is bounded by the answer that would have carried the notice.
 *
 * @param {import('@playwright/test').Page} page
 * @param {() => Promise<any>} action
 */
async function expectNoNotice(page, action) {
    const fetched = page.waitForResponse(isNoticeFetch, {timeout: T});
    const result = await action();
    const body = await (await fetched).json();
    expect(body.content || '', 'the page fetched no notice').toEqual('');
    return result;
}

/**
 * A window by its title: the dialog holding a heading (h1 on a legacy
 * window, h2 on a Vue confirmation) of that
 * title, found by CSS so it stays readable under a stacked confirmation.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string|RegExp} title
 */
function windowByTitle(page, title) {
    const text = typeof title === 'string' ? exactly(title) : title;
    return page.locator('[role="dialog"]').filter({has: page.locator('h1, h2', {hasText: text})});
}

// ---------------------------------------------------------------------------
// The Publication Formats page
// ---------------------------------------------------------------------------

class PublicationFormatsPage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {{appContext?: any}} [options]
     */
    constructor(page, contextPath, options = {}) {
        this.page = page;
        this.contextPath = contextPath;
        this.frame = new WorkflowPage(page, contextPath, options);
    }

    /** Open a version's page by address in the editorial view. */
    async gotoEditorial(submissionId, publicationId) {
        await this.frame.gotoEditorial(submissionId, {menuKey: formatsMenuKey(publicationId)});
        await this.expectLoaded();
    }

    /** Open a version's page by address in the author's view (My Submissions). */
    async gotoAuthor(submissionId, publicationId) {
        await this.frame.gotoAuthor(submissionId, {menuKey: formatsMenuKey(publicationId)});
        await this.expectLoaded();
    }

    /** From an open workflow: "Publication" › the newest version › "Publication Formats". */
    async openFromMenu() {
        await this.frame.selectPage('Publication Formats');
        await this.expectLoaded();
    }

    /**
     * From an open workflow: the side menu's version `index` (0 = the
     * first, in menu order) › its "Publication Formats". A version entry
     * toggles its group, so it is pressed only while its pages are hidden;
     * the page taken is the first "Publication Formats" after that entry.
     */
    async openVersionFromMenu(index) {
        const node = this.frame.versionNodes().nth(index);
        await expect(node).toBeVisible({timeout: T});
        const pagesOf = () =>
            node.evaluate((el) => {
                const all = [...el.closest('nav').querySelectorAll('a')];
                const start = all.indexOf(/** @type {HTMLAnchorElement} */ (el));
                const out = [];
                for (const a of all.slice(start + 1)) {
                    const label = (a.textContent || '').trim();
                    if (/^(Unassigned version|Version of Record|Author Original)\b/.test(label) || label === 'Create New Version') break;
                    if (a.getClientRects().length) out.push(label);
                }
                return out;
            });
        if (!(await pagesOf()).includes('Publication Formats')) {
            await node.click();
        }
        await expect.poll(pagesOf, {timeout: T}).toContain('Publication Formats');
        await node.evaluate((el) => {
            const all = [...el.closest('nav').querySelectorAll('a')];
            const start = all.indexOf(/** @type {HTMLAnchorElement} */ (el));
            const link = all.slice(start + 1).find((a) => (a.textContent || '').trim() === 'Publication Formats');
            /** @type {HTMLElement} */ (link).click();
        });
        await this.frame.expectPageHeading('Publication Formats');
        await this.expectLoaded();
    }

    /** Reload and wait for the list again. */
    async reload() {
        await this.page.reload();
        await this.frame.expectOpen();
        await this.expectLoaded();
    }

    /** The page's heading, then the list drawn under it. */
    async expectLoaded() {
        await this.frame.expectPageHeading('Publication Formats');
        await expect(this.gridHeading()).toHaveText(exactly(TEXT.gridHeading), {timeout: T});
    }

    /** A line of the main column (the published-version warnings). */
    mainText(text) {
        return this.page.locator('[data-cy="workflow-primary-items"]').getByText(text, {exact: true});
    }

    /** The main column's text, for an order read (warning above the list). */
    mainColumn() {
        return this.page.locator('[data-cy="workflow-primary-items"]');
    }

    grid() {
        return this.page.locator('[id^="component-grid-catalogentry-publicationformatgrid"]').first();
    }

    /** The table's heading ("Publication Formats"). */
    gridHeading() {
        return this.grid().locator('.header h4');
    }

    /** "Add publication format" above the table. */
    addLink() {
        return this.grid().locator('.header a').filter({hasText: exactly(TEXT.add)});
    }

    /** The column heads, in order. */
    columnHeads() {
        return this.grid().locator('thead th');
    }

    /** The grid's own "No Items" line (a version with no format). */
    emptyList() {
        return this.grid().locator('tbody.empty:visible');
    }

    /** Every format's `tbody.category_grid_body`, in list order. */
    formatBodies() {
        return this.grid().locator('tbody.category_grid_body');
    }

    /** The label regex of a format: "<name><kind>" with its exact name. */
    labelPattern(name) {
        return new RegExp(`^\\s*${esc(name)}\\s*(${KINDS.map(esc).join('|')})\\s*$`);
    }

    /** One format's body (its row and its files), by its exact name. */
    formatBody(name) {
        return this.formatBodies().filter({
            has: this.page.locator('tr.gridRow span.label', {hasText: this.labelPattern(name)}),
        });
    }

    /** The format's own row. */
    formatRow(name) {
        return this.formatBody(name).locator('tr.gridRow').filter({has: this.page.locator('.onix_code')});
    }

    /** The format's name cell label ("<name><kind>"). */
    formatLabel(name) {
        return this.formatRow(name).locator('span.label');
    }

    /** Every format's label, in list order. */
    formatLabels() {
        return this.grid().locator('tr.gridRow span.label:has(.onix_code)');
    }

    /** A remote format's name link. */
    remoteLink(name) {
        return this.formatLabel(name).locator('a');
    }

    /** The file rows under a format, newest first. */
    fileRows(format) {
        return this.formatBody(format)
            .locator('tr.gridRow')
            .filter({has: this.page.locator('a.pkp_linkaction_downloadFile')});
    }

    /** A file row under a format, by the file's name. */
    fileRow(format, fileName) {
        return this.fileRows(format).filter({
            has: this.page.locator('a.pkp_linkaction_downloadFile', {hasText: exactly(fileName)}),
        });
    }

    /** The file's name link (the download). */
    fileNameLink(format, fileName) {
        return this.fileRow(format, fileName).locator('a.pkp_linkaction_downloadFile');
    }

    /** The first cell of a file row: "<number> <name>", scripts left out. */
    async fileNameCell(format, fileName) {
        const row = this.fileRow(format, fileName);
        await expect(row).toHaveCount(1, {timeout: T});
        return row.locator('td').first().evaluate((td) => {
            const copy = /** @type {HTMLElement} */ (td.cloneNode(true));
            copy.querySelectorAll('script, .pkp_screen_reader').forEach((n) => n.remove());
            return (copy.textContent || '').replace(/\s+/g, ' ').trim();
        });
    }

    /**
     * The line drawn under a format with no files ("No Items", or "This
     * item is remotely hosted."): the tbody right after the format's body.
     */
    lineUnder(name) {
        return this.formatBody(name).locator('xpath=following-sibling::tbody[1]');
    }

    /** A link in a row by its exact text ("Change File", "Awaiting Approval", "Set Terms"…). */
    rowLink(row, text) {
        return row.locator('a').filter({hasText: exactly(text)});
    }

    /** A row's cell under "Complete" (index 1) or "Availability" (index 2), by column. */
    cell(row, index) {
        return row.locator(':scope > td').nth(index);
    }

    /** The arrow before a row's name. */
    rowArrow(row) {
        return row.locator('a.show_extras, a.hide_extras');
    }

    /** Every arrow in the grid. */
    arrows() {
        return this.grid().locator('a.show_extras, a.hide_extras');
    }

    /** Every status or terms link in the grid (the managing roles' links). */
    statusLinks() {
        return this.grid().locator('a').filter({
            hasText: /^\s*(Awaiting Approval|Approved|Not Available|Available|Set Terms|Open Access|Direct Sales)\s*$/,
        });
    }

    /**
     * Open a row's arrow (once) and return the visible entries of its
     * control line, a locator for `toHaveText`.
     */
    async openRowEntries(row) {
        await expect(row).toHaveCount(1, {timeout: T});
        const id = await row.getAttribute('id');
        const controls = this.page.locator(`[id="${id}-control-row"]`);
        if (!(await controls.isVisible())) {
            await row.locator('a.show_extras').click();
        }
        await expect(controls).toBeVisible({timeout: T});
        return controls.locator('a:visible');
    }

    /** Open a row's arrow and press one of its entries ("Edit", "Delete", "More Information"). */
    async pressRowEntry(row, label) {
        const entries = await this.openRowEntries(row);
        await entries.filter({hasText: exactly(label)}).click();
    }

    // --- actions --------------------------------------------------------------

    /** Press "Add publication format" and return its window, open. */
    async openAdd() {
        await this.addLink().click();
        const win = new FormatWindow(this.page, TEXT.add);
        await win.expectOpen();
        return win;
    }

    /** A format's arrow › "Edit": the "Edit" window on its "Edit" tab. */
    async openEdit(name) {
        await this.pressRowEntry(this.formatRow(name), 'Edit');
        const win = new FormatWindow(this.page, 'Edit');
        await win.expectOpen();
        return win;
    }

    /** A format's arrow › "Delete": the confirmation. */
    async openDelete(name) {
        await this.pressRowEntry(this.formatRow(name), 'Delete');
        const dialog = new DeleteDialog(this.page);
        await dialog.expectOpen();
        return dialog;
    }

    /**
     * A status or terms link in a row, pressed: returns the window it
     * opens (`title`).
     */
    async openStatus(row, linkText, title) {
        await this.rowLink(row, linkText).click();
        const win = new StatusWindow(this.page, title);
        await win.expectOpen();
        return win;
    }

    /** A file's terms link, whatever it reads, pressed: the terms window. */
    async openTerms(format, fileName) {
        await this.fileRow(format, fileName)
            .locator('a')
            .filter({hasText: /^\s*(Set Terms|Open Access|Direct Sales|Not Available)\s*$/})
            .click();
        const win = new TermsWindow(this.page);
        await win.expectOpen();
        return win;
    }

    /** A format's "Select Files": its window, the list loaded. */
    async openSelectFiles(format) {
        await this.rowLink(this.formatRow(format), 'Select Files').click();
        const win = new SelectFilesWindow(this.page);
        await win.expectOpen();
        return win;
    }

    /**
     * A format's "Change File": the upload wizard "Upload a File Ready for
     * Publication" walked (the component chosen, the fixture sent,
     * Continue, Continue, Complete). Resolves once the wizard has gone and
     * the file is listed under the format. Returns the wizard's title as
     * read on its first step.
     */
    async uploadWithChangeFile(format, filePath, component = 'Book Manuscript') {
        await this.rowLink(this.formatRow(format), 'Change File').click();
        const wizard = this.page.getByRole('dialog').filter({has: this.page.locator('div[id^="fileUploadWizard"]')}).last();
        const genre = wizard.locator('select[id^="genreId"]');
        await expect(genre).toBeVisible({timeout: T});
        const title = (await wizard.locator('h1').first().innerText()).trim();
        await genre.selectOption({label: component});
        await wizard.locator('input[type="file"]').setInputFiles(filePath);
        const next = wizard.getByRole('button', {name: 'Continue', exact: true});
        await expect(next).toBeEnabled({timeout: T});
        await next.click();
        await expect(wizard.getByRole('tab', {name: /^2\./})).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await next.click();
        await expect(wizard.getByRole('tab', {name: /^3\./})).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await wizard.getByRole('button', {name: 'Complete', exact: true}).click();
        await expect(wizard).toHaveCount(0, {timeout: T});
        const name = filePath.split('/').pop() || filePath;
        await expect(this.fileRow(format, name).first()).toBeVisible({timeout: T});
        await pastCloseWindow(this.page);
        return title;
    }
}

// ---------------------------------------------------------------------------
// The format window ("Add publication format" / "Edit")
// ---------------------------------------------------------------------------

class FormatWindow {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} title "Add publication format" or "Edit"
     */
    constructor(page, title) {
        this.page = page;
        this.title = title;
    }

    dialog() {
        return windowByTitle(this.page, this.title);
    }

    /** The tabs, in order ("Edit", "Metadata"…). */
    tabs() {
        return this.dialog().locator('[role="tab"]');
    }

    tab(label) {
        return this.tabs().filter({hasText: exactly(label)});
    }

    /** The "Edit" tab's form. */
    form() {
        return this.dialog().locator('form').filter({has: this.page.locator('select[name="entryKey"]')});
    }

    async expectOpen() {
        await expect(this.nameBox()).toBeVisible({timeout: T});
        await expect(this.okButton()).toBeVisible({timeout: T});
    }

    /** The group heading "Format Details". */
    groupHeading() {
        return this.form().getByText('Format Details', {exact: true});
    }

    nameBox() {
        return this.dialog().locator('input[name="name[en]"]');
    }

    kindList() {
        return this.form().locator('select[name="entryKey"]');
    }

    /** The chosen kind's label. */
    kindChosen() {
        return this.kindList().locator('option:checked');
    }

    physicalBox() {
        return this.form().locator('input[name="isPhysicalFormat"]');
    }

    remoteBox() {
        return this.form().locator('input[name="remotelyHostedContent"]');
    }

    remoteUrlBox() {
        return this.form().locator('input[name="remoteURL"]');
    }

    urlPathBox() {
        return this.form().locator('input[name="urlPath"]');
    }

    isbn13Box() {
        return this.form().locator('input[name="isbn13"]');
    }

    isbn10Box() {
        return this.form().locator('input[name="isbn10"]');
    }

    requiredNote() {
        return this.form().getByText(TEXT.requiredNote, {exact: true});
    }

    /** "This field is required." under the Name box. */
    nameError() {
        return this.form().locator('label.error').filter({hasText: TEXT.required});
    }

    /** The URL Path refusal. */
    urlPathError() {
        return this.form().getByText(TEXT.urlPathRefused);
    }

    okButton() {
        return this.form().getByRole('button', {name: 'OK', exact: true});
    }

    cancelLink() {
        return this.form().getByRole('link', {name: 'Cancel', exact: true});
    }

    /** The window's close arrow (the header "Close"). */
    closeArrow() {
        return this.dialog().getByRole('button', {name: 'Close', exact: true}).last();
    }

    /** Type the name (the box blurred, so the form notices the change). */
    async typeName(name) {
        await this.nameBox().fill(name);
        await this.nameBox().blur();
    }

    /** Type a box by its locator and blur it. */
    async type(box, value) {
        await box.fill(value);
        await box.blur();
    }

    /**
     * Press "OK" and wait for the save to answer, the window to close and
     * the list to redraw.
     */
    async ok() {
        const saved = this.page.waitForResponse(
            (r) => /publication-format-grid\/update-format(?:\?|$)/.test(r.url()) && r.request().method() === 'POST',
            {timeout: T}
        );
        await this.okButton().click();
        const response = await saved;
        expect(response.ok(), `update-format answered ${response.status()}`).toBe(true);
        await this.expectClosed();
    }

    /**
     * Press "OK" on a form the server refuses: the save answers 200 with
     * the form again, which replaces the tab's content; returns once that
     * answer has landed and `message` shows in the new form, the window
     * still open.
     */
    async okRefused(message) {
        const answered = this.page.waitForResponse(
            (r) => /publication-format-grid\/update-format(?:\?|$)/.test(r.url()) && r.request().method() === 'POST',
            {timeout: T}
        );
        await this.okButton().click();
        const response = await answered;
        const body = await response.json();
        expect(body.content, 'the save answered with the form again').toContain('addPublicationFormatForm');
        // The answer's form replaces the tab's in the request's own
        // callback, which runs before jQuery counts the request done.
        await waitForJQueryIdle(this.page);
        await expect(message).toBeVisible({timeout: T});
        await expect(this.dialog()).toHaveCount(1);
    }

    async cancel() {
        await this.cancelLink().click();
        await this.expectClosed();
    }

    async expectClosed() {
        await expect(this.dialog()).toHaveCount(0, {timeout: T});
        await pastCloseWindow(this.page);
    }

    /** Press the "Metadata" tab and return it, its lists loaded. */
    async openMetadata() {
        const loaded = this.page.waitForResponse((r) => /publication-format-grid\/edit-format-metadata/.test(r.url()), {timeout: T});
        await this.tab('Metadata').click();
        await loaded;
        await waitForJQueryIdle(this.page);
        const tab = new MetadataTab(this.page, this);
        await tab.expectLoaded();
        return tab;
    }

    /**
     * Press the "Edit" tab: the tab loads its form afresh by AJAX, which
     * replaces what is on screen, so the answer is awaited before a box is
     * typed in.
     */
    async openEditTab() {
        const loaded = this.page.waitForResponse((r) => /publication-format-grid\/edit-format-tab/.test(r.url()), {timeout: T});
        await this.tab('Edit').click();
        await loaded;
        await waitForJQueryIdle(this.page);
        await expect(this.nameBox()).toBeVisible({timeout: T});
    }
}

// ---------------------------------------------------------------------------
// The "Metadata" tab and its code and date windows
// ---------------------------------------------------------------------------

class MetadataTab {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {FormatWindow} win
     */
    constructor(page, win) {
        this.page = page;
        this.win = win;
    }

    form() {
        return this.win.dialog().locator('form[id^="publicationMetadataEntryForm-"]');
    }

    /** One of the four lists (`LISTS`). */
    list(which) {
        return this.form().locator(`div[id^="${which}"]`);
    }

    /** A list's heading ("Product Identification"…). */
    listHeading(which) {
        return this.list(which).locator('.header h4');
    }

    /** A list's add link ("Add Code", "Add publication date"…). */
    listAddLink(which, label) {
        return this.list(which).locator('.header a').filter({hasText: exactly(label)});
    }

    /** A list's column heads. */
    listColumns(which) {
        return this.list(which).locator('thead th');
    }

    /** A list's data rows. */
    listRows(which) {
        return this.list(which).locator('tbody tr.gridRow');
    }

    /** A list's "No Items" line. */
    listEmpty(which) {
        return this.list(which).locator('tbody.empty:visible');
    }

    /** Every list has drawn its table. */
    async expectLoaded() {
        await expect(this.form()).toBeVisible({timeout: T});
        for (const which of Object.values(LISTS)) {
            await expect(this.list(which).locator('table')).toBeVisible({timeout: T});
        }
    }

    compositionList() {
        return this.form().locator('select[name="productCompositionCode"]');
    }

    detailList() {
        return this.form().locator('select[name="productFormDetailCode"]');
    }

    availabilityList() {
        return this.form().locator('select[name="productAvailabilityCode"]');
    }

    imprintBox() {
        return this.form().locator('input[name="imprint"]');
    }

    /** A list's chosen option label ("" for the empty choice). */
    chosen(list) {
        return list.locator('option:checked');
    }

    /** "This field is required." under "Product Composition". */
    compositionError() {
        return this.form().locator('label.error').filter({hasText: TEXT.required});
    }

    saveButton() {
        return this.form().getByRole('button', {name: 'Save', exact: true});
    }

    cancelLink() {
        return this.form().getByRole('link', {name: 'Cancel', exact: true});
    }

    /**
     * The tab's labels and headings top to bottom, the lists' option texts
     * left out: the four list headings, the field labels and the buttons.
     */
    async labelsTopToBottom() {
        await this.expectLoaded();
        return this.form().evaluate((form) => {
            const copy = /** @type {HTMLElement} */ (form.cloneNode(true));
            copy.querySelectorAll('option, script').forEach((n) => n.remove());
            const out = [];
            copy.querySelectorAll('.header h4, label, .label, legend, button, a').forEach((n) => {
                const text = (n.textContent || '').replace(/\s+/g, ' ').trim();
                if (text) out.push(text);
            });
            return out;
        });
    }

    /** Press "Save" and wait for the window to close (the save answered). */
    async save() {
        const saved = this.page.waitForResponse(
            (r) => /publication-format-grid\/update-format-metadata/.test(r.url()) && r.request().method() === 'POST',
            {timeout: T}
        );
        await this.saveButton().click();
        const response = await saved;
        expect(response.ok(), `the Metadata save answered ${response.status()}`).toBe(true);
        await this.win.expectClosed();
    }

    /** Press "Add Code": the code window. */
    async openAddCode() {
        await this.listAddLink(LISTS.codes, 'Add Code').click();
        const win = new CodeWindow(this.page);
        await win.expectOpen();
        return win;
    }

    /** Press "Add publication date": the date window. */
    async openAddDate() {
        await this.listAddLink(LISTS.dates, 'Add publication date').click();
        const win = new DateWindow(this.page);
        await win.expectOpen();
        return win;
    }

    /**
     * A list row by its first cell's exact text (the cell also carries the
     * arrow's screen-reader "Settings").
     */
    row(which, text) {
        return this.listRows(which).filter({
            has: this.page.locator('td:first-child', {hasText: new RegExp(`^\\s*(Settings\\s*)?${esc(text)}\\s*$`)}),
        });
    }

    /**
     * Assert a list row's cells, left to right, the arrow's screen-reader
     * text and the cells' scripts left out (polled: the list redraws after
     * each save).
     */
    async expectRowCells(which, text, cells) {
        const row = this.row(which, text);
        await expect(row).toHaveCount(1, {timeout: T});
        await expect
            .poll(
                () =>
                    row.locator(':scope > td').evaluateAll((tds) =>
                        tds.map((td) => {
                            const copy = /** @type {HTMLElement} */ (td.cloneNode(true));
                            copy.querySelectorAll('script, .pkp_screen_reader').forEach((n) => n.remove());
                            return (copy.textContent || '').replace(/\s+/g, ' ').trim();
                        })
                    ),
                {timeout: T}
            )
            .toEqual(cells);
    }

    /** A list row's arrow › an entry ("Edit", "Delete"). */
    async pressRowEntry(which, text, label) {
        const row = this.row(which, text);
        await expect(row).toHaveCount(1, {timeout: T});
        const id = await row.getAttribute('id');
        const controls = this.page.locator(`[id="${id}-control-row"]`);
        if (!(await controls.isVisible())) {
            await row.locator('a.show_extras').click();
        }
        await controls.locator('a:visible').filter({hasText: exactly(label)}).click();
    }
}

/** The code window ("Add Code" and a code's "Edit"). */
class CodeWindow {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
    }

    form() {
        return this.page.locator('form#addIdentificationCodeForm:visible');
    }

    async expectOpen() {
        await expect(this.valueBox()).toBeVisible({timeout: T});
        await expect(this.typeList().locator('option').first()).toBeAttached({timeout: T});
    }

    valueBox() {
        return this.form().locator('input[name="value"]');
    }

    typeList() {
        return this.form().locator('select[name="code"]');
    }

    /** The "ONIX Code Type" options' labels, in order. */
    typeOptions() {
        return this.typeList().locator('option');
    }

    /** The field labels of the form, top to bottom. */
    labels() {
        return this.form().locator('label:not(.error)');
    }

    valueError() {
        return this.form().locator('label.error').filter({hasText: TEXT.required});
    }

    okButton() {
        return this.form().getByRole('button', {name: 'OK', exact: true});
    }

    cancelLink() {
        return this.form().getByRole('link', {name: 'Cancel', exact: true});
    }

    /** Press "OK" on a valid form: the save answers and the window closes. */
    async ok() {
        const saved = this.page.waitForResponse(
            (r) => /identification-code-grid\/update-code/.test(r.url()) && r.request().method() === 'POST',
            {timeout: T}
        );
        await this.okButton().click();
        const response = await saved;
        expect(response.ok(), `update-code answered ${response.status()}`).toBe(true);
        await expect(this.form()).toHaveCount(0, {timeout: T});
        await pastCloseWindow(this.page);
    }
}

/** The date window ("Add publication date" and a date's "Edit"). */
class DateWindow {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
    }

    form() {
        return this.page.locator('form#addPubDateForm:visible');
    }

    async expectOpen() {
        await expect(this.dateBox()).toBeVisible({timeout: T});
        await expect(this.roleList().locator('option').first()).toBeAttached({timeout: T});
    }

    dateBox() {
        return this.form().locator('input[name="date"]');
    }

    formatList() {
        return this.form().locator('select[name="dateFormat"]');
    }

    roleList() {
        return this.form().locator('select[name="role"]');
    }

    labels() {
        return this.form().locator('label:not(.error)');
    }

    dateError() {
        return this.form().locator('label.error').filter({hasText: TEXT.required});
    }

    okButton() {
        return this.form().getByRole('button', {name: 'OK', exact: true});
    }

    cancelLink() {
        return this.form().getByRole('link', {name: 'Cancel', exact: true});
    }

    /** Press "OK" and return the save's answer (the window may stay: Rule 19b). */
    async pressOk() {
        const saved = this.page.waitForResponse(
            (r) => /publication-date-grid\/update-date/.test(r.url()) && r.request().method() === 'POST',
            {timeout: T}
        );
        await this.okButton().click();
        return saved;
    }
}

// ---------------------------------------------------------------------------
// The approval and availability windows, the delete dialog
// ---------------------------------------------------------------------------

class StatusWindow {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} title
     */
    constructor(page, title) {
        this.page = page;
        this.title = title;
    }

    dialog() {
        return windowByTitle(this.page, this.title);
    }

    async expectOpen() {
        await expect(this.okButton()).toBeVisible({timeout: T});
    }

    /** The window's text between its title and its buttons. */
    text(sentence) {
        return this.dialog().getByText(sentence, {exact: true});
    }

    okButton() {
        return this.dialog().getByRole('button', {name: 'OK', exact: true});
    }

    cancelLink() {
        return this.dialog().getByRole('link', {name: 'Cancel', exact: true}).or(
            this.dialog().getByRole('button', {name: 'Cancel', exact: true})
        );
    }

    /** Press "OK": the window closes (the grid redraws the row). */
    async ok() {
        await this.okButton().click();
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

class DeleteDialog {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
    }

    dialog() {
        return this.page.getByRole('dialog', {name: 'Delete', exact: true});
    }

    async expectOpen() {
        await expect(this.dialog()).toBeVisible({timeout: T});
    }

    question() {
        return this.dialog().getByText(TEXT.deleteQuestion, {exact: true});
    }

    /** Its buttons, in order ("OK", "Cancel"). */
    buttons() {
        return this.dialog().getByRole('button');
    }

    async ok() {
        await this.dialog().getByRole('button', {name: 'OK', exact: true}).click();
        await this.expectClosed();
    }

    async cancel() {
        await this.dialog().getByRole('button', {name: 'Cancel', exact: true}).click();
        await this.expectClosed();
    }

    async expectClosed() {
        await expect(this.dialog()).toHaveCount(0, {timeout: T});
        await pastCloseWindow(this.page);
    }
}

// ---------------------------------------------------------------------------
// "Set Terms for Downloading"
// ---------------------------------------------------------------------------

class TermsWindow {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
    }

    dialog() {
        return windowByTitle(this.page, 'Set Terms for Downloading');
    }

    form() {
        return this.dialog().locator('form#approvedProofForm');
    }

    async expectOpen() {
        await expect(this.form()).toBeVisible({timeout: T});
        await expect(this.saveButton()).toBeVisible({timeout: T});
    }

    /** A choice's radio (`SALES`). */
    radio(value) {
        return this.form().locator(`input[type="radio"][name="salesType"][value="${value}"]`);
    }

    /** The choices' labels, in order. */
    choiceLabels() {
        return this.form().locator('input[type="radio"][name="salesType"]').evaluateAll((radios) =>
            radios.map((r) => ((r.closest('label') || r.parentElement)?.textContent || '').replace(/\s+/g, ' ').trim())
        );
    }

    priceBox() {
        return this.form().locator('input[id^="price"]');
    }

    /** The price box's label ("Price (USD)"), or the refusal in its place. */
    priceLabel() {
        return this.form().locator('label[for^="price"]');
    }

    text(sentence) {
        return this.form().getByText(sentence, {exact: true});
    }

    /** The in-window error block at the top. */
    errorBlock() {
        return this.form().getByText(TEXT.formErrors);
    }

    saveButton() {
        return this.form().getByRole('button', {name: 'Save', exact: true});
    }

    cancelLink() {
        return this.form().getByRole('link', {name: 'Cancel', exact: true});
    }

    closeArrow() {
        return this.dialog().getByRole('button', {name: 'Close', exact: true}).last();
    }

    async choose(value) {
        await this.radio(value).check();
    }

    /** Type the price key by key (the box reacts on keyup), then blur. */
    async typePrice(value) {
        const box = this.priceBox();
        await box.fill('');
        await box.pressSequentially(value);
        await box.blur();
    }

    /** Press "Save" and wait for the save's answer; returns it. */
    async pressSave() {
        const saved = this.page.waitForResponse(
            (r) => /publication-format-grid\/save-approved-proof/.test(r.url()) && r.request().method() === 'POST',
            {timeout: T}
        );
        await this.saveButton().click();
        return saved;
    }

    /** "Save" on a valid choice: the window closes. */
    async save() {
        const response = await this.pressSave();
        expect(response.ok(), `the terms save answered ${response.status()}`).toBe(true);
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
// "Select Files"
// ---------------------------------------------------------------------------

class SelectFilesWindow {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
    }

    dialog() {
        return windowByTitle(this.page, 'Select Files');
    }

    form() {
        return this.dialog().locator('form#manageProofFilesForm');
    }

    /** The list has drawn at least one file row. */
    async expectOpen() {
        await expect(this.form()).toBeVisible({timeout: T});
        await expect(this.fileRows().first()).toBeVisible({timeout: T});
    }

    text(sentence) {
        return this.dialog().getByText(sentence, {exact: true});
    }

    /** The list's heading ("Page Proofs"). */
    listHeading() {
        return this.form().locator('h4');
    }

    columnHeads() {
        return this.form().locator('thead th');
    }

    /** The file rows (those with a box). */
    fileRows() {
        return this.form().locator('tbody tr').filter({has: this.page.locator('input[name="selectedFiles[]"]')});
    }

    fileBox(fileName) {
        return this.fileRows()
            .filter({has: this.page.locator('a', {hasText: exactly(fileName)})})
            .locator('input[name="selectedFiles[]"]');
    }

    allStagesBox() {
        return this.form().locator('input[id^="allStages"]');
    }

    /** The box's label text. */
    allStagesLabel() {
        return this.form().getByText(TEXT.allStages, {exact: true});
    }

    okButton() {
        return this.form().getByRole('button', {name: 'OK', exact: true});
    }

    cancelLink() {
        return this.form().getByRole('link', {name: 'Cancel', exact: true});
    }

    closeArrow() {
        return this.dialog().getByRole('button', {name: 'Close', exact: true}).last();
    }

    /** Press "OK": the save answers and the window closes. */
    async ok() {
        const saved = this.page.waitForResponse(
            (r) => /manage-proof-files-grid\/update-proof-files/.test(r.url()) && r.request().method() === 'POST',
            {timeout: T}
        );
        await this.okButton().click();
        const response = await saved;
        expect(response.ok(), `the Select Files save answered ${response.status()}`).toBe(true);
        await expect(this.dialog()).toHaveCount(0, {timeout: T});
        await pastCloseWindow(this.page);
    }
}

// ---------------------------------------------------------------------------
// The book page (a visitor's read)
// ---------------------------------------------------------------------------

class BookFormats {
    /**
     * @param {import('@playwright/test').Page} page a visitor's page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        this.page = page;
        this.contextPath = contextPath;
    }

    /** Open the book's page by its address and wait for its title. */
    async goto(submissionId) {
        const response = await this.page.goto(`/index.php/${this.contextPath}/catalog/book/${submissionId}`);
        expect(response?.status(), 'the book page answers').toBe(200);
        await expect(this.page.locator('.obj_monograph_full h1.title')).toBeVisible({timeout: T});
    }

    /** Every format link the page offers (files and remote formats), in order. */
    links() {
        return this.page.locator('.obj_monograph_full .item.files a.cmp_download_link, .obj_monograph_full .item.files a.remote_resource');
    }

    /** A file link reading `text`. */
    fileLink(text) {
        return this.page.locator('.obj_monograph_full a.cmp_download_link').filter({hasText: exactly(text)});
    }

    /** A remote format's link reading `text`. */
    remoteLink(text) {
        return this.page.locator('.obj_monograph_full a.remote_resource').filter({hasText: exactly(text)});
    }
}

module.exports = {
    KINDS,
    DEFAULT_KIND,
    TEXT,
    SALES,
    LISTS,
    exactly,
    formatsMenuKey,
    pastCloseWindow,
    watchDialogs,
    expectNoNotice,
    expectNotice,
    windowByTitle,
    PublicationFormatsPage,
    FormatWindow,
    MetadataTab,
    CodeWindow,
    DateWindow,
    StatusWindow,
    DeleteDialog,
    TermsWindow,
    SelectFilesWindow,
    BookFormats,
};
