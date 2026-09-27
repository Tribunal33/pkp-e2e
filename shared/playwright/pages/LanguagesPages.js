// @ts-check
/**
 * @file shared/playwright/pages/LanguagesPages.js
 *
 * Page objects for U57 "Languages & locales"
 * (docs/specs/U57-languages-and-locales.md), shared by the OJS, OMP and OPS
 * suites. App-neutral (PRINCIPLES M2): every word that differs per app
 * ("Hosted Journals" / "Hosted Presses" / "Hosted Servers", the Settings
 * wizard's "Journal Settings" / "Setup" / "Server Settings") is passed in
 * by the suite; the locators are the markup the three apps share (one
 * lib/pkp grid layer, one language-toggle block template, one ui-library
 * header). The pages around these surfaces are reused, not copied:
 * Administration › "Site Settings" is U60's `SiteSettingsPage`, the
 * journal's Settings pages and their Vue forms are U07's `SettingsPages`
 * and `SettingsForm`, the initials menu is U08's `EditorialChrome`,
 * Administration › "Hosted Journals" is U53's `HostedContextsPage`.
 *
 * Surfaces:
 * - LanguageGrid — one legacy language list (`#languageGridContainer`,
 *   `#submissionLanguageGridContainer`): its title, columns, rows by code,
 *   a row's cells as read, its tick boxes and radios by column, the arrow
 *   and the links it reveals, and a cell pressed with the list's answer
 *   awaited.
 * - SiteLanguagesList — Administration › "Site Settings" › "Site Setup" ›
 *   "Languages": the list, "Install Locale", the line under the list, the
 *   questions a change asks ("Disable", "Primary locale", "Remove") and
 *   their answers, the notice at the top right.
 * - InstallLocaleWindow — the "Install Locale" window.
 * - JournalLanguagesTab — Settings › Website › "Setup" › "Languages" (and
 *   the Settings wizard's "Languages" side tab): "Website Languages",
 *   "Submission Languages", "Add/Remove Languages".
 * - AddLanguagesWindow — the "Add/Remove Languages" window.
 * - LanguageBlock — the sidebar "Language" block of a public page.
 * - LanguageMenu — "Change Language" in the editorial header's initials
 *   menu (U08's EditorialChrome, read language-independently).
 * - notice(), noticeDuring() — the notice at the top right.
 *
 * DOM facts the locators rely on (U57 claim checks K1–K3, 2026-09-27,
 * three apps; `.reports/U57/screen-notes.md`, `screen-locators.md`):
 * - both kinds of list are legacy grids: rows `tr.gridRow[id$="-row-<code>"]`,
 *   boxes `input[id^="select-cell-<code>-<column>"]` with the columns
 *   `enable`, `sitePrimary` (the site's) and `contextPrimary`, `uiLocale`,
 *   `formLocale`, `defaultSubmissionLocale`, `submissionLocale`,
 *   `submissionMetadataLocale` (the journal's); a row's arrow is
 *   `a.show_extras` in its first cell and its links are in the NEXT `tr`
 *   (`…-control-row`); a click saves at once and the row is drawn again;
 * - the site's questions are legacy confirmations titled by the action,
 *   with "OK" and "Cancel"; a refusal on a journal's list is the browser's
 *   own alert();
 * - "Install Locale" and "Add/Remove Languages" open a window holding
 *   `form#installLanguageForm` / `form#addLanguageForm`, one box per
 *   language (`input[type=checkbox][value=<code>]`); closing it with a box
 *   changed asks through the browser's confirm();
 * - the notice at the top right is `.pkpNotification`;
 * - Settings › Website turns `#setup/languages` into `#languages` and a
 *   load of `…/website#languages` opens "Appearance", so the tab is opened
 *   by pressing `#setup-button` and `#languages-button`, never by address;
 * - the block is `.block_language` in `.pkp_structure_sidebar`, heading
 *   `h2`, one `li` per language (`li.current` on the one being read);
 * - the initials menu is `[data-cy="app-user-nav"]` (button, then `nav`),
 *   whose accessible name follows the interface language.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {SiteSettingsPage} = require('./SiteSettingsPages.js');
const {SettingsPages} = require('./ContextIdentityPages.js');
const {EditorialChrome} = require('./NavigationChromePages.js');
const {HostedContextsPage} = require('./UsersManagementPages.js');
const {waitForJQueryIdle} = require('../support/legacy.js');

const T = 30_000;
/**
 * The ceiling for one change on the site's list, which saves every journal
 * again (spec footnote b): on the fleets after a full run (457 journals on
 * OJS, 2026-09-27) an "Install Locale" "Save" took 145 s and a "Remove"
 * 62 s (`.reports/U57/tojs/p5-site-change-duration-ojs.json`); eight
 * minutes leaves room for a slower runner.
 */
const SITE_CHANGE = 480_000;

/** A whole-text matcher that tolerates the templates' white space. */
function whole(text) {
    return new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
}

/** Text with its white space folded. */
const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();

/** Wait out the modal store's 450 ms slot after a window or question closed (patterns.md pitfall 4). */
async function pastModalSlot(page) {
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 600)));
}

/** The notice at the top right, by (part of) its sentence. */
function notice(page, text) {
    return page.locator('.pkpNotification:visible').filter({hasText: text}).first();
}

/**
 * Run `action` with a wait for the notice already armed, so a notice that
 * comes and goes while the action's own waits run is still caught.
 */
async function noticeDuring(page, text, action, {timeout = T} = {}) {
    const box = notice(page, text);
    const seen = expect(box).toBeVisible({timeout});
    seen.catch(() => {});
    const result = await action();
    await seen;
    // Close it, so the next change's notice is its own and not this one.
    await box
        .getByRole('button')
        .first()
        .click({timeout: 2_000})
        .catch(() => {});
    await expect(page.locator('.pkpNotification:visible').filter({hasText: text})).toHaveCount(0, {timeout: T});
    return result;
}

/**
 * Run `action` while the browser's own dialogs (alert, confirm) are
 * answered in turn by `answers` ('accept' | 'dismiss'); returns the
 * messages the dialogs carried, in order. A dialog beyond the answers is
 * accepted and still recorded.
 */
async function answeringDialogs(page, answers, action) {
    const messages = [];
    const queue = [...answers];
    const onDialog = async (dialog) => {
        messages.push({type: dialog.type(), message: dialog.message()});
        const answer = dialog.type() === 'beforeunload' ? 'accept' : queue.shift() || 'accept';
        if (answer === 'dismiss') await dialog.dismiss().catch(() => {});
        else await dialog.accept().catch(() => {});
    };
    page.on('dialog', onDialog);
    try {
        await action();
    } finally {
        page.off('dialog', onDialog);
    }
    return messages;
}

// ---------------------------------------------------------------------------
// One legacy language list
// ---------------------------------------------------------------------------

class LanguageGrid extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} containerId 'languageGridContainer' | 'submissionLanguageGridContainer'
     */
    constructor(page, containerId) {
        super(page);
        this.container = page.locator(`[id="${containerId}"]:visible`).first();
        this.title = this.container.locator('h4').first();
        this.headerCells = this.container.locator('thead th');
        this.rows = this.container.locator('tbody tr.gridRow');
        this.actions = this.container.locator('.header a:visible');
    }

    /** The list is drawn, with at least one row, and no request is running. */
    async waitReady() {
        await expect(this.rows.first()).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** The column headings, in order. */
    async columns() {
        await this.waitReady();
        return (await this.headerCells.allInnerTexts()).map(flat);
    }

    /** A row by its language code. */
    row(code) {
        return this.container.locator(`tr.gridRow[id$="-row-${code}"]`);
    }

    /** The codes of the rows, in order (read once the list is drawn). */
    async codes() {
        await this.waitReady();
        return this.rows.evaluateAll((trs) => trs.map((tr) => tr.id.replace(/^.*-row-/, '')));
    }

    /** A row's tick box or radio of a column (`uiLocale`, `enable`, …). */
    cell(code, column) {
        return this.container.locator(`input[id^="select-cell-${code}-${column}"]`).first();
    }

    /** A row's cells as read (text, white space folded), in order. */
    async cellTexts(code) {
        const row = this.row(code);
        await expect(row).toBeVisible({timeout: T});
        return (await row.locator('td').allInnerTexts()).map(flat);
    }

    /** The row's "Locale" cell: the cell whose text is the language's names. */
    localeCell(code, index) {
        return this.row(code).locator('td').nth(index);
    }

    /**
     * A row's "Locale" and "Code" cells as read (`td` 1 and 2), white space
     * folded: the arrow's "Settings" in the first cell stays out.
     */
    async localeAndCode(code) {
        const row = this.row(code);
        await expect(row).toBeVisible({timeout: T});
        const cells = row.locator('td');
        return {locale: flat(await cells.nth(1).innerText()), code: flat(await cells.nth(2).innerText())};
    }

    /** The asterisk after a language's name (`.pkp_form_error` in its row). */
    asterisk(code) {
        return this.row(code).locator('.pkp_form_error');
    }

    /** The arrow at the start of a row (none on a row without actions). */
    arrow(code) {
        return this.row(code).locator('a.show_extras, a.hide_extras');
    }

    /** The row's links revealed by its arrow (the next `tr`, patterns.md pitfall 10). */
    rowControls(code) {
        return this.row(code).locator('xpath=following-sibling::tr[1]');
    }

    /** Press a row's arrow (once) and return the links it reveals, by their words. */
    async openRowActions(code) {
        const arrow = this.row(code).locator('a.show_extras');
        if (await arrow.count()) {
            await arrow.first().click();
        }
        const links = this.rowControls(code).getByRole('link');
        await expect(links.first()).toBeVisible({timeout: T});
        return (await links.allInnerTexts()).map(flat).filter(Boolean);
    }

    /** A link under a row's arrow (arrow pressed first). */
    rowAction(code, label) {
        return this.rowControls(code).getByRole('link', {name: label, exact: true});
    }

    /**
     * Click a cell and wait for the list's answer to it; returns the
     * response. `endpoint` is a part of the answering request's address.
     */
    async press(code, column, {endpoint = /languages?-grid\//, timeout = T} = {}) {
        const answered = this.page.waitForResponse(
            (r) => r.request().method() === 'POST' && endpoint.test(r.url()),
            {timeout}
        );
        await this.cell(code, column).click();
        const response = await answered;
        await waitForJQueryIdle(this.page);
        return response;
    }
}

// ---------------------------------------------------------------------------
// Administration › "Site Settings" › "Site Setup" › "Languages"
// ---------------------------------------------------------------------------

class SiteLanguagesList extends LanguageGrid {
    /** @param {import('@playwright/test').Page} page a Site Administrator's page */
    constructor(page) {
        super(page, 'languageGridContainer');
        this.settings = new SiteSettingsPage(page);
        this.installButton = this.container.locator('.header a').filter({hasText: whole('Install Locale')});
    }

    /** Open Site Settings, then "Site Setup" › "Languages", and wait for the list. */
    async goto() {
        await this.settings.goto();
        await this.openTab();
    }

    /** From Administration, its "Site Settings" link, then the tab. */
    async gotoFromAdministration() {
        await this.settings.gotoFromAdministration();
        await this.openTab();
    }

    /** Reload the page and open the tab again. */
    async reload() {
        await this.settings.reload();
        await this.openTab();
    }

    /** "Site Setup" › "Languages" on the open Site Settings page. */
    async openTab() {
        await this.settings.open('Site Setup', 'Languages');
        await this.waitReady();
    }

    /** The line under the list ("Marked locales may be incomplete."). */
    footLine(text) {
        return this.container.getByText(text, {exact: false});
    }

    /** The "Enable" box of a row. */
    enableBox(code) {
        return this.cell(code, 'enable');
    }

    /** The "Primary locale" radio of a row. */
    primaryRadio(code) {
        return this.cell(code, 'sitePrimary');
    }

    /** A question window by its title ("Disable", "Primary locale", "Remove"). */
    question(title) {
        return this.page.getByRole('dialog', {name: title, exact: true}).last();
    }

    /** A button ("OK", "Cancel") of a question. */
    questionButton(title, label) {
        const dialog = this.question(title);
        return dialog.getByRole('button', {name: label, exact: true}).or(dialog.getByRole('link', {name: label, exact: true})).first();
    }

    /**
     * Answer the open question titled `title` with `label` and wait for it
     * to go; "OK" also waits for the list's answer, which it returns.
     */
    async answer(title, label, {timeout = SITE_CHANGE} = {}) {
        const answered =
            label === 'OK'
                ? this.page.waitForResponse((r) => r.request().method() === 'POST' && /admin-language-grid\//.test(r.url()), {timeout})
                : null;
        await this.questionButton(title, label).click();
        // The question stays open until the list has answered, which on a
        // full fleet takes minutes: the answer first, then the window.
        const response = answered ? await answered : null;
        await expect(this.question(title)).toBeHidden({timeout: T});
        await waitForJQueryIdle(this.page);
        await pastModalSlot(this.page);
        return response;
    }

    /** Press a row's arrow and its "Remove"; the question opens. */
    async pressRemove(code) {
        await pastModalSlot(this.page);
        await this.openRowActions(code);
        await this.rowAction(code, 'Remove').click();
        await expect(this.question('Remove')).toBeVisible({timeout: T});
    }

    /** Press "Install Locale" and wait for its window. */
    async openInstall() {
        await pastModalSlot(this.page);
        await this.installButton.click();
        const win = new InstallLocaleWindow(this.page);
        await win.waitOpen();
        return win;
    }

    /**
     * Take a language off the site if it is installed, as a test's
     * `finally` does (the row's "Remove" and "OK"); true when it was there.
     */
    async removeIfInstalled(code) {
        await this.goto();
        if (!(await this.row(code).count())) {
            return false;
        }
        await this.pressRemove(code);
        const response = await this.answer('Remove', 'OK');
        expect(response && response.status(), `removing ${code} answers 200`).toBe(200);
        await this.reload();
        await expect(this.row(code), `${code} is gone after a reload`).toHaveCount(0, {timeout: T});
        return true;
    }

    /**
     * Put the site back as installed, as a test's `finally` does, whatever
     * state a failure midway left: `primary` the site's primary language
     * again first, then each of `remove` taken off; confirmed on the list
     * after a reload.
     */
    async restore({primary = 'en', remove = ['de'], installed = ['en', 'fr_CA']} = {}) {
        await this.makePrimaryIfNot(primary);
        for (const code of remove) {
            await this.removeIfInstalled(code);
        }
        await this.goto();
        expect((await this.codes()).sort(), 'the site as installed').toEqual([...installed].sort());
        await expect(this.primaryRadio(primary)).toBeChecked({timeout: T});
    }

    /**
     * Make a language the site's primary one if it is not, as a test's
     * `finally` does (its "Primary locale" radio and "OK").
     */
    async makePrimaryIfNot(code) {
        await this.goto();
        if (await this.primaryRadio(code).isChecked()) {
            return false;
        }
        await this.primaryRadio(code).click();
        await expect(this.question('Primary locale')).toBeVisible({timeout: T});
        await this.answer('Primary locale', 'OK');
        await this.reload();
        await expect(this.primaryRadio(code)).toBeChecked({timeout: T});
        return true;
    }

    /** Install languages through "Install Locale" and "Save"; returns the save's answer. */
    async install(codes) {
        await this.goto();
        const win = await this.openInstall();
        for (const code of codes) {
            await win.box(code).check();
        }
        return win.save();
    }
}

// ---------------------------------------------------------------------------
// The "Install Locale" window
// ---------------------------------------------------------------------------

class InstallLocaleWindow extends BasePage {
    constructor(page) {
        super(page);
        this.dialog = page.getByRole('dialog', {name: 'Install Locale', exact: true}).last();
        this.form = page.locator('form#installLanguageForm');
        this.group = this.form.getByRole('group', {name: 'Available Locales', exact: true});
        this.boxes = this.form.locator('input[type="checkbox"]');
        this.saveButton = this.form.getByRole('button', {name: 'Save', exact: true});
        this.cancelButton = this.form
            .getByRole('button', {name: 'Cancel', exact: true})
            .or(this.form.getByRole('link', {name: 'Cancel', exact: true}))
            .first();
        this.closeButton = this.dialog.getByRole('button', {name: 'Close', exact: true}).first();
    }

    async waitOpen() {
        await expect(this.form).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** A language's box by its code. */
    box(code) {
        return this.form.locator(`input[type="checkbox"][value="${code}"]`);
    }

    /** A language's box by its label ("German/Deutsch (de)"). */
    boxByLabel(label) {
        return this.form.getByRole('checkbox', {name: label, exact: true});
    }

    /** The window's text, white space folded. */
    async text() {
        await this.waitOpen();
        return flat(await this.form.innerText());
    }

    /** Press "Save" and wait for the install's answer and the window to close; returns the answer. */
    async save({timeout = SITE_CHANGE} = {}) {
        const answered = this.page.waitForResponse((r) => /save-install-locale/.test(r.url()), {timeout});
        await this.saveButton.click();
        const response = await answered;
        await expect(this.form).toBeHidden({timeout: T});
        await waitForJQueryIdle(this.page);
        await pastModalSlot(this.page);
        return response;
    }

    /** Press "Cancel" and wait for the window to close. */
    async cancel() {
        await this.cancelButton.click();
        await expect(this.form).toBeHidden({timeout: T});
        await pastModalSlot(this.page);
    }

    /**
     * Press the window's "Close" while the browser's leave question is
     * answered with `answer`; returns the question's message (null when
     * none came).
     */
    async closeAnswering(answer) {
        const asked = await answeringDialogs(this.page, [answer], async () => {
            await this.closeButton.click();
            await pastModalSlot(this.page);
        });
        return asked.length ? asked[0].message : null;
    }
}

// ---------------------------------------------------------------------------
// A journal's "Languages" tab
// ---------------------------------------------------------------------------

class JournalLanguagesTab extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {{locale?: string}} [options] the locale segment of the
     *   journal's addresses ('en' once it has two interface languages)
     */
    constructor(page, contextPath, {locale = ''} = {}) {
        super(page);
        this.contextPath = contextPath;
        this.settings = new SettingsPages(page, contextPath, {locale});
        this.website = new LanguageGrid(page, 'languageGridContainer');
        this.submission = new LanguageGrid(page, 'submissionLanguageGridContainer');
        this.addRemoveButton = page.locator('[id="submissionLanguageGridContainer"] .header a[id*="addLanguageModal"]').first();
    }

    /** Settings › Website's address with no tab in it. */
    url() {
        return this.settings.url('website');
    }

    /**
     * Open Settings › Website (a full load) and press "Setup" and
     * "Languages" (by id: the names follow the interface language).
     */
    async goto() {
        await this.settings.goto('website');
        await this.openTab();
    }

    /** Press "Setup" and its side tab "Languages" on the open Website page (or the wizard's tab). */
    async openTab() {
        const setup = this.page.locator('#setup-button').first();
        await expect(setup).toBeVisible({timeout: T});
        if ((await setup.getAttribute('aria-selected')) !== 'true') {
            await setup.click();
        }
        const side = this.page.locator('#languages-button:visible').first();
        await expect(side).toBeVisible({timeout: T});
        if ((await side.getAttribute('aria-selected')) !== 'true') {
            await side.click();
        }
        await expect(side).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await this.website.waitReady();
        await this.submission.waitReady();
    }

    /**
     * Press a box of "Website Languages" and wait for the answer. A refused
     * press answers through the browser's alert(), which is accepted and
     * returned as `alerts`.
     */
    async pressWebsite(code, column) {
        let response;
        const alerts = await answeringDialogs(this.page, [], async () => {
            response = await this.website.press(code, column, {endpoint: /manage-language-grid\//});
        });
        return {response, alerts: alerts.map((a) => a.message)};
    }

    /** Press a box or radio of "Submission Languages" and wait for the answer (alerts as above). */
    async pressSubmission(code, column) {
        let response;
        const alerts = await answeringDialogs(this.page, [], async () => {
            response = await this.submission.press(code, column, {endpoint: /submission-language-grid\//});
        });
        return {response, alerts: alerts.map((a) => a.message)};
    }

    /** Press "Add/Remove Languages" and wait for its window. */
    async openAddRemove() {
        await pastModalSlot(this.page);
        await this.addRemoveButton.click();
        const win = new AddLanguagesWindow(this.page);
        await win.waitOpen();
        return win;
    }

    /** A Settings › Website › "Setup" side tab's form (U07's), opened by pressing it on the open page. */
    async pressSetupSideTab(sideId) {
        const setup = this.page.locator('#setup-button').first();
        if ((await setup.getAttribute('aria-selected')) !== 'true') {
            await setup.click();
        }
        const side = this.page.locator(`#${sideId}-button:visible`).first();
        await side.click();
        await expect(side).toHaveAttribute('aria-selected', 'true', {timeout: T});
        const form = sideId === 'information' ? this.settings.informationForm() : this.settings.privacyForm();
        await form.ready();
        return form;
    }

    /**
     * Press the side tab "Languages" (whether or not it is selected) and wait
     * for the address to end in `#languages`: `openTab()` skips a selected
     * tab, which leaves the address at `#setup`.
     */
    async pressLanguagesSideTab() {
        await this.page.locator('#languages-button:visible').first().click();
        await expect(this.page).toHaveURL(/#languages$/, {timeout: T});
        await this.website.waitReady();
        await this.submission.waitReady();
    }

    /**
     * Load Settings › Website afresh and press a "Setup" side tab: a goto
     * that changes only the address's hash does not reload the page
     * (patterns.md pitfall 17).
     */
    async reloadedSetupSideTab(sideId) {
        await this.settings.goto('website');
        return this.pressSetupSideTab(sideId);
    }
}

// ---------------------------------------------------------------------------
// The "Add/Remove Languages" window
// ---------------------------------------------------------------------------

class AddLanguagesWindow extends BasePage {
    constructor(page) {
        super(page);
        this.form = page.locator('form#addLanguageForm');
        this.dialog = page.getByRole('dialog').filter({has: this.form}).last();
        this.group = this.form.getByRole('group', {name: 'Available Locales', exact: true});
        this.boxes = this.form.locator('input[type="checkbox"]');
        this.saveButton = this.form.getByRole('button', {name: 'Save', exact: true});
        this.cancelButton = this.form
            .getByRole('button', {name: 'Cancel', exact: true})
            .or(this.form.getByRole('link', {name: 'Cancel', exact: true}))
            .first();
        this.closeButton = this.dialog.getByRole('button', {name: 'Close', exact: true}).first();
    }

    async waitOpen() {
        await expect(this.form).toBeVisible({timeout: T});
        await expect(this.boxes.first()).toBeAttached({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** A language's box by its code. */
    box(code) {
        return this.form.locator(`input[type="checkbox"][value="${code}"]`);
    }

    /** A language's box by its label ("[ fr_CA ] French (Canada)"). */
    boxByLabel(label) {
        return this.form.getByRole('checkbox', {name: label, exact: true});
    }

    /** The window's text before its boxes, white space folded. */
    async text() {
        await this.waitOpen();
        return flat(await this.form.innerText());
    }

    /** Press "Save" and wait for the window's answer; returns it. */
    async pressSave() {
        const answered = this.page.waitForResponse(
            (r) => r.request().method() === 'POST' && /submission-language-grid\//.test(r.url()),
            {timeout: T}
        );
        await this.saveButton.click();
        const response = await answered;
        await waitForJQueryIdle(this.page);
        return response;
    }

    /** Press "Save" and wait for the window to close. */
    async save() {
        const response = await this.pressSave();
        await expect(this.form).toBeHidden({timeout: T});
        await pastModalSlot(this.page);
        return response;
    }

    /** Press the window's "Close" while the leave question is answered with `answer`; returns its message. */
    async closeAnswering(answer) {
        const asked = await answeringDialogs(this.page, [answer], async () => {
            await this.closeButton.click();
            await pastModalSlot(this.page);
        });
        return asked.length ? asked[0].message : null;
    }
}

// ---------------------------------------------------------------------------
// The Settings wizard's "Languages" side tab
// ---------------------------------------------------------------------------

/**
 * Administration › "Hosted Journals" › the journal's row arrow › "Settings
 * wizard", its top tab `setupTab` ("Journal Settings", "Setup", "Server
 * Settings") and its side tab "Languages"; returns the tab's two lists.
 *
 * @param {import('@playwright/test').Page} page a Site Administrator's page
 * @param {string} contextPath
 * @param {{hostedLabel: string, setupTab: string}} labels
 */
async function openWizardLanguages(page, contextPath, {hostedLabel, setupTab}) {
    const hosted = new HostedContextsPage(page, {hostedLabel});
    await hosted.gotoFromAdministration();
    await hosted.openSettingsWizard(contextPath);
    const top = page.getByRole('tab', {name: setupTab, exact: true}).first();
    if ((await top.getAttribute('aria-selected')) !== 'true') {
        await top.click();
    }
    await expect(top).toHaveAttribute('aria-selected', 'true', {timeout: T});
    const side = page.getByRole('tab', {name: 'Languages', exact: true}).and(page.locator(':visible')).first();
    await side.click();
    await expect(side).toHaveAttribute('aria-selected', 'true', {timeout: T});
    const tab = new JournalLanguagesTab(page, contextPath);
    await tab.website.waitReady();
    await tab.submission.waitReady();
    return tab;
}

// ---------------------------------------------------------------------------
// The sidebar "Language" block
// ---------------------------------------------------------------------------

class LanguageBlock extends BasePage {
    constructor(page) {
        super(page);
        this.sidebar = page.locator('.pkp_structure_sidebar');
        this.block = this.sidebar.locator('.block_language');
        this.heading = this.block.locator('h2').first();
        this.items = this.block.locator('li');
        this.links = this.block.getByRole('link');
        this.pageHeader = page.locator('header.pkp_structure_head');
    }

    /** A language's link, named in its own language ("English", "français"). */
    link(label) {
        return this.block.getByRole('link', {name: label, exact: true});
    }

    /** The links' words, in order. */
    async linkNames() {
        await expect(this.links.first()).toBeVisible({timeout: T});
        return (await this.links.allInnerTexts()).map(flat);
    }

    /**
     * The look of each entry as the reader sees it (the computed styles
     * that could mark one apart), in order.
     */
    async entryLooks() {
        await expect(this.links.first()).toBeVisible({timeout: T});
        return this.links.evaluateAll((as) =>
            as.map((a) => {
                const s = getComputedStyle(a);
                const li = a.closest('li');
                const ls = li ? getComputedStyle(li) : s;
                return [s.color, s.fontWeight, s.fontStyle, s.textDecorationLine, s.backgroundColor, ls.backgroundColor, ls.listStyleType, ls.borderLeftWidth].join('|');
            })
        );
    }
}

// ---------------------------------------------------------------------------
// "Change Language" in the initials menu
// ---------------------------------------------------------------------------

class LanguageMenu extends EditorialChrome {
    constructor(page, {root = null} = {}) {
        super(page);
        const scope = root || page.locator('header.app__header');
        this.initialsButton = scope.locator('[data-cy="app-user-nav"] button').first();
        // The menu's accessible name follows the interface language.
        this.userMenu = page.locator('[data-cy="app-user-nav"] nav:visible').first();
        this.userMenuLinks = this.userMenu.locator('a');
    }

    /** Open the menu and return its lines as data (U08's `userMenuItems`); closes it again. */
    async read() {
        await this.openUserMenu();
        const items = await this.userMenuItems();
        await this.closeUserMenu();
        return items;
    }

    /**
     * Open the menu and choose a language by its link; waits for the page
     * to open again at an address carrying `locale`.
     */
    async choose(label, locale) {
        await this.openUserMenu();
        await this.userMenuLink(label).click();
        await this.page.waitForURL(new RegExp(`/${locale}(/|$|\\?|#)`), {timeout: T});
        await expect(this.initialsButton).toBeVisible({timeout: T});
    }
}

module.exports = {
    LanguageGrid,
    SiteLanguagesList,
    InstallLocaleWindow,
    JournalLanguagesTab,
    AddLanguagesWindow,
    LanguageBlock,
    LanguageMenu,
    openWizardLanguages,
    notice,
    noticeDuring,
    answeringDialogs,
    pastModalSlot,
    SITE_CHANGE,
};
