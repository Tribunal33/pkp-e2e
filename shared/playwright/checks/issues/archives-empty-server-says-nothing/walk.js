// Issue report docs/issues/U17-OPS1-archives-empty-server-says-nothing.md (U17 OPS1): a preprint server with
// nothing posted shows "Archives", the search box and then nothing. Takes the report's Steps on PKP's default
// test dataset (a dataset fleet), OPS only (no other app has a preprint archive):
//   1    sign in as admin
//   2-3  Administration › "Hosted Servers" › "Create Server": "Empty Server u17j", path "emptyu17j", enabled; "Save"
//   4    log out
//   5    the new server's home page, then "Archives" in the main menu: what stands under the archive header
//   c    control: the new server's default section page (preprints/section/preprints)
// WALK=neighbour runs alone (fix in and out), signed out, creating nothing: publicknowledge's "Archives" still
// lists its preprints with page links, and its page 2 (past the last one, U17 OPS5's case) is recorded as it is.
//
// Reset first:  npm run fleet-prep -- --feature issues-u17j --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u17j PROBE_AGENT=u17j node bin/probe.js ops shared/playwright/checks/issues/archives-empty-server-says-nothing/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u17j-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u17j-3_5 PROBE_AGENT=u17j node bin/probe.js ops shared/playwright/checks/issues/archives-empty-server-says-nothing/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, idle, serverLog, rawKeys} = require('../../../probe');
const {T, createServer, readArchives} = require('./lib.js');

const MODE = process.env.WALK || 'walk';
const PATH = 'emptyu17j';

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
    const archivesFromMenu = async () => {
        const link = page.getByRole('link', {name: 'Archives', exact: true}).first();
        await link.click({timeout: T});
        await page.waitForLoadState('domcontentloaded');
        await idle(page).catch(() => null);
    };
    const keys = async () => (rawKeys ? (await rawKeys(page).catch(() => [])) : []);

    try {
        if (MODE === 'walk') {
            await step('1 sign in as admin', () => signIn(page, 'admin'));
            await step('2-3 create and enable "Empty Server u17j"', async () => ({
                saveStatus: await createServer(page, app, {
                    name: 'Empty Server u17j',
                    initials: 'ESU',
                    path: PATH,
                    email: 'emptyu17j@mailinator.com',
                }),
                landedOn: page.url(),
            }));
            record(`s3-created`, await screen(page));
            await step('4 log out', () => signOut(page));
            await step('5a the new server\'s home page', async () => {
                const r = await page.goto(app.url(`/index.php/${PATH}`));
                await idle(page).catch(() => null);
                return {status: r && r.status(), url: page.url(), title: await page.title()};
            });
            await step('5b "Archives" in the main menu', async () => {
                await archivesFromMenu();
                return {url: page.url(), ...(await readArchives(page)), rawKeys: await keys()};
            });
            record(`s5-archives`, await screen(page));
            await step('c the new server\'s section page', async () => {
                const r = await page.goto(app.url(`/index.php/${PATH}/preprints/section/preprints`));
                await idle(page).catch(() => null);
                return {
                    status: r && r.status(),
                    url: page.url(),
                    heading: (await page.locator('.page_section h1').innerText().catch(() => '')).trim(),
                    empty: (await page.locator('.page_section .section_empty').innerText().catch(() => '')).trim(),
                };
            });
            record(`c-section`, await screen(page));
        } else if (MODE === 'neighbour') {
            await step('n1 publicknowledge home, "Archives" in the main menu', async () => {
                await page.goto(app.url(`/index.php/${app.contextPath}`));
                await idle(page).catch(() => null);
                await archivesFromMenu();
                const a = await readArchives(page);
                return {url: page.url(), heading: a.heading, preprints: a.preprints, pagination: a.pagination, belowHeader: a.belowHeader.map((b) => ({tag: b.tag, cls: b.cls, text: b.text.slice(0, 120)}))};
            });
            record(`n1-archives`, await screen(page));
            await step('n2 publicknowledge "Archives" page 2 (past the last one)', async () => {
                const r = await page.goto(app.url(`/index.php/${app.contextPath}/preprints/index/2`));
                await idle(page).catch(() => null);
                return {status: r && r.status(), url: page.url(), ...(await readArchives(page))};
            });
            record(`n2-archives-page2`, await screen(page));
        }
    } finally {
        fact('server log since start', log.since(from));
        record(`facts-${MODE}`, facts);
        await close();
    }
});
