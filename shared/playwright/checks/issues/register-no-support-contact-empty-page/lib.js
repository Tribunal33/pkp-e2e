// Helpers of walk.js (issue report docs/issues/U02-A6-register-no-support-contact-empty-page.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses, except
// validationServer(), which serves the fleet's install under a copy of its config.inc.php with
// [email] require_validation = On (the report's precondition; the fleet's own file is never edited).
const fs = require('fs');
const path = require('path');
const http = require('http');
const {spawn} = require('child_process');
const {idle, outFile} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 3000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const REPO_ROOT = path.resolve(__dirname, '../../../../..');

/** Per-app screen words. */
const WORDS = {
    ojs: {noun: 'journal', initials: 'U02A'},
    omp: {noun: 'press', initials: 'U02A'},
    ops: {noun: 'server', initials: 'U02A'},
};

function answers(url) {
    return new Promise((resolve) => {
        const req = http.get(url, (res) => {
            res.resume();
            resolve(res.statusCode);
        });
        req.on('error', () => resolve(0));
        req.setTimeout(5000, () => {
            req.destroy();
            resolve(0);
        });
    });
}

/**
 * Serve the fleet's install (its database, files and code) on `port` under a copy of the
 * fleet's config with `require_validation = On`, `base_url` on that port (the activation link
 * is built from it) and a session cookie of its own; `smtpPort` points the mail at another
 * port (a dead one stands for an unreachable mail server); `keys` sets other existing keys of the
 * copy ({expiration_days: 0}). Returns {url, log, mark(), since(m), stop()}.
 */
async function validationServer(app, {port, smtpPort, name = 'validation', keys = {}}) {
    const src = fs.readFileSync(path.resolve(REPO_ROOT, app.configFile), 'utf8');
    const url = `http://127.0.0.1:${port}`;
    let text = src
        .replace(/^require_validation\s*=.*$/m, 'require_validation = On')
        .replace(/^base_url\s*=.*$/m, `base_url = "${url}"`)
        .replace(/^session_cookie_name\s*=\s*(\S+)\s*$/m, (m, v) => `session_cookie_name = ${v.replace(/"/g, '')}V${port}`);
    if (smtpPort) text = text.replace(/^smtp_port\s*=.*$/m, `smtp_port = ${smtpPort}`);
    for (const [k, v] of Object.entries(keys)) {
        const re = new RegExp(`^${k}\\s*=.*$`, 'm');
        if (!re.test(text)) throw new Error(`no ${k} key in the config`);
        text = text.replace(re, `${k} = ${v}`);
    }
    if (!/^require_validation = On$/m.test(text)) throw new Error('no require_validation key in the config');
    const config = outFile(`config-${name}.inc.php`);
    fs.writeFileSync(config, text);
    const log = outFile(`server-${name}.log`);
    if (await answers(`${url}/index.php/index`)) throw new Error(`port ${port} is taken`);
    const fd = fs.openSync(log, 'a');
    const child = spawn('php', ['-d', 'max_execution_time=120', '-S', `127.0.0.1:${port}`, '-t', path.resolve(REPO_ROOT, app.root)], {
        cwd: path.resolve(REPO_ROOT, app.root),
        env: {...process.env, PKP_CONFIG_FILE: config},
        stdio: ['ignore', fd, fd],
    });
    for (let i = 0; i < 60 && !(await answers(`${url}/index.php/index`)); i++) await sleep(500);
    const size = () => fs.statSync(log).size;
    return {
        url,
        config,
        log,
        mark: size,
        since: (from) => fs.readFileSync(log, 'utf8').slice(from).split('\n').filter((l) => /error|exception|warning|could not be established|\[5\d\d\]|: 5\d\d/i.test(l)).map((l) => flat(l, 600)),
        stop: async () => {
            child.kill('SIGTERM');
            await sleep(500);
        },
    };
}

/**
 * Administration › Hosted Journals (Presses, Servers) › "Create …": title, initials, principal
 * contact, Country, path, English, "Enable this journal to appear publicly on the site", "Save".
 * The page must be signed in as admin. Returns the save's status.
 */
async function createJournal(page, app, {name, initials, path: urlPath, contactName, contactEmail}) {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const {WORDS: W} = require('../section-editors-not-assigned-second-journal/lib.js');
    const L = app.line && /3_[34]/.test(app.line) ? '' : '/en';
    const hosted = new HostedJournalsPage(page, W[app.name]);
    await page.goto(`/index.php/index${L}/admin/contexts`);
    await hosted.expectOpen();
    const win = await hosted.openCreate();
    await win.type(win.title('en'), name);
    await win.type(win.initials('en'), initials);
    await win.type(win.contactName, contactName);
    await win.type(win.contactEmail, contactEmail);
    await win.country.selectOption({label: 'Canada'});
    await win.type(win.path, urlPath);
    if (await win.languageBox('en').count()) {
        await win.setBox(win.languageBox('en'), true);
        await win.setBox(win.primaryChoice('en'), true);
    }
    await win.setBox(win.enableBox, true);
    const r = await win.pressSave();
    await page.waitForURL(/\/admin\/wizard\/\d+/, {timeout: T}).catch(() => {});
    return r.status();
}

/**
 * The Register form at `/index.php/<contextPath>/user/register`, filled as a newcomer would
 * (email <username>@mailinator.com, password the username twice) and sent. Returns the POST's
 * status, where it landed, the page title, heading, body text and the form's errors.
 */
async function register(page, contextPath, {givenName, familyName, username}) {
    await page.goto(`/index.php/${contextPath}/user/register`);
    const form = page.locator('form#register');
    await form.waitFor({state: 'visible', timeout: T});
    await form.locator('input[name="givenName"]').fill(givenName);
    await form.locator('input[name="familyName"]').fill(familyName);
    await form.locator('input[name="affiliation"]').fill(familyName);
    await form.locator('select[name="country"]').selectOption({label: 'Canada'});
    await form.locator('input[name="email"]').fill(`${username}@mailinator.com`);
    await form.locator('input[name="username"]').fill(username);
    await form.locator('input[name="password"]').fill(username + username);
    await form.locator('input[name="password2"]').fill(username + username);
    const consent = form.locator('input[name="privacyConsent"]');
    if (await consent.count()) await consent.check();
    const [resp] = await Promise.all([
        page.waitForResponse((r) => r.request().method() === 'POST' && /\/user\/register/.test(r.url()), {timeout: 60_000}),
        form.locator('button.submit').click(),
    ]);
    await page.waitForLoadState('load');
    return {
        status: resp.status(),
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        title: await page.title(),
        heading: flat(await page.locator('h1').first().innerText({timeout: 2000}).catch(() => null), 200),
        body: flat(await page.locator('body').innerText({timeout: 2000}).catch(() => ''), 800),
        bytes: (await page.content()).length,
        errors: await page.locator('#formErrors li, .pkp_form_error, .cmp_notification').allInnerTexts().catch(() => []),
    };
}

/** The context's Login page: type the username and its password, press "Login"; what it shows. */
async function tryLogin(page, contextPath, username) {
    await page.goto(`/index.php/${contextPath}/login`);
    await page.locator('input#username').fill(username);
    await page.locator('input#password').fill(username + username);
    await Promise.all([page.waitForLoadState('load'), page.locator('form#login button[type="submit"]').click()]);
    await page.waitForURL((u) => !/\/login\/signIn/.test(u.pathname), {timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    const onLogin = (await page.locator('form#login').count()) > 0;
    return {
        signedIn: !onLogin,
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        message: flat(await page.locator('form#login .pkp_form_error, form#login .cmp_notification, .pkp_form_error').first().innerText({timeout: 2000}).catch(() => null), 600),
    };
}

/**
 * Settings › Journal › "Contact" of `contextPath`: type the "Technical Support Contact" name and
 * email and press "Save". The page must be signed in as one of the context's managers.
 */
async function setSupportContact(page, contextPath, {name, email}) {
    const {SettingsPages} = require('../../../pages/ContextIdentityPages.js');
    const settings = new SettingsPages(page, contextPath);
    const form = await settings.openJournalTab('Contact');
    const before = {
        name: await form.control('contact-supportName-control').inputValue(),
        email: await form.control('contact-supportEmail-control').inputValue(),
    };
    await form.control('contact-supportName-control').fill(name);
    await form.control('contact-supportEmail-control').fill(email);
    await form.saveButton.click();
    const saved = await form.savedStatus.waitFor({state: 'visible', timeout: T}).then(() => true, () => false);
    return {before, saved};
}

/**
 * Settings › Users & Roles › "Users" of `contextPath`: the row holding `email`, its "…" menu,
 * "Enable User", "OK" in the "Enable {name}" window. Returns the row before and the menu's labels.
 */
async function enableUser(page, contextPath, {email, fullName}) {
    const {UsersListPage, DisableUserWindow} = require('../../../pages/UsersManagementPages.js');
    const list = new UsersListPage(page, contextPath);
    await list.goto();
    const row = list.row(email);
    await row.first().waitFor({state: 'visible', timeout: T});
    const rowText = flat(await row.first().innerText());
    const labels = await list.menuLabels(row.first());
    await list.chooseAction(row.first(), 'Enable User');
    const win = new DisableUserWindow(page, `Enable ${fullName}`);
    await win.expectOpen();
    const text = flat(await win.dialog.innerText());
    await win.ok();
    return {row: rowText, labels, window: text};
}

/** The newest message to `to` since `since` (Mailpit summary: subject and sender), or null after `wait` ms. */
async function mailFor(app, to, since, wait = 20_000) {
    try {
        const m = await app.mail.find({to, since, timeoutMs: wait});
        return {subject: m.Subject, from: m.From && `${m.From.Name} <${m.From.Address}>`, snippet: flat(m.Snippet, 300)};
    } catch {
        return null;
    }
}

module.exports = {T, sleep, flat, WORDS, validationServer, createJournal, register, tryLogin, setSupportContact, enableUser, mailFor};
