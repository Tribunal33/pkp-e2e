// Helpers of walk.js here (issue report docs/issues/U41-A26-affiliations-print-out-of-order.md).
// Requiring this file runs nothing.
// Every step drives the screens a person uses: the workflow's "Contributors" page (its "Edit" and
// "Add Contributor"), "Unpublish"/"Publish" on 3.5, and the item's public page.
const {idle} = require('../../../probe');
const R = require('../registry-pick-saves-nameless/lib.js');
const E = require('../affiliation-error-list-object-object/lib.js');
const O = require('../one-item-reads-1-items/lib.js');

const T = 30_000;
const flat = (s, n = 800) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Per app, on PKP's default test dataset, for A26: a published item and its first contributor (one
 * affiliation), the version node its published version sits under when it is not the newest
 * (OJS submission 1's 1.0; its 1.1 is unpublished), and how many contributors the Steps add so the
 * item has four.
 */
const CASES = {
    ojs: {id: 1, contributor: 'Alan Mwandenga', institution: 'University of Cape Town', page: '/index.php/publicknowledge/article/view/1', version: 'Version of Record 1.0', add: 1},
    omp: {id: 14, contributor: 'Michael Dawson', institution: 'University of Alberta', page: '/index.php/publicknowledge/catalog/book/14', version: null, add: 1},
    ops: {id: 7, contributor: 'Elinor Ostrom', institution: 'Indiana University', page: '/index.php/publicknowledge/preprint/view/7', version: null, add: 2},
};

/** Neighbour items: published, several contributors, at most one affiliation each (read only). */
const NEIGHBOURS = {
    ojs: {id: 1, page: '/index.php/publicknowledge/article/view/1'},
    omp: {id: 14, page: '/index.php/publicknowledge/catalog/book/14'},
    ops: {id: 7, page: '/index.php/publicknowledge/preprint/view/7'},
};

const SECOND = 'Second Institute u41h13j';
const PEOPLE = [
    {given: 'Lea', family: 'u41h13j', email: 'lea.u41h13j@mailinator.com', country: 'Canada'},
    {given: 'Max', family: 'u41h13j', email: 'max.u41h13j@mailinator.com', country: 'Canada'},
];

/**
 * Keep, from the browser's own traffic, the last publication the workflow page fetched
 * (GET …/submissions/<id>/publications/<pid>): each contributor's name and affiliation names in order.
 */
function watchPublication(page) {
    const seen = {last: null};
    page.on('response', async (r) => {
        if (r.request().method() !== 'GET' || !/\/submissions\/\d+\/publications\/\d+(\?|$)/.test(r.url())) return;
        try {
            const j = await r.json();
            seen.last = (j.authors || []).map((a) => ({
                name: flat(a.fullName || '', 80),
                affiliations: (a.affiliations || []).map((f) => ({id: f.id, name: f.name && (f.name.en || Object.values(f.name)[0])})),
            }));
        } catch (e) {
            /* not JSON */
        }
    });
    return seen;
}

/**
 * The workflow's "Contributors" page of the submission: the newest version's, or, with `version`, the
 * one under that version node (pressed open first). Reads the published-version warning and whether
 * "Add Contributor" can be pressed (a published version cannot be edited on 3.5).
 */
async function openContributors(page, wf, sid, version = null) {
    let opened;
    if (version) {
        await wf.gotoEditorial(sid);
        await idle(page);
        await wf.menuLink(version).first().click();
        await idle(page);
        await sleep(500);
        const links = wf.menuLink('Contributors');
        opened = false;
        for (let i = 0; i < (await links.count()); i++) {
            if (await links.nth(i).isVisible().catch(() => false)) {
                await links.nth(i).click();
                opened = true;
                break;
            }
        }
        await idle(page);
        await sleep(500);
    } else {
        opened = await R.openPage(wf, page, sid, 'Contributors');
    }
    const out = {opened, version};
    out.heading = flat(await wf.dialog().locator('h1, h2').filter({hasText: /Contributors/i}).first().innerText().catch(() => null), 120);
    out.status = flat(await wf.dialog().getByText(/^Status:/).first().innerText().catch(() => null), 80);
    out.warning = flat(await wf.dialog().getByText(/This version has been published/).first().innerText().catch(() => null), 200);
    const add = page.getByRole('button', {name: 'Add Contributor', exact: true});
    out.addEnabled = (await add.count()) ? await add.first().isEnabled().catch(() => false) : false;
    return out;
}

/** 3.5 only: "Unpublish" ("Unpost") and back to "Contributors". */
async function unpublishThenContributors(page, app, wf, sid, version = null) {
    const status = await O.unpublish(page);
    await O.openWorkflow(page, app, sid);
    const again = await openContributors(page, wf, sid, version);
    return {unpublish: status, ...again};
}

/** 3.5 only: "Publish" ("Post", "Schedule For Publication") from the workflow. */
async function republish(page, app, sid) {
    await O.openWorkflow(page, app, sid);
    return O.publish(page);
}

/** Step 4: "Edit" on the contributor, the typed institution added, "Save". */
async function addSecondAffiliation(page, wf, c) {
    const dlg = await R.openContributorEdit(page, wf, c.contributor);
    const before = await R.affiliationRows(dlg);
    const offered = await E.addTypedInstitution(page, dlg, SECOND);
    const inForm = await R.affiliationRows(dlg);
    const saved = await R.saveContributor(page, dlg);
    return {rowsBefore: before.map((r) => r.text), suggestions: offered, rowsBeforeSave: inForm.map((r) => r.text), save: saved};
}

/** "Add Contributor" with a plain Person, "Save". */
async function addContributor(page, person) {
    const dlg = await E.openAddContributor(page, person);
    const answer = page
        .waitForResponse((r) => /\/contributors(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: T})
        .catch(() => null);
    await dlg.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answer;
    await dlg.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    await sleep(800);
    return {status: r ? r.status() : null};
}

/** Step 8: "Edit" on the contributor, its "Affiliations" rows read, the form closed unsaved. */
async function readEdit(page, wf, c) {
    const dlg = await R.openContributorEdit(page, wf, c.contributor);
    const rows = (await R.affiliationRows(dlg)).map((r) => r.text);
    await R.closeForm(page, dlg);
    return rows;
}

/**
 * The item's public page: per contributor block holding an affiliation, the name and the
 * affiliation line as shown (innerText) and as served (innerHTML), and the meta tags indexes read.
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
    const roles = flat(await page.locator('.contributor_roles').first().innerText().catch(() => null), 200);
    return {status: r ? r.status() : null, blocks, meta, roles};
}

/** A stored read beside the screens: the contributor's affiliation rows by id (not a step). */
function storedAffiliations(app, sql, sid, family) {
    return sql(
        app,
        `select f.author_affiliation_id, (select s.setting_value from author_affiliation_settings s where s.author_affiliation_id = f.author_affiliation_id and s.setting_name = 'name' and s.locale = 'en')
         from author_affiliations f join authors a on a.author_id = f.author_id join publications p on p.publication_id = a.publication_id
         where p.submission_id = ${Number(sid)} and exists (select 1 from author_settings x where x.author_id = a.author_id and x.setting_name = 'familyName' and x.setting_value = '${family}') order by 1`
    )
        .split('\n')
        .filter(Boolean);
}

module.exports = {T, flat, sleep, CASES, NEIGHBOURS, SECOND, PEOPLE, watchPublication, openContributors, unpublishThenContributors, republish, addSecondAffiliation, addContributor, readEdit, readItemPage, storedAffiliations};
