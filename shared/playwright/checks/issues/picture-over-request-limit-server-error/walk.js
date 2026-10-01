// Issue report docs/issues/U09-A18-picture-over-request-limit-server-error.md (U09 A18): the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"), context `publicknowledge`, as `rvaca`.
//
// Precondition: PHP as php.ini-production sets it (2M per file, 8M per request, display_errors
// Off), served by the sibling report's lib.js `startDefaultLimitsServer()` on base port + 74 for
// the length of the walk. The kit builds nothing.
//   1. sign in as rvaca
//   2–5. Settings › Website › "Setup" › "Navigation", "Add item", "Custom Page", "Insert/edit image"
//   6–7. "Upload", "Browse for an image": photo-9mb.png; the small window; "OK"
// Neighbour (with the fix in and out): photo-small.png is stored ("Source" holds its address),
//   not-a-picture.png gets "The image you uploaded is not valid.", and photo-3mb.png (over the
//   per-file limit only, the sibling report's case) is untouched by this fix.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir3 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir3 PROBE_AGENT=ir3 node bin/probe.js all shared/playwright/checks/issues/picture-over-request-limit-server-error/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir3-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir3-3_5 PROBE_AGENT=ir3 node bin/probe.js all shared/playwright/checks/issues/picture-over-request-limit-server-error/walk.js
// Facts: .reports/<feature>/ir3/a18post-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, outDir} = require('../../../probe');
const L = require('../picture-over-upload-limit-server-error/lib');

forEachApp(async (app) => {
    const fact = (k, v) => { record('a18post-facts', {[k]: v}, {merge: true}); console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 600)); };
    const server = await L.startDefaultLimitsServer(app, outDir(), {ini: ['display_errors=Off']});
    try {
        const {page} = await launch(app);
        const files = await L.makePictures(page, outDir());
        fact('server', {origin: server.origin, limits: '2M / 8M, display_errors Off', files});

        await signIn(page, 'rvaca', {origin: server.origin});                                  // 1
        const win = await L.openPictureWindow(page, server.origin, app.contextPath);            // 2–5
        const from = server.logSize();
        const r = await L.uploadAndRead(page, win, files.png9.path);                            // 6–7
        record('a18post-6-png-9mb', await screen(page));
        await shot(page, 'a18post-6-png-9mb');
        await r.settle();
        delete r.settle;
        fact('6-png-9mb', {...r, serverLog: server.logSince(from, /PHP (Fatal|Warning)|Error|Exception|too large|Content-Length/i).slice(0, 6)});

        // Neighbour: a picture under the limit, a text file named ".png", a picture over the per-file limit only.
        for (const [step, key] of [['n1-small-png', 'small'], ['n2-text-named-png', 'fake'], ['n3-png-3mb', 'png3']]) {
            const n = await L.uploadAndRead(page, win, files[key].path);
            await n.settle();
            delete n.settle;
            fact(step, n);
        }
        await win.cancel();
    } finally {
        server.stop();
    }
});
