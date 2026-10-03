// Helpers of walk.js here (issue report docs/issues/U12-A14-french-announcement-email-english-sentence.md).
// Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * On the Announcements page: "Add Announcement", the title and the short description in one
 * language's fields, "Send an email about this to all registered users." ticked, "Save".
 * Returns the fields the window offered, the save's answer and the rows after it.
 */
async function addAnnouncement(page, {locale, title, short}) {
    const list = page.locator('main .listPanel').first();
    await list.getByRole('button', {name: 'Add Announcement', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Add Announcement'});
    const save = dialog.getByRole('button', {name: 'Save', exact: true});
    await save.waitFor({state: 'visible', timeout: T});
    await idle(page).catch(() => {});
    const out = {locale, title, short};
    out.titleFields = await dialog.locator('input[name^="title-"]').evaluateAll((els) => els.map((e) => e.name));
    await dialog.locator(`input[name="title-${locale}"]`).fill(title);
    const frame = page.frameLocator(`#announcement-descriptionShort-control-${locale}_ifr`).locator('body');
    await frame.click({timeout: T});
    await frame.pressSequentially(short);
    const box = dialog.getByRole('checkbox', {name: 'Send an email about this to all registered users.', exact: true});
    out.sendEmailOffered = await box.isVisible().catch(() => false);
    await box.check();
    const [r] = await Promise.all([
        page.waitForResponse((x) => /\/api\/v1\/announcements(\/\d+)?$/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null),
        save.click(),
    ]);
    out.status = r ? r.status() : null;
    if (r && r.status() >= 400) out.answer = flat(await r.text().catch(() => null), 400);
    await dialog.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    out.rows = await list.locator('.listPanel__itemTitle').allInnerTexts().then((a) => a.map((s) => flat(s)));
    return out;
}

/**
 * The announcement email to `to` that carries `marker` and links to this fleet (every fleet of the
 * slot mails the same dataset addresses). Between reads it loads `reloadUrl`, since the dataset's
 * install runs its queued jobs on page loads. Returns the message (Mailpit's full form) or null.
 */
async function waitForMail(app, page, {to, marker, since, reloadUrl, tries = 40}) {
    for (let i = 0; i < tries; i++) {
        const found = await app.mail._search({to, contains: marker, since});
        for (const hit of found.messages || []) {
            const msg = await app.mail.fullMessage(hit.ID);
            if (`${msg.Text || ''}${msg.HTML || ''}`.includes(`${app.baseURL}/index.php/`)) return {msg, loads: i};
        }
        if (reloadUrl) await page.goto(app.url(reloadUrl)).catch(() => {});
        await new Promise((r) => setTimeout(r, 1500));
    }
    return {msg: null, loads: tries};
}

/** The parts of the email the report quotes. */
function readMail(msg) {
    const text = msg.Text || '';
    const html = msg.HTML || '';
    const sentence = (s) => {
        const m = flat(s, 4000).match(/(Visit our website[^.]*\.|Visiter notre site[^.]*\.|[^.]*annonce complète[^.]*\.)/);
        return m ? m[0].trim() : null;
    };
    return {
        subject: msg.Subject,
        from: msg.From ? `${msg.From.Name} <${msg.From.Address}>` : null,
        to: (msg.To || []).map((t) => t.Address),
        sentenceText: sentence(text),
        sentenceHtml: sentence(html),
        text: text.slice(0, 1500),
        htmlFlat: flat(html, 1500),
    };
}

module.exports = {T, flat, addAnnouncement, waitForMail, readMail};
