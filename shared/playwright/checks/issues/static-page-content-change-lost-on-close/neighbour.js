// Neighbour checks for docs/issues/U09-A19-static-page-content-change-lost-on-close.md
// (U09 A19), walked with the fix in and out: what the fix must leave alone,
// and the same fault's reach beyond the static page window. Default dataset,
// `dbarnes`; the kit builds nothing.
//   n1.  static page window (OJS, OMP): an untouched "Add Static Page" closes without a question
//   n2.  a saved page's untouched "Edit" (its "Content" filled) closes without a question
//   n3.  "Content" changed on "Edit", the question answered "Cancel": the window and the text stay; "Save" then closes it without a question
//   n4.  "Content" changed on "Add Static Page", then another address typed: does the browser ask "Leave site?"
//   r1.  custom block window (all three apps): "Add Block", a change in "Content" only, the window's close control
//   r2.  an untouched "Add Block" window: the close control closes without a question
//
// Reset first:  npm run fleet-prep -- --feature issues-ir9 --dataset 1 --reset
// Run:          PROBE_FEATURE=issues-ir9 PROBE_AGENT=ir9 PROBE_RUN=<nofix|fix> node bin/probe.js all shared/playwright/checks/issues/static-page-content-change-lost-on-close/neighbour.js
// Facts: .reports/<feature>/ir9/neighbour-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib');

const {T, sleep} = L;

forEachApp(async (app) => {
    const {StaticPagesTab, PluginsTab} = require('../../../pages/CustomContentPages.js');
    const fact = (k, v) => { record('neighbour-facts', {[k]: v}, {merge: true}); console.log('[nb]', app.name, k, JSON.stringify(v).slice(0, 500)); };
    const {page} = await launch(app);
    const errs = L.scriptErrors(page);
    await signIn(page, 'dbarnes');

    const plugins = new PluginsTab(page, app.contextPath);
    await plugins.goto();
    fact('enable-blocks', await L.setPluginEnabled(page, 'customblockmanagerplugin', true));

    if (app.name !== 'ops') {
        fact('enable-static', await L.setPluginEnabled(page, 'staticpagesplugin', true));
        const tab = new StaticPagesTab(page, app.contextPath);
        const openList = async () => { await tab.goto(); await tab.tabButton.click(); await tab.waitList(); };
        await openList();

        let win = await tab.addPage();                                                   // n1
        fact('n1-untouched-add', await L.closeWindow(page, win.closeButton, win.form, {answer: 'cancel'}));

        win = await tab.addPage();                                                       // a saved page for n2, n3
        await win.pathInput.fill('u09ir9nb');
        await win.titleInput('en').fill('u09ir9 nb page');
        await win.content('en').type('u09ir9 nb first text');
        fact('save-page', await win.save());
        await win.form.waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await sleep(500);

        await openList();                                                                // n2
        win = await tab.editPage('u09ir9 nb page');
        fact('n2-untouched-edit', await L.closeWindow(page, win.closeButton, win.form, {answer: 'cancel'}));
        if (await win.form.isVisible()) await L.closeWindow(page, win.closeButton, win.form);

        await openList();                                                                // n3
        win = await tab.editPage('u09ir9 nb page');
        await win.content('en').type(' plus more');
        const c = await L.closeWindow(page, win.closeButton, win.form, {answer: 'cancel'});
        fact('n3-cancel', {...c, textKept: c.closed ? null : await L.editorText(page, win.content('en').textarea)});
        if (!c.closed) {
            let asked = null;
            const h = (d) => { asked = d.message(); d.accept(); };
            page.on('dialog', h);
            const saved = await win.save();
            await win.form.waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await sleep(500);
            page.off('dialog', h);
            fact('n3-save', {...saved, asked, closed: !(await win.form.isVisible())});
            await openList();
            win = await tab.editPage('u09ir9 nb page');
            fact('n3-stored', await L.editorText(page, win.content('en').textarea));
            await L.closeWindow(page, win.closeButton, win.form);
        }

        await openList();                                                                // n4
        win = await tab.addPage();
        await win.content('en').type('u09ir9 leaving');
        fact('n4-leave', await L.leavePage(page, app.url(`/index.php/${app.contextPath}/en/submissions`)));
        await shot(page, 'nb-n4-after-leave').catch(() => {});
    }

    // r1, r2: the custom block window
    await plugins.goto();
    let manager = await plugins.openBlockManager();
    let bw = await manager.addBlock();
    let close = bw.root.getByRole('button', {name: 'Close', exact: true}).first();
    await bw.content('en').type('u09ir9 block text');
    const r1 = await L.closeWindow(page, close, bw.form, {answer: 'cancel'});
    fact('r1-block-content-only', r1);
    record('nb-r1', await screen(page));
    if (await bw.form.isVisible()) await L.closeWindow(page, close, bw.form);

    await plugins.goto();
    manager = await plugins.openBlockManager();
    bw = await manager.addBlock();
    close = bw.root.getByRole('button', {name: 'Close', exact: true}).first();
    fact('r2-block-untouched', await L.closeWindow(page, close, bw.form, {answer: 'cancel'}));
    fact('scriptErrors-all', errs.filter((e) => !/status of 500/.test(e)));
});
