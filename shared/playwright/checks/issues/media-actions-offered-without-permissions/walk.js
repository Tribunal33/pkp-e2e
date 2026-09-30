// Issue report U47 A1: a participant whose assignment has "Permissions" unticked
// (the Layout Editor by default; a Moderator with the box unticked) is offered
// every action on a publication's "Media" page, and every change they make is
// refused: "Upload Files", "Link Media" and the delete dialog's "OK" open
// "Error" / "You are not allowed to edit this publication."; "Save" in
// "Edit Metadata" opens nothing.
//
// Walks the report's Steps on PKP's default test dataset (a dataset fleet):
//   preconditions  dbarnes adds figure.png (Image, Web resolution) and
//                  profile-image-400.png (Image, High resolution) on the
//                  submission's "Media" page; OPS: dbarnes unticks
//                  "Permissions" on David Buskins's assignment.
//   1-2  gcox (OPS: dbuskins) opens "Publication" › "Media" (and, as a control,
//        counts the "Save" buttons on the same person's "Title & Abstract").
//   3    "Add Media File" › figure.png, Image, Web resolution › "Upload Files".
//   4    "Batch Link Media" › figure.png ← profile-image-400.png › "Link Media".
//   5    figure.png › "Edit Metadata" › name "u47r13 figure" › "Save".
//   6    figure.png › "Delete File" › "OK".
//   7    reload.
// Neighbour check (fix in and out): dbarnes (manager level) is still offered
// every action and his "Edit Metadata" "Save" is accepted; the submission's
// author still sees the list with no actions.
//
// Run, on an install freshly loaded from the default dataset:
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/media-actions-offered-without-permissions/walk.js
// The fix check: node bin/try-fix.js apply <this folder>/fix.diff ojs omp ops
// (rebuilds the JavaScript), reset the dataset, walk, then
// node bin/try-fix.js revert ojs omp ops.
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const SETUP = {
    ojs: {submission: 5, participant: 'gcox', author: 'ddiouf'},
    omp: {submission: 4, participant: 'gcox', author: 'bbeaty'},
    ops: {submission: 1, participant: 'dbuskins', author: 'ccorino', untick: 'David Buskins'},
};
const WEB = 'figure.png';
const HIGH = 'profile-image-400.png';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim());

forEachApp(async (app) => {
    const {expect} = require('@playwright/test');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {MediaFileManager, MEDIA_TEXT} = require('../../../pages/MediaFilesPages.js');
    const {ParticipantsPanel} = require('../../../pages/StageParticipantsPages.js');
    const S = SETUP[app.name];
    const fx = (f) => path.join(REPO, `apps/${app.name}/playwright/fixtures/files/${f}`);
    const labels = app.name === 'ops' ? {publicationGroup: 'Preprint'} : {};
    const facts = {app: app.name, line: app.line, dataset: app.dataset, submission: S.submission, startedAt: new Date().toISOString()};
    const pubId = Number(sql(app, `SELECT current_publication_id FROM submissions WHERE submission_id = ${S.submission}`).trim());
    const assignment = (username) => flat(sql(app, `SELECT ugs.setting_value || ' canChangeMetadata=' || sa.can_change_metadata
        FROM stage_assignments sa JOIN users u ON u.user_id = sa.user_id
        JOIN user_group_settings ugs ON ugs.user_group_id = sa.user_group_id AND ugs.setting_name = 'name' AND ugs.locale = 'en'
        WHERE sa.submission_id = ${S.submission} AND u.username = '${username}'`));
    const mediaRows = () => flat(sql(app, `SELECT sf.submission_file_id || ':' || coalesce(sfs.setting_value, '?') FROM submission_files sf
        LEFT JOIN submission_file_settings sfs ON sfs.submission_file_id = sf.submission_file_id AND sfs.setting_name = 'name' AND sfs.locale = 'en'
        WHERE sf.submission_id = ${S.submission} AND sf.file_stage = 23 ORDER BY 1`));
    facts.publicationId = pubId;

    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels});
    const media = new MediaFileManager(page, frame);
    const snap = async (name) => {
        const s = await screen(page);
        record(name, s);
        return s;
    };
    const openMedia = async () => {
        await media.open(S.submission, pubId);
        await idle(page);
    };
    const offered = async () => ({
        addMediaFile: await media.addButton().isVisible(),
        batchLinkMedia: await media.batchButton().isVisible(),
        rowMenu: (await media.menuButton(WEB).count()) ? await media.menuOffers(WEB) : null,
        names: await media.sortedNames(),
    });
    // The answer to a media change and what the page shows after it.
    const pressAndRead = async (key, control) => {
        const out = {};
        const answered = page.waitForResponse((r) => /\/mediaFiles(\/|\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: 30_000});
        await control.click();
        const r = await answered.catch(() => null);
        if (r) {
            out.request = {method: r.request().method(), override: r.request().headers()['x-http-method-override'] || null,
                url: r.url().replace(app.baseURL, ''), status: r.status(), body: (await r.text().catch(() => '')).slice(0, 300)};
        }
        await idle(page);
        await sleep(1500);
        const errorDialog = page.getByRole('dialog', {name: 'Error', exact: true});
        out.errorDialog = (await errorDialog.count()) ? flat(await errorDialog.innerText()) : null;
        const s = await snap(key);
        out.dialogText = flat(s.text.dialog);
        out.notices = s.notices;
        if (out.errorDialog) {
            await errorDialog.getByRole('button', {name: 'OK', exact: true}).click();
            await idle(page);
        }
        return out;
    };

    try {
        facts.mediaBefore = mediaRows();
        // ---- Preconditions, as dbarnes -----------------------------------------
        await signIn(page, 'dbarnes');
        await openMedia();
        await media.addFiles([
            {file: fx(WEB), name: WEB, mediaType: 'Image', resolution: MEDIA_TEXT.web},
            {file: fx(HIGH), name: HIGH, mediaType: 'Image', resolution: MEDIA_TEXT.high},
        ]);
        facts.mediaAfterEditorAdds = mediaRows();
        if (S.untick) {
            const panel = new ParticipantsPanel(page, app.contextPath, {labels});
            await panel.goto(S.submission);
            const win = await panel.openEdit(S.untick);
            facts.untick = {boxBefore: await win.metadataBox().isChecked(), form: flat(await win.form().innerText())};
            await win.metadataBox().uncheck();
            await win.ok();
        }
        facts.participantAssignment = assignment(S.participant);
        await signOut(page);

        // ---- 1-2. The participant opens "Media" ---------------------------------
        await signIn(page, S.participant);
        await openMedia();
        await snap('02-media-page');
        facts.step2 = await offered();
        // Control: the same person's "Title & Abstract" page (the page's other forms read the same permission).
        await frame.gotoEditorial(S.submission, {menuKey: `publication_${pubId}_titleAbstract`});
        await idle(page);
        await sleep(1500);
        facts.controlTitleAbstract = {
            heading: flat(await frame.dialog().locator('h1, h2').filter({hasText: /Title & Abstract/i}).first().innerText().catch(() => null)),
            saveButtons: await frame.dialog().getByRole('button', {name: 'Save', exact: true}).count(),
        };
        await openMedia();

        // ---- 3. "Add Media File" › "Upload Files" --------------------------------
        if (facts.step2.addMediaFile) {
            const win = await media.openUpload();
            await win.chooseFiles([fx(WEB)]);
            await win.expectUploaded(WEB);
            await win.chooseMediaType(WEB, 'Image');
            await win.chooseResolution(WEB, MEDIA_TEXT.web);
            facts.step3 = await pressAndRead('03-upload-files', win.uploadFilesButton());
            facts.step3.windowStillOpen = await win.heading().isVisible();
            await openMedia();
        }

        // ---- 4. "Batch Link Media" › "Link Media" --------------------------------
        if (facts.step2.batchLinkMedia) {
            const win = await media.openBatch();
            facts.step4 = {options: await win.options(WEB)};
            await win.choose(WEB, HIGH);
            Object.assign(facts.step4, await pressAndRead('04-link-media', win.linkButton()));
            facts.step4.windowStillOpen = await win.heading().isVisible();
            await openMedia();
        }

        // ---- 5. "Edit Metadata" › "Save" -----------------------------------------
        if ((facts.step2.rowMenu || []).includes('Edit Metadata')) {
            const win = await media.openMetadata(WEB);
            await win.nameBox().fill('u47r13 figure');
            facts.step5 = await pressAndRead('05-edit-metadata-save', win.submitButton());
            facts.step5.windowStillOpen = await win.heading().isVisible();
            facts.step5.nameBox = await win.nameBox().inputValue().catch(() => null);
            facts.step5.formErrors = flat(await win.form().locator('.pkpFormField__error, .pkpFieldError, [role="alert"]').allInnerTexts().then((a) => a.join(' | ')).catch(() => ''));
            await openMedia();
        }

        // ---- 6. "Delete File" › "OK" ---------------------------------------------
        if ((facts.step2.rowMenu || []).includes('Delete File')) {
            const dlg = await media.openDelete(WEB);
            facts.step6 = {question: flat(await dlg.innerText())};
            Object.assign(facts.step6, await pressAndRead('06-delete-ok', dlg.getByRole('button', {name: 'OK', exact: true})));
        }

        // ---- 7. Reload -----------------------------------------------------------
        await openMedia();
        await snap('07-reloaded');
        facts.step7 = {names: await media.sortedNames(), mediaInDb: mediaRows()};
        await signOut(page);

        // ---- Neighbour: the editor keeps every action; the author keeps the list only
        await signIn(page, 'dbarnes');
        await openMedia();
        facts.neighbourEditor = await offered();
        const win = await media.openMetadata(HIGH);
        await win.nameBox().fill('u47r13 high');
        facts.neighbourEditor.save = await pressAndRead('08-editor-save', win.submitButton());
        facts.neighbourEditor.save.windowStillOpen = await win.heading().isVisible();
        await openMedia();
        facts.neighbourEditor.namesAfter = await media.sortedNames();
        await signOut(page);

        await signIn(page, S.author);
        await media.openAuthor(S.submission, pubId);
        await idle(page);
        await snap('09-author-media');
        facts.neighbourAuthor = await offered();
        facts.mediaAtEnd = mediaRows();
    } catch (e) {
        facts.error = String(e.stack || e).slice(0, 1500);
        await snap('zz-failed').catch(() => {});
    } finally {
        record('facts', facts);
        await close();
    }
});
