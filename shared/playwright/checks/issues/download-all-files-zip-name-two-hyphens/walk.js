// U36 A12 walk (issue report docs/issues/U36-A12-download-all-files-zip-name-two-hyphens.md).
// On PKP's default test dataset, context `publicknowledge`: OJS submission 4 and OMP submission 3,
// both in the Submission stage. OPS is skipped: a preprint has no "Submission Files" list and no
// "Download All Files". The kit builds nothing.
//
// MODE=walk (default):
//   1. sign in as dbarnes
//   2. open the submission from the dashboard (the workflow opens on "Submission")
//   3. under "Submission Files", press "Download All Files": the zip's name and what it holds
//   control: the first file's name link in the same list: the name it downloads under
// MODE=neighbour, alone (with the fix in and out): what a fix must leave alone. A single file's
//   download (the same handler's other operation) keeps the name the list shows.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=issues-u36l PROBE_AGENT=u36l node bin/probe.js all shared/playwright/checks/issues/download-all-files-zip-name-two-hyphens/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature <feature>-3_5 --dataset <n> --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u36l-3_5 PROBE_AGENT=u36l node bin/probe.js all shared/playwright/checks/issues/download-all-files-zip-name-two-hyphens/walk.js
// Facts: .reports/<feature>/u36l/a12-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');
const H = require('./lib.js');
const U = require('../change-file-keeps-first-upload/lib.js');   // the workflow by address, a list's rows

const MODE = process.env.MODE || 'walk';
const LIST = 'Submission Files';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    if (!c) { console.log(`${app.name}: no "Download All Files" on a preprint server, skipped`); return; }
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submissionId: c.submissionId};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { facts[key] = await fn(); } catch (e) { facts[key] = {threw: H.flat(e.message, 800)}; record(`${MODE}-${key}-threw`, await screen(page).catch(() => ({}))); }
        console.log('[a12]', app.name, MODE, key, JSON.stringify(facts[key]).slice(0, 2500));
        return facts[key];
    };
    try {
        // 1, 2
        await signIn(page, 'dbarnes');
        await step('opened', async () => {
            await U.openWorkflow(page, app, c.submissionId);
            return {rows: await U.listRows(page, LIST), downloadAll: await H.downloadAll(page, LIST).isVisible().catch(() => false)};
        });
        record(`${MODE}-1-submission-files`, await screen(page));
        await shot(page, `${MODE}-1-submission-files`).catch(() => {});
        if (MODE !== 'neighbour') {
            // 3
            await step('downloadAll', () => H.pressForDownload(page, H.downloadAll(page, LIST)));
        }
        // control / neighbour
        await step('oneFile', () => H.pressForDownload(page, H.firstFileLink(page, LIST)));
        await signOut(page).catch(() => {});
    } finally {
        record(`a12-facts-${MODE}`, facts);
        await close();
    }
});
