// Issue report docs/issues/U09-A18-picture-over-upload-limit-server-error.md (U09 A18): the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"), context `publicknowledge`, as `rvaca`.
//
// Precondition: PHP's own upload limits (2M per file, 8M per request). lib.js
// `startDefaultLimitsServer()` serves the same checkout and database with those two limits on base
// port + 74 for the length of the walk (the host's php.ini may raise them). The kit builds nothing.
//   1. sign in as rvaca
//   2–5. Settings › Website › "Setup" › "Navigation", "Add item", "Custom Page", "Insert/edit image"
//   6–7. "Upload", "Browse for an image": photo-3mb.png; the small window; "OK"
//   8. the same with photo-3mb.webp
// Neighbour (with the fix in and out): photo-small.png is stored ("Source" holds its address), and
//   not-a-picture.png (a text file) gets "The image you uploaded is not valid.".
//
// Reset first:  npm run fleet-prep -- --feature issues-ir3 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir3 PROBE_AGENT=ir3 node bin/probe.js all shared/playwright/checks/issues/picture-over-upload-limit-server-error/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir3-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir3-3_5 PROBE_AGENT=ir3 node bin/probe.js all shared/playwright/checks/issues/picture-over-upload-limit-server-error/walk.js
// Facts: .reports/<feature>/ir3/a18-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, outDir} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const fact = (k, v) => { record('a18-facts', {[k]: v}, {merge: true}); console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 600)); };
    const server = await L.startDefaultLimitsServer(app, outDir());
    try {
        const {page} = await launch(app);
        const files = await L.makePictures(page, outDir());
        fact('server', {origin: server.origin, limits: '2M / 8M', files});

        await signIn(page, 'rvaca', {origin: server.origin});                                  // 1
        const win = await L.openPictureWindow(page, server.origin, app.contextPath);            // 2–5
        fact('5-window', {title: await win.title.innerText(), tabs: await win.tabNames()});

        for (const [step, key] of [['6-png-3mb', 'png3'], ['8-webp-3mb', 'webp3']]) {          // 6–8
            const from = server.logSize();
            const r = await L.uploadAndRead(page, win, files[key].path);
            record(`a18-${step}`, await screen(page));
            await shot(page, `a18-${step}`);
            await r.settle();
            delete r.settle;
            fact(step, {...r, serverLog: server.logSince(from, /PHP (Fatal|Warning)|Error|Exception|cannot be empty/i).slice(0, 6)});
        }

        // Neighbour: a picture under the limit, and a text file named ".png".
        for (const [step, key] of [['n1-small-png', 'small'], ['n2-text-named-png', 'fake']]) {
            const r = await L.uploadAndRead(page, win, files[key].path);
            await r.settle();
            delete r.settle;
            fact(step, r);
        }
        await win.cancel();
    } finally {
        server.stop();
    }
});
