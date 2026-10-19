// Kept walk for docs/issues/U04-OJS1-orcid-review-no-country-fails-in-background.md (spec U04, register OJS1).
// OJS only (a press and a preprint server send no reviews to ORCID). On PKP's default test dataset for
// stable-3_3_0 upgraded to the line's code: its journal has no country, the state of every journal upgraded
// from 3.3 until "Masthead" is saved, and no screen can clear a country. dbarnes turns ORCID on under
// "Member Sandbox" with a City; Julie Janssen's verified iD is written as ORCID's sign-in leaves it (the one
// precondition only the outside service creates; the steps need `orcid` and `orcidIsVerified` alone); dbarnes
// opens submission 13, her completed review's row, "More Actions" › "Send Review To ORCID" › "OK", loads a
// few pages for the job runner, and admin reads Administration › "View Failed Jobs".
// Control (same run): City emptied on the ORCID tab, the same send: the skip the entry expects (no new failed job).
// Run (PKP_E2E_LINE=stable-3_5_0 in front of both for 3.5):
//   PKP_E2E_DATASET_BRANCH=stable-3_3_0 npm run fleet-prep -- --feature <f> --dataset <n> --apps ojs --reset
//   PROBE_FEATURE=<f> PROBE_AGENT=<id> node bin/probe.js ojs \
//     shared/playwright/checks/issues/orcid-review-no-country-fails-in-background/walk.js
// WALK_ROUTE=shortcut takes the same steps on the `main` dataset (the reset without PKP_E2E_DATASET_BRANCH)
// with the journal's `country` row deleted first, the state an upgraded 3.3 journal is in.
// WALK_MODE=neighbour (a fix trial's check): "Canada" picked on "Masthead", City set, the reviewer's full
// member-scope authorization (token, scope, refresh token, expiry), the same send: the deposit must still go
// on to contact ORCID (it then fails on the unreachable service).
const {forEachApp, launch, signIn, signOut, record, note, screen, shot, idle, serverLog} = require('../../../probe');
const K = require('../reviewer-response-erases-reminder-history/lib.js');
const A1 = require('../send-review-to-orcid-confirms-in-silence/lib.js');
const L = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const ENTRY = 'Send Review To ORCID';
const C = {user: 'jjanssen', name: 'Julie Janssen', submission: 13};

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // only a journal sends reviews to ORCID
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, reviewer: C.user, submission: C.submission};
    const step = async (key, fn) => {
        try {
            facts[key] = await fn();
        } catch (e) {
            facts[key] = {error: L.flat(e.message, 400)};
            note(`U04 OJS1 walk (${app.name}, ${MODE}): step ${key} failed: ${L.flat(e.message, 200)}`);
        }
        return facts[key];
    };
    const log = serverLog(app);
    // WALK_ROUTE=shortcut: on the `main` dataset instead of the upgraded 3.3 one, the journal's country row
    // deleted first (a developer's shortcut to the upgraded journal's state).
    if (process.env.WALK_ROUTE === 'shortcut') facts['p0-no-country-sql'] = L.dropCountry(app);
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        // Preconditions: the journal's country as Masthead shows it (and, in the neighbour, one picked).
        await step('p0-masthead-country', () => L.mastheadCountry(page, app));
        if (MODE === 'neighbour') await step('p0-masthead-set', () => L.setMastheadCountry(page, app, 'Canada'));
        await step('p1-orcid-settings', () => A1.enableOrcid(page, app, {api: 'Member Sandbox', city: 'Burnaby'}));
        facts['p1-stored'] = A1.orcidSettings(app);
        // The failure needs only a verified iD (the row's menu entry); the neighbour, which goes on to ORCID,
        // needs the member-scope token ORCID's sign-in leaves.
        await step('p2-authorized-id', async () => (MODE === 'neighbour' ? L.authorizeOrcid(app, C.user, '/activities/update') : L.verifyOrcid(app, C.user)));

        // Steps 1-4: the row, its menu, "Send Review To ORCID" › "OK", then page loads for the job runner.
        const send = async (prefix) => {
            const before = L.failedIds(app);
            const from = log.mark();
            await step(`${prefix}-row`, async () => K.rowText(await K.openWorkflow(page, app, C.submission), C.name));
            await step(`${prefix}-menu`, async () => K.menuEntries(page, await K.openWorkflow(page, app, C.submission), C.name));
            const menu = facts[`${prefix}-menu`];
            if (!(Array.isArray(menu) && menu.includes(ENTRY))) return before;
            await step(`${prefix}-send`, async () => K.sendToOrcid(page, await K.openWorkflow(page, app, C.submission), C.name));
            await step(`${prefix}-screen`, async () => ({notices: (await screen(page)).notices}));
            facts[`${prefix}-jobs-at-ok`] = A1.orcidJobs(app);
            await step(`${prefix}-queue`, () => L.letQueueRun(page, app));
            facts[`${prefix}-jobs-after`] = A1.orcidJobs(app);
            facts[`${prefix}-new-failed-ids`] = L.failedIds(app).filter((id) => !before.includes(id));
            facts[`${prefix}-server-log`] = log.since(from).map((l) => L.flat(l, 300)).slice(0, 12);
            return before;
        };
        const before1 = await send('s');
        // Step 5: Administration › "View Failed Jobs" as admin, and the new rows' "Details".
        await signOut(page);
        await signIn(page, 'admin');
        await step('s5-failed-jobs', () => L.failedJobs(page, app, before1));
        await shot(page, `${MODE}-failed-jobs`).catch(() => {});

        if (MODE === 'steps') {
            // Control: the City emptied, the same send. Expected and observed alike: skipped, nothing fails.
            await signOut(page);
            await signIn(page, 'dbarnes');
            await step('c1-city-emptied', () => L.setOrcidCity(page, app, ''));
            const before2 = await send('c');
            await signOut(page);
            await signIn(page, 'admin');
            await step('c5-failed-jobs', () => L.failedJobs(page, app, before2));
        }
    } finally {
        await close();
    }
    record(MODE === 'neighbour' ? 'u04ojs1-neighbour' : 'u04ojs1-summary', facts);
});
