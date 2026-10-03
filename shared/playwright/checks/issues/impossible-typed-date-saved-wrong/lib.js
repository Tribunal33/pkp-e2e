// Helpers for walk.js (U13 OJS8) and walk-a16.js (U27 A16). Requiring this file runs nothing.
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

// U27 A16 (joined): the Add Reviewer window, and the reviewer's email.
/**
 * On the open workflow: "Add Reviewer", search the list, press the entry's "Select Reviewer".
 * Returns the Add Reviewer window with its form open and settled, nothing pressed after.
 */
async function openAddReviewer(page, modal, {search, name}) {
    const {waitForLegacyFormSettled} = require('../../../support/legacy.js');
    await modal.locator('[data-cy="reviewer-manager"]').getByRole('button', {name: 'Add Reviewer', exact: true}).click();
    const win = page.getByRole('dialog').filter({has: page.locator('.listPanel--selectReviewer')});
    const box = win.locator('.listPanel--selectReviewer input.pkpSearch__input');
    await box.waitFor({timeout: T});
    await box.fill(search);
    await box.press('Enter');
    const item = win.locator('.listPanel--selectReviewer .listPanel__item').filter({hasText: name});
    await item.waitFor({timeout: T});
    await page.waitForFunction(() => {
        const textarea = document.querySelector('#reviewerFormFooter textarea[name="personalMessage"]');
        const mce = window.tinyMCE || window.tinymce;
        return !!(textarea && mce && mce.get(textarea.id) && mce.get(textarea.id).initialized);
    }, undefined, {timeout: T});
    await idle(page);
    const pick = item.getByRole('button', {name: new RegExp(`^Select ${name}`)});
    for (let i = 0; i < 6 && !(await win.locator('#regularReviewerForm').isVisible().catch(() => false)); i++) {
        await pick.first().click({timeout: 5000}).catch(() => {});
        await win.locator('#regularReviewerForm').waitFor({timeout: 3000}).catch(() => {});
    }
    await idle(page);
    const letter = win.frameLocator('iframe[id^="personalMessage"]').last().locator('body');
    for (let i = 0; i < 60 && !((await letter.innerText().catch(() => '')).trim()); i++) await sleep(500); // the request letter arrives by AJAX
    await waitForLegacyFormSettled(page, win).catch(() => {});
    return win;
}

/**
 * Press the Add Reviewer window's "Add Reviewer" and read what follows: the save request and its
 * status, whether the window is still open, any message beside the date boxes. Never throws.
 */
async function pressAdd(page, win, shotName) {
    let sent = null;
    const onRequest = (r) => {
        if (r.method() === 'POST' && /update-reviewer|updateReviewer/i.test(r.url())) sent = r;
    };
    page.on('request', onRequest);
    await win.getByRole('button', {name: 'Add Reviewer', exact: true}).click();
    const deadline = Date.now() + 6_000;
    while (!sent && Date.now() < deadline) await sleep(200);
    page.off('request', onRequest);
    let status = null;
    if (sent) status = await sent.response().then((r) => (r ? r.status() : null)).catch(() => null);
    await idle(page);
    await sleep(1500);
    const open = await win.locator('#regularReviewerForm').isVisible().catch(() => false);
    const sc = await screen(page);
    await shot(page, shotName).catch(() => {});
    const out = {saveSent: !!sent, saveStatus: status, notices: sc.notices, windowOpen: open};
    if (open) {
        out.dates = {};
        for (const f of ['responseDueDate', 'reviewDueDate']) out.dates[f] = await readDate(win, f);
    }
    return out;
}

/** The newest email to `to` since `since` whose subject matches: subject and the lines naming a date. */
async function mailWithDates(app, to, since, subject) {
    const deadline = Date.now() + T;
    for (;;) {
        const found = await app.mail._search({to, since});
        for (const m of found.messages || []) {
            const full = await app.mail.fullMessage(m.ID);
            if (!subject.test(full.Subject || '')) continue;
            if (!(full.HTML || full.Text || '').includes(new URL(app.baseURL).host)) continue; // another install's mail
            const text = (full.Text || (full.HTML || '').replace(/<[^>]+>/g, '\n')).split('\n').map((l) => flat(l, 200)).filter(Boolean);
            return {subject: full.Subject, dateLines: text.filter((l) => /\d{4}-\d{2}-\d{2}|due|by/i.test(l)).slice(0, 12)};
        }
        if (Date.now() > deadline) return {subject: null, note: `no email ${subject} to ${to}`};
        await sleep(1000);
    }
}

module.exports = {T, sleep, flat, readDate, typeDate, pressOk, openEditReview, openAddReviewer, pressAdd, mailWithDates};
