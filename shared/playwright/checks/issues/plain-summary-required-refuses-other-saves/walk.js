// Issue report docs/issues/U21-A20-plain-summary-required-refuses-other-saves.md (U21 A20, U40 A1): its Steps, on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), by groups:
//
//   setting      dbarnes: Settings › Workflow › "Submission" › "Metadata": "Enable plain language summary
//                metadata", "Require the author to provide a plain language summary …", "Save"
//   publication  dbarnes: an unpublished submission (OJS 4, OMP 3, OPS 1): Publication › "Metadata"
//                "Save"; "Title & Abstract": a summary typed, "Save"; "Metadata" "Save" again; "Permissions &
//                Disclosure" "Save"; then the neighbour: "Title & Abstract" with the summary emptied, "Save"
//   publish      (OJS) dbarnes: submission 5 (Production): "Schedule For Publication", "Review Publishing Details":
//                Version of Record, major, "Assign To Current/Back Issue" "Vol. 1 No. 2 (2014)", "Confirm" (and
//                "Publish" when the confirmation opens)
//   wizard       the author (ccorino; OMP aclark): the start page, "Begin Submission", a file, "Details" with the
//                summary empty and Continue; reload; on to "Review" (the neighbour: the summary required, "Submit"
//                disabled); "Details": a summary and two lines of "References", Continue; OPS: reload, "For
//                Readers" "This preprint has not been published elsewhere.", Continue; reload and read back
//   submit       (opt-in, WALK_GROUPS=submit) the author's way through: the start page, a file, "Details" with the
//                title, an abstract (OJS, OPS) and the summary typed before the first save, "References" left empty,
//                "Continue" on to "Review" (OPS: "This preprint has not been published elsewhere." on "For Readers";
//                after a refusal, a reload), then "Submit"
//
// Reset first:  npm run fleet-prep -- --feature issues-ir24 --dataset 2 --reset
// Run:          PROBE_FEATURE=issues-ir24 PROBE_AGENT=ir24 node bin/probe.js all shared/playwright/checks/issues/plain-summary-required-refuses-other-saves/walk.js
//               WALK_GROUPS=publication,wizard narrows the groups after "setting" (default: all)
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-ir24-3_5), the run with PROBE_RUN=r35
// Facts: .reports/<feature>/ir24/walk[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, record, idle} = require('../../../probe');
const L = require('./lib');

const GROUPS = (process.env.WALK_GROUPS || 'publication,publish,wizard').split(',');
const UNPUBLISHED = {ojs: 4, omp: 3, ops: 1};
const AUTHOR = {ojs: 'ccorino', omp: 'aclark', ops: 'ccorino'};
const SUMMARY = 'u21ir24 plain summary for a general reader';
const REFS = 'Reference one, u21ir24. 2020.\nReference two, u21ir24. 2021.';
const log = (...a) => console.log('[ir24]', ...a);

async function plsEditorId(page) {
    const f = page.locator('iframe[id*="plainLanguageSummary-control-en"]').first();
    await f.waitFor({state: 'visible', timeout: L.T}).catch(() => {});
    const id = await f.getAttribute('id').catch(() => null);
    return id ? id.replace(/_ifr$/, '') : null;
}

async function publicationGroup(app, page, writes, f) {
    const g = {submission: UNPUBLISHED[app.name]};
    await L.openWorkflow(app, page, g.submission);
    await L.openEntry(page, 'Metadata');
    await L.snap(page, 'walk-pub-metadata');
    g.metadata1 = await L.savePage(page, writes);
    await L.snap(page, 'walk-pub-metadata-saved', g.metadata1);
    await L.openEntry(page, 'Title & Abstract');
    const id = await plsEditorId(page);
    g.summaryField = !!id;
    if (id) {
        await L.typeRich(page, id, SUMMARY);
        g.titleAbstract = await L.savePage(page, writes);
        await L.snap(page, 'walk-pub-title-abstract-saved', g.titleAbstract);
    }
    await L.openEntry(page, 'Metadata');
    g.metadata2 = await L.savePage(page, writes);
    await L.snap(page, 'walk-pub-metadata-again', g.metadata2);
    await L.openEntry(page, 'Permissions & Disclosure');
    g.permissions = await L.savePage(page, writes);
    await L.snap(page, 'walk-pub-permissions', g.permissions);
    // Neighbour: the requirement must still hold on the page that holds the summary.
    await L.openEntry(page, 'Title & Abstract');
    const id2 = await plsEditorId(page);
    if (id2) {
        await L.typeRich(page, id2, '');
        g.neighbourEmptied = await L.savePage(page, writes);
        await L.snap(page, 'walk-pub-title-abstract-emptied', g.neighbourEmptied);
    }
    f.publication = g;
}

async function publishGroup(app, page, writes, f) {
    if (app.name !== 'ojs') return;
    const {PublicationScreen} = require(require('path').join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
    const pub = new PublicationScreen(page, app.contextPath);
    const g = {submission: 5};
    await L.openWorkflow(app, page, g.submission);
    await L.openEntry(page, 'Title & Abstract');
    const panel = await pub.openPublishPanel();
    await pub.fillVersionDetails(panel);
    await pub.awaitAssignmentPreselected(panel);
    await panel.getByRole('radio', {name: 'Assign To Current/Back Issue'}).check();
    await pub.selectIssueOption(panel, /Vol\. 1 No\. 2/);
    await L.snap(page, 'walk-publish-panel');
    const t = Date.now();
    await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
    const confirm = page.getByRole('dialog').filter({hasText: 'Are you sure you want to publish this?'});
    await confirm.waitFor({timeout: 10_000}).catch(() => {});
    await idle(page);
    g.confirmWrites = writes.since(t);
    g.panelStillOpen = await panel.isVisible().catch(() => false);
    g.panelErrors = L.flat(await panel.locator('.pkpFormErrors, .pkpFieldError, [role="alert"]').allInnerTexts().then((a) => a.join(' | ')).catch(() => null), 300);
    g.confirmOpened = await confirm.isVisible().catch(() => false);
    await L.snap(page, 'walk-publish-confirmed', g);
    if (g.confirmOpened) {
        const t2 = Date.now();
        await confirm.getByRole('button', {name: 'Publish', exact: true}).click();
        await page.getByRole('button', {name: 'Unpublish', exact: true}).waitFor({timeout: L.T}).catch(() => {});
        await idle(page);
        g.publishWrites = writes.since(t2);
        g.status = L.flat(await L.wf(page).locator('[data-cy="workflow-controls-left"]').innerText().catch(() => null), 200);
        await L.snap(page, 'walk-publish-done', g);
    }
    f.publish = g;
}

async function wizardGroup(app, page, writes, f) {
    const g = {author: AUTHOR[app.name]};
    const isOPS = app.name === 'ops';
    await signIn(page, g.author);
    const t0 = Date.now();
    g.startWrites = [];
    g.id = await L.startSubmission(app, page, 'u21ir24 wizard submission', g.startWrites);
    g.header = L.flat(await page.locator('.app__pageHeading, h1').first().innerText().catch(() => null), 200);
    await L.snap(page, 'walk-wiz-upload', {header: g.header, writes: g.startWrites});
    await L.uploadFile(app, page);
    await L.goToStep(page, 'Details');
    await L.snap(page, 'walk-wiz-details');
    // Step 13: the summary left empty, an abstract typed (journal, preprint server).
    const abs = page.locator('iframe[id*="-abstract-control-en"]').first();
    if (await abs.count()) {
        const absId = (await abs.getAttribute('id')).replace(/_ifr$/, '');
        await L.typeRich(page, absId, 'u21ir24 abstract of the wizard submission.');
    }
    let t = Date.now();
    await L.pressContinue(page);
    g.details1 = await L.afterContinue(page, writes, t);
    await L.snap(page, 'walk-wiz-details-continue', g.details1);
    // Neighbour: on to "Review" after a reload; the summary must be listed as required and "Submit" disabled.
    g.reload1 = await L.reloadWizard(page);
    const relationNone = async (c) => {
        if (!isOPS || !/For Readers\s*$/.test(c)) return;
        const radios = page.locator('input[name="relationStatus"]');
        if (!(await radios.count())) return;
        const checked = await radios.evaluateAll((els) => els.some((e) => e.checked));
        if (!checked) await page.getByRole('radio', {name: 'This preprint has not been published elsewhere.', exact: true}).check().catch(() => {});
    };
    await L.continueUntil(page, 'Review', relationNone);
    await page.locator('.submissionWizard__loadingReview').waitFor({state: 'hidden', timeout: 20_000}).catch(() => {});
    await L.sleep(3000);
    const rv = await L.snap(page, 'walk-wiz-review-no-summary');
    const main = (rv.text && rv.text.main) || '';
    g.review1 = {
        checking: /Checking your submission/.test(main),
        titleLine: L.flat((main.match(/(This field is required\.\s*)?Title\s*\n[^\n]*/) || [null])[0], 120),
        summaryLine: L.flat((main.match(/Plain Language Summary[\s\S]{0,120}/) || [null])[0], 160),
        errors: (main.match(/[^\n]*(required|None provided)[^\n]*/gi) || []).slice(0, 10),
        submitDisabled: await L.footer(page).getByRole('button', {name: 'Submit', exact: true}).isDisabled().catch(() => null),
    };
    // Step 14: a summary and two lines of "References" on "Details", Continue.
    g.reload2 = await L.reloadWizard(page);
    g.stepOnReload2 = await L.curText(page);
    await L.goToStep(page, 'Details');
    const plsId = await plsEditorId(page);
    if (plsId) await L.typeRich(page, plsId, SUMMARY);
    const refs = page.getByRole('textbox', {name: 'References', exact: true});
    g.referencesBox = await refs.count();
    if (g.referencesBox) { await refs.fill(REFS); await refs.blur().catch(() => {}); }
    await L.snap(page, 'walk-wiz-details-typed');
    t = Date.now();
    await L.pressContinue(page);
    g.details2 = await L.afterContinue(page, writes, t);
    await L.snap(page, 'walk-wiz-details2-continue', g.details2);
    // Step 15 (OPS): "Relation status" alone on "For Readers".
    if (isOPS) {
        g.reload3 = await L.reloadWizard(page);
        await L.goToStep(page, 'For Readers');
        await page.getByRole('radio', {name: 'This preprint has not been published elsewhere.', exact: true}).check();
        t = Date.now();
        await L.pressContinue(page);
        g.readers = await L.afterContinue(page, writes, t);
        await L.snap(page, 'walk-wiz-readers-continue', g.readers);
    }
    // Step 16: reload and read back.
    g.reload4 = await L.reloadWizard(page);
    await L.goToStep(page, 'Details');
    const plsId2 = await plsEditorId(page);
    g.readBack = {
        summary: plsId2 ? await page.evaluate((i) => window.tinymce.get(i).getContent({format: 'text'}), plsId2).catch(() => null) : null,
        references: await page.getByRole('textbox', {name: 'References', exact: true}).inputValue({timeout: 5000}).catch(() => null),
    };
    if (isOPS) {
        await L.goToStep(page, 'For Readers');
        await page.locator('input[name="relationStatus"]').first().waitFor({state: 'attached', timeout: 15_000}).catch(() => {});
        g.readBack.relation = await page.locator('input[name="relationStatus"]').evaluateAll((els) => els.filter((e) => e.checked).map((e) => e.value)).catch(() => null);
    }
    await L.snap(page, 'walk-wiz-readback', g.readBack);
    f.wizard = g;
}

async function submitGroup(app, page, writes, f) {
    const g = {author: AUTHOR[app.name]};
    const isOPS = app.name === 'ops';
    await signIn(page, g.author);
    g.id = await L.startSubmission(app, page, 'u21ir24 submit path', []);
    await L.uploadFile(app, page);
    await L.continueUntil(page, 'Details');
    const titleId = (await page.locator('iframe[id*="-title-control-en"]').first().getAttribute('id')).replace(/_ifr$/, '');
    await L.typeRich(page, titleId, 'u21ir24 submit path');
    const abs = page.locator('iframe[id*="-abstract-control-en"]').first();
    if (await abs.count()) await L.typeRich(page, (await abs.getAttribute('id')).replace(/_ifr$/, ''), 'u21ir24 abstract.');
    const plsId = await plsEditorId(page);
    if (plsId) await L.typeRich(page, plsId, SUMMARY);
    let t = Date.now();
    await L.pressContinue(page);
    g.details = await L.afterContinue(page, writes, t);
    g.path = [];
    const relation = async (c) => {
        if (!isOPS || !/For Readers\s*$/.test(c)) return;
        await page.getByRole('radio', {name: 'This preprint has not been published elsewhere.', exact: true}).check().catch(() => {});
    };
    t = Date.now();
    await L.continueUntil(page, 'Review', async (c) => { g.path.push(c); await relation(c); });
    await L.sleep(7000);
    g.toReviewWrites = writes.since(t).filter((x) => x.status >= 400);
    if (g.toReviewWrites.length) { g.reload = await L.reloadWizard(page); await L.goToStep(page, 'Review'); }
    await page.locator('.submissionWizard__loadingReview').waitFor({state: 'hidden', timeout: 20_000}).catch(() => {});
    await L.sleep(3000);
    const rv = await L.snap(page, 'walk-submit-review');
    const main = (rv.text && rv.text.main) || '';
    g.reviewProblems = (main.match(/[^\n]*(required|problems)[^\n]*\n[^\n]*/gi) || []).map((x) => L.flat(x, 120)).slice(0, 8);
    const submit = L.footer(page).getByRole('button', {name: 'Submit', exact: true});
    g.submitDisabled = await submit.isDisabled().catch(() => null);
    if (g.submitDisabled === false) {
        await submit.click();
        const d = page.getByRole('dialog').filter({hasText: /will be submitted to|Are you sure you want to (complete|submit)/});
        await d.waitFor({timeout: L.T});
        await d.getByRole('button', {name: 'Submit', exact: true}).click();
        g.complete = await page.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: 45_000}).then(() => true).catch(() => false);
        await L.snap(page, 'walk-submit-done', g);
    }
    f.submit = g;
}

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line, dataset: app.dataset};
    const {page, close} = await launch(app);
    page.on('dialog', async (d) => { if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {}); });
    const writes = L.watchWrites(page);
    page.on('pageerror', (e) => (f.pageErrors ||= []).push(L.flat(e.message, 200)));
    try {
        await signIn(page, 'dbarnes');
        f.setting = await L.requireSummary(app, page);
        await L.snap(page, 'walk-setting', f.setting);
        log(app.name, 'setting', JSON.stringify(f.setting));
        if (f.setting.offered) {
            for (const [name, fn] of [['publication', publicationGroup], ['publish', publishGroup], ['wizard', wizardGroup], ['submit', submitGroup]]) {
                if (!GROUPS.includes(name)) continue;
                try { await fn(app, page, writes, f); } catch (e) { f[`${name}Error`] = L.flat(e.stack || e.message, 800); await L.snap(page, `walk-${name}-error`).catch(() => {}); }
                log(app.name, name, JSON.stringify(f[name] || f[`${name}Error`]).slice(0, 1500));
            }
        }
    } finally {
        await signOut(page).catch(() => {});
        await close();
    }
    record('walk', f);
});
