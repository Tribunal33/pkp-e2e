// Issue report walk: docs/issues/U21-A7-completion-screen-claims-unsent-email.md
// (spec U21 register A7). Takes the report's Steps through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"):
//   1-2  rvaca: Settings › Workflow › "Emails" › "Submission Confirmation" →
//        "Do not send an email.", "Save"
//   3-5  an Author (ccorino; OMP aclark) submits "u21w34 Quiet Submission"
//        through the wizard (../editorial-role-submitter-no-acknowledgement/submit.js)
//        and reads "Submission complete"
//   6    the Author's mailbox (Mailpit, this run's messages naming the submission)
// NEIGHBOUR=1 (the fix's neighbour check): steps 1-2 are skipped, so the
// setting stays at the dataset's "all authors": the screen must still say a
// confirmation was emailed, and the email must arrive.
// The kit builds nothing. Besides the screens it reads, from the database, the
// setting and the submission's email log (Evidence only).
//
// Reset first:  npm run fleet-prep -- --feature issues-w34 --dataset 7 --reset
// Run (main):   PROBE_FEATURE=issues-w34 PROBE_AGENT=w34 node bin/probe.js all shared/playwright/checks/issues/completion-screen-claims-unsent-email/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w34-3_5 PROBE_AGENT=w34 node bin/probe.js all <this file>
// Facts: .reports/<feature>/w34/r2-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');
const {submitThroughWizard, flat, pause} = require('../editorial-role-submitter-no-acknowledgement/submit.js');

const TAG = 'u21w34';
const AUTHOR = {ojs: 'ccorino', omp: 'aclark', ops: 'ccorino'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const neighbour = !!process.env.NEIGHBOUR;
    const loc = ['main', 'stable-3_5_0'].includes(app.line || 'main') ? '/en' : '';
    const started = new Date(Date.now() - 2000);
    const facts = {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, neighbour, startedAt: started.toISOString()};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${flat(JSON.stringify(v), 1500)}`); };
    let n = 0;
    const rec = async (page, label) => {
        const name = `r2-${String(++n).padStart(2, '0')}-${label}`;
        try { const s = await screen(page); record(name, s); await shot(page, name).catch(() => {}); return s; }
        catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); return null; }
    };
    const errors = [];
    const watch = (page, who) => {
        page.on('pageerror', (e) => errors.push({who, kind: 'pageerror', text: flat(e.message, 300)}));
        page.on('response', (r) => { if (r.status() >= 400) errors.push({who, kind: 'http', text: `${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '').replace(/csrfToken=[^&]+/, 'csrf').slice(0, 200)}`}); });
    };
    const setting = () => sql(app, `select setting_value from ${app.contextTables.settings} where setting_name = 'submissionAcknowledgement'`);

    try {
        // Steps 1-2: rvaca turns the acknowledgement off.
        if (!neighbour) {
            const {page, close} = await launch(app);
            watch(page, 'rvaca');
            try {
                await signIn(page, 'rvaca');
                await page.goto(app.url(`/index.php/${app.contextPath}${loc}/management/settings/workflow`));
                await idle(page);
                await page.getByRole('tab', {name: 'Emails', exact: true}).click();
                await idle(page);
                const panel = page.locator('#emails');
                await panel.locator('input[name="submissionAcknowledgement"]').first().waitFor({timeout: 30_000});
                const options = await panel.locator('input[name="submissionAcknowledgement"]').evaluateAll((els) => els.map((e) => ((e.closest('label') || {}).innerText || e.value).replace(/\s+/g, ' ').trim()));
                await panel.getByRole('radio', {name: 'Do not send an email.', exact: true}).and(panel.locator('[name="submissionAcknowledgement"]')).check();
                await rec(page, 's2-emails-filled');
                const resp = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 20_000}).catch(() => null);
                await panel.getByRole('button', {name: 'Save', exact: true}).click();
                const r = await resp;
                const saved = await panel.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
                await idle(page);
                await rec(page, 's2-emails-saved');
                fact('steps 1-2 setting', {options, status: r ? r.status() : null, saved, db: setting()});
                await signOut(page);
            } finally { await close(); }
        }

        // Steps 3-5: the Author submits.
        const who = AUTHOR[app.name];
        let sub;
        {
            const {page, close} = await launch(app);
            watch(page, who);
            page.setDefaultTimeout(30_000);
            try {
                await signIn(page, who);
                sub = await submitThroughWizard(app, page, {title: `${TAG} Quiet Submission`, rec, label: 's4'});
                fact(`steps 3-5 ${who} submitted`, sub);
                await signOut(page);
            } finally { await close(); }
        }

        // Step 6: the mailbox.
        await pause(3000);
        const r = await app.mail._search({to: `${who}@mailinator.com`});
        const mine = (r.messages || []).filter((m) => new Date(m.Created) >= started && String(m.Snippet || '').includes(TAG))
            .map((m) => ({subject: m.Subject, snippet: flat(m.Snippet, 300), created: m.Created}));
        fact(`step 6 mail to ${who}`, mine);
        fact('db (Evidence)', {setting: setting(),
            emailLog: sql(app, `select string_agg(coalesce(event_type::text,'') || ' to ' || coalesce(recipients,'') || ': ' || coalesce(subject,''), ' | ' order by log_id) from email_log where assoc_type = 1048585 and assoc_id = ${sub.id}`)});
    } catch (e) {
        fact('walk error', flat(e.stack || e.message, 800));
    } finally {
        fact('errors', errors);
        record('r2-facts', facts);
    }
});
