// Issue report docs/issues/U17-OMP10-series-damaged-cover-save-hangs.md (U17 OMP10; the category window's twin,
// U16). A PNG whose picture data is damaged, chosen as a series' or a category's "Cover Image": "Save" fails on the
// server after part of the save is stored. Takes the report's Steps on PKP's default test dataset (a dataset
// fleet), as `rvaca`:
//   PART=series   {OMP}  1-10: "Library & Information Studies" › Edit, Subtitle "u17h13f first", damaged.png, Save;
//                 Cancel, reopen; cover.png, Save (control); Edit, Subtitle "u17h13f second", damaged.png, Save;
//                 Cancel, reopen: the window's "Current Image" and the series' page (catalog/series/lis).
//   PART=category {OJS, OMP, OPS}  11-15: "Add Category" "u17h13f Category" with damaged.png, Save; the list after a
//                 reload; "Applied Science" (OPS 3.5: "History") › Edit, cover.png, Save (control); Edit, damaged.png,
//                 Save; reopen.
//   (default: both)
// WALK=neighbour runs alone (fix in and out): sound covers still save and show: "History" a PNG, "Education" a JPEG,
// "Psychology" a subtitle with no file; the category "Social Sciences" a PNG.
// Each run records every save's answer, whether the window stays open, its messages, the server log lines written
// during the save, the pictures shown, and the stored cover record (database).
//
// Reset first:  npm run fleet-prep -- --feature issues-h13f --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-h13f PROBE_AGENT=h13f node bin/probe.js all shared/playwright/checks/issues/series-damaged-cover-save-hangs/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-h13f-3_5 --dataset 6 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-h13f-3_5 PROBE_AGENT=h13f node bin/probe.js all shared/playwright/checks/issues/series-damaged-cover-save-hangs/walk.js
const fs = require('fs');
const {forEachApp, launch, signIn, screen, record, idle, outFile, serverLog, sql} = require('../../../probe');
const {T, sleep, tidy, PNG, JPG, damagedPng, pictures, openCategory, datasetCategories} = require('./lib.js');

const MODE = process.env.WALK || 'walk';
const PART = process.env.PART || 'all';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `${s}${run}-${app.name}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2000)}`);
    };
    const file = (n, body) => {
        const p = outFile(n);
        fs.writeFileSync(p, body);
        return p;
    };
    const files = {cover: file('cover.png', PNG), damaged: file('damaged.png', damagedPng()), jpg: file('cover.jpg', JPG)};
    const log = serverLog(app);
    const {page, close} = await launch(app);
    const step = async (label, action) => {
        try {
            const out = await action();
            fact(label, out === undefined ? 'done' : out);
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
        }
        await idle(page).catch(() => null);
    };
    const noticeSel = '.app__notifications .pkpNotification';
    const markNotices = () =>
        page.evaluate((sel) => document.querySelectorAll(sel).forEach((n) => n.setAttribute('data-h13f-seen', '1')), noticeSel).catch(() => null);
    const freshNotices = async (ms) => {
        const fresh = page.locator(`${noticeSel}:not([data-h13f-seen])`);
        await fresh.first().waitFor({state: 'visible', timeout: ms}).catch(() => null);
        return (await fresh.allInnerTexts()).map(tidy);
    };
    const dialogs = [];
    page.on('dialog', (d) => {
        dialogs.push(d.message());
        d.dismiss().catch(() => null);
    });

    // ---------------------------------------------------------------- the series window (OMP)
    const {SectionsTab} = require('../../../pages/SectionsPages.js');
    const series = new SectionsTab(page, app.contextPath, {tab: 'Series', addLabel: 'Add Series', formId: 'seriesForm'});
    let win = null;
    const seriesWindow = () =>
        page.evaluate(() => {
            const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
            const form = document.querySelector('form#seriesForm');
            if (!form || !visible(form)) return {windowOpen: false};
            const save = form.querySelector('button.submitFormButton');
            const spinner = form.querySelector('.pkp_spinner');
            return {
                windowOpen: true,
                saveDisabled: save ? save.disabled : null,
                spinnerShown: spinner ? spinner.classList.contains('is_visible') && visible(spinner) : false,
                under: [...form.querySelectorAll('label.error')].filter(visible).map((l) => l.textContent.trim()),
                inForm: [...form.querySelectorAll('#formErrors li, .pkp_form_error')].filter(visible).map((e) => e.textContent.replace(/\s+/g, ' ').trim()),
                subtitle: (form.querySelector('[name="subtitle[en]"]') || {}).value,
            };
        });
    const openSeries = async (title) => {
        await series.goto();
        win = await series.openEdit(title);
        await idle(page);
        return {...(await seriesWindow()), currentImage: await pictures(page, page.locator('form#seriesForm #coverImagePreview'))};
    };
    const uploadSeries = async (path) => {
        const box = win.form().locator('#coverImage .pkp_controller_fileUpload, #plupload').first();
        const input = win.form().locator('input[type=file]').first();
        const answered = page
            .waitForResponse((r) => r.request().method() === 'POST' && /upload-image/.test(r.url()), {timeout: 15_000})
            .then((r) => r.status())
            .catch(() => null);
        await input.setInputFiles(path);
        const upload = await answered;
        await sleep(1000);
        await idle(page).catch(() => null);
        return {upload, box: tidy(await box.innerText().catch(() => ''))};
    };
    const saveSeries = async () => {
        await markNotices();
        const from = log.mark();
        const answered = page.waitForResponse((r) => r.request().method() === 'POST' && /update-series/.test(r.url()), {timeout: T});
        await win.saveButton().click();
        const response = await answered;
        const body = (await response.text().catch(() => '')).slice(0, 300);
        await idle(page).catch(() => null);
        const notices = await freshNotices(6_000);
        await sleep(2500);
        return {status: response.status(), body, ...(await seriesWindow()), notices, dialogs: dialogs.splice(0), serverLog: log.since(from).map((l) => l.slice(0, 400)).slice(0, 12)};
    };
    const cancelSeries = async () => {
        if (await win.form().isVisible().catch(() => false)) {
            await win.cancelLink().click().catch(() => null);
            await win.form().waitFor({state: 'hidden', timeout: 10_000}).catch(() => null);
        }
        return {windowOpen: await win.form().isVisible().catch(() => false), dialogs: dialogs.splice(0)};
    };
    const storedSeries = (path) =>
        sql(app, `select series_id, image from series where path = '${path}'`);
    const seriesPage = async (path) => {
        await page.goto(app.url(`/index.php/${app.contextPath}/catalog/series/${path}`));
        await idle(page).catch(() => null);
        return pictures(page, page.locator('.pkp_structure_main'));
    };

    // ---------------------------------------------------------------- the category window (all apps)
    const saveCategory = async (cat) => {
        await markNotices();
        const from = log.mark();
        const answer = await cat.save();
        const notices = await freshNotices(6_000);
        await sleep(2000);
        return {...answer, windowOpen: await cat.isOpen(), errors: await cat.errors(), notices, dialogs: dialogs.splice(0), serverLog: log.since(from).map((l) => l.slice(0, 400)).slice(0, 12)};
    };
    const storedCategory = (path) => sql(app, `select category_id, path, image from categories where path = '${path}'`);
    let cat = null;
    const CAT = datasetCategories(app);

    try {
        await step('1 sign in as rvaca', () => signIn(page, 'rvaca'));
        if (MODE === 'walk') {
            if (app.name === 'omp' && PART !== 'category') {
                await step('3 Edit "Library & Information Studies"', () => openSeries('Library & Information Studies'));
                await step('4 Subtitle "u17h13f first"', () => win.type('subtitle[en]', 'u17h13f first').then(() => 'typed'));
                await step('5 Upload File: damaged.png', () => uploadSeries(files.damaged));
                record(name('s5-uploaded'), await screen(page));
                await step('6 Save', saveSeries);
                record(name('s6-saved'), await screen(page));
                await step('7 Cancel', cancelSeries);
                await step('7 reload, Edit', () => openSeries('Library & Information Studies'));
                fact('7 stored image (database)', storedSeries('lis'));
                await step('8 Upload File: cover.png (control)', () => uploadSeries(files.cover));
                await step('8 Save (control)', saveSeries);
                await step('8a Cancel if open', cancelSeries);
                await step('9 Edit', () => openSeries('Library & Information Studies'));
                record(name('s9-reopened'), await screen(page));
                fact('9 stored image (database)', storedSeries('lis'));
                await step('9 Subtitle "u17h13f second"', () => win.box('subtitle[en]').fill('u17h13f second').then(() => 'typed'));
                await step('9 Upload File: damaged.png', () => uploadSeries(files.damaged));
                await step('9 Save', saveSeries);
                record(name('s9-saved'), await screen(page));
                await step('10 Cancel', cancelSeries);
                await step('10 reload, Edit', () => openSeries('Library & Information Studies'));
                record(name('s10-reopened'), await screen(page));
                fact('10 stored image (database)', storedSeries('lis'));
                await step('10a Cancel', cancelSeries);
                await step('10 the series page catalog/series/lis', () => seriesPage('lis'));
                record(name('s10-series-page'), await screen(page));
            }
            if (PART !== 'series') {
                await step('11 Categories, Add Category', async () => {
                    cat = await openCategory(page, app, {add: true});
                    return cat.kind;
                });
                await step('12 Name, Path', () => cat.fill({title: 'u17h13f Category', path: 'u17h13f-category'}).then(() => 'filled'));
                await step('12 Cover Image: damaged.png', () => cat.upload(files.damaged));
                await step('12 Save', () => saveCategory(cat));
                record(name('c12-saved'), await screen(page));
                await step('12a close', () => cat.close());
                await step('12b list after a reload', async () => {
                    const {CategoriesTab} = require('../../../pages/CategoriesPages.js');
                    const tab = new CategoriesTab(page, app.contextPath);
                    await page.goto(app.url(tab.url()));
                    await page.locator('#categories-button').click();
                    await sleep(2000);
                    return (await page.locator('#categories').innerText().catch(() => '')).split('\n').map(tidy).filter((t) => /u17h13f/.test(t));
                });
                fact('12 stored (database)', storedCategory('u17h13f-category'));
                await step(`13 Edit "${CAT.steps}"`, async () => {
                    cat = await openCategory(page, app, {name: CAT.steps});
                    return cat.kind;
                });
                await step('13 Cover Image: cover.png (control)', () => cat.upload(files.cover));
                await step('13 Save (control)', () => saveCategory(cat));
                await step('13a close', () => cat.close());
                fact('13 stored (database)', storedCategory(CAT.steps === 'History' ? 'history' : 'applied-science'));
                await step(`14 Edit "${CAT.steps}"`, async () => {
                    cat = await openCategory(page, app, {name: CAT.steps});
                    return {kind: cat.kind, pictures: await pictures(page, cat.root())};
                });
                await step('14 Cover Image: damaged.png', () => cat.upload(files.damaged));
                await step('14 Save', () => saveCategory(cat));
                record(name('c14-saved'), await screen(page));
                await step('14a close', () => cat.close());
                await step(`15 reload, Edit "${CAT.steps}"`, async () => {
                    cat = await openCategory(page, app, {name: CAT.steps});
                    return {kind: cat.kind, pictures: await pictures(page, cat.root())};
                });
                record(name('c15-reopened'), await screen(page));
                fact('15 stored (database)', storedCategory(CAT.steps === 'History' ? 'history' : 'applied-science'));
                await step('15a close', () => cat.close());
            }
        } else {
            // The neighbour: sound covers and a save with no file still go through.
            if (app.name === 'omp') {
                for (const [title, path, f] of [['History', 'his', files.cover], ['Education', 'ed', files.jpg]]) {
                    await step(`n Edit "${title}"`, () => openSeries(title));
                    await step(`n "${title}" Upload File: ${f.split('/').pop()}`, () => uploadSeries(f));
                    await step(`n "${title}" Save`, saveSeries);
                    await step(`n "${title}" Cancel if open`, cancelSeries);
                    await step(`n "${title}" Edit again`, () => openSeries(title));
                    await step(`n "${title}" Cancel`, cancelSeries);
                    await step(`n "${title}" series page`, () => seriesPage(path));
                }
                await step('n Edit "Psychology"', () => openSeries('Psychology'));
                await step('n "Psychology" Subtitle, no file', () => win.box('subtitle[en]').fill('u17h13f nb').then(() => 'typed'));
                await step('n "Psychology" Save', saveSeries);
                await step('n "Psychology" Cancel if open', cancelSeries);
                await step('n "Psychology" Edit again', () => openSeries('Psychology'));
                await step('n "Psychology" Cancel', cancelSeries);
            }
            await step(`n Edit "${CAT.neighbour}"`, async () => {
                cat = await openCategory(page, app, {name: CAT.neighbour});
                return cat.kind;
            });
            await step(`n "${CAT.neighbour}" Cover Image: cover.png`, () => cat.upload(files.cover));
            await step(`n "${CAT.neighbour}" Save`, () => saveCategory(cat));
            await step(`n "${CAT.neighbour}" close`, () => cat.close());
            await step(`n Edit "${CAT.neighbour}" again`, async () => {
                cat = await openCategory(page, app, {name: CAT.neighbour});
                return {pictures: await pictures(page, cat.root())};
            });
            await step(`n "${CAT.neighbour}" close again`, () => cat.close());
            fact('n stored (database)', storedCategory(CAT.neighbour === 'Biology' ? 'biology' : 'social-sciences'));
        }
    } finally {
        record(name(MODE === 'walk' ? `facts-${PART}` : `${MODE}-facts`), facts);
        await close();
    }
});
