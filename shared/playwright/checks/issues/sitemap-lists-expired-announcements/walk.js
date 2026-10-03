// Issue report docs/issues/U20-A5-sitemap-lists-expired-announcements.md (U20 A5): a journal's,
// press's or server's sitemap lists every announcement, an expired one included, and that entry
// leads a visitor to the Announcements list instead of the announcement.
// Takes the report's Steps on PKP's default test dataset, all three apps:
//   1. rvaca signs in
//   2. Settings › Website › Setup › "Announcements": "Enable announcements", "Save"
//   3. side menu "Announcements" › "Add Announcement": "u20d current", no expiry date
//   4. "Add Announcement": "u20d expired", "Expiry Date" 2020-01-31
//   5. signed out: the Announcements page (control)
//   6. the sitemap: its announcement entries
//   7. the address listed for "u20d expired"
// NB=1 is the neighbour check for a fix trial, alone: steps 1–3, then "u20d later" expiring a year
// from today, and the sitemap signed out, whose entries for both must stay and open their pages.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/sitemap-lists-expired-announcements/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour' : 'steps'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2000)}`);
        return v;
    };
    const step = async (k, fn) => { try { return fact(k, await fn()); } catch (e) { return fact(k, {error: L.flat(e.message, 400)}); } };
    const {page, close} = await launch(app);
    const errs = [];
    page.on('pageerror', (e) => errs.push(L.flat(e.message, 200)));
    const fails = [];
    page.on('response', (r) => { if (r.status() >= 500) fails.push(`${r.status()} ${L.rel(r.url())}`); });
    try {
        // 1
        await signIn(page, 'rvaca');
        // 2
        await step('2 enable announcements', () => L.enableAnnouncements(app, page));
        record('2-settings', await screen(page));
        // 3
        await step('3 open Announcements', () => L.openAnnouncementsFromMenu(app, page));
        const current = await step('3 add "u20d current"', () => L.addAnnouncement(page, {title: 'u20d current'}));
        let other;
        if (nb) {
            other = await step('nb add "u20d later"', () => L.addAnnouncement(page, {title: 'u20d later', expiry: L.dateFromToday(365)}));
        } else {
            // 4
            other = await step('4 add "u20d expired"', () => L.addAnnouncement(page, {title: 'u20d expired', expiry: '2020-01-31'}));
        }
        record(`${nb ? 'nb' : '4'}-list`, await screen(page));
        // 5
        await signOut(page);
        await step('5 Announcements page (control)', () => L.readAnnouncementsPage(app, page));
        record('5-announcements', await screen(page));
        // 6
        const map = await step('6 sitemap', () => L.readSitemap(app, page));
        const listed = (a) => !!(a && a.id && map.announcementLocs && map.announcementLocs.some((l) => new RegExp(`/announcement/view/${a.id}$`).test(l)));
        fact('6 listed', {[current.title]: listed(current), [other.title]: listed(other)});
        // 7 (and, in the neighbour, every announcement entry the sitemap still lists)
        if (nb) {
            for (const a of [current, other]) {
                const loc = (map.announcementLocs || []).find((l) => new RegExp(`/announcement/view/${a.id}$`).test(l));
                if (loc) await step(`nb follow "${a.title}"`, () => L.follow(app, page, loc));
            }
        } else {
            const loc = (map.announcementLocs || []).find((l) => new RegExp(`/announcement/view/${other.id}$`).test(l));
            await step('7 follow "u20d expired"', () => (loc ? L.follow(app, page, loc) : {listed: false}));
            record('7-expired-entry', await screen(page));
        }
        await idle(page).catch(() => {});
        fact('errors', {script: errs, server: fails});
    } finally {
        record(`${nb ? 'nb' : 'steps'}-facts`, facts);
        await close();
    }
});
