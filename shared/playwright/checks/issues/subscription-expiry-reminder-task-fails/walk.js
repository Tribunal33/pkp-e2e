// Issue report walks: docs/issues/U51-A27-subscription-expiry-reminder-task-fails.md
// (spec U51 register A27) and, with the argument `a8`,
// docs/issues/U51-A8-subscription-expiry-reminders-monthly.md (register A8).
// Takes the reports' Steps through the screens on a dataset fleet (PKP's
// default test dataset, harness.md "Dataset fleets"), OJS only (OMP and OPS
// have no subscriptions): signed in as the dataset's Journal Manager `rvaca`
// on `publicknowledge`, it switches the journal to subscriptions, creates a
// subscription type, the subscription policies with "1 Months" before expiry
// and the subscriptions on screen, then runs the reminder task the way the
// site's scheduler runs it (`php lib/pkp/tools/scheduler.php test --name=…`,
// in the app root, under the fleet's config) and reads the subscribers'
// mailboxes. The kit builds nothing. Every screen is recorded with screen().
//
// Arguments (after the script):
//   (none)      A27's Steps: one subscription (ccorino) ending a month from today.
//   a8          the run under A8's Observed (with A27's fix applied): also
//               ckwantes ending a day earlier, and the scheduler's list
//               before the run.
//   disabled    the neighbour check: A27's Steps with every reminder list
//               left "Disabled" (the task must finish and send nothing).
//   schedule    A8's Steps: only the scheduler's list, on the freshly loaded
//               dataset (no browser, no subscription).
//
// Reset the fleet before each walk (the walk changes the dataset):
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/subscription-expiry-reminder-task-fails/walk.js [a8|disabled]
//   PKP_E2E_LINE=stable-3_5_0 … the same with --feature issues-3_5 and PROBE_RUN=r35
const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, record, idle, sql} = require('../../../probe');

const MODE = process.argv[2] || 'a27';
if (!['a27', 'a8', 'disabled', 'schedule'].includes(MODE)) throw new Error(`unknown mode ${MODE}`);
const TAG = 'u51w1';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

// Dates in UTC, the dataset config's time zone.
const iso = (d) => d.toISOString().slice(0, 10);
const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
function addMonths(d, n) {
    const r = new Date(d);
    r.setUTCMonth(r.getUTCMonth() + n);
    return r;
}
function addDays(d, n) {
    const r = new Date(d);
    r.setUTCDate(r.getUTCDate() + n);
    return r;
}

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        record('skipped', {reason: 'no subscriptions on this app'});
        return;
    }
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    if (MODE === 'schedule') {
        let out;
        try {
            out = execFileSync('php', ['lib/pkp/tools/scheduler.php', 'list'], {cwd: app.root, env: {...process.env, PKP_CONFIG_FILE: app.configFile}, encoding: 'utf8', timeout: 120_000});
        } catch (e) {
            out = `${e.stdout || ''} ${e.stderr || ''}`;
        }
        const lines = out.split('\n').map((l) => l.trim()).filter((l) => /\\task/.test(l));
        console.log(`[${app.name}] schedule: ${JSON.stringify(lines)}`);
        record('schedule-facts', {line: app.line || 'main', lines});
        return;
    }
    const {AccessSettings, PaymentsPage} = require('../../../pages/SubscriptionsPages.js');
    const facts = {mode: MODE, line: app.line || 'main', today: iso(today)};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 800)}`); };
    const cp = app.contextPath;
    const subs = [{username: 'ccorino', end: iso(addMonths(today, 1))}];
    if (MODE === 'a8') subs.push({username: 'ckwantes', end: iso(addDays(addMonths(today, 1), -1))});
    for (const s of subs) {
        s.start = iso(addMonths(new Date(s.end + 'T00:00:00Z'), -12));
        s.userId = Number(sql(app, `SELECT user_id FROM users WHERE username = '${s.username}'`));
        s.email = sql(app, `SELECT email FROM users WHERE username = '${s.username}'`);
    }
    fact('subscriptions', subs);

    const {page, close} = await launch(app);
    let n = 0;
    async function snap(name) {
        const s = await screen(page);
        record(`${MODE}-${String(++n).padStart(2, '0')}-${name}`, s);
        return s;
    }
    try {
        // 1. Sign in as the Journal Manager.
        await signIn(page, 'rvaca');

        // 2. Settings › Distribution › "Access": subscriptions.
        const access = new AccessSettings(page, cp);
        await access.goto();
        await access.modeRadio('The journal will require subscriptions to access some or all of its contents.').check();
        const accessSave = await access.save();
        fact('accessSave', accessSave.status());
        await snap('access-saved');

        // 3. The "Payments" page by its address.
        const pay = new PaymentsPage(page, cp);
        await pay.goto();
        await snap('payments');

        // 4. "Subscription Types" › "Create New Subscription Type".
        await pay.showTab('Subscription Types');
        const type = await pay.openCreateType();
        await type.fill({name: `${TAG} Online`, currency: 'USD', cost: '40', format: 'Online', duration: '12'});
        await type.kindRadio('Individual').check().catch(async () => {
            await type.dialog.locator('input#individual, input[name="institutional"][value="0"]').first().check();
        });
        await snap('type-filled');
        const typeSave = await type.saveAccepted();
        fact('typeSave', typeSave.status());
        await snap('type-saved');

        // 5. "Subscription Policies": the contact and, except in the neighbour
        //    check, "1 Months" before expiry.
        await pay.showTab('Subscription Policies');
        const pol = pay.policies();
        await pol.nameBox().fill(`${TAG} Subscriptions Desk`);
        await pol.emailBox().fill(`${TAG}desk@mailinator.com`);
        await pol.addressBox().fill('1 Main Street');
        const months = pol.panel.locator('select[name="numMonthsBeforeSubscriptionExpiryReminder"]');
        fact('monthsOptions', (await months.locator('option').allInnerTexts()).map((t) => t.trim()));
        if (MODE !== 'disabled') await months.selectOption({label: '1 Months'});
        const polSave = await pol.save();
        fact('policiesSave', polSave.status());
        await snap('policies-saved');
        await pay.gotoTab('Subscription Policies');
        fact('policiesStored', {
            name: await pol.nameBox().inputValue(),
            email: await pol.emailBox().inputValue(),
            beforeMonths: await months.locator('option:checked').innerText().catch(() => null),
        });

        // 6. "Individual Subscriptions" › "Create New Subscription", one per subscriber.
        for (const s of subs) {
            await pay.gotoTab('Individual Subscriptions');
            const win = await pay.openCreateSubscription('Individual Subscriptions');
            await win.chooseUser(s.username, s.userId);
            await win.chooseType(`${TAG} Online`);
            await win.chooseStatus('Active');
            await win.typeDate('dateStart', s.start);
            await win.typeDate('dateEnd', s.end);
            await snap(`subscription-${s.username}-filled`);
            const r = await win.saveAccepted();
            fact(`subscriptionSave_${s.username}`, r.status());
        }
        await pay.gotoTab('Individual Subscriptions');
        await idle(page);
        await snap('subscriptions-listed');
        fact('listedRows', (await pay.rows('Individual Subscriptions').allInnerTexts()).map((t) => flat(t, 300)));
        fact('stored', sql(app, `SELECT u.username, s.status, s.date_start, s.date_end FROM subscriptions s JOIN users u ON u.user_id = s.user_id ORDER BY s.subscription_id`).split('\n'));
    } finally {
        await close();
    }

    // 7. On the server, as the site's scheduler runs it.
    const env = {...process.env, PKP_CONFIG_FILE: app.configFile};
    function php(args) {
        const started = Date.now();
        try {
            const out = execFileSync('php', args, {cwd: app.root, env, encoding: 'utf8', timeout: 180_000, stdio: ['ignore', 'pipe', 'pipe']});
            return {exit: 0, out: flat(out), ms: Date.now() - started};
        } catch (e) {
            return {exit: e.status, out: flat(`${e.stdout || ''} ${e.stderr || ''}`), ms: Date.now() - started};
        }
    }
    if (MODE === 'a8') {
        const list = php(['lib/pkp/tools/scheduler.php', 'list']);
        fact('schedulerList', {exit: list.exit, lines: list.out.split(/(?=\s(?:\d|\*)[\d*,/-]* [\d*,/-]+ [\d*,/-]+ [\d*,/-]+ [\d*,/-]+\s)/).map((l) => l.trim()).filter((l) => /Reminder|Notification|Deposit|UsageStats/.test(l))});
        fact('schedulerListRaw', list.out);
    }
    const logDir = path.join(fs.readFileSync(app.configFile, 'utf8').match(/^files_dir\s*=\s*(.+)$/m)[1].trim(), 'scheduledTaskLogs');
    const before = new Set(fs.existsSync(logDir) ? fs.readdirSync(logDir) : []);
    const since = new Date();
    const run = php(['lib/pkp/tools/scheduler.php', 'test', '--name=APP\\tasks\\SubscriptionExpiryReminder']);
    fact('taskRun', run);
    const logs = (fs.existsSync(logDir) ? fs.readdirSync(logDir) : []).filter((f) => !before.has(f) && /SubscriptionExpiryReminder/.test(f));
    fact('taskLog', logs.map((f) => ({file: f, text: flat(fs.readFileSync(path.join(logDir, f), 'utf8'), 1500)})));

    // 8. The subscribers' mailboxes (this walk's messages only).
    await pause(3000);
    for (const s of subs) {
        const result = await app.mail._search({to: s.email});
        const mine = (result.messages || []).filter((m) => new Date(m.Created) >= since);
        const out = [];
        for (const m of mine) {
            const full = await app.mail.fullMessage(m.ID);
            out.push({subject: full.Subject, from: full.From, to: full.To, text: flat(full.Text, 600)});
        }
        fact(`mail_${s.username}`, out);
    }
    record(`${MODE}-facts`, facts);
});
