// Issue reports docs/issues/U63-A4-A15-… (U63 A4, A15) and docs/issues/U63-A16-… (U63 A16) {OJS OMP}: their Steps
// to reproduce, walked through the screens on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"). Every import is rvaca's (the Journal / Press manager): left menu "Tools" › "Users XML Plugin", "Upload
// File", "Import Users". The files are lib.js FILES, the Steps' text.
//
//   r1: u63ir5-short.xml (plain "abc" and an empty password) › Settings › Users & Roles › "Users" searched for
//       "u63ir5" › u63ir5short signs in with "abc" › u63ir5-fixed.xml (the same user, a valid plain password) ›
//       u63ir5short signs in with it › u63ir5-existing.xml (jjanssen, a sha1 password) › jjanssen signs in with
//       her own password › the mail to the three.
//   r2: u63ir5-new.xml (a new user, a bcrypt at cost 12) › u63ir5new signs in with the original password ›
//       u63ir5-ten.xml (a new user, a bcrypt at cost 10: the A4/A15 report's control, which today gets a new
//       password and the registration email on PHP 8.4, and keeps its password under the A16 report's fix) ›
//       the mail to both.
// Arguments pick the parts (default: r1 r2). OPS has no Users XML Plugin: the script records its Tools list.
// The kit builds nothing; besides the screens the script reads the users table, Mailpit and the server log.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir5 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir5 PROBE_AGENT=ir5 node bin/probe.js all shared/playwright/checks/issues/users-import-refused-password-creates-account/walk.js [r1] [r2]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir5-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir5-3_5 PROBE_AGENT=ir5 node bin/probe.js all shared/playwright/checks/issues/users-import-refused-password-creates-account/walk.js
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, record, idle} = require('../../../probe');
const S = require('../users-import-unreadable-file-empty-results/lib');
const L = require('./lib');

const args = process.argv.slice(2).filter((a) => /^(r1|r2)$/.test(a));
const parts = args.length ? args : ['r1', 'r2'];

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset)');
    const started = new Date(Date.now() - 2000);
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, parts};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${L.flat(JSON.stringify(v), 1500)}`); };
    const snap = S.snapper(`w-${parts.join('-')}`);
    const {page, close} = await launch(app);
    const asManager = () => signIn(page, 'rvaca');
    const importFile = async (name) => {
        await S.openUsersTool(app, page);
        const res = await S.importUsers(app, page, L.writeFile(name, app.line));
        res.snap = await snap(page, `results-${name.replace(/\W+/g, '-')}`);
        fact(`import ${name}`, res);
    };
    try {
        await asManager();
        try {
            fact('php', execFileSync('php', ['-r', 'echo PHP_VERSION;']).toString());
        } catch { /* informational */ }
        if (app.name === 'ops') {
            await page.goto(app.url(`/index.php/${app.contextPath}/en/management/tools`));
            await idle(page).catch(() => {});
            fact('ops tools list', {usersTool: await page.getByRole('link', {name: 'Users XML Plugin', exact: true}).count(), label: await snap(page, 'ops-tools')});
            return;
        }
        if (parts.includes('r1')) {
            // A refused password.
            await importFile('u63ir5-short.xml');
            const list = await S.usersList(app, page, 'u63ir5');
            list.snap = await snap(page, 'users-after-short');
            fact('r1 users list after short', list);
            fact('r1 u63ir5short signs in with "abc"', await L.trySignIn(page, 'u63ir5short', 'abc'));
            await asManager();
            await importFile('u63ir5-fixed.xml');
            fact('r1 u63ir5short signs in with "u63ir5shortpass"', await L.trySignIn(page, 'u63ir5short', 'u63ir5shortpass'));
            // An existing account.
            await asManager();
            await importFile('u63ir5-existing.xml');
            fact('r1 jjanssen signs in with her own password', await L.trySignIn(page, 'jjanssen', 'jjanssenjjanssen'));
            fact('r1 stored (sql)', L.stored(app, ['u63ir5short', 'u63ir5empty', 'jjanssen']));
        }
        if (parts.includes('r2')) {
            await asManager();
            await importFile('u63ir5-new.xml');
            fact('r2 u63ir5new signs in with the original password', await L.trySignIn(page, 'u63ir5new', 'u63ir5newu63ir5new'));
            await asManager();
            await importFile('u63ir5-ten.xml');
            fact('r2 stored (sql)', L.stored(app, ['u63ir5new', 'u63ir5ten']));
        }
        // Mail: the cost-10 neighbour's registration email bounds the wait (job_runner runs on web requests).
        if (parts.includes('r2')) {
            await app.mail.find({to: 'u63ir5ten@mailinator.com', timeoutMs: 30_000}).catch((e) => fact('mail control', L.flat(e.message, 200)));
        } else {
            await new Promise((r) => setTimeout(r, 8000));
        }
        const mail = {};
        for (const u of ['u63ir5short', 'u63ir5empty', 'jjanssen', 'u63ir5new', 'u63ir5ten']) mail[u] = await L.mailSince(app, `${u}@mailinator.com`, started);
        fact('mail since the walk began', mail);
    } finally {
        record(`w-${parts.join('-')}-facts`, facts);
        await close();
    }
});
