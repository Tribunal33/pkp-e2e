// Issue report docs/issues/U54-OPS3-ops-french-moderator-reads-series-editor.md (spec
// U54 OPS3): in French (Canada) a preprint server names its Moderator permission level
// "Éditeur-trice de série" (a press's "Series Editor"). Takes the report's Steps on
// PKP's default test dataset, on all three apps (OPS shows the fault; OJS and OMP are
// the controls, each with its own French level names):
//   1. dbarnes signs in
//   2. the initials menu > "Change Language" > "français" (French (Canada))
//   3. Settings > Users & Roles, the "Roles" tab: each row's name and permission level
//   4. "Search": the permission level filter's options
//   5. the section editor / Moderator row > "Edit": the window's permission level
//   6. Statistics > Users: the role list
// Changes nothing. NB=1 runs the neighbour check alone: the same screens in English,
// which the fix must leave as they are.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/ops-french-moderator-reads-series-editor/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, signOut, screen, record, idle, rawKeys} = require('../../../probe');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const lang = nb ? 'en' : 'fr_CA';
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour (en)' : 'steps (fr_CA)'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2000)}`);
    };
    const keys = async (page) => {
        const all = await rawKeys(page).catch((e) => `rawKeys failed: ${e.message}`);
        return Array.isArray(all) ? all.map((k) => (typeof k === 'string' ? k : k.key)) : all;
    };
    const {page, close} = await launch(app);
    try {
        // 1
        await signIn(page, 'dbarnes');
        await idle(page);
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
        await idle(page);
        // 2
        if (!nb) {
            await changeLanguage(page, 'français', 'fr_CA');
            fact('2 language', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), htmlLang: await page.locator('html').getAttribute('lang')});
        }

        // 3: Settings > Users & Roles, "Roles"
        await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/management/settings/access`));
        await idle(page);
        await page.locator('#roles-button').first().click();
        const grid = page.locator('#roleGridContainer');
        await grid.locator('tr.gridRow').first().waitFor({timeout: T});
        await idle(page);
        record(`${lang}-3-roles`, await screen(page));
        fact('3 tabs', (await page.getByRole('tab').allInnerTexts()).map((t) => flat(t)));
        fact('3 columns', (await grid.locator('thead th').allInnerTexts()).map((t) => flat(t)));
        const rows = await grid.locator('tr.gridRow').evaluateAll((trs) => trs.map((tr) => {
            const cells = [...tr.querySelectorAll('td')].map((td) => (td.innerText || '').replace(/\s+/g, ' ').trim());
            return {id: tr.id, name: cells[0], level: cells[1]};
        }));
        fact('3 rows (name | level)', rows.map((r) => `${r.name} | ${r.level}`));
        fact('3 raw keys', await keys(page));

        // 4: "Search", the permission level filter
        const searchLink = grid.locator('a.search_extras_expand, a[id*="search"], .search_extras_expand').first();
        fact('4 search link', flat(await searchLink.innerText().catch(() => null)));
        await searchLink.click().catch((e) => fact('4 search click', e.message.split('\n')[0]));
        const roleFilter = page.locator('select[name="selectedRoleId"]').first();
        await roleFilter.waitFor({state: 'visible', timeout: 5000}).catch(() => {});
        fact('4 filter label', flat(await page.locator('label[for^="selectedRoleId"]').first().innerText().catch(() => null)));
        fact('4 filter options', await roleFilter.locator('option').allInnerTexts().then((a) => a.map((t) => flat(t))).catch((e) => e.message));
        record(`${lang}-4-filter`, await screen(page));

        // 5: the section editor (Moderator) group's row > "Edit"
        // the row is picked by its permission level cell, as a person reads it
        const levelWord = rows.map((r) => r.level);
        const subRow = rows.find((r) => /série|rubrique|Moderator|Section Editor|Series Editor|Éditeur|Rédacteur|Modérat|Moderador/i.test(r.level) && !/Manager|Administrat|Directeur|Gestionnaire/i.test(r.level));
        fact('5 row', subRow ? `${subRow.name} | ${subRow.level}` : `none found among ${JSON.stringify(levelWord)}`);
        if (subRow) {
            const tr = grid.locator(`tr[id="${subRow.id}"]`);
            await tr.locator('a.show_extras').first().click();
            const controls = grid.locator(`tr[id="${subRow.id}-control-row"]`);
            await controls.waitFor({state: 'visible', timeout: T});
            const editLink = controls.locator('a').first();
            fact('5 edit link', flat(await editLink.innerText()));
            await editLink.click();
            const form = page.locator('form#userGroupForm');
            await form.waitFor({state: 'visible', timeout: T});
            await form.locator('select[name="roleId"]').waitFor({timeout: T});
            await idle(page);
            record(`${lang}-5-role-window`, await screen(page));
            fact('5 window level label', flat(await form.locator('label[for^="roleId"]').first().innerText().catch(() => null)));
            fact('5 window level chosen', await form.locator('select[name="roleId"]').evaluate((s) => s.options[s.selectedIndex] && s.options[s.selectedIndex].text.trim()));
            fact('5 window level options', await form.locator('select[name="roleId"] option').allInnerTexts().then((a) => a.map((t) => flat(t))));
            await page.keyboard.press('Escape');
            await form.waitFor({state: 'hidden', timeout: 5000}).catch(() => {});
        }

        // 6: Statistics > Users
        await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/stats/users/users`));
        await idle(page);
        await page.locator('table').first().waitFor({timeout: T}).catch(() => {});
        record(`${lang}-6-stats-users`, await screen(page));
        fact('6 heading', flat(await page.locator('main h1').first().innerText().catch(() => null)));
        fact('6 role rows', await page.locator('table tbody tr').evaluateAll((trs) => trs.map((tr) => (tr.innerText || '').replace(/\s+/g, ' ').trim())).catch((e) => e.message));
        fact('6 raw keys', await keys(page));
        await signOut(page).catch(() => {});
    } finally {
        record(`${lang}-facts`, facts);
        await close();
    }
});
