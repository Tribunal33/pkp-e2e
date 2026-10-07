// Issue report docs/issues/U47-A8-copyeditor-changes-media-outside-production.md (U47 A8): the "Media"
// page offers its changes only to a role on the submission's Production stage (a journal does not show
// the Copyeditor the page; a press shows the list with no buttons). The server, though, accepts the
// same changes from anyone with a role on the stage the submission is in NOW whose assignment carries
// "Permit submission metadata edit". So a Copyeditor given that box can add, rename, relink and delete
// a version's media files while the submission is in Copyediting, by sending the requests the page
// would send; in Production the same request is refused.
//
// WALK=walk (default) takes the report's Steps on PKP's default test dataset, on OJS and OMP:
//   setup (dbarnes): tick the Copyeditor's "Permit submission metadata edit" on the Copyediting
//     submission; on its "Media" page add two images through the screen (one "Web resolution", one
//     "High resolution"), capturing the add request's genreId.
//   finding (the Copyeditor): record that no "Media" control is offered; send the page's add, edit,
//     link and delete requests on the Copyediting version -> all 200 (the fix: all 401).
//   control (the Copyeditor): the same add on the Production submission -> 401.
// OPS has the route but a preprint is always in Production (or Done), so this cannot arise there
// (recorded N/A).
//
// WALK=neighbour runs alone (the fix trial's neighbour, fix in and out; it does not take the Steps):
//   N1 the manager (dbarnes) adds a media file on the Production submission's "Media" page, through
//      the screen; N2 (OJS) the Section Editor dbuskins, assigned there and made "recommend only" by
//      dbarnes, adds one; N4 the Layout Editor
//      gcox, assigned there, adds one once dbarnes ticks his box; N3 the Copyeditor, box ticked, still
//      edits the publication's title at Copyediting. All must stay 200 with the fix.
//
// Reset first:  npm run fleet-prep -- --feature issues-rc --dataset 3 --reset --apps ojs,omp
// Run (main):   ONLY=ojs PROBE_FEATURE=issues-rc PROBE_AGENT=rc node bin/probe.js ojs shared/playwright/checks/issues/copyeditor-changes-media-outside-production/walk.js
//   (omp the same). Stable line: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-rc-3_5 ... .
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');
const L = require('./lib');
const {editBox, stored} = require('../section-editor-edit-assignment-saves-nothing/lib');

const MODE = process.env.WALK || 'walk';
const REPO = path.resolve(__dirname, '../../../../..');
const TAG = 'r07rc';

// Per app: the Copyediting submission with its Copyeditor, the Production control, and the
// participants assigned on the control submission that the fix must leave alone.
const APP = {
    ojs: {find: {sub: 3, user: 'mfritz', who: 'Maria Fritz'}, control: {sub: 5, user: 'mfritz'}, subEditor: 'dbuskins', subEditorWho: 'David Buskins', layout: {user: 'gcox', who: 'Graham Cox'}},
    omp: {find: {sub: 1, user: 'svogt', who: 'Sarah Vogt'}, control: {sub: 4, user: 'mfritz'}, subEditor: null, layout: {user: 'gcox', who: 'Graham Cox'}},
    ops: {skip: true},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const a = APP[app.name];
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `rc-${MODE === 'neighbour' ? 'nb-' : ''}${s}${run}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };

    if (a.skip) {
        const stages = String(sql(app, 'select stage_id, count(*) from submissions group by stage_id order by 1')).trim();
        fact('n/a', {why: 'a preprint server has no Copyediting stage: its workflow is Production (and Done on main)', stages});
        record(name('facts'), facts);
        return;
    }
    if (app.line && app.line !== 'main') {
        // A stable line: the Steps need the "Media" page. Record whether the editor's workflow
        // menu offers one on the Copyediting submission; the walk stops there.
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'dbarnes', {contextPath: app.contextPath});
            await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${a.find.sub}`));
            await page.waitForTimeout(3_000);
            await idle(page).catch(() => {});
            const nav = page.getByRole('navigation').last();
            await nav.getByRole('link', {name: 'Publication', exact: true}).click().catch(() => {});
            await page.waitForTimeout(1_500);
            const items = (await nav.getByRole('treeitem').allInnerTexts()).map((t) => t.split('\n')[0].trim());
            fact('stable line: editor\'s workflow menu items', items);
            fact('stable line: "Media" offered in the editor\'s workflow menu', items.includes('Media'));
            record(name('stable-editor-workflow'), await screen(page));
        } finally {
            await close();
        }
        record(name('facts'), facts);
        return;
    }

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
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    const media = new MediaFileManager(page, frame);

    // Open a submission's "Media" page from the side menu; false when the menu does not offer it.
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
    // Watch the page's own add request: its genreId and the server's answer.
    const watchAdd = () => {
        const seen = {genreId: null, status: null};
        const onReq = (req) => {
            if (/\/mediaFiles(\?|$)/.test(req.url()) && req.method() === 'POST') {
                try {
                    const body = req.postDataJSON();
                    if (body && body.files && body.files[0] && body.files[0].genreId != null) seen.genreId = body.files[0].genreId;
                } catch (e) {
                    // not JSON
                }
            }
        };
        const onRes = (res) => {
            if (/\/mediaFiles(\?|$)/.test(res.url()) && res.request().method() === 'POST') seen.status = res.status();
        };
        page.on('request', onReq);
        page.on('response', onRes);
        seen.stop = () => {
            page.off('request', onReq);
            page.off('response', onRes);
        };
        return seen;
    };

    try {
        if (MODE === 'neighbour') {
            await signIn(page, 'dbarnes');
            const b1 = await editBox(page, app, {submissionId: a.find.sub, name: a.find.who, box: 'canChangeMetadata', label: name('box-copyeditor')});
            fact('setup tick copyeditor box', {before: b1.before, saved: b1.saved, status: b1.save && b1.save.status});
            const b2 = await editBox(page, app, {submissionId: a.control.sub, name: a.layout.who, box: 'canChangeMetadata', label: name('box-layout')});
            fact('setup tick layout editor box', {before: b2.before, saved: b2.saved, status: b2.save && b2.save.status});
            if (a.subEditor) {
                // N2's Section Editor made "recommend only": the fix must not refuse such an assignment.
                const b3 = await editBox(page, app, {submissionId: a.control.sub, name: a.subEditorWho, box: 'recommendOnly', label: name('box-recommend')});
                fact('setup tick section editor recommend-only', {before: b3.before, saved: b3.saved, status: b3.save && b3.save.status});
            }
            fact('setup stored control assignments', stored(app, a.control.sub));
            // N1: the manager adds media on the Production submission through the screen.
            const w = watchAdd();
            const opened = await openMedia(a.control.sub);
            fact('N1 manager media page offered (side menu)', opened);
            let n1 = {added: false};
            try {
                await media.addFiles([{file: figure, name: 'figure.png', mediaType: 'Image'}]);
                n1.added = true;
            } catch (e) {
                n1.error = String(e.message).slice(0, 200);
            }
            await idle(page).catch(() => {});
            w.stop();
            n1.status = w.status;
            fact('N1 manager add in Production via the screen (must stay 200)', n1);
            record(name('N1-manager-media'), await screen(page));
            const genreId = w.genreId;
            await signOut(page);

            if (a.subEditor) {
                await signIn(page, a.subEditor);
                await frame.gotoEditorial(a.control.sub);
                await idle(page).catch(() => {});
                const se = await L.mediaAdd(page, app, {submissionId: a.control.sub, publicationId: ctrlPub, filePath: second, genreId, name: `subeditor-prod-${TAG}.png`, locale: ctrlLocale});
                fact('N2 recommend-only section editor add in Production (must stay 200)', se);
                await signOut(page);
            } else {
                fact('N2 section editor add in Production', 'skipped: no Section/Series Editor assigned on this Production submission');
            }

            await signIn(page, a.layout.user);
            const layoutOffered = await openMedia(a.control.sub);
            fact('N4 layout editor media page offered (side menu)', layoutOffered);
            if (layoutOffered) fact('N4 layout editor "Add Media File" offered', (await media.addButton().count()) > 0);
            const le = await L.mediaAdd(page, app, {submissionId: a.control.sub, publicationId: ctrlPub, filePath: second, genreId, name: `layout-prod-${TAG}.png`, locale: ctrlLocale});
            fact('N4 layout editor add in Production (must stay 200)', le);
            await signOut(page);

            await signIn(page, a.find.user);
            await frame.gotoEditorial(a.find.sub);
            await idle(page).catch(() => {});
            const meta = await L.publicationEdit(page, app, {submissionId: a.find.sub, publicationId: findPub, title: `Copyeditor metadata edit ${TAG}`, locale: findLocale});
            fact('N3 copyeditor title edit at Copyediting (must stay 200)', meta);
            await signOut(page);
            record(name('facts'), facts);
            return;
        }

        // --- 1-4: setup, as dbarnes --------------------------------------------
        await signIn(page, 'dbarnes');
        const r1 = await editBox(page, app, {submissionId: a.find.sub, name: a.find.who, box: 'canChangeMetadata', label: name('2-box')});
        fact('2 tick copyeditor box', {before: r1.before, posted: r1.posted, saved: r1.saved, saveStatus: r1.save && r1.save.status});
        fact('2 stored assignments', stored(app, a.find.sub));

        const w = watchAdd();
        const opened = await openMedia(a.find.sub);
        fact('3 dbarnes media page offered (side menu)', opened);
        await media.addFiles([
            {file: figure, name: 'figure.png', mediaType: 'Image'},
            {file: second, name: 'profile-image-400.png', mediaType: 'Image', resolution: 'High resolution'},
        ]);
        await idle(page).catch(() => {});
        w.stop();
        const genreId = w.genreId;
        fact('3 dbarnes add via the screen', {status: w.status, genreId});
        record(name('3-media-list'), await screen(page));
        const editorList = await L.listMedia(page, app, a.find.sub, findPub);
        fact('3 media list (editor)', editorList);
        const editorFile = editorList.items && editorList.items.find((f) => /^figure\.png$/.test(f.name || ''));
        const hiresFile = editorList.items && editorList.items.find((f) => /^profile-image-400\.png$/.test(f.name || ''));
        fact('3 editor files', {web: editorFile, hires: hiresFile});
        await signOut(page);

        // --- 5-7: the Copyeditor -----------------------------------------------
        await signIn(page, a.find.user);
        const copyOpened = await openMedia(a.find.sub);
        fact('6 copyeditor media page offered (side menu)', copyOpened);
        if (copyOpened) {
            fact('6 copyeditor media offer', {
                addMediaFile: (await media.addButton().count()) > 0,
                batchLinkMedia: (await media.batchButton().count()) > 0,
                rowMenu: (await media.menuButton('figure.png').count()) > 0,
            });
            record(name('6-copyeditor-media-page'), await screen(page));
        } else {
            await frame.gotoEditorial(a.find.sub);
            await idle(page).catch(() => {});
            record(name('6-copyeditor-no-media'), await screen(page));
        }

        const added = await L.mediaAdd(page, app, {submissionId: a.find.sub, publicationId: findPub, filePath: second, genreId, name: `copyeditor-added-${TAG}.png`, locale: findLocale});
        fact('7 copyeditor add', added);
        let editRes = {skipped: 'no editor file'};
        if (editorFile) {
            editRes = await L.mediaEdit(page, app, {submissionId: a.find.sub, publicationId: findPub, fileId: editorFile.id, name: `renamed-by-copyeditor-${TAG}.png`, locale: findLocale});
        }
        fact('7 copyeditor edit (editor file)', editRes);
        let linkRes = {skipped: 'no editor pair'};
        if (editorFile && hiresFile) {
            linkRes = await L.mediaLinkReal(page, app, {submissionId: a.find.sub, publicationId: findPub, fileId: editorFile.id, targetFileId: hiresFile.id});
        }
        fact('7 copyeditor link (editor web + high-res)', linkRes);
        let delRes = {skipped: 'no created file'};
        if (added.createdId) {
            delRes = await L.mediaDelete(page, app, {submissionId: a.find.sub, publicationId: findPub, fileId: added.createdId});
        }
        fact('7 copyeditor delete (own added file)', delRes);
        await signOut(page);

        // The list afterwards, as the editor sees it.
        await signIn(page, 'dbarnes');
        await openMedia(a.find.sub);
        record(name('7-media-list-after'), await screen(page));
        fact('7 media list after writes (editor)', await L.listMedia(page, app, a.find.sub, findPub));
        fact('7 activity log rows by the copyeditor', String(sql(app, `select l.event_type, l.message from event_log l join users u on u.user_id = l.user_id where u.username = '${a.find.user}' and l.date_logged > now() - interval '30 minutes' order by l.log_id`)).trim().split('\n'));
        await signOut(page);

        // --- 8: control, the Copyeditor on a Production submission -------------
        await signIn(page, a.control.user);
        await frame.gotoEditorial(a.control.sub);
        await idle(page).catch(() => {});
        const ctrlAdd = await L.mediaAdd(page, app, {submissionId: a.control.sub, publicationId: ctrlPub, filePath: second, genreId, name: `copyeditor-control-${TAG}.png`, locale: ctrlLocale});
        fact('8 control copyeditor add in Production (refused)', ctrlAdd);
        await signOut(page);

        record(name('facts'), facts);
    } finally {
        await close();
    }
});
