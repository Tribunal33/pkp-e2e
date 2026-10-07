// Issue walk: U04 A15 — the public "What is ORCID?" and "ORCID Authorization" pages'
// browser tab reads only "| {context name}", with no page name before it.
// Report: docs/issues/U04-A15-orcid-pages-tab-no-page-name.md
//
// Preconditions: PKP's default test dataset (main or stable-3_5_0; OJS, OMP, OPS).
// Steps (MODE=steps, the default):
//   1. signed out, open /about (control: "About the Journal | …");
//   2. open /orcid/about: heading, trail, browser tab;
//   3. open /orcid/verify: heading, text, browser tab;
//   4. sign in as dbarnes;
//   5. open /orcid/about again: browser tab;
//   6. open /orcid/verify again: browser tab.
//
// MODE=nb  neighbour check, alone: signed out, the browser tab and heading of the
//          context's other public pages (home, About, Login, Privacy Statement,
//          Submissions, Contact, Announcements, Editorial Masthead), which already name
//          themselves and must not change with the fix in or out.
//
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=r3 [MODE=nb] [PROBE_RUN=…] \
//     node bin/probe.js all shared/playwright/checks/issues/orcid-pages-tab-no-page-name/walk.js
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, serverLog} = require('../../../probe');

const MODE = process.env.MODE || 'steps';
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const log = (...a) => console.log('[a15]', new Date().toISOString().slice(11, 19), ...a);

/** Open a public page by its address and read what names it. Never throws. */
async function readPage(page, app, path) {
    const out = {path};
    try {
        const resp = await page.goto(app.url(`/index.php/${app.contextPath}/${path}`));
        await idle(page);
        out.status = resp ? resp.status() : null;
        out.url = page.url();
        out.title = flat(await page.title());
        out.heading = flat(
            await page.locator('.pkp_structure_main h1, .pkp_structure_main h2').first()
                .innerText({timeout: 3_000}).catch(() => null),
        );
        out.trail = flat(await page.locator('nav.cmp_breadcrumbs').first().innerText({timeout: 2_000}).catch(() => null));
    } catch (e) {
        out.error = flat(e.message, 400);
    }
    log(app.name, path, JSON.stringify(out));
    return out;
}

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const slog = serverLog(app);
    const from = slog.mark();
    const R = {mode: MODE, app: app.name, line: app.line || 'main'};
    try {
        if (MODE === 'nb') {
            await signOut(page).catch(() => {});
            for (const path of ['', 'about', 'login', 'about/privacy', 'about/submissions',
                'about/contact', 'announcement', 'about/editorialMasthead']) {
                R[path || 'home'] = await readPage(page, app, path);
            }
            R.serverLog = slog.since(from);
            record('a15-nb', R);
            return;
        }

        await signOut(page).catch(() => {});
        R.s1_about = await readPage(page, app, 'about');
        R.s2_orcidAbout = await readPage(page, app, 'orcid/about');
        record('a15-s2-orcid-about-signed-out', await screen(page));
        await shot(page, 'a15-s2-orcid-about');
        R.s3_orcidVerify = await readPage(page, app, 'orcid/verify');
        R.s3_text = flat((await screen(page)).text?.main, 800);
        record('a15-s3-orcid-verify-signed-out', await screen(page));
        await shot(page, 'a15-s3-orcid-verify');

        try {
            await signIn(page, 'dbarnes', {contextPath: app.contextPath});
            await idle(page);
            R.s4_signedIn = {url: page.url(), title: flat(await page.title())};
        } catch (e) {
            R.s4_signedIn = {error: flat(e.message, 400)};
        }
        R.s5_orcidAbout = await readPage(page, app, 'orcid/about');
        R.s6_orcidVerify = await readPage(page, app, 'orcid/verify');
        record('a15-s6-orcid-verify-signed-in', await screen(page));
        R.serverLog = slog.since(from);
        record('a15-walk', R);
    } finally {
        await close();
    }
});
