// Issue report docs/issues/U12-A9-edit-announcement-email-box-sends-nothing.md (U12 A9): "Send an
// email about this to all registered users." ticked on "Edit Announcement" sends nothing.
// Takes the report's Steps on PKP's default test dataset, all three apps:
//   1. rvaca signs in
//   2. Settings › Website › Setup › "Announcements": "Enable announcements", "Save"
//   3. "Announcements" › "Add Announcement": "u12r5 Call for papers", box unticked, "Save"
//   4. "Edit" it: title "u12r5 Call for papers (deadline 1 June)", box ticked, "Save"
//   5. pages loaded (the app's job runner works at the end of each request); Mailpit read
//   6. control: "Add Announcement" "u12r5 Second call", box ticked, "Save"; pages loaded; Mailpit read
// NB=1 is the neighbour check for a fix trial, alone: steps 1–2, then "u12r5 Quiet call" added with
// the box ticked (mails), edited to "u12r5 Quiet call (room 2)" with the box left unticked: no mail.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/edit-announcement-email-box-sends-nothing/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, screen, record, idle, serverLog} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour' : 'steps'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
        return v;
    };
    const step = async (k, fn) => { try { return fact(k, await fn()); } catch (e) { return fact(k, {error: L.flat(e.message, 400)}); } };
    const log = serverLog(app), mark = log.mark();
    const {page, close} = await launch(app);
    const errs = [];
    page.on('pageerror', (e) => errs.push(L.flat(e.message, 200)));
    const fails = [];
    page.on('response', (r) => { if (r.status() >= 500) fails.push(`${r.status()} ${L.rel(r.url())}`); });
    const key = nb ? 'nb' : 'a9';
    try {
        // 1
        await signIn(page, 'rvaca');
        // 2
        await step('2 enable announcements', () => L.enableAnnouncements(app, page));
        await step('2 open Announcements', () => L.openAnnouncements(app, page));
        if (nb) {
            const t0 = new Date();
            await step('nb add "u12r5 Quiet call", box ticked', () => L.addAnnouncement(page, {title: 'u12r5 Quiet call', sendEmail: true}));
            await step('nb mails "u12r5 Quiet call"', async () => ({runner: await L.pumpRunner(app, page, {subject: 'u12r5 Quiet call', since: t0}), ...(await L.mails(app, 'u12r5 Quiet call', t0))}));
            await step('2 open Announcements again', () => L.openAnnouncements(app, page));
            const t1 = new Date();
            await step('nb edit, box unticked', () => L.editAnnouncement(page, {from: 'u12r5 Quiet call', title: 'u12r5 Quiet call (room 2)', sendEmail: false}));
            record(`${key}-list`, await screen(page));
            await L.pumpRunner(app, page, {subject: 'u12r5 Quiet call (room 2)', since: t1, loads: 4});
            await step('nb mails "u12r5 Quiet call (room 2)"', () => L.mails(app, 'u12r5 Quiet call (room 2)', t1));
            fact('nb queue', L.queueFacts(app));
        } else {
            // 3
            await step('3 add "u12r5 Call for papers", box unticked', () => L.addAnnouncement(page, {title: 'u12r5 Call for papers', sendEmail: false}));
            fact('3 queue', L.queueFacts(app));
            // 4
            const t1 = new Date();
            await step('4 edit, box ticked', () => L.editAnnouncement(page, {
                from: 'u12r5 Call for papers', title: 'u12r5 Call for papers (deadline 1 June)', sendEmail: true,
                beforeSave: async () => record(`${key}-4-edit-dialog`, await screen(page)),
            }));
            record(`${key}-4-list`, await screen(page));
            // 5
            const runner = await L.pumpRunner(app, page, {subject: 'u12r5 Call for papers (deadline 1 June)', since: t1, loads: 4});
            await step('5 mails "u12r5 Call for papers (deadline 1 June)"', async () => ({runner, ...(await L.mails(app, 'u12r5 Call for papers (deadline 1 June)', t1))}));
            fact('5 queue', L.queueFacts(app));
            // 6
            await step('6 open Announcements', () => L.openAnnouncements(app, page));
            const t2 = new Date();
            await step('6 add "u12r5 Second call", box ticked', () => L.addAnnouncement(page, {title: 'u12r5 Second call', sendEmail: true}));
            await step('6 mails "u12r5 Second call"', async () => ({runner: await L.pumpRunner(app, page, {subject: 'u12r5 Second call', since: t2}), ...(await L.mails(app, 'u12r5 Second call', t2))}));
            await step('6 mails "u12r5 Call for papers (deadline 1 June)" after the control', () => L.mails(app, 'u12r5 Call for papers (deadline 1 June)', t1));
            fact('6 queue', L.queueFacts(app));
        }
        await idle(page).catch(() => {});
        fact('errors', {script: errs, server: fails, log: log.since(mark).slice(0, 20)});
    } finally {
        record(`${key}-facts`, facts);
        await close();
    }
});
