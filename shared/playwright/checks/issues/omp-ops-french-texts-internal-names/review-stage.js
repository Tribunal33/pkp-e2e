// Issue report walk, part 4: docs/issues/U57-A8-omp-ops-french-texts-internal-names.md
// Steps 12–14 (the press's External Review stage name in French; spec U54
// OMP1) on PKP's default test dataset (a dataset fleet), as `admin`:
//   12 {context}/fr_CA/management/settings/access › "Rôles": the stage column headings
//   13 {context}/fr_CA/dashboard/editorial, view "Toutes les soumissions actives": the
//      stage of submission 16 (External Review) and, on a press, 6 (Internal Review)
//   14 submission 16's workflow: the side menu
// then the same three at /en/ (control, and the neighbour check for the fix:
// the English names and the other French stage names must not change).
// OMP shows the fault; OJS is the control (OJS submission 16 is in
// Submission, so step 13–14 read OJS submission 12, also in Review); OPS has
// no review stage and records its columns only. The kit builds nothing.
//
// Run (main, then stable-3_5_0); reset the fleet first:
//   npm run fleet-prep -- --feature issues-w55 --dataset 3 --reset
//   PROBE_FEATURE=issues-w55 PROBE_AGENT=w55 node bin/probe.js all shared/playwright/checks/issues/omp-ops-french-texts-internal-names/review-stage.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w55-3_5 --dataset 3 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w55-3_5 PROBE_AGENT=w55 node bin/probe.js all shared/playwright/checks/issues/omp-ops-french-texts-internal-names/review-stage.js
// With fix-omp.diff applied (node bin/try-fix.js apply …/fix-omp.diff omp), run with PROBE_RUN=fix.
// Facts: .reports/<feature>/w55/review-stage-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, rawKeys} = require('../../../probe');

const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const SUBMISSION = {ojs: 12, omp: 16};
const TITLE = {ojs: 'Sodium butyrate', omp: "A Designer's Log"};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('review-stage.js drives a dataset fleet (fleet-prep --dataset n)');
    const facts = {line: app.line || 'main', baseURL: app.baseURL};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    let n = 0;
    const snap = async (page, label) => {
        const name = `rs${String(++n).padStart(2, '0')}-${label}`;
        const s = await screen(page);
        record(name, s);
        await shot(page, name);
        return s;
    };
    const keys = async (page) => ((await rawKeys(page)) || []).map((k) => k.key || k).filter((k) => /review/i.test(JSON.stringify(k)));

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        for (const locale of ['fr_CA', 'en']) {
            // 12: the roles list's stage columns.
            await page.goto(app.url(`/index.php/${app.contextPath}/${locale}/management/settings/access`));
            await idle(page);
            await page.locator('#roles-button').filter({visible: true}).first().click();
            const grid = page.locator('#roleGridContainer');
            await grid.locator('tbody tr.gridRow').first().waitFor({timeout: 20000});
            await idle(page);
            fact(`${locale} 12 columns`, (await grid.locator('thead th').allInnerTexts()).map(flat));
            await snap(page, `${locale}-roles`);
            if (!SUBMISSION[app.name]) continue;

            // 13: the dashboard, the submission's row.
            const id = SUBMISSION[app.name];
            await page.goto(app.url(`/index.php/${app.contextPath}/${locale}/dashboard/editorial?currentViewId=active`));
            await idle(page);
            const row = page.locator('main tr').filter({hasText: TITLE[app.name]}).first();
            await row.waitFor({timeout: 30000}).catch(() => {});
            await idle(page);
            fact(`${locale} 13 dashboard row ${id}`, flat(await row.innerText().catch(() => '(row not found)')));
            if (app.name === 'omp') {
                // A press's Internal Review row on the same list: submission 6.
                const internal = page.locator('main tr').filter({hasText: 'The Information Literacy User'}).first();
                fact(`${locale} 13 dashboard row 6`, flat(await internal.innerText().catch(() => '(row not found)')));
            }
            fact(`${locale} 13 dashboard raw keys`, await keys(page));
            await snap(page, `${locale}-dashboard`);

            // 14: the submission's workflow, its side menu.
            await page.goto(app.url(`/index.php/${app.contextPath}/${locale}/dashboard/editorial?workflowSubmissionId=${id}`));
            await idle(page);
            const dialog = page.locator('[role="dialog"]').last();
            await dialog.locator('nav, [role="navigation"]').first().waitFor({timeout: 30000}).catch(() => {});
            await idle(page);
            fact(`${locale} 14 workflow menu ${id}`, flat(await dialog.locator('nav, [role="navigation"]').first().innerText().catch(() => '(menu not found)')).slice(0, 700));
            fact(`${locale} 14 workflow raw keys`, await keys(page));
            await snap(page, `${locale}-workflow`);
        }
        await signOut(page);
    } finally {
        await close();
    }
    record('review-stage-facts', facts);
});
