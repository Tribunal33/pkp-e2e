// Issue report docs/issues/U10-A17-sidebar-arrows-read-html-codes.md (U10 A17): on Settings ›
// Website › Appearance › "Setup" › "Sidebar", a block whose name holds a double quote (or, in
// French, an apostrophe) has its up and down arrows named with the HTML code (`&quot;`,
// `&#039;`) instead of the character.
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default
// test dataset, as the dataset's editor `dbarnes` on `publicknowledge`: Settings › Website ›
// "Plugins", tick ""Developed By" Block"; Appearance › "Setup" › "Sidebar", read that row; the
// initials menu's French; the same list in French, read the default block whose French name has
// an apostrophe (OJS "Bloc d'abonnement", OMP "Bloc d'informations"; OPS has none). Nothing is
// saved apart from the plugin's tick. The kit builds nothing. All three apps have the list.
//
// Modes (MODE=):
//   walk (default)  the Steps above.
//   nb              what the fix must leave alone, alone on a fresh reset: the "Web Feed Plugin"
//                   row's label and arrow names (a name with no character to escape); the
//                   masthead's first role's arrow names; the second block's up arrow still moves
//                   it (nothing saved).
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/sidebar-arrows-read-html-codes/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, the 3.5 fleet's feature, PROBE_RUN=r35.
// Fix trial:    PROBE_RUN=fix (walk), nb-in / nb-out (MODE=nb), with fix.diff applied or not.
// Records each screen and the facts (facts-<mode>-<app>.json under the run); asserts nothing.
const {forEachApp, launch, signIn, record, shot, screen, idle, switchLanguage} = require('../../../probe');
const {flat, axOf, readRow, listRows} = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const THUMB = {ojs: 'journalThumbnail', omp: 'pressThumbnail', ops: 'serverThumbnail'};
// A default block (offered on a new context) whose French name holds an apostrophe.
const FRENCH = {ojs: 'subscriptionblockplugin', omp: 'informationblockplugin', ops: null};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {WebsiteSettings} = require('../../../pages/AppearancePages.js');
    const {WebsitePluginsPage} = require('../../../pages/PluginsPages.js');
    const {page, close} = await launch(app);
    const facts = {mode: MODE, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${app.name} ${MODE}] ${k}: ${flat(JSON.stringify(v), 1500)}`);
    };
    /** One step; a throw is recorded, never fatal (a fix or an older line changes the screen). */
    const step = async (name, fn) => {
        try {
            return await fn();
        } catch (e) {
            await shot(page, `${name}-error`).catch(() => {});
            return {error: flat(e.message, 2000)};
        }
    };
    const snap = async (name) => {
        await idle(page);
        record(`${name}-screen`, await screen(page));
        await shot(page, name);
    };
    const settings = new WebsiteSettings(page, app.contextPath, {thumbnailField: THUMB[app.name]});
    const sidebar = () => settings.setup.form.locator('fieldset.pkpFormField--options').filter({has: page.locator('input[name="sidebar"]')});
    const openSidebar = async (name) => {
        await settings.open('appearance-setup');
        await sidebar().locator('button.orderer__up').first().scrollIntoViewIfNeeded();
        await snap(name);
    };

    try {
        // Step 1.
        await signIn(page, 'dbarnes');

        if (MODE === 'walk') {
            // Step 2: Settings › Website › "Plugins", tick ""Developed By" Block".
            fact('s2-enable-developed-by', await step('s2', async () => {
                const plugins = new WebsitePluginsPage(page, app.contextPath);
                await plugins.goto();
                const name = flat(await plugins.list.rowName('developedbyblockplugin').innerText());
                const response = await plugins.list.tick('developedbyblockplugin');
                await snap('s2-plugins');
                return {row: name, enable: response.status(), ticked: await plugins.list.box('developedbyblockplugin').isChecked()};
            }));
            // Steps 3-4: reload, Appearance › "Setup" › "Sidebar"; the row's label and arrow names.
            fact('s4-developed-by-row', await step('s4', async () => {
                await settings.goto();
                await openSidebar('s3-sidebar');
                return {rows: await listRows(sidebar()), row: await readRow(page, sidebar(), 'developedbyblockplugin')};
            }));
            // Steps 5-7: French from the initials menu; the same list; the apostrophe block's row.
            fact('s7-french-row', await step('s7', async () => {
                await switchLanguage(page, 'fr_CA');
                await settings.open('appearance-setup');
                await sidebar().locator('button.orderer__up').first().scrollIntoViewIfNeeded();
                await snap('s6-sidebar-fr');
                const out = {url: page.url(), rows: await listRows(sidebar())};
                if (FRENCH[app.name]) out.row = await readRow(page, sidebar(), FRENCH[app.name]);
                out.developedBy = await readRow(page, sidebar(), 'developedbyblockplugin');
                return out;
            }));
        } else {
            // Neighbour 1: a name with nothing to escape keeps its arrows' names.
            fact('n1-web-feed-row', await step('n1', async () => {
                await settings.goto();
                await openSidebar('n1-sidebar');
                return await readRow(page, sidebar(), 'webfeedblockplugin');
            }));
            // Neighbour 2: the second block's up arrow still moves it (nothing saved).
            fact('n2-up-arrow-moves', await step('n2', async () => {
                const before = (await listRows(sidebar())).map((r) => r.value);
                await sidebar().locator('button.orderer__up').nth(1).click();
                await idle(page);
                return {before, after: (await listRows(sidebar())).map((r) => r.value)};
            }));
            // Neighbour 3: the masthead's first role keeps its arrow names (A3's fault aside).
            fact('n3-masthead-first-role', await step('n3', async () => {
                await settings.goto();
                await settings.open('appearance-masthead');
                const fs = settings.masthead.form.locator('fieldset.pkpFormField--options').filter({has: page.locator('[id^="appearanceMasthead-mastheadUserGroupIds"]')});
                await fs.locator('button.orderer__down').first().waitFor({timeout: 30_000});
                await snap('n3-masthead');
                return {
                    role: flat(await fs.locator('.pkpFormField--options__optionLabel').first().innerText()),
                    up: await axOf(page, fs.locator('button.orderer__up').first()),
                    down: await axOf(page, fs.locator('button.orderer__down').first()),
                };
            }));
        }
    } finally {
        record(`facts-${MODE}`, facts);
        await close();
    }
});
