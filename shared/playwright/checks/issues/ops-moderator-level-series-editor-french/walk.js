// Issue report walk: docs/issues/U54-OPS3-ops-moderator-level-series-editor-french.md
// (spec U54 register OPS3). Takes the report's Steps through the screens on
// a dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// signed in as `admin`, in French (Canada) and then in English:
//   1-2 Settings › Users & Roles › "Rôles": each row's "Niveau d'autorisation"
//   3   the list's permission level filter ("Toutes les permissions")
//   4   "Créer un nouveau rôle" › "Niveau d'autorisation" (closed again)
//   5   Statistiques › "Utilisateurs-trices": the role counts
//   6   steps 1-5 at /en/ (control, and the neighbour check for the fix:
//       English must keep "Moderator" and the other levels must not move)
// OPS shows the fault; OJS and OMP are the control. Nothing is created or
// saved; the kit builds nothing.
//
// Run (main, then stable-3_5_0); reset the fleet first:
//   npm run fleet-prep -- --feature issues-w55 --dataset 3 --reset
//   PROBE_FEATURE=issues-w55 PROBE_AGENT=w55 node bin/probe.js all shared/playwright/checks/issues/ops-moderator-level-series-editor-french/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w55-3_5 --dataset 3 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w55-3_5 PROBE_AGENT=w55 node bin/probe.js all shared/playwright/checks/issues/ops-moderator-level-series-editor-french/walk.js
// With the fix applied (node bin/try-fix.js apply …/fix.diff ops), run with PROBE_RUN=fix.
// Facts: .reports/<feature>/w55/moderator-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, rawKeys} = require('../../../probe');

const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset n)');
    const facts = {line: app.line || 'main', baseURL: app.baseURL};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    let n = 0;
    const snap = async (page, label) => {
        const name = `mod${String(++n).padStart(2, '0')}-${label}`;
        record(name, await screen(page));
        await shot(page, name);
    };

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        for (const locale of ['fr_CA', 'en']) {
            // 1-2: the "Roles" tab, each row's name and permission level.
            await page.goto(app.url(`/index.php/${app.contextPath}/${locale}/management/settings/access`));
            await idle(page);
            await page.locator('#roles-button').filter({visible: true}).first().click();
            const grid = page.locator('#roleGridContainer');
            await grid.locator('tbody tr.gridRow').first().waitFor({timeout: 20000});
            await idle(page);
            const rows = await grid.locator('tbody tr.gridRow').evaluateAll((trs) => trs.map((tr) => ({
                name: (tr.querySelector('[id$="-name"] .label')?.textContent || '').replace(/\s+/g, ' ').trim(),
                level: (tr.querySelector('[id$="-roleId"] .label')?.textContent || '').replace(/\s+/g, ' ').trim(),
            })));
            fact(`${locale} 2 columns`, (await grid.locator('thead th').allInnerTexts()).map(flat));
            fact(`${locale} 2 rows`, rows);
            await snap(page, `${locale}-roles`);

            // 3: the permission level filter (its form opens from the list's "Search" link).
            await grid.locator('.header a').filter({hasText: /^\s*(Search|Rechercher)\s*$/}).first().click();
            await idle(page);
            const levelFilter = grid.locator('select[name="selectedRoleId"]');
            fact(`${locale} 3 level filter`, (await levelFilter.locator('option').allTextContents()).map(flat));

            // 4: "Create New Role" › "Permission level", then closed unsaved.
            await grid.locator('.header .actions a[id*="addUserGroup"], .header a[id*="addUserGroup"]').first().click();
            const win = page.locator('form#userGroupForm');
            await win.waitFor({timeout: 20000});
            await idle(page);
            const levelBox = win.locator('select[name="roleId"]');
            fact(`${locale} 4 window levels`, {
                label: flat(await win.locator('label[for^="roleId"], label:has-text("Niveau"), label:has-text("Permission level")').first().textContent().catch(() => '')),
                options: (await levelBox.locator('option').allTextContents()).map(flat),
            });
            await snap(page, `${locale}-create-window`);
            await page.keyboard.press('Escape');
            await idle(page);

            // 5: Statistics › Users, the role counts.
            await page.goto(app.url(`/index.php/${app.contextPath}/${locale}/stats/users/users`));
            await idle(page);
            await page.locator('main table, main .pkpTable').first().waitFor({timeout: 20000}).catch(() => {});
            await idle(page);
            const s = await screen(page);
            record(`mod${String(++n).padStart(2, '0')}-${locale}-stats-users`, s);
            await shot(page, `mod${String(n).padStart(2, '0')}-${locale}-stats-users`);
            fact(`${locale} 5 stats users`, flat(s.text?.main).slice(0, 900));
            if (locale === 'fr_CA') fact('fr_CA raw keys on stats users', (await rawKeys(page, {scope: 'main'})) || []);
        }
        await signOut(page);
    } finally {
        await close();
    }
    record('moderator-facts', facts);
});
