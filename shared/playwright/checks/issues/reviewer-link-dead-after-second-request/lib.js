// Helpers of walk.js here and of ../reminder-window-kills-reviewer-link/walk.js (spec U28, register
// A9). Requiring this file runs nothing. Every helper drives the screens a person uses: Settings ›
// Workflow › Review › Setup, the workflow's "Reviewers" panel ("Add Reviewer", the row's "Edit" and
// "Send Reminder") and a reviewer's emailed link opened in a browser that is not signed in.
const {idle, screen, launch, record, shot, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const SETTING = 'Include a secure link in the email invitation to reviewers.';

/** Per app, on PKP's default test dataset (docs/process/dataset.md). */
const CASES = {
    // a, b: two submissions in Review the reviewer is not on; reminded: a reviewer on neither
    ojs: {
        a: 7, b: 10,
        reviewer: {name: 'Julie Janssen', username: 'jjanssen'},
        reminded: {name: 'Sabine Kumar', username: 'skumar'},
    },
    omp: {
        a: 2, b: 15,
        reviewer: {name: 'Adela Gallego', username: 'agallego'},
        reminded: {name: 'Catherine Turner', username: 'cturner'},
    },
};

const mailOf = (username) => `${username}@mailinator.com`;

/** The journal's review page objects (the Reviewers panel is the same on a press). */
const R = () => require('../../../../../apps/ojs/playwright/pages/ReviewStagePages.js');

/** Settings › Workflow › "Review" › "Setup": tick the one-click box and press "Save". Returns the box's states. */
async function enableOneClick(page, app) {
    const {ReviewSettingsPage} = require('../../../pages/ReviewSettingsPages.js');
    const settings = new ReviewSettingsPage(page, app.contextPath);
    await settings.goto('Setup');
    await idle(page);
    const box = settings.setup.checkbox(SETTING);
    await box.waitFor({timeout: T});
    const before = await box.isChecked();
    await box.check();
    await settings.setup.save();
    await idle(page);
    return {before, after: await box.isChecked()};
}

/** The editor's workflow of the submission, on the stage and round it opens on. */
async function openWorkflow(page, app, id) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    const modal = page.locator('[data-cy="active-modal"]').first();
    await modal.locator('[data-cy="reviewer-manager"]').waitFor({timeout: T});
    await idle(page);
    return modal;
}

/** The reviewer's row of the open workflow's "Reviewers" panel. */
function reviewerRow(modal, name) {
    return modal.locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: name});
}

/**
 * On the open workflow: "Add Reviewer", search the list by name, "Select Reviewer", "Add Reviewer".
 * Returns the save's status and the new row's text.
 */
async function addReviewer(page, modal, name) {
    const win = await R().openAddReviewerModal(page);
    await R().selectReviewer(page, win, name);
    const letter = win.frameLocator('iframe[id^="personalMessage"]').last().locator('body');
    for (let i = 0; i < 60 && !((await letter.innerText().catch(() => '')).trim()); i++) await sleep(500); // the request letter arrives by AJAX
    const saved = page.waitForResponse((r) => /update-reviewer|updateReviewer/i.test(r.url()), {timeout: T}).catch(() => null);
    await win.getByRole('button', {name: 'Add Reviewer', exact: true}).click();
    const s = await saved;
    await win.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    const row = reviewerRow(modal, name);
    await row.first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    return {status: s ? s.status() : null, row: flat(await row.first().innerText().catch(() => null), 240)};
}

/** The row's "Edit": pick yesterday as "Response Due Date", "OK"; the workflow is opened again. Returns the row's text. */
async function makeResponseOverdue(page, app, id, name) {
    let modal = await openWorkflow(page, app, id);
    // not openEditReview(): it waits for a box the 3.5 window does not have
    await R().clickRowAction(page, reviewerRow(modal, name), 'Edit');
    const edit = R().legacyModal(page, 'editReviewForm');
    await edit.locator('input.datepicker[id^="responseDueDate"]').waitFor({timeout: T});
    await idle(page);
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
    await R().pickDate(page, edit, 'responseDueDate', yesterday);
    await R().saveEditReview(page, edit);
    modal = await openWorkflow(page, app, id);
    const row = reviewerRow(modal, name);
    await row.getByRole('button', {name: 'Send Reminder', exact: true}).waitFor({timeout: T});
    return {modal, row: flat(await row.first().innerText(), 240)};
}

/**
 * The row's "Send Reminder": the window opens; with `send` its own "Send Reminder" is pressed,
 * without it "Cancel". Returns the window's text and what closed it.
 */
async function reminderWindow(page, modal, name, {send, label}) {
    const win = await R().openSendReminder(page, reviewerRow(modal, name));
    await win.locator('.tox-tinymce').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    const out = {text: flat(await win.innerText(), 500), buttons: (await win.getByRole('button').allInnerTexts()).map((b) => flat(b, 40)).filter(Boolean)};
    if (label) record(label, await screen(page));
    if (send) {
        await R().submitSendReminder(page, win);
        out.closedBy = 'Send Reminder';
    } else {
        await win.locator('form#sendReminderForm').locator('a, button').filter({hasText: /^\s*Cancel\s*$/}).first().click();
        await win.locator('form#sendReminderForm').waitFor({state: 'hidden', timeout: T});
        out.closedBy = 'Cancel';
    }
    await idle(page);
    return out;
}

/** Every email this install sent to `to` since `since`, oldest first: subject, time, its review link. */
async function mailsTo(app, to, since) {
    const host = new URL(app.baseURL).host;
    const found = await app.mail._search({to, since});
    const out = [];
    for (const m of found.messages || []) {
        const full = await app.mail.fullMessage(m.ID);
        const html = full.HTML || '';
        if (!html.includes(host)) continue;
        const links = [...html.matchAll(/href=['"]([^'"]+)['"]/g)].map((x) => x[1].replace(/&amp;/g, '&'));
        out.push({
            subject: full.Subject,
            at: m.Created,
            link: links.find((l) => /\/invitation\/accept/.test(l)) || links.find((l) => /\/reviewer\/submission/.test(l)) || null,
        });
    }
    return out.sort((x, y) => String(x.at).localeCompare(String(y.at)));
}

/** The request's and the reminder's subjects; a due-date edit mails "Your review assignment has been changed" in between. */
const REQUEST = /^(Invitation to review|Manuscript Review Request)/;
const REMINDER = /^A reminder to please complete your review/;

/** Wait for the first email to `to` since `since` whose subject matches, and return it (throws when it never comes). */
async function waitMail(app, to, since, subject) {
    const deadline = Date.now() + T;
    for (;;) {
        const all = await mailsTo(app, to, since);
        const hit = all.filter((m) => subject.test(m.subject));
        if (hit.length) return hit[hit.length - 1];
        if (Date.now() > deadline) throw new Error(`no email ${subject} to ${to} since ${since.toISOString()} (there: ${all.map((m) => m.subject).join(' | ')})`);
        await sleep(1000);
    }
}

/** A link without its key, for the record. */
const masked = (link) => (link || '').replace(/^https?:\/\/[^/]+/, '').replace(/(key=)[^&]+/, '$1…');

/**
 * Open an emailed link in a new browser that is not signed in. Returns the answer's status, where
 * it landed, the page's title, headings and text, who the header says is signed in, and which of
 * the review wizard, "Invitation Unavailable", the Login page or the bare 404 it is. Never throws
 * on the outcome.
 */
async function openSignedOut(app, key, link) {
    const b = await launch(app);
    try {
        const page = b.page;
        const resp = await page.goto(link).catch((e) => ({error: e.message}));
        await page.waitForLoadState('load').catch(() => {});
        await page.locator('#reviewTabs, form#login, h1').first().waitFor({timeout: 10_000}).catch(() => {});
        await idle(page).catch(() => {});
        const shown = await screen(page).catch(() => null);
        const body = flat(await page.locator('body').innerText().catch(() => ''), 500);
        const out = {
            link: masked(link),
            status: resp && typeof resp.status === 'function' ? resp.status() : resp && resp.error,
            url: page.url().replace(/^https?:\/\/[^/]+/, '').replace(/(key=)[^&]+/, '$1…'),
            title: await page.title(),
            headings: (await page.getByRole('heading').allInnerTexts().catch(() => [])).map((h) => flat(h, 120)).slice(0, 8),
            stylesheets: await page.locator('link[rel="stylesheet"]').count(),
            wizard: /\/reviewer\/submission/.test(page.url()) && (await page.locator('#reviewTabs').count()) > 0,
            wizardTabs: (await page.locator('#reviewTabs > ul li').allInnerTexts().catch(() => [])).map((t) => flat(t, 40)),
            submission: (page.url().match(/reviewer\/submission\/(\d+)/) || [])[1] || null,
            signedInAs: flat(await page.locator('header, [role="banner"]').getByRole('button').filter({hasText: /\S/}).last().innerText().catch(() => null), 60),
            unavailable: (await page.getByRole('heading', {name: 'Invitation Unavailable'}).count()) > 0,
            login: (await page.locator('form#login').count()) > 0,
            bare404: body === '404 Not Found',
            body,
        };
        record(key, {...out, screen: shown});
        await shot(page, key).catch(() => {});
        return out;
    } finally {
        await b.close();
    }
}

/** The install's reviewer-access invitations of the user, for the record: id, status, assignment. */
function accessInvitations(app, username) {
    return sql(app, `select i.invitation_id, i.status, i.payload::json->>'reviewAssignmentId' from invitations i join users u on u.user_id = i.user_id where i.type = 'reviewerAccess' and u.username = '${username}' order by i.invitation_id`)
        .split('\n').filter(Boolean);
}

module.exports = {T, sleep, flat, SETTING, CASES, mailOf, enableOneClick, openWorkflow, reviewerRow, addReviewer, makeResponseOverdue,
    reminderWindow, mailsTo, waitMail, REQUEST, REMINDER, masked, openSignedOut, accessInvitations};
