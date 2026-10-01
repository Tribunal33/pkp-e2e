// Issue reports docs/issues/U63-A13-users-import-unreadable-file-empty-results.md (U63 A13) and
// docs/issues/U63-A21-users-import-stops-at-user-without-registration-date.md (U63 A21) {OJS OMP}: their Steps to
// reproduce, walked through the screens on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets").
//
//   as rvaca (the Journal / Press manager): left menu "Tools" › "Users XML Plugin"; "Import Users" with a file
//   uploaded into "File"; then Settings › Users & Roles › "Users" searched for "u63ir4".
//   a13:     u63ir4-nopassword.xml, u63ir4-unknown.xml, u63ir4-notusers.txt (files the import cannot read)
//   a21:     u63ir4-nodate.xml (three users, the second without <date_registered>)
//   control: u63ir4-good.xml (a file the import reads; the neighbour check for both fixes)
//   neighbour: u63ir4-mismatch.xml (dbarnes's username with another address: its own refusal line stays)
// Arguments pick the parts (default: all three, in that order). The files are lib.js files(line), the Steps' text.
// OPS has no Users XML Plugin: the script records that its Tools list lacks the tool.
// The kit builds nothing; besides the screens the script reads the users table and the server log (Evidence only).
//
// Reset first:  npm run fleet-prep -- --feature issues-ir4 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir4 PROBE_AGENT=ir4 node bin/probe.js all shared/playwright/checks/issues/users-import-unreadable-file-empty-results/walk.js [a13] [a21] [control] [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir4-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir4-3_5 PROBE_AGENT=ir4 node bin/probe.js all shared/playwright/checks/issues/users-import-unreadable-file-empty-results/walk.js
const {forEachApp, launch, signIn, record, idle} = require('../../../probe');
const L = require('./lib');

const args = process.argv.slice(2).filter((a) => /^(a13|a21|control|neighbour)$/.test(a));
const parts = args.length ? args : ['a13', 'a21', 'control'];
const FILES = {a13: ['u63ir4-nopassword.xml', 'u63ir4-unknown.xml', 'u63ir4-notusers.txt'], a21: ['u63ir4-nodate.xml'], control: ['u63ir4-good.xml'], neighbour: ['u63ir4-mismatch.xml']};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, parts};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${L.flat(JSON.stringify(v), 1500)}`); };
    const snap = L.snapper(`w-${parts.join('-')}`);
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        if (app.name === 'ops') {
            await page.goto(app.url(`/index.php/${app.contextPath}/en/management/tools`));
            await idle(page).catch(() => {});
            fact('ops tools list', {usersTool: await page.getByRole('link', {name: 'Users XML Plugin', exact: true}).count(), label: await snap(page, 'ops-tools')});
            return;
        }
        for (const part of parts) {
            for (const name of FILES[part]) {
                await L.openUsersTool(app, page);
                const res = await L.importUsers(app, page, L.writeFile(app, name));
                res.snap = await snap(page, `results-${name.replace(/\W+/g, '-')}`);
                fact(`${part} ${name}`, res);
            }
            const list = await L.usersList(app, page, 'u63ir4');
            list.snap = await snap(page, `users-${part}`);
            fact(`${part} users list`, list);
        }
        fact('accounts (sql)', L.accounts(app, 'u63ir4'));
    } finally {
        record(`w-${parts.join('-')}-facts`, facts);
        await close();
    }
});
