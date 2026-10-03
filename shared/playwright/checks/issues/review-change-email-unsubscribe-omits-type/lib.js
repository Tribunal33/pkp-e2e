// Helpers of walk.js here (spec U27, register A12: the assignment-changed email's opt-out) and of
// ../email-reviewer-sends-empty-body/walk.js (U27 A13). Requiring this file runs nothing. Every helper
// drives the screens a person uses: the workflow's "Reviewers" panel (a row's "Edit" and "Email
// Reviewer"), the reviewer's profile "Notifications" tab, an emailed "unsubscribe" link.
const {idle, screen, shot, record} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per app, on PKP's default test dataset (docs/process/dataset.md): a submission in Review and two of its reviewers. */
const CASES = {
    ojs: {id: 12, edited: {name: 'Julie Janssen', username: 'jjanssen'}, emailed: {name: 'Paul Hudson', username: 'phudson'}},
    omp: {id: 2, edited: {name: 'Gonzalo Favio', username: 'gfavio'}, emailed: {name: 'Al Zacharia', username: 'alzacharia'}},
};
const mailOf = (username) => `${username}@mailinator.com`;
const CHANGED = /^Your review assignment has been changed/;

/** The journal's review page objects (the Reviewers panel is the same on a press). */
const R = () => require('../../../../../apps/ojs/playwright/pages/ReviewStagePages.js');

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
    return modal.locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: name}).first();
}

/**
 * On the workflow: the row's "Edit", `date` picked as "Review Due Date", "OK". Returns the dates
 * the window showed before and after the pick and the save's status.
 */
async function editReviewDueDate(page, app, id, name, date, label) {
    const modal = await openWorkflow(page, app, id);
    await R().clickRowAction(page, reviewerRow(modal, name), 'Edit');
    const edit = R().legacyModal(page, 'editReviewForm');
    const due = edit.locator('input.datepicker[id^="reviewDueDate"]');
    await due.waitFor({timeout: T});
    await idle(page);
    const before = await due.inputValue();
    await R().pickDate(page, edit, 'reviewDueDate', date);
    const picked = await due.inputValue();
    if (label) record(label, await screen(page));
    const saved = page.waitForResponse((r) => /update-review|updateReview/i.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await edit.getByRole('button', {name: 'OK', exact: true}).click();
    const r = await saved;
    await edit.locator('form#editReviewForm').waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    return {before, picked, http: r ? r.status() : null, windowClosed: (await edit.locator('form#editReviewForm').count()) === 0};
}

/** Every email this install sent to `to` since `since` (`anyHost`: also those naming no address of it), oldest first: subject, time, text, footer, its unsubscribe link. */
async function mailsTo(app, to, since, {anyHost = false} = {}) {
    const host = new URL(app.baseURL).host;
    const found = await app.mail._search({to, since});
    const out = [];
    for (const m of found.messages || []) {
        const full = await app.mail.fullMessage(m.ID);
        const html = full.HTML || '';
        if (!anyHost && !html.includes(host)) continue;
        const links = [...html.matchAll(/href=['"]([^'"]+)['"]/g)].map((x) => x[1].replace(/&amp;/g, '&'));
        out.push({
            subject: full.Subject,
            at: m.Created,
            from: full.From && `${full.From.Name} <${full.From.Address}>`,
            text: flat(full.Text || '', 1200),
            htmlLength: html.length,
            footer: flat((full.Text || '').split('—').pop(), 300),
            unsubscribe: links.find((l) => /notification\/unsubscribe/.test(l)) || null,
            listUnsubscribe: (full.ListUnsubscribe && full.ListUnsubscribe.Header) || null,
        });
    }
    return out.sort((x, y) => String(x.at).localeCompare(String(y.at)));
}

/** Poll `to`'s mailbox for `ms` and return what matches `subject` (an empty list when nothing came). */
async function waitMails(app, to, since, subject, ms = 25_000) {
    const deadline = Date.now() + ms;
    for (;;) {
        const all = await mailsTo(app, to, since);
        const hit = all.filter((m) => subject.test(m.subject));
        if (hit.length || Date.now() > deadline) return {hit, all: all.map((m) => m.subject)};
        await sleep(1000);
    }
}

/** The signed-in person's profile "Notifications" tab: its rows (the sentence and its boxes). */
async function notificationsTab(page, app, label) {
    await page.goto(app.url(`/index.php/${app.contextPath}/user/profile/notificationSettings`));
    await idle(page);
    const form = page.locator('form#notificationSettingsForm');
    await form.waitFor({timeout: T});
    const rows = await form.evaluate((f) => [...f.querySelectorAll('input[type=checkbox]')].map((b) => {
        const section = b.closest('.section') || b.parentElement;
        const head = section && section.querySelector(':scope > label, :scope > span.label, label');
        return {
            row: head ? head.textContent.replace(/\s+/g, ' ').trim() : null,
            box: (b.closest('label') || b.parentElement).textContent.replace(/\s+/g, ' ').trim(),
            name: b.name, checked: b.checked,
        };
    }));
    const sentences = [...new Set(rows.map((r) => r.row))];
    if (label) {
        record(label, {...(await screen(page)), rows});
        await shot(page, label).catch(() => {});
    }
    return {sentences, rows};
}

/** Open an emailed "unsubscribe" link in `page`: the page's heading, its boxes (label, ticked). */
async function openUnsubscribe(page, link, label) {
    const resp = await page.goto(link);
    await idle(page);
    const form = page.locator('form#unsubscribeNotificationForm');
    await form.waitFor({timeout: T}).catch(() => {});
    const boxes = await form.locator('input[type=checkbox]').evaluateAll((els) => els.map((b) => ({
        name: b.name, checked: b.checked, label: (b.closest('label') || b.parentElement).textContent.replace(/\s+/g, ' ').trim(),
    }))).catch(() => []);
    const out = {
        status: resp ? resp.status() : null,
        heading: flat(await page.locator('h1').first().innerText().catch(() => null), 120),
        text: flat(await page.locator('.page_unsubscribe_notifications, body').first().innerText().catch(() => ''), 900),
        boxes,
    };
    if (label) {
        record(label, {...(await screen(page)), ...out});
        await shot(page, label).catch(() => {});
    }
    return out;
}

/** On the open "Unsubscribe" page: press "Unsubscribe" (every box as it is). Returns the result page's heading and text. */
async function pressUnsubscribe(page, label) {
    const form = page.locator('form#unsubscribeNotificationForm');
    await Promise.all([
        page.waitForLoadState('load'),
        form.getByRole('button', {name: 'Unsubscribe'}).click(),
    ]);
    await page.waitForURL((u) => true, {timeout: T}).catch(() => {});
    await idle(page);
    const out = {
        heading: flat(await page.locator('h1').first().innerText().catch(() => null), 120),
        text: flat(await page.locator('.page, body').first().innerText().catch(() => ''), 600),
    };
    if (label) {
        record(label, {...(await screen(page)), ...out});
        await shot(page, label).catch(() => {});
    }
    return out;
}

/** The reviewer's blocked-email choices in this context, for the record (what "Unsubscribe" saved). */
function blockedEmails(app, sql, username) {
    const t = app.contextTables;
    return sql(app, `select s.setting_value from notification_subscription_settings s join users u on u.user_id = s.user_id
        join ${t.table} c on c.${t.id} = s.context_id and c.path = '${app.contextPath}'
        where u.username = '${username}' and s.setting_name = 'blocked_emailed_notification' order by 1`).split('\n').filter(Boolean);
}

module.exports = {T, sleep, flat, CASES, mailOf, CHANGED, R, openWorkflow, reviewerRow, editReviewDueDate, mailsTo, waitMails,
    notificationsTab, openUnsubscribe, pressUnsubscribe, blockedEmails};
