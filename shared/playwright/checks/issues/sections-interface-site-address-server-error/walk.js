// Issue report docs/issues/U17-A10-sections-interface-site-address-server-error.md (U17 A10) {OJS}:
// the sections interface, asked for its list at the site's address (no journal in it), fails with a
// server error. A10's other half (a section asked for by a word, `/sections/abc`) is the root cause of
// docs/issues/U09-A18-picture-over-request-limit-server-error.md and joins it; step 4 records it.
// Latent: no screen calls the interface, so the steps type its addresses into a browser signed in as
// the site administrator, as a person would.
//
//   1 sign in as admin   2 index/api/v1/sections   3 index/api/v1/sections/1
//   4 publicknowledge/api/v1/sections/abc   5 (control) publicknowledge/api/v1/sections/999
//   6 (control) publicknowledge/api/v1/sections   7 signed out: index/api/v1/sections
//
// `neighbour` as the argument runs alone and creates nothing: the journal's list must stay 200 for admin
// and for the manager rvaca, stay refused for the author ccorino, and the site address stay 401 for a
// visitor. `roles` as the argument runs alone and creates nothing: the manager rvaca and the author ccorino
// ask for the list at the site's address (by the code their role check, not the endpoint, fails), and admin
// asks for the site's highlights list there (the same role check, spec U11 A5). OMP and OPS have no sections interface (spec U17 A5): the script reads their address once.
// The kit builds nothing; nothing is written.
//
// Reset first:  npm run fleet-prep -- --feature issues-u17d --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u17d PROBE_AGENT=u17d node bin/probe.js all shared/playwright/checks/issues/sections-interface-site-address-server-error/walk.js [neighbour]
// Modes:       add `neighbour` or `roles` after walk.js; each runs alone.
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u17d-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u17d-3_5 PROBE_AGENT=u17d node bin/probe.js all shared/playwright/checks/issues/sections-interface-site-address-server-error/walk.js
// The fix:      node bin/try-fix.js apply shared/playwright/checks/issues/sections-interface-site-address-server-error/fix.diff ojs omp ops
const {forEachApp, launch, signIn, signOut, screen, record, serverLog} = require('../../../probe');

const neighbour = process.argv.slice(2).includes('neighbour');
const roles = process.argv.slice(2).includes('roles');
const mode = neighbour ? 'nb' : roles ? 'roles' : 'w';
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${flat(JSON.stringify(v), 1200)}`);
    };
    let n = 0;
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);

    // Open an address in the browser and keep what it answered (status and body), never throwing.
    const open = async (label, path) => {
        let status = null, body = null, error = null;
        try {
            const r = await page.goto(app.url(path));
            status = r ? r.status() : null;
            body = r ? await r.text() : null;
        } catch (e) {
            error = flat(e.message, 300);
        }
        record(`${mode}-${String(++n).padStart(2, '0')}-${label}`, await screen(page).catch((e) => ({error: e.message})));
        return {path, status, body: body && body.length > 3000 ? `${body.slice(0, 3000)}…` : body, error};
    };
    // The list's answer, short: status and the section ids and titles, or the body when it is not a list.
    const list = (r) => {
        try {
            const j = JSON.parse(r.body);
            if (j && Array.isArray(j.items)) return {status: r.status, itemsMax: j.itemsMax, items: j.items.map((i) => [i.id, i.title && i.title.en])};
        } catch (e) {
            // not JSON: keep the body
        }
        return r;
    };

    try {
        if (app.name !== 'ojs') {
            // No sections interface on a press or a preprint server (U17 A5): the address, once.
            await signIn(page, 'admin');
            fact('no interface', await open('no-interface', '/index.php/index/api/v1/sections'));
            return;
        }
        if (roles) {
            await signIn(page, 'rvaca');
            fact('roles manager site list', await open('manager-site-list', '/index.php/index/api/v1/sections'));
            await signIn(page, 'ccorino');
            fact('roles author site list', await open('author-site-list', '/index.php/index/api/v1/sections'));
            await signIn(page, 'admin');
            fact('roles admin site highlights', await open('admin-site-highlights', '/index.php/index/api/v1/highlights'));
            return;
        }
        if (neighbour) {
            await signIn(page, 'admin');
            fact('nb admin journal list', list(await open('admin-journal-list', '/index.php/publicknowledge/api/v1/sections')));
            await signIn(page, 'rvaca');
            fact('nb manager journal list', list(await open('manager-journal-list', '/index.php/publicknowledge/api/v1/sections')));
            await signIn(page, 'ccorino');
            fact('nb author journal list', await open('author-journal-list', '/index.php/publicknowledge/api/v1/sections'));
            await signOut(page);
            fact('nb visitor site list', await open('visitor-site-list', '/index.php/index/api/v1/sections'));
            return;
        }
        await signIn(page, 'admin');
        fact('2 site list', await open('site-list', '/index.php/index/api/v1/sections'));
        fact('3 site section 1', await open('site-section-1', '/index.php/index/api/v1/sections/1'));
        fact('4 section abc', await open('section-abc', '/index.php/publicknowledge/api/v1/sections/abc'));
        fact('5 section 999', await open('section-999', '/index.php/publicknowledge/api/v1/sections/999'));
        fact('6 journal list', list(await open('journal-list', '/index.php/publicknowledge/api/v1/sections')));
        await signOut(page);
        fact('7 visitor site list', await open('visitor-site-list', '/index.php/index/api/v1/sections'));
    } finally {
        fact('server log', log.since(from));
        record(`${mode}-facts`, facts);
        await close();
    }
});
