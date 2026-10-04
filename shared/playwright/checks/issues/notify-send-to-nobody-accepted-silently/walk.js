// Issue report on U55 A4: on the "Notify" tab, a send to roles nobody holds is accepted: "Saved"
// beside the button, the form stays as typed, nothing is sent and nothing says so; with "Copy"
// ticked the "queued" line shows and only the manager's own copy goes out. Takes the report's
// Steps on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"); the kit
// builds nothing. "Editorial Board Member" has no member in the dataset of any of the three apps.
//
// Default mode, the Steps (OJS, OMP, OPS):
//   1    `admin`: Site Settings › "Site Setup" › "Bulk Emails": tick the dataset's context, "Save"
//   2    `rvaca`: Settings › Users & Roles › "Notify"
//   3-4  "Editorial Board Member", "Copy" unticked, Subject and Email typed, "Save", "Send Email"
//   5-6  the page opened again; the same with "Copy" ticked, "Save", "Send Email"
//   7    the emails Mailpit received with that subject
// `neighbour` as the argument (the fix in and out; runs alone, on a fresh dataset), as `rvaca`
// after step 1: "Author" and "Editorial Board Member" together, "Copy" unticked: must still be
// queued and reach every Author.
// Each step records what it finds, never throwing.
//
// Reset first:  npm run fleet-prep -- --feature issues-u55d --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u55d PROBE_AGENT=u55d node bin/probe.js all shared/playwright/checks/issues/notify-send-to-nobody-accepted-silently/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u55d-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u55d-3_5 PROBE_AGENT=u55d node bin/probe.js all shared/playwright/checks/issues/notify-send-to-nobody-accepted-silently/walk.js
// The fix:      node bin/try-fix.js apply shared/playwright/checks/issues/notify-send-to-nobody-accepted-silently/fix.diff ojs omp ops
// Facts: .reports/<feature>/u55d/a4-facts-<mode>-<app>.json (PROBE_RUN adds its tag)
const {forEachApp, launch, signIn, signOut, screen, shot, record, serverLog, idle, sql} = require('../../../probe');
// The U55 A3 walk's helpers: allow bulk email, open "Notify", read the window, count the mail.
const L = require('../notify-total-counts-person-per-role/lib');

const MODE = process.argv.slice(2).includes('neighbour') ? 'neighbour' : 'steps';
const NOBODY = 'Editorial Board Member';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[a4] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 900)}`);
    };
    const snap = async (page, name) => {
        record(`a4-${MODE}-${name}`, await screen(page).catch((e) => ({error: e.message})));
        await shot(page, `a4-${MODE}-${name}`).catch(() => {});
    };
    const batches = () => {
        try {
            return sql(app, 'select count(*), coalesce(sum(total_jobs),0) from job_batches');
        } catch (e) {
            return L.flat(e.message);
        }
    };
    const log = serverLog(app);
    const mark = log.mark();
    const {page, close} = await launch(app);
    const tagged = `Board meeting u55d ${app.name} ${Date.now().toString(36)}`;
    const body = 'The board meets on Friday.';

    /** Tick the roles (and "Copy"), type, "Save", read the window, "Send Email", read the form. */
    const sendOnce = async (key, tab, {roles, copy}) => {
        for (const role of roles) {
            await tab.roleBox(role).check().catch((e) => fact(`${key}-error-${role}`, L.flat(e.message)));
        }
        if (copy) await tab.copyBox.check().catch((e) => fact(`${key}-error-copy`, L.flat(e.message)));
        await tab.fill({subject: tagged, body}).catch((e) => fact(`${key}-error-fill`, L.flat(e.message)));
        const {out, win} = await L.readConfirm(page, tab, {keep: true});
        fact(`${key}-window`, out);
        await snap(page, `${key}-window`);
        if (!win) return;
        const answer = await win.sendAndWait().catch((e) => ({error: L.flat(e.message)}));
        const after = answer.error
            ? {...answer}
            : {status: answer.status(), body: L.flat(await answer.text().catch(() => null)), posted: L.flat(answer.request().postData(), 400)};
        // Read at once: "Saved" lasts five seconds.
        after.saved = await tab.savedStatus.isVisible().catch(() => null);
        after.queued = L.flat(await tab.queuedLine.innerText({timeout: 2_000}).catch(() => null));
        after.formShown = await tab.form.isVisible().catch(() => null);
        after.footer = L.flat(await tab.footer.innerText({timeout: 2_000}).catch(() => null));
        after.rolesError = L.flat(await tab.fieldError(tab.rolesField).first().innerText({timeout: 2_000}).catch(() => null));
        after.subject = await tab.subject.inputValue({timeout: 2_000}).catch(() => null);
        after.submitDisabled = await tab.submitButton.isDisabled({timeout: 2_000}).catch(() => null);
        after.batches = batches();
        await snap(page, `${key}-sent`);
        await idle(page).catch(() => {});
        fact(`${key}-send`, after);
    };

    try {
        fact('0-batches', batches());
        // 1. The site allows the context bulk email.
        await signIn(page, 'admin');
        fact('1-bulk-emails', await L.allowBulkEmail(page, app));
        await snap(page, '1-bulk-emails');
        await signOut(page);

        // 2. The manager opens "Notify".
        await signIn(page, 'rvaca');
        let opened = await L.openNotify(page, app);
        fact('2-notify', {roles: opened.roles, copy: opened.copy, error: opened.error});
        await snap(page, '2-notify');
        if (!opened.tab) return;
        const since = new Date();

        if (MODE === 'steps') {
            // 3-4. The role nobody holds, "Copy" unticked.
            await sendOnce('4', opened.tab, {roles: [NOBODY], copy: false});
            // 5-6. The page opened again; the same with "Copy" ticked.
            opened = await L.openNotify(page, app);
            if (opened.error) fact('5-notify', opened);
            if (opened.tab) await sendOnce('6', opened.tab, {roles: [NOBODY], copy: true});
            // 7. The emails.
            fact('7-emails', await L.sentTo(app, page, {subject: tagged, since, timeoutMs: 45_000}));
        } else {
            // A role with members beside the role nobody holds: still queued, every Author mailed.
            await sendOnce('n', opened.tab, {roles: ['Author', NOBODY], copy: false});
            fact('n-emails', await L.sentTo(app, page, {subject: tagged, since}));
        }
    } catch (e) {
        fact('error', L.flat(e.stack, 1200));
    } finally {
        fact('server-log', log.since(mark));
        record(`a4-facts-${MODE}`, facts);
        await close();
    }
});
