// Helpers of walk.js (U16 A13 and OPS1: a category's "Editorial Assignments"; issue reports
// docs/issues/U21-A8-section-editors-not-assigned-second-journal.md and docs/issues/U16-OPS1-*.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle} = require('../../../probe');
const {currentStep, pressContinue} = require('../wizard-refused-save-hangs-saving/lib.js');
const U21 = require('../section-editors-not-assigned-second-journal/lib.js');

const {T, sleep, flat, L} = U21;
const legacy = (app) => (app.line || 'main') !== 'main';

/** Settings › Workflow › "Submission" › "Metadata": "Categories" → "Yes, add a categories field…", "Save". */
async function categoriesInWizard(page, app, ctx) {
    await page.goto(app.url(`/index.php/${ctx}${L(app)}/management/settings/workflow`));
    await idle(page);
    await page.locator('[id="metadata-button"]').first().click();
    await idle(page);
    const panel = page.locator('[id="metadata"]');
    const yes = panel.getByRole('radio', {name: /Yes, add a categories field/});
    await yes.waitFor({timeout: T});
    await yes.check();
    const answered = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answered;
    await panel.locator('[role="status"]', {hasText: 'Saved'}).waitFor({timeout: T}).catch(() => {});
    return r.status();
}

/**
 * The context's Settings › Journal (Press, Server) › "Categories" › "Add Category" (3.5: the grid's
 * "Add Category" link and its older form). Returns {window} with what "Editorial Assignments" shows:
 * the window's text from the heading on, and every box's label.
 */
async function openAddCategory(page, app, ctx) {
    const {CategoriesTab} = require('../../../pages/CategoriesPages.js');
    const tab = new CategoriesTab(page, ctx);
    if (!legacy(app)) {
        await tab.goto();
        const win = await tab.openAdd();
        await idle(page);
        const text = flat(await win.root().innerText(), 4000);
        const boxes = await win.editorBoxes().evaluateAll((els) => els.map((e) => {
            const l = e.closest('label') || (e.id && document.querySelector(`label[for="${e.id}"]`));
            return (l ? l.innerText : e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
        }));
        return {win, kind: 'vue', ...assignmentsPart(text), boxes};
    }
    await page.goto(tab.url());
    await page.locator('#categories-button').click();
    await page.locator('#categoriesContainer table').first().waitFor({timeout: T});
    await idle(page);
    await page.locator('#categoriesContainer').getByRole('link', {name: 'Add Category', exact: true}).click();
    const form = page.locator('form#categoryForm');
    await form.locator('[name="name[en]"]').waitFor({timeout: T});
    await idle(page);
    const text = flat(await form.innerText(), 4000);
    const boxes = await form.locator('input[name^="subEditors"]').evaluateAll((els) => els.map((e) => {
        const l = e.closest('label') || (e.id && document.querySelector(`label[for="${e.id}"]`));
        return (l ? l.innerText : '').replace(/\s+/g, ' ').trim();
    }));
    return {win: null, kind: 'legacy', ...assignmentsPart(text), boxes};
}

/** "Editorial Assignments" and the 300 characters after it, and whether the sentence shows. */
function assignmentsPart(text) {
    const k = (text || '').toLowerCase().indexOf('editorial assignments');
    return {
        heading: k >= 0,
        sentence: /Select the editorial users who should be assigned automatically to all new submissions to this category\./.test(text || ''),
        part: k >= 0 ? text.slice(k, k + 300) : null,
    };
}

/**
 * In the open "Add Category" window: Name, Path, tick the box labelled `editorBox` when it is there,
 * "Save" (3.5 "OK"). Returns {ticked, status, windowOpen}.
 */
async function fillAndSaveCategory(page, app, opened, {name, path, editorBox}) {
    if (opened.kind === 'vue') {
        const win = opened.win;
        await win.nameBox('en').fill(name);
        await win.pathBox().fill(path);
        const box = win.editorBox(editorBox);
        const ticked = (await box.count()) > 0;
        if (ticked) await box.check();
        const r = await win.save();
        await idle(page);
        await sleep(800);
        return {ticked, status: r.status(), windowOpen: await win.root().isVisible().catch(() => false)};
    }
    const form = page.locator('form#categoryForm');
    await form.locator('[name="name[en]"]').fill(name);
    await form.locator('[name="path"]').fill(path);
    const box = form.getByRole('checkbox', {name: editorBox, exact: true});
    const ticked = (await box.count()) > 0;
    if (ticked) await box.check();
    const answered = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('update-category'), {timeout: T});
    await form.getByRole('button', {name: 'OK', exact: true}).click();
    const r = await answered;
    await idle(page);
    await sleep(800);
    return {ticked, status: r.status(), windowOpen: await form.isVisible().catch(() => false)};
}

/** The wizard's "Categories": main's picker (type, choose the line), 3.5's boxes. Returns the chips / ticked boxes. */
async function chooseCategory(page, app, line) {
    if (!legacy(app)) {
        const {CategoryPicker} = require('../../../pages/CategoriesPages.js');
        const picker = new CategoryPicker(page);
        await picker.field().waitFor({timeout: T});
        await picker.choose(line.split(' ')[0], line);
        await picker.clearTyping().catch(() => {});
        return {chips: await picker.chipLines()};
    }
    const box = page.getByRole('checkbox', {name: line, exact: true});
    await box.check();
    return {ticked: await box.isChecked()};
}

/**
 * The whole wizard after "Begin Submission" (U21 lib's completeSubmission, with the category chosen
 * on "For the Editors" ("For Readers" on a preprint server)). Returns {problems, category}.
 */
async function completeWithCategory(page, app, ctx, {series, category, fileName = 'u16c8-manuscript.txt'}) {
    const {expect} = require('@playwright/test');
    const path = require('path');
    const ojs = app.name === 'ojs';
    const W = ojs ? null : require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPages.js'));
    const O = ojs ? new (require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPage.js')).SubmissionWizardPage)(page, ctx) : null;
    const editorsStep = app.name === 'ops' ? 'For Readers' : 'For the Editors';
    const done = new Set();
    let chosen = null;
    for (let i = 0; i < 10; i++) {
        const step = (await currentStep(page)).replace(/^\d+\s*/, '');
        if (/(^|\s)Review$/.test(step)) break;
        if (!done.has(step)) {
            done.add(step);
            if (step === 'Upload Files') {
                if (ojs) await O.uploadFile();
                else if (app.name === 'omp') await W.uploadWizardFile(page, fileName);
                else await W.addGalleyFile(page, {label: 'PDF'});
            } else if (step === 'Details') {
                await U21.typeAbstract(page, 'An abstract for the u16c8 walk.');
            }
            if (step === editorsStep) {
                if (app.name === 'omp' && series) {
                    await page.getByRole('radio', {name: series, exact: true}).check();
                    await idle(page);
                }
                if (app.name === 'ops') await W.setRelationStatus(page);
                chosen = await chooseCategory(page, app, category).catch((e) => ({error: String(e.message).split('\n')[0]}));
                await idle(page);
            }
        }
        await pressContinue(page);
        await idle(page);
        await sleep(500);
    }
    await page.locator('.submissionWizard__loadingReview').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    const review = flat(await page.locator('main').innerText().catch(() => ''), 6000);
    const problems = flat(await page.locator('.submissionWizard__review_errors').innerText({timeout: 3000}).catch(() => ''), 600);
    const onReview = /Categories[\s\S]{0,80}/.exec(review || '');
    if (problems) return {problems, category: chosen, reviewCategories: onReview ? onReview[0] : null};
    if (ojs) await O.submitAndConfirm();
    else if (app.name === 'ops') await W.confirmSubmit(page, {message: ''});
    else await W.confirmSubmit(page);
    await expect(page.getByRole('heading', {name: 'Submission complete'})).toBeVisible({timeout: T});
    return {problems: '', category: chosen, reviewCategories: onReview ? onReview[0] : null};
}

module.exports = {legacy, categoriesInWizard, openAddCategory, assignmentsPart, fillAndSaveCategory, chooseCategory, completeWithCategory};
