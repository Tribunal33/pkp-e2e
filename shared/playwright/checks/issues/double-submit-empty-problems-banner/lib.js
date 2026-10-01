// Helpers of walk.js and neighbour.js (issue report docs/issues/U21-A6-double-submit-empty-problems-banner.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const path = require('path');
const {idle} = require('../../../probe');
const A8 = require('../section-editors-not-assigned-second-journal/lib.js');
const {currentStep, pressContinue, readControls} = require('../wizard-refused-save-hangs-saving/lib.js');

const {T, sleep, flat, L} = A8;

/** Per-app dataset facts the steps use. */
const WORDS = {
    ojs: {author: 'ccorino', section: 'Articles', series: null},
    omp: {author: 'aclark', section: null, series: 'Library & Information Studies'},
    ops: {author: 'ccorino', section: 'Preprints', series: null},
};

/**
 * From the step the wizard is on, every step as the rail orders them up to "Review" (3.5 opens
 * on "Details", main on "Upload Files"): a file unless `noFile`, an abstract unless `noAbstract`,
 * OMP's series, OPS's relation status; `onlyContinue` presses "Continue" alone (a draft already
 * filled in). Leaves the wizard on "Review" with its check finished.
 */
async function toReview(page, app, {noFile = false, noAbstract = false, onlyContinue = false} = {}) {
    const w = WORDS[app.name];
    const ojs = app.name === 'ojs';
    const W = ojs ? null : require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPages.js'));
    const O = ojs ? new (require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPage.js')).SubmissionWizardPage)(page, app.contextPath) : null;
    const done = new Set();
    for (let i = 0; i < 10; i++) {
        const step = (await currentStep(page)).replace(/^\d+\s*/, '');
        if (/(^|\s)Review$/.test(step)) break;
        if (!onlyContinue && !done.has(step)) {
            done.add(step);
            if (step === 'Upload Files' && !noFile) {
                if (ojs) await O.uploadFile();
                else if (app.name === 'omp') await W.uploadWizardFile(page, 'u21ir33-manuscript.txt');
                else await W.addGalleyFile(page, {label: 'PDF'});
            } else if (step === 'Details' && !noAbstract) {
                await A8.typeAbstract(page, 'An abstract for the u21ir33 walk.');
            } else if (step === 'For the Editors' && w.series) {
                await page.getByRole('radio', {name: w.series, exact: true}).check();
                await idle(page);
            } else if (step === 'For Readers' && app.name === 'ops') {
                await W.setRelationStatus(page);
            }
        }
        await pressContinue(page);
        await idle(page);
        await sleep(500);
    }
    await reviewChecked(page);
}

/** Wait until "Checking your submission" has cleared on "Review". */
async function reviewChecked(page) {
    await page.locator('.submissionWizard__loadingReview').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
}

/** "Review" as the author sees it: the step, the problems banner, every complaint on a panel, the controls. */
async function readReview(page) {
    const review = page.locator('.pkpSteps__step:visible, [class*="submissionWizard__review"]').first();
    const complaints = await page.locator('.submissionWizard__reviewEmptyWarning:visible, .submissionWizard__reviewPanel .pkpNotification:visible, .submissionWizard__reviewPanel .pkpFieldError:visible')
        .allInnerTexts().catch(() => []);
    return {
        step: await currentStep(page),
        banner: flat(await page.locator('.submissionWizard__review_errors').innerText({timeout: 2000}).catch(() => null), 600),
        bannerLinks: await page.locator('.submissionWizard__review_errors a').evaluateAll((els) => els.map((e) => `${e.textContent} -> ${e.getAttribute('href')}`)).catch(() => []),
        complaints: complaints.map((c) => flat(c, 200)).filter(Boolean),
        controls: await readControls(page),
        reviewShown: await review.count(),
    };
}

/** Tick every box of the "Review" step's confirmation form that is not ticked yet. Returns their labels. */
async function tickConfirmations(page) {
    const boxes = page.locator('.submissionWizard__stepForm input[type="checkbox"]:visible');
    const labels = [];
    for (let i = 0; i < (await boxes.count()); i++) {
        const b = boxes.nth(i);
        labels.push(flat(await b.evaluate((e) => (e.closest('label') || {}).innerText || ''), 160));
        if (!(await b.isChecked())) await b.check();
    }
    return labels;
}

/**
 * The footer's "Submit", then "Submit" in the confirmation. Returns the dialog's text, the
 * submit request's status and body, and whether "Submission complete" appeared.
 */
async function pressSubmit(page) {
    const submit = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true});
    const enabled = await submit.isEnabled({timeout: 20_000}).catch(() => false);
    await submit.click({timeout: 20_000});
    const dialog = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Submit', exact: true})}).last();
    await dialog.waitFor({timeout: T});
    const text = flat(await dialog.innerText(), 500);
    const answered = page.waitForResponse((r) => r.request().method() !== 'GET' && /\/submissions\/\d+\/submit/.test(r.url()), {timeout: T});
    await dialog.getByRole('button', {name: 'Submit', exact: true}).click();
    const r = await answered;
    let body = null;
    try { body = await r.text(); } catch (e) { /* gone */ }
    const complete = await page.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: 15_000}).then(() => true).catch(() => false);
    await idle(page);
    await sleep(1000);
    return {enabledBefore: enabled, dialog: text, status: r.status(), body: flat(body, 600), complete};
}

/** A second tab of the same browser on the address the first tab shows. Collects its script errors. */
async function secondTab(page) {
    const tab = await page.context().newPage();
    const errors = [];
    tab.on('pageerror', (e) => errors.push(String(e.message || e).slice(0, 300)));
    tab.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
    await tab.goto(page.url());
    await tab.locator('.pkpSteps__step__label--current').waitFor({timeout: T});
    await idle(tab);
    return {tab, errors};
}

module.exports = {T, sleep, flat, L, WORDS, toReview, reviewChecked, readReview, tickConfirmations, pressSubmit, secondTab, beginSubmission: A8.beginSubmission};
