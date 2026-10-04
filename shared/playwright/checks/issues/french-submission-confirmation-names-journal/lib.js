// Helpers of walk.js here (U56 A10: on a press and a preprint server the French submission confirmation
// is a journal's text; issue report docs/issues/U56-A10-french-submission-confirmation-names-journal.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses, in either interface
// language (French labels first, the English ones as a fallback).
const path = require('path');
const {idle, screen, record, shot} = require('../../../probe');
const {typeRich} = require('../wizard-refused-save-hangs-saving/lib.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 3000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
/** The locale segment of a context address: none on 3.4 and 3.3. */
const seg = (app, ui) => (app.line && /3_[34]/.test(app.line) ? '' : `/${ui}`);

/** The dataset's author account each app's steps sign in as. */
const AUTHOR = {ojs: 'ccorino', omp: 'aclark', ops: 'ccorino'};

const footer = (page) => page.locator('.submissionWizard__footer');
const current = (page) => page.locator('.pkpSteps__step__label--current');
const currentStep = async (page) => flat(await current(page).innerText().catch(() => ''), 80);

async function snap(page, name) {
    let s;
    try {
        s = await screen(page);
    } catch (e) {
        s = {url: page.url(), error: flat(e.message, 200)};
    }
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

/** The initials menu at the top right › "Change Language" › the language `label`; waits for `/<locale>/` in the address. */
async function changeLanguage(page, label, locale) {
    await page.locator('[data-cy="app-user-nav"] button').first().click();
    const menu = page.locator('[data-cy="app-user-nav"] nav:visible').first();
    await menu.getByRole('link', {name: label}).first().click();
    await page.waitForURL(new RegExp(`/${locale}(/|$|\\?|#)`), {timeout: T});
    await idle(page);
}

/**
 * "Faire une soumission" in interface language `ui`: the submission language `locale`, the first section
 * when offered, the title, every box ticked, "Commencer la soumission". Returns {id, offered}.
 */
async function beginSubmission(page, app, {title, locale, ui}) {
    await page.goto(app.url(`/index.php/${app.contextPath}${seg(app, ui)}/submission`));
    await page.locator('#startSubmission-title-control_ifr').waitFor({timeout: T});
    await idle(page);
    const offered = await page.locator('input[type=radio][name="locale"]').evaluateAll((els) =>
        els.map((e) => ({value: e.value, label: ((e.closest('label') || {}).innerText || '').trim()})));
    const lang = page.locator(`input[type=radio][name="locale"][value="${locale}"]`);
    if (await lang.count()) await lang.check();
    await typeRich(page, 'startSubmission-title-control', title);
    const section = page.locator('input[type=radio][name="sectionId"]');
    if (await section.count()) await section.first().check();
    const boxes = page.locator('form input[type=checkbox]:visible');
    for (let i = 0; i < await boxes.count(); i++) {
        const b = boxes.nth(i);
        if (!(await b.isChecked())) await b.check();
    }
    await snap(page, 'author-start');
    await page.getByRole('button', {name: /^(Commencer la soumission|Begin Submission)$/}).click();
    await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
    await current(page).waitFor({timeout: T});
    await idle(page);
    return {id: Number(new URL(page.url()).searchParams.get('id')), offered};
}

/** The files step of a journal or a press: one file through the list's hidden input, then the manuscript's genre. */
async function uploadSubmissionFile(page) {
    await page.locator('.submissionFilesListPanel input[type="file"]').setInputFiles({
        name: 'u56e-manuscrit.txt', mimeType: 'text/plain', buffer: Buffer.from('u56e manuscrit'),
    });
    const genres = page.locator('.listPanel--submissionFiles__setGenre button:visible');
    await genres.first().waitFor({timeout: T});
    const names = (await genres.allInnerTexts()).map((t) => flat(t));
    let k = names.findIndex((n) => /article|manuscrit|manuscript/i.test(n));
    if (k < 0) k = 0;
    const saved = page.waitForResponse((r) => r.url().includes('/files/') && r.ok(), {timeout: T}).catch(() => null);
    await genres.nth(k).click();
    await saved;
    await page.locator('.listPanel--submissionFiles__itemGenre').first().waitFor({timeout: T});
    return {genre: names[k]};
}

/** The files step of a preprint server: "Ajouter un fichier", the galley's label, the upload window to its end. */
async function addGalley(page, app) {
    const add = page.getByRole('link', {name: /^(Ajouter un fichier|Add File)$/});
    const labelWin = page.locator('form:visible').filter({has: page.locator('input[name="label"]')}).first();
    for (let i = 0; i < 3; i++) {
        await idle(page);
        await add.first().click();
        if (await labelWin.waitFor({timeout: 10_000}).then(() => true, () => false)) break;
    }
    await labelWin.locator('input[name="label"]').fill('PDF');
    await labelWin.getByRole('button', {name: /^(Enregistrer|Save)$/}).click();
    const up = page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')});
    const genre = up.locator('select[name="genreId"]').first();
    await genre.waitFor({timeout: T});
    const options = await genre.locator('option').evaluateAll((os) => os.map((o) => ({value: o.value, label: o.textContent.trim()})));
    const pick = options.find((o) => o.value && /pr[ée]publication|preprint/i.test(o.label)) || options.find((o) => o.value);
    await genre.selectOption(pick.value);
    await up.locator('input[type="file"]').setInputFiles(path.join(app.suiteDir, 'fixtures', 'files', 'preprint.pdf'));
    const cont = up.getByRole('button', {name: /^(Continuer|Continue)$/});
    await cont.waitFor({timeout: T});
    for (let i = 0; i < 30 && !(await cont.isEnabled()); i++) await sleep(500);
    await cont.click();
    await idle(page);
    await sleep(800);
    await cont.click();
    await idle(page);
    await sleep(800);
    await up.getByRole('button', {name: /^(Terminer|Complete)$/}).click();
    await up.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    return {genre: pick.label};
}

/**
 * From the first step to the last: the file, the abstract in `locale` when the details step has a box for
 * it, a preprint's relation answer, "Continuer" until the footer offers "Soumettre". Returns what it met.
 */
async function toLastStep(page, app, {locale}) {
    const out = {steps: []};
    const submit = footer(page).getByRole('button', {name: /^(Soumettre|Submit)$/});
    const cont = footer(page).getByRole('button', {name: /^(Continuer|Continue)$/});
    const seen = new Set();
    for (let i = 0; i < 12; i++) {
        await idle(page);
        if (await submit.isVisible().catch(() => false)) break;
        const step = await currentStep(page);
        if (!seen.has(step)) {
            seen.add(step);
            out.steps.push(step);
            await sleep(1500);
            if (await page.locator('.submissionFilesListPanel').first().isVisible().catch(() => false)) {
                out.file = await uploadSubmissionFile(page);
            } else if (app.name === 'ops' && await page.getByRole('link', {name: /^(Ajouter un fichier|Add File)$/}).first().isVisible().catch(() => false)) {
                out.file = await addGalley(page, app);
            }
            const abstract = `titleAbstract-abstract-control-${locale}`;
            if (await page.locator(`#${abstract}_ifr`).isVisible().catch(() => false)) {
                await typeRich(page, abstract, 'Un résumé u56e.');
                out.abstract = abstract;
            }
            const relation = page.locator('input[type=radio][name="relationStatus"]:visible');
            if (await relation.count()) {
                await relation.first().check();
                out.relation = await relation.first().evaluate((e) => ((e.closest('label') || {}).innerText || '').trim());
            }
        }
        await cont.click({timeout: 10_000});
        await idle(page);
        await sleep(600);
    }
    await page.locator('.submissionWizard__loadingReview').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    out.last = await currentStep(page);
    out.problems = flat(await page.locator('.submissionWizard__review_errors').innerText({timeout: 2000}).catch(() => ''), 600);
    return out;
}

/** "Soumettre" in the footer, then the confirmation's own "Soumettre"; returns the confirmation and the page heading after. */
async function submitAndConfirm(page) {
    const submit = footer(page).getByRole('button', {name: /^(Soumettre|Submit)$/});
    await submit.waitFor({timeout: T});
    for (let i = 0; i < 40 && !(await submit.isEnabled()); i++) await sleep(500);
    const dialog = page.getByRole('dialog').filter({has: page.getByRole('button', {name: /^(Soumettre|Submit)$/})}).last();
    for (let i = 0; i < 3; i++) {
        await submit.click();
        if (await dialog.waitFor({timeout: 8000}).then(() => true, () => false)) break;
    }
    const question = flat(await dialog.innerText().catch(() => ''), 600);
    await dialog.getByRole('button', {name: /^(Soumettre|Submit)$/}).click();
    const done = page.getByRole('heading', {name: /^(Soumission complète|Submission complete)$/});
    await done.waitFor({timeout: 45_000});
    await idle(page);
    return {question, heading: flat(await done.innerText())};
}

/** A mail's text and HTML (Mailpit's full message), flattened. */
async function readMail(app, summary) {
    const full = await app.mail.fullMessage(summary.ID);
    return {
        subject: summary.Subject,
        to: (summary.To || []).map((t) => t.Address),
        date: summary.Created,
        text: flat(full.Text, 4000),
    };
}

module.exports = {T, sleep, flat, seg, AUTHOR, snap, changeLanguage, beginSubmission, toLastStep, submitAndConfirm, readMail};
