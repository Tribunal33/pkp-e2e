// @ts-check
/**
 * @file shared/playwright/pages/InstitutionsPages.js
 *
 * Page objects for U66 "Institutions" (docs/specs/U66-institutions.md),
 * shared by the OJS, OMP and OPS suites. App-neutral (PRINCIPLES M2): the
 * page, its panel and its dialog are lib/pkp's and ui-library's on all
 * three apps; the words a suite asserts are passed in by the suite.
 *
 * Surfaces:
 * - InstitutionsPage — Settings › "Institutions"
 *   (`{context}/management/settings/institutions`): the side-menu entry
 *   "Institutions", the heading, the panel titled "Institutions" with its
 *   "Search" box (and its clear button) and "Add Institution", the list's
 *   rows (the name, "Edit", "Delete") and "No items found.", the page
 *   notices at the top right.
 * - InstitutionPanel — the "Add Institution" / "Edit Institution" side
 *   panel: "Name" per language (the language buttons at its top right),
 *   "IP ranges", "ROR", each field's label, description and message under
 *   it, the error summary above "Save" ("Please correct {n} errors.",
 *   "Jump to next error"), "Save", the close control.
 * - DeleteInstitutionDialog — "Delete Institution": its question, "Yes"
 *   and "No".
 *
 * DOM facts the locators rely on (U66 claim check K1, K2, 2026-09-28,
 * three apps; `.reports/U66/screen-notes.md`; ui-library
 * `InstitutionsListPanel.vue`, `Form/*.vue`):
 * - the list is `.institutionsListPanel`, rows `.listPanel__item`, the
 *   name in `span[id^="institution-"]`; the rows come in no set order
 *   (spec A10), so every read here is a set;
 * - the list comes with the page; a search (Enter), the clear button and
 *   a saved "Add Institution" fetch `GET api/v1/institutions?…searchPhrase=`
 *   again, a saved "Edit Institution" and a "Yes" change the rows in place;
 * - the side panel is a dialog named by its title; its boxes are
 *   `input[name="name-<locale>"]`, `textarea[name="ipRanges"]`,
 *   `input[name="ror"]`, each in its own `.pkpFormField` (one per language
 *   for "Name"); a message under a box is `.pkpFieldError`; the summary is
 *   `.pkpFormErrors` in the footer, whose "Go to {field}: {message}"
 *   buttons sit in a screen-reader-only list;
 * - "Save" posts `api/v1/institutions` (a new one) or `…/{id}` with the
 *   PUT override, and stays disabled after a refusal until a flagged box
 *   changes; "Yes" posts `…/{id}` with the DELETE override;
 * - the modal store keeps a closed panel's slot for 450 ms (patterns.md
 *   pitfall 4): every close here waits it out.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');

const T = 30_000;

/** Wait out the modal store's slot of a closed panel or dialog (patterns.md pitfall 4). */
async function pastModalSlot(page) {
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 500)));
}

function escapeRe(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Is this response the list's fetch (`GET api/v1/institutions?…`)? */
function isListFetch(r) {
    return /\/api\/v1\/institutions\?/.test(r.url()) && r.request().method() === 'GET';
}

/** The fetch's search phrase, as sent. */
function phraseOf(r) {
    return new URL(r.url()).searchParams.get('searchPhrase') || '';
}

/** Is this response a save or a delete on `api/v1/institutions`? */
function isChange(r) {
    return /\/api\/v1\/institutions(\/\d+)?(\?|$)/.test(r.url()) && r.request().method() !== 'GET';
}

class InstitutionsPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.heading = page.locator('main h1').first();
        this.panel = page.locator('.institutionsListPanel').first();
        this.panelTitle = this.panel.locator('h2').first();
        this.searchBox = this.panel.getByRole('searchbox', {name: 'Search'});
        this.clearSearchButton = this.panel.getByRole('button', {name: 'Clear search phrase'});
        this.addButton = this.panel.getByRole('button', {name: 'Add Institution', exact: true});
        this.rows = this.panel.locator('.listPanel__item');
        this.names = this.rows.locator('span[id^="institution-"]');
        this.noItems = this.panel.getByText('No items found.', {exact: true});
        this.sideNav = page.locator('nav#app-nav');
        this.sideEntries = this.sideNav.locator('[data-pc-section="header"]');
        this.sideEntry = this.sideNav.locator('[data-pc-section="header"][aria-label="Institutions"]');
    }

    url() {
        return this.contextUrl(this.contextPath, '/management/settings/institutions');
    }

    /** Type the page's address; waits for the panel. */
    async goto() {
        await this.page.goto(this.url());
        await this.expectOpen();
    }

    /** Reload; waits for the panel. */
    async reload() {
        await this.page.reload();
        await this.expectOpen();
    }

    /** The page is up: its heading and the panel's "Add Institution". */
    async expectOpen() {
        await expect(this.heading).toBeVisible({timeout: T});
        await expect(this.addButton).toBeVisible({timeout: T});
    }

    /** The side menu is drawn (its first entry shows): a read of an entry's absence waits on this. */
    async waitSideMenu() {
        await expect(this.sideNav).toBeVisible({timeout: T});
        await expect(this.sideEntries.first()).toBeVisible({timeout: T});
    }

    /** Press the side menu's "Institutions"; waits for the page. */
    async openFromSideMenu() {
        await this.waitSideMenu();
        await this.sideEntry.click();
        await this.page.waitForURL(/\/management\/settings\/institutions/, {timeout: T, waitUntil: 'commit'});
        await this.expectOpen();
    }

    /** A row by its name, anchored. */
    row(name) {
        return this.rows.filter({has: this.page.locator('span[id^="institution-"]', {hasText: new RegExp(`^\\s*${escapeRe(name)}\\s*$`)})});
    }

    /** A row's buttons' words, in order. */
    rowButtons(name) {
        return this.row(name).getByRole('button');
    }

    /**
     * The list holds exactly `expected`, in any order (spec A10); an empty
     * set also reads "No items found.". Polled, so a read right after an
     * action settles.
     *
     * @param {string[]} expected
     */
    async expectNames(expected) {
        const want = [...expected].sort();
        await expect
            .poll(async () => (await this.names.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim()).sort(), {timeout: T})
            .toEqual(want);
        if (want.length === 0) {
            await expect(this.noItems).toBeVisible({timeout: T});
        } else {
            await expect(this.noItems).toHaveCount(0);
        }
    }

    /** Arm the list's next fetch. */
    listFetched() {
        return this.page.waitForResponse(isListFetch, {timeout: T});
    }

    /**
     * Type `phrase` in "Search" and press Enter; resolves with the list's
     * answer for that phrase.
     */
    async search(phrase) {
        await this.searchBox.fill(phrase);
        const fetched = this.page.waitForResponse((r) => isListFetch(r) && phraseOf(r) === phrase, {timeout: T});
        await this.searchBox.press('Enter');
        const response = await fetched;
        expect(response.status(), `the search for "${phrase}" is served`).toBe(200);
        return response;
    }

    /**
     * Type in "Search" without pressing Enter; resolves with the list
     * fetches the page sent meanwhile, read once the box holds the text.
     */
    async typeSearch(phrase) {
        const sent = [];
        const onRequest = (r) => {
            if (/\/api\/v1\/institutions\?/.test(r.url())) sent.push(r.url());
        };
        this.page.on('request', onRequest);
        try {
            await this.searchBox.fill(phrase);
            await expect(this.searchBox).toHaveValue(phrase);
        } finally {
            this.page.off('request', onRequest);
        }
        return sent;
    }

    /** Press the clear button at the end of "Search"; resolves with the list's answer. */
    async clearSearch() {
        const fetched = this.page.waitForResponse((r) => isListFetch(r) && phraseOf(r) === '', {timeout: T});
        await this.clearSearchButton.click();
        const response = await fetched;
        await expect(this.searchBox).toHaveValue('');
        return response;
    }

    /** "Add Institution": the panel, open. */
    async openAdd() {
        await this.addButton.click();
        const panel = new InstitutionPanel(this.page, 'Add Institution');
        await panel.expectOpen();
        return panel;
    }

    /** A row's "Edit": the panel, open. */
    async openEdit(name) {
        await this.row(name).getByRole('button', {name: 'Edit', exact: true}).click();
        const panel = new InstitutionPanel(this.page, 'Edit Institution');
        await panel.expectOpen();
        return panel;
    }

    /** A row's "Delete": the dialog, open. */
    async openDelete(name) {
        await this.row(name).getByRole('button', {name: 'Delete', exact: true}).click();
        const dialog = new DeleteInstitutionDialog(this.page);
        await expect(dialog.dialog).toBeVisible({timeout: T});
        return dialog;
    }

    /** The page notices at the top right carrying `text`. */
    notices(text) {
        return this.page.locator('.app__notifications .pkpNotification').filter({hasText: text});
    }
}

class InstitutionPanel extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} title "Add Institution" or "Edit Institution"
     */
    constructor(page, title) {
        super(page);
        this.title = title;
        this.dialog = page.getByRole('dialog', {name: title});
        this.heading = this.dialog.getByText(title, {exact: true}).first();
        this.ipRangesBox = this.dialog.locator('textarea[name="ipRanges"]');
        this.rorBox = this.dialog.locator('input[name="ror"]');
        this.saveButton = this.dialog.getByRole('button', {name: 'Save', exact: true});
        this.closeButton = this.dialog.getByRole('button', {name: 'Close', exact: true}).first();
        this.localeNames = this.dialog.locator('.pkpFormLocales .pkpFormLocales__locale');
        this.errorSummary = this.dialog.locator('.pkpFormErrors');
        this.jumpButton = this.dialog.getByRole('button', {name: 'Jump to next error', exact: true});
        this.flagged = this.dialog.locator('.pkpFieldError');
    }

    /** The panel is open, its "Save" shown. */
    async expectOpen() {
        await expect(this.saveButton).toBeVisible({timeout: T});
        await expect(this.ipRangesBox).toBeVisible({timeout: T});
    }

    /** "Name" in a language (`en`, `fr_CA`). */
    nameBox(locale = 'en') {
        return this.dialog.locator(`input[name="name-${locale}"]`);
    }

    /** The field around a box, by the box's name (`name-en`, `ipRanges`, `ror`). */
    field(boxName) {
        return this.dialog.locator('.pkpFormField').filter({has: this.page.locator(`[name="${boxName}"]`)}).first();
    }

    /** A field's label ("Name", "IP ranges", "ROR"). */
    fieldLabel(boxName) {
        return this.field(boxName).locator('label.pkpFormFieldLabel').first();
    }

    /**
     * The visible part of a second language's "Name" label ("French"); the
     * label also holds the screen reader's words ("Name in French").
     */
    localeLabel(boxName) {
        return this.fieldLabel(boxName).locator('span.aria-hidden').first();
    }

    /** A field's description under its label. */
    description(boxName) {
        return this.field(boxName).locator('.pkpFormField__description').first();
    }

    /** The message(s) under a box. */
    fieldError(boxName) {
        return this.field(boxName).locator('.pkpFieldError');
    }

    /** Each message under a box, one per line shown. */
    fieldErrorLines(boxName) {
        return this.field(boxName).locator('.pkpFieldError__message');
    }

    /** Press a language's name at the top right ("French"): its "Name" box shows. */
    async showLocale(label, locale) {
        await this.dialog.locator('.pkpFormLocales').getByRole('button', {name: label}).click();
        await expect(this.nameBox(locale)).toBeVisible({timeout: T});
    }

    /** Arm the panel's save. */
    saved() {
        return this.page.waitForResponse(isChange, {timeout: T});
    }

    /** Press "Save"; resolves with the save's answer. */
    async save() {
        await expect(this.saveButton).toBeEnabled({timeout: T});
        const answered = this.saved();
        await this.saveButton.click();
        return answered;
    }

    /**
     * "Save" accepted: the answer is 200 and the panel closes (the modal
     * slot waited out). With `refetch`, also the list's fetch a new
     * institution sets off ("Add Institution").
     */
    async saveAccepted({refetch = false} = {}) {
        const fetched = refetch ? this.page.waitForResponse(isListFetch, {timeout: T}) : null;
        const response = await this.save();
        expect(response.status(), `"${this.title}" "Save" answered ${response.status()}`).toBe(200);
        if (fetched) await fetched;
        await expect(this.dialog).toBeHidden({timeout: T});
        await pastModalSlot(this.page);
        return response;
    }

    /** "Save" refused by the server: the answer is 400 and the panel stays open. */
    async saveRefused() {
        const response = await this.save();
        expect(response.status(), `"${this.title}" "Save" refused`).toBe(400);
        await expect(this.dialog).toBeVisible();
        await expect(this.flagged.first()).toBeVisible({timeout: T});
        return response;
    }

    /** The close control; the modal slot waited out. */
    async close() {
        await this.closeButton.click();
        await expect(this.dialog).toBeHidden({timeout: T});
        await pastModalSlot(this.page);
    }
}

class DeleteInstitutionDialog extends BasePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);
        this.dialog = page.getByRole('dialog', {name: 'Delete Institution'});
        this.yesButton = this.dialog.getByRole('button', {name: 'Yes', exact: true});
        this.noButton = this.dialog.getByRole('button', {name: 'No', exact: true});
    }

    /** "No": the dialog closes (the modal slot waited out); returns the deletes sent meanwhile (none expected). */
    async no() {
        const sent = [];
        const onRequest = (r) => {
            if (/\/api\/v1\/institutions\/\d+/.test(r.url()) && r.method() !== 'GET') sent.push(r.url());
        };
        this.page.on('request', onRequest);
        try {
            await this.noButton.click();
            await expect(this.dialog).toBeHidden({timeout: T});
            await pastModalSlot(this.page);
        } finally {
            this.page.off('request', onRequest);
        }
        return sent;
    }

    /** "Yes": resolves with the delete's answer once the dialog has closed. */
    async yes() {
        const answered = this.page.waitForResponse(isChange, {timeout: T});
        await this.yesButton.click();
        const response = await answered;
        expect(response.request().headers()['x-http-method-override'], 'the delete request').toBe('DELETE');
        expect(response.status(), `"Yes" answered ${response.status()}`).toBe(200);
        await expect(this.dialog).toBeHidden({timeout: T});
        await pastModalSlot(this.page);
        return response;
    }
}

/**
 * Collect the answers of 500 or more a page receives (each is a finding on
 * its own, whatever the screen shows); read the list at the end of a test.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {string[]}
 */
function serverFailures(page) {
    /** @type {string[]} */
    const failures = [];
    page.on('response', (r) => {
        if (r.status() >= 500) failures.push(`${r.status()} ${r.request().method()} ${r.url()}`);
    });
    return failures;
}

module.exports = {
    InstitutionsPage,
    InstitutionPanel,
    DeleteInstitutionDialog,
    serverFailures,
    pastModalSlot,
};
