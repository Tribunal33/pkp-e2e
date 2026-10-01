// Helpers of the U35 A16 walk (issue report
// docs/issues/U35-A16-notify-message-ignores-email-opt-out.md). Requiring this file runs nothing.
// The workflow helpers ("Participants", "Notify", the discussions panel, the mailbox poll) are the
// U35 A3 walk's (../typed-participant-message-not-sent/lib.js); this file adds the profile's
// "Notifications" tab, the "Tasks" window and one "Notify" with a predefined message.
const {screen, shot, record, idle} = require('../../../probe');
const P = require('../typed-participant-message-not-sent/lib.js');

const {sleep, flat} = P;

/** Per-app dataset facts the steps use (docs/process/dataset.md): the submission, its stage, the predefined message. */
const WORDS = {
    ojs: {id: 4, stage: 'workflow_1', template: 'Discussion (Submission)'},
    omp: {id: 9, stage: 'workflow_1', template: 'Discussion (Submission)'},
    ops: {id: 1, stage: 'workflow_5', template: 'Discussion (Production)'},
};
const RECIPIENT = {username: 'dbuskins', name: 'David Buskins', mail: 'dbuskins@mailinator.com'};

/** The "Notifications" tab's row under a heading sentence ("Discussion added."): its two boxes. */
async function readRow(page, sentence) {
    return page.evaluate((s) => {
        const form = document.querySelector('form#notificationSettingsForm');
        if (!form) return null;
        const section = [...form.querySelectorAll('.section')].find((el) => {
            const label = el.querySelector(':scope > label, :scope > span.label, label');
            return label && label.textContent.replace(/\s+/g, ' ').trim() === s;
        });
        if (!section) return {found: false};
        return {
            found: true,
            boxes: [...section.querySelectorAll('input[type=checkbox]')].map((b) => ({
                id: b.id, checked: b.checked, disabled: b.disabled,
                label: (b.closest('label') || b.parentElement).textContent.replace(/\s+/g, ' ').trim(),
            })),
        };
    }, sentence);
}

/**
 * Profile › "Notifications": under `sentence`, set the box labelled `boxLabel` to `checked`, press "Save",
 * reload and read the row again. Returns the row before and after and the save's status.
 */
async function setNotificationBox(page, app, sentence, boxLabel, checked, name) {
    await page.goto(app.url(`/index.php/${app.contextPath}/user/profile/notificationSettings`));
    await idle(page);
    const form = page.locator('form#notificationSettingsForm');
    await form.waitFor({timeout: 30000});
    const before = await readRow(page, sentence);
    const target = before && before.boxes && before.boxes.find((b) => b.label === boxLabel);
    if (!target) return {before, failed: `no box "${boxLabel}" under "${sentence}"`};
    const box = form.locator(`input[type=checkbox][id="${target.id}"]`);
    if (checked) await box.check();
    else await box.uncheck();
    const saved = page.waitForResponse((r) => /saveNotificationSettings|save-notification-settings/i.test(r.url()) && r.request().method() === 'POST', {timeout: 20000}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await sleep(1000);
    await idle(page);
    const s = await screen(page);
    await page.goto(app.url(`/index.php/${app.contextPath}/user/profile/notificationSettings`));
    await idle(page);
    await form.waitFor({timeout: 30000});
    const after = await readRow(page, sentence);
    record(name, {...(await screen(page)), saveStatus: r ? r.status() : null, saveNotices: s.notices, before, after});
    await shot(page, name).catch(() => {});
    return {saveStatus: r ? r.status() : null, notices: s.notices, before: before.boxes, after: after && after.boxes};
}

/** The "Tasks" window's rows as text, then closed. */
async function tasks(page, app, name) {
    await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial`));
    await idle(page);
    const bell = page.getByRole('button', {name: /^Tasks/}).first();
    await bell.waitFor({timeout: 30000});
    const bellText = flat(await bell.innerText(), 60);
    await bell.click();
    const dialog = page.locator('[role="dialog"]:visible').last();
    await dialog.waitFor({timeout: 30000});
    await dialog.getByText('Mark New').waitFor({timeout: 30000}).catch(() => {});
    await idle(page);
    const rows = await dialog.locator('tr.gridRow').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
    record(name, {...(await screen(page)), bellText, rows});
    await shot(page, name).catch(() => {});
    await page.keyboard.press('Escape');
    await dialog.waitFor({state: 'hidden', timeout: 10000}).catch(() => {});
    return {bellText, rows};
}

/** As the signed-in editor: the row's "Notify", the predefined message chosen, `text` typed, "Notify" pressed. */
async function notify(page, app, w, person, text, name) {
    await P.openWorkflow(page, app, w.id, w.stage);
    const win = await P.openNotify(page, person);
    const chosen = await P.chooseTemplate(page, win, w.template);
    await P.typeMessage(page, win, text);
    record(`${name}-filled`, await screen(page));
    const pressed = await P.press(page, win, 'Notify', /send-?notification/i, `${name}-pressed`);
    await P.openWorkflow(page, app, w.id, w.stage);
    const d = await P.discussions(page);
    return {chosen: chosen.status, status: pressed.status, windowOpen: pressed.windowOpen, notices: pressed.notices, discussions: d && d.rows};
}

/** Messages to `to` holding `marker`, each with its sender, subject and whole text; polls up to `ms`. */
async function mailbox(page, app, to, marker, ms) {
    const found = await P.waitMail(page, app, to, marker, ms);
    const r = await app.mail._search({to, contains: marker}).catch(() => ({messages: []}));
    const out = [];
    for (const m of r.messages || []) {
        const full = await app.mail.fullMessage(m.ID).catch(() => null);
        out.push({subject: m.Subject, from: m.From && `${m.From.Name} <${m.From.Address}>`, text: full ? flat(full.Text || full.text || '', 900) : null});
    }
    return out.length ? out : found;
}

module.exports = {P, WORDS, RECIPIENT, sleep, flat, readRow, setNotificationBox, tasks, notify, mailbox};
