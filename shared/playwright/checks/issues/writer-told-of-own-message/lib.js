// Helpers of walk.js here (issue report docs/issues/U37-A3-writer-told-of-own-message.md).
// Requiring this file runs nothing. Per-app dataset facts, the mailbox read (Mailpit, by
// recipient and subject), the header's "Tasks" window read, and the 3.5 "Discussions" grid
// ("Add discussion", the discussion window's "Add Message").
const {screen, record, idle} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per app, on PKP's default test dataset (docs/process/dataset.md). */
const WORDS = {
    ojs: {id: 3, menuKey: 'workflow_4', stage: 'Copyediting', writer: 'dbarnes', other: 'mfritz', otherName: 'Maria Fritz', third: 'sberardo', thirdName: 'Stephanie Berardo'},
    omp: {id: 7, menuKey: 'workflow_4', stage: 'Copyediting', writer: 'dbarnes', other: 'mfritz', otherName: 'Maria Fritz', third: 'dkennepohl', thirdName: 'Dietmar Kennepohl'},
    ops: {id: 1, menuKey: 'workflow_5', stage: 'Production', writer: 'dbarnes', other: 'dbuskins', otherName: 'David Buskins', third: 'sberardo', thirdName: 'Stephanie Berardo'},
};

const address = (username) => (username === 'admin' ? 'pkpadmin@mailinator.com' : `${username}@mailinator.com`);

/**
 * The mails to `username` whose subject holds `subject`, sent since `since` (ms; the walk's start,
 * since every app and fleet of the slot mails the one Mailpit with the same addresses):
 * [{from, to, subject, created}], oldest first.
 */
async function mailbox(app, username, subject, since = 0) {
    const res = await app.mail._search({to: address(username), subject});
    return (res.messages || [])
        .filter((m) => Date.parse(m.Created) >= since)
        .map((m) => ({
            from: m.From ? `${m.From.Name} <${m.From.Address}>` : null,
            to: (m.To || []).map((t) => t.Address).join(', '),
            subject: m.Subject,
            created: m.Created,
            snippet: flat(m.Snippet, 120),
        }))
        .reverse();
}

/**
 * Wait until `username` holds at least `n` mails for `subject` (the job runner sends on later
 * requests, so the page is reloaded between polls). Returns the mails held then.
 */
async function waitForMail(page, app, username, subject, n, since, {tries = 8} = {}) {
    for (let i = 0; i < tries; i++) {
        const box = await mailbox(app, username, subject, since);
        if (box.length >= n) return box;
        await sleep(3000);
        await page.reload().catch(() => {});
        await idle(page).catch(() => {});
    }
    return mailbox(app, username, subject, since);
}

/** The header's "Tasks" window: every row as "{sentence} | {title}", and those naming `marker`. */
async function readTasks(page, marker, name) {
    const {TasksPanel} = require('../../../pages/NotificationsPages.js');
    const tasks = new TasksPanel(page);
    const badge = await tasks.count().catch(() => null);
    await tasks.open();
    await sleep(500);
    record(name, await screen(page));
    const rows = await tasks.rowTexts();
    await tasks.close().catch(() => {});
    return {badge, total: rows.length, matching: rows.filter((r) => r.includes(marker))};
}

// ---------------------------------------------------------------------------------------------
// 3.5: the stage's legacy "Discussions" grid.
const grid = (page) => page.locator('[id^="component-grid-queries-queriesgrid"]').first();

/** The workflow at the stage (3.5 takes the same dashboard address). */
async function openWorkflow35(page, app, w) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${w.id}&workflowMenuKey=${w.menuKey}`));
    await idle(page);
    await grid(page).waitFor({timeout: 30000});
    await idle(page);
}

/** "Add discussion": the participant ticked, "Subject", "Message", "OK". */
async function addQuery35(page, {participantName, subject, message}) {
    await grid(page).getByText(/Add discussion/i).first().click();
    const form = page.locator('form#queryForm').last();
    await form.waitFor({timeout: 30000});
    await idle(page);
    const boxes = await form.locator('label').filter({has: page.locator('input[type="checkbox"]')}).evaluateAll((ls) => ls.map((l) => `${l.querySelector('input').checked ? '[x]' : '[ ]'} ${l.innerText.replace(/\s+/g, ' ').trim()}`));
    await form.locator('label', {hasText: participantName}).locator('input[type="checkbox"]').first().check();
    await form.locator('input[name="subject"]').fill(subject);
    const id = await form.locator('textarea[name="comment"]').getAttribute('id');
    await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: 30000});
    await page.frameLocator(`#${id}_ifr`).locator('body').click();
    await page.keyboard.type(message);
    record('r35-add-filled', await screen(page));
    const resp = page.waitForResponse((r) => /update-?query/i.test(r.url()), {timeout: 30000}).catch(() => null);
    await form.getByRole('button', {name: /^(Save|OK)$/}).last().click();
    const r = await resp;
    await sleep(1500);
    await idle(page);
    return {boxesBefore: boxes, status: r ? r.status() : null};
}

/** Press the discussion's subject, "Add Message", type `message`, "OK"; the window closed after. */
async function reply35(page, {subject, message}) {
    await grid(page).locator('tbody tr.gridRow').filter({hasText: subject}).last().locator('a').filter({hasText: subject}).first().click();
    const dlg = page.locator('[role="dialog"]').filter({has: page.locator('[id^="component-grid-queries-querynotesgrid"]')}).last();
    await dlg.locator('[id^="component-grid-queries-querynotesgrid"] tbody tr').first().waitFor({timeout: 30000});
    await idle(page);
    await dlg.getByText(/Add Message/i).first().click();
    const form = dlg.locator('form').filter({has: page.locator('textarea[name="comment"]')}).last();
    await form.waitFor({timeout: 30000});
    const id = await form.locator('textarea[name="comment"]').getAttribute('id');
    await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: 30000});
    await page.frameLocator(`#${id}_ifr`).locator('body').click();
    await page.keyboard.type(message);
    record('r35-reply-filled', await screen(page));
    const resp = page.waitForResponse((r) => /insert-?note/i.test(r.url()), {timeout: 30000}).catch(() => null);
    await form.getByRole('button', {name: /^(OK|Save|Add)$/}).last().click();
    const r = await resp;
    await sleep(1500);
    await idle(page);
    const notes = (await dlg.locator('[id^="component-grid-queries-querynotesgrid"] tbody tr').allInnerTexts().catch(() => [])).map((t) => flat(t, 200)).filter((t) => t && t !== 'No Items');
    await dlg.getByRole('button', {name: /Close/}).first().click().catch(() => {});
    await sleep(800);
    return {status: r ? r.status() : null, notes};
}

module.exports = {WORDS, sleep, flat, address, mailbox, waitForMail, readTasks, grid, openWorkflow35, addQuery35, reply35};
