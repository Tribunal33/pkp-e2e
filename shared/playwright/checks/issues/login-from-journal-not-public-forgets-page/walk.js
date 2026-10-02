// Issue report docs/issues/U59-A8-login-from-journal-not-public-forgets-page.md (U59 A8): a
// signed-out visitor who opens a page of a journal not enabled publicly gets its Login page, and
// after signing in there lands on the Dashboard or the journal's home page, not on the page asked
// for. Takes the report's Steps on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"), on `publicknowledge`. The kit builds nothing.
//
//   (default)
//   1. signed out, "Register": Reader u59i, username u59ireader; sign out
//   2. admin: Hosted Journals › "Edit": untick "Enable this journal to appear publicly on the
//      site", "Save"; sign out
//   3. open the published item's address (OJS article 17, OMP book 14, OPS preprint 2): Login
//   4. sign in there as dbarnes
//   5. sign out; open About; sign in on the Login page as an author (amwandenga, aclark, ccorino)
//   6. sign out; the address of step 3 again; sign in on the Login page as u59ireader
//   neighbour  (the fix's, a fresh dataset): dbarnes ticks "Users must be registered and log in
//              to view the journal site." on the enabled journal: the item's address signed out,
//              sign in, where it leads. Then admin unticks the enable box: the Login page opened
//              by its own address and dbarnes signed in; the journal's home address, Login,
//              dbarnes; the Login page's "Register" link, then dbarnes.
//
// Reset first:  npm run fleet-prep -- --feature issues-u59i --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u59i PROBE_AGENT=u59i node bin/probe.js all shared/playwright/checks/issues/login-from-journal-not-public-forgets-page/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u59i-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u59i-3_5 PROBE_AGENT=u59i node bin/probe.js all shared/playwright/checks/issues/login-from-journal-not-public-forgets-page/walk.js
// Facts: .reports/<feature>/u59i/a8-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');

const MODE = process.argv[2] || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {readLogin, signInHere} = require('../sign-in-to-buy-file-skips-payment-page/lib');
    const {serverLog} = require('../book-without-abstract-oai-lists-fail/lib');
    const {flat, rel} = require('../older-version-pdf-reader-empty/lib');
    const L = require('./lib');
    const A = L.APPS[app.name];

    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[a8] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const log = serverLog(app);
    const {page, close} = await launch(app);
    // Open an address signed out, read the Login page it leads to, sign in there; record all three.
    const visit = async (key, path, username) => {
        try {
            fact(`${key} opened signed out`, await L.openSignedOut(page, app, path));
            fact(`${key} the Login page`, await readLogin(page));
            record(`a8-${key}-login`, await screen(page));
            fact(`${key} signed in there as ${username}`, await signInHere(page, username));
            record(`a8-${key}-landed`, await screen(page));
            await shot(page, `a8-${key}-landed`).catch(() => {});
        } catch (e) {
            fact(`${key} error`, flat(e.message, 300));
        }
        await signOut(page).catch(() => {});
    };

    try {
        if (MODE === 'neighbour') {
            // The journal that requires sign-in to view: the path the fix must leave alone.
            await signIn(page, 'dbarnes');
            const {SiteAccessTab} = require('../../../pages/RolesConfigurationPages.js');
            const access = new SiteAccessTab(page, app.contextPath);
            await access.goto();
            await access.box(A.restrict).check();
            fact('nb restrict saved', (await access.save()).status());
            await signOut(page);
            await visit('nb-restricted-item', A.item, 'dbarnes');

            await signIn(page, 'admin');
            fact('nb enable box', await L.setEnabled(page, app, false));
            await signOut(page);

            // The Login page opened by its own address.
            await visit('nb-login-direct', 'login', 'dbarnes');
            // The journal's home address.
            await visit('nb-home', 'index', 'dbarnes');
            // The Login page's "Register" link, then the sign-in.
            try {
                await L.openSignedOut(page, app, 'login');
                const link = page.locator('form#login a.register');
                fact('nb-register link', flat(rel(await link.getAttribute('href')), 300));
                await Promise.all([page.waitForLoadState('load'), link.click()]);
                fact('nb-register pressed', await readLogin(page));
                fact('nb-register signed in as dbarnes', await signInHere(page, 'dbarnes'));
                record('a8-nb-register-landed', await screen(page));
            } catch (e) {
                fact('nb-register error', flat(e.message, 300));
            }
            await signOut(page).catch(() => {});
            fact('server log', log.since());
            return;
        }

        // 1: a Reader registers while the journal is public.
        fact('1 registered', await L.registerReader(page, app, {givenName: 'Reader', familyName: 'u59i', username: 'u59ireader'}));
        await signOut(page);
        // 2: the Site Administrator takes the journal off the public site.
        await signIn(page, 'admin');
        fact('2 enable box', await L.setEnabled(page, app, false));
        await signOut(page);
        // 3–4: the item's address, the Login page, dbarnes.
        await visit('4-item', A.item, 'dbarnes');
        // 5: About, an author.
        await visit('5-about', 'about', A.author);
        // 6: the item's address, the Reader.
        await visit('6-item', A.item, 'u59ireader');
        fact('server log', log.since());
    } finally {
        record('a8-facts', facts);
        await close();
    }
});
