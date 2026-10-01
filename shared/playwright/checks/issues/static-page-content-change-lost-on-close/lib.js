// Helpers for the U09 A19 walk (static-page-content-change-lost-on-close).
// Plugin switching and the custom block window come from the sibling libs.
// Requiring this file runs nothing.
const L = require('../setup-save-refused-disabled-block/lib');

const {T, sleep, flat} = L;

/** What a rich-text box's editor holds, as plain text. */
async function editorText(page, textarea) {
    const id = await textarea.getAttribute('id', {timeout: T});
    return page.evaluate((x) => window.tinymce.get(x).getContent({format: 'text'}).trim(), id);
}

/**
 * Press a window's close control (the back arrow). Returns whether the
 * browser asked its question and its words, and whether the window closed.
 * `answer` 'cancel' keeps the window ("Cancel"), 'ok' leaves it ("OK").
 */
async function closeWindow(page, closeButton, form, {answer = 'ok'} = {}) {
    let asked = null;
    const handler = async (d) => { asked = d.message(); if (answer === 'ok') await d.accept(); else await d.dismiss(); };
    page.on('dialog', handler);
    await closeButton.click();
    await Promise.race([
        form.waitFor({state: 'hidden', timeout: 5000}).catch(() => {}),
        (async () => { for (let i = 0; i < 50 && asked === null; i++) await sleep(100); })(),
    ]);
    await sleep(500);
    page.off('dialog', handler);
    return {asked, closed: !(await form.isVisible().catch(() => false))};
}

/**
 * Go to another address with the window open. Returns whether the browser
 * asked "Leave site?" (a beforeunload question, answered "Leave").
 */
async function leavePage(page, url) {
    let asked = null;
    const handler = async (d) => { asked = d.type(); await d.accept(); };
    page.on('dialog', handler);
    await page.goto(url, {timeout: T}).catch(() => {});
    await sleep(500);
    page.off('dialog', handler);
    return {asked};
}

module.exports = {...L, editorText, closeWindow, leavePage, T, sleep, flat};
