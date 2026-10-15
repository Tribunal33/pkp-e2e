// U03 A20 walk (issue report docs/issues/U03-A20-interest-listed-twice-after-roles-save.md).
// On PKP's default test dataset (OJS, OMP; OPS on 3.5, whose Roles tab has the interests box):
//   1-2  `jjanssen` (a reviewer; `ccorino` on OPS) adds "ethics" on Profile › "Roles" and saves;
//   3-6  a newcomer registers on the context's own Register page, opts in as a reviewer and types
//        "glacier, ethics" (a comma and a space) into "Reviewing interests" (on OPS 3.5 the server's
//        page has no reviewer opt-in, so the newcomer uses the site-wide page's box);
//   7    the newcomer opens Profile › "Roles" and presses "Save" untouched;
//   8    `jjanssen` opens Profile › "Roles" and presses "Save" untouched;
//   9    the manager `rvaca` reads both accounts' "View more details" under Users & Roles › "Edit".
// Modes (the argument after the script; each runs alone, from a freshly reset dataset):
//   walk       (default) the steps above
//   manager    step 9 alone (read-only), after a walk
//   neighbour  what the fix must leave alone: `jjanssen` adds "ethics" and "statistics" and saves,
//              removes "statistics" and saves, then removes "ethics" and saves; a newcomer
//              registers with "glacier, ethics" typed with no space, then the manager's reads.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/interest-listed-twice-after-roles-save/walk.js [walk|neighbour]
//      (PKP_E2E_LINE=stable-3_5_0 in front for 3.5; PROBE_RUN keeps runs apart)
const {forEachApp, launch, signIn, signOut, screen, record, serverLog} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.argv[2] || 'walk';
// PART=1-6 or PART=7-9 takes half the walk, so a trial makes the copy on the code without the fix
// and saves on the code with it (the fix must also undo copies already stored).
const PART = process.env.PART || 'all';
const WORDS = ['glacier', 'ethics', 'statistics'];

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, dataset: app.dataset, steps: {}};
    const ctx = app.contextPath;
    const serverHasNoOptin = app.name === 'ops';
    // The account that holds the interest first: a reviewer; the server's dataset has none, so an author there.
    const EXISTING = app.name === 'ops' ? 'ccorino' : 'jjanssen';
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    const step = (name, fn) => H.step(facts, name, fn);
    try {
        if (MODE === 'walk') {
          if (PART !== '7-9') {
            // 1-2
            await signIn(page, EXISTING, {contextPath: ctx});
            await step('2-jjanssen-adds-ethics', () => H.saveRoles(page, ctx, {before: (p) => p.addInterest('ethics')}));
            record('a20-02-jjanssen-saved', await screen(page));
            facts.steps['2-stored'] = H.storedInterests(app, WORDS);
            // 3-6
            await signOut(page);
            const who = H.newcomer('h15bnewcomer', 'h15b.newcomer@mailinator.com');
            await step('6-register', () => (serverHasNoOptin
                ? H.registerOnSitePage(page, app, who, 'glacier, ethics')
                : H.registerOnContextPage(page, app, who, 'glacier, ethics')));
            record('a20-06-registered', await screen(page));
            facts.steps['6-stored'] = H.storedInterests(app, WORDS);
          }
          if (PART !== '1-6') {
            // 7
            await signOut(page).catch(() => {});
            await signIn(page, 'h15bnewcomer', {contextPath: ctx});
            await step('7-newcomer-tab', () => H.readRoles(page, ctx));
            record('a20-07-newcomer-roles', await screen(page));
            await step('7-newcomer-save', () => H.saveRoles(page, ctx));
            await step('7-newcomer-tab-after', () => H.readRoles(page, ctx));
            facts.steps['7-stored'] = H.storedInterests(app, WORDS);
            // 8
            await signOut(page);
            await signIn(page, EXISTING, {contextPath: ctx});
            await step('8-jjanssen-save', () => H.saveRoles(page, ctx));
            await step('8-jjanssen-tab-after', () => H.readRoles(page, ctx));
            record('a20-08-jjanssen-roles', await screen(page));
            facts.steps['8-stored'] = H.storedInterests(app, WORDS);
            // 9
            await step('9-manager-newcomer', () => H.managerView(page, app, 'h15b.newcomer', WORDS));
            record('a20-09-manager-newcomer', await screen(page));
            await step('9-manager-jjanssen', () => H.managerView(page, app, EXISTING, WORDS));
            record('a20-09-manager-jjanssen', await screen(page));
          }
        } else if (MODE === 'manager') {
            // step 9 alone, read-only, on a fleet the walk left as it was
            await step('9-manager-newcomer', () => H.managerView(page, app, 'h15b.newcomer', WORDS));
            record('a20-09-manager-newcomer', await screen(page));
            await step('9-manager-existing', () => H.managerView(page, app, EXISTING, WORDS));
        } else if (MODE === 'neighbour') {
            await signIn(page, EXISTING, {contextPath: ctx});
            await step('n1-add-two', () => H.saveRoles(page, ctx, {before: async (p) => { await p.addInterest('ethics'); await p.addInterest('statistics'); }}));
            facts.steps['n1-stored'] = H.storedInterests(app, WORDS);
            await step('n2-remove-statistics', () => H.saveRoles(page, ctx, {before: (p) => H.removeChip(p, 'statistics')}));
            await step('n2-tab', () => H.readRoles(page, ctx));
            facts.steps['n2-stored'] = H.storedInterests(app, WORDS);
            await step('n3-manager-jjanssen', () => H.managerView(page, app, EXISTING, WORDS));
            await signOut(page);
            await signIn(page, EXISTING, {contextPath: ctx});
            await step('n4-remove-ethics', () => H.saveRoles(page, ctx, {before: (p) => H.removeChip(p, 'ethics')}));
            await step('n4-tab', () => H.readRoles(page, ctx));
            facts.steps['n4-stored'] = H.storedInterests(app, WORDS);
            await signOut(page);
            const who = H.newcomer('h15bneighbour', 'h15b.neighbour@mailinator.com');
            await step('n5-register-nospace', () => (serverHasNoOptin
                ? H.registerOnSitePage(page, app, who, 'glacier,ethics')
                : H.registerOnContextPage(page, app, who, 'glacier,ethics')));
            facts.steps['n5-stored'] = H.storedInterests(app, WORDS);
            await step('n6-manager-neighbour', () => H.managerView(page, app, 'h15b.neighbour', WORDS));
            record('a20-n6-manager-neighbour', await screen(page));
            await step('n6-manager-jjanssen', () => H.managerView(page, app, EXISTING, WORDS));
        }
    } finally {
        facts.serverLog = log.since(from).map((l) => H.flat(l, 400));
        record(`a20-${MODE}-facts`, facts);
        await close();
    }
});
