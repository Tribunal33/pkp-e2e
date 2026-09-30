// Issue report walk: docs/issues/U36-A21-upload-over-request-limit-server-error.md
// (its route case, spec U17 register A10 first case). The sections interface is latent (no
// screen calls it, U17 fn g), so the walk types the addresses the report's
// Steps name into a signed-in browser, on PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"), as its Journal manager
// `rvaca` and as a visitor. The kit builds nothing; the walk changes nothing.
//   steps:     rvaca opens …/api/v1/sections/abc; a visitor opens the same
//   controls:  …/sections/1 (a section), …/sections/999 (refused, A9)
//   neighbour: `admin` at the site's address …/index/api/v1/sections, a
//              server error that is not a missed address (the second
//              A10 report's), must stay 500 with a fix in: the fix reaches
//              HTTP exceptions only
// OJS only: OMP and OPS have no sections interface (U17 A5).
// Records every screen with screen().
//
// Reset first:  npm run fleet-prep -- --feature issues-r19 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-r19 PROBE_AGENT=r19 node bin/probe.js ojs shared/playwright/checks/issues/sections-word-id-server-error/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-r19-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r19-3_5 PROBE_AGENT=r19 node bin/probe.js ojs shared/playwright/checks/issues/sections-word-id-server-error/walk.js
// Fix trial:    node bin/try-fix.js apply shared/playwright/checks/issues/upload-over-request-limit-server-error/fix.diff ojs (the report's fix; this folder's fix.diff is an earlier renderer-only variant), reset, run with PROBE_RUN=fix, revert
// Facts: .reports/<feature>/r19/facts-word[-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {fleet: {line: app.line || 'main', dataset: app.dataset, port: app.port, run: process.env.PROBE_RUN || null}};
    const {page, close} = await launch(app);
    let n = 0;
    const typed = async (label, path) => {
        const r = await page.goto(app.url(`/index.php${path}`));
        await idle(page);
        const s = await screen(page);
        record(`word-${String(++n).padStart(2, '0')}-${label}`, s);
        const body = r ? (await r.text().catch(() => '')) : '';
        facts[label] = {address: `/index.php${path}`, status: r ? r.status() : null, body: body.slice(0, 400)};
        console.log(`[${app.name}] ${label}: ${facts[label].status} ${facts[label].body.slice(0, 200)}`);
    };
    try {
        await signIn(page, 'rvaca');
        await typed('rvaca-section-1', `/${app.contextPath}/api/v1/sections/1`);
        await typed('rvaca-section-999', `/${app.contextPath}/api/v1/sections/999`);
        await typed('rvaca-section-abc', `/${app.contextPath}/api/v1/sections/abc`);
        await signOut(page);
        await typed('visitor-section-abc', `/${app.contextPath}/api/v1/sections/abc`);
        await signIn(page, 'admin');
        await typed('neighbour-admin-site-list', '/index/api/v1/sections');
        await signOut(page);
    } finally {
        record('facts-word', facts);
        await close();
    }
});
