// U08 A18, first half: the navigation item window asks about changes when nothing was typed,
// and holds the page while it is open. The report's Steps, on PKP's default test dataset:
//   1-2  `rvaca`, Settings › Website › "Setup" › "Navigation"
//   3-5  "Add item", nothing typed, the back arrow: the box answered "Cancel", then again "OK"
//   6    "Contact" › "Edit", nothing typed, the back arrow ("OK")
//   7    "Add item", nothing typed, the address of Settings › "Workflow" typed in the address bar
//   control: with no window open, the same address
// `nb` as the argument runs the neighbour check alone (for the fix trial): a typed title still
// asks on the back arrow and on leaving the page, and the type-dependent boxes are still set when
// the window opens ("Contact" shows "Query Parameters", "Add item" does not).
// PACE_MS=4000 in front walks at a person's pace (four seconds before each action); unset, at once.
// The kit builds nothing; the steps change nothing stored.
//
// Reset first: PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:         PROBE_FEATURE=<feature> PROBE_AGENT=<id> [PROBE_RUN=<r>] node bin/probe.js all shared/playwright/checks/issues/item-window-asks-with-nothing-typed/walk.js [nb]
const {forEachApp, launch, signIn, record, screen, shot} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.argv[2] || 'walk';

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line, mode: MODE};
    const fact = (k, v) => { facts[k] = v; console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 800)); };
    const {page, close} = await launch(app);
    const dw = L.watchDialogs(page);
    const step = async (name, fn) => {
        await L.pause(); // PACE_MS: a person's pace between actions (the paced walk)
        try { fact(name, await fn()); } catch (e) { fact(name, {error: L.flat(e.message, 300)}); }
    };
    try {
        await signIn(page, 'rvaca');
        let tab = await L.openNavigation(page, app.contextPath);

        if (MODE === 'walk') {
            await step('s3-addItem', async () => { await tab.addItem(); return L.windowRead(page); });
            await step('s4-backArrowCancel', () => L.backArrow(page, dw, 's4', {answer: 'dismiss'}));
            await shot(page, 's4-after-cancel').catch(() => {});
            await step('s5-backArrowOK', async () => (await L.windowOpen(page)) ? L.backArrow(page, dw, 's5') : {skipped: 'window already closed'});
            await step('s5-settled', () => L.settleClosed(page));

            await step('s6-editContact', async () => { await tab.editItem('Contact'); return L.windowRead(page); });
            await step('s6-backArrow', () => L.backArrow(page, dw, 's6'));
            await step('s6-settled', () => L.settleClosed(page));

            await step('s7-addItem', async () => { await tab.addItem(); return L.windowRead(page); });
            await step('s7-leave', () => L.leaveToWorkflow(page, dw, 's7'));
            record('screen-after-s7', await screen(page));

            tab = await L.openNavigation(page, app.contextPath);
            await step('control-leaveNoWindow', () => L.leaveToWorkflow(page, dw, 'control'));
        } else {
            // Neighbour: what must still ask, and what the window must still set when it opens.
            await step('nb-addItemOpen', async () => { await tab.addItem(); return L.windowRead(page); });
            await step('nb-typedTitleBackArrow', async () => {
                const box = page.locator('[role="dialog"]:visible form#navigationMenuItemsForm input[name^="title["]').first();
                await box.fill('u08m look');
                await box.blur();
                return L.backArrow(page, dw, 'nb-typed', {answer: 'accept'});
            });
            await step('nb-settled', () => L.settleClosed(page));
            await step('nb-editContactOpen', async () => { await tab.editItem('Contact'); return L.windowRead(page); });
            await step('nb-chosenTypeLeave', async () => {
                await page.locator('[role="dialog"]:visible select[name="menuItemType"]').first().selectOption({label: 'Remote URL'});
                await page.locator('[role="dialog"]:visible select[name="menuItemType"]').first().blur();
                return L.leaveToWorkflow(page, dw, 'nb-changed-leave');
            });
            tab = await L.openNavigation(page, app.contextPath);
            await step('nb-itemsAfter', () => tab.rowTitles('items'));
        }
    } finally {
        facts.dialogs = dw.dialogs;
        record(MODE === 'walk' ? 'facts' : `facts-${MODE}`, facts);
        await close();
    }
});
