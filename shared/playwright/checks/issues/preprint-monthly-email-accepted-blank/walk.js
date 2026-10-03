// Issue report docs/issues/U65-OPS4-preprint-monthly-email-accepted-blank.md (U65 OPS4): the report's
// Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"). The steps create nothing.
//
// Default mode, as `rvaca` (the context's manager):
//   steps 1-4: Settings › Workflow › "Emails" › "Add and edit templates", search "Statistics Report
//     Notification", its "Edit": the list of figures in the body editor. The template GET the
//     screen itself sends is kept too (every language's list).
//   steps 5-6: the team's own command-line tool runs the routine task now
//     (`php lib/pkp/tools/scheduler.php test --name='PKP\task\StatisticsReport'`), the queued jobs
//     run (the kit's drainJobs: `jobs.php work --stop-when-empty`), and rvaca's email is read from
//     the slot's Mailpit (only the one whose links carry this fleet's address: every fleet of the
//     slot mails the same dataset addresses): subject, the figure lines of its text and HTML parts.
//   OJS and OMP are the control ("Accepted submissions this month: <n>").
// `neighbour` as the argument (runs alone; reads only): steps 1-3 as rvaca, and the template GET's
//   bodies for every language. With the fix in and out every other line of every language's body
//   must read the same; only the "Accepted submissions" list item goes.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir17 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir17 PROBE_AGENT=ir17 node bin/probe.js all shared/playwright/checks/issues/preprint-monthly-email-accepted-blank/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir17-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir17-3_5 PROBE_AGENT=ir17 node bin/probe.js all shared/playwright/checks/issues/preprint-monthly-email-accepted-blank/walk.js
// The fix (fix.diff: OPS's locale lines and one migration step) was tried on OPS `main`:
//   node bin/try-fix.js apply shared/playwright/checks/issues/preprint-monthly-email-accepted-blank/fix.diff ops
//   existing installs: PKP_E2E_DATASET_BRANCH=stable-3_5_0 npm run fleet-prep -- --feature issues-ir17 --dataset 2 --reset --apps ops
//     (loads the 3.5 dataset and runs the app's upgrade), then PROBE_RUN=fix-upg … walk.js, PROBE_RUN=nb-in … walk.js neighbour
//   new installs: a plain reset, then in the app root
//     PKP_CONFIG_FILE=$PWD/config.test.ds2.inc.php php lib/pkp/tools/installEmailTemplate.php STATISTICS_REPORT_NOTIFICATION en,fr_CA
//     (stores the template as an install does), then PROBE_RUN=fix-new … walk.js
//   node bin/try-fix.js revert shared/playwright/checks/issues/preprint-monthly-email-accepted-blank/fix.diff ops
//   then the 3.5 dataset upgraded by the unpatched code: PROBE_RUN=nb-out … walk.js neighbour
// Facts: .reports/<feature>/ir17/facts[-neighbour][-<run>]-<app>.json
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, idle, drainJobs} = require('../../../probe');
const {openManageEmails} = require('../preprint-emails-list-misses-sent-emails/lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : 'steps';
const EMAIL = 'Statistics Report Notification';
const KEY = 'STATISTICS_REPORT_NOTIFICATION';
const RECIPIENT = 'rvaca@mailinator.com';

const flat = (s) => (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
/** The body's list items, flattened (the four figures). */
const items = (html) => [...String(html || '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => flat(m[1]));
/** The text part's figure lines ("… this month: n", "… in the system: n"), verbatim to the line end. */
const textFigures = (text) =>
    String(text || '')
        .split(/\r?\n/)
        .filter((l) => /submissions (this month|in the system)/i.test(l) || /\{\$\w+Submissions\}/.test(l))
        .map((l) => l.replace(/\s+$/, ''));

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
        const html = await m.bodyHtml('en').catch((e) => `ERROR ${e.message}`);
        facts.editor = {items: items(html), html: String(html).slice(0, 3000)};
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
                bodies: Object.fromEntries(Object.entries(bodies).map(([l, b]) => [l, {items: items(b), text: flat(b)}])),
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
            // Step 6: rvaca's email, the one whose links are this fleet's.
            try {
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
                    textFigures: textFigures(full.Text),
                    htmlItems: items(full.HTML),
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
