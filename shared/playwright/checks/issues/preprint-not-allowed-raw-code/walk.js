// Issue report walk: docs/issues/U21-OPS7-preprint-not-allowed-raw-code.md
// (spec U21 register OPS7). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
//   Every section closed (OJS, OPS; a press has no sections):
//     1 sign in as `dbarnes`; 2-3 Settings › Server/Journal › Sections: tick
//     the editors-only box on every section › Save; 4 sign in as `ccorino`;
//     5 open the start screen.
//   Self-registration off (all three apps):
//     6-7 as `dbarnes`, Users & Roles › Roles: untick "Allow user
//     self-registration" on "Author" (OMP: and on "Chapter Author" and
//     "Volume editor") › OK;
//     8 sign out, "Register" the account `u21w41`; 9 open the start screen.
//   Extra read after step 5: the same address in French (Canada).
// Neighbour (taken first, with the fix in and out): `ccorino` opens the start
// screen while the sections are open: the start form, no "Not Allowed" page,
// no raw key. Each refusal page records its heading, its message text and
// every `##…##` key on it. The kit builds nothing.
//
// Run (main, then stable-3_5_0); reset the fleet first:
//   npm run fleet-prep -- --feature issues-w41 --dataset 6 --reset
//   PROBE_FEATURE=issues-w41 PROBE_AGENT=w41 node bin/probe.js all shared/playwright/checks/issues/preprint-not-allowed-raw-code/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w41-3_5 --dataset 6 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w41-3_5 PROBE_AGENT=w41 node bin/probe.js all shared/playwright/checks/issues/preprint-not-allowed-raw-code/walk.js
// With the fix applied (node bin/try-fix.js apply …/fix.diff ops), run on ops with PROBE_RUN=fix.
// Facts: .reports/<feature>/w41/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, rawKeys, idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const NEW_USER = 'u21w41';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const facts = {line: app.line || 'main', baseURL: app.baseURL};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const ctx = app.contextPath;
    // An author of the dataset: `ccorino` on the journal and the server, `aclark` on the press.
    const AUTHOR = app.name === 'omp' ? 'aclark' : 'ccorino';
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => {
        const s = await screen(page);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`);
        return s;
    };
    // The start screen: the address the "New Submission" button opens.
    const openStart = async (name, locale = '') => {
        const resp = await page.goto(app.url(`/index.php/${ctx}${locale}/submission`));
        await idle(page).catch(() => {});
        await pause(500);
        await snap(name);
        const out = {
            status: resp ? resp.status() : null,
            url: page.url().replace(app.baseURL, ''),
            title: await page.title().catch(() => null),
            h1: (await page.locator('h1').allInnerTexts().catch(() => [])).map((t) => flat(t, 120)),
            message: flat(await page.locator('.page_message, .pkp_structure_main').first().innerText().catch(() => ''), 700),
            startForm: await page.locator('form').filter({has: page.locator('[name="title"], #startSubmission-title-control, [id*="title"]')}).count().catch(() => null),
            rawKeys: await rawKeys(page),
            mailto: await page.locator('.page_message a[href^="mailto:"], .pkp_structure_main a[href^="mailto:"]').evaluateAll((as) => as.map((a) => `${a.innerText.trim()} <${a.getAttribute('href')}>`)).catch(() => []),
        };
        fact(name, out);
        return out;
    };
    // A legacy settings grid: the row whose first cell reads `name` exactly, its "Edit" action.
    const editRow = async (grid, name) => {
        await grid.locator('tr.gridRow').first().waitFor({timeout: T});
        await idle(page).catch(() => {});
        const pager = (await grid.innerText().catch(() => '')).match(/(\d+) - (\d+) of (\d+) items/);
        if (pager && Number(pager[2]) < Number(pager[3])) {
            await grid.locator('select.itemsPerPage').selectOption({label: '50'}).catch(() => {});
            await pause(1500); await idle(page).catch(() => {});
        }
        const id = await grid.locator('tr.gridRow').evaluateAll((trs, want) => {
            const name = (r) => ((r.querySelector('td') || {}).innerText || '').split('\n').map((t) => t.trim()).filter(Boolean).pop();
            const tr = trs.find((r) => name(r) === want);
            return tr ? tr.id : null;
        }, name);
        if (!id) throw new Error(`no row "${name}" in the grid`);
        const tr = page.locator(`tr[id="${id}"]`);
        await tr.locator('a.show_extras').first().click();
        await pause(300);
        await page.locator(`tr[id="${id}"] + tr`).getByRole('link', {name: 'Edit', exact: true}).first().click();
    };

    try {
        // Neighbour: the start screen while every section is open (the author: `ccorino`, on a press `aclark`).
        await signIn(page, AUTHOR);
        await idle(page).catch(() => {});
        await openStart('0-neighbour-start-open');
        await signOut(page);

        // ---------------------------------------- Every section closed (OJS, OPS)
        if (app.name !== 'omp') {
            await signIn(page, 'dbarnes');                                                      // 1
            await idle(page).catch(() => {});
            await page.goto(app.url(`/index.php/${ctx}/management/settings/context`));         // 2
            await idle(page).catch(() => {});
            await page.getByRole('tab', {name: 'Sections', exact: true}).first().click();
            const grid = page.locator('#sectionsGridContainer');
            await grid.locator('tr.gridRow').first().waitFor({timeout: T});
            const sections = (await grid.locator('tr.gridRow').evaluateAll((trs) => trs.map((r) => ((r.querySelector('td') || {}).innerText || '').split('\n').map((t) => t.trim()).filter(Boolean).pop())))
                .filter(Boolean);
            fact('sections', sections);
            for (const name of sections) {
                await editRow(grid, name);
                const form = page.locator('form#sectionForm');
                const box = form.locator('input[name^="editorRestrict"]');
                await box.waitFor({state: 'attached', timeout: T});
                await idle(page).catch(() => {}); await pause(500);
                const label = flat(await form.locator('label').filter({has: box}).first().innerText().catch(() => ''), 160)
                    || flat(await box.evaluate((i) => (i.closest('li, div') || {}).innerText || '').catch(() => ''), 160);
                await box.check();                                                              // 3
                const saved = page.waitForResponse((r) => r.url().includes('update-section'), {timeout: T}).catch(() => null);
                await form.getByRole('button', {name: 'Save', exact: true}).click();
                const r = await saved;
                await form.waitFor({state: 'hidden', timeout: T}).catch(() => {});
                await idle(page).catch(() => {}); await pause(500);
                fact(`restrict-${name}`, {label, status: r ? r.status() : 'none'});
            }
            await snap('3-sections-restricted');
            await signOut(page);
            await signIn(page, AUTHOR);                                                      // 4
            await idle(page).catch(() => {});
            await openStart('5-all-sections-closed');                                           // 5
            await openStart('5-all-sections-closed-fr_CA', '/fr_CA');                           // extra read: French (Canada)
            await signOut(page);
        }

        // ---------------------------------------- Self-registration off (all apps)
        await signIn(page, 'dbarnes');                                                          // 6
        await idle(page).catch(() => {});
        // Every author-role group that permits self-registration in the dataset: a press has three.
        const groups = app.name === 'omp' ? ['Author', 'Chapter Author', 'Volume editor'] : ['Author'];
        for (const name of groups) {
            await page.goto(app.url(`/index.php/${ctx}/management/settings/access`));
            await idle(page).catch(() => {});
            await page.locator('#roles-button').first().click();
            const grid = page.locator('#roleGridContainer');
            await editRow(grid, name);
            const form = page.locator('form#userGroupForm');
            const box = form.locator('input[name="permitSelfRegistration"]');
            await box.waitFor({state: 'attached', timeout: T});
            await idle(page).catch(() => {}); await pause(700);
            const before = await box.isChecked();
            await box.uncheck();                                                                // 7
            const saved = page.waitForResponse((r) => r.url().includes('update-user-group'), {timeout: T}).catch(() => null);
            await form.getByRole('button', {name: 'OK', exact: true}).click();
            const r = await saved;
            await form.waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await idle(page).catch(() => {}); await pause(500);
            fact(`selfreg-off-${name}`, {before, status: r ? r.status() : 'none'});
        }
        await snap('7-roles-saved');
        await signOut(page);

        await page.goto(app.url(`/index.php/${ctx}/user/register`));                             // 8
        await idle(page).catch(() => {});
        const reg = page.locator('form#register');
        await reg.locator('input[name="givenName"]').fill(NEW_USER);
        await reg.locator('input[name="familyName"]').fill('Visitor');
        await reg.locator('input[name="affiliation"]').fill(NEW_USER);
        await reg.locator('select[name="country"]').selectOption('CA');
        await reg.locator('input[name="email"]').fill(`${NEW_USER}@mailinator.com`);
        await reg.locator('input[name="username"]').fill(NEW_USER);
        await reg.locator('input[name="password"]').fill(NEW_USER + NEW_USER);
        await reg.locator('input[name="password2"]').fill(NEW_USER + NEW_USER);
        const consent = reg.locator('input[name="privacyConsent"]');
        if (await consent.count()) await consent.check();
        const regOffers = await reg.locator('input[type=checkbox]').evaluateAll((els) => els.map((i) => `${i.name}=${i.checked ? 'x' : '-'}`));
        await snap('8-register-filled');
        await Promise.all([page.waitForNavigation({timeout: T}).catch(() => null), reg.getByRole('button', {name: 'Register', exact: true}).click()]);
        await idle(page).catch(() => {});
        await snap('8-registered');
        fact('register', {regOffers, landed: page.url().replace(app.baseURL, ''), h1: (await page.locator('h1').allInnerTexts().catch(() => [])).map((t) => flat(t, 120))});
        await openStart('9-not-registered-by-staff');                                           // 9
        if (/\/login/.test(facts['9-not-registered-by-staff'].url)) {
            // Registration did not sign the account in: sign in and open the start screen.
            await signIn(page, NEW_USER, {contextPath: ctx});
            await idle(page).catch(() => {});
            await openStart('9-not-registered-by-staff-signed-in');
        }
    } finally {
        record('facts', facts);
        await close();
    }
});
