// U03 A2 walk (issue report docs/issues/U03-A2-refused-gif-wipes-profile-image.md).
// On PKP's default test dataset: dbarnes uploads a 100 × 100 .jpg as his profile image on the
// profile's "Public" tab, then (control) a text file named .png, then a 300 × 300 .gif, which
// is refused; after a reload the tab is read, and the picture's address is opened with .gif
// and with .jpg.
// Modes (the argument after the script; each runs alone, from a freshly reset dataset):
//   walk       (default) the steps above
//   neighbour  accepted uploads still replace the picture: a 100 × 100 .gif, then a 400 × 400
//              .png (shrunk by the browser), then "Delete"
//   PROBE_FEATURE=issues-u03h PROBE_AGENT=u03h node bin/probe.js all shared/playwright/checks/issues/refused-gif-wipes-profile-image/walk.js [walk|neighbour]
const {forEachApp, launch, signIn, signOut, screen, record, serverLog, outDir} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.argv[2] || 'walk';

/** Run a step, recording its error instead of throwing, so the state a fix brings is read too. */
async function step(facts, name, fn) {
    try {
        facts.steps[name] = await fn();
    } catch (e) {
        facts.steps[name] = {error: String(e && e.message ? e.message : e).split('\n')[0]};
    }
    return facts.steps[name];
}

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, dataset: app.dataset, steps: {}};
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', (d) => {
        dialogs.push({type: d.type(), message: d.message()});
        d.accept().catch(() => {});
    });
    try {
        // 1-2. dbarnes opens the profile's Public tab
        await signIn(page, 'dbarnes');
        await H.openPublicTab(page, app);
        const files = await H.makeFiles(page, outDir());
        facts.steps.opened = await H.readImage(page);
        record(`${MODE}-01-public-tab`, await screen(page));
        if (MODE === 'walk') {
            // 3. the .jpg is accepted
            await step(facts, 'jpg', async () => ({upload: await H.upload(page, files.jpg, dialogs), tab: await H.readImage(page)}));
            record('walk-02-jpg', await screen(page));
            const src = facts.steps.jpg.tab && facts.steps.jpg.tab.src;
            const userId = src && (src.match(/profileImage-(\d+)\./) || [])[1];
            facts.userId = userId;
            facts.filesAfterJpg = userId ? H.siteFiles(app, userId) : null;
            // 4. control: a text file named .png is refused; the picture stays after a reload
            await step(facts, 'notes', async () => {
                const up = await H.upload(page, files.notes, dialogs);
                record('walk-03-notes-refused', await screen(page));
                await H.openPublicTab(page, app);
                return {upload: up, afterReload: await H.readImage(page)};
            });
            // 5. the 300 × 300 .gif is refused
            await step(facts, 'gif', () => H.upload(page, files.gif, dialogs));
            record('walk-04-gif-refused', await screen(page));
            // 6. reload
            await step(facts, 'afterReload', async () => { await H.openPublicTab(page, app); return H.readImage(page); });
            record('walk-05-after-reload', await screen(page));
            facts.filesAfterGif = userId ? H.siteFiles(app, userId) : null;
            // 7-8. the picture's address with .gif, then the .jpg one
            if (src) {
                const base = src.replace(/\?.*$/, '');
                await step(facts, 'gifAddress', () => H.openAddress(page, base.replace(/\.jpg$/, '.gif')));
                await step(facts, 'jpgAddress', () => H.openAddress(page, base));
            }
        } else if (MODE === 'neighbour') {
            await step(facts, 'smallGif', async () => ({upload: await H.upload(page, files.smallGif, dialogs), tab: await H.readImage(page)}));
            record('neighbour-02-small-gif', await screen(page));
            await step(facts, 'bigPng', async () => ({upload: await H.upload(page, files.bigPng, dialogs), tab: await H.readImage(page)}));
            record('neighbour-03-big-png', await screen(page));
            const src = facts.steps.bigPng.tab && facts.steps.bigPng.tab.src;
            if (src) await step(facts, 'pngAddress', async () => { const r = await H.openAddress(page, src.replace(/\?.*$/, '')); await H.openPublicTab(page, app); return r; });
            await step(facts, 'delete', async () => {
                await page.getByRole('button', {name: 'Delete', exact: true}).click();
                await page.waitForURL(/uniq=/, {timeout: 20000});
                await H.openPublicTab(page, app);
                return H.readImage(page);
            });
            record('neighbour-04-deleted', await screen(page));
        } else {
            throw new Error(`unknown mode ${MODE}`);
        }
        await signOut(page).catch(() => {});
    } finally {
        facts.dialogs = dialogs;
        facts.serverLog = log.since(from);
        record(`facts-${MODE}`, facts);
        await close();
    }
});
