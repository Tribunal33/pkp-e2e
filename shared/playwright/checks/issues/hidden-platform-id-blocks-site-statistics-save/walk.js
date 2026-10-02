// Issue report docs/issues/U64-A10-hidden-platform-id-blocks-site-statistics-save.md (U64 A10): the
// report's Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"). The kit builds nothing.
//
// Default mode, the Steps (OJS, OMP, OPS):
//   1. `admin` › Administration › Site Settings › "Site Setup" › "Statistics".
//   2. "Sushi Protocol": tick "Use the site as the platform for all journals." ("presses.", "servers.").
//   3. Type `PKP Platform` in "Platform ID".
//   4. "Save" (the control: refused with the reason under the box).
//   5. Untick the "Platform" box: the "Platform ID" box goes.
//   6. "Compress Logs": "Compress the log files"; "Save".
//   7. Reload, the tab again.
//   8. "Compress the log files" again; "Save" (the way round).
// Between 6 and 7 the script also presses "Jump to next error" and records where the focus lands.
// `neighbour` as the argument (the fix in and out):
//   N1 ticked, `PKP Platform`, "Save": refused under the box.
//   N2 the box corrected to `PKP_Platform`, "Save": saved and stored.
//   N3 unticked, "Save": saved, the ID kept; ticked again: the box shows it.
// Each step records the state it finds rather than throwing, so the same script reads the fix.
//
// Reset first:  npm run fleet-prep -- --feature issues-u64g --dataset 7 --reset
// Run (main):   PROBE_FEATURE=issues-u64g PROBE_AGENT=u64g node bin/probe.js all shared/playwright/checks/issues/hidden-platform-id-blocks-site-statistics-save/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u64g-3_5 --dataset 7 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u64g-3_5 PROBE_AGENT=u64g node bin/probe.js all shared/playwright/checks/issues/hidden-platform-id-blocks-site-statistics-save/walk.js
// Facts: .reports/<feature>/u64g/facts[-neighbour][-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle, serverLog} = require('../../../probe');
const {flat, attempt, platformBox, idBox, readTab, pressSave, stored, openSiteStatistics} = require('./lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : 'steps';
const BAD = 'PKP Platform';
const GOOD = 'PKP_Platform';

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const facts = {mode: MODE, line: app.line, dataset: app.dataset};
    const log = serverLog(app);
    const from = log.mark();
    try {
        await signIn(page, 'admin');
        // 1
        facts.opened = await attempt(() => openSiteStatistics(page, app));
        facts.start = {tab: await readTab(page), stored: stored(app)};
        // 2, 3
        facts.tick = await attempt(async () => {
            await platformBox(page).check();
            await idBox(page).waitFor({state: 'visible', timeout: 10_000});
            await idBox(page).fill(BAD);
            return readTab(page);
        });
        // 4 (N1)
        facts.saveTicked = await attempt(() => pressSave(page));
        record(`${MODE}-ticked-refused`, await screen(page));
        if (MODE === 'steps') {
            // 5
            facts.untick = await attempt(async () => {
                await platformBox(page).uncheck();
                await idle(page);
                return readTab(page);
            });
            // 6
            facts.compress = await attempt(async () => {
                await page.locator('#statistics').getByLabel('Compress the log files', {exact: true}).check();
                return 'chosen';
            });
            facts.saveHidden = await attempt(() => pressSave(page));
            record('hidden-save', await screen(page));
            await shot(page, 'hidden-save');
            facts.storedAfterSave = stored(app);
            // "Jump to next error", the one visible control the refusal adds: where the focus lands
            facts.jump = await attempt(async () => {
                await page.locator('#statistics').getByRole('button', {name: 'Jump to next error', exact: true}).click({timeout: 5000});
                return page.evaluate(() => {
                    const el = document.activeElement;
                    return `${el.tagName.toLowerCase()}${el.name ? `[name=${el.name}]` : ''} ${(el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60)}`;
                });
            });
            // 7
            facts.reopened = await attempt(() => openSiteStatistics(page, app));
            facts.afterReload = {tab: await readTab(page), stored: stored(app)};
            record('after-reload', await screen(page));
            // 8
            facts.compressAgain = await attempt(async () => {
                await page.locator('#statistics').getByLabel('Compress the log files', {exact: true}).check();
                return 'chosen';
            });
            facts.saveAfterReload = await attempt(() => pressSave(page));
            facts.storedAtEnd = stored(app);
        } else {
            // N2
            facts.correct = await attempt(async () => {
                await idBox(page).fill(GOOD);
                return 'typed';
            });
            facts.saveGood = await attempt(() => pressSave(page));
            facts.storedGood = stored(app);
            // N3
            facts.untick = await attempt(async () => {
                await platformBox(page).uncheck();
                await idle(page);
                return readTab(page);
            });
            facts.saveUnticked = await attempt(() => pressSave(page));
            facts.storedUnticked = stored(app);
            facts.reopened = await attempt(() => openSiteStatistics(page, app));
            facts.retick = await attempt(async () => {
                await platformBox(page).check();
                await idBox(page).waitFor({state: 'visible', timeout: 10_000});
                return readTab(page);
            });
            record('nb-reticked', await screen(page));
        }
    } catch (e) {
        facts.error = flat(e.stack || e.message, 800);
        record(`threw-${MODE}`, await screen(page).catch(() => null));
    } finally {
        facts.serverLog = log.since(from);
        record(MODE === 'steps' ? 'facts' : `facts-${MODE}`, facts);
        await close();
    }
});
