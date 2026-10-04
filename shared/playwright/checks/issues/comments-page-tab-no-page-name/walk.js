// Issue walk: U14 A13 — the backend Comments page's browser tab reads the
// context's name alone, where the side menu's other pages read
// "{page heading} | {context}".
// Report: docs/issues/U14-A13-comments-page-tab-no-page-name.md
//
// Preconditions: PKP's default test dataset for main (OJS, OMP, OPS).
// Steps:
//   1.   sign in as dbarnes;
//   2-3. Settings › Website › "Content" › "Comments", tick "Enable Public
//        Comments", "Save"; read the tab (control: "Website Settings | …");
//   4-5. side menu "Content" › "Comments"; read the tab;
//   6.   "Approved", "Hidden/Needs Approval", "Reported"; read the tab after each;
//   7.   reload; read the tab.
//
// Modes (first argument):
//   walk (default)  the steps above
//   nb              neighbour check, alone: the tab of Website Settings,
//                   Announcements, Users & Roles (by address) and the
//                   dashboard, signed in as dbarnes (no setting changed)
//
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all \
//     shared/playwright/checks/issues/comments-page-tab-no-page-name/walk.js [walk|nb]
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const {commentsPages} = require('./lib');

const MODE = process.argv[2] || 'walk';
const log = (...a) => console.log('[a13]', new Date().toISOString().slice(11, 19), ...a);

/** A step that records what it saw and never throws. */
async function step(R, name, fn) {
    try {
        R[name] = (await fn()) ?? 'ok';
    } catch (e) {
        R[name] = {error: e.message.split('\n')[0]};
        log('step', name, 'ERROR', R[name].error);
    }
    log(name, JSON.stringify(R[name]));
}

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const R = {mode: MODE, app: app.name};
    try {
        await signIn(page, 'dbarnes');
        if (MODE === 'nb') {
            const paths = {
                website: 'management/settings/website',
                announcements: 'management/settings/announcements',
                usersRoles: 'management/settings/access',
                dashboard: 'dashboard/editorial',
            };
            for (const [name, path] of Object.entries(paths)) {
                await step(R, name, async () => {
                    await page.goto(app.url(`/index.php/${app.contextPath}/${path}`));
                    await idle(page);
                    const h1 = await page.locator('main h1').first().innerText().catch(() => null);
                    return {title: await page.title(), h1: h1 && h1.replace(/\s+/g, ' ').trim()};
                });
            }
            record('a13-nb', R);
            return;
        }

        const po = commentsPages(app);
        await step(R, 's2-3 enable comments', async () => {
            const settings = po.settings(page);
            await settings.goto();
            await settings.box().check();
            await settings.save();
            await idle(page);
            return {title: await page.title()};
        });
        record('a13-website-after-save', await screen(page));

        await step(R, 's4-5 Content › Comments', async () => {
            await po.openCommentsFromMenu(page);
            await po.comments(page).expectOpen();
            await idle(page);
            return {url: page.url(), title: await page.title()};
        });
        record('a13-comments', await screen(page));
        await shot(page, 'a13-comments');

        for (const tab of ['Approved', 'Hidden/Needs Approval', 'Reported']) {
            await step(R, `s6 ${tab}`, async () => {
                await po.comments(page).openTab(tab);
                return {url: page.url(), title: await page.title()};
            });
        }

        await step(R, 's7 reload', async () => {
            await page.reload();
            await po.comments(page).expectOpen();
            await idle(page);
            return {url: page.url(), title: await page.title()};
        });
        record('a13-comments-reloaded', await screen(page));
        record('a13-walk', R);
    } finally {
        await close();
    }
});
