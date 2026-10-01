// Shared screen helpers for walk.js and neighbour.js (docs/issues/U44-A8-urn-suffix-pattern-refusal-text-code.md).
// Settings › Website › "Plugins": tick "URN", open its "Settings", fill the window, "Save", and read what the
// window, each pattern box and the notice at the top right say. Everything goes through the screens.
const {screen, shot, record, idle, rawKeys} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

// The kinds the window offers per app: the "Journal Content"/"Press Content" box and its pattern box.
const KINDS = {
    ojs: [
        {kind: 'Issues', enable: 'enableIssueURN', box: 'urnIssueSuffixPattern', label: 'for issues', pattern: '%j.v%vi%i'},
        {kind: 'Articles', enable: 'enablePublicationURN', box: 'urnPublicationSuffixPattern', label: 'for articles', pattern: '%j.v%vi%i.%a'},
        {kind: 'Galleys', enable: 'enableRepresentationURN', box: 'urnRepresentationSuffixPattern', label: 'for galleys', pattern: '%j.v%vi%i.%a.g%g'},
    ],
    omp: [
        {kind: 'Monographs', enable: 'enablePublicationURN', box: 'urnPublicationSuffixPattern', label: 'for monographs', pattern: '%p.%m'},
        {kind: 'Chapters', enable: 'enableChapterURN', box: 'urnChapterSuffixPattern', label: 'for chapters', pattern: '%p.%m.c%c'},
        {kind: 'Publication Formats', enable: 'enableRepresentationURN', box: 'urnRepresentationSuffixPattern', label: 'for publication formats', pattern: '%p.%m.%f'},
        {kind: 'Files', enable: 'enableSubmissionFileURN', box: 'urnSubmissionFileSuffixPattern', label: 'for files', pattern: '%p.%m.%f.%s'},
    ],
};

async function snap(page, name, extra = {}) {
    const s = await screen(page);
    Object.assign(s, extra);
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

const urnRow = (page) => page.locator('#pluginGridContainer tr.gridRow[id$="-row-urnpubidplugin"]');
const form = (page) => page.locator('#urnSettingsForm');

/** Steps 2-4: Settings › Website › "Plugins", tick "URN" when not ticked, open the row's "Settings". */
async function openUrnSettings(page, app, name) {
    const out = {};
    await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/website`));
    await idle(page);
    await page.locator('#plugins-button').click();
    await page.locator('#pluginGridContainer tr.gridRow').first().waitFor({timeout: T});
    await idle(page);
    await sleep(300);
    out.rowFound = (await urnRow(page).count()) > 0;
    if (!out.rowFound) return out;
    const box = urnRow(page).getByRole('checkbox').first();
    out.tickedBefore = await box.isChecked();
    if (!out.tickedBefore) {
        const w = page.waitForResponse((r) => /settings-plugin-grid\/enable/.test(r.url()), {timeout: T}).catch(() => null);
        await box.click();
        const r = await w;
        out.enableStatus = r ? r.status() : null;
        await idle(page);
        await sleep(800);
    }
    const expander = urnRow(page).locator('a.show_extras').first();
    if (await expander.count()) { await expander.click(); await sleep(400); }
    const controls = page.locator('#pluginGridContainer tr[id$="-row-urnpubidplugin"] + tr');
    await controls.getByRole('link', {name: 'Settings', exact: true}).first().click();
    await form(page).locator('input[name="urnPrefix"]').waitFor({state: 'visible', timeout: T});
    await idle(page);
    await sleep(400);
    out.windowTitle = flat(await page.locator('[role="dialog"]:visible').last().locator('h1, h2, .pkp_modal_title, [class*="title"]').first().innerText().catch(() => null), 200);
    await snap(page, name, {open: out});
    return out;
}

/**
 * Steps 5-9: tick every kind, prefix (default urn:nbn:de:0000-), the pattern choice, each pattern box set to `boxText(kind)`,
 * namespace, resolver.
 */
async function fillWindow(page, app, {boxText, resolver = 'https://nbn-resolving.de/', prefix = 'urn:nbn:de:0000-'}) {
    const f = form(page);
    for (const k of KINDS[app.name]) {
        const c = f.locator(`input[type=checkbox][name="${k.enable}"]`);
        if ((await c.count()) && !(await c.isChecked())) await c.click();
    }
    await f.locator('input[name="urnPrefix"]').fill(prefix);
    await f.locator('input[type=radio][name="urnSuffix"][value="pattern"]').check();
    await sleep(300);
    const typed = {};
    for (const k of KINDS[app.name]) {
        const b = f.locator(`input[name="${k.box}"]`);
        typed[k.box] = {enabled: await b.isEnabled().catch(() => null)};
        await b.fill(boxText(k));
        typed[k.box].value = JSON.stringify(await b.inputValue());
    }
    await f.locator('select[name="urnNamespace"]').selectOption('urn:nbn:de');
    await f.locator('input[name="urnResolver"]').fill(resolver);
    return typed;
}

/** Step 10: "Save", then read the window (top, each box) and the notice at the top right. */
async function save(page, app, name) {
    const f = form(page);
    const out = {};
    const w = page.waitForResponse((r) => r.request().method() === 'POST' && /manage/.test(r.url()), {timeout: T}).catch(() => null);
    await f.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await w;
    out.saveStatus = r ? r.status() : null;
    out.saveAnswer = r ? flat(await r.text().catch(() => null), 600) : null;
    await idle(page);
    await sleep(1200);
    out.windowOpen = await f.isVisible().catch(() => false);
    if (out.windowOpen) {
        out.top = flat(await f.locator('#formErrors, .pkp_form_error, [id^="formErrors"]').first().innerText().catch(() => null), 1500);
        out.boxes = {};
        for (const k of KINDS[app.name]) {
            out.boxes[k.label] = await f.locator(`input[name="${k.box}"]`).evaluate((el) => {
                const wrap = el.closest('.pkp_controllers_extender_field, li, .section, div');
                const lab = el.parentElement ? el.parentElement.querySelector('label.error, .error, label.sub_label') : null;
                const errs = [...(wrap ? wrap.querySelectorAll('label.error, .error, .pkp_form_error') : [])].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean);
                return {value: el.value, invalid: el.classList.contains('error') || el.getAttribute('aria-invalid') === 'true', errors: [...new Set(errs)], subLabel: lab ? lab.innerText.replace(/\s+/g, ' ').trim() : null};
            }).catch((e) => ({missing: String(e).slice(0, 120)}));
        }
        out.window = flat(await f.innerText().catch(() => null), 3000);
    }
    // The notice at the top right comes a moment after the window's answer: wait for it (up to 6 s).
    const notice = page.locator('.ui-pnotify-text, .pkp_notification, [class*="notification"]:visible');
    await notice.first().waitFor({state: 'visible', timeout: 6000}).catch(() => {});
    await sleep(500);
    out.notices = (await notice.allInnerTexts().catch(() => [])).map((t) => flat(t, 400)).filter(Boolean);
    out.rawKeys = await rawKeys(page).catch(() => null);
    await snap(page, name, {save: out});
    return out;
}

async function closeWindow(page) {
    const c = page.locator('[role="dialog"]:visible').last().getByRole('button', {name: /^Close/}).first();
    if (await c.count()) await c.click().catch(() => {});
    await idle(page);
    await sleep(800);
}

module.exports = {T, KINDS, sleep, flat, snap, form, openUrnSettings, fillWindow, save, closeWindow};
