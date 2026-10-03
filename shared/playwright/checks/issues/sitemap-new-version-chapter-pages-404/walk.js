// Issue report docs/issues/U20-OMP4-sitemap-new-version-chapter-pages-404.md (U20 OMP4): once a
// published book has a second version, the press's sitemap lists its chapter pages under the
// chapter's new number, which answers "404 Not Found", while the book's page links the first number.
// Takes the report's Steps on PKP's default test dataset, OMP (OJS and OPS have no chapters):
//   1. signed out: the sitemap's chapter entry for submission 14, and where it leads (control)
//   2. dbarnes opens submission 14's workflow
//   3. "Create New Version", confirmed
//   4. signed out: the sitemap's chapter entry, followed
//   5. the book's page: its chapter link, followed
//   6. dbarnes publishes the new version
//   7. signed out: the sitemap's chapter entry, followed; the book page's link again
// NB=1 is the neighbour check for a fix trial, alone: on the freshly loaded dataset (no new
// version), every sitemap entry signed out and where each chapter entry leads; with the fix in and
// out the list must be the same.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/sitemap-new-version-chapter-pages-404/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const {readSitemap} = require('../sitemap-lists-expired-announcements/lib');
const {workflowFrame, createNewVersion, publishShownVersion} = require('../older-version-tab-current-title/lib');
const L = require('./lib');

const BOOK = 14;

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour' : 'steps'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 3000)}`);
        return v;
    };
    const step = async (k, fn) => { try { return fact(k, await fn()); } catch (e) { return fact(k, {error: String(e.message).replace(/\s+/g, ' ').slice(0, 400)}); } };
    const {page, close} = await launch(app);
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
    const fails = [];
    page.on('response', (r) => { if (r.status() >= 500) fails.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`); });
    try {
        if (nb) {
            await step('nb sitemap', async () => (await readSitemap(app, page)).locs);
            await step('nb chapter entries', () => L.sitemapChapters(app, page, BOOK));
            await step('nb book page', () => L.bookChapterLinks(app, page, BOOK));
        } else {
            // 1
            await step('1 sitemap chapter entries', () => L.sitemapChapters(app, page, BOOK));
            record('1-chapter', await screen(page));
            // 2
            await signIn(page, 'dbarnes');
            const frame = workflowFrame(page, app);
            await step('2 open workflow', async () => { await frame.gotoEditorial(BOOK); await idle(page); return page.url().replace(/^https?:\/\/[^/]+/, ''); });
            record('2-workflow', await screen(page));
            // 3
            await step('3 create new version', () => createNewVersion(page, app));
            record('3-new-version', await screen(page));
            // 4
            await signOut(page);
            await step('4 sitemap chapter entries', () => L.sitemapChapters(app, page, BOOK));
            record('4-chapter-entry', await screen(page));
            // 5
            await step('5 book page chapter link', () => L.bookChapterLinks(app, page, BOOK));
            record('5-book-chapter', await screen(page));
            // 6
            await signIn(page, 'dbarnes');
            await step('6 open workflow', async () => { await frame.gotoEditorial(BOOK); await idle(page); return page.url().replace(/^https?:\/\/[^/]+/, ''); });
            await step('6 publish new version', () => publishShownVersion(page));
            record('6-published', await screen(page));
            // 7
            await signOut(page);
            await step('7 sitemap chapter entries', () => L.sitemapChapters(app, page, BOOK));
            record('7-chapter-entry', await screen(page));
            await step('7 book page chapter link', () => L.bookChapterLinks(app, page, BOOK));
        }
        await idle(page).catch(() => {});
        fact('errors', {script: errs, server: fails});
    } finally {
        record(`${nb ? 'nb' : 'steps'}-facts`, facts);
        await close();
    }
});
