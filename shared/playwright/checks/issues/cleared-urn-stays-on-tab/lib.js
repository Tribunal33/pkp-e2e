// Shared screen helpers for walk.js and neighbour.js (docs/issues/U44-A14-cleared-urn-stays-on-tab.md).
// The URN settings window and the galley and chapter windows come from U44 A6's kept script
// (../urn-check-number-wrong-digit/lib.js); this file adds the format and issue windows, the tab's
// "Save", "Clear" › "OK" / "Cancel", and a read-only look at the stored URNs.
const A6 = require('../urn-check-number-wrong-digit/lib');
const {idle, sql} = require('../../../probe');

const {T, sleep, flat, wf, isMain, snap, topWin} = A6;
const idForm = (page) => topWin(page).locator('#publicIdentifiersForm').first();

// The stored URNs, per kind of item (read only: what the clear removed).
const TABLES = {
    galley: ['publication_galley_settings', 'galley_id'],
    chapter: ['submission_chapter_settings', 'chapter_id'],
    format: ['publication_format_settings', 'publication_format_id'],
    issue: ['issue_settings', 'issue_id'],
};
function storedUrns(app, kind) {
    const [table, col] = TABLES[kind];
    return sql(app, `select ${col} || '=' || coalesce(setting_value, '') from ${table} where setting_name = 'pub-id::other::urn' order by 1`).split('\n').filter(Boolean);
}
// The n-th version by creation (main numbers versions major.minor, 3.5 by one integer); the newest when n is null.
const pubIdOf = (app, sid, n) => Number(sql(app, `select publication_id from publications where submission_id = ${sid} order by publication_id ${n ? `asc offset ${n - 1}` : 'desc'} limit 1`));

/** What the tab's URN area shows: its text, the "Clear" link, the "Assign" box. */
async function readUrnArea(page) {
    const f = idForm(page);
    if (!(await f.count())) return {formPresent: false};
    return f.evaluate((el) => {
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const area = el.querySelector('[id^="pubIdURNFormArea"]');
        const box = el.querySelector('input[name="assignURN"]');
        const clear = [...el.querySelectorAll('a')].find((a) => a.innerText.trim() === 'Clear' && a.getClientRects().length);
        return {
            formPresent: true,
            urnArea: t(area),
            clearLink: !!clear,
            assignBox: box ? {checked: box.checked, label: t(box.closest('li') || box.parentElement)} : null,
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
    const out = await readUrnArea(page);
    await snap(page, name, {idTab: out});
    return out;
}

/** "Save" on the tab: the update request's answer, and whether the window closed. */
async function saveTab(page, name) {
    const f = idForm(page);
    const n0 = await page.locator('[role="dialog"]:visible').count();
    const w = page.waitForResponse((r) => /update-?identifiers/i.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await f.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await w;
    await idle(page);
    await sleep(1000);
    await idle(page);
    const out = {status: r ? r.status() : null, windowClosed: (await page.locator('[role="dialog"]:visible').count()) < n0};
    await snap(page, name, {save: out});
    return out;
}

/**
 * "Clear" on the tab, then "OK" (answer 'ok') or "Cancel" in the "Delete" window.
 * Returns the confirmation's text, the clear request's answer and the tab as it stands after it.
 */
async function clearUrn(page, answer, name) {
    const f = idForm(page);
    const link = f.locator('a').filter({hasText: /^\s*Clear\s*$/}).first();
    const out = {linkOffered: (await link.count()) > 0};
    if (!out.linkOffered) { await snap(page, name, {clear: out}); return out; }
    const requests = [];
    const onReq = (q) => { if (/clear-?pub-?id/i.test(q.url())) requests.push(q.method()); };
    page.on('request', onReq);
    await link.click();
    const confirm = page.locator('[role="dialog"]:visible').filter({hasText: 'Are you sure you wish to delete the existing URN?'}).last();
    await confirm.waitFor({timeout: T});
    await sleep(300);
    out.confirm = flat(await confirm.innerText().catch(() => null), 300);
    await snap(page, `${name}-confirm`, {clear: out});
    if (answer === 'ok') {
        const w = page.waitForResponse((r) => /clear-?pub-?id/i.test(r.url()), {timeout: T}).catch(() => null);
        await confirm.getByRole('button', {name: 'OK', exact: true}).click();
        const r = await w;
        out.status = r ? r.status() : null;
        out.answer = r ? flat(await r.text().catch(() => null), 400) : null;
    } else {
        await confirm.getByRole('button', {name: 'Cancel', exact: true}).click();
    }
    await confirm.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    await idle(page);
    await sleep(1500);
    await idle(page);
    page.off('request', onReq);
    out.clearRequests = requests;
    out.tabAfter = await readUrnArea(page);
    await snap(page, name, {clear: out});
    return out;
}

/** OMP: "Add publication format" on the version's "Publication Formats": a Name, the window's default type, "OK". */
async function addFormat(page, app, sid, pid, label, name) {
    const key = isMain(app) ? `publication_${pid}_publicationFormats` : 'publication_publicationFormats';
    await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${sid}&workflowMenuKey=${key}`));
    await idle(page);
    await sleep(800);
    await wf(page).getByText('Add publication format', {exact: true}).first().click();
    const f = page.locator('#addPublicationFormatForm');
    await f.locator('input[name="name[en]"]').waitFor({state: 'visible', timeout: T});
    await idle(page);
    await sleep(400);
    await f.locator('input[name="name[en]"]').fill(label);
    const w = page.waitForResponse((r) => /update-?format/i.test(r.url()), {timeout: T}).catch(() => null);
    await f.getByRole('button', {name: 'OK', exact: true}).click();
    const r = await w;
    await idle(page);
    await sleep(1200);
    const out = {status: r ? r.status() : null};
    await snap(page, name, {add: out});
    return out;
}

/** OMP: the format row's arrow › "Edit". */
async function openFormatWindow(page, app, sid, pid, label, name) {
    const key = isMain(app) ? `publication_${pid}_publicationFormats` : 'publication_publicationFormats';
    await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${sid}&workflowMenuKey=${key}`));
    await idle(page);
    await sleep(800);
    const row = wf(page).locator('tr.gridRow').filter({has: page.locator('.onix_code')}).filter({hasText: label}).first();
    await row.waitFor({timeout: T});
    const id = await row.getAttribute('id');
    await row.locator('a.show_extras').first().click();
    await sleep(500);
    await page.locator(`[id="${id}-control-row"]`).getByRole('link', {name: 'Edit', exact: true}).first().click();
    await idle(page);
    await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).pop(); return d && d.querySelector('[role=tab]'); }, null, {timeout: 20_000}).catch(() => {});
    await idle(page);
    await sleep(400);
    const tabs = (await topWin(page).locator('[role=tab]').allInnerTexts().catch(() => [])).map((x) => x.trim());
    await snap(page, name, {tabs});
    return {tabs};
}

/** OJS: Issues › "Future Issues" › the issue's arrow › "Edit". */
async function openIssueWindow(page, app, title, name) {
    await page.goto(app.url(`/index.php/${app.contextPath}/manageIssues`));
    await idle(page);
    const tab = page.getByRole('tab', {name: 'Future Issues'});
    if (await tab.count()) { await tab.first().click(); await idle(page); }
    const row = page.locator('tr.gridRow').filter({hasText: title}).filter({visible: true}).first();
    await row.waitFor({timeout: T});
    await row.locator('a.show_extras').click();
    await sleep(300);
    await page.getByRole('link', {name: 'Edit', exact: true}).filter({visible: true}).first().click();
    await idle(page);
    await topWin(page).getByRole('tab', {name: 'Identifiers', exact: true}).waitFor({timeout: T}).catch(() => {});
    const tabs = (await topWin(page).getByRole('tab').allInnerTexts().catch(() => [])).map((x) => x.trim());
    await snap(page, name, {tabs});
    return {tabs};
}

/** OJS: Settings › Distribution › "Access": a "Publishing Mode" radio by its label, "Save". */
async function setPublishingMode(page, app, label, name) {
    await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/distribution`));
    await idle(page);
    await page.getByRole('tab', {name: 'Access', exact: true}).click();
    const panel = page.getByRole('tabpanel', {name: 'Access', exact: true});
    const radio = panel.getByRole('radio', {name: label, exact: true});
    await radio.waitFor({timeout: T});
    await radio.check();
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const saved = await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 15_000}).then(() => true).catch(() => false);
    await idle(page);
    const out = {saved, mode: label};
    await snap(page, name, {access: out});
    return out;
}

module.exports = {...A6, idForm, storedUrns, pubIdOf, readUrnArea, openIdTab, saveTab, clearUrn, addFormat, openFormatWindow, openIssueWindow, setPublishingMode};
