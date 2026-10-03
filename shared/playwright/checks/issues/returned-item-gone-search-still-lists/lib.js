// Helpers of walk.js (U15 OMP3, OPS4: a published book or preprint returned to the workflow
// leaves the catalog and opens "404 Not Found" for a visitor, while the Search page lists it).
// Requiring this file runs nothing. The search is the U15 A3 walk's, the decision pages the
// U71 OMP10 walk's.
const {idle} = require('../../../probe');
const {search} = require('../published-edits-never-reach-search/lib');
const {decide, offered} = require('../copyediting-no-assign-copyeditor-notice/lib');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The published item of each app's steps (dataset ids), a word of its title, its page and its listing page. */
const ITEM = {
    ojs: {id: 17, word: 'Antimicrobial', page: (ctx) => `/index.php/${ctx}/article/view/17`, list: (ctx) => `/index.php/${ctx}/issue/current`},
    omp: {id: 14, word: 'LEGO', page: (ctx) => `/index.php/${ctx}/catalog/book/14`, list: (ctx) => `/index.php/${ctx}/catalog`},
    ops: {id: 12, word: 'Sodium', page: (ctx) => `/index.php/${ctx}/preprint/view/12`, list: (ctx) => `/index.php/${ctx}/preprints`},
};
/** The neighbour's other published item per app (dataset ids), never touched by the steps. */
const OTHER = {
    ojs: {id: 1, word: 'Signalling', page: (ctx) => `/index.php/${ctx}/article/view/1`},
    omp: {id: 5, word: 'Bomb', page: (ctx) => `/index.php/${ctx}/catalog/book/5`},
    ops: {id: 2, word: 'Facets', page: (ctx) => `/index.php/${ctx}/preprint/view/2`},
};

/** The neighbour's never-published submissions per app (dataset ids), which must stay hidden from a visitor. */
const UNPUBLISHED = {
    ojs: [{id: 5, page: (ctx) => `/index.php/${ctx}/article/view/5`}],
    omp: [{id: 4, page: (ctx) => `/index.php/${ctx}/catalog/book/4`}],
    ops: [{id: 1, page: (ctx) => `/index.php/${ctx}/preprint/view/1`}, {id: 4, page: (ctx) => `/index.php/${ctx}/preprint/view/4`}],
};

/**
 * `page.goto(url)`, once more after two seconds when the first answer never came: the test
 * server (php -S) crashed (exit 139) on the first catalog request after a fix trial swapped the
 * file under its running process, and restarts within a second.
 */
async function open(page, url) {
    let r = await page.goto(url).catch(() => null);
    if (!r) {
        await page.waitForTimeout(2000);
        r = await page.goto(url).catch(() => null);
    }
    return r;
}

/** Open `path` and read what it answers: the status, the page's first heading and whether it is the bare 404 page. */
async function readPage(app, page, path) {
    const r = await open(page, app.url(path));
    await idle(page).catch(() => {});
    const h1 = flat(await page.locator('h1').first().innerText({timeout: 3000}).catch(() => null), 200);
    const body = flat(await page.locator('body').innerText().catch(() => ''), 300);
    return {path, status: r ? r.status() : null, h1, bare404: /^404 Not Found$/.test(body || '')};
}

/** Whether the listing page at `path` links to item `id` (its catalog, preprint list or current issue). */
async function listed(app, page, path, id) {
    const r = await open(page, app.url(path));
    await idle(page).catch(() => {});
    const re = new RegExp(`/(article/view|catalog/book|preprint/view)/${id}(?:$|[/?#])`);
    const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    return {path, status: r ? r.status() : null, listed: hrefs.some((h) => re.test(h || ''))};
}

/**
 * The context's OAI-PMH interface, as a harvester reads it: ListRecords in oai_dc, raw XML
 * (the browser shows it through an XSL stylesheet). Whether a record carries `word`.
 */
async function oaiListed(app, page, word) {
    const url = app.url(`/index.php/${app.contextPath}/oai?verb=ListRecords&metadataPrefix=oai_dc`);
    const r = await page.request.get(url).catch(() => null);
    const xml = r ? await r.text() : '';
    return {status: r ? r.status() : null, records: (xml.match(/<record>/g) || []).length, listed: xml.includes(word), error: (xml.match(/<error[^>]*>[^<]*/) || [null])[0]};
}

/** On the open workflow: the header's stage bubble and its buttons. */
async function header(page) {
    await idle(page).catch(() => {});
    const head = page.locator('[data-cy="sidemodal-header"]').first();
    await head.waitFor({state: 'visible', timeout: T}).catch(() => {});
    await page.waitForTimeout(600);
    return {
        bubble: flat(await head.locator('span[class*="bg-stage-"] + span').first().innerText({timeout: 5000}).catch(() => null), 80),
        buttons: (await head.getByRole('button').allInnerTexts().catch(() => [])).map((s) => flat(s, 60)).filter(Boolean),
    };
}

/** The header's "Return to Workflow", then "Confirm" in its dialog. Returns what was offered and the header after it. */
async function returnToWorkflow(page) {
    const head = page.locator('[data-cy="sidemodal-header"]').first();
    const btn = head.getByRole('button', {name: 'Return to Workflow', exact: true});
    if (!(await btn.count())) return {offered: false, header: await header(page)};
    await btn.click();
    const dialog = page.getByRole('dialog', {name: 'Return to Workflow', exact: true});
    await dialog.waitFor({state: 'visible', timeout: T});
    const text = flat(await dialog.innerText(), 300);
    const done = page.waitForResponse((r) => /\/decisions/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
    const r = await done;
    await dialog.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await page.waitForTimeout(1500);
    return {offered: true, dialog: text, decision: r ? r.status() : null, header: await header(page)};
}

/** The workflow's side menu: "Production" pressed (the stage the decision buttons sit on). */
async function openProduction(page) {
    const link = page.locator('[role="dialog"]:visible').first().getByRole('navigation').getByRole('link', {name: 'Production', exact: true}).first();
    await link.waitFor({state: 'visible', timeout: T});
    await link.click();
    await idle(page).catch(() => {});
    await page.locator('[data-cy="workflow-action-items"]').first().waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
    await page.waitForTimeout(600);
    return {offered: await offered(page)};
}

/** "Decline Submission" on the open workflow, through its pages to "Record Decision". */
async function decline(page) {
    const out = await decide(page, 'Decline Submission');
    await page.waitForTimeout(800);
    return out;
}

module.exports = {T, flat, ITEM, OTHER, UNPUBLISHED, search, readPage, listed, oaiListed, header, returnToWorkflow, openProduction, decline, offered};
