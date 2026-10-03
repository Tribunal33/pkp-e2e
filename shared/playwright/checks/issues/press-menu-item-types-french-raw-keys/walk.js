// Issue report docs/issues/U08-A24-press-menu-item-types-french-raw-keys.md (U08 A24): in French
// (Canada) a press's item window lists three of its own types as codes, and shows codes for its
// four types' descriptions and the series and category lists' labels. Takes the report's Steps on
// PKP's default test dataset, OMP, with OJS and OPS as the control (they have no such types):
//   1. rvaca (the context's manager) signs in
//   2. the initials menu > "Change Language" > "français"
//   3. Settings > Website > "Setup" > "Navigation"
//   4-5. "Add item": the type list's options (report steps 4-5)
//   7. on a press each of its own types chosen in turn: the line under the list, the series and
//      category lists (report step 6)
//   8. the window closed by its back arrow, unsaved (report step 7)
// Beyond the report's Steps, for the `main`-only pkp-lib texts its Cause names "not this fault":
//   6. "About" chosen: the "Query Parameters" box and its line
//   9. "Primary Navigation Menu": the first assigned item's handle, pointer resting on it
//  10. the window closed ("Cancel"); "Add Menu": the empty left panel; closed
// Changes nothing. NB=1 runs the neighbour check alone: the same steps in English, which the fix
// must leave as they are.
// Reset:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:    PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/press-menu-item-types-french-raw-keys/walk.js
//         (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, screen, shot, record, idle, rawKeys} = require('../../../probe');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');
const L = require('./lib');

// A press's own item types (OMP's NavigationMenuService), read one by one in step 7.
const MENU_DIALOG = '[role="dialog"]:has([data-cy="navigation-menu-editor"]), [role="dialog"]:has(#navigationMenuForm)';
const PRESS_TYPES = ['NMI_TYPE_CATALOG', 'NMI_TYPE_NEW_RELEASE', 'NMI_TYPE_SERIES', 'NMI_TYPE_CATEGORY'];

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const lang = nb ? 'en' : 'fr_CA';
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour (en)' : 'steps (fr_CA)'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
    };
    const keys = async (page, scope) => {
        const all = await rawKeys(page, {scope}).catch((e) => `rawKeys failed: ${e.message}`);
        return Array.isArray(all) ? [...new Set(all.map((k) => (typeof k === 'string' ? k : `${k.key}${k.where ? ` @${k.where}` : ''}`)))] : all;
    };
    const snap = async (page, name) => {
        record(`${lang}-${name}`, await screen(page));
        await shot(page, `${lang}-${name}`).catch(() => {});
    };
    const {page} = await launch(app);
    page.on('dialog', (d) => d.accept().catch(() => {}));
    try {
        // 1
        await signIn(page, 'rvaca');
        await idle(page);
        // 2
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
        await idle(page);
        if (!nb) {
            await changeLanguage(page, 'français', 'fr_CA');
            fact('2 language', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), htmlLang: await page.locator('html').getAttribute('lang')});
        }
        // 3
        await L.openNavigationTab(app, page, lang);
        fact('3 tab', {url: page.url().replace(/^https?:\/\/[^/]+/, '')});

        // 4
        fact('4 add item', await L.openItemWindow(page));
        // 5
        const options = await L.typeOptions(page);
        fact('5 type options', options);
        // 6
        fact('6 About chosen', await L.chooseType(page, 'NMI_TYPE_ABOUT'));
        fact('6 query parameters', await L.queryParamsSection(page));
        await snap(page, '6-item-window-about');
        fact('6 raw keys (item window)', await keys(page, L.ITEM_FORM));
        // 7 (a press's own types; elsewhere the list holds none of them)
        const own = Array.isArray(options) ? PRESS_TYPES.filter((v) => options.some((o) => o.value === v)) : [];
        const lines = [];
        for (const v of own) lines.push(await L.chooseType(page, v));
        fact('7 press types chosen', lines);
        if (own.length) {
            await snap(page, '7-item-window-press-type');
            fact('7 raw keys (item window)', await keys(page, L.ITEM_FORM));
        }

        // 8
        fact('8 item window closed', await L.closeWindow(page));
        // 9
        fact('9 menu window', await L.openMenuByTitle(page, 'Primary Navigation Menu'));
        fact('9 handle', await L.handleHint(page));
        await snap(page, '9-menu-window-primary');
        fact('9 raw keys (menu window)', await keys(page, MENU_DIALOG));

        // 10
        fact('10 menu window closed', await L.closeWindow(page));
        fact('10 add menu', await L.openAddMenu(page));
        fact('10 panels', await L.readPanels(page));
        await snap(page, '10-add-menu-window');
        fact('10 raw keys (menu window)', await keys(page, MENU_DIALOG));
        fact('10 window closed', await L.closeWindow(page));
    } finally {
        record('facts', facts);
    }
});
