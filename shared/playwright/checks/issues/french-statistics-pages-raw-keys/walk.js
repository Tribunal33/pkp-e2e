// Issue report docs/issues/U64-A6-french-statistics-pages-raw-keys.md (U64 A6): in French (Canada)
// a press's and a preprint server's statistics screens print codes. Takes the report's Steps on
// PKP's default test dataset, all three apps (a journal is the control):
//   1. admin signs in
//   2. the initials menu > "Change Language" > "français"
//   3. Administration > "Paramètres du site" > "Statistiques": the three descriptions
//   4. Statistics > the publications page: browser tab, heading, chart buttons, table title, count line
//   5. its download button: the window; closed
//   6. Statistics > the context page: browser tab, the information icon
//   7. its download button: the window; closed
// Changes nothing. NB=1 runs the neighbour check alone: steps 3 to 7 in English, which the fix must
// leave as they are.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/french-statistics-pages-raw-keys/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, screen, record, idle, rawKeys} = require('../../../probe');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');

const T = 30_000;
const flat = (t, n = 600) => (t == null ? null : String(t).replace(/\s+/g, ' ').trim().slice(0, n));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const lang = nb ? 'en' : 'fr_CA';
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour (en)' : 'steps (fr_CA)'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 3000)}`);
    };
    const keys = async (page, scope) => {
        const all = await rawKeys(page, scope ? {scope} : undefined).catch((e) => `rawKeys failed: ${e.message}`);
        return Array.isArray(all) ? [...new Set(all.map((k) => (typeof k === 'string' ? k : `${k.key}${k.where ? ` @${k.where}` : ''}`)))] : all;
    };
    const {page, close} = await launch(app);
    // A statistics page: its tab, heading, buttons, table titles and count line, then its download window.
    const statsPage = async (step, path) => {
        await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/stats/${path}`));
        await idle(page);
        await page.locator('.pkpStats h1').first().waitFor({timeout: T}).catch(() => {});
        await page.locator('.pkpStats table').last().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        record(`${lang}-${step}-${path.split('/')[0]}`, await screen(page));
        fact(`${step} page`, {
            url: page.url().replace(/^https?:\/\/[^/]+/, ''),
            tab: await page.title(),
            h1: flat(await page.locator('.pkpStats h1').first().innerText().catch(() => null)),
            graphButtons: (await page.locator('.pkpStats__graphSelectors button').allInnerTexts().catch(() => [])).map((t) => flat(t)),
            captions: (await page.locator('.pkpStats caption').allTextContents().catch(() => [])).map((t) => flat(t)),
            tableHeader: flat(await page.locator('.pkpStats__panel .pkpHeader, .pkpStats__table .pkpHeader, .pkpStats__content > div:last-child .pkpHeader').first().innerText().catch(() => null)),
            headings: (await page.locator('.pkpStats h2').allTextContents().catch(() => [])).map((t) => flat(t)),
            columns: (await page.locator('.pkpStats table').last().locator('thead th').allTextContents().catch(() => [])).map((t) => flat(t)),
            tooltips: await page.locator('.pkpStats [class*="tooltip" i]').evaluateAll((els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []),
        });
        fact(`${step} raw keys`, await keys(page));
        const next = Number(step) + 1;
        const button = page.locator('.pkpStats button').filter({hasText: /Download Report|Télécharger le rapport|downloadReport/}).first();
        fact(`${next} button`, flat(await button.innerText().catch(() => null)));
        await button.click();
        const dialog = page.getByRole('dialog').last();
        await dialog.waitFor({timeout: T});
        await dialog.locator('button').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        record(`${lang}-${next}-${path.split('/')[0]}-window`, await screen(page));
        fact(`${next} window`, flat(await dialog.innerText().catch(() => null), 1500));
        fact(`${next} raw keys (window)`, await keys(page, '[role="dialog"]'));
        await page.keyboard.press('Escape');
        await dialog.waitFor({state: 'hidden', timeout: 5000}).catch(() => {});
    };
    try {
        // 1
        await signIn(page, 'admin');
        await idle(page);
        // 2
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
        await idle(page);
        if (!nb) {
            await changeLanguage(page, 'français', 'fr_CA');
            fact('2 language', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), htmlLang: await page.locator('html').getAttribute('lang')});
        }
        // 3
        await page.goto(app.url(`/index.php/index/${lang}/admin/settings`));
        await idle(page);
        const tab = page.locator('#statistics-button').first();
        fact('3 tab', flat(await tab.innerText().catch(() => null)));
        await tab.click();
        await idle(page);
        const panel = page.locator('#statistics');
        await panel.locator('form').first().waitFor({timeout: T}).catch(() => {});
        record(`${lang}-3-site-statistics`, await screen(page));
        fact('3 groups', await panel.locator('.pkpFormGroup, fieldset').evaluateAll((els) => els.map((g) => ({
            label: (g.querySelector('.pkpFormGroup__heading, legend')?.textContent || '').replace(/\s+/g, ' ').trim(),
            description: (g.querySelector('.pkpFormGroup__description, .pkpFormFieldDescription, .pkpFormField__description')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 300),
        })).filter((g) => g.label || g.description)).catch((e) => e.message));
        fact('3 raw keys', await keys(page, '#statistics'));
        // 4-5
        await statsPage('4', 'publications/publications');
        // 6-7
        await statsPage('6', 'context/context');
    } finally {
        record(`${lang}-facts`, facts);
        await close();
    }
});
