// Issue report docs/issues/U69-A15-omp-french-book-page-raw-keys.md (its fix.diff), the part
// from spec U24 A11: in French (Canada) a press's workflow screen names an Internal Review
// round and the "Monograph" control and its menu by codes, and an External Review round by
// a journal's words. Takes that group of the report's Steps on PKP's default test dataset (OMP):
//   1. dbarnes signs in; the initials menu > "Change Language" > "français" (French (Canada))
//   2. submission 6 "The Information Literacy User's Guide" (internal review, round 1):
//      the stage bubble and the page's heading
//   3. the work type control beside the bubble, and its menu's two entries (nothing chosen)
//   4. submission 2 "The West and Beyond …" (external review, round 1): bubble and heading
// Changes nothing. NB=1 runs the neighbour check alone: the same screens in English,
// which the fix must leave as they are.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/omp-french-workflow-raw-keys/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, signOut, screen, record, idle, rawKeys} = require('../../../probe');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');
const {flat} = require('../omp-french-book-page-raw-keys/lib');

const T = 30_000;
const INTERNAL = 6;
const EXTERNAL = 2;
const TYPE = /^(Monograph|Edited Volume|Monographie|Ouvrage collectif|##common\.publication##|##submission\.workflowType\.editedVolume\.label##)$/;

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
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
    const open = async (page, id) => {
        await page.goto('about:blank');
        await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/dashboard/editorial?workflowSubmissionId=${id}`));
        const dialog = page.getByRole('dialog').first();
        await dialog.waitFor({timeout: T});
        await dialog.locator('nav').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        return dialog;
    };
    const read = async (page, dialog, n) => {
        record(`${lang}-${n}-workflow`, await screen(page));
        fact(`${n} header`, flat(await dialog.locator('header, [data-cy="workflow-header"]').first().innerText().catch(() => null), 800));
        fact(`${n} headings`, (await dialog.getByRole('heading').allInnerTexts().catch(() => [])).map((t) => flat(t)).filter(Boolean).slice(0, 8));
        fact(`${n} menu`, flat(await dialog.locator('nav').first().innerText().catch(() => null), 1500));
        fact(`${n} raw keys`, await keys(page));
    };
    const {page, close} = await launch(app);
    try {
        // 1
        await signIn(page, 'dbarnes');
        await idle(page);
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
        await idle(page);
        if (!nb) {
            await changeLanguage(page, 'français', 'fr_CA');
            fact('1 language', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), htmlLang: await page.locator('html').getAttribute('lang')});
        }
        // 2: an Internal Review round
        let dialog = await open(page, INTERNAL);
        await read(page, dialog, 2);
        // 3: the work type control and its menu
        const control = dialog.getByRole('button', {name: TYPE}).first();
        if (await control.count()) {
            fact('3 control', flat(await control.innerText()));
            await control.click();
            const items = page.getByRole('menuitem');
            await items.first().waitFor({timeout: 5000}).catch(() => {});
            fact('3 menu entries', (await items.allInnerTexts().catch(() => [])).map((t) => flat(t)));
            record(`${lang}-3-type-menu`, await screen(page));
            await page.keyboard.press('Escape');
        } else {
            fact('3 control', 'not found');
            fact('3 buttons', (await dialog.getByRole('button').allInnerTexts()).map((t) => flat(t)).filter(Boolean).slice(0, 30));
        }
        // 4: an External Review round
        dialog = await open(page, EXTERNAL);
        await read(page, dialog, 4);
        await signOut(page).catch(() => {});
    } finally {
        record(`${lang}-facts`, facts);
        await close();
    }
});
