// Issue report docs/issues/U47-A1-media-actions-offered-then-refused.md (U47 A1): on a version's
// "Media" page an assigned participant who may not edit the publication (a Layout Editor; a
// Moderator whose "Permissions" box is unticked) is offered "Add Media File", "Batch Link Media"
// and the full row menu, and every change is then refused. Takes the report's Steps on PKP's
// default test dataset (a dataset fleet), on OJS, OMP and OPS:
//   1-6   `dbarnes`: open the submission (OJS 5, OMP 4, OPS 1); OPS: Participants › Stephanie
//         Berardo › "Edit", untick "Permissions", "OK"; Publication (Preprint) › "Media"; "Add Media
//         File" figure.png as "Image", "Upload Files" (the control: it holds); sign out
//   7-13  `gcox` (OJS, OMP; Layout Editor) / `sberardo` (OPS; Moderator): the same "Media" page;
//         what it offers; "Add Media File" profile-image-400.png › "Upload Files"; row › "Edit Metadata" › new name ›
//         "Save"; reload; "Batch Link Media" › "Link Media"; row › "Delete File" › "OK"
// WALK=neighbour runs alone (fix in and out): steps 1-6, then a participant who may edit the
// publication takes 8-13: `dbuskins` (OJS Section editor, OPS Moderator, "Permissions" ticked in
// the dataset; on OPS step 3 is left out), `dbarnes` on OMP (the dataset assigns no series editor to
// submission 4). Their changes must still be offered and hold.
// A fix that hides a control is recorded, not thrown on: each step presses only what is offered.
//
// Reset first:  npm run fleet-prep -- --feature issues-u47r1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u47r1 PROBE_AGENT=u47r1 node bin/probe.js all shared/playwright/checks/issues/media-actions-offered-then-refused/walk.js
// 3.5, 3.4, 3.3: not walked; they have no "Media" page (the report's Affects, read in the code).
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const {offer, names, addFile, editName, batchLink, deleteFile, sleep} = require('./lib');

const MODE = process.env.WALK || 'walk';
const REPO = path.resolve(__dirname, '../../../../..');
const APP = {
    ojs: {sid: 5, pub: 6, who: 'gcox', neighbour: 'dbuskins', group: 'Publication'},
    omp: {sid: 4, pub: 4, who: 'gcox', neighbour: 'dbarnes', group: 'Publication'},
    ops: {sid: 1, pub: 1, who: 'sberardo', neighbour: 'dbuskins', group: 'Preprint', untick: 'Stephanie Berardo'},
};
const FILE = 'figure.png';
const NEW_NAME = 'figure-u47r1.png';
const SECOND = 'profile-image-400.png'; // the participant's own upload, so two rows never share a name

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const a = APP[app.name];
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {MediaFileManager} = require('../../../pages/MediaFilesPages.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `u47r1-${s}${run}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const file = path.join(REPO, `apps/${app.name}/playwright/fixtures/files/${FILE}`);

    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: a.group}});
    const media = new MediaFileManager(page, frame);
    // Dashboard › the submission › side menu Publication (Preprint) › "Media".
    const openMedia = async () => {
        await frame.gotoEditorial(a.sid);
        await idle(page).catch(() => {});
        try {
            await media.openFromMenu();
        } catch (e) {
            console.log(`[note] side menu "Media" not reached (${String(e).split('\n')[0]}); opening by address`);
            await media.open(a.sid, a.pub);
        }
        await idle(page).catch(() => {});
        await sleep(800);
    };
    const takeSteps = async (who, label) => {
        await signIn(page, who);
        await openMedia();
        fact(`${label} 8 offered`, await offer(media, FILE));
        record(name(`${label}-08-page`), await screen(page));
        fact(`${label} 9 add`, await addFile(page, media, {file: path.join(REPO, `apps/${app.name}/playwright/fixtures/files/${SECOND}`), name: SECOND}));
        record(name(`${label}-09-after-add`), await screen(page));
        const ed = await editName(page, media, {name: FILE, newName: NEW_NAME});
        fact(`${label} 10 edit metadata save`, ed);
        record(name(`${label}-10-after-save`), await screen(page));
        // 11: reload (the kit accepts the page-leave question) and open "Media" again.
        await openMedia();
        const shownName = (await names(media)).includes(NEW_NAME) ? NEW_NAME : FILE;
        fact(`${label} 11 list after reload`, await names(media));
        fact(`${label} 12 batch link`, await batchLink(page, media));
        record(name(`${label}-12-after-batch`), await screen(page));
        fact(`${label} 13 delete`, await deleteFile(page, media, {name: shownName}));
        record(name(`${label}-13-after-delete`), await screen(page));
        await openMedia();
        fact(`${label} end list after reload`, await names(media));
        await signOut(page);
    };

    try {
        // 1-6 as dbarnes
        await signIn(page, 'dbarnes');
        if (a.untick && MODE !== 'neighbour') {
            const {editBox} = require('../section-editor-edit-assignment-saves-nothing/lib');
            const r = await editBox(page, app, {submissionId: a.sid, name: a.untick, box: 'canChangeMetadata', label: name('03-untick')});
            fact('3 untick Permissions', {before: r.before, posted: r.posted, saveStatus: r.save && r.save.status, reopened: r.reopened, saved: r.saved, notices: r.notices});
        }
        await openMedia();
        fact('4 dbarnes offered (empty list)', await offer(media, null));
        fact('5 dbarnes add (control)', await addFile(page, media, {file, name: FILE}));
        record(name('05-dbarnes-added'), await screen(page));
        await signOut(page);

        if (MODE === 'neighbour') {
            await takeSteps(a.neighbour, `N-${a.neighbour}`);
        } else {
            await takeSteps(a.who, a.who);
        }
    } finally {
        record(name('facts'), facts);
        await idle(page).catch(() => {});
        await close();
    }
});
