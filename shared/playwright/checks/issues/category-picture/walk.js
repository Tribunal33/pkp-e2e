// Issue reports for U16 A6, A7, OMP1 and A17 (the category picture). Takes the reports' Steps on PKP's default
// test dataset (a dataset fleet), as `rvaca`:
//   PART=picture  (A6, A7, OMP1)  Settings › Journal (Press, Server) › "Categories", "Applied Science" › "Edit",
//                 "Cover Image" a 400 × 400 PNG, "Alternate text" "u16c3 picture", "Save"; then the category's page
//                 (catalog/category/applied-science, OPS preprints/…): the picture's markup, its alt, whether it is
//                 a link, its drawn and natural size, a press on it; then the full-size and small-copy addresses
//                 the markup names, typed.
//   PART=upload   (A17)  "Social Sciences" › "Edit", "Cover Image" a text file named not-an-image.png: the window's
//                 previews, any request for "[object Event]", then "Save".
//   (default: both)
// On stable-3_5_0 the category window is the older form (form#categoryForm, a plupload "Upload" box, no alternate
// text, "OK"), so PART=picture takes it there and PART=upload, which needs the newer upload box, takes the same
// box where 3.5 has it: Settings › Website › "Appearance" › "Logo" (nothing saved).
// Neighbour modes (fix in and out), each alone:
//   WALK=nb-series    {OMP}  Settings › Press › "Series", "History" › Edit, cover image the PNG, "Save"; the
//                     series page (catalog/series/his): its picture loads.
//   WALK=nb-template  "Social Sciences" › Edit, the PNG with "Alternate text" left empty, "Save"; its page's picture
//                     alt and wrapper; "Computer Science"'s page (no picture): no picture block.
//   WALK=nb-upload    "Social Sciences" › Edit, the real PNG: the window previews it and "Save" saves it.
//
// Reset first:  npm run fleet-prep -- --feature issues-c3 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-c3 PROBE_AGENT=c3 node bin/probe.js all shared/playwright/checks/issues/category-picture/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-c3-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-c3-3_5 PROBE_AGENT=c3 node bin/probe.js all shared/playwright/checks/issues/category-picture/walk.js
const path = require('path');
const {forEachApp, launch, signIn, screen, record, shot, idle, sql} = require('../../../probe');

const MODE = process.env.WALK || 'walk';
const PART = process.env.PART || 'all';
const T = 30_000;
const FILES = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files');
const PICTURE = path.join(FILES, 'profile-image-400.png'); // a real 400 × 400 PNG
const NOT_A_PICTURE = path.join(FILES, 'not-an-image.png'); // a plain text file named .png

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const line = app.line || 'main';
    const legacy = line !== 'main';
    const {CategoriesTab, CategoryWindow} = require('../../../pages/CategoriesPages.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `catpic-${s}${run}`;
    const facts = {app: app.name, line, mode: MODE, part: PART, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const {page, close} = await launch(app);
    const step = async (label, action) => {
        try {
            const out = await action();
            fact(label, out === undefined ? 'done' : out);
            return out;
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
            return null;
        } finally {
            await idle(page).catch(() => null);
        }
    };
    const tidy = (t) => String(t).replace(/\s+/g, ' ').trim();
    const word = app.name === 'ops' ? 'preprints' : 'catalog';
    const ctx = app.contextPath;
    const categories = new CategoriesTab(page, ctx);
    // The category the picture steps use: "Applied Science" (applied-science); the OPS 3.5 dataset has none, so
    // there "Social sciences" (social-sciences).
    const hasPath = (p) => !!sql(app, `SELECT category_id FROM categories WHERE path = '${p}'`).trim();
    const pic = hasPath('applied-science')
        ? {name: 'Applied Science', path: 'applied-science'}
        : {name: 'Social sciences', path: 'social-sciences'};
    const picId = sql(app, `SELECT category_id FROM categories WHERE path = '${pic.path}'`).trim();
    fact('picture category', {...pic, id: picId});

    // The journal's (press's, server's) own public folder: creating a context makes it (ContextService::add(),
    // installFileDirs), but PKP's dataset dump leaves it out (its public/ holds only index.html: git keeps no
    // empty folder). Without it the category window's first picture gets no small copy at all (the thumbnail is
    // written before anything makes the folder), so the walk makes it, as a journal created on screen has it.
    {
        const fs = require('fs');
        const conf = fs.readFileSync(path.join(app.root, path.basename(app.configFile)), 'utf8');
        const publicDir = (conf.match(/^public_files_dir\s*=\s*"?([^"\n]+?)"?\s*$/m) || [])[1];
        const ctxDir = {ojs: 'journals', omp: 'presses', ops: 'contexts'}[app.name];
        const t = app.contextTables;
        const ctxId = sql(app, `SELECT ${t.id} FROM ${t.table} WHERE path = '${ctx}'`).trim();
        const dir = path.join(path.isAbsolute(publicDir) ? publicDir : path.join(app.root, publicDir), ctxDir, ctxId);
        const existed = fs.existsSync(dir);
        fs.mkdirSync(dir, {recursive: true});
        fact('context public folder', {dir: path.relative(app.root, dir), existed});
    }

    // Every request the page sends whose address carries "object" ("[object Event]").
    const odd = [];
    page.on('response', (r) => {
        if (/object(%20|\s)Event|\[object/i.test(r.url())) odd.push({url: r.url(), status: r.status()});
    });

    // ---- the category window, main (Vue side window) and 3.5 (older form) ----
    const openEditMain = async (catName) => {
        await categories.goto();
        return categories.openEdit(catName);
    };
    const openEditLegacy = async (catName) => {
        await page.goto(categories.url());
        await page.locator('#categories-button').click();
        await page.locator('#categoriesContainer table').first().waitFor({timeout: T});
        await idle(page);
        // On 3.5 the category's name in the list is the link that opens its window.
        await page.locator('#categoriesContainer a.pkp_linkaction_editCategory').filter({hasText: new RegExp(`^\\s*${catName}\\s*$`)}).first().click();
        await page.locator('form#categoryForm [name="name[en]"]').waitFor({timeout: T});
        await idle(page);
    };
    const savedNoticeText = async () =>
        (await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => [])).map(tidy);

    // Put a picture in a category and save: main the Vue window with its "Alternate text", 3.5 the older form.
    const setPicture = async (catName, file, altText) => {
        if (!legacy) {
            const win = await openEditMain(catName);
            const up = await win.uploadCover(file);
            if (altText !== null) await win.altTextBox().fill(altText);
            const saved = await win.save();
            await idle(page);
            const body = await saved.json().catch(() => null);
            await page.waitForTimeout(500);
            return {
                upload: up.status(),
                save: saved.status(),
                storedImage: body && body.image ? body.image : null,
                windowOpen: await win.root().isVisible().catch(() => false),
                notices: await savedNoticeText(),
            };
        }
        await openEditLegacy(catName);
        const uploaded = page.waitForResponse((r) => /upload-?[Ii]mage/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
        await page.locator('form#categoryForm #plupload input[type=file]').setInputFiles(file);
        const up = await uploaded;
        await idle(page);
        const saved = page.waitForResponse((r) => /update-?[Cc]ategory/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
        await page.locator('form#categoryForm').getByRole('button', {name: 'OK', exact: true}).click();
        const s = await saved;
        await idle(page);
        return {upload: up.status(), save: s.status(), altTextBox: 'none on this line', windowOpen: await page.locator('form#categoryForm').isVisible().catch(() => false)};
    };

    // The category's page: the picture block as the browser has it.
    const readCategoryPage = async (catPath) => {
        const address = app.url(`/index.php/${ctx}/${word}/category/${catPath}`);
        let res = null;
        let firstOpening = 'loaded';
        try {
            res = await page.goto(address);
        } catch (e) {
            // A press's first category page after a settings save fails to load (U16 OMP5): open it again.
            firstOpening = String(e.message).split('\n')[0];
            await page.waitForTimeout(3_000);
            res = await page.goto(address);
        }
        await idle(page);
        await page.locator('.about_section .cover img').first().evaluate((img) => img.decode && img.decode().catch(() => null)).catch(() => null);
        await page.waitForTimeout(500);
        const block = await page.evaluate(() => {
            const cover = document.querySelector('.about_section .cover');
            if (!cover) return {cover: null};
            const img = cover.querySelector('img');
            return {
                cover: {tag: cover.tagName.toLowerCase(), href: cover.getAttribute('href'), outerHTML: cover.outerHTML.replace(/\s+/g, ' ').slice(0, 600)},
                insideLink: !!(img && img.closest('a')),
                img: img && {
                    src: img.getAttribute('src'),
                    alt: img.getAttribute('alt'),
                    complete: img.complete,
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                    width: img.clientWidth,
                    height: img.clientHeight,
                },
            };
        });
        const aria = await page.locator('.about_section').first().ariaSnapshot().catch((e) => `no read: ${e.message}`);
        return {firstOpening, status: res && res.status(), url: page.url(), block, aria};
    };

    // Type an address: status, type and size of what answers.
    const typeAddress = async (address) => {
        const res = await page.goto(address).catch((e) => ({error: e.message}));
        if (!res || res.error) return {address, error: res && res.error};
        const body = await res.body().catch(() => Buffer.alloc(0));
        return {address, status: res.status(), contentType: res.headers()['content-type'] || null, bytes: body.length};
    };

    try {
        await step('1 sign in as rvaca', async () => {
            await signIn(page, 'rvaca');
            return page.url();
        });

        if (MODE === 'walk' && (PART === 'all' || PART === 'picture')) {
            await step(`2-5 ${pic.name}: Cover Image, Alternate text, Save`, () => setPicture(pic.name, PICTURE, legacy ? null : 'u16c3 picture'));
            const pageRead = await step('6 the category page: the picture block', () => readCategoryPage(pic.path));
            record(name('page'), await screen(page));
            await shot(page, name('page'));
            await step('6 press the picture', async () => {
                const before = page.url();
                const img = page.locator('.about_section .cover img').first();
                if (!(await img.count())) return {pressed: false, reason: 'no picture on the page'};
                await img.click({timeout: 5_000, force: true});
                await page.waitForTimeout(2_000);
                return {before, after: page.url(), changed: before !== page.url(), pages: page.context().pages().length};
            });
            const block = pageRead && pageRead.block;
            const full = (block && block.cover && block.cover.href) || app.url(`/index.php/${ctx}/${word}/fullSize?type=category&id=${picId}`);
            const thumb = (block && block.img && block.img.src) || app.url(`/index.php/${ctx}/${word}/thumbnail?type=category&id=${picId}`);
            await step('7 type the full-size address the markup names', () => typeAddress(full));
            await step('7 type the small copy\'s address', () => typeAddress(thumb));
        }

        if (MODE === 'walk' && (PART === 'all' || PART === 'upload')) {
            if (!legacy) {
                const win = await step('8 Social Sciences: Edit', async () => {
                    const w = await openEditMain('Social Sciences');
                    return {heading: await w.heading().innerText().catch(() => null)};
                }) && new CategoryWindow(page, 'Edit Category');
                await step('9 Cover Image: not-an-image.png', async () => {
                    const uploaded = page.waitForResponse((r) => /temporaryFiles/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
                    await win.coverInput().setInputFiles(NOT_A_PICTURE);
                    const up = await uploaded;
                    await idle(page);
                    await page.waitForTimeout(2_000);
                    const previews = await win.root().locator('img').evaluateAll((imgs) =>
                        imgs.map((i) => ({
                            cls: i.className,
                            src: (i.getAttribute('src') || '').slice(0, 60),
                            complete: i.complete,
                            naturalWidth: i.naturalWidth,
                            shown: !!(i.offsetWidth || i.offsetHeight),
                            width: i.offsetWidth,
                            height: i.offsetHeight,
                        }))
                    );
                    return {
                        upload: up.status(),
                        altTextBox: await win.altTextBox().isVisible().catch(() => false),
                        fieldErrors: (await win.fieldErrors('Cover Image').allInnerTexts().catch(() => [])).map(tidy),
                        previews,
                        oddRequests: odd.slice(),
                    };
                });
                await shot(page, name('upload'));
                record(name('upload'), await screen(page));
                await step('10 Save', async () => {
                    const saved = await win.save();
                    await idle(page);
                    await page.waitForTimeout(500);
                    return {
                        save: saved.status(),
                        windowOpen: await win.root().isVisible().catch(() => false),
                        fieldErrors: (await win.fieldErrors('Cover Image').allInnerTexts().catch(() => [])).map(tidy),
                        errorSummary: tidy(await win.errorSummary().innerText().catch(() => '')),
                        notices: await savedNoticeText(),
                    };
                });
            } else {
                // 3.5: the category window has the older upload box; the same newer box is Appearance › "Logo".
                await step('8 (3.5) Settings › Website › Appearance › Logo', async () => {
                    await page.goto(app.url(`/index.php/${ctx}/management/settings/website`));
                    await idle(page);
                    await page.locator('#appearance-button').click();
                    await idle(page);
                    if (await page.locator('#appearance-setup-button').count()) await page.locator('#appearance-setup-button').click();
                    await idle(page);
                    const field = page.locator('#appearance-setup .pkpFormField--uploadImage').first();
                    await field.waitFor({timeout: T});
                    return {field: tidy((await field.innerText()).slice(0, 120))};
                });
                await step('9 (3.5) Logo: not-an-image.png', async () => {
                    const field = page.locator('#appearance-setup .pkpFormField--uploadImage').first();
                    const uploaded = page.waitForResponse((r) => /temporaryFiles/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
                    await field.locator('input[type=file]').first().setInputFiles(NOT_A_PICTURE);
                    const up = await uploaded;
                    await idle(page);
                    await page.waitForTimeout(2_000);
                    const previews = await field.locator('img').evaluateAll((imgs) =>
                        imgs.map((i) => ({cls: i.className, src: (i.getAttribute('src') || '').slice(0, 60), complete: i.complete, naturalWidth: i.naturalWidth, shown: !!(i.offsetWidth || i.offsetHeight), width: i.offsetWidth, height: i.offsetHeight}))
                    );
                    return {upload: up.status(), previews, oddRequests: odd.slice()};
                });
                await shot(page, name('upload'));
            }
        }

        if (MODE === 'nb-series') {
            if (app.name !== 'omp') {
                fact('nb-series', 'press only');
            } else {
                await step('nb series: History, cover image, Save', async () => {
                    const {SectionsTab} = require('../../../pages/SectionsPages.js');
                    const series = new SectionsTab(page, ctx, {tab: 'Series', addLabel: 'Add Series'});
                    await series.goto();
                    const win = await series.openEdit('History');
                    const uploaded = page.waitForResponse((r) => /upload-?[Ii]mage/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
                    await win.form().locator('#plupload input[type=file]').setInputFiles(PICTURE);
                    const up = await uploaded;
                    await idle(page);
                    const saved = page.waitForResponse((r) => /update-?[Ss]eries/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
                    await win.saveButton().click();
                    const s = await saved;
                    await idle(page);
                    return {upload: up.status(), save: s.status()};
                });
                const sp = await step('nb series page: the picture', async () => {
                    // The dataset's "History" series has the path "his".
                    const seriesPath = sql(app, `SELECT s.path FROM series s JOIN series_settings t ON t.series_id = s.series_id AND t.setting_name = 'title' AND t.locale = 'en' WHERE t.setting_value = 'History'`).trim();
                    const res = await page.goto(app.url(`/index.php/${ctx}/catalog/series/${seriesPath}`));
                    await idle(page);
                    await page.waitForTimeout(500);
                    return {
                        status: res && res.status(),
                        url: page.url(),
                        heading: await page.locator('h1').first().innerText().catch(() => null),
                        img: await page.evaluate(() => {
                            const img = document.querySelector('.about_section .cover img');
                            return img && {src: img.getAttribute('src'), complete: img.complete, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight};
                        }),
                    };
                });
                if (sp && sp.img) await step('nb series: type the small copy\'s address', () => typeAddress(sp.img.src));
            }
        }

        if (MODE === 'nb-template') {
            // A top-level category, so its row is in the tab without opening a parent.
            await step('nb template: Social Sciences, picture, Alternate text empty, Save', () => setPicture('Social Sciences', PICTURE, legacy ? null : ''));
            await step('nb template: Social Sciences page', () => readCategoryPage('social-sciences'));
            await step('nb template: Computer Science page (no picture)', () => readCategoryPage('comp-sci'));
            const csId = (await sql(app, `SELECT category_id FROM categories WHERE path = 'comp-sci'`)).trim();
            await step('nb template: type the small-copy address of Computer Science (no picture)', () =>
                typeAddress(app.url(`/index.php/${ctx}/${word}/thumbnail?type=category&id=${csId}`))
            );
        }

        if (MODE === 'nb-upload') {
            if (legacy) {
                fact('nb-upload', 'main only');
            } else {
                const win = await openEditMain('Social Sciences');
                await step('nb upload: Cover Image, a real PNG', async () => {
                    const up = await win.uploadCover(PICTURE);
                    await page.waitForTimeout(1_500);
                    const previews = await win.root().locator('img.pkpFormField--uploadImage__thumbnail').evaluateAll((imgs) =>
                        imgs.map((i) => ({src: (i.getAttribute('src') || '').slice(0, 40), complete: i.complete, naturalWidth: i.naturalWidth, shown: !!(i.offsetWidth || i.offsetHeight)}))
                    );
                    return {upload: up.status(), previews, oddRequests: odd.slice()};
                });
                await step('nb upload: Save', async () => {
                    const saved = await win.save();
                    await idle(page);
                    const body = await saved.json().catch(() => null);
                    return {save: saved.status(), image: body && body.image ? {uploadName: body.image.uploadName, thumbnailName: body.image.thumbnailName} : null};
                });
                await step('nb upload: Social Sciences page', () => readCategoryPage('social-sciences'));
            }
        }
    } finally {
        facts.oddRequests = odd;
        record(name(`facts-${MODE}-${PART}`), facts);
        await close();
    }
});
