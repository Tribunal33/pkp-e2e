// Walk of docs/issues/U40-A13-reset-permissions-button-greyed-after-cancel.md on PKP's default test dataset:
// sign in as rvaca, open Tools › "Permissions", press the reset button, answer Cancel in the browser's box,
// press it again; then reload. Neighbour (R1_MODE=nb, the path a fix must leave alone): press, answer OK:
// one reset request, the success toast, the button usable again.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/reset-permissions-button-greyed-after-cancel/walk.js
//               R1_MODE=nb PROBE_RUN=nb ... for the neighbour alone
// Facts: .reports/<feature>/<agent>/a13-walk[-<run>]-<app>.json (a13-nb for the neighbour)
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.R1_MODE === 'nb' ? 'nb' : 'walk';

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    try {
        await signIn(page, 'rvaca');                                     // 1
        f.tool = await L.openPermissionsTool(app, page);                 // 2
        await L.snap(page, `a13-${MODE}-tool`);
        if (MODE === 'walk') {
            f.first = await L.pressReset(page, 'cancel');                // 3, 4
            await L.snap(page, 'a13-walk-after-cancel', f.first);
            f.second = await L.pressReset(page, 'cancel');               // 5
            await L.snap(page, 'a13-walk-second-press', f.second);
            f.afterReload = (await L.openPermissionsTool(app, page)).button; // control: the page loaded afresh
        } else {
            f.ok = await L.pressReset(page, 'ok');
            await L.snap(page, 'a13-nb-after-ok', f.ok);
        }
    } catch (e) {
        f.error = L.flat(e.stack, 900);
        await L.snap(page, `a13-${MODE}-error`).catch(() => {});
    } finally {
        record(`a13-${MODE}`, f);
        console.log(`[a13-${MODE}] ${app.name}`, JSON.stringify(f));
        await close();
    }
});
