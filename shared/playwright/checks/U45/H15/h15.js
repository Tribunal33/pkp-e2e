// U45 claim check H15 (housekeeping 2026-10-15): four incidentals rows, driven on a dataset fleet (PKP's default
// test dataset, `publicknowledge`, as the dataset's own `dbarnes`; harness.md "Dataset fleets"). The fleet is the
// checker's own and is reset before each run, so the dataset's journal serves as the scratch context.
//
//   row 1  Rule 7: a completed, confirmed review whose reviewer is then cancelled ("Cancel Reviewer"): its DOI on the
//          DOIs page, in what "Deposit DOIs" / "Deposit All" take and send, and on the public review record
//          (`GET api/v1/peerReviews/open/submissions/{id}` signed out; no screen calls it). Both ends of the DOI's
//          status at the cancel: "Unregistered" (work 10, Aisla McCrae) and "Registered" (work 13, Julie Janssen).
//   row 2  Rule 29: a preprint whose 2.0 and 2.1 are both posted (one DOI): the Crossref XML (OPS work 3); the other
//          ends: one posted version (OPS 2 before its 1.1), 1.0 + 1.1 (OPS 2 after), and OJS 1.0 + 1.1 (work 1).
//   row 3  (a) Rule 20 "There are {count} versions." for one family (1.0 + 1.1: OJS 1, OMP 14, OPS 2) against two
//          (OPS 3: 1.0, 2.0, 2.1); (b) Rule 7b, a review's DOI reading "Error" (work 10, Adela Gallego, after a
//          failed deposit) or "Needs Sync" (work 13, Aisla McCrae unticked, Adela Gallego reverted) when the review
//          stops qualifying; (c) Rule 29 "Export DOIs" on a DataCite journal for a work whose "Article" DOI was
//          cleared while its galley keeps one (OJS 17), against both DOIs kept (OJS 17 before) and none (OJS 9).
//   row 4  the Crossref XML of a work whose title holds "&" or an italic word, with a subtitle: OJS 5 and OPS 1
//          retitled on "Title & Abstract", published; the dataset's own bare "&" title (OJS 9, OPS 8) as control.
//
// What an export or deposit would carry is read with xml-read.php (read-only, validation off), since "Export DOIs"
// answers 400 on the test installs (the schema fetch goes to the dead [proxy]).
//
// Phases, one process each, in this order, from a freshly reset fleet:
//   PHASE=setup    (all)  Crossref enabled and configured (OJS, OPS), prefix 10.1234; OJS also "Peer Reviews"
//   PHASE=reviewA  (ojs)  work 10: rows 1 (Unregistered end) and 3b ("Error")
//   PHASE=errorEnd (ojs)  work 10: row 3b ("Error"): Adela Gallego's review ticked public again, its DOI set to
//                         "Error" in the database (the test installs cannot reach an agency, so a failed deposit
//                         leaves "Submitted", seed-facts "Install defaults"), then unticked and ticked again
//   PHASE=reviewB  (ojs)  work 13: rows 1 (Registered end) and 3b ("Needs Sync")
//   PHASE=titles   (ojs, ops)  row 4
//   PHASE=versions (all)  rows 2 and 3a ("DOI Versioning" "Yes" on OJS and OMP)
//   PHASE=datacite (ojs)  row 3c (the journal switched to DataCite)
// Reset:  npm run fleet-prep -- --feature issues-cc45a --dataset 5 --reset
// Run:    bin/app-lock.sh shared <app> -- env PHASE=<p> PROBE_RUN=r1 PROBE_FEATURE=U45 PKP_E2E_DATASET=5 PROBE_AGENT=cc45a \
//            node bin/probe.js <app> shared/playwright/checks/U45/H15/h15.js
//         one app per call, phases in order: ojs setup reviewA errorEnd reviewB titles versions datacite;
//         omp setup versions; ops setup titles versions (2026-10-15: r1 and r2, each from a reset)
// Facts:  .reports/U45/cc45a/h15-<phase>-facts-<run>-<app>.json; screens h15-<phase>-<step>-<run>-<app>.json
const path = require('path');
const {execFileSync} = require('child_process');
const {request: pwRequest, expect} = require('@playwright/test');
const {forEachApp, launch, signIn, screen, shot, record, idle, sql, serverLog} = require('../../../probe');

const PHASE = process.env.PHASE;
const T = 30_000;
const PREFIX = '10.1234';
const ISSUE = /Vol\. 1 No\. 2 \(2014\)/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const STATUS = {1: 'Unregistered', 2: 'Submitted', 3: 'Registered', 4: 'Error', 5: 'Needs Sync'};
const REPO = path.resolve(__dirname, '../../../../..');

const APPS = {
    setup: ['ojs', 'omp', 'ops'],
    reviewA: ['ojs'],
    errorEnd: ['ojs'],
    reviewB: ['ojs'],
    titles: ['ojs', 'ops'],
    versions: ['ojs', 'omp', 'ops'],
    datacite: ['ojs'],
};
const GROUP = {ojs: 'Publication', omp: 'Publication', ops: 'Preprint'};
const POST = {ojs: 'Publish', omp: 'Publish', ops: 'Post'};

/** xml-read.php on the app's fleet (read only). */
function xmlRead(app, ids) {
    const root = path.resolve(REPO, app.root);
    const config = path.isAbsolute(app.configFile) ? app.configFile : path.resolve(REPO, app.configFile);
    const out = execFileSync('php', [path.join(__dirname, 'xml-read.php'), root, app.contextPath, ...ids.map(String)],
        {env: {...process.env, PKP_CONFIG_FILE: config}, encoding: 'utf8', timeout: 180000, cwd: root});
    return JSON.parse(out.trim().split('\n').pop());
}

forEachApp(async (app) => {
    if (!APPS[PHASE]) throw new Error(`PHASE must be one of ${Object.keys(APPS).join(', ')}`);
    if (!APPS[PHASE].includes(app.name)) {
        console.log(`[h15] ${PHASE}: ${app.name} has no part in this phase; skipped`);
        return;
    }
    if (!app.dataset) throw new Error('h15.js runs on a dataset fleet (PKP_E2E_DATASET / fleet-prep --dataset)');
    const {DoiSettings, DoisPage, recordNotices} = require('../../../pages/DoisPages.js');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {createVersion, publishLatest, readDoiRow, readVersionsWindow} = require('../../issues/minor-version-new-galley-dois/lib');
    const {retypeTitle} = require('../../issues/articles-report-title-html-codes/lib');
    const {retypeTitleBoxes} = require('../../issues/doi-row-title-formatting-codes/lib');
    const ctx = app.contextPath;
    const facts = {app: app.name, phase: PHASE, run: process.env.PROBE_RUN || null, dataset: app.dataset, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1500)}`);
    };
    const nm = (s) => `h15-${PHASE}-${s}`;
    const log = serverLog(app);
    const logFrom = log.mark();

    const {page, close} = await launch(app);
    // A window the screens raise (a leave-page question) is accepted, and recorded by the kit.
    page.on('dialog', (d) => d.accept().catch(() => {}));
    await recordNotices(page);
    const settings = new DoiSettings(page, ctx);
    const dois = new DoisPage(page, ctx);
    const frame = new WorkflowPage(page, ctx, {labels: {publicationGroup: GROUP[app.name]}});
    const takeNotices = () => page.evaluate(() => {
        const w = /** @type {any} */ (window);
        const seen = w.__doiNotices || [];
        w.__doiNotices = [];
        return seen;
    }).catch(() => []);
    const snap = async (step) => {
        const s = await screen(page);
        record(nm(step), s);
        return s;
    };
    const step = async (k, fn) => {
        try {
            const v = await fn();
            if (v !== undefined) fact(k, v);
        } catch (e) {
            fact(`ERROR ${k}`, flat(String(e && e.stack ? e.stack : e), 900));
            await shot(page, nm(`err-${k.replace(/\W+/g, '-')}`)).catch(() => {});
        }
    };
    /** The DOIs page row of a work, expanded: its table, badge, versions bar and "View all" blocks. */
    const doiRow = async (k, id) => {
        await dois.goto();
        await dois.row(id).waitFor({timeout: T});
        const row = await readDoiRow(page, dois, id);
        await snap(`${k}-dois-row-${id}`);
        row.agencyPanel = flat(await dois.agencyPanel(dois.row(id)).innerText().catch(() => null), 300);
        row.viewAll = await readVersionsWindow(page, dois, id);
        if (row.viewAll) await snap(`${k}-dois-view-all-${id}`);
        await dois.collapse(dois.row(id), id).catch(() => {});
        return row;
    };
    /** The public review record of a work, signed out (no screen calls it; the API the record is). */
    const publicRecord = async (id) => {
        const pub = await pwRequest.newContext();
        try {
            const r = await pub.get(app.url(`/index.php/${ctx}/api/v1/peerReviews/open/submissions/${id}`));
            if (r.status() !== 200) return {status: r.status(), body: flat(await r.text(), 300)};
            const j = await r.json();
            return {status: 200, rounds: (j.reviewRounds || []).map((x) => ({round: x.round ?? x.id, reviews: (x.reviews || []).map((y) => ({id: y.id, doi: y.doi, reviewer: y.reviewerFullName || y.reviewerName || null}))}))};
        } finally {
            await pub.dispose();
        }
    };
    /** The DB, the DOIs page, the public record and what an export/deposit would carry, for a work. */
    const readAll = async (k, id, {rec = false} = {}) => {
        const x = xmlRead(app, [id]);
        const w = x.works[id];
        const out = {
            versions: w.versions.map((v) => `${v.version}${v.published ? ' published' : ''}: ${v.doi || '-'} ${STATUS[v.status] || ''}`.trim()),
            reviews: (w.reviews || []).map((r) => `${r.reviewId} ${r.reviewer}${r.read ? ' read' : ''}${r.public ? ' public' : ''}${r.cancelled ? ' CANCELLED' : ''}: ${r.doi || '-'} ${STATUS[r.status] || ''}`.trim()),
            reviewExportable: w.reviewExportable,
            depositAllTakes: Array.isArray(x.depositable) ? x.depositable.filter((d) => d.submissionId === id).map((d) => `${d.doi} ${STATUS[d.status]} (${d.carriers.join(', ')})`) : x.depositable,
            exportable: x.exportable.includes(id),
            crossref: w.crossref || null,
            crossrefReviews: w.crossrefReviews || null,
            datacite: w.datacite || null,
        };
        out.page = await doiRow(k, id);
        if (rec) out.publicRecord = await publicRecord(id);
        return out;
    };
    const openRound = async (id, name) => {
        await frame.gotoEditorial(id);
        await idle(page);
        const R = require(path.join(app.suiteDir, 'pages', 'ReviewStagePages.js'));
        const wf = new R.WorkflowPage(page, ctx);
        const row = wf.reviewerRow(name);
        if (!(await row.isVisible().catch(() => false))) {
            await frame.selectRound(1);
            await idle(page);
        }
        await row.waitFor({state: 'visible', timeout: T});
        return {R, row};
    };
    const rowText = async (id, name) => {
        const {row} = await openRound(id, name);
        return flat(await row.innerText(), 300);
    };
    const setPublic = async (id, name, on) => {
        const {R, row} = await openRound(id, name);
        const modal = await R.openEditReview(page, row);
        const box = R.publicVisibilityCheckbox(modal);
        const before = await box.isChecked();
        await snap(`edit-review-${id}-${name.split(' ')[1]}-${on ? 'tick' : 'untick'}`);
        if (on) await box.check();
        else await box.uncheck();
        await R.saveEditReview(page, modal);
        await idle(page);
        return {before, after: on, row: await rowText(id, name)};
    };
    const markComplete = async (id, name) => {
        const {R, row} = await openRound(id, name);
        const modal = await R.openReviewDetails(page, row);
        await R.markReviewComplete(page, modal);
        await R.closeReviewDetails(page, modal);
        await idle(page);
        return {row: await rowText(id, name)};
    };
    const cancelReviewer = async (id, name) => {
        const {R, row} = await openRound(id, name);
        const before = flat(await row.innerText(), 300);
        const menu = await R.openRowMenu(page, row);
        const offered = await menu.getByRole('menuitem').allInnerTexts().then((a) => a.map((s) => flat(s)));
        await menu.getByRole('menuitem', {name: 'Cancel Reviewer', exact: true}).click();
        const form = page.locator('form#cancelReviewForm');
        await expect(form).toBeVisible({timeout: T});
        await idle(page);
        const s = await snap(`cancel-window-${id}-${name.split(' ')[1]}`);
        await form.locator('input[name="skipEmail"]').check().catch(() => {});
        await form.getByRole('button', {name: 'Cancel Reviewer', exact: true}).click();
        await expect(form).toBeHidden({timeout: T});
        await idle(page);
        const after = await rowText(id, name);
        await snap(`cancelled-row-${id}-${name.split(' ')[1]}`);
        return {before, offered, window: flat(s.text && s.text.dialog, 500), after};
    };
    const revert = async (id, name) => {
        const {R, row} = await openRound(id, name);
        const before = flat(await row.innerText(), 300);
        await R.revertReviewDecision(page, row);
        await idle(page);
        return {before, after: await rowText(id, name)};
    };
    const accept = async (id) => {
        const {acceptAndSendToProduction} = require('../../issues/public-review-never-shown/lib');
        return acceptAndSendToProduction(page, app, id);
    };
    const publishIssue = async (id) => {
        const {publish} = require('../../issues/recommend-by-author-list-never-shown/lib');
        const r = await publish(page, app, id, ISSUE);
        await snap(`published-${id}`);
        return r;
    };
    const bulk = async (label, id) => {
        await dois.goto();
        await dois.row(id).waitFor({timeout: T});
        const r = await dois.runBulk(label, [id]);
        await sleep(600);
        return {status: r.status(), notices: await takeNotices()};
    };
    const exportOne = async (k, id) => {
        await dois.goto();
        await dois.row(id).waitFor({timeout: T});
        await dois.tick([id]);
        const dialog = await dois.chooseBulkAction('Export DOIs');
        const question = flat(await dialog.innerText(), 400);
        const answered = page.waitForResponse((r) => /\/api\/v1\/dois\/submissions\/export/.test(r.url()) && r.request().method() !== 'GET', {timeout: 60000});
        const downloads = [];
        page.on('download', (d) => downloads.push(d.suggestedFilename()));
        const mark = log.mark();
        await dialog.getByRole('button', {name: 'Export DOIs', exact: true}).click();
        const r = await answered;
        const body = flat(await r.text().catch(() => ''), 900);
        await sleep(2500);
        const s = await snap(`${k}-export-${id}`);
        await shot(page, nm(`${k}-export-${id}`)).catch(() => {});
        const windows = await page.getByRole('dialog').allInnerTexts().then((a) => a.map((x) => flat(x, 500)));
        // close an "Error" window
        await dois.errorDialog().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
        return {question, status: r.status(), body, windows, notices: await takeNotices(), downloads, dialogText: flat(s.text && s.text.dialog, 500), serverLog: log.since(mark)};
    };
    /** Reload the DOIs page until no deposit job is queued (the dataset runs jobs on web requests). */
    const waitDeposits = async () => {
        const started = Date.now();
        let n = 0;
        for (; n < 30; n++) {
            await sleep(4000);
            await dois.reload();
            if (n >= 3 && Number(sql(app, "select count(*) from jobs where payload like '%Deposit%'") || 0) === 0) break;
        }
        return {seconds: Math.round((Date.now() - started) / 1000), reloads: n + 1};
    };
    const failedJobs = (offset) => sql(app, `select substring(payload from 'displayName":"([^"]+)') || ' | ' || split_part(exception, E'\\n', 1) from failed_jobs order by id offset ${offset}`)
        .split('\n').filter(Boolean).map((l) => flat(l, 400));

    try {
        await signIn(page, 'dbarnes');

        if (PHASE === 'setup') {
            const agency = app.name === 'omp' ? null : {plugin: 'crossrefplugin', label: 'Crossref'};
            if (agency) {
                await step('plugin on', async () => {
                    await settings.gotoPlugins(agency.plugin);
                    await settings.setPluginEnabled(agency.plugin, true);
                    return await settings.pluginBox(agency.plugin).isChecked();
                });
            }
            await step('setup save', async () => {
                await settings.goto('Setup');
                await settings.prefixBox().fill(PREFIX);
                const before = await settings.kinds();
                if (app.name === 'ojs') await settings.kindsGroup().getByRole('checkbox', {name: /Peer Review/}).check();
                await snap('setup-before-save');
                const r = await settings.save(settings.setup);
                return {status: r.status(), before, kinds: await settings.kinds(), versioning: await settings.setup.getByRole('group', {name: 'DOI Versioning'}).innerText().then((t) => flat(t, 200)).catch(() => null)};
            });
            if (agency) {
                await step('registration save', async () => {
                    await settings.goto('Registration');
                    await settings.chooseAgency(agency.label);
                    await settings.field('depositorName').fill('Public Knowledge Project');
                    await settings.field('depositorEmail').fill('dbarnes@mailinator.com');
                    await snap('registration-before-save');
                    const r = await settings.save(settings.registration);
                    const state = await settings.agencyState();
                    await settings.goto('Setup');
                    return {status: r.status(), agency: state, kindsAfter: await settings.kinds()};
                });
            }
            await step('dois page', async () => {
                await dois.goto();
                const s = await snap('dois-page');
                return {bulk: await dois.bulkLabels().catch(() => null), depositAll: await dois.depositAllButton().count(), main: flat(s.text && s.text.main, 400)};
            });
        }

        if (PHASE === 'reviewA') {
            // Work 10 "Condensing Water Availability Models…": two submitted reviews (Aisla McCrae, Adela Gallego).
            const W = 10;
            await step('A1 make public', async () => ({mccrae: await setPublic(W, 'Aisla McCrae', true), gallego: await setPublic(W, 'Adela Gallego', true)}));
            await step('A2 mark complete', async () => ({mccrae: await markComplete(W, 'Aisla McCrae'), gallego: await markComplete(W, 'Adela Gallego')}));
            await step('A3 accept and production', async () => accept(W));
            await step('A4 publish', async () => publishIssue(W));
            await step('A5 published, both reviews public', async () => readAll('A5', W, {rec: true}));
            await step('A6 cancel McCrae (Unregistered)', async () => cancelReviewer(W, 'Aisla McCrae'));
            await step('A7 after the cancel', async () => readAll('A7', W, {rec: true}));
            await step('A8 export', async () => exportOne('A8', W));
            const failedBefore = Number(sql(app, 'select count(*) from failed_jobs') || 0);
            await step('A9 deposit DOIs', async () => {
                const r = await bulk('Deposit DOIs', W);
                const s = await snap('A9-after-deposit');
                return {...r, queued: sql(app, `select substring(payload from 'displayName":"([^"]+)') from jobs order by id`).split('\n').filter(Boolean), main: flat(s.text && s.text.main, 300)};
            });
            await step('A10 deposit DOIs, right after', async () => readAll('A10', W));
            await step('A11 background deposit', async () => {
                const w = await waitDeposits();
                const {leftExportFiles} = require('../../issues/deposit-without-doi-reports-success/lib');
                return {...w, failedJobs: failedJobs(failedBefore), exportFilesLeft: leftExportFiles(app)};
            });
            await step('A12 after the background deposit', async () => readAll('A12', W, {rec: true}));
            await step('A13 untick Gallego (status as it reads)', async () => setPublic(W, 'Adela Gallego', false));
            await step('A14 after the untick', async () => readAll('A14', W, {rec: true}));
            await step('A15 failed jobs page', async () => {
                await signIn(page, 'admin');
                await page.goto(app.url('/index.php/index/en/admin/failedJobs'));
                await idle(page);
                const s = await snap('A15-failed-jobs');
                await signIn(page, 'dbarnes');
                return flat(s.text && s.text.main, 900);
            });
        }

        if (PHASE === 'errorEnd') {
            const W = 10;
            const gallego = () => (xmlRead(app, [W]).works[W].reviews || []).find((r) => r.reviewer === 'agallego');
            await step('E1 tick Gallego again', async () => setPublic(W, 'Adela Gallego', true));
            await step('E2 public again', async () => readAll('E2', W, {rec: true}));
            await step('E3 DOI set to Error (database)', async () => {
                const g = gallego();
                if (!g || !g.doiId) return {skipped: 'no DOI', g};
                sql(app, `update dois set status = 4 where doi_id = ${g.doiId}`);
                return {doiId: g.doiId, was: STATUS[g.status], now: STATUS[gallego().status]};
            });
            await step('E4 Error read', async () => readAll('E4', W, {rec: true}));
            await step('E5 untick Gallego (Error)', async () => setPublic(W, 'Adela Gallego', false));
            await step('E6 after the untick', async () => readAll('E6', W, {rec: true}));
            await step('E7 tick Gallego again', async () => setPublic(W, 'Adela Gallego', true));
            await step('E8 public again', async () => readAll('E8', W, {rec: true}));
        }

        if (PHASE === 'reviewB') {
            // Work 13 "Hydrologic Connectivity…": three submitted reviews the editor already counted as read.
            const W = 13;
            const names = ['Julie Janssen', 'Aisla McCrae', 'Adela Gallego'];
            await step('B0 rows', async () => {
                const out = {};
                for (const n of names) out[n] = await rowText(W, n);
                await snap('B0-round');
                return out;
            });
            await step('B1 make public', async () => {
                const out = {};
                for (const n of names) out[n] = await setPublic(W, n, true);
                return out;
            });
            await step('B2 accept and production', async () => accept(W));
            await step('B3 publish', async () => publishIssue(W));
            await step('B4 published', async () => readAll('B4', W, {rec: true}));
            await step('B5 mark registered', async () => bulk('Mark DOIs Registered', W));
            await step('B6 registered', async () => readAll('B6', W, {rec: true}));
            await step('B7 cancel Janssen (Registered)', async () => cancelReviewer(W, 'Julie Janssen'));
            await step('B8 after the cancel', async () => readAll('B8', W, {rec: true}));
            await step('B9 mark needs sync', async () => bulk('Mark DOIs Needs Sync', W));
            await step('B10 needs sync', async () => readAll('B10', W));
            await step('B11 untick McCrae (Needs Sync)', async () => setPublic(W, 'Aisla McCrae', false));
            await step('B12 revert Gallego (Needs Sync)', async () => revert(W, 'Adela Gallego'));
            await step('B13 after untick and revert', async () => readAll('B13', W, {rec: true}));
            const failedBefore = Number(sql(app, 'select count(*) from failed_jobs') || 0);
            await step('B14 deposit all', async () => {
                const {depositAll} = require('../../issues/deposit-without-doi-reports-success/lib');
                await dois.goto();
                const r = await depositAll(page, dois);
                await sleep(600);
                return {status: r.status, window: r.window, notices: await takeNotices(),
                    queued: sql(app, `select substring(payload from 'displayName":"([^"]+)') from jobs order by id`).split('\n').filter(Boolean)};
            });
            await step('B15 deposit all, right after', async () => readAll('B15', W));
            await step('B16 background deposit', async () => {
                const w = await waitDeposits();
                const {leftExportFiles} = require('../../issues/deposit-without-doi-reports-success/lib');
                return {...w, failedJobs: failedJobs(failedBefore), exportFilesLeft: leftExportFiles(app)};
            });
            await step('B17 after the background deposit', async () => readAll('B17', W, {rec: true}));
        }

        if (PHASE === 'titles') {
            const E = {ojs: 5, ops: 1}[app.name];
            const AMP = {ojs: 9, ops: 8}[app.name];
            await step('T1 dataset title control', async () => {
                if (app.name === 'ojs') await publishIssue(AMP); // OJS 9 is in Production; OPS 8 is posted
                const r = await bulk('Assign DOIs', AMP);
                return {assign: r, read: await readAll('T1', AMP)};
            });
            await step('T2 retitle', async () => retypeTitle(page, app, E, 'hkrb forest trees & shrubs'));
            await step('T3 subtitle', async () => retypeTitleBoxes(page, app, E, {subtitle: 'rocks & sand'}));
            await step('T3 workflow heading', async () => {
                const s = await snap('T3-title-abstract');
                return flat(s.text && (s.text.dialog || s.text.main), 300);
            });
            await step('T4 publish', async () => {
                if (app.name === 'ojs') return publishIssue(E);
                await frame.gotoEditorial(E);
                await frame.expectVersionLoaded().catch(() => {});
                const st = await publishLatest(page, frame, POST[app.name], null);
                await snap(`posted-${E}`);
                return {status: st};
            });
            await step('T5 assign', async () => bulk('Assign DOIs', E));
            await step('T6 retitled work', async () => readAll('T6', E));
            await step('T7 export on screen', async () => exportOne('T7', E));
            await step('T8 reader page heading', async () => {
                const reader = await launch(app);
                try {
                    const where = app.name === 'ops' ? 'preprint' : 'article';
                    await reader.page.goto(app.url(`/index.php/${ctx}/${where}/view/${E}`));
                    await idle(reader.page);
                    const s = await screen(reader.page);
                    record(nm('T8-reader-page'), s);
                    return {h1: await reader.page.locator('h1').first().innerHTML().catch(() => null), subtitle: await reader.page.locator('.subtitle').first().innerHTML().catch(() => null)};
                } finally {
                    await reader.close();
                }
            });
        }

        if (PHASE === 'versions') {
            const a = {ojs: {one: 1}, omp: {one: 14}, ops: {one: 2, two: 3}}[app.name];
            if (app.name !== 'ops') {
                await step('V0 versioning yes', async () => {
                    await settings.goto('Setup');
                    await settings.versioningRadio('Yes').check();
                    await snap('V0-setup');
                    const r = await settings.pressSave(settings.setup);
                    await sleep(1500);
                    const s = await snap('V0-setup-saved');
                    return {status: r.status(), saved: await settings.savedStatus(settings.setup).count(), errors: flat(s.text && s.text.main, 200) && await settings.setup.locator('.pkpFormFieldError, [id$="-error"]').allInnerTexts().catch(() => [])};
                });
            }
            // one family: 1.0 (+ OJS 1's unpublished 1.1), then a minor version published
            await step('V1 assign one', async () => bulk('Assign DOIs', a.one));
            await step('V2 one version read', async () => readAll('V2', a.one));
            if (app.name === 'ojs') {
                await step('V3 publish 1.1', async () => {
                    await frame.gotoEditorial(a.one);
                    await frame.expectVersionLoaded().catch(() => {});
                    const ojsScreen = new (require(path.join(app.suiteDir, 'pages', 'PublishSchedulePages.js')).PublishScreen)(page, ctx);
                    return {status: await publishLatest(page, frame, 'Publish', ojsScreen)};
                });
            } else {
                await step('V3 minor version', async () => {
                    await frame.gotoEditorial(a.one);
                    await frame.expectVersionLoaded().catch(() => {});
                    const created = await createVersion(page, frame, 'Minor Revision');
                    await frame.gotoEditorial(a.one);
                    await frame.expectVersionLoaded().catch(() => {});
                    created.post = await publishLatest(page, frame, POST[app.name], null);
                    return created;
                });
            }
            await step('V4 one family, 1.0 + 1.1', async () => readAll('V4', a.one));
            if (a.two) {
                await step('V5 assign two', async () => bulk('Assign DOIs', a.two));
                await step('V6 1.0 + 2.0', async () => readAll('V6', a.two));
                await step('V7 minor 2.1', async () => {
                    await frame.gotoEditorial(a.two);
                    await frame.expectVersionLoaded().catch(() => {});
                    const created = await createVersion(page, frame, 'Minor Revision');
                    await frame.gotoEditorial(a.two);
                    await frame.expectVersionLoaded().catch(() => {});
                    created.post = await publishLatest(page, frame, POST[app.name], null);
                    return created;
                });
                await step('V8 1.0 + 2.0 + 2.1', async () => readAll('V8', a.two));
                await step('V9 export on screen', async () => exportOne('V9', a.two));
            }
        }

        if (PHASE === 'datacite') {
            await step('D1 plugin on', async () => {
                await settings.gotoPlugins('dataciteplugin');
                await settings.setPluginEnabled('dataciteplugin', true);
                return await settings.pluginBox('dataciteplugin').isChecked();
            });
            await step('D2 registration', async () => {
                await settings.goto('Registration');
                await settings.chooseAgency('DataCite');
                await settings.field('username').fill('u45h15');
                await snap('D2-registration');
                const r = await settings.save(settings.registration);
                return {status: r.status(), agency: await settings.agencyState()};
            });
            await step('D3 setup kinds', async () => {
                await settings.goto('Setup');
                const before = await settings.kinds();
                await settings.kindBox('Articles').check();
                await settings.kindBox('Article galleys, such as a published PDF').check();
                if (!(await settings.prefixBox().inputValue())) await settings.prefixBox().fill(PREFIX);
                const r = await settings.save(settings.setup);
                return {status: r.status(), before, after: await settings.kinds()};
            });
            const W = 17;
            await step('D4 assign 17', async () => bulk('Assign DOIs', W));
            await step('D5 both DOIs', async () => readAll('D5', W));
            await step('D6 export, both DOIs', async () => exportOne('D6', W));
            await step('D7 clear the article DOI', async () => {
                await dois.goto();
                const row = dois.row(W);
                await row.waitFor({timeout: T});
                await dois.expand(row, W);
                const types = await dois.doiTypes(row);
                await dois.startEditing(row);
                const box = dois.doiRows(row).first().locator('input[type="text"]');
                const before = await box.inputValue();
                await box.fill('');
                const statuses = await dois.saveEditing(row, {expectRequests: false});
                await idle(page);
                await sleep(800);
                await snap('D7-article-doi-cleared');
                return {types, before, statuses, notices: await takeNotices()};
            });
            await step('D8 galley DOI only', async () => readAll('D8', W));
            await step('D9 export, galley DOI only', async () => exportOne('D9', W));
            await step('D10 export, no DOI (work 9 cleared)', async () => {
                const id = 9;
                await dois.goto();
                const row = dois.row(id);
                await row.waitFor({timeout: T});
                const r = await readAll('D10', id);
                let cleared = null;
                if (r.versions.some((v) => /10\.1234/.test(v))) {
                    await dois.expand(row, id);
                    await dois.startEditing(row);
                    await dois.doiRows(row).first().locator('input[type="text"]').fill('');
                    cleared = await dois.saveEditing(row, {expectRequests: false});
                    await idle(page);
                }
                return {before: r, cleared, after: await readAll('D10b', id), export: await exportOne('D10', id)};
            });
        }
    } finally {
        facts.serverLog = log.since(logFrom);
        record(nm('facts'), facts);
        await close();
    }
});
