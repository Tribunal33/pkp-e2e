// @ts-check
/**
 * @file shared/playwright/support/richtext.js
 *
 * Readiness of a TinyMCE rich-text box before anything is typed into it.
 *
 * TinyMCE makes its iframe's body visible and editable before it has
 * fetched its content stylesheets; when they arrive it loads the initial
 * content over whatever was typed, and a Vue field (tinymce-vue) binds its
 * v-model to the editor only then, after putting the model's value back.
 * Text typed into the body earlier shows for a moment, is replaced by the
 * field's old value, and never reaches the form, so nothing is saved for
 * it. The stylesheets come from the test's own single-threaded worker
 * server, so under load the window is seconds wide (patterns.md "UI
 * realities": any TinyMCE box must be `initialized` before typing; U21 S3,
 * `.reports/flake-s28/u21s3-autosave/diagnosis.md`).
 */
const {expect} = require('@playwright/test');

/**
 * Wait until the TinyMCE editor with this id (a Vue field's control id,
 * whose iframe is `#{id}_ifr`) reports `initialized`. The poll runs in the
 * test process, so a page whose clock is installed (`page.clock`) does not
 * hold it.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} editorId
 * @param {{timeout?: number}} [options]
 */
async function waitForEditorReady(page, editorId, {timeout = 30_000} = {}) {
    await expect
        .poll(
            () =>
                page.evaluate(
                    // @ts-ignore tinymce is the page's global
                    (id) => Boolean(window.tinymce?.get(id)?.initialized),
                    editorId
                ),
            {timeout, message: `the rich-text editor "${editorId}" is initialized`}
        )
        .toBe(true);
}

/**
 * The editor id behind a TinyMCE iframe locator (`{id}_ifr`), for a box
 * found by position rather than by its control id.
 *
 * @param {import('@playwright/test').Locator} iframe
 */
async function editorIdOf(iframe) {
    const id = await iframe.getAttribute('id');
    if (!id || !id.endsWith('_ifr')) {
        throw new Error(`not a TinyMCE iframe: id "${id}"`);
    }
    return id.slice(0, -'_ifr'.length);
}

module.exports = {waitForEditorReady, editorIdOf};
