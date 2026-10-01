// Helpers of walk.js (issue report docs/issues/U57-A8-french-default-texts-stored-as-codes.md):
// a press or server created on screen with English and French, "Reload defaults" on a
// "Website Languages" row, the French "Author Guidelines" box typed and saved, a backend
// tab's text and a page's main text.
// Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const WORDS = {
    ojs: {noun: 'Journal', hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal'},
    omp: {noun: 'Press', hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press'},
    ops: {noun: 'Server', hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server'},
};

/** Administration › Hosted … › "Create …" with the given languages ticked, the first primary. Returns the save's status. */
async function createContext(page, app, {name, initials, path: urlPath, email, locales = ['en']}) {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const hosted = new HostedJournalsPage(page, WORDS[app.name]);
    await page.goto(app.url('/index.php/index/en/admin/contexts'));
    await hosted.expectOpen();
    const win = await hosted.openCreate();
    await win.type(win.title('en'), name);
    await win.type(win.initials('en'), initials);
    await win.type(win.contactName, name);
    await win.type(win.contactEmail, email);
    await win.country.selectOption({label: 'Canada'});
    await win.type(win.path, urlPath);
    for (const code of locales) {
        if (await win.languageBox(code).count()) await win.setBox(win.languageBox(code), true);
    }
    if (await win.primaryChoice(locales[0]).count()) await win.setBox(win.primaryChoice(locales[0]), true);
    const r = await win.pressSave();
    await page.waitForURL(/\/admin\/wizard\/\d+/, {timeout: T}).catch(() => {});
    return r.status();
}

/** Settings › Website › "Setup" › "Languages", the row's arrow › "Reload defaults" › confirm. Returns what the screen said. */
async function reloadDefaults(page, app, contextPath, code) {
    await page.goto(app.url(`/index.php/${contextPath}/en/management/settings/website`));
    await idle(page).catch(() => {});
    const setup = page.locator('#setup-button').first();
    if ((await setup.getAttribute('aria-selected').catch(() => null)) !== 'true') await setup.click().catch(() => {});
    await page.locator('#languages-button').filter({visible: true}).first().click();
    await page.locator('#languageGridContainer .pkp_controllers_grid').first().waitFor({timeout: T});
    const row = page.locator(`#languageGridContainer tr.gridRow[id$="-row-${code}"]`).first();
    const rowText = flat(await row.innerText().catch(() => ''), 200);
    await row.locator('a.show_extras').first().click();
    await sleep(400);
    await page.locator(`#languageGridContainer tr[id$="-row-${code}-control-row"] a`).filter({hasText: 'Reload defaults'}).first().click();
    const d = page.locator('[role=dialog]:visible, [data-cy="dialog"]:visible').last();
    await d.waitFor({timeout: 10000});
    const question = flat(await d.innerText().catch(() => ''), 400);
    const resp = page.waitForResponse((r) => /reload-locale|reloadLocale/.test(r.url()), {timeout: T}).catch(() => null);
    await d.getByRole('button', {name: /^(Reload defaults|OK|Yes)$/}).first().click();
    const r = await resp;
    await sleep(1500);
    await idle(page).catch(() => {});
    const notice = flat(await page.locator('.pkpNotify__message, .pkp_notification, [role="alert"]').allInnerTexts().catch(() => []).then((a) => a.join(' | ')), 300);
    return {rowText, question, status: r && r.status(), notice};
}

/** Settings › Workflow › "Submission" › "Author Guidance": the French "Author Guidelines" box replaced by `text`, saved. Returns the save's status. */
async function typeFrenchGuidelines(page, app, contextPath, text) {
    const {WorkflowSubmissionSettings} = require('../../../pages/SubmissionIntakePages.js');
    const wf = new WorkflowSubmissionSettings(page, contextPath, {locale: 'en'});
    await wf.goto('Author Guidance');
    await wf.guidance.form.locator('.pkpFormLocales button').filter({hasText: /French/}).first().click();
    await sleep(500);
    const id = 'submissionGuidanceSettings-authorGuidelines-control-fr_CA';
    await wf.guidance.typeRich(id, text);
    const r = await wf.guidance.pressSave();
    await sleep(1000);
    return {status: r.status(), saved: flat(await wf.guidance.richContent(id), 300)};
}

/** A backend page's tab (Users & Roles › "Users" or "Roles"): its text once its grid shows. */
async function readTab(page, app, path, tabId) {
    await page.goto(app.url(path));
    await idle(page).catch(() => {});
    const tab = page.locator(`#${tabId}-button`).first();
    if (await tab.count()) await tab.click();
    await page.locator(`#${tabId} table tbody tr`).first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    return flat(await page.locator(`#${tabId}`).first().innerText().catch(() => ''), 3000);
}

/** A public page's heading and main text. */
async function readPage(page, app, path) {
    const resp = await page.goto(app.url(path));
    await idle(page).catch(() => {});
    const main = page.locator('main, .pkp_structure_main').first();
    return {path, status: resp && resp.status(), title: await page.title(), text: flat(await main.innerText().catch(() => ''), 2500)};
}

/** Every `##key##` in a text. */
const codes = (text) => [...new Set(String(text || '').match(/##[\w.]+##/g) || [])];

module.exports = {T, sleep, flat, WORDS, createContext, reloadDefaults, typeFrenchGuidelines, readTab, readPage, codes};
