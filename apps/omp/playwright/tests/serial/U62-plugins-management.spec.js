// @ts-check
/**
 * @file playwright/tests/serial/U62-plugins-management.spec.js
 *
 * Plugins management — OMP suite: scenarios 1–5 (all common), in OMP
 * vocabulary (press, Press Manager, "Hosted Presses").
 * Spec: docs/specs/U62-plugins-management.md
 *
 * Serial folder (PRINCIPLES A7, A9): S3 ticks plugins on the site's list,
 * which every test shares, and S4 and S5 upload, upgrade and delete
 * plugins, which lands in `plugins/generic/<name>` of the app checkout
 * that every worker server reads, so every press's and the site's list
 * shows them; the three carry `@solo` and run alone in the `omp-solo`
 * project (harness.md "Project chain"; spec footnote sc). S1 and S2 read
 * and tick on scratch presses of their own and run in `omp-serial`.
 * S3 puts back the site's ticks in a `finally`; S4 and S5 remove what they
 * uploaded through the row's "Delete", and the `afterAll` removes any
 * folder their own packages created that is still there.
 *
 * OMP specifics: the category headings in the press's order (OMP2, S1);
 * the Site Administrator's press list leaves out "Usage event" on an
 * installation of two or more presses (OMP1, S4), while the site's list
 * shows it (S3).
 *
 * Not asserted here, by register ID: A1 (the "Plugin Gallery" tab is never
 * pressed; its list's server error on every landing is not this suite's),
 * A2 (S4 opens "Upload A New Plugin" and leaves the missing line
 * unasserted either way), A7 (S5's Delete notice is read with either
 * spelling), A3, A4, A5, A6, A8, A9, A10 (the register carries them, the
 * spec's Coverage section).
 *
 * Seeding (footnote sc): scratch presses from `POST scenarios/context`
 * with a throwaway Press Manager (the username twice as password); the
 * Site Administrator is `admin`, enrolled as a manager in every scratch
 * press; every actor is opened through `asUser`. The plugin packages are
 * built at run time by `shared/playwright/support/pluginPackages.js`, each
 * plugin under a product name carrying the test's own run tag (spec A5:
 * the installation keeps a plugin's recorded version).
 */
const fs = require('fs');
const {test, expect} = require('../../support/fixtures.js');
const {
    WebsitePluginsPage,
    SitePluginsPage,
    WizardPluginsPage,
    markNotices,
    expectFreshNotice,
    pastModalCloseWindow,
} = require('../../../../../shared/playwright/pages/PluginsPages.js');
const {
    pluginNames,
    buildPlugin,
    buildNoVersion,
    buildNotAPlugin,
    removePluginFolders,
} = require('../../../../../shared/playwright/support/pluginPackages.js');

const T = 30_000;

// ---- the OMP words ------------------------------------------------------------------
/** The category headings, top to bottom, in the press's order (Fields; OMP2). */
const HEADINGS = [
    'Metadata Plugins',
    'Public Identifier Plugins',
    'Block Plugins',
    'Generic Plugins',
    'Gateway Plugins',
    'Theme Plugins',
    'Import/Export Plugins',
    'OAI Metadata Format Plugins',
    'Payment Plugins',
    'Report Plugins',
];
/** The headings that read "No Items" on a new press (Rule 4). */
const EMPTY_HEADINGS = ['Gateway Plugins'];
const INNER_TABS = ['Installed Plugins', 'Plugin Gallery'];
const COLUMNS = ['Name', 'Description', 'Enabled'];
/** The header's "Search" link (its text carries white space around the word). */
const SEARCH = /^\s*Search\s*$/;

/** Shipped plugins by the id the list gives their row, and their names. */
const WEB_FEED = {id: 'webfeedplugin', name: 'Web Feed Plugin'};
const GA = {id: 'googleanalyticsplugin', name: 'Google Analytics Plugin'};
const USAGE = {id: 'usageeventplugin', name: 'Usage event'};
const TINYMCE = {id: 'tinymceplugin', name: 'TinyMCE Plugin'};
const CBM = {id: 'customblockmanagerplugin', name: 'Custom Block Manager'};

// ---- the notices and windows --------------------------------------------------------
const ENABLED = (name) => `The plugin "${name}" has been enabled.`;
const DISABLED = (name) => `The plugin "${name}" has been disabled.`;
const DISABLE_TEXT = 'Are you sure you want to disable this plugin?';
const INSTALLED = (version) => `Successfully installed version ${version}`;
const UPGRADED = (version) => `Successfully upgraded to version ${version}`;
const NO_FILE = 'Please ensure a file was selected for upload.';
const UP_TO_DATE = 'Plugin already installed and up-to-date.';
const PLEASE_UPGRADE = 'Plugin already exists, but is newer than installed version. Please upgrade instead';
const NO_FOLDER = 'The uploaded plugin archive does not contain a folder that corresponds to the plugin name.';
const INVALID = 'version.xml in plugin directory contains invalid data.';
const WRONG_CATEGORY = 'The uploaded plugin does not fit the category of the upgraded plugin.';
const WRONG_NAME = 'The version.xml in the uploaded plugin contains a plugin name that does not fit the name of the upgraded plugin.';
const UPGRADE_LINE = 'This form allows you to upgrade a plugin.  Please ensure the plugin is compressed as a .tar.gz file.';
const DELETE_TEXT = 'Are you sure you wish to delete this plugin from the system?';
/** The Delete notice, either spelling of "successfully" (A7 left unasserted either way). */
const DELETED = (name) => new RegExp(`^\\s*Plugin "${esc(name)}" successfu(l)?ly deleted\\s*(×\\s*)?(Close\\s*)?$`);

/** The scenario's own plugins (Given of S4 and S5). */
const HARBOUR_TEST = 'Harbour Test Plugin';
const HARBOUR_ROOT = 'Harbour Root Plugin';
const HARBOUR_BLOCK = 'Harbour Block Plugin';
const HARBOUR_OTHER = 'Harbour Other Plugin';

/** Every product name a package of this run may have installed (the afterAll's list). */
const products = [];

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u62s${scenario}omw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account for `createContext`'s `users[]`. */
function manager(username) {
    return {username, givenName: 'Mara', familyName: 'Scratchmanager', roles: ['manager']};
}

/** The default name of a scratch press. */
const scratchName = (tag) => `Scratch context ${tag}`;

/** A signed-in page for an actor (a fresh `asUser` context). */
async function signedIn(asUser, username) {
    return (await asUser(username)).newPage();
}

/** Escape a string for a RegExp. */
function esc(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A list outline with each category's names sorted (the grid's order is not the claim). */
const sorted = (outline) => outline.map((c) => ({...c, names: [...c.names].sort()}));

/** Press a box and read the notice it shows (marked first). */
async function tickWithNotice(list, id, name) {
    await markNotices(list.page);
    await list.tick(id);
    await expectFreshNotice(list.page, ENABLED(name));
}

/** Untick a box, "OK" in "Disable", and read the notice. */
async function untickWithNotice(list, id, name) {
    await list.pressTicked(id);
    await markNotices(list.page);
    await list.confirmDisable(id);
    await expectFreshNotice(list.page, DISABLED(name));
}

test.describe('plugins management', () => {
    test.afterAll(() => {
        // Any folder a package of this worker created that the test's own
        // "Delete" did not remove (a failure midway).
        removePluginFolders(process.env.PKP_APP_ROOT || '', products);
    });

    test("S1: a press's installed plugins", async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag(1, testInfo);
        const mgr = `m${tag}`;
        await ompApi.createContext({tag, users: [manager(mgr)]});
        const mp = await signedIn(asUser, mgr);
        const website = new WebsitePluginsPage(mp, tag);
        const list = website.list;

        // The tab: two inner tabs, "Installed Plugins" open; the list's title,
        // "Search" alone at its right, the columns (Rule 1; Fields).
        await website.goto();
        await expect(website.innerTabs).toHaveText(INNER_TABS);
        await expect(website.innerTabs.nth(0)).toHaveAttribute('aria-selected', 'true');
        await expect(website.innerTabs.nth(1)).toHaveAttribute('aria-selected', 'false');
        await expect(list.title).toHaveText('Plugins');
        await expect(list.headerLinks).toHaveText([SEARCH]);
        await expect(list.columns).toHaveText(COLUMNS);

        // The headings, in order, with no count; "No Items" under "Gateway
        // Plugins" alone; no "Usage event" under "Generic Plugins" (Rules 4, 6).
        await expect(list.headings).toHaveText(HEADINGS);
        const landing = await list.outline();
        expect(landing.filter((c) => c.empty !== null).map((c) => [c.heading, c.empty])).toEqual(
            EMPTY_HEADINGS.map((h) => [h, 'No Items']),
        );
        await expect(list.rowIn('Generic Plugins', WEB_FEED.id)).toBeVisible();
        await expect(list.row(USAGE.id)).toHaveCount(0);

        // Boxes that cannot be pressed: "TinyMCE Plugin", every "Metadata
        // Plugins" and "Import/Export Plugins" row; a pressable one as the
        // control (Rule 10).
        const rows = await list.read();
        await expect(list.box(TINYMCE.id)).toBeChecked();
        await expect(list.box(TINYMCE.id)).toBeDisabled();
        for (const heading of ['Metadata Plugins', 'Import/Export Plugins']) {
            const inCategory = rows.find((c) => c.heading === heading).rows;
            expect(inCategory.length, `${heading} has rows`).toBeGreaterThan(0);
            expect(inCategory.filter((r) => !(r.ticked && r.locked)).map((r) => r.name), `${heading}: unlocked or unticked rows`).toEqual([]);
        }
        await expect(list.box(GA.id)).toBeEnabled();
        await expect(list.box(GA.id)).not.toBeChecked();

        // The arrow opens a line with "Settings" and closes again (Rule 13).
        await expect(list.box(WEB_FEED.id)).toBeChecked();
        await list.openArrow(WEB_FEED.id);
        await expect(list.rowLinks(WEB_FEED.id)).toHaveText(['Settings']);
        await list.closeArrow(WEB_FEED.id);

        // Searching by text: the filter above the list; only "feed" rows,
        // every heading kept, "No Items" under the emptied ones, the filter
        // hidden again (Rule 7; Fields).
        await expect(list.filterForm).toBeHidden();
        await list.openFilter();
        await expect(list.categorySelect.locator('option:checked')).toHaveText('All Categories');
        await expect(list.nameBox).toBeVisible();
        await expect(list.filterButton).toBeVisible();
        const formBox = await list.filterForm.boundingBox();
        const tableBox = await list.grid.locator('table').first().boundingBox();
        expect(formBox && tableBox && formBox.y + formBox.height <= tableBox.y + 1, 'the filter stands above the list').toBe(true);
        const feedOnly = sorted(
            landing.map((c) => {
                const names = c.names.filter((n) => /feed/i.test(n));
                return {heading: c.heading, empty: names.length ? null : 'No Items', names};
            }),
        );
        await list.search({text: 'feed'});
        await expect.poll(async () => sorted(await list.outline()), {timeout: T}).toEqual(feedOnly);
        expect(feedOnly.find((c) => c.heading === 'Generic Plugins').names).toContain(WEB_FEED.name);
        await expect(list.filterForm).toBeHidden();

        // Capitals and Enter: the same rows (Rule 7).
        await list.search({text: 'FEED', enter: true});
        await expect.poll(async () => sorted(await list.outline()), {timeout: T}).toEqual(feedOnly);

        // Searching by category: "Block Plugins" alone, with its rows; then
        // Quokka in that category: "No Items"; then everything back (Rule 7).
        await list.search({text: '', category: 'Block Plugins'});
        const blocks = landing.find((c) => c.heading === 'Block Plugins');
        expect(blocks.names.length).toBeGreaterThan(0);
        await expect.poll(async () => sorted(await list.outline()), {timeout: T}).toEqual(sorted([blocks]));
        await list.openFilter();
        await expect(list.categorySelect.locator('option:checked')).toHaveText('Block Plugins');
        await list.search({text: 'Quokka'});
        await expect
            .poll(async () => sorted(await list.outline()), {timeout: T})
            .toEqual([{heading: 'Block Plugins', empty: 'No Items', names: []}]);
        await list.search({text: '', category: 'All Categories'});
        await expect.poll(async () => sorted(await list.outline()), {timeout: T}).toEqual(sorted(landing));

        // Control: no "Delete" or "Upgrade" on the line, no "Upload A New
        // Plugin" at the title (Actors rows 7, 8).
        await list.openArrow(WEB_FEED.id);
        await expect(list.rowLinks(WEB_FEED.id)).toHaveText(['Settings']);
        await expect(list.rowLink(WEB_FEED.id, 'Delete')).toHaveCount(0);
        await expect(list.rowLink(WEB_FEED.id, 'Upgrade')).toHaveCount(0);
        await expect(list.headerLinks).toHaveText([SEARCH]);
        await expect(list.uploadLink).toHaveCount(0);
    });

    test("S2: switching a press's plugin on and off", async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag(2, testInfo);
        const second = `${tag}b`;
        const mgr = `m${tag}`;
        await ompApi.createContext({tag, users: [manager(mgr)]});
        await ompApi.createContext({tag: second, users: [manager(`m${second}`)]});
        const mp = await signedIn(asUser, mgr);
        const ap = await signedIn(asUser, 'admin');
        const website = new WebsitePluginsPage(mp, tag);
        const list = website.list;

        // Ticking: nothing asks, the enabled notice; ticked after a reload (Rule 8).
        await website.goto();
        await tickWithNotice(list, GA.id, GA.name);
        await expect(list.disableWindow).toHaveCount(0);
        await website.reload();
        await expect(list.box(GA.id)).toBeChecked();

        // The second press and the site: still unticked (Rule 11).
        const other = new WebsitePluginsPage(ap, second);
        await other.goto();
        await expect(other.list.box(GA.id)).not.toBeChecked();
        await expect(other.list.box(WEB_FEED.id)).toBeChecked();
        const site = new SitePluginsPage(ap);
        await site.goto();
        await expect(site.list.box(GA.id)).not.toBeChecked();
        await expect(site.list.row(WEB_FEED.id)).toBeVisible();

        // Unticking: "Disable" asks; "OK", the disabled notice; unticked
        // after a reload (Rule 9).
        const win = await list.pressTicked(GA.id);
        await expect(win.getByRole('heading')).toHaveText('Disable');
        await expect(win).toContainText(DISABLE_TEXT);
        await expect(win.getByRole('button')).toHaveText(['OK', 'Cancel']);
        await markNotices(mp);
        await list.confirmDisable(GA.id);
        await expectFreshNotice(mp, DISABLED(GA.name));
        await website.reload();
        await expect(list.box(GA.id)).not.toBeChecked();

        // Control: ticked again, then "Cancel" in "Disable": the window
        // closes, nothing is sent, the box stays ticked, also after a
        // reload (Rule 9).
        await tickWithNotice(list, GA.id, GA.name);
        await list.pressTicked(GA.id);
        expect(await list.cancelDisable()).toEqual([]);
        await expect(list.box(GA.id)).toBeChecked();
        await website.reload();
        await expect(list.box(GA.id)).toBeChecked();
    });

    test("S3: the site's plugins @solo", async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag(3, testInfo);
        await ompApi.createContext({tag});
        const ap = await signedIn(asUser, 'admin');
        const site = new SitePluginsPage(ap);
        const list = site.list;
        try {
            // The tab: two inner tabs, "Installed Plugins" open; "Search" and
            // "Upload A New Plugin"; "Gateway Plugins" reads "No Items" (Rules 2, 4).
            await site.goto();
            await expect(site.innerTabs).toHaveText(INNER_TABS);
            await expect(site.innerTabs.nth(0)).toHaveAttribute('aria-selected', 'true');
            await expect(site.innerTabs.nth(1)).toHaveAttribute('aria-selected', 'false');
            await expect(list.title).toHaveText('Plugins');
            await expect(list.headerLinks).toHaveText([SEARCH, 'Upload A New Plugin']);
            await expect(list.emptyLine('Gateway Plugins')).toHaveText('No Items');
            await expect(list.emptyLine('Generic Plugins')).toBeHidden();
            await expect(list.box(GA.id)).not.toBeChecked();
            await expect(list.box(CBM.id)).not.toBeChecked();

            // "Usage event": ticked, cannot be pressed; "Delete" and
            // "Upgrade" alone (Rules 10, 14).
            await expect(list.box(USAGE.id)).toBeChecked();
            await expect(list.box(USAGE.id)).toBeDisabled();
            await list.openArrow(USAGE.id);
            await expect(list.rowLinks(USAGE.id)).toHaveText(['Delete', 'Upgrade']);
            await list.closeArrow(USAGE.id);

            // "Custom Block Manager": "Delete" and "Upgrade" alone; ticked,
            // the notice and "Manage Custom Blocks" first (Rules 8, 13, 14).
            await list.openArrow(CBM.id);
            await expect(list.rowLinks(CBM.id)).toHaveText(['Delete', 'Upgrade']);
            await list.closeArrow(CBM.id);
            await tickWithNotice(list, CBM.id, CBM.name);
            await list.openArrow(CBM.id);
            await expect(list.rowLinks(CBM.id)).toHaveText(['Manage Custom Blocks', 'Delete', 'Upgrade']);
            await list.closeArrow(CBM.id);

            // Unticked again: "OK" in "Disable", the notice, "Delete" and
            // "Upgrade" alone again (Rules 9, 14).
            await untickWithNotice(list, CBM.id, CBM.name);
            await list.openArrow(CBM.id);
            await expect(list.rowLinks(CBM.id)).toHaveText(['Delete', 'Upgrade']);
            await list.closeArrow(CBM.id);

            // "Google Analytics Plugin": ticked, the notice; ticked after a
            // reload (Rule 8).
            await tickWithNotice(list, GA.id, GA.name);
            await site.reload();
            await expect(list.box(GA.id)).toBeChecked();

            // Control: the scratch press's box is unticked (Rule 11).
            const press = new WebsitePluginsPage(ap, tag);
            await press.goto();
            await expect(press.list.box(GA.id)).not.toBeChecked();
            await expect(press.list.box(WEB_FEED.id)).toBeChecked();
        } finally {
            // Put back the site's ticks through its own list (footnote sc).
            await site.goto();
            for (const plugin of [GA, CBM]) {
                if (await list.box(plugin.id).isChecked()) {
                    await list.pressTicked(plugin.id);
                    await list.confirmDisable(plugin.id);
                }
            }
        }
    });

    test('S4: a new plugin uploaded @solo', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag(4, testInfo);
        const run = tag.slice(-6);
        const mgr = `m${tag}`;
        await ompApi.createContext({tag, users: [manager(mgr)]});

        // The packages, as files on the computer (Given; footnote sc).
        const dir = testInfo.outputPath('packages');
        fs.mkdirSync(dir, {recursive: true});
        const testPlugin = pluginNames(`u62s4test${run}`);
        const rootPlugin = pluginNames(`u62s4root${run}`);
        const nover = `u62s4nover${run}`;
        const notPlugin = `u62s4bad${run}`;
        products.push(testPlugin.product, rootPlugin.product, nover, notPlugin);
        const pkg = {
            test100: buildPlugin(dir, {product: testPlugin.product, version: '1.0.0.0', displayName: HARBOUR_TEST}),
            test101: buildPlugin(dir, {product: testPlugin.product, version: '1.0.1.0', displayName: HARBOUR_TEST}),
            root: buildPlugin(dir, {product: rootPlugin.product, version: '1.0.0.0', displayName: HARBOUR_ROOT, enabled: true, atRoot: true}),
            nover: buildNoVersion(dir, nover),
            notPlugin: buildNotAPlugin(dir, notPlugin),
        };

        const ap = await signedIn(asUser, 'admin');
        const mp = await signedIn(asUser, mgr);
        const website = new WebsitePluginsPage(ap, tag);
        const list = website.list;

        // The Site Administrator's list: "Upload A New Plugin" beside
        // "Search"; no "Usage event" row under "Generic Plugins", since the
        // installation hosts two or more presses, "Web Feed Plugin" there as
        // the control; "Web Feed Plugin": "Settings", "Delete", "Upgrade"
        // (Rules 6, 13; OMP1).
        await website.goto();
        await expect(list.headerLinks).toHaveText([SEARCH, 'Upload A New Plugin']);
        await expect(list.rowIn('Generic Plugins', WEB_FEED.id)).toBeVisible();
        await expect(list.row(USAGE.id)).toHaveCount(0);
        await list.openArrow(WEB_FEED.id);
        await expect(list.rowLinks(WEB_FEED.id)).toHaveText(['Settings', 'Delete', 'Upgrade']);
        await list.closeArrow(WEB_FEED.id);

        // "Upload A New Plugin", "Cancel": the window's parts; the list as
        // it was (Rule 15; Fields). The missing line is A2's, unasserted.
        const before = await list.outline();
        let win = await list.openUpload();
        await expect(win.heading).toHaveText('Upload A New Plugin');
        await expect(win.fieldLabel).toHaveText(/^\s*Select plugin file\s*\*\s*$/);
        await expect(win.dropText).toBeVisible();
        await expect(win.uploadButton).toBeVisible();
        await expect(win.cancelLink).toBeVisible();
        await expect(win.saveButton).toBeVisible();
        await expect(win.requiredLine).toBeVisible();
        const saveBox = await win.saveButton.boundingBox();
        const lineBox = await win.requiredLine.boundingBox();
        expect(saveBox && lineBox && lineBox.y >= saveBox.y + saveBox.height - 1, 'the asterisk line stands under "Save"').toBe(true);
        await win.cancelLink.click();
        await expect(win.dialog).toHaveCount(0);
        await pastModalCloseWindow(ap);
        expect(await list.outline()).toEqual(before);

        // No file chosen: the window stays, the refusal notice (Rule 17).
        win = await list.openUpload();
        await markNotices(ap);
        await win.save();
        await expect(win.heading).toBeVisible();
        const noFile = await expectFreshNotice(ap, NO_FILE);
        await expect(noFile).toHaveClass(/pkpNotification--warning/);

        // The new plugin: "Change File", "Save": the window closes, the
        // notice, listed under "Generic Plugins", unticked (Rule 16).
        await win.chooseFile(pkg.test100);
        await markNotices(ap);
        await win.save();
        await expect(win.dialog).toHaveCount(0);
        await expectFreshNotice(ap, INSTALLED('1.0.0.0'));
        await expect(list.rowIn('Generic Plugins', testPlugin.id)).toBeVisible({timeout: T});
        await expect(list.rowName(testPlugin.id)).toHaveText(HARBOUR_TEST);
        await expect(list.box(testPlugin.id)).not.toBeChecked();
        await pastModalCloseWindow(ap);

        // Every list: the site's, and the Settings Wizard's (Rules 3, 16).
        const site = new SitePluginsPage(ap);
        await site.goto();
        await expect(site.list.rowIn('Generic Plugins', testPlugin.id)).toBeVisible();
        await expect(site.list.box(testPlugin.id)).not.toBeChecked();
        const wizard = new WizardPluginsPage(ap);
        await wizard.goto(scratchName(tag));
        await expect(wizard.innerTabs).toHaveText(INNER_TABS);
        await expect(wizard.list.rowIn('Generic Plugins', testPlugin.id)).toBeVisible();
        await expect(wizard.list.rowName(testPlugin.id)).toHaveText(HARBOUR_TEST);
        await expect(wizard.list.box(testPlugin.id)).not.toBeChecked();

        // Already installed: the same version, then a newer one; still
        // listed once, unticked (Rule 17).
        await website.goto();
        await markNotices(ap);
        await list.upload(pkg.test100);
        await expectFreshNotice(ap, UP_TO_DATE);
        await markNotices(ap);
        await list.upload(pkg.test101);
        await expectFreshNotice(ap, PLEASE_UPGRADE);
        await expect(list.row(testPlugin.id)).toHaveCount(1);
        await expect(list.box(testPlugin.id)).not.toBeChecked();

        // Not a plugin package: no "version.xml", then one naming no
        // plugin; no row added (Rule 17).
        const count = await list.pluginRows.count();
        expect(count).toBeGreaterThan(0);
        await markNotices(ap);
        await list.upload(pkg.nover);
        await expectFreshNotice(ap, NO_FOLDER);
        await markNotices(ap);
        await list.upload(pkg.notPlugin);
        await expectFreshNotice(ap, INVALID);
        await expect(list.pluginRows).toHaveCount(count);

        // Files at the archive's root: installed, listed ticked (Rule 16; Fields).
        await markNotices(ap);
        await list.upload(pkg.root);
        await expectFreshNotice(ap, INSTALLED('1.0.0.0'));
        await expect(list.rowIn('Generic Plugins', rootPlugin.id)).toBeVisible({timeout: T});
        await expect(list.rowName(rootPlugin.id)).toHaveText(HARBOUR_ROOT);
        await expect(list.box(rootPlugin.id)).toBeChecked();

        // Control: the Press Manager's list shows both, and no "Upload A
        // New Plugin" (Side effects bullet 2; Actors row 8).
        const mine = new WebsitePluginsPage(mp, tag);
        await mine.goto();
        await expect(mine.list.rowIn('Generic Plugins', testPlugin.id)).toBeVisible();
        await expect(mine.list.box(testPlugin.id)).not.toBeChecked();
        await expect(mine.list.rowIn('Generic Plugins', rootPlugin.id)).toBeVisible();
        await expect(mine.list.box(rootPlugin.id)).toBeChecked();
        await expect(mine.list.headerLinks).toHaveText([SEARCH]);
        await expect(mine.list.uploadLink).toHaveCount(0);

        // Put back: the two plugins deleted through their rows (footnote sc).
        for (const plugin of [testPlugin, rootPlugin]) {
            await list.openDelete(plugin.id);
            await list.confirmDelete();
            await expect(list.row(plugin.id)).toHaveCount(0, {timeout: T});
        }
    });

    test('S5: a plugin upgraded, then deleted @solo', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag(5, testInfo);
        const run = tag.slice(-6);
        await ompApi.createContext({tag});

        // The packages (Given; footnote sc).
        const dir = testInfo.outputPath('packages');
        fs.mkdirSync(dir, {recursive: true});
        const testPlugin = pluginNames(`u62s5test${run}`);
        const blockPlugin = pluginNames(`u62s5block${run}`);
        const otherPlugin = pluginNames(`u62s5other${run}`);
        products.push(testPlugin.product, blockPlugin.product, otherPlugin.product);
        const pkg = {
            test100: buildPlugin(dir, {product: testPlugin.product, version: '1.0.0.0', displayName: HARBOUR_TEST}),
            test101: buildPlugin(dir, {product: testPlugin.product, version: '1.0.1.0', displayName: HARBOUR_TEST}),
            block: buildPlugin(dir, {product: blockPlugin.product, version: '1.0.0.0', displayName: HARBOUR_BLOCK, category: 'blocks'}),
            other: buildPlugin(dir, {product: otherPlugin.product, version: '1.0.0.0', displayName: HARBOUR_OTHER}),
        };

        const ap = await signedIn(asUser, 'admin');
        const website = new WebsitePluginsPage(ap, tag);
        const list = website.list;

        // Given: "Harbour Test Plugin" 1.0.0.0 installed and ticked on the
        // scratch press's list (footnote sc).
        await website.goto();
        await markNotices(ap);
        await list.upload(pkg.test100);
        await expectFreshNotice(ap, INSTALLED('1.0.0.0'));
        await expect(list.rowIn('Generic Plugins', testPlugin.id)).toBeVisible({timeout: T});
        await list.tick(testPlugin.id);

        // "Upgrade Plugin": the line ends with "Delete" and "Upgrade"; the
        // window's line above the file field; "Close" (Rules 15, 18).
        await website.reload();
        await list.openArrow(testPlugin.id);
        await expect(list.rowLinks(testPlugin.id)).toHaveText(['Delete', 'Upgrade']);
        let win = await list.openUpgrade(testPlugin.id);
        await expect(win.heading).toHaveText('Upgrade Plugin');
        expect(await win.formText()).toMatch(new RegExp(`^${esc(UPGRADE_LINE.replace(/\s+/g, ' '))} Select plugin file`));
        await win.closeButton.click();
        await expect(win.dialog).toHaveCount(0);
        await pastModalCloseWindow(ap);
        await expect(list.box(testPlugin.id)).toBeChecked();
        await expect(list.rowName(testPlugin.id)).toHaveText(HARBOUR_TEST);

        // Another category's plugin, then another plugin: refused, still
        // ticked (Rule 19).
        await markNotices(ap);
        await list.upgrade(testPlugin.id, pkg.block);
        await expectFreshNotice(ap, WRONG_CATEGORY);
        await expect(list.box(testPlugin.id)).toBeChecked();
        await markNotices(ap);
        await list.upgrade(testPlugin.id, pkg.other);
        await expectFreshNotice(ap, WRONG_NAME);
        await expect(list.box(testPlugin.id)).toBeChecked();
        await expect(list.row(otherPlugin.id)).toHaveCount(0);
        await expect(list.row(blockPlugin.id)).toHaveCount(0);

        // The newer version: upgraded, still ticked (Rule 18).
        await markNotices(ap);
        await list.upgrade(testPlugin.id, pkg.test101);
        await expectFreshNotice(ap, UPGRADED('1.0.1.0'));
        await expect(list.box(testPlugin.id)).toBeChecked();

        // "Delete", "Cancel": the window, nothing sent, the row stays (Rule 21).
        let confirm = await list.openDelete(testPlugin.id);
        await expect(confirm.getByRole('heading')).toHaveText('Delete');
        await expect(confirm).toContainText(DELETE_TEXT);
        await expect(confirm.getByRole('button')).toHaveText(['OK', 'Cancel']);
        const sent = [];
        const onRequest = (r) => {
            if (/delete-plugin/.test(r.url())) sent.push(r.url());
        };
        ap.on('request', onRequest);
        await confirm.getByRole('button', {name: 'Cancel', exact: true}).click();
        await expect(list.deleteWindow).toHaveCount(0);
        await expect(list.row(testPlugin.id)).toBeVisible();
        ap.off('request', onRequest);
        expect(sent).toEqual([]);
        await pastModalCloseWindow(ap);

        // "Delete", "OK": the notice, the row gone (Rule 21; A7 either spelling).
        confirm = await list.openDelete(testPlugin.id);
        await markNotices(ap);
        await list.confirmDelete();
        await expectFreshNotice(ap, DELETED(HARBOUR_TEST));
        await expect(list.row(testPlugin.id)).toHaveCount(0, {timeout: T});

        // The site's list: no row; "Google Analytics Plugin" as the control
        // (Rule 21; Side effects bullet 2).
        const site = new SitePluginsPage(ap);
        await site.goto();
        await expect(site.list.rowIn('Generic Plugins', GA.id)).toBeVisible();
        await expect(site.list.row(testPlugin.id)).toHaveCount(0);

        // Control: the scratch press's list after a reload (Rule 21).
        await website.goto();
        await expect(list.rowIn('Generic Plugins', GA.id)).toBeVisible();
        await expect(list.row(testPlugin.id)).toHaveCount(0);
    });
});
