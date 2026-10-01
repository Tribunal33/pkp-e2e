// The submission wizard, through the screens, as the issue reports' Steps take
// it: start screen (title, section, English, every box), "Upload Files" (a PDF;
// OPS: "Add File", galley label "PDF"), "Details" (an abstract), "Contributors"
// (nothing added), "For the Editors" / "For Readers" (OMP series, OPS relation),
// "Review", "Submit" and the dialog's "Submit", then "Submission complete".
// Shared by the walks of
//   docs/issues/U21-A7-OPS5-editorial-role-submitter-no-acknowledgement.md
//   docs/issues/U21-A7-completion-screen-claims-unsent-email.md
const path = require('path');
const {idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const PDF = path.join(__dirname, '../../../../../apps/ojs/playwright/fixtures/files/article.pdf');
const SECTION = {ojs: 'Articles', omp: 'Library & Information Studies', ops: 'Preprints'};

// rec(page, label) records a screen; returns {id, complete: the completion text, review: the review text}.
// stopAtReview: leave the draft on "Review" unsubmitted. existingId: open that
// draft's wizard instead of starting one (its files are already there).
async function submitThroughWizard(app, page, {title, rec, label, stopAtReview = false, existingId = null}) {
    const {waitForEditorReady, editorIdOf} = require('../../../support/richtext.js');
    const line = app.line || 'main';
    const loc = line === 'main' || line === 'stable-3_5_0' ? '/en' : '';
    const section = SECTION[app.name];
    let start = null;
    let id = existingId;
    if (existingId) {
        await page.goto(app.url(`/index.php/${app.contextPath}${loc}/submission?id=${existingId}`));
    } else {
        await page.goto(app.url(`/index.php/${app.contextPath}${loc}/submission`));
        await idle(page);
        const iframe = page.locator('iframe.tox-edit-area__iframe').first();
        await waitForEditorReady(page, await editorIdOf(iframe));
        const body = iframe.contentFrame().locator('body');
        await body.click();
        await body.fill(title);
        const radio = page.getByRole('radio', {name: section, exact: true});
        if (await radio.isVisible().catch(() => false)) await radio.check();
        const english = page.getByRole('radio', {name: 'English', exact: true});
        if (await english.isVisible().catch(() => false)) await english.check();
        for (const box of await page.getByRole('checkbox').all()) {
            if ((await box.isVisible()) && !(await box.isChecked())) await box.check();
    }
    start = await rec(page, `${label}-start`);
    await page.getByRole('button', {name: 'Begin Submission'}).click();
    await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
    id = Number(new URL(page.url()).searchParams.get('id'));
    }
    await idle(page);
    let uploaded = !!existingId;
    const steps = [];
    const current = page.locator('.pkpSteps__step__label--current');
    const cont = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true});
    for (let i = 0; i < 9; i++) {
        const step = flat(await current.innerText().catch(() => ''));
        steps.push(step);
        if (/Review$/.test(step) && !/Suggestions/.test(step)) break;
        if (/Upload Files$/.test(step) && !uploaded) {
            if (app.name === 'ops') {
                const {addGalleyFile} = require(path.join(__dirname, '../../../../../apps/ops/playwright/pages/SubmissionWizardPages.js'));
                await addGalleyFile(page, {label: 'PDF', file: PDF});
            } else {
                await page.locator('.submissionFilesListPanel input[type="file"]').setInputFiles(PDF);
                const genre = page.locator('.listPanel--submissionFiles__setGenre').getByRole('button').first();
                await genre.waitFor({timeout: T});
                const g = flat(await genre.innerText());
                await genre.click();
                await page.locator('.listPanel--submissionFiles__itemGenre').filter({hasText: g}).first().waitFor({timeout: T});
            }
            uploaded = true;
        }
        if (/Details$/.test(step)) {
            const abs = page.locator('iframe[id^="titleAbstract-abstract-control-en"]').first();
            if (await abs.count()) {
                await waitForEditorReady(page, 'titleAbstract-abstract-control-en');
                const b = page.frameLocator('#titleAbstract-abstract-control-en_ifr').locator('body');
                await b.click();
                await b.fill('Tides follow the moon.');
            }
        }
        const seriesRadio = page.getByRole('radio', {name: section, exact: true});
        if (await seriesRadio.isVisible().catch(() => false)) await seriesRadio.check();
        const relation = page.getByRole('radio', {name: 'This preprint has not been published elsewhere.'});
        if (await relation.isVisible().catch(() => false)) await relation.check();
        await rec(page, `${label}-step-${i}`);
        await cont.click();
        await page.waitForFunction((prev) => {
            const el = document.querySelector('.pkpSteps__step__label--current');
            return el && el.textContent.replace(/\s+/g, ' ').trim() !== prev;
        }, step, {timeout: T}).catch(() => {});
        await idle(page);
    }
    await pause(1000);
    for (const box of await page.getByRole('checkbox').all()) {
        if ((await box.isVisible()) && !(await box.isChecked())) await box.check();
    }
    const review = await rec(page, `${label}-review`);
    if (stopAtReview) return {id, steps, review: flat(review && review.text && review.text.main, 300)};
    await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true}).click();
    const dialog = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Submit', exact: true})}).last();
    await dialog.waitFor({timeout: T});
    const dialogText = flat(await dialog.innerText().catch(() => ''), 600);
    await dialog.getByRole('button', {name: 'Submit', exact: true}).click();
    await page.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: 45_000});
    await idle(page);
    const done = await rec(page, `${label}-complete`);
    const complete = flat(await page.locator('.app__contentPanel').first().innerText().catch(() => (done && done.text && done.text.main) || ''), 800);
    return {id, steps, startText: flat(start && start.text && start.text.main, 300), reviewHasProblems: /problem|missing|required/i.test(String(review && review.text && review.text.main)), dialogText, complete};
}

module.exports = {submitThroughWizard, SECTION, flat, pause};
