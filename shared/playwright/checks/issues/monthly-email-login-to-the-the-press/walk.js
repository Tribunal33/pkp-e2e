// Issue report docs/issues/U65-A11-monthly-email-login-to-the-the-press.md (U65 A11): the report's
// Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"). The steps create nothing.
//
// Default mode, as `rvaca` (the context's manager):
//   steps 1-4: Settings › Workflow › "Emails" › "Add and edit templates", search "Statistics Report
//     Notification", its "Edit": the body editor's HTML and its "Login to …" sentence. The template
//     GET the screen itself sends (emailTemplates/ or mailables/STATISTICS_REPORT_NOTIFICATION) is
//     kept too, every language's body in it.
//   steps 5-6: the team's own command-line tool runs the routine task now
//     (`php lib/pkp/tools/scheduler.php test --name='PKP\task\StatisticsReport'`), the queued jobs
//     run (`jobs.php work --stop-when-empty`, the kit's drainJobs), and rvaca's email is read from
//     the slot's Mailpit (the one whose links carry this fleet's address, since every fleet of the
//     slot mails the same dataset addresses): subject, the "Login to …" sentence of its text and
//     HTML parts.
//   OJS is the control ("Login to the journal").
// `neighbour` as the argument (runs alone; reads only): steps 1-3 as rvaca, and the template GET's
//   bodies for every language. With the fix in and out the French body and every other line of the
//   English body must read the same; only "the the press" ("the the preprint server") changes.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir8 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-ir8 PROBE_AGENT=ir8 node bin/probe.js all shared/playwright/checks/issues/monthly-email-login-to-the-the-press/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir8-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir8-3_5 PROBE_AGENT=ir8 node bin/probe.js all shared/playwright/checks/issues/monthly-email-login-to-the-the-press/walk.js
// The fix (fix-<app>.diff, the locale line) and the stored-copy repair (stored-copy-<app>.diff, one
// replace() line in the app's I13128_FixEmailUrlLinks) were tried together, concatenated into one diff
// per app (`cat fix-omp.diff stored-copy-omp.diff > /tmp/omp.diff`, the same for ops):
//   node bin/try-fix.js apply /tmp/omp.diff omp; node bin/try-fix.js apply /tmp/ops.diff ops
//   existing installs: PKP_E2E_DATASET_BRANCH=stable-3_5_0 npm run fleet-prep -- --feature issues-ir8 --dataset 3 --reset --apps omp,ops
//     (loads the 3.5 dataset and runs the app's upgrade), then PROBE_RUN=fix-upg … walk.js, PROBE_RUN=nb-in … walk.js neighbour
//   new installs: a plain reset, then in each app root
//     PKP_CONFIG_FILE=$PWD/config.test.ds3.inc.php php lib/pkp/tools/installEmailTemplate.php STATISTICS_REPORT_NOTIFICATION en
//     (stores the template as an install does), then PROBE_RUN=fix-new … walk.js
//   node bin/try-fix.js revert /tmp/omp.diff omp; node bin/try-fix.js revert /tmp/ops.diff ops
//   then the 3.5 dataset upgraded by the unpatched code: PROBE_RUN=nb-out … walk.js neighbour
// Facts: .reports/<feature>/ir8/facts[-neighbour][-<run>]-<app>.json
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, idle, drainJobs} = require('../../../probe');
const {openManageEmails} = require('../preprint-emails-list-misses-sent-emails/lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : 'steps';
const EMAIL = 'Statistics Report Notification';
const KEY = 'STATISTICS_REPORT_NOTIFICATION';
const RECIPIENT = 'rvaca@mailinator.com';

const flat = (s) => (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
/** The "Login to …" sentence (up to "attached."), or null. */
const loginLine = (s) => {
    const m = flat(s).match(/Log ?in to .*?attached\./i);
    return m ? m[0] : null;
};

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const facts = {mode: MODE, line: app.line, dataset: app.dataset, run: process.env.PROBE_RUN || null};
    const fetched = [];
    page.on('response', async (r) => {
        if (new RegExp(`/api/v1/(emailTemplates|mailables)/${KEY}\\b`).test(r.url()) && r.request().method() === 'GET') {
            try {
                fetched.push({url: r.url(), status: r.status(), json: await r.json()});
            } catch (e) {
                fetched.push({url: r.url(), status: r.status(), error: String(e.message).slice(0, 200)});
            }
        }
    });
    try {
        // Steps 1-4.
        await signIn(page, 'rvaca');
        const {m, via} = await openManageEmails(page, app);
        facts.manageEmailsVia = via;
        const {kind, window: win} = await m.openEmail(EMAIL);
        facts.opens = kind;
        if (kind === 'several') {
            const rows = await m.templateRowsRead(win);
            facts.templateRows = rows;
            const def = rows.find((r) => r.badges.includes('Default')) || rows[0];
            await m.openTemplate(win, def.name);
        }
        await idle(page).catch(() => {});
        facts.subjectBox = await m.subjectBox('en').inputValue().catch(() => null);
        const html = await m.bodyHtml('en');
        facts.editor = {login: loginLine(html), html};
        record(`${MODE}-template`, await screen(page));
        await shot(page, `${MODE}-template`);
        facts.templateGet = fetched.map((f) => {
            const j = f.json || {};
            const t = j.body ? j : (j.emailTemplates || [])[0] || {};
            const bodies = t.body || {};
            return {
                url: f.url.replace(/^https?:\/\/[^/]+/, ''),
                status: f.status,
                error: f.error,
                bodies: Object.fromEntries(Object.entries(bodies).map(([l, b]) => [l, {login: loginLine(b), text: flat(b)}])),
            };
        });

        if (MODE === 'steps') {
            // Step 5: the routine task now, then its queued jobs.
            const since = new Date();
            try {
                facts.scheduler = execFileSync('php', ['lib/pkp/tools/scheduler.php', 'test', '--name=PKP\\task\\StatisticsReport'], {
                    cwd: app.root,
                    env: {...process.env, PKP_CONFIG_FILE: app.configFile},
                    encoding: 'utf8',
                    timeout: 120_000,
                }).replace(/\s+/g, ' ').trim().slice(0, 400);
            } catch (e) {
                facts.scheduler = {error: `${e.stdout || ''}${e.stderr || ''}${e.message}`.slice(0, 600)};
            }
            const drained = await drainJobs(app).catch((e) => ({error: String(e.message).slice(0, 300)}));
            facts.jobs = {passes: drained.passes, counts: drained.counts, error: drained.error};
            // Step 6: rvaca's email.
            try {
                // Every fleet of the slot mails rvaca@mailinator.com: keep the one whose links are this fleet's.
                let full = null;
                for (let i = 0; i < 60 && !full; i++) {
                    const found = await app.mail._search({to: RECIPIENT, contains: 'health report', since});
                    for (const hit of found.messages || []) {
                        const msg = await app.mail.fullMessage(hit.ID);
                        if ((msg.Text || '').includes(`${app.baseURL}/index.php/`)) {
                            full = msg;
                            break;
                        }
                    }
                    if (!full) await new Promise((r) => setTimeout(r, 1000));
                }
                if (!full) throw new Error(`no "health report" email to ${RECIPIENT} with links to ${app.baseURL}`);
                facts.email = {
                    subject: full.Subject,
                    to: (full.To || []).map((t) => t.Address),
                    loginText: loginLine(full.Text),
                    loginHtml: loginLine(full.HTML),
                    attachments: (full.Attachments || []).map((a) => a.FileName),
                    text: (full.Text || '').slice(0, 1500),
                };
            } catch (e) {
                facts.email = {error: String(e.message).slice(0, 300)};
            }
        }
    } catch (e) {
        facts.error = String(e.message).slice(0, 400);
    } finally {
        record(MODE === 'steps' ? 'facts' : 'facts-neighbour', facts);
        await close();
    }
});
