// Issue report walk, second group: docs/issues/U19-A15-oai-marc-008-percent-signs.md
// ("Announcement feeds"; spec U12 register A15). Takes the report's Steps on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"):
//   OJS: rvaca ticks "Announcement Feed Plugin" (Settings › Website ›
//        Plugins), turns on "Enable announcements" (Settings › Website ›
//        Setup › Announcements), adds the announcement "u19w15 feed check"
//        (Announcements › "Add Announcement"); then, signed out, reads the
//        Atom, RSS 1.0 and RSS 2.0 feeds' dates.
// OMP and OPS have no announcement feed plugin and are skipped. The kit
// builds nothing; the steps change the dataset, so reset the fleet first.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w15 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-w15 PROBE_AGENT=w15 node bin/probe.js ojs shared/playwright/checks/issues/oai-marc-008-percent-signs/feed.js
// 3.5:          both with PKP_E2E_LINE=stable-3_5_0 in front (feature issues-w15-3_5; PROBE_RUN=r35 on the walk).
// With a fix applied: PROBE_RUN=fixin.
// Facts: .reports/<feature>/w15/feed[-<run>]-ojs.json
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

const TITLE = 'u19w15 feed check';

function dates(body) {
    const all = (tag) => [...body.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, 'g'))].map((m) => m[1]);
    return {updated: all('updated'), published: all('published'), dcDate: all('dc:date'), pubDate: all('pubDate'), lastBuildDate: all('lastBuildDate')};
}

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        console.log(`${app.name}: no announcement feed plugin; skipped`);
        return;
    }
    if (!app.dataset) throw new Error('feed.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const {WebsitePluginsPage} = require('../../../pages/PluginsPages.js');
    const {AnnouncementsSettingsTab, AnnouncementsPage, feedUrl} = require(path.join(app.suiteDir, 'pages', 'AnnouncementsPages.js'));
    const facts = {fleet: {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null}};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        // Step 2: tick the plugin.
        const plugins = new WebsitePluginsPage(page, app.contextPath);
        await plugins.goto();
        const enabled = await plugins.list.tick('announcementfeedplugin');
        facts.pluginEnable = enabled.status();
        // Step 3: turn announcements on.
        const settings = new AnnouncementsSettingsTab(page, app.contextPath);
        await settings.goto();
        if (!(await settings.enableBox().isChecked())) await settings.enableBox().check();
        await settings.save();
        // Step 4: add an announcement.
        const ann = new AnnouncementsPage(page, app.contextPath);
        await ann.goto();
        const panel = await ann.list().openAdd();
        await panel.titleInput().fill(TITLE);
        await panel.typeShortDescription('Feed date check.');
        facts.announcementId = await panel.save();
        await idle(page);
        facts.listScreen = await screen(page);
        await signOut(page);
        // Steps 5-7, signed out.
        for (const type of ['atom', 'rss', 'rss2']) {
            const res = await page.request.get(app.url(feedUrl(app.contextPath, type)), {failOnStatusCode: false});
            const body = await res.text();
            facts[type] = {status: res.status(), contentType: res.headers()['content-type'] || '', hasTitle: body.includes(TITLE), dates: dates(body), body};
        }
        facts.summary = {announcementId: facts.announcementId, atom: facts.atom.dates, rss: facts.rss.dates.dcDate, rss2: facts.rss2.dates.pubDate,
            statuses: [facts.atom.status, facts.rss.status, facts.rss2.status], titles: [facts.atom.hasTitle, facts.rss.hasTitle, facts.rss2.hasTitle]};
        console.log(app.name, JSON.stringify(facts.summary));
    } finally {
        record('feed', facts);
        await close();
    }
});
