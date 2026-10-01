// Issue report walk: docs/issues/U09-A4-custom-block-blank-row-other-language.md
// (spec U09 register A4). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
// the manager `rvaca` switches the interface to French with the user menu's
// "Changer la langue", ticks "Custom Block Manager" on Settings › Website ›
// "Plugins", adds a block in "Manage Custom Blocks" with only the English
// (primary language) "Block Name" box filled, reads the list row (text,
// arrow, "Edit"/"Delete"), reads "Sidebar" on "Appearance" › "Setup", ticks
// the new entry and saves, reads the home page, then switches back to English
// and reads the list again. Step numbers are the report's. The kit builds
// nothing. Records every screen with screen(), the list rows, the "Sidebar"
// entries, the save's answer and field errors, and (for Evidence only) the
// stored block names read with sql().
//
// `neighbour` as the argument walks the fix's neighbour check instead: in
// French, a block with both "Block Name" boxes filled ("Our Partners u09a4nb"
// / "Nos partenaires u09a4nb"); then in English, a block with the English box
// only ("English Block u09a4nb"). Each block's name, its row's "Edit" and
// "Delete", and placing both under "Sidebar" are recorded. Walked with the
// fix in and out, all of it must read the same.
//
// `others` adds no step to the report's Steps: after steps 1 to 5 it ticks
// another, unticked "Sidebar" entry and saves (the blank entry left unticked),
// then the blank one, and then applies the database clean-up for a blank
// block (its empty id out of the manager's `blocks` list, its own settings
// deleted, `admin`'s "Delete Data Caches") and reads the list and "Sidebar".
//
// Run (main, then stable-3_5_0); reset the fleet first, the walk changes the
// dataset:
//   npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
//   PROBE_FEATURE=issues-ir2 PROBE_AGENT=u09a4 node bin/probe.js all shared/playwright/checks/issues/custom-block-blank-row-other-language/walk.js [neighbour]
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=u09a4 node bin/probe.js all shared/playwright/checks/issues/custom-block-blank-row-other-language/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, idle, loc, sql} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEIGHBOUR = process.argv.includes('neighbour');
const OTHERS = process.argv.includes('others');
const SUF = NEIGHBOUR ? '-nb' : OTHERS ? '-ot' : '';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const facts = {line: app.line || 'main', part: NEIGHBOUR ? 'neighbour' : OTHERS ? 'others' : 'steps'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const ctxId = Number(sql(app, `SELECT ${app.contextTables.id} FROM ${app.contextTables.table} WHERE path = '${app.contextPath}'`));
    const blocksSetting = () => sql(app, `SELECT setting_value FROM plugin_settings WHERE plugin_name = 'customblockmanagerplugin' AND setting_name = 'blocks' AND COALESCE(context_id,0) = ${ctxId}`);
    const blankRows = () => sql(app, `SELECT setting_name || '=' || setting_value FROM plugin_settings WHERE plugin_name = '' AND COALESCE(context_id,0) = ${ctxId} ORDER BY 1`);

    const {page, close} = await launch(app);
    const scriptErrors = [];
    page.on('pageerror', (e) => scriptErrors.push({kind: 'pageerror', text: flat(e.message, 400)}));
    page.on('console', (m) => { if (m.type() === 'error') scriptErrors.push({kind: 'console', text: flat(m.text(), 400)}); });

    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}${SUF}`, {...s, ...extra}); return s; };
    let lang = 'en';
    const websiteURL = () => app.url(`/index.php/${app.contextPath}/${lang}/management/settings/website`);

    // the user menu (initials, top right) › "Change Language" › the language
    const switchLanguage = async (to) => {
        const btn = page.locator('header [data-cy="app-user-nav"] button, [data-cy="app-user-nav"] button').first();
        await loc(page, 'user menu: the initials button', btn);
        await btn.click();
        const menu = page.locator('[data-cy="app-user-nav"] nav').first();
        await menu.waitFor({timeout: T});
        const items = await menu.locator('a, div.text-base-bold').evaluateAll((es) => es.map((e) => ({text: e.textContent.replace(/\s+/g, ' ').trim(), href: e.getAttribute('href')})));
        const link = menu.locator('a').filter({hasText: to === 'fr_CA' ? /^\s*fran/i : /^\s*English\s*$/}).first();
        await loc(page, `user menu: the ${to} link`, link);
        await Promise.all([page.waitForLoadState('load'), link.click()]);
        await page.waitForURL(new RegExp(`/${to}/`), {timeout: T}).catch(() => {});
        await idle(page);
        lang = to;
        return {menu: items, landed: page.url().replace(app.baseURL, '')};
    };

    const pluginRow = () => page.locator('tr.gridRow[id$="-row-customblockmanagerplugin"]').first();
    const openPlugins = async () => {
        await page.goto(websiteURL());
        await idle(page);
        await page.locator('#plugins-button').first().click();
        await idle(page);
        await pluginRow().waitFor({timeout: T});
        await pause(500);
    };
    const openControls = async (row) => {
        const id = await row.getAttribute('id', {timeout: T});
        const opener = row.locator('a.show_extras');
        const hasArrow = (await opener.count()) > 0;
        if (hasArrow) { await opener.first().click(); await pause(400); }
        return {id, hasArrow, ctl: page.locator(`[id="${id}-control-row"]`)};
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
            const ctl = document.getElementById(`${tr.id}-control-row`);
            return {
                rowId: tr.id,
                name: tr.id.replace(/^.*-row-/, ''),
                shown: c ? c.textContent.replace(/\s+/g, ' ').trim() : null,
                arrow: !!tr.querySelector('a.show_extras'),
                controls: ctl ? [...ctl.querySelectorAll('a')].map((a) => a.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean) : [],
            };
        }));
    };
    const openManager = async () => {
        const {ctl} = await openControls(pluginRow());
        const manage = ctl.getByRole('link', {name: /^(Manage Custom Blocks|Gérer les blocs personnalisés)$/}).first();
        await loc(page, 'Plugins: "Manage Custom Blocks" on the Custom Block Manager row', manage);
        await manage.click();
        await managerDialog().waitFor({timeout: T});
        return managerRows();
    };
    const blockForm = () => page.locator('form#customBlockForm:visible').first();
    const blockDialog = () => page.locator('[role="dialog"]:visible').filter({has: page.locator('form#customBlockForm')}).last();
    const saveBlockForm = async () => {
        const w = page.waitForResponse((r) => /update-?custom-?block/i.test(r.url()), {timeout: T}).catch(() => null);
        const save = blockForm().locator('button[id^="submitFormButton"], button[type=submit]').first();
        await loc(page, 'block window: Save', save);
        await save.click();
        const r = await w;
        await pause(1500); await idle(page);
        return {status: r ? r.status() : null, formStillOpen: await blockForm().count() > 0, rows: await managerRows()};
    };
    // "Add Block": the "Block Name" box shown is the primary language's (English);
    // the French one sits in the pop-over under it
    const addBlock = async ({en, fr, content}) => {
        await managerDialog().getByRole('link', {name: /^(Add Block|Ajouter un bloc)$/}).first().click();
        await blockForm().waitFor({timeout: T});
        await idle(page);
        const ta = blockForm().locator('textarea[name="blockContent[en]"]').first();
        const taId = await ta.getAttribute('id');
        await page.waitForFunction((x) => window.tinymce && window.tinymce.get(x) && window.tinymce.get(x).initialized, taId, {timeout: T}).catch(() => {});
        await pause(400);
        const shownBox = blockForm().locator('input.localizable[name^="blockTitle["]').first();
        const shownName = await shownBox.getAttribute('name');
        const shownPlaceholder = await shownBox.getAttribute('placeholder');
        await loc(page, 'block window: the "Block Name" box shown', shownBox);
        await shownBox.fill(en);
        if (fr) {
            await shownBox.click();
            const frBox = blockForm().locator('input[name="blockTitle[fr_CA]"]').first();
            await frBox.waitFor({state: 'visible', timeout: T});
            await loc(page, 'block window: the French "Block Name" box (pop-over)', frBox);
            await frBox.fill(fr);
        }
        const body = page.locator(`[id="${taId}_ifr"]`).contentFrame().locator('body');
        await body.click();
        await page.keyboard.type(content);
        await blockDialog().locator('h1, h2').first().click().catch(() => {});
        await pause(400);
        const s = await snap('block-form-filled');
        const res = await saveBlockForm();
        return {shownBox: {name: shownName, placeholder: shownPlaceholder}, formDialog: flat(s.text && s.text.dialog, 400), ...res};
    };
    const tryEditDelete = async (name) => {
        const row = managerDialog().locator(`tr.gridRow[id$="-row-${name}"]`).first();
        const {hasArrow, ctl} = await openControls(row);
        if (!hasArrow) return {hasArrow};
        const edit = ctl.getByRole('link', {name: /^(Edit|Modifier)$/}).first();
        await edit.click();
        await blockForm().waitFor({timeout: T}).catch(() => {});
        await idle(page); await pause(600);
        const title = {en: await blockForm().locator('input[name="blockTitle[en]"]').first().inputValue().catch(() => null), fr_CA: await blockForm().locator('input[name="blockTitle[fr_CA]"]').first().inputValue().catch(() => null)};
        const cancel = blockDialog().getByRole('link', {name: /^(Cancel|Annuler)$/}).or(blockDialog().getByRole('button', {name: /^(Cancel|Annuler)$/})).first();
        await cancel.click().catch(() => {});
        await blockForm().waitFor({state: 'detached', timeout: T}).catch(() => {});
        await pause(1200);
        const r2 = await openControls(managerDialog().locator(`tr.gridRow[id$="-row-${name}"]`).first());
        await r2.ctl.getByRole('link', {name: /^(Delete|Supprimer)$/}).first().click();
        await pause(1500);
        const top = page.locator('[role="dialog"]:visible').last();
        const text = flat(await top.innerText().catch(() => ''), 200);
        const asks = /Are you sure|Êtes-vous sûr|supprimer/i.test(text);
        if (asks) { await top.getByRole('button', {name: /^(Cancel|Annuler)$/}).first().click().catch(() => {}); await pause(1200); }
        return {hasArrow, editOpensWith: title, deleteAsks: asks, deleteDialog: text};
    };
    const closeManager = async () => {
        const x = managerDialog().getByRole('button', {name: /close|fermer/i}).first();
        if (await x.count()) await x.click().catch(() => {});
        await pause(1200);
    };
    // Appearance › Setup: the "Sidebar" entries
    const openSetup = async () => {
        await page.goto(websiteURL());
        await idle(page);
        await page.locator('#appearance-button').first().click();
        await idle(page);
        const tabs = page.locator('#appearance').getByRole('tab');
        for (let i = 0; i < await tabs.count(); i++) {
            await tabs.nth(i).click();
            await idle(page); await pause(500);
            if (await page.locator('input[name="sidebar"]').first().isVisible().catch(() => false)) { facts.setupTab = flat(await tabs.nth(i).innerText()); break; }
        }
        return page.locator('input[name="sidebar"]').evaluateAll((els) => els.map((e) => ({value: e.value, label: (e.closest('label') || e.parentElement).innerText.split('\n')[0], checked: e.checked})));
    };
    const tickAndSave = async (values) => {
        for (const v of values) await page.locator(`input[name="sidebar"][value="${v.replace(/"/g, '\\"')}"]`).first().setChecked(true);
        const form = page.locator('form').filter({has: page.locator('input[name="sidebar"]')}).first();
        const save = form.getByRole('button', {name: /^(Save|Enregistrer)$/});
        await loc(page, 'Appearance › Setup: Save', save);
        const w = page.waitForResponse((r) => /\/api\/v1\/contexts/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await save.click();
        const r = await w;
        let body = null;
        try { body = r ? await r.json() : null; } catch (e) { body = null; }
        await pause(1500);
        const errors = await form.locator('.pkpFieldError, .pkpFormField__error, [id*="sidebar"][id*="error"]').allInnerTexts().catch(() => []);
        const s = await snap('sidebar-saved');
        return {status: r ? r.status() : null, body, fieldErrors: errors.map((e) => flat(e)), notices: s.notices};
    };
    const homeBlocks = async () => {
        await page.goto(app.url(`/index.php/${app.contextPath}`));
        await idle(page);
        const blocks = await page.locator('.pkp_structure_sidebar .pkp_block').evaluateAll((bs) => bs.map((b) => ({id: b.id, text: b.innerText.replace(/\s+/g, ' ').trim().slice(0, 80)})));
        await snap('home', {blocks});
        return blocks;
    };
    const ours = (list) => list.filter((x) => /u09a4|\(Custom Block\)|\(Plugiciel de bloc|^\s*$/.test(x.label) || /u09a4/.test(x.value) || x.value === '');

    try {
        await signIn(page, 'rvaca', {contextPath: app.contextPath});                                     // 1
        if (OTHERS) {
            // steps 1 to 5, then: does the blank entry stop "Sidebar" saves for other blocks,
            // and the database clean-up for a blank block
            await switchLanguage('fr_CA');
            await openPlugins();
            fact('ot-tick', await tickPlugin());
            await openManager();
            const add = await addBlock({en: 'Our Partners u09a4', content: 'Partner list.'});
            fact('ot-list', add.rows);
            await closeManager();
            const sb = await openSetup();
            fact('ot-sidebar-before', sb);
            const other = sb.find((x) => x.value !== '' && !x.checked);
            fact('ot-other-block', other || 'none unticked');
            if (other) {
                fact('ot-other-save', await tickAndSave([other.value]));
                fact('ot-sidebar-after-other', (await openSetup()).map((x) => ({value: x.value, checked: x.checked})));
            }
            fact('ot-blank-save', await tickAndSave(['']));
            fact('ot-sidebar-after-blank-refused-reload', (await openSetup()).map((x) => ({value: x.value, checked: x.checked})));
            const blocks = JSON.parse(blocksSetting() || '[]');
            sql(app, `UPDATE plugin_settings SET setting_value = '${JSON.stringify(blocks.filter((x) => x !== ''))}' WHERE plugin_name = 'customblockmanagerplugin' AND setting_name = 'blocks' AND context_id = ${ctxId}`);
            sql(app, `DELETE FROM plugin_settings WHERE plugin_name = '' AND context_id = ${ctxId}`);
            fact('ot-cleanup-blocks-setting', blocksSetting());
            fact('ot-cleanup-blank-settings', blankRows());
            await signIn(page, 'admin');
            await page.goto(app.url('/index.php/index/en/admin'));
            await idle(page);
            const clear = page.getByRole('button', {name: 'Delete Data Caches', exact: true}).first();
            await loc(page, 'Administration: Delete Data Caches', clear);
            await clear.click();
            await idle(page);
            await snap('admin-caches-deleted');
            await signIn(page, 'rvaca', {contextPath: app.contextPath});
            lang = 'en';
            await openPlugins();
            fact('ot-rows-after-cleanup', await openManager());
            await closeManager();
            fact('ot-sidebar-after-cleanup', (await openSetup()).map((x) => ({value: x.value, label: x.label, checked: x.checked})));
        } else if (!NEIGHBOUR) {
            fact('step2-switch', await switchLanguage('fr_CA'));                                         // 2
            await openPlugins();                                                                         // 3
            await snap('plugins-fr');
            fact('step3-tick', await tickPlugin());
            fact('step4-list', await openManager());                                                     // 4
            await snap('manager-empty');
            const add = await addBlock({en: 'Our Partners u09a4', content: 'Partner list.'});             // 5
            await snap('added', {add});
            fact('step5-save', {status: add.status, formStillOpen: add.formStillOpen, shownBox: add.shownBox});
            fact('step6-list', add.rows);                                                                // 6
            if (add.rows.length) {
                const r = managerDialog().locator('tr.gridRow').last();
                const oc = await openControls(r);
                fact('step6-last-row-controls', {arrow: oc.hasArrow, controls: await oc.ctl.locator('a').allInnerTexts().catch(() => [])});
            }
            fact('stored-blocks-setting', blocksSetting());
            fact('stored-blank-block-settings', blankRows());
            await closeManager();
            const sb = await openSetup();                                                                // 7
            await snap('setup-fr', {sb});
            fact('step7-sidebar', ours(sb));
            const target = sb.find((x) => /u09a4/.test(x.value)) || sb.find((x) => x.value === '');
            fact('step7-save', target ? await tickAndSave([target.value]) : 'no entry for the new block');
            fact('step7-home', await homeBlocks());
            await page.goto(websiteURL()); await idle(page);                                             // 8
            fact('step8-switch', await switchLanguage('en'));
            await openPlugins();
            fact('step8-list', await openManager());
            await snap('manager-en');
        } else {
            await switchLanguage('fr_CA');
            await openPlugins();
            fact('nb-tick', await tickPlugin());
            await openManager();
            const a = await addBlock({en: 'Our Partners u09a4nb', fr: 'Nos partenaires u09a4nb', content: 'Liste des partenaires.'});
            fact('nb-fr-both-list', a.rows);
            const frName = (a.rows.find((x) => /u09a4nb/.test(x.name)) || {}).name;
            fact('nb-fr-both-edit-delete', frName ? await tryEditDelete(frName) : 'no row');
            await closeManager();
            await page.goto(websiteURL()); await idle(page);
            await switchLanguage('en');
            await openPlugins();
            await openManager();
            const b = await addBlock({en: 'English Block u09a4nb', content: 'English list.'});
            fact('nb-en-only-list', b.rows);
            const enName = (b.rows.find((x) => /english-block/.test(x.name)) || {}).name;
            fact('nb-en-only-edit-delete', enName ? await tryEditDelete(enName) : 'no row');
            fact('nb-stored-blocks-setting', blocksSetting());
            await closeManager();
            const sb = await openSetup();
            fact('nb-sidebar', ours(sb));
            fact('nb-save', await tickAndSave(sb.filter((x) => /u09a4nb/.test(x.value)).map((x) => x.value)));
            fact('nb-home', await homeBlocks());
        }
        fact('script-errors', scriptErrors);
        await signOut(page);
    } finally {
        record(`facts${SUF}`, facts);
        await close();
    }
});
