// Issue report docs/issues/U44-OJS3-OMP5-issue-and-press-file-publisher-id-never-kept.md (U44 OJS3, OMP5):
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"). The kit builds nothing.
//   OJS  steps 1–5  as `rvaca`: Settings › Workflow › Submission › "Metadata", tick "Enable for
//                   Issues", "Save"; Issues › "Future Issues" › "Vol. 2 No. 1 (2015)" › "Edit" ›
//                   "Identifiers": "u44c-issue-1", "Save"; "Edit" › "Identifiers" again
//        control 6  "12345", "Save": refused
//   OMP  steps 1–6  as `rvaca`: tick "Enable for Files", "Save"; submission 5 › "Publication
//                   Formats" › "PDF" › "epilogue.pdf" › "Edit" › "Identifiers": "u44c-file-1",
//                   "Save"; "Edit" › "Identifiers" again
//        step 7     "12345", "Save": the refusal, and the "Publisher ID" box after it
//   `neighbour` as the script's argument, on a fresh reset (the fix's reach):
//     OJS N1 issue 2 "u44c-issue-1" saved and reopened; N2 saved again unchanged;
//         N3 "Back Issues" › "Vol. 1 No. 2 (2014)" "u44c-issue-1" (a duplicate)
//     OMP N1 "epilogue.pdf" "u44c-file-1" saved and reopened; N2 the book page's file link and
//         what it opens; N3 submission 14 › "PDF" › "chapter1.pdf" "u44c-file-1" (a duplicate)
//   `control` as the script's argument, OMP only, on a fresh reset: tick "Enable for Publication
//     Formats"; submission 5 › "Publication Formats" › "PDF" › arrow › "Edit" › "Identifiers":
//     "12345", "Save" (the format's own tab, the control of the box report)
//
// Reset first:  npm run fleet-prep -- --feature issues-u44c --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u44c PROBE_AGENT=u44c node bin/probe.js all shared/playwright/checks/issues/issue-and-press-file-publisher-id-never-kept/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u44c-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u44c-3_5 PROBE_AGENT=u44c node bin/probe.js all shared/playwright/checks/issues/issue-and-press-file-publisher-id-never-kept/walk.js
// Facts: .reports/<feature>/u44c/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');
const NEIGHBOUR = process.argv[2] === 'neighbour';
const CONTROL = process.argv[2] === 'control'; // OMP: the format's own tab refuses "12345" (the box report's control)

const ISSUE = 'Vol. 2 No. 1 (2015)'; // issue 2, Future Issues
const BACK_ISSUE = 'Vol. 1 No. 2 (2014)'; // issue 1, Back Issues

forEachApp(async (app) => {
    if (app.name === 'ops') return; // a preprint server has no issues and no format files
    if (CONTROL && app.name !== 'omp') return;
    const fact = (k, v) => { record('facts', {[k]: v}, {merge: true}); console.log(`[${app.name}]`, k, JSON.stringify(v).slice(0, 1500)); };
    const step = async (k, fn) => { try { const v = await fn(); fact(k, v); return v; } catch (e) { fact(k, {threw: String(e).slice(0, 600)}); return null; } };
    const {page} = await launch(app);

    // 1. Sign in as rvaca.
    await signIn(page, 'rvaca');

    if (app.name === 'ojs') {
        // 2. Settings › Workflow › Submission › "Metadata": tick "Enable for Issues", "Save".
        await step('step2-enable-issues', () => L.enablePublisherIds(page, app, ['Enable for Issues']));
        if (!NEIGHBOUR) {
            // 3–4. Issues › "Future Issues" › the issue's "Edit" › "Identifiers": type, "Save".
            await step('step4-save', async () => {
                const win = await L.openIssueTab(page, app, ISSUE, {}, 'ojs3-step4-tab');
                return {before: await L.readTab(win), ...(await L.typeAndSave(page, app, win, 'u44c-issue-1', 'ojs3-step4'))};
            });
            fact('step4-stored', L.stored(app, 'issue', 2));
            // 5. "Edit" › "Identifiers" again.
            const win = await step('step5-reopened', async () => {
                const w = await L.openIssueTab(page, app, ISSUE, {}, 'ojs3-step5-tab');
                fact('step5-tab', await L.readTab(w));
                return w;
            });
            // Control 6: "12345", "Save".
            if (win) await step('control6-number', () => L.typeAndSave(page, app, win, '12345', 'ojs3-control6'));
            return;
        }
        // Neighbour.
        await step('n1-save', async () => {
            const win = await L.openIssueTab(page, app, ISSUE, {}, 'ojs3-n1-tab');
            return L.typeAndSave(page, app, win, 'u44c-issue-1', 'ojs3-n1');
        });
        await step('n1-reopened-and-n2-unchanged', async () => {
            const win = await L.openIssueTab(page, app, ISSUE, {}, 'ojs3-n2-tab');
            const tab = await L.readTab(win);
            const save = await L.typeAndSave(page, app, win, null, 'ojs3-n2');
            if (save.windowOpen) await L.closeWindow(page, win);
            return {tab, save};
        });
        await step('n3-duplicate-other-issue', async () => {
            const win = await L.openIssueTab(page, app, BACK_ISSUE, {back: true}, 'ojs3-n3-tab');
            const save = await L.typeAndSave(page, app, win, 'u44c-issue-1', 'ojs3-n3');
            if (save.windowOpen) await L.closeWindow(page, win);
            return save;
        });
        fact('n-stored', {issue2: L.stored(app, 'issue', 2), issue1: L.stored(app, 'issue', 1)});
        return;
    }

    // OMP
    if (CONTROL) {
        await step('c2-enable-formats', () => L.enablePublisherIds(page, app, ['Enable for Publication Formats']));
        await step('c-format-tab-number', async () => {
            const {LegacyIdentifiersWindow} = require('../../../pages/IdentifiersPages.js');
            const formats = await L.openFormats(page, app, 5, 5);
            await formats.pressRowEntry(formats.formatRow('PDF'), 'Edit');
            const dialog = page.getByRole('dialog').filter({has: page.getByRole('tab', {name: 'Identifiers', exact: true})}).last();
            const win = new LegacyIdentifiersWindow(page, dialog);
            await win.openIdentifiersTab();
            await L.snap(page, 'omp5-control-format-tab');
            return {tabs: await win.tabNames(), before: await L.readTab(win), ...(await L.typeAndSave(page, app, win, '12345', 'omp5-control-format'))};
        });
        return;
    }
    // 2. Settings › Workflow › Submission › "Metadata": tick "Enable for Files", "Save".
    await step('step2-enable-files', () => L.enablePublisherIds(page, app, ['Enable for Files']));
    if (!NEIGHBOUR) {
        // 3–5. Submission 5 › "Publication Formats" › "PDF" › "epilogue.pdf" › "Edit" › "Identifiers".
        await step('step5-save', async () => {
            const formats = await L.openFormats(page, app, 5, 5);
            const {win, title} = await L.openFileTab(page, formats, 'PDF', 'epilogue.pdf', 'omp5-step5-tab');
            return {windowTitle: title, before: await L.readTab(win), ...(await L.typeAndSave(page, app, win, 'u44c-file-1', 'omp5-step5'))};
        });
        fact('step5-stored', L.stored(app, 'file', 41));
        // 6. "Edit" › "Identifiers" again.
        const win = await step('step6-reopened', async () => {
            const formats = await L.openFormats(page, app, 5, 5);
            const {win: w} = await L.openFileTab(page, formats, 'PDF', 'epilogue.pdf', 'omp5-step6-tab');
            fact('step6-tab', await L.readTab(w));
            return w;
        });
        // 7. "12345", "Save": the refusal and the box after it.
        if (win) await step('step7-number', () => L.typeAndSave(page, app, win, '12345', 'omp5-step7'));
        return;
    }
    // Neighbour.
    await step('n1-save', async () => {
        const formats = await L.openFormats(page, app, 5, 5);
        const {win} = await L.openFileTab(page, formats, 'PDF', 'epilogue.pdf', 'omp5-n1-tab');
        const save = await L.typeAndSave(page, app, win, 'u44c-file-1', 'omp5-n1');
        if (save.windowOpen) await L.closeWindow(page, win);
        const formats2 = await L.openFormats(page, app, 5, 5);
        const {win: again} = await L.openFileTab(page, formats2, 'PDF', 'epilogue.pdf', 'omp5-n1-reopened');
        const tab = await L.readTab(again);
        await L.closeWindow(page, again);
        return {save, reopened: tab};
    });
    fact('n1-stored', L.stored(app, 'file', 41));
    await step('n2-book-page', () => L.bookPageFile(page, app, 5, 'epilogue.pdf', 'omp5-n2-book'));
    await step('n3-duplicate-other-file', async () => {
        const formats = await L.openFormats(page, app, 14, 14);
        const {win} = await L.openFileTab(page, formats, 'PDF', 'chapter1.pdf', 'omp5-n3-tab');
        const save = await L.typeAndSave(page, app, win, 'u44c-file-1', 'omp5-n3');
        if (save.windowOpen) await L.closeWindow(page, win);
        return save;
    });
    fact('n3-stored', L.stored(app, 'file', 113));
});
