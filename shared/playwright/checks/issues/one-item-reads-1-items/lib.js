// Helpers of walk.js (issue report docs/issues/U16-A19-one-item-reads-1-items.md), also used by
// ../empty-category-no-message/walk.js for its neighbour check. Requiring this file runs nothing.
// Every helper drives the screens a person uses: the visitor's category, series and catalog pages,
// and a published item's workflow (unpublish, "Categories", publish again).
const {idle} = require('../../../probe');

const T = 30_000;
const CTX = 'publicknowledge';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);
const controls = (page) => page.locator('[data-cy="workflow-controls-right"]');

/** The address of a category's page as the app's own links print it ("preprints" on a preprint server). */
function categoryPath(app, catPath) {
    return `/index.php/${CTX}/${app.name === 'ops' ? 'preprints' : 'catalog'}/category/${catPath}`;
}

/**
 * The empty leaf category the Steps use: "Anthropology" under "Social Sciences"; the 3.5 dataset's
 * preprint server has other categories, so there "Mathematics".
 */
function stepCategory(app) {
    if (app.name === 'ops' && app.line === 'stable-3_5_0') return {path: 'mathematics', name: 'Mathematics', typed: 'Math'};
    return {path: 'anthropology', name: 'Anthropology', typed: 'Anthr'};
}

/**
 * What a visitor's category (or series, catalog) page shows: the count line, the heading over the
 * list, the empty message when any, the items listed, the paging line, the whole main text.
 */
async function readListingPage(page) {
    return page.evaluate(() => {
        const t = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
        const main = document.querySelector('.page_catalog_category, .page_catalog_series, .page_catalog, .page') || document.body;
        const count = main.querySelector('.article_count, .monograph_count, .preprint_count');
        const items = [...main.querySelectorAll('.cmp_article_list > li, .cmp_preprint_list > li, .cmp_monographs_list .obj_monograph_summary')].map(
            (li) => t(li.querySelector('h2, h3, .title')) || t(li)
        );
        const paras = [...main.querySelectorAll(':scope > p, .cmp_monographs_list ~ p')].map(t);
        return {
            h1: t(main.querySelector('h1')),
            count: t(count),
            listHeadings: [...main.querySelectorAll('h2')].map((h) => ({text: t(h), clipped: h.getBoundingClientRect().height <= 2})),
            paragraphs: paras,
            items,
            pageInfo: t(main.querySelector('.cmp_pagination')) || null,
            mainText: t(main).slice(0, 1500),
        };
    });
}

/** Open an address signed out (the caller's page) and read it. */
async function visit(page, app, address) {
    const r = await page.goto(app.url(address));
    await idle(page).catch(() => null);
    return {status: r && r.status(), url: rel(page.url()), ...(await readListingPage(page))};
}

/** The workflow of a submission from the editorial dashboard. */
async function openWorkflow(page, app, sid) {
    const lang = app.line && /3_[34]/.test(app.line) ? '' : '/en';
    await page.goto(app.url(`/index.php/${CTX}${lang}/dashboard/editorial?workflowSubmissionId=${sid}`));
    await idle(page).catch(() => {});
    await controls(page).waitFor({timeout: T});
    await sleep(1500);
}

/** "Unpublish" ("Unpost" on a preprint server), confirmed. Returns the request's status. */
async function unpublish(page) {
    await controls(page).getByRole('button', {name: /^(Unpublish|Unpost)$/}).first().click();
    const win = page.getByRole('dialog').filter({hasText: /Are you sure you don't want this to be/}).last();
    await win.waitFor({timeout: T});
    const w = page.waitForResponse((x) => /\/unpublish/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await win.getByRole('button', {name: /^(Unpublish|Unpost)$/}).last().click();
    const r = await w;
    await controls(page).getByRole('button', {name: /^(Publish|Post|Schedule For Publication)$/}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    await sleep(800);
    return r ? r.status() : null;
}

/**
 * The publication page holding "Categories" ("Publication Settings", "Catalog Entry", "Preprint
 * entry"; on 3.5 OJS's "Issue"): opens it from the side menu and returns the name it opened.
 */
async function openCategoriesPage(page) {
    const names = ['Publication Settings', 'Catalog Entry', 'Preprint entry', 'Preprint Entry', 'Issue'];
    for (const name of names) {
        const link = page.getByRole('link', {name, exact: true}).first();
        if (!(await link.isVisible().catch(() => false))) {
            const group = page.getByRole('link', {name: 'Publication', exact: true}).first();
            if (await group.isVisible().catch(() => false)) await group.click().catch(() => {});
            await sleep(300);
        }
        if (!(await link.isVisible().catch(() => false))) continue;
        await link.click();
        await idle(page).catch(() => {});
        await sleep(1500);
        const has = await page.getByText(/^\s*Categories\s*$/).first().isVisible().catch(() => false);
        if (has) return name;
    }
    return null;
}

/** The "Categories" field of the open publication page: an autosuggest on `main`, boxes on 3.5. */
function categoriesField(page) {
    return page
        .locator('.pkpAutosuggest, .pkpFormField')
        .filter({has: page.locator('.pkpFormFieldLabel, legend, label, .pkpFormField__heading').filter({hasText: /^\s*Categories\b/})})
        .last();
}

/** Whether the field takes input now (a page left over from "Unpublish" may still show it greyed out). */
async function categoriesEditable(page) {
    const field = categoriesField(page);
    const control = field.locator('input:not([type=hidden])').first();
    if (!(await control.count())) return {editable: false, why: 'no input'};
    const disabled = await control.isDisabled().catch(() => true);
    const wrapperDisabled = await field.locator('[disabled]').count();
    return {editable: !disabled, inputDisabled: disabled, disabledWrappers: wrapperDisabled};
}

/**
 * Under "Categories": type `typed` and choose the suggestion ending in `name` (the autosuggest of
 * `main`), or tick the box whose label ends in `name` (3.5); then the form's "Save". Returns what
 * the field and the save showed.
 */
async function placeInCategory(page, {typed, name}) {
    const out = {};
    const field = categoriesField(page);
    const ends = new RegExp(`${name}\\s*$`);
    const typing = field.locator('input:not([type=hidden]):not([type=checkbox])').first();
    if (await typing.count()) {
        try {
            await typing.click({timeout: 10_000});
        } catch (e) {
            // Kept for the record: what stood in the way, then one more try on the reloaded page.
            out.firstTry = String(e.message).split('\n').slice(0, 6).join(' | ');
            out.fieldHtml = flat(await field.evaluate((el) => el.outerHTML).catch(() => null), 1500);
            await page.reload();
            await idle(page).catch(() => {});
            await controls(page).waitFor({timeout: T});
            await sleep(1500);
            out.reopened = await openCategoriesPage(page);
            await typing.click({timeout: 10_000});
        }
        await typing.pressSequentially(typed, {delay: 40});
        const option = page.locator('[role=listbox]:visible [role=option]').filter({hasText: ends}).first();
        await option.waitFor({timeout: T});
        out.chose = flat(await option.innerText());
        await option.click();
        // No Escape afterwards: with the list closed it reaches the workflow window and closes it.
        await sleep(800);
    } else {
        const label = field.locator('label').filter({hasText: ends}).first();
        out.ticked = flat(await label.innerText());
        await label.locator('input[type=checkbox]').check({timeout: 10_000});
    }
    const form = field.locator('xpath=ancestor::form[1]');
    const w = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).first().click();
    const r = await w;
    out.saveStatus = r ? r.status() : null;
    await idle(page).catch(() => {});
    await sleep(800);
    out.chips = await field.getByRole('button', {name: /^Remove /}).evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') || b.textContent.trim())).catch(() => []);
    out.ticked = out.ticked || null;
    return out;
}

/**
 * After "Unpublish" the open page may still show the form greyed out; a person reloads the page
 * and opens the same publication page again. Records whether that was needed.
 */
async function editableCategories(page, app, sid) {
    const out = {opened: await openCategoriesPage(page), before: await categoriesEditable(page)};
    if (!out.before.editable) {
        await page.reload();
        await idle(page).catch(() => {});
        await controls(page).waitFor({timeout: T});
        await sleep(1500);
        out.reopened = await openCategoriesPage(page);
        out.after = await categoriesEditable(page);
    }
    return out;
}

/** "Publish" ("Post"), through "Review Publishing Details" when it opens, confirmed. */
async function publish(page) {
    const out = {};
    const button = controls(page).getByRole('button', {name: /^(Schedule For Publication|Publish|Post)$/}).first();
    await button.waitFor({state: 'visible', timeout: T});
    out.button = flat(await button.innerText(), 60);
    await button.click();
    const pnl = page.locator('[data-cy="active-modal"], [role=dialog]').filter({hasText: 'Review Publishing Details'}).last();
    const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to/}).last();
    const opened = await Promise.race([
        pnl.getByRole('button', {name: 'Confirm', exact: true}).waitFor({state: 'visible', timeout: 15_000}).then(() => 'panel'),
        confirm.waitFor({state: 'visible', timeout: 15_000}).then(() => 'confirm'),
    ]).catch(() => null);
    out.opened = opened;
    await idle(page).catch(() => {});
    await sleep(2500);
    if (opened === 'panel') {
        out.panel = flat(await pnl.innerText().catch(() => null), 600);
        await pnl.getByRole('button', {name: 'Confirm', exact: true}).click();
        await confirm.waitFor({state: 'visible', timeout: T});
        await idle(page).catch(() => {});
        await sleep(800);
    }
    out.confirmText = flat(await confirm.innerText().catch(() => null), 300);
    const w = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await confirm.getByRole('button', {name: /^(Publish|Post|Schedule For Publication)$/}).last().click();
    const r = await w;
    out.status = r ? r.status() : null;
    await controls(page).getByRole('button', {name: /^(Unpublish|Unpost|Unschedule)$/}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    out.after = flat(await controls(page).innerText().catch(() => null), 200);
    return out;
}

/** The submission each app's Steps place in a category: a published item with one version. */
const ITEM = {ojs: 17, omp: 5, ops: 2};

module.exports = {T, CTX, sleep, flat, rel, categoryPath, stepCategory, readListingPage, visit, openWorkflow, unpublish, openCategoriesPage, categoriesField, categoriesEditable, editableCategories, placeInCategory, publish, ITEM};
