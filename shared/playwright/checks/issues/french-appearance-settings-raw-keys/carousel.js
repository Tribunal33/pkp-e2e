// Issue report docs/issues/U10-A6-french-appearance-settings-raw-keys.md, the home page carousel
// (U11 A7): in French (Canada) a press's and a preprint server's highlights carousel gives its two
// arrows raw codes as their screen-reader names. Takes the report's "Home page carousel" Steps on
// PKP's default test dataset, all three apps (a journal is the control). The kit builds nothing:
// both highlights are made through the screens, as `rvaca`, the manager.
//   1. rvaca signs in
//   2. Settings > Website > Setup > Highlights
//   3-4. "Add Highlight" twice (with one slide the carousel hides its arrows)
//   5. the initials menu > "Change Language" > "français"
//   6. read on the way: "Paramètres" > "Site Web", the tabs across the top (`##navigation.content##`)
//   7. the home page in French: the arrows' screen-reader names (`aria-label`)
// NB=1 runs the neighbour check alone: the same steps in English (no step 5), which the fix must
// leave as they are. Steps 3-4 add highlights: reset the fleet before each run.
// Reset:   PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:     PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/french-appearance-settings-raw-keys/carousel.js
//          (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
// Facts:   .reports/<feature>/<id>/carousel-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle, rawKeys} = require('../../../probe');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');

const T = 30_000;

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('carousel.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const lang = nb ? 'en' : 'fr_CA';
    const mode = nb ? 'nb' : 'steps';
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode, steps: {}};
    const {page, close} = await launch(app);
    const step = async (name, fn) => {
        try {
            facts.steps[name] = await fn();
        } catch (e) {
            facts.steps[name] = {error: e.message.split('\n')[0]};
        }
        console.log(`[fact] ${app.name} ${name}: ${JSON.stringify(facts.steps[name]).slice(0, 1500)}`);
        record(`carousel-${mode}-${name}`, await screen(page).catch((e) => ({error: e.message})));
    };
    const panel = () => page.locator('.highlightsListPanel');
    const openHighlights = async () => {
        await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/website`));
        const setupTab = page.locator('#setup-button').first();
        await setupTab.waitFor({timeout: T});
        if ((await setupTab.getAttribute('aria-selected')) !== 'true') await setupTab.click();
        await page.locator('#setup').first().getByRole('tab', {name: 'Highlights', exact: true}).click();
        await panel().waitFor({timeout: T});
        await idle(page);
    };
    const add = async (title, url) => {
        await panel().getByRole('button', {name: 'Add Highlight', exact: true}).click();
        const dialog = page.getByRole('dialog', {name: 'Add Highlight'});
        await dialog.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        const body = dialog.locator('#highlight-title-control-en_ifr').contentFrame().locator('body');
        await body.click();
        await body.pressSequentially(title);
        await dialog.locator('#highlight-url-control').fill(url);
        await dialog.locator('#highlight-urlText-control-en').fill('Read more');
        const saved = page.waitForResponse((r) => /\/api\/v1\/highlights$/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
        await dialog.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await saved;
        await dialog.waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await idle(page);
        return {saveStatus: r.status(), rows: await panel().locator('.listPanel__itemTitle').allInnerTexts()};
    };

    try {
        await step('1-signin', async () => {
            await signIn(page, 'rvaca');
            await openHighlights();
            return {rows: await panel().locator('.listPanel__itemTitle').allInnerTexts()};
        });
        await step('3-add-first', () => add('First highlight u11d', 'https://example.org/u11d-1'));
        await step('4-add-second', () => add('Second highlight u11d', 'https://example.org/u11d-2'));
        if (!nb) {
            await step('5-language', async () => {
                await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
                await idle(page);
                await changeLanguage(page, 'français', 'fr_CA');
                return {url: page.url().replace(/^https?:\/\/[^/]+/, ''), htmlLang: await page.locator('html').getAttribute('lang')};
            });
        }
        await step('6-website-tabs', async () => {
            await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/management/settings/website`));
            await page.locator('#setup-button').first().waitFor({timeout: T});
            await idle(page);
            const top = await page.locator('[role="tablist"]').first().locator('> [role="tab"], [role="tab"]').evaluateAll((els) => {
                const list = els[0] && els[0].closest('[role="tablist"]');
                return els.filter((e) => e.closest('[role="tablist"]') === list).map((e) => ({id: e.id, text: e.textContent.replace(/\s+/g, ' ').trim()}));
            });
            const keys = await rawKeys(page).catch((e) => `rawKeys failed: ${e.message}`);
            return {top, rawKeys: Array.isArray(keys) ? [...new Set(keys.map((k) => String(k)))] : keys};
        });
        await step('7-home-carousel', async () => {
            await page.goto(app.url(`/index.php/${app.contextPath}/${lang}`));
            await idle(page);
            const carousel = page.locator('.highlights .swiper, .swiper').first();
            await carousel.waitFor({timeout: T});
            await page.waitForFunction(() => document.querySelector('.swiper-button-next')?.hasAttribute('aria-label'), null, {timeout: T}).catch(() => {});
            await carousel.scrollIntoViewIfNeeded().catch(() => {});
            await shot(page, `carousel-${mode}-7-home`).catch(() => {});
            const arrows = await page.locator('.swiper-button-prev, .swiper-button-next').evaluateAll((els) => els.map((e) => ({
                cls: e.className,
                ariaLabel: e.getAttribute('aria-label'),
                shown: !!(e.offsetWidth || e.offsetHeight),
            })));
            const heading = await page.locator('.highlights h2, .highlights .pkp_screen_reader').first().textContent().catch(() => null);
            const slides = await page.locator('.swiper-slide-title').allTextContents();
            const keys = await rawKeys(page).catch((e) => `rawKeys failed: ${e.message}`);
            return {
                url: page.url().replace(/^https?:\/\/[^/]+/, ''),
                htmlLang: await page.locator('html').getAttribute('lang'),
                heading: heading && heading.trim(),
                slides: slides.map((s) => s.trim()),
                arrows,
                rawKeys: keys,
            };
        });
    } finally {
        record(`carousel-facts-${mode}`, facts);
        await close();
    }
});
