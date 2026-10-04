// U38 A1 issue walk (issue report docs/issues/U38-A1-sent-email-lines-name-no-sender.md): the emails
// an editor sends from the workflow ("Notify", "Assign", a discussion) are listed on the "Activity
// Log"'s "History" with nobody under "User", while "View Email" reads them "From:" that editor.
// On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"); the kit builds
// nothing. Helpers: ./lib.js (WORDS: OJS 4 and OMP 9 at "Submission", OPS 1 at "Production").
//
// MODE=walk (default), as `dbarnes`:
//   3 "Participants" › David Buskins › "More Actions" › "Notify": the stage's "Discussion (…)", a
//     message, "Notify"; 4 "Assign": the role, Minoti Inoue, the predefined message "Assign Editor"
//     (OPS "Discussion (Production)"), "OK";
//   5 the stage's "Tasks & Discussions" › "Add" (3.5: "Add discussion"): a name, David Buskins
//     ticked, a message, "Save"; 6 "Activity Log" › "History", and "View Email" on the three lines.
// MODE=nb, the neighbour alone (main; with the fix in and out), every step recorded, none throwing:
//   as `dbarnes` a discussion to David Buskins; as `dbuskins` a reply to it; as `dbarnes`
//   "History": the reply's line must name its writer (David Buskins), the discussion's Daniel
//   Barnes, and the journal's own stored lines ("Thank you for your submission …") stay empty.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/sent-email-lines-name-no-sender/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a1-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    const w = L.WORDS[app.name];
    const o = {app: app.name, line: app.line || 'main', mode: MODE, submission: w.id};
    const {page, close} = await launch(app);
    page.on('dialog', async (d) => { await d.accept().catch(() => {}); });
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) {
            o[key] = {threw: L.flat(e.message, 400)};
            record(`a1-${MODE}-${key}-threw`, await screen(page).catch(() => ({url: page.url()})));
            await shot(page, `a1-${MODE}-${key}-threw`).catch(() => {});
        }
        console.log(`[a1 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 3000));
        return o[key];
    };
    const title = `u38b discussion ${MODE}`;
    try {
        o.before = L.lastEmailLogId(app);
        await signIn(page, 'dbarnes');
        if (MODE === 'nb') {
            await step('discussion', () => L.addDiscussion(page, app, {title, message: 'u38b discussion message', label: 'a1-nb-1-add'}));
            await signIn(page, 'dbuskins');
            await step('reply', () => L.reply(page, app, {title, message: 'u38b reply from David', label: 'a1-nb-2-reply'}));
            await signIn(page, 'dbarnes');
            await step('log', () => L.readLog(page, app, {views: [`An email has been sent: ${title}`], label: 'a1-nb-3-log'}));
        } else {
            await step('notify', () => L.notify(page, app, 'u38b notify', 'a1-3-notify'));
            await step('assign', () => L.assign(page, app, 'a1-4-assign'));
            await step('discussion', () => L.addDiscussion(page, app, {title, message: 'u38b discussion message', label: 'a1-5-add'}));
            o.storedNew = L.storedEmails(app, w.id, o.before);
            const subjects = [...new Set(o.storedNew.map((e) => `An email has been sent: ${e.subject}`))];
            await step('log', () => L.readLog(page, app, {views: subjects, label: 'a1-6-log'}));
        }
        o.storedNew = L.storedEmails(app, w.id, o.before);
        const log = o.log && o.log.lines ? o.log.lines : [];
        o.newEmailLines = log.filter((l) => o.storedNew.some((e) => l.event === `An email has been sent: ${e.subject}`.replace(/\s+/g, ' ').trim()));
        o.controlNamed = log.filter((l) => /^An email has been sent:/.test(l.event) && l.user).slice(0, 3);
        o.controlEmpty = log.filter((l) => /^An email has been sent: Thank you for your submission/.test(l.event)).slice(0, 1);
        await signOut(page).catch(() => {});
    } finally {
        record(`a1-facts-${MODE}`, o);
        console.log(JSON.stringify({newEmailLines: o.newEmailLines, storedNew: o.storedNew, controlNamed: o.controlNamed}, null, 1));
        await close();
    }
});
