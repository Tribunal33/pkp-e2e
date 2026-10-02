// Helpers of the U51 scheduled-task walks (issue reports U51 A27, A8, A29). Requiring this
// file runs nothing. Each screen helper drives a screen a journal manager uses; `runTask`
// and `runJobs` are the commands a site's administrator (or the site's timer) runs in the
// application's root.
const {execFileSync} = require('child_process');
const path = require('path');
const {idle, shot} = require('../../../probe');

const T = 30_000;
const CTX = 'publicknowledge';
const SUBSCRIPTION_MODE = 'The journal will require subscriptions to access some or all of its contents.';
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Settings › Distribution › "Access": "Publishing Mode" set to subscriptions, "Save". */
async function requireSubscriptions(page) {
    const {AccessSettings} = require('../../../pages/SubscriptionsPages.js');
    const access = new AccessSettings(page, CTX);
    await access.goto();
    const radio = access.modeRadio(SUBSCRIPTION_MODE);
    await radio.check();
    const r = await access.save();
    return {checked: await radio.isChecked(), save: r.status()};
}

/**
 * Payments › "Subscription Policies": the contact boxes filled, the given selects chosen
 * (by visible label) and boxes ticked, "Save". Reads the tab back after a reload.
 */
async function setPolicies(page, {name, email, address, selects = {}, ticks = []}) {
    const {PaymentsPage} = require('../../../pages/SubscriptionsPages.js');
    const payments = new PaymentsPage(page, CTX);
    await payments.gotoTab('Subscription Policies');
    const form = payments.panel('Subscription Policies').locator('form').first();
    await form.locator('[name="subscriptionName"]').fill(name);
    await form.locator('[name="subscriptionEmail"]').fill(email);
    await form.locator('[name="subscriptionMailingAddress"]').fill(address);
    for (const [field, label] of Object.entries(selects)) {
        await form.locator(`select[name="${field}"]`).selectOption({label});
    }
    for (const field of ticks) await form.locator(`input[name="${field}"]`).check();
    const saved = page.waitForResponse((r) => /saveSubscriptionPolicies/i.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await idle(page).catch(() => {});
    await shot(page, 'subscription-policies').catch(() => {});
    // read back
    await payments.gotoTab('Subscription Policies');
    const again = payments.panel('Subscription Policies').locator('form').first();
    const back = {};
    for (const field of Object.keys(selects)) back[field] = flat(await again.locator(`select[name="${field}"] option:checked`).innerText());
    for (const field of ticks) back[field] = await again.locator(`input[name="${field}"]`).isChecked();
    back.subscriptionEmail = await again.locator('[name="subscriptionEmail"]').inputValue();
    return {save: r ? r.status() : null, back};
}

/**
 * Issues › "Back Issues" › the issue's "Edit" › "Access": "Access Status" "Subscription",
 * "Open access date" picked as today's date in the calendar (or `typed`, YYYY-MM-DD), "Save".
 * Reads it back.
 */
async function issueOpensToday(page, name, typed = null) {
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    const issues = new IssuesAdmin(page, CTX);
    await issues.goto('Back Issues');
    let win = await issues.openManagement('Back Issues', name);
    let form = await win.openAccess();
    await form.locator('select#accessStatus').selectOption({label: 'Subscription'});
    const box = form.locator('input[name^="openAccessDate"]').filter({visible: true}).first();
    await box.click();
    if (typed) {
        await box.fill(typed);
        await page.keyboard.press('Escape');
    } else {
        await page.locator('#ui-datepicker-div .ui-datepicker-today a').click();
    }
    const picked = await box.inputValue();
    const saved = page.waitForResponse((r) => /update-access/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await idle(page).catch(() => {});
    await page.waitForTimeout(800);
    await issues.goto('Back Issues');
    win = await issues.openManagement('Back Issues', name);
    form = await win.openAccess();
    const out = {
        picked,
        save: r ? r.status() : null,
        accessStatus: flat(await form.locator('select#accessStatus option:checked').innerText()),
        openAccessDate: await form.locator('input[name^="openAccessDate"]').filter({visible: true}).first().inputValue(),
    };
    await shot(page, 'issue-access').catch(() => {});
    await win.close();
    return out;
}

/** `php lib/pkp/tools/scheduler.php <args>` in the app's root, under the install's config. */
function scheduler(app, args) {
    try {
        const out = execFileSync('php', ['lib/pkp/tools/scheduler.php', ...args], {
            cwd: app.root,
            env: {...process.env, PKP_CONFIG_FILE: app.configFile},
            encoding: 'utf8',
            timeout: 300_000,
        });
        return {status: 0, out};
    } catch (e) {
        return {status: e.status, out: `${e.stdout || ''}${e.stderr || ''}`};
    }
}

/** The task run as the site's scheduler runs it: `scheduler.php test --name=<class>`. */
function runTask(app, cls) {
    return scheduler(app, ['test', `--name=${cls}`]);
}

/** The schedule as `scheduler.php list` prints it, the line naming the class. */
function scheduleLine(app, cls) {
    const {out} = scheduler(app, ['list']);
    const short = cls.split('\\').pop();
    return (out || '').split('\n').filter((l) => l.includes(short)).map((l) => l.replace(/\s+/g, ' ').trim());
}

/** The newest scheduled-task log of a class (the "Task process started." lines). */
function lastTaskLog(app, short) {
    const fs = require('fs');
    const cfg = fs.readFileSync(path.resolve(app.root, path.basename(app.configFile)), 'utf8');
    const m = cfg.match(/^files_dir\s*=\s*(.+)$/m);
    const dir = path.join(m ? m[1].trim() : '', 'scheduledTaskLogs');
    try {
        const files = fs.readdirSync(dir).filter((f) => f.includes(short)).map((f) => path.join(dir, f));
        files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
        return files.length ? {file: path.basename(files[0]), text: fs.readFileSync(files[0], 'utf8')} : null;
    } catch {
        return null;
    }
}

/** Mailpit: the messages to an address whose subject holds `subject`. */
async function mails(app, to, subject) {
    const res = await app.mail._search({to, subject});
    return (res.messages || []).map((m) => ({subject: m.Subject, from: (m.From || {}).Address, created: m.Created}));
}

/** Today's date, as the server (UTC) reads it: YYYY-MM-DD. */
function today() {
    return new Date().toISOString().slice(0, 10);
}

module.exports = {T, CTX, flat, requireSubscriptions, setPolicies, issueOpensToday, scheduler, runTask, scheduleLine, lastTaskLog, mails, today};
