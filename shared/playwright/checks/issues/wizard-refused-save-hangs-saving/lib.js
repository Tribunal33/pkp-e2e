// Helpers for walk.js (U21 A19). Requiring this file runs nothing.
const {idle, loc} = require('../../../probe');
const {waitForEditorReady} = require('../../../support/richtext.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const endAnchored = (name) => new RegExp(`${esc(name)}\\s*$`);
const PLS_REQUIRE = 'Require the author to provide a plain language summary before accepting their submission.';

/** Init script: every change of the wizard footer's status line, with its time. */
function watchFooter() {
    window.__footer = [];
    let last = null;
    const read = () => {
        const el = document.querySelector('.submissionWizard__lastSaved');
        const t = el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
        if (t !== last) { last = t; window.__footer.push({at: Date.now(), text: t}); }
    };
    const start = () => new MutationObserver(read).observe(document.body, {subtree: true, childList: true, characterData: true});
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
}

/** As a manager: Settings › Workflow › Submission › Metadata, "Plain Language Summary" at require, Save. */
async function requirePlainLanguageSummary(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}${app.line && /3_[34]/.test(app.line) ? '' : '/en'}/management/settings/workflow`));
    await idle(page);
    await page.locator('#metadata-button').click();
    const panel = page.locator('#metadata');
    await panel.waitFor({state: 'visible', timeout: T});
    const box = panel.getByRole('checkbox', {name: 'Enable plain language summary metadata', exact: true});
    await loc(page, 'Metadata: the "Enable plain language summary metadata" box', box);
    if (!(await box.isChecked())) await box.check();
    const radio = panel.getByRole('radio', {name: PLS_REQUIRE, exact: true});
    await radio.check();
    const form = panel.locator('form').first();
    const saved = page.waitForResponse((r) => r.request().method() !== 'GET' && /\/contexts\/\d+/.test(r.url()), {timeout: T});
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await form.locator('.pkpFormPage__status', {hasText: 'Saved'}).waitFor({timeout: T}).catch(() => {});
    return r.status();
}

/** Type into a rich-text box of the wizard by its control id (replacing what it holds). */
async function typeRich(page, id, text) {
    await page.locator(`#${id}_ifr`).waitFor({state: 'visible', timeout: T});
    await waitForEditorReady(page, id);
    await page.frameLocator(`#${id}_ifr`).locator('body').click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type(text);
}

/** "Make a Submission": title, the section / language when offered, the boxes, "Begin Submission". Returns the id. */
async function beginSubmission(page, app, {title, section}) {
    await page.goto(app.url(`/index.php/${app.contextPath}${app.line && /3_[34]/.test(app.line) ? '' : '/en'}/submission`));
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

const footer = (page) => page.locator('.submissionWizard__footer');
const current = (page) => page.locator('.pkpSteps__step__label--current');
async function currentStep(page) { return flat(await current(page).innerText().catch(() => ''), 80); }

/** Press the footer's "Continue" and wait until the next rail step is current. */
async function pressContinue(page) {
    const labels = (await page.locator('.pkpSteps__step__label').allInnerTexts()).map((x) => flat(x));
    const c = await currentStep(page);
    const k = labels.findIndex((l) => l === c);
    const next = k >= 0 && labels[k + 1] ? labels[k + 1].replace(/^\d+\s*/, '') : null;
    await footer(page).getByRole('button', {name: 'Continue', exact: true}).click({timeout: 10_000});
    if (next) await current(page).filter({hasText: endAnchored(next)}).waitFor({timeout: 10_000}).catch(() => {});
    return next;
}

/** Press "Back" and wait for the step before to be current. */
async function pressBack(page, to) {
    await footer(page).getByRole('button', {name: 'Back', exact: true}).click({timeout: 10_000});
    await current(page).filter({hasText: endAnchored(to)}).waitFor({timeout: 10_000});
}

/** The footer's buttons and status line, and the header's "Save for Later". */
async function readControls(page) {
    const state = async (scope, name) => {
        const b = scope.getByRole('button', {name, exact: true});
        if (!(await b.count())) return 'absent';
        return (await b.first().isDisabled().catch(() => null)) ? 'disabled' : 'enabled';
    };
    return {
        footer: flat(await page.locator('.submissionWizard__lastSaved').innerText({timeout: 2000}).catch(() => null), 120),
        saveForLater: await page.getByRole('button', {name: 'Save for Later', exact: true}).evaluateAll((els) => els.map((e) => (e.disabled ? 'disabled' : 'enabled'))).catch(() => null),
        submit: await state(footer(page), 'Submit'),
        back: await state(footer(page), 'Back'),
        cont: await state(footer(page), 'Continue'),
    };
}

module.exports = {T, sleep, flat, endAnchored, watchFooter, requirePlainLanguageSummary, typeRich, beginSubmission, footer, current, currentStep, pressContinue, pressBack, readControls};
