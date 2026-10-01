// Issue report walk: docs/issues/U21-A5-copyright-agreed-line-raw-placeholder.md
// (spec U21 register A5). Takes the report's Steps through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"):
//   1-3  rvaca: Settings › Workflow › "Submission" › "Author Guidance" ›
//        "Copyright Notice": "Authors keep the copyright of their work.", "Save"
//   4-7  an Author (ccorino; OMP aclark) submits "u21w42 Copyright Agreed"
//        through the wizard (../editorial-role-submitter-no-acknowledgement/submit.js,
//        which ticks every box on "Review", the copyright box included)
//   8-9  dbarnes: the submission's workflow, "Activity Log", "History"
// The same History is the fix's neighbour check: the other lines ("… submitted",
// the file upload) must read the same with the fix in and out.
// The kit builds nothing. Besides the screens it reads the stored log entry
// and its settings from the database (Evidence only).
//
// Reset first:  npm run fleet-prep -- --feature issues-w42 --dataset 7 --reset
// Run (main):   PROBE_FEATURE=issues-w42 PROBE_AGENT=w42 node bin/probe.js all shared/playwright/checks/issues/copyright-agreed-line-raw-placeholder/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w42-3_5 PROBE_AGENT=w42 node bin/probe.js all <this file>
// Facts: .reports/<feature>/w42/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');
const {submitThroughWizard, flat} = require('../editorial-role-submitter-no-acknowledgement/submit.js');

const TAG = 'u21w42';
const AUTHOR = {ojs: 'ccorino', omp: 'aclark', ops: 'ccorino'};
const NOTICE = 'Authors keep the copyright of their work.';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const {WorkflowSubmissionSettings} = require('../../../pages/SubmissionIntakePages.js');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {ActivityLogWindow} = require('../../../pages/ActivityLogPages.js');
    const loc = ['main', 'stable-3_5_0'].includes(app.line || 'main') ? 'en' : '';
    const facts = {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${flat(JSON.stringify(v), 1500)}`); };
    let n = 0;
    const rec = async (page, label) => {
        const name = `w42-${String(++n).padStart(2, '0')}-${label}`;
        try { const s = await screen(page); record(name, s); await shot(page, name).catch(() => {}); return s; }
        catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); return null; }
    };
    const errors = [];
    const watch = (page, who) => {
        page.on('pageerror', (e) => errors.push({who, kind: 'pageerror', text: flat(e.message, 300)}));
        page.on('response', (r) => { if (r.status() >= 400) errors.push({who, kind: 'http', text: `${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '').replace(/csrfToken=[^&]+/, 'csrf').slice(0, 200)}`}); });
    };

    try {
        // Steps 1-3: rvaca sets a copyright notice.
        {
            const {page, close} = await launch(app);
            watch(page, 'rvaca');
            try {
                await signIn(page, 'rvaca');
                const settings = new WorkflowSubmissionSettings(page, app.contextPath, {locale: loc});
                await settings.goto('Author Guidance');
                await settings.guidance.type('Copyright Notice', NOTICE);
                const resp = await settings.guidance.pressSave();
                const saved = await settings.guidance.savedStatus.waitFor({timeout: 15_000}).then(() => true).catch(() => false);
                await rec(page, 's3-guidance-saved');
                fact('steps 1-3 copyright notice', {status: resp.status(), saved, text: await settings.guidance.text('Copyright Notice'),
                    db: sql(app, `select locale || '=' || setting_value from ${app.contextTables.settings} where setting_name = 'copyrightNotice'`)});
                await signOut(page);
            } finally { await close(); }
        }

        // Steps 4-7: the Author submits, ticking the copyright box on "Review".
        const who = AUTHOR[app.name];
        let sub;
        {
            const {page, close} = await launch(app);
            watch(page, who);
            page.setDefaultTimeout(30_000);
            try {
                await signIn(page, who);
                sub = await submitThroughWizard(app, page, {title: `${TAG} Copyright Agreed`, rec, label: 's7'});
                fact(`steps 4-7 ${who} submitted`, sub);
                await signOut(page);
            } finally { await close(); }
        }

        // Steps 8-9: dbarnes reads the Activity Log.
        {
            const {page, close} = await launch(app);
            watch(page, 'dbarnes');
            try {
                await signIn(page, 'dbarnes');
                const wf = new WorkflowPage(page, app.contextPath);
                await wf.gotoEditorial(sub.id);
                const log = new ActivityLogWindow(page, wf);
                await log.open();
                const lines = await log.historyLines();
                await rec(page, 's9-history');
                fact('step 9 history', lines.map((l) => `${l.user} | ${l.event}`));
                fact('step 9 copyright line', lines.filter((l) => /copyright/i.test(l.event)).map((l) => l.event));
                await log.close();
                await signOut(page);
            } finally { await close(); }
        }

        fact('db (Evidence)', sql(app, `select e.log_id || ' ' || e.event_type || ' ' || e.message || ' :: ' || coalesce((select string_agg(s.setting_name || '=' || left(s.setting_value, 60), '; ' order by s.setting_name) from event_log_settings s where s.log_id = e.log_id), '') from event_log e where e.assoc_type = 1048585 and e.assoc_id = ${sub.id} order by e.log_id`).split('\n'));
    } catch (e) {
        fact('walk error', flat(e.stack || e.message, 800));
    } finally {
        fact('errors', errors);
        record('facts', facts);
    }
});
