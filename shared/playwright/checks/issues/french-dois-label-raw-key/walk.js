// Issue report docs/issues/U08-A23-french-dois-label-raw-key.md (U08 A23): in French (Canada) a
// press's and a preprint server's side menu entry "DOIs", and the page it opens, read
// "##doi.manager.displayName##". Takes the report's Steps on PKP's default test dataset, all three
// apps (a journal is the control):
//   1. dbarnes signs in
//   2. the initials menu > "Change Language" > "français"
//   3. the side menu: the DOIs entry's text and name, and every code the side menu holds
//   4. the entry pressed: the browser tab, the heading, and every code on the page
// Changes nothing. NB=1 runs the neighbour check alone: steps 3 and 4 in English, which the fix
// must leave as they are.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset 1 --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/french-dois-label-raw-key/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, screen, record, idle, rawKeys} = require('../../../probe');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');
const {sideMenu} = require('../admin-without-role-dashboard-error/lib');

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
        return Array.isArray(all) ? [...new Set(all.map((k) => (typeof k === 'string' ? k : JSON.stringify(k))))] : all;
    };
    const errors = [];
    const {page, close} = await launch(app);
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('response', (r) => {
        if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`);
    });
    try {
        // 1
        await signIn(page, 'dbarnes');
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
        await idle(page);
        // 2
        if (!nb) {
            await changeLanguage(page, 'français', 'fr_CA');
            fact('2 language', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), htmlLang: await page.locator('html').getAttribute('lang')});
        }
        // 3
        await page.locator('#app-nav').first().waitFor({timeout: T});
        await idle(page);
        record(`${lang}-3-dashboard`, await screen(page));
        const entry = page.locator('#app-nav a[href$="/dois"]').first();
        fact('3 DOIs entry', (await entry.count())
            ? {text: flat(await entry.innerText().catch(() => null)), ariaLabel: await entry.getAttribute('aria-label'), href: (await entry.getAttribute('href')).replace(/^https?:\/\/[^/]+/, '')}
            : null);
        const menu = await sideMenu(page);
        fact('3 side menu', menu.entries.map((e) => e.text));
        fact('3 raw keys (side menu)', await keys(page, '#app-nav'));
        // 4
        if (await entry.count()) {
            await entry.click();
            await page.waitForURL(/\/dois(\?|#|$)/, {timeout: T});
            await idle(page);
            await page.locator('main h1').first().waitFor({timeout: T}).catch(() => {});
            await idle(page);
            record(`${lang}-4-dois`, await screen(page));
            fact('4 DOIs page', {
                url: page.url().replace(/^https?:\/\/[^/]+/, ''),
                tab: await page.title(),
                h1: flat(await page.locator('main h1').first().innerText().catch(() => null)),
                current: flat(await page.locator('#app-nav [aria-current="page"], #app-nav .p-panelmenu-item-link-active, #app-nav [class*="current" i]').first().innerText().catch(() => null)),
            });
            fact('4 raw keys (page)', await keys(page));
        }
        fact('errors', errors);
    } finally {
        record(`${lang}-facts`, facts);
        await close();
    }
});
