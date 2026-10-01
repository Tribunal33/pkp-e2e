// Issue report walk: docs/issues/U21-OPS8-OPS9-reopened-preprint-draft-galley-upload-stalls.md
// (spec U21 register OPS8, OPS9). Takes the report's Steps through the screens on
// a dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
// `ccorino` starts a submission, uploads a galley "PDF", reloads the wizard, reads
// "Review", then adds a second galley "HTML". OPS only (the galley list in the
// submission wizard is OPS's). The kit builds nothing; every change is made on
// screen. Reset the fleet before each walk.
//
//   PHASE=all (default)  Steps 1-10
//   PHASE=neighbour      the path the fix must leave alone: a new draft, "PDF" then
//                        "HTML" in the same visit (no reload), "Review" lists both;
//                        walked with and without fix.diff
//
// Run (main, then stable-3_5_0):
//   npm run fleet-prep -- --feature issues-w32 --dataset 5 --reset
//   PROBE_FEATURE=issues-w32 PROBE_AGENT=w32 node bin/probe.js ops shared/playwright/checks/issues/reopened-preprint-draft-galley-upload-stalls/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w32-3_5 --dataset 5 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w32-3_5 PROBE_AGENT=w32 node bin/probe.js ops <this file>
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');

const T = 30_000;
const PHASE = process.env.PHASE || 'all';
const RUN = process.env.PROBE_RUN || 'main';
const REPO = path.resolve(__dirname, '../../../../..');
const PDF = path.join(REPO, 'apps/ops/playwright/fixtures/files/preprint.pdf');
const HTML = path.join(REPO, 'apps/ops/playwright/fixtures/files/preprint.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

forEachApp(async (app) => {
    if (app.name !== 'ops') { record('skipped', {why: 'only a preprint server lists galleys in the submission wizard'}); return; }
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line, run: RUN, phase: PHASE};
    const save = () => record(`facts-${PHASE}`, facts);

    const {page, close} = await launch(app);
    const errs = [];
    page.on('pageerror', (e) => errs.push({at: Date.now(), text: flat(e.message, 300)}));
    page.on('console', (m) => { if (m.type() === 'error') errs.push({at: Date.now(), console: true, text: flat(m.text(), 300)}); });
    page.on('dialog', async (d) => { if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {}); });
    const errsSince = (t0) => errs.filter((x) => x.at >= t0).map(({console: c, text}) => (c ? `console: ${text}` : text));
    let n = 0;
    async function snap(name) {
        const s = await screen(page).catch((e) => ({url: page.url(), error: flat(e.message), text: {}}));
        const id = `${PHASE}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, s);
        await shot(page, id).catch(() => {});
        return s;
    }

    const footer = page.locator('.submissionWizard__footer');
    const cur = page.locator('.pkpSteps__step__label--current');
    const curText = async () => flat(await cur.innerText().catch(() => ''), 80);
    const labelDialog = page.getByRole('dialog').filter({has: page.locator('#preprintGalleyForm')});
    const upload = page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')});
    const filesPanel = page.locator('.submissionWizard__reviewPanel__body--files');
    const grid = page.locator('[id^="component-grid-preprintgalleys-preprintgalleygrid"]').first();

    async function cont(label) {
        const b = footer.getByRole('button', {name: 'Continue', exact: true});
        for (let a = 0; ; a++) {
            await b.click();
            try { await cur.filter({hasText: new RegExp(`${label}\\s*$`)}).waitFor({timeout: 8000}); await idle(page); return; } catch (e) { if (a >= 2) throw e; }
        }
    }
    // "Continue" to the next step in the step list (3.5 orders Details before Upload Files)
    async function contNext() {
        const labels = (await page.locator('.pkpSteps__step__label').allInnerTexts()).map((x) => flat(x).replace(/^\d+\s*/, ''));
        const c = (await curText()).replace(/^\d+\s*/, '');
        const next = labels[labels.indexOf(c) + 1];
        if (/For Readers/.test(c)) {
            const r = page.getByRole('radio', {name: 'This preprint has not been published elsewhere.', exact: true});
            if (await r.count() && !(await r.isChecked())) await r.check();
        }
        await cont(next);
        return next;
    }
    async function typeAbstract() {
        const ab = page.frameLocator('iframe[id*="-abstract-"]').first().locator('body');
        if ((await ab.innerText().catch(() => '')).trim()) return;
        await ab.click();
        await page.keyboard.type('u21w32 abstract.');
    }
    async function toReview() {
        for (let i = 0; i < 6 && !/Review\s*$/.test(await curText()); i++) {
            if (/Details\s*$/.test(await curText())) await typeAbstract();
            await contNext();
        }
        await page.locator('.submissionWizard__loadingReview').waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
        await sleep(1500);
        await idle(page);
    }
    async function readReview(key) {
        facts[key] = {
            step: await curText(),
            filesPanel: flat(await filesPanel.innerText().catch(() => null), 300),
            warnings: flat(await page.locator('.submissionWizard__review_errors, .submissionWizard .pkpNotification--warning').allInnerTexts().then((a) => a.join(' | ')).catch(() => null), 300),
            submitDisabled: await footer.getByRole('button', {name: 'Submit', exact: true}).isDisabled().catch(() => null),
        };
    }
    const gridText = async () => flat(await grid.innerText().catch(() => null), 400);

    // Steps 3-4 (and 8-9): "Add File", label, "Save", component, file, Continue x2, Complete.
    // Records what each press shows; stops where the window stops.
    async function addGalley(label, file, key) {
        const t0 = Date.now();
        const out = {};
        await idle(page);
        for (let a = 0; ; a++) {
            await page.getByRole('link', {name: 'Add File', exact: true}).click();
            try { await labelDialog.first().waitFor({timeout: 5000}); break; } catch (e) { if (a >= 2) throw e; }
        }
        await labelDialog.locator('input[name="label"]').fill(label);
        await labelDialog.getByRole('button', {name: 'Save', exact: true}).click();
        const g = upload.locator('select[name="genreId"]').first();
        await g.waitFor({timeout: T});
        await sleep(1500);
        out.labelWindowStillOpen = await labelDialog.first().isVisible().catch(() => false);
        out.uploadWindowTitle = flat(await upload.first().getAttribute('aria-label').catch(() => null)) ||
            flat(await upload.first().locator('h1, h2').first().innerText().catch(() => null), 120);
        out.errorsAfterSave = errsSince(t0);
        await snap(`${key}-after-label-save`);
        await g.selectOption({label: 'Preprint Text'});
        await upload.locator('input[type="file"]').setInputFiles(file);
        const t1 = Date.now();
        const contBtn = upload.getByRole('button', {name: 'Continue', exact: true});
        await page.waitForFunction(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find((x) => x.innerText.trim() === 'Continue' && x.getClientRects().length); return b && !b.disabled; }, null, {timeout: T}).catch(() => {});
        out.errorsAfterUpload = errsSince(t1);
        await contBtn.click();
        await sleep(3000);
        await idle(page).catch(() => {}); // a failed page script leaves the grid's request pending
        const tab2 = upload.getByRole('tab', {name: '2. Review Details'});
        out.step2Selected = await tab2.getAttribute('aria-selected').catch(() => null);
        const panel2 = upload.locator('[role="tabpanel"]:visible').first();
        out.step2Text = flat(await panel2.innerText().catch(() => null), 300);
        out.step2ContinueDisabled = await contBtn.isDisabled().catch(() => null);
        out.errorsAfterContinue = errsSince(t1);
        await snap(`${key}-review-details`);
        if (out.step2Selected === 'true' && out.step2ContinueDisabled === false && out.step2Text) {
            await contBtn.click();
            await upload.getByRole('tab', {name: '3. Confirm'}).waitFor({timeout: T}).catch(() => {});
            await upload.getByRole('button', {name: 'Complete', exact: true}).click();
            await upload.waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await idle(page).catch(() => {});
            out.completed = true;
        } else {
            out.completed = false;
            // Step 10: "Cancel" in the upload window (its "Continue" is greyed), then
            // "Cancel" in the label window behind it
            const t2 = Date.now();
            await upload.getByRole('link', {name: 'Cancel', exact: true}).click({timeout: 10000}).catch((e) => { out.cancelError = flat(e.message, 200); });
            await sleep(1000);
            const confirm = page.getByRole('dialog').filter({hasText: /Are you sure|cancel/i}).filter({has: page.getByRole('button', {name: /^(OK|Yes)$/})});
            if (await confirm.count()) {
                out.cancelConfirm = flat(await confirm.last().innerText().catch(() => null), 200);
                await confirm.last().getByRole('button', {name: /^(OK|Yes)$/}).click();
            }
            await upload.waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
            out.uploadWindowClosed = !(await upload.isVisible().catch(() => false));
            out.labelWindowOpenAfterCancel = await labelDialog.first().isVisible().catch(() => false);
            if (out.labelWindowOpenAfterCancel) {
                await labelDialog.first().getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
                await sleep(1000);
                const leave = page.getByRole('dialog').filter({has: page.getByRole('button', {name: /^(OK|Yes)$/})});
                if (await leave.count()) { out.labelCancelConfirm = flat(await leave.last().innerText().catch(() => null), 200); await leave.last().getByRole('button', {name: /^(OK|Yes)$/}).click(); }
            }
            out.errorsAfterCancel = errsSince(t2);
            await snap(`${key}-after-cancel`);
        }
        out.gridAfter = await gridText();
        // a galley label is a download link only when the galley has its file
        out.labelIsFileLink = await grid.getByRole('link', {name: label, exact: true}).count().catch(() => null);
        out.errorsTotal = errsSince(t0);
        facts[key] = out;
        save();
        return out;
    }

    try {
        // Steps 1-2
        await signIn(page, 'ccorino');
        await page.goto(app.url(`/index.php/${ctx}/en/submission`));
        await page.getByRole('button', {name: 'Begin Submission'}).waitFor({timeout: T});
        await idle(page);
        const titleId = 'startSubmission-title-control';
        await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), titleId, {timeout: T});
        await page.frameLocator(`#${titleId}_ifr`).locator('body').click();
        await page.keyboard.type(PHASE === 'all' ? 'u21w32 Galleys after a reload' : 'u21w32 Two galleys in one visit');
        const english = page.getByRole('radio', {name: 'English', exact: true});
        if (await english.count()) await english.check();
        await page.getByRole('checkbox', {name: 'Yes, my submission meets all of these requirements.'}).check();
        await page.getByRole('checkbox', {name: /I agree to have my data collected and stored/}).check();
        await page.getByRole('button', {name: 'Begin Submission'}).click();
        await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
        await page.locator('.pkpSteps').waitFor({timeout: T});
        await idle(page);
        facts.wizardUrl = page.url().replace(/^https?:\/\/[^/]+/, '');
        await snap('upload-files');

        // 3.5 opens on Details: the abstract first, then "Upload Files" [3.5 bracket in the Steps]
        if (/Details\s*$/.test(await curText())) { await typeAbstract(); await contNext(); }
        // Steps 3-4
        await addGalley('PDF', PDF, 'pdf');

        if (PHASE === 'neighbour') {
            await addGalley('HTML', HTML, 'html-same-visit');
        }

        // Step 5
        await toReview();
        await readReview('reviewBeforeReload');
        await snap('review-before-reload');
        save();

        if (PHASE === 'all') {
            // Step 6
            const t6 = Date.now();
            await page.reload();
            await page.locator('.pkpSteps').waitFor({timeout: T});
            await idle(page);
            facts.stepAfterReload = await curText();
            // Step 7
            await toReview();
            await readReview('reviewAfterReload');
            facts.errorsReloadToReview = errsSince(t6);
            await snap('review-after-reload');
            save();
            // Step 8: "Edit" on the Files panel
            const panel = page.locator('.submissionWizard__reviewPanel').filter({has: filesPanel});
            await panel.getByRole('button', {name: 'Edit', exact: true}).click();
            await cur.filter({hasText: /Upload Files\s*$/}).waitFor({timeout: T});
            await idle(page);
            facts.gridBeforeSecond = await gridText();
            // Steps 8-9
            await addGalley('HTML', HTML, 'html-after-reload');
            // Step 10: reload, Upload Files
            await page.reload();
            await page.locator('.pkpSteps').waitFor({timeout: T});
            await idle(page).catch(() => {});
            if (!/Upload Files\s*$/.test(await curText())) {
                await page.locator('button.pkpSteps__step__label').filter({hasText: /Upload Files\s*$/}).first().click().catch(() => {});
                await sleep(1000);
            }
            await grid.waitFor({timeout: T}).catch(() => {});
            await idle(page);
            facts.gridAfterReload = await gridText();
            facts.labelsAsFileLinksAfterReload = {PDF: await grid.getByRole('link', {name: 'PDF', exact: true}).count(), HTML: await grid.getByRole('link', {name: 'HTML', exact: true}).count()};
            facts.galleyRowsAfterReload = await grid.locator('tr.gridRow, tbody tr').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => null);
            await snap('upload-files-after-reload');
            await toReview();
            await readReview('reviewEnd');
            await snap('review-end');
        }
        facts.allErrors = errs.map(({console: c, text}) => (c ? `console: ${text}` : text));
        save();
        await signOut(page);
    } finally {
        save();
        await close();
    }
});
