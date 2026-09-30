// Issue report walk: docs/issues/U09-A20-content-box-stuck-loading-spinner.md
// (spec U09 register A20). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// whose `publicknowledge` has English and French as its "Forms" languages:
//
// Custom Page item window: `dbarnes` opens Settings › Website › "Setup" ›
// "Navigation", pastes the report's console snippet (which holds back by
// 3 s the moment the French "Content" box's writing area reports it has
// loaded, the order a busy computer produces by chance), presses "Add item",
// chooses "Custom Page", waits for the English "Content" box's buttons, then
// clicks into the English "Content" box and types "Hello".
// Block window: the same with "Custom Block Manager" ticked on Settings ›
// Website › "Plugins" (the dataset leaves it off), its arrow, "Manage Custom
// Blocks", "Add Block".
//
// Each window is opened in a fresh browser. Records per window: the English
// and French editors' state (initialized, the "Loading..." spinner shown and
// busy), whether the click landed, what the box holds, the page errors, and
// the screen (screen(), a screenshot). The kit builds nothing.
//
// Arguments (the script's, after its path):
//   control     the same steps without the snippet (the usual order)
//   cpu=<rate>  no snippet; the browser's CPU slowed <rate> times (DevTools
//               "CPU throttling"), reps=<n> windows per path (the natural route)
//   neighbour   the fix's neighbour check, run with the fix in and out, no
//               snippet: in the item window, "Hello" typed in the English
//               "Content" box, then a click on the English "Title" box: the
//               "Content" field must be marked incomplete (one language of
//               two filled); then "Bonjour" in the French box and the same
//               click: marked complete. The fix touches the code that sets
//               that mark.
//   save        with the snippet, item window only: once the English box is
//               stuck, fill "Title" (English) "u09a20 page" and "Path"
//               "u09a20-page", press "Save": is the rest of the window's work
//               saved? (the saved item's content is read from the database)
//   item|block  one path only
//
// Run (main, then stable-3_5_0); reset the fleet first, the walk changes the
// dataset (the block path ticks the plugin):
//   npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
//   PROBE_FEATURE=issues-ir2 PROBE_AGENT=u09a20 node bin/probe.js all shared/playwright/checks/issues/content-box-stuck-loading-spinner/walk.js [control|cpu=20|neighbour]
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=u09a20 node bin/probe.js all shared/playwright/checks/issues/content-box-stuck-loading-spinner/walk.js
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const args = process.argv.slice(2);
const CONTROL = args.includes('control');
const NEIGHBOUR = args.includes('neighbour');
const CPU = Number((args.find((a) => a.startsWith('cpu=')) || 'cpu=0').slice(4));
const REPS = Number((args.find((a) => a.startsWith('reps=')) || 'reps=1').slice(5));
const HOLD = !CONTROL && !NEIGHBOUR && !(CPU > 1); // `save` keeps the snippet
const PATHS = args.includes('item') ? ['item'] : args.includes('block') ? ['block'] : NEIGHBOUR ? ['item'] : ['item', 'block'];
const SAVE = args.includes('save');
const PART = SAVE ? 'save' : NEIGHBOUR ? 'neighbour' : CPU > 1 ? `cpu${CPU}` : CONTROL ? 'control' : 'steps';

// The report's console snippet, verbatim in effect: a "load" listener added
// to an iframe whose id holds "-fr_CA-" (the French box's writing area) is
// called 3 s late, with a stand-in event that still names the iframe.
const SNIPPET = () => {
    const add = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, fn, opts) {
        if (type === 'load' && this instanceof HTMLIFrameElement && /-fr_CA-/.test(this.id) && typeof fn === 'function') {
            const frame = this;
            return add.call(this, type, function (e) {
                const late = new Proxy(e, {get: (t, k) => (k === 'composedPath' ? () => [frame] : (k === 'target' || k === 'currentTarget') ? frame : typeof t[k] === 'function' ? t[k].bind(t) : t[k])});
                setTimeout(() => fn.call(frame, late), 3000);
            }, opts);
        }
        return add.call(this, type, fn, opts);
    };
};

/** The two "Content" editors of the open window, by form language. */
const editors = (page, field) => page.evaluate((f) => {
    const out = {};
    for (const loc of ['en', 'fr_CA']) {
        const ta = document.querySelector(`textarea[name="${f}[${loc}]"]`);
        const ed = ta && window.tinymce && window.tinymce.get(ta.id);
        const box = ed && ed.getContainer();
        const thr = box && box.querySelector('.tox-throbber');
        let content = null;
        try { content = ed && ed.initialized ? ed.getContent() : null; } catch (e) { content = `throws: ${e.message}`; }
        out[loc] = {
            id: ta && ta.id,
            initialized: !!(ed && ed.initialized),
            spinnerShown: !!(thr && getComputedStyle(thr).display !== 'none'),
            spinnerBusy: !!(thr && thr.getAttribute('aria-busy') === 'true'),
            spinnerLabel: thr ? (thr.querySelector('[aria-label]') || {}).getAttribute?.('aria-label') || null : null,
            content,
            mark: ta ? ((ta.closest('.localization_popover_container') || {}).className || null) : null,
        };
    }
    return out;
}, field);

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const ctx = app.contextPath;
    const u = (p) => app.url(`/index.php/${ctx}/en${p}`);
    const results = [];

    for (const which of PATHS) {
        for (let rep = 0; rep < REPS; rep++) {
            const {page, close} = await launch(app);
            const errors = [];
            page.on('pageerror', (e) => errors.push(String(e.message || e).slice(0, 200)));
            const label = `${which}-${PART}${REPS > 1 ? `-${rep}` : ''}`;
            const out = {path: which, part: PART, rep, line: app.line || 'main'};
            try {
                if (CPU > 1) {
                    const cdp = await page.context().newCDPSession(page);
                    await cdp.send('Emulation.setCPUThrottlingRate', {rate: CPU});
                }
                // 1. Sign in as dbarnes.
                await signIn(page, 'dbarnes');
                let field;
                if (which === 'item') {
                    // 2. Settings › Website › "Setup" › "Navigation".
                    await page.goto(u('/management/settings/website#setup/navigationMenus'));
                    const itemsGrid = page.locator('table[id^="component-grid-navigationmenus-navigationmenuitemsgrid-"]:visible').first();
                    await itemsGrid.waitFor({timeout: T});
                    await idle(page);
                    if (HOLD) await page.evaluate(SNIPPET);
                    // 3. "Add item".
                    await page.getByRole('link', {name: 'Add item', exact: true}).click();
                    const form = page.locator('form#navigationMenuItemsForm');
                    await form.locator('select[name="menuItemType"]').waitFor({timeout: T});
                    // 4. "Navigation Menu Type": "Custom Page".
                    await form.locator('select[name="menuItemType"]').selectOption({label: 'Custom Page'});
                    field = 'content';
                } else {
                    // Settings › Website › "Plugins": tick "Custom Block Manager", its arrow, "Manage Custom Blocks".
                    await page.goto(u('/management/settings/website#plugins'));
                    const row = page.locator('tr.gridRow[id$="-row-customblockmanagerplugin"]').first();
                    await row.waitFor({timeout: T});
                    await idle(page);
                    const box = row.getByRole('checkbox');
                    if (!(await box.isChecked())) {
                        await box.click();
                        await idle(page);
                    }
                    out.pluginOn = await box.isChecked();
                    if (HOLD) await page.evaluate(SNIPPET);
                    await row.locator('a.show_extras').click();
                    const rowId = await row.getAttribute('id');
                    await page.locator(`[id="${rowId}-control-row"]`).getByRole('link', {name: 'Manage Custom Blocks', exact: true}).click();
                    const manager = page.locator('[role="dialog"]:visible').filter({has: page.locator('[id*="customblockgrid"], [id*="customBlockGrid"]')}).first();
                    await manager.getByRole('link', {name: 'Add Block', exact: true}).waitFor({timeout: T});
                    await idle(page);
                    await manager.getByRole('link', {name: 'Add Block', exact: true}).click();
                    await page.locator('form#customBlockForm').waitFor({timeout: T});
                    field = 'blockContent';
                }
                // 5. Wait for the English "Content" box's buttons.
                const en = page.locator(`textarea[name="${field}[en]"]`);
                const enId = await en.getAttribute('id', {timeout: T});
                await page.locator('.tox-tinymce').filter({has: page.locator(`[id="${enId}_ifr"]`)}).locator('.tox-toolbar__primary').first().waitFor({timeout: T});
                await pause(CPU > 1 ? 8000 : 5000); // past the snippet's 3 s and the editor's 500 ms spinner timer
                out.before = await editors(page, field);
                const s = await screen(page);
                record(`${label}-window`, {...s, editors: out.before});
                await shot(page, `${label}-window`);
                // Click into the English "Content" box and type "Hello".
                const body = page.frameLocator(`[id="${enId}_ifr"]`).locator('body');
                try {
                    await body.click({timeout: 5000});
                    await page.keyboard.type('Hello');
                    out.click = 'ok';
                } catch (e) {
                    out.click = String(e.message).split('\n').filter((l) => /intercepts|Timeout/.test(l)).slice(0, 2).join(' | ').slice(0, 400);
                }
                await pause(600);
                if (NEIGHBOUR) {
                    const title = page.locator('form#navigationMenuItemsForm input[name="title[en]"]');
                    await title.click();
                    await pause(800);
                    out.afterEnglish = await editors(page, field);
                    const fr = page.locator(`textarea[name="${field}[fr_CA]"]`);
                    const frId = await fr.getAttribute('id');
                    await body.click({timeout: 5000}); // the French box opens under the English one while it has the focus
                    await page.locator(`[id="${frId}_ifr"]`).waitFor({state: 'visible', timeout: T});
                    await page.frameLocator(`[id="${frId}_ifr"]`).locator('body').click({timeout: 5000});
                    await page.keyboard.type('Bonjour');
                    await title.click();
                    await pause(800);
                    out.afterFrench = await editors(page, field);
                }
                if (SAVE && which === 'item') {
                    // With the box stuck: the window's other boxes, then "Save".
                    const form = page.locator('form#navigationMenuItemsForm');
                    await form.locator('input[name="title[en]"]').fill('u09a20 page');
                    await form.locator('input[name="path"]').fill('u09a20-page');
                    const answer = page.waitForResponse((r) => /update-navigation-menu-item/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
                    await page.locator('[role="dialog"]:visible').filter({has: form}).getByRole('button', {name: 'Save', exact: true}).click();
                    const r = await answer;
                    const body = await r.json().catch(() => null);
                    await idle(page);
                    out.save = {status: r.status(), jsonStatus: body && body.status, windowOpen: await form.isVisible(), listed: await page.getByText('u09a20 page', {exact: true}).count()};
                    out.saved = await sql(app, "select s.locale, s.setting_name, s.setting_value from navigation_menu_item_settings s join navigation_menu_items i on i.navigation_menu_item_id = s.navigation_menu_item_id where i.path = 'u09a20-page' order by 2, 1");
                                }
                out.after = await editors(page, field);
                const s2 = await screen(page);
                record(`${label}-typed`, {...s2, editors: out.after, click: out.click});
                await shot(page, `${label}-typed`);
            } catch (e) {
                out.error = String(e.message).slice(0, 500);
            } finally {
                out.pageErrors = errors;
                results.push(out);
                console.log(`[${app.name}] ${label}: ${JSON.stringify(out).slice(0, 1500)}`);
                await close();
            }
        }
    }
    record(`summary-${PART}`, results);
    const stuck = results.filter((r) => r.before && r.before.en.initialized && r.before.en.spinnerBusy).length;
    console.log(`SUMMARY ${app.name} ${PART}: English box stuck under the spinner in ${stuck} / ${results.length} windows; clicks refused ${results.filter((r) => r.click !== 'ok').length}`);
});
