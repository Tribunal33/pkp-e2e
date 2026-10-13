// Helpers of walk.js here (U41 A24). Requiring this file runs nothing.
const {idle, sql} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The family name every contributor the steps add carries. */
const TAG = 'u41h13h';
const INSTITUTION = `${TAG} Institute`;

/** The people the steps add: "Correcting and saving" (lea), "Leaving by Close" (max), the neighbour's valid add (ned). */
const PEOPLE = {
    lea: {given: 'Lea', family: TAG, email: `lea.${TAG}@mailinator.com`, country: 'Canada'},
    max: {given: 'Max', family: TAG, email: `max.${TAG}@mailinator.com`, country: 'Canada'},
    ned: {given: 'Ned', family: TAG, email: `ned.${TAG}@mailinator.com`, country: 'Canada'},
};

/** The contributors list's rows (the name line of each), as the workflow's Contributors page shows them. */
async function listRows(wf) {
    const items = wf.dialog().locator('li.listPanel__item');
    return (await items.allInnerTexts().catch(() => [])).map((t) => flat(t, 160));
}

/** The contributors of the submission's latest version whose family name is `TAG`: id, given name, affiliations. */
function storedTagged(app, sid) {
    return sql(
        app,
        `select a.author_id, (select g.setting_value from author_settings g where g.author_id = a.author_id and g.setting_name = 'givenName' and g.locale = 'en'),
            coalesce((select string_agg(coalesce(s.setting_value, '-'), ';') from author_affiliations f left join author_affiliation_settings s on s.author_affiliation_id = f.author_affiliation_id and s.setting_name = 'name' and s.locale = 'en' where f.author_id = a.author_id), '(none)')
         from authors a where a.publication_id = (select max(p.publication_id) from publications p where p.submission_id = ${Number(sid)})
         and exists (select 1 from author_settings x where x.author_id = a.author_id and x.setting_name = 'familyName' and x.setting_value = '${TAG}') order by 1`
    )
        .split('\n')
        .filter(Boolean);
}

/** Count of the latest version's contributors. */
function storedCount(app, sid) {
    return Number(sql(app, `select count(*) from authors a where a.publication_id = (select max(p.publication_id) from publications p where p.submission_id = ${Number(sid)})`));
}

/** "Edit" on the `nth` list row naming `name`: the institution rows its "Affiliations" shows; the form is closed again. */
async function editRowAffiliations(page, wf, name, nth) {
    const item = wf.dialog().locator('li.listPanel__item').filter({hasText: name}).nth(nth);
    await item.getByRole('button', {name: /^Edit/}).first().click();
    const dlg = page.getByRole('dialog', {name: 'Edit', exact: true});
    await dlg.waitFor({timeout: T});
    await dlg.locator('.pkpFormField--affiliations').first().waitFor({timeout: T});
    await idle(page);
    await sleep(300);
    const rows = (await dlg.locator('.pkpFormField--affiliations tbody tr').allInnerTexts().catch(() => [])).map((t) => flat(t, 160));
    await dlg.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
    await dlg.waitFor({state: 'hidden', timeout: 8000}).catch(() => {});
    await idle(page);
    return rows;
}

/** The open form's "Save": the contributor request's answer (status, body) and whether the form stayed open. */
async function pressSave(page, dlg) {
    const answer = page
        .waitForResponse((r) => /\/contributors(\/\d+)?(\?|$)/.test(r.url()) && ['POST', 'PUT'].includes(r.request().method()), {timeout: 8000})
        .catch(() => null);
    await dlg.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answer;
    await idle(page);
    await sleep(600);
    return {
        request: r ? {method: r.request().method(), status: r.status(), body: flat(await r.text().catch(() => ''), 400)} : null,
        formOpen: await dlg.isVisible().catch(() => false),
    };
}

/** The open form's institution name boxes (the "Edit institution name" ones). */
function nameBoxes(dlg) {
    return dlg.locator('.pkpFormField--affiliations tbody input.pkpFormField--text__input');
}

module.exports = {T, flat, sleep, TAG, INSTITUTION, PEOPLE, listRows, storedTagged, storedCount, editRowAffiliations, pressSave, nameBoxes};
