// U75 A7 issue walk: the submission wizard refuses a DOI written on its own and never says which box or why.
// Steps (docs/issues/U75-A7-wizard-refused-doi-no-field-message.md), on the default dataset, OPS:
//   ccorino: Make a Submission, Continue to the "Relation status" question, "This preprint has been published
//   elsewhere.", "10.1234/u75r3" in "DOI of the published preprint", Continue; OK in the dialog; Back to the step.
// MODE=submit: the same refusal, then the reload the window asks for, "Review" and "Submit" (with a file and an
//   abstract, so "Submit" can be offered); then dbarnes reads the submitted preprint's "Relations".
// MODE=pls: a refusal naming a field the refused form does not hold (the fix must keep the window there): rvaca
//   requires the plain language summary; ccorino leaves it empty on "Details" and answers "Relation status" with the
//   full address, so the server refuses the "Relation status" save naming plainLanguageSummary (U21 A20).
// MODE=neighbour: what a fix must leave alone. (a) The same wizard step with the full address
//   "https://doi.org/10.1234/u75r3": saved, no dialog, no message. (b) The control: dbarnes, submission 1,
//   "Relations", the same bare DOI, "Save": the panel's own field message.
//
//   npm run fleet-prep -- --feature issues-u75r3 --dataset 3 --apps ops --reset
//   PROBE_FEATURE=issues-u75r3 PROBE_AGENT=u75r3 node bin/probe.js ops shared/playwright/checks/issues/wizard-refused-doi-no-field-message/walk.js
//   (MODE=neighbour in front for the neighbour check; PKP_E2E_LINE=stable-3_5_0 and the line's fleet for 3.5)
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, idle} = require('../../../probe');
const L = require('../wizard-refused-save-hangs-saving/lib.js');
const P = require('../plain-summary-required-refuses-other-saves/lib.js');

const MODE = process.env.MODE || 'walk';
const BARE_DOI = '10.1234/u75r3';
const DOI_URL = 'https://doi.org/10.1234/u75r3';
const PUBLISHED = 'This preprint has been published elsewhere.';
const ABS_ID = 'titleAbstract-abstract-control-en';

forEachApp(async (app) => {
    const o = {app: app.name, line: app.line || 'main', mode: MODE};
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
    page.on('pageerror', (e) => errs.push({at: Date.now(), text: L.flat(e.message, 200)}));
    let t0 = Date.now();
    const rel = (x) => Math.round((x - t0) / 100) / 10;
    const writes = (from) => traffic.filter((x) => x.at >= from).map((x) => ({op: x.op, url: x.url, status: x.status, atS: rel(x.at), body: x.body}));
    const footerLog = async (from) => (await page.evaluate(() => window.__footer || []).catch(() => [])).filter((x) => x.at >= from).map((x) => ({atS: rel(x.at), text: x.text}));
    const errsSince = (from) => errs.filter((x) => x.at >= from).map((x) => ({atS: rel(x.at), text: x.text}));
    let n = 0;
    const snap = async (name, facts) => {
        const s = await screen(page).catch((e) => ({url: page.url(), error: L.flat(e.message)}));
        if (facts) s.facts = facts;
        const id = `a7-${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, s);
        await shot(page, id).catch(() => {});
        return s;
    };
    const errDialog = () => page.getByRole('dialog').filter({hasText: /An unexpected error has occurred/});
    const published = page.getByRole('radio', {name: PUBLISHED, exact: true});
    const doiBox = page.getByRole('textbox', {name: 'DOI of the published preprint'});
    // The box's field: its value, its messages (field errors), any page notice.
    const readField = async () => page.evaluate(() => {
        const box = [...document.querySelectorAll('input[name="vorDoi"]')].find((x) => x.getClientRects().length);
        const field = box ? box.closest('.pkpFormField') : null;
        const notices = [...document.querySelectorAll('[role="status"], .pkpNotify, .vue-notification, [data-cy="notification"]')]
            .map((x) => x.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean);
        return {visible: !!box, value: box ? box.value : null,
            fieldErrors: field ? [...field.querySelectorAll('.pkpFormFieldError, .pkpFieldError, [id$="-error"]')].map((x) => x.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean) : null,
            ariaInvalid: box ? box.getAttribute('aria-invalid') : null, notices};
    }).catch((e) => ({err: L.flat(e.message, 200)}));

    // Steps 1-4 (and the neighbour's wizard part): a new submission, on to the relation question, the answer typed.
    async function toRelationStep(title, doi, {file = false, abstract = false} = {}) {
        await signIn(page, 'ccorino');
        o.submissionId = await L.beginSubmission(page, app, {title});
        o.firstStep = await L.currentStep(page);
        o.stepsPassed = [];
        for (let i = 0; i < 5 && !(await published.isVisible().catch(() => false)); i++) {
            const cur = await L.currentStep(page);
            if (file && /Upload Files\s*$/.test(cur)) await P.uploadFile(app, page);
            if (abstract && /Details\s*$/.test(cur)) await L.typeRich(page, ABS_ID, 'u75r3 abstract typed by the author.');
            o.stepsPassed.push(await L.pressContinue(page));
        }
        o.relationStep = (await L.currentStep(page)).replace(/^\d+\s*/, '');
        await loc(page, 'wizard: "This preprint has been published elsewhere." radio', published);
        await published.check();
        await loc(page, 'wizard: "DOI of the published preprint" box', doiBox);
        await doiBox.fill(doi);
        await snap('typed', await readField());
    }

    // The "Relations" dropdown of a submission's workflow, as dbarnes: the ticked answer and the DOI.
    async function readRelations(sid) {
        await signOut(page);
        await signIn(page, 'dbarnes');
        await page.goto(app.url(`/index.php/${app.contextPath}${app.line && /3_[34]/.test(app.line) ? '' : '/en'}/dashboard/editorial?workflowSubmissionId=${sid}`));
        await page.locator('[data-cy="sidemodal-header"]').waitFor({timeout: L.T}).catch(() => {});
        await idle(page).catch(() => {});
        const dlg = page.getByRole('dialog').filter({has: page.locator('[data-cy="sidemodal-header"]')}).first();
        await dlg.getByRole('navigation').getByRole('link', {name: 'Title & Abstract', exact: true}).first().click().catch(() => {});
        await idle(page).catch(() => {});
        await L.sleep(1500);
        await page.getByRole('button', {name: 'Relations', exact: true}).first().click().catch((e) => { o.relationsButton = L.flat(e.message, 200); });
        await L.sleep(700);
        return page.evaluate(() => {
            const radios = [...document.querySelectorAll('input[name="relationStatus"]')].filter((r) => r.getClientRects().length);
            const doi = [...document.querySelectorAll('input[name="vorDoi"]')].find((r) => r.getClientRects().length);
            return {ticked: radios.filter((r) => r.checked).map((r) => (r.closest('label') || r.parentElement).innerText.trim()), doi: doi ? doi.value : null};
        }).catch((e) => ({err: L.flat(e.message, 200)}));
    }

    try {
        if (MODE === 'submit') {
            await toRelationStep('u75r3 DOI written on its own, submitted', BARE_DOI, {file: true, abstract: true});
            t0 = Date.now();
            await L.pressContinue(page);
            o.errorDialog = await errDialog().waitFor({timeout: 10_000}).then(() => true).catch(() => false);
            if (o.errorDialog) await errDialog().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
            await L.sleep(6000);
            o.beforeReload = {step: await L.currentStep(page), controls: await L.readControls(page), writes: writes(t0)};
            await snap('refused-before-reload', o.beforeReload);
            // The reload the window asks for; "Unsaved Changes" answered "Yes" when it asks.
            const t1 = Date.now();
            o.reloadAsked = await P.reloadWizard(page, 'Yes');
            await L.sleep(3000);
            o.reloadWrites = writes(t1);
            await P.goToStep(page, o.relationStep);
            await L.sleep(1000);
            o.afterReload = {step: await L.currentStep(page), ticked: await page.locator('input[name="relationStatus"]:checked').evaluateAll((els) => els.map((e) => (e.closest('label') || e.parentElement).innerText.trim())).catch(() => null), field: await readField()};
            await snap('relation-step-after-reload', o.afterReload);
            await P.goToStep(page, 'Review');
            await page.locator('.submissionWizard__loadingReview').waitFor({state: 'hidden', timeout: 20_000}).catch(() => {});
            await L.sleep(3000);
            const rv = await snap('review-after-reload');
            const main = (rv.text && rv.text.main) || '';
            o.review = {relationText: L.flat((main.match(/Relation status[\s\S]{0,120}/) || [])[0], 160), problems: /one or more problems/.test(main), controls: await L.readControls(page)};
            const submit = L.footer(page).getByRole('button', {name: 'Submit', exact: true});
            o.review.submitDisabled = await submit.isDisabled().catch(() => null);
            if (o.review.submitDisabled === false) {
                await submit.click();
                const d = page.getByRole('dialog').filter({hasText: /will be submitted to|Are you sure you want to (complete|submit)/});
                await d.waitFor({timeout: L.T});
                await d.getByRole('button', {name: 'Submit', exact: true}).click();
                o.complete = await page.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: 45_000}).then(() => true).catch(() => false);
                await snap('submitted', {complete: o.complete});
            }
            o.relationsAfter = await readRelations(o.submissionId);
            await snap('relations-after-submit', o.relationsAfter);
            return;
        }

        if (MODE === 'pls') {
            await signIn(page, 'rvaca');
            o.settingsSave = await L.requirePlainLanguageSummary(page, app);
            await signOut(page);
            // "Details" leaves the summary empty (its own refusal, the summary's field on its form), then the
            // relation answered with the full address.
            await signIn(page, 'ccorino');
            o.submissionId = await L.beginSubmission(page, app, {title: 'u75r3 summary required'});
            o.stepsPassed = [];
            o.refusals = [];
            for (let i = 0; i < 8 && !(await published.isVisible().catch(() => false)); i++) {
                const cur = await L.currentStep(page);
                if (/Details\s*$/.test(cur) && !o.abstractTyped) { await L.typeRich(page, ABS_ID, 'u75r3 abstract typed by the author.'); o.abstractTyped = true; }
                const t = Date.now();
                o.stepsPassed.push(await L.pressContinue(page));
                await L.sleep(2500);
                const dlg = await errDialog().isVisible().catch(() => false);
                o.refusals.push({from: cur, at: await L.currentStep(page), errorDialog: dlg, writes: writes(t).filter((w) => w.status >= 400)});
                if (dlg) await errDialog().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
            }
            o.relationStep = (await L.currentStep(page)).replace(/^\d+\s*/, '');
            if (await published.isVisible().catch(() => false)) {
                await published.check();
                await doiBox.fill(DOI_URL);
                t0 = Date.now();
                await L.pressContinue(page);
                o.relation = {errorDialog: await errDialog().waitFor({timeout: 10_000}).then(() => true).catch(() => false)};
                o.relation.errorDialogText = o.relation.errorDialog ? L.flat(await errDialog().innerText().catch(() => null), 200) : null;
                await L.sleep(1500);
                o.relation.step = await L.currentStep(page);
                o.relation.writes = writes(t0);
                await snap('pls-relation-continue', o.relation);
                if (o.relation.errorDialog) await errDialog().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
                await L.sleep(1000);
                o.relation.formErrors = await page.locator('.pkpFormErrors, .pkpFieldError').allInnerTexts().catch(() => null);
                o.relation.controls = await L.readControls(page);
            }
            return;
        }

        if (MODE === 'neighbour') {
            // (a) the full address on the same wizard step.
            await toRelationStep('u75r3 full DOI address', DOI_URL);
            t0 = Date.now();
            o.full = {next: await L.pressContinue(page)};
            await L.sleep(6000);
            o.full.errorDialog = await errDialog().isVisible().catch(() => false);
            o.full.step = await L.currentStep(page);
            o.full.writes = writes(t0);
            o.full.footer = await footerLog(t0);
            o.full.controls = await L.readControls(page);
            o.full.pageErrors = errsSince(t0);
            const rv = await snap('full-address-continue', o.full);
            o.full.reviewRelationText = L.flat(((rv.text && rv.text.main) || '').match(/Relation status[\s\S]{0,200}/)?.[0], 220);
            await L.pressBack(page, o.relationStep).catch((e) => { o.full.backError = L.flat(e.message, 200); });
            o.full.field = await readField();
            await snap('full-address-back', o.full.field);
            await signOut(page);

            // (b) the control: "Relations" on submission 1 in the workflow, as dbarnes.
            await signIn(page, 'dbarnes');
            await page.goto(app.url(`/index.php/${app.contextPath}${app.line && /3_[34]/.test(app.line) ? '' : '/en'}/dashboard/editorial?workflowSubmissionId=1`));
            await page.locator('[data-cy="sidemodal-header"]').waitFor({timeout: L.T}).catch(() => {});
            await idle(page).catch(() => {});
            const dlg = page.getByRole('dialog').filter({has: page.locator('[data-cy="sidemodal-header"]')}).first();
            await dlg.getByRole('navigation').getByRole('link', {name: 'Title & Abstract', exact: true}).first().click().catch((e) => { o.titleAbstractLink = L.flat(e.message, 200); });
            await idle(page).catch(() => {});
            await L.sleep(1500);
            const relButton = page.getByRole('button', {name: 'Relations', exact: true}).first();
            await loc(page, 'workflow: "Relations" button', relButton);
            await relButton.click();
            await L.sleep(700);
            const panel = page.locator('.pkpWorkflow__publicationRelation .pkpDropdown__content');
            await panel.getByRole('radio', {name: PUBLISHED, exact: true}).check();
            await panel.locator('input[name="vorDoi"]').fill(BARE_DOI);
            t0 = Date.now();
            const w = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 20000}).catch(() => null);
            await panel.getByRole('button', {name: 'Save', exact: true}).click();
            await w;
            await L.sleep(1200);
            o.control = {writes: writes(t0), field: await readField(), panelText: L.flat(await panel.innerText().catch(() => null), 600), pageErrors: errsSince(t0)};
            await snap('control-relations', o.control);
            return;
        }

        // Steps 1-4.
        await toRelationStep('u75r3 DOI written on its own', BARE_DOI);
        // 5: Continue.
        t0 = Date.now();
        o.step5 = {next: await L.pressContinue(page)};
        o.step5.errorDialog = await errDialog().waitFor({timeout: 10_000}).then(() => true).catch(() => false);
        o.step5.errorDialogText = o.step5.errorDialog ? L.flat(await errDialog().innerText().catch(() => null), 200) : null;
        await L.sleep(1500);
        o.step5.step = await L.currentStep(page);
        o.step5.field = await readField();
        o.step5.writes = writes(t0);
        await snap('continue', o.step5);
        // 6: OK in the dialog (when there is one).
        if (o.step5.errorDialog) await errDialog().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
        await page.waitForTimeout(Math.max(0, t0 + 10_000 - Date.now()));
        o.step6 = {step: await L.currentStep(page), footer: await footerLog(t0), controls: await L.readControls(page), pageErrors: errsSince(t0)};
        const s6 = await snap('after-ok', o.step6);
        o.step6.reviewChecking = /Checking your submission/.test((s6.text && s6.text.main) || '');
        o.step6.reviewRelationText = L.flat((((s6.text && s6.text.main) || '').match(/Relation status[\s\S]{0,200}/) || [])[0], 220);
        // 7: Back to the relation step (a fix may have brought the author there already).
        if (L.endAnchored(o.relationStep).test(await L.currentStep(page))) o.step7 = {alreadyOnStep: true};
        else {
            o.step7 = {alreadyOnStep: false};
            await L.pressBack(page, o.relationStep).catch((e) => { o.step7.backError = L.flat(e.message, 200); });
        }
        await L.sleep(1000);
        o.step7.step = await L.currentStep(page);
        o.step7.published = await published.isChecked().catch(() => null);
        o.step7.field = await readField();
        o.step7.controls = await L.readControls(page);
        await snap('back-on-step', o.step7);
    } catch (e) {
        o.error = L.flat(e.stack || e.message, 800);
        await snap('error').catch(() => {});
    } finally {
        o.allWrites = writes(0);
        o.allPageErrors = errs.map((x) => x.text);
        record(`a7-facts-${MODE}`, o);
        console.log(`[u75r3 ${app.name} ${MODE}]`, JSON.stringify(o).slice(0, 4000));
        await close();
    }
});
