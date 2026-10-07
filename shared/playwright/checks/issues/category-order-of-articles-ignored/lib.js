// Helpers of walk.js (issue report docs/issues/U16-A2-category-order-of-articles-ignored.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {expect} = require('@playwright/test');
const {screen, record, shot, idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);
const controls = (page) => page.locator('[data-cy="workflow-controls-right"]');

/** The category used by the steps, a top-level one of every dataset (OPS 3.5 names it "Social sciences"). */
const CATEGORY = {name: 'Social Sciences', path: 'social-sciences'};
const categoryName = (app) => (app.name === 'ops' && app.line === 'stable-3_5_0' ? 'Social sciences' : CATEGORY.name);

/**
 * The published items the steps place in the category, per app and line:
 * `id`, `title` (the start the page shows), `from` ('production': published by the
 * steps; 'published': unpublished, placed, published again).
 */
const ITEMS = {
    ojs: [
        {id: 5, title: 'Genetic transformation of forest trees', from: 'production'},
        {id: 6, title: 'Investigating the Shared Background Required for Argument', from: 'production'},
        {id: 9, title: 'Hansen & Pinto: Reason Reclaimed', from: 'production'},
    ],
    omp: [
        {id: 4, title: 'How Canadians Communicate', from: 'production'},
        {id: 5, title: 'Bomb Canada and Other Unkind Remarks', from: 'published'},
        {id: 14, title: 'From Bricks to Brains', from: 'published'},
    ],
    ops: [
        {id: 1, title: 'The influence of lactation', from: 'production'},
        {id: 6, title: 'Developing efficacy beliefs in the classroom', from: 'published'},
        {id: 8, title: 'Hansen & Pinto: Reason Reclaimed', from: 'published'},
    ],
};

/** The words that differ per app. */
function words(app) {
    const n = app.name;
    const v35 = app.line === 'stable-3_5_0';
    return {
        v35,
        entry: n === 'ojs' ? (v35 ? 'Issue' : 'Publication Settings') : n === 'omp' ? 'Catalog Entry' : 'Preprint entry',
        headingWord: n === 'ops' ? 'Preprint' : 'Publication',
        unpublish: n === 'ops' ? 'Unpost' : 'Unpublish',
        publish: /^(Publish|Post|Schedule For Publication)$/,
        pageWord: n === 'ops' ? 'preprints' : 'catalog',
        order: n === 'ojs' ? 'Order of articles' : n === 'omp' ? 'Order of monographs' : 'Order of preprints',
    };
}

async function snap(page, name) {
    let s;
    try {
        s = await screen(page);
    } catch (e) {
        s = {url: page.url(), error: flat(e.message, 200)};
    }
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

/** Open a submission's workflow from the editorial dashboard address. */
async function openWorkflow(page, app, id) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    await idle(page).catch(() => {});
    // A submission in Production opens on its stage, where the header's publish controls are not shown.
    await page.getByRole('dialog').getByRole('navigation').getByRole('link', {name: /^(Publication|Preprint)$/}).first().waitFor({timeout: T});
    await sleep(1200);
}

/** Press the header's "Unpublish" ("Unpost") and the same word in the window that asks. */
async function unpublish(page, app) {
    const w = words(app);
    await controls(page).getByRole('button', {name: w.unpublish, exact: true}).click();
    const win = page.getByRole('dialog').filter({has: page.getByRole('button', {name: w.unpublish, exact: true})}).last();
    const button = win.getByRole('button', {name: w.unpublish, exact: true});
    await button.waitFor({state: 'visible', timeout: T});
    await sleep(500);
    const question = flat(await win.innerText().catch(() => null), 300);
    const answered = page.waitForResponse((r) => /\/unpublish$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await button.click();
    const r = await answered;
    await controls(page).getByRole('button', {name: w.publish}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    await sleep(800);
    return {question, status: r ? r.status() : null};
}

/** Open the version's page holding "Categories" (main: the side menu's entry). */
async function openEntryPage(page, app) {
    const w = words(app);
    const link = page.getByRole('dialog').getByRole('navigation').getByRole('link', {name: w.entry, exact: true}).last();
    if (!(await link.isVisible().catch(() => false))) {
        await page.getByRole('dialog').getByRole('navigation').getByRole('link', {name: /^(Publication|Preprint)$/}).first().click();
        await sleep(500);
    }
    await link.click();
    await expect(page.getByRole('heading', {name: `${w.headingWord}: ${w.entry}`})).toBeVisible({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    await sleep(800);
}

/**
 * On the open page: "Categories" chooses `CATEGORY` (typed, then the suggestion), and on a
 * journal whose page asks for an issue, "Assign To Current/Back Issue" and the issue. "Save".
 */
async function placeInCategory(page, app, issueName, label) {
    const out = {};
    if (words(app).v35) {
        // 3.5: a journal assigns the issue through the page's "Assign to Issue" window first,
        // and "Categories" is a list of boxes.
        const assignButton = page.getByRole('button', {name: /^(Assign to Issue|Change Issue)$/}).first();
        if (app.name === 'ojs' && (await assignButton.isVisible().catch(() => false))) {
            await assignButton.click();
            const dialog = page.getByRole('dialog').filter({has: page.locator('select[name="issueId"]')}).last();
            const select = dialog.locator('select[name="issueId"]');
            await expect(select).toBeVisible({timeout: T});
            const value = await select.locator('option').filter({hasText: issueName}).first().getAttribute('value');
            await select.selectOption(value || '');
            const saved = page.waitForResponse((r) => /\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T});
            await dialog.getByRole('button', {name: /^(Save|Assign|OK)$/}).last().click();
            out.issueSave = (await saved).status();
            out.issue = issueName;
            await idle(page).catch(() => {});
            await sleep(1000);
        }
        const box = page.getByRole('checkbox', {name: categoryName(app), exact: true}).first();
        await expect(box).toBeVisible({timeout: T});
        await box.check();
        out.box = await box.isChecked();
    } else {
        const {CategoryPicker} = require('../../../pages/CategoriesPages.js');
        const picker = new CategoryPicker(page);
        await expect(picker.typingBox()).toBeVisible({timeout: T});
        await picker.choose('Social', CATEGORY.name);
        out.chips = await picker.chipLines();
        const assign = page.getByRole('radio', {name: 'Assign To Current/Back Issue', exact: true});
        if (await assign.isVisible().catch(() => false)) {
            await assign.check();
            const select = page.locator('select[name="issueId"]:visible').first();
            await expect(select).toBeVisible({timeout: T});
            const value = await select.locator('option').filter({hasText: issueName}).first().getAttribute('value');
            await select.selectOption(value || '');
            out.issue = issueName;
        }
    }
    await snap(page, `${label}-entry`);
    const saved = page.waitForResponse((r) => /\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST', {timeout: T});
    await page.getByRole('button', {name: 'Save', exact: true}).last().click();
    out.save = (await saved).status();
    await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    return out;
}

/**
 * The header's "Publish" ("Post"), then each window that follows until the publish call
 * answers: the version details (Version of Record, a major revision; on a journal the
 * issue), "Confirm", then the question's "Publish" ("Post").
 */
async function publish(page, app, issueName, label) {
    const w = words(app);
    const published = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 90_000});
    let done = false;
    published.then(() => { done = true; }, () => { done = true; });
    const header = controls(page).getByRole('button', {name: w.publish}).first();
    await header.waitFor({state: 'visible', timeout: T});
    const out = {button: flat(await header.innerText(), 60), windows: []};
    await header.click();
    for (let i = 0; i < 6 && !done; i++) {
        const dlg = page.getByRole('dialog').last();
        const btn = dlg.getByRole('button', {name: /^(Confirm|Publish|Post|Schedule For Publication)$/}).last();
        const shown = await btn.waitFor({state: 'visible', timeout: 15_000}).then(() => true).catch(() => false);
        if (done) break;
        if (!shown) continue;
        await sleep(1200);
        const stage = dlg.locator('select[name="versionStage"]');
        if (await stage.isVisible().catch(() => false)) {
            await stage.selectOption('VoR').catch(() => {});
            const minor = dlg.locator('select[name="versionIsMinor"]');
            if (await minor.isVisible().catch(() => false)) await minor.selectOption('false').catch(() => {});
            const assign = dlg.getByRole('radio', {name: 'Assign To Current/Back Issue', exact: true});
            if ((await assign.isVisible().catch(() => false)) && !(await assign.isChecked().catch(() => false))) {
                await assign.check();
                const select = dlg.locator('select[name="issueId"]');
                await expect(select).toBeVisible({timeout: T});
                const value = await select.locator('option').filter({hasText: issueName}).first().getAttribute('value');
                await select.selectOption(value || '');
            }
            await sleep(400);
        }
        out.windows.push(flat(await dlg.innerText().catch(() => null), 400));
        await shot(page, `${label}-publish-${i}`).catch(() => {});
        await btn.click();
        await sleep(1500);
    }
    const r = await published;
    out.publish = r.status();
    await controls(page).getByRole('button', {name: new RegExp(`^(${w.unpublish}|Unschedule)$`)}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    await sleep(800);
    return out;
}

/** Settings › Journal (Press, Server) › "Categories": the category's "Edit", the order chosen by its words, "Save". */
async function setOrder(page, app, choice, label) {
    if (words(app).v35) return setOrder35(page, app, choice, label);
    const {CategoriesTab} = require('../../../pages/CategoriesPages.js');
    const tab = new CategoriesTab(page, app.contextPath, {locale: 'en'});
    await tab.goto();
    const win = await tab.openEdit(CATEGORY.name);
    const before = await win.orderChosen();
    const options = await win.orderSelect().locator('option').allInnerTexts();
    await win.orderSelect().selectOption({label: choice});
    await snap(page, `${label}-window`);
    const r = await win.save();
    await expect(win.root()).toHaveCount(0, {timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    return {before, chosen: choice, options: options.map((o) => flat(o)), save: r.status()};
}

/** 3.5: the same through the tab's grid: the top-level category's name (a link to "Edit Category"), the window's list, "Save". */
async function setOrder35(page, app, choice, label) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/context`));
    await idle(page).catch(() => {});
    await page.locator('#categories-button').first().click();
    await idle(page).catch(() => {});
    const row = page.locator('tr.gridRow').filter({hasText: categoryName(app)}).first();
    await row.waitFor({timeout: T});
    await row.getByRole('link', {name: categoryName(app), exact: true}).click();
    const select = page.locator('select[name="sortOption"]').last();
    await select.waitFor({timeout: T});
    await sleep(800);
    const before = flat(await select.evaluate((el) => (el.options[el.selectedIndex] || {text: ''}).text));
    const options = (await select.locator('option').allInnerTexts()).map((o) => flat(o));
    await select.selectOption({label: choice});
    await snap(page, `${label}-window`);
    const form = page.locator('form#categoryForm').last();
    const saved = page.waitForResponse((r) => /category/i.test(r.url()) && /update/i.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    const save = form.locator('button[type="submit"]').last();
    await save.scrollIntoViewIfNeeded().catch(() => {});
    await save.click();
    const r = await saved;
    await select.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    return {before, chosen: choice, options, save: r ? r.status() : null};
}

/** The category's public page: the answer, the count line and the titles listed, in order. */
async function readCategoryPage(page, app, label) {
    const w = words(app);
    const address = `/index.php/${app.contextPath}/${w.pageWord}/category/${CATEGORY.path}`;
    // A press's first category page after its catalog, search or a settings save can end with no
    // answer at all on these PHP 8.3 servers without pkp/pkp-lib#12915 (`main` before 2026-10-05; the
    // stable lines; U16 OMP5, php-src GH-20469); opened again, it loads.
    let response = null;
    const dropped = [];
    for (let attempt = 0; attempt < 4; attempt++) {
        try {
            response = await page.goto(app.url(address));
            break;
        } catch (e) {
            const m = flat(e.message, 160);
            if (!/ERR_EMPTY_RESPONSE|ERR_CONNECTION_RESET|ERR_CONNECTION_REFUSED/.test(m) || attempt === 3) throw e;
            dropped.push(m);
            await sleep(1500);
        }
    }
    await idle(page).catch(() => {});
    const s = await snap(page, label);
    const titles = await page.locator('.page_catalog_category').locator('.obj_article_summary .title, .obj_preprint_summary .title, .obj_monograph_summary .title').allInnerTexts().catch(() => []);
    const count = flat(await page.locator('.page_catalog_category .article_count, .page_catalog_category .monograph_count, .page_catalog_category .cmp_monographs_list .heading .count').first().innerText().catch(() => null), 80);
    return {address, status: response ? response.status() : null, count, titles: titles.map((t) => flat(t, 120)), dropped, error: s.error || null};
}

/** Whether `titles` start, in order, with the item starts in `expected`. */
function inOrder(titles, expected) {
    // A title shown as "Hansen &amp; Pinto" (3.5's lists print the entity) still counts as its item.
    return expected.every((e, i) => (titles[i] || '').replace(/&amp;/g, '&').startsWith(e));
}

module.exports = {T, sleep, flat, rel, CATEGORY, categoryName, ITEMS, words, snap, openWorkflow, unpublish, openEntryPage, placeInCategory, publish, setOrder, readCategoryPage, inOrder};
