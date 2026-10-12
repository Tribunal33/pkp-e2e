// Issue report docs/issues/U09-A19-static-page-content-change-lost-on-close.md (U09 A19):
// the custom block window's steps, walked through the screens on PKP's default
// test dataset (a dataset fleet, harness.md "Dataset fleets") on OJS, OMP and
// OPS, as `dbarnes`. The kit builds nothing. Fact keys follow the report's steps:
//   1–2.  `dbarnes` ticks "Custom Block Manager"
//   13–14. "Manage Custom Blocks", "Add Block", text in "Content" only, the window's own "Close"
//   15.   "Add Block" again, text in "Content" only, a press on the shaded page beside the window
//   16.   the same, then a reload of the browser page
//   17.   the same, then another address
//   18.   the same, then the initials button at the window's top, "Edit Profile"
//   c.    the control: "Block Name" only, the press beside the window (the question; "Cancel"
//         keeps the window), then a reload (the browser's page-leave question)
// Before 16, 17, 18 and the control's ways out the script presses the window's
// heading, so the focus leaves the box as it does when a person goes to the
// address bar or the reload button.
//
// `neighbour` as the script's argument, on a fresh reset (what the fix must leave alone):
//   n1–n4. an untouched "Add Block": its "Close", the press beside, a reload, "Edit Profile"
//   n5–n6. a saved block's "Edit", "Content" clicked into and out of, nothing typed: the press beside, a reload
//   n7.   "Edit", text added in "Content", "Save": then a reload, and the block read again
//   n8.   "Edit", the caret put in "Content" and arrow keys pressed, nothing typed: "Close"
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/static-page-content-change-lost-on-close/block.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<feature>-3_5 PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/static-page-content-change-lost-on-close/block.js
// Facts: .reports/<feature>/<id>/block-facts[-<run>]-<app>.json, block-neighbour[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib');

const NEIGHBOUR = process.argv[2] === 'neighbour';
const BLOCKS = 'customblockmanagerplugin';
const TEXT = 'u09rf5 block text';
const {T, sleep, flat} = L;

forEachApp(async (app) => {
    const {PluginsTab} = require('../../../pages/CustomContentPages.js');
    const FACTS = NEIGHBOUR ? 'block-neighbour' : 'block-facts';
    const fact = (k, v) => { record(FACTS, {[k]: v}, {merge: true}); console.log('[block]', app.name, k, JSON.stringify(v).slice(0, 700)); };
    const snap = async (page, name) => { record(name, await screen(page).catch((e) => ({error: String(e.message || e)}))); await shot(page, name).catch(() => {}); };
    const {page} = await launch(app);
    const errs = L.scriptErrors(page);
    const elsewhere = app.url(`/index.php/${app.contextPath}/en/submissions`);
    const plugins = new PluginsTab(page, app.contextPath);
    let manager = null;

    /** One group of steps: what it saw, or the error that stopped it (the next group starts afresh). */
    const part = async (key, fn) => {
        try { await fn(); } catch (e) {
            fact(`ERROR-${key}`, flat(e.stack || e, 600));
            await shot(page, `block-error-${key}`).catch(() => {});
            manager = null;
        }
    };
    /** Settings › Website › "Plugins" › the Custom Block Manager's arrow › "Manage Custom Blocks". */
    const openManager = async () => {
        const h = (d) => d.accept().catch(() => {});
        page.on('dialog', h);
        await plugins.goto();
        page.off('dialog', h);
        manager = await plugins.openBlockManager();
        return manager;
    };
    /** "Add Block", from the manager window when it is still open, else from "Plugins". */
    const addBlock = async () => {
        if (!manager || !(await manager.grid.isVisible().catch(() => false))) await openManager();
        return manager.addBlock();
    };
    const closeOf = (bw) => bw.root.getByRole('button', {name: 'Close', exact: true}).first();
    const held = (bw) => L.editorText(page, bw.content('en').textarea).catch(() => null);
    const managerOpen = () => (manager ? manager.grid.isVisible().catch(() => false) : false);
    /** The blocks "Manage Custom Blocks" lists, read on a page loaded anew. */
    const listed = async () => { await openManager(); return {rows: await manager.rowNames(), empty: await manager.emptyRow.isVisible().catch(() => null)}; };

    await signIn(page, 'dbarnes');                                                   // 1
    await plugins.goto();                                                            // 2
    fact('2-enable', await L.setPluginEnabled(page, BLOCKS, true));

    if (!NEIGHBOUR) {
        await part('13-14', async () => {
            const bw = await addBlock();                                             // 13
            await bw.content('en').type(TEXT);                                       // 14
            fact('14-content-held', await held(bw));
            await snap(page, 'block-14-typed');
            const c = await L.closeWindow(page, closeOf(bw), bw.form, {answer: 'cancel'});
            fact('14-close', {...c, textKept: c.closed ? null : await held(bw), managerOpen: await managerOpen()});
            await snap(page, 'block-14-after-close');
            if (!c.closed) fact('14-close-ok', await L.closeWindow(page, closeOf(bw), bw.form));
        });
        await part('15', async () => {
            const bw = await addBlock();                                             // 15
            fact('15-reopened-content', await held(bw));
            await bw.content('en').type(TEXT);
            const c = await L.pressBeside(page, bw.form, {answer: 'cancel'});
            fact('15-beside', {...c, textKept: c.closed ? null : await held(bw), managerOpen: await managerOpen()});
            await snap(page, 'block-15-after-press');
            if (!c.closed) fact('15-beside-ok', await L.pressBeside(page, bw.form));
        });
        await part('16', async () => {
            const bw = await addBlock();                                             // 16
            await bw.content('en').type(TEXT);
            await bw.blur();
            fact('16-reload', await L.leaveBy(page, async () => { await page.reload({timeout: T}); }));
            fact('16-list', await listed());
        });
        await part('17', async () => {
            const bw = await addBlock();                                             // 17
            await bw.content('en').type(TEXT);
            await bw.blur();
            fact('17-address', await L.leaveBy(page, async () => { await page.goto(elsewhere, {timeout: T}); }));
            fact('17-list', await listed());
        });
        await part('18', async () => {
            const bw = await addBlock();                                             // 18
            await bw.content('en').type(TEXT);
            await bw.blur();
            fact('18-edit-profile', await L.leaveBy(page, () => L.pressEditProfile(page, bw.root, 'dbarnes')));
            await snap(page, 'block-18-after-edit-profile');
            fact('18-list', await listed());
        });
        await part('c', async () => {
            const bw = await addBlock();                                             // the control
            await bw.nameInput('en').click();
            await page.keyboard.type('u09rf5 name');
            await bw.blur();
            const c = await L.pressBeside(page, bw.form, {answer: 'cancel'});
            fact('c-name-beside', {...c, nameKept: c.closed ? null : await bw.nameInput('en').inputValue().catch(() => null)});
            await snap(page, 'block-c-name-cancelled');
            if (!c.closed) fact('c-name-reload', await L.leaveBy(page, async () => { await page.reload({timeout: T}); }));
            fact('c-list', await listed());
        });
    } else {
        await part('n1-n4', async () => {
            let bw = await addBlock();                                               // n1
            fact('n1-untouched-close', await L.closeWindow(page, closeOf(bw), bw.form, {answer: 'cancel'}));
            if (await bw.form.isVisible().catch(() => false)) await L.closeWindow(page, closeOf(bw), bw.form);
            bw = await addBlock();                                                   // n2
            fact('n2-untouched-beside', await L.pressBeside(page, bw.form, {answer: 'cancel'}));
            if (await bw.form.isVisible().catch(() => false)) await L.pressBeside(page, bw.form);
            bw = await addBlock();                                                   // n3
            await bw.blur();
            fact('n3-untouched-reload', await L.leaveBy(page, async () => { await page.reload({timeout: T}); }));
            await openManager();
            bw = await addBlock();                                                   // n4
            fact('n4-untouched-edit-profile', await L.leaveBy(page, () => L.pressEditProfile(page, bw.root, 'dbarnes')));
        });
        let saved = null;
        await part('saved-block', async () => {
            await openManager();
            const bw = await addBlock();
            await bw.typeName('en', 'u09rf5 block');
            await bw.content('en').type('u09rf5 saved text');
            const status = await bw.save();
            await bw.form.waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await sleep(500);
            const rows = await manager.rowNames();
            saved = rows[0] || null;
            fact('saved-block', {status, rows});
        });
        if (saved) {
            await part('n5-n6', async () => {
                await openManager();
                let bw = await manager.editBlock(saved);                             // n5
                await bw.content('en').clickBody();
                await bw.blur();
                const c = await L.pressBeside(page, bw.form, {answer: 'cancel'});
                fact('n5-edit-clicked-beside', {...c, content: c.closed ? null : await held(bw)});
                if (!c.closed) await L.pressBeside(page, bw.form);
                await openManager();                                                 // the row's arrow is open: load the list anew
                bw = await manager.editBlock(saved);                                 // n6
                await bw.content('en').clickBody();
                await bw.blur();
                fact('n6-edit-clicked-reload', await L.leaveBy(page, async () => { await page.reload({timeout: T}); }));
            });
            await part('n7', async () => {
                await openManager();
                let bw = await manager.editBlock(saved);                             // n7
                await bw.content('en').type(' plus more');
                let asked = null;
                const h = (d) => { asked = d.message(); d.accept().catch(() => {}); };
                page.on('dialog', h);
                const status = await bw.save();
                await bw.form.waitFor({state: 'hidden', timeout: T}).catch(() => {});
                await sleep(500);
                page.off('dialog', h);
                fact('n7-save', {status, asked, closed: !(await bw.form.isVisible().catch(() => false))});
                fact('n7-saved-reload', await L.leaveBy(page, async () => { await page.reload({timeout: T}); }));
                await openManager();
                bw = await manager.editBlock(saved);
                fact('n7-stored', await held(bw));
                fact('n7-reopened-close', await L.closeWindow(page, closeOf(bw), bw.form, {answer: 'cancel'}));
            });
            await part('n8', async () => {
                await openManager();
                const bw = await manager.editBlock(saved);                           // n8
                await bw.content('en').clickBody();
                for (const key of ['ArrowRight', 'End', 'ArrowLeft']) await page.keyboard.press(key);
                await sleep(300);
                fact('n8-edit-arrow-keys-close', await L.closeWindow(page, closeOf(bw), bw.form, {answer: 'cancel'}));
            });
        }
    }
    fact('scriptErrors-all', errs.filter((e) => !/status of 500/.test(e)));
});
