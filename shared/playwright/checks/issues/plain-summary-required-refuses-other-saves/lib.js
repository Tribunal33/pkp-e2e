// Helpers for the plain-language-summary walk (docs/issues/U21-A20-…): the Metadata setting, the workflow's
// Publication pages and the submission wizard on PKP's default test dataset. Requiring this file runs nothing.
const path = require('path');
const {idle, screen, record, shot} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const FIXTURES = {
    ojs: path.join(REPO, 'apps/ojs/playwright/fixtures/files/article.pdf'),
    ops: path.join(REPO, 'apps/ops/playwright/fixtures/files/preprint.pdf'),
};
const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); // sampling only
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const endAnchored = (name) => new RegExp(`${esc(name)}\\s*$`);
const PUB_WRITE = /\/api\/v1\/submissions\/\d+\/publications\/\d+$/;
const wf = (page) => page.locator('[role="dialog"]:visible').first();

const PLS_BOX = 'Enable plain language summary metadata';
const PLS_REQUIRE = 'Require the author to provide a plain language summary before accepting their submission.';

async function snap(page, name, extra) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 300), text: {}}; }
    if (extra) s.facts = extra;
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

/**
 * Record every /api/v1/ write the page sends (the Vue forms tunnel PUT as POST + X-Http-Method-Override),
 * with the body of a refusal. Returns {all, since(t)}.
 */
function watchWrites(page) {
    const all = [];
    page.on('response', async (r) => {
        const u = r.url();
        if (!/\/api\/v1\//.test(u) || /_test\//.test(u) || r.request().method() === 'GET') return;
        const e = {at: Date.now(), op: r.request().headers()['x-http-method-override'] || r.request().method(),
            url: u.replace(/^https?:\/\/[^/]+/, '').split('?')[0], status: r.status()};
        all.push(e);
        if (r.status() >= 400) e.body = flat(await r.text().catch(() => null), 400);
    });
    return {all, since: (t) => all.filter((x) => x.at >= t).map(({at, ...x}) => x)};
}

/** Settings › Workflow › "Submission" › "Metadata": the summary at "Require …", "Save". Returns the answer and statuses. */
async function requireSummary(app, page) {
    const {WorkflowSubmissionSettings, saveWatchingStatus} = require('../../../pages/SubmissionIntakePages.js');
    const s = new WorkflowSubmissionSettings(page, app.contextPath);
    await s.goto('Metadata');
    const box = s.metadata.box(PLS_BOX);
    if (!(await box.count())) return {offered: false, items: await s.metadata.panel.getByRole('checkbox').evaluateAll((els) => els.map((e) => (e.labels && e.labels[0] ? e.labels[0].innerText : '').trim()))};
    await box.check();
    await s.metadata.choice(PLS_BOX, PLS_REQUIRE).check();
    const {response, statuses} = await saveWatchingStatus(page, s.metadata);
    return {offered: true, status: response.status(), statuses};
}

/** Open a submission's workflow as an editor (the editorial dashboard's own address for it). */
async function openWorkflow(app, page, id) {
    await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${id}`));
    await wf(page).waitFor({timeout: T});
    await idle(page);
}

/** A Publication page from the workflow's side menu ("Metadata", "Title & Abstract", …). */
async function openEntry(page, name) {
    const dialog = wf(page);
    const entry = dialog.getByRole('link', {name, exact: true}).first();
    if (!(await entry.isVisible().catch(() => false))) {
        const group = dialog.getByRole('link', {name: /^(Publication|Preprint)$/}).first();
        if (await group.count()) await group.click();
        await idle(page);
    }
    await entry.click({timeout: T});
    await dialog.getByRole('heading', {name: new RegExp(`^(Publication|Preprint): ${esc(name)}$`, 'i')}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    const save = dialog.getByRole('button', {name: 'Save', exact: true});
    await save.first().waitFor({timeout: 20_000}).catch(() => {});
    await idle(page);
}

/** "Save" on the open Publication page: the publication write's answer and what the page then says. */
async function savePage(page, writes) {
    const dialog = wf(page);
    const button = dialog.getByRole('button', {name: 'Save', exact: true}).first();
    const disabled = await button.isDisabled().catch(() => null);
    if (disabled) return {pressed: false, disabled};
    const t = Date.now();
    await button.click();
    await Promise.race([
        dialog.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 15_000}),
        dialog.locator('.pkpFormErrors, .pkpFieldError').first().waitFor({timeout: 15_000}),
    ]).catch(() => {});
    await idle(page);
    await sleep(300);
    return {
        pressed: true,
        writes: writes.since(t).filter((x) => PUB_WRITE.test(x.url)),
        status: await dialog.locator('[role="status"]').allInnerTexts().then((a) => a.map((x) => flat(x)).filter(Boolean)).catch(() => []),
        formErrors: flat(await dialog.locator('.pkpFormErrors').first().innerText({timeout: 1000}).catch(() => null), 300),
        fieldErrors: await dialog.locator('.pkpFieldError').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => []),
    };
}

/** Type into a TinyMCE box by its editor id (replacing what it holds; '' empties it). */
async function typeRich(page, id, text) {
    await page.locator(`#${id}_ifr`).waitFor({state: 'visible', timeout: T});
    await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T});
    await page.frameLocator(`#${id}_ifr`).locator('body').click();
    await page.waitForFunction((i) => window.tinymce.get(i).hasFocus(), id, {timeout: 5000}).catch(() => {});
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    if (text) await page.keyboard.type(text);
}

// ------------------------------------------------------------ the wizard
const currentStep = (page) => page.locator('.pkpSteps__step__label--current');
const curText = async (page) => flat(await currentStep(page).innerText().catch(() => ''), 80);
const footer = (page) => page.locator('.submissionWizard__footer');
const footerText = async (page) => flat(await page.locator('.submissionWizard__lastSaved').innerText({timeout: 2000}).catch(() => null), 120);
const errDialog = (page) => page.getByRole('dialog').filter({hasText: /An unexpected error has occurred/});

/** The start page: title, the required boxes, the first choice of any unanswered radio group, "Begin Submission". */
async function startSubmission(app, page, title, seen = []) {
    await page.goto(app.url(`/index.php/${app.contextPath}/submission`));
    await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: T});
    await idle(page);
    const body = page.frameLocator('iframe.tox-edit-area__iframe').first().locator('body');
    await body.click();
    await body.fill(title);
    for (const box of [page.getByRole('checkbox', {name: /meets all of these requirements/}), page.getByRole('checkbox', {name: /agree to have my data collected/})]) {
        if (await box.count()) await box.check();
    }
    const radios = await page.getByRole('radio').evaluateAll((els) => els.map((e) => ({name: e.name, checked: e.checked})));
    const groups = {};
    for (const r of radios) (groups[r.name] ||= []).push(r);
    for (const [g, list] of Object.entries(groups)) if (!list.some((r) => r.checked)) await page.locator(`input[type=radio][name="${g}"]`).first().check();
    // The publication writes the start page sends while it leaves are read through (fetched and handed on unchanged),
    // because the page navigates before a response listener can read their bodies.
    const through = async (route) => {
        const r = await route.fetch();
        seen.push({op: route.request().headers()['x-http-method-override'] || route.request().method(), status: r.status(), body: flat(await r.text().catch(() => null), 400)});
        await route.fulfill({response: r});
    };
    await page.route((url) => PUB_WRITE.test(url.pathname), through);
    await page.getByRole('button', {name: 'Begin Submission'}).click();
    await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
    await currentStep(page).filter({hasText: 'Upload Files'}).waitFor({timeout: T});
    await idle(page);
    await page.unroute((url) => PUB_WRITE.test(url.pathname), through);
    return Number(new URL(page.url()).searchParams.get('id'));
}

/** "Upload Files": one file of the app's main component. */
async function uploadFile(app, page) {
    if (app.name === 'ojs') {
        const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', {name: 'Add File', exact: true}).click()]);
        await chooser.setFiles(FIXTURES.ojs);
        await page.getByRole('button', {name: 'Article Text', exact: true}).click();
        await page.locator('.listPanel__item--submissionFile').filter({hasText: 'article.pdf'}).getByText('Article Text').waitFor({timeout: T});
    } else if (app.name === 'omp') {
        await page.locator('.submissionFilesListPanel input[type="file"]').setInputFiles({name: 'u21ir24-manuscript.txt', mimeType: 'text/plain', buffer: Buffer.from('Manuscript u21ir24')});
        const genre = page.locator('.listPanel--submissionFiles__setGenre').getByRole('button', {name: 'Book Manuscript', exact: true});
        await genre.waitFor({timeout: T});
        const saved = page.waitForResponse((r) => r.url().includes('/files/') && r.ok());
        await genre.click();
        await saved;
        await page.locator('.listPanel--submissionFiles__itemGenre').filter({hasText: 'Book Manuscript'}).first().waitFor({timeout: 20_000});
    } else {
        const labelDialog = page.getByRole('dialog').filter({has: page.locator('#preprintGalleyForm')});
        for (let attempt = 0; ; attempt++) {
            await page.getByRole('link', {name: 'Add File', exact: true}).click();
            try { await labelDialog.first().waitFor({timeout: 5000}); break; } catch (e) { if (attempt >= 2) throw e; }
        }
        await labelDialog.locator('input[name="label"]').fill('PDF');
        await labelDialog.getByRole('button', {name: 'Save', exact: true}).click();
        const upload = page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')});
        const genre = upload.locator('select[name="genreId"]').first();
        await genre.waitFor({timeout: T});
        await genre.selectOption({label: 'Preprint Text'});
        await upload.locator('input[type="file"]').setInputFiles(FIXTURES.ops);
        await page.waitForFunction(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find((x) => x.innerText.trim() === 'Continue'); return b && !b.disabled; }, null, {timeout: T});
        await upload.getByRole('button', {name: 'Continue', exact: true}).click();
        await upload.getByRole('tab', {name: '2. Review Details'}).waitFor({timeout: T});
        await upload.getByRole('button', {name: 'Continue', exact: true}).click();
        await upload.getByRole('tab', {name: '3. Confirm'}).waitFor({timeout: T});
        await upload.getByRole('button', {name: 'Complete', exact: true}).click();
        await upload.waitFor({state: 'hidden', timeout: T});
        await idle(page);
        await page.locator('.submissionWizard').getByRole('link', {name: 'PDF'}).first().waitFor({timeout: 20_000});
    }
    await idle(page);
}

/** "Continue" in the footer; waits (bounded) for the next step to be current. Returns the step it lands on. */
async function pressContinue(page) {
    const labels = (await page.locator('.pkpSteps__step__label').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ').trim());
    const c = await curText(page);
    const k = labels.findIndex((l) => l === c);
    const next = k >= 0 && labels[k + 1] ? labels[k + 1].replace(/^\d+\s*/, '') : null;
    await footer(page).getByRole('button', {name: 'Continue', exact: true}).click({timeout: 10_000});
    if (next) await currentStep(page).filter({hasText: endAnchored(next)}).waitFor({timeout: 10_000}).catch(() => {});
    await idle(page).catch(() => {});
    return curText(page);
}

/** "Continue" until the named step is current; `before(step)` runs on each step first. */
async function continueUntil(page, label, before) {
    for (let i = 0; i < 8 && !endAnchored(label).test(await curText(page)); i++) {
        if (before) await before(await curText(page));
        await pressContinue(page);
    }
    return curText(page);
}

/** A step from the wizard's rail. */
async function railTo(page, label) {
    for (let attempt = 0; attempt < 3; attempt++) {
        if (await page.locator('.pkpSteps--collapsed').count()) await page.locator('.pkpSteps__controls button').click().catch(() => {});
        await page.locator('button.pkpSteps__step__label').filter({hasText: endAnchored(label)}).first().click();
        try { await currentStep(page).filter({hasText: endAnchored(label)}).waitFor({timeout: 5000}); await idle(page).catch(() => {}); return; } catch (e) { if (attempt === 2) throw e; }
    }
}

/** A step by the rail when the rail offers it (a step already reached), else by "Continue". */
async function goToStep(page, label, before) {
    if (endAnchored(label).test(await curText(page))) return curText(page);
    if (await page.locator('button.pkpSteps__step__label').filter({hasText: endAnchored(label)}).count()) {
        await railTo(page, label);
        return curText(page);
    }
    return continueUntil(page, label, before);
}

/** Reload the wizard; answer "Unsaved Changes" with `answer` ('No, discard unsaved changes' or 'Yes') when it asks. */
async function reloadWizard(page, answer = 'No, discard unsaved changes') {
    await page.reload();
    await page.locator('.pkpSteps').waitFor({timeout: T});
    await idle(page).catch(() => {});
    await sleep(1500);
    const unsaved = page.getByRole('dialog').filter({hasText: /Unsaved Changes/});
    let asked = null;
    if (await unsaved.isVisible().catch(() => false)) {
        asked = flat(await unsaved.innerText().catch(() => null), 300);
        await unsaved.getByRole('button', {name: answer, exact: true}).click().catch(() => {});
        await idle(page).catch(() => {});
    }
    return asked;
}

/** What the wizard shows right after a judged "Continue": the step, the dialog, the footer at 1 s and 6 s. */
async function afterContinue(page, writes, t0) {
    await sleep(1500);
    const o = {step: await curText(page)};
    o.errorDialog = (await errDialog(page).isVisible().catch(() => false)) ? flat(await errDialog(page).innerText().catch(() => null), 300) : null;
    o.footerAt1s = await footerText(page);
    await sleep(5000);
    o.footerAt6s = await footerText(page);
    o.writes = writes.since(t0).filter((x) => PUB_WRITE.test(x.url));
    if (await errDialog(page).isVisible().catch(() => false)) await errDialog(page).getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
    return o;
}

module.exports = {
    FIXTURES, T, sleep, flat, PUB_WRITE, wf, snap, watchWrites, requireSummary, openWorkflow, openEntry, savePage, typeRich,
    currentStep, curText, footer, footerText, errDialog, startSubmission, uploadFile, pressContinue, continueUntil, railTo, goToStep,
    reloadWizard, afterContinue,
};
