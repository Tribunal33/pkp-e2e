// Shared screen helpers for walk.js and neighbour.js (docs/issues/U44-A7-urn-assign-box-leaves-urn-out.md).
// The URN settings window and the galley and chapter windows come from U44 A6's kept script
// (../urn-check-number-wrong-digit/lib.js); this file adds the format and issue windows, the tab's URN area
// read raw (the assign box's label as the page holds it), the tab's "URN Suffix" and "Save", and the two
// windows that name the URN in the same box: "Publish Issue" (OJS) and "Format Approval" (OMP).
const A6 = require('../urn-check-number-wrong-digit/lib');
const {idle, sql} = require('../../../probe');

const {T, sleep, flat, wf, isMain, snap, topWin} = A6;
const idForm = (page) => topWin(page).locator('#publicIdentifiersForm').first();

// The n-th version by creation; the newest when n is null (read only, to build the workflow's address).
const pubIdOf = (app, sid, n) => Number(sql(app, `select publication_id from publications where submission_id = ${sid} order by publication_id ${n ? `asc offset ${n - 1}` : 'desc'} limit 1`));

// The "assignURN" box inside a root element, read in the page: ticked or not, its label as shown (innerText)
// and as the page holds it (textContent, which keeps the doubled space where the URN is missing).
function readBox(root) {
    const box = root.querySelector('input[name="assignURN"]');
    if (!box) return null;
    const label = box.closest('label') || box.parentElement;
    return {checked: box.checked, shown: label.innerText.trim(), raw: label.textContent.trim()};
}

/** What a tab's URN area shows: its paragraphs, the "Clear" link, the assign box. */
async function readUrnArea(page) {
    const f = idForm(page);
    if (!(await f.count())) return {formPresent: false};
    const out = await f.evaluate((el) => {
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const area = el.querySelector('[id^="pubIdURNFormArea"]');
        if (!area) return {formPresent: true, urnArea: null};
        const clear = [...area.querySelectorAll('a')].find((a) => a.innerText.trim() === 'Clear' && a.getClientRects().length);
        const suffix = el.querySelector('input[name="urnSuffix"]');
        return {
            formPresent: true,
            urnArea: t(area),
            paragraphs: [...area.querySelectorAll('p')].map(t).filter(Boolean),
            suffix: suffix ? suffix.value : null,
            clearLink: !!clear,
        };
    });
    if (out.urnArea !== null) out.assignBox = await f.locator('[id^="pubIdURNFormArea"]').first().evaluate(readBox);
    return out;
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

/** "URN Suffix" typed (when given), then the tab's "Save": the update request's answer, whether the window closed. */
async function saveTab(page, name, suffix) {
    const f = idForm(page);
    const out = {};
    if (suffix != null) {
        const box = f.locator('input[name="urnSuffix"]');
        out.suffixBoxOffered = (await box.count()) > 0;
        if (out.suffixBoxOffered) await box.fill(suffix);
    }
    const n0 = await page.locator('[role="dialog"]:visible').count();
    const w = page.waitForResponse((r) => /update-?identifiers/i.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await f.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await w;
    await idle(page);
    await sleep(1000);
    await idle(page);
    out.status = r ? r.status() : null;
    out.windowClosed = (await page.locator('[role="dialog"]:visible').count()) < n0;
    await snap(page, name, {save: out});
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

const formatRow = (page, label) => wf(page).locator('tr.gridRow').filter({has: page.locator('.onix_code')}).filter({hasText: label}).first();

async function gotoFormats(page, app, sid, pid, label) {
    const key = isMain(app) ? `publication_${pid}_publicationFormats` : 'publication_publicationFormats';
    await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${sid}&workflowMenuKey=${key}`));
    await idle(page);
    await sleep(800);
    await formatRow(page, label).waitFor({timeout: T});
}

/** OMP: the format row's arrow › "Edit". */
async function openFormatWindow(page, app, sid, pid, label, name) {
    await gotoFormats(page, app, sid, pid, label);
    const row = formatRow(page, label);
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

/** OJS: Issues › "Future Issues" › the issue's arrow › `action` ("Edit", "Publish Issue"). */
async function issueAction(page, app, title, action) {
    await page.goto(app.url(`/index.php/${app.contextPath}/manageIssues`));
    await idle(page);
    const tab = page.getByRole('tab', {name: 'Future Issues'});
    if (await tab.count()) { await tab.first().click(); await idle(page); }
    const row = page.locator('tr.gridRow').filter({hasText: title}).filter({visible: true}).first();
    await row.waitFor({timeout: T});
    await row.locator('a.show_extras').click();
    await sleep(300);
    const ctl = row.locator('xpath=following-sibling::tr[1]');
    await ctl.getByRole('link', {name: action, exact: true}).first().click();
    await idle(page);
}

async function openIssueWindow(page, app, title, name) {
    await issueAction(page, app, title, 'Edit');
    await topWin(page).getByRole('tab', {name: 'Identifiers', exact: true}).waitFor({timeout: T}).catch(() => {});
    const tabs = (await topWin(page).getByRole('tab').allInnerTexts().catch(() => [])).map((x) => x.trim());
    await snap(page, name, {tabs});
    return {tabs};
}

/** A window titled `title` (legacy modal or Vue dialog), by its heading. */
const windowByTitle = (page, title) => page.locator('[role="dialog"]:visible').filter({has: page.locator('h1, h2').filter({hasText: new RegExp(`^\\s*${title}\\s*$`)})}).last();

/** Read a confirmation window that carries the assign box ("Publish Issue", "Format Approval"), then its "Cancel". */
async function readAssignWindowAndCancel(page, title, name) {
    const win = windowByTitle(page, title);
    await win.waitFor({timeout: T});
    await win.locator('form').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    await sleep(500);
    const out = await win.evaluate((el) => {
        const area = el.querySelector('[id^="pubIdURNFormArea"]');
        return {urnArea: area ? area.innerText.replace(/\s+/g, ' ').trim() : null};
    });
    out.assignBox = await win.locator('form').first().evaluate(readBox);
    out.title = title;
    await snap(page, name, {window: out});
    const cancel = win.getByRole('link', {name: 'Cancel', exact: true}).or(win.getByRole('button', {name: 'Cancel', exact: true})).first();
    await cancel.click();
    await win.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    await idle(page);
    await sleep(900);
    return out;
}

/** OMP: the format row's "Awaiting Approval" › "Format Approval": read, "Cancel". */
async function formatApproval(page, app, sid, pid, label, name) {
    await gotoFormats(page, app, sid, pid, label);
    const link = formatRow(page, label).locator('a').filter({hasText: /^\s*Awaiting Approval\s*$/}).first();
    const out = {linkOffered: (await link.count()) > 0};
    if (!out.linkOffered) { await snap(page, name, {window: out}); return out; }
    await link.click();
    return {...out, ...(await readAssignWindowAndCancel(page, 'Format Approval', name))};
}

/** OJS: the issue's "Publish Issue": read, "Cancel". */
async function publishIssue(page, app, title, name) {
    await issueAction(page, app, title, 'Publish Issue');
    return readAssignWindowAndCancel(page, 'Publish Issue', name);
}

module.exports = {...A6, idForm, pubIdOf, readUrnArea, openIdTab, saveTab, addFormat, openFormatWindow, openIssueWindow, formatApproval, publishIssue};
