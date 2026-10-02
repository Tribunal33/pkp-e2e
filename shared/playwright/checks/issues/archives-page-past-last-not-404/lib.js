// Helpers of walk.js (issue report docs/issues/U17-OPS5-archives-page-past-last-not-404.md).
// Requiring this file runs nothing. The "Archives" page is read with the helper of the sibling
// report U17 OPS1 (archives-empty-server-says-nothing/lib.js).
const {idle} = require('../../../probe');
const {T, readArchives} = require('../archives-empty-server-says-nothing/lib.js');

/**
 * As a signed-in manager: Settings › Website › "Setup" › "Lists", "Items per page" set to `n`, "Save".
 * Returns the save's status and the value before.
 */
async function setItemsPerPage(page, app, n) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/website`));
    await idle(page).catch(() => null);
    await page.getByRole('tab', {name: 'Setup', exact: true}).filter({visible: true}).first().click({timeout: T});
    await page.getByRole('tab', {name: 'Lists', exact: true}).filter({visible: true}).first().click({timeout: T});
    const input = page.locator('input[name="itemsPerPage"]').filter({visible: true}).first();
    const before = await input.inputValue({timeout: T});
    await input.fill(String(n));
    const form = page.locator('form').filter({has: input}).first();
    const [resp] = await Promise.all([
        page.waitForResponse((r) => r.request().method() !== 'GET' && /\/api\/v1\/contexts\//.test(r.url()), {timeout: T}),
        form.getByRole('button', {name: 'Save', exact: true}).click({timeout: T}),
    ]);
    await idle(page).catch(() => null);
    return {before, status: resp.status()};
}

/** Open an address, return its status and the "Archives" page as data (or the page's text when it is not one). */
async function openArchives(page, url) {
    const r = await page.goto(url);
    await idle(page).catch(() => null);
    const a = await readArchives(page);
    return {status: r && r.status(), url: page.url(), ...a, text: undefined, belowHeader: undefined,
        body: a.archivePage ? undefined : a.body};
}

module.exports = {T, setItemsPerPage, openArchives};
