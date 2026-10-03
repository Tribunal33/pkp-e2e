// Helpers for walk.js (U12 A9: the email box on "Edit Announcement" sends nothing).
// Requiring this file runs nothing.
const {idle, sql} = require('../../../probe');
const S = require('../sitemap-lists-expired-announcements/lib');

const T = 30_000;
const BOX = 'Send an email about this to all registered users.';
const {flat, rel} = S;

/** The list panel on the Announcements page. */
const list = (page) => page.locator('main .listPanel').first();

/** The save's request (a PUT is tunnelled as a POST) and its answer, with the sendEmail it carried. */
async function saveDialog(page, dialog, idRe) {
    const save = dialog.getByRole('button', {name: 'Save', exact: true});
    const [r] = await Promise.all([
        page.waitForResponse((x) => idRe.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null),
        save.click(),
    ]);
    const out = {status: r ? r.status() : null};
    if (r) {
        const q = r.request();
        out.method = q.method();
        out.override = (await q.allHeaders().catch(() => ({})))['x-http-method-override'] || null;
        const body = q.postData() || '';
        let sent;
        try { sent = JSON.parse(body).sendEmail; } catch (e) { sent = (body.match(/sendEmail[^&]*/) || [null])[0]; }
        out.sendEmailSent = sent === undefined ? '(absent)' : sent;
        if (r.status() >= 400) out.answer = flat(await r.text().catch(() => null), 400);
    }
    await dialog.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    return out;
}

/** The box in a dialog: is it offered, is it ticked. */
async function boxState(dialog) {
    const box = dialog.getByRole('checkbox', {name: BOX, exact: true});
    const offered = await box.isVisible().catch(() => false);
    return {offered, ticked: offered ? await box.isChecked() : null, box};
}

/** "Add Announcement": title, the box ticked or not, "Save". Returns the save, the row's id. */
async function addAnnouncement(page, {title, sendEmail}) {
    await list(page).getByRole('button', {name: 'Add Announcement', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Add Announcement'});
    await dialog.getByRole('button', {name: 'Save', exact: true}).waitFor({state: 'visible', timeout: T});
    await dialog.locator('input[name="title-en"]').fill(title);
    const st = await boxState(dialog);
    if (sendEmail) await st.box.check();
    const out = {title, boxOffered: st.offered, boxTickedByDefault: st.ticked, ticked: sendEmail};
    Object.assign(out, await saveDialog(page, dialog, /\/api\/v1\/announcements$/));
    out.id = await rowId(page, title);
    return out;
}

/** The row's id, read from its "View" address. */
async function rowId(page, title) {
    const row = list(page).locator('.listPanel__item').filter({has: page.locator('.listPanel__itemTitle', {hasText: title})}).first();
    const href = await row.getByRole('link', {name: 'View', exact: true}).getAttribute('href', {timeout: T}).catch(() => null);
    const m = (href || '').match(/\/announcement\/view\/(\d+)/);
    return m ? Number(m[1]) : null;
}

/** "Edit" on the row titled `from`: a new title, the box ticked or left alone, "Save". */
async function editAnnouncement(page, {from, title, sendEmail, beforeSave}) {
    const row = list(page).locator('.listPanel__item').filter({has: page.locator('.listPanel__itemTitle', {hasText: from})}).first();
    await row.getByRole('button', {name: 'Edit', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Edit Announcement'});
    await dialog.getByRole('button', {name: 'Save', exact: true}).waitFor({state: 'visible', timeout: T});
    const st = await boxState(dialog);
    const out = {from, title, boxOffered: st.offered, boxTickedOnOpen: st.ticked};
    await dialog.locator('input[name="title-en"]').fill(title);
    if (sendEmail) {
        if (st.offered) { await st.box.check(); out.ticked = true; } else out.ticked = 'not offered';
    } else out.ticked = false;
    if (beforeSave) await beforeSave(dialog);
    Object.assign(out, await saveDialog(page, dialog, /\/api\/v1\/announcements\/\d+$/));
    out.rowTitles = await list(page).locator('.listPanel__itemTitle').allInnerTexts().then((a) => a.map((s) => flat(s)));
    return out;
}

/** Every message on the slot's Mailpit with this exact subject to a dataset address, since `since`. */
async function mails(app, subject, since) {
    const q = encodeURIComponent(`to:"@mailinator.com" subject:"${subject}"`);
    const res = await fetch(`${app.mailpitUrl.replace(/\/$/, '')}/api/v1/search?query=${q}&limit=1000`);
    const j = await res.json();
    const from = new Date(since).getTime();
    const msgs = (j.messages || []).filter((m) => m.Subject === subject && new Date(m.Created).getTime() >= from);
    const to = msgs.flatMap((m) => (m.To || []).map((t) => t.Address)).sort();
    return {count: msgs.length, to, from: [...new Set(msgs.map((m) => m.From && m.From.Address))]};
}

/**
 * Let the app's own job runner work: it runs queued jobs at the end of web
 * requests (`job_runner = On`). Opens the dashboard up to `loads` times,
 * stopping early once `subject`'s mail count holds across two loads.
 */
async function pumpRunner(app, page, {subject, since, loads = 6}) {
    let last = -1, n = 0, i = 0;
    for (; i < loads; i++) {
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
        await idle(page).catch(() => {});
        await page.waitForTimeout(1500);
        n = (await mails(app, subject, since)).count;
        if (n > 0 && n === last) { i++; break; }
        last = n;
    }
    return {loads: i, count: n};
}

/** Job batches dispatched, jobs left queued or failed, and "new announcement" notifications recorded (type 8, no assoc). */
function queueFacts(app) {
    const one = (q) => { try { return sql(app, q); } catch (e) { return `error: ${flat(e.message, 120)}`; } };
    const out = {jobBatches: one('select count(*) from job_batches'), jobsQueued: one('select count(*) from jobs'), failedJobs: one('select count(*) from failed_jobs')};
    out.newAnnouncementNotifications = one('select count(*) from notifications where type = 8');
    return out;
}

module.exports = {BOX, flat, rel, enableAnnouncements: S.enableAnnouncements, openAnnouncements: S.openAnnouncementsFromMenu, addAnnouncement, editAnnouncement, mails, pumpRunner, queueFacts};
