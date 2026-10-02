// Walk of the U62 A1 issue report (docs/issues/U62-A1-plugin-gallery-offline-stays-loading.md) on PKP's
// default test dataset (OJS, OMP, OPS), on an install whose [proxy] points at a dead port (the fleet's config does).
//   A: rvaca (the context's own login) › Settings › Website › "Plugins" › "Plugin Gallery".
//   B: admin › Administration › Hosted … › "Settings wizard" › "Plugins" › "Plugin Gallery".
// GROUP=A or GROUP=B walks one group alone. MODE=neighbour instead: rvaca's "Installed Plugins" list (its
// headings and rows), which a fix must leave as it was, and the gallery tab's state beside it.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/plugin-gallery-offline-stays-loading/walk.js
// Facts: .reports/<feature>/<agent>/gallery-walk[-<run>]-<app>.json (MODE=neighbour: gallery-neighbour…)
const {forEachApp, launch, signIn, screen, shot, record, serverLog} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE === 'neighbour' ? 'neighbour' : 'walk';
const GROUP = process.env.GROUP || 'AB'; // walk: 'A', 'B' or both

async function step(f, key, fn) {
    try {
        f[key] = (await fn()) ?? 'ok';
    } catch (e) {
        f[key] = {error: L.flat(e.message, 300)};
    }
}

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    const gallery = L.watchGallery(page);
    const log = serverLog(app);
    try {
        if (MODE === 'walk') {
            let from = log.mark();
            if (GROUP.includes('A')) {
                // A. The journal manager
                await step(f, 's1', () => signIn(page, 'rvaca', {contextPath: app.contextPath})); // 1 (the context's own "Login")
                f.s1landed = String(page.url()).replace(/^https?:\/\/[^/]+/, '');
                await step(f, 's2', () => L.sideMenuWebsite(page)); // 2
                await step(f, 's3', () => L.pressTab(page, 'Plugins')); // 3
                f.s3installed = await L.readInstalled(page).catch((e) => ({
                    error: e.message,
                }));
                await step(f, 's4', () => L.pressTab(page, 'Plugin Gallery')); // 4
                f.s4gallery = await L.readGallery(page);
                f.s4screen = await screen(page)
                    .then((s) => L.flat(s.text && s.text.main, 1500))
                    .catch(() => null);
                await shot(page, 'gallery-a-website');
                f.aResponses = gallery.splice(0);
                f.aLog = log.since(from).map((l) => L.flat(l, 400));
            }
            if (GROUP.includes('B')) {
                // B. The site administrator, Settings Wizard
                from = log.mark();
                await step(f, 's5', () => signIn(page, 'admin')); // 5
                await step(f, 's6s7', () => L.openWizard(app, page)); // 6, 7
                await step(f, 's8plugins', () => L.pressTab(page, 'Plugins')); // 8
                await step(f, 's8gallery', () => L.pressTab(page, 'Plugin Gallery'));
                f.s8gallery = await L.readGallery(page);
                await shot(page, 'gallery-b-wizard');
                f.bResponses = gallery.splice(0);
                f.bLog = log.since(from).map((l) => L.flat(l, 400));
            }
        } else {
            const from = log.mark();
            await step(f, 'signIn', () => signIn(page, 'rvaca', {contextPath: app.contextPath}));
            await step(f, 'website', () => L.sideMenuWebsite(page));
            await step(f, 'plugins', () => L.pressTab(page, 'Plugins'));
            f.installed = await L.readInstalled(page).catch((e) => ({
                error: e.message,
            }));
            await step(f, 'galleryTab', () => L.pressTab(page, 'Plugin Gallery'));
            f.gallery = await L.readGallery(page, 3000);
            f.landingResponses = gallery.splice(0);
            await shot(page, 'gallery-neighbour');
            f.log = log.since(from).map((l) => L.flat(l, 400));
        }
    } catch (e) {
        f.error = L.flat(e.stack, 900);
    } finally {
        record(MODE === 'walk' ? 'gallery-walk' : 'gallery-neighbour', f);
        console.log(`[${MODE}] ${app.name}`, JSON.stringify(f).slice(0, 3000));
        await close();
    }
});
