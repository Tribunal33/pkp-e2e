// Helpers for walk.js (U70 A3). Requiring this file runs nothing.
const path = require('path');
const {idle, sql} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Keep the order parameters of every catalog list fetch (`_submissions?…`), in order. */
function watchListGets(page) {
    const gets = [];
    page.on('request', (req) => {
        if (req.method() !== 'GET' || !/\/_submissions\?/.test(req.url())) return;
        const q = new URL(req.url()).searchParams;
        gets.push({
            orderBy: q.get('orderBy'),
            orderDirection: q.get('orderDirection'),
            categoryIds: q.get('categoryIds'),
            seriesIds: q.get('seriesIds'),
        });
    });
    return gets;
}

/** The titles of the Catalog page's rows, top to bottom. */
async function titles(catalog) {
    return (await catalog.shownTitles().allInnerTexts()).map((t) => flat(t, 120));
}

/**
 * Steps 2-4: open a submission's workflow, "Publication" › "Catalog Entry",
 * choose the series and a date, "Save", then "Publish" in the workflow.
 */
async function publishIntoSeries(page, app, {submissionId, series, date}) {
    const {WorkflowPage} = require(path.join(REPO, 'shared/playwright/pages/WorkflowPage.js'));
    const {CatalogEntryPage, publishFromWorkflow} = require(path.join(REPO, 'apps/omp/playwright/pages/CatalogPages.js'));
    const wf = new WorkflowPage(page, app.contextPath);
    await wf.gotoEditorial(submissionId);
    const entry = new CatalogEntryPage(page, app.contextPath);
    await entry.openFromWorkflow();
    await entry.seriesSelect().selectOption({label: series});
    await page.locator('input[name="datePublished"]').fill(date);
    const {response} = await entry.save();
    const saved = response.status();
    await publishFromWorkflow(page);
    await idle(page);
    return {saved};
}

/** Step 5: Settings › Website › "Appearance" › "Setup": "Order of monographs". */
async function setPressOrder(page, app, label) {
    const {WebsiteSettings} = require(path.join(REPO, 'shared/playwright/pages/AppearancePages.js'));
    const site = new WebsiteSettings(page, app.contextPath, {thumbnailField: 'pressThumbnail'});
    await site.goto();
    await site.openSideTab('appearance-setup');
    const setup = site.panel('appearance-setup');
    await setup.getByRole('radio', {name: label, exact: true}).check();
    const saved = page.waitForResponse((r) => /\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    await setup.getByRole('button', {name: 'Save', exact: true}).click();
    const status = (await saved).status();
    await idle(page);
    return status;
}

/** Settings › Press › "Series" › a series' "Order of monographs". */
async function setSeriesOrder(page, app, name, label) {
    const {SectionsTab} = require(path.join(REPO, 'shared/playwright/pages/SectionsPages.js'));
    const tab = new SectionsTab(page, app.contextPath, {tab: 'Series', addLabel: 'Add Series'});
    await tab.goto();
    const win = await tab.openEdit(name);
    await win.select('sortOption').selectOption({label});
    await win.save();
    await idle(page);
}

/** Settings › Press › "Categories" › a category's "Order of monographs" (its row's "Edit"). */
async function setCategoryOrder(page, app, name, label) {
    const {CategoriesTab} = require(path.join(REPO, 'shared/playwright/pages/CategoriesPages.js'));
    const tab = new CategoriesTab(page, app.contextPath);
    await tab.goto();
    const win = await tab.openEdit(name);
    await win.orderSelect().selectOption({label});
    const status = (await win.save()).status();
    await idle(page);
    return status;
}

/** A category's stored "Order of monographs", by its path. */
function categoryOrder(app, catPath) {
    return sql(
        app,
        "select cs.setting_value from category_settings cs join categories c on c.category_id = cs.category_id " +
            `where c.path = '${catPath}' and cs.setting_name = 'sortOption'`
    );
}

/** The stored order settings, the published books' dates and series. */
function state(app) {
    return {
        press: sql(app, "select setting_value from press_settings where setting_name = 'catalogSortOption'"),
        series: sql(app, "select series_id, setting_value from series_settings where setting_name = 'sortOption' and series_id = 5"),
        category: categoryOrder(app, 'social-sciences'),
        books: sql(
            app,
            'select s.submission_id, p.series_id, p.date_published from submissions s ' +
                'join publications p on p.publication_id = s.current_publication_id where s.status = 3 order by 1'
        ),
    };
}

module.exports = {T, flat, watchListGets, titles, publishIntoSeries, setPressOrder, setSeriesOrder, setCategoryOrder, categoryOrder, state};
