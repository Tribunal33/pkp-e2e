// Helpers for the Copyright Year walk (docs/issues/U40-A2-…) on PKP's default test dataset: the journal's
// Copyright Year basis, a submission's "Permissions & Disclosure", a typed publication date, posting a preprint and
// the preprint page's DC.Rights. The reset itself is the sibling lib's. Requiring this file runs nothing.
const {idle} = require('../../../probe');
const PS = require('../plain-summary-required-refuses-other-saves/lib.js');
const R = require('../reset-permissions-button-greyed-after-cancel/lib.js');

const T = 30_000;
const {flat, sleep, wf, openWorkflow, openEntry, savePage, watchWrites} = PS;

/** OJS Settings › Distribution › "License": "Copyright Year" set to the named choice, "Save". */
async function setYearBasis(app, page, choice) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/distribution`));
    await page.getByRole('tab', {name: 'License', exact: true}).first().click({timeout: T});
    const form = page.locator('[id="license"] form').first();
    await form.waitFor({timeout: T});
    await idle(page).catch(() => {});
    const radio = form.getByRole('radio', {name: choice, exact: true});
    await radio.check();
    const answered = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(r.url().split('?')[0]) && r.request().method() !== 'GET', {timeout: T});
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answered;
    await idle(page).catch(() => {});
    return {choice, status: r.status(), checked: await radio.isChecked()};
}

/** A submission's Publication › "Permissions & Disclosure": every box's value, whether it is locked, the buttons. */
async function readPermissions(app, page, id) {
    await openWorkflow(app, page, id);
    await openEntry(page, 'Permissions & Disclosure');
    const dialog = wf(page);
    const form = dialog.locator('form').filter({hasText: 'Copyright Year'}).first();
    await form.waitFor({timeout: T});
    await sleep(300);
    const fields = await form.locator('input[type="text"], input:not([type])').evaluateAll((els) => els.map((e) => ({
        name: e.name || e.id, value: e.value, disabled: e.disabled,
    })));
    const year = fields.find((x) => /^copyrightYear/.test(x.name)) || null;
    return {
        id,
        heading: flat(await dialog.locator('h1, h2').first().innerText().catch(() => null), 160),
        copyrightYear: year,
        fields,
        buttons: (await form.getByRole('button').allInnerTexts()).map((x) => flat(x, 40)).filter(Boolean),
        yearDescription: flat(await form.locator('.pkpFormField').filter({hasText: 'Copyright Year'}).first().innerText().catch(() => null), 300),
    };
}

/** OJS Publication › "Publication Settings" › "Don't Assign To An Issue" and "Publication Date", OPS Publication › "Preprint entry" › "Date Posted": type a date, "Save". */
async function setDatePublished(app, page, id, date) {
    const writes = watchWrites(page);
    await openWorkflow(app, page, id);
    await openEntry(page, app.name === 'ojs' ? 'Publication Settings' : 'Preprint entry');
    const box = wf(page).locator('input[name="datePublished"]').first();
    await box.waitFor({timeout: T});
    // OJS asks for an issue assignment before it saves this form: "Don't Assign To An Issue".
    const noIssue = wf(page).getByRole('radio', {name: "Don't Assign To An Issue", exact: true});
    if (await noIssue.count()) await noIssue.check();
    await box.fill(date);
    const saved = await savePage(page, writes);
    return {date, saved};
}

/** OPS: "Post the preprint", "Post", and the window's own "Post" (the sibling check's helper). */
async function post(page) {
    return require('../scheduled-preprint-never-posted/lib.js').postAndConfirm(page);
}

/** The reader's page of a published item: its DC.Rights header and any "Copyright" line in the page text. */
async function readerRights(app, page, path) {
    const r = await page.goto(app.url(`/index.php/${app.contextPath}/en/${path}`));
    await idle(page).catch(() => {});
    return {
        path, status: r && r.status(),
        dcRights: (await page.locator('meta[name="DC.Rights"]').count()) ? await page.locator('meta[name="DC.Rights"]').first().getAttribute('content') : null,
        copyrightLine: flat(await page.getByText(/Copyright \(c\)/).first().innerText({timeout: 1000}).catch(() => null), 200),
    };
}

/** The OAI-PMH Dublin Core list (`/oai?verb=ListRecords&metadataPrefix=oai_dc`): the dc:rights of the record whose identifier ends `/<id>`. */
async function oaiRights(app, page, kind, id) {
    const r = await page.request.get(app.url(`/index.php/${app.contextPath}/oai?verb=ListRecords&metadataPrefix=oai_dc`));
    const xml = await r.text();
    const rec = xml.split('<record>').find((x) => new RegExp(`<identifier>[^<]*/${id}</identifier>`).test(x) && x.includes(`${kind}/view/${id}`)) || null;
    const rights = rec ? [...rec.matchAll(/<dc:rights[^>]*>([^<]*)<\/dc:rights>/g)].map((m) => m[1]) : null;
    return {status: r.status(), found: !!rec, rights};
}

module.exports = {oaiRights, T, flat, sleep, openWorkflow, setYearBasis, readPermissions, setDatePublished, post, readerRights, R};
