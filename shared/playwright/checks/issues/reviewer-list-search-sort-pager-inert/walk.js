// U28 A1 walk (issue report docs/issues/U28-A1-reviewer-list-search-sort-pager-inert.md).
// On PKP's default test dataset, context `publicknowledge`: the reviewer `amccrae` on OJS (rows
// 7, 10, 13, 20 under "All assignments"), `agallego` on OMP (rows 11, 13, 16, 18). OPS is
// skipped: a preprint server has no reviewers. The kit builds nothing and the walk changes
// nothing in the data.
//
// MODE=walk (default):
//   1. sign in as the reviewer
//   2. "My Assignments as Reviewer" > "All assignments", by address
//   3. search a word one title alone holds, Enter
//   4. search "zzzz", Enter
//   5. "Clear search phrase"
//   6. "Sort" on "ID", twice
//   7. journal: "Filters" > "Section" > "Reviews" > "Apply Filters"
//   8. control: as dbarnes, Dashboard > "Active submissions": the same search, clear, "Sort" twice
// MODE=neighbour, alone (with the fix in and out): what a fix must leave alone. The reviewer's
//   six views hold the same rows; a search for the family name of a listed submission's author
//   lists nothing (an anonymous review hides the author); a search for a listed ID lists that row.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=issues-u28a PROBE_AGENT=u28a node bin/probe.js all shared/playwright/checks/issues/reviewer-list-search-sort-pager-inert/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u28a-3_5 PROBE_AGENT=u28a node bin/probe.js all shared/playwright/checks/issues/reviewer-list-search-sort-pager-inert/walk.js
// Facts: .reports/<feature>/u28a/a1-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    if (!c) { console.log(`${app.name}: no reviewers on a preprint server, skipped`); return; }
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, reviewer: c.reviewer};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { facts[key] = await fn(); } catch (e) { facts[key] = {threw: H.flat(e.message, 800)}; }
        console.log('[a1]', app.name, MODE, key, JSON.stringify(facts[key]).slice(0, 1500));
        record(`${MODE}-${key}`, await screen(page).catch(() => ({})));
        return facts[key];
    };
    const all = H.dashboardUrl(app, 'reviewAssignments', '?currentViewId=reviewer-assignments-all');
    try {
        await signIn(page, c.reviewer);
        if (MODE === 'neighbour') {
            facts.views = {};
            for (const [id, name] of H.VIEWS) {
                const v = await H.open(page, H.dashboardUrl(app, 'reviewAssignments', `?currentViewId=${id}`));
                facts.views[name] = {heading: v.heading, ids: [...v.ids].sort((a, b) => a - b), empty: v.empty};
            }
            console.log('[a1]', app.name, MODE, 'views', JSON.stringify(facts.views));
            await step('open', () => H.open(page, all));
            await step('searchAuthor', () => H.search(page, c.author));
            await step('searchId', () => H.search(page, String(c.hit)));
            await step('searchTitleTwoWords', () => H.search(page, `${c.phrase.toLowerCase()} zzzz`));
        } else {
            // 2
            await step('open', () => H.open(page, all));
            await shot(page, '2-all-assignments').catch(() => {});
            // 3
            await step('searchHit', () => H.search(page, c.phrase));
            await shot(page, '3-search-hit').catch(() => {});
            // 4
            await step('searchNone', () => H.search(page, 'zzzz'));
            await shot(page, '4-search-none').catch(() => {});
            // 5
            await step('cleared', () => H.clearSearch(page));
            // 6
            await step('sortOnce', () => H.sort(page));
            await step('sortTwice', () => H.sort(page));
            await shot(page, '6-sorted-twice').catch(() => {});
            // 7
            if (c.section) {
                await step('filterSection', async () => { await H.open(page, all); return H.filter(page, c.section); });
                await shot(page, '7-filter-section').catch(() => {});
            }
            await signOut(page).catch(() => {});
            // 8
            await signIn(page, 'dbarnes');
            await step('controlOpen', () => H.open(page, H.dashboardUrl(app, 'editorial', '?currentViewId=active')));
            await step('controlSearchHit', () => H.search(page, c.phrase));
            await shot(page, '8-control-search').catch(() => {});
            await step('controlCleared', () => H.clearSearch(page));
            await step('controlSortOnce', () => H.sort(page));
            await step('controlSortTwice', () => H.sort(page));
        }
        await signOut(page).catch(() => {});
    } finally {
        record(`a1-facts-${MODE}`, facts);
        await close();
    }
});
