// Issue report docs/issues/U09-A20-first-language-content-box-stuck-loading.md (U09 A20):
// the report's Steps to reproduce, walked through the screens on PKP's default
// test dataset (a dataset fleet, harness.md "Dataset fleets"). The kit builds
// nothing; the console snippet of the report is pasted with page.evaluate().
//   held-block   steps 1–6: "Custom Block Manager" on, snippet, "Add Block", English "Content"
//   held-item    steps 7–11: snippet again, "Setup" › "Navigation" › "Add item" › "Custom Page", English "Content"
//   plain-block, plain-item: the control, the same windows without the snippet, plus the
//                neighbour: the language indicator beside "Content" after typing English only
//
// Reset first:  npm run fleet-prep -- --feature issues-ir7 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir7 PROBE_AGENT=ir7 node bin/probe.js all shared/playwright/checks/issues/first-language-content-box-stuck-loading/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir7-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir7-3_5 PROBE_AGENT=ir7 node bin/probe.js all shared/playwright/checks/issues/first-language-content-box-stuck-loading/walk.js
// Facts: .reports/<feature>/ir7/walk-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib');
const S = require('../setup-save-refused-disabled-block/lib');

forEachApp(async (app) => {
    const {BlockManager} = require('../../../pages/CustomContentPages.js');
    const {NavigationTab} = require('../../../pages/NavigationChromePages.js');
    const fact = (k, v) => { record('walk-facts', {[k]: v}, {merge: true}); console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 700)); };
    const snap = async (page, name) => { record(name, await screen(page)); await shot(page, name).catch(() => {}); };
    const {page} = await launch(app);
    const errs = L.scriptErrors(page);

    /** One window: wait for the French box, read the English box, click and type, read again. */
    async function readWindow(name, form, enName, frName, leave) {
        const enId = await form.locator(`textarea[name="${enName}"]`).first().getAttribute('id');
        const frId = await form.locator(`textarea[name="${frName}"]`).first().getAttribute('id');
        const frenchLoaded = await L.waitFrench(page, frId);
        const before = await L.boxState(page, enId);
        await snap(page, name);
        const typed = await L.clickAndType(page, enId, 'Welcome');
        const ind = typed.clicked ? await L.indicator(page, enId, leave) : null;
        await L.sleep(10_000);
        const after10s = await L.boxState(page, enId);
        await snap(page, `${name}-after`);
        fact(name, {enId, frId, frenchLoaded, before, typed, indicatorAfterLeaving: ind, after10s, scriptErrors: errs.splice(0)});
    }

    async function blockWindow(name, hold) {
        await S.openPlugins(app, page);
        if (hold) await L.pasteHold(page);
        await S.openManager(page);
        const win = await new BlockManager(page).addBlock();
        await readWindow(name, win.form, 'blockContent[en]', 'blockContent[fr_CA]', () => win.heading.click());
    }

    async function itemWindow(name, hold) {
        await page.goto('about:blank');
        await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/website#setup/navigationMenus`));
        const nav = new NavigationTab(page, app.contextPath);
        await nav.itemsTable.waitFor({timeout: 30_000});
        await idle(page);
        if (hold) await L.pasteHold(page);
        const win = await nav.addItem();
        await win.chooseType('Custom Page');
        await readWindow(name, win.form, 'content[en]', 'content[fr_CA]', () => win.pathInput.click());
    }

    await signIn(page, 'dbarnes');                                                         // 1
    await S.openPlugins(app, page);                                                        // 2
    fact('enable-cbm', await S.setPluginEnabled(page, 'customblockmanagerplugin', true));
    await blockWindow('held-block', true);                                                 // 3–6
    await itemWindow('held-item', true);                                                   // 7–11
    await blockWindow('plain-block', false);                                               // control
    await itemWindow('plain-item', false);
});
