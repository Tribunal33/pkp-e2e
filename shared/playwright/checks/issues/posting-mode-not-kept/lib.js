// Helpers of walk.js and neighbour.js (issue report docs/issues/U51-OPS1-posting-mode-says-saved-keeps-nothing.md).
// Requiring this file runs nothing. Every helper presses what a person presses, or reads what the page shows.
const {idle, signIn, signOut} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const rel = (u) => u.replace(/^https?:\/\/[^/]+/, '');
const NONE = "OPS will not be used to post the server's contents online.";
const OPEN = 'The server will provide open access to its contents.';
const PREPRINT = 9;

/** Settings › Distribution, freshly loaded, on its "Access" tab. */
async function openAccessTab(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/distribution`));
    await idle(page);
    await page.locator('#access-button').click();
    await page.locator('#access').getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
    await idle(page);
}

/** The "Posting Mode" radios on the "Access" tab: each label and whether it is selected. */
async function postingMode(page) {
    const radios = page.locator('#access').getByRole('group', {name: /Posting Mode/}).getByRole('radio');
    const n = await radios.count();
    const out = [];
    for (let i = 0; i < n; i++) {
        const r = radios.nth(i);
        const label = await r.evaluate((el) => (el.closest('label') || {}).innerText || el.getAttribute('aria-label') || el.value);
        out.push({label: label.trim(), checked: await r.isChecked()});
    }
    return out;
}

/** The labels of the fields the "Access" tab holds. */
async function tabFields(page) {
    return (await page.locator('#access legend, #access .pkpFormFieldLabel').allInnerTexts()).map((x) => x.trim()).filter(Boolean);
}

/** The "Enable OAI" radios: which is selected. */
async function oai(page) {
    const g = page.locator('#access').getByRole('group', {name: /Enable OAI/});
    return {enable: await g.getByLabel('Enable', {exact: true}).isChecked(), disable: await g.getByLabel('Disable', {exact: true}).isChecked()};
}

/** Choose "Enable" or "Disable" under "Enable OAI" and press "Save". */
async function saveOai(page, label) {
    const panel = page.locator('#access');
    await panel.getByRole('group', {name: /Enable OAI/}).getByLabel(label, {exact: true}).check();
    const answer = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answer;
    const saved = await panel.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).then(() => true, () => false);
    return {chose: label, status: r.status(), saved};
}

/** Choose a "Posting Mode" and press "Save": the request the page sent, its answer and the "Saved" notice. */
async function savePostingMode(page, label) {
    const panel = page.locator('#access');
    await panel.getByLabel(label, {exact: true}).check();
    const answer = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answer;
    const sent = r.request().postData() || '';
    let body = null;
    try { body = await r.json(); } catch (e) { body = null; }
    const saved = await panel.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).then(() => true, () => false);
    return {
        chose: label,
        request: `${r.request().method()} ${rel(r.url())}`,
        sentPostingMode: (sent.match(/publishingMode[^&,]*/) || [null])[0],
        status: r.status(),
        answerHasPublishingMode: body ? Object.prototype.hasOwnProperty.call(body, 'publishingMode') : null,
        answerPublishingMode: body ? body.publishingMode : null,
        saved,
    };
}

/** The header's primary menu items on the reader-facing site. */
async function headerItems(page) {
    return (await page.locator('#navigationPrimary > li > a').allInnerTexts()).map((s) => s.trim()).filter(Boolean);
}

/** Open a reader-facing address: where it landed, its answer and its heading. */
async function visit(page, url) {
    const resp = await page.goto(url);
    await idle(page);
    const h1 = await page.locator('h1').first().innerText().catch(() => null);
    const body = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
    return {
        url: rel(url), landed: rel(page.url()), status: resp ? resp.status() : null,
        title: await page.title(), h1: h1 && h1.trim(), notice: (body.match(/##[\w.]+##|[^.]*not[^.]*post[^.]*\./i) || [null])[0],
    };
}

/** The server's home page, its "Archives" item pressed when there is one, preprint 9 and its "PDF". */
async function readerTour(page, app) {
    const out = {};
    out.home = await visit(page, app.url(`/index.php/${app.contextPath}/en`));
    out.header = await headerItems(page);
    const archives = page.locator('#navigationPrimary > li > a', {hasText: 'Archives'});
    if (await archives.count()) {
        await archives.first().click();
        await idle(page);
        out.archives = {landed: rel(page.url()), title: await page.title(), preprintsListed: await page.locator('.obj_preprint_summary').count()};
    } else {
        out.archives = 'no "Archives" item';
        out.archivesByAddress = await visit(page, app.url(`/index.php/${app.contextPath}/en/preprints`));
    }
    out.preprint = await visit(page, app.url(`/index.php/${app.contextPath}/en/preprint/view/${PREPRINT}`));
    const pdf = page.locator('a.obj_galley_link', {hasText: 'PDF'}).first();
    if (await pdf.count()) {
        await pdf.click();
        await idle(page);
        out.pdf = {landed: rel(page.url()), title: await page.title(), viewer: await page.locator('iframe, .pdf_viewer, #pdfCanvasContainer').count()};
    } else {
        out.pdf = 'no "PDF" link';
    }
    return out;
}

/** Record every server error and page script error the page meets. */
function watchFailures(page) {
    const failures = [];
    page.on('response', (r) => r.status() >= 500 && failures.push(`${r.status()} ${rel(r.url())}`));
    page.on('pageerror', (e) => failures.push(`pageerror ${String(e).slice(0, 200)}`));
    return failures;
}

/** The stored setting, read from the install's database (Evidence only, never a step). */
function stored(app, sql) {
    return sql(app, "select setting_value from server_settings where setting_name = 'publishingMode'") || '(no row)';
}

module.exports = {tabFields, oai, saveOai, T, pause, rel, NONE, OPEN, PREPRINT, openAccessTab, postingMode, savePostingMode, headerItems, visit, readerTour, watchFailures, stored, signIn, signOut};
