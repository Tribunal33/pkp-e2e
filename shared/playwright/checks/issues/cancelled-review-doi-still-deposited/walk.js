// U45 OJS10 issue walk (housekeeping 2026-10-15, reporter k6): a review whose reviewer is cancelled after the editor
// read it keeps its DOI on the DOIs page, in the marks and in the deposits. Takes the report's Steps through the
// screens on PKP's default test dataset (a dataset fleet, `publicknowledge`, as `dbarnes`), submission 13
// ("Hydrologic Connectivity…", three completed reviews the editor has read).
//
// Modes (WALK=…), each from a freshly reset fleet, one process:
//   steps  (default) Steps 1–17: setup, the three reviews public, accept, production, publish; then Julie Janssen
//          cancelled while her DOI is "Unregistered" (page, public record, "Deposit DOIs"), then Aisla McCrae cancelled
//          once the work's DOIs are "Registered" ("Mark DOIs Needs Sync", "Deposit All").
//   nb     neighbour: steps 1–8, Janssen cancelled, then "Reinstate Reviewer" and "Assign DOIs"; Adela Gallego's review,
//          never cancelled, keeps its row and goes with "Deposit DOIs" (the fix must leave both alone).
// On a line whose DOIs "Setup" offers no "Peer Reviews" kind (3.5), it records the kinds and stops.
// OJS only: OMP and OPS have no peer-review DOIs.
//
// Reset: npm run fleet-prep -- --feature issues-k6 --dataset 8 --reset
// Run:   bin/app-lock.sh shared ojs -- env [WALK=nb] PROBE_FEATURE=issues-k6 PROBE_AGENT=k6 [PROBE_RUN=…] \
//          node bin/probe.js ojs shared/playwright/checks/issues/cancelled-review-doi-still-deposited/walk.js
// 3.5:   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-k6-3_5 --dataset 8 --reset; then
//        PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-k6-3_5 PROBE_AGENT=k6 node bin/probe.js ojs <this>
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib');

const WALK = process.env.WALK || 'steps';
const W = 13;
const ISSUE = /Vol\. 1 No\. 2 \(2014\)/;
const JANSSEN = 'Julie Janssen';
const MCCRAE = 'Aisla McCrae';
const GALLEGO = 'Adela Gallego';

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        console.log(`[k6] ${app.name}: no peer-review DOIs; skipped`);
        return;
    }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {DoiSettings, DoisPage, recordNotices} = require('../../../pages/DoisPages.js');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {readDoiRow} = require('../../issues/minor-version-new-galley-dois/lib');
    const ctx = app.contextPath;
    const facts = {app: app.name, walk: WALK, line: app.line || 'main', run: process.env.PROBE_RUN || null, steps: {}};
    const nm = (s) => `k6-${WALK}-${s}`;
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };

    const {page} = await launch(app);
    page.on('dialog', (d) => d.accept().catch(() => {}));
    await recordNotices(page);
    const settings = new DoiSettings(page, ctx);
    const dois = new DoisPage(page, ctx);
    const frame = new WorkflowPage(page, ctx, {labels: {publicationGroup: 'Publication'}});
    const takeNotices = () => page.evaluate(() => {
        const w = /** @type {any} */ (window);
        const seen = w.__doiNotices || [];
        w.__doiNotices = [];
        return seen;
    }).catch(() => []);
    const snap = async (k) => {
        const s = await screen(page);
        record(nm(k), s);
        return s;
    };
    const step = async (k, fn) => {
        try {
            const v = await fn();
            if (v !== undefined) fact(k, v);
            return v;
        } catch (e) {
            fact(`ERROR ${k}`, L.flat(String(e && e.stack ? e.stack : e), 900));
            await shot(page, nm(`err-${k.replace(/\W+/g, '-')}`)).catch(() => {});
            return null;
        }
    };
    /** The DOIs page, the work's row expanded: each DOI row's label, DOI and badge. */
    const doiRow = async (k) => {
        await dois.goto();
        await dois.row(W).waitFor({timeout: L.T});
        const row = await readDoiRow(page, dois, W);
        await snap(`${k}-dois-row`);
        await shot(page, nm(`${k}-dois-row`)).catch(() => {});
        await dois.collapse(dois.row(W), W).catch(() => {});
        return {rows: row.rows.map((r) => `${r.type}: ${r.doi || '-'} ${r.badge}`.trim()), rowBadge: row.rowBadge};
    };
    const read = async (k, {rec = false} = {}) => {
        const out = {page: await doiRow(k), stored: L.storedReviews(app, W), ...L.exportLists(app, W)};
        if (rec) out.publicRecord = await L.publicRecord(app, W);
        return out;
    };
    const bulk = async (label) => {
        await dois.goto();
        await dois.row(W).waitFor({timeout: L.T});
        const r = await dois.runBulk(label, [W]);
        await L.sleep(600);
        return {status: r.status(), notices: await takeNotices()};
    };
    const queued = () => L.flat(require('../../../probe').sql(app, `select substring(payload from 'displayName":"([^"]+)') || ' ' || coalesce(substring(payload from 'reviewId\\\\";i:(\\d+)'), '') from jobs order by id`), 600);

    try {
        await signIn(page, 'dbarnes');

        // Steps 1–3: Crossref on, prefix and "Peer Reviews", the agency.
        const kinds = await step('S1-3 setup', async () => {
            await settings.gotoPlugins('crossrefplugin');
            const pluginRow = L.flat(await settings.pluginRow('crossrefplugin').innerText().catch(() => null), 200);
            await settings.setPluginEnabled('crossrefplugin', true);
            await settings.goto('Setup');
            await settings.prefixBox().fill('10.1234');
            const offered = await settings.kinds();
            const pr = settings.kindsGroup().getByRole('checkbox', {name: /Peer Review/});
            if (!(await pr.count())) {
                await snap('setup-no-peer-review');
                return {pluginRow, offered, peerReviewKind: false};
            }
            await pr.check();
            await snap('setup-before-save');
            const r = await settings.save(settings.setup);
            await settings.goto('Registration');
            await settings.chooseAgency('Crossref');
            await settings.field('depositorName').fill('Public Knowledge Project');
            await settings.field('depositorEmail').fill('dbarnes@mailinator.com');
            await snap('registration-before-save');
            const r2 = await settings.save(settings.registration);
            await settings.goto('Setup');
            return {pluginRow, offered, peerReviewKind: true, setupSave: r.status(), registrationSave: r2.status(), kindsAfter: await settings.kinds(),
                automatic: L.flat(await settings.creationTimeShown().catch(() => null), 200)};
        });
        if (!kinds || kinds.peerReviewKind === false) {
            record(nm('facts'), facts);
            return;
        }

        // Step 4: the three reviews public. Steps 5–7: accept, production, publish.
        await step('S4 rows before', async () => ({janssen: await L.rowText(page, app, frame, W, JANSSEN), mccrae: await L.rowText(page, app, frame, W, MCCRAE), gallego: await L.rowText(page, app, frame, W, GALLEGO)}));
        await step('S4 make public', async () => ({janssen: await L.setPublic(page, app, frame, W, JANSSEN, true), mccrae: await L.setPublic(page, app, frame, W, MCCRAE, true), gallego: await L.setPublic(page, app, frame, W, GALLEGO, true)}));
        await step('S5-6 accept and production', async () => require('../../issues/public-review-never-shown/lib').acceptAndSendToProduction(page, app, W));
        await step('S7 publish', async () => {
            const r = await require('../../issues/recommend-by-author-list-never-shown/lib').publish(page, app, W, ISSUE);
            await snap('published');
            return r;
        });
        await step('S8 published', async () => read('S8', {rec: true}));

        // Step 9: Julie Janssen cancelled (DOI "Unregistered").
        await step('S9 cancel Janssen', async () => {
            const r = await L.cancelReviewer(page, app, frame, W, JANSSEN);
            await snap('S9-cancelled-row');
            await shot(page, nm('S9-cancelled-row')).catch(() => {});
            return r;
        });
        await step('S10-11 after the cancel', async () => read('S11', {rec: true}));

        if (WALK === 'steps') {
            await step('S12 deposit DOIs', async () => ({...(await bulk('Deposit DOIs')), queued: queued()}));
            await step('S12 after the deposit', async () => {
                // The dataset runs queued jobs on web requests: reload until none is left (each deposit fails at
                // connecting on the test install, which has no way out).
                for (let i = 0; i < 12; i++) {
                    await L.sleep(4000);
                    await dois.reload();
                    if (i >= 2 && !queued()) break;
                }
                const failed = require('../../../probe').sql(app, `select substring(payload from 'displayName":"([^"]+)') || ' ' || coalesce(substring(payload from 'reviewId\\\\";i:(\\d+)'), '') from failed_jobs order by id`);
                return {...(await read('S12')), failedJobs: L.flat(failed, 800)};
            });
            await step('S13 mark registered', async () => bulk('Mark DOIs Registered'));
            await step('S13 registered', async () => read('S13'));
            await step('S14 cancel McCrae (Registered)', async () => L.cancelReviewer(page, app, frame, W, MCCRAE));
            await step('S15 after the cancel', async () => read('S15', {rec: true}));
            await step('S16 mark needs sync', async () => bulk('Mark DOIs Needs Sync'));
            await step('S16 needs sync', async () => read('S16'));
            await step('S17 deposit all', async () => {
                const {depositAll} = require('../../issues/deposit-without-doi-reports-success/lib');
                await dois.goto();
                const r = await depositAll(page, dois);
                await L.sleep(600);
                return {status: r.status, window: r.window, notices: await takeNotices(), queued: queued()};
            });
            await step('S17 after deposit all', async () => read('S17'));
        }

        if (WALK === 'nb') {
            // The fix must not reach a review that is not cancelled, nor keep a reinstated one off the page.
            await step('N1 reinstate Janssen', async () => L.reinstateReviewer(page, app, frame, W, JANSSEN));
            await step('N2 after the reinstate', async () => read('N2', {rec: true}));
            await step('N3 assign DOIs', async () => bulk('Assign DOIs'));
            await step('N4 after assign', async () => read('N4'));
            await step('N5 deposit DOIs', async () => ({...(await bulk('Deposit DOIs')), queued: queued()}));
            await step('N6 after the deposit', async () => read('N6'));
        }
    } finally {
        record(nm('facts'), facts);
        await signOut(page).catch(() => {});
    }
});
