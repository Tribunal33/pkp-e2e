// Helpers of walk.js (U40 A21: the Author's funders on a new version reach the published version).
// Requiring this file runs nothing. Every helper presses what a person presses, or types an address.
const {idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

function frame(page, app) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    return new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: app.name === 'ops' ? 'Preprint' : 'Publication'}});
}

/** The stored versions and funders (a read for the facts, not a step). */
function stored(app, sid) {
    const pubs = sql(app, `select publication_id, version_major || '.' || version_minor, status from publications where submission_id = ${sid} order by publication_id`)
        .split('\n').filter(Boolean).map((l) => { const [id, v, s] = l.split('|'); return {id: Number(id), version: v, status: Number(s)}; });
    const funders = sql(app, `select f.funder_id, coalesce(string_agg(distinct s.setting_value, ' / '), '') from funders f left join funder_settings s on s.funder_id = f.funder_id and s.setting_name = 'name' where f.submission_id = ${sid} group by f.funder_id order by f.funder_id`)
        .split('\n').filter(Boolean);
    return {publications: pubs, funders};
}

/**
 * A version's "Funding" page by the workflow address the menu entry sets
 * (`workflowMenuKey=publication_<id>_funding`), on the author's or the editor's dashboard.
 */
async function openFunding(page, app, sid, publicationId, {author}) {
    const wf = frame(page, app);
    const menuKey = `publication_${publicationId}_funding`;
    if (author) await wf.gotoAuthor(sid, {menuKey});
    else await wf.gotoEditorial(sid, {menuKey});
    await idle(page).catch(() => {});
    const heading = `${app.name === 'ops' ? 'Preprint' : 'Publication'}: Funding`;
    await wf.dialog().getByRole('heading', {name: heading}).first().waitFor({timeout: T}).catch(() => {});
    await wf.dialog().locator('table[aria-label="Funders"]').first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    await sleep(800);
    return wf;
}

/** The Funding page as shown: banner, "Add Funder" state, rows, the version line. */
async function fundingState(page, wf) {
    const d = wf.dialog();
    const add = d.getByRole('button', {name: 'Add Funder', exact: true}).first();
    const addShown = (await add.count()) > 0 && (await add.isVisible().catch(() => false));
    const banner = d.getByText(/This version has been (published|posted) and can not be edited\./).first();
    const rows = await d.locator('table[aria-label="Funders"] tbody tr').allInnerTexts().catch(() => []);
    return {
        heading: flat(await wf.heading().innerText().catch(() => null), 120),
        controlsLeft: flat(await d.locator('[data-cy="workflow-controls-left"]').innerText().catch(() => null), 200),
        banner: (await banner.count()) ? flat(await banner.innerText(), 160) : null,
        addFunder: addShown ? {shown: true, enabled: await add.isEnabled().catch(() => null)} : {shown: false},
        rows: rows.map((r) => flat(r, 160)),
    };
}

/**
 * "Add Funder", the name typed, the typed text itself picked from the suggestions, "Save".
 * The registry search (api.ror.org) is answered empty in the browser; the typed-name choice does not
 * depend on it. Returns the save's method, address and status, and the window's state after.
 */
async function addFunder(page, wf, name) {
    await page.route('https://api.ror.org/**', (r) =>
        r.fulfill({status: 200, contentType: 'application/json', headers: {'Access-Control-Allow-Origin': '*'}, body: '{"items":[]}'}));
    await wf.dialog().getByRole('button', {name: 'Add Funder', exact: true}).first().click();
    const panel = page.getByRole('dialog', {name: 'Add Funder'});
    await panel.waitFor({timeout: T});
    const search = panel.locator('input.pkpAutosuggest__input').first();
    await search.click();
    await search.pressSequentially(name, {delay: 15});
    await panel.locator('li.autosuggest__results-item').filter({hasText: name}).first().click();
    await sleep(500);
    const answer = page.waitForResponse((r) => /\/funders(\/\d+)?(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answer;
    let body = null;
    if (r) body = await r.text().catch(() => null);
    await panel.waitFor({state: 'detached', timeout: 10_000}).catch(() => {});
    await idle(page).catch(() => {});
    await sleep(800);
    const open = await panel.isVisible().catch(() => false);
    return {
        request: r ? `${r.request().method()} ${new URL(r.url()).pathname.replace(/^.*\/api\//, '/api/')}` : null,
        status: r ? r.status() : null,
        body: r && !r.ok() ? flat(body, 300) : undefined,
        windowStillOpen: open,
        windowText: open ? flat(await panel.innerText().catch(() => null), 300) : undefined,
    };
}

/** The reader page's "Funding" section (`#funding-data`), as a signed-out visitor reads it. */
async function readerFunding(page, app, address) {
    const resp = await page.goto(app.url(address));
    await idle(page).catch(() => {});
    const sec = page.locator('#funding-data');
    return {
        url: address,
        status: resp ? resp.status() : null,
        title: flat(await page.title(), 160),
        funding: (await sec.count()) ? flat(await sec.innerText(), 400) : null,
    };
}

module.exports = {T, sleep, flat, frame, stored, openFunding, fundingState, addFunder, readerFunding};
