// Helpers for walk.js here and for ../body-text-side-section-needs-two-presses/walk.js
// (U48 A16, A17). Requiring this file runs nothing.
const {expect} = require('@playwright/test');
const {idle, screen, record} = require('../../../probe');

const T = 30_000;
const SECTIONS = ['references', 'selected-element', 'outline'];

/** The workflow panel and the Body Text page object, required inside forEachApp (probe kit rule). */
function pages(page, app) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {BodyTextPage} = require('../../../pages/JatsBodyTextPages.js');
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    return {frame, body: new BodyTextPage(page, frame)};
}

/**
 * On the open workflow: "Publication" › "References", the lines typed into the
 * "References" box, then "Add". Resolves with the write's status.
 */
async function addReferences(page, frame, lines) {
    const {ReferencesPage} = require('../../../pages/CitationsPages.js');
    const refs = new ReferencesPage(page, frame);
    await refs.open();
    const added = page.waitForResponse((r) => /importAdditionalCitations$/.test(new URL(r.url()).pathname), {timeout: T});
    await refs.addBox().fill(lines.join('\n'));
    await refs.addButton().click();
    const r = await added;
    await expect(refs.addBox()).toHaveValue('', {timeout: T}).catch(() => {});
    await idle(page);
    return {status: r.status()};
}

/** Which of the three side sections are open, read after the toggle events have run. */
async function sectionStates(page, body) {
    await page.waitForTimeout(600);
    const out = {};
    for (const key of SECTIONS) {
        out[key] = await body.section(key).evaluate((d) => d.open);
    }
    return out;
}

/** Each listed reference: its text and whether its "Cite" is disabled. */
async function citeStates(body) {
    const items = body.referenceItems();
    const n = await items.count();
    const out = [];
    for (let i = 0; i < n; i++) {
        const item = items.nth(i);
        out.push({
            text: (await item.locator('.reference-text').innerText()).trim(),
            cite: (await body.citeButton(item).innerText()).trim(),
            disabled: await body.citeButton(item).isDisabled(),
        });
    }
    return out;
}

/** What the editor holds: its text, the in-text citations' texts and the "Unsaved Changes" badge. */
async function editorState(body) {
    return {
        text: await body.editorText(),
        citations: await body.citations().allInnerTexts(),
        unsaved: await body.unsavedBadge().isVisible(),
    };
}

/** Record the screen under `key`, returning it. */
async function snap(page, key) {
    const s = await screen(page);
    record(key, s);
    return s;
}

module.exports = {T, SECTIONS, pages, addReferences, sectionStates, citeStates, editorState, snap};
