// Issue report docs/issues/U10-A6-french-appearance-settings-raw-keys.md (U10 A6): in French (Canada)
// a press's and a preprint server's appearance settings, and the theme's download chart on a book or
// preprint page, print codes. Takes the report's Steps on PKP's default test dataset, all three apps
// (a journal is the control):
//   1. rvaca (the manager) signs in
//   2. the initials menu > "Change Language" > "français"
//   3. Settings > Website > "Apparence" > "Thème": the theme list and the theme's fields
//   4. the side tab "Configuration"
//   5. the side tab "Avancé"
//   6. "Thème": the usage statistics field's second choice (bar chart), "Enregistrer"
//   7. a published item's page: the chart's heading and the line under it
// Step 6 changes one theme setting: reset the fleet before each run.
// NB=1 runs the neighbour check alone: the same steps in English, which the fix must leave as they are.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/french-appearance-settings-raw-keys/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, screen, shot, record, idle, rawKeys} = require('../../../probe');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');

const T = 30_000;
const flat = (t, n = 4000) => (t == null ? null : String(t).replace(/\s+/g, ' ').trim().slice(0, n));
const ITEM = {ojs: 'article/view/17', omp: 'catalog/book/5', ops: 'preprint/view/2'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const lang = nb ? 'en' : 'fr_CA';
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour (en)' : 'steps (fr_CA)'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 4000)}`);
    };
    const keys = async (page, scope) => {
        const all = await rawKeys(page, scope ? {scope} : undefined).catch((e) => `rawKeys failed: ${e.message}`);
        return Array.isArray(all) ? [...new Set(all.map((k) => String(k).replace(/ @ .*$/, '')))] : all;
    };
    // A side tab's form: each field's label, description and choices, as the screen shows them.
    const readPanel = async (page, step, id) => {
        const panel = page.locator(`[id="${id}"]`);
        await panel.locator('form').first().waitFor({timeout: T});
        await idle(page);
        record(`${lang}-${step}-${id}`, await screen(page));
        fact(`${step} side tab`, flat(await page.locator(`[id="${id}-button"]`).first().innerText().catch(() => null)));
        fact(`${step} fields`, await panel.locator('.pkpFormField').evaluateAll((els) => els.map((f) => {
            const t = (s) => (f.querySelector(s)?.textContent || '').replace(/\s+/g, ' ').trim();
            return {
                label: t('.pkpFormFieldLabel, legend'),
                description: t('.pkpFormField__description, .pkpFormGroup__description').slice(0, 300),
                options: [...f.querySelectorAll('option, label.pkpFormField--options__option, .pkpFormField--options__option')]
                    .map((o) => o.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean),
            };
        }).filter((x) => x.label || x.description || x.options.length)).catch((e) => e.message));
        fact(`${step} raw keys`, await keys(page, `[id="${id}"]`));
    };
    const side = async (page, id) => {
        const b = page.locator(`[id="${id}-button"]`).first();
        await b.waitFor({timeout: T});
        await b.click();
        await idle(page);
    };
    const {page, close} = await launch(app);
    try {
        // 1
        await signIn(page, 'rvaca');
        await idle(page);
        // 2
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
        await idle(page);
        if (!nb) {
            await changeLanguage(page, 'français', 'fr_CA');
            fact('2 language', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), htmlLang: await page.locator('html').getAttribute('lang')});
        }
        // 3
        await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/management/settings/website`));
        await idle(page);
        fact('3 page', {title: await page.title(), tabs: (await page.locator('[role="tab"]').allInnerTexts().catch(() => [])).map((x) => flat(x, 80))});
        await side(page, 'appearance');
        await side(page, 'theme');
        await readPanel(page, '3', 'theme');
        fact('3 theme list', await page.locator('[id="theme"] select').first().evaluate((s) => ({
            label: s.closest('.pkpFormField')?.querySelector('.pkpFormFieldLabel')?.textContent.replace(/\s+/g, ' ').trim(),
            options: [...s.options].map((o) => `${o.value}: ${o.textContent.trim()}`),
        })).catch((e) => e.message));
        // 4
        await side(page, 'appearance-setup');
        await readPanel(page, '4', 'appearance-setup');
        // 5
        await side(page, 'advanced');
        await readPanel(page, '5', 'advanced');
        // 6
        await side(page, 'theme');
        const themePanel = page.locator('[id="theme"]');
        const bar = themePanel.locator('input[name="displayStats"][value="bar"]');
        await bar.waitFor({timeout: T});
        const statsField = bar.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " pkpFormField ")][1]');
        fact('6 statistics field', flat(await statsField.innerText().catch(() => null)));
        await bar.check();
        const save = themePanel.getByRole('button', {name: /^\s*(Enregistrer|Save)\s*$/}).last();
        await save.waitFor({timeout: T});
        fact('6 save button', flat(await save.innerText().catch(() => null)));
        const saved = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+\/theme/.test(r.url()) && ['PUT', 'POST'].includes(r.request().method()), {timeout: T});
        await save.click();
        const resp = await saved.catch((e) => ({status: () => `no response: ${e.message}`}));
        await idle(page);
        fact('6 save', {status: resp.status()});
        record(`${lang}-6-saved`, await screen(page));
        // 7
        await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/${ITEM[app.name]}`));
        await idle(page);
        const chart = page.locator('.item.downloads_chart, .downloads_chart').first();
        await chart.waitFor({timeout: T}).catch(() => {});
        record(`${lang}-7-item`, await screen(page));
        await chart.scrollIntoViewIfNeeded().catch(() => {});
        await shot(page, `${lang}-7-item`).catch(() => {});
        fact('7 item', {
            url: page.url().replace(/^https?:\/\/[^/]+/, ''),
            title: await page.title(),
            chart: flat(await chart.innerText().catch(() => null), 600),
            noStatsLine: await chart.locator('.usageStatsUnavailable').evaluate((el) => ({text: el.textContent.replace(/\s+/g, ' ').trim(), shown: !!(el.offsetWidth || el.offsetHeight)})).catch(() => null),
        });
        fact('7 raw keys', await keys(page));
        fact('7 script config', await page.evaluate(() => (window.pkpUsageStats ? window.pkpUsageStats.locale : null)).catch(() => null));
    } finally {
        record(`${lang}-facts`, facts);
        await close();
    }
});
