// Issue report on U55 A3: the "Notify" tab's "Send Email" window counts a person once per ticked
// role ("…send an email to 40 users…" for 20 people) and leaves out the manager's own copy. Takes
// the report's Steps on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"); the kit builds nothing.
//
// Default mode, the Steps (OJS, OMP, OPS):
//   1    `admin`: Site Settings › "Site Setup" › "Bulk Emails": tick the dataset's context, "Save"
//   2    `rvaca`: Settings › Users & Roles › "Notify"
//   3    "Author" alone: the window's total (control), "Cancel"
//   4    "Author" + "Reader": the total, "Cancel"      5  + "Copy": the total, "Cancel"
//   6    Subject and Email typed, "Save", "Send Email"  7  the emails Mailpit received
// `neighbour` as the argument (the fix in and out; runs alone, on a fresh dataset), as `rvaca`
// after step 1: "Author" alone; the manager role (rvaca's own) with "Copy"; nothing ticked;
// then an Author (`ccorino`; `aclark` on OMP) typing the recipients address the fix adds (refused).
// Each step records what it finds, never throwing.
//
// Reset first:  npm run fleet-prep -- --feature issues-u55c --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u55c PROBE_AGENT=u55c node bin/probe.js all shared/playwright/checks/issues/notify-total-counts-person-per-role/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u55c-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u55c-3_5 PROBE_AGENT=u55c node bin/probe.js all shared/playwright/checks/issues/notify-total-counts-person-per-role/walk.js
// The fix:      node bin/try-fix.js apply shared/playwright/checks/issues/notify-total-counts-person-per-role/fix.diff ojs omp ops
// Facts: .reports/<feature>/u55c/a3-facts-<mode>-<app>.json (PROBE_RUN adds its tag)
const {forEachApp, launch, signIn, signOut, screen, shot, record, serverLog, idle} = require('../../../probe');
const L = require('./lib');

const MODE = process.argv.slice(2).includes('neighbour') ? 'neighbour' : 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[a3] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 900)}`);
    };
    const snap = async (page, name) => {
        record(`a3-${MODE}-${name}`, await screen(page).catch((e) => ({error: e.message})));
        await shot(page, `a3-${MODE}-${name}`).catch(() => {});
    };
    const log = serverLog(app);
    const mark = log.mark();
    const {page, close} = await launch(app);
    try {
        // 1. The site allows the context bulk email.
        await signIn(page, 'admin');
        fact('1-bulk-emails', await L.allowBulkEmail(page, app));
        await snap(page, '1-bulk-emails');
        await signOut(page);

        // 2. The manager opens "Notify".
        await signIn(page, 'rvaca');
        const opened = await L.openNotify(page, app);
        fact('2-notify', {roles: opened.roles, copy: opened.copy, error: opened.error});
        await snap(page, '2-notify');
        if (!opened.tab) return;
        const tab = opened.tab;
        const confirm = async (key, opts) => {
            const {out, win} = await L.readConfirm(page, tab, opts);
            fact(key, out);
            await snap(page, key);
            if (opts && opts.keep) return win;
            return null;
        };

        if (MODE === 'steps') {
            // 3. "Author" alone (control).
            await tab.roleBox('Author').check().catch((e) => fact('3-error', L.flat(e.message)));
            await confirm('3-author');
            // 4. "Author" and "Reader".
            await tab.roleBox('Reader').check().catch((e) => fact('4-error', L.flat(e.message)));
            await confirm('4-author-reader');
            // 5. And "Copy".
            await tab.copyBox.check().catch((e) => fact('5-error', L.flat(e.message)));
            await confirm('5-author-reader-copy');
            // 6. Subject, Email, "Save", "Send Email".
            const subject = `u55c Library hours ${app.name} ${Date.now().toString(36)}`;
            await tab.fill({subject, body: 'The library opens at nine.'}).catch((e) => fact('6-error', L.flat(e.message)));
            const since = new Date();
            const win = await confirm('6-confirm', {keep: true});
            if (win) {
                const answer = await win.sendAndWait().catch((e) => ({error: L.flat(e.message)}));
                const sendFact = answer.error
                    ? answer
                    : {status: answer.status(), body: L.flat(await answer.text().catch(() => null)), posted: L.flat(answer.request().postData(), 400)};
                await idle(page).catch(() => {});
                sendFact.queued = L.flat(await tab.queuedLine.innerText().catch(() => null));
                fact('6-send', sendFact);
                await snap(page, '6-send');
                // 7. The emails.
                fact('7-emails', await L.sentTo(app, page, {subject, since}));
            }
        } else {
            // a. "Author" alone.
            await tab.roleBox('Author').check().catch((e) => fact('a-error', L.flat(e.message)));
            await confirm('n-a-author');
            await tab.roleBox('Author').uncheck().catch(() => {});
            // b. The manager role, which rvaca holds, with "Copy".
            await tab.roleBox(L.WORDS[app.name].manager).check().catch((e) => fact('b-error', L.flat(e.message)));
            await tab.copyBox.check().catch(() => {});
            await confirm('n-b-manager-copy');
            await tab.roleBox(L.WORDS[app.name].manager).uncheck().catch(() => {});
            await tab.copyBox.uncheck().catch(() => {});
            // c. Nothing ticked.
            await confirm('n-c-nothing');
            await signOut(page);
            // d. An Author types the recipients address of the fix.
            await signIn(page, L.WORDS[app.name].author);
            const url = `/index.php/${app.contextPath}/api/v1/_email/recipients?userGroupIds[]=1`;
            const r = await page.goto(url).catch((e) => ({error: L.flat(e.message)}));
            fact('n-d-author-recipients', r.error ? r : {status: r.status(), body: L.flat(await r.text().catch(() => null))});
        }
    } catch (e) {
        fact('error', L.flat(e.stack, 1200));
    } finally {
        fact('server-log', log.since(mark));
        record(`a3-facts-${MODE}`, facts);
        await close();
    }
});
