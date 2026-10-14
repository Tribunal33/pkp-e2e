// Helpers for the U03 SW1 drift sweep (sw1.js). Kept with the script; no assertions, only reads.
const {launch, screen, shot, record, idle} = require('../../../probe');

const flat = (s, n = 400) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TABS = ['identity', 'contact', 'roles', 'publicProfile', 'changePassword', 'notificationSettings', 'apiSettings'];
const FORMS = {
    identity: 'identityForm', contact: 'contactForm', roles: 'rolesForm', publicProfile: 'publicProfileForm',
    changePassword: 'changePasswordForm', notificationSettings: 'notificationSettingsForm', apiSettings: 'apiProfileForm',
};
const SAVED = 'Your changes have been saved.';
const QUESTION = 'The data on this form has changed. Do you wish to continue without saving?';
const SUBJECT = 'Confirm account contact email change request';

/**
 * A browser with the script's own dialog listener: `b.mode` ('accept' | 'dismiss') answers confirm()/alert(),
 * a page-leave question is always accepted; every dialog is kept in `b.seen`.
 */
async function browserFor(app, label) {
    const b = await launch(app);
    b.label = label;
    b.mode = 'accept';
    b.seen = [];
    b.page.on('dialog', async (d) => {
        const answer = d.type() === 'beforeunload' ? 'accept' : b.mode;
        b.seen.push({type: d.type(), message: d.message(), answered: answer, url: b.page.url(), at: new Date().toISOString()});
        if (answer === 'accept') await d.accept().catch(() => {});
        else await d.dismiss().catch(() => {});
    });
    b.since = (n) => b.seen.slice(n).map((d) => ({type: d.type, message: d.message, answered: d.answered}));
    // main-frame document responses: a redirect chain as data
    b.chain = [];
    b.page.on('response', (res) => {
        try {
            if (res.request().resourceType() !== 'document' || res.frame() !== b.page.mainFrame()) return;
            b.chain.push(`${res.request().method()} ${res.status()} ${res.url().replace(app.baseURL, '').replace(/key=[^&]+/, 'key=…')}`);
        } catch { /* frame gone */ }
    });
    b.takeChain = () => b.chain.splice(0, b.chain.length);
    // the profile tabs' requests
    b.saves = [];
    b.tabLoads = [];
    b.page.on('request', (r) => {
        const u = r.url();
        if (r.method() === 'POST' && /\/profile-tab\/save-/.test(u)) b.saves.push(u.replace(app.baseURL, ''));
        if (r.method() === 'GET' && /\/profile-tab\/[a-z-]+/i.test(u)) b.tabLoads.push(u.replace(app.baseURL, '').replace(/\?.*$/, ''));
    });
    return b;
}

async function snap(page, name, extra) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 300)}; }
    if (extra) s.extra = extra;
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

const tabLink = (page, t) => page.locator(`#profileTabs > ul > li > a[name="${t}"]`);
const panel = (page) => page.locator('#profileTabs [role="tabpanel"][aria-hidden="false"]');
const formOf = (page, t) => page.locator(`form#${FORMS[t]}`);

async function waitForm(page, t, timeout = 30000) {
    await formOf(page, t).first().waitFor({state: 'visible', timeout});
    await idle(page);
}

/** Press a tab as a person does and wait for its form (or for nothing, when a question kept the old tab). */
async function pressTab(page, t, {expectForm = true} = {}) {
    await tabLink(page, t).click();
    await sleep(800);
    await idle(page);
    if (expectForm) await waitForm(page, t).catch(() => {});
}

async function selectedTab(page) {
    return page.locator('#profileTabs > ul > li[aria-selected="true"] > a').getAttribute('name').catch(() => null);
}

/** What the open tab offers, read from the DOM. */
async function tabFacts(page) {
    return page.evaluate(() => {
        const p = document.querySelector('#profileTabs [role="tabpanel"][aria-hidden="false"]');
        if (!p) return null;
        const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
        const txt = (e) => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
        const all = txt(p);
        return {
            buttons: [...p.querySelectorAll('button, input[type=submit], input[type=button]')].filter(vis).map((b) => txt(b) || b.value),
            links: [...p.querySelectorAll('a')].filter(vis).map((a) => ({text: txt(a), href: (a.getAttribute('href') || '').trim(), target: a.getAttribute('target')})),
            labels: [...p.querySelectorAll('label, legend')].filter(vis).map(txt).filter(Boolean),
            legend: all.includes('Required fields are marked with an asterisk: *'),
            privacy: all.includes('Your data is stored in accordance with our privacy statement.'),
            endsWithPrivacy: /Your data is stored in accordance with our privacy statement\.$/.test(all),
            tail: all.slice(-160),
            inputs: [...p.querySelectorAll('input, select, textarea')].filter((i) => i.type !== 'hidden').map((i) => ({
                tag: i.tagName, type: i.type, name: i.name, maxlength: i.getAttribute('maxlength'), readonly: i.readOnly,
                disabled: i.disabled, required: i.required || i.classList.contains('required'), visible: vis(i), value: i.type === 'password' ? null : (i.value || '').slice(0, 80),
                checked: i.type === 'checkbox' ? i.checked : undefined,
            })),
            editors: [...p.querySelectorAll('.tox-tinymce')].map((ed) => ({
                visible: vis(ed),
                toolbar: [...ed.querySelectorAll('.tox-toolbar__group button, .tox-toolbar__group [role=button], .tox-tbtn')].map((b) => b.getAttribute('aria-label') || b.title).filter(Boolean),
                height: ed.getBoundingClientRect().height,
            })),
            descriptions: [...p.querySelectorAll('.description, .pkp_helpers_form_input_title_text, span.sub_label, label.sub_label, p')].filter(vis).map(txt).filter(Boolean).slice(0, 40),
            fieldErrors: [...p.querySelectorAll('label.error')].filter(vis).map(txt).filter(Boolean),
            inTabNotice: [...p.querySelectorAll('[id$="Notification"], .pkp_notification')].filter(vis).map(txt).filter(Boolean),
        };
    });
}

/** The page notices (toasts) visible now. */
async function toasts(page) {
    return page.locator('.app__notifications .pkpNotification').allInnerTexts().then((a) => a.map((t) => flat(t, 200))).catch(() => []);
}

/** The top-right user button: its accessible text (initials + username). */
async function userButton(page) {
    const b = page.locator('[data-cy="app-user-nav"] > button').first();
    return {
        text: flat(await b.innerText().catch(() => null), 120),
        aria: await b.getAttribute('aria-label').catch(() => null),
        name: flat(await b.evaluate((e) => e.textContent).catch(() => null), 120),
    };
}

/** Open the user menu and list its entries. */
async function userMenu(page) {
    await page.locator('[data-cy="app-user-nav"] > button').first().click();
    await sleep(500);
    const items = await page.locator('[data-cy="app-user-nav"] nav a, [data-cy="app-user-nav"] nav button').allInnerTexts().catch(() => []);
    return items.map((t) => flat(t, 80));
}

/** Read an editor's content by the textarea name prefix inside a form. */
function editorIn(page, formSel, prefix) {
    return page.evaluate(([f, n]) => {
        const tas = [...document.querySelectorAll(`${f} textarea`)].filter((t) => (t.getAttribute('name') || '').startsWith(n));
        return tas.map((ta) => {
            const e = window.tinymce && window.tinymce.get(ta.id);
            return {id: ta.id, name: ta.getAttribute('name'), init: !!(e && e.initialized), text: e && e.getBody() ? e.getBody().innerText.trim() : null};
        });
    }, [formSel, prefix]);
}

async function waitEditors(page, formSel) {
    await page.waitForFunction((f) => {
        const tas = [...document.querySelectorAll(`${f} textarea`)];
        const eds = tas.map((ta) => window.tinymce && window.tinymce.get(ta.id)).filter(Boolean);
        return eds.length === 0 || eds.every((e) => e.initialized);
    }, formSel, {timeout: 30000}).catch(() => {});
}

async function typeEditor(page, formSel, prefix, text) {
    const [ed] = await editorIn(page, formSel, prefix);
    const body = page.frameLocator(`[id="${ed.id}_ifr"]`).locator('body');
    await body.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type(text, {delay: 10});
    await sleep(300);
}

/** The first change-email message to `to` naming `contains`, with its links, sender and body lines. */
async function changeMail(app, {to, contains, since}) {
    const summary = await app.mail.find({to, contains, subject: SUBJECT, since, timeoutMs: 40000});
    const full = await app.mail.fullMessage(summary.ID);
    const grab = (op) => {
        const m = (full.HTML || '').match(new RegExp(`href=['"]([^'"]*/invitation/${op}\\?[^'"]+)['"]`, 'i'));
        return m ? m[1].replace(/&amp;/g, '&') : null;
    };
    const text = full.Text || '';
    return {
        id: summary.ID, subject: full.Subject,
        from: full.From, to: (full.To || []).map((t) => `${t.Name} <${t.Address}>`),
        confirm: grab('accept'), reject: grab('decline'),
        dear: (text.split('\n').find((l) => /^Dear /.test(l.trim())) || '').trim(),
        signOff: flat(text.slice(text.lastIndexOf('Kind regards')), 120),
        namesNew: text.includes(contains) || (full.HTML || '').includes(contains),
        text: flat(text, 1200),
    };
}
const mask = (u) => (u || '').replace(/key=[^&]+/, 'key=…');

/** Users & Roles: search a user and return the row text. */
async function usersRow(page, app, cp, username, email, locale) {
    const seg = locale ? `/${locale}` : '';
    await page.goto(app.url(`/index.php/${cp}${seg}/management/settings/access`));
    await idle(page);
    const search = page.getByRole('searchbox').first();
    await search.waitFor({timeout: 30000});
    await search.fill(username);
    await search.press('Enter');
    const row = page.getByRole('row').filter({hasText: email});
    await row.first().waitFor({timeout: 30000}).catch(() => {});
    await idle(page);
    return flat(await row.first().innerText().catch(() => null), 300);
}

module.exports = {
    flat, sleep, TABS, FORMS, SAVED, QUESTION, SUBJECT, browserFor, snap, tabLink, panel, formOf, waitForm, pressTab,
    selectedTab, tabFacts, toasts, userButton, userMenu, editorIn, waitEditors, typeEditor, changeMail, mask, usersRow,
};
