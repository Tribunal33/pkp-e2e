// Helpers of the U27 A22, OMP6 and A39 issue walks (walk.js here, and the walks in
// ../press-review-form-line-says-this-journal/ and ../competing-interests-no-reads-declared-yes/).
// Requiring this file runs nothing. Every helper drives the screens a person uses: the workflow's
// "Reviewers" panel, its "Review Details" window and the "Modify Review" window stacked over it,
// Settings › Workflow › "Review" › "Reviewer Guidance", and the header's "Activity Log".
// On 3.5 "Read Review" opens the older window; the helpers record what is there rather than throw
// where a 3.5 screen lacks a control (the caller decides).
const {idle} = require('../../../probe');
const RF = require('../review-form-save-for-later-required-fields/lib.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per app, on PKP's default test dataset (docs/process/dataset.md). */
const CASES = {
    // a completed review, opened with "Read Review"
    done: {
        ojs: {id: 7, title: 'Developing efficacy beliefs in the classroom', reviewer: 'Paul Hudson'},
        omp: {id: 16, title: "A Designer's Log: Case Studies in Instructional Design", reviewer: 'Adela Gallego'},
    },
    // an unanswered request, given a review form
    open: {
        ojs: {id: 12, reviewer: 'Julie Janssen'},
        omp: {id: 17, reviewer: 'Julie Janssen'},
    },
};

const openWorkflow = RF.openWorkflow;
const giveReviewForm = RF.giveReviewForm;
const createActiveReviewForm = RF.createActiveReviewForm;

/** The reviewer's row in the "Reviewers" panel. */
function reviewerRow(page, name) {
    return page.locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: name}).first();
}

/** The top dialog, once its text names `needle`, is long enough and is no longer loading. */
async function awaitTopDialog(page, needle, minLength = 150) {
    await page.waitForFunction(([n, min]) => {
        const d = [...document.querySelectorAll('[role="dialog"]')].filter((e) => e.offsetWidth || e.offsetHeight);
        const last = d[d.length - 1];
        return !!last && last.innerText.includes(n) && last.innerText.length > min && !/Loading/.test(last.innerText);
    }, [needle, minLength], {timeout: T}).catch(() => {});
    await idle(page);
    await sleep(1000); // the review content arrives after the window's frame
    return page.getByRole('dialog').last();
}

/** "Read Review" on the row; returns the window. */
async function openReadReview(page, name) {
    const row = reviewerRow(page, name);
    await row.waitFor({timeout: T});
    await row.getByRole('button', {name: 'Read Review', exact: true}).click();
    return awaitTopDialog(page, name);
}

/** The row's "More Actions" entries; with `choose`, that entry is pressed and the window it opens returned. */
async function rowMenu(page, name, choose = null) {
    const row = reviewerRow(page, name);
    await row.waitFor({timeout: T});
    await row.getByRole('button', {name: 'More Actions'}).click();
    const menu = page.getByRole('menu');
    await menu.getByRole('menuitem').first().waitFor({timeout: T});
    const items = (await menu.getByRole('menuitem').allInnerTexts()).map((t) => flat(t, 80));
    if (!choose || !items.includes(choose)) {
        await row.getByRole('button', {name: 'More Actions'}).click(); // closes it (never Escape)
        return {items, dialog: null};
    }
    await menu.getByRole('menuitem', {name: choose, exact: true}).click();
    return {items, dialog: await awaitTopDialog(page, name)};
}

/**
 * What a review window offers: its title, its text, its buttons and links, and every upload
 * control in it (a control named "Upload…", a file input).
 */
async function readWindow(dialog) {
    const names = async (role) => (await dialog.getByRole(role).evaluateAll((els) =>
        els.filter((e) => e.offsetWidth || e.offsetHeight).map((e) => (e.getAttribute('aria-label') || e.innerText || '').replace(/\s+/g, ' ').trim())))
        .filter(Boolean);
    const buttons = await names('button');
    const links = await names('link');
    return {
        title: flat(await dialog.getAttribute('aria-label').catch(() => null)) ||
            flat(await dialog.getByRole('heading').first().innerText().catch(() => null), 200),
        text: flat(await dialog.innerText(), 6000),
        buttons,
        links,
        uploadControls: [...buttons, ...links].filter((t) => /upload/i.test(t)),
        fileInputs: await dialog.locator('input[type="file"]').count(),
    };
}

/** The smallest element of the window whose text starts with `start` (a RegExp source or a string): the guidance. */
async function paragraph(dialog, start) {
    const src = start instanceof RegExp ? start.source : String(start);
    return dialog.evaluate((root, source) => {
        const re = new RegExp(source);
        const flatten = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const hits = [...root.querySelectorAll('p, div, span')].filter((e) => (e.offsetWidth || e.offsetHeight) && re.test(flatten(e.innerText)));
        hits.sort((a, b) => flatten(a.innerText).length - flatten(b.innerText).length);
        return hits.length ? flatten(hits[0].innerText).slice(0, 800) : null;
    }, src);
}

/**
 * "Modify Review" in the "Review Details" window, then the dialog's own "Modify Review".
 * Returns {confirm, dialog} (dialog null when the window offers no "Modify Review", as on 3.5).
 */
async function openModify(page, details) {
    const button = details.getByRole('button', {name: 'Modify Review', exact: true});
    if (!(await button.count())) return {confirm: null, dialog: null};
    await button.click();
    const confirm = page.getByRole('dialog').filter({hasText: 'Modify this review?'}).last();
    await confirm.waitFor({timeout: T});
    const confirmText = flat(await confirm.innerText(), 400);
    await confirm.getByRole('button', {name: 'Modify Review', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: /^Modify Review/}).last();
    await dialog.waitFor({timeout: T});
    await dialog.getByRole('button', {name: 'Save Changes', exact: true}).waitFor({timeout: T});
    await idle(page);
    await sleep(1000);
    return {confirm: confirmText, dialog};
}

/** A window's own "Cancel" (never Escape, which closes the workflow too); waits until it is gone. */
async function cancelWindow(page, dialog) {
    const button = dialog.getByRole('button', {name: 'Cancel', exact: true});
    // a legacy (3.5) window's "Cancel" is a link (patterns.md pitfall 7)
    await ((await button.count()) ? button : dialog.getByRole('link', {name: 'Cancel', exact: true})).last().click();
    await dialog.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await sleep(700); // the side-modal slot (patterns.md pitfall 4)
    await idle(page);
}

/** The line under a group heading of a window (a review form's title): the group's description. */
async function groupLine(dialog, heading) {
    return dialog.evaluate((root, h) => {
        const flatten = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const heads = [...root.querySelectorAll('h2, h3, legend, .pkpFormGroup__heading, .pkpFormGroupLabel')]
            .filter((e) => flatten(e.innerText) === h);
        if (!heads.length) return null;
        const group = heads[0].closest('.pkpFormGroup, fieldset') || heads[0].parentElement;
        const desc = group.querySelector('.pkpFormGroup__description, .pkpFormGroupDescription, p');
        return {heading: h, description: desc ? flatten(desc.innerText) : null, group: flatten(group.innerText).slice(0, 600)};
    }, heading);
}

/** Settings › Workflow › "Review" › "Reviewer Guidance": type the policy into "Competing Interests", "Save". */
async function setCompetingInterestsPolicy(page, app, text) {
    const {ReviewSettingsPage} = require('../../../pages/ReviewSettingsPages.js');
    const settings = new ReviewSettingsPage(page, app.contextPath);
    await settings.goto('Reviewer Guidance');
    await idle(page);
    await settings.guidance.typeInto('competingInterests', text);
    await settings.guidance.save();
    return {saved: true};
}

/**
 * In the "Modify Review" window: the "Competing Interests" answer, then "Save Changes".
 * `statement` null chooses "I do not have any competing interests"; a string chooses the other
 * answer and types it into the box. Returns the request's body and status and whether the window closed.
 */
async function saveCompetingInterests(page, modify, statement) {
    const out = {};
    const radios = (await modify.getByRole('radio').evaluateAll((els) =>
        els.map((e) => ({label: (e.labels && e.labels[0] ? e.labels[0].innerText : '').replace(/\s+/g, ' ').trim(), checked: e.checked}))));
    out.radiosBefore = radios;
    if (statement == null) {
        await modify.getByRole('radio', {name: 'I do not have any competing interests'}).check();
    } else {
        await modify.getByRole('radio', {name: /I may have competing interests/}).check();
        const body = modify.frameLocator('iframe[id*="competingInterests"]').first().locator('body');
        await body.waitFor({timeout: T});
        await body.click();
        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
        await page.keyboard.press('Delete');
        await body.pressSequentially(statement, {delay: 10});
    }
    await sleep(500);
    const sent = page.waitForRequest((r) => /reviewAssignments\/\d+\/review/.test(r.url()) && r.method() !== 'GET', {timeout: 15_000}).catch(() => null);
    await modify.getByRole('button', {name: 'Save Changes', exact: true}).click();
    // A publicly visible review asks first (editor.review.saveChanges.title); press its "Save Changes".
    const ask = page.getByRole('dialog').filter({hasText: 'Save Changes'}).filter({hasNot: page.locator('iframe')}).last();
    const request = await sent;
    if (!request && await ask.count()) {
        await ask.getByRole('button', {name: 'Save Changes', exact: true}).click().catch(() => {});
    }
    const req = request || await page.waitForRequest((r) => /reviewAssignments\/\d+\/review/.test(r.url()) && r.method() !== 'GET', {timeout: 10_000}).catch(() => null);
    if (req) {
        out.body = req.postData();
        const res = await req.response();
        out.status = res ? res.status() : null;
    }
    await modify.waitFor({state: 'hidden', timeout: T}).then(() => { out.closed = true; }, () => { out.closed = false; });
    await sleep(700);
    await idle(page);
    return out;
}

/**
 * The header's "Activity Log": History's lines carrying `needle`, and, for each (top to bottom),
 * its arrow, the strip's links, and the window "View changes" opens (its text), closed again.
 */
async function viewChanges(page, needle) {
    const out = {lines: [], views: []};
    const wf = page.getByRole('dialog').first();
    await page.getByRole('button', {name: 'Activity Log', exact: true}).first().click();
    const log = page.getByRole('dialog', {name: 'Activity Log & Notes', exact: true});
    await log.waitFor({timeout: T});
    const rows = log.locator('tbody tr.gridRow');
    await rows.first().waitFor({timeout: T});
    await idle(page);
    out.lines = (await rows.allInnerTexts()).map((t) => flat(t, 300));
    const hits = rows.filter({hasText: needle});
    const n = await hits.count();
    for (let i = 0; i < n; i++) {
        const row = hits.nth(i);
        const v = {line: flat(await row.innerText(), 300)};
        await row.locator('a.show_extras').click();
        const strip = row.locator('xpath=following-sibling::tr[1]');
        await strip.getByRole('link').first().waitFor({timeout: T});
        v.strip = (await strip.getByRole('link').allInnerTexts()).map((t) => flat(t, 60));
        const link = strip.getByRole('link', {name: 'View changes', exact: true});
        if (await link.count()) {
            const before = await page.getByRole('dialog').count();
            await link.click();
            await page.waitForFunction((b) => document.querySelectorAll('[role="dialog"]').length > b, before, {timeout: T}).catch(() => {});
            const win = page.getByRole('dialog').last();
            await win.getByText(/Competing Interests|Comments/).first().waitFor({timeout: T}).catch(() => {});
            await idle(page);
            v.window = {title: flat(await win.getAttribute('aria-label').catch(() => null)), text: flat(await win.innerText(), 1500)};
            const close = win.getByRole('button', {name: /^Close/}).first();
            await close.click();
            await win.waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await sleep(700);
        }
        out.views.push(v);
    }
    await log.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
    await log.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    void wf;
    return out;
}

module.exports = {
    T, sleep, flat, CASES, openWorkflow, giveReviewForm, createActiveReviewForm, reviewerRow, awaitTopDialog,
    openReadReview, rowMenu, readWindow, paragraph, openModify, cancelWindow, groupLine,
    setCompetingInterestsPolicy, saveCompetingInterests, viewChanges,
};
