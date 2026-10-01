// Helpers for docs/issues/U13-OJS7-publication-facts-settings-refused-ok-loses-changes.md
// (walk.js, neighbour.js). Requiring this runs nothing. Opening the plugin's
// row and window comes from the U13 OJS2 walk's lib.js (openPflRow, enablePfl,
// readPflSettings).
const {idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const text = async (l) => ((await l.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();

const pflForm = (page) => page.locator('form#pflPluginSettingsForm');

// Every field of the open "Publication Facts Label plugin" window, by name
// (fbv ids are runtime-suffixed, patterns.md pitfall 9).
async function readPflFields(page) {
    const form = pflForm(page);
    const val = async (n) => form.locator(`input[name="${n}"]`).first().inputValue().catch(() => null);
    const box = async (n) => form.locator(`input[type=checkbox][name="${n}"]`).first().isChecked().catch(() => null);
    return {
        academicSociety: await val('academicSociety'),
        academicSocietyUrl: await val('academicSocietyUrl'),
        dateStart: await val('dateStart'),
        includeDoaj: await box('includeDoaj'),
        includeScholar: await box('includeScholar'),
        includeLatindex: await box('includeLatindex'),
        includeMedline: await box('includeMedline'),
        scopusUrl: await val('scopusUrl'),
        wosUrl: await val('wosUrl'),
    };
}

// Type the society name, tick "Google Scholar", type the Scopus "URL".
async function fillPflForm(page, {society, scholar, scopusUrl}) {
    const form = pflForm(page);
    if (society !== undefined) await form.locator('input[name="academicSociety"]').first().fill(society);
    if (scholar) {
        const b = form.locator('input[type=checkbox][name="includeScholar"]').first();
        if (!(await b.isChecked())) await b.check();
    }
    if (scopusUrl !== undefined) await form.locator('input[name="scopusUrl"]').first().fill(scopusUrl);
}

// Press the window's "OK"; returns the save request's status, whether the
// window closed, and the text the window shows above "Journal Information"
// plus any error text inside it.
async function pressPflOk(page) {
    const form = pflForm(page);
    const saved = page.waitForResponse((r) => /verb=settings/.test(r.url()) && /save=/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: 'OK', exact: true}).first().click();
    const r = await saved; await idle(page); await pause(800);
    const open = await pflForm(page).isVisible().catch(() => false);
    let body = null;
    if (r) { try { body = JSON.parse(await r.text()); } catch (e) { body = null; } }
    const out = {status: r ? r.status() : null, windowOpen: open, returnedForm: !!(body && body.content)};
    if (open) {
        const f = pflForm(page);
        out.head = (await text(f)).split('Journal Information')[0].trim() || null;
        out.errors = (await f.locator('.error, .pkp_form_error, label.error, .formErrorList, [role="alert"]').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
    }
    return out;
}

// The window's "Cancel" (closes without saving).
async function cancelPfl(page) {
    const form = pflForm(page);
    await form.getByRole('link', {name: 'Cancel', exact: true}).or(form.getByRole('button', {name: 'Cancel', exact: true})).first().click();
    await idle(page); await pause(800);
    return {windowOpen: await pflForm(page).isVisible().catch(() => false)};
}

// Open the plugin's "Settings" again from its row (the row's extras may still be open).
async function reopenPflSettings(page, row) {
    const link = row.locator('xpath=following-sibling::tr[1]').locator('a').filter({hasText: /^\s*Settings\s*$/}).first();
    if (!(await link.isVisible().catch(() => false))) await row.locator('a.show_extras').click();
    await link.waitFor({state: 'visible', timeout: T});
    await link.click();
    const form = pflForm(page);
    await form.waitFor({state: 'visible', timeout: T}); await idle(page);
    await form.getByText('Journal Information', {exact: true}).first().waitFor({state: 'visible', timeout: T}); await pause(500);
    return form;
}

module.exports = {T, pause, pflForm, readPflFields, fillPflForm, pressPflOk, cancelPfl, reopenPflSettings};
