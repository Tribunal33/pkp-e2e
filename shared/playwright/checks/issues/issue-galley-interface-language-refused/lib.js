// Helpers of walk.js here (issue report docs/issues/U50-A11-issue-galley-interface-language-refused.md).
// Requiring this file runs nothing. Every helper presses what a person presses, or reads what the
// screen shows. Page objects are required inside the functions (probe kit rule).
const {idle, screen, record, shot} = require('../../../probe');

const T = 30_000;
const CTX = 'publicknowledge';
const ISSUE = 'Vol. 2 No. 1 (2015)';
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A small PDF named with the walk's tag. */
const PDF = (name) => ({
    name,
    mimeType: 'application/pdf',
    buffer: Buffer.from(
        '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
            '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n'
    ),
});

async function snap(page, name) {
    record(name, await screen(page));
    await shot(page, name).catch(() => {});
}

/**
 * Settings › Website › "Setup" › "Languages": press a box of a "Website Languages" row
 * (`uiLocale` "UI", `formLocale` "Forms"). Returns the answer, any alert, the headings and the
 * rows' boxes after it.
 */
async function pressLanguageBox(page, code, column) {
    const {JournalLanguagesTab} = require('../../../pages/LanguagesPages.js');
    const tab = new JournalLanguagesTab(page, CTX, {locale: 'en'});
    await tab.goto();
    const before = await boxes(tab);
    const pressed = await tab.pressWebsite(code, column);
    await idle(page).catch(() => {});
    await tab.goto();
    const after = await boxes(tab);
    await snap(page, `languages-${code}-${column}`);
    return {columns: await tab.website.columns(), before, status: pressed.response.status(), alerts: pressed.alerts, after};
}

async function boxes(tab) {
    const out = {};
    for (const code of await tab.website.codes()) {
        out[code] = {
            name: (await tab.website.localeAndCode(code)).locale,
            ui: await tab.website.cell(code, 'uiLocale').isChecked().catch(() => null),
            forms: await tab.website.cell(code, 'formLocale').isChecked().catch(() => null),
        };
    }
    return out;
}

/** Issues › "Future Issues" › the issue's arrow › "Edit" › "Issue Galleys": the window. */
async function openIssueGalleys(page) {
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    const issues = new IssuesAdmin(page, CTX);
    await issues.goto('Future Issues');
    const win = await issues.openManagement('Future Issues', ISSUE);
    await win.openTab('Issue Galleys');
    return win;
}

/** The galley list as shown: its column headings and each row's cells. */
async function galleyList(win) {
    const grid = win.galleyGrid();
    const columns = (await grid.locator('thead th').allInnerTexts()).map((t) => flat(t, 60));
    const rows = await grid.locator('tr.gridRow').filter({visible: true}).evaluateAll((trs) =>
        trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.replace(/\s+/g, ' ').trim())));
    return {columns, rows};
}

/**
 * "Create Issue Galley": upload `file`, type `label`, choose the "Language" entry whose value is
 * `locale` (when offered), "Save". Returns what the list offered, what was chosen, the save's
 * answer, whether the window stayed open, the boxes marked, the notices, and the list after it.
 */
async function createGalley(page, win, {label, file, locale}, name) {
    const gw = await win.openCreateGalley();
    const offered = await gw.localeSelect().locator('option').evaluateAll((os) => os.map((o) => ({value: o.value, text: o.textContent.trim(), selected: o.selected})));
    const up = await gw.upload(file);
    await gw.labelBox().fill(label);
    const isOffered = offered.some((o) => o.value === locale);
    if (isOffered) await gw.localeSelect().selectOption(locale);
    const chosen = await gw.localeSelect().evaluate((s) => ({value: s.value, text: s.options[s.selectedIndex] ? s.options[s.selectedIndex].text.trim() : null}));
    await screen(page); // clears the notices seen so far
    const answered = page.waitForResponse((r) => /issue-galley-grid\/update/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await gw.saveButton().click();
    const r = await answered;
    let body = null;
    try { body = await r.json(); } catch (e) { body = null; }
    await idle(page).catch(() => {});
    await sleep(800); // a legacy window's close or the notice's arrival; bounded, read once
    const open = await gw.dialog.isVisible().catch(() => false);
    const marked = open ? (await gw.dialog.locator('label.error, .error:visible').allInnerTexts().catch(() => [])).map((t) => flat(t, 120)).filter(Boolean) : [];
    const s = await screen(page);
    record(`${name}-after-save`, s);
    await shot(page, `${name}-after-save`).catch(() => {});
    if (open) await gw.cancel();
    const list = await galleyList(win);
    await snap(page, `${name}-list`);
    return {
        offered,
        requested: locale,
        offeredRequested: isOffered,
        chosen,
        upload: up.status(),
        save: {status: r.status(), status_json: body && body.status, content: body && typeof body.content === 'string' ? flat(body.content, 200) : body && body.content},
        windowOpen: open,
        marked,
        notices: s.notices,
        list,
    };
}

/**
 * A galley row's arrow › "Edit": what "Language" offers and has selected; type `label` in "Galley
 * Label", "Save". Returns the same facts as createGalley().
 */
async function editGalley(page, win, row, {label}, name) {
    const gw = await win.openEditGalley(row);
    const offered = await gw.localeSelect().locator('option').evaluateAll((os) => os.map((o) => ({value: o.value, text: o.textContent.trim(), selected: o.selected})));
    await gw.labelBox().fill(label);
    await screen(page); // clears the notices seen so far
    const answered = page.waitForResponse((r) => /issue-galley-grid\/update/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await gw.saveButton().click();
    const r = await answered;
    let body = null;
    try { body = await r.json(); } catch (e) { body = null; }
    await idle(page).catch(() => {});
    await sleep(800); // a legacy window's close or the notice's arrival; bounded, read once
    const open = await gw.dialog.isVisible().catch(() => false);
    const s = await screen(page);
    record(`${name}-after-save`, s);
    await shot(page, `${name}-after-save`).catch(() => {});
    if (open) await gw.cancel();
    const list = await galleyList(win);
    await snap(page, `${name}-list`);
    return {offered, save: {status: r.status(), status_json: body && body.status}, windowOpen: open, notices: s.notices, list};
}

module.exports = {T, CTX, ISSUE, flat, sleep, PDF, snap, pressLanguageBox, openIssueGalleys, galleyList, createGalley, editGalley};
