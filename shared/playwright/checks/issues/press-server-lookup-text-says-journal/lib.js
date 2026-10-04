// Helpers for walk.js (U42 A4). Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 800) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Settings > Workflow > "Metadata": tick "Enable references structuring and metadata lookup" alone, Save. */
async function enableLookup(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/workflow`));
    await idle(page);
    const tab = page.locator('#metadata-button');
    if (await tab.count()) { await tab.first().click(); await idle(page); }
    const refs = page.getByRole('checkbox', {name: 'Enable references metadata', exact: true});
    const lookup = page.getByRole('checkbox', {name: 'Enable references structuring and metadata lookup', exact: true});
    await lookup.waitFor({state: 'visible', timeout: T});
    const out = {referencesTicked: await refs.isChecked().catch(() => null), lookupBefore: await lookup.isChecked()};
    await lookup.check();
    const form = page.locator('form').filter({has: lookup});
    const saved = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    out.saveStatus = r ? r.status() : null;
    out.savedNotice = await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10_000}).then(() => true).catch(() => false);
    out.lookupAfter = await lookup.isChecked();
    return out;
}

/** The open "References" page: the lookup heading and text (null with lookup off), the Add box's help, the table's line. */
async function readReferencesPage(page) {
    const dialog = page.locator('[role="dialog"]:visible').first();
    const lookupP = dialog.locator('p').filter({hasText: /Metadata Lookup is enabled|metadata lookup|Metadata Lookup/}).first();
    const lookupText = (await lookupP.count()) ? flat(await lookupP.innerText()) : null;
    const lookupHeading = lookupText ? flat(await lookupP.locator('xpath=preceding-sibling::h3[1]').innerText().catch(() => null)) : null;
    const text = flat(await dialog.innerText().catch(() => ''), 4000);
    return {
        lookupHeading,
        lookupText,
        addHelp: (text.match(/Enter each reference on a new line[^.]*\.[^.]*\./) || [null])[0],
        tableLine: (text.match(/The above references have been organised here in a structured format\./) || [null])[0],
        reprocessAll: await dialog.getByRole('button', {name: 'Reprocess all references', exact: true}).isVisible().catch(() => false),
    };
}

module.exports = {T, flat, enableLookup, readReferencesPage};
