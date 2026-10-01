// Issue report docs/issues/U63-A8-native-import-other-context-resets-contributor-roles.md (U63 A8,
// the contributor-role line): the report's Steps to reproduce, walked through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"), as the dataset's `admin`.
// The second context is created on screen; the kit builds nothing.
//
//   1. sign in as admin
//   2. Administration › Hosted Journals (Presses, Servers) › "Create Journal" ("Create Press",
//      "Create Server"): path u63ir11
//   3. publicknowledge › Tools › "Native XML Plugin", export tab: tick the submission (OJS 8, OMP 2,
//      OPS 1), export, "Download Exported File"
//   4. u63ir11 › Tools › "Native XML Plugin" › "Import": upload the file, "Import"; the results tab
//   5. the imported submission's workflow in u63ir11 › "Contributors"
// SAME_CONTEXT=1 (control, and the neighbour check for the fix): step 2 skipped, the file imported
// back into publicknowledge; every role must stay as it was.
// Besides the screens it reads each contributor's stored roles in both contexts.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir11 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir11 PROBE_AGENT=ir11 node bin/probe.js all shared/playwright/checks/issues/native-import-other-context-resets-contributor-roles/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir11-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir11-3_5 PROBE_AGENT=ir11 node bin/probe.js all shared/playwright/checks/issues/native-import-other-context-resets-contributor-roles/walk.js
// Facts: .reports/<feature>/ir11/walk[-<run>]-<app>.json
const fs = require('fs');
const {forEachApp, launch, signIn, record, sql, outFile} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

const SUBS = {
    ojs: {id: 8, title: 'Traditions and Trends in the Study of the Commons'},
    omp: {id: 2, title: 'The West and Beyond: New Perspectives on an Imagined Region'},
    ops: {id: 1, title: 'The influence of lactation on the quantity and quality of cashmere production'},
};
const TARGET = 'u63ir11';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const same = !!process.env.SAME_CONTEXT;
    const target = same ? app.contextPath : TARGET;
    const S = SUBS[app.name];
    const f = {app: app.name, line: app.line || 'main', target, submission: S.id, sourceRoles: L.storedRoles(app, S.id)};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const errs = native.scriptErrors(page);
    const w = native.watch(page);
    try {
        await signIn(page, 'admin');
        if (!same) {
            f.createStatus = await L.createContext(page, app, {name: `${TARGET} Second`, initials: 'U63IR11', path: TARGET, email: `${TARGET}@mailinator.com`});
            const T_ = app.contextTables;
            if (L.hasContributorRoles(app)) f.targetRoleRows = sql(app, `SELECT contributor_role_id || ' ' || contributor_role_identifier FROM contributor_roles WHERE context_id = (SELECT ${T_.id} FROM ${T_.table} WHERE path = '${TARGET}') ORDER BY 1`).split('\n');
        }
        await native.openNative(app, page);
        const out = await native.exportOne(app, page, S.title);
        const file = outFile(`roles-sub${S.id}.xml`);
        fs.writeFileSync(file, out.xml);
        f.fileRoles = [...out.xml.matchAll(/<contributor_roles>([\s\S]*?)<\/contributor_roles>/g)].map((m) => L.flat(m[1], 200));
        f.fileUserGroupRefs = [...out.xml.matchAll(/user_group_ref="([^"]*)"/g)].map((m) => m[1]);
        await native.openNative({...app, contextPath: target}, page);
        const res = await native.importFile(page, file);
        f.tabs = res.tabs;
        f.results = res.panel;
        f.importScreen = await native.snap(page, `import-results-${same ? 'same' : 'other'}`);
        const m = /"(\d+)" - "/.exec(res.panel || '');
        f.copy = m ? Number(m[1]) : null;
        f.errorsListed = /Errors occured/.test(res.panel || '');
        if (f.copy) {
            f.copyRoles = L.storedRoles(app, f.copy);
            f.contributorsPage = await L.readContributors(page, app, target, f.copy);
            f.contributorsScreen = await native.snap(page, `contributors-${same ? 'same' : 'other'}`);
        }
        console.log(`[walk] ${app.name} ${f.line} → ${target}: copy ${f.copy}; errors listed ${f.errorsListed}; roles ${JSON.stringify(f.copyRoles)}`);
    } catch (e) {
        f.error = String(e.message).slice(0, 400);
        console.log(`[walk] ${app.name} ERROR ${f.error}`);
    } finally {
        f.responses = w.seen.filter((r) => r.status >= 400 || r.method !== 'GET');
        f.scriptErrors = errs;
        record(same ? 'walk-same' : 'walk', f);
        await close();
    }
});
