// Helpers of walk.js (issue report docs/issues/U21-OPS7-preprint-not-allowed-page-raw-key.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle, screen, rawKeys} = require('../../../probe');
const A8 = require('../section-editors-not-assigned-second-journal/lib.js');

const {T, sleep, flat, L} = A8;

/**
 * Per-app dataset facts the steps use: the sections to deactivate (the last active section cannot be,
 * "manager.sections.confirmDeactivateSection.error") and the one to restrict to editorial roles,
 * with that box's label.
 */
const WORDS = {
    ojs: {author: 'ccorino', deactivate: ['Reviews'], restrict: 'Articles', restrictLabel: 'Items can only be submitted by Editors and Section Editors.'},
    ops: {author: 'ccorino', deactivate: [], restrict: 'Preprints', restrictLabel: 'Items can only be submitted by Managers and Moderators.'},
};

/** As the signed-in manager: Settings › Users & Roles › "Roles", the role's "Edit", untick "Allow user self-registration", "OK". */
async function turnOffSelfRegistration(page, app, roleName) {
    const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
    const roles = new RolesTab(page, `${app.contextPath}${L(app)}`, {stages: []});
    await roles.goto();
    const win = await roles.openEdit(roleName);
    const box = win.optionBox('Allow user self-registration');
    const before = await box.isChecked();
    if (before) await box.uncheck();
    await win.save();
    return {before};
}

/**
 * As the signed-in manager: Settings › Journal (Server) › "Sections": tick "Inactive" on each section of
 * `deactivate` ("OK" in "Confirm"), then the `restrict` section's "Edit", tick `restrictLabel`, "Save".
 */
async function closeSections(page, app, {deactivate, restrict, restrictLabel}) {
    const {SectionsTab} = require('../../../pages/SectionsPages.js');
    const tab = new SectionsTab(page, app.contextPath, {locale: L(app).replace('/', '')});
    await tab.goto();
    const answers = [];
    for (const title of deactivate) {
        const win = await tab.pressInactive(title);
        const r = await tab.confirm(win);
        answers.push({title, deactivate: r.status(), body: flat(await r.text().catch(() => ''), 200)});
    }
    const win = await tab.openEdit(restrict);
    const box = win.checkbox(restrictLabel);
    const before = await box.isChecked();
    if (!before) await box.check();
    const r = await win.saveAndClose();
    answers.push({title: restrict, restrictedBefore: before, save: r.status()});
    return answers;
}

/**
 * The Login page's "Register" link, the form filled as a newcomer would, "Register". The password is the
 * username twice. Returns where it lands and any error lines.
 */
async function register(page, app, {givenName, familyName, username}) {
    await page.goto(app.url(`/index.php/${app.contextPath}${L(app)}/login`));
    await idle(page);
    await Promise.all([page.waitForURL(/\/user\/register/), page.locator('form#login a.register').click()]);
    const form = page.locator('form#register');
    await form.waitFor({timeout: T});
    await form.locator('input#givenName').fill(givenName);
    await form.locator('input#familyName').fill(familyName);
    await form.locator('input#affiliation').fill('u21ir34');
    await form.locator('select#country').selectOption({label: 'Canada'});
    await form.locator('input#email').fill(`${username}@mailinator.com`);
    await form.locator('input#username').fill(username);
    await form.locator('input#password').fill(username + username);
    await form.locator('input#password2').fill(username + username);
    const consent = form.locator('input[name="privacyConsent"]');
    if (await consent.count()) await consent.check();
    const boxes = (await form.locator('input[type="checkbox"]').evaluateAll((els) => els.map((e) => `${e.name}${e.checked ? ' (ticked)' : ''}: ${(e.closest('label') || {}).innerText || ''}`.replace(/\s+/g, ' ').trim())));
    await form.getByRole('button', {name: 'Register', exact: true}).click();
    await page.waitForLoadState('load');
    await idle(page);
    await sleep(1000);
    const errors = await page.locator('#formErrors ul.pkp_form_error_list li').allInnerTexts().catch(() => []);
    return {boxes, errors, landed: page.url().replace(/^https?:\/\/[^/]+/, ''), heading: flat(await page.locator('h1').first().innerText().catch(() => null), 200)};
}

/** "New Submission" by address: the page's heading, its explanation, every raw locale key on it, and the screen. */
async function openStart(page, app) {
    const r = await page.goto(app.url(`/index.php/${app.contextPath}${L(app)}/submission`));
    await idle(page);
    const s = await screen(page);
    const heading = flat(await page.locator('h1').first().innerText().catch(() => null), 200);
    const main = flat((s.text && (s.text.main || s.text.body)) || '', 1200);
    const keys = await rawKeys(page);
    return {status: r ? r.status() : null, heading, main, rawKeys: keys, startForm: await page.getByRole('button', {name: 'Begin Submission'}).count(), screen: s};
}

module.exports = {T, sleep, flat, L, WORDS, turnOffSelfRegistration, closeSections, register, openStart};
