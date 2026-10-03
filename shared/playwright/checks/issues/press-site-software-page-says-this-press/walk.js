// Issue report docs/issues/U07-OMP2-press-site-software-page-says-this-press.md (U07 OMP2): on a
// press installation the site's own "About this Publishing System" page opens "This press uses
// Open Monograph Press …", where a journal and a preprint server installation open "This site
// uses …". Takes the report's Steps on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"). OJS and OPS are the control, on the same steps.
//
//   0. precondition: admin creates a second context on screen (Administration › Hosted … ›
//      "Create …"), since with one enabled context the site's address opens that context's home
//   1. sign out   2. open the site's home page   3. press the PKP logo in the footer
//   4. read the paragraph   5. control: the press's home page, the same logo, the paragraph
//
// Neighbour mode (`neighbour` as the script's argument, run alone, fix in and out): the
// context's own page (the press's home › the logo) keeps "This press uses … contact the press",
// with its contact link; no second context is needed for it.
//
// Reset first:  npm run fleet-prep -- --feature issues-u07e --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u07e PROBE_AGENT=u07e node bin/probe.js all shared/playwright/checks/issues/press-site-software-page-says-this-press/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u07e-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u07e-3_5 PROBE_AGENT=u07e node bin/probe.js all shared/playwright/checks/issues/press-site-software-page-says-this-press/walk.js
// Facts: .reports/<feature>/u07e/facts[-neighbour][-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');

const neighbour = process.argv.includes('neighbour');
const flat = (s, n = 3000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const ctxLib = require('../section-editors-not-assigned-second-journal/lib.js');
    const L = ctxLib.L(app);

    const facts = {app: app.name, line: app.line || 'main', mode: neighbour ? 'neighbour' : 'steps'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
    };
    const step = async (key, fn) => {
        try {
            fact(key, await fn());
        } catch (e) {
            fact(`${key} error`, String(e).slice(0, 500));
        }
    };
    // The footer's PKP logo, pressed; then the About page's heading, paragraph and its links.
    const pressLogo = async (page) => {
        const logo = page.locator('.pkp_brand_footer a');
        const alt = await logo.locator('img').getAttribute('alt');
        await Promise.all([page.waitForLoadState('load'), logo.click()]);
        await idle(page);
        return {logoAlt: alt, url: rel(page.url())};
    };
    const readAbout = async (page) => {
        const body = page.locator('.page_about_publishing_system');
        return {
            url: rel(page.url()),
            title: await page.title(),
            heading: flat(await body.locator('h1').innerText()),
            paragraph: flat(await body.locator('p').first().innerText()),
            links: await body.locator('p a').evaluateAll((as) => as.map((a) => ({text: a.textContent.trim(), href: a.getAttribute('href')}))),
        };
    };

    const {page, close} = await launch(app);
    try {
        if (!neighbour) {
            // Precondition: a second context, made on screen by admin.
            await signIn(page, 'admin');
            await step('0 second context saved', () =>
                ctxLib.createContext(page, app, {name: `u07e Second ${ctxLib.WORDS[app.name].noun}`, initials: 'U07E', path: 'u07esecond', email: 'u07e@mailinator.com'}));
            // 1
            await signOut(page);
            // 2
            await step('2 site home', async () => {
                const r = await page.goto(app.url(`/index.php/index${L}`));
                await idle(page);
                return {status: r && r.status(), url: rel(page.url()), title: await page.title(),
                    contexts: (await page.locator('.page_index_site .context h3, .page_index_site h3').allInnerTexts()).map((s) => flat(s))};
            });
            record('2-site-home', await screen(page));
            // 3
            await step('3 logo pressed', () => pressLogo(page));
            // 4
            await step('4 site-level about', () => readAbout(page));
            record('4-site-about', await screen(page));
            await shot(page, '4-site-about').catch(() => {});
            // 5 control: the press's own page
            await step('5 context home', async () => {
                await page.goto(app.url(`/index.php/${app.contextPath}${L}`));
                await idle(page);
                return {url: rel(page.url()), title: await page.title()};
            });
            await step('5 logo pressed', () => pressLogo(page));
            await step('5 context about', () => readAbout(page));
            record('5-context-about', await screen(page));
        } else {
            await step('nb context home', async () => {
                await page.goto(app.url(`/index.php/${app.contextPath}${L}`));
                await idle(page);
                return {url: rel(page.url()), title: await page.title()};
            });
            await step('nb logo pressed', () => pressLogo(page));
            await step('nb context about', () => readAbout(page));
            record('nb-context-about', await screen(page));
        }
    } finally {
        record(neighbour ? 'facts-neighbour' : 'facts', facts);
        await close();
    }
});
