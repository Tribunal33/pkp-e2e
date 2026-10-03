// Issue report docs/issues/U10-A11-french-masthead-order-text-names-journal.md (U10 A11): in French
// (Canada) the "Entête" (Editorial Masthead) tab of a press's and a preprint server's appearance
// settings says its list orders "la page de l'équipe éditoriale de la revue" (the journal's).
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default
// test dataset, as the dataset's manager `rvaca` on `publicknowledge`, all three apps (the journal
// is the control):
//   1. rvaca signs in
//   2. the initials menu > "Change Language" > "français"
//   3. Settings > Website, tab "Apparence", side tab "Entête"
//   4. the description under the list's heading
// Nothing is saved; the kit builds nothing.
//
// Modes (MODE=):
//   walk (default)  the Steps above, in French; every field of the tab is recorded, so the trial
//                   also shows the tab's other French texts unchanged.
//   nb              what the fix must leave alone: the same tab in English.
//
// Reset first:  PATH=<psql 16+>:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/french-masthead-order-text-names-journal/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, the 3.5 fleet's feature, PROBE_RUN=r35.
// Fix trial:    PROBE_RUN=fix (walk), nb-in / nb-out (MODE=nb), with fix.diff applied or not.
// Records each screen and the facts (facts-<mode>[-<run>]-<app>.json); asserts nothing.
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
        console.log(`[${app.name} ${MODE}] ${k}: ${flat(JSON.stringify(v), 1500)}`);
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
    const side = async (id) => {
        const b = page.locator(`[id="${id}-button"]`).first();
        await b.waitFor({timeout: T});
        await b.click();
        await idle(page);
    };
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
        fact('s3-tab', await step('s3', async () => {
            await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/management/settings/website`));
            await idle(page);
            await side('appearance');
            await side('appearance-masthead');
            const panel = page.locator('[id="appearance-masthead"]');
            await panel.locator('form').first().waitFor({timeout: T});
            await idle(page);
            record(`s3-${lang}-masthead`, await screen(page));
            await shot(page, `s3-${lang}-masthead`);
            return {
                title: await page.title(),
                topTab: flat(await page.locator('[id="appearance-button"]').first().innerText().catch(() => null), 80),
                sideTab: flat(await page.locator('[id="appearance-masthead-button"]').first().innerText().catch(() => null), 80),
            };
        }));
        // Step 4: every field of the tab, the list's description among them.
        fact('s4-fields', await step('s4', async () => {
            const panel = page.locator('[id="appearance-masthead"]');
            return panel.locator('.pkpFormField').evaluateAll((els) => els.map((f) => {
                const t = (s) => (f.querySelector(s)?.textContent || '').replace(/\s+/g, ' ').trim();
                return {
                    label: t('.pkpFormFieldLabel, legend'),
                    description: t('.pkpFormField__description, .pkpFormGroup__description'),
                    options: [...f.querySelectorAll('.pkpFormField--options__optionLabel')]
                        .map((o) => o.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean),
                };
            }).filter((x) => x.label || x.description || x.options.length));
        }));
        fact('s4-order-description', await step('s4b', async () => {
            const field = page.locator('[id="appearance-masthead"] fieldset.pkpFormField--options')
                .filter({has: page.locator('[id^="appearanceMasthead-mastheadUserGroupIds"]')});
            return {
                label: flat(await field.locator('legend, .pkpFormFieldLabel').first().innerText({timeout: T})),
                description: flat(await field.locator('.pkpFormField__description').first().innerText({timeout: T})),
            };
        }));
        fact('s4-raw-keys', await step('s4c', async () => {
            const all = await rawKeys(page, {scope: '[id="appearance-masthead"]'});
            return [...new Set(all.map((k) => String(k.key || k).replace(/ @ .*$/, '')))];
        }));
    } finally {
        record(`facts-${MODE}`, facts);
        await close();
    }
});
