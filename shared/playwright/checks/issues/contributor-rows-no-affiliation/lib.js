// Helpers of walk.js (U41 A1, the contributor rows). Requiring this file runs nothing. Every helper
// reads or drives the screens.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

/** Each row of the open "Contributors" list: its title and the line under it (null when the row has no such line). */
async function rowLines(page) {
    return page.locator('.listPanel--contributor li.listPanel__item').evaluateAll((items) => items.map((li) => {
        const title = li.querySelector('.listPanel__itemTitle');
        const sub = li.querySelector('.listPanel__itemSubtitle');
        return {
            title: title ? title.innerText.replace(/\s+/g, ' ').trim() : null,
            subtitle: sub ? sub.innerText.replace(/\s+/g, ' ').trim() : null,
            subtitleShown: !!sub && sub.getClientRects().length > 0,
        };
    }));
}

/** Press "Edit" on the row of `name`, read the window's "Affiliations" field, close it with its own "Close". */
async function editAffiliations(page, name) {
    await page.locator('.listPanel--contributor li.listPanel__item').filter({hasText: name}).first()
        .getByRole('button', {name: 'Edit', exact: true}).click();
    const d = page.getByRole('dialog', {name: /^Edit$/}).last();
    await d.waitFor({timeout: T});
    await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
    await idle(page).catch(() => {});
    await sleep(500);
    const field = d.locator('.pkpFormField--affiliations').first();
    const affiliations = (await field.count()) ? flat(await field.innerText(), 400) : null;
    await d.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
    await d.waitFor({state: 'hidden', timeout: 6000}).catch(() => {});
    await sleep(600);
    return affiliations;
}

/**
 * Press "Edit" on the row of `name`, type `institution` under "Affiliations", choose the typed text,
 * "Add", "Save"; returns the save's status and the window's state; the window is closed.
 */
async function addAffiliation(page, name, institution) {
    await page.locator('.listPanel--contributor li.listPanel__item').filter({hasText: name}).first()
        .getByRole('button', {name: 'Edit', exact: true}).click();
    const d = page.getByRole('dialog', {name: /^Edit$/}).last();
    await d.waitFor({timeout: T});
    await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
    await idle(page).catch(() => {});
    const field = d.locator('#contributor-affiliations');
    const search = field.locator('input.pkpAutosuggest__input');
    await search.click();
    await search.pressSequentially(institution, {delay: 15});
    await field.locator('li.autosuggest__results-item').filter({hasText: institution}).first().click({timeout: T});
    await field.getByRole('button', {name: 'Add', exact: true}).click();
    await sleep(500);
    const listed = flat(await field.innerText(), 400);
    const resp = page.waitForResponse((x) => /\/contributors\/\d+/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await d.getByRole('button', {name: 'Save', exact: true}).click();
    const res = await resp;
    await idle(page).catch(() => {});
    await sleep(1000);
    if (await d.isVisible().catch(() => false)) {
        await d.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await d.waitFor({state: 'hidden', timeout: 6000}).catch(() => {});
    }
    await sleep(600);
    return {listed, status: res ? res.status() : null};
}

/** The wizard's "Review" step: the names its "Contributors" section lists. */
async function reviewContributorNames(page) {
    return (await page.locator('.submissionWizard__reviewPanel__list__name').allInnerTexts()).map((x) => flat(x, 200));
}

module.exports = {T, sleep, flat, rowLines, editAffiliations, addAffiliation, reviewContributorNames};
