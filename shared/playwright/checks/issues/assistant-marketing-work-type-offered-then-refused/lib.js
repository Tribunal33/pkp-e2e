// Helpers of the U74 A2 / U72 A2 walk (docs/issues/U74-A2-*.md): the press workflow's
// "Marketing" pages ("Audience", "Publication Dates") and the header's work-type control,
// each read as offered or not and, when offered, used once. Requiring this file runs nothing.
const {idle, screen, record, shot} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const workflow = (page) => page.getByRole('dialog').filter({has: page.locator('[data-cy="sidemodal-header"]')}).first();
const header = (page) => workflow(page).locator('[data-cy="sidemodal-header"]');
const menuLink = (page, label) => workflow(page).getByRole('navigation').getByRole('link', {name: label, exact: true});
const workTypeButton = (page) => header(page).getByRole('button', {name: /^(Monograph|Edited Volume)$/});
const form = (page) => workflow(page).locator('form').first();

/** Every PUT (tunnelled as POST) to /api/v1/submissions/<id>, with its answer: watch once per page. */
function watchSubmissionSaves(page) {
    const log = [];
    page.on('response', async (r) => {
        const req = r.request();
        const u = new URL(r.url());
        if (req.method() === 'GET' || !/\/api\/v1\/submissions\/\d+$/.test(u.pathname)) return;
        let body = null;
        try { body = flat(await r.text(), 400); } catch { body = null; }
        log.push({method: req.headers()['x-http-method-override'] || req.method(), path: u.pathname.replace(/^.*\/api\//, '/api/'), sent: flat(req.postData(), 300), status: r.status(), body});
    });
    return log;
}

/**
 * Open book `id` from the dashboard: the row naming `title` and its "View"; when the row is not
 * on the landing list, the dashboard's own address for the workflow (said in the result).
 */
async function openBook(page, app, id, title) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
    await idle(page);
    const row = page.locator('tr').filter({hasText: title}).first();
    let via = 'address';
    if (await row.count()) {
        const view = row.getByRole('button', {name: /^View/});
        if (await view.count()) { await view.first().click(); via = 'row View'; }
    }
    if (via === 'address') await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${Number(id)}`));
    await header(page).waitFor({timeout: 60_000});
    await idle(page);
    return via;
}

/** The side menu's entries under "Marketing" (null when the group is absent). */
async function marketingEntries(page) {
    const names = await workflow(page).getByRole('navigation').first().evaluate((nav) => [...nav.querySelectorAll('a, button')].map((a) => a.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
    const i = names.indexOf('Marketing');
    if (i < 0) return null;
    const out = [];
    for (const n of names.slice(i + 1)) { if (['Publication', 'Workflow'].includes(n)) break; out.push(n); }
    return out;
}

/** "Marketing" › `label`, waiting for the form's "Save". Returns false when the menu has no such entry. */
async function openMarketing(page, label) {
    const link = menuLink(page, label);
    if (!(await link.count())) {
        const group = workflow(page).getByRole('navigation').getByText('Marketing', {exact: true});
        if (await group.count()) await group.first().click().catch(() => {});
        await sleep(300);
    }
    if (!(await link.count())) return false;
    await link.first().click();
    await workflow(page).locator('h2, h1').filter({hasText: label}).first().waitFor({timeout: T}).catch(() => {});
    await form(page).getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T}).catch(() => {});
    await idle(page);
    return true;
}

/** The "Audience" select's chosen text. */
async function audienceValue(page) {
    return form(page).evaluate((f) => {
        const lab = [...f.querySelectorAll('label')].find((l) => /^\s*Audience\s*\*?\s*$/.test(l.innerText));
        const s = lab && lab.htmlFor ? f.querySelector(`[id="${lab.htmlFor}"]`) : null;
        return s ? (s.selectedIndex >= 0 ? s.options[s.selectedIndex].text.trim() : '') : null;
    }).catch(() => null);
}

async function chooseAudience(page, option) {
    const id = await form(page).locator('label').filter({hasText: /^\s*Audience\s*\*?\s*$/}).first().getAttribute('for');
    const box = page.locator(`[id="${id}"]`);
    const disabled = await box.isDisabled().catch(() => null);
    if (disabled) return {chosen: false, disabled};
    await box.selectOption({label: option});
    return {chosen: true, disabled};
}

/** The "Publication Dates" radios: [{label, checked, disabled}]. */
async function datesRadios(page) {
    return form(page).locator('input[type=radio]').evaluateAll((els) => els.map((e) => ({label: e.closest('label')?.innerText.trim(), checked: e.checked, disabled: e.disabled}))).catch(() => null);
}

async function chooseDates(page, label) {
    const r = form(page).getByRole('radio', {name: label, exact: true});
    if (await r.isDisabled().catch(() => null)) return {chosen: false, disabled: true};
    await r.check();
    return {chosen: true, disabled: false};
}

/** Press the form's "Save" when it is pressable; what the press answered and showed. */
async function save(page, saves, name) {
    const btn = form(page).getByRole('button', {name: 'Save', exact: true});
    const enabled = await btn.isEnabled().catch(() => null);
    if (!enabled) {
        const s = await screen(page);
        record(name, s);
        await shot(page, name);
        return {saveEnabled: enabled, pressed: false};
    }
    const n = saves.length;
    const answered = page.waitForResponse((r) => /\/api\/v1\/submissions\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await btn.click();
    await answered;
    await sleep(500);
    await idle(page);
    const s = await screen(page);
    record(name, s);
    await shot(page, name);
    const status = flat((await form(page).locator('.pkpFormPage__status, [role="status"]').allInnerTexts().catch(() => [])).join(' | '));
    return {saveEnabled: enabled, pressed: true, requests: saves.slice(n), notices: s.notices, formStatus: status};
}

/** The header's work-type control: absent, or its menu, the choice, and what that brought. */
async function chooseWorkType(page, saves, label, name) {
    const button = workTypeButton(page);
    if (!(await button.count())) return {offered: false, headerButtons: (await header(page).getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 60))};
    const before = flat(await button.first().innerText());
    await button.first().click();
    await page.getByRole('menuitem').first().waitFor({timeout: T});
    const items = (await page.getByRole('menuitem').allInnerTexts()).map((x) => flat(x, 60));
    const n = saves.length;
    await page.getByRole('menuitem', {name: label, exact: true}).click();
    await sleep(800);
    await idle(page);
    const s = await screen(page);
    record(name, s);
    await shot(page, name);
    const errorWin = page.getByRole('dialog').filter({hasNot: page.locator('[data-cy="sidemodal-header"]')}).filter({hasText: 'Error'});
    const window = (await errorWin.count()) ? flat(await errorWin.first().innerText()) : null;
    if (window) {
        await errorWin.first().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
        await sleep(500);
    }
    return {offered: true, before, items, requests: saves.slice(n), window, after: flat(await workTypeButton(page).first().innerText().catch(() => null))};
}

module.exports = {T, flat, sleep, workflow, header, menuLink, workTypeButton, form, watchSubmissionSaves, openBook, marketingEntries, openMarketing, audienceValue, chooseAudience, datesRadios, chooseDates, save, chooseWorkType};
