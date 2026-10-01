// Helpers for walk.js (U13 OJS7). Requiring this file runs nothing.
const {idle, shot, screen, loc} = require('../../../probe');
const {T, flat} = require('../publication-facts-settings-funding-warning/lib');

const form = (page) => page.locator('#pflPluginSettingsForm');

/** The window's fields as they stand: each box's value, the date's hidden field, the index boxes. */
async function readPflFields(page) {
    const f = form(page);
    const val = async (sel) => (await f.locator(sel).count()) ? f.locator(sel).first().inputValue() : null;
    const ticked = async (name) => (await f.locator(`[name="${name}"]`).count()) ? f.locator(`input[type=checkbox][name="${name}"]`).first().isChecked() : null;
    return {
        academicSociety: await val('[name="academicSociety"]'),
        academicSocietyUrl: await val('[name="academicSocietyUrl"]'),
        startDateBox: await val('[name="dateStart-removed"]'),
        startDatePosted: await val('input[name="dateStart"]'),
        includeDoaj: await ticked('includeDoaj'),
        includeScholar: await ticked('includeScholar'),
        includeLatindex: await ticked('includeLatindex'),
        includeMedline: await ticked('includeMedline'),
        scopusUrl: await val('[name="scopusUrl"]'),
        wosUrl: await val('[name="wosUrl"]'),
    };
}

/**
 * Fill the window as a person would. `startDate` is typed key by key into
 * the visible date box (select all, Delete, the date, Tab), since the
 * date picker copies only typed dates into the field the form posts
 * (patterns.md pitfall 4).
 */
async function fillPflFields(page, {society, societyUrl, startDate, scholar, scopusUrl}) {
    const f = form(page);
    if (society != null) await f.locator('[name="academicSociety"]').fill(society);
    if (societyUrl != null) await f.locator('[name="academicSocietyUrl"]').fill(societyUrl);
    if (startDate != null) {
        const box = f.locator('[name="dateStart-removed"]');
        await box.click();
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.press('Delete');
        await page.keyboard.type(startDate, {delay: 30});
        await page.keyboard.press('Tab');
    }
    if (scholar != null) {
        const box = f.locator('input[type=checkbox][name="includeScholar"]');
        if (scholar) await box.check();
        else await box.uncheck();
    }
    if (scopusUrl != null) await f.locator('[name="scopusUrl"]').fill(scopusUrl);
    await loc(page, 'PFL settings: Scopus URL', f.locator('[name="scopusUrl"]'));
    await loc(page, 'PFL settings: Start Date (visible box)', f.locator('[name="dateStart-removed"]'));
    return readPflFields(page);
}

/**
 * Press "OK" and read what follows: the save request's status and whether
 * the window stayed open, its message, and its fields afterwards.
 */
async function pressOk(page, shotName) {
    const f = form(page);
    const saved = page.waitForResponse((r) => /manage/.test(r.url()) && /save=/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await f.getByRole('button', {name: 'OK', exact: true}).click();
    const r = await saved;
    let body = null;
    try {
        const j = await r.json();
        body = {status: j.status, contentHasForm: typeof j.content === 'string' && j.content.includes('pflPluginSettingsForm')};
    } catch (e) {
        body = {unreadable: String(e).slice(0, 120)};
    }
    await idle(page);
    await page.waitForTimeout(800);
    const open = await f.isVisible().catch(() => false);
    const sc = await screen(page);
    await shot(page, shotName).catch(() => {});
    const out = {saveStatus: r.status(), saveAnswer: body, windowOpen: open, notices: sc.notices};
    if (open) {
        out.formErrors = flat(await f.locator('.pkp_form_error, .error, label.error, .pkpNotification, [id^="pflPluginSettingsFormNotification"]').allInnerTexts().then((a) => a.join(' | ')).catch(() => null), 600);
        out.fields = await readPflFields(page);
        out.formText = flat(await f.innerText().catch(() => null), 900);
    } else {
        out.pageText = flat(sc.text.main, 300);
    }
    return out;
}

module.exports = {readPflFields, fillPflFields, pressOk};
