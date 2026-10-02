// Issue report docs/issues/U47-A3-media-upload-window-hidden-drop-button.md (U47 A3): the
// empty "Upload Media File" window offers screen readers and the keyboard a button "Drop
// files here to upload" that nothing on screen shows. Takes the report's Steps on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"), on submission 1 of
// each app, as dbarnes. The kit builds nothing.
//
//   1. sign in as dbarnes
//   2. open submission 1
//   3. side menu › "Media"
//   4. press "Add Media File"
//   5. read the window's buttons from the accessibility tree
//   6. focus "Click to upload files", press Tab: where does the focus go, is it on screen
//   7. press Enter on the focused element (only when it is the unseen button): file chooser?
//   8. press "Click to upload files", choose figure.png; read the buttons again
//
// WALK=neighbour (fix in and out): on the same window, "Click to upload files" with
// figure.png and a drop of figure.png on the drop area each give a card whose type list
// works and "Upload Files" comes on.
//
// Reset first:  npm run fleet-prep -- --feature issues-u47r2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u47r2 PROBE_AGENT=u47r2 node bin/probe.js all shared/playwright/checks/issues/media-upload-window-hidden-drop-button/walk.js
// Neighbour:    WALK=neighbour PROBE_RUN=nb-in|nb-out (same command)
// Facts: .reports/<feature>/u47r2/[neighbour-]a3facts[-<run>]-<app>.json
const path = require('path');
const fs = require('fs');
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

const MODE = process.env.WALK || 'walk';
const REPO = path.resolve(__dirname, '../../../../..');
const TITLES = {
    ojs: 'Signalling Theory Dividends',
    omp: 'The ABCs of Human Survival: A Paradigm for Global Citizenship',
    ops: 'The influence of lactation on the quantity and quality of cashmere production',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const figure = path.join(REPO, `apps/${app.name}/playwright/fixtures/files/figure.png`);
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const name = (s) => (MODE === 'walk' ? s : `${MODE}-${s}`);
    const {page, close} = await launch(app);
    const scriptErrors = [];
    page.on('pageerror', (e) => scriptErrors.push(String(e.message).slice(0, 200)));
    const snap = async (s) => {
        const sc = await screen(page).catch((e) => ({error: String(e.message).slice(0, 200)}));
        record(name(s), sc);
        await shot(page, name(s)).catch(() => {});
        return sc;
    };
    const uploadWin = () => page.getByRole('dialog', {name: 'Upload Media File'});

    /** The window's buttons as the accessibility tree has them, each with whether it is on screen. */
    async function buttons() {
        const win = uploadWin();
        const aria = await win.ariaSnapshot().catch((e) => `error: ${e.message}`);
        const list = await win.getByRole('button').evaluateAll((els) => els.map((b) => {
            let shown = true;
            for (let e = b; e; e = e.parentElement) {
                const cs = getComputedStyle(e);
                if (cs.opacity === '0' || cs.visibility === 'hidden' || cs.display === 'none') shown = false;
            }
            const r = b.getBoundingClientRect();
            if (r.width < 2 || r.height < 2) shown = false;
            return {name: (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim(),
                shown, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], cls: String(b.className).slice(0, 60)};
        })).catch((e) => [{error: e.message}]);
        const drop = await win.getByRole('button', {name: 'Drop files here to upload'}).count();
        return {aria, list, dropButtons: drop};
    }
    /** The focused element: its name, whether it is on screen. */
    const focused = () => page.evaluate(() => {
        const b = document.activeElement;
        if (!b || b === document.body) return {none: true};
        let shown = true;
        for (let e = b; e; e = e.parentElement) {
            const cs = getComputedStyle(e);
            if (cs.opacity === '0' || cs.visibility === 'hidden' || cs.display === 'none') shown = false;
        }
        const r = b.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) shown = false;
        return {tag: b.tagName, name: (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
            shown, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]};
    });

    async function openMedia() {
        await signIn(page, 'dbarnes');
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=1`));
        await idle(page);
        const wf = page.getByRole('dialog').first();
        await wf.getByText(TITLES[app.name], {exact: false}).first().waitFor({timeout: 30000}).catch(() => {});
        fact('submissionTitleShown', await wf.getByText(TITLES[app.name], {exact: false}).count());
        const media = wf.getByRole('button', {name: 'Media', exact: true}).or(wf.getByRole('link', {name: 'Media', exact: true})).first();
        await media.click();
        await idle(page);
        await wf.getByRole('button', {name: 'Add Media File', exact: true}).waitFor({timeout: 30000});
        await sleep(300);
    }
    async function openUpload() {
        await page.getByRole('button', {name: 'Add Media File', exact: true}).click();
        await uploadWin().waitFor({timeout: 30000});
        await idle(page);
        await sleep(500);
    }
    async function chooseFigure() {
        const chooserP = page.waitForEvent('filechooser', {timeout: 15000});
        await uploadWin().getByRole('button', {name: 'Click to upload files', exact: true}).click();
        const ch = await chooserP;
        await ch.setFiles(figure);
        await uploadWin().locator('select').first().waitFor({timeout: 60000}).catch(() => {});
        await idle(page);
        await sleep(300);
    }
    async function cardState() {
        const win = uploadWin();
        const card = await win.getByText('figure.png', {exact: true}).count();
        const sel = win.locator('select').first();
        let typeChosen = null;
        if (await sel.count()) {
            await sel.selectOption({label: 'Image'}).catch(() => {});
            await sleep(200);
            typeChosen = await sel.evaluate((s) => s.options[s.selectedIndex]?.text?.trim()).catch(() => null);
        }
        const up = win.getByRole('button', {name: 'Upload Files', exact: true});
        return {cards: card, typeChosen, uploadFilesEnabled: (await up.count()) ? await up.isEnabled() : null};
    }

    try {
        if (MODE === 'walk') {
            await openMedia();                                         // steps 1-3
            await snap('a3-03-media');
            await openUpload();                                        // step 4
            await snap('a3-04-window');
            fact('step5Buttons', await buttons());                     // step 5
            const click = uploadWin().getByRole('button', {name: 'Click to upload files', exact: true});
            await click.focus();                                       // step 6
            fact('step6Before', await focused());
            await page.keyboard.press('Tab');
            await sleep(300);
            const after = await focused();
            fact('step6AfterTab', after);
            await shot(page, name('a3-06-after-tab')).catch(() => {});
            if (!after.shown && /Drop files/.test(after.name || '')) { // step 7
                const chooserP = page.waitForEvent('filechooser', {timeout: 5000}).then(() => true).catch(() => false);
                await page.keyboard.press('Enter');
                fact('step7FileChooser', await chooserP);
                await sleep(500);
            } else {
                fact('step7FileChooser', `skipped: focus on ${JSON.stringify(after)}`);
            }
            fact('windowStillOpen', await uploadWin().isVisible().catch(() => false));
            await chooseFigure();                                      // step 8
            await snap('a3-08-card');
            fact('step8Buttons', await buttons());
        } else {
            // Neighbour: the upload paths the fix must leave alone.
            await openMedia();
            await openUpload();
            await chooseFigure();
            fact('nbClickUpload', await cardState());
            await snap('a3-nb-01-click');
            // Remove the card, then drop figure.png on the visible drop area.
            await uploadWin().getByRole('button', {name: 'Remove', exact: true}).first().click().catch(() => {});
            await sleep(400);
            const bytes = fs.readFileSync(figure).toString('base64');
            const dt = await page.evaluateHandle((b64) => {
                const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
                const d = new DataTransfer();
                d.items.add(new File([bin], 'figure.png', {type: 'image/png'}));
                return d;
            }, bytes);
            const area = uploadWin().getByText('Drag and drop files here.', {exact: true});
            await area.dispatchEvent('dragover', {dataTransfer: dt}).catch(() => {});
            await area.dispatchEvent('drop', {dataTransfer: dt}).catch((e) => fact('dropError', e.message));
            await uploadWin().locator('select').first().waitFor({timeout: 60000}).catch(() => {});
            await idle(page);
            fact('nbDropUpload', await cardState());
            await snap('a3-nb-02-drop');
        }
    } finally {
        fact('scriptErrors', scriptErrors);
        record(MODE === 'walk' ? 'a3facts' : 'neighbour-a3facts', facts);
        await close();
    }
});
