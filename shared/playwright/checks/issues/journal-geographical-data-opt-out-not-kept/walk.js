// Issue report docs/issues/U64-A4-journal-geographical-data-opt-out-not-kept.md (U64 A4):
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), as the dataset's `admin` and `rvaca`, on its
// own context `publicknowledge`. Helpers: lib.js. The kit builds nothing.
//
// WALK_MODE=steps (default):
//   1. admin: Administration › Site Settings › "Site Setup" › "Statistics": "Collect the visitor's
//      country, region and city", "Save"
//   2. rvaca: Settings › Distribution › "Statistics" (the site's level is chosen)
//   3. "Do not collect any geographical data", "Save"
//   4. the page loaded again, "Statistics"
//   5. Statistics › "Articles" ("Monographs", "Preprints") › "Download Report"
//   control: 3 to 5 with "Collect the visitor's country"
// WALK_MODE=neighbour (runs alone; the fix must leave these as they are):
//   N1 site at city level; the context's tab before any save shows the site's level, and
//      "Download Report" offers "Download Geographic" (stats_cities)
//   N2 "Collect the visitor's country", "Save", reload: kept; the file is stats_countries
//   N3 (OJS) admin: Hosted Journals › "Create Journal" "Geo <tag>"; its "Statistics" tab shows the
//      site's level chosen
// MIGRATED=1 (fix trials only) first runs the one statement the proposed upgrade migration runs:
//   it deletes the contexts' stored enableGeoUsageStats = 'disabled' rows.
// Besides the screens it reads the stored setting rows (site and context) after each save.
//
// Reset first:  npm run fleet-prep -- --feature issues-u64b --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u64b PROBE_AGENT=u64b node bin/probe.js all shared/playwright/checks/issues/journal-geographical-data-opt-out-not-kept/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u64b-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u64b-3_5 PROBE_AGENT=u64b node bin/probe.js all shared/playwright/checks/issues/journal-geographical-data-opt-out-not-kept/walk.js
// Neighbour:    WALK_MODE=neighbour PROBE_RUN=nb-out … (and nb-in with the fix applied and MIGRATED=1)
// Facts: .reports/<feature>/u64b/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, sql, tag} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.WALK_MODE || 'steps';
const MIGRATED = process.env.MIGRATED === '1';
const CONTEXT_API = /\/api\/v1\/contexts\/\d+/;
const SITE_API = /\/api\/v1\/site/;

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const ctx = app.contextPath;
    const {settings, id} = app.contextTables;
    const stored = () => ({
        site: sql(app, "select setting_value from site_settings where setting_name = 'enableGeoUsageStats'") || null,
        contexts: sql(app, `select ${id} || ':' || setting_value from ${settings} where setting_name = 'enableGeoUsageStats' order by ${id}`) || null,
    });
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: MODE, migrated: MIGRATED};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 700)}`);
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
    if (MIGRATED) {
        sql(app, `delete from ${settings} where setting_name = 'enableGeoUsageStats' and setting_value = 'disabled'`);
    }
    fact('stored at start', stored());

    const {page, close} = await launch(app);
    const failures = L.watchFailures(page);
    // One choice on the context's tab, a reload, and the report window: steps 3 to 5.
    const choose = async (key, label) => {
        const save = await step(`${key} save`, () => L.saveGeo(page, label, CONTEXT_API));
        await snap(page, `${key}-saved`);
        fact(`${key} 3 chosen and saved`, {...save, stored: stored()});
        const tab = await L.openContextStatistics(page, app, ctx);
        await snap(page, `${key}-reopened`);
        fact(`${key} 4 reopened`, {tab, ...(await L.readGeo(page))});
        const report = await step(`${key} report`, () => L.geoReport(page, app, ctx));
        await snap(page, `${key}-report`);
        fact(`${key} 5 Download Report`, report);
    };
    try {
        // 1
        await signIn(page, 'admin');
        const siteTab = await L.openSiteStatistics(page, app);
        const before = await L.readGeo(page);
        const site = await step('1 site', () => L.saveGeo(page, L.GEO.city, SITE_API));
        await snap(page, 'site-saved');
        fact('1 site set to city level', {tab: siteTab, before, ...site, stored: stored()});

        // 2
        await signIn(page, 'rvaca');
        const tab = await L.openContextStatistics(page, app, ctx);
        await snap(page, 'context-first');
        fact('2 context tab before any save', {tab, ...(await L.readGeo(page))});

        if (MODE === 'steps') {
            await choose('none', L.GEO.none);
            await L.openContextStatistics(page, app, ctx);
            await choose('control', L.GEO.country);
        } else {
            // N1
            const n1 = await step('N1 report', () => L.geoReport(page, app, ctx));
            await snap(page, 'n1-report');
            fact('N1 never saved: Download Report', n1);
            // N2
            await L.openContextStatistics(page, app, ctx);
            await choose('country', L.GEO.country);
            // N3
            if (app.name === 'ojs') {
                const {createJournal} = require('../doaj-deposit-takes-other-journals-articles/lib');
                const t = tag('u64b');
                await signIn(page, 'admin');
                const created = await step('N3 create', () => createJournal(page, app, {name: `Geo ${t}`, initials: 'GEO', path: t, email: `${t}@mailinator.com`}));
                const newTab = await L.openContextStatistics(page, app, t);
                await snap(page, 'n3-new-journal');
                fact('N3 journal created on screen, never saved', {path: t, created, tab: newTab, ...(await L.readGeo(page)), stored: stored()});
            }
        }
    } finally {
        fact('failures', failures);
        record('facts', facts);
        await close();
    }
});
