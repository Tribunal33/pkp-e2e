// Spec U46 OPS3 (docs/specs/U46-galleys.md#ops3): before posting, the preprint's Author is
// offered "Change File" on every galley, and it is refused on a galley whose file someone else
// uploaded. Issue report: docs/issues/U46-OPS3-author-galley-change-file-refused.md.
//
// Starts from PKP's default test dataset (OPS), freshly loaded:
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/author-galley-change-file-refused/walk.js
// MODE=nb walks the neighbours alone (the editor's menu on both galleys, the Author's on his own).
// Helpers: ../moderator-galleys-offered-then-refused/lib.js.
const {forEachApp, launch, signIn, signOut, record, shot, idle} = require('../../../probe');
const L = require('../moderator-galleys-offered-then-refused/lib');

const MODE = process.env.MODE || 'steps';
const SUB = 1; // "The influence of lactation on the quantity and quality of cashmere production", Production, not posted
const PUB = 1;
const MINE = 'u46w6 PDF';
const WIZARD = 'Upload a File Ready for Publication';

forEachApp(async (app) => {
    if (app.name !== 'ops') return; // only a preprint server lets the Author manage galleys
    const out = {mode: MODE, line: app.line || 'main', steps: {}};
    const {page, close} = await launch(app);
    const dialogs = L.watchDialogs(page);
    const step = async (name, fn) => {
        try {
            out.steps[name] = await fn();
        } catch (e) {
            out.steps[name] = {error: L.flat(e.message, 400)};
            await shot(page, `b-${MODE}-fail-${name}`).catch(() => {});
        }
        record(`w6b-${MODE}`, out);
    };
    try {
        out.before = {galleys: L.storedGalleys(app, PUB), pdf: L.storedFile(app, 'PDF', PUB), assignments: L.storedAssignments(app, SUB)};
        // Step 1 (precondition): dbarnes adds a galley with a file of his own.
        await signIn(page, 'dbarnes');
        await step('1-editor-adds', async () => {
            const g = await L.openGalleys(page, app, SUB);
            const f = L.namedFile('preprint.pdf', 'u46w6.pdf');
            await g.addGalley({label: MINE, component: 'Preprint Text', file: f.path, name: f.name});
            await idle(page);
            return {labels: await g.labels(), stored: L.storedGalleys(app, PUB), file: L.storedFile(app, MINE, PUB)};
        });
        if (MODE === 'nb') {
            await step('nb1-editor-offers', async () => {
                const g = await L.openGalleys(page, app, SUB);
                return await L.offers(g);
            });
        }
        await signOut(page);

        await signIn(page, 'ccorino');
        if (MODE === 'steps') {
            await step('2-3-author-change-file', async () => {
                const g = await L.openGalleys(page, app, SUB, {author: true});
                const offered = await L.offers(g);
                await shot(page, 'b-steps-2-galleys');
                if (!(offered.rows[MINE] || []).includes('Change File')) return {offered, changeFile: 'not offered'};
                await g.openMenu(MINE);
                const answered = page.waitForResponse((r) => r.url().includes('start-wizard') || r.url().includes('startWizard'), {timeout: L.T}).catch(() => null);
                await g.choose('Change File');
                const r = await answered;
                const dlg = page.getByRole('dialog', {name: WIZARD, exact: true});
                await dlg.waitFor({timeout: L.T});
                await idle(page);
                await L.sleep(800);
                const text = L.flat(await dlg.innerText(), 600);
                const steps = await dlg.getByRole('tab').count();
                const body = r ? L.flat(await r.text().catch(() => null), 300) : null;
                await shot(page, 'b-steps-3-change-file');
                await L.closeWindow(page, dlg);
                return {offered, window: {text, stepTabs: steps}, request: r ? {status: r.status(), body} : null, file: L.storedFile(app, MINE, PUB)};
            });
            await step('control-own-file', async () => {
                const g = await L.openGalleys(page, app, SUB, {author: true});
                const wizard = await g.openChangeFile('PDF');
                const f = L.namedFile('replacement.pdf', 'u46w6-replacement.pdf');
                await wizard.uploadOne({file: f.path, name: f.name});
                await idle(page);
                await L.sleep(700);
                return {file: L.storedFile(app, 'PDF', PUB), labels: await g.labels()};
            });
        } else {
            await step('nb2-author-offers', async () => {
                const g = await L.openGalleys(page, app, SUB, {author: true});
                const offered = await L.offers(g);
                const wizard = await g.openChangeFile('PDF');
                const opened = {text: L.flat(await wizard.dialog().innerText(), 400), stepTabs: await wizard.steps().count()};
                await wizard.cancel({uploaded: false});
                return {offered, ownFileWizard: opened};
            });
        }
        await signOut(page);
    } finally {
        out.dialogs = dialogs;
        record(`w6b-${MODE}`, out);
        await close();
    }
});
