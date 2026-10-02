// Helpers of the U24 A9 issue walk (docs/issues/U24-A9-not-found-page-bare.md). Runs nothing when
// required. `visit` and `flat` are ../stage-address-without-number-blank-page/lib.js's.
const {idle} = require('../../../probe');
const {flat, visit} = require('../stage-address-without-number-blank-page/lib.js');

const T = 60_000;

/**
 * Type an address and say what answered (`visit`), plus what the page gives a person to go on
 * with: its links, navigation regions, stylesheets and whether it has a site header.
 */
async function look(page, app, path) {
    const out = await visit(page, app, path);
    out.page = await page.evaluate(() => ({
        links: document.querySelectorAll('a[href]').length,
        navs: document.querySelectorAll('nav, [role="navigation"]').length,
        stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length,
        header: !!document.querySelector('header, [role="banner"]'),
        html: document.documentElement.outerHTML.length < 200 ? document.documentElement.outerHTML : null,
    })).catch((e) => ({error: flat(e.message)}));
    out.dialogText = flat(await page.locator('[role="dialog"]:visible').last().innerText({timeout: 1000}).catch(() => ''), 200);
    return out;
}

/**
 * In the open workflow press "Delete", then "Confirm" in the dialog; `menu` names the workflow
 * menu's entry to choose first (a declined preprint opens on "Title & Abstract", and "Delete" is
 * on "Production"). Returns the dialog's text, the delete request's status and the address the
 * page is left on.
 */
async function deleteOpenSubmission(page, menu = null) {
    const out = {};
    if (menu) {
        await page.locator('[role="dialog"]').first().getByRole('link', {name: menu, exact: true}).first().click();
        await idle(page);
    }
    const button = page.getByRole('button', {name: 'Delete', exact: true});
    await button.first().waitFor({state: 'visible', timeout: T});
    const answered = page.waitForResponse((r) => /\/_submissions\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await button.first().click();
    const dialog = page.getByRole('dialog', {name: 'Delete', exact: true});
    await dialog.waitFor({timeout: T});
    out.dialog = flat(await dialog.innerText(), 200);
    await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
    const r = await answered;
    out.request = r ? {status: r.status(), method: r.request().method(), override: r.request().headers()['x-http-method-override'] || null} : null;
    await dialog.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    const u = new URL(page.url());
    out.landed = u.pathname + u.search;
    return out;
}

module.exports = {T, flat, look, deleteOpenSubmission};
