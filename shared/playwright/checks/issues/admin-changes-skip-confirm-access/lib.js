// Helpers of walk.js (issue report docs/issues/U01-A13-admin-changes-skip-confirm-access.md):
// the Confirm Access gate of Administration, Hosted Journals' "Create …" and "Remove", and
// Site Settings' "Minimum password length" save, driven through the screens. Requiring this
// file runs nothing. Page objects are required inside the functions, after forEachApp has set
// the app's environment.
const {idle} = require('../../../probe');
const {setConfigValue} = require('../search-config-settings-do-nothing/lib.js');
const {WORDS} = require('../section-editors-not-assigned-second-journal/lib.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const path = (page) => page.url().replace(/^https?:\/\/[^/]+/, '');
const BOX = /^Minimum password length/;

/**
 * What an administrator does in config.inc.php: `[security] password_timeout = <minutes>`
 * (0 turns the gate off). Returns {before, restore}.
 */
function setPasswordTimeout(app, minutes) {
    return setConfigValue(app, 'security', 'password_timeout', String(minutes));
}

/** Is the page the "Confirm Access" form? Returns its heading, description and address, or null. */
async function confirmAccessShown(page) {
    if (!/\/admin\/confirmAccess/.test(page.url())) return null;
    const main = page.locator('main').first();
    return {
        address: path(page),
        heading: flat(await page.locator('h1').first().innerText().catch(() => null), 100),
        text: flat(await main.innerText().catch(() => null), 300),
    };
}

/**
 * On "Confirm Access": type the password and press "Submit". Returns where it landed and the
 * page notices then shown.
 */
async function answerConfirmAccess(page, password = 'admin') {
    await page.locator('form#confirmPassword input[name="password"]').fill(password);
    await Promise.all([
        page.waitForNavigation({timeout: 60_000}).catch(() => null),
        page.locator('form#confirmPassword').getByRole('button', {name: 'Submit', exact: true}).click(),
    ]);
    await idle(page).catch(() => null);
    const notices = await page.locator('.app__notifications .pkpNotification, .pkp_notification').allInnerTexts().catch(() => []);
    return {landed: path(page), notices: notices.map((n) => flat(n, 200))};
}

/**
 * Open an Administration address by typing it. Returns {landed, confirmAccess} where
 * `confirmAccess` is the gate's form when it asked (null when the page opened).
 */
async function openAdmin(page, app, address) {
    const res = await page.goto(app.url(address));
    await idle(page).catch(() => null);
    return {status: res && res.status(), landed: path(page), confirmAccess: await confirmAccessShown(page)};
}

/** The scratch contexts the steps create, by app. */
function scratch(app, which) {
    const n = WORDS[app.name].noun;
    return which === 'first'
        ? {name: `sxx6 ${n}`, initials: 'SXX6', path: 'sxx6', email: 'sxx6@mailinator.com'}
        : which === 'second'
          ? {name: `sxx6 Second ${n}`, initials: 'SXX6B', path: 'sxx6b', email: 'sxx6b@mailinator.com'}
          : {name: `sxx6 Third ${n}`, initials: 'SXX6C', path: 'sxx6c', email: 'sxx6c@mailinator.com'};
}

/** The Hosted Journals page object on the page already open (no navigation). */
function hostedPage(page, app) {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    return new HostedJournalsPage(page, WORDS[app.name]);
}

/**
 * On the open Hosted Journals page: "Create …", the form filled, "Save". Returns the save's
 * status and error text, and where the page went (the wizard, or "Confirm Access").
 */
async function createOnOpenPage(page, app, ctx) {
    const hosted = hostedPage(page, app);
    await hosted.expectOpen();
    const win = await hosted.openCreate();
    await win.type(win.title('en'), ctx.name);
    await win.type(win.initials('en'), ctx.initials);
    await win.type(win.contactName, ctx.name);
    await win.type(win.contactEmail, ctx.email);
    await win.country.selectOption({label: 'Canada'});
    await win.type(win.path, ctx.path);
    if (await win.languageBox('en').count()) {
        await win.setBox(win.languageBox('en'), true);
        await win.setBox(win.primaryChoice('en'), true);
    }
    await win.setBox(win.enableBox, true);
    const r = await win.pressSave();
    const body = await r.text().catch(() => '');
    await page.waitForURL(/\/admin\/(wizard\/\d+|confirmAccess)/, {timeout: 15_000}).catch(() => {});
    await idle(page).catch(() => null);
    const stillOpen = (await win.root.count()) > 0;
    return {
        status: r.status(),
        answer: r.status() >= 400 ? flat(body, 300) : undefined,
        landed: path(page),
        confirmAccess: await confirmAccessShown(page),
        windowStillOpen: stillOpen,
        windowText: stillOpen ? flat(await win.root.innerText().catch(() => null), 400) : undefined,
    };
}

/**
 * On the open Hosted Journals page: the row's arrow, "Remove", "OK" in "Confirm". Returns the
 * question, the delete's status and answer, whether the row is still listed, and any alert.
 */
async function removeOnOpenPage(page, app, rowPath) {
    const hosted = hostedPage(page, app);
    await hosted.expectOpen();
    const asked = [];
    const onDialog = (d) => {
        asked.push(d.message());
        d.accept().catch(() => {});
    };
    page.on('dialog', onDialog);
    try {
        const dialog = await hosted.openRemove(rowPath);
        const question = flat(await dialog.root.innerText(), 300);
        const answered = page.waitForResponse((r) => r.request().method() === 'POST' && /delete-context/.test(r.url()), {timeout: 60_000});
        await dialog.button('OK').click();
        const r = await answered;
        const body = await r.text().catch(() => '');
        await idle(page).catch(() => null);
        await sleep(1500);
        // A refused removal can leave "Confirm" open over the page: record it and close it the
        // way a person would ("Cancel", or Escape while its buttons are greyed).
        let confirmLeftOpen = false;
        if (await dialog.root.isVisible().catch(() => false)) {
            confirmLeftOpen = flat(await dialog.root.innerText().catch(() => ''), 300);
            const cancel = dialog.button('Cancel');
            if (await cancel.isEnabled().catch(() => false)) await cancel.click().catch(() => {});
            else await page.keyboard.press('Escape').catch(() => {});
            await dialog.root.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
            await sleep(600);
        }
        return {
            question,
            status: r.status(),
            answer: flat(body, 300),
            confirmLeftOpen,
            rowListed: (await hosted.row(rowPath).count()) > 0,
            alerts: asked,
            notices: (await page.locator('.app__notifications .pkpNotification, .pkp_notification').allInnerTexts().catch(() => [])).map((n) => flat(n, 200)),
            landed: path(page),
        };
    } finally {
        page.off('dialog', onDialog);
    }
}

/** The rows' paths on the Hosted Journals page (opened by the caller). */
async function hostedPaths(page, app) {
    const hosted = hostedPage(page, app);
    await hosted.expectOpen();
    return hosted.paths();
}

/**
 * On the open Site Settings page: "Site Setup" › "Security" ("Settings" where the box sits there,
 * 3.5) and the "Minimum password length (characters)" box. Returns the box (and its form's Save).
 */
async function minLengthBox(page) {
    const {SiteSettingsPage} = require('../../../pages/SiteSettingsPages.js');
    const site = new SiteSettingsPage(page);
    await site.expectOpen();
    await site.openTop('Site Setup');
    const side = (await site.sideTab('Site Setup', 'Security').count()) ? 'Security' : 'Settings';
    await site.open('Site Setup', side);
    const box = page.getByRole('tabpanel', {name: side, exact: true}).getByLabel(BOX);
    await box.waitFor({timeout: T});
    const form = box.locator('xpath=ancestor::form[1]');
    return {side, box, save: form.getByRole('button', {name: 'Save', exact: true}), form};
}

/** Read the box's value on the open Site Settings page. */
async function readMinLength(page) {
    const {side, box} = await minLengthBox(page);
    return {side, value: await box.inputValue()};
}

/**
 * On the open Site Settings page: type `value` in the box and press "Save". Returns the site save's
 * status and answer, the form's status line and error text, and the page notices.
 */
async function saveMinLength(page, value) {
    const {side, box, save, form} = await minLengthBox(page);
    const before = await box.inputValue();
    await box.fill(String(value));
    await box.blur();
    const answered = page.waitForResponse((r) => /\/api\/v1\/site(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await save.click();
    const r = await answered;
    const body = await r.text().catch(() => '');
    await idle(page).catch(() => null);
    await sleep(800);
    return {
        side,
        before,
        status: r.status(),
        answer: r.status() >= 400 ? flat(body, 300) : undefined,
        formStatus: flat(await form.locator('.pkpFormPage__status, [role="status"]').allInnerTexts().then((a) => a.join(' | ')).catch(() => null), 200),
        formErrors: flat(await form.locator('.pkpFormErrors, .pkpFieldError').allInnerTexts().then((a) => a.join(' | ')).catch(() => null), 300),
        notices: (await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => [])).map((n) => flat(n, 200)),
    };
}

module.exports = {
    T, sleep, flat, path, WORDS, setPasswordTimeout, confirmAccessShown, answerConfirmAccess, openAdmin,
    scratch, createOnOpenPage, removeOnOpenPage, hostedPaths, readMinLength, saveMinLength,
};
