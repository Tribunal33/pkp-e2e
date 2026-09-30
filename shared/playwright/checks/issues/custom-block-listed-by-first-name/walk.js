// Issue report walk: docs/issues/U09-A1-custom-block-listed-by-first-name.md
// (spec U09 register A1). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
// the manager `rvaca` ticks "Custom Block Manager" on Settings › Website ›
// "Plugins", adds the block "Our Partners u09a1" in "Manage Custom Blocks"
// and reads the list, places it under "Sidebar" on "Appearance" › "Setup"
// (after a reload, which the list needs) and reads its label, renames it
// "Friends u09a1" with "Show Name" ticked, reads the list and "Sidebar"
// again, and reads the home page's sidebar. Step numbers are the report's.
// The kit builds nothing. Records every screen with screen(), the list rows,
// the "Sidebar" entries (value, label, ticked), the home page's blocks and
// (for Evidence only) the stored block names read with sql().
//
// `neighbour` as the argument walks the neighbour check for the fix instead:
// two blocks titled alike ("Our Partners u09a1" twice, the second named with
// a generated suffix) keep their names as "Sidebar" values; each row's
// "Edit" opens its own block and "Delete" asks; both are ticked and saved
// under "Sidebar" and both show on the home page under their own ids; the
// other block plugins' "Sidebar" labels are recorded. Walked with the fix in
// and out, everything but the custom blocks' labels must read the same.
//
// Run (main, then stable-3_5_0); reset the fleet first, the walk changes the
// dataset:
//   npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
//   PROBE_FEATURE=issues-ir2 PROBE_AGENT=u09a1 node bin/probe.js all shared/playwright/checks/issues/custom-block-listed-by-first-name/walk.js [neighbour]
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=u09a1 node bin/probe.js all shared/playwright/checks/issues/custom-block-listed-by-first-name/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, idle, loc, sql} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEIGHBOUR = process.argv.includes('neighbour');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const facts = {line: app.line || 'main', part: NEIGHBOUR ? 'neighbour' : 'steps'};
    const SUF = NEIGHBOUR ? '-nb' : '';
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const ctxId = Number(sql(app, `SELECT ${app.contextTables.id} FROM ${app.contextTables.table} WHERE path = '${app.contextPath}'`));
    const blocksSetting = () => sql(app, `SELECT setting_value FROM plugin_settings WHERE plugin_name = 'customblockmanagerplugin' AND setting_name = 'blocks' AND COALESCE(context_id,0) = ${ctxId}`);

    const {page, close} = await launch(app);
    const scriptErrors = [];
    page.on('pageerror', (e) => scriptErrors.push({kind: 'pageerror', text: flat(e.message, 400)}));
    page.on('console', (m) => { if (m.type() === 'error') scriptErrors.push({kind: 'console', text: flat(m.text(), 400)}); });

    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}${SUF}`, {...s, ...extra}); return s; };

    const websiteURL = app.url(`/index.php/${app.contextPath}/en/management/settings/website`);
    const pluginRow = () => page.locator('tr.gridRow[id$="-row-customblockmanagerplugin"]').first();
    const openPlugins = async () => {
        await page.goto(websiteURL);
        await idle(page);
        await page.locator('#plugins-button').first().click();
        await idle(page);
        await pluginRow().waitFor({timeout: T});
        await pause(500);
    };
    const openControls = async (row) => {
        const id = await row.getAttribute('id', {timeout: T});
        const opener = row.locator('a.show_extras');
        if (await opener.count()) { await opener.first().click(); await pause(400); }
        return {id, ctl: page.locator(`[id="${id}-control-row"]`)};
    };
    const tickPlugin = async () => {
        const box = pluginRow().getByRole('checkbox').first();
        if (await box.isChecked()) return {already: true};
        const w = page.waitForResponse((r) => /plugin-grid\/enable/.test(r.url()), {timeout: T}).catch(() => null);
        await box.click();
        const r = await w;
        await pause(800); await idle(page);
        return {status: r ? r.status() : null, checked: await box.isChecked(), notices: (await screen(page)).notices};
    };
    const managerDialog = () => page.locator('[role="dialog"]:visible').filter({has: page.locator('[id*="customblockgrid"]')}).first();
    const managerRows = async () => {
        const d = managerDialog();
        await d.locator('.pkp_controllers_grid').first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await pause(500);
        return d.locator('tr.gridRow').evaluateAll((trs) => trs.map((tr) => {
            const td = tr.querySelector('td');
            const c = td ? td.cloneNode(true) : null;
            if (c) c.querySelectorAll('a.show_extras, a.hide_extras, script, .row_actions').forEach((a) => a.remove());
            return {id: tr.id.replace(/^.*-row-/, ''), shown: c ? c.textContent.replace(/\s+/g, ' ').trim() : null};
        }));
    };
    const openManager = async () => {
        const {ctl} = await openControls(pluginRow());
        const manage = ctl.getByRole('link', {name: 'Manage Custom Blocks', exact: true}).first();
        await loc(page, 'Plugins: "Manage Custom Blocks" on the Custom Block Manager row', manage);
        await manage.click();
        await managerDialog().waitFor({timeout: T});
        return managerRows();
    };
    const blockForm = () => page.locator('form#customBlockForm:visible').first();
    const blockDialog = () => page.locator('[role="dialog"]:visible').filter({has: page.locator('form#customBlockForm')}).last();
    const saveBlockForm = async () => {
        const w = page.waitForResponse((r) => /update-?custom-?block/i.test(r.url()), {timeout: T}).catch(() => null);
        await blockForm().locator('button[id^="submitFormButton"], button[type=submit]').first().click();
        const r = await w;
        await pause(1500); await idle(page);
        return {status: r ? r.status() : null, rows: await managerRows()};
    };
    const addBlock = async (title, content) => {
        await managerDialog().getByRole('link', {name: 'Add Block', exact: true}).first().click();
        await blockForm().waitFor({timeout: T});
        await idle(page);
        const ta = blockForm().locator('textarea[name="blockContent[en]"]').first();
        const taId = await ta.getAttribute('id');
        await page.waitForFunction((x) => window.tinymce && window.tinymce.get(x) && window.tinymce.get(x).initialized, taId, {timeout: T}).catch(() => {});
        await pause(400);
        await blockForm().locator('input[name="blockTitle[en]"]').first().fill(title);
        const body = page.locator(`[id="${taId}_ifr"]`).contentFrame().locator('body');
        await body.click();
        await page.keyboard.type(content);
        await blockDialog().locator('h1, h2').first().click().catch(() => {});
        await pause(400);
        return saveBlockForm();
    };
    const rowByIndex = (i) => managerDialog().locator('tr.gridRow').nth(i);
    // "Edit" on a row: the block window, and the "Block Name" it holds
    const openEdit = async (row) => {
        const {ctl} = await openControls(row);
        const link = ctl.getByRole('link', {name: 'Edit', exact: true}).first();
        await loc(page, '"Edit" on a custom block row', link);
        await link.click();
        await blockForm().waitFor({timeout: T});
        await idle(page); await pause(600);
        return blockForm().locator('input[name="blockTitle[en]"]').first().inputValue();
    };
    // the form's "Cancel" is a link (fbvFormButtons), not a button
    const cancelBlockForm = async () => {
        const cancel = blockDialog().getByRole('link', {name: 'Cancel', exact: true}).or(blockDialog().getByRole('button', {name: 'Cancel', exact: true})).first();
        await loc(page, 'block window: Cancel', cancel);
        await cancel.click();
        await blockForm().waitFor({state: 'detached', timeout: T});
        await pause(800);
    };
    const pressDelete = async (row) => {
        const {ctl} = await openControls(row);
        const link = ctl.getByRole('link', {name: 'Delete', exact: true}).first();
        await loc(page, '"Delete" on a custom block row', link);
        await link.click();
        await pause(1500);
        const top = page.locator('[role="dialog"]:visible').last();
        const text = flat(await top.innerText().catch(() => ''), 300);
        const asks = /Are you sure you wish to delete/.test(text);
        if (asks) { await top.getByRole('button', {name: 'Cancel', exact: true}).first().click().catch(() => {}); await pause(1200); }
        return {asks, dialog: text.slice(0, 160)};
    };
    const closeManager = async () => {
        const x = managerDialog().getByRole('button', {name: /close/i}).first();
        if (await x.count()) await x.click().catch(() => {});
        await pause(1200);
    };
    // Appearance › Setup, after a reload: the "Sidebar" entries
    const openSetup = async () => {
        await page.goto(websiteURL);
        await idle(page);
        await page.locator('#appearance-button').first().click();
        await idle(page);
        await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click();
        await idle(page); await pause(800);
        return page.locator('input[name="sidebar"]').evaluateAll((els) => els.map((e) => ({value: e.value, label: (e.closest('label') || e.parentElement).innerText.trim(), checked: e.checked})));
    };
    const tickAndSave = async (values) => {
        for (const v of values) await page.locator(`input[name="sidebar"][value="${v.replace(/"/g, '\\"')}"]`).first().setChecked(true);
        const form = page.locator('form').filter({has: page.locator('input[name="sidebar"]')}).first();
        const save = form.getByRole('button', {name: 'Save', exact: true});
        await loc(page, 'Appearance › Setup: Save', save);
        const w = page.waitForResponse((r) => /\/api\/v1\/contexts/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await save.click();
        const r = await w;
        await pause(1500);
        const s = await snap('sidebar-saved');
        return {status: r ? r.status() : null, notices: s.notices};
    };
    const homeBlocks = async () => {
        await page.goto(app.url(`/index.php/${app.contextPath}`));
        await idle(page);
        const blocks = await page.locator('.pkp_structure_sidebar .pkp_block').evaluateAll((bs) => bs.map((b) => {
            const h = b.querySelector('h2, .title');
            return {id: b.id, heading: h ? h.textContent.trim() : null, headingHidden: h ? h.classList.contains('pkp_screen_reader') : null, text: b.innerText.replace(/\s+/g, ' ').trim().slice(0, 80)};
        }));
        await snap('home', {blocks});
        return blocks;
    };
    const custom = (list) => list.filter((x) => /u09a1|Custom Block/.test(x.label) || /u09a1/.test(x.value));

    try {
        await signIn(page, 'rvaca', {contextPath: app.contextPath});                                     // 1
        await openPlugins();                                                                             // 2
        await snap('plugins');
        fact('step3-tick', await tickPlugin());                                                         // 3
        fact('step4-list', await openManager());                                                         // 4
        if (!NEIGHBOUR) {
            const add = await addBlock('Our Partners u09a1', 'Partner list.');                           // 5, 6
            await snap('added', {add});
            fact('step6-list', add);
            fact('stored-blocks-setting', blocksSetting());
            await closeManager();
            const sb = await openSetup();                                                                // 7
            fact('step7-sidebar', custom(sb));
            const name = (sb.find((x) => /u09a1/.test(x.value)) || {}).value;
            fact('step7-save', await tickAndSave([name]));
            fact('step7-home', await homeBlocks());
            await openPlugins();                                                                         // 8
            await openManager();
            const before = await openEdit(rowByIndex(0));
            fact('step8-edit-opens-with', before);
            await blockForm().locator('input[name="blockTitle[en]"]').first().fill('Friends u09a1');   // 9
            await blockForm().locator('input[name="showName"]').first().setChecked(true);
            const ed = await saveBlockForm();
            await snap('renamed', {ed});
            fact('step9-list', ed);
            fact('stored-blocks-setting-after', blocksSetting());
            await closeManager();
            const sb2 = await openSetup();                                                               // 10
            await snap('setup-after-rename', {sb2});
            fact('step10-sidebar', custom(sb2));
            fact('step11-home', await homeBlocks());                                                     // 11
        } else {
            await addBlock('Our Partners u09a1', 'First list.');
            const b = await addBlock('Our Partners u09a1', 'Second list.');
            fact('nb-list', b);
            fact('nb-stored-blocks-setting', blocksSetting());
            const edits = [];
            for (let i = 0; i < b.rows.length; i++) {
                const t = await openEdit(rowByIndex(i));
                const content = flat(await blockForm().locator('textarea[name="blockContent[en]"]').first().inputValue().catch(() => null), 80);
                edits.push({row: b.rows[i], titleInForm: t, content});
                await cancelBlockForm();
            }
            fact('nb-edits', edits);
            fact('nb-delete-asks', await pressDelete(rowByIndex(0)));
            await closeManager();
            const sb = await openSetup();
            await snap('nb-setup', {sb});
            fact('nb-sidebar-all', sb);
            fact('nb-save', await tickAndSave(sb.filter((x) => /our-partners/.test(x.value)).map((x) => x.value)));
            fact('nb-sidebar-after-save', (await openSetup()).filter((x) => x.checked));
            fact('nb-home', await homeBlocks());
        }
        fact('script-errors', scriptErrors);
        await signOut(page);
    } finally {
        record(`facts${SUF}`, facts);
        await close();
    }
});
