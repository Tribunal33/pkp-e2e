// Issue report docs/issues/U63-A10-export-list-stages-skip-published.md (U63 A10): the report's
// Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), as the dataset's `dbarnes`, on `publicknowledge`. All three apps.
//   1. sign in as dbarnes
//   2. open Tools › Import/Export › "Native XML Plugin"
//   3. press "Export Articles" ("Export", "Export Preprints"): the whole list
//   4. press "Filters": the groups and their buttons
//   5. press "Production"
//   6. press every other button of the "Stages" group as well
//   Control: press every pressed stage again (the filters cleared): the whole list.
//   Neighbour (the fix must leave it alone): "Production" alone lists exactly the submissions whose
//   workflow is in production, and a section filter alone ("Articles", "Preprints") still lists the
//   section's published submissions.
// Facts (not steps): the fleet's database says which submissions are published and in which stage.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir13 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir13 PROBE_AGENT=ir13 node bin/probe.js all shared/playwright/checks/issues/export-list-stages-skip-published/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir13-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir13-3_5 PROBE_AGENT=ir13 node bin/probe.js all shared/playwright/checks/issues/export-list-stages-skip-published/walk.js
// Facts: .reports/<feature>/ir13/walk[-<run>]-<app>.json
const {forEachApp, launch, signIn, record, sql} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

const SECTION = {ojs: 'Articles', omp: null, ops: 'Preprints'};

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    const errs = native.scriptErrors(page);
    const w = native.watch(page);
    try {
        const ctx = app.contextTables;
        const rows = await sql(app, `select s.submission_id, s.stage_id, s.status from submissions s join ${ctx.table} c on c.${ctx.id} = s.context_id where c.path = 'publicknowledge' order by 1`);
        const db = String(rows).trim().split('\n').filter(Boolean).map((l) => l.split('|').map(Number));
        f.db = {
            published: db.filter((r) => r[2] === 3).map((r) => r[0]),
            publishedStages: [...new Set(db.filter((r) => r[2] === 3).map((r) => r[1]))],
            production: db.filter((r) => r[1] === 5).map((r) => r[0]),
        };
        // 1
        await signIn(page, 'dbarnes');
        // 2
        await native.openNative(app, page);
        // 3
        await native.openExportTab(app, page);
        f.step3 = await L.settleList(page);
        f.step3.items = undefined;
        // 4
        f.step4 = await L.openFilters(page);
        await native.snap(page, 'step4-filters');
        const stages = (f.step4.find((g) => g.heading === 'Stages') || {buttons: []}).buttons;
        // 5
        const s5 = await L.pressFilter(page, 'Production');
        f.step5 = {count: s5.count, ids: s5.ids, titles: s5.items.map((i) => i.title)};
        await native.snap(page, 'step5-production');
        // 6
        f.step6 = [];
        for (const b of stages.filter((x) => x !== 'Production')) {
            const s = await L.pressFilter(page, b);
            f.step6.push({pressed: b, count: s.count, ids: s.ids});
        }
        await native.snap(page, 'step6-every-stage');
        const last = f.step6.length ? f.step6[f.step6.length - 1] : f.step5;
        f.result = {
            stages,
            publishedListedUnderEveryStage: f.db.published.filter((id) => last.ids.includes(id)),
            publishedMissingUnderEveryStage: f.db.published.filter((id) => !last.ids.includes(id)),
            wholeList: f.step3.count,
            underEveryStage: last.count,
        };
        // Control
        for (const b of stages) await L.pressFilter(page, b);
        const c = await L.settleList(page);
        f.control = {count: c.count, publishedListed: f.db.published.filter((id) => c.ids.includes(id))};
        // Neighbour
        const n1 = await L.pressFilter(page, 'Production');
        f.neighbour = {productionAlone: n1.ids, productionIsWorkflowProduction: JSON.stringify(n1.ids) === JSON.stringify(f.db.production)};
        await L.pressFilter(page, 'Production');
        if (SECTION[app.name]) {
            const n2 = await L.pressFilter(page, SECTION[app.name]);
            f.neighbour.sectionAlone = {pressed: SECTION[app.name], count: n2.count, publishedListed: f.db.published.filter((id) => n2.ids.includes(id))};
            await L.pressFilter(page, SECTION[app.name]);
        }
    } catch (e) {
        f.error = native.flat(e.stack, 900);
        await native.snap(page, 'error').catch(() => {});
    } finally {
        w.stop();
        f.serverErrors = w.seen.filter((x) => x.status >= 500);
        f.scriptErrors = errs;
        record('walk', f);
        console.log(`[walk] ${app.name}`, JSON.stringify(f, null, 1).slice(0, 3000));
        await close();
    }
});
