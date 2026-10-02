// Helpers of walk.js here (U28 A15 and U03 A19, joined to
// docs/issues/U09-A19-static-page-content-change-lost-on-close.md). Requiring this file runs
// nothing. Every helper presses what a person presses, or reads what the screen shows. Page objects
// are required inside the functions (probe kit rule).
const {idle, screen, record, shot} = require('../../../probe');

const T = 30_000;
const QUESTION = 'The data on this form has changed. Do you wish to continue without saving?';
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Per app, on PKP's default test dataset: a submission with an unanswered request to `jjanssen`. */
const REVIEWS = {ojs: 12, omp: 17};

async function snap(page, name) {
    record(name, await screen(page));
    await shot(page, name).catch(() => {});
}

function wizard(page, app) {
    const {ReviewWizardPage} = require('../../../pages/ReviewerPages.js');
    return new ReviewWizardPage(page, app.contextPath);
}

function profile(page, app) {
    const {ProfilePage} = require('../../../pages/ProfilePage.js');
    return new ProfilePage(page, app.contextPath);
}

/** A rich-text box of a form, by the start of its field's id (the first form language's). */
function box(page, formId, field) {
    const not = field === 'comments' ? ':not([id^="commentsPrivate"])' : '';
    return page.locator(`form#${formId} iframe[id^="${field}"]${not}`).first();
}

/** Wait until the box's editor is up, then its text as shown. */
async function boxText(page, formId, field) {
    const frame = box(page, formId, field);
    await frame.waitFor({timeout: T});
    const id = (await frame.getAttribute('id')).replace(/_ifr$/, '');
    await page.waitForFunction((i) => { const e = window.tinymce && window.tinymce.get(i); return !!(e && e.initialized); }, id, {timeout: T});
    return flat(await frame.contentFrame().locator('body').innerText());
}

/** Click into the box and type from the keyboard, as a person does. Nothing else is touched. */
async function typeBox(page, formId, field, text) {
    await boxText(page, formId, field);
    const body = box(page, formId, field).contentFrame().locator('body');
    await body.click();
    await page.keyboard.press('ControlOrMeta+End');
    await body.pressSequentially(text, {delay: 15});
    await sleep(300);
    return flat(await body.innerText());
}

/**
 * Do `action` (a tab press, a reload, an address typed) and say whether the browser asked: the
 * form's own question (a confirm) or the leave-page question (beforeunload, always left).
 * `answer` 'cancel' keeps the form, 'ok' leaves it.
 */
async function asking(page, action, {answer = 'ok'} = {}) {
    let asked = null;
    const handler = async (d) => {
        asked = d.type() === 'beforeunload' ? 'beforeunload' : d.message();
        if (answer === 'ok' || d.type() === 'beforeunload') await d.accept(); else await d.dismiss();
    };
    page.on('dialog', handler);
    try {
        await action();
        await sleep(800); // the question is synchronous in the press; what the press loads follows
        await idle(page).catch(() => {});
    } finally {
        page.off('dialog', handler);
    }
    return asked;
}

/** The reviewer's wizard, opened by its address; with `accept`, steps 1 and 2 are taken to step 3. */
async function openReview(page, app, {accept = false} = {}) {
    const w = wizard(page, app);
    await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewer/submission/${REVIEWS[app.name]}`));
    await w.expectOpen();
    if (accept) {
        await w.accept();
        await w.continueToStep3();
    }
    await w.expectStep(3);
    await w.step3Form.waitFor({timeout: T});
    await idle(page);
    return w;
}

/** Press a step's tab of the review; returns the question (or null) and the tab selected after. */
async function pressStep(page, w, step, opts) {
    const asked = await asking(page, () => w.tab(step).click(), opts);
    return {asked, selected: flat(await page.locator('#reviewTabs li.ui-tabs-active').first().innerText().catch(() => null), 60)};
}

/** Press a tab of the Profile page; returns the question (or null) and the tab selected after. */
async function pressProfileTab(page, p, tab, opts) {
    const asked = await asking(page, () => p.tabLink(tab).click(), opts);
    return {asked, selected: flat(await page.locator('#profileTabs > ul > li.ui-tabs-active').first().innerText().catch(() => null), 60)};
}

/** Click the page's heading, as the focus leaves the form when a person goes to the address bar. */
async function leaveFocus(page) {
    await page.locator('h1').first().click();
    await sleep(300);
}

module.exports = {T, QUESTION, REVIEWS, flat, sleep, snap, wizard, profile, box, boxText, typeBox, asking, openReview, pressStep, pressProfileTab, leaveFocus};
