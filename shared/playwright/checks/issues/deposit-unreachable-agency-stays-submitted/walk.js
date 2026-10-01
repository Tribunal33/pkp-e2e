// Issue report docs/issues/U45-A18-deposit-unreachable-agency-stays-submitted.md
// (U45 A18): a DOI deposit that cannot connect to the registration agency
// reads "Submitted" for good. Takes the report's Steps through the screens
// on a dataset fleet freshly reset to PKP's default test dataset (whose
// config, as every campaign fleet's, points `[proxy]` at a dead port, the
// report's precondition; `job_runner` On as the dataset ships it):
//   1.   sign in as dbarnes
//   2.   Settings › Website › "Plugins": tick the agency's plugin
//   3.   DOIs › "Setup": "DOI Prefix" 10.1234, "Save"
//   4.   DOIs › "Registration": the agency and its fields, "Save"
//   5.   DOIs page: "Assign DOIs" on the item (OJS 17, OPS 2)
//   6.   "Deposit DOIs" on it
//   7.   reload the DOIs page until the queued deposit has run (the queue is
//        read from the database to know when to stop; read only), expand
//        the item
//   8.   press the filter "Has Error"
//   9.   sign in as admin: Administration › "Failed Jobs"
// WALK=crossref (default; OJS and OPS) or WALK=datacite (OJS only).
// NEIGHBOUR=1 adds the control the fix must leave alone: a second published
// item (OJS 1 "Signalling Theory Dividends", OPS 5) is given a DOI in step 5
// but not deposited; it must still read "Unregistered" after step 7, with the
// fix (fix-ojs.diff, fix-ops.diff) in and out.
// OMP has no registration agency plugin: no surface, skipped.
// Reset first, then run:
//   npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
//   PROBE_FEATURE=issues-ir2 PROBE_AGENT=ir3 node bin/probe.js all shared/playwright/checks/issues/deposit-unreachable-agency-stays-submitted/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-ir2-3_5,
// and PROBE_RUN=r35 in front of the run.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const WALK = process.env.WALK || 'crossref';
const NEIGHBOUR = !!process.env.NEIGHBOUR;

const ITEMS = {ojs: {walk: 17, neighbour: 1}, ops: {walk: 2, neighbour: 5}};
const AGENCY = {
    crossref: {plugin: 'crossrefplugin', label: 'Crossref', apps: ['ojs', 'ops'],
        fields: {depositorName: 'Public Knowledge Project', depositorEmail: 'dbarnes@mailinator.com'}},
    datacite: {plugin: 'dataciteplugin', label: 'DataCite', apps: ['ojs'], fields: {username: 'u45ir3'}},
};

forEachApp(async (app) => {
    const agency = AGENCY[WALK];
    if (!agency.apps.includes(app.name)) {
        console.log(`[walk] ${app.name}: no ${agency.label} plugin, no surface; skipped`);
        return;
    }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {DoiSettings, DoisPage, recordNotices} = require('../../../pages/DoisPages.js');
    const {expect} = require('@playwright/test');
    const ctx = app.contextPath;
    const id = ITEMS[app.name].walk;
    const nid = ITEMS[app.name].neighbour;
    const pre = `${WALK}${NEIGHBOUR ? '-nb' : ''}`;
    const facts = {app: app.name, line: app.line || 'main', walk: WALK, neighbour: NEIGHBOUR, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1200)}`);
    };
    const logFile = path.resolve(__dirname, '../../../../..', 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => (fs.existsSync(logFile) ? fs.statSync(logFile).size : 0);
    const logSince = (from) => {
        if (!fs.existsSync(logFile)) return [`no log at ${logFile}`];
        const buf = fs.readFileSync(logFile).subarray(from).toString('utf8');
        return buf.split('\n').filter((l) => /error|exception|warning/i.test(l) && !/\[200\]|\[30\d\]/.test(l)).map((l) => flat(l, 500)).slice(0, 12);
    };
    const doiRows = () => sql(app, 'select doi_id, doi, status from dois order by doi_id').split('\n').filter(Boolean);

    const {page, close} = await launch(app);
    try {
        await recordNotices(page);
        // 1
        await signIn(page, 'dbarnes');
        const settings = new DoiSettings(page, ctx);
        const dois = new DoisPage(page, ctx);

        // 2
        await settings.gotoPlugins(agency.plugin);
        await settings.setPluginEnabled(agency.plugin, true);
        fact('2 plugin on', await settings.pluginBox(agency.plugin).isChecked());

        // 3
        await settings.goto('Setup');
        await settings.prefixBox().fill('10.1234');
        const r3 = await settings.save(settings.setup);
        fact('3 setup save', {status: r3.status()});

        // 4
        await settings.goto('Registration');
        await settings.chooseAgency(agency.label);
        for (const [name, value] of Object.entries(agency.fields)) {
            await expect(settings.field(name)).toBeVisible({timeout: T});
            await settings.field(name).fill(value);
        }
        const r4 = await settings.save(settings.registration);
        fact('4 registration save', {status: r4.status(), agency: await settings.agencyState()});

        // 5
        await dois.goto();
        const row = dois.row(id);
        const nrow = dois.row(nid);
        await row.waitFor({timeout: T});
        const assigned = await dois.runBulk('Assign DOIs', NEIGHBOUR ? [id, nid] : [id]);
        fact('5 assign', {status: assigned.status(), name: flat(await dois.rowLink(row).innerText()), badge: flat(await dois.rowBadge(row).innerText()),
            neighbourBadge: NEIGHBOUR ? flat(await dois.rowBadge(nrow).innerText()) : undefined});

        // 6
        const jobsBefore = Number(sql(app, 'select count(*) from jobs') || 0);
        const failedBefore = Number(sql(app, 'select count(*) from failed_jobs') || 0);
        const from = logSize();
        const deposited = await dois.runBulk('Deposit DOIs', [id]);
        await sleep(800);
        const s6 = await screen(page);
        record(`${pre}-6-after-deposit`, s6);
        fact('6 deposit', {status: deposited.status(), badge: flat(await dois.rowBadge(row).innerText()), notices: await page.evaluate(() => window.__doiNotices || []),
            queued: sql(app, `select substring(payload from 'displayName":"([^"]+)') from jobs order by id`).split('\n').filter(Boolean), jobsBefore});

        // 7: reload until nothing is queued (each web request runs the queue, job_runner On)
        let loads = 0;
        const started = Date.now();
        for (; loads < 30; loads++) {
            await sleep(4000);
            await dois.reload();
            if (Number(sql(app, "select count(*) from jobs where payload like '%Deposit%'") || 0) === 0) break;
        }
        await sleep(2000);
        await dois.reload();
        const failed = sql(app, `select substring(payload from 'displayName":"([^"]+)') || ' | ' || split_part(exception, E'\\n', 1) from failed_jobs order by id offset ${failedBefore}`).split('\n').filter(Boolean);
        await dois.expand(row, id);
        const expanded = dois.expanded(row);
        const s7 = await screen(page);
        record(`${pre}-7-expanded`, s7);
        await shot(page, `${pre}-7-expanded`).catch(() => {});
        const viewError = expanded.getByRole('button', {name: 'View Error'});
        const after = {
            seconds: Math.round((Date.now() - started) / 1000), reloads: loads + 1,
            badge: flat(await dois.rowBadge(row).innerText()),
            doiTable: flat(await expanded.locator('table').innerText()),
            panelButtons: (await dois.agencyButtons(row).allInnerTexts()).map((t) => flat(t)),
            viewErrorCount: await viewError.count(),
            failedJobs: failed.map((l) => flat(l, 400)),
            jobsLeft: sql(app, 'select count(*) from jobs'),
            dois: doiRows(),
            errorSettings: sql(app, "select doi_id, setting_name, left(setting_value, 200) from doi_settings where setting_name ilike '%failed%' or setting_name ilike '%error%'").split('\n').filter(Boolean),
            log: logSince(from),
        };
        if (NEIGHBOUR) after.neighbourBadge = flat(await dois.rowBadge(nrow).innerText());
        if (after.viewErrorCount > 0) {
            await viewError.first().click();
            const win = dois.dialog('Registration Error Message');
            await win.waitFor({timeout: T}).catch(() => {});
            after.errorWindow = flat(await win.innerText().catch(() => null), 700);
            record(`${pre}-7-view-error`, await screen(page));
            await win.getByRole('button', {name: /Close|OK/}).first().click().catch(() => {});
        }
        fact('7 after the background deposit', after);
        // 8
        await dois.collapse(row, id);
        await dois.pressFilter('Has Error');
        await sleep(500);
        fact('8 has error filter', {rows: await dois.rowNames(), empty: flat(await dois.emptyLine().innerText().catch(() => null))});
        record(`${pre}-8-has-error`, await screen(page));

        // 9
        await signIn(page, 'admin');
        await page.goto(app.url('/index.php/index/admin/failedJobs'));
        await idle(page);
        await sleep(1000);
        const s8 = await screen(page);
        record(`${pre}-9-failed-jobs`, s8);
        await shot(page, `${pre}-9-failed-jobs`).catch(() => {});
        fact('9 failed jobs page', {title: s8.title, main: flat(s8.text && s8.text.main, 900)});
    } finally {
        record(`${pre}-facts`, facts);
        await close();
    }
});
