/**
 * @file shared/playwright/pages/CustomContentPages.js
 *
 * Page objects for U09 "Custom pages & blocks"
 * (docs/specs/U09-custom-pages-and-blocks.md), shared by the OJS, OMP and
 * OPS suites. App-neutral: every on-screen word that differs per app is
 * passed in by the suite; the locators are the markup the three apps share
 * (lib/pkp templates, the Custom Block Manager and Static Pages plugins,
 * the TinyMCE bar pkp configures).
 *
 * Surfaces:
 * - RichTextBox — one legacy formatted-text box (TinyMCE): its bar, typing,
 *   "Insert Tag" and its menu, "Insert/edit image".
 * - ImageWindow — TinyMCE's "Insert/Edit Image" window: "General" /
 *   "Upload", "Browse for an image", the file input, "Source", "Save" /
 *   "Cancel", and the small refusal window over it with "OK".
 * - CustomPageWindow — the "Custom Page" item window of Settings › Website
 *   › "Setup" › "Navigation" (U08's ItemWindow, extended): the "Content"
 *   boxes, the note under "Path", "Preview".
 * - PluginsTab — Settings › Website › "Plugins" › "Installed Plugins": a
 *   plugin's row, its category's heading, its "Enabled" box and the links
 *   under its arrow; the page's top tabs.
 * - BlockManager / BlockWindow — the "Custom Block Manager" window, its
 *   "Custom Blocks" list, and the block window ("Block Name", "Content",
 *   "Show Name", "Save", "Cancel").
 * - SidebarSetup — Settings › Website › "Appearance" › "Setup", the
 *   "Sidebar" boxes and "Save".
 * - StaticPagesTab / StaticPageWindow {OJS OMP} — the "Static Pages" tab,
 *   its list, and the static page window.
 * - openPreview() — the new browser tab a "Preview" opens.
 * - PublicContent — what the visitor reads: the page's heading and text,
 *   a custom block in the sidebar, the pictures of the page.
 *
 * DOM shapes from the U09 claim check (.reports/U09/screen-notes.md, the
 * kept scripts under shared/playwright/checks/U09/) and the OJS suite's
 * runs, 2026-09-24.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {ItemWindow} = require('./NavigationChromePages.js');
const {waitForJQueryIdle} = require('../support/legacy.js');

const T = 30_000;

/** Select-all on the platform's key (TinyMCE ignores the other modifier). */
const SELECT_ALL = process.platform === 'darwin' ? 'Meta+A' : 'Control+A';

/** Text with runs of white space collapsed. */
function flat(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
}

/** Escape a string for a RegExp. */
function esc(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A context-relative address: '/index.php/<path>[/<locale>]<pathname>'. */
function contextAddress(contextPath, locale, pathname = '') {
    return `/index.php/${contextPath}${locale ? `/${locale}` : ''}${pathname}`;
}

/**
 * The notices at the top right (the legacy notification area), visible ones.
 * `except` leaves out a notice by its words (one an earlier step raised
 * and that may still be on screen).
 */
function notices(page, {except} = {}) {
    const all = page.locator('.pkp_notification:visible, [class*="otification"]:visible').filter({hasText: /\S/});
    return except ? all.filter({hasNotText: except}) : all;
}

// ---------------------------------------------------------------------------
// The formatted-text box
// ---------------------------------------------------------------------------

class RichTextBox extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {import('@playwright/test').Locator} textarea the box's backing textarea
     * @param {import('@playwright/test').Locator} scope the window holding it (for the other language's popover)
     */
    constructor(page, textarea, scope) {
        super(page);
        this.textarea = textarea;
        this.scope = scope;
    }

    /** The editor's id (the textarea's id, runtime-suffixed). */
    async id() {
        await expect(this.textarea).toHaveCount(1, {timeout: T});
        return this.textarea.getAttribute('id');
    }

    /** Wait until TinyMCE has taken the box over (text typed before is lost). */
    async ready() {
        const id = await this.id();
        await this.page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T});
        return id;
    }

    /** The box's bar and writing area (`[id=<id>] ~ .tox-tinymce`). */
    async container() {
        return this.page.locator(`[id="${await this.id()}"] ~ .tox-tinymce`).first();
    }

    /** A button of the bar by its accessible name ("Insert Tag", "Insert/edit image"). */
    async barButton(name) {
        return (await this.container()).getByRole('button', {name, exact: true});
    }

    /** The writing area's frame. */
    async frame() {
        return this.page.locator(`[id="${await this.id()}_ifr"]`);
    }

    /** The writing area's body. */
    async body() {
        return (await this.frame()).contentFrame().locator('body');
    }

    /**
     * Make the box's writing area visible: another form language's box opens
     * in a popover only while the primary language's box has the focus
     * (screen notes ccK1, ccK3), so the first visible writing area of the
     * window is clicked first.
     */
    async reveal() {
        await this.ready();
        const frame = await this.frame();
        if (!(await frame.isVisible())) {
            const first = this.scope.locator('iframe:visible').first();
            const firstId = (await first.getAttribute('id', {timeout: T})).replace(/_ifr$/, '');
            await new RichTextBox(this.page, this.page.locator(`textarea[id="${firstId}"]`), this.scope).clickBody();
            await expect(frame).toBeVisible({timeout: T});
        }
    }

    /**
     * Whether the editor is stuck: `initialized`, yet its "Loading..."
     * throbber still covers the box. TinyMCE hides the throbber right after
     * `initialized = true` in the same call, so a busy throbber after it
     * means the rest of the editor's init threw (pkp's "deactivate" handler
     * reading a later editor of the form that has not loaded yet,
     * .reports/flake-s28/u09s6-throbber/diagnosis.md), and no click reaches
     * the box again.
     */
    async stuck() {
        const id = await this.id();
        return this.page.evaluate((i) => {
            const ed = window.tinymce && window.tinymce.get(i);
            const box = ed && ed.getContainer();
            const throbber = box && box.querySelector('.tox-throbber');
            return !!(ed && ed.initialized && throbber && throbber.getAttribute('aria-busy') === 'true');
        }, id);
    }

    /**
     * Click into the writing area. A stuck editor (`stuck()`) fails the
     * click, after its own timeout, with words that name it, instead of a
     * click retried until the test's timeout (the U75 OPS final's red).
     */
    async clickBody() {
        const body = await this.body();
        try {
            await body.click({timeout: T});
        } catch (error) {
            await this.failIfStuck();
            throw error;
        }
    }

    /** Throw, in words that name it, when the editor is stuck (`stuck()`). */
    async failIfStuck() {
        if (await this.stuck().catch(() => false)) {
            throw new Error(`the "${await this.id()}" editor is stuck: initialized, but its init threw and its "Loading..." throbber covers the box for good (app defect, .reports/flake-s28/u09s6-throbber/diagnosis.md)`);
        }
    }

    /** Wait until the editor holds the keyboard focus, so keys pressed next reach it. */
    async expectFocused() {
        const id = await this.id();
        try {
            await this.page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).hasFocus()), id, {timeout: T});
        } catch (error) {
            // A click that landed before a stuck editor's throbber showed:
            // the throbber then takes the focus, and the keys with it.
            await this.failIfStuck();
            throw error;
        }
    }

    /**
     * Click into the box, go to its end, and type; returns once the editor
     * holds the typed text. The page a visitor reads is drawn from what the
     * save sent, so a text lost on the way in would only show later as a
     * page without it (OPS U09 S6, .reports/flake-s26/fixC/diagnosis.md).
     */
    async type(text) {
        await this.reveal();
        await this.clickBody();
        await this.expectFocused();
        await this.page.keyboard.press('Control+End');
        await this.page.keyboard.type(text);
        // The words before any "{$…}" variable (the tag plugin may show a
        // variable as its own piece), spaces as the editor keeps them.
        const words = text.split('{$')[0].trim();
        if (words) {
            try {
                await expect
                    .poll(async () => ((await this.text()) || '').replace(/\u00a0/g, ' '), {timeout: T, message: `the editor holds "${words}"`})
                    .toContain(words);
            } catch (error) {
                // A stuck editor's throbber showing mid-typing takes the rest
                // of the keys ("Welc").
                await this.failIfStuck();
                throw error;
            }
        }
    }

    /** Replace the box's text by typing. */
    async replace(text) {
        await this.reveal();
        await this.clickBody();
        await this.page.keyboard.press(SELECT_ALL);
        await this.page.keyboard.press('Delete');
        if (text) await this.page.keyboard.type(text);
    }

    /**
     * Type on at the caret, without clicking: after an inserted tag the caret
     * sits right after it, and a click can land on the tag and select it
     * (screen notes ccK1).
     */
    async typeOn(text) {
        await this.page.keyboard.press('End');
        await this.page.keyboard.type(text);
    }

    /** The box's HTML as the editor holds it. */
    async html() {
        const id = await this.ready();
        return this.page.evaluate((i) => window.tinymce.get(i).getContent(), id);
    }

    /** The box's text as the editor holds it. */
    async text() {
        const id = await this.ready();
        return this.page.evaluate((i) => window.tinymce.get(i).getContent({format: 'text'}), id);
    }

    /**
     * The tags in the box: each as its words, whether it is one uneditable
     * piece, its colour, and whether it is the last thing in the text.
     */
    async tags() {
        const id = await this.ready();
        return this.page.evaluate((i) => {
            const ed = window.tinymce.get(i);
            const els = [...new Set(ed.getBody().querySelectorAll('.pkpTag, [data-symbolic], .mceNonEditable'))];
            const outer = els.filter((e) => !els.some((o) => o !== e && o.contains(e)));
            return outer.map((s) => {
                let last = true;
                for (let n = s; n && n !== ed.getBody(); n = n.parentNode) {
                    for (let sib = n.nextSibling; sib; sib = sib.nextSibling) {
                        if ((sib.textContent || '').replace(/[\s ﻿]/g, '') || sib.nodeName === 'IMG') last = false;
                    }
                }
                return {text: s.textContent, editable: s.getAttribute('contenteditable'), color: ed.getWin().getComputedStyle(s).color, last};
            });
        }, id);
    }

    /** The pictures in the box, by their address. */
    async pictures() {
        const id = await this.ready();
        return this.page.evaluate((i) => [...window.tinymce.get(i).getBody().querySelectorAll('img')].map((img) => img.getAttribute('src')), id);
    }

    /**
     * Put the caret at the end of the text: with a picture just inserted
     * still selected, "Insert/edit image" edits that picture instead of
     * adding one (screen notes ccK5b).
     */
    async caretToEnd() {
        const id = await this.ready();
        await this.page.evaluate((i) => {
            const ed = window.tinymce.get(i);
            ed.focus();
            ed.selection.select(ed.getBody(), true);
            ed.selection.collapse(false);
        }, id);
    }

    /** The open TinyMCE menu (one at a time). */
    menu() {
        return this.page.locator('.tox-menu:visible').first();
    }

    /** The open menu's entries. */
    menuItems() {
        return this.menu().locator('.tox-collection__item');
    }

    /** Press "Insert Tag" and wait for its menu. */
    async openTagMenu() {
        await this.reveal();
        await (await this.barButton('Insert Tag')).click();
        await expect(this.menu()).toBeVisible({timeout: T});
        return this.menu();
    }

    /** The open tag menu's entries' words, in order. */
    async tagMenuLabels() {
        await expect(this.menuItems().first()).toBeVisible({timeout: T});
        return (await this.menuItems().allInnerTexts()).map(flat);
    }

    /** Choose an entry of the open menu by its words. */
    async chooseMenuItem(label) {
        await this.menuItems().filter({hasText: new RegExp(`^\\s*${esc(label)}\\s*$`)}).first().click();
        await expect(this.menu()).toBeHidden({timeout: T});
    }

    /**
     * Close an open menu by clicking into the writing area: Escape would close
     * the whole legacy window through the browser's "The data on this form
     * has changed…" question (screen notes ccK1).
     */
    async closeMenu() {
        if (await this.menu().isVisible()) {
            await (await this.body()).click({position: {x: 5, y: 5}});
        }
        await expect(this.page.locator('.tox-menu:visible')).toHaveCount(0, {timeout: T});
    }

    /** Press "Insert/edit image" and return its window. */
    async openImageWindow() {
        await this.reveal();
        const win = new ImageWindow(this.page);
        await (await this.barButton('Insert/edit image')).click();
        await expect(win.root).toBeVisible({timeout: T});
        return win;
    }
}

// ---------------------------------------------------------------------------
// The picture window
// ---------------------------------------------------------------------------

class ImageWindow extends BasePage {
    constructor(page) {
        super(page);
        this.root = page.locator('.tox-dialog:visible').filter({has: page.locator('.tox-dialog__title', {hasText: 'Insert/Edit Image'})}).first();
        this.title = this.root.locator('.tox-dialog__title');
        this.tabs = this.root.getByRole('tab');
        this.fileInput = this.root.locator('input[type="file"]');
        this.browseButton = this.root.getByRole('button', {name: 'Browse for an image', exact: true});
        this.dropZone = this.root.locator('.tox-dropzone');
        this.source = this.root.locator('input[type="url"]').first();
        this.saveButton = this.root.getByRole('button', {name: 'Save', exact: true});
        this.cancelButton = this.root.getByRole('button', {name: 'Cancel', exact: true});
        // The small window over it: a second TinyMCE dialog holding the message and "OK".
        this.alert = page.locator('.tox-dialog:visible').filter({hasNot: page.locator('.tox-dialog__title', {hasText: 'Insert/Edit Image'})}).last();
        this.alertOk = this.alert.getByRole('button', {name: 'OK', exact: true});
    }

    /** The tabs' names, in order. */
    async tabNames() {
        return (await this.tabs.allInnerTexts()).map(flat);
    }

    /** Open a tab by name ("General", "Upload"). */
    async openTab(name) {
        await this.root.getByRole('tab', {name, exact: true}).click();
        await expect(this.root.getByRole('tab', {name, exact: true})).toHaveAttribute('aria-selected', 'true');
    }

    /**
     * Choose a file on "Upload" (the hidden input under "Browse for an
     * image"; its button opens the OS dialog, patterns.md pitfall 13) and
     * return the upload's answer.
     *
     * @param {{name: string, mimeType: string, buffer: Buffer}} file
     */
    async upload(file) {
        await this.openTab('Upload');
        const answer = this.page.waitForResponse((r) => /_uploadPublicFile/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
        await this.fileInput.setInputFiles(file);
        const r = await answer;
        return {status: r.status(), body: await r.json().catch(() => null)};
    }

    /** After an accepted upload: "Source" holds the stored picture's address. */
    async expectSourceFilled() {
        await expect(this.source).toHaveValue(/\S/, {timeout: T});
        return this.source.inputValue();
    }

    /** "Save": the picture goes into the box and the window closes. */
    async save() {
        await this.saveButton.click();
        await expect(this.root).toBeHidden({timeout: T});
    }

    /** "Cancel": the window closes and nothing goes into the box. */
    async cancel() {
        await this.cancelButton.click();
        await expect(this.root).toBeHidden({timeout: T});
    }

    /** "OK" on the small refusal window; the picture window stays. */
    async dismissAlert() {
        await this.alertOk.click();
        await expect(this.alertOk).toBeHidden({timeout: T});
    }
}

// ---------------------------------------------------------------------------
// The "Custom Page" item window
// ---------------------------------------------------------------------------

class CustomPageWindow extends ItemWindow {
    /** The item window, already open (NavigationTab.addItem / editItem). */
    constructor(page) {
        super(page);
        this.previewButton = this.root.locator('#previewButton');
    }

    /** The "Content" box of a form language. */
    content(locale = 'en') {
        return new RichTextBox(this.page, this.form.locator(`textarea[name="content[${locale}]"]`), this.form);
    }

    /** The "Title" boxes and "Content" boxes the window has, by form language. */
    async languages() {
        const titles = await this.form.locator('input[name^="title["]').evaluateAll((els) => els.map((e) => e.name));
        const contents = await this.form.locator('textarea[name^="content["]').evaluateAll((els) => els.map((e) => e.name));
        return {titles, contents};
    }

    /** Type a "Title" of a form language (another language's box shows while the first has the focus). */
    async typeTitle(locale, text) {
        const box = this.titleInput(locale);
        if (!(await box.isVisible())) {
            await this.titleInput('en').click();
            await expect(box).toBeVisible({timeout: T});
        }
        await box.fill(text);
    }

    /** Leave the boxes, so a language popover over "Save" / "Preview" closes (screen notes ccK1). */
    async blur() {
        await this.pathInput.click();
    }

    /** The window's whole text, whitespace-collapsed. */
    async text() {
        return flat(await this.form.innerText());
    }

    /** "Preview": the new browser tab it opens, loaded. */
    async preview() {
        await this.blur();
        return openPreview(this.page, this.previewButton);
    }
}

/**
 * Press a "Preview" button and return the new browser tab, loaded: the tab's
 * address stays "about:blank" (the page is written into it), so the tab is
 * read once its header is on screen.
 */
async function openPreview(page, button) {
    const [popup] = await Promise.all([page.context().waitForEvent('page', {timeout: T}), button.click()]);
    await popup.waitForLoadState('load');
    await expect(popup.locator('header.pkp_structure_head')).toBeVisible({timeout: T});
    return popup;
}

// ---------------------------------------------------------------------------
// Settings › Website › "Plugins"
// ---------------------------------------------------------------------------

class PluginsTab extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {{locale?: string}} [options]
     */
    constructor(page, contextPath, {locale = ''} = {}) {
        super(page);
        this.contextPath = contextPath;
        this.locale = locale;
        this.grid = page.locator('#pluginGridContainer');
    }

    url() {
        return contextAddress(this.contextPath, this.locale, '/management/settings/website#plugins');
    }

    /** Open the tab (leaving the page first: a hash-only goto reloads nothing, pitfall 17) and wait for the grid. */
    async goto() {
        await this.page.goto('about:blank');
        await this.page.goto(this.url());
        await expect(this.row('customblockmanagerplugin')).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** A plugin's row by its id (the lowercased class name: `customblockmanagerplugin`, `staticpagesplugin`). */
    row(pluginId) {
        return this.page.locator(`tr.gridRow[id$="-row-${pluginId}"]`).first();
    }

    /** Settings › Website's top tabs ("Appearance", "Setup", "Plugins", …): the first tab list of the page's main region. */
    websiteTabs() {
        return this.page.getByRole('main').getByRole('tablist').first().getByRole('tab');
    }

    /**
     * The heading of the category a plugin's row sits under ("Generic
     * Plugins"): the first row of the row's category body
     * (`tbody.category_grid_body`, its heading row `…-category-<c>-row-<c>`).
     */
    categoryHeading(pluginId) {
        return this.row(pluginId).locator('xpath=ancestor::tbody[contains(@class, "category_grid_body")][1]/tr[1]').locator('.label').first();
    }

    /** A plugin row's "Enabled" box. */
    enabledBox(pluginId) {
        return this.row(pluginId).getByRole('checkbox');
    }

    /** Tick a plugin's "Enabled" box and wait for the grid's answer. */
    async enable(pluginId) {
        const answer = this.page.waitForResponse((r) => /plugin-grid\/enable/.test(r.url()), {timeout: T});
        await this.enabledBox(pluginId).click();
        const r = await answer;
        await waitForJQueryIdle(this.page);
        return r.status();
    }

    /** The row's arrow ("Settings"): the controls under it. */
    async openControls(pluginId) {
        const row = this.row(pluginId);
        await expect(row).toBeVisible({timeout: T});
        const id = await row.getAttribute('id');
        const controls = this.page.locator(`[id="${id}-control-row"]`);
        const arrow = row.locator('a.show_extras');
        await expect(arrow).toBeVisible({timeout: T});
        await arrow.click();
        await expect(controls.getByRole('link').first()).toBeVisible({timeout: T});
        return controls;
    }

    /** A link under a row's arrow by its words ("Manage Custom Blocks", "Edit/Add Content"). */
    controlLink(controls, name) {
        return controls.getByRole('link', {name, exact: true});
    }

    /** "Manage Custom Blocks" under the Custom Block Manager's arrow: the manager window. */
    async openBlockManager() {
        const controls = await this.openControls('customblockmanagerplugin');
        const manager = new BlockManager(this.page);
        await this.controlLink(controls, 'Manage Custom Blocks').click();
        await manager.waitOpen();
        return manager;
    }
}

// ---------------------------------------------------------------------------
// The "Custom Block Manager" window and the block window
// ---------------------------------------------------------------------------

class BlockManager extends BasePage {
    constructor(page) {
        super(page);
        this.root = page.locator('[role="dialog"]:visible').filter({has: page.locator('[id*="customblockgrid"], [id*="customBlockGrid"]')}).first();
        this.heading = this.root.locator('h1').first();
        this.grid = this.root.locator('.pkp_controllers_grid').first();
        this.listHeading = this.grid.locator('.header h4, h4').first();
        this.columnHeaders = this.grid.locator('th');
        this.rows = this.grid.locator('tr.gridRow');
        this.emptyRow = this.grid.locator('tbody.empty');
        this.addLink = this.root.getByRole('link', {name: 'Add Block', exact: true});
    }

    async waitOpen() {
        await expect(this.grid).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** A block's row by the block's name (the row id ends with it). */
    row(name) {
        return this.grid.locator(`tr.gridRow[id$="-row-${name}"]`);
    }

    /** The blocks' names as their rows carry them, top to bottom. */
    async rowNames() {
        return this.rows.evaluateAll((trs) => trs.map((tr) => tr.id.replace(/^.*-row-/, '')));
    }

    /** "Add Block" (pressed until the window shows: a closed window's slot swallows a press, pitfall 4). */
    async addBlock() {
        return this.openBlockWindowBy(this.addLink);
    }

    /** A block row's "Edit", its arrow pressed first. */
    async editBlock(name) {
        const row = this.row(name);
        await expect(row).toHaveCount(1, {timeout: T});
        const id = await row.getAttribute('id');
        const controls = this.page.locator(`[id="${id}-control-row"]`);
        await row.locator('a.show_extras').click();
        const edit = controls.getByRole('link', {name: 'Edit', exact: true});
        await expect(edit).toBeVisible({timeout: T});
        return this.openBlockWindowBy(edit);
    }

    async openBlockWindowBy(link) {
        const win = new BlockWindow(this.page);
        await expect(async () => {
            if (!(await win.form.isVisible())) {
                await link.click({timeout: 5_000});
            }
            await expect(win.form).toBeVisible({timeout: 3_000});
        }).toPass({timeout: T});
        await win.waitOpen();
        return win;
    }
}

class BlockWindow extends BasePage {
    constructor(page) {
        super(page);
        this.root = page.locator('[role="dialog"]:visible').filter({has: page.locator('form#customBlockForm')}).last();
        this.form = this.root.locator('form#customBlockForm');
        this.heading = this.root.locator('h1').first();
        this.showNameBox = this.form.locator('input[name="showName"]');
        this.saveButton = this.form.getByRole('button', {name: 'Save', exact: true});
        this.cancelLink = this.form.getByRole('link', {name: 'Cancel', exact: true}).or(this.form.getByRole('button', {name: 'Cancel', exact: true})).first();
    }

    async waitOpen() {
        await expect(this.form).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
        await this.content('en').ready();
    }

    /** The "Block Name" box of a form language. */
    nameInput(locale = 'en') {
        return this.form.locator(`input[name="blockTitle[${locale}]"]`);
    }

    /** The "Content" box of a form language. */
    content(locale = 'en') {
        return new RichTextBox(this.page, this.form.locator(`textarea[name="blockContent[${locale}]"]`), this.form);
    }

    /** The words of the "Show Name" box (the label holding it; the section's title reads "Show Name"). */
    showNameLabel() {
        return this.form.locator('label:has(input[name="showName"])');
    }

    /** Tick or untick "Show Name" (the boxes left first: the other language's popover covers it). */
    async setShowName(checked) {
        await this.blur();
        await this.showNameBox.setChecked(checked);
    }

    /** Type a "Block Name" (another language's box shows while the first has the focus). */
    async typeName(locale, text) {
        const box = this.nameInput(locale);
        if (!(await box.isVisible())) {
            await this.nameInput('en').click();
            await expect(box).toBeVisible({timeout: T});
        }
        await box.fill(text);
    }

    /** The message under a box ("This field is required."), by the box. */
    async errorFor(input) {
        const id = await input.getAttribute('id');
        return this.form.locator(`label.error[for="${id}"]`);
    }

    /**
     * Leave the boxes (the heading takes the click), so the other language's
     * popover over "Save" closes (screen notes ccK3).
     */
    async blur() {
        await this.heading.click();
    }

    /** Press "Save" and wait for the save's answer; a browser-side refusal sends none. */
    async save() {
        await this.blur();
        const answer = this.page.waitForResponse((r) => /update-?custom-?block/i.test(r.url()) && r.request().method() === 'POST', {timeout: T});
        await this.saveButton.click();
        const r = await answer;
        await waitForJQueryIdle(this.page);
        return r.status();
    }

    /** Press "Save" expecting the browser to refuse it: the message shows and nothing is sent. */
    async saveRefused(input, message) {
        await this.blur();
        let sent = false;
        const onRequest = (req) => {
            if (/update-?custom-?block/i.test(req.url())) sent = true;
        };
        this.page.on('request', onRequest);
        await this.saveButton.click();
        await expect(await this.errorFor(input)).toHaveText(message, {timeout: T});
        this.page.off('request', onRequest);
        return sent;
    }

    /** "Cancel". */
    async cancel() {
        await this.cancelLink.click();
    }
}

// ---------------------------------------------------------------------------
// Settings › Website › "Appearance" › "Setup": the "Sidebar"
// ---------------------------------------------------------------------------

class SidebarSetup extends BasePage {
    constructor(page, contextPath, {locale = ''} = {}) {
        super(page);
        this.contextPath = contextPath;
        this.locale = locale;
        this.panel = page.locator('#appearance');
        this.form = page.locator('form').filter({has: page.locator('input[name="sidebar"]')}).first();
        this.saveButton = this.form.getByRole('button', {name: 'Save', exact: true});
        this.saved = this.form.locator('[role="status"]').filter({hasText: 'Saved'});
    }

    /** Open Settings › Website › "Appearance" › "Setup". */
    async goto() {
        await this.page.goto('about:blank');
        await this.page.goto(contextAddress(this.contextPath, this.locale, '/management/settings/website#appearance'));
        const setup = this.panel.getByRole('tab', {name: 'Setup', exact: true}).first();
        await expect(setup).toBeVisible({timeout: T});
        if ((await setup.getAttribute('aria-selected')) !== 'true') await setup.click();
        await expect(this.form.locator('input[name="sidebar"]').first()).toBeVisible({timeout: T});
    }

    /** A block's box under "Sidebar", by the name the form posts. */
    box(value) {
        return this.form.locator(`input[name="sidebar"][value="${value}"]`);
    }

    /** Tick or untick a block and "Save", waiting for "Saved". */
    async place(value, placed) {
        await this.box(value).setChecked(placed);
        const answer = this.page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
        await this.saveButton.click();
        const r = await answer;
        await expect(this.saved).toBeVisible({timeout: T});
        return r.status();
    }
}

// ---------------------------------------------------------------------------
// The "Static Pages" tab and the static page window {OJS OMP}
// ---------------------------------------------------------------------------

class StaticPagesTab extends BasePage {
    constructor(page, contextPath, {locale = ''} = {}) {
        super(page);
        this.contextPath = contextPath;
        this.locale = locale;
        this.tabButton = page.locator('#staticPages-button');
        this.container = page.locator('#staticPageGridContainer');
        this.grid = this.container.locator('.pkp_controllers_grid').first();
        this.listHeading = this.grid.locator('.header h4, h4').first();
        this.columnHeaders = this.grid.locator('th');
        this.rows = this.grid.locator('tr.gridRow');
        this.emptyRow = this.grid.locator('tbody.empty');
        this.addLink = this.container.getByRole('link', {name: 'Add Static Page', exact: true});
    }

    url() {
        return contextAddress(this.contextPath, this.locale, '/management/settings/website#staticPages');
    }

    /** Open the tab (leaving the page first, pitfall 17) and wait for the list. */
    async goto() {
        await this.page.goto('about:blank');
        await this.page.goto(this.url());
        await this.waitList();
    }

    async waitList() {
        await expect(this.grid).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** A row by its title (the "Title" cell). */
    row(title) {
        return this.rows.filter({has: this.page.locator('td').first().filter({hasText: new RegExp(`^\\s*(Settings\\s*)?${esc(title)}\\s*$`)})});
    }

    /** Each row's "Title" and "Path" cells as read, top to bottom (read through a locator assertion or poll, pitfall 14). */
    async rowCells() {
        return this.rows.evaluateAll((trs) =>
            trs.map((tr) =>
                [...tr.querySelectorAll('td')].slice(0, 2).map((td) => {
                    const c = td.cloneNode(true);
                    c.querySelectorAll('a.show_extras, a.hide_extras, script, .pkp_screen_reader').forEach((n) => n.remove());
                    return c.textContent.replace(/\s+/g, ' ').trim();
                })
            )
        );
    }

    /** The titles, top to bottom. */
    async titles() {
        return (await this.rowCells()).map((cells) => cells[0]);
    }

    /** A row's "Path" link. */
    pathLink(title) {
        return this.row(title).locator('td').nth(1).getByRole('link');
    }

    /** A row's arrow, then a link under it ("Edit", "Delete"). */
    async rowControl(title, name) {
        const row = this.row(title);
        await expect(row).toHaveCount(1, {timeout: T});
        const id = await row.getAttribute('id');
        const controls = this.page.locator(`[id="${id}-control-row"]`);
        await row.locator('a.show_extras').click();
        const link = controls.getByRole('link', {name, exact: true});
        await expect(link).toBeVisible({timeout: T});
        return link;
    }

    /** "Add Static Page" (pressed until the window shows, pitfall 4). */
    async addPage() {
        return this.openWindowBy(this.addLink);
    }

    /** A row's "Edit". */
    async editPage(title) {
        return this.openWindowBy(await this.rowControl(title, 'Edit'));
    }

    async openWindowBy(link) {
        const win = new StaticPageWindow(this.page);
        await expect(async () => {
            if (!(await win.form.isVisible())) {
                await link.click({timeout: 5_000});
            }
            await expect(win.form).toBeVisible({timeout: 3_000});
        }).toPass({timeout: T});
        await win.waitOpen();
        return win;
    }

    /** The "Delete" confirmation window. */
    deleteDialog() {
        return this.page
            .locator('[role="dialog"]:visible, [role="alertdialog"]:visible, [data-cy="dialog"]:visible')
            .filter({hasText: 'Are you sure you wish to delete this item?'})
            .last();
    }

    /** The "Delete" window's heading. */
    deleteDialogHeading() {
        return this.deleteDialog().locator('h1, h2, .ui-dialog-title').first();
    }

    /** "OK" or "Cancel" in the "Delete" window, a button or a link. */
    deleteDialogButton(name) {
        const dialog = this.deleteDialog();
        return dialog.getByRole('button', {name, exact: true}).or(dialog.getByRole('link', {name, exact: true})).first();
    }

    /** The top tabs of Settings › Website. */
    topTabs() {
        return this.page.getByRole('main').getByRole('tablist').first().getByRole('tab');
    }
}

class StaticPageWindow extends BasePage {
    constructor(page) {
        super(page);
        this.root = page.locator('[role="dialog"]:visible').filter({has: page.locator('form#staticPageForm')}).last();
        this.form = this.root.locator('form#staticPageForm');
        this.heading = this.root.locator('h1').first();
        this.pathInput = this.form.locator('input[name="path"]');
        this.previewButton = this.root.locator('#previewButton');
        this.saveButton = this.root.getByRole('button', {name: 'Save', exact: true});
        this.cancelButton = this.root.getByRole('button', {name: 'Cancel', exact: true}).or(this.root.getByRole('link', {name: 'Cancel', exact: true}));
        this.closeButton = this.root.getByRole('button', {name: 'Close', exact: true});
    }

    async waitOpen() {
        await expect(this.pathInput).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
        await this.content('en').ready();
    }

    titleInput(locale = 'en') {
        return this.form.locator(`input[name="title[${locale}]"]`);
    }

    content(locale = 'en') {
        return new RichTextBox(this.page, this.form.locator(`textarea[name="content[${locale}]"]`), this.form);
    }

    /** The window's whole text, whitespace-collapsed. */
    async text() {
        return flat(await this.root.innerText());
    }

    /** The message under a box, by the box. */
    async errorFor(input) {
        const id = await input.getAttribute('id');
        return this.form.locator(`label.error[for="${id}"]`);
    }

    /** Leave the boxes (the "Path" box takes the click). */
    async blur() {
        await this.pathInput.click();
    }

    /**
     * Press "Save". `expectPost` false: the browser refuses it and nothing is
     * sent; otherwise the save's JSON answer (the window re-renders with the
     * message on a server refusal, and closes on a save).
     */
    async save({expectPost = true} = {}) {
        await this.blur();
        if (!expectPost) {
            let sent = false;
            const onRequest = (req) => {
                if (/update-?static-?page/i.test(req.url())) sent = true;
            };
            this.page.on('request', onRequest);
            await this.saveButton.click();
            await waitForJQueryIdle(this.page);
            this.page.off('request', onRequest);
            return {sent};
        }
        const answer = this.page.waitForResponse((r) => /update-?static-?page/i.test(r.url()) && r.request().method() === 'POST', {timeout: T});
        await this.saveButton.click();
        const r = await answer;
        await waitForJQueryIdle(this.page);
        return {sent: true, status: r.status()};
    }

    /** "Preview": the new browser tab, loaded. */
    async preview() {
        await this.blur();
        return openPreview(this.page, this.previewButton);
    }

    /**
     * The back arrow ("Close"). The browser's own question, when asked, is
     * answered `accept` or not and returned (null when none was asked).
     */
    async close({accept = true} = {}) {
        let asked = null;
        const handler = async (dialog) => {
            asked = dialog.message();
            if (accept) await dialog.accept();
            else await dialog.dismiss();
        };
        this.page.once('dialog', handler);
        await this.closeButton.click();
        if (accept) {
            await expect(this.form).toBeHidden({timeout: T});
        } else {
            await expect.poll(() => asked, {timeout: T}).not.toBeNull();
        }
        this.page.off('dialog', handler);
        return asked;
    }
}

// ---------------------------------------------------------------------------
// The visitor's side
// ---------------------------------------------------------------------------

class PublicContent extends BasePage {
    constructor(page) {
        super(page);
        this.header = page.locator('header.pkp_structure_head');
        this.footer = page.locator('.pkp_structure_footer_wrapper');
        this.main = page.locator('.pkp_structure_main');
        this.pageBody = this.main.locator('.page').first();
        this.pageTitle = this.main.locator('h1').first();
        this.breadcrumbs = this.main.locator('nav.cmp_breadcrumbs');
        this.editLinks = page.locator('a.cmp_edit_link').or(page.getByRole('link', {name: 'Edit', exact: true}));
        this.sidebar = page.locator('.pkp_structure_sidebar');
        this.customBlocks = this.sidebar.locator('.block_custom');
        this.pictures = this.pageBody.locator('img');
    }

    /** Open an address and wait for the header; the answer is returned. */
    async goto(address) {
        const response = await this.page.goto(address);
        await expect(this.header).toBeVisible({timeout: T});
        return response;
    }

    /** The page's own text (heading and content), whitespace-collapsed. */
    async bodyText() {
        return flat(await this.pageBody.innerText());
    }

    /** A custom block by its name (`div#customblock-<name>`). */
    block(name) {
        return this.sidebar.locator(`[id="customblock-${name}"]`);
    }

    /** A block's heading. */
    blockHeading(name) {
        return this.block(name).locator('h2').first();
    }

    /** A block's content. */
    blockContent(name) {
        return this.block(name).locator('.content').first();
    }

    /**
     * Whether a heading is hidden for screen readers only (the theme's
     * `pkp_screen_reader`: clipped, still in the accessibility tree).
     */
    async screenReaderOnly(heading) {
        return heading.evaluate((h) => {
            const cs = getComputedStyle(h);
            return h.classList.contains('pkp_screen_reader') && (cs.clip !== 'auto' || parseFloat(cs.left) < -1000);
        });
    }

    /** The pictures on the page: address and whether each loaded. */
    async pictureStates() {
        return this.pictures.evaluateAll((imgs) => imgs.map((i) => ({src: i.getAttribute('src'), loaded: i.complete && i.naturalWidth > 0})));
    }
}

module.exports = {
    RichTextBox,
    ImageWindow,
    CustomPageWindow,
    PluginsTab,
    BlockManager,
    BlockWindow,
    SidebarSetup,
    StaticPagesTab,
    StaticPageWindow,
    PublicContent,
    openPreview,
    notices,
    flat,
};
