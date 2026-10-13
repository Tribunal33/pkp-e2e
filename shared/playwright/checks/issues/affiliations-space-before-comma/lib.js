// Helpers of walk.js here (issue report docs/issues/U41-A27-affiliations-space-before-comma.md). Self-contained:
// requires only the probe kit and the suite's WorkflowPage. Requiring this file runs nothing.
// Every step drives the screens a person uses: the workflow's "Contributors" page, its "Edit"
// window's "Affiliations", and the item's public page.
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 800) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Per app, on PKP's default test dataset: a published item with one contributor holding one affiliation. */
const CASES = {
    ojs: {id: 17, contributor: 'Vajiheh Karbasizaed', page: '/index.php/publicknowledge/article/view/17'},
    omp: {id: 5, contributor: 'Chantal Allan', page: '/index.php/publicknowledge/catalog/book/5'},
    ops: {id: 6, contributor: 'Domatilia Sokoloff', page: '/index.php/publicknowledge/preprint/view/6'},
};

/** Neighbour pages (read only): published items whose contributors have one affiliation each. */
const NEIGHBOURS = {
    ojs: '/index.php/publicknowledge/article/view/1',
    omp: '/index.php/publicknowledge/catalog/book/14',
    ops: '/index.php/publicknowledge/preprint/view/7',
};

const SECOND = 'Second Institute u41h13j';

/** Steps 2-3: the submission by its address, then "Contributors" under the newest version. */
async function openContributors(page, wf, sid) {
    await wf.gotoEditorial(sid);
    await idle(page);
    await wf.expandLatestVersionNode().catch(() => {}); // 3.5 has no version nodes
    const links = wf.menuLink('Contributors');
    let opened = false;
    for (let i = (await links.count()) - 1; i >= 0; i--) {
        if (await links.nth(i).isVisible().catch(() => false)) {
            await links.nth(i).click();
            opened = true;
            break;
        }
    }
    await idle(page);
    await sleep(500);
    const add = page.getByRole('button', {name: 'Add Contributor', exact: true});
    return {
        opened,
        warning: flat(await wf.dialog().getByText(/This version has been published/).first().innerText().catch(() => null), 200),
        addEnabled: (await add.count()) ? await add.first().isEnabled().catch(() => false) : false,
    };
}

/** The "Affiliations" rows of an open contributor form, as text. */
async function affiliationRows(dlg) {
    return (await dlg.locator('.pkpFormField--affiliations tbody tr').allInnerTexts().catch(() => [])).map((t) => flat(t, 200));
}

/**
 * Step 4: "Edit" on the contributor; under "Affiliations" the name typed, the typed text chosen
 * (the suggestion without a ROR mark), "Add", "Save". Returns the rows and the save's status.
 */
async function addSecondAffiliation(page, wf, contributor) {
    const item = wf.dialog().locator('li.listPanel__item').filter({hasText: contributor}).first();
    await item.waitFor({timeout: T});
    await item.getByRole('button', {name: /^Edit/}).first().click();
    const dlg = page.getByRole('dialog', {name: 'Edit', exact: true});
    const field = dlg.locator('.pkpFormField--affiliations');
    await field.first().waitFor({timeout: T});
    await idle(page);
    const before = await affiliationRows(dlg);
    const search = field.locator('input.pkpAutosuggest__input');
    await search.click();
    await search.pressSequentially(SECOND, {delay: 20});
    const own = field
        .locator('li.autosuggest__results-item')
        .filter({hasText: SECOND})
        .filter({hasNot: page.locator('a[href^="https://ror.org/"]')})
        .first();
    await own.waitFor({timeout: T});
    await own.click();
    const add = field.getByRole('button', {name: 'Add', exact: true});
    await add.waitFor({timeout: T});
    await add.click();
    await field.locator('tbody tr').filter({hasText: SECOND}).first().waitFor({timeout: T});
    const inForm = await affiliationRows(dlg);
    const answer = page
        .waitForResponse((r) => /\/contributors\/\d+/.test(r.url()) && r.request().method() === 'POST', {timeout: T})
        .catch(() => null);
    await dlg.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answer;
    await dlg.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    return {rowsBefore: before, rowsBeforeSave: inForm, saveStatus: r ? r.status() : null};
}

/**
 * Step 5: the item's public page: per contributor block holding an affiliation, the name and the
 * affiliation line as shown (innerText) and as served (innerHTML); the citation tags; the
 * contributor-roles line and the keywords (the neighbour check's other comma lists).
 */
async function readItemPage(page, app, address) {
    const r = await page.goto(app.url(address));
    await idle(page).catch(() => {});
    const blocks = await page.locator('.affiliation').evaluateAll((els) =>
        els.map((el) => {
            const box = el.closest('li, .sub_item, .author') || el.parentElement;
            const name = box && box.querySelector('.name, .label');
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            return {name: f(name ? name.innerText : ''), shown: f(el.innerText), html: el.innerHTML.replace(/\s+/g, ' ').trim().slice(0, 500)};
        })
    );
    const meta = await page
        .locator('meta[name="citation_author"], meta[name="citation_author_institution"]')
        .evaluateAll((ms) => ms.map((m) => `${m.getAttribute('name').replace('citation_', '')}: ${m.getAttribute('content')}`));
    return {
        status: r ? r.status() : null,
        blocks,
        meta,
        roles: flat(await page.locator('.contributor_roles').first().innerText().catch(() => null), 200),
        keywords: flat(await page.locator('.item.keywords .value, .keywords .value').first().innerText().catch(() => null), 300),
    };
}

module.exports = {T, flat, sleep, CASES, NEIGHBOURS, SECOND, openContributors, addSecondAffiliation, readItemPage};
