// Issue report docs/issues/U59-A7-journal-form-quick-close-script-error.md (U59 A7):
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets").
//   (default)  as `admin`, Hosted Journals › the dataset journal's "Edit", "Close" pressed as soon
//              as the form shows; "Create Journal", "Close" the same way; then "Edit" again,
//              "Close" pressed once the "Path" box has settled (the control). Each close is
//              watched for 2 s for a page script error.
//   neighbour  (the fix's): "Edit" left open: the "Path" box still takes its padding from the
//              address in front of it, and a late "Close" raises nothing; the Settings Wizard's
//              "Journal" tab's "Path" box takes it too.
//   timing     "Edit", then "Close" 150 to 650 ms after the form shows: which closes still raise
//              the error; then the report's console snippet, which presses "Close" itself.
//              Nothing is built by the kit in any mode, and nothing is saved.
//
// Reset first:  npm run fleet-prep -- --feature issues-u59h --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u59h PROBE_AGENT=u59h node bin/probe.js all shared/playwright/checks/issues/journal-form-quick-close-script-error/walk.js [neighbour|timing]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u59h-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u59h-3_5 PROBE_AGENT=u59h node bin/probe.js all shared/playwright/checks/issues/journal-form-quick-close-script-error/walk.js
// Facts: .reports/<feature>/u59h/a7-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib');

const MODE = process.argv[2] || 'steps';

forEachApp(async (app) => {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const W = L.WORDS[app.name];
    const fact = (k, v) => {
        record('a7-facts', {[k]: v}, {merge: true});
        console.log('[a7]', app.name, k, JSON.stringify(v).slice(0, 1200));
    };
    const snap = async (page, name) => {
        record(name, await screen(page));
        await shot(page, name).catch(() => {});
    };
    const attempt = async (key, fn) => {
        try {
            fact(key, await fn());
        } catch (e) {
            fact(key, {error: L.flat(e.message, 300)});
        }
    };
    const {page} = await launch(app);
    const errors = L.watchErrors(page);
    const hosted = new HostedJournalsPage(page, W);
    const openEdit = async () => {
        const controls = await hosted.rowControls(app.contextPath);
        await controls.getByRole('link', {name: 'Edit', exact: true}).click();
    };

    // 1–2: sign in as admin, Hosted Journals.
    await signIn(page, 'admin');
    await hosted.goto();
    await snap(page, 'a7-step2');
    fact('step2-errors', errors.take());

    if (MODE === 'neighbour') {
        // "Edit" left open: the "Path" box takes its padding; a late "Close" raises nothing.
        await attempt('nb-edit-open', async () => {
            await openEdit();
            const win = L.formWindow(page);
            await win.path.waitFor({state: 'visible', timeout: L.T});
            const atOnce = await L.readPath(win.root);
            const measured = await L.pathMeasured(win.root);
            return {atOnce, measured, settled: await L.readPath(win.root)};
        });
        await snap(page, 'a7-nb-edit');
        await attempt('nb-edit-late-close', () => L.closeAndWatch(page, errors, {quick: false}));
        // The Settings Wizard's "Journal" tab: the same field on a page.
        await attempt('nb-wizard', async () => {
            const controls = await hosted.rowControls(app.contextPath);
            await controls.getByRole('link', {name: 'Settings wizard', exact: true}).click();
            await page.waitForURL(/\/admin\/wizard\/\d+/, {timeout: L.T, waitUntil: 'commit'});
            await idle(page).catch(() => {});
            const form = page.locator('main');
            await form.locator('#context-urlPath-control').waitFor({state: 'visible', timeout: L.T});
            const measured = await L.pathMeasured(form);
            return {url: page.url().replace(/^https?:\/\/[^/]+/, ''), measured, settled: await L.readPath(form), errors: errors.take()};
        });
        await snap(page, 'a7-nb-wizard');
        await signOut(page).catch(() => {});
        return;
    }

    if (MODE === 'timing') {
        // How long after the form shows a "Close" still raises the error: "Edit", then "Close"
        // after each delay; then the report's console snippet, which presses "Close" itself.
        for (const delayMs of [150, 250, 350, 450, 550, 650]) {
            await attempt(`timing-close-after-${delayMs}`, async () => {
                await openEdit();
                return L.closeAndWatch(page, errors, {quick: true, delayMs});
            });
        }
        await attempt('timing-console-snippet', async () => {
            const win = L.formWindow(page);
            errors.take();
            await page.evaluate(L.CONSOLE_SNIPPET);
            const pressed = Date.now();
            await openEdit().catch(() => {});
            const gone = await win.root.waitFor({state: 'detached', timeout: L.T}).then(() => true).catch(() => false);
            await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 2_000)));
            return {windowGone: gone, errors: errors.take().map((e) => ({afterMs: e.at - pressed, kind: e.kind, text: e.text}))};
        });
        await signOut(page).catch(() => {});
        return;
    }

    // 3–4: the row's arrow, "Edit"; "Close" as soon as the form shows.
    await attempt('step4-edit-quick-close', async () => {
        await openEdit();
        return L.closeAndWatch(page, errors, {quick: true});
    });
    await snap(page, 'a7-step4');
    // 5–6: "Create Journal"; "Close" as soon as the form shows.
    await attempt('step6-create-quick-close', async () => {
        await hosted.createLink.click();
        return L.closeAndWatch(page, errors, {quick: true});
    });
    await snap(page, 'a7-step6');
    // 7: "Edit" again, "Close" once the "Path" box has settled (the control).
    await attempt('step7-edit-late-close', async () => {
        await openEdit();
        return L.closeAndWatch(page, errors, {quick: false});
    });
    await snap(page, 'a7-step7');
    await signOut(page).catch(() => {});
});
