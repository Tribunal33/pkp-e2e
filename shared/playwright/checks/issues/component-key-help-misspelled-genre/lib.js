// Helpers of walk.js (issue report docs/issues/U58-A8-component-key-help-misspelled-genre.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle} = require('../../../probe');
const {flat, L} = require('../section-editors-not-assigned-second-journal/lib.js');

const T = 30_000;

/**
 * Settings › Workflow › "Submission" › "Components", by the page's address in the given interface
 * language (default the app's English segment), then the side tab pressed. Element ids, not words,
 * so the same helper serves French. Returns the list's grid.
 */
async function openComponents(page, app, locale = null) {
    const seg = locale ? `/${locale}` : L(app);
    await page.goto(app.url(`/index.php/${app.contextPath}${seg}/management/settings/workflow`));
    await page.locator('#submission').waitFor({state: 'visible', timeout: T});
    await page.locator('#components-button').click();
    const grid = page.locator('#components [id^="component-grid-settings-genre"]').first();
    await grid.locator('tbody tr.gridRow').first().waitFor({state: 'visible', timeout: T});
    await idle(page);
    return grid;
}

/** The list's heading and header links, as the screen shows them. */
async function readList(page, grid) {
    return {
        sideTab: flat(await page.locator('#components-button').innerText()),
        heading: flat(await grid.locator('.header').getByRole('heading').first().innerText().catch(() => null)),
        headerLinks: (await grid.locator('.header ul.actions a:visible').allInnerTexts()).map((x) => flat(x, 80)),
    };
}

/** "Add a Component" (the header link, found by its action id), then the window once loaded. */
async function openAddWindow(page, grid) {
    await grid.locator('.header ul.actions a[id*="addGenre"]').first().click();
    const form = page.locator('form#genreForm');
    await form.locator('input[name="key"]').waitFor({state: 'visible', timeout: T});
    await idle(page);
    return form;
}

/**
 * The window: its heading, and every section in screen order with its label and its help (the
 * `label.description` under it), verbatim. Records rather than throws.
 */
async function readWindow(page, form) {
    const out = {};
    try {
        const dialog = page.getByRole('dialog').filter({has: form});
        out.heading = flat(await dialog.getByRole('heading', {level: 1}).first().innerText().catch(() => null));
        out.sections = await form.locator('.section').evaluateAll((els) => els.map((el) => {
            const t = (n) => (n ? n.textContent.replace(/\s+/g, ' ').trim() : null);
            const desc = el.querySelector(':scope > label.description');
            const label = el.querySelector(':scope > label:not(.description), :scope > span.label, :scope > ul > label');
            const field = el.querySelector('input[name], select[name]');
            return {label: t(label), help: t(desc), field: field ? field.getAttribute('name') : null};
        }).filter((s) => s.label || s.help));
        out.keyHelp = (out.sections.find((s) => s.field === 'key') || {}).help || null;
    } catch (e) {
        out.error = flat(e.message, 300);
    }
    return out;
}

/** The window's "Cancel" link, then wait for it to go. */
async function cancelWindow(page, form) {
    await form.locator('a.cancelButton, a:has-text("Cancel"), a:has-text("Annuler")').first().click();
    await form.waitFor({state: 'detached', timeout: T});
    await idle(page);
}

module.exports = {openComponents, readList, openAddWindow, readWindow, cancelWindow};
