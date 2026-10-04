// Issue report on U60 A3 (a "Save" on Site Settings writes `Undefined array key "redirectContextId"`
// to the server's log while no redirect is set): the report's Steps to reproduce, walked on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"). The kit builds nothing:
// the second journal is made through the screens.
//
// Default mode, the Steps (OJS, OMP, OPS):
//   1 sign in as admin (the log lines up to here are kept: on 3.5 the web task runner's first pass)
//   2 Administration › Site Settings   3 Security › Save   4 Bulk Emails › Save   5 Statistics › Save
//   6 Hosted Journals › "Create Journal" "u60b Second Journal" (path `u60bsecond`)
//   7 Site Settings › Information › Save   8 Appearance › Setup › Save
//   9 Settings: Site Name "u60b Site", redirect blank, Save   10 Security › Save
//   11 Settings: redirect the dataset's context, Save   12 Security › Save
// On 3.5 there is no "Security" tab: steps 3, 10 and 12 record the missing tab, and step 1 records the
//   scheduled tasks' lines that the first page load after the dataset's load writes.
// `security` as the argument runs steps 1-3 alone, keeping the save's answer and the page's notices:
//   for an install with `display_errors = On` under `[debug]` (set by hand in the config, then put back).
// `neighbour` as the argument (the fix in and out; runs alone): the second journal, then Settings with
//   the dataset's context as redirect, Save; Security › Save; reload, read the redirect chosen and the
//   stored column; then Settings with the redirect blank, Save; reload, read again. A fix that skips an
//   absent redirect must keep the set one through a Security save and still clear it when "Settings"
//   posts it blank.
// Each step records the state it finds and the server-log lines its request wrote, never throwing.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u60b --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u60b PROBE_AGENT=u60b node bin/probe.js all shared/playwright/checks/issues/site-settings-save-logs-redirect-warning/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u60b-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u60b-3_5 PROBE_AGENT=u60b node bin/probe.js all shared/playwright/checks/issues/site-settings-save-logs-redirect-warning/walk.js
// The fix:      node bin/try-fix.js apply shared/playwright/checks/issues/site-settings-save-logs-redirect-warning/fix.diff ojs omp ops
// Facts: .reports/<feature>/u60b/a3-facts-<mode>-<app>.json (PROBE_RUN adds its tag)
const {forEachApp, launch, signIn, screen, record, serverLog, sql} = require('../../../probe');
const {createContext} = require('../all-dates-error-nothing-published/lib');

const ARGS = process.argv.slice(2);
const MODE = ARGS.includes('neighbour') ? 'neighbour' : ARGS.includes('security') ? 'security' : 'steps';
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const safe = (p) => p.catch((e) => ({error: flat(e.message, 300)}));
const LOG_MATCH = /warning|error|exception|fatal|\[5\d\d\]|api\/v1\/site/i;

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset)');
    const {SiteSettingsPage} = require('../../../pages/SiteSettingsPages.js');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: MODE, steps: {}};
    const log = serverLog(app, {match: LOG_MATCH});
    let mark = log.mark();
    // The log lines written since the last step, once the step's own request line is in.
    const linesSince = async (until) => {
        for (let i = 0; until && i < 50; i++) {
            if (log.since(mark).some((l) => until.test(l))) break;
            await new Promise((r) => setTimeout(r, 100));
        }
        const lines = log.since(mark).map((l) => flat(l.replace(/^\[[^\]]+\] /, ''), 300));
        mark = log.mark();
        return lines;
    };
    const warnings = (lines) => lines.filter((l) => /redirectContextId/.test(l)).length;
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const stored = async () => {
        try {
            return `redirect_context_id=${sql(app, 'SELECT redirect_context_id FROM site') || 'NULL'}`;
        } catch (e) {
            return `error: ${flat(e.message, 100)}`;
        }
    };

    const {page, close} = await launch(app);
    const site = new SiteSettingsPage(page);
    const SAVE_LINE = /POST \/index\.php\/index\/api\/v1\/site/;
    // Press a form's "Save" and keep the answer, the "Saved" line and the log lines it wrote.
    const save = async (label, getForm) => {
        const out = {};
        try {
            const form = await getForm();
            await linesSince(null);
            const r = await form.pressSave();
            out.status = r.status();
            out.contentType = r.headers()['content-type'];
            out.body = flat(await r.text().catch((e) => `error: ${e.message}`), 400);
            out.saved = await form.savedStatus.waitFor({state: "visible", timeout: 5000}).then(() => true, () => false);
        } catch (e) {
            out.error = flat(e.message, 300);
        }
        out.log = await linesSince(SAVE_LINE);
        out.warnings = warnings(out.log);
        const shown = await screen(page).catch((e) => ({error: e.message}));
        out.notices = shown.notices;
        record(`${MODE}-${label}`, shown);
        fact(label, out);
        return out;
    };
    // The context the dataset holds, as the redirect list names it.
    const datasetContext = async (form) => (await form.redirectChoices()).find((c) => c && !/u60b/.test(c));
    const setSettings = async (label, {siteName, redirect}) => {
        return save(label, async () => {
            const form = await site.settings();
            if (siteName != null) await form.siteName('en').fill(siteName);
            const choice = redirect === 'dataset' ? await datasetContext(form) : '';
            facts.redirectLabel = choice || facts.redirectLabel;
            await form.redirect.selectOption({label: choice});
            return form;
        });
    };

    try {
        await signIn(page, 'admin');
        fact('1 sign in', {log: await linesSince(null).then((l) => l.filter((x) => /redirectContextId|warning|error/i.test(x)))});
        facts.steps['1 sign in'].warnings = warnings(facts.steps['1 sign in'].log);

        if (MODE === 'security') {
            await safe(site.gotoFromAdministration());
            await save('3 security', () => site.security());
            return;
        }
        if (MODE === 'steps') {
            await safe(site.gotoFromAdministration());
            const tabs = await safe(site.sideTabs('Site Setup').allInnerTexts());
            fact('2 site settings', {topTabs: await safe(site.topTabs.allInnerTexts()), sideTabs: tabs, log: await linesSince(null)});
            await save('3 security', () => site.security());
            await save('4 bulk emails', () => site.bulkEmails());
            await save('5 statistics', () => site.statistics());
        }

        const created = await safe(createContext(page, app, {name: 'u60b Second Journal', initials: 'U60B', path: 'u60bsecond', email: 'u60b@mailinator.com'}));
        fact('6 second context', {status: created, log: await linesSince(null)});
        await safe(site.goto());

        if (MODE === 'steps') {
            await save('7 information', () => site.information());
            await save('8 appearance setup', () => site.appearanceSetup());
            await setSettings('9 settings, redirect blank', {siteName: 'u60b Site', redirect: ''});
            await save('10 security', () => site.security());
            await setSettings('11 settings, redirect set', {redirect: 'dataset'});
            await save('12 security', () => site.security());
            facts.storedAtEnd = await stored();
        } else {
            await setSettings('nb1 settings, redirect set', {siteName: 'u60b Site', redirect: 'dataset'});
            await save('nb2 security', () => site.security());
            await safe(site.reload());
            const f1 = await safe(site.settings());
            fact('nb3 after reload', {chosen: f1.error ? f1 : await safe(f1.redirectChosen()), stored: await stored()});
            await setSettings('nb4 settings, redirect blank', {redirect: ''});
            await safe(site.reload());
            const f2 = await safe(site.settings());
            fact('nb5 after reload', {chosen: f2.error ? f2 : await safe(f2.redirectChosen()), stored: await stored()});
            await save('nb6 security', () => site.security());
            fact('nb7 stored', {stored: await stored()});
        }
    } finally {
        facts.warningsByStep = Object.fromEntries(Object.entries(facts.steps).map(([k, v]) => [k, v.warnings ?? warnings(v.log || [])]));
        console.log(`[fact] ${app.name} warnings by step: ${JSON.stringify(facts.warningsByStep)}`);
        record(`a3-facts-${MODE}`, facts);
        await close();
    }
});
