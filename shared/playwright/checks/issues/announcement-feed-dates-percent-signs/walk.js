// Issue report docs/issues/U12-A15-announcement-feed-dates-percent-signs.md (U12 A15): a journal's Atom
// and RSS 1.0 announcement feeds write every date with "%" signs ("%2026-%10-%03UTC%UTC%275",
// "%2026-%10-%03"); the RSS 2.0 feed's dates are well formed.
// Takes the report's Steps on PKP's default test dataset, OJS (OMP and OPS ship no announcement feed):
//   1. rvaca signs in
//   2. Settings › Website › Setup › "Announcements": "Enable announcements", "Save"
//   3. Settings › Website › "Plugins": tick "Announcement Feed Plugin"
//   4. "Add Announcement": "u12r4 dated", "Save"
//   5. signed out: the Atom feed, the feed's <updated> and the entry's <updated> and <published>
//   6. the RSS 1.0 feed, the item's <dc:date>
//   7. the RSS 2.0 feed (control), the channel's and the item's <pubDate>
// NB=1 is the neighbour check for a fix trial, alone: the same journal with no announcement (steps 1–3
// only), where the feeds' own date comes from the plugin's stored "dateUpdated" setting instead of an
// announcement; the three feeds must still answer and stay well formed.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/announcement-feed-dates-percent-signs/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const L = require('../announcement-feed-limit-keeps-oldest/lib');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour' : 'steps'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
        return v;
    };
    const step = async (k, fn) => { try { return fact(k, await fn()); } catch (e) { return fact(k, {error: L.flat(e.message, 400)}); } };
    const {page, close} = await launch(app);
    const errs = [];
    page.on('pageerror', (e) => errs.push(L.flat(e.message, 200)));
    const fails = [];
    page.on('response', (r) => { if (r.status() >= 500) fails.push(`${r.status()} ${L.rel(r.url())}`); });
    try {
        await signIn(page, 'rvaca');                                                        // 1
        await step('2 enable announcements', () => L.ann.enableAnnouncements(app, page));    // 2
        await step('3 enable feed plugin', () => L.enableFeedPlugin(app, page));             // 3
        if (!nb) {
            await step('4 open Announcements', () => L.ann.openAnnouncementsFromMenu(app, page));
            await step('4 add "u12r4 dated"', () => L.ann.addAnnouncement(page, {title: 'u12r4 dated'}));   // 4
            record('a15-4-list', await screen(page));
        }
        await signOut(page);
        await step(`${nb ? 'nb' : '5'} atom`, () => L.readFeed(app, page, 'atom'));          // 5
        await step(`${nb ? 'nb' : '6'} rss1`, () => L.readFeed(app, page, 'rss'));           // 6
        await step(`${nb ? 'nb' : '7'} rss2 (control)`, () => L.readFeed(app, page, 'rss2')); // 7
        if (nb) {
            // a second read: the stored "dateUpdated" (a string) is what the feeds' own date reads now
            await step('nb atom, second read', () => L.readFeed(app, page, 'atom'));
        }
        await idle(page).catch(() => {});
        fact('errors', {script: errs, server: fails});
    } finally {
        record(`a15-${nb ? 'nb' : 'steps'}-facts`, facts);
        await close();
    }
});
