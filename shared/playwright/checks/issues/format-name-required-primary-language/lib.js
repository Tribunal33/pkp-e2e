// Helpers for walk.js (U73 A15) {OMP}: a multilingual name or title box of a legacy window
// (the format window's "Name", the chapter window's "Title"), read per language without
// assuming which one the window asks for, and the window's button pressed with what followed
// recorded (the save request sent or not, the errors shown, the window open or closed).
// Requiring this file runs nothing. The French book comes from the U20 A6 walk's lib (the
// submission wizard in a chosen language), the format pages from the U74 A11/A18/A19 walk's lib.
const path = require('path');
const {idle} = require('../../../probe');
const W = require('../author-tags-given-name-alone-other-language/lib');
const F = require('../native-import-loses-trade-details/lib');

const ROOT = path.resolve(__dirname, '../../../../..');
const omp = (file) => require(path.join(ROOT, 'apps/omp/playwright/pages', file));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const {flat} = W;

/** Every box of a multilingual field (`name[en]`, `name[fr_CA]` …): locale, shown, required, its label. */
async function boxes(form, field) {
    return form.locator(`input[name^="${field}["]`).evaluateAll((els) =>
        els.map((e) => ({
            locale: (e.getAttribute('name').match(/\[([^\]]+)\]/) || [])[1],
            shown: !!e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden',
            required: e.hasAttribute('required'),
            ariaRequired: e.getAttribute('aria-required'),
            placeholder: e.getAttribute('placeholder'),
            label: ((document.querySelector(`label[for="${e.id}"]`) || {}).textContent || '').trim() || null,
            value: e.value,
        }))
    );
}

/**
 * Type `value` into the field's box for `locale` as a person does: the box when shown, or else
 * first a click on the shown box of the field (which opens the other languages' boxes under it).
 */
async function typeIn(form, field, locale, value) {
    const box = form.locator(`input[name="${field}[${locale}]"]`);
    if (!(await box.isVisible())) {
        await form.locator(`input[name^="${field}["]:visible`).first().click();
        await box.waitFor({state: 'visible', timeout: 10_000});
    }
    await box.fill(value);
    return {typed: locale, value};
}

/**
 * Press `button` in `form` and record what followed within a few seconds: whether a request to
 * `urlRe` went out and its status, the errors under the boxes (with the box each is for), and
 * whether the window is still open.
 */
async function pressAndRead(page, dialog, form, button, urlRe) {
    const sent = [];
    const onReq = (r) => {
        if (urlRe.test(r.url()) && r.method() === 'POST') sent.push(r.url().replace(/^.*\/\$\$\$call\$\$\$\//, ''));
    };
    page.on('request', onReq);
    const answered = page.waitForResponse((r) => urlRe.test(r.url()) && r.request().method() === 'POST', {timeout: 6000}).catch(() => null);
    await form.getByRole('button', {name: button, exact: true}).click();
    const res = await answered;
    await idle(page).catch(() => {});
    await sleep(1200);
    page.off('request', onReq);
    const open = (await dialog.count()) > 0;
    const errors = open
        ? await dialog.locator('label.error, .error label, .pkp_form_error').evaluateAll((els) =>
              els.filter((e) => e.getClientRects().length).map((e) => ({for: e.getAttribute('for'), text: (e.textContent || '').trim()}))
          ).catch(() => [])
        : [];
    const formError = open ? flat(await dialog.locator('.notifyFormError, #formErrors').first().innerText({timeout: 1000}).catch(() => null), 300) : null;
    return {requestSent: sent.length > 0, requests: sent, status: res ? res.status() : null, windowOpen: open, errors, formError};
}

/** The book's "Publication Formats" page (the dataset's book 4 by its publication; a new book through the side menu). */
async function openFormats(app, page, subId, publicationId) {
    return F.openFormats(app, page, subId, publicationId);
}

/**
 * "Add publication format": the window, its form and its name boxes as first shown. The suite's
 * `openAdd()` waits for the English box, which a book in another language keeps hidden, so the
 * window is awaited by its "Publication Format" list and "OK" instead.
 */
async function openAddFormat(pf) {
    const {FormatWindow} = omp('PublicationFormatPages.js');
    await pf.addLink().click();
    const win = new FormatWindow(pf.page, 'Add publication format');
    await win.kindList().waitFor({state: 'visible', timeout: 30_000});
    await win.okButton().waitFor({state: 'visible', timeout: 30_000});
    await idle(pf.page).catch(() => {});
    return {win, form: win.form(), first: await boxes(win.form(), 'name')};
}

/** The book's "Chapters" page and its "Add Chapter" window: the window and its title boxes. */
async function openAddChapter(app, page, subId) {
    const {WorkflowPage} = require(path.join(ROOT, 'shared/playwright/pages/WorkflowPage.js'));
    const {ChapterList} = omp('ChapterPages.js');
    const frame = new WorkflowPage(page, app.contextPath);
    if (app.line === 'stable-3_5_0') {
        await frame.gotoEditorial(subId, {menuKey: 'publication_chapters'});
    } else {
        await frame.gotoEditorial(subId);
        await frame.selectPage('Chapters');
    }
    const list = new ChapterList(page);
    await list.expectLoaded();
    const win = await list.openAdd();
    return {list, win, form: win.form(), first: await boxes(win.form(), 'title')};
}

/** The aclark French book: "New Submission" in French (Canada) through to "Submit". Returns its id. */
async function submitFrenchBook(page, app, title) {
    const begun = await W.beginInLanguage(page, app, {title, section: null, language: 'French (Canada)'});
    const wizard = await W.toReview(page, app, {abstract: 'u73j Un résumé du livre.', locale: 'fr_CA'});
    await W.submit(page, app);
    return {id: begun.id, languages: begun.languages, wizard};
}

module.exports = {flat, sleep, boxes, typeIn, pressAndRead, openFormats, openAddFormat, openAddChapter, submitFrenchBook};
