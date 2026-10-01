// Issue report walk: docs/issues/U09-A3-static-page-no-breadcrumbs-main-heading.md
// (spec U09 register A3). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
// the manager `rvaca` ticks "Static Pages Plugin" on Settings › Website ›
// "Plugins", reloads, opens "Static Pages", adds "About us" (path "about-us"),
// presses "Preview" and saves; adds a "Custom Page" navigation item "Our
// policies" as the control; signs out and opens both pages and "About the
// Journal". Step numbers are the report's. The kit builds nothing. Records
// every screen with screen(), and for each public page its breadcrumb trail
// (nav.cmp_breadcrumbs), the headings in the main column, and the number of
// <h1> on the whole page.
//
// `neighbour` as the argument walks the neighbour check for the fix instead: a
// static page whose "Content" holds the {$contactName} tag, opened signed out
// at its French address (/fr_CA/…), then the custom page and "About the
// Journal" again. Walked with the fix in and out: only the static page's
// breadcrumb trail and heading level may differ; the tab title, the tag's
// replacement and the other two pages read the same.
//
// Run (main, then stable-3_5_0); reset the fleet first, the walk changes the
// dataset:
//   npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
//   ONLY=ojs,omp PROBE_FEATURE=issues-ir1 PROBE_AGENT=u09a3 node bin/probe.js all shared/playwright/checks/issues/static-page-no-breadcrumbs-main-heading/walk.js [neighbour]
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//   ONLY=ojs,omp PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u09a3 node bin/probe.js all shared/playwright/checks/issues/static-page-no-breadcrumbs-main-heading/walk.js
//   (OPS has no Static Pages plugin; the script skips it)
const {forEachApp, launch, signIn, signOut, screen, record, idle, loc} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEIGHBOUR = process.argv.includes('neighbour');

/** What a visitor's page shows: the trail, the headings of the main column, the h1 count. */
const layoutOf = (p) => p.evaluate(() => {
    const t = (e) => e.innerText.replace(/\s+/g, ' ').trim();
    const main = document.querySelector('.pkp_structure_main') || document.body;
    const crumbs = document.querySelector('nav.cmp_breadcrumbs');
    return {
        url: location.pathname,
        title: document.title,
        breadcrumbs: crumbs ? t(crumbs) : null,
        headings: [...main.querySelectorAll('h1,h2,h3')].map((h) => `${h.tagName.toLowerCase()}${h.className ? '.' + h.className.split(' ').join('.') : ''}: ${t(h)}`),
        h1OnPage: [...document.querySelectorAll('h1')].map((h) => `${h.className || '-'}: ${t(h)}`),
        pageText: t(main.querySelector('.page') || main).slice(0, 200),
    };
});

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    if (app.name === 'ops') { console.log('[ops] no Static Pages plugin: skipped'); return; }
    const facts = {line: app.line || 'main', part: NEIGHBOUR ? 'neighbour' : 'steps'};
    const SUF = NEIGHBOUR ? '-nb' : '';
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };

    const {page, close} = await launch(app);
    const scriptErrors = [];
    page.on('pageerror', (e) => scriptErrors.push(flat(e.message)));

    let n = 0;
    const snap = async (p, name) => { const s = await screen(p); record(`${String(++n).padStart(2, '0')}-${name}${SUF}`, s); return s; };
    const ctx = (p, locale = 'en') => app.url(`/index.php/${app.contextPath}/${locale}/${p}`);
    const websiteURL = ctx('management/settings/website');
    const openWebsite = async () => { await page.goto(websiteURL); await idle(page); await pause(1500); };
    const openTab = async (id) => { await page.locator(`#${id}-button`).first().click(); await idle(page); await pause(500); };

    /** Type into a window's English "Content" box (TinyMCE). */
    const typeContent = async (win, text) => {
        const taId = await win.locator('textarea[name="content[en]"]').first().getAttribute('id');
        await page.waitForFunction((x) => window.tinymce && window.tinymce.get(x) && window.tinymce.get(x).initialized, taId, {timeout: T});
        await pause(400);
        await page.frameLocator(`[id="${taId}_ifr"]`).locator('body').click();
        await page.keyboard.type(text);
        await win.locator('input[name="path"]').click();
        await pause(400);
    };
    const save = async (win, re, name) => {
        const btn = win.getByRole('button', {name: 'Save', exact: true}).first();
        await loc(page, `${name}: "Save"`, btn);
        const w = page.waitForResponse((r) => re.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await btn.click();
        const r = await w;
        await idle(page); await pause(1500);
        await snap(page, `${name}-saved`);
        return {status: r ? r.status() : null, windowOpen: await win.isVisible().catch(() => false)};
    };
    /** A signed-out visitor types the page's address. */
    const visit = async (path, name, locale) => {
        const r = await page.goto(locale ? ctx(path, locale) : app.url(`/index.php/${app.contextPath}/${path}`));
        await idle(page);
        await snap(page, name);
        return {status: r ? r.status() : null, ...(await layoutOf(page))};
    };

    const enable = async () => {
        await openWebsite();                                                                    // 2
        await openTab('plugins');
        const row = page.locator('tr.gridRow[id$="-row-staticpagesplugin"]').first();
        await row.waitFor({timeout: T});
        const box = row.getByRole('checkbox').first();
        await loc(page, 'Plugins: the "Static Pages Plugin" checkbox', box);
        const w = page.waitForResponse((r) => /plugin-grid\/enable/.test(r.url()), {timeout: T}).catch(() => null);
        if (!(await box.isChecked())) await box.click();
        const r = await w;
        await pause(1000); await idle(page);
        await snap(page, 'plugin-ticked');
        await openWebsite();                                                                    // 3
        await openTab('staticPages');
        await page.locator('#staticPageGridContainer').first().waitFor({timeout: T});
        await idle(page);
        await snap(page, 'static-pages-tab');
        return {enable: r ? r.status() : null};
    };
    const addStatic = async (path, title, content, withPreview) => {
        const add = page.locator('#staticPageGridContainer').getByRole('link', {name: 'Add Static Page', exact: true}).first();
        await loc(page, 'Static Pages tab: "Add Static Page"', add);
        const win = page.locator('[role="dialog"]:visible').filter({has: page.locator('form#staticPageForm')}).last();
        for (let i = 0; i < 3 && !(await win.isVisible().catch(() => false)); i++) {
            await add.click();
            await win.waitFor({timeout: 6000}).catch(() => {});
        }
        await idle(page); await pause(800);
        await win.locator('input[name="path"]').fill(path);                                     // 4
        await win.locator('input[name="title[en]"]').fill(title);
        await typeContent(win, content);
        await snap(page, 'static-window-filled');
        const out = {};
        if (withPreview) {                                                                       // 5
            const btn = win.getByRole('button', {name: 'Preview', exact: true}).or(win.getByRole('link', {name: 'Preview', exact: true})).first();
            await loc(page, 'Static page window: "Preview"', btn);
            const [popup] = await Promise.all([
                page.context().waitForEvent('page', {timeout: 10_000}).catch(() => null),
                btn.click(),
            ]);
            if (popup) {
                await popup.waitForLoadState('load').catch(() => {});
                await pause(1500);
                await snap(popup, 'static-preview-tab');
                out.preview = await layoutOf(popup).catch((e) => ({error: flat(e.message)}));
                await popup.close();
            } else out.preview = 'no new tab';
        }
        out.save = await save(win, /update-?static-?page/i, 'static-window');                  // 6
        return out;
    };
    const addCustomPage = async (title, path, content) => {                                     // 7
        await page.goto(ctx('management/settings/website#setup/navigationMenus'));
        await idle(page);
        await page.locator('table[id^="component-grid-navigationmenus-navigationmenuitemsgrid-"]').first().waitFor({timeout: T});
        await idle(page); await pause(500);
        const add = page.getByRole('link', {name: 'Add item', exact: true}).first();
        await loc(page, 'Navigation: "Add item"', add);
        await add.click();
        const win = page.locator('[role="dialog"]:visible').filter({has: page.locator('form#navigationMenuItemsForm')}).first();
        await win.locator('select[name="menuItemType"]').waitFor({timeout: T});
        await idle(page); await pause(600);
        await win.locator('input[name="title[en]"]').fill(title);
        await win.locator('select[name="menuItemType"]').selectOption({label: 'Custom Page'});
        await pause(400);
        await win.locator('input[name="path"]').fill(path);
        await typeContent(win, content);
        return save(win, /update-navigation-menu-item/, 'custom-page-window');
    };

    try {
        await signIn(page, 'rvaca', {contextPath: app.contextPath});                             // 1
        fact('steps2-3-enable', await enable());
        if (!NEIGHBOUR) {
            fact('steps4-6-static-page', await addStatic('about-us', 'About us', 'Welcome to our journal.', true));
            fact('step7-custom-page', await addCustomPage('Our policies', 'our-policies', 'Our policies.'));
            await signOut(page);                                                                  // 8
            fact('step8-static-page', await visit('about-us', 'step8-static-page'));
            fact('step9-custom-page', await visit('our-policies', 'step9-custom-page'));          // 9
            fact('step10-about', await visit('about', 'step10-about'));                           // 10
        } else {
            fact('nb-static-page', await addStatic('u09a3-contact', 'Contact u09a3', 'Write to {$contactName}.', false));
            fact('nb-custom-page', await addCustomPage('Policies u09a3', 'u09a3-policies', 'Policies u09a3.'));
            await signOut(page);
            fact('nb-static-fr', await visit('u09a3-contact', 'nb-static-fr', 'fr_CA'));
            fact('nb-static-en', await visit('u09a3-contact', 'nb-static-en', 'en'));
            fact('nb-custom-page-visit', await visit('u09a3-policies', 'nb-custom-page', 'en'));
            fact('nb-about', await visit('about', 'nb-about', 'en'));
        }
        fact('script-errors', scriptErrors);
    } finally {
        record(`facts${SUF}`, facts);
        await close();
    }
});
