// Issue report docs/issues/U12-A7-announcement-feed-limit-keeps-oldest.md (U12 A7): with "Limit feed to
// 2 most recent announcements." a journal's announcement feeds carry the first two announcements in
// storage order (the two added first), not the two most recent.
// Takes the report's Steps on PKP's default test dataset, OJS (OMP and OPS ship no announcement feed):
//   1. rvaca signs in
//   2. Settings › Website › Setup › "Announcements": "Enable announcements", "Save"
//   3. Settings › Website › "Plugins": tick "Announcement Feed Plugin"
//   4–6. "Add Announcement": "u12r4 first", "u12r4 second", "u12r4 third", a few seconds apart
//   7. signed out: the three feeds, no limit (control)
//   8. the plugin's "Settings": "Limit feed to" 2, "OK"
//   9. signed out: the three feeds
// NB=1 is the neighbour check for a fix trial, alone: steps 1–6 plus "u12r4 expired" (expired
// 2020-01-31), no limit; the feeds signed out must list the three current ones and not the expired one,
// and the public Announcements page must list the same three.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/announcement-feed-limit-keeps-oldest/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const L = require('./lib');

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
        record('a7-3-plugins', await screen(page));
        await step('4 open Announcements', () => L.ann.openAnnouncementsFromMenu(app, page));
        for (const [i, name] of [[4, 'first'], [5, 'second'], [6, 'third']]) {             // 4–6
            await step(`${i} add "u12r4 ${name}"`, () => L.ann.addAnnouncement(page, {title: `u12r4 ${name}`}));
            await L.sleep(3000);
        }
        if (nb) await step('nb add "u12r4 expired"', () => L.ann.addAnnouncement(page, {title: 'u12r4 expired', expiry: '2020-01-31'}));
        fact('6 list as shown', await L.listedOnAnnouncementsPage(page));
        record(`a7-${nb ? 'nb' : '6'}-list`, await screen(page));
        await signOut(page);
        await step('7 feeds, no limit', () => L.readFeeds(app, page));                       // 7
        if (nb) {
            await step('nb Announcements page', () => L.ann.readAnnouncementsPage(app, page));
            record('a7-nb-announcements', await screen(page));
        } else {
            await signIn(page, 'rvaca');
            await step('8 limit 2', () => L.setFeedLimit(app, page, 2));                    // 8
            record('a7-8-plugins', await screen(page));
            await signOut(page);
            await step('9 feeds, limit 2', () => L.readFeeds(app, page));                    // 9
        }
        await idle(page).catch(() => {});
        fact('errors', {script: errs, server: fails});
    } finally {
        record(`a7-${nb ? 'nb' : 'steps'}-facts`, facts);
        await close();
    }
});
