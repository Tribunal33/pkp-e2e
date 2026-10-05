// Issue report docs/issues/U47-A8-copyeditor-changes-media-outside-production.md (U47 A8): the "Media"
// page offers its changes only to a role on the submission's Production stage (a journal does not show
// the Copyeditor the page; a press shows the list with no buttons). The server, though, accepts the
// same changes from anyone with a role on the stage the submission is in NOW whose assignment carries
// the "Permissions" box. So a Copyeditor given that box can add, rename, relink and delete a version's
// media files while the submission is in Copyediting, by sending the requests the page would send; in
// Production the same request is refused.
//
// Takes the report's Steps on PKP's default test dataset (a dataset fleet), on OJS and OMP:
//   setup (dbarnes): tick the Copyeditor's "Permit submission metadata edit" on the Copyediting
//     submission (and on the Production control submission); add one media file on the "Media" page
//     (the control: the editor's own change holds), capturing the add request's genreId.
//   finding (the Copyeditor, direct API): confirm no "Media" control is offered; add, edit, link and
//     delete media files of the Copyediting version -> all 200.
//   control (the Copyeditor, direct API): the same add on the Production submission -> 401.
// OPS has the route but a preprint is always in Production, so this cannot arise there (recorded N/A).
//
// WALK=neighbour runs alone (for the fix trial, fix in and out): with the fix in, step 7 must be
// refused; the neighbour shows the fix does not over-reach -- a manager (dbarnes) and a Layout Editor
// assigned at Production with the box ticked may still change media there, and the Copyeditor may still
// edit the publication's metadata at Copyediting (the right the box grants, which the fix must leave).
//
// Reset first:  npm run fleet-prep -- --feature issues-x8 --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-x8 PROBE_AGENT=x8 node bin/probe.js all shared/playwright/checks/issues/copyeditor-changes-media-outside-production/walk.js
//   ONLY=ojs,omp narrows; OPS records N/A. Stable lines: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 … .
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, note} = require('../../../probe');
const L = require('./lib');
const {editBox, stored} = require('../section-editor-edit-assignment-saves-nothing/lib');

const MODE = process.env.WALK || 'walk';
const REPO = path.resolve(__dirname, '../../../../..');

// Per app: the Copyediting submission with its Copyeditor, the Production control, the Layout Editor.
// subEditor: a non-managerial role that reaches Production with "Permit submission metadata edit"
// ticked by default (a Section Editor), assigned on the control submission -- the legitimate Production
// writer the fix must leave alone. OMP's Production submissions carry no such participant, so N2 runs
// on OJS only; OMP shares the same lib/pkp code.
const APP = {
    ojs: {find: {sub: 3, user: 'mfritz', who: 'Maria Fritz'}, control: {sub: 5, user: 'mfritz'}, subEditor: 'dbuskins', group: 'Publication', journalPage: false},
    omp: {find: {sub: 1, user: 'svogt', who: 'Sarah Vogt'}, control: {sub: 4, user: 'mfritz'}, subEditor: null, group: 'Publication', journalPage: false},
    ops: {skip: true},
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const a = APP[app.name];
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `x8-${s}${MODE === 'neighbour' ? '-nb' : ''}${run}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };

    if (a.skip) {
        fact('n/a', 'OPS has the mediaFiles route but a preprint is always in Production, so a Copyeditor outside Production cannot arise');
        record(name('facts'), facts);
        return;
    }

    // publication id and submission locale, from the fleet DB.
    const {sql} = require('../../../probe');
    const pubId = (s) => Number(String(sql(app, `select current_publication_id from submissions where submission_id = ${s}`)).trim());
    const locOf = (s) => String(sql(app, `select locale from submissions where submission_id = ${s}`)).trim() || 'en';
    const findPub = pubId(a.find.sub);
    const ctrlPub = pubId(a.control.sub);
    const findLocale = locOf(a.find.sub);
    const ctrlLocale = locOf(a.control.sub);
    const figure = path.join(REPO, `apps/${app.name}/playwright/fixtures/files/figure.png`);
    const second = path.join(REPO, `apps/${app.name}/playwright/fixtures/files/profile-image-400.png`);

    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {MediaFileManager} = require('../../../pages/MediaFilesPages.js');

    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: a.group}});
    const media = new MediaFileManager(page, frame);

    // Open a submission's "Media" page (editorial): side menu, falling back to the address.
    const openMedia = async (sub) => {
        await frame.gotoEditorial(sub);
        await idle(page).catch(() => {});
        try {
            await media.openFromMenu();
            return true;
        } catch (e) {
            return false;
        }
    };

    try {
        // --- setup, as dbarnes -------------------------------------------------
        await signIn(page, 'dbarnes');

        // Tick the Copyeditor's "Permissions" box on the Copyediting submission (and the control's).
        // Only the finding needs the box ticked (the Copyeditor must be able to edit the publication at
        // Copyediting). The control is refused by the Production-stage rule whatever the box says, so no
        // box is ticked there -- and a Copyeditor is not listed on a Production-stage participant panel.
        const r1 = await editBox(page, app, {submissionId: a.find.sub, name: a.find.who, box: 'canChangeMetadata', label: name('setup-findbox')});
        fact('setup tick finding box', {before: r1.before, posted: r1.posted, saved: r1.saved, saveStatus: r1.save && r1.save.status});
        fact('setup stored finding assignments', stored(app, a.find.sub));

        // Add one media file on the "Media" page, capturing the add request's genreId.
        let genreId = null;
        const onReq = (req) => {
            if (/\/mediaFiles(\?|$)/.test(req.url()) && req.method() === 'POST') {
                try {
                    const body = req.postDataJSON();
                    if (body && body.files && body.files[0] && body.files[0].genreId != null) genreId = body.files[0].genreId;
                } catch (e) {
                    // ignore
                }
            }
        };
        page.on('request', onReq);
        const opened = await openMedia(a.find.sub);
        fact('setup dbarnes media page offered (side menu)', opened);
        if (!opened) await media.open(a.find.sub, findPub);
        await media.addFiles([{file: figure, name: 'figure.png', mediaType: 'Image'}]);
        await idle(page).catch(() => {});
        page.off('request', onReq);
        fact('setup captured genreId', genreId);
        // A second, high-resolution media file so the Copyeditor's relink pairs two real files.
        const hires = await L.mediaAdd(page, app, {submissionId: a.find.sub, publicationId: findPub, filePath: second, genreId, name: 'figure-hires-sxx8.png', locale: findLocale, variantType: 'high_resolution'});
        fact('setup dbarnes add high-resolution file', hires);
        record(name('setup-media-list'), await screen(page));
        const editorList = await L.listMedia(page, app, a.find.sub, findPub);
        fact('setup media list (editor)', editorList);
        const editorFile = editorList.items && editorList.items.find((f) => /figure\.png/.test(f.name || ''));
        const hiresFile = editorList.items && editorList.items.find((f) => f.id === hires.createdId);
        fact('setup editor files', {web: editorFile, hires: hiresFile});
        await signOut(page);

        // --- the finding, as the Copyeditor -----------------------------------
        await signIn(page, a.find.user);

        // 6: the "Media" page is not offered.
        const copyOpened = await openMedia(a.find.sub);
        fact('copyeditor media page offered', copyOpened);
        if (copyOpened) {
            // a press: the list with no buttons.
            fact('copyeditor media offer', {
                addMediaFile: (await media.addButton().count()) > 0,
                batchLinkMedia: (await media.batchButton().count()) > 0,
                rowMenu: (await media.menuButton('figure.png').count()) > 0,
            });
            record(name('copyeditor-media-page'), await screen(page));
        } else {
            // a journal: no "Media" in the side menu.
            await frame.gotoEditorial(a.find.sub);
            await idle(page).catch(() => {});
            record(name('copyeditor-no-media'), await screen(page));
        }

        // 7: the writes the page would send, as this Copyeditor, on the Copyediting publication.
        const added = await L.mediaAdd(page, app, {submissionId: a.find.sub, publicationId: findPub, filePath: second, genreId, name: 'copyeditor-added-sxx8.png', locale: findLocale});
        fact('copyeditor add', added);
        let editRes = {skipped: 'no editor file'};
        if (editorFile) {
            editRes = await L.mediaEdit(page, app, {submissionId: a.find.sub, publicationId: findPub, fileId: editorFile.id, name: 'renamed-by-copyeditor-sxx8.png', locale: findLocale});
        }
        fact('copyeditor edit (editor file)', editRes);
        // A real relink: pair the editor's web file with the editor's high-resolution file.
        let linkRes = {skipped: 'no editor pair'};
        if (editorFile && hiresFile) {
            linkRes = await L.mediaLinkReal(page, app, {submissionId: a.find.sub, publicationId: findPub, fileId: editorFile.id, targetFileId: hiresFile.id});
        }
        fact('copyeditor link (pair editor web+hires)', linkRes);
        let delRes = {skipped: 'no created file'};
        if (added.createdId) {
            delRes = await L.mediaDelete(page, app, {submissionId: a.find.sub, publicationId: findPub, fileId: added.createdId});
        }
        fact('copyeditor delete (own file)', delRes);
        const afterList = await L.listMedia(page, app, a.find.sub, findPub);
        fact('copyeditor media list after writes', afterList);
        record(name('copyeditor-after-writes'), {list: afterList});

        if (MODE === 'neighbour') {
            // N3: the metadata gate the box legitimately grants at Copyediting must survive the fix.
            const meta = await L.publicationEdit(page, app, {submissionId: a.find.sub, publicationId: findPub, title: 'Copyeditor metadata edit sxx8', locale: findLocale});
            fact('neighbour copyeditor metadata edit (must stay 200)', meta);
        }
        await signOut(page);

        // --- the control, as the Copyeditor on a Production submission ---------
        await signIn(page, a.control.user);
        await frame.gotoEditorial(a.control.sub); // land a back-office page so window.pkp (the CSRF token) is present
        await idle(page).catch(() => {});
        const ctrlAdd = await L.mediaAdd(page, app, {submissionId: a.control.sub, publicationId: ctrlPub, filePath: second, genreId, name: 'copyeditor-control-sxx8.png', locale: ctrlLocale});
        fact('control copyeditor add in Production (must be refused)', ctrlAdd);
        await signOut(page);

        if (MODE === 'neighbour') {
            // N1: a manager may still change media in Production.
            await signIn(page, 'dbarnes');
            await frame.gotoEditorial(a.control.sub);
            await idle(page).catch(() => {});
            const mgr = await L.mediaAdd(page, app, {submissionId: a.control.sub, publicationId: ctrlPub, filePath: second, genreId, name: 'manager-prod-sxx8.png', locale: ctrlLocale});
            fact('neighbour manager add in Production (must stay 200)', mgr);
            await signOut(page);
            // N2: a Section Editor (reaches Production, box ticked by default) may still change media there.
            if (a.subEditor) {
                await signIn(page, a.subEditor);
                await frame.gotoEditorial(a.control.sub);
                await idle(page).catch(() => {});
                const se = await L.mediaAdd(page, app, {submissionId: a.control.sub, publicationId: ctrlPub, filePath: second, genreId, name: 'subeditor-prod-sxx8.png', locale: ctrlLocale});
                fact('neighbour section editor add in Production (must stay 200)', se);
                await signOut(page);
            } else {
                fact('neighbour section editor add in Production', 'skipped: no Section Editor on a Production submission here (OMP); shares OJS lib/pkp');
            }
        }

        record(name('facts'), facts);
    } finally {
        await close();
    }
});
