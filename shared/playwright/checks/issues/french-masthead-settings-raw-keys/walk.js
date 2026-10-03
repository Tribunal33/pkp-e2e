// Issue report docs/issues/U07-A12-french-masthead-settings-raw-keys.md (U07 A12): in French (Canada)
// the "Bloc générique" (Masthead) tab of a press's and a preprint server's settings shows codes in
// place of group headings, labels, help lines and some publisher code types.
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default
// test dataset, as the dataset's manager `rvaca` on `publicknowledge`, all three apps (the journal
// is the control):
//   1. rvaca signs in
//   2. the initials menu > "Change Language" > "français"
//   3. Settings > Press (Server, Journal): the first tab, "Bloc générique"
//   4. every group heading, label and help line of the tab
//   5. a press: the publisher code type list's choices
// Nothing is saved; the kit builds nothing.
//
// Modes (MODE=):
//   walk (default)  the Steps above, in French.
//   nb              what the fix must leave alone: the same tab in English.
//
// Reset first:  PATH=<psql 16+>:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/french-masthead-settings-raw-keys/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, the 3.5 fleet's feature, PROBE_RUN=r35.
// Fix trial:    PROBE_RUN=fix (walk), nb-in / nb-out (MODE=nb), with fix-omp.diff / fix-ops.diff applied or not.
// Records each screen and the facts (facts-<mode>); asserts nothing.
const {forEachApp, launch, signIn, screen, shot, record, idle, rawKeys} = require('../../../probe');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');

const T = 30_000;
const MODE = process.env.MODE || 'walk';
const flat = (s, n = 600) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const lang = MODE === 'nb' ? 'en' : 'fr_CA';
    const facts = {mode: MODE, lang, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${app.name} ${MODE}] ${k}: ${flat(JSON.stringify(v), 3000)}`);
    };
    const {page, close} = await launch(app);
    /** One step; a throw is recorded, never fatal (a fix or an older line changes the screen). */
    const step = async (name, fn) => {
        try {
            return await fn();
        } catch (e) {
            await shot(page, `${name}-error`).catch(() => {});
            return {error: flat(e.message, 2000)};
        }
    };
    const panelSel = '[id="masthead"]';
    try {
        // Step 1.
        await signIn(page, 'rvaca');
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
        await idle(page);
        // Step 2.
        if (lang === 'fr_CA') {
            fact('s2-language', await step('s2', async () => {
                await changeLanguage(page, 'français', 'fr_CA');
                return {url: page.url().replace(/^https?:\/\/[^/]+/, ''), htmlLang: await page.locator('html').getAttribute('lang')};
            }));
        }
        // Step 3.
        fact('s3-page', await step('s3', async () => {
            await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/management/settings/context`));
            await idle(page);
            await page.locator(`${panelSel} form`).first().waitFor({timeout: T});
            await idle(page);
            record(`s3-${lang}-masthead`, await screen(page));
            await shot(page, `s3-${lang}-masthead`);
            return {
                title: await page.title(),
                heading: flat(await page.locator('h1').first().innerText().catch(() => null), 120),
                tabs: (await page.locator('[role="tab"]').allInnerTexts().catch(() => [])).map((x) => flat(x, 80)),
            };
        }));
        // Step 4: the groups' headings and help lines, then every field's label and help line.
        fact('s4-groups', await step('s4a', async () => page.locator(`${panelSel} .pkpFormGroup`).evaluateAll((els) => els.map((g) => {
            const t = (s) => (g.querySelector(s)?.textContent || '').replace(/\s+/g, ' ').trim();
            return {heading: t('.pkpFormGroup__heading, legend, h2, h3'), description: t('.pkpFormGroup__description').slice(0, 300)};
        }))));
        fact('s4-fields', await step('s4b', async () => page.locator(`${panelSel} .pkpFormField`).evaluateAll((els) => els.map((f) => {
            const t = (s) => (f.querySelector(s)?.textContent || '').replace(/\s+/g, ' ').trim();
            return {
                label: t('.pkpFormFieldLabel, legend'),
                description: t('.pkpFormField__description').slice(0, 300),
            };
        }).filter((x) => x.label || x.description))));
        // Step 5: a press's publisher code type list.
        if (app.name === 'omp') {
            fact('s5-code-types', await step('s5', async () => {
                const select = page.locator(`${panelSel} select[name="codeType"], ${panelSel} select[id*="codeType"]`).first();
                await select.waitFor({timeout: T});
                const label = await select.evaluate((s) => s.closest('.pkpFormField')?.querySelector('.pkpFormFieldLabel')?.textContent.replace(/\s+/g, ' ').trim());
                await select.click();
                const options = await select.evaluate((s) => [...s.options].map((o) => o.textContent.trim()));
                await page.keyboard.press('Escape');
                return {label, count: options.length, first: options.slice(0, 2), withCode: options.filter((o) => /##|\(/.test(o)).filter((o) => /##|Discontinued|abandonné|Abandonné/i.test(o))};
            }));
        }
        fact('s4-raw-keys', await step('s4c', async () => {
            const all = await rawKeys(page, {scope: panelSel});
            return [...new Set((all || []).map((k) => String(k).replace(/ @ .*$/, '')))];
        }));
        fact('page-raw-keys-outside-tab', await step('s4d', async () => {
            const all = await rawKeys(page);
            const inTab = new Set(facts['s4-raw-keys'] || []);
            return [...new Set((all || []).map((k) => String(k).replace(/ @ .*$/, '')))].filter((k) => !inTab.has(k));
        }));
    } finally {
        record(`facts-${MODE}`, facts);
        await close();
    }
});
