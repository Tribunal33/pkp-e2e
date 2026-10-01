// Helpers for walk.js (U21 A18, A4). Requiring this file runs nothing.
const {waitForEditorReady} = require('../../../support/richtext.js');

const T = 30_000;

/** Type into a rich-text box of the wizard by its control id, replacing what it holds, one key every `delay` ms. */
async function typeRichSlowly(page, id, text, delay = 250) {
    await page.locator(`#${id}_ifr`).waitFor({state: 'visible', timeout: T});
    await waitForEditorReady(page, id);
    await page.frameLocator(`#${id}_ifr`).locator('body').click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type(text, {delay});
}

/** The text a rich-text box of the wizard holds. */
function richText(page, id) {
    return page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent({format: 'text'}) : null), id).catch(() => null);
}

/** The English title a wizard save carries (form-encoded `title[en]`), or undefined when it carries none. */
function titleOf(postData) {
    if (!postData) return undefined;
    const p = new URLSearchParams(postData);
    return p.has('title[en]') ? p.get('title[en]') : undefined;
}

module.exports = {typeRichSlowly, richText, titleOf};
