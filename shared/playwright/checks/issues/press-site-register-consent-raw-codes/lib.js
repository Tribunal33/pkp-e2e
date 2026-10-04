// Helpers of walk.js (issue report docs/issues/U02-OMP1-press-site-register-consent-raw-codes.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle, rawKeys} = require('../../../probe');
const {setSitePrivacy} = require('../site-profile-privacy-link-not-found/lib.js');
const {createContext} = require('../section-editors-not-assigned-second-journal/lib.js');

const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);

/** The dataset's one context, by app, as the site-level page names it. */
const CONTEXT_NAME = {
    ojs: 'Journal of Public Knowledge',
    omp: 'Public Knowledge Press',
    ops: 'Public Knowledge Preprint Server',
};

/** Step 5: Administration › Hosted … › "Create …", as `admin` (signed in). Returns the save's status. */
const NOUN = {ojs: 'Journal', omp: 'Press', ops: 'Server'};
async function createSecondContext(page, app) {
    return createContext(page, app, {name: `u02b ${NOUN[app.name]}`, initials: 'U02B', path: 'u02b', email: 'u02b.press@mailinator.com'});
}

/** A Register page typed into the address bar (contextPath null = the site-level page). */
async function openRegister(page, app, contextPath = null) {
    const loc = app.line && /3_[34]/.test(app.line) ? '' : '/en';
    const res = await page.goto(app.url(`/index.php/${contextPath || 'index'}${loc}/user/register`));
    await idle(page).catch(() => {});
    return {status: res && res.status(), landed: rel(page.url()), h1: flat(await page.locator('h1').first().innerText().catch(() => null), 80)};
}

/** Step 5: the "Profile" and "Login" sections, filled as a newcomer would. */
async function fillNewcomer(page, who) {
    const form = page.locator('form#register');
    await form.locator('input[name="givenName"]').fill(who.givenName);
    await form.locator('input[name="familyName"]').fill(who.familyName);
    await form.locator('input[name="affiliation"]').fill(who.affiliation);
    await form.locator('select[name="country"]').selectOption({label: who.country});
    await form.locator('input[name="email"]').fill(who.email);
    await form.locator('input[name="username"]').fill(who.username);
    await fillPasswords(page, who);
}

async function fillPasswords(page, who) {
    const form = page.locator('form#register');
    await form.locator('input[name="password"]').fill(who.password);
    await form.locator('input[name="password2"]').fill(who.password);
}

/** The site's own consent box on the site-level page (null when the page has none). */
function siteConsent(page) {
    return page.locator('form#register input[name="privacyConsent[0]"]');
}

/** A context's block on the site-level page. */
function contextBlock(page, name) {
    return page.locator('form#register li.context').filter({has: page.locator('.name', {hasText: name})});
}

/** Tick a box, recording rather than throwing when it is not there. */
async function tick(locator) {
    if (!(await locator.count())) return {present: false};
    await locator.first().check({force: true});
    return {present: true, checked: await locator.first().isChecked()};
}

/** Press "Register" and read what the page says: the error list, the heading, raw codes. */
async function pressRegister(page) {
    const form = page.locator('form#register');
    await Promise.all([
        page.waitForLoadState('domcontentloaded'),
        form.locator('button.submit').click(),
    ]);
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
    const errors = await page.locator('#formErrors li').allInnerTexts().catch(() => []);
    return {
        landed: rel(page.url()),
        h1: flat(await page.locator('h1').first().innerText().catch(() => null), 80),
        errorsHead: flat(await page.locator('#formErrors .pkp_form_error').first().innerText().catch(() => null), 80),
        errors: errors.map((e) => flat(e, 200)),
        rawKeys: await rawKeys(page).catch((e) => ({error: String(e.message || e).split('\n')[0]})),
    };
}

module.exports = {CONTEXT_NAME, createSecondContext, openRegister, fillNewcomer, fillPasswords, siteConsent, contextBlock, tick, pressRegister, setSitePrivacy, flat, rel};
