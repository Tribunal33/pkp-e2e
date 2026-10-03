// Issue walk U65 A14: saving Profile › "Notifications" while "Editorial statistics" is at "Do not
// send the email to editors." stores the hidden "Statistics report summary." row as switched off, so
// when the email comes back that account gets neither the email nor the Tasks entry.
//
// Steps (PKP's default test dataset; OJS words):
//   1  rvaca: Settings › Workflow › Emails, "Editorial statistics" › "Do not send the email to editors.", Save
//   2  dbuskins: Profile › Notifications (no "Statistics report summary." row)
//   3  "Save", nothing changed
//   4  rvaca: "Send a monthly email to editors.", Save
//   5  dbuskins: Profile › Notifications, the row's two boxes
//   6  sberardo (never saved): the same row's boxes
//   7  php lib/pkp/tools/scheduler.php test --name='PKP\task\StatisticsReport'
//   8  php lib/pkp/tools/jobs.php run
//   9  the mailboxes of dbuskins@ and sberardo@mailinator.com: "Editorial activity for …"
//  10  dbuskins, then sberardo: the Tasks panel's statistics entry
//
// Modes (the script's argument; each runs alone, on a freshly reset dataset):
//   (none)     the steps above
//   neighbour  a shown row's choice is still saved: with the email off, untick "Enable…" on
//              "Weekly email of outstanding tasks" and save; with it on, untick "Enable…" on
//              "Statistics report summary." and save; both read back after a reload
//   reach      the site-level profile: admin creates "u65ir9 Journal" (Administration), dbuskins
//              registers there as Reader (Profile › Roles) so the site-level profile stays at the
//              site, saves its Notifications tab (no statistics row there) with the email on
//              throughout, then reads publicknowledge's row and runs 7–9
//
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all \
//        shared/playwright/checks/issues/stats-email-optout-after-saving-notifications/walk.js [neighbour|reach]
const {forEachApp, launch, signIn, signOut, screen, shot, record, note} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : process.argv.includes('reach') ? 'reach' : 'walk';
const MAIL = (u) => `${u}@mailinator.com`;

forEachApp(async (app) => {
    const ctx = app.contextPath;
    const facts = {line: app.line, app: app.name, mode: MODE};
    const save = () => record(MODE, facts);
    const snap = async (name) => {
        record(`${MODE}-${name}`, await screen(page));
        await shot(page, `${MODE}-${name}`).catch(() => {});
    };
    const step = async (name, fn) => {
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {error: L.flat(e.stack || e.message, 1200)};
            console.error(app.name, name, e.message);
        }
        save();
    };
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    try {
        if (MODE === 'walk') {
            await step('step1', async () => {
                await signIn(page, 'rvaca');
                const r = await L.setStatsEmail(page, ctx, L.OFF);
                await snap('step1-emails-off');
                return r;
            });
            let profile = null;
            await step('step2', async () => {
                await signIn(page, 'dbuskins');
                const t = await L.notifTab(page, ctx);
                profile = t.profile;
                await snap('step2-dbuskins-notifications-off');
                return {...t.out, stored: await L.stored(app, 'dbuskins')};
            });
            await step('step3', async () => {
                const r = await L.saveNotifTab(page, profile);
                await snap('step3-saved');
                return {...r, stored: await L.stored(app, 'dbuskins')};
            });
            await step('step4', async () => {
                await signIn(page, 'rvaca');
                const r = await L.setStatsEmail(page, ctx, L.ON);
                await snap('step4-emails-on');
                return r;
            });
            await step('step5', async () => {
                await signIn(page, 'dbuskins');
                const t = await L.notifTab(page, ctx);
                await snap('step5-dbuskins-notifications-on');
                return t.out;
            });
            await step('step6', async () => {
                await signIn(page, 'sberardo');
                const t = await L.notifTab(page, ctx);
                await snap('step6-sberardo-notifications-on');
                return {...t.out, stored: await L.stored(app, 'sberardo')};
            });
            await signOut(page);
            const since = new Date(Date.now() - 1000);
            await step('step7', async () => L.runTask(app));
            await step('step8', async () => L.runJobs(app));
            await step('step9', async () => ({
                sberardo: await L.statsMail(app, MAIL('sberardo'), since, 1, 45_000),
                dbuskins: await L.statsMail(app, MAIL('dbuskins'), since, 1, 10_000),
            }));
            for (const u of ['dbuskins', 'sberardo']) {
                await step(`step10-${u}`, async () => {
                    await signIn(page, u);
                    const r = await L.tasks(page, app, ctx);
                    await snap(`step10-${u}-tasks`);
                    return r;
                });
            }
            const row = (s) => s && !s.error && s.report;
            facts.verdict = {
                rowHiddenWhileOff: facts.step2 && !facts.step2.error ? facts.step2.report === null : 'error',
                dbuskinsAllowAfter: row(facts.step5) ? facts.step5.report.allow : 'no row',
                sberardoAllowAfter: row(facts.step6) ? facts.step6.report.allow : 'no row',
                mail: {dbuskins: (facts.step9.dbuskins || []).length, sberardo: (facts.step9.sberardo || []).length},
                tasks: {dbuskins: (facts['step10-dbuskins'] || {}).statsEntries, sberardo: (facts['step10-sberardo'] || {}).statsEntries},
            };
        } else if (MODE === 'neighbour') {
            let profile = null;
            await step('off', async () => {
                await signIn(page, 'rvaca');
                return L.setStatsEmail(page, ctx, L.OFF);
            });
            await step('reminderUnticked', async () => {
                await signIn(page, 'dbuskins');
                profile = (await L.notifTab(page, ctx)).profile;
                await L.setAllow(profile, 'notificationEditorialReminder', false);
                const r = await L.saveNotifTab(page, profile);
                const back = (await L.notifTab(page, ctx)).out;
                await snap('reminder-unticked-reloaded');
                return {...r, back, stored: await L.stored(app, 'dbuskins')};
            });
            await step('on', async () => {
                await signIn(page, 'rvaca');
                return L.setStatsEmail(page, ctx, L.ON);
            });
            await step('reportUnticked', async () => {
                await signIn(page, 'dbuskins');
                const t = await L.notifTab(page, ctx);
                const before = t.out;
                await L.setAllow(t.profile, 'notificationEditorialReport', false);
                const r = await L.saveNotifTab(page, t.profile);
                const back = (await L.notifTab(page, ctx)).out;
                await snap('report-unticked-reloaded');
                return {before, ...r, back, stored: await L.stored(app, 'dbuskins')};
            });
            const g = (k, s) => (facts[k] && facts[k].back && facts[k].back[s] ? facts[k].back[s].allow : 'n/a');
            facts.verdict = {
                reminderStaysUnticked: g('reminderUnticked', 'reminder') === false,
                reportStaysUnticked: g('reportUnticked', 'report') === false,
                reminderStillUntickedAfterOn: g('reportUnticked', 'reminder') === false,
            };
        } else {
            const words = L.WORDS[app.name];
            const NEW = {name: `u65ir9 ${words.noun}`, initials: 'U65IR9', path: 'u65ir9', email: 'u65ir9@mailinator.com'};
            await step('r1', async () => {
                await signIn(page, 'admin');
                const status = await L.createContext(page, app, NEW);
                await snap('r1-created');
                return {status, name: NEW.name};
            });
            await step('r2', async () => {
                const {ProfilePage} = require('../../../pages/ProfilePage.js');
                await signIn(page, 'dbuskins');
                const profile = new ProfilePage(page, ctx);
                await profile.goto('roles');
                if (!(await profile.isOtherContextsOpen())) await profile.toggleOtherContexts();
                const box = profile.contextRoleBox(NEW.name, 'Reader');
                const offered = await box.count();
                if (offered) {
                    await box.check();
                    await profile.save();
                }
                await snap('r2-roles-saved');
                return {offered};
            });
            await step('r3', async () => {
                const t = await L.notifTab(page, null);
                await snap('r3-site-level-notifications');
                const r = await L.saveNotifTab(page, t.profile);
                return {...t.out, ...r, stored: await L.stored(app, 'dbuskins')};
            });
            await step('r4', async () => {
                const t = await L.notifTab(page, ctx);
                await snap('r4-journal-notifications');
                return t.out;
            });
            await signOut(page);
            const since = new Date(Date.now() - 1000);
            await step('r5task', async () => L.runTask(app));
            await step('r5jobs', async () => L.runJobs(app));
            await step('r5mail', async () => ({
                sberardo: await L.statsMail(app, MAIL('sberardo'), since, 1, 45_000),
                dbuskins: await L.statsMail(app, MAIL('dbuskins'), since, 1, 10_000),
            }));
            facts.verdict = {
                siteLevelUrl: facts.r3 && facts.r3.url,
                siteLevelHasRow: facts.r3 && !facts.r3.error ? facts.r3.report !== null : 'error',
                journalRowAllow: facts.r4 && facts.r4.report ? facts.r4.report.allow : 'n/a',
                mail: {dbuskins: ((facts.r5mail || {}).dbuskins || []).length, sberardo: ((facts.r5mail || {}).sberardo || []).length},
            };
        }
    } finally {
        save();
        await close();
    }
    note(`U65 A14 ${MODE} ${app.line} ${app.name}: ${JSON.stringify(facts.verdict)}`);
    console.log(JSON.stringify({app: app.name, line: app.line, mode: MODE, verdict: facts.verdict}, null, 1));
});
