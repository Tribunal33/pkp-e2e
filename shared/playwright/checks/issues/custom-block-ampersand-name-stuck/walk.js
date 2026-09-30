// Issue report walk: docs/issues/U09-A13-custom-block-ampersand-name-stuck.md
// (spec U09 register A13). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
// the journal manager `rvaca` ticks "Custom Block Manager" on Settings ›
// Website › "Plugins", adds the blocks "Partners u09a13" and "News & Events
// u09a13" in "Manage Custom Blocks", presses the "&" row's "Edit" and
// "Delete", then "Partners u09a13"'s "Edit", then ticks the "&" block
// under "Sidebar" on "Appearance" › "Setup" (after a reload, which the list
// needs to show the new block) and saves. Step numbers are the
// report's. The kit builds nothing. Records every screen with screen(), the
// browser's script errors, the requests the actions send (or that none is
// sent), the Sidebar save's status and answer, and (for Evidence only) the
// stored block names read with sql().
//
// `neighbour` as the script's argument walks the neighbour check for the fix
// instead: the blocks "Partners u09a13" and "Événements à venir u09a13" keep
// the names they get today ("partners-u09a13", "événementsà-venir-u09a13"),
// open with "Edit", and are placed through "Sidebar" and shown on the home
// page; walked with the fix in and out, the two must read the same. A third
// block, "& & &" (a name of symbols alone), shows what the fix does with a
// name it empties: without the fix it is "&&&" and stuck like the Steps' block,
// with it a generated name whose "Edit" opens.
//
// `others` as the argument walks other characters and the clean-up instead:
// "3.5 News u09a13" and "Editor's Picks u09a13" are added, each row's "Edit"
// and "Delete" pressed, each block ticked alone under "Sidebar"; then the
// report's clean-up for stuck blocks is applied (its SQL through sql(), then
// `admin`'s "Delete Data Caches" on Administration) and the list and the
// "Sidebar" read again as `rvaca`.
//
// Run (main, then stable-3_5_0); reset the fleet first, the walk changes the
// dataset:
//   npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
//   PROBE_FEATURE=issues-ir1 PROBE_AGENT=u09a13 node bin/probe.js all shared/playwright/checks/issues/custom-block-ampersand-name-stuck/walk.js [neighbour|others]
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u09a13 node bin/probe.js all shared/playwright/checks/issues/custom-block-ampersand-name-stuck/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, idle, loc, sql} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEIGHBOUR = process.argv.includes('neighbour');
const OTHERS = process.argv.includes('others');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const facts = {line: app.line || 'main', part: NEIGHBOUR ? 'neighbour' : OTHERS ? 'others' : 'steps'};
    const SUF = NEIGHBOUR ? '-nb' : OTHERS ? '-ot' : '';
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const ctxId = Number(sql(app, `SELECT ${app.contextTables.id} FROM ${app.contextTables.table} WHERE path = '${app.contextPath}'`));
    const blocksSetting = () => sql(app, `SELECT setting_value FROM plugin_settings WHERE plugin_name = 'customblockmanagerplugin' AND setting_name = 'blocks' AND COALESCE(context_id,0) = ${ctxId}`);

    const {page, close} = await launch(app);
    const scriptErrors = [];
    page.on('pageerror', (e) => scriptErrors.push({kind: 'pageerror', text: flat(e.message, 400)}));
    page.on('console', (m) => { if (m.type() === 'error') scriptErrors.push({kind: 'console', text: flat(m.text(), 400)}); });
    const errorsSince = (i) => scriptErrors.slice(i);
    const requests = [];
    page.on('request', (r) => { if (/customblock|custom-block/i.test(r.url())) requests.push(`${r.method()} ${r.url().replace(app.baseURL, '').replace(/csrfToken=[^&]+/, 'csrfToken=…')}`); });

    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}${SUF}`, {...s, ...extra}); return s; };

    const websiteURL = app.url(`/index.php/${app.contextPath}/en/management/settings/website`);
    const openPlugins = async () => {
        await page.goto(websiteURL);
        await idle(page);
        await page.locator('#plugins-button').first().click();
        await idle(page);
        await pluginRow().waitFor({timeout: T});
        await pause(500);
    };
    const pluginRow = () => page.locator('tr.gridRow[id$="-row-customblockmanagerplugin"]').first();
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
            return {id: tr.id, name: c ? c.textContent.replace(/\s+/g, ' ').trim() : null};
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
        await page.locator('[role="dialog"]:visible').filter({has: page.locator('form#customBlockForm')}).last().locator('h1, h2').first().click().catch(() => {});
        await pause(400);
        const e0 = scriptErrors.length;
        const w = page.waitForResponse((r) => /update-?custom-?block/i.test(r.url()), {timeout: T}).catch(() => null);
        await blockForm().locator('button[id^="submitFormButton"], button[type=submit]').first().click();
        const r = await w;
        await pause(1500); await idle(page);
        return {status: r ? r.status() : null, rows: await managerRows(), scriptErrors: errorsSince(e0)};
    };
    // "Edit" on a row: does the block window open, and with what?
    const pressEdit = async (rowName) => {
        const row = managerDialog().locator('tr.gridRow').filter({hasText: rowName}).first();
        const {id, ctl} = await openControls(row);
        const link = ctl.getByRole('link', {name: 'Edit', exact: true}).first();
        await loc(page, `"Edit" on the row ${rowName}`, link);
        const visible = await link.isVisible().catch(() => false);
        const r0 = requests.length; const e0 = scriptErrors.length;
        if (visible) await link.click({timeout: 5000}).catch(() => {});
        await pause(2500); await idle(page).catch(() => {});
        const formOpen = await blockForm().count() > 0;
        const title = formOpen ? await blockForm().locator('input[name="blockTitle[en]"]').first().inputValue().catch(() => null) : null;
        const out = {rowId: id, linkVisible: visible, formOpen, titleInForm: title, requests: requests.slice(r0), scriptErrors: errorsSince(e0)};
        await snap(`edit-${rowName.slice(0, 20).replace(/[^a-z0-9]+/gi, '_')}`, {out});
        if (formOpen) {
            const cancel = page.locator('[role="dialog"]:visible').filter({has: page.locator('form#customBlockForm')}).last().getByRole('button', {name: 'Cancel', exact: true}).first();
            if (await cancel.count()) await cancel.click().catch(() => {});
            else await page.locator('[role="dialog"]:visible').last().getByRole('button', {name: /close/i}).first().click().catch(() => {});
            await pause(1200);
        }
        return out;
    };
    const pressDelete = async (rowName) => {
        const row = managerDialog().locator('tr.gridRow').filter({hasText: rowName}).first();
        const {ctl} = await openControls(row);
        const link = ctl.getByRole('link', {name: 'Delete', exact: true}).first();
        await loc(page, `"Delete" on the row ${rowName}`, link);
        const visible = await link.isVisible().catch(() => false);
        const r0 = requests.length; const e0 = scriptErrors.length;
        if (visible) await link.click({timeout: 5000}).catch(() => {});
        await pause(2000);
        const top = page.locator('[role="dialog"]:visible').last();
        const text = flat(await top.innerText().catch(() => ''), 400);
        const asks = /Are you sure you wish to delete/.test(text);
        const out = {linkVisible: visible, asks, topDialog: text.slice(0, 160), requests: requests.slice(r0), scriptErrors: errorsSince(e0)};
        await snap('delete', {out});
        if (asks) { await top.getByRole('button', {name: 'Cancel', exact: true}).first().click().catch(() => {}); await pause(1200); }
        return out;
    };
    const closeManager = async () => {
        const d = managerDialog();
        const x = d.getByRole('button', {name: /close/i}).first();
        if (await x.count()) await x.click().catch(() => {});
        await pause(1200);
    };
    // Appearance › Setup: tick the given names under "Sidebar" and save
    const placeInSidebar = async (names) => {
        await page.goto(websiteURL);                   // the reload: "Sidebar" is read when the page loads
        await idle(page);
        await page.locator('#appearance-button').first().click();
        await idle(page);
        await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click();
        await idle(page); await pause(800);
        const list = await page.locator('input[name="sidebar"]').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked, label: (e.closest('label') || e.parentElement).innerText.trim()})));
        const ticked = [];
        for (const nm of names) {
            const it = list.find((x) => x.value === nm);
            if (!it) continue;
            await page.locator(`input[name="sidebar"][value="${nm.replace(/"/g, '\\"')}"]`).first().setChecked(true);
            ticked.push(it.label);
        }
        const form = page.locator('form').filter({has: page.locator('input[name="sidebar"]')}).first();
        const save = form.getByRole('button', {name: 'Save', exact: true});
        await loc(page, 'Appearance › Setup: Save', save);
        const e0 = scriptErrors.length;
        const w = page.waitForResponse((r) => /\/api\/v1\/contexts/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await save.click();
        const r = await w;
        let answer = null;
        if (r) { try { answer = flat(await r.text(), 400); } catch { answer = null; } }
        await pause(1500);
        const s = await snap('sidebar-saved', {list, ticked});
        const sidebarField = page.locator('#appearance').locator('fieldset, .pkpFormField').filter({has: page.locator('input[name="sidebar"]')}).first();
        const fieldError = flat(await sidebarField.locator('.pkpFormFieldError, [class*="Error"]').allInnerTexts().catch(() => []).then((a) => a.join(' | ')));
        return {ticked, status: r ? r.status() : null, answer, fieldError, notices: s.notices, scriptErrors: errorsSince(e0)};
    };
    const homeBlocks = async () => {
        await page.goto(app.url(`/index.php/${app.contextPath}`));
        await idle(page);
        const blocks = await page.locator('.pkp_structure_sidebar .pkp_block').evaluateAll((bs) => bs.map((b) => ({id: b.id, text: b.innerText.replace(/\s+/g, ' ').trim().slice(0, 80)})));
        await snap('home', {blocks});
        return blocks;
    };

    try {
        if (!NEIGHBOUR && !OTHERS) {
            await signIn(page, 'rvaca', {contextPath: app.contextPath});                                   // 1
            await openPlugins();                                                                           // 2
            await snap('plugins');
            fact('step3-tick', await tickPlugin());                                                       // 3
            fact('step4-list', await openManager());                                                       // 4
            await snap('manager');
            fact('step6-control', await addBlock('Partners u09a13', 'Our partners.'));                    // 5, 6
            const add = await addBlock('News & Events u09a13', "What's on.");                             // 7, 8
            await snap('saved', {add});
            fact('step8-saved', add);
            const name = (add.rows.find((x) => /events/.test(x.name)) || {}).name;
            fact('stored-blocks-setting', blocksSetting());
            fact('row-html-id', await managerDialog().locator('tr.gridRow').filter({hasText: 'events'}).first().getAttribute('id'));
            fact('step9-edit', await pressEdit(name));                                                     // 9
            fact('step10-delete', await pressDelete(name));                                                // 10
            fact('step11-edit-control', await pressEdit('partners-u09a13'));                              // 11
            await closeManager();                                                                          // 12
            fact('step12-sidebar', await placeInSidebar([name]));
            fact('home-blocks-after', await homeBlocks());
            fact('script-errors-all', scriptErrors);
            await signOut(page);
        } else if (OTHERS) {
            await signIn(page, 'rvaca', {contextPath: app.contextPath});
            await openPlugins();
            fact('ot-tick', await tickPlugin());
            await openManager();
            const a = await addBlock('3.5 News u09a13', 'Release notes.');
            const b = await addBlock("Editor's Picks u09a13", 'Picks.');
            const dName = (a.rows.find((x) => /news/.test(x.name)) || {}).name;
            const qName = (b.rows.find((x) => /picks/.test(x.name)) || {}).name;
            fact('ot-rows', b.rows);
            fact('ot-script-errors-on-save', {dot: a.scriptErrors, quote: b.scriptErrors});
            fact('ot-edit-dot', await pressEdit(dName));
            fact('ot-delete-dot', await pressDelete(dName));
            fact('ot-edit-quote', await pressEdit(qName));
            fact('ot-delete-quote', await pressDelete(qName));
            await closeManager();
            fact('ot-sidebar-dot', await placeInSidebar([dName]));
            fact('ot-sidebar-quote', await placeInSidebar([qName]));
            // the report's clean-up for a stuck block, applied to both
            const blocks = JSON.parse(blocksSetting() || '[]');
            const keep = blocks.filter((x) => x !== dName && x !== qName);
            const q = (v) => v.replace(/'/g, "''");
            sql(app, `UPDATE plugin_settings SET setting_value = '${q(JSON.stringify(keep))}' WHERE plugin_name = 'customblockmanagerplugin' AND setting_name = 'blocks' AND context_id = ${ctxId}`);
            for (const nm of [dName, qName]) sql(app, `DELETE FROM plugin_settings WHERE plugin_name = '${q(nm)}' AND context_id = ${ctxId}`);
            fact('ot-cleanup-blocks-setting', blocksSetting());
            await signIn(page, 'admin');
            await page.goto(app.url('/index.php/index/en/admin'));
            await idle(page);
            const clear = page.getByRole('button', {name: 'Delete Data Caches', exact: true}).first();
            await loc(page, 'Administration: Delete Data Caches', clear);
            await clear.click();
            await idle(page);
            await snap('admin-caches-deleted');
            await signIn(page, 'rvaca', {contextPath: app.contextPath});
            await openPlugins();
            fact('ot-rows-after-cleanup', await openManager());
            await closeManager();
            const sb = await (async () => {
                await page.goto(websiteURL); await idle(page);
                await page.locator('#appearance-button').first().click(); await idle(page);
                await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click();
                await idle(page); await pause(800);
                return page.locator('input[name="sidebar"]').evaluateAll((els) => els.map((e) => e.value));
            })();
            fact('ot-sidebar-list-after-cleanup', sb);
            fact('ot-script-errors-all', scriptErrors);
            await signOut(page);
        } else {
            await signIn(page, 'rvaca', {contextPath: app.contextPath});
            await openPlugins();
            fact('nb-tick', await tickPlugin());
            await openManager();
            const a = await addBlock('Partners u09a13', 'Our partners.');
            const b = await addBlock('Événements à venir u09a13', 'À venir.');
            const c = await addBlock('& & &', 'Symbols only.');
            const pName = (a.rows.find((x) => /partners/i.test(x.name)) || {}).name;
            const eName = (b.rows.find((x) => /venir/i.test(x.name)) || {}).name;
            fact('nb-rows', b.rows);
            fact('nb-stored-blocks-setting', blocksSetting());
            fact('nb-edit-partners', await pressEdit(pName));
            fact('nb-edit-evenements', await pressEdit(eName));
            const known = new Set([pName, eName]);
            const sName = (c.rows.find((x) => !known.has(x.name)) || {}).name;
            fact('nb-symbols-block', {name: sName, rows: c.rows.length, scriptErrors: c.scriptErrors});
            fact('nb-edit-symbols', await pressEdit(sName));
            await closeManager();
            fact('nb-sidebar', await placeInSidebar([pName, eName]));
            fact('nb-home-blocks', await homeBlocks());
            fact('nb-script-errors-all', scriptErrors);
            await signOut(page);
        }
    } finally {
        record(`facts${SUF}`, facts);
        await close();
    }
});
