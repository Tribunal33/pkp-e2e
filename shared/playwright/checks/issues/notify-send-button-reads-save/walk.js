// U55 A1 walk (issue report docs/issues/U55-A1-notify-send-button-reads-save.md).
// On PKP's default test dataset:
//   steps (default): admin ticks the context under Site Settings › "Site Setup" › "Bulk Emails" and saves;
//     rvaca opens Settings › Users & Roles › "Notify", ticks the manager role, types a subject and a text,
//     reads the button under the form, presses it, reads the window, presses "Send Email"; the mail is read.
//   nb: the neighbour check of the fix: the other forms on the default page keep "Save" (Site Settings ›
//     "Bulk Emails", Settings › Journal › "Masthead"), and the Notify button still opens the confirmation,
//     whose "Cancel" sends nothing.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/notify-send-button-reads-save/walk.js [nb]
const {forEachApp, launch, signIn, signOut, record, screen, idle} = require('../../../probe');

const mode = process.argv[2] || 'steps';

const CONTEXT_NAME = {ojs: 'Journal of Public Knowledge', omp: 'Public Knowledge Press', ops: 'Public Knowledge Preprint Server'};
const MANAGER_ROLE = {ojs: 'Journal manager', omp: 'Press manager', ops: 'Preprint Server manager'};
const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();

/** The labels of a form footer's buttons, in order. */
async function footerButtons(footer) {
    return (await footer.getByRole('button').allInnerTexts()).map(flat).filter(Boolean);
}

/** Steps 1-3: admin ticks the context under "Bulk Emails" and saves. */
async function allowBulkEmail(app, page, facts) {
    const {SiteBulkEmailsTab} = require('../../../pages/NotifyUsersPages.js');
    const tab = new SiteBulkEmailsTab(page);
    await tab.goto();
    facts.bulkEmailsButtons = await footerButtons(tab.panel.locator('.pkpFormPage__footer'));
    await tab.box(CONTEXT_NAME[app.name]).check();
    await tab.save();
    record('a1-01-bulk-emails-saved', await screen(page));
}

async function steps(app, page, facts) {
    const {NotifyTab} = require('../../../pages/NotifyUsersPages.js');
    await signIn(page, 'admin');
    await allowBulkEmail(app, page, facts);
    await signOut(page);
    await signIn(page, 'rvaca');
    const tab = new NotifyTab(page, app.contextPath);
    await page.goto(tab.url('#notify'));
    await idle(page);
    await tab.ready();
    await tab.fill({roles: [MANAGER_ROLE[app.name]], subject: 'Office closed', body: 'The office is closed on Friday.'});
    facts.notifyFooterButtons = await footerButtons(tab.footer);
    record('a1-02-notify-filled', await screen(page));
    const since = new Date();
    const win = await tab.pressSubmit();
    facts.windowTitle = flat(await win.title.innerText().catch(() => null));
    facts.windowMessage = await win.message().catch(() => null);
    facts.windowButtons = await win.buttonLabels();
    record('a1-03-window', await screen(page));
    const response = await win.sendAndWait();
    facts.sendStatus = response.status();
    facts.sendAnswer = await response.json().catch(() => null);
    await idle(page);
    facts.queuedLine = flat(await tab.queuedLine.innerText({timeout: 15_000}).catch(() => null));
    record('a1-04-sent', await screen(page));
    facts.mail = {};
    for (const user of ['admin', 'rvaca', 'dbarnes']) {
        const to = user === 'admin' ? 'pkpadmin@mailinator.com' : `${user}@mailinator.com`;
        const mail = await app.mail.find({to, since, timeoutMs: user === 'dbarnes' ? 5_000 : 30_000}).catch(() => null);
        facts.mail[user] = mail ? mail.Subject : null;
    }
}

async function neighbour(app, page, facts) {
    const {NotifyTab} = require('../../../pages/NotifyUsersPages.js');
    await signIn(page, 'admin');
    await allowBulkEmail(app, page, facts);
    // Settings › Journal (Press, Server) › "Masthead": a settings form on the default page
    await page.goto(`/index.php/${app.contextPath}/en/management/settings/context`);
    await idle(page);
    const masthead = page.locator('#masthead .pkpFormPage__footer').first();
    facts.mastheadButtons = await footerButtons(masthead).catch((e) => `error: ${String(e).slice(0, 200)}`);
    record('a1-nb-01-masthead', await screen(page));
    await signOut(page);
    await signIn(page, 'rvaca');
    const tab = new NotifyTab(page, app.contextPath);
    await page.goto(tab.url('#notify'));
    await idle(page);
    await tab.ready();
    await tab.fill({roles: [MANAGER_ROLE[app.name]], subject: 'u55a neighbour', body: 'Not to be sent.'});
    facts.notifyFooterButtons = await footerButtons(tab.footer);
    const since = new Date();
    const win = await tab.pressSubmit();
    facts.windowTitle = flat(await win.title.innerText().catch(() => null));
    facts.windowButtons = await win.buttonLabels();
    record('a1-nb-02-window', await screen(page));
    await win.cancel();
    facts.afterCancel = {queued: await tab.queuedLine.count(), subject: await tab.subject.inputValue()};
    record('a1-nb-03-cancelled', await screen(page));
    const mail = await app.mail.find({to: 'rvaca@mailinator.com', since, timeoutMs: 8_000}).catch(() => null);
    facts.mailAfterCancel = mail ? mail.Subject : null;
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
        record('a1-error', await screen(page).catch(() => ({})));
        throw e;
    } finally {
        record(mode === 'nb' ? 'a1-nb-facts' : 'a1-facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
