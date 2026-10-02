// Issue report docs/issues/U17-OMP2-path-message-only-letters-and-numbers.md (U17 OMP2, U16 A9): a
// category's or a series' "Path" holding a space is refused with "The category (series) path must consist of
// only letters and numbers.", yet a path holding "-", "_" and "." saves. Takes the report's Steps on PKP's
// default test dataset (a dataset fleet), as `rvaca`:
//   1    sign in as rvaca
//   2-5  Settings › Journal (Press, Server) › "Categories", "Add Category", Name and Path "u17e category"
//        ("Save": refused), then Path "u17e-category_v1.2" ("Save": saved)      {OJS OMP OPS}
//   6-8  Settings › Press › "Series", "Add Series", Title and Path "u17e series" ("Save": refused), then Path
//        "u17e-series_v1.2" ("Save": saved)                                      {OMP}
// Each "Save" records the answer, whether the window stays open, the messages under the boxes and in the
// window, and the notices at the top right. On stable-3_5_0 the "Add Category" window is the older form
// opened from a list (form#categoryForm), whose button reads "OK" where main's reads "Save".
// WALK=neighbour runs alone (fix in and out): "u17e-ok" saves, and the same path a second time is still
// refused with "The … path already exists. Please enter a unique path."
//
// Reset first:  npm run fleet-prep -- --feature issues-u17e --dataset 5 --reset
// Run (main):   PROBE_FEATURE=issues-u17e PROBE_AGENT=u17e node bin/probe.js all shared/playwright/checks/issues/path-message-only-letters-and-numbers/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u17e-3_5 --dataset 5 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u17e-3_5 PROBE_AGENT=u17e node bin/probe.js all shared/playwright/checks/issues/path-message-only-letters-and-numbers/walk.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');

const MODE = process.env.WALK || 'walk';
const T = 30_000;

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const legacyCategories = (app.line || 'main') !== 'main';
    const {CategoriesTab} = require('../../../pages/CategoriesPages.js');
    const {SectionsTab} = require('../../../pages/SectionsPages.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `${s}${run}-${app.name}`;
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
    const tidy = (t) => t.replace(/\s+/g, ' ').trim();
    const noticeSel = '.app__notifications .pkpNotification';
    const markNotices = () =>
        page.evaluate((sel) => document.querySelectorAll(sel).forEach((n) => n.setAttribute('data-u17e-seen', '1')), noticeSel);
    const freshNotices = async (ms) => {
        const fresh = page.locator(`${noticeSel}:not([data-u17e-seen])`);
        await fresh.first().waitFor({state: 'visible', timeout: ms}).catch(() => null);
        return (await fresh.allInnerTexts()).map(tidy);
    };
    // A legacy window after a save: open or not, the messages under its boxes and its own error list.
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
    const legacySave = async (formId, urlPart, button = 'Save') => {
        await markNotices();
        const answered = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes(urlPart), {timeout: T});
        answered.catch(() => null);
        await page.locator(`form#${formId}`).getByRole('button', {name: button, exact: true}).click();
        const response = await answered;
        await idle(page);
        const notices = await freshNotices(8_000);
        return {status: response.status(), ...(await legacyState(formId)), notices};
    };

    // Categories: the window on main (a Vue side window) and on 3.5 (the older form).
    const categories = new CategoriesTab(page, app.contextPath);
    let cwin = null;
    const openCategories = async () => {
        if (!legacyCategories) {
            await categories.goto();
            return {rows: (await categories.nameCells().allInnerTexts()).map(tidy)};
        }
        await page.goto(categories.url());
        await page.locator('#categories-button').click();
        await page.locator('#categoriesContainer table').first().waitFor({timeout: T});
        await idle(page);
        return {rows: (await page.locator('#categoriesContainer tr.gridRow').allInnerTexts()).map(tidy)};
    };
    const addCategory = async () => {
        if (!legacyCategories) {
            cwin = await categories.openAdd();
            return {heading: await cwin.heading().innerText().catch(() => null)};
        }
        await page.locator('#categoriesContainer').getByRole('link', {name: 'Add Category', exact: true}).click();
        await page.locator('form#categoryForm [name="name[en]"]').waitFor({timeout: T});
        await idle(page);
        return {heading: tidy(await page.getByRole('dialog').filter({has: page.locator('form#categoryForm')}).getByRole('heading').first().innerText().catch(() => ''))};
    };
    const fillCategory = async (nameText, path) => {
        if (!legacyCategories) {
            if (nameText !== null) await cwin.nameBox('en').fill(nameText);
            await cwin.pathBox().fill(path);
        } else {
            if (nameText !== null) await page.locator('form#categoryForm [name="name[en]"]').fill(nameText);
            await page.locator('form#categoryForm [name="path"]').fill(path);
        }
        return {name: nameText, path};
    };
    const saveCategory = async () => {
        if (legacyCategories) return legacySave('categoryForm', 'update-category', 'OK');
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
        if (legacyCategories) {
            await page.locator('form#categoryForm').getByRole('link', {name: 'Cancel', exact: true}).click().catch(() => null);
            await page.locator('form#categoryForm').waitFor({state: 'hidden', timeout: 10_000}).catch(() => null);
        } else if (await cwin.root().isVisible().catch(() => false)) {
            await cwin.closeButton().click().catch(() => null);
            await cwin.root().waitFor({state: 'hidden', timeout: 10_000}).catch(() => null);
        }
    };

    // Series {OMP}: the older form on the "Series" list.
    const series = new SectionsTab(page, app.contextPath, {tab: 'Series', addLabel: 'Add Series', formId: 'seriesForm'});
    let swin = null;

    try {
        await step('1 sign in as rvaca', () => signIn(page, 'rvaca'));

        if (MODE !== 'neighbour') {
            await step('2 Settings › Categories', openCategories);
            await step('3 Add Category', addCategory);
            await step('4 Name and Path "u17e category"', () => fillCategory('u17e category', 'u17e category'));
            await step('4 save', saveCategory);
            record(name('4-category'), await screen(page));
            await step('5 Path "u17e-category_v1.2"', () => fillCategory(null, 'u17e-category_v1.2'));
            await step('5 save', saveCategory);
            record(name('5-category'), await screen(page));
            await step('5a close any window left open', closeCategoryWindow);
            await step('5b Categories rows', openCategories);

            if (app.name === 'omp') {
                await step('6 Settings › Series, Add Series', async () => {
                    await series.goto();
                    swin = await series.openAdd();
                    return {heading: await swin.heading().innerText().catch(() => null)};
                });
                await step('7 Title and Path "u17e series"', async () => {
                    await swin.type('title[en]', 'u17e series');
                    await swin.box('path').fill('u17e series');
                    return 'typed';
                });
                await step('7 save', () => legacySave('seriesForm', 'update-series'));
                record(name('7-series'), await screen(page));
                await step('8 Path "u17e-series_v1.2"', () => swin.box('path').fill('u17e-series_v1.2'));
                await step('8 save', () => legacySave('seriesForm', 'update-series'));
                record(name('8-series'), await screen(page));
                await step('8a cancel any window left open', async () => {
                    await swin.cancelLink().click().catch(() => null);
                    await swin.form().waitFor({state: 'hidden', timeout: 10_000}).catch(() => null);
                });
                await step('8b Series rows', async () => {
                    await series.goto();
                    return (await series.titleCells().allInnerTexts()).map(tidy);
                });
            }
        } else {
            await step('n2 Settings › Categories', openCategories);
            await step('n3 Add Category', addCategory);
            await step('n4 Name "u17e ok", Path "u17e-ok"', () => fillCategory('u17e ok', 'u17e-ok'));
            await step('n4 save', saveCategory);
            await step('n4a close any window left open', closeCategoryWindow);
            await step('n5 Add Category again', async () => {
                await openCategories();
                return addCategory();
            });
            await step('n6 Name "u17e again", Path "u17e-ok"', () => fillCategory('u17e again', 'u17e-ok'));
            await step('n6 save', saveCategory);
            record(name('n6-category'), await screen(page));
            await step('n6a close any window left open', closeCategoryWindow);
            if (app.name === 'omp') {
                for (const [k, title] of [['n7', 'u17e ok'], ['n8', 'u17e again']]) {
                    await step(`${k} Add Series "${title}", Path "u17e-ok"`, async () => {
                        await series.goto();
                        swin = await series.openAdd();
                        await swin.type('title[en]', title);
                        await swin.box('path').fill('u17e-ok');
                        return 'typed';
                    });
                    await step(`${k} save`, () => legacySave('seriesForm', 'update-series'));
                    await step(`${k}a cancel any window left open`, async () => {
                        if (await swin.form().isVisible().catch(() => false)) {
                            await swin.cancelLink().click().catch(() => null);
                            await swin.form().waitFor({state: 'hidden', timeout: 10_000}).catch(() => null);
                        }
                    });
                }
                record(name('n8-series'), await screen(page));
            }
        }
    } finally {
        record(name(MODE === 'neighbour' ? 'neighbour-facts' : 'facts'), facts);
        await close();
    }
});
