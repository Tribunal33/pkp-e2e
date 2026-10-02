// Issue report docs/issues/U46-A1-galley-edit-window-upload-heading.md (U46 A1): a galley's
// "Edit" opens a window headed "Upload a File Ready for Publication", the upload wizard's
// heading, although the window edits the galley's label, language, address and URL Path and
// uploads nothing. Takes the report's Steps through the screens on a dataset fleet freshly
// reset to PKP's default test dataset, as `dbarnes`. The kit builds nothing; nothing is saved.
//
// MODE=walk (default). OJS submission 1 "Signalling Theory Dividends" (its newest version,
// unpublished, has the galley "PDF Version 2"); OPS preprint 1 "The influence of lactation on
// the quantity and quality of cashmere production" (galley "PDF"):
//   1-2. sign in as dbarnes; Publication (OPS "Preprint") › "Galleys"
//   3-4. the row's "More Actions" › "Edit": the window's heading, tabs and fields
//   5.   "Cancel"
// MODE=nb, the neighbour alone (with the fix in and out): the other two windows of the page
// keep their headings: "Add galley" ("Create New Galley", closed with "Cancel") and the row's
// "Change File" (the upload wizard "Upload a File Ready for Publication", closed with
// "Cancel").
// OMP has no galleys: skipped.
//
// Reset first:  npm run fleet-prep -- --feature issues-w2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-w2 PROBE_AGENT=w2 node bin/probe.js all shared/playwright/checks/issues/galley-edit-window-upload-heading/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-w2-3_5, PROBE_RUN=r35.
// Neighbour:    MODE=nb (and PROBE_RUN=nb-in / nb-out) in front of the run.
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('../remote-galley-asked-for-file/lib');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    if (app.name === 'omp') {
        console.log('[a1] omp: a press has no galleys; skipped');
        return;
    }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const ID = 1;
    const ROW = app.name === 'ops' ? 'PDF' : 'PDF Version 2';
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[a1] ${app.name} ${MODE} ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const galleys = await L.openGalleys(page, app, ID);
        fact('2 galleys', await galleys.labels());
        if (MODE === 'walk') {
            fact('3 menu', await galleys.openMenu(ROW));
            await galleys.choose('Edit');
            await page.locator('form[id$="GalleyForm"] input[name="label"]').last().waitFor({timeout: 30_000});
            await idle(page);
            const windows = await L.openWindows(page);
            const top = windows[windows.length - 1];
            record('a1-04-edit-window', await screen(page));
            await shot(page, 'a1-04-edit-window').catch(() => {});
            fact('4 edit window heading', top.heading);
            fact('4 edit window tabs', top.tabs);
            const form = page.locator('form[id$="GalleyForm"]').last();
            fact('4 fields', {
                label: await form.locator('input[name="label"]').inputValue(),
                fileInputs: await form.locator('input[type="file"]').count(),
                labels: (await form.locator('label').allInnerTexts()).map((s) => L.flat(s, 80)).filter(Boolean),
                buttons: (await form.getByRole('button').allInnerTexts()).map((s) => L.flat(s, 40)).filter(Boolean),
            });
            const {GalleyWindow} = require('../../../pages/GalleysPages.js');
            await new GalleyWindow(page, top.heading).cancel();
            fact('5 after Cancel, windows', (await L.openWindows(page)).map((w) => w.heading));
        } else {
            const win = await galleys.openCreate().catch((e) => ({error: String(e).slice(0, 200)}));
            fact('nb add galley heading', win.error ? win : await L.topHeading(page));
            if (!win.error) await win.cancel();
            await galleys.openChangeFile(ROW).catch((e) => fact('nb change file error', String(e).slice(0, 200)));
            fact('nb change file heading', await L.topHeading(page));
            const w = await L.openWindows(page);
            if (w.length > 1) await galleys.cancelWizard();
            fact('nb after Cancel, windows', (await L.openWindows(page)).map((x) => x.heading));
        }
    } finally {
        record(`a1-facts${MODE === 'walk' ? '' : `-${MODE}`}`, facts);
        await close();
    }
});
