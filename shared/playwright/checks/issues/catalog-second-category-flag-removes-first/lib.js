// Helpers of walk.js (issue report docs/issues/U70-A4-catalog-second-category-flag-removes-first.md).
// Requiring this file runs nothing. Every helper presses what a person presses or opens an address:
// OMP's Catalog page (Content › Catalog) with a category or series as the filter, its "Featured" and
// "New release" boxes, and a published book's "Catalog Entry" series.
const {idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The Catalog page, freshly opened (so every box reads what the press has stored). */
async function openCatalog(page, app) {
    const lang = app.line && /3_[34]/.test(app.line) ? '' : '/en';
    await page.goto(app.url(`/index.php/${app.contextPath}${lang}/manageCatalog`));
    await idle(page);
    await page.locator('.listPanel__item--catalog, .listPanel__empty').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
}

/** "Filters" › the category or series named `label`; waits for the list it fetches. */
async function filterBy(page, label) {
    const col = page.locator('button.pkpFilter__label').filter({hasText: new RegExp(`^\\s*${label}\\s*$`)});
    if (!(await col.first().isVisible().catch(() => false))) {
        await page.getByRole('button', {name: 'Filters', exact: true}).click();
        await col.first().waitFor({timeout: T});
    }
    const got = page.waitForResponse((r) => /_submissions\?/.test(r.url()) && r.request().method() === 'GET', {timeout: T}).catch(() => null);
    await col.first().click();
    await got;
    await idle(page);
}

/** The Catalog page opened afresh, with `label` (a category or series) as the filter when given. */
async function catalogWith(page, app, label) {
    await openCatalog(page, app);
    if (label) await filterBy(page, label);
}

const row = (page, title) => page.locator('.listPanel__item--catalog').filter({has: page.locator('.listPanel__itemSubtitle', {hasText: title})}).first();
const featuredBox = (page, title) => row(page, title).locator('button.listPanel__item--catalog__select--first');
const newReleaseBox = (page, title) => row(page, title).locator('button.listPanel__item--catalog__select:not(.listPanel__item--catalog__select--first)');

/** The two boxes of a book's row as a screen reader names them, and the column headings. */
async function boxes(page, title) {
    const listed = await row(page, title).count();
    if (!listed) return {listed: false};
    const name = async (b) => flat(await b.locator('.-screenReader').innerText().catch(() => null));
    const featured = await name(featuredBox(page, title));
    const newRelease = await name(newReleaseBox(page, title));
    const headings = await page.locator('.listPanel--catalog .listPanel__itemsHeader, .listPanel--catalog [class*="catalogListPanel__"]').allInnerTexts().catch(() => []);
    return {
        listed: true,
        featured: /is featured/.test(featured || '') ? 'ticked' : /is not featured/.test(featured || '') ? 'empty' : featured,
        newRelease: /is a new release/.test(newRelease || '') ? 'ticked' : /is not a new release/.test(newRelease || '') ? 'empty' : newRelease,
        headings: headings.map((h) => flat(h, 200)),
    };
}

/** Press a book's box (`which`: 'featured' | 'newRelease'); returns the save's status and the boxes right after. */
async function press(page, title, which) {
    const box = which === 'featured' ? featuredBox(page, title) : newReleaseBox(page, title);
    const done = page.waitForResponse((r) => /saveDisplayFlags/.test(r.url()), {timeout: T}).catch(() => null);
    await box.click();
    const r = await done;
    await idle(page);
    await sleep(300);
    return {status: r ? r.status() : null, after: await boxes(page, title)};
}

/** The book's rows in the two tables the boxes write (evidence beside the screen). */
function flagRows(app, sid) {
    return {
        features: sql(app, `select assoc_type, assoc_id, seq from features where submission_id = ${sid} order by 1, 2`),
        newReleases: sql(app, `select assoc_type, assoc_id from new_releases where submission_id = ${sid} order by 1, 2`),
        categories: sql(app, `select category_id from publication_categories pc join submissions s on s.current_publication_id = pc.publication_id where s.submission_id = ${sid} order by 1`),
        series: sql(app, `select p.series_id from publications p join submissions s on s.current_publication_id = p.publication_id where s.submission_id = ${sid}`),
    };
}

/**
 * On the open "Catalog Entry" page: choose `label` under "Series" and press the form's "Save".
 * Returns the options offered and the save's status.
 */
async function setSeries(page, label) {
    const sel = page.locator('select[name="seriesId"]').first();
    await sel.waitFor({timeout: T});
    const options = (await sel.locator('option').allInnerTexts()).map((o) => flat(o, 80));
    await sel.selectOption({label});
    const w = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await page.locator('form').filter({has: sel}).getByRole('button', {name: 'Save', exact: true}).first().click();
    const r = await w;
    await idle(page).catch(() => {});
    await sleep(800);
    return {options, chose: label, saveStatus: r ? r.status() : null, shown: flat(await sel.evaluate((s) => s.options[s.selectedIndex]?.text).catch(() => null), 80)};
}

module.exports = {T, sleep, flat, openCatalog, filterBy, catalogWith, boxes, press, flagRows, setSeries};
