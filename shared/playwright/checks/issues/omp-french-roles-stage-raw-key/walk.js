// Issue report docs/issues/U69-A15-omp-french-book-page-raw-keys.md (its fix.diff), the part
// from spec U54 OMP1: in French (Canada) a press's Settings > Users & Roles > "Roles" list
// heads its External Review column with a code. Takes that group of the report's
// Steps on PKP's default test dataset (all three apps; OMP shows the fault, OJS and
// OPS are the controls), then reads where else the same text shows (the "Create New
// Role" window's stages, submission 2's workflow and the dashboard on OMP):
//   1. dbarnes signs in
//   2. the initials menu > "Change Language" > "français" (French (Canada))
//   3-4. Settings > Users & Roles, the "Roles" tab: the list's column headings
//   5. (reach) "Create New Role": the stage boxes' names; the window is closed
//   6. (reach, OMP) submission 2 "The West and Beyond …" (external review): the
//      workflow's menu (step 2 also lists the dashboard's codes)
// Changes nothing. NB=1 runs the neighbour check alone: the same tab, window and
// workflow in English, which the fix must leave as they are.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/omp-french-roles-stage-raw-key/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, signOut, screen, record, idle, rawKeys} = require('../../../probe');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');
const {flat} = require('../omp-french-book-page-raw-keys/lib');

const T = 30_000;
const VOLUME = 2; // OMP: "The West and Beyond: New Perspectives on an Imagined Region", external review

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
        return Array.isArray(all) ? all.map((k) => (typeof k === 'string' ? k : `${k.key}${k.where ? ` @${k.where}` : ''}`)) : all;
    };
    const {page, close} = await launch(app);
    try {
        // 1
        await signIn(page, 'dbarnes');
        await idle(page);
        // 2: the initials menu's language list (only when not already in the language)
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
        await idle(page);
        if (!nb) {
            await changeLanguage(page, 'français', 'fr_CA');
            fact('2 language', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), htmlLang: await page.locator('html').getAttribute('lang')});
        }
        record(`${lang}-2-dashboard`, await screen(page));
        fact('2 dashboard raw keys', await keys(page));

        // 3: Settings > Users & Roles, "Roles"
        await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/management/settings/access`));
        await idle(page);
        fact('3 nav', await page.locator('nav, .app__nav').first().innerText().then((t) => flat(t, 1500)).catch(() => null));
        await page.locator('#roles-button').first().click();
        const grid = page.locator('#roleGridContainer');
        await grid.locator('tr.gridRow').first().waitFor({timeout: T});
        await idle(page);
        record(`${lang}-3-roles`, await screen(page));
        // 4: the column headings
        fact('3 tabs', (await page.getByRole('tab').allInnerTexts()).map((t) => flat(t)));
        fact('4 columns', (await grid.locator('thead th').allInnerTexts()).map((t) => flat(t)));
        fact('4 grid title', flat(await grid.locator('.pkp_controllers_grid .header h4, h4').first().innerText().catch(() => null)));
        fact('4 raw keys', await keys(page));

        // 5 (reach): "Create New Role", the stage boxes
        const add = grid.getByRole('link', {name: /^(Create New Role|Créer un nouveau rôle)$/});
        fact('5 window link', flat(await add.first().innerText()));
        await add.first().click();
        const form = page.locator('form#userGroupForm');
        await form.waitFor({state: 'visible', timeout: T});
        await form.locator('input[name="permitMetadataEdit"]').waitFor({timeout: T}).catch(() => {});
        await idle(page);
        record(`${lang}-5-role-window`, await screen(page));
        fact('5 stage boxes', await form.locator('input[name="assignedStages[]"]').evaluateAll((els) =>
            els.map((el) => ((el.closest('label') || el.parentElement || {}).innerText || '').replace(/\s+/g, ' ').trim())));
        fact('5 raw keys', await keys(page));
        await page.keyboard.press('Escape');
        await form.waitFor({state: 'hidden', timeout: 5000}).catch(() => {});

        // 6 (reach, OMP): submission 2's workflow
        if (app.name === 'omp') {
            await page.goto('about:blank');
            await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/dashboard/editorial?workflowSubmissionId=${VOLUME}`));
            await page.getByRole('dialog').first().waitFor({timeout: T}).catch(() => {});
            await idle(page);
            record(`${lang}-6-workflow`, await screen(page));
            fact('6 workflow menu', flat(await page.getByRole('dialog').first().locator('nav').first().innerText().catch(() => null), 1500));
            fact('6 raw keys', await keys(page));
        }
        await signOut(page).catch(() => {});
    } finally {
        record(`${lang}-facts`, facts);
        await close();
    }
});
