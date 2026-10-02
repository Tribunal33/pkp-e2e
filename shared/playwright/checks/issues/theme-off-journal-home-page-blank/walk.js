// Issue report docs/issues/U62-OJS1-theme-off-journal-home-page-blank.md (U62 OJS1):
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets").
//   (default)  as `rvaca`, Settings › Website › "Plugins": untick "Default Theme", "OK" in the
//              "Disable" window; then the context's home page and "About" page as the same user,
//              each with its answer's status, its style sheets and its headings, and the server
//              log lines the home page wrote.
//   neighbour  (the fix's): "Default Theme" left on, the context's home page as a visitor: status,
//              style sheets, headings and the current issue's articles, so the fix in and out can
//              be compared. Nothing is built by the kit in either mode.
//
// Reset first:  npm run fleet-prep -- --feature issues-g2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-g2 PROBE_AGENT=g2 node bin/probe.js all shared/playwright/checks/issues/theme-off-journal-home-page-blank/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-g2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-g2-3_5 PROBE_AGENT=g2 node bin/probe.js all shared/playwright/checks/issues/theme-off-journal-home-page-blank/walk.js
// Facts: .reports/<feature>/g2/ojs1-facts[-<run>]-<app>.json (steps), ojs1-nb-facts[-<run>]-<app>.json (neighbour)
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, serverLog} = require('../../../probe');

const MODE = process.argv[2] || 'steps';
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Open an address and read what came back: status, style sheets, headings, body text. Never throws. */
async function visit(page, url) {
    let status = null;
    let error = null;
    try {
        const r = await page.goto(url, {waitUntil: 'load', timeout: 60_000});
        status = r ? r.status() : null;
    } catch (e) {
        error = flat(e.message, 200);
    }
    await idle(page).catch(() => {});
    const read = await page
        .evaluate(() => ({
            title: document.title,
            styleSheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href').replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '')),
            bodyFont: document.body ? getComputedStyle(document.body).fontFamily : null,
            headings: [...document.querySelectorAll('h1, h2, h3')].map((h) => h.innerText.trim()).filter(Boolean).slice(0, 20),
            bodyChars: document.body ? document.body.innerText.trim().length : 0,
            bodyText: document.body ? document.body.innerText.trim().replace(/\s+/g, ' ').slice(0, 600) : '',
        }))
        .catch((e) => ({readError: String(e.message).slice(0, 200)}));
    return {status, error, ...read};
}

forEachApp(async (app) => {
    const {WebsitePluginsPage} = require('../../../pages/PluginsPages.js');
    const name = MODE === 'neighbour' ? 'ojs1-nb-facts' : 'ojs1-facts';
    const fact = (k, v) => {
        record(name, {[k]: v}, {merge: true});
        console.log(`[${name}]`, app.name, k, JSON.stringify(v).slice(0, 900));
    };
    const home = app.url(`/index.php/${app.contextPath}`);
    const about = app.url(`/index.php/${app.contextPath}/about`);
    const log = serverLog(app);
    const {page, close} = await launch(app);
    try {
        if (MODE === 'neighbour') {
            // The theme stays on: the home page as a visitor.
            const from = log.mark();
            const h = await visit(page, home);
            h.articles = await page
                .locator('.obj_article_summary .title, .cmp_article_list .title')
                .evaluateAll((es) => es.map((e) => e.innerText.trim()))
                .catch(() => []);
            fact('homeThemeOn', h);
            fact('homeThemeOnLog', log.since(from));
            record('ojs1-nb-home', await screen(page).catch(() => null));
            await shot(page, 'ojs1-nb-home').catch(() => {});
            return;
        }

        // 1. Sign in as rvaca (the journal manager).
        await signIn(page, 'rvaca');
        // 2. Settings › Website › "Plugins".
        const plugins = new WebsitePluginsPage(page, app.contextPath);
        await plugins.goto();
        const list = plugins.list;
        fact('themeRow', {name: flat(await list.rowName('defaultthemeplugin').innerText()), ticked: await list.box('defaultthemeplugin').isChecked()});
        // 3. Untick "Default Theme"; the "Disable" window.
        const win = await list.pressTicked('defaultthemeplugin');
        fact('disableWindow', flat(await win.innerText()));
        // 4. "OK".
        const resp = await list.confirmDisable('defaultthemeplugin');
        fact('disableAnswer', {status: resp.status(), body: flat(await resp.text(), 300)});
        const s4 = await screen(page);
        record('ojs1-plugins-after', s4);
        fact('notices', s4.notices);
        await shot(page, 'ojs1-plugins-after');
        // 5. The context's home page.
        const from = log.mark();
        const h = await visit(page, home);
        fact('home', h);
        fact('homeLog', log.since(from));
        record('ojs1-home', await screen(page).catch(() => null));
        await shot(page, 'ojs1-home').catch(() => {});
        // 6. Control: "About".
        const fromA = log.mark();
        const a = await visit(page, about);
        fact('about', {...a, bodyText: flat(a.bodyText, 200)});
        fact('aboutLog', log.since(fromA));
        await shot(page, 'ojs1-about').catch(() => {});
        await signOut(page).catch(() => {});
    } catch (e) {
        fact('error', flat(e.stack || e.message, 800));
        await shot(page, 'ojs1-error').catch(() => {});
    } finally {
        await close();
    }
});
