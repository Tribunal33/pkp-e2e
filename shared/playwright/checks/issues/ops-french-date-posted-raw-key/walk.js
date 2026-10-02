// Issue report docs/issues/U49-A10-ops-french-date-posted-raw-key.md (U49 A10): on a preprint
// server shown in French (Canada), the "Preprint Entry" page labels its date field
// "##publication.datePublished##" where English reads "Date Posted".
// Steps, on PKP's default test dataset (OPS `main` or `stable-3_5_0`):
//   1. Sign in as dbarnes.
//   2. The initials menu > "Change Language" > "français".
//   3. Open submission 1 ("The influence of lactation ...", Production) at
//      /index.php/publicknowledge/fr_CA/dashboard/editorial?workflowSubmissionId=1
//   4. In the workflow's side menu, press "Entrée de la prépublication".
//   5. Read the date field's label (and every code on the page, for the record).
// Modes (MODE=…):
//   steps     (default) the Steps above, then the English control (the same page in English).
//   nb        the fix's neighbour: the English page's label and the French page's date
//             description, which the fix must leave as they are; no language change by menu.
//   dialog    the U13-A1 join check (main only, OJS/OMP/OPS): in French, "Créer une nouvelle
//             version" on OJS 1 / OMP 5 / OPS 3, the options of the "copy from" select, "Annuler".
// Run on a freshly reset dataset fleet:
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> [MODE=nb|dialog] node bin/probe.js ops shared/playwright/checks/issues/ops-french-date-posted-raw-key/walk.js
//   (MODE=dialog: `all`; PKP_E2E_LINE=stable-3_5_0 in front for 3.5)
const {forEachApp, launch, signIn, screen, record, idle, rawKeys} = require('../../../probe');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');

const T = 30_000;
const MODE = process.env.MODE || 'steps';
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => u.replace(/^https?:\/\/[^/]+/, '');
const DIALOG_SUBMISSION = {ojs: 1, omp: 5, ops: 3};

const workflow = (page) => page.getByRole('dialog').filter({has: page.locator('[data-cy="sidemodal-header"]')}).first();
const nav = (page) => workflow(page).getByRole('navigation');

/** Press a side-menu entry, unfolding the publication / version node above it when hidden. */
async function pressMenu(page, label) {
    const target = nav(page).getByRole('link', typeof label === 'string' ? {name: label, exact: true} : {name: label});
    await nav(page).getByRole('link').first().waitFor({timeout: T});
    for (let i = 0; i < 4; i++) {
        if (await target.last().isVisible().catch(() => false)) break;
        const groups = nav(page).getByRole('link').filter({hasText: /^\s*(##publication\.versionStage[^#]*##.*|Publication|Prépublication|Preprint|Unassigned version|Author Original.*|Version of Record.*|Version.*|Toutes les versions|All Versions)\s*$/});
        const n = await groups.count();
        if (!n) break;
        await groups.nth(n - 1 - (i % n)).click();
        await idle(page);
    }
    const entries = await nav(page).getByRole('link').allInnerTexts().catch(() => []);
    await target.last().click();
    await idle(page);
    return entries.map((e) => flat(e, 120));
}

async function openWorkflow(page, app, lang, id) {
    await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/dashboard/editorial?workflowSubmissionId=${id}`));
    await workflow(page).locator('[data-cy="sidemodal-header"]').waitFor({timeout: 60_000});
    await idle(page);
}

/** The entry page's date field: its label, its description and the codes in the window. */
async function readEntryPage(page) {
    const label = workflow(page).locator('label[for*="datePublished"]').first();
    await label.waitFor({timeout: T});
    await idle(page);
    const keys = await rawKeys(page, {scope: '[role="dialog"]'}).catch((e) => `rawKeys failed: ${e.message}`);
    return {
        heading: flat(await workflow(page).locator('.pkp-modal-scroll-container h2').first().innerText().catch(() => null)),
        label: flat(await label.innerText()),
        description: flat(await workflow(page).locator('[id$="-datePublished-description"]').first().innerText().catch(() => null)),
        rawKeys: Array.isArray(keys) ? [...new Set(keys.map((k) => (typeof k === 'string' ? k : k.key)))] : keys,
    };
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (MODE !== 'dialog' && app.name !== 'ops') return;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 2500)}`);
    };
    const {page, close} = await launch(app);
    try {
        // 1
        await signIn(page, 'dbarnes');
        if (MODE === 'steps') {
            // 2
            await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
            await idle(page);
            await changeLanguage(page, 'français', 'fr_CA');
            fact('2 language', {url: rel(page.url()), htmlLang: await page.locator('html').getAttribute('lang')});
            // 3-4
            await openWorkflow(page, app, 'fr_CA', 1);
            fact('4 menu', await pressMenu(page, 'Entrée de la prépublication'));
            // 5
            fact('5 fr_CA', await readEntryPage(page));
            record('v3-steps-fr', await screen(page));
            // Control: the same page in English.
            await openWorkflow(page, app, 'en', 1);
            await pressMenu(page, /^Preprint entry$/i);
            fact('control en', await readEntryPage(page));
            record('v3-steps-en', await screen(page));
        } else if (MODE === 'nb') {
            await openWorkflow(page, app, 'en', 1);
            await pressMenu(page, /^Preprint entry$/i);
            fact('nb en', await readEntryPage(page));
            await openWorkflow(page, app, 'fr_CA', 1);
            await pressMenu(page, 'Entrée de la prépublication');
            fact('nb fr_CA', await readEntryPage(page));
            record('v3-nb', await screen(page));
        } else if (MODE === 'dialog') {
            const id = DIALOG_SUBMISSION[app.name];
            await openWorkflow(page, app, 'fr_CA', id);
            fact('dialog menu', await pressMenu(page, 'Créer une nouvelle version'));
            const w = page.getByRole('dialog').filter({has: page.locator('select[name="versionSource"]')}).last();
            await w.waitFor({state: 'visible', timeout: T});
            await idle(page);
            const options = await w.locator('select[name="versionSource"] option').allInnerTexts();
            fact('dialog fr_CA', {submission: id, title: flat(await w.locator('h1, h2').first().innerText().catch(() => null)),
                sourceLabel: flat(await w.locator('label[for*="versionSource"]').first().innerText().catch(() => null)),
                sourceOptions: options.map((o) => flat(o))});
            record('v3-dialog', await screen(page));
            await w.getByRole('button', {name: 'Annuler', exact: true}).last().click();
            await idle(page);
        }
    } catch (e) {
        fact('error', flat(e.message, 400));
        await record(`v3-${MODE}-error`, await screen(page).catch(() => null));
        throw e;
    } finally {
        record(`v3-${MODE}-facts`, facts);
        await close();
    }
});
