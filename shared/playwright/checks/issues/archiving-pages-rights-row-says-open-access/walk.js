// Walk of U67 A2 (issue report docs/issues/U67-A2-archiving-pages-rights-row-says-open-access.md):
// as rvaca, switch on LOCKSS and CLOCKSS and read the "Rights" row of the journal's LOCKSS page;
// require subscriptions, write the access policy into "About the Journal", read both pages' "Rights"
// row again; then search every tab of Settings › Journal, Website, Workflow and Distribution, and the
// About page, for the row's text. OJS only (a press and a preprint server have no such pages). On
// PKP's default test dataset, fleet reset first.
//   node bin/probe.js all shared/playwright/checks/issues/archiving-pages-rights-row-says-open-access/walk.js
// Neighbour (WALK_MODE=nb, alone): steps 1-2 only, then every row of both pages' "Metadata" table,
// their closing lines and the site's two lists, to compare with the fix in and out.
const {forEachApp, launch, signIn, signOut, screen, record, note} = require('../../../probe');
const H = require('./lib.js');

const ABOUT = 'u67a This journal requires a subscription to read its articles.';
const MODE = process.env.WALK_MODE || 'steps';

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        record('surface', await H.noSurface(app));
        return;
    }
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    try {
        // 1-2
        await signIn(page, 'rvaca');
        facts.archiving = await H.step(() => H.switchOnLockssClockss(page, app));
        record('s2-archiving-saved', await screen(page));

        if (MODE === 'nb') {
            facts.pages = await H.readBoth(page, app, 'nb');
            facts.siteLists = await H.readSiteLists(page);
            note(`u67a ${facts.line} nb: lockss ${JSON.stringify(facts.pages.lockss.labels)} clockss ${JSON.stringify(facts.pages.clockss.labels)}`);
            record('nb-facts', facts);
            return;
        }

        // 3
        facts.s3 = await H.readManifest(page, app, 'lockss', 's3');

        // 4
        facts.access = await H.step(() => H.requireSubscriptions(page));
        record('s4-access-saved', await screen(page));

        // 5
        facts.about = await H.step(() => H.setAboutJournal(page, app, ABOUT));
        record('s5-masthead-saved', await screen(page));

        // 6
        facts.s6 = await H.readBoth(page, app, 's6');

        // 7
        facts.search = [];
        for (const which of ['journal', 'website', 'workflow', 'distribution']) {
            facts.search.push(await H.step(() => H.searchSettingsPage(page, app, which)));
        }
        facts.aboutPage = await H.step(() => H.readAboutPage(page, app, ABOUT));

        facts.summary = {
            s3: facts.s3.rights,
            s6: {lockss: facts.s6.lockss.rights, clockss: facts.s6.clockss.rights},
            access: facts.access,
            aboutSaved: facts.about.ok,
            search: facts.search.map((r) => (r.ok ? {which: r.value.which, served: r.value.inServedPage, shown: r.value.shownOnTab, control: r.value.controlInServedPage} : r)),
            aboutPage: facts.aboutPage.ok ? facts.aboutPage.value : facts.aboutPage,
        };
        note(`u67a ${facts.line} ${MODE}: ${JSON.stringify(facts.summary)}`);
        record('facts', facts);
        await signOut(page);
    } finally {
        await close();
    }
});
