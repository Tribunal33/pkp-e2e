// Helpers for walk.js (docs/issues/U53-A9-merge-drops-section-editor-assignment.md).
// Requiring this file runs nothing.
//
// submitThroughWizard(app, page, {title, section, file}) — the signed-in author
// makes a new submission through "Submit" on the context `app.contextPath`:
// the title, the section (OMP: the series on "For the Editors"), English as the
// submission language when offered, every agreement ticked, one PDF uploaded
// (OPS: as the "PDF" galley), an abstract, then "Submit" and the dialog's
// "Submit". Returns {id}. Adapted from the U21 A8 walk
// (auto-assigned-editor-never-assigned-second-journal/walk.js), proven there on
// main and 3.5.
//
// sectionWindow(app, page, title) — Settings › Journal (Press, Server) ›
// "Sections" ("Series"): the row's "Editors" cell, then the row's "Edit" window
// and its "Editorial Assignments" boxes (label, ticked), then "Cancel".
const path = require('path');
const {idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

async function submitThroughWizard(app, page, {title, section, file}) {
    const {waitForEditorReady, editorIdOf} = require('../../../support/richtext.js');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/submission`));
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
    await page.getByRole('button', {name: 'Begin Submission'}).click();
    await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
    const id = Number(new URL(page.url()).searchParams.get('id'));
    await idle(page);
    let uploaded = false;
    const current = page.locator('.pkpSteps__step__label--current');
    const cont = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true});
    for (let i = 0; i < 9; i++) {
        const step = flat(await current.innerText().catch(() => ''));
        if (/Review$/.test(step) && !/Suggestions/.test(step)) break;
        if (/Upload Files$/.test(step) && !uploaded) {
            if (app.name === 'ops') {
                const {addGalleyFile} = require(path.join(__dirname, '../../../../../apps/ops/playwright/pages/SubmissionWizardPages.js'));
                await addGalleyFile(page, {label: 'PDF', file});
            } else {
                await page.locator('.submissionFilesListPanel input[type="file"]').setInputFiles(file);
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
                await b.fill('Kelp forests recover once urchin numbers fall.');
            }
        }
        const seriesRadio = page.getByRole('radio', {name: section, exact: true});
        if (await seriesRadio.isVisible().catch(() => false)) await seriesRadio.check();
        const relation = page.getByRole('radio', {name: 'This preprint has not been published elsewhere.'});
        if (await relation.isVisible().catch(() => false)) await relation.check();
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
    await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true}).click();
    const dialog = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Submit', exact: true})}).last();
    await dialog.waitFor({timeout: T});
    await dialog.getByRole('button', {name: 'Submit', exact: true}).click();
    await page.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: 45_000});
    await idle(page);
    return {id};
}

async function sectionWindow(app, page, title) {
    const {SectionsTab} = require('../../../pages/SectionsPages.js');
    const opts = app.name === 'omp' ? {tab: 'Series', addLabel: 'Add Series'} : {};
    const tab = new SectionsTab(page, app.contextPath, {...opts, locale: 'en'});
    await tab.goto();
    const editors = flat(await tab.editorsCell(title).innerText().catch(() => null));
    const win = await tab.openEdit(title);
    const boxes = [];
    for (const box of await win.assignmentBoxes().all()) {
        boxes.push({
            label: flat(await box.evaluate((b) => (b.labels && b.labels[0] ? b.labels[0].innerText : b.getAttribute('aria-label')))),
            ticked: await box.isChecked(),
        });
    }
    return {editors, boxes, win};
}

module.exports = {submitThroughWizard, sectionWindow};
