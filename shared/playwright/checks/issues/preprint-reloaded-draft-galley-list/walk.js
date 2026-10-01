// U21 OPS8 + OPS9 issue walk: on a preprint draft that already has a galley when the submission wizard page loads,
// the Review step's "Files" panel says no files were uploaded (OPS9) and a further galley's upload window gets stuck (OPS8).
// Steps (docs/issues/U21-OPS8-OPS9-preprint-reloaded-draft-galley-list.md), on the default dataset, OPS:
//   ccorino: Make a Submission; Upload Files: "Add File", label "PDF", Preprint Text, the PDF (the control: a first
//   galley uploads normally); reload; Continue to Review (Files panel); "Edit"; "Add File", label "HTML", the HTML
//   file, "Continue"; the upload window's "Cancel", the label window's "Cancel"; reload; the Files list; Review.
// Neighbour (the path a fix must leave alone), always run after the walk: a second draft with no galley, reloaded,
//   Continue to Review: the Files panel must still say no files were uploaded.
//
//   npm run fleet-prep -- --feature issues-ir27 --dataset 1 --reset
//   PROBE_FEATURE=issues-ir27 PROBE_AGENT=ir27 node bin/probe.js ops shared/playwright/checks/issues/preprint-reloaded-draft-galley-list/walk.js
//   (PKP_E2E_LINE=stable-3_5_0 and the line's fleet, PROBE_RUN=r35, for 3.5)
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, idle} = require('../../../probe');
const W = require('../wizard-refused-save-hangs-saving/lib.js'); // beginSubmission, pressContinue, currentStep, endAnchored
const L = require('./lib.js');

forEachApp(async (app) => {
    if (app.name !== 'ops') return; // the galley list on Upload Files is the preprint server's alone (OJS, OMP: submission files)
    const o = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    const errs = [];
    let shape = null;
    page.on('pageerror', (e) => errs.push(L.flat(e.message, 200)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(`console: ${L.flat(m.text(), 200)}`); });
    page.on('response', async (r) => {
        if (r.request().resourceType() !== 'document' || !/\/submission\?id=\d+/.test(r.url())) return;
        shape = L.galleysShape(await r.text().catch(() => null));
    });
    page.on('dialog', async (d) => { if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {}); });
    let n = 0;
    const snap = async (name, facts) => {
        // After the page's script fails, jQuery's request count stays up and screen() cannot settle: read the text instead.
        const s = await screen(page).catch(async (e) => ({url: page.url(), error: L.flat(e.message), dialogs: await page.getByRole('dialog').allInnerTexts().catch(() => null)}));
        if (facts) s.facts = facts;
        const id = `${String(++n).padStart(2, '0')}-${name}`;
        record(id, s);
        await shot(page, id).catch(() => {});
        return s;
    };
    const errsFrom = (k) => errs.slice(k);
    const reload = async () => {
        await page.reload();
        await page.locator('.pkpSteps__step__label--current').waitFor({timeout: L.T});
        await idle(page);
    };
    const toReview = async () => {
        for (let i = 0; i < 6 && !W.endAnchored('Review').test(await W.currentStep(page)); i++) await W.pressContinue(page);
        await page.locator('.submissionWizard__reviewPanel__body--files').waitFor({timeout: L.T}).catch(() => {});
        await idle(page);
    };
    try {
        // 1-2
        await signIn(page, 'ccorino');
        o.id = await W.beginSubmission(page, app, {title: 'u21ir27 Galley list'});
        o.shapeOnStart = shape;
        // 3.5 opens on "Details" and puts "Upload Files" second: "Continue" once to reach it.
        for (let i = 0; i < 3 && !W.endAnchored('Upload Files').test(await W.currentStep(page)); i++) await W.pressContinue(page);
        await snap('upload-files-new-draft');
        // 3-4: the first galley (control)
        let k = errs.length;
        o.firstGalley = await L.addGalley(page, {label: 'PDF', file: L.PDF});
        o.firstGalley.errors = errsFrom(k);
        o.rowsAfterFirst = await L.galleyRows(page);
        await snap('first-galley-uploaded', o.firstGalley);
        // 5: reload
        await reload();
        o.shapeAfterReload = shape;
        o.rowsAfterReload = await L.galleyRows(page);
        await snap('reloaded', {shape});
        // 6: Review (OPS9)
        k = errs.length;
        await toReview();
        o.review = await L.reviewFiles(page);
        o.review.errors = errsFrom(k);
        await snap('review-after-reload', o.review);
        // 7-8: Edit, a further galley (OPS8)
        await page.locator('.submissionWizard__reviewPanel').filter({has: page.locator('.submissionWizard__reviewPanel__body--files')})
            .getByRole('button', {name: 'Edit', exact: false}).click();
        await page.locator('.pkpSteps__step__label--current').filter({hasText: W.endAnchored('Upload Files')}).waitFor({timeout: L.T});
        await idle(page);
        k = errs.length;
        o.secondGalley = await L.addGalley(page, {label: 'HTML', file: L.HTML});
        o.secondGalley.errors = errsFrom(k);
        await snap('second-galley', o.secondGalley);
        // 9: the upload window's "Cancel", then the label window's "Cancel"; reload; the Files list
        o.closing = {};
        // The legacy form's "Cancel" is a link styled as a button (patterns.md pitfall 7).
        const upCancel = L.uploadDialog(page).getByRole('link', {name: 'Cancel', exact: true}).or(L.uploadDialog(page).getByRole('button', {name: 'Cancel', exact: true})).first();
        await loc(page, 'Upload a File Ready for Publication: "Cancel"', upCancel);
        if (await upCancel.isVisible().catch(() => false)) {
            await upCancel.click();
            o.closing.uploadWindowClosed = await L.uploadDialog(page).first().waitFor({state: 'detached', timeout: L.T}).then(() => true, () => false);
        }
        await L.soft(page);
        o.closing.labelWindowOpen = await L.labelDialog(page).first().isVisible().catch(() => false);
        if (o.closing.labelWindowOpen) {
            await L.labelDialog(page).getByRole('link', {name: 'Cancel', exact: true}).click().catch((e) => { o.closing.labelCancel = L.flat(e.message, 120); });
            await L.soft(page);
            o.closing.labelWindowOpenAfterCancel = await L.labelDialog(page).first().isVisible().catch(() => false);
        }
        o.closing.rows = await L.galleyRows(page);
        await snap('windows-cancelled', o.closing);
        await reload();
        o.rowsAfterSecond = await L.galleyRows(page);
        await snap('files-list-after-second', {rows: o.rowsAfterSecond});
        k = errs.length;
        await toReview();
        o.reviewAfterSecond = await L.reviewFiles(page);
        o.reviewAfterSecond.errors = errsFrom(k);
        await snap('review-after-second', o.reviewAfterSecond);

        // Neighbour: a draft with no galley still reads "No files have been uploaded" on Review.
        o.neighbour = {id: await W.beginSubmission(page, app, {title: 'u21ir27 No galley'})};
        await reload();
        o.neighbour.shape = shape;
        k = errs.length;
        await toReview();
        o.neighbour.review = await L.reviewFiles(page);
        o.neighbour.review.errors = errsFrom(k);
        await snap('neighbour-review-no-galley', o.neighbour);
        await loc(page, 'Review: the Files panel body', page.locator('.submissionWizard__reviewPanel__body--files'));
        await signOut(page);
    } catch (e) {
        o.error = L.flat(e.message, 500);
        await snap('error').catch(() => {});
    } finally {
        o.allErrors = errs;
        record('summary', o);
        console.log(`[ir27 ${app.name} ${o.line}]`, JSON.stringify(o).slice(0, 4000));
        await close();
    }
});
