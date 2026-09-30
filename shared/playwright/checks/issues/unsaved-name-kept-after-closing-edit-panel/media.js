// Issue report U66 A2 (joined by U47 A5): on a publication's "Media" page, a
// "Name of the file" typed in "Edit Metadata" and left with "Cancel" or
// "Close" › "Yes" ("continue without saving") shows in the list, "Edit
// Metadata" reopens holding it, and the next "Save" (made to change "Caption")
// stores it.
//
// Walks the report's "Media files" Steps on PKP's default test dataset:
//   1-3  dbarnes opens the submission's "Publication" ("Preprint") › "Media"
//        and adds figure.png (Image, Web resolution).
//   4-5  "Edit Metadata", name "figure-1.png", "Cancel" › "Yes"; read the row.
//   6-7  "Edit Metadata" again, read the name; "Caption" "Figure 1", "Save".
//   8    reload; read the row and the reopened window.
//   9-10 "Edit Metadata", name "figure-2.png", header "Close" › "Yes"; read the
//        row; reload and read it again.
//   Control: "Caption" changed alone to "Figure 2", "Cancel" › "Yes": the
//        reopened window reads "Figure 1".
//   Neighbour (fix in and out): "Edit Metadata", name "figure-3.png", "Save":
//        the row reads "figure-3.png" at once and after a reload.
//
// Run, on an install freshly loaded from the default dataset:
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/unsaved-name-kept-after-closing-edit-panel/media.js
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const SUBMISSION = {ojs: 5, omp: 4, ops: 1};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim());

forEachApp(async (app) => {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {MediaFileManager, MEDIA_TEXT} = require('../../../pages/MediaFilesPages.js');
    const submissionId = SUBMISSION[app.name];
    const labels = app.name === 'ops' ? {publicationGroup: 'Preprint'} : {};
    const facts = {app: app.name, line: app.line, dataset: app.dataset, submission: submissionId, startedAt: new Date().toISOString()};
    const pubId = Number(sql(app, `SELECT current_publication_id FROM submissions WHERE submission_id = ${submissionId}`).trim());
    facts.publicationId = pubId;
    // The stored name and caption of the submission's media files (file stage 23).
    const stored = () => flat(sql(app, `SELECT sf.submission_file_id || ' ' || sfs.setting_name || '[' || sfs.locale || ']=' || sfs.setting_value
        FROM submission_files sf JOIN submission_file_settings sfs ON sfs.submission_file_id = sf.submission_file_id
        WHERE sf.submission_id = ${submissionId} AND sf.file_stage = 23 AND sfs.setting_name IN ('name', 'caption') ORDER BY 1`));

    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels});
    const media = new MediaFileManager(page, frame);
    // Every media request after the page landed (a save, a fresh read of the list).
    const mediaRequests = [];
    page.on('request', (r) => {
        if (/\/mediaFiles(\/|\?|$)/.test(r.url())) {
            mediaRequests.push({method: r.method(), override: r.headers()['x-http-method-override'] || null, url: r.url().replace(app.baseURL, ''), body: (r.postData() || '').slice(0, 400)});
        }
    });
    const snap = async (name) => {
        const s = await screen(page);
        record(name, s);
        return s;
    };
    const openMedia = async () => {
        await media.open(submissionId, pubId);
        await idle(page);
        mediaRequests.length = 0;
    };
    const readWindow = async (win) => ({
        name: await win.nameBox().inputValue(),
        caption: await win.box('Caption').inputValue(),
    });
    // Close with `control`, answer the "Warning" with "Yes", read the list.
    const leaveWithYes = async (win, control) => {
        const warning = await win.pressExpectingWarning(control);
        const question = flat(await warning.innerText());
        await win.answerYes();
        await idle(page);
        await sleep(1000);
        return {question, rows: await media.sortedNames(), requests: [...mediaRequests]};
    };

    try {
        facts.storedBefore = stored();
        // ---- 1-3 -------------------------------------------------------------
        await signIn(page, 'dbarnes');
        await openMedia();
        await media.addFiles([{file: path.join(REPO, `apps/${app.name}/playwright/fixtures/files/figure.png`), name: 'figure.png', mediaType: 'Image', resolution: MEDIA_TEXT.web}]);
        await openMedia();
        facts.step3 = {rows: await media.sortedNames(), stored: stored()};

        // ---- 4-5. "Cancel" › "Yes" -------------------------------------------
        let win = await media.openMetadata('figure.png');
        facts.step4 = {opened: await readWindow(win)};
        await win.nameBox().fill('figure-1.png');
        facts.step5 = await leaveWithYes(win, win.cancelButton());
        facts.step5.stored = stored();
        await snap('05-after-cancel-yes');

        // ---- 6-7. Reopen, "Caption", "Save" ----------------------------------
        const shown = facts.step5.rows.find((n) => /^figure/.test(n)) || 'figure.png';
        win = await media.openMetadata(shown);
        facts.step6 = {opened: await readWindow(win)};
        await snap('06-reopened');
        await win.box('Caption').fill('Figure 1');
        mediaRequests.length = 0;
        const saved = await win.submit();
        await idle(page);
        facts.step7 = {status: saved.status(), requests: [...mediaRequests], rows: await media.sortedNames(), stored: stored()};

        // ---- 8. Reload -------------------------------------------------------
        await openMedia();
        facts.step8 = {rows: await media.sortedNames()};
        win = await media.openMetadata(facts.step8.rows.find((n) => /^figure/.test(n)));
        facts.step8.opened = await readWindow(win);
        await snap('08-reloaded-window');
        await win.cancel();

        // ---- 9-10. Header "Close" › "Yes", then reload ------------------------
        const current = facts.step8.rows.find((n) => /^figure/.test(n));
        win = await media.openMetadata(current);
        await win.nameBox().fill('figure-2.png');
        facts.step9 = await leaveWithYes(win, win.closeButton());
        await snap('09-after-close-yes');
        await openMedia();
        facts.step10 = {rows: await media.sortedNames(), stored: stored()};

        // ---- Control: "Caption" alone ------------------------------------------
        const now = facts.step10.rows.find((n) => /^figure/.test(n));
        win = await media.openMetadata(now);
        await win.box('Caption').fill('Figure 2');
        facts.control = await leaveWithYes(win, win.cancelButton());
        win = await media.openMetadata(facts.control.rows.find((n) => /^figure/.test(n)));
        facts.control.reopened = await readWindow(win);
        await win.cancel();

        // ---- Neighbour: an ordinary rename is saved and shown -----------------
        await openMedia();
        win = await media.openMetadata(now);
        await win.nameBox().fill('figure-3.png');
        const renamed = await win.submit();
        await idle(page);
        facts.neighbour = {status: renamed.status(), rows: await media.sortedNames()};
        await openMedia();
        facts.neighbour.rowsAfterReload = await media.sortedNames();
        facts.neighbour.stored = stored();
        await signOut(page);
    } catch (e) {
        facts.error = String(e.stack || e).slice(0, 1500);
        await snap('zz-failed').catch(() => {});
    } finally {
        record('facts', facts);
        await close();
    }
});
