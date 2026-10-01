// Helpers for walk.js (U13 OJS8). Requiring this file runs nothing.
const path = require('path');
const {idle, shot, screen, loc} = require('../../../probe');
const {T, sleep, flat} = require('../publication-facts-settings-funding-warning/lib');

/**
 * A legacy form's date box as it stands: the visible box
 * (`<field>-removed`), the hidden field the form posts (`<field>`) and
 * any message the form shows beside the box.
 */
async function readDate(form, field) {
    const box = form.locator(`[name="${field}-removed"]`).first();
    const posted = form.locator(`input[type=hidden][name="${field}"]`).first();
    const wrap = box.locator('xpath=ancestor::div[1]');
    return {
        box: await box.inputValue().catch(() => null),
        posted: await posted.inputValue().catch(() => null),
        message: flat(await wrap.locator('label.error:visible').allInnerTexts().then((a) => a.join(' | ')).catch(() => ''), 200),
    };
}

/** Type a date into a date box from the keyboard, as a person does: select all, Delete, the keys, Tab. */
async function typeDate(page, form, field, text) {
    const box = form.locator(`[name="${field}-removed"]`).first();
    await loc(page, `date box ${field}`, box);
    await box.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    if (text) await page.keyboard.type(text, {delay: 40});
    await page.keyboard.press('Tab');
    await sleep(300);
    return readDate(form, field);
}

/**
 * Press the form's "OK" and read what follows, whether the form sends its
 * save or refuses in the browser: the save request (if one left), the
 * notices, whether the form is still open and the date boxes' messages.
 */
async function pressOk(page, form, fields, shotName) {
    let sent = null;
    const onRequest = (r) => {
        if (r.method() === 'POST' && /\$\$\$call\$\$\$|manage/.test(r.url())) sent = r;
    };
    page.on('request', onRequest);
    const notice = page.getByText('Your changes have been saved.').first();
    await form.getByRole('button', {name: 'OK', exact: true}).click();
    const deadline = Date.now() + 6_000;
    while (!sent && Date.now() < deadline) await sleep(200);
    page.off('request', onRequest);
    let status = null;
    if (sent) status = await sent.response().then((r) => (r ? r.status() : null)).catch(() => null);
    await idle(page);
    const saidSaved = await notice.waitFor({state: 'visible', timeout: sent ? 8_000 : 1_500}).then(() => true, () => false);
    await sleep(800);
    const open = await form.isVisible().catch(() => false);
    const sc = await screen(page);
    await shot(page, shotName).catch(() => {});
    const out = {saveSent: !!sent, saveUrl: sent ? sent.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 160) : null, saveStatus: status, saidSaved, notices: sc.notices, windowOpen: open};
    if (open) {
        out.dates = {};
        for (const f of fields) out.dates[f] = await readDate(form, f);
    }
    return out;
}

/** A reviewer row's "More Actions" › "Edit": the Edit Review window's form, settled. */
async function openEditReview(page, app, submissionId, reviewerName) {
    const review = require(path.join(app.suiteDir, 'pages', 'ReviewStagePages.js'));
    const {waitForLegacyFormSettled} = require('../../../support/legacy.js');
    const wf = new (review.WorkflowPage || review.DecisionWorkflow)(page, app.contextPath); // OJS, OMP
    await wf.gotoEditorial(submissionId);
    const row = wf.reviewerRow(reviewerName);
    await row.waitFor({state: 'visible', timeout: T});
    await row.getByRole('button', {name: 'More Actions'}).click();
    await page.getByRole('menu').getByRole('menuitem', {name: 'Edit', exact: true}).click();
    const form = page.locator('form#editReviewForm');
    const modal = page.getByRole('dialog').filter({has: form});
    await form.waitFor({state: 'visible', timeout: T});
    await waitForLegacyFormSettled(page, modal);
    await loc(page, 'Edit Review window', modal);
    return form;
}

module.exports = {T, sleep, flat, readDate, typeDate, pressOk, openEditReview};
