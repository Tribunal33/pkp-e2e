// Helpers of walk.js (U20 A6: a contributor copied from an account that holds its name in
// another language is announced by the given name alone; issue report
// docs/issues/U20-A6-author-tags-given-name-alone-other-language.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const path = require('path');
const {idle, screen, record, shot} = require('../../../probe');
const {typeRich, currentStep, pressContinue} = require('../wizard-refused-save-hangs-saving/lib.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 3000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const v35 = (app) => (app.line || 'main') === 'stable-3_5_0';

/** Per-app words: the author account of the dataset, its full name, the section, the item page's address. */
const WORDS = {
    ojs: {author: 'ccorino', given: 'Carlo', family: 'Corino', section: 'Articles', item: 'article/view'},
    omp: {author: 'aclark', given: 'Arthur', family: 'Clark', section: null, item: 'catalog/book'},
    ops: {author: 'ccorino', given: 'Carlo', family: 'Corino', section: 'Preprints', item: 'preprint/view'},
};

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

/**
 * "Make a Submission": the "Submission Language" radio whose label matches `language`, the section
 * when asked, the title, the two boxes, "Begin Submission". Returns {id, languages} (the radios offered).
 */
async function beginInLanguage(page, app, {title, section, language}) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/submission`));
    await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: T});
    await idle(page);
    const languages = await page.locator('input[type=radio][name="locale"]').evaluateAll((els) => els.map((e) => ((e.closest('label') || {}).innerText || '').trim()));
    await page.getByRole('radio', {name: language, exact: true}).check();
    await idle(page);
    await typeRich(page, 'startSubmission-title-control', title);
    if (section) {
        const r = page.getByRole('radio', {name: section, exact: true});
        if (await r.count()) await r.check();
    }
    for (const name of [/meets all of these requirements/, /agree to have my data collected/]) {
        const b = page.getByRole('checkbox', {name});
        if (await b.count()) await b.check();
    }
    await snap(page, 'start-filled');
    await page.getByRole('button', {name: 'Begin Submission'}).click();
    await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
    await page.locator('.pkpSteps__step__label--current').waitFor({timeout: T});
    await idle(page);
    return {id: Number(new URL(page.url()).searchParams.get('id')), languages};
}

/**
 * The wizard after "Begin Submission" up to "Review": a file on "Upload Files", the abstract in
 * `locale` on "Details", OPS's relation answer on "For Readers". Returns the rich-text ids
 * the Details step offered.
 */
async function toReview(page, app, {abstract, locale}) {
    const ojs = app.name === 'ojs';
    const W = ojs ? null : require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPages.js'));
    const O = ojs ? new (require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPage.js')).SubmissionWizardPage)(page, app.contextPath) : null;
    const done = new Set();
    const out = {steps: []};
    for (let i = 0; i < 10; i++) {
        const step = (await currentStep(page)).replace(/^\d+\s*/, '');
        if (/(^|\s)Review$/.test(step)) break;
        if (!done.has(step)) {
            done.add(step);
            out.steps.push(step);
            if (step === 'Upload Files') {
                if (ojs) await O.uploadFile();
                else if (app.name === 'omp') await W.uploadWizardFile(page, 'u20e-manuscript.txt');
                else await W.addGalleyFile(page, {label: 'PDF'});
            } else if (step === 'Details') {
                out.richIds = await page.locator('iframe[id$="_ifr"]').evaluateAll((els) => els.map((e) => e.id));
                const id = `titleAbstract-abstract-control-${locale}`;
                if (await page.locator(`#${id}_ifr`).count()) await typeRich(page, id, abstract);
                out.abstractBox = id;
            } else if (step === 'For Readers' && app.name === 'ops') {
                await W.setRelationStatus(page);
            }
        }
        await pressContinue(page);
        await idle(page);
        await sleep(500);
    }
    await page.locator('.submissionWizard__loadingReview').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    out.problems = flat(await page.locator('.submissionWizard__review_errors').innerText({timeout: 3000}).catch(() => ''), 600);
    return out;
}

/**
 * The wizard of submission `id` opened in the interface language `ui` ('en', 'fr_CA'), its
 * footer's "Continue" ("Continuer") pressed up to the last step ("Review", "Évaluation"):
 * the contributors part of that step.
 */
async function readReview(page, app, id, ui) {
    await page.goto(app.url(`/index.php/${app.contextPath}/${ui}/submission?id=${id}`));
    await page.locator('.pkpSteps__step__label--current').waitFor({timeout: T});
    await idle(page);
    const last = /(Review|Évaluation)$/;
    for (let i = 0; i < 8 && !last.test(await currentStep(page)); i++) {
        await page.locator('.submissionWizard__footer').getByRole('button', {name: /^(Continue|Continuer)$/}).click({timeout: 10_000});
        await idle(page);
        await sleep(600);
    }
    await page.locator('.submissionWizard__loadingReview').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    await sleep(800);
    const s = await snap(page, `review-${ui}`);
    const text = s.text && s.text.main ? flat(s.text.main, 20000) : '';
    const k = text.search(/(Contributors|Contributeurs-trices)\s+Edit|(Contributors|Contributeurs-trices)\s+Modifier/);
    const rows = await page.locator('.submissionWizard__reviewPanel').filter({hasText: /Contributors|Contributeurs/}).first().innerText({timeout: 3000}).catch(() => null);
    return {current: await currentStep(page), contributors: flat(rows, 400) || (k >= 0 ? text.slice(k, k + 300) : null)};
}

/** On the Review step: "Submit" and the confirmation. */
async function submit(page, app) {
    const {expect} = require('@playwright/test');
    if (app.name === 'ojs') {
        const O = new (require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPage.js')).SubmissionWizardPage)(page, app.contextPath);
        await O.submitAndConfirm();
    } else {
        const W = require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPages.js'));
        if (app.name === 'ops') await W.confirmSubmit(page, {message: ''});
        else await W.confirmSubmit(page);
    }
    await expect(page.getByRole('heading', {name: 'Submission complete'})).toBeVisible({timeout: T});
}

/** As an editor: "Accept and Skip Review", then "Send To Production", each through to "Record Decision". */
async function toProduction(page, app, id) {
    const C = require('../copyediting-no-assign-copyeditor-notice/lib.js');
    const out = {};
    await C.openWorkflow(page, app, id);
    out.offered = await C.offered(page);
    if (app.name === 'ops') return out;
    out.accept = await C.decide(page, 'Accept and Skip Review');
    await C.openWorkflow(page, app, id);
    out.send = await C.decide(page, /^Send To Production$/i);
    await C.openWorkflow(page, app, id);
    out.after = await C.offered(page);
    return out;
}

/**
 * As an editor: the workflow's "Publication" ("Preprint"), the header's "Publish" ("Post",
 * "Schedule For Publication"), then each window until the publish call answers: on a journal
 * "Assign To Current/Back Issue" and `issue`, "Confirm", then the question's own button.
 * (The U16 A2 lib's publish(), choosing the issue whenever its box is empty.)
 */
async function publishItem(page, app, id, issue) {
    const {expect} = require('@playwright/test');
    const P = require('../category-order-of-articles-ignored/lib.js');
    await P.openWorkflow(page, app, id);
    await P.openEntryPage(page, app);
    const out0 = {};
    if (v35(app) && app.name === 'ojs') {
        // 3.5: a journal assigns the issue on the "Issue" page's "Assign to Issue" window first.
        const assignButton = page.getByRole('button', {name: /^(Assign to Issue|Change Issue)$/}).first();
        await assignButton.waitFor({state: 'visible', timeout: T});
        await assignButton.click();
        const dialog = page.getByRole('dialog').filter({has: page.locator('select[name="issueId"]')}).last();
        const select = dialog.locator('select[name="issueId"]');
        await expect(select).toBeVisible({timeout: T});
        const value = await select.locator('option').filter({hasText: issue}).first().getAttribute('value');
        await select.selectOption(value || '');
        const saved = page.waitForResponse((r) => /\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T});
        await dialog.getByRole('button', {name: /^(Save|Assign|OK)$/}).last().click();
        out0.issueSave = (await saved).status();
        await idle(page).catch(() => {});
        await sleep(1000);
    }
    const controls = page.locator('[data-cy="workflow-controls-right"]');
    const published = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 90_000});
    let done = false;
    published.then(() => { done = true; }, () => { done = true; });
    const header = controls.getByRole('button', {name: /^(Publish|Post|Schedule For Publication)$/}).first();
    await header.waitFor({state: 'visible', timeout: T});
    const out = {...out0, button: flat(await header.innerText(), 60), windows: []};
    await header.click();
    for (let i = 0; i < 6 && !done; i++) {
        const dlg = page.getByRole('dialog').last();
        const btn = dlg.getByRole('button', {name: /^(Confirm|Publish|Post|Schedule For Publication)$/}).last();
        const shown = await btn.waitFor({state: 'visible', timeout: 15_000}).then(() => true).catch(() => false);
        if (done) break;
        if (!shown) continue;
        await sleep(1200);
        const stage = dlg.locator('select[name="versionStage"]');
        if (await stage.isVisible().catch(() => false)) {
            await stage.selectOption('VoR').catch(() => {});
            const minor = dlg.locator('select[name="versionIsMinor"]');
            if (await minor.isVisible().catch(() => false)) await minor.selectOption('false').catch(() => {});
        }
        const assign = dlg.getByRole('radio', {name: 'Assign To Current/Back Issue', exact: true});
        if (await assign.isVisible().catch(() => false)) {
            if (!(await assign.isChecked().catch(() => false))) await assign.check();
            const select = dlg.locator('select[name="issueId"]');
            await expect(select).toBeVisible({timeout: T});
            const value = await select.locator('option').filter({hasText: issue}).first().getAttribute('value');
            await select.selectOption(value || '');
            out.issue = issue;
            await sleep(400);
        }
        out.windows.push(flat(await dlg.innerText().catch(() => null), 400));
        await shot(page, `publish-${i}`).catch(() => {});
        await btn.click();
        await sleep(1500);
    }
    const r = await published;
    out.publish = r.status();
    await idle(page).catch(() => {});
    await sleep(800);
    out.header = flat(await controls.innerText().catch(() => null), 200);
    return out;
}

/**
 * The item's public page in the interface language `ui`: the author names it shows, the
 * "citation_author" and "DC.Creator.PersonalName" tags of its source, and OJS's "How to Cite".
 */
async function readItemPage(page, app, id, ui) {
    const r = await page.goto(app.url(`/index.php/${app.contextPath}/${ui}/${WORDS[app.name].item}/${id}`));
    await idle(page);
    const meta = async (name) => page.locator(`meta[name="${name}"]`).evaluateAll((els) => els.map((e) => e.getAttribute('content')));
    const names = await page.locator('.item.authors .name, .authors .name, ul.authors li .name').allInnerTexts().catch(() => []);
    const s = await snap(page, `item-${ui}`);
    return {
        status: r ? r.status() : null,
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        pageNames: [...new Set(names.map((x) => flat(x, 120)))],
        citation_author: await meta('citation_author'),
        DC_Creator_PersonalName: await meta('DC.Creator.PersonalName'),
        citation_language: await meta('citation_language'),
        howToCite: flat(await page.locator('#citationOutput').innerText({timeout: 3000}).catch(() => null), 300),
        heading: flat(s.text && s.text.main ? s.text.main : '', 300),
    };
}

/** Profile › "Identity": the French given and family name typed (the field's language popover), "Save". */
async function setFrenchName(page, app, {given, family}) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/user/profile`));
    await idle(page);
    const form = page.locator('form#identityForm');
    await form.waitFor({timeout: T});
    const out = {};
    for (const [field, value] of [['givenName', given], ['familyName', family]]) {
        await form.locator(`input[name="${field}[en]"]`).click();
        const fr = form.locator(`input[name="${field}[fr_CA]"]`);
        await fr.waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
        out[`${field}Visible`] = await fr.isVisible().catch(() => false);
        await fr.fill(value);
    }
    const saved = page.waitForResponse((r) => r.request().method() === 'POST' && /saveIdentity|identity/i.test(r.url()), {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    out.save = r ? r.status() : null;
    await idle(page);
    await sleep(800);
    await page.reload();
    await idle(page);
    out.after = {
        givenFr: await page.locator('input[name="givenName[fr_CA]"]').inputValue().catch(() => null),
        familyFr: await page.locator('input[name="familyName[fr_CA]"]').inputValue().catch(() => null),
    };
    return out;
}

/**
 * As dbarnes, OJS: Settings › Website › Plugins "Crossref Manager Plugin" on; DOIs › "Setup"
 * prefix 10.1234; DOIs › "Registration" Crossref with a depositor; the DOIs page: "Assign DOIs"
 * then "Export DOIs" on article `id`. Returns each save's status and the downloaded XML's
 * contributor part.
 */
async function exportCrossref(page, app, id) {
    const fs = require('fs');
    const {expect} = require('@playwright/test');
    const {outFile} = require('../../../probe');
    const {DoiSettings, DoisPage} = require('../../../pages/DoisPages.js');
    const settings = new DoiSettings(page, app.contextPath);
    const dois = new DoisPage(page, app.contextPath);
    const out = {};
    await settings.gotoPlugins('crossrefplugin');
    await settings.setPluginEnabled('crossrefplugin', true);
    await settings.goto('Setup');
    await settings.prefixBox().fill('10.1234');
    out.setup = (await settings.save(settings.setup)).status();
    await settings.goto('Registration');
    await settings.chooseAgency('Crossref');
    for (const [name, value] of Object.entries({depositorName: 'Public Knowledge Project', depositorEmail: 'dbarnes@mailinator.com'})) {
        await expect(settings.field(name)).toBeVisible({timeout: T});
        await settings.field(name).fill(value);
    }
    out.registration = (await settings.save(settings.registration)).status();
    await dois.goto();
    const row = dois.row(id);
    await row.waitFor({timeout: T});
    out.assign = (await dois.runBulk('Assign DOIs', [id])).status();
    return {...out, ...(await exportDois(page, app, id))};
}

/** The DOIs page: tick article `id`, "Export DOIs", and read the downloaded XML's contributors. */
async function exportDois(page, app, id) {
    const fs = require('fs');
    const {outFile} = require('../../../probe');
    const {DoisPage} = require('../../../pages/DoisPages.js');
    const dois = new DoisPage(page, app.contextPath);
    const out = {};
    await dois.goto();
    await dois.row(id).waitFor({timeout: T});
    await dois.tick([id]);
    const dialog = await dois.chooseBulkAction('Export DOIs');
    const answered = page.waitForResponse((r) => /\/api\/v1\/dois\/[a-z]+\/export/.test(r.url()) && r.request().method() === 'POST', {timeout: 120_000});
    const downloaded = page.waitForEvent('download', {timeout: 30_000}).catch(() => null);
    await dialog.getByRole('button', {name: 'Export DOIs', exact: true}).click();
    const res = await answered;
    out.export = res.status();
    const dl = await downloaded;
    if (dl) {
        const to = outFile('crossref-export.xml');
        await dl.saveAs(to);
        const xml = fs.readFileSync(to, 'utf8');
        out.file = dl.suggestedFilename();
        out.contributors = (xml.match(/<contributors>[\s\S]*?<\/contributors>/) || [null])[0];
        out.doi = (xml.match(/<doi>([^<]*)<\/doi>/) || [])[1] || null;
        out.titles = (xml.match(/<titles>[\s\S]*?<\/titles>/) || [null])[0];
    }
    await snap(page, 'crossref-export');
    return out;
}

module.exports = {T, sleep, flat, v35, WORDS, snap, beginInLanguage, toReview, readReview, submit, toProduction, publishItem, readItemPage, setFrenchName, exportCrossref, exportDois};
