// Issue report docs/issues/U16-A8-category-path-slash-wrong-page.md (U16 A8): a category path holding "/" is
// saved, but the category's links open another category's page or the not-found page. Takes the report's
// Steps on PKP's default test dataset (a dataset fleet), as `rvaca`:
//   1    sign in as rvaca
//   2-3  Settings › Journal (Press, Server) › "Categories", "Applied Science" › More Actions › "Add"
//        (3.5: "Add Category", "Parent category" Applied Science)
//   4    Name "u16c4 Slashed", Path "applied-science/u16c4", "Save" (3.5: "OK")
//   5    the same under Applied Science: Name "u16c4 Nowhere", Path "u16c4/nowhere"
//   6    the "Applied Science" page (catalog/category/applied-science; OPS preprints/category/…)
//   7    "Subcategories" › "u16c4 Slashed"
//   8    back, "Subcategories" › "u16c4 Nowhere"
//   (control) back, "Subcategories" › "Computer Science"
// OPS on stable-3_5_0: that dataset has no "Applied Science"; "History" (path history) stands in, the first
// path is "history/u16c4" and "Cultural History" is the control.
// Each "Save" records the answer, whether the window stays open and the messages under "Path"; each link
// records its address, the answer's status, the page's heading and breadcrumb.
// WALK=neighbour runs alone (fix in and out): "u16c4 Dotted", Path "u16c4-ok_v1.2", under Applied Science,
//   saves and its link opens its own page.
// WALK=series runs alone, OMP only (fix in and out): Settings › Press › "Series", "Add Series", Title
//   "u16c4 Slashed series", Path "history/u16c4", "Save".
//
// Reset first:  npm run fleet-prep -- --feature issues-c4 --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-c4 PROBE_AGENT=c4 node bin/probe.js all shared/playwright/checks/issues/category-path-slash-wrong-page/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-c4-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-c4-3_5 PROBE_AGENT=c4 node bin/probe.js all shared/playwright/checks/issues/category-path-slash-wrong-page/walk.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');

const MODE = process.env.WALK || 'walk';
const T = 30_000;

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (MODE === 'series' && app.name !== 'omp') return;
    const legacy = (app.line || 'main') !== 'main';
    const opsOld = legacy && app.name === 'ops';
    const parent = opsOld ? {name: 'History', path: 'history', control: 'Cultural History'} : {name: 'Applied Science', path: 'applied-science', control: 'Computer Science'};
    const {CategoriesTab} = require('../../../pages/CategoriesPages.js');
    const {SectionsTab} = require('../../../pages/SectionsPages.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `c4-slash-${s}${run}-${app.name}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2000)}`);
    };

    const {page, close} = await launch(app);
    const step = async (label, action) => {
        try {
            const out = await action();
            fact(label, out === undefined ? 'done' : out);
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
        }
        await idle(page);
    };
    const tidy = (t) => (t || '').replace(/\s+/g, ' ').trim();
    const noticeSel = '.app__notifications .pkpNotification';
    const markNotices = () =>
        page.evaluate((sel) => document.querySelectorAll(sel).forEach((n) => n.setAttribute('data-c4-seen', '1')), noticeSel);
    const freshNotices = async (ms) => {
        const fresh = page.locator(`${noticeSel}:not([data-c4-seen])`);
        await fresh.first().waitFor({state: 'visible', timeout: ms}).catch(() => null);
        return (await fresh.allInnerTexts()).map(tidy);
    };
    const legacyState = (formId) =>
        page.evaluate((id) => {
            const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
            const form = document.querySelector(`form#${id}`);
            if (!form || !visible(form)) return {windowOpen: false};
            const under = [...form.querySelectorAll('label.error')].filter(visible).map((l) => ({for: l.getAttribute('for'), text: l.textContent.trim()}));
            const inForm = [...form.querySelectorAll('#formErrors li, .notifyFormError, .pkp_form_error')]
                .filter(visible)
                .map((e) => e.textContent.replace(/\s+/g, ' ').trim());
            return {windowOpen: true, under, inForm};
        }, formId);
    const legacySave = async (formId, urlPart, button) => {
        await markNotices();
        const answered = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes(urlPart), {timeout: T});
        answered.catch(() => null);
        await page.locator(`form#${formId}`).getByRole('button', {name: button, exact: true}).click();
        const response = await answered;
        await idle(page);
        const notices = await freshNotices(8_000);
        return {status: response.status(), ...(await legacyState(formId)), notices};
    };

    // Categories: main's Vue tab and window; 3.5's grid and older form.
    const categories = new CategoriesTab(page, app.contextPath);
    let cwin = null;
    const openCategories = async () => {
        if (!legacy) {
            await categories.goto();
            return {rows: (await categories.nameCells().allInnerTexts()).map(tidy)};
        }
        await page.goto(categories.url());
        await page.locator('#categories-button').click();
        await page.locator('#categoriesContainer table').first().waitFor({timeout: T});
        await idle(page);
        return {rows: (await page.locator('#categoriesContainer tr.gridRow').allInnerTexts()).map(tidy)};
    };
    const addUnderAppliedScience = async () => {
        if (!legacy) {
            cwin = await categories.openRowAdd(parent.name);
            return {heading: tidy(await cwin.heading().innerText().catch(() => ''))};
        }
        await page.locator('#categoriesContainer').getByRole('link', {name: 'Add Category', exact: true}).click();
        await page.locator('form#categoryForm [name="name[en]"]').waitFor({timeout: T});
        await idle(page);
        await page.locator('form#categoryForm select[name="parentId"]').selectOption({label: parent.name});
        return {parent: parent.name};
    };
    const fillCategory = async (nameText, path) => {
        if (!legacy) {
            await cwin.nameBox('en').fill(nameText);
            await cwin.pathBox().fill(path);
        } else {
            await page.locator('form#categoryForm [name="name[en]"]').fill(nameText);
            await page.locator('form#categoryForm [name="path"]').fill(path);
        }
        return {name: nameText, path};
    };
    const saveCategory = async () => {
        if (legacy) return legacySave('categoryForm', 'update-category', 'OK');
        await markNotices();
        const response = await cwin.save();
        await idle(page);
        const open = await cwin.root().isVisible().catch(() => false);
        const notices = await freshNotices(5_000);
        if (!open) return {status: response.status(), windowOpen: false, notices};
        return {
            status: response.status(),
            windowOpen: true,
            pathErrors: (await cwin.fieldErrors('Path').allInnerTexts()).map(tidy),
            errorSummary: tidy(await cwin.errorSummary().innerText().catch(() => '')),
            notices,
        };
    };
    const closeCategoryWindow = async () => {
        if (legacy) {
            if (await page.locator('form#categoryForm').isVisible().catch(() => false)) {
                await page.locator('form#categoryForm').getByRole('link', {name: 'Cancel', exact: true}).click().catch(() => null);
                await page.locator('form#categoryForm').waitFor({state: 'hidden', timeout: 10_000}).catch(() => null);
            }
        } else if (cwin && (await cwin.root().isVisible().catch(() => false))) {
            await cwin.closeButton().click().catch(() => null);
            await cwin.root().waitFor({state: 'hidden', timeout: 10_000}).catch(() => null);
        }
        // the side-modal slot (patterns.md pitfall 4) before the next opener
        await page.waitForTimeout(600);
    };
    const addCategory = async (k, nameText, path) => {
        await step(`${k} Settings › Categories`, openCategories);
        await step(`${k} ${parent.name} › Add`, addUnderAppliedScience);
        await step(`${k} Name "${nameText}", Path "${path}"`, () => fillCategory(nameText, path));
        await step(`${k} save`, saveCategory);
        record(name(`${k}-save`), await screen(page));
        await step(`${k} close any window left open`, closeCategoryWindow);
    };

    // The reader's side.
    const catalogOp = app.name === 'ops' ? 'preprints' : 'catalog';
    const appliedScience = `${app.baseURL}/index.php/${app.contextPath}/${catalogOp}/category/${parent.path}`;
    const readPage = async (status) => ({
        status,
        url: page.url(),
        title: await page.title(),
        h1: tidy(await page.locator('h1').first().innerText({timeout: 5_000}).catch(() => '')),
        breadcrumb: tidy(await page.locator('nav.cmp_breadcrumbs').first().innerText({timeout: 2_000}).catch(() => '')),
        subcategories: (await page.locator('nav.subcategories a').allInnerTexts().catch(() => [])).map(tidy),
    });
    // The PHP 8.3 built-in server can die on a process's first category page (php-src GH-20469, the harness
    // restarts it): a navigation that meets the dead server is retried once, a few seconds later.
    const gotoRetry = async (url) => {
        try {
            return await page.goto(url);
        } catch (e) {
            if (!/net::ERR_/.test(String(e.message))) throw e;
            console.log(`[c4] ${app.name} ${url}: ${String(e.message).split('\n')[0]}; retried`);
            await page.waitForTimeout(5_000);
            return page.goto(url);
        }
    };
    const openAppliedScience = async () => {
        const response = await gotoRetry(appliedScience);
        await idle(page);
        return readPage(response ? response.status() : null);
    };
    const followSubcategory = async (linkName) => {
        await openAppliedScience();
        const link = page.locator('nav.subcategories').getByRole('link', {name: linkName, exact: true});
        const href = await link.getAttribute('href', {timeout: 5_000});
        const nav = page.waitForResponse((r) => r.request().isNavigationRequest() && r.request().frame() === page.mainFrame(), {timeout: T});
        nav.catch(() => null);
        await link.click();
        const response = await nav;
        await page.waitForLoadState('load').catch(() => null);
        return {href, ...(await readPage(response.status()))};
    };

    try {
        await step('1 sign in as rvaca', () => signIn(page, 'rvaca'));

        if (MODE === 'walk') {
            await addCategory('4', 'u16c4 Slashed', `${parent.path}/u16c4`);
            await addCategory('5', 'u16c4 Nowhere', 'u16c4/nowhere');
            await step('5a Categories rows', openCategories);
            await step(`6 ${parent.name} page`, openAppliedScience);
            record(name('6-applied-science'), await screen(page));
            await step('7 Subcategories › u16c4 Slashed', () => followSubcategory('u16c4 Slashed'));
            record(name('7-slashed'), await screen(page));
            await step('8 Subcategories › u16c4 Nowhere', () => followSubcategory('u16c4 Nowhere'));
            record(name('8-nowhere'), await screen(page));
            await step(`control Subcategories › ${parent.control}`, () => followSubcategory(parent.control));
        } else if (MODE === 'neighbour') {
            await addCategory('n4', 'u16c4 Dotted', 'u16c4-ok_v1.2');
            await step('n7 Subcategories › u16c4 Dotted', () => followSubcategory('u16c4 Dotted'));
            record(name('n7-dotted'), await screen(page));
        } else if (MODE === 'series') {
            const series = new SectionsTab(page, app.contextPath, {tab: 'Series', addLabel: 'Add Series', formId: 'seriesForm'});
            let swin = null;
            await step('s1 Settings › Series, Add Series', async () => {
                await series.goto();
                swin = await series.openAdd();
                return {heading: await swin.heading().innerText().catch(() => null)};
            });
            await step('s2 Title "u16c4 Slashed series", Path "history/u16c4"', async () => {
                await swin.type('title[en]', 'u16c4 Slashed series');
                await swin.box('path').fill('history/u16c4');
                return 'typed';
            });
            await step('s2 save', () => legacySave('seriesForm', 'update-series', 'Save'));
            record(name('s2-series'), await screen(page));
            await step('s3 Series rows', async () => {
                if (await swin.form().isVisible().catch(() => false)) {
                    await swin.cancelLink().click().catch(() => null);
                    await swin.form().waitFor({state: 'hidden', timeout: 10_000}).catch(() => null);
                }
                await series.goto();
                return (await series.titleCells().allInnerTexts()).map(tidy);
            });
        }
    } finally {
        record(name(`${MODE}-facts`), facts);
        await close();
    }
});
