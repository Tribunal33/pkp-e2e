// Neighbour check for the fix of U13 A6 / U69 A5 (walk.js beside it): run
// after walk.js, on the state it leaves, with the fix in and out. Signed
// out, it reads pages the fix must leave as they are:
//   - the current version's page: tab and heading read the current title;
//   - OMP: the current version's chapter page, whose tab reads the
//     chapter's title (book.tpl's chapter branch). The older version's
//     chapter page is not read: on this dataset it answers a server error
//     before any template runs (U69 A19, a separate fault).
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/older-version-tab-current-title/neighbour.js
const {forEachApp, launch, screen, record, idle} = require('../../../probe');
const {rel, readVersionPage} = require('./lib');

const LANDING = {ojs: 'article/view/mwandenga', ops: 'preprint/view/3', omp: 'catalog/book/14'};

forEachApp(async (app) => {
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        await page.goto(app.url(`/index.php/${ctx}/${LANDING[app.name]}`));
        await idle(page);
        facts.current = await readVersionPage(page);
        facts.current.ok = !!facts.current.heading && facts.current.tab.startsWith(facts.current.heading);
        console.log(`[fact] ${app.name} neighbour current: ${JSON.stringify({tab: facts.current.tab, heading: facts.current.heading, ok: facts.current.ok})}`);
        if (app.name === 'omp') {
            const chapterOf = async (label) => {
                const href = await page.locator('a[href*="/chapter/"]').first().getAttribute('href').catch(() => null);
                if (!href) return {label, href: null};
                await page.goto(href);
                await idle(page);
                const heading = await page.locator('.page h1').first().innerText().catch(() => null);
                const out = {label, url: rel(page.url()), tab: await page.title(), heading: heading && heading.replace(/\s+/g, ' ').trim()};
                out.ok = !!out.heading && out.tab.startsWith(out.heading);
                record(`neighbour-chapter-${label}`, await screen(page));
                return out;
            };
            facts.currentChapter = await chapterOf('current');
            console.log(`[fact] omp neighbour chapter (current version): ${JSON.stringify(facts.currentChapter)}`);
        }
    } finally {
        await close();
    }
    record('neighbour', facts);
});
