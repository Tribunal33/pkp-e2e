// Helpers for walk.js (U13 A10). Requiring this file runs nothing.
const {expect} = require('@playwright/test');
const {screen, record, idle} = require('../../../probe');

const T = 30_000;
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));

/**
 * On an open workflow: the newest version's "References" page, the lines
 * typed into its "References" box, then "Add" (main) or "Save" (3.5, where
 * the box is the page's one field). Resolves with the write's status.
 */
async function addReferences(page, app, frame, lines) {
    const text = lines.join('\n');
    if (app.line === 'stable-3_5_0') {
        await frame.menuLink('References').last().click();
        await idle(page);
        const box = page.locator('[data-cy="workflow-primary-items"] textarea').first();
        await expect(box).toBeVisible({timeout: T});
        await box.fill(text);
        const saved = page.waitForResponse(
            (r) => /\/submissions\/\d+\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET',
            {timeout: T}
        );
        await page.locator('[data-cy="workflow-primary-items"]').getByRole('button', {name: 'Save', exact: true}).click();
        const r = await saved;
        await idle(page);
        record('step3-references-saved', await screen(page));
        return {button: 'Save', status: r.status(), url: rel(r.url())};
    }
    const {ReferencesPage} = require('../../../pages/CitationsPages.js');
    const refs = new ReferencesPage(page, frame);
    // The newest version's entry: with several versions each one's pages sit under its own node.
    const entry = frame.menuLink('References');
    await expect(frame.menuLink('Title & Abstract').or(frame.latestVersionNode()).first()).toBeVisible({timeout: T});
    if (!(await entry.last().isVisible().catch(() => false))) await frame.latestVersionNode().click();
    await expect(entry.last()).toBeVisible({timeout: T});
    await entry.last().click();
    await refs.expectLoaded();
    const added = page.waitForResponse((r) => /importAdditionalCitations$/.test(new URL(r.url()).pathname), {timeout: T});
    await refs.addBox().fill(text);
    await refs.addButton().click();
    const r = await added;
    await expect(refs.addBox()).toHaveValue('', {timeout: T}).catch(() => {});
    await idle(page);
    record('step3-references-added', await screen(page));
    return {button: 'Add', status: r.status(), url: rel(r.url())};
}

/** The landing page's "References" block: each paragraph's text and its links (text, address). */
async function readReferences(page) {
    const block = page.locator('.item.references');
    const heading = await block.locator('.label').first().innerText().catch(() => null);
    const paragraphs = await block.locator('.value p').evaluateAll((ps) => ps.map((p) => ({
        text: p.innerText.trim(),
        html: p.innerHTML.trim(),
        links: [...p.querySelectorAll('a')].map((a) => ({text: a.textContent, href: a.getAttribute('href'), target: a.getAttribute('target')})),
    })));
    return {url: rel(page.url()), heading: heading && heading.trim(), paragraphs};
}

module.exports = {T, rel, addReferences, readReferences};
