// Helpers of walk.js and neighbour.js (issue report docs/issues/U63-OJS5-pubmed-doaj-settings-cancel-does-nothing.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The two tools with a Settings tab: their page, tab strip, settings form and fields. */
const TOOLS = {
    pubmed: {plugin: 'PubMedExportPlugin', tabs: '#exportTabs', form: '#pubmedSettingsForm', text: 'nlmTitle', box: null},
    doaj: {plugin: 'DOAJExportPlugin', tabs: '#importExportTabs', form: '#doajSettingsForm', text: 'apiKey', box: 'automaticRegistration'},
};

/**
 * The browser's own questions ("The data on this form has changed. …"), answered "OK" as a person
 * who wants to move on would. While this listener is on the page the kit's leaves the answer to it.
 */
function answerDialogs(page) {
    const seen = [];
    page.on('dialog', (d) => {
        seen.push({type: d.type(), message: d.message()});
        d.accept().catch(() => {});
    });
    return {take: () => seen.splice(0)};
}

/** Count the requests the page sends while `fn` runs and for a second after. */
async function requestsDuring(page, fn) {
    const sent = [];
    const on = (r) => sent.push(`${r.method()} ${r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 160)}`);
    page.on('request', on);
    try {
        await fn();
        await sleep(1000);
        await idle(page).catch(() => {});
    } finally {
        page.off('request', on);
    }
    return sent;
}

/** Tools › Import/Export › the tool; it opens on "Settings". Returns the page's status. */
async function openTool(page, app, key) {
    const t = TOOLS[key];
    const r = await page.goto(app.url(`/index.php/${app.contextPath}/en/management/importexport/plugin/${t.plugin}`));
    await idle(page).catch(() => {});
    await page.locator(`${t.form} input[name="${t.text}"]`).waitFor({timeout: T});
    await idle(page).catch(() => {});
    return r ? r.status() : null;
}

/** The Settings form as it stands: field values, the controls under it, the note, asterisks on fields. */
async function readForm(page, key) {
    const t = TOOLS[key];
    const f = page.locator(t.form);
    const out = {
        visible: await f.isVisible().catch(() => false),
        text: await f.locator(`input[name="${t.text}"]`).inputValue().catch(() => null),
        cancel: await f.getByRole('link', {name: 'Cancel', exact: true}).count(),
        save: await f.getByRole('button', {name: 'Save', exact: true}).count(),
        note: flat(await f.locator('.formRequired').innerText().catch(() => null), 200),
        fieldAsterisks: await f.locator('.formRequired').count() ? await f.locator('label .req, label abbr.required').count() : null,
    };
    if (t.box) out.box = await f.locator(`input[name="${t.box}"]`).isChecked().catch(() => null);
    return out;
}

/** Type the text into the form's text box, key by key, and tick the form's box where it has one. */
async function typeChange(page, key, text) {
    const t = TOOLS[key];
    const f = page.locator(t.form);
    const input = f.locator(`input[name="${t.text}"]`);
    await input.click();
    await input.pressSequentially(text);
    if (t.box) await f.locator(`input[name="${t.box}"]`).check();
}

/** Press the form's "Cancel"; returns what it sent and where the page is ({absent: true} when the form has none). */
async function pressCancel(page, key) {
    const f = page.locator(TOOLS[key].form);
    const cancel = f.getByRole('link', {name: 'Cancel', exact: true});
    if (!(await cancel.count())) return {absent: true};
    const before = page.url();
    const sent = await requestsDuring(page, () => cancel.click());
    return {sent, urlChanged: page.url() !== before};
}

/** Press the form's "Save"; returns the save's status. */
async function pressSave(page, key) {
    const f = page.locator(TOOLS[key].form);
    const w = page.waitForResponse((r) => r.request().method() === 'POST' && /verb=save/.test(r.url()), {timeout: T});
    await f.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await w;
    await idle(page).catch(() => {});
    await sleep(500);
    return r.status();
}

/** Press a tab of the tool by its name; returns the tab that is open afterwards. */
async function pressTab(page, key, name) {
    const strip = page.locator(`${TOOLS[key].tabs} > ul`);
    await strip.getByRole('tab', {name, exact: true}).click();
    await idle(page).catch(() => {});
    await sleep(500);
    return flat(await strip.locator('[role=tab][aria-selected="true"]').innerText().catch(() => null), 100);
}

/** The tool's tab names, in order. */
async function tabNames(page, key) {
    return (await page.locator(`${TOOLS[key].tabs} > ul [role=tab]`).allInnerTexts()).map((s) => flat(s, 100));
}

module.exports = {T, sleep, flat, TOOLS, answerDialogs, requestsDuring, openTool, readForm, typeChange, pressCancel, pressSave, pressTab, tabNames};
