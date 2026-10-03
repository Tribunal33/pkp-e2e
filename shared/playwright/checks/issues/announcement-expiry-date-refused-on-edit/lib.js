// Helpers for walk.js (U12 A3: "Edit Announcement" prints the expiry date
// in a shape its own save refuses). Requiring this file runs nothing.
// Turning announcements on and adding one reuse the U20 A5 helpers.
const {idle} = require('../../../probe');
const {enableAnnouncements, openAnnouncementsFromMenu} = require('../sitemap-lists-expired-announcements/lib');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ANN = /\/api\/v1\/announcements(\/\d+)?(\?|$)/;

/**
 * Settings › Website › "Setup" › "Date & Time": choose the format `value`
 * (a radio's value, e.g. "d-m-Y"; its label is today's date in it) under the first visible "Date (Short)" group (the
 * primary language's) and press "Save". Returns what was chosen before,
 * the save's answer and the notice.
 */
async function setShortDate(app, page, value) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/website`));
    await idle(page).catch(() => {});
    const setup = page.locator('#setup-button').first();
    await setup.waitFor({state: 'visible', timeout: T});
    if ((await setup.getAttribute('aria-selected')) !== 'true') await setup.click();
    await page.locator('#dateTime-button:visible').first().click();
    const panel = page.locator('[id="dateTime"]').first();
    const group = panel.locator('fieldset.pkpFormField--options:visible')
        .filter({has: page.locator('legend', {hasText: 'Date (Short)'})}).first();
    await group.waitFor({state: 'visible', timeout: T});
    const legend = flat(await group.locator('legend').innerText());
    const choices = (await group.locator('label.pkpFormField--options__option').allInnerTexts()).map((s) => flat(s));
    const before = await group.locator('input[type="radio"]').evaluateAll((rs) => {
        const i = rs.findIndex((r) => r.checked);
        return i < 0 ? null : (rs[i].value || `(custom #${i})`);
    });
    // Each choice is labelled with today's date in its format ("03-10-2026" for d-m-Y).
    const option = group.locator('label.pkpFormField--options__option').filter({has: page.locator(`input[type="radio"][value="${value}"]`)});
    const label = flat(await option.innerText());
    await option.locator('input[type="radio"]').check();
    const answered = page.waitForResponse((r) => r.request().method() !== 'GET' && /\/api\/v1\/contexts\/\d+/.test(r.url()), {timeout: T}).catch(() => null);
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answered;
    const notice = await panel.locator('[role="status"]').filter({hasText: 'Saved'}).first()
        .waitFor({state: 'visible', timeout: T}).then(() => 'Saved', () => null);
    return {legend, choices, before, chose: value, label, status: r ? r.status() : null, notice};
}

/** The Announcements page's list panel. */
const list = (page) => page.locator('main .listPanel').first();
const row = (page, title) => list(page).locator('.listPanel__item')
    .filter({has: page.locator('.listPanel__itemTitle', {hasText: new RegExp(`^\\s*${esc(title)}\\s*$`)})});

/**
 * "Add Announcement": the title, the "Expiry Date" as typed, "Save". Returns
 * the answer and the `dateExpire` the API sent back to the browser.
 */
async function addAnnouncement(page, {title, expiry}) {
    await list(page).getByRole('button', {name: 'Add Announcement', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Add Announcement'});
    const save = dialog.getByRole('button', {name: 'Save', exact: true});
    await save.waitFor({state: 'visible', timeout: T});
    await dialog.locator('input[name="title-en"]').fill(title);
    if (expiry) await dialog.locator('input[name="dateExpire"]').fill(expiry);
    const [r] = await Promise.all([
        page.waitForResponse((x) => ANN.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null),
        save.click(),
    ]);
    const out = {title, typed: expiry || null, status: r ? r.status() : null};
    const body = r ? await r.json().catch(() => null) : null;
    out.apiDateExpire = body && 'dateExpire' in body ? body.dateExpire : undefined;
    if (r && r.status() >= 400) out.answer = flat(JSON.stringify(body));
    await dialog.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    out.rowShown = await row(page, title).count() > 0;
    return out;
}

/** "Edit" on the row: the open panel and what its "Expiry Date" box reads. */
async function openEdit(page, title) {
    await row(page, title).getByRole('button', {name: 'Edit', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Edit Announcement'});
    await dialog.getByRole('button', {name: 'Save', exact: true}).waitFor({state: 'visible', timeout: T});
    await idle(page).catch(() => {});
    await pause(500);
    const box = dialog.locator('input[name="dateExpire"]');
    return {dialog, box, shows: await box.inputValue()};
}

/**
 * "Save" on the open edit panel: the PUT's answer (status, the `dateExpire`
 * sent and returned, the refusal), the messages under the fields, and
 * whether the panel stayed open.
 */
async function saveEdit(page, dialog) {
    let sent = null;
    const answered = page.waitForResponse((x) => {
        if (!ANN.test(x.url()) || x.request().method() === 'GET') return false;
        sent = x.request().postData();
        return true;
    }, {timeout: 15_000}).catch(() => null);
    await dialog.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answered;
    await dialog.waitFor({state: 'hidden', timeout: 8000}).catch(() => {});
    await idle(page).catch(() => {});
    await pause(800);
    const body = r ? await r.json().catch(() => null) : null;
    let sentDateExpire;
    try { sentDateExpire = sent ? (JSON.parse(sent).dateExpire ?? null) : undefined; } catch { sentDateExpire = flat(sent, 200); }
    const open = await dialog.isVisible().catch(() => false);
    return {
        method: r ? r.request().method() : null,
        status: r ? r.status() : null,
        sentDateExpire,
        answer: r && r.status() >= 400 ? body : undefined,
        apiDateExpire: r && r.status() < 400 && body ? body.dateExpire : undefined,
        fieldErrors: open ? (await dialog.locator('.pkpFieldError__message').allInnerTexts()).map((s) => flat(s)) : [],
        panelOpen: open,
    };
}

/** Close the open edit panel by its "Close" control. */
async function closePanel(page, dialog) {
    await dialog.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
    await dialog.waitFor({state: 'hidden', timeout: 6000}).catch(() => {});
    await pause(600);
}

/** The stored `date_expire` of the context's announcement titled `title` (English). */
function storedExpiry(sql, app, title) {
    return sql(app, `select a.date_expire from announcements a join announcement_settings s on s.announcement_id = a.announcement_id
        where s.setting_name = 'title' and s.locale = 'en' and s.setting_value = '${title.replace(/'/g, "''")}' order by a.announcement_id desc limit 1`) || null;
}

module.exports = {flat, pause, enableAnnouncements, openAnnouncementsFromMenu, setShortDate, addAnnouncement, openEdit, saveEdit, closePanel, storedExpiry, list, row};
