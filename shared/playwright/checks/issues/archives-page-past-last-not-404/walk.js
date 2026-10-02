// Issue report docs/issues/U17-OPS5-archives-page-past-last-not-404.md (U17 OPS5): an "Archives" page past
// the last one opens as an empty page headed "Archives - Page 2" with "Previous 26-25 of 17" instead of
// "404 Not Found". Takes the report's Steps on PKP's default test dataset (a dataset fleet), OPS only (no
// other app has a preprint archive), signed out, creating nothing:
//   1  the server's home page
//   2  "Archives" in the main menu: heading, preprints, page links
//   3  the typed address of page 2 (preprints/index/2)
//   c  control: the section page past its last one (preprints/section/preprints/2)
// WALK=neighbour runs alone (fix in and out): as rvaca, Settings › Website › Setup › Lists, "Items per page"
// 10, "Save"; signed out, "Archives" (page 1 of 2), "Next" to page 2 (a real page that must stay), the typed
// page 3 (past the last), and preprints/index/1.
//
// Reset first:  npm run fleet-prep -- --feature issues-u17l --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u17l PROBE_AGENT=u17l node bin/probe.js ops shared/playwright/checks/issues/archives-page-past-last-not-404/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u17l-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u17l-3_5 PROBE_AGENT=u17l node bin/probe.js ops shared/playwright/checks/issues/archives-page-past-last-not-404/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, idle, serverLog} = require('../../../probe');
const {T, setItemsPerPage, openArchives} = require('./lib.js');

const MODE = process.env.WALK || 'walk';

forEachApp(async (app) => {
    if (app.name !== 'ops') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    const step = async (label, action) => {
        try {
            const out = await action();
            fact(label, out === undefined ? 'done' : out);
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
        }
        await idle(page).catch(() => null);
    };
    const ctx = (p) => app.url(`/index.php/${app.contextPath}${p}`);
    const archivesFromMenu = async () => {
        await page.getByRole('link', {name: 'Archives', exact: true}).first().click({timeout: T});
        await page.waitForLoadState('domcontentloaded');
        await idle(page).catch(() => null);
    };

    try {
        if (MODE === 'walk') {
            await step('1 the server\'s home page, signed out', async () => {
                const r = await page.goto(ctx(''));
                await idle(page).catch(() => null);
                return {status: r && r.status(), url: page.url(), title: await page.title()};
            });
            await step('2 "Archives" in the main menu', async () => {
                await archivesFromMenu();
                return openArchives(page, page.url());
            });
            record('s2-archives', await screen(page));
            await step('3 typed page 2', () => openArchives(page, ctx('/preprints/index/2')));
            record('s3-archives-page2', await screen(page));
            await step('c the section page past its last one', () => openArchives(page, ctx('/preprints/section/preprints/2')));
            record('c-section-page2', await screen(page));
        } else if (MODE === 'neighbour') {
            await step('n1 rvaca sets "Items per page" to 10', async () => {
                await signIn(page, 'rvaca');
                const out = await setItemsPerPage(page, app, 10);
                await signOut(page);
                return out;
            });
            await step('n2 "Archives" from the main menu', async () => {
                await page.goto(ctx(''));
                await archivesFromMenu();
                return openArchives(page, page.url());
            });
            record('n2-archives', await screen(page));
            await step('n3 "Next" to page 2', async () => {
                await page.locator('.cmp_pagination a.next').first().click({timeout: T});
                await page.waitForLoadState('domcontentloaded');
                return openArchives(page, page.url());
            });
            record('n3-archives-page2', await screen(page));
            await step('n4 typed page 3 (past the last)', () => openArchives(page, ctx('/preprints/index/3')));
            record('n4-archives-page3', await screen(page));
            await step('n5 typed page 1', () => openArchives(page, ctx('/preprints/index/1')));
        }
    } finally {
        fact('server log since start', log.since(from));
        record(`facts-${MODE}`, facts);
        await close();
    }
});
