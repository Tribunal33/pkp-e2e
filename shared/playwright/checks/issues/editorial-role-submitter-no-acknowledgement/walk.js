// Issue report walk: docs/issues/U21-A7-OPS5-editorial-role-submitter-no-acknowledgement.md
// (spec U21 register A7, OPS5). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"):
//   1-9  dbarnes ("Journal editor", "Press editor", "Preprint Server manager",
//        his only role in publicknowledge) submits "u21w34 Editor's Own Paper"
//        through the wizard (submit.js) and reads "Submission complete"
//   10   dbarnes@mailinator.com's mailbox (Mailpit, this run's messages only)
// CONTROL (the default; CONTROL=0 skips it): the same steps as an Author
// (ccorino; OMP aclark), "u21w34 Author's Own Paper": the acknowledgement arrives.
// NEIGHBOUR=1 (the fix's neighbour check): rvaca first sets Settings › Workflow ›
// "Emails" › "Submission Confirmation" to "Do not send an email." and saves;
// then dbarnes and the Author submit as above: neither may get an acknowledgement.
// OTHERS_DRAFT=1 (the case the fix changes besides the steps): the Author fills
// "u21w34 Author's Draft" up to "Review" without submitting, then rvaca (a
// manager) opens that draft's wizard and presses "Submit"; the Author and rvaca
// must each get a message of their own (on OPS rvaca the can-post text).
// The kit builds nothing. Besides the screens it reads, from the database, each
// submission's stage assignments and email log (Evidence only).
//
// Reset first:  npm run fleet-prep -- --feature issues-w34 --dataset 7 --reset
// Run (main):   PROBE_FEATURE=issues-w34 PROBE_AGENT=w34 node bin/probe.js all shared/playwright/checks/issues/editorial-role-submitter-no-acknowledgement/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w34-3_5 PROBE_AGENT=w34 node bin/probe.js all <this file>
// Facts: .reports/<feature>/w34/r1-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');
const {submitThroughWizard, flat, pause} = require('./submit.js');

const TAG = 'u21w34';
const AUTHOR = {ojs: 'ccorino', omp: 'aclark', ops: 'ccorino'};
const CONTEXT = {ojs: 'Journal of Public Knowledge', omp: 'Public Knowledge Press', ops: 'Public Knowledge Preprint Server'};

// Settings › Workflow › "Emails": "Submission Confirmation" to the label given; Save.
async function setSubmissionConfirmation(app, page, label, rec) {
    const loc = ['main', 'stable-3_5_0'].includes(app.line || 'main') ? '/en' : '';
    await page.goto(app.url(`/index.php/${app.contextPath}${loc}/management/settings/workflow`));
    await idle(page);
    await page.getByRole('tab', {name: 'Emails', exact: true}).click();
    await idle(page);
    const panel = page.locator('#emails');
    await panel.locator('input[name="submissionAcknowledgement"]').first().waitFor({timeout: 30_000});
    await panel.getByRole('radio', {name: label, exact: true}).and(panel.locator('[name="submissionAcknowledgement"]')).check();
    await rec(page, 'n2-emails-filled');
    const resp = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 20_000}).catch(() => null);
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await resp;
    const saved = await panel.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
    await idle(page);
    await rec(page, 'n2-emails-saved');
    return {status: r ? r.status() : null, saved};
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const neighbour = !!process.env.NEIGHBOUR;
    const control = process.env.CONTROL !== '0';
    const started = new Date(Date.now() - 2000);
    const facts = {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, neighbour, startedAt: started.toISOString()};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${flat(JSON.stringify(v), 1500)}`); };
    let n = 0;
    const rec = async (page, label) => {
        const name = `r1-${String(++n).padStart(2, '0')}-${label}`;
        try { const s = await screen(page); record(name, s); await shot(page, name).catch(() => {}); return s; }
        catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); return null; }
    };
    const errors = [];
    const watch = (page, who) => {
        page.on('pageerror', (e) => errors.push({who, kind: 'pageerror', text: flat(e.message, 300)}));
        page.on('response', (r) => { if (r.status() >= 400) errors.push({who, kind: 'http', text: `${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '').replace(/csrfToken=[^&]+/, 'csrf').slice(0, 200)}`}); });
    };
    // This run's messages to one address that name this walk's submissions (the
    // slot's Mailpit also holds other fleets' mail to the same dataset addresses).
    const mails = async (to) => {
        const r = await app.mail._search({to});
        return (r.messages || [])
            .filter((m) => new Date(m.Created) >= started && String(m.Snippet || '').includes(TAG))
            .map((m) => ({subject: m.Subject, to: (m.To || []).map((a) => a.Address), snippet: flat(m.Snippet, 300), created: m.Created}));
    };
    const ackRe = new RegExp(`^Thank you for your submission to ${CONTEXT[app.name]}$`);
    const db = (id) => ({
        stageAssignments: sql(app, `select string_agg(u.username || ' as ' || (select setting_value from user_group_settings where user_group_id = sa.user_group_id and setting_name = 'name' and locale = 'en'), ', ' order by sa.stage_assignment_id) from stage_assignments sa join users u using (user_id) where sa.submission_id = ${id}`),
        emailLog: sql(app, `select string_agg(coalesce(event_type::text,'') || ' to ' || coalesce(recipients,'') || ' bcc ' || coalesce(bcc_recipients,'') || ': ' || coalesce(subject,''), ' | ' order by log_id) from email_log where assoc_type = 1048585 and assoc_id = ${id}`),
        contributors: sql(app, `select count(*) from authors where publication_id = (select current_publication_id from submissions where submission_id = ${id})`),
    });

    try {
        if (neighbour) {
            const {page, close} = await launch(app);
            watch(page, 'rvaca');
            try {
                await signIn(page, 'rvaca');
                fact('n1-2 setting off', await setSubmissionConfirmation(app, page, 'Do not send an email.', rec));
                fact('n setting (db)', sql(app, `select setting_value from ${app.contextTables.settings} where setting_name = 'submissionAcknowledgement'`));
                await signOut(page);
            } finally { await close(); }
        }

        const run = async (who, title, label) => {
            const {page, close} = await launch(app);
            watch(page, who);
            page.setDefaultTimeout(30_000);
            try {
                await signIn(page, who);
                const r = await submitThroughWizard(app, page, {title, rec, label});
                await signOut(page);
                return r;
            } finally { await close(); }
        };

        if (process.env.OTHERS_DRAFT) {
            const who = AUTHOR[app.name];
            let draft;
            {
                const {page, close} = await launch(app);
                watch(page, who);
                page.setDefaultTimeout(30_000);
                try {
                    await signIn(page, who);
                    draft = await submitThroughWizard(app, page, {title: `${TAG} Author's Draft`, rec, label: 'd', stopAtReview: true});
                    fact(`draft by ${who}`, draft);
                    await signOut(page);
                } finally { await close(); }
            }
            const {page, close} = await launch(app);
            watch(page, 'rvaca');
            page.setDefaultTimeout(30_000);
            try {
                await signIn(page, 'rvaca');
                fact('rvaca submitted the draft', await submitThroughWizard(app, page, {rec, label: 'm', existingId: draft.id}));
                await signOut(page);
            } finally { await close(); }
            await pause(3000);
            fact(`mail to ${who}`, await mails(`${who}@mailinator.com`));
            fact('mail to rvaca', await mails('rvaca@mailinator.com'));
            fact('db (Evidence)', {draft: db(draft.id)});
            return;
        }

        // Steps 1-9: dbarnes.
        const own = await run('dbarnes', `${TAG} Editor's Own Paper`, 's');
        fact('steps 1-9 dbarnes submitted', own);
        // Control: an Author.
        let ctl = null;
        if (control) {
            ctl = await run(AUTHOR[app.name], `${TAG} Author's Own Paper`, 'c');
            fact(`control ${AUTHOR[app.name]} submitted`, ctl);
        }

        // Step 10: the mailboxes (Mail::send runs in the submit request).
        await pause(3000);
        const toDbarnes = await mails('dbarnes@mailinator.com');
        fact('step 10 mail to dbarnes', {acknowledgements: toDbarnes.filter((m) => ackRe.test(m.subject)), all: toDbarnes});
        if (ctl) {
            const toAuthor = await mails(`${AUTHOR[app.name]}@mailinator.com`);
            fact(`control mail to ${AUTHOR[app.name]}`, {acknowledgements: toAuthor.filter((m) => ackRe.test(m.subject)), all: toAuthor});
        }
        fact('db (Evidence)', {own: db(own.id), control: ctl ? db(ctl.id) : null,
            dbarnesGroups: sql(app, `select string_agg(s.setting_value || ' (role ' || g.role_id || ')', ', ') from user_user_groups uug join user_groups g using (user_group_id) join user_group_settings s on s.user_group_id = g.user_group_id and s.setting_name = 'name' and s.locale = 'en' where uug.user_id = (select user_id from users where username = 'dbarnes')`),
            setting: sql(app, `select setting_value from ${app.contextTables.settings} where setting_name = 'submissionAcknowledgement'`)});
    } catch (e) {
        fact('walk error', flat(e.stack || e.message, 800));
    } finally {
        fact('errors', errors);
        record('r1-facts', facts);
    }
});
