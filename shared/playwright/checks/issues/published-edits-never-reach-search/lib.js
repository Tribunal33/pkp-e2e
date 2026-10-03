// Helpers of walk.js (U15 A3: edits to a published item's title, abstract or contributors
// never reach the Search page's index). Requiring this file runs nothing. The workflow
// opening and the publication menu are the earlier walks' (U20 A7, U13 A6).
const {idle, sql} = require('../../../probe');
const {workflowFrame} = require('../older-version-tab-current-title/lib');
const {openWorkflow} = require('../abstract-symbols-reach-search-tags-as-codes/lib');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const TITLE = 'titleAbstract-title-control-en';
const ABSTRACT = 'titleAbstract-abstract-control-en';

/** The published item of each app's steps (dataset ids), its old title word and its page. */
const ITEM = {
    ojs: {id: 17, old: 'Antimicrobial', page: (ctx) => `/index.php/${ctx}/article/view/17`},
    omp: {id: 14, old: 'Bricks', page: (ctx) => `/index.php/${ctx}/catalog/book/14`},
    ops: {id: 12, old: 'Sodium', page: (ctx) => `/index.php/${ctx}/preprint/view/12`},
};
/** The neighbour's unpublished submission per app (dataset ids). */
const DRAFT = {ojs: 4, omp: 3, ops: 1};

/**
 * Signed out or in, the context's "Search" page: `words` typed into the box, "Search"
 * pressed. Returns whether the item is listed, the listed titles and the notice.
 */
async function search(app, page, words, itemId) {
    await page.goto(app.url(`/index.php/${app.contextPath}/search`));
    await idle(page).catch(() => {});
    const form = page.locator('.page_search form').filter({has: page.locator('input[name="query"]')}).first();
    await form.locator('input[name="query"]').fill(words);
    const loaded = page.waitForEvent('load', {timeout: T});
    await form.locator('button[type="submit"]').first().click();
    await loaded;
    await idle(page).catch(() => {});
    const links = await page.locator('.page_search a[href*="/article/view/"], .page_search a[href*="/catalog/book/"], .page_search a[href*="/preprint/view/"]')
        .evaluateAll((as) => as.map((a) => ({text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})));
    const itemRe = new RegExp(`/(view|book)/${itemId}(?:$|[/?#])`);
    const titles = [...new Set(links.filter((l) => l.text).map((l) => l.text))];
    const notice = flat(await page.locator('.page_search .cmp_notification, .page_search .search_results[role="status"]').first().innerText({timeout: 2000}).catch(() => null), 200);
    const hit = links.find((l) => itemRe.test(l.href || ''));
    return {words, found: !!hit, listedAs: hit ? flat(hit.text, 160) : null, titles: titles.map((t) => flat(t, 120)).slice(0, 10), notice};
}

/**
 * On an open workflow: Publication › "Title & Abstract"; the "Title" retyped as `title`
 * (a string, or a function of the title shown; select all, type) and `append` typed at the end of "Abstract"; then "Save". Returns
 * the warning above the form, the boxes after typing, the save's status and "Saved".
 */
async function editTitleAbstract(app, page, {title, append}) {
    const frame = workflowFrame(page, app);
    const entry = app.line === 'stable-3_5_0'
        ? frame.menuLink('Title & Abstract').last()
        : await frame.revealPublicationEntry('Title & Abstract');
    await entry.click();
    await idle(page);
    await page.waitForFunction((ids) => ids.every((id) => !!window.tinymce?.get(id)?.initialized), [TITLE, ABSTRACT], {timeout: T});
    const read = (id) => page.evaluate((i) => window.tinymce.get(i).getContent({format: 'text'}).trim(), id);
    const out = {warning: flat(await page.getByText(/This version has been published/).first().innerText({timeout: 3000}).catch(() => null), 200)};
    out.titleBefore = flat(await read(TITLE), 160);
    if (title) {
        const text = typeof title === 'function' ? title(out.titleBefore) : title;
        await page.evaluate((id) => window.tinymce.get(id).focus(), TITLE);
        await page.keyboard.press('ControlOrMeta+A');
        await page.keyboard.type(text, {delay: 30});
    }
    if (append) {
        // the caret at the end of the text, as a click after its last word puts it
        await page.evaluate((id) => {
            const ed = window.tinymce.get(id);
            ed.focus();
            ed.selection.select(ed.getBody(), true);
            ed.selection.collapse(false);
        }, ABSTRACT);
        await page.keyboard.type(append, {delay: 30});
    }
    await sleep(500);
    out.titleAfter = flat(await read(TITLE), 160);
    out.abstractEnd = flat((await read(ABSTRACT)).slice(-80), 80);
    const saved = page
        .waitForResponse((r) => /\/submissions\/\d+\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T})
        .catch(() => null);
    await page.locator('[data-cy="workflow-primary-items"]').getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    out.save = r ? r.status() : null;
    out.shown = await page.locator('.pkpFormPage__status', {hasText: 'Saved'}).waitFor({state: 'visible', timeout: T}).then(() => 'Saved').catch(() => null);
    await idle(page);
    return out;
}

/**
 * A submission's Publication (OPS "Preprint") › "Contributors" › "Add Contributor": a person
 * with the given names, email and country, "Author" ticked when offered, "Save". Returns the
 * add call's status and the list's rows after it.
 */
async function addContributor(page, app, submissionId, {given, family, email, country}) {
    await openWorkflow(app, page, submissionId);
    const frame = workflowFrame(page, app);
    const entry = app.line === 'stable-3_5_0'
        ? frame.menuLink('Contributors').last()
        : await frame.revealPublicationEntry('Contributors');
    await entry.click();
    await idle(page);
    const panel = page.locator('.listPanel--contributor, .contributorsListPanel').first();
    await panel.getByRole('button', {name: 'Add Contributor', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Add Contributor'});
    await dialog.waitFor({state: 'visible', timeout: T});
    const person = dialog.getByRole('radio', {name: 'Person', exact: true});
    if (await person.count()) await person.check();
    await dialog.locator('input[name="givenName-en"]').fill(given);
    await dialog.locator('input[name="familyName-en"]').fill(family);
    await dialog.locator('input[name="email"]').fill(email);
    await dialog.locator('select[name="country"]').selectOption({label: country});
    const author = dialog.getByRole('checkbox', {name: 'Author', exact: true});
    if ((await author.count()) && !(await author.isChecked())) await author.check();
    const saved = page.waitForResponse((r) => /\/contributors(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await dialog.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await dialog.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    const rows = (await panel.locator('li.listPanel__item').allInnerTexts().catch(() => [])).map((t) => flat(t, 120));
    return {add: r ? r.status() : null, rows};
}

/**
 * What the index and the job queue hold for a submission (evidence, not a step): on `main`
 * the submission's `submissions_fulltext` rows; on 3.5, whose index is the keyword tables,
 * the indexed keywords that start with "u15b" or are the item's old word.
 */
function indexState(app, submissionId, oldWord = '') {
    const rows = app.line === 'stable-3_5_0'
        ? sql(app, `select string_agg(distinct kl.keyword_text, ' ' order by kl.keyword_text) from submission_search_objects o join submission_search_object_keywords ok on ok.object_id = o.object_id join submission_search_keyword_list kl on kl.keyword_id = ok.keyword_id where o.submission_id = ${submissionId} and (kl.keyword_text like 'u15b%' or kl.keyword_text = lower('${oldWord}'))`)
        : sql(app, `select publication_id, locale, left(title, 90), left(authors, 90), position('u15babstract' in abstract) > 0 from submissions_fulltext where submission_id = ${submissionId} order by 1, 2`);
    return {
        rows,
        queuedJobs: sql(app, `select count(*) from jobs`),
        failedJobs: sql(app, `select count(*) from failed_jobs`),
    };
}

module.exports = {T, sleep, flat, ITEM, DRAFT, openWorkflow, addContributor, search, editTitleAbstract, indexState};
