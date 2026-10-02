// U36 A20 walk (issue report docs/issues/U36-A20-reviewer-review-files-search-keeps-every-file.md).
// On PKP's default test dataset, context `publicknowledge`: OJS submission 12 (reviewer jjanssen,
// one review file), OMP submission 2 (reviewer gfavio, chapter1.pdf to chapter4.pdf). OPS is
// skipped: a preprint server has no review. The kit builds nothing.
//
// MODE=walk (default):
//   1. sign in as the reviewer
//   2. open the review by address (step "1. Request")
//   3. "Review Files": press "Search"
//   4. type "zzzz", press the "Search" button
//   5. (press) type "chapter4", press "Search"
//   6. control: as dbarnes, the submission's workflow > "Reviewers" > the reviewer's row menu >
//      "Edit" > "Files To Be Reviewed": "Search", "zzzz"
// MODE=neighbour, alone (with the fix in and out): what a fix must leave alone. On a press,
//   dbarnes unticks chapter1.pdf for the reviewer in "Edit" and presses "OK"; the reviewer's
//   list then holds three files, and neither an empty search nor "chapter" nor "chapter1" brings
//   the withheld file back. On a journal (one file): an empty search and a text the file name
//   contains keep the file.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=issues-u36n PROBE_AGENT=u36n node bin/probe.js all shared/playwright/checks/issues/reviewer-review-files-search-keeps-every-file/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature <feature>-3_5 --dataset <n> --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u36n-3_5 PROBE_AGENT=u36n node bin/probe.js all shared/playwright/checks/issues/reviewer-review-files-search-keeps-every-file/walk.js
// Facts: .reports/<feature>/u36n/a20-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const H = require('./lib.js');
const U = require('../change-file-keeps-first-upload/lib.js');        // the workflow by address

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    if (!c) { console.log(`${app.name}: no review on a preprint server, skipped`); return; }
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submissionId: c.submissionId, reviewer: c.reviewer};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { facts[key] = await fn(); } catch (e) { facts[key] = {threw: H.flat(e.message, 800)}; record(`${MODE}-${key}-threw`, await screen(page).catch(() => ({}))); }
        console.log('[a20]', app.name, MODE, key, JSON.stringify(facts[key]).slice(0, 2500));
        return facts[key];
    };
    const editWindow = async () => {
        await page.goto('about:blank');
        await U.openWorkflow(page, app, c.submissionId, null);
        return H.openEdit(page, c.reviewerName);
    };
    try {
        if (MODE === 'neighbour') {
            if (c.withhold) {
                await signIn(page, 'dbarnes');
                await step('withheld', async () => { const {win, grid} = await editWindow(); const before = await H.readList(grid); return {before: before.rows, ...(await H.withhold(page, win, grid, c.withhold))}; });
                record('nb-1-withheld', await screen(page));
                await signOut(page).catch(() => {});
            }
            await signIn(page, c.reviewer);
            await H.openReview(page, app, c.submissionId);
            const grid = H.reviewFiles(page);
            await step('list', () => H.readList(grid));
            record('nb-2-list', await screen(page));
            await step('searchEvery', () => H.search(page, grid, c.every));
            record('nb-3-search-every', await screen(page));
            await shot(page, 'nb-3-search-every').catch(() => {});
            if (c.withhold) {
                await step('searchWithheld', () => H.search(page, grid, c.withhold.replace(/\.pdf$/, '')));
                record('nb-4-search-withheld', await screen(page));
            }
            await step('searchEmpty', () => H.search(page, grid, ''));
            record('nb-5-search-empty', await screen(page));
        } else {
            // 1–2
            await signIn(page, c.reviewer);
            await H.openReview(page, app, c.submissionId);
            const grid = H.reviewFiles(page);
            await step('list', async () => ({url: page.url().replace(/^.*\/index\.php/, '…'), heading: H.flat(await page.locator('h1, h2').first().innerText().catch(() => null), 120), ...(await H.readList(grid))}));
            record('1-review-files', await screen(page));
            await shot(page, '1-review-files').catch(() => {});
            // 3–4
            await step('searchNone', () => H.search(page, grid, 'zzzz'));
            record('2-search-zzzz', await screen(page));
            await shot(page, '2-search-zzzz').catch(() => {});
            // 5
            if (c.one) {
                await step('searchOne', () => H.search(page, grid, c.one));
                record('3-search-one', await screen(page));
                await shot(page, '3-search-one').catch(() => {});
            }
            await signOut(page).catch(() => {});
            // 6
            await signIn(page, 'dbarnes');
            await step('control', async () => {
                const {grid: g} = await editWindow();
                const before = await H.readList(g);
                const none = await H.search(page, g, 'zzzz');
                record('4-control-zzzz', await screen(page));
                await shot(page, '4-control-zzzz').catch(() => {});
                const one = c.one ? await H.search(page, g, c.one) : null;
                return {before, none, one};
            });
        }
        await signOut(page).catch(() => {});
    } finally {
        record(`a20-facts-${MODE}`, facts);
        await close();
    }
});
