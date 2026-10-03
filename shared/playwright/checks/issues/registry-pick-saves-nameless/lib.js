// Helpers for walk.js (U41 A5, U43 A3). Requiring this file runs nothing.
const {idle, screen, sql} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 2000) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The published submission each app's steps open (one version), and the contributor edited. */
const SUBMISSION = {
    ojs: {id: 17, contributor: 'Vajiheh Karbasizaed', post: 'Publish'},
    omp: {id: 14, contributor: 'Michael Dawson', post: 'Publish'},
    ops: {id: 2, contributor: 'Catherine Kwantes', post: 'Post'},
};

/** The neighbour's unpublished submission per app (no new version needed). */
const NEIGHBOUR = {
    ojs: {id: 7, contributor: 'Domatilia Sokoloff'},
    omp: {id: 1, contributor: 'Arthur Clark'},
    ops: {id: 1, contributor: 'Carlo Corino'},
};

/** The organisations: two the steps take out of the cache, two the neighbour leaves in it. */
const ORG = {
    affiliation: {ror: 'https://ror.org/0213rcc28', name: 'Simon Fraser University'},
    funder: {ror: 'https://ror.org/04j5jqy92', name: 'Social Sciences and Humanities Research Council'},
    cachedAffiliation: {ror: 'https://ror.org/05njb9z20', name: 'University of Ljubljana'},
    cachedFunder: {ror: 'https://ror.org/01h531d29', name: 'Natural Sciences and Engineering Research Council of Canada'},
};

/** The precondition: the two organisations out of the install's ROR cache (ror_settings cascades). */
function uncache(app, orgs) {
    const list = orgs.map((o) => `'${o.ror}'`).join(', ');
    const before = sql(app, `select count(*) from rors where ror in (${list})`);
    sql(app, `delete from rors where ror in (${list})`);
    return {before: Number(before), after: Number(sql(app, `select count(*) from rors where ror in (${list})`))};
}

/** Is the organisation in the cache now (a read, not a step). */
function cached(app, ror) {
    return Number(sql(app, `select count(*) from rors where ror = '${ror}'`)) > 0;
}

/** The newest version's page by its side-menu entry; false when the app has no such page. */
async function openPage(wf, page, sub, label) {
    await wf.gotoEditorial(sub);
    await idle(page);
    await wf.expandLatestVersionNode().catch(() => {}); // 3.5 has no version nodes
    const links = wf.menuLink(label);
    const n = await links.count();
    if (!n) return false;
    let target = null;
    for (let i = n - 1; i >= 0; i--) {
        if (await links.nth(i).isVisible().catch(() => false)) {
            target = links.nth(i);
            break;
        }
    }
    if (!target) return false;
    await target.click();
    await idle(page);
    await sleep(500);
    return true;
}

/**
 * Type the organisation's name into the scope's registry search box and choose the suggestion
 * that carries the ROR mark (it holds an "open in new tab" link; the typed-text option does not).
 */
async function pickRegistry(page, scope, org) {
    const box = scope.locator('input.pkpAutosuggest__input').first();
    await box.click();
    await box.pressSequentially(org.name, {delay: 20});
    const option = scope
        .locator('li.autosuggest__results-item')
        .filter({hasText: org.name})
        .filter({has: page.locator('a[target="_blank"]')})
        .first();
    await option.waitFor({timeout: T});
    const options = (await scope.locator('li.autosuggest__results-item').allInnerTexts()).map((t) => flat(t, 120));
    await option.click();
    await sleep(300);
    return {options: options.slice(0, 6)};
}

/** Wait on the cache POST an action sends (null when none goes out). */
function rorPost(page) {
    return page
        .waitForResponse((r) => /\/api\/v1\/rors\/?(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: 15_000})
        .then(async (r) => ({status: r.status(), body: flat(await r.text().catch(() => ''), 300)}))
        .catch(() => null);
}

/** The "unexpected error" window, if one opens within `ms`: its text; pressed shut with its own button. */
async function errorWindow(page, ms = 4000) {
    const w = page.locator('[role="dialog"], [role="alertdialog"]').filter({hasText: /unexpected error|Error/}).last();
    const shown = await w.waitFor({state: 'visible', timeout: ms}).then(() => true).catch(() => false);
    if (!shown) return null;
    const text = flat(await w.innerText().catch(() => ''), 400);
    const ok = w.getByRole('button', {name: /^(OK|Ok|Close)$/}).first();
    if (await ok.count()) await ok.click().catch(() => {});
    await sleep(600);
    return text;
}

/** The "Affiliations" table of an open contributor form: each row's text and its links. */
async function affiliationRows(dlg) {
    const rows = dlg.locator('.pkpFormField--affiliations tbody tr');
    const out = [];
    for (let i = 0; i < (await rows.count()); i++) {
        const row = rows.nth(i);
        out.push({
            text: flat(await row.innerText().catch(() => ''), 300),
            links: await row.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href'))).catch(() => []),
            red: flat(await row.locator('.text-negative').allInnerTexts().catch(() => []), 200),
        });
    }
    return out;
}

/** The contributor row's "Edit" in the Contributors list; returns the open form's dialog. */
async function openContributorEdit(page, wf, name) {
    const item = wf.dialog().locator('li.listPanel__item').filter({hasText: name}).first();
    await item.waitFor({timeout: T});
    await item.getByRole('button', {name: /^Edit/}).first().click();
    const dlg = page.getByRole('dialog', {name: 'Edit', exact: true});
    await dlg.waitFor({timeout: T});
    await dlg.locator('.pkpFormField--affiliations').first().waitFor({timeout: T});
    await idle(page);
    return dlg;
}

/** The contributor row's text as the list shows it. */
async function contributorRow(wf, name) {
    return flat(await wf.dialog().locator('li.listPanel__item').filter({hasText: name}).first().innerText().catch(() => null), 400);
}

/** Press the open form's "Save" and wait on the contributor save's answer. */
async function saveContributor(page, dlg) {
    const answer = page
        .waitForResponse((r) => /\/contributors\/\d+/.test(r.url()) && r.request().method() === 'POST', {timeout: T})
        .catch(() => null);
    await dlg.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answer;
    const out = {status: r ? r.status() : null};
    if (r) {
        try {
            const body = r.request().postDataJSON() || {};
            out.sentAffiliations = (body.affiliations || []).map((a) => ({ror: a.ror, name: a.name}));
        } catch (e) {
            out.sentAffiliations = 'unreadable';
        }
        try {
            const j = await r.json();
            out.answerAffiliations = (j.affiliations || []).map((a) => ({ror: a.ror, name: a.name}));
        } catch (e) {
            out.answer = 'unreadable';
        }
    }
    await dlg.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    return out;
}

/** Close an open form with its own "Close" (never Escape: the workflow is a dialog too). */
async function closeForm(page, dlg) {
    await dlg.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
    await sleep(800);
    await idle(page);
}

/** The Funders table's rows: each cell's text and the row's links. */
async function funderRows(wf) {
    const rows = wf.dialog().getByRole('table', {name: 'Funders', exact: true}).locator('tbody tr');
    const out = [];
    for (let i = 0; i < (await rows.count()); i++) {
        const row = rows.nth(i);
        out.push({
            cells: (await row.locator('td, th').allInnerTexts().catch(() => [])).map((t) => flat(t, 120)),
            links: await row.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href'))).catch(() => []),
        });
    }
    return out;
}

/** "Add Funder", pick the organisation from the registry, close any error, "Save". */
async function addFunder(page, wf, org) {
    await wf.dialog().getByRole('button', {name: 'Add Funder', exact: true}).first().click();
    const panel = page.getByRole('dialog', {name: 'Add Funder'});
    await panel.waitFor({timeout: T});
    const post = rorPost(page);
    const picked = await pickRegistry(page, panel, org);
    const cache = await post;
    const error = await errorWindow(page);
    const panelText = flat(await panel.innerText().catch(() => ''), 600);
    const answer = page
        .waitForResponse((r) => /\/funders(\/\d+)?(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: T})
        .catch(() => null);
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answer;
    const out = {picked, cache, error, panelText, saveStatus: r ? r.status() : null};
    if (r) {
        try {
            const sent = r.request().postDataJSON() || {};
            out.sent = {ror: sent.funder?.ror, name: sent.funder?.name};
            const j = await r.json();
            out.answer = {id: j.id, ror: j.ror, name: j.name};
        } catch (e) {
            out.answer = 'unreadable';
        }
    }
    await panel.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    await sleep(800);
    return out;
}

/** The stored affiliation rows and name settings of an author (a read, not a step). */
function storedAffiliations(app, authorId) {
    return sql(
        app,
        `select f.author_affiliation_id, coalesce(f.ror, '-'), coalesce((select string_agg(s.locale || '=' || s.setting_value, ';') from author_affiliation_settings s where s.author_affiliation_id = f.author_affiliation_id and s.setting_name = 'name'), '-') from author_affiliations f where f.author_id = ${Number(authorId)} order by 1`
    );
}

/** The stored funders of a submission and their name settings (a read, not a step). */
function storedFunders(app, sid) {
    return sql(
        app,
        `select f.funder_id, coalesce(f.ror, '-'), coalesce((select string_agg(s.locale || '=' || s.setting_value, ';') from funder_settings s where s.funder_id = f.funder_id and s.setting_name = 'name'), '-') from funders f where f.submission_id = ${Number(sid)} order by 1`
    );
}

/** The newest version's author id of the named contributor (a read, not a step). */
function authorId(app, sid, name) {
    const family = name.split(' ').pop();
    return sql(
        app,
        `select a.author_id from authors a where a.publication_id = (select max(p.publication_id) from publications p where p.submission_id = ${Number(sid)})
         and exists (select 1 from author_settings x where x.author_id = a.author_id and x.setting_name = 'familyName' and x.setting_value = '${family}')`
    );
}

/** The public page: the affiliation and funder markup around the ROR links. */
async function readPublicPage(page, url) {
    const r = await page.goto(url);
    await idle(page);
    const out = {status: r ? r.status() : null, url: page.url()};
    out.rorLinks = await page
        .locator('a[href^="https://ror.org/"]')
        .evaluateAll((as) => as.map((a) => ({href: a.getAttribute('href'), text: a.innerText.trim(), parent: (a.parentElement?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 160)})))
        .catch(() => []);
    out.funding = flat(await page.locator('#funding-data, .funders, .item.funders').first().innerText().catch(() => null), 500);
    out.authors = flat(await page.locator('.item.authors, .authors, .entry_details .item.authors').first().innerText().catch(() => null), 600);
    return out;
}

module.exports = {
    T,
    flat,
    sleep,
    SUBMISSION,
    NEIGHBOUR,
    ORG,
    uncache,
    cached,
    openPage,
    pickRegistry,
    rorPost,
    errorWindow,
    affiliationRows,
    openContributorEdit,
    contributorRow,
    saveContributor,
    closeForm,
    funderRows,
    addFunder,
    storedAffiliations,
    storedFunders,
    authorId,
    readPublicPage,
};
