// Issue report walk: docs/issues/U09-A11-static-page-refusal-notice-repeated.md
// (spec U09 register A11). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
// the manager `rvaca` ticks "Static Pages Plugin" on Settings › Website ›
// "Plugins", reloads, opens "Static Pages", presses "Add Static Page", saves a
// "Path" with a space (refused), corrects it and saves again; then adds a page
// on the path just used (refused), closes the window with its back arrow and
// reloads Settings › Website. Step numbers are the report's. The kit builds
// nothing. Records every screen with screen() (its `notices` are the page
// notices at the top right), each save's answer, the messages under the boxes,
// any notice inside the window, and each notification fetch's answer.
//
// `neighbour` as the argument walks the neighbour check for the fix instead:
// a static page saved with nothing refused before it (no notice, no notice in
// the window), and on "Setup" › "Navigation" a "Custom Page" item refused for
// its "Path" and then saved (a pkp-lib form that already carries an in-place
// notice area). Walked with the fix in and out, the two must read the same.
//
// `more` walks the report's "More refusals" instead: two refusals in a row,
// then a good save (how many notices); a refusal, the window closed, then the
// Submissions page instead of Settings › Website.
//
// Run (main, then stable-3_5_0); reset the fleet first, the walk changes the
// dataset:
//   npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
//   ONLY=ojs,omp PROBE_FEATURE=issues-ir1 PROBE_AGENT=u09a11 node bin/probe.js all shared/playwright/checks/issues/static-page-refusal-notice-repeated/walk.js [neighbour | more]
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//   ONLY=ojs,omp PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u09a11 node bin/probe.js all shared/playwright/checks/issues/static-page-refusal-notice-repeated/walk.js
//   (OPS has no Static Pages plugin; the script skips it)
const {forEachApp, launch, signIn, signOut, screen, record, idle, loc} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEIGHBOUR = process.argv.includes('neighbour');
const MORE = process.argv.includes('more');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    if (app.name === 'ops') { console.log('[ops] no Static Pages plugin: skipped'); return; }
    const facts = {line: app.line || 'main', part: NEIGHBOUR ? 'neighbour' : MORE ? 'more' : 'steps'};
    const SUF = NEIGHBOUR ? '-nb' : MORE ? '-more' : '';
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };

    const {page, close} = await launch(app);
    const scriptErrors = [];
    page.on('pageerror', (e) => scriptErrors.push({kind: 'pageerror', text: flat(e.message)}));
    const fetches = [];
    page.on('response', async (r) => {
        if (!/notification\/fetchNotification/.test(r.url())) return;
        let body = null;
        try { body = await r.json(); } catch { body = null; }
        const c = body && body.content;
        const text = c ? flat([].concat(Object.values(c.general || {}), Object.values(c.inPlace || {})).map((x) => (typeof x === 'string' ? x.replace(/<[^>]+>/g, ' ') : JSON.stringify(x))).join(' | '), 400) : null;
        fetches.push({at: new Date().toISOString().slice(11, 19), options: flat(r.request().postData(), 160), status: r.status(), text});
    });
    const fetchesSince = (i) => fetches.slice(i);

    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}${SUF}`, {...s, ...extra}); return s; };
    const ctx = (p) => app.url(`/index.php/${app.contextPath}/en/${p}`);
    const websiteURL = ctx('management/settings/website');
    const openWebsite = async () => { await page.goto(websiteURL); await idle(page); await pause(1500); };
    const openTab = async (id) => { await page.locator(`#${id}-button`).first().click(); await idle(page); await pause(500); };
    const container = () => page.locator('#staticPageGridContainer');
    const win = () => page.locator('[role="dialog"]:visible').filter({has: page.locator('form#staticPageForm')}).last();
    const form = () => page.locator('[role="dialog"]:visible form#staticPageForm').last();
    const listed = async () => container().locator('tr.gridRow').evaluateAll((rows) => rows.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' · ')));
    const inWindowNotices = async () => form().locator('.pkp_notification').evaluateAll((ns) => ns.filter((x) => x.offsetParent !== null).map((x) => x.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);

    const enable = async () => {
        await openWebsite();                                                                    // 2
        await openTab('plugins');
        const row = page.locator('tr.gridRow[id$="-row-staticpagesplugin"]').first();
        await row.waitFor({timeout: T});
        const box = row.getByRole('checkbox').first();
        await loc(page, 'Plugins: the "Static Pages Plugin" checkbox', box);
        const w = page.waitForResponse((r) => /plugin-grid\/enable/.test(r.url()), {timeout: T}).catch(() => null);
        if (!(await box.isChecked())) await box.click();                                        // 3
        const r = await w;
        await pause(1000); await idle(page);
        const s = await snap('plugin-ticked');
        await openWebsite();                                                                    // 4
        await openTab('staticPages');
        await container().first().waitFor({timeout: T});
        await idle(page);
        return {enable: r ? r.status() : null, notices: s.notices};
    };
    const openAdd = async () => {
        const add = container().getByRole('link', {name: 'Add Static Page', exact: true}).first();
        await loc(page, 'Static Pages tab: "Add Static Page"', add);
        for (let i = 0; i < 3 && !(await form().isVisible().catch(() => false)); i++) {
            await add.click();
            await form().waitFor({timeout: 6000}).catch(() => {});
        }
        await idle(page); await pause(500);
    };
    const fillAndSave = async (name, {path, title}) => {
        if (title != null) await form().locator('input[name="title[en]"]').fill(title);
        await form().locator('input[name="path"]').fill(path);
        await form().locator('input[name="path"]').blur();
        const save = win().getByRole('button', {name: 'Save', exact: true});
        await loc(page, 'Static page window: "Save"', save);
        const f0 = fetches.length;
        const w = page.waitForResponse((r) => /update-?static-?page/i.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await save.click();
        const r = await w;
        let answer = null;
        if (r) { try { const j = await r.json(); answer = {status: j.status, event: j.event ? flat(JSON.stringify(j.event), 120) : undefined, content: j.content ? '(form html)' : undefined}; } catch { answer = null; } }
        await idle(page); await pause(2500);
        const open = await form().isVisible().catch(() => false);
        const errors = open ? await form().locator('label.error, .error').evaluateAll((es) => [...new Set(es.map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean))]).catch(() => []) : [];
        const inWindow = open ? await inWindowNotices() : [];
        const s = await snap(name);
        return {path, status: r ? r.status() : null, answer, windowOpen: open, errors, inWindow, notices: s.notices, fetches: fetchesSince(f0)};
    };
    const closeWindow = async () => {
        const back = win().getByRole('button', {name: 'Close', exact: true}).first();
        await loc(page, 'Static page window: the back arrow "Close"', back);
        const f0 = fetches.length;
        await back.click();
        await pause(1500); await idle(page);
        const s = await snap('window-closed');
        return {windowOpen: await form().isVisible().catch(() => false), notices: s.notices, fetches: fetchesSince(f0)};
    };

    // Navigation › "Custom Page" item (neighbour): a pkp-lib form with its own in-place notice area
    const itemWindow = () => page.locator('[role="dialog"]:visible').filter({has: page.locator('form#navigationMenuItemsForm')}).first();
    const navItem = async () => {
        await page.goto(ctx('management/settings/website#setup/navigationMenus'));
        await idle(page);
        await page.locator('table[id^="component-grid-navigationmenus-navigationmenuitemsgrid-"]').first().waitFor({timeout: T});
        await idle(page); await pause(500);
        await snap('navigation');
        const add = page.getByRole('link', {name: 'Add item', exact: true}).first();
        await loc(page, 'Navigation: "Add item"', add);
        await add.click();
        const type = itemWindow().locator('select[name="menuItemType"]');
        await type.waitFor({timeout: T});
        await idle(page); await pause(500);
        await itemWindow().locator('input[name="title[en]"]').fill('u09a11 Nav');
        await type.selectOption({label: 'Custom Page'});
        await pause(400);
        const saveAs = async (p, name) => {
            await itemWindow().locator('input[name="path"]').fill(p);
            await itemWindow().locator('input[name="path"]').blur();
            const save = itemWindow().getByRole('button', {name: 'Save', exact: true});
            await loc(page, 'Navigation item window: "Save"', save);
            const f0 = fetches.length;
            const w = page.waitForResponse((r) => /update-navigation-menu-item/.test(r.url()), {timeout: T}).catch(() => null);
            await save.click();
            const r = await w;
            await idle(page); await pause(2500);
            const open = await itemWindow().isVisible().catch(() => false);
            const errors = open ? await itemWindow().locator('label.error').allInnerTexts().catch(() => []) : [];
            const inWindow = open ? await itemWindow().locator('.pkp_notification').evaluateAll((ns) => ns.filter((x) => x.offsetParent !== null).map((x) => x.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []) : [];
            const s = await snap(name);
            return {path: p, status: r ? r.status() : null, windowOpen: open, errors, inWindow, notices: s.notices, fetches: fetchesSince(f0)};
        };
        return {refused: await saveAs('u09a11 nav', 'nav-refused'), corrected: await saveAs('u09a11-nav', 'nav-corrected')};
    };

    try {
        await signIn(page, 'rvaca', {contextPath: app.contextPath});                             // 1
        fact('steps2-4-enable', await enable());                                                  // 2-4
        await snap('static-pages-tab');
        if (MORE) {
            await openAdd();
            fact('more-refused-1', await fillAndSave('more-refused-1', {path: 'u09a11 one', title: 'u09a11 More'}));
            fact('more-refused-2', await fillAndSave('more-refused-2', {path: 'u09a11 two'}));
            fact('more-corrected', await fillAndSave('more-corrected', {path: 'u09a11-more'}));
            await openAdd();
            fact('more-refused-3', await fillAndSave('more-refused-3', {path: 'u09a11-more', title: 'u09a11 More again'}));
            fact('more-closed', await closeWindow());
            const f0 = fetches.length;
            await page.goto(ctx('dashboard/editorial')); await idle(page); await pause(2500);
            const s = await snap('more-submissions-page');
            fact('more-submissions-page', {url: page.url().replace(app.baseURL, ''), notices: s.notices, fetches: fetchesSince(f0)});
        } else if (!NEIGHBOUR) {
            await openAdd();                                                                      // 5
            fact('step5-refused', await fillAndSave('step5-refused', {path: 'u09a11 about', title: 'u09a11 About'}));
            fact('step6-corrected', await fillAndSave('step6-corrected', {path: 'u09a11-about'}));  // 6
            fact('list-after-6', await listed());
            await openAdd();                                                                      // 7
            fact('step7-refused', await fillAndSave('step7-refused', {path: 'u09a11-about', title: 'u09a11 Again'}));
            fact('step8-closed', await closeWindow());                                            // 8
            const f0 = fetches.length;
            await openWebsite();                                                                  // 9
            const s = await snap('step9-reloaded');
            fact('step9-reloaded', {notices: s.notices, fetches: fetchesSince(f0)});
            await openTab('staticPages');
            fact('list-after-9', await listed());
        } else {
            await openAdd();
            fact('nb-clean-save', await fillAndSave('nb-clean-save', {path: 'u09a11-fees', title: 'u09a11 Fees'}));
            fact('nb-list', await listed());
            fact('nb-navigation-item', await navItem());
        }
        fact('script-errors', scriptErrors);
        await signOut(page);
    } finally {
        record(`facts${SUF}`, facts);
        await close();
    }
});
