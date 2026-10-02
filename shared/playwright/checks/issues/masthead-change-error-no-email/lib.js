// Helpers of walk.js here (issue report docs/issues/U53-A14-masthead-change-error-no-email.md).
// Requiring this file runs nothing. Every helper drives Settings > Users & Roles and the "Invite to
// a role" wizard as a person does; the users list through the U53 page object
// (shared/playwright/pages/UsersManagementPages.js).
const {idle, screen} = require('../../../probe');

const T = 30_000;

/** Per app, on PKP's default test dataset (docs/process/dataset.md): the role both people hold. */
const ROLE = {ojs: 'Section editor', omp: 'Series editor', ops: 'Moderator'};

/** The two dataset users the steps change: David Buskins (users list), Minoti Inoue (search path). */
const EDITED = {
    name: 'David Buskins',
    email: 'dbuskins@mailinator.com',
    username: 'dbuskins',
};
const SEARCHED = {
    name: 'Minoti Inoue',
    email: 'minoue@mailinator.com',
    username: 'minoue',
};

const SHOW = 'Appear on the masthead';
const HIDE = 'Does not appear on the masthead';

/** The users list (required inside forEachApp's fn). */
function usersList(page, app) {
    const {UsersListPage} = require('../../../pages/UsersManagementPages.js');
    return new UsersListPage(page, app.contextPath);
}

/** A held role's row of the wizard's roles table (not the new-role row, whose options name roles). */
function heldRow(page, role) {
    return page
        .getByRole('row')
        .filter({hasText: role})
        .filter({hasNot: page.getByLabel(/^Select a new role/)})
        .filter({has: page.getByRole('combobox')})
        .first();
}

/** The held row's masthead select: its value ("true"/"false") and the label shown. */
async function mastheadValue(page, role) {
    const select = heldRow(page, role).getByRole('combobox');
    await select.waitFor({timeout: T});
    const value = await select.inputValue();
    const label = await select.evaluate((s) => s.options[s.selectedIndex]?.text.trim() || null);
    return {value, label};
}

/** Users & Roles > a row's "Edit": the wizard's "Enter details" step for that user. */
async function openEdit(page, app, email) {
    const list = usersList(page, app);
    await list.goto();
    const row = list.row(email).first();
    await row.waitFor({timeout: T});
    await list.chooseAction(row, 'Edit');
    await page.getByRole('heading', {name: /STEP 1 - Enter details/}).waitFor({timeout: T});
    await idle(page);
}

/** Users & Roles > "Invite to a role", the email searched: the "Enter details" step. */
async function openSearch(page, app, email) {
    const list = usersList(page, app);
    await list.goto();
    await page.getByRole('button', {name: 'Invite to a role'}).click();
    await page.getByLabel(/Search for a user by email address/).fill(email);
    await page.getByRole('button', {name: 'Search User', exact: true}).click();
    await page
        .getByRole('heading', {name: /Enter details/})
        .first()
        .waitFor({timeout: T});
    await idle(page);
}

/**
 * Pick the other masthead value on the held row, record the confirmation, press `answer`
 * ("Confirm" or "Cancel"); returns what the screen and the request did. Never throws on the
 * outcome: an "Error" dialog, no dialog, no request are all recorded.
 */
async function changeMasthead(page, role, answer) {
    const before = await mastheadValue(page, role);
    const target = before.value === 'true' ? HIDE : SHOW;
    const requests = [];
    const onResponse = (r) => {
        if (/\/masthead\//.test(r.url()))
            requests.push({
                method: r.request().method(),
                override: r.request().headers()['x-http-method-override'] || null,
                url: r.url().replace(/^https?:\/\/[^/]+/, ''),
                status: r.status(),
            });
    };
    page.on('response', onResponse);
    await heldRow(page, role).getByRole('combobox').selectOption({label: target});
    const confirm = page.getByRole('dialog', {
        name: 'Confirm masthead visibility change',
    });
    await confirm.waitFor({timeout: T});
    const confirmation = (await confirm.innerText()).replace(/\s+/g, ' ').trim();
    await confirm.getByRole('button', {name: answer, exact: true}).click();
    await idle(page);
    // an "Error" dialog, when the app shows one, comes after the request's answer
    const error = page.getByRole('dialog').filter({hasText: /Error/});
    await error
        .first()
        .waitFor({timeout: 5_000})
        .catch(() => {});
    const shown = await screen(page);
    const errorText = (await error.count()) ? (await error.first().innerText()).replace(/\s+/g, ' ').trim() : null;
    if (errorText)
        await error
            .first()
            .getByRole('button', {name: 'OK'})
            .click()
            .catch(() => {});
    await idle(page);
    page.off('response', onResponse);
    return {
        before,
        target,
        confirmation,
        answer,
        requests,
        errorDialog: errorText,
        notices: shown.notices,
        after: await mastheadValue(page, role).catch((e) => String(e).slice(0, 200)),
    };
}

/** Mail to `to` since `since`: the subjects and the first body line naming the new setting. */
async function mailSince(app, to, since) {
    let found = null;
    try {
        found = await app.mail.find({to, since, timeoutMs: 15_000});
    } catch (e) {
        return {count: 0, subjects: []};
    }
    const result = await app.mail._search({to, since});
    const messages = result.messages || [];
    const full = await app.mail.fullMessage(found.ID).catch(() => null);
    const text = full && (full.Text || '').replace(/\s+/g, ' ');
    return {
        count: messages.length,
        subjects: messages.map((m) => m.Subject),
        newest: text ? text.slice(0, 600) : null,
    };
}

/** The masthead email's name in Settings > Workflow > Emails. */
const EMAIL_NAME = 'User Role Masthead Visibility Update Notification';

/**
 * Settings > Workflow > Emails: search the masthead email, press its "Edit", and record what
 * follows: the template's GET and its answer, whether "Edit Template" opens (its subject), and
 * whether a loading spinner is still up after the wait. Never throws on the outcome.
 */
async function openMastheadEmail(page, app) {
    const {ManageEmailsPage} = require('../../../pages/EmailsPages.js');
    const emails = new ManageEmailsPage(page, app.contextPath);
    await emails.goto();
    await emails.search(EMAIL_NAME);
    const button = emails.editButton(EMAIL_NAME);
    const listed = await button
        .waitFor({timeout: T})
        .then(() => true)
        .catch(() => false);
    const out = {listed, rowsShown: (await emails.rowNames()).length};
    if (!listed) return out;
    const answered = page
        .waitForResponse((r) => /\/api\/v1\/(mailables|emailTemplates)\/[^/?]+/.test(r.url()) && r.request().method() === 'GET', {
            timeout: T,
        })
        .catch(() => null);
    await button.click();
    const response = await answered;
    out.request = response ? {url: response.url().replace(/^https?:\/\/[^/]+/, ''), status: response.status()} : null;
    out.body = response
        ? await response
              .text()
              .then((t) => t.slice(0, 300))
              .catch(() => null)
        : null;
    const form = emails.templateWindow();
    out.templateWindow = await form
        .locator('input[name^="subject"]')
        .first()
        .waitFor({timeout: 15_000})
        .then(() => true)
        .catch(() => false);
    out.subject = out.templateWindow
        ? await emails
              .subjectBox('en')
              .inputValue()
              .catch(() => null)
        : null;
    out.bodyText = out.templateWindow ? ((await form.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 400) : null;
    // a spinner still showing after the wait: any visible loading element on the page
    out.spinner = await page.evaluate(() =>
        [...document.querySelectorAll('[class*="loading"], [class*="spinner"], [class*="Spinner"], [aria-busy="true"]')]
            .filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed')
            .map((e) => (e.className && e.className.baseVal === undefined ? String(e.className).slice(0, 80) : e.tagName))
            .slice(0, 5),
    );
    return out;
}

module.exports = {
    EMAIL_NAME,
    openMastheadEmail,
    ROLE,
    EDITED,
    SEARCHED,
    SHOW,
    HIDE,
    usersList,
    heldRow,
    mastheadValue,
    openEdit,
    openSearch,
    changeMasthead,
    mailSince,
};
