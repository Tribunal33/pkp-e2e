// Helpers for the Reset Permissions tool (Tools › "Permissions") on PKP's default test dataset:
// open the tab, press the reset button and answer the browser's own confirm box. Requiring this file runs nothing.
const {idle, screen, record, shot} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); // sampling only
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const SUCCESS = /permissions were successfully reset\./;

async function snap(page, name, extra) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 300), text: {}}; }
    if (extra) s.facts = extra;
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

const resetButton = (page) => page.locator('#resetPermissionsFormButton');

/** Tools › "Permissions": returns the tab's heading, paragraph and button label. */
async function openPermissionsTool(app, page) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/tools`));
    await page.locator('#managementTabs').waitFor({timeout: 30_000});
    await idle(page).catch(() => {});
    await page.locator('#managementTabs').getByRole('link', {name: 'Permissions', exact: true}).click();
    await resetButton(page).waitFor({timeout: 30_000});
    await idle(page).catch(() => {});
    const form = page.locator('#resetPermissionsForm');
    return {
        heading: flat(await form.locator('h3').first().innerText().catch(() => null), 120),
        paragraph: flat(await form.locator('p').first().innerText().catch(() => null), 900),
        button: await buttonState(page),
    };
}

/** The reset button as the page has it: label, disabled flag, greyed class. */
async function buttonState(page) {
    const b = resetButton(page);
    return {
        label: flat(await b.innerText().catch(() => b.inputValue().catch(() => null)), 80),
        disabled: await b.isDisabled().catch(() => null),
        greyed: await b.evaluate((el) => el.classList.contains('ui-state-disabled')).catch(() => null),
    };
}

/**
 * Press the reset button and answer the browser's box with 'ok' or 'cancel'. A press on a disabled button is
 * dispatched all the same (a person's click), so the facts say whether anything asked. Returns what asked, the
 * reset requests sent and their statuses, the toast, and the button 2 s later.
 */
async function pressReset(page, answer) {
    const button = resetButton(page);
    const posts = [];
    const onResponse = (r) => {
        if (/\/management\/tools\/resetPermissions/.test(r.url()) && r.request().method() === 'POST') posts.push({status: r.status()});
    };
    let asked = null;
    const onDialog = (d) => {
        asked = {type: d.type(), message: d.message()};
        (answer === 'ok' ? d.accept() : d.dismiss()).catch(() => {});
    };
    page.on('response', onResponse);
    page.on('dialog', onDialog);
    const before = await buttonState(page);
    try {
        await button.click({force: true, timeout: 10_000});
        if (answer === 'ok') {
            await page.getByText(SUCCESS).first().waitFor({timeout: 30_000}).catch(() => {});
            await idle(page).catch(() => {});
        }
        await sleep(2000);
    } finally {
        page.off('dialog', onDialog);
    }
    page.off('response', onResponse);
    const toast = flat(await page.getByText(SUCCESS).first().innerText({timeout: 1000}).catch(() => null), 200);
    return {answer, before, asked, posts, toast, after2s: await buttonState(page)};
}

module.exports = {sleep, flat, snap, resetButton, openPermissionsTool, buttonState, pressReset};
