// Helpers of walk.js (issue report docs/issues/U42-A9-submits-without-required-data-citations.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const path = require('path');
const {idle, loc} = require('../../../probe');
const W = require('../wizard-refused-save-hangs-saving/lib.js');
const D = require('../double-submit-empty-problems-banner/lib.js');
const S = require('../section-editors-not-assigned-second-journal/lib.js');

const {T, sleep, flat} = W;
const L = (app) => (app.line && /3_[34]/.test(app.line) ? '' : '/en');
const MANAGER = 'rvaca';

/** The two "Metadata" settings the steps change: the box that switches each on and its "Require…" choice. */
const SETTINGS = {
    dataCitations: {
        enable: 'Enable data citation metadata',
        require: 'Require the author to add data citation metadata before accepting their submission.',
    },
    references: {
        enable: 'Enable references metadata',
        require: 'Require the author to provide references before accepting their submission.',
    },
};

/**
 * As a manager: Settings › Workflow › Submission › "Metadata", tick the setting's box when it is
 * not ticked, choose its "Require…" option, "Save". Returns the save's status and what showed.
 */
async function requireSetting(page, app, which) {
    const s = SETTINGS[which];
    await page.goto(app.url(`/index.php/${app.contextPath}${L(app)}/management/settings/workflow`));
    await idle(page);
    await page.locator('#metadata-button').click();
    const panel = page.locator('#metadata');
    await panel.waitFor({state: 'visible', timeout: T});
    const box = panel.getByRole('checkbox', {name: s.enable, exact: true});
    await loc(page, `Metadata: the "${s.enable}" box`, box);
    const wasTicked = await box.isChecked();
    if (!wasTicked) await box.check();
    const radio = panel.getByRole('radio', {name: s.require, exact: true});
    await loc(page, `Metadata: "${s.require}"`, radio);
    await radio.check();
    const form = panel.locator('form').first();
    const saved = page.waitForResponse((r) => r.request().method() !== 'GET' && /\/contexts\/\d+/.test(r.url()), {timeout: T});
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    const status = await form.locator('.pkpFormPage__status', {hasText: 'Saved'}).waitFor({timeout: T}).then(() => 'Saved').catch(() => null);
    return {which, wasTicked, save: r.status(), status, ticked: await radio.isChecked()};
}

/**
 * Collects the answers of the Review step's check and of the final submit
 * (`…/submissions/{id}/submit`): status and body, in order.
 */
function watchSubmitChecks(page) {
    const seen = [];
    page.on('response', async (r) => {
        if (!/\/submissions\/\d+\/submit(\?|$)/.test(r.url())) return;
        let body = null;
        try { body = await r.text(); } catch (e) { /* gone */ }
        seen.push({method: r.request().method(), status: r.status(), body: flat(body, 400)});
    });
    return seen;
}

/** The "Details" step's "Data" section as shown: its text (the Data Citations table included). */
async function readDataSection(page) {
    const table = page.locator('table[aria-label="Data Citations"]:visible');
    const section = page.locator('.panelSection:visible').filter({has: table});
    return {
        tables: await table.count(),
        text: flat(await section.first().innerText({timeout: 5000}).catch(() => null), 600),
    };
}

/**
 * On "Details": "Add Data Citation", the title and the relationship type, "Save"; then a reload of
 * the page (on a press or a preprint server the wizard's table stays stale until then, U42 A10).
 * Returns the save's status and the step the reload opened on.
 */
async function addDataCitation(page, {title}) {
    const table = page.locator('table[aria-label="Data Citations"]:visible');
    const block = page.locator('div').filter({has: table}).filter({hasText: 'Data Citations'}).last();
    await block.getByRole('button', {name: 'Add Data Citation', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Add Data Citation', exact: true});
    await dialog.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
    await dialog.getByRole('textbox', {name: /^Title/}).fill(title);
    await dialog.getByRole('combobox', {name: /^Relationship type/}).selectOption({
        label: 'Supporting data without specifying whether they were generated or analyzed (supporting).',
    });
    const saved = page.waitForResponse((r) => /\/dataCitations(\/\d+)?$/.test(r.url().split('?')[0]) && r.request().method() === 'POST', {timeout: T});
    await dialog.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await dialog.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    await page.reload();
    await page.locator('.pkpSteps__step__label--current').waitFor({timeout: T});
    await idle(page);
    await sleep(500);
    return {save: r.status(), reopenedOn: await W.currentStep(page)};
}

/**
 * From the step the wizard is on, every step as the rail orders them up to "Review": a file, an
 * abstract (on "Details" `onDetails(page)` first, once, and the step taken again after it), the Data section's read, OMP's series, OPS's
 * relation status. Leaves the wizard on "Review" with its check finished. Returns the Details reads.
 */
async function toReview(page, app, {onDetails} = {}) {
    const w = D.WORDS[app.name];
    const ojs = app.name === 'ojs';
    const WP = ojs ? null : require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPages.js'));
    const O = ojs ? new (require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPage.js')).SubmissionWizardPage)(page, app.contextPath) : null;
    const done = new Set();
    const out = {};
    for (let i = 0; i < 12; i++) {
        const step = (await W.currentStep(page)).replace(/^\d+\s*/, '');
        if (/(^|\s)Review$/.test(step)) break;
        if (!done.has(step)) {
            done.add(step);
            if (step === 'Upload Files') {
                if (ojs) await O.uploadFile();
                else if (app.name === 'omp') await WP.uploadWizardFile(page, 'u42r1-manuscript.txt');
                else await WP.addGalleyFile(page, {label: 'PDF'});
            } else if (step === 'Details') {
                if (onDetails && !out.onDetails) {
                    // First the step's own action (it reloads the page, which drops unsaved typing),
                    // then the step is taken again from wherever the reload left the wizard
                    out.dataBefore = await readDataSection(page);
                    out.onDetails = await onDetails(page);
                    done.delete(step);
                    continue;
                }
                await S.typeAbstract(page, 'An abstract for the u42r1 walk.');
                if (out.onDetails) out.dataAfter = await readDataSection(page);
                else out.dataBefore = await readDataSection(page);
            } else if (step === 'For the Editors' && w.series) {
                await page.getByRole('radio', {name: w.series, exact: true}).check();
                await idle(page);
            } else if (step === 'For Readers' && app.name === 'ops') {
                await WP.setRelationStatus(page);
            }
        }
        await W.pressContinue(page);
        await idle(page);
        await sleep(500);
    }
    await D.reviewChecked(page);
    return out;
}

/** "Review": one item of the "Details" panel ("Data Citations", "References"): heading, value, warnings. */
async function readReviewItem(page, label) {
    const item = page.locator('.submissionWizard__reviewPanel__item:visible')
        .filter({has: page.locator('h4', {hasText: new RegExp(`^\\s*${label}\\s*$`)})});
    return {
        count: await item.count(),
        text: flat(await item.first().innerText({timeout: 5000}).catch(() => null), 500),
        warnings: (await item.locator('.pkpNotification, .pkpFieldError').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)),
    };
}

/** The footer's "Submit" and its confirmation when "Submit" is enabled; otherwise only its state. */
async function submitIfOffered(page) {
    const submit = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true});
    const enabled = await submit.isEnabled({timeout: 10_000}).catch(() => false);
    if (!enabled) return {enabledBefore: false, pressed: false};
    return {pressed: true, ...(await D.pressSubmit(page))};
}

module.exports = {T, sleep, flat, L, MANAGER, SETTINGS, AUTHORS: D.WORDS, requireSetting, watchSubmitChecks, readDataSection, addDataCitation, toReview, readReviewItem, submitIfOffered, beginSubmission: S.beginSubmission, readReview: D.readReview};
