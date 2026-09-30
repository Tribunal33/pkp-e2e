// Issue report walk: docs/issues/U09-A15-setup-save-refused-disabled-block.md
// (spec U09 register A15, spec U10 register A4). Takes the report's Steps
// through the screens on a dataset fleet (PKP's default test dataset,
// harness.md "Dataset fleets"): the manager `rvaca` adds and places the
// custom block "Partners u09a15", unticks "Custom Block Manager", and saves a
// changed "Page Footer" on Settings › Website › "Appearance" › "Setup" with
// "Sidebar" untouched (A15); then the way round (another block ticked) and
// the plugin ticked again; then the same with "Language Toggle Block" and its
// plugin unticked (U10 A4). Step numbers are the report's. The kit builds
// nothing. Records every screen with screen(), each save's request status and
// answer, the message under "Sidebar", the footer after a reload, and (for
// Evidence only) the stored "sidebar" setting read with sql().
//
// When step 8's save goes through (the fix applied), the walk checks the
// Expected instead of the way round: "Custom Block Manager" ticked again
// brings "Partners u09a15" back ticked in its place and onto the journal's
// home page; then it places "Language Toggle Block" itself for steps 11-13.
//
// `neighbour` as the script's argument walks the neighbour check for the fix:
// a block ticked in "Sidebar" on a page opened before its plugin was
// unticked in another tab must still be refused on "Save" (the fix accepts
// only a block already placed, never a newly ticked one whose plugin is off).
//
// Run (main, then stable-3_5_0); reset the fleet first, the walk changes the
// dataset:
//   npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
//   PROBE_FEATURE=issues-ir1 PROBE_AGENT=u09a15 node bin/probe.js all shared/playwright/checks/issues/setup-save-refused-disabled-block/walk.js [neighbour]
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u09a15 node bin/probe.js all shared/playwright/checks/issues/setup-save-refused-disabled-block/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, idle, loc, sql} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEIGHBOUR = process.argv.includes('neighbour');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const facts = {line: app.line || 'main', part: NEIGHBOUR ? 'neighbour' : 'steps'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const ct = app.contextTables;
    const ctxId = Number(sql(app, `SELECT ${ct.id} FROM ${ct.table} WHERE path = '${app.contextPath}'`));
    const storedSidebar = () => sql(app, `SELECT setting_value FROM ${ct.settings} WHERE ${ct.id} = ${ctxId} AND setting_name = 'sidebar'`);
    const website = `/index.php/${app.contextPath}/en/management/settings/website`;

    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (p, name, extra = {}) => { const s = await screen(p); record(`${String(++n).padStart(2, '0')}-${name}${NEIGHBOUR ? '-nb' : ''}`, {...s, ...extra}); return s; };

    // ---- Settings › Website › "Plugins"
    const openPlugins = async (p = page) => {
        await p.goto(app.url(website));
        await idle(p);
        await p.locator('#plugins-button').first().click();
        await idle(p);
        await p.locator('tr.gridRow[id$="-row-customblockmanagerplugin"]').first().waitFor({timeout: T});
        await pause(500);
    };
    const pluginBox = (p, name) => p.locator(`tr.gridRow[id$="-row-${name}"]`).first().getByRole('checkbox').first();
    const setPlugin = async (p, name, on) => {
        const box = pluginBox(p, name);
        if ((await box.isChecked()) === on) return {already: true};
        const w = p.waitForResponse((r) => /plugin-grid\/(enable|disable)/.test(r.url()), {timeout: T}).catch(() => null);
        await box.click();
        let ask = null;
        if (!on) {
            const conf = p.locator('[role="dialog"]:visible').filter({hasText: 'Are you sure you want to disable this plugin?'}).last();
            await conf.waitFor({timeout: T});
            ask = flat(await conf.innerText());
            await loc(p, '"Disable" window: OK', conf.getByRole('button', {name: 'OK', exact: true}));
            await conf.getByRole('button', {name: 'OK', exact: true}).first().click();
        }
        const r = await w;
        await pause(800); await idle(p);
        const notices = (await screen(p)).notices;
        return {ask, status: r ? r.status() : null, checked: await box.isChecked(), notices};
    };

    // ---- "Custom Block Manager" › "Add Block"
    const managerDialog = () => page.locator('[role="dialog"]:visible').filter({has: page.locator('[id*="customblockgrid"], [id*="customBlockGrid"], table[id*="customblock"]')}).first();
    const managerRows = async () => {
        const d = managerDialog();
        await d.locator('.pkp_controllers_grid').first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await pause(300);
        return d.locator('tr.gridRow').evaluateAll((trs) => trs.map((tr) => {
            const td = tr.querySelector('td');
            const c = td ? td.cloneNode(true) : null;
            if (c) c.querySelectorAll('a.show_extras, a.hide_extras, script').forEach((a) => a.remove());
            return c ? c.textContent.replace(/\s+/g, ' ').trim() : null;
        }));
    };
    const addBlock = async (title, content) => {
        const row = page.locator('tr.gridRow[id$="-row-customblockmanagerplugin"]').first();
        const id = await row.getAttribute('id', {timeout: T});
        const opener = row.locator('a.show_extras');
        if (await opener.count()) { await opener.first().click(); await pause(400); }
        await page.locator(`[id="${id}-control-row"]`).getByRole('link', {name: 'Manage Custom Blocks', exact: true}).first().click();
        await managerDialog().waitFor({timeout: T});
        await managerRows();
        await managerDialog().getByRole('link', {name: 'Add Block', exact: true}).first().click();
        const form = page.locator('form#customBlockForm:visible').first();
        await form.waitFor({timeout: T});
        await idle(page);
        const ta = form.locator('textarea[name="blockContent[en]"]').first();
        const taId = await ta.getAttribute('id');
        await page.waitForFunction((x) => window.tinymce && window.tinymce.get(x) && window.tinymce.get(x).initialized, taId, {timeout: T}).catch(() => {});
        await pause(400);
        await form.locator('input[name="blockTitle[en]"]').first().fill(title);
        await page.locator(`[id="${taId}_ifr"]`).contentFrame().locator('body').click();
        await page.keyboard.type(content);
        await page.locator('[role="dialog"]:visible').filter({has: page.locator('form#customBlockForm')}).last().locator('h1, h2').first().click().catch(() => {});
        await pause(400);
        const w = page.waitForResponse((r) => /update-?custom-?block/i.test(r.url()), {timeout: T}).catch(() => null);
        await form.locator('button[id^="submitFormButton"], button[type=submit]').first().click();
        const r = await w;
        await pause(1200); await idle(page);
        const rows = await managerRows();
        await snap(page, 'custom-block-saved', {rows});
        // close the manager window
        await managerDialog().getByRole('button', {name: /Close/}).first().click().catch(() => {});
        await pause(600);
        return {status: r ? r.status() : null, rows};
    };

    // ---- Settings › Website › "Appearance" › "Setup"
    const setupForm = (p) => p.locator('form').filter({has: p.locator('input[name="sidebar"]')}).first();
    const openSetup = async (p = page) => {
        await p.goto(app.url(website));
        await idle(p);
        await p.locator('#appearance-button').first().click();
        await idle(p);
        await p.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click();
        await idle(p);
        await setupForm(p).waitFor({timeout: T});
        await pause(800);
    };
    const sidebarList = async (p = page) => p.locator('input[name="sidebar"]').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked, label: (e.closest('label') || e.parentElement).innerText.trim()})));
    const footerId = async (p = page) => setupForm(p).locator('textarea[id*="pageFooter"][id$="-en"]').first().getAttribute('id', {timeout: T});
    const footerNow = async (p = page) => {
        const id = await footerId(p);
        await p.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T}).catch(() => {});
        return p.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent() : null), id);
    };
    const typeFooter = async (text, p = page) => {
        const id = await footerId(p);
        await p.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T});
        await p.locator(`[id="${id}_ifr"]`).contentFrame().locator('body').click();
        await p.keyboard.press('Control+A');
        await p.keyboard.press('Delete');
        await p.keyboard.type(text);
        await pause(500);
    };
    const tickSidebar = async (value, p = page) => { await p.locator(`input[name="sidebar"][value="${value}"]`).first().check(); await pause(300); };
    const saveSetup = async (p = page) => {
        const form = setupForm(p);
        const w = p.waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(r.url().split('?')[0]) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await loc(p, 'Appearance › Setup: Save', form.getByRole('button', {name: 'Save', exact: true}));
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w;
        let answer = null;
        if (r) { try { answer = flat(await r.text(), 500); } catch { answer = null; } }
        await pause(1200); await idle(p);
        const saved = !!r && r.status() < 300;
        const sidebarError = flat(await form.locator('fieldset').filter({has: p.locator('input[name="sidebar"]')}).first()
            .locator('.pkpFormFieldError, [class*="Error"], [id$="-error"]').allInnerTexts().then((a) => a.join(' | ')).catch(() => null), 400);
        const footText = flat(await form.locator('.pkpFormPage__footer, .pkpFormPage__status, [class*="footer"]').first().innerText().catch(() => null), 400);
        return {
            request: r ? {method: r.request().method(), override: r.request().headers()['x-http-method-override'] || null, url: r.url().replace(app.baseURL, ''), status: r.status()} : null,
            answer, saved, sidebarError, footText,
        };
    };
    const publicSidebar = async () => {
        await page.goto(app.url(`/index.php/${app.contextPath}/en`));
        await idle(page);
        await snap(page, 'public-home');
        const side = page.locator('.pkp_structure_sidebar');
        return (await side.count()) ? flat(await side.first().innerText(), 400) || '(empty sidebar)' : '(no sidebar)';
    };

    try {
        if (!NEIGHBOUR) {
            // ------------------------------------------------ a custom block, steps 1-10
            await signIn(page, 'rvaca', {contextPath: app.contextPath});                                 // 1
            await openPlugins();                                                                        // 2
            await snap(page, 'plugins');
            fact('step3-tick-cbm', await setPlugin(page, 'customblockmanagerplugin', true));            // 3
            fact('step4-add-block', await addBlock('Partners u09a15', 'Our partners.'));                // 4
            await openSetup();                                                                          // 5
            const list5 = await sidebarList();
            const block = (list5.find((o) => /partners-u09a15/.test(o.value)) || {}).value;
            fact('step5-sidebar-before', list5);
            await tickSidebar(block);
            fact('step5-place-save', await saveSetup());
            fact('stored-after-step5', storedSidebar());
            fact('step5-public-sidebar', await publicSidebar());
            await openPlugins();                                                                        // 6
            fact('step6-untick-cbm', await setPlugin(page, 'customblockmanagerplugin', false));
            await openSetup();                                                                          // 7
            const list7 = await sidebarList();
            await snap(page, 'step7-setup', {list7});
            fact('step7-sidebar', list7);
            await typeFooter('Footer u09a15');                                                          // 8
            const s8 = await saveSetup();
            await snap(page, 'step8-after-save', {s8});
            fact('step8-save', s8);
            fact('stored-after-step8', storedSidebar());
            await openSetup();
            fact('step8-footer-after-reload', flat(await footerNow(), 200));

            if (!s8.saved) {
                // the way round: steps 9-10
                await tickSidebar('languagetoggleblockplugin');                                          // 9
                await typeFooter('Footer u09a15');
                const s9 = await saveSetup();
                await snap(page, 'step9-after-save', {s9});
                fact('step9-save', s9);
                fact('stored-after-step9', storedSidebar());
                await openPlugins();                                                                    // 10
                fact('step10-tick-cbm', await setPlugin(page, 'customblockmanagerplugin', true));
                await openSetup();
                const list10 = await sidebarList();
                await snap(page, 'step10-setup', {list10});
                fact('step10-sidebar', list10);
                fact('step10-public-sidebar', await publicSidebar());
            } else {
                // Expected: the block keeps its place while its plugin is off
                fact('expected-public-sidebar-plugin-off', await publicSidebar());
                await openPlugins();
                fact('expected-tick-cbm', await setPlugin(page, 'customblockmanagerplugin', true));
                await openSetup();
                const listE = await sidebarList();
                await snap(page, 'expected-setup', {listE});
                fact('expected-sidebar-plugin-on', listE);
                fact('expected-public-sidebar-plugin-on', await publicSidebar());
                // steps 11-13 need "Language Toggle Block" placed (step 9 of the unfixed walk)
                await openSetup();
                await tickSidebar('languagetoggleblockplugin');
                fact('expected-place-toggle', await saveSetup());
            }
            fact('stored-before-step11', storedSidebar());

            // ------------------------------------------------ a block plugin, steps 11-13
            await openPlugins();                                                                        // 11
            fact('step11-untick-toggle', await setPlugin(page, 'languagetoggleblockplugin', false));
            await openSetup();                                                                          // 12
            const list12 = await sidebarList();
            await snap(page, 'step12-setup', {list12});
            fact('step12-sidebar', list12);
            await typeFooter('Footer u09a15 again');                                                    // 13
            const s13 = await saveSetup();
            await snap(page, 'step13-after-save', {s13});
            fact('step13-save', s13);
            fact('stored-after-step13', storedSidebar());
            await openSetup();
            fact('step13-footer-after-reload', flat(await footerNow(), 200));
            await signOut(page);
        } else {
            // ------------------------------------------------ neighbour: a newly ticked block whose plugin is off stays refused
            await signIn(page, 'rvaca', {contextPath: app.contextPath});
            await openPlugins();
            fact('nb-tick-cbm', await setPlugin(page, 'customblockmanagerplugin', true));
            fact('nb-add-block', await addBlock('Partners u09a15', 'Our partners.'));
            await openSetup();                                   // tab A: the block listed, unticked
            const listA = await sidebarList();
            const block = (listA.find((o) => /partners-u09a15/.test(o.value)) || {}).value;
            fact('nb-tabA-sidebar', listA);
            const other = await page.context().newPage();        // tab B: untick the plugin
            await openPlugins(other);
            fact('nb-tabB-untick-cbm', await setPlugin(other, 'customblockmanagerplugin', false));
            await other.close();
            await tickSidebar(block);                            // tab A: tick it and save
            const sNb = await saveSetup();
            await snap(page, 'nb-after-save', {sNb});
            fact('nb-save-new-block-plugin-off', sNb);
            fact('nb-stored-after', storedSidebar());
            fact('nb-public-sidebar', await publicSidebar());
            await signOut(page);
        }
    } finally {
        record(`facts${NEIGHBOUR ? '-nb' : ''}`, facts);
        await close();
    }
});
