// U03 OPS3 walk (issue report docs/issues/U03-OPS3-server-roles-save-erases-interests.md).
// On PKP's default test dataset, OPS:
//   1-4  a newcomer, signed out, registers on the site-wide Register page with "Reader" under the
//        server and "glacier, ethics" typed into the "If you requested to be a reviewer…" box;
//   5    the manager `rvaca` reads the newcomer's "View more details" under Users & Roles › "Edit";
//   6    the newcomer opens Profile › "Roles" and presses "Save" untouched;
//   7    `rvaca` reads "View more details" again.
// Modes (the argument after the script; each runs alone, from a freshly reset dataset):
//   walk       (default) the steps above (OPS; OJS and OMP take them as the control)
//   neighbour  what the fix must leave alone: the same newcomer, then on the Roles tab
//              OJS/OMP: remove both chips and "Save" (the interests must go);
//              OPS: tick "Author" and "Save" (the role must be saved).
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/server-roles-save-erases-interests/walk.js [walk|neighbour]
//      (PKP_E2E_LINE=stable-3_5_0 in front for 3.5; PROBE_RUN keeps runs apart)
const {forEachApp, launch, signIn, signOut, screen, record, serverLog} = require('../../../probe');
const H = require('../interest-listed-twice-after-roles-save/lib.js');

const MODE = process.argv[2] || 'walk';
const WORDS = ['glacier', 'ethics'];
const USER = 'h15bserver';

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, dataset: app.dataset, steps: {}};
    const ctx = app.contextPath;
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    const step = (name, fn) => H.step(facts, name, fn);
    try {
        // 1-4
        await step('4-register', () => H.registerOnSitePage(page, app, H.newcomer(USER, 'h15b.server@mailinator.com'), 'glacier, ethics'));
        record(`ops3-${MODE}-04-registered`, await screen(page));
        facts.steps['4-stored'] = H.storedInterests(app, WORDS);
        // 5
        await step('5-manager-before', () => H.managerView(page, app, 'h15b.server', WORDS));
        record(`ops3-${MODE}-05-manager-before`, await screen(page));
        // 6
        await signOut(page);
        await signIn(page, USER, {contextPath: ctx});
        await step('6-roles-tab', () => H.readRoles(page, ctx));
        record(`ops3-${MODE}-06-roles`, await screen(page));
        if (MODE === 'walk') {
            await step('6-save', () => H.saveRoles(page, ctx));
        } else if (app.name === 'ops') {
            await step('6-save-author', () => H.saveRoles(page, ctx, {before: async (p) => { await p.roleBox('Author').check(); }}));
            await step('6-roles-tab-after', () => H.readRoles(page, ctx));
        } else {
            await step('6-save-chips-removed', () => H.saveRoles(page, ctx, {before: async (p) => { for (const w of WORDS) await H.removeChip(p, w); }}));
            await step('6-roles-tab-after', () => H.readRoles(page, ctx));
        }
        record(`ops3-${MODE}-06-saved`, await screen(page));
        facts.steps['6-stored'] = H.storedInterests(app, WORDS);
        // 7
        await step('7-manager-after', () => H.managerView(page, app, 'h15b.server', WORDS));
        record(`ops3-${MODE}-07-manager-after`, await screen(page));
    } finally {
        facts.serverLog = log.since(from).map((l) => H.flat(l, 400));
        record(`ops3-${MODE}-facts`, facts);
        await close();
    }
});
