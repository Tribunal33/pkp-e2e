// Helpers of walk.js (U41 A14). Requiring this file runs nothing. Every helper drives the screens.
const {idle, screen} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

/** Settings › Workflow › Submission › "Contributor Roles"; returns the table's rows as text, or null when there is no such tab. */
async function openContributorRoles(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/workflow`));
    await idle(page);
    const sub = page.locator('#submission-button').first();
    await sub.waitFor({timeout: T});
    if ((await sub.getAttribute('aria-selected')) !== 'true') await sub.click();
    await idle(page);
    const tab = page.locator('#contributorRoles-button').first();
    if (!(await tab.count())) return null;
    if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
    await idle(page);
    await page.locator('#contributorRoles tbody tr').first().waitFor({timeout: T});
    return roleRows(page);
}

async function roleRows(page) {
    return (await page.locator('#contributorRoles tbody tr').allInnerTexts()).map((x) => flat(x, 120));
}

/** A role row's "…" › "Delete Role", the identifier typed, the confirm button, "Back to Contributor Roles". */
async function deleteContributorRole(page, name, identifier) {
    const row = page.locator('#contributorRoles tbody tr').filter({has: page.getByText(name, {exact: true})});
    await row.getByRole('button', {name: 'More Actions'}).click();
    await page.getByRole('menuitem', {name: 'Delete Role', exact: true}).click();
    const d = page.getByRole('dialog').filter({hasText: 'Are you absolutely sure'}).last();
    await d.waitFor({timeout: T});
    const asked = flat(await d.innerText(), 400);
    await d.locator('input').first().fill(identifier);
    // the confirm button carries the whole warning sentence as its label (spec U41 Rule 13)
    await d.getByRole('button', {name: /Are you sure you wish to delete this item/}).click();
    await idle(page);
    const done = page.getByRole('dialog').filter({hasText: /Role Deleted|Error/}).last();
    await done.waitFor({timeout: T}).catch(() => {});
    const answer = flat(await done.innerText().catch(() => ''), 300);
    const back = done.getByRole('button', {name: /Back to Contributor Roles|OK/});
    if (await back.count()) await back.first().click();
    await idle(page);
    await sleep(600);
    return {asked, answer, rows: await roleRows(page)};
}

/** The workflow's Publication › "Contributors" list of a submission, through the dashboard address the screen itself uses. */
async function openWorkflowContributors(page, app, subId, pubId) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${subId}&workflowMenuKey=publication_${pubId}_contributors`));
    await idle(page).catch(() => {});
    const panel = contributorPanel(page);
    await panel.waitFor({timeout: 15_000}).catch(() => {});
    if (!(await panel.isVisible().catch(() => false))) {
        const link = page.locator('[role="dialog"]:visible').first().getByRole('link', {name: 'Contributors', exact: true});
        if (await link.count()) { await link.last().click(); await idle(page).catch(() => {}); }
        await panel.waitFor({timeout: T});
    }
    await idle(page).catch(() => {});
    await sleep(500);
}

const contributorPanel = (page) => page.locator('.listPanel--contributor').first();
const contributorForm = (page) => page.getByRole('dialog', {name: /^(Add Contributor|Edit)$/}).last();
async function contributorRows(page) {
    return (await contributorPanel(page).locator('li.listPanel__item').allInnerTexts().catch(() => [])).map((x) => flat(x, 200));
}

/** The open contributor form as data: its visible controls, role boxes, errors and status. */
async function formInfo(page) {
    const d = page.getByRole('dialog', {name: /^(Add Contributor|Edit)$/});
    if (!(await d.count())) return {open: false};
    return d.last().evaluate((root) => {
        const vis = (e) => e.getClientRects().length > 0;
        const labelOf = (i) => (i.closest('label') ? i.closest('label').innerText.trim() : '');
        return {
            open: true,
            controls: [...root.querySelectorAll('input, select, textarea')].filter(vis).map((i) => i.name || i.id).filter(Boolean),
            roleBoxes: [...root.querySelectorAll('input[type="checkbox"][name="contributorRoles"]')].map((i) => ({label: labelOf(i), checked: i.checked})),
            legends: [...root.querySelectorAll('legend, .pkpFormFieldLabel')].filter(vis).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
            fieldErrors: [...root.querySelectorAll('.pkpFieldError')].filter(vis).map((e) => e.innerText.trim()),
            foot: [...root.querySelectorAll('.pkpFormPage__footer, .pkpFormPage__status, [role="status"], [role="alert"]')].filter(vis).map((e) => e.innerText.replace(/\s+/g, ' ').trim()),
        };
    });
}

/**
 * Add (or, with `edit`, edit) a contributor in the open list panel and "Save". `fill` is
 * {givenName, familyName, email, country} for an add, {givenName} for an edit; `roles` ticks
 * (true) or unticks (false) role boxes by name. Returns what the save sent and answered and the
 * window's state 1.5 s and 6 s later; the window is left open.
 */
async function saveContributor(page, {edit = null, fill = {}, roles = {}}) {
    if (edit) {
        await contributorPanel(page).locator('li.listPanel__item').filter({hasText: edit}).getByRole('button', {name: 'Edit', exact: true}).click();
    } else {
        await contributorPanel(page).getByRole('button', {name: 'Add Contributor', exact: true}).click();
    }
    const d = contributorForm(page);
    await d.waitFor({timeout: T});
    await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
    await idle(page).catch(() => {});
    await sleep(500);
    const r = {opened: await formInfo(page)};
    if (fill.givenName != null) await d.locator('input[name="givenName-en"]').fill(fill.givenName);
    if (fill.familyName != null) await d.locator('input[name="familyName-en"]').fill(fill.familyName);
    if (fill.email != null) await d.locator('input[name="email"]').fill(fill.email);
    if (fill.country != null) await d.locator('select[name="country"]').selectOption({label: fill.country});
    for (const [name, on] of Object.entries(roles)) {
        const box = d.getByRole('checkbox', {name, exact: true});
        if (on) await box.check(); else await box.uncheck();
    }
    r.filled = await formInfo(page);
    const resp = page.waitForResponse((x) => /\/contributors(\/\d+)?(\?|$)/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await d.getByRole('button', {name: 'Save', exact: true}).click();
    const res = await resp;
    if (res) {
        const req = res.request();
        let body = null;
        try { body = flat(await res.text(), 1200); } catch (e) { body = `unread: ${e.message}`; }
        r.request = {method: req.method(), override: req.headers()['x-http-method-override'] || null,
            url: res.url().replace(/^https?:\/\/[^/]+/, ''), sent: flat(req.postData(), 1500), status: res.status(), body};
    }
    await sleep(1500);
    r.after1500 = await formInfo(page);
    r.screen = await screen(page);
    await sleep(4500);
    r.after6s = await formInfo(page);
    return r;
}

/** Leave an open contributor window with its own "Close". */
async function closeForm(page) {
    const d = page.getByRole('dialog', {name: /^(Add Contributor|Edit)$/});
    if (!(await d.count())) return false;
    await d.last().getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
    await d.last().waitFor({state: 'hidden', timeout: 6000}).catch(() => {});
    await sleep(600);
    return true;
}

/** From the wizard's current step, "Continue" until the "Contributors" list shows. */
async function continueToContributors(page) {
    for (let i = 0; i < 5 && !(await contributorPanel(page).isVisible().catch(() => false)); i++) {
        const cont = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true});
        if (!(await cont.count())) break;
        await cont.first().click();
        await idle(page).catch(() => {});
        await sleep(800);
    }
    await contributorPanel(page).waitFor({timeout: T});
    await idle(page).catch(() => {});
}

module.exports = {T, sleep, flat, openContributorRoles, roleRows, deleteContributorRole, openWorkflowContributors,
    contributorPanel, contributorRows, formInfo, saveContributor, closeForm, continueToContributors};
