// Issue report docs/issues/U59-A4-wizard-saves-fail-after-path-change.md (U59 A4):
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets").
//   (default)  as `admin`, Hosted Journals › the dataset journal's "Settings wizard"; on the
//              "Journal" tab a new "Path", "Save"; then a new "Journal title" and "Save", "Search
//              Indexing" and "Appearance" saves, the French "Forms" box of "Languages", the
//              "Developed By" block's "Enabled" box, "Users" › "Add User"; then a reload and the
//              same actions again (those that did not take the first time).
//   neighbour  (the fix's): on the wizard, a "Journal title" save and a "Search Indexing" save with
//              "Path" left alone (no reload, "Saved"); then Hosted Journals › "Edit" with a new
//              "Path" (the window closes, the page is not reloaded).
//              Nothing is built by the kit in either mode.
//
// Reset first:  npm run fleet-prep -- --feature issues-u59f --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u59f PROBE_AGENT=u59f node bin/probe.js all shared/playwright/checks/issues/wizard-saves-fail-after-path-change/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u59f-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u59f-3_5 PROBE_AGENT=u59f node bin/probe.js all shared/playwright/checks/issues/wizard-saves-fail-after-path-change/walk.js
// Facts: .reports/<feature>/u59f/a4-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql, serverLog} = require('../../../probe');
const L = require('./lib');

const MODE = process.argv[2] || 'steps';

forEachApp(async (app) => {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const W = L.WORDS[app.name];
    const fact = (k, v) => {
        record('a4-facts', {[k]: v}, {merge: true});
        console.log('[a4]', app.name, k, JSON.stringify(v).slice(0, 1200));
    };
    const snap = async (page, name) => {
        const s = await screen(page).catch(() => null);
        if (s) record(name, s);
        await shot(page, name).catch(() => {});
        return s ? s.notices : [];
    };
    const {table, id: idCol, settings} = app.contextTables;
    const ctxId = sql(app, `SELECT ${idCol} FROM ${table} WHERE path = '${app.contextPath}'`).split('\n')[0];
    const stored = () => ({
        path: sql(app, `SELECT path FROM ${table} WHERE ${idCol} = ${ctxId}`),
        name: sql(app, `SELECT setting_value FROM ${settings} WHERE ${idCol} = ${ctxId} AND setting_name = 'name' AND locale = 'en'`),
        searchDescription: sql(app, `SELECT setting_value FROM ${settings} WHERE ${idCol} = ${ctxId} AND setting_name = 'searchDescription' AND locale = 'en'`).slice(0, 40),
        formLocales: sql(app, `SELECT setting_value FROM ${settings} WHERE ${idCol} = ${ctxId} AND setting_name = 'supportedFormLocales'`),
        developedBy: sql(app, `SELECT setting_value FROM plugin_settings WHERE plugin_name = 'developedbyblockplugin' AND setting_name = 'enabled' AND context_id = ${ctxId}`),
    });
    const log = serverLog(app);
    const from = log.mark();
    const {page} = await launch(app);
    const w = L.watch(page, app.baseURL);
    const hosted = new HostedJournalsPage(page, W);
    const oldName = stored().name;
    const newName = `${oldName} Renamed`;
    const newPath = `${app.contextPath}2`;

    // 1–2: sign in as admin, Hosted Journals, the row's "Settings wizard".
    await signIn(page, 'admin');
    await hosted.goto();
    await hosted.openWizard(app.contextPath, W.wizard);
    await idle(page);
    fact('step2-wizard', {url: page.url().replace(app.baseURL, ''), stored: stored()});

    if (MODE === 'neighbour') {
        // The wizard with "Path" left alone: a title save and a "Search Indexing" save.
        let form = await L.openForm(page, 'context');
        await form.locator('[id="context-name-control-en"]').fill(newName);
        const title = await L.saveForm(page, form, w);
        fact('nb-title-save', {...title, notices: await snap(page, 'a4-nb-title'), stored: stored()});
        form = await L.openForm(page, 'indexing');
        await form.locator('[id*="searchDescription-control"]').first().fill('u59f description');
        const indexing = await L.saveForm(page, form, w);
        fact('nb-indexing-save', {...indexing, notices: await snap(page, 'a4-nb-indexing'), stored: stored()});
        // Hosted Journals › "Edit": a new "Path", "Save"; the window closes, the page stays.
        await hosted.goto();
        const loads = w.loads();
        const win = await hosted.openEdit(app.contextPath);
        await win.type(win.path, newPath);
        const res = await win.pressSave().catch((e) => ({status: () => `no answer: ${L.flat(e.message, 120)}`}));
        const closed = await win.root
            .waitFor({state: 'detached', timeout: 10_000})
            .then(() => true)
            .catch(() => false);
        await page.waitForTimeout(1_500);
        fact('nb-edit-window', {status: res.status(), windowClosed: closed, pageReloaded: w.loads() > loads, url: page.url().replace(app.baseURL, ''), stored: stored()});
        await snap(page, 'a4-nb-edit');
        fact('server-log', log.since(from));
        return;
    }

    // 3: "Journal" tab, a new "Path", "Save".
    let form = await L.openForm(page, 'context');
    await form.locator('#context-urlPath-control').fill(newPath);
    const pathSave = await L.saveForm(page, form, w);
    if (pathSave.reloaded) await idle(page).catch(() => {});
    fact('step3-path-save', {...pathSave, url: page.url().replace(app.baseURL, ''), notices: await snap(page, 'a4-step3'), stored: stored()});

    // 4: once "Saved" has gone, a new "Journal title", "Save".
    const titleSave = async (label) => {
        form = await L.openForm(page, 'context');
        await L.statusGone(page, form);
        const shown = await form.locator('[id="context-name-control-en"]').inputValue();
        await form.locator('[id="context-name-control-en"]').fill(newName);
        const r = await L.saveForm(page, form, w);
        fact(`${label}-title-save`, {titleShownBefore: shown, pathShown: await form.locator('#context-urlPath-control').inputValue(), ...r, notices: await snap(page, `a4-${label}-title`), stored: stored()});
    };
    await titleSave('step4');

    // 5: "Search Indexing", a description, "Save".
    try {
        form = await L.openForm(page, 'indexing');
        await form.locator('[id*="searchDescription-control"]').first().fill('u59f description');
        const r = await L.saveForm(page, form, w);
        fact('step5-indexing-save', {...r, notices: await snap(page, 'a4-step5'), stored: stored()});
    } catch (e) {
        fact('step5-indexing-save', {error: L.flat(e.message, 200)});
    }

    // 6: "Appearance", "Save".
    try {
        form = await L.openForm(page, 'appearance');
        const r = await L.saveForm(page, form, w);
        fact('step6-appearance-save', {...r, notices: await snap(page, 'a4-step6')});
    } catch (e) {
        fact('step6-appearance-save', {error: L.flat(e.message, 200)});
    }

    // 7–9: the lists.
    const lists = async (label, want) => {
        if (want.language) {
            try {
                await page.locator('#setup-button').first().click();
                await page.locator('#languages-button').first().click();
                await idle(page);
                const {box, heads, row} = await L.gridBox(page, '#languageGridContainer', /Fran|French/, 'Forms');
                const r = await L.pressBox(page, box, w, idle);
                const again = await L.gridBox(page, '#languageGridContainer', /Fran|French/, 'Forms');
                fact(`${label}-language-box`, {heads, row, ...r, after: await again.box.isChecked().catch(() => null), notices: await snap(page, `a4-${label}-language`), stored: stored().formLocales});
            } catch (e) {
                fact(`${label}-language-box`, {error: L.flat(e.message, 200)});
            }
        }
        if (want.plugin) {
            try {
                await page.locator('#plugins-button').first().click();
                await page.locator('#installed-button').first().click().catch(() => {});
                await idle(page);
                const {box, heads, row} = await L.gridBox(page, '#pluginGridContainer', /Developed By/, 'Enabled');
                const r = await L.pressBox(page, box, w, idle);
                const again = await L.gridBox(page, '#pluginGridContainer', /Developed By/, 'Enabled');
                fact(`${label}-plugin-box`, {heads, row, ...r, after: await again.box.isChecked().catch(() => null), notices: await snap(page, `a4-${label}-plugin`), stored: stored().developedBy});
            } catch (e) {
                fact(`${label}-plugin-box`, {error: L.flat(e.message, 200)});
            }
        }
        if (want.addUser) {
            const r = await L.pressAddUser(page, w, idle);
            fact(`${label}-add-user`, {...r, notices: await snap(page, `a4-${label}-add-user`)});
            return r;
        }
        return null;
    };
    const first = await lists('step7-9', {language: true, plugin: true, addUser: true});

    // 10: reload; the title read; then whatever did not take is done again.
    await page.reload();
    await idle(page);
    const s = stored();
    fact('step10-reload', {url: page.url().replace(app.baseURL, ''), stored: s});
    if (s.name !== newName) await titleSave('step10');
    await lists('step10', {
        language: /fr_CA/.test(s.formLocales),
        plugin: s.developedBy !== '1',
        addUser: !(first && first.hasUserForm),
    });
    fact('step10-stored', stored());
    fact('server-log', log.since(from));
    await signOut(page).catch(() => {});
});
