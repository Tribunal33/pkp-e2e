// Helpers of walk.js (issue reports docs/issues/U31-A7-reviewer-suggestion-guidance-misspells-valuable.md
// and docs/issues/U31-A11-reviewer-suggestion-reason-help-is-there.md). Requiring this file runs nothing.
// Every helper drives the screens a person uses.
const {idle} = require('../../../probe');
const {beginSubmission, currentStep, pressContinue} = require('../wizard-refused-save-hangs-saving/lib.js');
const {createContext: createContextOnScreen} = require('../all-dates-error-nothing-published/lib.js');
const {openAuthorGuidance, readGuidanceBoxes, boxText} = require('../reviewer-suggestion-help-describes-contributors/lib.js');

const T = 30_000;
const flat = (s, n = 1200) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const oldLine = (app) => !!(app.line && /3_[34]/.test(app.line));
const L = (app) => (oldLine(app) ? '' : '/en');
const AUTHOR = {ojs: 'ccorino', omp: 'aclark', ops: 'ccorino'};
const SECTION = {ojs: 'Articles', omp: null, ops: 'Preprints'};
const STEP = 'Reviewer Suggestions';

/**
 * As a manager: Settings › Workflow › "Review" › "Setup", read the setting's description, tick "Allow
 * authors to suggest potential reviewers at submission process", "Save" ({save: false} reads only).
 * Returns {offered, description, wasChecked, status} (offered false
 * where the app has no such tab or box). Records rather than throws.
 */
async function enableSuggestions(page, app, {save = true} = {}) {
    const out = {offered: false};
    try {
        await page.goto(app.url(`/index.php/${app.contextPath}${L(app)}/management/settings/workflow`));
        await idle(page);
        const tab = page.getByRole('tab', {name: 'Review', exact: true});
        if (!(await tab.count())) return {...out, tabs: (await page.getByRole('tab').allInnerTexts()).map((t) => flat(t))};
        await tab.first().click();
        await idle(page);
        const side = page.getByRole('tab', {name: 'Setup', exact: true});
        if (await side.count()) await side.first().click();
        const panel = page.locator('#reviewSetup');
        const box = panel.locator('input[name="reviewerSuggestionEnabled"]');
        if (!(await box.waitFor({state: 'attached', timeout: 10_000}).then(() => true).catch(() => false))) return out;
        out.offered = true;
        // the setting's description under its heading "Reviewer Suggestion at Submission"
        const desc = panel.locator('.pkpFormField__description').filter({hasText: 'potential reviewers'}).first();
        out.description = (await desc.count()) ? flat(await desc.innerText()) : null;
        out.wasChecked = await box.isChecked();
        if (!save) return out;
        if (!out.wasChecked) await box.check({force: true});
        const saved = page.waitForResponse((r) => r.request().method() !== 'GET' && /\/contexts\/\d+/.test(r.url()), {timeout: T});
        await panel.locator('form').first().getByRole('button', {name: 'Save', exact: true}).click();
        out.status = (await saved).status();
        await panel.locator('.pkpFormPage__status', {hasText: 'Saved'}).waitFor({timeout: T}).catch(() => {});
    } catch (e) {
        out.error = flat(e.message, 300);
    }
    return out;
}

/** "Author Guidance": the "For Reviewer Suggestion" box's label, help and own text; null box when absent. */
async function reviewerGuidanceBox(page, app) {
    await openAuthorGuidance(page, app);
    const all = await readGuidanceBoxes(page);
    const box = all.error ? null : (all.boxes.find((b) => b.field === 'reviewerSuggestionsHelp') || null);
    return {labels: all.error ? all : all.boxes.map((b) => b.label), box, text: box ? await boxText(page, 'reviewerSuggestionsHelp') : null};
}

/** Every "Author Guidance" box with its own text, by field name (the neighbour read). */
async function allGuidanceTexts(page, app) {
    await openAuthorGuidance(page, app);
    const all = await readGuidanceBoxes(page);
    if (all.error) return all;
    const out = {};
    for (const b of all.boxes) out[b.field] = {label: b.label, text: await boxText(page, b.field)};
    return out;
}

/**
 * The author starts a submission and presses "Continue" until "Reviewer Suggestions" is current
 * (or the rail runs out). Returns {id, rail, reached}.
 */
async function reachSuggestionStep(page, app, title) {
    const id = await beginSubmission(page, app, {title, section: SECTION[app.name]});
    const rail = (await page.locator('.pkpSteps__step__label').allInnerTexts()).map((x) => flat(x, 80));
    let reached = false;
    // no such step on the rail (OPS): nothing to press towards
    if (!rail.some((l) => l.endsWith(STEP))) return {id, rail, reached, current: await currentStep(page)};
    for (let i = 0; i < 8; i++) {
        if ((await currentStep(page)).endsWith(STEP)) { reached = true; break; }
        const next = await pressContinue(page);
        await idle(page);
        if (!next) break;
    }
    if (!reached) reached = (await currentStep(page)).endsWith(STEP);
    return {id, rail, reached, current: await currentStep(page)};
}

/** The text shown above the step's panel (the journal's guidance), verbatim. */
async function stepGuidance(page) {
    const d = page.locator('.semantic-defaults:visible').filter({hasText: 'suggest several potential reviewers'});
    if (!(await d.count())) {
        return {found: false, visible: flat(await page.locator('.semantic-defaults:visible').allInnerTexts().catch(() => []), 600)};
    }
    return {found: true, text: flat(await d.first().innerText())};
}

/**
 * Press "Add Reviewer Suggestion" and read every box of the window: label and help (verbatim).
 * Returns {title, fields:[{label, help}], reason:{label, help}}.
 */
async function readAddWindow(page) {
    const out = {};
    try {
        // the step's one panel and its header button, by place (the interface language may be French)
        const add = page.locator('.listPanel:visible .listPanel__header button').first();
        out.button = flat(await add.innerText());
        await add.click();
        const dlg = page.getByRole('dialog').filter({has: page.locator('iframe[id*="suggestionReason"]')});
        await dlg.locator('iframe[id*="suggestionReason"]').first().waitFor({state: 'attached', timeout: T});
        await idle(page);
        out.title = flat(await dlg.getByRole('heading', {level: 1}).first().innerText().catch(() => null));
        const fields = dlg.locator('.pkpFormField');
        const n = await fields.count();
        out.fields = [];
        for (let i = 0; i < n; i++) {
            const f = fields.nth(i);
            const lab = f.locator('.pkpFormFieldLabel').first();
            const desc = f.locator('.pkpFormField__description').first();
            out.fields.push({
                label: (await lab.count()) ? flat(await lab.innerText()) : null,
                help: (await desc.count()) ? flat(await desc.innerText()) : null,
            });
        }
        out.reason = out.fields.find((f) => f.label && f.label.startsWith('Reasons for suggesting reviewer')) || null;
        out.reasonByPlace = out.fields.find((f) => f.help) || null;
    } catch (e) {
        out.error = flat(e.message, 300);
    }
    return out;
}

/** Administration › Hosted Journals (Presses, Servers) › "Create …", as on screen. Returns the save status. */
async function createJournal(page, app, {name, initials, path}) {
    return createContextOnScreen(page, app, {name, initials, path, email: `${path}@mailinator.com`});
}

/** The bag of another context on the same app (same server, another path). */
function contextBag(app, contextPath) {
    const b = Object.create(app);
    b.contextPath = contextPath;
    return b;
}

module.exports = {T, flat, L, AUTHOR, SECTION, enableSuggestions, reviewerGuidanceBox, allGuidanceTexts,
    reachSuggestionStep, stepGuidance, readAddWindow, createJournal, contextBag};
