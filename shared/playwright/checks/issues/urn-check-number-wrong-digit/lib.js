// Shared screen helpers for walk.js and neighbour.js (docs/issues/U44-A6-urn-check-number-wrong-digit.md).
// The "Identifiers" page helpers come from U44 A4's kept script; this file adds the URN settings window with
// "Check Number" and the object kinds, the galley and chapter "Identifiers" tabs, and the check-digit rule.
const A4 = require('../urn-resave-refused-already-in-use/lib');
const {idle} = require('../../../probe');

const {T, PREFIX, sleep, flat, wf, isMain, snap} = A4;
const topWin = (page) => page.locator('[role="dialog"]:visible').last();

// ---- The check-digit rule, as URNPubIdPlugin::_calculateCheckNo() computes it (over the string it is given).
const TABLE = {9: '41', 8: '9', 7: '8', 6: '7', 5: '6', 4: '5', 3: '4', 2: '3', 1: '2', 0: '1', a: '18', b: '14', c: '19', d: '15', e: '16', f: '21', g: '22', h: '23', i: '24', j: '25', k: '42', l: '26', m: '27', n: '13', o: '28', p: '29', q: '31', r: '12', s: '32', t: '33', u: '11', v: '34', w: '35', x: '36', y: '37', z: '38', '-': '39', ':': '17', _: '43', '/': '45', '.': '47', '+': '49'};
function digit(s) {
    const n = [...s.toLowerCase()].map((c) => TABLE[c]).join('');
    let sum = 0;
    for (let j = 1; j <= n.length; j++) sum += Number(n[j - 1]) * j;
    const q = String(Math.floor(sum / Number(n[n.length - 1])));
    return q[q.length - 1];
}
/** What each rule gives for a URN without its digit: over the whole URN, and over the part after the prefix. */
const rules = (urn) => ({urn, wholeUrnDigit: digit(urn), suffixOnlyDigit: digit(urn.startsWith(PREFIX) ? urn.slice(PREFIX.length) : urn)});

// ---- Settings › Website › Plugins: the "URN" row and its settings window
const urnRow = (page) => page.locator('#pluginGridContainer tr.gridRow[id$="-row-urnpubidplugin"]');

async function gotoPlugins(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/website`));
    await idle(page);
    await page.locator('#plugins-button').click();
    await page.locator('#pluginGridContainer tr.gridRow').first().waitFor({timeout: T});
    await idle(page);
    await sleep(300);
}

/**
 * Tick "URN" on the Plugins list (when not ticked), open its "Settings", set it as the Steps say, "Save".
 * opts: {kinds: ['enablePublicationURN', …], suffix: 'customId' | 'default', checkNo: true | false}
 */
async function configureUrn(page, app, name, opts) {
    const out = {};
    await gotoPlugins(page, app);
    out.rowFound = (await urnRow(page).count()) > 0;
    if (!out.rowFound) return out;
    const box = urnRow(page).getByRole('checkbox').first();
    if (!(await box.isChecked())) {
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
    const f = page.locator('#urnSettingsForm');
    await f.locator('input[name="urnPrefix"]').waitFor({state: 'visible', timeout: T});
    await idle(page);
    await sleep(400);
    for (const k of opts.kinds || []) {
        const c = f.locator(`input[type=checkbox][name="${k}"]`);
        if ((await c.count()) && !(await c.isChecked())) await c.click();
    }
    await f.locator('input[name="urnPrefix"]').fill(PREFIX);
    await f.locator(`input[type=radio][name="urnSuffix"][value="${opts.suffix}"]`).check();
    const cn = f.locator('input[type=checkbox][name="urnCheckNo"]');
    if ((await cn.isChecked()) !== !!opts.checkNo) await cn.click();
    await f.locator('select[name="urnNamespace"]').selectOption('urn:nbn:de');
    await f.locator('input[name="urnResolver"]').fill('https://nbn-resolving.de/');
    out.checkNoTicked = await cn.isChecked();
    out.window = flat(await f.innerText().catch(() => null), 3000);
    await snap(page, `${name}-filled`);
    const w = page.waitForResponse((r) => r.request().method() === 'POST' && /manage/.test(r.url()), {timeout: T}).catch(() => null);
    await f.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await w;
    out.saveStatus = r ? r.status() : null;
    await f.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    await idle(page);
    await sleep(600);
    out.windowClosed = !(await f.isVisible().catch(() => false));
    await snap(page, `${name}-saved`, {setup: out});
    return out;
}

// ---- The "Identifiers" page: "Add Check Number" and "Assign"
const urnFieldLoc = (page) => wf(page).locator('.pkpFormField').filter({hasText: 'URN'}).first();
const urnInputValue = async (page) => urnFieldLoc(page).locator('input').first().inputValue().catch(() => null);

async function pressFieldButton(page, label, name) {
    const b = urnFieldLoc(page).getByRole('button', {name: label, exact: true});
    const out = {offered: (await b.count()) > 0};
    if (!out.offered) { out.buttons = await urnFieldLoc(page).getByRole('button').allInnerTexts().catch(() => []); await snap(page, name, {press: out}); return out; }
    out.before = await urnInputValue(page);
    await b.click();
    await sleep(400);
    out.after = await urnInputValue(page);
    await snap(page, name, {press: out});
    return out;
}

// ---- The legacy windows' "Identifiers" tab
const idForm = (page) => topWin(page).locator('#publicIdentifiersForm').first();

async function waitWindowTabs(page) {
    await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).pop(); return d && d.querySelector('[role=tab]'); }, null, {timeout: 20_000}).catch(() => {});
    await idle(page);
    await sleep(400);
    return (await topWin(page).locator('[role=tab]').allInnerTexts().catch(() => [])).map((x) => x.trim());
}

/** A journal: the version's "Galleys", the row's "Edit" (main: the row menu; 3.5: the grid's row link). */
async function openGalleyWindow(page, app, sid, pid, label, name) {
    const key = isMain(app) ? `publication_${pid}_galleys` : 'publication_galleys';
    await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${sid}&workflowMenuKey=${key}`));
    await idle(page);
    await sleep(800);
    const vueRow = wf(page).locator('tbody tr').filter({hasText: label}).first();
    const gridRow = wf(page).locator('tr.gridRow').filter({hasText: label}).first();
    await vueRow.or(gridRow).first().waitFor({timeout: T}).catch(() => {});
    if (await gridRow.count()) {
        const id = await gridRow.getAttribute('id');
        await gridRow.locator('a.show_extras').first().click();
        await sleep(500);
        await page.locator(`[id="${id}-control-row"]`).getByRole('link', {name: 'Edit', exact: true}).first().click();
    } else {
        await vueRow.locator('button').last().click();
        await idle(page);
        await page.getByRole('menuitem', {name: 'Edit', exact: true}).first().click();
    }
    await idle(page);
    const tabs = await waitWindowTabs(page);
    await snap(page, name, {tabs});
    return {tabs};
}

/** A press: the version's "Chapters", the chapter's title link. */
async function openChapterWindow(page, app, sid, pid, title, name) {
    const key = isMain(app) ? `publication_${pid}_chapters` : 'publication_chapters';
    await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${sid}&workflowMenuKey=${key}`));
    await idle(page);
    await sleep(800);
    const a = wf(page).locator('a.pkp_linkaction_editChapter').filter({hasText: title}).first();
    await a.waitFor({timeout: T});
    await a.click();
    await idle(page);
    const tabs = await waitWindowTabs(page);
    await snap(page, name, {tabs});
    return {tabs};
}

async function readTab(page) {
    const f = idForm(page);
    if (!(await f.count())) return {formPresent: false};
    return f.evaluate((el) => {
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const area = el.querySelector('[id^="pubIdURNFormArea"]');
        const val = (sel) => { const i = el.querySelector(sel); return i ? i.value : null; };
        return {
            formPresent: true,
            urnArea: t(area),
            paragraphs: area ? [...area.querySelectorAll('p')].map(t).filter(Boolean) : [],
            prefix: val('input[name="urnPrefix"]'),
            suffix: val('input[name="urnSuffix"]'),
        };
    });
}

async function openIdTab(page, name) {
    const t = topWin(page).getByRole('tab', {name: 'Identifiers', exact: true});
    if (!(await t.count())) { await snap(page, name, {idTab: 'absent'}); return {absent: true}; }
    await t.click();
    await idle(page);
    await idForm(page).waitFor({timeout: T}).catch(() => {});
    await idle(page);
    await sleep(400);
    const out = await readTab(page);
    await snap(page, name, {idTab: out});
    return out;
}

/** Type a suffix in the tab's "URN Suffix" and press its "Add Check Number". */
async function tabAddCheckNumber(page, suffix, name) {
    const f = idForm(page);
    const box = f.locator('input[name="urnSuffix"]');
    const out = {boxOffered: (await box.count()) > 0};
    if (!out.boxOffered) { await snap(page, name, {tab: out}); return out; }
    await box.fill(suffix);
    const b = f.getByRole('button', {name: 'Add Check Number'});
    out.buttonOffered = (await b.count()) > 0;
    if (out.buttonOffered) { await b.first().click(); await sleep(400); }
    out.after = await box.inputValue();
    out.prefix = await f.locator('input[name="urnPrefix"]').inputValue().catch(() => null);
    await snap(page, name, {tab: out});
    return out;
}

async function closeTopWin(page) {
    const c = topWin(page).getByRole('button', {name: /^Close/}).first();
    if (await c.count()) await c.click().catch(() => {});
    await idle(page);
    await sleep(900);
}

module.exports = {...A4, topWin, digit, rules, configureUrn, urnInputValue, pressFieldButton, openGalleyWindow, openChapterWindow, openIdTab, readTab, tabAddCheckNumber, closeTopWin};
