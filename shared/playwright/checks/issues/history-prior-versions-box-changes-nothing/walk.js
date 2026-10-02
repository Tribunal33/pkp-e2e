// U36 A4 walk (issue report docs/issues/U36-A4-history-prior-versions-box-changes-nothing.md).
// On PKP's default test dataset, context `publicknowledge`: OJS submission 7, OMP submission 2,
// both in review, whose "Files for Review" hold copies the editor's "Send to Review" made of the
// author's submission files. OPS is skipped: no preprint file is a copy of another. The kit
// builds nothing.
//
// MODE=walk (default):
//   1. sign in as dbarnes
//   2. open the submission from the dashboard (the workflow opens on the review stage)
//   3. "Files for Review": the row's menu > "More Information"
//   4. the "History" tab the window opens on
//   5. "Search" above the table: the box "Show events from prior versions"
//   6. tick the box
//   7. control: "Submission" > "Submission Files": the original file's "More Information" > "History"
// MODE=neighbour, alone (with the fix in and out): what a fix must leave alone. The original file
//   in "Submission Files" is no copy: its "History" reads the same with the box unticked, ticked
//   and unticked again.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=issues-u36i PROBE_AGENT=u36i node bin/probe.js all shared/playwright/checks/issues/history-prior-versions-box-changes-nothing/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature <feature>-3_5 --dataset <n> --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u36i-3_5 PROBE_AGENT=u36i node bin/probe.js all shared/playwright/checks/issues/history-prior-versions-box-changes-nothing/walk.js
// Facts: .reports/<feature>/u36i/a4-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const H = require('./lib.js');
const U = require('../change-file-keeps-first-upload/lib.js');        // the workflow by address
const N = require('../add-note-empty-box-posts-empty-note/lib.js');   // the top window's "Close"

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    if (!c) { console.log(`${app.name}: no file of the dataset is a copy of another, skipped`); return; }
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submissionId: c.submissionId};
    const {page, close} = await launch(app);
    const answers = H.watchHistory(page);
    const step = async (key, fn) => {
        try { facts[key] = await fn(); } catch (e) { facts[key] = {threw: H.flat(e.message, 800)}; record(`${MODE}-${key}-threw`, await screen(page).catch(() => ({}))); }
        console.log('[a4]', app.name, MODE, key, JSON.stringify(facts[key]).slice(0, 2500));
        return facts[key];
    };
    // The review stage's list is "Files for Review" on main and "Review Files" on 3.5.
    const open = async (menuKey, lists) => {
        await page.goto('about:blank');
        await U.openWorkflow(page, app, c.submissionId, menuKey);
        const named = (n) => page.getByRole('table', {name: n, exact: true}).first();
        await named(lists[0]).or(named(lists[lists.length - 1])).first().waitFor({state: 'visible', timeout: 60_000});
        await idle(page);
        const list = (await named(lists[0]).isVisible().catch(() => false)) ? lists[0] : lists[lists.length - 1];
        facts.list = list;
        return {list, lists: (await page.getByRole('heading', {level: 3}).allInnerTexts()).map((t) => H.flat(t, 60)), rows: await U.listRows(page, list)};
    };
    try {
        await signIn(page, 'dbarnes');
        if (MODE === 'neighbour') {
            await step('opened', () => open('workflow_1', ['Submission Files']));
            await step('window', () => H.openMoreInformation(page, 'Submission Files', c.row));
            await step('history', () => H.readHistory(page));
            record('nb-1-history', await screen(page));
            await step('ticked', () => H.setBox(page, answers, true));
            record('nb-2-ticked', await screen(page));
            await shot(page, 'nb-2-ticked').catch(() => {});
            await step('unticked', () => H.setBox(page, answers, false));
            record('nb-3-unticked', await screen(page));
        } else {
            // 1–3
            await step('opened', () => open(null, ['Files for Review', 'Review Files']));
            await step('window', () => H.openMoreInformation(page, facts.list, c.row));
            // 4
            await step('history', () => H.readHistory(page));
            record('1-history', await screen(page));
            await shot(page, '1-history').catch(() => {});
            // 5
            await step('search', async () => ({pressed: await H.showBox(page), ...(await H.readHistory(page))}));
            record('2-search', await screen(page));
            await shot(page, '2-search').catch(() => {});
            // 6
            await step('ticked', () => H.setBox(page, answers, true));
            record('3-ticked', await screen(page));
            await shot(page, '3-ticked').catch(() => {});
            // 7
            await N.closeTop(page).catch(() => {});
            await step('controlOpened', () => open('workflow_1', ['Submission Files']));
            await step('controlWindow', () => H.openMoreInformation(page, 'Submission Files', c.row));
            await step('controlHistory', () => H.readHistory(page));
            record('4-control-history', await screen(page));
        }
        await N.closeTop(page).catch(() => {});
        facts.answers = answers;
        await signOut(page).catch(() => {});
    } finally {
        record(`a4-facts-${MODE}`, facts);
        await close();
    }
});
