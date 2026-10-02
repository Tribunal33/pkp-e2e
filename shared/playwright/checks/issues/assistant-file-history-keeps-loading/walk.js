// U36 A3 walk (issue report docs/issues/U36-A3-assistant-file-history-keeps-loading.md).
// On PKP's default test dataset, context `publicknowledge`; OJS submission 3, OMP submission 7
// (both in Copyediting, with the Copyeditor mfritz assigned). OPS is skipped: its dataset has no
// assistant role that can be assigned to a preprint. The kit builds nothing.
//
// MODE=walk (default):
//   1. sign in as mfritz
//   2. open the submission from the dashboard (the workflow opens on "Copyediting")
//   3. "Upload/Select Files" above "Copyedited Files", "Upload File" in the window: the component
//      "Article Text" (OMP "Book Manuscript"), u36h-copyedit.pdf, "Continue", "Continue",
//      "Complete"; then the window's "OK"
//   4. the row's menu > "More Information"
//   5. ten seconds on the "History" tab the window opens on
//   6. "Notes": "Checked u36h", "Add Note"
//   7. "History" again
//   8. control: dbarnes opens the same row's "More Information"
// MODE=neighbour, alone (with the fix in and out): steps 1 to 3, then what a fix must leave as it
//   is: for mfritz the header's "Activity Log" (the submission's own history, which lists its
//   emails) keeps no "History" tab; for the author (OJS ckwantes, OMP dkennepohl) the row's menu
//   on "Copyedited Files" keeps no "More Information".
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=issues-u36h PROBE_AGENT=u36h node bin/probe.js all shared/playwright/checks/issues/assistant-file-history-keeps-loading/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature <feature>-3_5 --dataset <n> --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u36h-3_5 PROBE_AGENT=u36h node bin/probe.js all shared/playwright/checks/issues/assistant-file-history-keeps-loading/walk.js
// Facts: .reports/<feature>/u36h/a3-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const H = require('./lib.js');
const U = require('../change-file-keeps-first-upload/lib.js');        // the workflow by address, the upload wizard
const N = require('../add-note-empty-box-posts-empty-note/lib.js');   // "More Information", "Notes", the top window's "Close"
const S = require('../select-files-other-stage-row-actions-refused/lib.js'); // the "Upload/Select Files" window

const MODE = process.env.MODE || 'walk';
const LIST = 'Copyedited Files';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    if (!c) { console.log(`${app.name}: the dataset has no assistant role assigned to a submission, skipped`); return; }
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submissionId: c.submissionId};
    const {page, close} = await launch(app);
    const answers = H.watchHistory(page);
    // a refused legacy request raises a browser alert: each is recorded with its time and accepted
    const alerts = [];
    page.on('dialog', (d) => { alerts.push({type: d.type(), message: d.message()}); d.accept().catch(() => {}); });
    const step = async (key, fn) => {
        try { facts[key] = await fn(); } catch (e) { facts[key] = {threw: H.flat(e.message, 800)}; record(`${MODE}-${key}-threw`, await screen(page).catch(() => ({}))); }
        if (alerts.length) { facts[`${key}Alerts`] = alerts.splice(0); }
        console.log('[a3]', app.name, MODE, key, JSON.stringify(facts[key]).slice(0, 1500), facts[`${key}Alerts`] ? `ALERTS ${JSON.stringify(facts[`${key}Alerts`])}` : '');
        return facts[key];
    };
    const open = async (view) => {
        await page.goto('about:blank');
        await U.openWorkflow(page, app, c.submissionId, null, view);
        await page.getByRole('table', {name: LIST, exact: true}).first().waitFor({state: 'visible', timeout: 60_000});
        await idle(page);
        return {lists: (await page.getByRole('heading', {level: 3}).allInnerTexts()).map((t) => H.flat(t, 60)), rows: await U.listRows(page, LIST)};
    };
    try {
        // 1–3
        await signIn(page, 'mfritz');
        await step('opened', () => open('editorial'));
        await step('upload', async () => {
            await S.openSelect(page, LIST);
            await S.selectWindow(page).getByRole('link', {name: 'Upload File', exact: true}).or(S.selectWindow(page).getByRole('button', {name: 'Upload File', exact: true})).first().click();
            await U.wizard(page).locator('select[id^="genreId"]').first().waitFor({state: 'visible', timeout: 30_000});
            await U.wizard(page).locator('select[id^="genreId"]').first().selectOption({label: c.component});
            await U.pick(page, H.theFile());
            const done = await U.finish(page);
            // back in the "Upload/Select Files" window, which lists the new file ticked
            const select = await S.readSelect(page).catch(() => null);
            if (select) { await S.ok(page); }
            return {...done, select, rows: await U.listRows(page, LIST)};
        });
        if (MODE === 'neighbour') {
            await step('assistantRowMenu', () => H.rowMenu(page, LIST, H.FILE));
            await step('assistantActivityLog', async () => {
                const button = N.workflow(page).getByRole('button', {name: /Activity Log/}).first();
                if (!(await button.isVisible().catch(() => false))) return {offered: false};
                await button.click();
                await page.getByRole('dialog').filter({hasText: /Activity Log/}).last().waitFor({timeout: 30_000});
                await idle(page);
                await H.sleep(3_000);
                const shown = await H.readHistory(page, 1_000);
                record('nb-1-assistant-activity-log', await screen(page));
                await N.closeTop(page).catch(() => {});
                return {offered: true, ...shown};
            });
            await signOut(page);
            await signIn(page, c.author);
            await step('authorOpened', () => open('mySubmissions'));
            await step('authorRowMenu', () => H.rowMenu(page, LIST, H.FILE));
            record('nb-2-author-copyedited', await screen(page));
        } else {
            // 4–5
            await step('window', () => N.openMoreInformation(page, H.FILE));
            await step('history', () => H.readHistory(page, 10_000));
            record('walk-5-history', await screen(page));
            await shot(page, 'walk-5-history').catch(() => {});
            // 6
            await step('note', async () => {
                await N.openNotes(page);
                const r = await N.addNote(page, 'Checked u36h', 'walk-6-note');
                return {sent: r.sent, answer: r.answer, notices: r.notices, notes: r.notes.notes};
            });
            // 7
            await step('historyAgain', async () => { await H.selectTab(page, 'History'); return H.readHistory(page, 10_000); });
            record('walk-7-history', await screen(page));
            await N.closeTop(page).catch(() => {});
            // 8
            await signOut(page);
            await signIn(page, 'dbarnes');
            await step('editorOpened', () => open('editorial'));
            await step('editorWindow', () => N.openMoreInformation(page, H.FILE));
            await step('editorHistory', () => H.readHistory(page, 10_000));
            record('walk-8-editor-history', await screen(page));
        }
        facts.answers = answers.slice();
        await signOut(page).catch(() => {});
    } finally {
        record(`a3-facts-${MODE}`, facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
