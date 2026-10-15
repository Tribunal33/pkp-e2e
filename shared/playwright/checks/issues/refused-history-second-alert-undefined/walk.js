// U36 A27 walk (issue report docs/issues/U36-A27-refused-history-second-alert-undefined.md).
// On PKP's default test dataset, context `publicknowledge`; OJS submission 3, OMP submission 7
// (both in Copyediting, with the Copyeditor mfritz assigned). OPS is skipped: its default roles
// meet neither refusal (no Copyediting stage, no assistant assigned to a preprint). The kit
// builds nothing.
//
// MODE=walk (default):
//   A. 1 sign in as dbarnes; 2 open the submission on "Copyediting"; 3 "Upload/Select Files"
//      above "Draft Files"; 4 tick "Show files from all accessible workflow stages."; 5 under
//      "Submission", the file's arrow, "More Information"
//   B. 6 sign in as mfritz; 7 open the submission (it opens on "Copyediting"); 8 "Upload/Select
//      Files" above "Copyedited Files", "Upload File": "Article Text" (OMP "Book Manuscript"),
//      hkk29-copyedit.pdf, "Continue", "Continue", "Complete", "OK"; 9 the row's "More
//      Information"
//   Each step's browser alerts are recorded in order, with the history grid's answers.
// MODE=neighbour, alone (with the fix in and out): loads that succeed through the same loader
//   (lib/pkp UrlInDivHandler), which must show their content with no alert. As dbarnes: on OJS
//   and OMP the submission's "Submission" stage, the "Submission Files" file's "More
//   Information" ("History" lists the file's events); on every app "Settings" > "Website" >
//   "Plugins" (the "Installed Plugins" list).
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=issues-k11 PROBE_AGENT=k29 node bin/probe.js all shared/playwright/checks/issues/refused-history-second-alert-undefined/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-k11-3_5 PROBE_AGENT=k29 node bin/probe.js all <this file>
// Facts: .reports/<feature>/k29/a27-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const {CASES, FILE} = L;

forEachApp(async (app) => {
    const c = CASES[app.name];
    if (!c && MODE !== 'neighbour') { console.log(`${app.name}: its default roles meet neither refusal, skipped`); return; }
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, run: process.env.PROBE_RUN || null, submissionId: c ? c.submissionId : null};
    const {page, close} = await launch(app);
    const answers = L.watchHistory(page);
    const alerts = [];
    page.on('dialog', (d) => { alerts.push({type: d.type(), message: d.message()}); d.accept().catch(() => {}); });
    const step = async (key, fn) => {
        try { facts[key] = await fn(); } catch (e) { facts[key] = {threw: L.flat(e.message, 800)}; record(`${MODE}-${key}-threw`, await screen(page).catch(() => ({}))); }
        facts[`${key}Alerts`] = alerts.splice(0);
        console.log('[a27]', app.name, MODE, key, JSON.stringify(facts[key]).slice(0, 800), `ALERTS ${JSON.stringify(facts[`${key}Alerts`])}`);
        return facts[key];
    };
    try {
        await signIn(page, 'dbarnes');
        if (MODE === 'neighbour') {
            if (c) {
                await step('opened', async () => {
                    await L.openWorkflow(page, app, c.submissionId, 'workflow_1');
                    return {rows: await L.workflowRows(page, 'Submission Files')};
                });
                await step('window', () => L.openMoreInformation(page, c.submissionFile));
                await step('history', () => L.readHistory(page, 10_000));
                record('nb-1-history', await screen(page));
                await L.closeTop(page).catch(() => {});
            }
            // every app: "Settings" > "Website" > "Plugins", whose "Installed Plugins" list the same loader fetches
            await step('plugins', async () => {
                await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/website`));
                await idle(page);
                await page.getByRole('tab', {name: 'Plugins', exact: true}).first().click();
                const grid = page.locator('#pluginGridContainer');
                await grid.locator('tr.gridRow').first().waitFor({state: 'visible', timeout: 30_000}).catch(() => {});
                await idle(page);
                return {rows: await grid.locator('tr.gridRow').count(), placeholder: L.flat(await grid.innerText().catch(() => null), 120)};
            });
            record('nb-2-plugins', await screen(page));
        } else {
            // A. 2–5
            await step('a2', async () => { await L.openCopyediting(page, app, c.submissionId); return {draftFiles: await L.listRows(page, 'Draft Files')}; });
            await step('a3', async () => { await L.openSelect(page, 'Draft Files'); return (await L.readSelect(page)).rows; });
            await step('a4', async () => { await L.tickAllStages(page); return (await L.readSelect(page)).rows; });
            await step('a5', async () => {
                const row = L.fileRow(page, c.submissionFile, 'Submission');
                const controls = await L.rowControls(page, row);
                const from = answers.length;
                await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'More Information', exact: true}).first().click();
                await L.sleep(10_000);
                await idle(page).catch(() => {});
                const top = await L.topWindow(page);
                return {controls, top, answers: answers.slice(from)};
            });
            record('walk-5-editor-select-files', await screen(page));
            await shot(page, 'walk-5-editor-select-files').catch(() => {});
            await L.closeTop(page).catch(() => {});
            // B. 6–9
            await signOut(page);
            await signIn(page, 'mfritz');
            await step('b7', async () => {
                await page.goto('about:blank');
                await L.openWorkflow(page, app, c.submissionId, null, 'editorial');
                await page.getByRole('table', {name: 'Copyedited Files', exact: true}).first().waitFor({state: 'visible', timeout: 60_000});
                await idle(page);
                return {rows: await L.workflowRows(page, 'Copyedited Files')};
            });
            await step('b8', async () => {
                await L.openSelect(page, 'Copyedited Files');
                await L.selectWindow(page).getByRole('link', {name: 'Upload File', exact: true}).or(L.selectWindow(page).getByRole('button', {name: 'Upload File', exact: true})).first().click();
                await L.wizard(page).locator('select[id^="genreId"]').first().waitFor({state: 'visible', timeout: 30_000});
                await L.wizard(page).locator('select[id^="genreId"]').first().selectOption({label: c.component});
                await L.pick(page, L.theFile());
                const done = await L.finish(page);
                const select = await L.readSelect(page).catch(() => null);
                if (select) { await L.ok(page); }
                return {...done, rows: await L.workflowRows(page, 'Copyedited Files')};
            });
            await step('b9', async () => {
                const from = answers.length;
                const title = await L.openMoreInformation(page, FILE);
                const shown = await L.readHistory(page, 10_000);
                return {title, ...shown, answers: answers.slice(from)};
            });
            record('walk-9-copyeditor-history', await screen(page));
            await shot(page, 'walk-9-copyeditor-history').catch(() => {});
            await L.closeTop(page).catch(() => {});
        }
        facts.answers = answers.slice();
        await signOut(page).catch(() => {});
    } finally {
        record(`a27-facts-${MODE}`, facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
