// Helpers for walk.js (U21 A16). Requiring this file runs nothing.
const {idle, loc} = require('../../../probe');

const T = 30_000;
const PLS_ASK = 'Ask the author to provide a plain language summary during submission.';
const words = (s) => s.trim().split(/\s+/).length;
const localeSeg = (app) => (app.line && /3_[34]/.test(app.line) ? '' : '/en');

/**
 * As a manager: Settings › Workflow › Submission › Metadata, "Plain Language Summary" enabled at `option`, Save.
 * Returns {status} or {absent: true} when the Metadata tab offers no plain language summary (3.5).
 */
async function enablePlainLanguageSummary(page, app, option = PLS_ASK) {
    await page.goto(app.url(`/index.php/${app.contextPath}${localeSeg(app)}/management/settings/workflow`));
    await idle(page);
    await page.locator('#metadata-button').click();
    const panel = page.locator('#metadata');
    await panel.waitFor({state: 'visible', timeout: T});
    const box = panel.getByRole('checkbox', {name: 'Enable plain language summary metadata', exact: true});
    await loc(page, 'Metadata: the "Enable plain language summary metadata" box', box);
    if (!(await box.count())) {
        return {absent: true, items: (await panel.locator('legend, .pkpFormFieldLabel').allInnerTexts().catch(() => [])).map((x) => x.trim()).filter(Boolean)};
    }
    if (!(await box.isChecked())) await box.check();
    await panel.getByRole('radio', {name: option, exact: true}).check();
    const form = panel.locator('form').first();
    const saved = page.waitForResponse((r) => r.request().method() !== 'GET' && /\/contexts\/\d+/.test(r.url()), {timeout: T});
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await form.locator('.pkpFormPage__status', {hasText: 'Saved'}).waitFor({timeout: T}).catch(() => {});
    return {status: r.status()};
}

/** As a manager: Settings › Journal (Server) › Sections, the row's arrow, "Edit", "Word Count" = n, "Save". */
async function setSectionWordCount(page, app, title, n) {
    const {SectionsTab} = require('../../../pages/SectionsPages.js');
    const tab = new SectionsTab(page, app.contextPath, {locale: localeSeg(app).slice(1)});
    await page.goto(app.url(tab.url()));
    await tab.openTab();
    const win = await tab.openEdit(title);
    const before = await win.box('wordCount').inputValue();
    await win.type('wordCount', String(n));
    const r = await win.saveAndClose();
    return {before, status: r.status()};
}

module.exports = {T, PLS_ASK, words, localeSeg, enablePlainLanguageSummary, setSectionWordCount};
