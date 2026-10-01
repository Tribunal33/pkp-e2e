// Shared screen helpers for walk.js and neighbour.js (docs/issues/U44-A10-urn-prefix-refusal-written-out-brackets.md).
// Settings › Website › "Plugins": tick "URN", open its "Settings", fill the window, "Save", and read the message under
// each box and the notice at the top right. Everything goes through the screens.
const {screen, shot, record, idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 3000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const KIND = {ojs: 'enablePublicationURN', omp: 'enablePublicationURN'}; // "Articles" / "Monographs"

async function snap(page, name, extra = {}) {
    const s = await screen(page);
    Object.assign(s, extra);
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

const urnRow = (page) => page.locator('#pluginGridContainer tr.gridRow[id$="-row-urnpubidplugin"]');
const form = (page) => page.locator('#urnSettingsForm');

/** Steps 2-4: Settings › Website › "Plugins", tick "URN" when not ticked, the row's "Settings". */
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
    await snap(page, name, {open: out});
    return out;
}

/** Steps 5-7: tick "Articles" ("Monographs") (untick it with noKind), "URN Prefix", "Namespace", "Resolver URL". */
async function fillWindow(page, app, {prefix, resolver = 'https://nbn-resolving.de/', noKind = false}) {
    const f = form(page);
    const c = f.locator(`input[type=checkbox][name="${KIND[app.name]}"]`);
    if ((await c.count()) && (await c.isChecked()) === noKind) await c.click();
    await f.locator('input[name="urnPrefix"]').fill(prefix);
    await f.locator('select[name="urnNamespace"]').selectOption('urn:nbn:de');
    await f.locator('input[name="urnResolver"]').fill(resolver);
}

/** Step 8: "Save", then each box's message (text and markup), and the notices. */
async function save(page, name) {
    const f = form(page);
    const out = {};
    const notes = page.locator('.app__notifications');
    const before = flat(await notes.innerText().catch(() => '')) || '';
    const w = page.waitForResponse((r) => r.request().method() === 'POST' && /manage/.test(r.url()), {timeout: T}).catch(() => null);
    await f.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await w;
    out.saveStatus = r ? r.status() : null;
    await idle(page);
    await sleep(1500);
    out.windowOpen = await f.isVisible().catch(() => false);
    if (out.windowOpen) {
        out.underBoxes = await f.evaluate((el) => [...el.querySelectorAll('span.error, label.error')]
            .filter((e) => e.getClientRects().length)
            .map((e) => ({
                field: (e.closest('[id$="FormArea"]') || {}).id || null,
                text: e.innerText.replace(/\s+/g, ' ').trim(),
                html: e.innerHTML.trim(),
            })));
    }
    // The notice at the top right comes a moment after the window's answer: wait (up to 8 s) for one that was not
    // there before "Save" (an earlier notice, such as "The plugin "URN" has been enabled.", may still be showing).
    const fresh = async () => {
        const items = (await notes.locator('.pkpNotification').allInnerTexts().catch(() => [])).map((t) => flat(t));
        return items.filter((t) => t && !before.includes(t));
    };
    let got = [];
    for (let i = 0; i < 16 && !(got = await fresh()).length; i++) await sleep(500);
    out.noticeShown = got;
    out.noticeHtml = flat(await notes.innerHTML().catch(() => null), 1500);
    const s = await snap(page, name, {save: out});
    out.notices = s.notices;
    return out;
}

async function closeWindow(page) {
    const c = page.locator('[role="dialog"]:visible').last().getByRole('button', {name: /^Close/}).first();
    if (await c.count()) await c.click().catch(() => {});
    await idle(page);
    await sleep(600);
}

module.exports = {T, sleep, flat, snap, openUrnSettings, fillWindow, save, closeWindow};
