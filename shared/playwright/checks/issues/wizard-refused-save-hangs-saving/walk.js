// U21 A19 issue walk: after a save the server refuses, the submission wizard hangs on "Saving".
// Steps (docs/issues/U21-A19-wizard-refused-save-hangs-saving.md), on the default dataset:
//   rvaca: Settings › Workflow › Submission › Metadata, "Plain Language Summary" at require (one way to get a refusal, A20);
//   the author (OJS/OPS ccorino, OMP aclark): Make a Submission, Continue past Upload Files, an abstract on Details with
//   the summary empty, Continue (refused); OK; Back, the summary typed, Continue; on to Review; reload.
// MODE=neighbour: the path a fix must leave alone. The same submission, abstract and summary both typed, the browser
//   offline for the Continue (a lost connection), then online again: "Reconnecting", the retry, "Last saved".
//
//   npm run fleet-prep -- --feature issues-ir23 --dataset 1 --reset
//   PROBE_FEATURE=issues-ir23 PROBE_AGENT=ir23 node bin/probe.js all shared/playwright/checks/issues/wizard-refused-save-hangs-saving/walk.js
//   (MODE=neighbour in front for the neighbour check; PKP_E2E_LINE=stable-3_5_0 and the line's fleet for 3.5)
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, idle} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';
// REFUSAL=vordoi (OPS; used on 3.5, which has no plain language summary): the refused save is the "Relation status"
// form's, "This preprint has been published elsewhere." with a DOI typed without its web address (U75 A7).
const REFUSAL = process.env.REFUSAL || 'pls';
const BARE_DOI = '10.1234/u21ir23';
const DOI_URL = 'https://doi.org/10.1234/u21ir23';
const ABSTRACT = 'u21ir23 abstract typed by the author.';
const SUMMARY = 'u21ir23 summary typed after the refusal.';
const ABS_ID = 'titleAbstract-abstract-control-en';
const PLS_ID = 'titleAbstract-plainLanguageSummary-control-en';

forEachApp(async (app) => {
    const author = app.name === 'omp' ? 'aclark' : 'ccorino';
    const o = {app: app.name, line: app.line || 'main', mode: MODE, author};
    const {page, close} = await launch(app);
    await page.addInitScript(L.watchFooter);
    const traffic = [];
    const errs = [];
    page.on('response', async (r) => {
        const u = r.url();
        if (!/\/api\/v1\//.test(u) || r.request().method() === 'GET') return;
        const e = {at: Date.now(), op: r.request().headers()['x-http-method-override'] || r.request().method(), url: u.replace(/^https?:\/\/[^/]+/, '').split('?')[0], status: r.status()};
        traffic.push(e);
        if (r.status() >= 400) e.body = L.flat(await r.text().catch(() => null), 300);
    });
    page.on('requestfailed', (r) => {
        if (!/\/api\/v1\//.test(r.url())) return;
        traffic.push({at: Date.now(), op: r.headers()['x-http-method-override'] || r.method(), url: r.url().replace(/^https?:\/\/[^/]+/, '').split('?')[0], status: 0});
    });
    page.on('pageerror', (e) => errs.push({at: Date.now(), text: L.flat(e.message, 200)}));
    page.on('dialog', async (d) => { if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {}); });
    let t0 = Date.now();
    const rel = (x) => Math.round((x - t0) / 100) / 10;
    const writes = (from) => traffic.filter((x) => x.at >= from && !/_test\//.test(x.url)).map((x) => ({op: x.op, url: x.url, status: x.status, atS: rel(x.at), body: x.body}));
    const footerLog = async (from) => (await page.evaluate(() => window.__footer || []).catch(() => [])).filter((x) => x.at >= from).map((x) => ({atS: rel(x.at), text: x.text}));
    const errsSince = (from) => errs.filter((x) => x.at >= from).map((x) => ({atS: rel(x.at), text: x.text}));
    let n = 0;
    const snap = async (name, facts) => {
        const s = await screen(page).catch((e) => ({url: page.url(), error: L.flat(e.message)}));
        if (facts) s.facts = facts;
        const id = `${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, s);
        await shot(page, id).catch(() => {});
        return s;
    };
    const errDialog = () => page.getByRole('dialog').filter({hasText: /An unexpected error has occurred/});
    const richText = (id) => page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent({format: 'text'}) : null), id).catch(() => null);
    try {
        // Precondition: the manager requires the plain language summary.
        o.refusal = REFUSAL;
        if (REFUSAL === 'pls') {
            await signIn(page, 'rvaca');
            o.settingsSave = await L.requirePlainLanguageSummary(page, app);
            await snap('metadata-settings');
            await signOut(page);
        }

        // 1-3: the author starts a submission.
        await signIn(page, author);
        o.submissionId = await L.beginSubmission(page, app, {title: 'u21ir23 refused save', section: 'Articles'});
        o.firstStep = await L.currentStep(page);
        // 4: past "Upload Files".
        if (/Upload Files\s*$/.test(o.firstStep)) await L.pressContinue(page); // 3.5 OPS opens on "Details"
        o.detailsStep = await L.currentStep(page);
        await L.typeRich(page, ABS_ID, ABSTRACT);
        if (REFUSAL === 'pls') await loc(page, 'Details: the Plain Language Summary editor', page.locator(`#${PLS_ID}_ifr`));
        const published = page.getByRole('radio', {name: 'This preprint has been published elsewhere.', exact: true});
        const doiBox = page.getByRole('textbox', {name: 'DOI of the published preprint'});
        if (REFUSAL === 'vordoi') {
            for (let i = 0; i < 4 && !(await published.isVisible().catch(() => false)); i++) await L.pressContinue(page);
            o.relationStep = await L.currentStep(page);
            await published.check();
            await doiBox.fill(BARE_DOI);
        }
        const refusedStep = (await L.currentStep(page)).replace(/^\d+\s*/, '');

        if (MODE === 'neighbour') {
            await L.typeRich(page, PLS_ID, 'u21ir23 summary typed before the save.');
            await page.context().setOffline(true);
            t0 = Date.now();
            await L.pressContinue(page);
            await page.waitForFunction(() => /Reconnecting/.test((document.querySelector('.submissionWizard__lastSaved') || {}).textContent || ''), null, {timeout: 10_000}).catch(() => {});
            o.offline = {controls: await L.readControls(page), errorDialog: await errDialog().isVisible().catch(() => false)};
            await snap('offline');
            await L.sleep(3000);
            await page.context().setOffline(false);
            await page.waitForFunction(() => /Last saved/.test((document.querySelector('.submissionWizard__lastSaved') || {}).textContent || ''), null, {timeout: 45_000}).catch(() => {});
            await L.sleep(1000);
            o.online = {writes: writes(t0), footer: await footerLog(t0), controls: await L.readControls(page), pageErrors: errsSince(t0)};
            await snap('back-online', o.online);
            await page.reload();
            await idle(page);
            const unsaved = page.getByRole('dialog').filter({hasText: /Unsaved Changes/});
            o.reloadUnsavedDialog = await unsaved.waitFor({timeout: 4000}).then(() => true).catch(() => false);
            await page.locator('button.pkpSteps__step__label').filter({hasText: L.endAnchored('Details')}).first().click().catch(() => {});
            await page.locator(`#${PLS_ID}_ifr`).waitFor({timeout: L.T}).catch(() => {});
            await L.sleep(1500);
            o.readBack = {abstract: await richText(ABS_ID), summary: await richText(PLS_ID)};
            await snap('read-back', o.readBack);
            return;
        }

        // 5: Continue with the summary empty: the server refuses the save.
        t0 = Date.now();
        o.step5next = await L.pressContinue(page);
        o.errorDialog = await errDialog().waitFor({timeout: 10_000}).then(() => true).catch(() => false);
        o.errorDialogText = o.errorDialog ? L.flat(await errDialog().innerText().catch(() => null), 200) : null;
        await snap('refused', {writes: writes(t0)});
        await page.waitForTimeout(Math.max(0, t0 + 10_000 - Date.now()));
        o.at10s = {footer: await footerLog(t0), controls: await L.readControls(page), pageErrors: errsSince(t0)};
        // 6: OK, then wait.
        if (o.errorDialog) await errDialog().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
        await page.waitForTimeout(Math.max(0, t0 + 25_000 - Date.now()));
        o.at25s = {writes: writes(t0), footer: await footerLog(t0), controls: await L.readControls(page), pageErrors: errsSince(t0)};
        await snap('after-ok-25s', o.at25s);
        // 7: Back to the refused step, the field corrected, Continue.
        await L.pressBack(page, refusedStep);
        if (REFUSAL === 'vordoi') await doiBox.fill(DOI_URL);
        else await L.typeRich(page, PLS_ID, SUMMARY);
        const t1 = Date.now();
        await L.pressContinue(page);
        await L.sleep(8000);
        o.step7 = {writes: writes(t1), controls: await L.readControls(page), pageErrors: errsSince(t1), footer: await footerLog(t1)};
        await snap('summary-continue', o.step7);
        // 8: on to Review.
        for (let i = 0; i < 6 && !L.endAnchored('Review').test(await L.currentStep(page)); i++) await L.pressContinue(page);
        o.reviewStep = await L.currentStep(page);
        await L.sleep(8000);
        const rv = await snap('review');
        const main = (rv.text && rv.text.main) || '';
        o.review = {checking: /Checking your submission/.test(main), problems: /one or more problems/.test(main), controls: await L.readControls(page)};
        // 9: reload.
        const t2 = Date.now();
        await page.reload();
        await idle(page);
        const unsaved = page.getByRole('dialog').filter({hasText: /Unsaved Changes/});
        o.reload = {unsavedDialog: await unsaved.waitFor({timeout: 5000}).then(() => true).catch(() => false)};
        if (o.reload.unsavedDialog) {
            o.reload.dialogText = L.flat(await unsaved.innerText().catch(() => null), 300);
            await snap('reload-unsaved');
            await unsaved.getByRole('button', {name: 'Yes', exact: true}).click().catch(() => {});
            await L.sleep(6000);
        }
        o.reload.writes = writes(t2);
        o.reload.pageErrors = errsSince(t2);
        if (await errDialog().isVisible().catch(() => false)) {
            o.reload.errorDialog = true;
            await errDialog().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
        }
        await page.locator('button.pkpSteps__step__label').filter({hasText: L.endAnchored('Details')}).first().click().catch(() => {});
        await page.locator(`#${ABS_ID}_ifr`).waitFor({timeout: L.T}).catch(() => {});
        await L.sleep(1500);
        o.reload.readBack = {abstract: await richText(ABS_ID), summary: REFUSAL === 'pls' ? await richText(PLS_ID) : undefined, controls: await L.readControls(page)};
        if (REFUSAL === 'vordoi') {
            await page.locator('button.pkpSteps__step__label').filter({hasText: L.endAnchored(refusedStep)}).first().click().catch(() => {});
            await L.sleep(1500);
            o.reload.readBack.published = await published.isChecked().catch(() => null);
            o.reload.readBack.doi = await doiBox.inputValue().catch(() => null);
        }
        await snap('read-back', o.reload);
    } catch (e) {
        o.error = L.flat(e.stack || e.message, 800);
        await snap('error').catch(() => {});
    } finally {
        o.allWrites = writes(0);
        o.allPageErrors = errs.map((x) => x.text);
        record(`facts-${MODE}`, o);
        console.log(`[ir23 ${app.name} ${MODE}]`, JSON.stringify(o).slice(0, 3000));
        await close();
    }
});
