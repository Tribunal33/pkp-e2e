// U08 A18, second half: right after a refused "Save", the navigation item window closes on its
// back arrow without asking, and the page is left without the leave question, though what was
// typed is stored nowhere. The report's Steps, on PKP's default test dataset:
//   1-2  `rvaca`, Settings › Website › "Setup" › "Navigation"
//   3-4  "Add item", "u08m page", "Custom Page", path "my page", "Save" (refused)
//   5    the back arrow
//   6    the "Navigation Menu Items" table
//   7-8  "Add item", the same entries, "Save" (refused), the address of Settings › "Workflow" typed
//   control: "Add item", the same entries, "Save" (refused), "Title" changed, the back arrow
// `nb` as the argument runs the neighbour check alone (for the fix trial): an accepted "Save"
// still closes the window without a question and the page is then left without one.
// PACE_MS=4000 in front walks at a person's pace (four seconds before each action); unset, at once.
// The kit builds nothing; the neighbour's accepted save adds the item "u08m ok" through the screen.
//
// Reset first: PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:         PROBE_FEATURE=<feature> PROBE_AGENT=<id> [PROBE_RUN=<r>] node bin/probe.js all shared/playwright/checks/issues/item-window-refused-save-closes-unasked/walk.js [nb]
const {forEachApp, launch, signIn, record, screen, shot} = require('../../../probe');
const L = require('../item-window-asks-with-nothing-typed/lib.js');

const MODE = process.argv[2] || 'walk';

/** "Add item" with a title, "Custom Page" and a path, blurred; returns the window. */
async function fillNew(tab, page, title, path) {
    const win = await tab.addItem();
    await win.titleInput('en').fill(title);
    await win.chooseType('Custom Page');
    await win.pathInput.fill(path);
    await win.pathInput.blur();
    return win;
}

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
        let win;

        if (MODE === 'walk') {
            await step('s3-filled', async () => { win = await fillNew(tab, page, 'u08m page', 'my page'); return L.windowRead(page); });
            await step('s4-save', () => L.saveItem(page, win));
            await shot(page, 's4-refused').catch(() => {});
            await step('s4-window', () => L.windowRead(page));
            await step('s5-backArrow', () => L.backArrow(page, dw, 's5'));
            await step('s5-settled', () => L.settleClosed(page));
            await step('s6-items', () => tab.rowTitles('items'));

            await step('s7-filled', async () => { win = await fillNew(tab, page, 'u08m page', 'my page'); return L.windowRead(page); });
            await step('s7-save', () => L.saveItem(page, win));
            await step('s8-leave', () => L.leaveToWorkflow(page, dw, 's8'));
            record('screen-refused-after-s8', await screen(page));

            tab = await L.openNavigation(page, app.contextPath);
            await step('c-filled', async () => { win = await fillNew(tab, page, 'u08m page', 'my page'); return L.windowRead(page); });
            await step('c-save', () => L.saveItem(page, win));
            await step('c-retitle', async () => { await win.titleInput('en').fill('u08m page 2'); await win.titleInput('en').blur(); return L.windowRead(page); });
            await step('c-backArrow', () => L.backArrow(page, dw, 'control'));
            await step('c-settled', () => L.settleClosed(page));
            await step('c-items', () => tab.rowTitles('items'));
        } else {
            // Neighbour: an accepted save closes without a question and leaves nothing holding the page.
            await step('nb-filled', async () => { win = await fillNew(tab, page, 'u08m ok', 'u08m-ok'); return L.windowRead(page); });
            await step('nb-save', () => L.saveItem(page, win));
            await step('nb-settled', () => L.settleClosed(page));
            await step('nb-items', () => tab.rowTitles('items'));
            await step('nb-leave', () => L.leaveToWorkflow(page, dw, 'nb-leave'));
        }
    } finally {
        facts.dialogs = dw.dialogs;
        record(MODE === 'walk' ? 'facts-refused' : `facts-refused-${MODE}`, facts);
        await close();
    }
});
