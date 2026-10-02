// Issue report docs/issues/U46-A3-remote-galley-asked-for-file.md (U46 A3): a galley saved
// with "This galley will be available at a separate website." ticked is still sent to the
// upload wizard after "Save" in "Create New Galley", and its row keeps offering "Change
// File"; a file uploaded there makes the label a link to it, while readers are sent to the
// address. Takes the report's Steps through the screens on a dataset fleet freshly reset
// to PKP's default test dataset, as `dbarnes`. The kit builds nothing.
//
// MODE=walk (default). OJS submission 5 "Genetic transformation of forest trees"
// (Production, no galleys); OPS preprint 1 "The influence of lactation on the quantity and
// quality of cashmere production" (Production, galley "PDF"):
//   1-2. sign in as dbarnes; Publication (OPS "Preprint") › "Galleys"
//   3.   "Add galley": "Remote u46w2", the box ticked, "https://example.org/u46w2-paper", "Save"
//   4.   the window that opens (if any); its "Cancel"
//   5.   the row's "More Actions" menu
//   6.   "Change File" (when offered): "Article Text" / "Preprint Text", a PDF, "Complete"
//   7.   the row's label and menu
//   8.   OPS: "Post"; signed out, the preprint's page, press "Remote u46w2"
// MODE=nb, the neighbour alone (with the fix in and out): "Add galley" "PDF u46w2" with the
// box unticked must still open the upload wizard on "Save"; after the upload its row, and
// (OPS) the dataset's "PDF" row, must still offer "Change File".
// OMP has no galleys: skipped.
//
// Reset first:  npm run fleet-prep -- --feature issues-w2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-w2 PROBE_AGENT=w2 node bin/probe.js all shared/playwright/checks/issues/remote-galley-asked-for-file/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-w2-3_5, PROBE_RUN=r35.
// Neighbour:    MODE=nb (and PROBE_RUN=nb-in / nb-out) in front of the run.
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const REMOTE = 'Remote u46w2';
const ADDRESS = 'https://example.org/u46w2-paper';
const FILE_GALLEY = 'PDF u46w2';

forEachApp(async (app) => {
    if (app.name === 'omp') {
        console.log('[a3] omp: a press has no galleys; skipped');
        return;
    }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const ID = app.name === 'ops' ? 1 : 5;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[a3] ${app.name} ${MODE} ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const stored = (label) =>
        sql(app, `select g.galley_id, g.remote_url, g.submission_file_id from publication_galleys g join publications p on p.publication_id = g.publication_id where p.submission_id = ${ID} and g.label = '${label}'`);
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const galleys = await L.openGalleys(page, app, ID);
        fact('2 galleys', await galleys.labels());
        if (MODE === 'walk') {
            const win = await galleys.openCreate();
            fact('3 add window', await L.topHeading(page));
            await win.type(win.labelBox(), REMOTE);
            await win.setRemote(true);
            await win.type(win.remoteUrlBox(), ADDRESS);
            record('a3-03-create-filled', await screen(page));
            await win.save();
            const after = await L.windowAfterSave(page);
            record('a3-04-after-save', await screen(page));
            await shot(page, 'a3-04-after-save').catch(() => {});
            fact('4 window after Save', after);
            fact('4 stored', stored(REMOTE));
            if (after) {
                await galleys.cancelWizard();
                fact('4 after Cancel, windows', (await L.openWindows(page)).map((w) => w.heading));
            }
            await idle(page);
            fact('4 galleys', await galleys.labels());
            fact('5 label', await L.rowLabel(galleys, REMOTE));
            const menu = await galleys.menuOffers(REMOTE);
            fact('5 menu', menu);
            if (menu.includes('Change File')) {
                await galleys.openChangeFile(REMOTE);
                record('a3-06-change-file', await screen(page));
                fact('6 change file window', await L.topHeading(page));
                await galleys.uploadInWizard({component: L.component(app), file: L.PDF, name: L.PDF.name});
                await idle(page);
                record('a3-07-galleys', await screen(page));
                await shot(page, 'a3-07-galleys').catch(() => {});
                fact('7 label', await L.rowLabel(galleys, REMOTE));
                fact('7 menu', await galleys.menuOffers(REMOTE));
                fact('7 stored', stored(REMOTE));
                fact('7 edit window: box ticked, address', await L.readEditRemote(page, galleys, REMOTE));
            } else {
                fact('6 change file', 'not offered');
            }
            if (app.name === 'ops') {
                fact('8 post', await L.post(page));
                await signOut(page);
                const landing = await page.goto(app.url(`/index.php/${app.contextPath}/preprint/view/${ID}`));
                await idle(page);
                record('a3-08-preprint-page', await screen(page));
                fact('8 preprint page', {status: landing.status(), links: (await page.locator('a.obj_galley_link').allInnerTexts()).map((s) => L.flat(s))});
                fact('8 reader presses the remote galley', await L.pressReaderGalley(page, REMOTE));
            }
        } else {
            const win = await galleys.openCreate();
            await win.type(win.labelBox(), FILE_GALLEY);
            await win.save();
            const after = await L.windowAfterSave(page);
            fact('nb window after Save (file galley)', after && {heading: after.heading, tabs: after.tabs});
            if (after) await galleys.uploadInWizard({component: L.component(app), file: L.PDF, name: L.PDF.name});
            await idle(page);
            record('a3-nb-galleys', await screen(page));
            fact('nb file galley label', await L.rowLabel(galleys, FILE_GALLEY));
            fact('nb file galley menu', await galleys.menuOffers(FILE_GALLEY));
            if (app.name === 'ops') fact('nb dataset PDF menu', await galleys.menuOffers('PDF'));
            fact('nb stored', stored(FILE_GALLEY));
        }
    } finally {
        record(`a3-facts${MODE === 'walk' ? '' : `-${MODE}`}`, facts);
        await close();
    }
});

