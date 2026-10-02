// Helpers for the U17 A1, A7, A8 walk (walk.js beside this file). Runs nothing when required.
// Page objects are required inside each helper, never at the top (patterns.md "Probe kit").
const {expect} = require('@playwright/test');
const {idle, screen} = require('../../../probe');

const T = 30_000;

/** Per app: the section that carries a policy in the default dataset, the author, the other section. */
const CASES = {
    ojs: {policySection: 'Articles', otherSection: 'Reviews', author: 'ccorino', manager: 'rvaca', createSection: null},
    ops: {policySection: 'Preprints', otherSection: 'Methods u17a', author: 'ccorino', manager: 'rvaca', createSection: {title: 'Methods u17a', abbrev: 'U17A', path: 'methods-u17a'}},
    omp: {author: 'aclark'},
};

function flat(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

/** About › "Submissions" as the signed-in user: the notice, the policy blocks and their submission lines. */
async function readSubmissionsPage(page, app) {
    const {SubmissionsPage} = require('../../../pages/SectionsPages.js');
    const sp = new SubmissionsPage(page, app.contextPath, {locale: app.line === 'stable-3_4_0' || app.line === 'stable-3_3_0' ? '' : 'en'});
    await sp.goto();
    await idle(page);
    const blocks = await sp.blocks().evaluateAll((els) =>
        els.map((el) => {
            const h = el.querySelector('h2');
            const line = [...el.querySelectorAll('p')].find((p) => /Make a new submission to the /.test(p.textContent || ''));
            const a = line && line.querySelector('a');
            return {
                heading: h ? h.textContent.trim() : null,
                line: line ? line.textContent.replace(/\s+/g, ' ').trim() : null,
                href: a ? a.getAttribute('href') : null,
            };
        })
    );
    const topLinks = await sp.notice().locator('a').evaluateAll((els) => els.map((a) => ({text: a.textContent.trim(), href: a.getAttribute('href')})));
    return {notice: flat(await sp.notice().innerText()), topLinks, blocks, sp};
}

/** "Make a Submission" as it stands: the "Section" choices, which is chosen, or the page's notice. */
async function readStartForm(page) {
    await expect(page.getByRole('heading', {name: 'Make a Submission', level: 1})).toBeVisible({timeout: T});
    await idle(page);
    const form = page.locator('.startSubmissionPage__form, form').first();
    const notice = page.locator('main .pkpNotification, main [role="status"], main .pkpNotification__message');
    // Either the form with its fields, or the notice alone.
    await expect(page.locator('input[name="title"], [id*="title-control"], main .pkpNotification').first()).toBeAttached({timeout: T}).catch(() => {});
    const hidden = await page.locator('input[name="sectionId"]:not([type="radio"])').evaluateAll((els) => els.map((i) => i.value));
    const choices = await page.locator('input[name="sectionId"][type="radio"]').evaluateAll((els) =>
        els.map((i) => ({
            value: i.value,
            label: (i.closest('label') ? i.closest('label').textContent : '').replace(/\s+/g, ' ').trim(),
            checked: i.checked,
        }))
    );
    const policyBlocks = await page.locator('.pkpFormField--html').evaluateAll((els) =>
        els.filter((e) => e.offsetParent !== null).map((e) => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 160))
    );
    return {
        url: page.url(),
        formShown: (await form.count()) > 0 && (await page.locator('input[name="sectionId"], .startSubmissionPage__form').count()) > 0,
        sectionChoices: choices,
        chosen: choices.filter((c) => c.checked).map((c) => c.label),
        sectionField: choices.length > 0,
        hiddenSectionId: hidden,
        visiblePolicyBlocks: policyBlocks,
        notices: await notice.allInnerTexts().then((t) => t.map(flat)).catch(() => []),
        mainText: flat(await page.locator('main').innerText().catch(() => '')).slice(0, 1200),
    };
}

/** Press the link a policy block's submission line carries (named by the section) and read the start form. */
async function pressSectionLink(page, app, title) {
    const {sp} = await readSubmissionsPage(page, app);
    const link = sp.submitLink(title);
    if ((await link.count()) === 0) return {pressed: false, reason: `no "${title}" link on the page`};
    await Promise.all([page.waitForURL(/\/submission(\?|$|\/)/, {timeout: T}), link.click()]);
    return {pressed: true, ...(await readStartForm(page))};
}

/** Press "Make a new submission" in the notice at the top of the page and read the start form. */
async function pressTopLink(page, app) {
    const {sp} = await readSubmissionsPage(page, app);
    const link = sp.notice().getByRole('link', {name: /Make a new submission/});
    if ((await link.count()) === 0) return {pressed: false, reason: 'no top link'};
    await Promise.all([page.waitForURL(/\/submission(\?|$|\/)/, {timeout: T}), link.click()]);
    return {pressed: true, ...(await readStartForm(page))};
}

/** Settings › Workflow › "Submission" › "Disable Submissions": tick or untick, "Save". */
async function setDisableSubmissions(page, app, on) {
    const {SettingsPages} = require('../../../pages/ContextIdentityPages.js');
    const sp = new SettingsPages(page, app.contextPath, {locale: 'en'});
    const form = await sp.openDisableSubmissions();
    const box = form.form.locator('input[name="disableSubmissions"]');
    if ((await box.isChecked()) !== on) await box.click();
    await form.save();
    return {disableSubmissions: await box.isChecked()};
}

function sectionsTab(page, app) {
    const {SectionsTab} = require('../../../pages/SectionsPages.js');
    return new SectionsTab(page, app.contextPath, {locale: 'en'});
}

/** Settings › Journal (Server) › "Sections": "Create Section" with a title and an abbreviation, "Save". */
async function createSection(page, app, {title, abbrev, path}) {
    const tab = sectionsTab(page, app);
    await tab.goto();
    const win = await tab.openAdd();
    await win.type('title[en]', title);
    await win.type('abbrev[en]', abbrev);
    if (path && (await win.box('path').count())) await win.type('path', path);
    const r = await win.saveAndClose();
    await idle(page);
    return {created: title, status: r.status(), rows: await tab.titleCells().allInnerTexts().then((t) => t.map(flat))};
}

/** Tick or untick a row's "Inactive" box and answer "OK". */
async function setInactive(page, app, title, on) {
    const tab = sectionsTab(page, app);
    await tab.goto();
    const box = tab.inactiveBox(title);
    if ((await box.isChecked()) !== on) {
        const win = await tab.pressInactive(title);
        await tab.confirm(win);
    }
    await tab.reload();
    return {section: title, inactive: await tab.inactiveBox(title).isChecked()};
}

/** A row's "Edit": tick or untick "Items can only be submitted by Editors and Section Editors." ("editorRestricted"), "Save". */
async function setEditorRestricted(page, app, title, on) {
    const tab = sectionsTab(page, app);
    await tab.goto();
    const win = await tab.openEdit(title);
    const box = win.form().locator('input[name="editorRestricted"], input[name="editorRestriction"]').first();
    const label = flat(await win.form().locator('label', {has: box}).innerText().catch(() => ''));
    if ((await box.isChecked()) !== on) await box.click();
    await win.saveAndClose();
    return {section: title, editorRestricted: on, label};
}

module.exports = {CASES, readSubmissionsPage, readStartForm, pressSectionLink, pressTopLink, setDisableSubmissions, createSection, setInactive, setEditorRestricted, screen};
