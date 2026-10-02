// Issue report docs/issues/U64-A5-section-editor-counter-r5-error-while-restricted.md (U64 A5):
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), as the dataset's `rvaca` (manager) and `dbuskins`
// (Section editor; Series editor on OMP, Moderator on OPS), on its own context `publicknowledge`.
// Helpers: lib.js. The kit builds nothing.
//
// WALK_MODE=steps (default):
//   1. rvaca: Settings › Distribution › "Statistics"
//   2. "Public API": untick "Make the COUNTER SUSHI statistics publicly available", "Save"
//   3. dbuskins: side menu "Statistics" › "Counter R5" (when the menu does not offer it, the page's
//      address is typed instead and what it shows is recorded)
//   control: rvaca's "Counter R5" while restricted
// WALK_MODE=neighbour (runs alone; the fix must leave these as they are):
//   N1 public (the default): dbuskins' side menu offers "Counter R5" and the page lists the reports
//   N2 rvaca restricts (steps 1-2); rvaca's side menu offers "Counter R5" and the page lists the reports
//   N3 restricted: dbuskins' Statistics › "Articles" ("Monographs", "Preprints") still opens
//   N4 rvaca ticks the box again, "Save"; dbuskins' "Counter R5" lists the reports again
// Besides the screens it reads the context's stored isSushiApiPublic row after each save.
//
// Reset first:  npm run fleet-prep -- --feature issues-u64d --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u64d PROBE_AGENT=u64d node bin/probe.js all shared/playwright/checks/issues/section-editor-counter-r5-error-while-restricted/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u64d-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u64d-3_5 PROBE_AGENT=u64d node bin/probe.js all shared/playwright/checks/issues/section-editor-counter-r5-error-while-restricted/walk.js
// Neighbour:    WALK_MODE=neighbour PROBE_RUN=nb-out … (and nb-in with the fix applied)
// Facts: .reports/<feature>/u64d/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, sql} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.WALK_MODE || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const ctx = app.contextPath;
    const {settings, id} = app.contextTables;
    const stored = () => sql(app, `select ${id} || ':' || coalesce(setting_value, 'NULL') from ${settings} where setting_name = 'isSushiApiPublic' order by ${id}`) || null;
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 900)}`);
    };
    const snap = async (page, name) => {
        record(name, await screen(page));
        await shot(page, name).catch(() => {});
    };
    const step = async (name, fn) => {
        try {
            return await fn();
        } catch (e) {
            const v = {failed: String(e).split('\n')[0].slice(0, 300)};
            fact(`${name} FAILED`, v);
            return v;
        }
    };
    fact('stored at start', stored());

    const {page, close} = await launch(app);
    const failures = L.watchFailures(page);
    // Steps 1 and 2 (and N4 with ticked = true): the manager sets the "Public API" box and saves.
    const setPublic = async (key, ticked) => {
        await signIn(page, 'rvaca');
        const tab = await L.openContextStatistics(page, app, ctx);
        const before = await L.readPublicBox(page);
        const save = await step(`${key} save`, () => L.savePublicBox(page, ticked));
        await snap(page, `${key}-saved`);
        fact(key, {tab, before, ...save, stored: stored()});
    };
    // Step 3, for any user: the side menu, then "Counter R5".
    const counterR5 = async (key, username) => {
        await signIn(page, username);
        const seen = await step(key, () => L.openCounterR5(page, app, ctx));
        await snap(page, key);
        fact(key, seen);
        await L.dismissError(page);
        return seen;
    };
    try {
        if (MODE === 'steps') {
            await setPublic('1-2 rvaca restricts', false);
            await counterR5('3 dbuskins Counter R5 restricted', 'dbuskins');
            await counterR5('control rvaca Counter R5 restricted', 'rvaca');
        } else {
            await counterR5('N1 dbuskins Counter R5 public', 'dbuskins');
            await setPublic('N2 rvaca restricts', false);
            await counterR5('N2 rvaca Counter R5 restricted', 'rvaca');
            await signIn(page, 'dbuskins');
            const first = await step('N3', () => L.openFirstStatistics(page, app, ctx));
            await snap(page, 'N3 dbuskins first statistics page restricted');
            fact('N3 dbuskins first statistics page restricted', first);
            await setPublic('N4 rvaca makes public again', true);
            await counterR5('N4 dbuskins Counter R5 public again', 'dbuskins');
        }
    } finally {
        fact('failures', failures);
        record('facts', facts);
        await close();
    }
});
