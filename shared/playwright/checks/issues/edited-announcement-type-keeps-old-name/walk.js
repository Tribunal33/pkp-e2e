// Issue report on U12 A13 (an edited announcement type keeps its old name until a reload): the
// report's Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"). The kit builds nothing: everything is made through the screens.
//
// Default mode, the Steps (OJS, OMP, OPS):
//   The journal's tab: `rvaca` › Settings › Website › Setup › Announcements: "Enable announcements",
//   "Save"; the Announcements page › "Announcement Types": add "u12r6 Conference"; its arrow › "Edit":
//   "u12r6 Conference 2027", "Save"; read the table; reload, read it again.
//   The site's tab: `admin` › Hosted Journals › "Create Journal" "u12r6 Second Journal" (path
//   `u12r6second`); Site Settings › Announcements › Settings: "Enable announcements", "Save";
//   "Announcement Types": add "u12r6 Site type", edit it to "u12r6 Site type renamed"; read; reload, read.
// `neighbour` as the argument (the fix in and out; runs alone): `rvaca` › Settings › Workflow ›
//   Submission › Components: the first row's "Edit", its name + " u12r6", "Save", read the table at
//   once; then its old name back. Then the journal's announcement types: enable, add "u12r6 Spare",
//   its arrow › "Remove" › "OK", read the table at once.
// Each step records the state it finds rather than throwing, so the same script reads the fix.
//
// Reset first:  npm run fleet-prep -- --feature issues-u12r6 --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-u12r6 PROBE_AGENT=u12r6 node bin/probe.js all shared/playwright/checks/issues/edited-announcement-type-keeps-old-name/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u12r6-3_5 --dataset 6 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u12r6-3_5 PROBE_AGENT=u12r6 node bin/probe.js all shared/playwright/checks/issues/edited-announcement-type-keeps-old-name/walk.js
// Facts: .reports/<feature>/u12r6/a13-facts[-neighbour][-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, serverLog} = require('../../../probe');
const {flat, sleep, rowNames, fetchRowAnswers, addItem, rowAction, saveName, confirmOk,
    enableSiteAnnouncements, openSiteTypes, openContextTypes, openComponents} = require('./lib');
const {enableAnnouncements} = require('../sitemap-lists-expired-announcements/lib');
const {createContext} = require('../all-dates-error-nothing-published/lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : 'steps';
const TYPE_GRID = {addLabel: 'Add Announcement Type', formId: 'announcementTypeForm'};
const GENRE_FORM = {formId: 'genreForm'};

const safe = (p) => p.catch((e) => ({error: flat(e.message, 300)}));

/** Edit a row's name in the open grid and read the table at once, then after 3 s. */
async function editAndRead(page, app, grid, form, from, to, name) {
    const log = serverLog(app), mark = log.mark();
    const answers = fetchRowAnswers(page);
    const out = {from, to};
    out.action = await safe(rowAction(grid, from, 'Edit'));
    if (!out.action.error) out.save = await safe(saveName(page, form, to));
    await sleep(800);
    out.rowsAtOnce = await rowNames(grid).catch(() => null);
    record(`${name}-after-save`, await screen(page));
    await shot(page, `${name}-after-save`);
    await sleep(3000);
    out.rowsAfter3s = await rowNames(grid).catch(() => null);
    out.fetchRow = await answers.list();
    answers.stop();
    out.serverLog = log.since(mark).map((l) => flat(l, 600));
    return out;
}

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const facts = {mode: MODE, line: app.line, dataset: app.dataset};
    try {
        if (MODE === 'steps') {
            // The journal's tab.
            await signIn(page, 'rvaca');
            facts.enabled = await safe(enableAnnouncements(app, page));
            let grid = await openContextTypes(app, page);
            facts.contextEmpty = await rowNames(grid);
            facts.contextAdd = await safe(addItem(page, grid, TYPE_GRID, 'u12r6 Conference'));
            facts.contextEdit = await editAndRead(page, app, grid, TYPE_GRID, 'u12r6 Conference', 'u12r6 Conference 2027', 'a13-context');
            grid = await openContextTypes(app, page);
            facts.contextAfterReload = await rowNames(grid);
            record('a13-context-reloaded', await screen(page));
            await signOut(page);

            // The site's tab.
            await signIn(page, 'admin');
            facts.secondJournal = await safe(createContext(page, app,
                {name: 'u12r6 Second Journal', initials: 'U12R6', path: 'u12r6second', email: 'u12r6@mailinator.com'}));
            facts.siteEnabled = await safe(enableSiteAnnouncements(app, page));
            grid = await openSiteTypes(app, page, {reload: false});
            facts.siteEmpty = await rowNames(grid);
            facts.siteAdd = await safe(addItem(page, grid, TYPE_GRID, 'u12r6 Site type'));
            facts.siteEdit = await editAndRead(page, app, grid, TYPE_GRID, 'u12r6 Site type', 'u12r6 Site type renamed', 'a13-site');
            grid = await openSiteTypes(app, page);
            facts.siteAfterReload = await rowNames(grid);
            record('a13-site-reloaded', await screen(page));
        } else {
            await signIn(page, 'rvaca');
            // Components: a grid whose data the fix leaves alone; its edit refreshes one row.
            let grid = await openComponents(app, page);
            const first = (await rowNames(grid))[0];
            facts.componentsBefore = await rowNames(grid);
            facts.componentEdit = await editAndRead(page, app, grid, GENRE_FORM, first, `${first} u12r6`, 'a13-nb-components');
            grid = await openComponents(app, page);
            facts.componentsAfterReload = await rowNames(grid);
            facts.componentRestore = await editAndRead(page, app, grid, GENRE_FORM, `${first} u12r6`, first, 'a13-nb-components-restore');

            // Announcement types: "Remove" redraws the whole table.
            facts.enabled = await safe(enableAnnouncements(app, page));
            grid = await openContextTypes(app, page);
            facts.typeAdd = await safe(addItem(page, grid, TYPE_GRID, 'u12r6 Spare'));
            const log = serverLog(app), mark = log.mark();
            facts.typeRemove = await safe(rowAction(grid, 'u12r6 Spare', 'Remove'));
            if (!facts.typeRemove.error) facts.typeRemove.confirm = await safe(confirmOk(page));
            facts.typeRemove.rowsAtOnce = await rowNames(grid).catch(() => null);
            facts.typeRemove.serverLog = log.since(mark).map((l) => flat(l, 600));
            record('a13-nb-remove', await screen(page));
        }
    } catch (e) {
        facts.error = flat(e.stack || e.message, 800);
        await shot(page, `a13-error-${MODE}`).catch(() => {});
    } finally {
        record(MODE === 'steps' ? 'a13-facts' : 'a13-facts-neighbour', facts);
        await close();
    }
});
