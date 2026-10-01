// @ts-check
/**
 * @file shared/playwright/pages/HostedJournalsPages.js
 *
 * Page objects for U59 "Hosted journals (site admin)"
 * (docs/specs/U59-hosted-journals.md), shared by the OJS, OMP and OPS
 * suites. App-neutral (PRINCIPLES M2): every word that differs per app
 * ("Hosted Journals" / "Hosted Presses" / "Hosted Servers", "Journals" /
 * "Presses" / "Servers", "Create Journal" / "Create Press" / "Create
 * Server", "Journal Settings" / "Setup" / "Server Settings", "Journal" /
 * "Press" / "Server") is passed in by the suite through a `labels` object;
 * the locators are the markup the three apps share (one lib/pkp grid, one
 * ui-library form, one theme template shape).
 *
 * Surfaces:
 * - HostedJournalsPage — Administration › "Hosted Journals"
 *   (`index/admin/contexts`): the trail, the table's heading, columns and
 *   header links ("Order", "Create Journal"), the rows found by their
 *   path, a row's arrow and its "Edit" / "Remove" / "Settings wizard",
 *   "Order" with its drag, "Done" and "Cancel ordering", the "Remove"
 *   confirmation (`RemoveDialog`), the rows' order.
 * - ContextFormWindow — the "Create Journal" and "Edit" windows: the
 *   journal form's boxes, the "French" button, "Languages", "Primary
 *   locale", "Enable…", the red reasons (`#context-{field}-error[-{locale}]`),
 *   the error line, "Save" (bounded by the contexts request, or counting
 *   none when the browser refuses), "Saved", "Close".
 * - SettingsWizardPage — `index/admin/wizard/{id}`: the heading, the trail,
 *   the top and side tabs, the address's key after "#", the "Journal"
 *   tab's form (`journalForm`, U07's SettingsForm).
 * - SiteJournalsList — the site's home page (`index/index`): the list's
 *   heading, one entry per journal (thumbnail, name, description, links),
 *   the entries' order; the site-level Register page's journals
 *   (`registerNames`).
 *
 * DOM facts the locators rely on (U59 claim check, 2026-09-27/28, three
 * apps; `.reports/U59/screen-notes.md`, the kept scripts under
 * shared/playwright/checks/U59/), confirmed while the OJS suite was built:
 * - the grid is `#contextGridContainer`; rows `tr.gridRow` whose id ends
 *   `-row-{contextId}`, cells "Name" (the arrow `a.show_extras`, named
 *   "Settings", then the name) and "Path"; a row's links live in the next
 *   `tr`; "Order" is `display:none` while the site has one journal;
 * - "Create Journal" opens a reka dialog named after its heading, the
 *   Vue form posting `POST index/api/v1/contexts`; "Edit" opens a dialog
 *   headed "Edit" holding the same form, which saves with
 *   `POST {path}/api/v1/contexts/{id}` (PUT override), shows "Saved" and
 *   closes by itself about a second later;
 * - the form's boxes are `#context-{field}-control[-{locale}]`, the French
 *   boxes shown by the form's "French" button, the reasons
 *   `#context-{field}-error[-{locale}]` (`.pkpFieldError`, drawn only while
 *   the field is refused), "Languages" and "Primary locale" by
 *   `name=supportedLocales` / `name=primaryLocale`;
 * - while ordering, the rows are jQuery UI sortable (a real mouse press,
 *   stepped moves and a release), "Done" posts `…/save-sequence`;
 * - "Remove" asks in a dialog named "Confirm", "OK" posts
 *   `…/delete-context`, and the row drops without a reload;
 * - the wizard's tabs carry `#{key}-button` ids and panels named like the
 *   tab; a pressed tab writes its key after "#" about 100 ms later;
 * - the site's home page is `.page_index_site`, the list
 *   `.journals|.presses|.servers > h2 + ul > li`, each entry's `.body`
 *   holding `h3 a`, `.description` when set and `ul.links`.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {SettingsForm} = require('./ContextIdentityPages.js');
const {waitForJQueryIdle} = require('../support/legacy.js');

const T = 30_000;

/** Escape a string for a RegExp. */
function esc(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A whole-text matcher that tolerates surrounding white space. */
function whole(text) {
    return new RegExp(`^\\s*${esc(text)}\\s*$`);
}

/** Text with runs of white space collapsed. */
function flat(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

/** A request of the journal form's save (create or edit). */
function isContextSave(response) {
    return response.request().method() === 'POST' && /\/api\/v1\/contexts(\/\d+)?(\?|$)/.test(response.url());
}

/** Wait out the 450 ms slot a closed window keeps (patterns.md, pitfall 4). */
async function pastCloseWindow(page) {
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 500)));
}

// ---------------------------------------------------------------------------
// Administration › "Hosted Journals"
// ---------------------------------------------------------------------------

class HostedJournalsPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page a Site Administrator's page
     * @param {{hosted: string, table: string, create: string}} labels the
     *   page's words: "Hosted Journals", "Journals", "Create Journal" (a
     *   press's and a server's in their suites)
     */
    constructor(page, labels) {
        super(page);
        this.labels = labels;
        this.main = page.locator('main');
        this.trail = page.getByRole('navigation', {name: 'You are here:'});
        this.trailItems = this.trail.getByRole('listitem');
        this.grid = page.locator('#contextGridContainer');
        this.tableHeading = this.grid.locator('.header').getByRole('heading', {name: labels.table, exact: true});
        this.headerLinks = this.grid.locator('.header .actions a:visible');
        this.orderLink = this.grid.locator('.header a[id*="orderItems"]');
        this.createLink = this.grid.locator('.header a[id*="createContext"]');
        this.columnHeaders = this.grid.locator('table thead th');
        this.rows = this.grid.locator('tbody tr.gridRow');
        this.visibleArrows = this.rows.locator('a.show_extras:visible');
        this.doneControl = page
            .getByRole('link', {name: 'Done', exact: true})
            .or(page.getByRole('button', {name: 'Done', exact: true}))
            .first();
        this.cancelOrderingControl = page
            .getByRole('link', {name: 'Cancel ordering', exact: true})
            .or(page.getByRole('button', {name: 'Cancel ordering', exact: true}))
            .first();
    }

    /** The page's address (read in `locale`). */
    url(locale = 'en') {
        return this.siteUrl(`/${locale}/admin/contexts`);
    }

    /** Type the address and wait for the rows. */
    async goto(locale = 'en') {
        await this.page.goto(this.url(locale));
        await this.expectOpen();
    }

    /** Administration, then its "Hosted Journals" link. */
    async gotoFromAdministration() {
        await this.page.goto(this.siteUrl('/en/admin'));
        await this.main.getByRole('link', {name: this.labels.hosted, exact: true}).click();
        await this.page.waitForURL(/\/admin\/contexts/, {timeout: T, waitUntil: 'commit'});
        await this.expectOpen();
    }

    /** The table is up with its rows and the grid's handlers bound. */
    async expectOpen() {
        await expect(this.rows.first()).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** Reload and wait for the rows. */
    async reload() {
        await this.page.reload();
        await this.expectOpen();
    }

    /** The row whose "Path" cell reads `path`. */
    row(path) {
        return this.rows.filter({has: this.page.locator('td:nth-child(2)', {hasText: whole(path)})});
    }

    /** A row's "Name" as read (the arrow's hidden "Settings" dropped). */
    async rowName(path) {
        await expect(this.row(path)).toHaveCount(1, {timeout: T});
        return this.row(path)
            .locator('td')
            .first()
            .evaluate((td) => {
                const copy = /** @type {HTMLElement} */ (td.cloneNode(true));
                copy.querySelectorAll('a, script').forEach((e) => e.remove());
                return copy.textContent.replace(/\s+/g, ' ').trim();
            });
    }

    /** A row's "Path" cell. */
    pathCell(path) {
        return this.row(path).locator('td').nth(1);
    }

    /**
     * The trail's items as matchers of their words (each item but the last
     * carries the "/" that separates it from the next).
     *
     * @param {string[]} words
     */
    static trailWords(words) {
        return words.map((w) => new RegExp(`^\\s*${esc(w)}\\s*/?\\s*$`));
    }

    /** Every row's path, in the table's order. */
    async paths() {
        return this.rows.evaluateAll((rows) =>
            rows.map((r) => ((r.querySelectorAll('td')[1] || {}).textContent || '').replace(/\s+/g, ' ').trim())
        );
    }

    /** The rows among `paths`, in the table's order (a scoped read for `expect.poll`). */
    async orderOf(paths) {
        return (await this.paths()).filter((p) => paths.includes(p));
    }

    /**
     * Press a row's arrow and return its controls row (the next `tr`). A
     * click that lands before the grid's handlers bind leaves the controls
     * hidden, so it is repeated (patterns.md, pitfall 10).
     */
    async rowControls(path) {
        const row = this.row(path);
        await expect(row).toHaveCount(1, {timeout: T});
        const controls = row.locator('xpath=following-sibling::tr[1]');
        for (let attempt = 0; attempt < 3; attempt++) {
            const toggle = row.locator('a.show_extras');
            if (await toggle.count()) {
                await toggle.click();
            }
            try {
                await expect(controls.getByRole('link', {name: 'Edit', exact: true})).toBeVisible({timeout: 10_000});
                return controls;
            } catch (e) {
                if (attempt === 2) throw e;
            }
        }
        return controls;
    }

    /** The links a row's arrow shows, in order. */
    async rowControlNames(path) {
        const controls = await this.rowControls(path);
        return (await controls.locator('a:visible').allInnerTexts()).map(flat);
    }

    /** "Create Journal": the window, its form ready. */
    async openCreate() {
        await this.createLink.click();
        const win = new ContextFormWindow(this.page, {heading: this.labels.create});
        await win.ready();
        return win;
    }

    /** A row's arrow, then "Edit": the window, its form ready. */
    async openEdit(path) {
        const controls = await this.rowControls(path);
        await controls.getByRole('link', {name: 'Edit', exact: true}).click();
        const win = new ContextFormWindow(this.page, {heading: 'Edit'});
        await win.ready();
        return win;
    }

    /** A row's arrow, then "Settings wizard": the wizard page. */
    async openWizard(path, wizardLabels) {
        const controls = await this.rowControls(path);
        await controls.getByRole('link', {name: 'Settings wizard', exact: true}).click();
        await this.page.waitForURL(/\/admin\/wizard\/\d+/, {timeout: T, waitUntil: 'commit'});
        const wizard = new SettingsWizardPage(this.page, wizardLabels);
        await wizard.expectOpen();
        return wizard;
    }

    /** A row's arrow, then "Remove": the "Confirm" window. */
    async openRemove(path) {
        const controls = await this.rowControls(path);
        await controls.getByRole('link', {name: 'Remove', exact: true}).click();
        const dialog = new RemoveDialog(this.page);
        await expect(dialog.root).toBeVisible({timeout: T});
        return dialog;
    }

    /**
     * "OK" in the "Confirm" window: waits for the delete's answer and the
     * grid's redraw; returns the answer.
     *
     * @param {RemoveDialog} dialog
     */
    async confirmRemove(dialog) {
        const answered = this.page.waitForResponse(
            (r) => r.request().method() === 'POST' && /delete-context/.test(r.url()),
            {timeout: 60_000}
        );
        await dialog.answer('OK');
        const response = await answered;
        await waitForJQueryIdle(this.page);
        await pastCloseWindow(this.page);
        return response;
    }

    /** "Cancel" in the "Confirm" window. */
    async cancelRemove(dialog) {
        await dialog.answer('Cancel');
        await pastCloseWindow(this.page);
    }

    // ---- "Order"

    /** "Order": the mode's "Done" and "Cancel ordering" show. */
    async startOrdering() {
        await this.orderLink.click();
        await expect(this.doneControl).toBeVisible({timeout: T});
    }

    /** Is the row a drag handle now (the mode's sortable class)? */
    dragHandleRows() {
        return this.rows.and(this.page.locator('.ui-sortable-handle'));
    }

    /**
     * Drag the row `from` onto the top of the row `to` with the mouse (the
     * jQuery UI sortable needs a real press, stepped moves and a release).
     */
    async drag(from, to) {
        const source = this.row(from);
        const target = this.row(to);
        await source.scrollIntoViewIfNeeded();
        const sb = await source.boundingBox();
        const tb = await target.boundingBox();
        if (!sb || !tb) throw new Error(`drag: no box for "${from}" or "${to}"`);
        await this.page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
        await this.page.mouse.down();
        await this.page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2 - 5, {steps: 5});
        await this.page.mouse.move(tb.x + tb.width / 2, tb.y + 3, {steps: 20});
        await this.page.mouse.move(tb.x + tb.width / 2, tb.y + 2, {steps: 2});
        await this.page.mouse.up();
    }

    /** "Done": waits for the order's save and the redraw; returns the answer. */
    async done() {
        const saved = this.page.waitForResponse(
            (r) => r.request().method() === 'POST' && /save-sequence/.test(r.url()),
            {timeout: T}
        );
        await this.doneControl.click();
        const response = await saved;
        await expect(this.doneControl).toBeHidden({timeout: T});
        await waitForJQueryIdle(this.page);
        return response;
    }

    /** "Cancel ordering": the mode ends. */
    async cancelOrdering() {
        await this.cancelOrderingControl.click();
        await expect(this.cancelOrderingControl).toBeHidden({timeout: T});
        await waitForJQueryIdle(this.page);
    }
}

/** The "Confirm" window of a row's "Remove". */
class RemoveDialog extends BasePage {
    constructor(page) {
        super(page);
        this.root = page.getByRole('dialog', {name: 'Confirm', exact: true});
        this.question = this.root.getByRole('paragraph');
    }

    button(name) {
        return this.root.getByRole('button', {name, exact: true});
    }

    /** Press "OK" or "Cancel" and wait for the window to go. */
    async answer(name) {
        await this.button(name).click();
        await expect(this.root).toBeHidden({timeout: T});
    }
}

// ---------------------------------------------------------------------------
// The journal form: "Create Journal" and "Edit"
// ---------------------------------------------------------------------------

class ContextFormWindow extends SettingsForm {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {{heading: string}} options the window's heading ("Create
     *   Journal" and its press and server words, or "Edit")
     */
    constructor(page, {heading}) {
        super(page, '[id^="context-name-control"]');
        this.root = page
            .getByRole('dialog')
            .filter({has: page.getByRole('heading', {name: heading, exact: true})})
            .filter({has: page.locator('form [id^="context-name-control"]')});
        this.heading = this.root.getByRole('heading', {name: heading, exact: true});
        this.form = this.root.locator('form').filter({has: page.locator(this.anchor)}).first();
        this.saveButton = this.form.getByRole('button', {name: 'Save', exact: true});
        this.savedStatus = this.form.locator('[role="status"]', {hasText: 'Saved'});
        this.errorSummary = this.form.locator('.pkpFormErrors');
        this.jumpToErrorButton = this.form.getByRole('button', {name: 'Jump to next error'});
        this.closeButton = this.root.getByRole('button', {name: 'Close', exact: true}).first();
        this.errors = this.form.locator('.pkpFieldError');
        this.country = this.form.locator('#context-country-control');
        this.countryOptions = this.country.locator('option');
        this.path = this.form.locator('#context-urlPath-control');
        this.pathPrefix = this.form.locator('.pkpFormField__inputPrefix');
        this.contactName = this.form.locator('#context-contactName-control');
        this.contactEmail = this.form.locator('#context-contactEmail-control');
        this.languageBoxes = this.form.locator('input[name="supportedLocales"]');
        this.primaryChoices = this.form.locator('input[name="primaryLocale"]');
        this.enableBox = this.form.locator('input[name="enabled"]');
        this.enableLabel = this.form.getByRole('checkbox', {name: /appear publicly on the site/});
    }

    /** The window is open, its form drawn and its rich-text boxes ready. */
    async ready() {
        await expect(this.heading).toBeVisible({timeout: T});
        await expect(this.form.locator(this.anchor).first()).toBeVisible({timeout: T});
        await super.ready();
    }

    /** "Journal Title" ("Press Name", "Server Title") in a language. */
    title(locale = 'en') {
        return this.form.locator(`[id="context-name-control-${locale}"]`);
    }

    /** "Journal Initials" ("Press Initials", "Server Initials") in a language. */
    initials(locale = 'en') {
        return this.form.locator(`[id="context-acronym-control-${locale}"]`);
    }

    /** "Journal Abbreviation" ("Server Abbreviation") in a language. */
    abbreviation(locale = 'en') {
        return this.form.locator(`[id="context-abbreviation-control-${locale}"]`);
    }

    /** The id prefix of "Journal description" in a language (a rich-text box). */
    descriptionId(locale = 'en') {
        return `context-description-control-${locale}`;
    }

    /** "Languages": the box of a language code. */
    languageBox(code) {
        return this.form.locator(`input[name="supportedLocales"][value="${code}"]`);
    }

    /** "Primary locale": the choice of a language code. */
    primaryChoice(code) {
        return this.form.locator(`input[name="primaryLocale"][value="${code}"]`);
    }

    /** The form's language button ("French"). */
    languageButton(label) {
        return this.form.locator('.pkpFormLocales button').filter({hasText: label});
    }

    /** Show a language's boxes (the form's language button), once. */
    async showLanguage(label, locale) {
        if (await this.title(locale).isVisible()) return;
        await this.languageButton(label).click();
        await expect(this.title(locale)).toBeVisible({timeout: T});
    }

    /** The red reason of a field (`name`, `acronym`, `contactEmail`, `urlPath`, `supportedLocales`, …). */
    error(field, locale = '') {
        return this.form.locator(`[id="context-${field}-error${locale ? `-${locale}` : ''}"]`);
    }

    /** Every field's reason on screen, as `{field[-locale]: text}` (a one-shot read; poll it). */
    async errorMap() {
        return this.errors.evaluateAll((els) =>
            Object.fromEntries(
                els.map((e) => [
                    e.id.replace(/^context-/, '').replace('-error', ''),
                    (e.textContent || '').replace(/\s+/g, ' ').trim(),
                ])
            )
        );
    }

    /** The country chosen now (the option's words, '' for none). */
    async countryChosen() {
        return this.country.evaluate((s) => {
            const select = /** @type {HTMLSelectElement} */ (s);
            return select.selectedIndex < 0 ? '' : select.options[select.selectedIndex].text.trim();
        });
    }

    /** Type into a box, replacing its value. */
    async type(box, text) {
        await box.fill(text);
        await box.blur();
    }

    /** Tick or untick a box and wait until it reads so. */
    async setBox(box, checked) {
        if ((await box.isChecked()) !== checked) {
            await box.click();
        }
        await expect(box).toBeChecked({checked});
    }

    /** Press "Save" and wait for the contexts request's answer. */
    async pressSave() {
        const answered = this.page.waitForResponse(isContextSave, {timeout: T});
        await this.saveButton.click();
        return answered;
    }

    /**
     * Press "Save" for a refusal the browser makes: waits for the reason
     * under `field` and returns the contexts saves sent meanwhile (none,
     * when the page refused it itself).
     */
    async saveRefusedInBrowser(field, locale = '') {
        const sent = [];
        const onRequest = (r) => {
            if (r.method() === 'POST' && /\/api\/v1\/contexts/.test(r.url())) sent.push(r.url());
        };
        this.page.on('request', onRequest);
        try {
            await this.saveButton.click();
            await expect(this.error(field, locale)).toBeVisible({timeout: T});
        } finally {
            this.page.off('request', onRequest);
        }
        return sent;
    }

    /**
     * "Close" (the window's back arrow), counting any question the browser
     * or the page asks on the way; waits for the window to go.
     *
     * @returns {Promise<string[]>} the browser's questions (none expected)
     */
    async close() {
        const asked = [];
        const onDialog = (dialog) => {
            asked.push(dialog.message());
            dialog.dismiss().catch(() => {});
        };
        this.page.on('dialog', onDialog);
        try {
            await this.closeButton.click();
            await expect(this.root).toHaveCount(0, {timeout: T});
            await pastCloseWindow(this.page);
        } finally {
            this.page.off('dialog', onDialog);
        }
        return asked;
    }
}

// ---------------------------------------------------------------------------
// The Settings Wizard
// ---------------------------------------------------------------------------

class SettingsWizardPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {{settings: string, journal: string}} [labels] the first top
     *   tab ("Journal Settings", "Setup", "Server Settings") and its first
     *   side tab ("Journal", "Press", "Server")
     */
    constructor(page, labels = {settings: 'Journal Settings', journal: 'Journal'}) {
        super(page);
        this.labels = labels;
        this.main = page.getByRole('main');
        this.heading = page.locator('main h1').first();
        this.trail = page.getByRole('navigation', {name: 'You are here:'});
        this.trailItems = this.trail.getByRole('listitem');
        this.topTabs = this.main.getByRole('tablist').first().getByRole('tab');
    }

    /** The wizard's address for a journal number. */
    url(contextId) {
        return this.siteUrl(`/en/admin/wizard/${contextId}`);
    }

    /** Type the wizard's address and wait for the tab row. */
    async goto(contextId) {
        await this.page.goto(this.url(contextId));
        await this.expectOpen();
    }

    /** The page is up: its heading and its tab row. */
    async expectOpen() {
        await expect(this.heading).toHaveText('Settings Wizard', {timeout: T});
        await expect(this.topTabs.first()).toBeVisible({timeout: T});
    }

    /** Reload and wait for the tab row. */
    async reload() {
        await this.page.reload();
        await this.expectOpen();
    }

    /** A top tab by name. */
    topTab(name) {
        return this.main.getByRole('tablist').first().getByRole('tab', {name, exact: true});
    }

    /** A top tab's panel. */
    topPanel(name) {
        return this.main.getByRole('tabpanel', {name, exact: true});
    }

    /** A top tab's side (inner) tabs. */
    sideTabs(top) {
        return this.topPanel(top).getByRole('tablist').first().getByRole('tab');
    }

    /** A side tab by name. */
    sideTab(top, side) {
        return this.topPanel(top).getByRole('tablist').first().getByRole('tab', {name: side, exact: true});
    }

    /** Wait until a pressed tab has written its key after "#". */
    async _awaitHash(tab) {
        const key = await tab.getAttribute('aria-controls');
        await expect(this.page).toHaveURL(new RegExp(`#${esc(key || '')}$`), {timeout: T});
    }

    /** Press a top tab and wait for it to be the open one and its key in the address. */
    async openTop(name) {
        const tab = this.topTab(name);
        await tab.click();
        await expect(tab).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await this._awaitHash(tab);
    }

    /** Press a top tab (when not open), then one of its side tabs. */
    async openSide(top, side) {
        const topTab = this.topTab(top);
        if ((await topTab.getAttribute('aria-selected')) !== 'true') {
            await topTab.click();
            await expect(topTab).toHaveAttribute('aria-selected', 'true', {timeout: T});
        }
        const tab = this.sideTab(top, side);
        await tab.click();
        await expect(tab).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await this._awaitHash(tab);
    }

    /** "Journal Settings" › "Journal": its form ready. */
    async journalForm() {
        await this.openSide(this.labels.settings, this.labels.journal);
        const form = new WizardJournalForm(this.page);
        await form.ready();
        return form;
    }
}

/** The wizard's "Journal" tab: the journal form (U07's SettingsForm, the `context-*` boxes). */
class WizardJournalForm extends SettingsForm {
    constructor(page) {
        super(page, '[id^="context-name-control"]');
        this.contactName = this.form.locator('#context-contactName-control');
        this.frenchBoxes = this.form.locator('[id$="-fr_CA"]');
    }

    title(locale = 'en') {
        return this.form.locator(`[id="context-name-control-${locale}"]`);
    }

    initials(locale = 'en') {
        return this.form.locator(`[id="context-acronym-control-${locale}"]`);
    }

    descriptionId(locale = 'en') {
        return `context-description-control-${locale}`;
    }

    /** The form's language buttons (none on a one-language form). */
    languageButtons() {
        return this.form.locator('.pkpFormLocales button');
    }
}

// ---------------------------------------------------------------------------
// The site's home page and its list of journals
// ---------------------------------------------------------------------------

class SiteJournalsList extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {{table: string}} labels the list's heading ("Journals", "Presses", "Servers")
     */
    constructor(page, labels) {
        super(page);
        this.labels = labels;
        this.container = page.locator('.page_index_site').locator('.journals, .presses, .servers').first();
        this.heading = this.container.locator('h2').first();
        this.entries = this.container.locator(':scope > ul > li');
        this.registerLink = page.getByRole('navigation', {name: 'Site Navigation'}).getByRole('link', {name: 'Register', exact: true});
    }

    /** The site's address (it opens the list while two or more journals are enabled publicly). */
    async goto() {
        await this.page.goto(this.siteUrl(''));
        await expect(this.heading).toBeVisible({timeout: T});
    }

    /** Reload and wait for the list's heading. */
    async reload() {
        await this.page.reload();
        await expect(this.heading).toBeVisible({timeout: T});
    }

    /** A journal's entry, by its whole name. */
    entry(name) {
        return this.entries.filter({has: this.page.locator('h3 a', {hasText: whole(name)})});
    }

    /** An entry's name link. */
    nameLink(name) {
        return this.entry(name).locator('h3 a');
    }

    /** An entry's description (present only when set). */
    description(name) {
        return this.entry(name).locator('.description');
    }

    /** An entry's link under the description, by its words ("View Journal", "Current Issue"). */
    link(name, label) {
        return this.entry(name).locator('ul.links').getByRole('link', {name: label, exact: true});
    }

    /** An entry's parts top to bottom: 'thumb', 'name', 'description', 'links'. */
    async parts(name) {
        await expect(this.entry(name)).toHaveCount(1, {timeout: T});
        return this.entry(name).evaluate((li) => {
            const out = [];
            if (li.querySelector(':scope > .thumb')) out.push('thumb');
            const body = li.querySelector(':scope > .body') || li;
            for (const child of body.children) {
                if (child.tagName === 'H3') out.push('name');
                else if (child.classList.contains('description')) out.push('description');
                else if (child.classList.contains('links')) out.push('links');
                else out.push(child.tagName.toLowerCase());
            }
            return out;
        });
    }

    /** Every entry's name, in the list's order. */
    async names() {
        return this.entries.locator('h3 a').evaluateAll((as) => as.map((a) => (a.textContent || '').replace(/\s+/g, ' ').trim()));
    }

    /** The entries among `names`, in the list's order (a scoped read for `expect.poll`). */
    async orderOf(names) {
        return (await this.names()).filter((n) => names.includes(n));
    }

    /** The journals the site-level Register page offers, in its order (the page is open). */
    async registerNames() {
        await expect(this.page.locator('li.context .name').first()).toBeVisible({timeout: T});
        return this.page
            .locator('li.context .name')
            .evaluateAll((els) => els.map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim()));
    }
}

module.exports = {
    HostedJournalsPage,
    RemoveDialog,
    ContextFormWindow,
    SettingsWizardPage,
    WizardJournalForm,
    SiteJournalsList,
    isContextSave,
    pastCloseWindow,
    whole,
    flat,
};
