// Issue report docs/issues/U01-A7-dashboard-address-signed-out-server-error.md (U01 A7): signed
// out, the journal's address ending at the word "dashboard" answers a blank server error instead
// of the Login page. Takes the report's Steps on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), on `publicknowledge`. The kit builds nothing.
//
//   (default)
//   1. signed out, open /index.php/publicknowledge/en/dashboard
//   2. on the page that opens, sign in as dbarnes (recorded as impossible when no Login form shows)
//   3. sign out; control: open …/en/dashboard/editorial: the Login page
//   4. sign in there as dbarnes
//   reach reads, signed out: …/en/dashboard/ (a final slash, U01 A7 since 2026-10-06), …/en/dashboard/index
//   and the locale-less …/publicknowledge/dashboard
//   neighbour  (the fix's, run alone): signed in as dbarnes, then as the dataset's author
//              (amwandenga, aclark, ccorino), the bare dashboard address: where it leads; signed
//              out, the old "submissions" address: the Login page, then dbarnes signing in there.
//
// Reset first:  npm run fleet-prep -- --feature issues-u01d --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u01d PROBE_AGENT=u01d node bin/probe.js all shared/playwright/checks/issues/dashboard-address-signed-out-server-error/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u01d-3_5 PROBE_AGENT=u01d node bin/probe.js all <this file>
// Facts: .reports/<feature>/u01d/a7-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, serverLog} = require('../../../probe');

const MODE = process.argv[2] || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {signInHere} = require('../sign-in-to-buy-file-skips-payment-page/lib');
    const {flat} = require('../older-version-pdf-reader-empty/lib');
    const L = require('./lib');
    const ctx = `/index.php/${app.contextPath}`;

    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[a7] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const log = serverLog(app);
    const {page, close} = await launch(app);
    // Open an address and record what answers; never throws.
    const open = async (key, path) => {
        const from = log.mark();
        try {
            fact(key, await L.openAddress(page, app, path));
            record(`a7-${key}`, await screen(page));
            await shot(page, `a7-${key}`).catch(() => {});
        } catch (e) {
            fact(`${key} error`, flat(e.message, 300));
        }
        fact(`${key} server log`, log.since(from).map((l) => flat(l, 400)));
    };

    // Sign in as dbarnes on the page that is open when it shows the Login form; never throws.
    const signInIfLogin = async (key) => {
        try {
            if ((await page.locator('form#login').count()) === 0) {
                fact(`${key} no Login form to sign in on`, {url: page.url(), title: await page.title()});
            } else {
                fact(`${key} signed in as dbarnes`, await signInHere(page, 'dbarnes'));
                record(`a7-${key}-landed`, await screen(page));
            }
        } catch (e) {
            fact(`${key} error`, flat(e.message, 300));
        }
        await signOut(page).catch(() => {});
    };

    try {
        if (MODE === 'neighbour') {
            for (const who of ['dbarnes', L.AUTHOR[app.name]]) {
                try {
                    await signIn(page, who);
                    await open(`nb-${who}-bare-dashboard`, `${ctx}/en/dashboard`);
                } catch (e) {
                    fact(`nb-${who} error`, flat(e.message, 300));
                }
                await signOut(page).catch(() => {});
            }
            await open('nb-signed-out-submissions', `${ctx}/en/submissions`);
            await signInIfLogin('nb-submissions');
            return;
        }

        // 1: signed out, the bare dashboard address.
        await open('1-bare-dashboard', `${ctx}/en/dashboard`);
        // 2: sign in on the page that opened, when it is the Login page.
        await signInIfLogin('2');
        // 3: control, a deeper dashboard address.
        await open('3-editorial', `${ctx}/en/dashboard/editorial`);
        // 4: sign in on that Login page.
        await signInIfLogin('4');
        // Reach reads, signed out.
        await open('r-final-slash', `${ctx}/en/dashboard/`);
        await open('r-dashboard-index', `${ctx}/en/dashboard/index`);
        await open('r-no-locale', `${ctx}/dashboard`);
    } finally {
        record('a7-facts', facts);
        await close();
    }
});
