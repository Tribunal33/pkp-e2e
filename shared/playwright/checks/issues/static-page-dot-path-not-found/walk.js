// Issue report walk: docs/issues/U09-A10-static-page-dot-path-not-found.md
// (spec U09 register A10). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
// the manager `rvaca` ticks "Static Pages Plugin" on Settings › Website ›
// "Plugins", reloads, adds three static pages on the "Static Pages" tab whose
// "Path" holds a "." in its first, second and third part, follows the list's
// "Path" link of the first and types the other two addresses; then adds two
// "Custom Page" items on "Setup" › "Navigation" (a "." in the first part, and
// in the third) and opens their addresses. OPS has no Static Pages plugin: it
// walks the custom page steps alone. Step numbers are the report's. The kit
// builds nothing. Records every screen with screen(), each save's answer and
// each address's status, title and heading.
//
// `neighbour` as the argument walks the neighbour check for the fix instead:
// a static page "u09a10plain" and a custom page "u09a10-cplain" (no "."), each
// read at its own address, with "/index" added, and with a stray "." typed
// into it ("u09a10.plain", "u09a10-c.plain"); the built-in "About" pages; an
// address with a "." no page holds. Walked with the fix in and out.
//
// Run (main, then stable-3_5_0); reset the fleet first, the walk changes the
// dataset:
//   npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
//   PROBE_FEATURE=issues-ir1 PROBE_AGENT=u09a10 node bin/probe.js all shared/playwright/checks/issues/static-page-dot-path-not-found/walk.js [neighbour]
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u09a10 node bin/probe.js all shared/playwright/checks/issues/static-page-dot-path-not-found/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, idle, loc} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEIGHBOUR = process.argv.includes('neighbour');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const hasStatic = app.name !== 'ops';
    const facts = {line: app.line || 'main', part: NEIGHBOUR ? 'neighbour' : 'steps'};
    const SUF = NEIGHBOUR ? '-nb' : '';
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };

    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (p, name, extra = {}) => { const s = await screen(p); record(`${String(++n).padStart(2, '0')}-${name}${SUF}`, {...s, ...extra}); return s; };
    const ctx = (p) => app.url(`/index.php/${app.contextPath}/en/${p}`);

    const read = async (p, name) => {
        const d = await p.evaluate(() => {
            const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
            return {
                title: document.title,
                heading: t(document.querySelector('.pkp_structure_main h1, .pkp_structure_main h2')),
                body: t(document.body) ? t(document.body).slice(0, 160) : null,
            };
        }).catch((e) => ({error: String(e.message || e)}));
        await snap(p, name, d);
        return d;
    };
    const open = async (address, name) => {
        const r = await page.goto(ctx(address)).catch(() => null);
        await idle(page).catch(() => {});
        return {address, status: r ? r.status() : null, ...(await read(page, name))};
    };

    // --- Static Pages: the plugin, the tab, the window
    const websiteURL = ctx('management/settings/website');
    const openTab = async (id) => { await page.locator(`#${id}-button`).first().click(); await idle(page); await pause(500); };
    const enableStaticPages = async () => {
        await page.goto(websiteURL); await idle(page);
        await openTab('plugins');
        const row = page.locator('tr.gridRow[id$="-row-staticpagesplugin"]').first();
        await row.waitFor({timeout: T});
        const box = row.getByRole('checkbox').first();
        await loc(page, 'Plugins: the "Static Pages Plugin" checkbox', box);
        const w = page.waitForResponse((r) => /plugin-grid\/enable/.test(r.url()), {timeout: T}).catch(() => null);
        if (!(await box.isChecked())) await box.click();
        const r = await w;
        await pause(800); await idle(page);
        await snap(page, 'plugin-ticked');
        await page.goto(websiteURL); await idle(page);                                    // reload
        await openTab('staticPages');
        await page.locator('#staticPageGridContainer').first().waitFor({timeout: T});
        await idle(page);
        return {enable: r ? r.status() : null, checked: await box.isChecked().catch(() => null)};
    };
    const container = () => page.locator('#staticPageGridContainer');
    const addStaticPage = async (title, p) => {
        const add = container().getByRole('link', {name: 'Add Static Page', exact: true}).first();
        await loc(page, 'Static Pages tab: "Add Static Page"', add);
        const form = page.locator('[role="dialog"]:visible form#staticPageForm').last();
        for (let i = 0; i < 3 && !(await form.isVisible().catch(() => false)); i++) {
            await add.click();
            await form.waitFor({timeout: 6000}).catch(() => {});
        }
        await idle(page);
        await form.locator('input[name="title[en]"]').fill(title);
        await form.locator('input[name="path"]').fill(p);
        await form.locator('input[name="path"]').blur();
        const win = page.locator('[role="dialog"]:visible').filter({has: page.locator('form#staticPageForm')}).last();
        const save = win.getByRole('button', {name: 'Save', exact: true});
        await loc(page, 'Static page window: "Save"', save);
        await snap(page, `static-window-${p.replace(/\W+/g, '_')}`);
        const w = page.waitForResponse((r) => /update-?static-?page/i.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await save.click();
        const r = await w;
        await idle(page); await pause(800);
        const stillOpen = await form.isVisible().catch(() => false);
        const errors = stillOpen ? await form.locator('label.error').allInnerTexts().catch(() => []) : [];
        return {path: p, status: r ? r.status() : null, windowOpen: stillOpen, errors};
    };
    const listed = async () => container().locator('tr.gridRow').evaluateAll((rows) => rows.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.replace(/\s+/g, ' ').trim())));
    const followPathLink = async (title, name) => {
        const row = container().locator('tr.gridRow').filter({hasText: title}).first();
        const link = row.locator('td').nth(1).getByRole('link').first();
        await loc(page, `Static Pages list: the "Path" link of "${title}"`, link);
        const [popup] = await Promise.all([
            page.context().waitForEvent('page', {timeout: T}).catch(() => null),
            link.click(),
        ]);
        if (!popup) return {popup: false};
        const resp = await popup.waitForEvent('response', {predicate: (r) => r.request().isNavigationRequest(), timeout: T}).catch(() => null);
        await popup.waitForLoadState('load').catch(() => {});
        const out = {popup: true, url: popup.url().replace(app.baseURL, ''), status: resp ? resp.status() : null, ...(await read(popup, name))};
        await popup.close();
        return out;
    };

    // --- Custom Page items: Setup › Navigation
    const itemWindow = () => page.locator('[role="dialog"]:visible').filter({has: page.locator('form#navigationMenuItemsForm')}).first();
    const openNavigation = async () => {
        await page.goto(ctx('management/settings/website#setup/navigationMenus'));
        await idle(page);
        await page.locator('table[id^="component-grid-navigationmenus-navigationmenuitemsgrid-"]').first().waitFor({timeout: T});
        await idle(page); await pause(300);
    };
    const addCustomPage = async (title, p) => {
        const add = page.getByRole('link', {name: 'Add item', exact: true}).first();
        await loc(page, 'Navigation: "Add item"', add);
        await add.click();
        const type = itemWindow().locator('select[name="menuItemType"]');
        await type.waitFor({timeout: T});
        await idle(page); await pause(500);
        await itemWindow().locator('input[name="title[en]"]').fill(title);
        await type.selectOption({label: 'Custom Page'});
        await pause(400);
        await itemWindow().locator('input[name="path"]').fill(p);
        await itemWindow().locator('input[name="path"]').blur();
        await snap(page, `item-window-${p.replace(/\W+/g, '_')}`);
        const save = itemWindow().getByRole('button', {name: 'Save', exact: true});
        await loc(page, 'Navigation item window: "Save"', save);
        const w = page.waitForResponse((r) => /update-navigation-menu-item/.test(r.url()), {timeout: T}).catch(() => null);
        await save.click();
        const r = await w;
        await idle(page); await pause(900);
        const open = await itemWindow().isVisible().catch(() => false);
        const errors = open ? await itemWindow().locator('label.error').allInnerTexts().catch(() => []) : [];
        const s = await snap(page, `item-saved-${p.replace(/\W+/g, '_')}`);
        return {path: p, status: r ? r.status() : null, windowOpen: open, errors, notices: s.notices};
    };
    const items = async () => page.locator('table[id^="component-grid-navigationmenus-navigationmenuitemsgrid-"] tr.gridRow td:first-child').allInnerTexts().then((a) => a.map((t) => flat(t, 60)));

    try {
        await signIn(page, 'rvaca', {contextPath: app.contextPath});                                 // 1
        if (!NEIGHBOUR) {
            if (hasStatic) {
                fact('step2-3-enable', await enableStaticPages());                                    // 2, 3
                fact('step4-save', await addStaticPage('u09a10 first', 'u09a10.html'));               // 4
                fact('step5-save', await addStaticPage('u09a10 second', 'u09a10/fees.html'));         // 5
                fact('step6-save', await addStaticPage('u09a10 third', 'u09a10/info/fees.html'));     // 6
                fact('list', await listed());
                await snap(page, 'static-list');
                fact('step7-path-link', await followPathLink('u09a10 first', 'step7-first'));         // 7
                fact('step8-second', await open('u09a10/fees.html', 'step8-second'));                 // 8
                fact('step9-third', await open('u09a10/info/fees.html', 'step9-third'));              // 9
            }
            await openNavigation();
            fact('step10-save', await addCustomPage('u09a10 custom', 'u09a10-custom.html'));          // 10
            fact('step11-save', await addCustomPage('u09a10 custom deep', 'u09a10-custom/a/page.html')); // 11
            fact('items', await items());
            fact('step12-custom', await open('u09a10-custom.html', 'step12-custom'));                 // 12
            fact('step13-custom-deep', await open('u09a10-custom/a/page.html', 'step13-custom-deep')); // 13
        } else {
            if (hasStatic) {
                fact('nb-enable', await enableStaticPages());
                fact('nb-static-save', await addStaticPage('u09a10 plain', 'u09a10plain'));
                fact('nb-static-own', await open('u09a10plain', 'nb-static-own'));
                fact('nb-static-index', await open('u09a10plain/index', 'nb-static-index'));
                fact('nb-static-stray-dot', await open('u09a10.plain', 'nb-static-stray-dot'));
            }
            await openNavigation();
            fact('nb-custom-save', await addCustomPage('u09a10 cplain', 'u09a10-cplain'));
            fact('nb-custom-own', await open('u09a10-cplain', 'nb-custom-own'));
            fact('nb-custom-stray-dot', await open('u09a10-c.plain', 'nb-custom-stray-dot'));
            fact('nb-about', await open('about', 'nb-about'));
            fact('nb-about-masthead', await open('about/editorialMasthead', 'nb-about-masthead'));
            fact('nb-about-dot', await open('ab.out', 'nb-about-dot'));
            fact('nb-nothing', await open('u09a10.nothing', 'nb-nothing'));
        }
        await signOut(page);
    } finally {
        record(`facts${SUF}`, facts);
        await close();
    }
});
