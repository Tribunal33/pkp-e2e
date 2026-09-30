// Issue report walk: docs/issues/U09-A14-custom-block-delete-fails-postgresql.md
// (spec U09 register A14). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
// the journal manager `rvaca` ticks "Custom Block Manager" on Settings ›
// Website › "Plugins", adds the block "Partners u09a14" in "Manage Custom
// Blocks" and deletes it ("Delete", "OK"), then reopens the list after a
// reload. Step numbers are the report's. (The site's blocks are not walked:
// the default dataset hosts one journal, and Administration › "Site
// Settings" offers "Plugins" only on a site with more than one.) The kit builds nothing. Records every screen with screen(), the
// delete request's status and answer, the "Delete" window after "OK", the
// fleet's server log lines, and (for Evidence only) the block's rows in
// plugin_settings read with sql().
//
// `neighbour` as the script's argument walks the neighbour check for the fix
// instead: the journal gets two blocks ("Partners u09a14", "Links u09a14");
// deleting "Partners u09a14" must leave "Links u09a14" listed with its stored
// settings, "Custom Block Manager" ticked, and every other plugin's stored
// settings (the site's included) as they were.
//
// Run (main, then stable-3_5_0); reset the fleet first, the walk changes the
// dataset:
//   npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
//   PROBE_FEATURE=issues-ir1 PROBE_AGENT=u09a14 node bin/probe.js all shared/playwright/checks/issues/custom-block-delete-fails-postgresql/walk.js [neighbour]
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u09a14 node bin/probe.js all shared/playwright/checks/issues/custom-block-delete-fails-postgresql/walk.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, loc, sql} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEIGHBOUR = process.argv.includes('neighbour');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const facts = {line: app.line || 'main', part: NEIGHBOUR ? 'neighbour' : 'steps'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const logFile = path.join(__dirname, '../../../../../apps', app.name, 'playwright/.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /\b(500|Fatal|Uncaught|Error|SQLSTATE)\b/.test(l)).map((l) => l.slice(0, 500)).slice(0, 6);
        } catch { return []; }
    };
    const blockRows = (contextId, name) => sql(app, `SELECT COALESCE(context_id::text,'null'), setting_name, left(setting_value, 60) FROM plugin_settings WHERE plugin_name = '${name}' AND COALESCE(context_id,0) = ${contextId} ORDER BY setting_name`).split('\n').filter(Boolean);
    const blocksSetting = (contextId) => sql(app, `SELECT setting_value FROM plugin_settings WHERE plugin_name = 'customblockmanagerplugin' AND setting_name = 'blocks' AND COALESCE(context_id,0) = ${contextId}`);
    const ctxId = Number(sql(app, `SELECT ${app.contextTables.id} FROM ${app.contextTables.table} WHERE path = '${app.contextPath}'`));

    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}${NEIGHBOUR ? '-nb' : ''}`, {...s, ...extra}); return s; };

    // ---- Settings › Website › "Plugins" (the journal) or Administration › "Site Settings" › "Plugins" (the site)
    const openPlugins = async (where) => {
        await page.goto(app.url(where === 'site' ? '/index.php/index/en/admin/settings' : `/index.php/${app.contextPath}/en/management/settings/website`));
        await idle(page);
        await page.locator('#plugins-button').first().click();
        await idle(page);
        await pluginRow().waitFor({timeout: T});
        await pause(500);
    };
    const pluginRow = () => page.locator('tr.gridRow[id$="-row-customblockmanagerplugin"]').first();
    const rowControls = async (row) => {
        const id = await row.getAttribute('id', {timeout: T});
        const opener = row.locator('a.show_extras');
        if (await opener.count()) { await opener.first().click(); await pause(400); }
        return page.locator(`[id="${id}-control-row"]`);
    };
    const tickPlugin = async () => {
        const box = pluginRow().getByRole('checkbox').first();
        if (await box.isChecked()) return {already: true};
        const w = page.waitForResponse((r) => /plugin-grid\/enable/.test(r.url()), {timeout: T}).catch(() => null);
        await box.click();
        const r = await w;
        await pause(800); await idle(page);
        const notices = (await screen(page)).notices;
        return {status: r ? r.status() : null, checked: await box.isChecked(), notices};
    };
    const managerDialog = () => page.locator('[role="dialog"]:visible').filter({has: page.locator('[id*="customblockgrid"], [id*="customBlockGrid"], table[id*="customblock"]')}).first();
    const managerRows = async () => {
        const d = managerDialog();
        await d.locator('.pkp_controllers_grid').first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await pause(300);
        return d.locator('tr.gridRow').evaluateAll((trs) => trs.map((tr) => {
            const td = tr.querySelector('td');
            const c = td ? td.cloneNode(true) : null;
            if (c) c.querySelectorAll('a.show_extras, a.hide_extras, script').forEach((a) => a.remove());
            return {id: tr.id, name: c ? c.textContent.replace(/\s+/g, ' ').trim() : null};
        }));
    };
    const openManager = async () => {
        const ctl = await rowControls(pluginRow());
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
        // close the other languages' popover over the window's foot
        await page.locator('[role="dialog"]:visible').filter({has: page.locator('form#customBlockForm')}).last().locator('h1, h2').first().click().catch(() => {});
        await pause(400);
        const w = page.waitForResponse((r) => /update-?custom-?block/i.test(r.url()), {timeout: T}).catch(() => null);
        await blockForm().locator('button[id^="submitFormButton"], button[type=submit]').first().click();
        const r = await w;
        await pause(1200); await idle(page);
        return {status: r ? r.status() : null, rows: await managerRows()};
    };
    const deleteBlock = async (rowName, stepName) => {
        const row = managerDialog().locator('tr.gridRow').filter({hasText: rowName}).first();
        const ctl = await rowControls(row);
        await ctl.getByRole('link', {name: 'Delete', exact: true}).first().click();
        await pause(700);
        const conf = page.locator('[role="dialog"]:visible').last();
        const ask = flat(await conf.innerText().catch(() => ''));
        await snap(`${stepName}-delete-asks`, {ask});
        await loc(page, '"Delete" window: OK', conf.getByRole('button', {name: 'OK', exact: true}));
        const from = logSize();
        const w = page.waitForResponse((r) => /delete-?custom-?block/i.test(r.url()), {timeout: T}).catch(() => null);
        await conf.getByRole('button', {name: 'OK', exact: true}).first().click();
        const r = await w;
        let answer = null;
        if (r) { try { answer = flat(await r.text(), 400); } catch { answer = null; } }
        await pause(2500); await idle(page).catch(() => {});
        const top = page.locator('[role="dialog"]:visible').last();
        const after = {
            request: r ? {method: r.request().method(), url: r.url().replace(app.baseURL, '').replace(/csrfToken=[^&]+/, 'csrfToken=…'), status: r.status()} : null,
            answer,
            deleteWindowOpen: /Are you sure you wish to delete/.test(await top.innerText().catch(() => '')),
            spinner: await top.locator('.pkp_spinner:visible, [class*="spinner"]:visible, [class*="Spinner"]:visible').count().catch(() => null),
            buttonsInWindow: await top.locator('button').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => ({text: e.innerText.trim(), disabled: e.disabled, aria: e.getAttribute('aria-label')}))).catch(() => []),
        };
        await pause(400);
        after.log = logSince(from);
        const s = await snap(`${stepName}-after-ok`, {after});
        after.notices = s.notices;
        return {ask, ...after};
    };
    const reopenList = async (where, stepName) => {
        await openPlugins(where);
        const rows = await openManager();
        await snap(stepName, {rows});
        return rows;
    };

    try {
        if (!NEIGHBOUR) {
            // ------------------------------------------------ the journal's blocks, steps 1-10
            await signIn(page, 'rvaca', {contextPath: app.contextPath});                                   // 1
            await openPlugins('journal');                                                                  // 2
            await snap('02-plugins');
            fact('step3-tick', await tickPlugin());                                                       // 3
            fact('step4-list', await openManager());                                                       // 4
            await snap('04-manager');
            const add = await addBlock('Partners u09a14', 'Our partners.');                                // 5, 6
            await snap('06-saved', {add});
            fact('step6-saved', add);
            const jName = (add.rows.find((x) => /u09a14/.test(x.name)) || {}).name;
            fact('journal-block-rows-before', blockRows(ctxId, jName));
            fact('step7-8-delete', await deleteBlock(jName, '07-journal'));                                // 7, 8
            fact('step9-list-after-reload', await reopenList('journal', '09-journal-reopened'));           // 9
            fact('journal-block-rows-after', blockRows(ctxId, jName));
            fact('journal-blocks-setting-after', blocksSetting(ctxId));
            await signOut(page);                                                                           // 10

        } else {
            // ------------------------------------------------ neighbour: the other block, the plugin and the other plugins' settings stay
            const others = () => sql(app, `SELECT COALESCE(context_id::text,'null'), plugin_name, setting_name, md5(COALESCE(setting_value,'')) FROM plugin_settings WHERE plugin_name NOT IN ('partners-u09a14', 'links-u09a14', 'customblockmanagerplugin') ORDER BY 1, 2, 3`);
            await signIn(page, 'rvaca', {contextPath: app.contextPath});
            await openPlugins('journal');
            fact('nb-tick', await tickPlugin());
            await openManager();
            const a = await addBlock('Partners u09a14', 'Our partners.');
            const b = await addBlock('Links u09a14', 'Useful links.');
            const jName = (a.rows.find((x) => /partners/i.test(x.name)) || {}).name;
            const lName = (b.rows.find((x) => /links/i.test(x.name)) || {}).name;
            fact('nb-rows-before', b.rows);
            const linksBefore = blockRows(ctxId, lName);
            const othersBefore = others();
            fact('nb-delete', await deleteBlock(jName, 'nb-journal'));
            const rows = await reopenList('journal', 'nb-journal-reopened');
            fact('nb-rows-after', rows);
            fact('nb-plugin-still-ticked', await pluginRow().locator('input[type=checkbox]').first().isChecked());
            fact('nb-deleted-block-rows-after', blockRows(ctxId, jName));
            fact('nb-blocks-setting-after', blocksSetting(ctxId));
            const linksAfter = blockRows(ctxId, lName);
            fact('nb-links-rows-unchanged', {same: JSON.stringify(linksAfter) === JSON.stringify(linksBefore), after: linksAfter});
            const othersAfter = others();
            fact('nb-other-plugins-settings-unchanged', {same: othersAfter === othersBefore, rows: othersAfter.split('\n').length});
            await signOut(page);
        }
    } finally {
        record(`facts${NEIGHBOUR ? '-nb' : ''}`, facts);
        await close();
    }
});
