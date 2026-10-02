// Issue report docs/issues/U47-OMP2-press-copyeditor-media-download-refused.md (U47 OMP2): on a press, a
// role that is offered the "Media" page outside Production (here the Copyeditor in Copyediting) sees
// each media file name as a link, and pressing it opens a tab with a refusal instead of the file.
// Takes the report's Steps on PKP's default test dataset (a dataset fleet):
//   OMP  1-6   dbarnes opens book 1 (Copyediting) › Publication › version › Media, "Add Media File",
//              figure.png as "Image", "Upload Files" (and presses the name: control, the file arrives)
//        7-10  svogt (Copyeditor on book 1) opens book 1 › Publication › version › Media, presses
//              "figure.png" (what the tab shows, and the pages under the version)
//        C     aclark (book 1's author) opens it from My Submissions › Media and presses it (control)
//   OJS  C     mfritz (Copyeditor on submission 3, Copyediting): the pages under the version (no "Media")
//   OPS  skipped: every OPS workflow role reaches Production, so no role sees "Media" outside it.
// WALK=neighbour runs alone (fix in and out), OMP only: dbarnes adds figure.png to book 4
// (Production); gcox (Layout Editor, assigned there) opens book 4 › Media and presses it.
// A step reads the state the fix brings (no "Media" under the version) and records it.
//
// Reset first:  npm run fleet-prep -- --feature issues-u47r7 --dataset 7 --reset
// Run (main):   PROBE_FEATURE=issues-u47r7 PROBE_AGENT=u47r7 node bin/probe.js all shared/playwright/checks/issues/press-media-download-refused-outside-production/walk.js
const {forEachApp, launch, signIn, screen, record, serverLog} = require('../../../probe');
const {pressFileLink, FIGURE} = require('./lib');

const MODE = process.env.WALK || 'walk';
const FILE = 'figure.png';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name === 'ops') {
        console.log('[fact] ops skipped: every workflow role reaches Production (registry/userGroups.xml)');
        return;
    }
    if (app.name === 'ojs' && MODE !== 'walk') return;
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {MediaFileManager} = require('../../../pages/MediaFilesPages.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `omp2${MODE === 'neighbour' ? 'nb' : ''}-${s}${run}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const log = serverLog(app);

    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    const media = new MediaFileManager(page, frame);

    /** Open the version's "Media" page when the menu offers it; record the menu either way. */
    const openMedia = async (label) => {
        const pages = await frame.pagesUnderLatestVersion();
        fact(`${label} pages under version`, pages);
        if (!pages.includes('Media')) return false;
        await media.openFromMenu();
        return true;
    };
    const listState = async () => ({
        names: await media.sortedNames(),
        addButton: await media.addButton().count(),
        batchButton: await media.batchButton().count(),
        rowButtons: await media.rowButtons(FILE).count(),
    });
    const press = async (label) => {
        const from = log.mark();
        const got = await pressFileLink(page, media.nameLink(FILE).first());
        got.serverLog = log.since(from);
        fact(label, got);
        return got;
    };
    const addFigure = async (sid, label) => {
        await signIn(page, 'dbarnes');
        await frame.gotoEditorial(sid);
        await openMedia(`${label} dbarnes`);
        await media.addFiles([{file: FIGURE, name: FILE, mediaType: 'Image'}]);
        fact(`${label} dbarnes list`, await listState());
        record(name(`${label}-dbarnes-media`), await screen(page));
    };

    try {
        if (app.name === 'ojs') {
            // Control: the OJS Copyeditor on submission 3 (Copyediting).
            await signIn(page, 'mfritz');
            await frame.gotoEditorial(3);
            const offered = await openMedia('C mfritz');
            fact('C mfritz media offered', offered);
            record(name('C-mfritz-menu'), await screen(page));
            return;
        }

        if (MODE === 'neighbour') {
            await addFigure(4, 'N1');
            await signIn(page, 'gcox');
            await frame.gotoEditorial(4);
            const offered = await openMedia('N2 gcox');
            if (offered) {
                fact('N2 gcox list', await listState());
                record(name('N2-gcox-media'), await screen(page));
                const got = await press('N3 gcox press');
                fact('neighbour verdict', {offered, downloaded: got.downloaded});
            } else {
                record(name('N2-gcox-menu'), await screen(page));
                fact('neighbour verdict', {offered, downloaded: false});
            }
            return;
        }

        // 1-6
        await addFigure(1, '5');
        const editor = await press('5c dbarnes press');

        // 7-10
        await signIn(page, 'svogt');
        await frame.gotoEditorial(1);
        const offered = await openMedia('9 svogt');
        let copyeditor = null;
        if (offered) {
            fact('9 svogt list', await listState());
            record(name('9-svogt-media'), await screen(page));
            copyeditor = await press('10 svogt press');
        } else {
            record(name('9-svogt-menu'), await screen(page));
            // The fix's state: the page's own address typed (what it shows, not a step).
            const pubId = 1;
            await frame.gotoEditorial(1, {menuKey: `publication_${pubId}_media`});
            await page.waitForTimeout(3000);
            const typed = await screen(page);
            record(name('9t-svogt-typed-media'), typed);
            fact('9t svogt typed media address', {
                table: await media.table().count(),
                links: await media.nameLink(FILE).count(),
                heading: await frame.heading().innerText().catch(() => null),
            });
        }
        // What the Copyeditor's "Publication Formats" page shows (reach, not a step).
        try {
            await frame.selectPage('Publication Formats');
            await page.waitForTimeout(1500);
            const s = await screen(page);
            record(name('R-svogt-formats'), s);
            fact('R svogt formats text', (s.text?.dialog || s.text?.main || '').slice(0, 600));
        } catch (e) {
            fact('R svogt formats', `not read: ${e.message.split('\n')[0]}`);
        }

        // Control: the author.
        await signIn(page, 'aclark');
        await frame.gotoAuthor(1);
        const authorOffered = await openMedia('C aclark');
        let author = null;
        if (authorOffered) {
            record(name('C-aclark-media'), await screen(page));
            author = await press('C aclark press');
        }
        fact('verdict', {
            editorDownloaded: editor.downloaded,
            copyeditorOffered: offered,
            copyeditorDownloaded: copyeditor ? copyeditor.downloaded : null,
            copyeditorRefusal: copyeditor ? copyeditor.tabText || copyeditor.body : null,
            authorDownloaded: author ? author.downloaded : null,
        });
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
