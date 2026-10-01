// Helpers of walk.js and neighbour.js (issue report docs/issues/U21-A8-section-editors-not-assigned-second-journal.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle} = require('../../../probe');
const {typeRich} = require('../wizard-refused-save-hangs-saving/lib.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 3000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const oldLine = (app) => !!(app.line && /3_[34]/.test(app.line));
const L = (app) => (oldLine(app) ? '' : '/en');

/** Per-app screen words. */
const WORDS = {
    ojs: {noun: 'Journal', hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal', se: 'Section editor', tab: 'Sections', add: 'Create Section', section: 'Articles', author: 'ccorino', controlSection: 'Articles'},
    omp: {noun: 'Press', hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press', se: 'Series editor', tab: 'Series', add: 'Add Series', section: null, author: 'aclark', controlSection: 'Library & Information Studies'},
    ops: {noun: 'Server', hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server', se: 'Moderator', tab: 'Sections', add: 'Create Section', section: 'Preprints', author: 'ccorino', controlSection: 'Preprints'},
};

/** Administration › Hosted Journals (Presses, Servers) › "Create …", filled, enabled, saved. Returns the save's status. */
async function createContext(page, app, {name, initials, path: urlPath, email}) {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const hosted = new HostedJournalsPage(page, WORDS[app.name]);
    await page.goto(app.url(`/index.php/index${L(app)}/admin/contexts`));
    await hosted.expectOpen();
    const win = await hosted.openCreate();
    await win.type(win.title('en'), name);
    await win.type(win.initials('en'), initials);
    await win.type(win.contactName, name);
    await win.type(win.contactEmail, email);
    await win.country.selectOption({label: 'Canada'});
    await win.type(win.path, urlPath);
    if (await win.languageBox('en').count()) {
        await win.setBox(win.languageBox('en'), true);
        await win.setBox(win.primaryChoice('en'), true);
    }
    // "Enable this journal to appear publicly on the site": a journal in use is public.
    await win.setBox(win.enableBox, true);
    const r = await win.pressSave();
    await page.waitForURL(/\/admin\/wizard\/\d+/, {timeout: T}).catch(() => {});
    return r.status();
}

/**
 * On the context's "Settings wizard" (open), "Users" tab: search the username with
 * "Include users with no roles…" ticked, "Edit User", tick the role, "OK".
 * Returns the notices and the user's row after the save.
 */
async function giveRole(page, app, {username, role}) {
    const {HostedContextsPage, UserDetailsWindow} = require('../../../pages/UsersManagementPages.js');
    const hosted = new HostedContextsPage(page, {hostedLabel: WORDS[app.name].hosted});
    const grid = await hosted.openWizardTab('Users');
    await grid.search({text: username, includeNoRole: true});
    await grid.chooseAction(username, 'Edit User');
    const win = new UserDetailsWindow(page, 'Edit User');
    await win.expectOpen();
    await win.roleBox(role).check();
    await win.pressOk();
    await win.expectClosed();
    await idle(page).catch(() => {});
    return {row: (await grid.rowCells(username).catch(() => [])).join(' | ')};
}

/**
 * Settings › Journal › "Sections" (OMP "Series"): edit the context's default section
 * (OMP: add a series), tick "Assign {editor} as {role}", save. Returns the window's
 * "Editorial Assignments" boxes as offered and the tab's rows afterwards.
 */
async function assignEditorToSection(page, app, ctx, {editorName, seriesTitle, seriesPath}) {
    const {SectionsTab} = require('../../../pages/SectionsPages.js');
    const w = WORDS[app.name];
    const tab = new SectionsTab(page, ctx, {tab: w.tab, addLabel: w.add, locale: L(app).replace('/', '')});
    await tab.goto();
    const win = app.name === 'omp' ? await tab.openAdd() : await tab.openEdit(w.section);
    if (app.name === 'omp') {
        await win.type('title[en]', seriesTitle);
        await win.type('path', seriesPath);
    }
    const offered = (await win.assignmentBoxes().evaluateAll((els) => els.map((e) => (e.closest('label') || {}).innerText || e.getAttribute('aria-label') || ''))).map((s) => flat(s, 120));
    const box = win.checkbox(`Assign ${editorName} as ${w.se}`);
    await box.check();
    const r = await win.saveAndClose();
    await idle(page).catch(() => {});
    const rows = flat(await tab.grid().innerText().catch(() => null), 800);
    return {offered, saveStatus: r.status(), rows};
}

/** "Make a Submission" of a context: title, section when offered, boxes, "Begin Submission". Returns the id. */
async function beginSubmission(page, app, ctx, {title, section}) {
    await page.goto(app.url(`/index.php/${ctx}${L(app)}/submission`));
    await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: T});
    await typeRich(page, 'startSubmission-title-control', title);
    if (section) {
        const r = page.getByRole('radio', {name: section, exact: true});
        if (await r.count()) await r.check();
    }
    const en = page.getByRole('radio', {name: 'English', exact: true});
    if (await en.count()) await en.check();
    for (const name of [/meets all of these requirements/, /agree to have my data collected/]) {
        const b = page.getByRole('checkbox', {name});
        if (await b.count()) await b.check();
    }
    await page.getByRole('button', {name: 'Begin Submission'}).click();
    await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
    await page.locator('.pkpSteps__step__label--current').waitFor({timeout: T});
    await idle(page);
    return Number(new URL(page.url()).searchParams.get('id'));
}

/** On the wizard's "Details" step: type an abstract when the box is there. */
async function typeAbstract(page, text) {
    const id = 'titleAbstract-abstract-control-en';
    if (await page.locator(`#${id}_ifr`).count()) await typeRich(page, id, text);
}

/**
 * The whole wizard after "Begin Submission", step by step as the rail orders them (3.5 opens
 * on "Details", main on "Upload Files"): a file, an abstract, OMP's series on "For the
 * Editors", OPS's relation status on "For Readers", then "Submit" and its confirmation.
 * Returns the Review step's problems (empty when it submitted).
 */
async function completeSubmission(page, app, ctx, id, {series}) {
    const {expect} = require('@playwright/test');
    const {currentStep, pressContinue} = require('../wizard-refused-save-hangs-saving/lib.js');
    const path = require('path');
    const ojs = app.name === 'ojs';
    const W = ojs ? null : require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPages.js'));
    const O = ojs ? new (require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPage.js')).SubmissionWizardPage)(page, ctx) : null;
    const done = new Set();
    for (let i = 0; i < 10; i++) {
        const step = (await currentStep(page)).replace(/^\d+\s*/, '');
        if (/(^|\s)Review$/.test(step)) break;
        if (!done.has(step)) {
            done.add(step);
            if (step === 'Upload Files') {
                if (ojs) await O.uploadFile();
                else if (app.name === 'omp') await W.uploadWizardFile(page, 'u21ir25-manuscript.txt');
                else await W.addGalleyFile(page, {label: 'PDF'});
            } else if (step === 'Details') {
                await typeAbstract(page, 'An abstract for the u21ir25 walk.');
            } else if (step === 'For the Editors' && app.name === 'omp' && series) {
                await page.getByRole('radio', {name: series, exact: true}).check();
                await idle(page);
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
    const problems = flat(await page.locator('.submissionWizard__review_errors').innerText({timeout: 3000}).catch(() => ''), 600);
    if (problems) return problems;
    if (ojs) await O.submitAndConfirm();
    else if (app.name === 'ops') await W.confirmSubmit(page, {message: ''});
    else await W.confirmSubmit(page);
    await expect(page.getByRole('heading', {name: 'Submission complete'})).toBeVisible({timeout: T});
    return '';
}

/** A submission's workflow (Dashboard › the submission), as a manager: the window's text. */
async function openWorkflow(page, app, ctx, id) {
    await page.goto(app.url(`/index.php/${ctx}${L(app)}/dashboard/editorial?workflowSubmissionId=${id}`));
    const dialog = page.getByRole('dialog').last();
    await dialog.waitFor({timeout: T});
    await idle(page).catch(() => {});
    await dialog.getByText('Participants', {exact: false}).first().waitFor({timeout: T}).catch(() => {});
    await sleep(1500);
    return flat(await dialog.innerText().catch(() => null), 4000);
}

/** The "Participants" part of a workflow window's text (from the heading on). */
function participantsPart(text) {
    if (!text) return text;
    const k = text.toLowerCase().lastIndexOf('participants'); // the heading is upper-cased by CSS
    return k < 0 ? null : text.slice(k, k + 600);
}

/** Mail to one address whose subject or body holds the marker, newest first: [{subject, to}]. */
async function mailFor(app, to, marker, {wait = 0} = {}) {
    if (wait) await app.mail.find({to, contains: marker, timeoutMs: wait}).catch(() => null);
    const r = await app.mail._search({to, contains: marker}).catch(() => ({messages: []}));
    return (r.messages || []).map((m) => ({subject: m.Subject, to: (m.To || []).map((x) => x.Address).join(',')}));
}

module.exports = {T, sleep, flat, WORDS, L, createContext, giveRole, assignEditorToSection, beginSubmission, typeAbstract, completeSubmission, openWorkflow, participantsPart, mailFor};
