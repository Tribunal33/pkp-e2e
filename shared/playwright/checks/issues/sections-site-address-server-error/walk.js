// Issue report walk: docs/issues/U17-A10-sections-site-address-server-error.md
// (spec U17 register A10, second cause). The sections interface is latent
// (no screen calls it, U17 fn g), so the walk types the addresses the
// report's Steps name into a signed-in browser, on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), as its Site
// administrator `admin` and as a visitor. The kit builds nothing; the walk
// changes nothing.
//   steps:     admin opens …/index/api/v1/sections and …/index/api/v1/sections/1
//   controls:  admin and rvaca open the journal's list
//              …/publicknowledge/api/v1/sections and …/sections/1;
//              signed out, and as rvaca (Journal manager) and dbarnes
//              (Journal editor), the site's address is refused
//   neighbour: with fix.diff in, the journal's list and one section still
//              answer both managers (the added `has.context` refuses only
//              where no journal is named)
// OJS only: OMP and OPS have no sections interface (U17 A5).
// Records every screen with screen().
//
// Reset first:  npm run fleet-prep -- --feature issues-r19b --dataset 3 --reset   (any dataset fleet)
// Run (main):   PROBE_FEATURE=issues-r19b PROBE_AGENT=r19 node bin/probe.js ojs shared/playwright/checks/issues/sections-site-address-server-error/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-r19-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r19-3_5 PROBE_AGENT=r19 node bin/probe.js ojs shared/playwright/checks/issues/sections-site-address-server-error/walk.js
// Fix trial:    node bin/try-fix.js apply shared/playwright/checks/issues/sections-site-address-server-error/fix.diff ojs, reset, run with PROBE_RUN=fix, revert
// Facts: .reports/<feature>/r19/facts-site[-<run>]-ojs.json
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
        record(`site-${String(++n).padStart(2, '0')}-${label}`, s);
        const body = r ? (await r.text().catch(() => '')) : '';
        facts[label] = {address: `/index.php${path}`, status: r ? r.status() : null, body: body.slice(0, 400)};
        console.log(`[${app.name}] ${label}: ${facts[label].status} ${facts[label].body.slice(0, 200)}`);
    };
    try {
        await signIn(page, 'admin');
        await typed('admin-journal-list', `/${app.contextPath}/api/v1/sections`);
        await typed('admin-journal-section-1', `/${app.contextPath}/api/v1/sections/1`);
        await typed('admin-site-list', '/index/api/v1/sections');
        await typed('admin-site-section-1', '/index/api/v1/sections/1');
        await signOut(page);
        await typed('visitor-site-list', '/index/api/v1/sections');
        await signIn(page, 'rvaca');
        await typed('rvaca-journal-list', `/${app.contextPath}/api/v1/sections`);
        await typed('rvaca-journal-section-1', `/${app.contextPath}/api/v1/sections/1`);
        await typed('rvaca-site-list', '/index/api/v1/sections');
        await signOut(page);
        await signIn(page, 'dbarnes');
        await typed('dbarnes-site-list', '/index/api/v1/sections');
        await signOut(page);
    } finally {
        record('facts-site', facts);
        await close();
    }
});
