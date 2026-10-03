// Helpers of walk.js (U75 A3: saving another relation status keeps the DOI of the published version;
// docs/issues/U75-A3-relation-change-keeps-published-version-doi.md). Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const controlsLeft = (page) => page.locator('[data-cy="workflow-controls-left"]').first();
/** The "Relations" button in the workflow's control region (OPS). */
const relationsButton = (page) => controlsLeft(page).getByRole('button', {name: /^Relations/});
/** The panel "Relations" opens. */
const relationsPanel = (page) => page.locator('.pkpWorkflow__publicationRelation .pkpDropdown__content').first();

/** Open a submission's workflow by address (the dashboard's "View") on its latest version's "Title & Abstract". */
async function openPublication(page, app, id) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    await idle(page);
    await controlsLeft(page).waitFor({state: 'visible', timeout: T}).catch(() => {});
    // The side menu's "Title & Abstract" of the version the workflow opens on.
    const ta = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Title & Abstract', exact: true})
        .or(page.locator('[role="dialog"]:visible').first().getByRole('link', {name: 'Title & Abstract', exact: true}));
    if (await ta.count()) await ta.first().click().catch(() => {});
    await idle(page);
    await page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Save', exact: true}).first()
        .waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
    await relationsButton(page).first().waitFor({state: 'visible', timeout: T}).catch(() => {});
}

/** Press "Relations" unless its panel is already open. */
async function openRelations(page) {
    if (!(await relationsPanel(page).isVisible().catch(() => false))) await relationsButton(page).first().click();
    await relationsPanel(page).waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
    await sleep(300);
}

/** What the panel shows: the choices (ticked or not) and the DOI box (shown, value). */
async function readRelations(page) {
    const p = relationsPanel(page);
    const open = await p.isVisible().catch(() => false);
    if (!open) return {open};
    const radios = await p.locator('input[name="relationStatus"]').evaluateAll((els) => els.map((e) => ({
        label: ((e.closest('label') || e.parentElement).innerText || '').replace(/\s+/g, ' ').trim(),
        value: e.value, checked: e.checked,
    }))).catch(() => []);
    const box = p.locator('input[name="vorDoi"]');
    const shown = (await box.count()) ? await box.first().isVisible().catch(() => false) : false;
    return {
        open,
        ticked: radios.filter((r) => r.checked).map((r) => r.label),
        doiBox: {shown, value: shown ? await box.first().inputValue().catch(() => null) : null},
        text: flat(await p.innerText().catch(() => null), 500),
    };
}

/** Tick one of the choices by its label; false when the panel offers no such choice (3.5 has two). */
async function tickStatus(page, label) {
    const radio = relationsPanel(page).getByRole('radio', {name: label, exact: true});
    if (!(await radio.count())) return false;
    await radio.first().check({timeout: 5000}).catch(async () => radio.first().click({force: true, timeout: 5000}));
    await sleep(300);
    return true;
}

/** Type into "DOI of the published preprint" (shown only with "published elsewhere"). */
async function typeDoi(page, value) {
    const box = relationsPanel(page).locator('input[name="vorDoi"]').first();
    if (!(await box.isVisible().catch(() => false))) return {typed: false};
    await box.fill(value);
    return {typed: true, value: await box.inputValue()};
}

/** Press the panel's "Save": the request the page sent, the answer, and the "Saved" status. */
async function saveRelations(page) {
    const save = relationsPanel(page).getByRole('button', {name: 'Save', exact: true}).first();
    const w = page.waitForResponse((r) => /\/api\/v1\/submissions\/\d+\/publications\/\d+$/.test(r.url().split('?')[0]) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
    await save.click({timeout: 5000}).catch(() => {});
    const resp = await w;
    const body = resp ? await resp.json().catch(() => null) : null;
    let sent = null;
    if (resp) { try { sent = JSON.parse(resp.request().postData() || 'null'); } catch (e) { sent = flat(resp.request().postData(), 300); } }
    await sleep(600);
    return {
        status: resp ? resp.status() : null,
        override: resp ? resp.request().headers()['x-http-method-override'] || null : null,
        sent,
        answer: body ? {relationStatus: body.relationStatus, vorDoi: body.vorDoi, error: body.error || body.errorMessage || null} : null,
        statusText: await page.locator('.pkpWorkflow__publicationRelation [role="status"]').allInnerTexts().catch(() => []),
        panel: await readRelations(page),
    };
}

/** The preprint page as a reader sees it: the notice boxes above the title. */
async function readerNotice(page, url) {
    const resp = await page.goto(url);
    await idle(page);
    const notices = await page.evaluate(() => [...document.querySelectorAll('.cmp_notification')].map((n) => ({
        text: (n.innerText || '').replace(/\s+/g, ' ').trim(),
        links: [...n.querySelectorAll('a')].map((a) => a.getAttribute('href')),
    }))).catch(() => []);
    return {status: resp && resp.status(), notices, title: flat(await page.locator('h1.page_title').first().innerText().catch(() => null), 200)};
}

module.exports = {T, flat, sleep, controlsLeft, relationsButton, relationsPanel, openPublication, openRelations,
    readRelations, tickStatus, typeDoi, saveRelations, readerNotice};
