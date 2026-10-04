// U55 A2 walk (issue report docs/issues/U55-A2-notify-required-fields-unchecked.md).
// On PKP's default test dataset:
//   steps (default): admin ticks the context under Site Settings › "Site Setup" › "Bulk Emails" and saves;
//     rvaca opens Settings › Users & Roles › "Notify", reads the labels' required marks, presses the button
//     under the empty form, reads what opens (the window, or the fields' messages), presses "Send Email"
//     when the window is there, and reads the fields' messages, the error line and the notices.
//   nb: the neighbour check of the fix: a filled-in form still opens the confirmation with its total,
//     "Send Email" still queues the email and it arrives; "Copy" stays unmarked.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/notify-required-fields-unchecked/walk.js [nb]
// Every step records the state it finds rather than throwing, so the same script reads the fix in and out.
const {forEachApp, launch, signIn, signOut, record, screen, idle} = require('../../../probe');

const mode = process.argv[2] || 'steps';

const CONTEXT_NAME = {ojs: 'Journal of Public Knowledge', omp: 'Public Knowledge Press', ops: 'Public Knowledge Preprint Server'};
const MANAGER_ROLE = {ojs: 'Journal manager', omp: 'Press manager', ops: 'Preprint Server manager'};
const flat = (s) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim());

/** Steps 1-3: admin ticks the context under "Bulk Emails" and saves. */
async function allowBulkEmail(app, page) {
    const {SiteBulkEmailsTab} = require('../../../pages/NotifyUsersPages.js');
    const tab = new SiteBulkEmailsTab(page);
    await tab.goto();
    await tab.box(CONTEXT_NAME[app.name]).check();
    const r = await tab.save();
    record('a2-01-bulk-emails-saved', await screen(page));
    return r.status();
}

/** Steps 4-5: rvaca on the "Notify" tab. */
async function openNotify(app, page) {
    const {NotifyTab} = require('../../../pages/NotifyUsersPages.js');
    await signOut(page);
    await signIn(page, 'rvaca');
    const tab = new NotifyTab(page, app.contextPath);
    await page.goto(tab.url('#notify'));
    await idle(page);
    await tab.ready();
    return tab;
}

/** Each field's label and whether it carries the required mark. */
async function marks(tab) {
    const out = {};
    for (const [name, field] of Object.entries({
        roles: tab.rolesField,
        subject: tab.subjectField,
        email: tab.bodyField,
        copy: tab.copyField,
    })) {
        out[name] = {
            label: flat(await tab.fieldLabel(field).innerText().catch(() => null)),
            requiredMark: await field.locator('.pkpFormFieldLabel__required').count(),
        };
    }
    out.subject.inputRequired = await tab.subject.evaluate((el) => ({
        required: el.required,
        ariaRequired: el.getAttribute('aria-required'),
    }));
    return out;
}

/** The fields' messages and the footer's error line. */
async function messages(tab) {
    return {
        roles: (await tab.fieldError(tab.rolesField).allInnerTexts()).map(flat),
        subject: (await tab.fieldError(tab.subjectField).allInnerTexts()).map(flat),
        email: (await tab.fieldError(tab.bodyField).allInnerTexts()).map(flat),
        errorLine: flat(await tab.errorLine.innerText({timeout: 2_000}).catch(() => null)),
        saveDisabled: await tab.submitButton.isDisabled().catch(() => null),
    };
}

/** Press the form's button and wait for whichever comes: the window, or a field's message. */
async function pressAndSee(page, tab) {
    const {SendEmailWindow} = require('../../../pages/NotifyUsersPages.js');
    const win = new SendEmailWindow(page);
    await tab.submitButton.click();
    await Promise.race([
        win.sendButton.waitFor({state: 'visible', timeout: 15_000}),
        tab.panel.locator('.pkpFieldError').first().waitFor({state: 'visible', timeout: 15_000}),
    ]).catch(() => {});
    const open = await win.sendButton.isVisible();
    return {win, open};
}

async function steps(app, page, facts) {
    const sends = [];
    page.on('response', (r) => {
        if (/\/api\/v1\/_email(\?|$)/.test(r.url()) && r.request().method() === 'POST') {
            sends.push(r.status());
        }
    });
    await signIn(page, 'admin');
    facts.bulkEmailsSave = await allowBulkEmail(app, page);
    const tab = await openNotify(app, page);
    facts.marks = await marks(tab);
    record('a2-02-notify-empty', await screen(page));
    const {win, open} = await pressAndSee(page, tab);
    facts.windowOnSave = open;
    facts.sendsAfterSave = [...sends];
    if (open) {
        facts.windowTitle = flat(await win.title.innerText().catch(() => null));
        facts.windowMessage = await win.message().catch(() => null);
        facts.windowButtons = await win.buttonLabels().catch(() => null);
        record('a2-03-window', await screen(page));
        const response = await win.sendAndWait().catch((e) => ({error: String(e).slice(0, 300)}));
        facts.sendStatus = response.status ? response.status() : response;
        facts.sendAnswer = response.json ? await response.json().catch(() => null) : null;
        await idle(page);
        await tab.panel.locator('.pkpFieldError').first().waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
    }
    const s = await screen(page);
    facts.notices = s.notices;
    facts.messages = await messages(tab);
    facts.sends = [...sends];
    facts.queued = await tab.queuedLine.count();
    record('a2-04-after', s);
}

async function neighbour(app, page, facts) {
    await signIn(page, 'admin');
    facts.bulkEmailsSave = await allowBulkEmail(app, page);
    const tab = await openNotify(app, page);
    await tab.fill({roles: [MANAGER_ROLE[app.name]], subject: 'u55b neighbour', body: 'The office is closed on Friday.'});
    facts.marks = await marks(tab);
    const since = new Date();
    const {win, open} = await pressAndSee(page, tab);
    facts.windowOnSave = open;
    if (open) {
        facts.windowMessage = await win.message().catch(() => null);
        record('a2-nb-01-window', await screen(page));
        const response = await win.sendAndWait().catch((e) => ({error: String(e).slice(0, 300)}));
        facts.sendStatus = response.status ? response.status() : response;
        facts.sendAnswer = response.json ? await response.json().catch(() => null) : null;
        await idle(page);
        facts.queuedLine = flat(await tab.queuedLine.innerText({timeout: 15_000}).catch(() => null));
    }
    facts.messages = await messages(tab);
    record('a2-nb-02-after', await screen(page));
    const mail = await app.mail.find({to: 'rvaca@mailinator.com', subject: 'u55b neighbour', since, timeoutMs: 30_000}).catch(() => null);
    facts.mail = mail ? mail.Subject : null;
}

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode};
    const {page, close} = await launch(app);
    try {
        if (mode === 'nb') {
            await neighbour(app, page, facts);
        } else {
            await steps(app, page, facts);
        }
        await signOut(page);
    } catch (e) {
        facts.error = String((e && e.stack) || e).slice(0, 1500);
        record('a2-error', await screen(page).catch(() => ({})));
        throw e;
    } finally {
        record(mode === 'nb' ? 'a2-nb-facts' : 'a2-facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
