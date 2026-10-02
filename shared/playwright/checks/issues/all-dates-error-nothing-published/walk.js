// Issue report docs/issues/U64-A1-all-dates-error-nothing-published.md (U64 A1): the report's
// Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"). The kit builds nothing: everything is made through the screens.
//
// Default mode, "Nothing published" (OJS, OMP, OPS):
//   1. `admin` › Administration › Hosted Journals › "Create Journal": "u64a Journal", path `u64a`.
//   2. Statistics › Articles of `u64a` (/index.php/u64a/en/stats/publications/publications).
//   3. The calendar button › "All dates".
//   Control: Statistics › Journal of `u64a` › "All dates".
// `old` as the argument, "First publication dated before 2001" (OJS only; nothing created):
//   1. `dbarnes` › submission 17 › "Unpublish".
//   2. Publication › "Publication Settings" (3.5: "Issue"): "Publication Date" (3.5: "Date
//      Published") 1999-06-01, "Save"; "Schedule For Publication" (3.5: "Publish"), confirmed.
//   3. Statistics › Articles of `publicknowledge` › "All dates".
// `neighbour` as the argument (the fix in and out; changes nothing): the dataset's own context,
//   which has published items: `dbarnes` › Statistics › Articles › "All dates", then "Last 90 days".
// Each step records the state it finds rather than throwing, so the same script reads the fix.
//
// Reset first:  npm run fleet-prep -- --feature issues-u64a --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u64a PROBE_AGENT=u64a node bin/probe.js all shared/playwright/checks/issues/all-dates-error-nothing-published/walk.js [old|neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u64a-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u64a-3_5 PROBE_AGENT=u64a node bin/probe.js all shared/playwright/checks/issues/all-dates-error-nothing-published/walk.js [old]
// Facts: .reports/<feature>/u64a/facts[-<mode>][-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, sql} = require('../../../probe');
const {flat, setPublicationDate, createContext, statsAnswers, openStats, choosePreset, readStats, dismissError} = require('./lib');

const MODE = process.argv.includes('old') ? 'old' : process.argv.includes('neighbour') ? 'neighbour' : 'steps';
const OLD_DATE = '1999-06-01';
const OLD_SUBMISSION = 17;

/** One Statistics page: as it opens, then after "All dates"; the window, the chart, the table, the answers. */
async function allDates(page, app, ctx, route, name, facts) {
    const answers = statsAnswers(page);
    const out = {route, opened: await openStats(page, app, ctx, route)};
    out.before = await readStats(page);
    record(`${name}-before`, await screen(page));
    answers.clear();
    out.offered = await choosePreset(page, 'All dates').catch((e) => ({error: flat(e.message, 200)}));
    out.after = await readStats(page);
    out.answers = await answers.list();
    record(`${name}-all-dates`, await screen(page));
    await shot(page, `${name}-all-dates`);
    out.errorWindow = await dismissError(page);
    out.afterOk = await readStats(page);
    answers.stop();
    facts[name] = out;
    return out;
}

forEachApp(async (app) => {
    if (MODE === 'old' && app.name !== 'ojs') return;
    const {page, close} = await launch(app);
    const facts = {mode: MODE, line: app.line, dataset: app.dataset};
    try {
        if (MODE === 'steps') {
            await signIn(page, 'admin');
            facts.created = await createContext(page, app, {name: 'u64a Journal', initials: 'U64A', path: 'u64a', email: 'u64a@mailinator.com'})
                .catch((e) => ({error: flat(e.message, 300)}));
            await allDates(page, app, 'u64a', 'publications', 'articles', facts);
            await allDates(page, app, 'u64a', 'context', 'control-journal', facts);
        } else if (MODE === 'old') {
            const {unpublish, publish} = require('../doaj-deposit-takes-other-journals-articles/lib');
            const ctx = app.contextPath;
            facts.storedBefore = sql(app, `select publication_id, status, date_published from publications where submission_id = ${OLD_SUBMISSION}`);
            await signIn(page, 'dbarnes');
            facts.unpublish = await unpublish(page, app, ctx, OLD_SUBMISSION).catch((e) => ({error: flat(e.message, 300)}));
            facts.date = await setPublicationDate(page, app, OLD_DATE).catch((e) => ({error: flat(e.message, 300)}));
            record('old-date-saved', await screen(page));
            facts.publish = await publish(page, app, ctx, OLD_SUBMISSION).catch((e) => ({error: flat(e.message, 300)}));
            facts.storedAfter = sql(app, `select publication_id, status, date_published from publications where submission_id = ${OLD_SUBMISSION}`);
            await allDates(page, app, ctx, 'publications', 'old-articles', facts);
        } else {
            await signIn(page, 'dbarnes');
            const ctx = app.contextPath;
            facts.firstPublished = sql(app, 'select min(date_published), max(date_published), count(*) from publications where date_published is not null');
            await allDates(page, app, ctx, 'publications', 'nb-articles', facts);
            const answers = statsAnswers(page);
            facts.last90 = {offered: await choosePreset(page, 'Last 90 days').catch((e) => ({error: flat(e.message, 200)}))};
            facts.last90.after = await readStats(page);
            facts.last90.answers = await answers.list();
            answers.stop();
            record('nb-last-90', await screen(page));
        }
    } catch (e) {
        facts.error = flat(e.stack || e.message, 800);
        record(`threw-${MODE}`, await screen(page).catch(() => null));
    } finally {
        record(MODE === 'steps' ? 'facts' : `facts-${MODE}`, facts);
        await close();
    }
});
