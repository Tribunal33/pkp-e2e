// Kept walk for docs/issues/U27-A44-resend-email-names-old-response-date.md (spec U27, register A44).
// On PKP's default test dataset (a dataset fleet), journal and press: Paul Hudson declines his request,
// dbarnes opens "Resend Review Request" on his row, picks new dates, sends, and the email Paul Hudson
// receives is read; the row's "Edit" shows the dates the request now carries. Run:
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=h13k node bin/probe.js ojs,omp \
//     shared/playwright/checks/issues/resend-email-names-old-response-date/walk.js
// (`all` works too: a preprint server has no review and is skipped.)
// WALK_MODE=neighbour runs only the neighbour check for a fix trial: "Unassign Reviewer" on Julie
// Janssen's unanswered row of the same submission, whose message is filled when its window opens
// (the shared code the fix changes); its message and email read the same with the fix in and out.
const {forEachApp, launch, signIn, signOut, record, note} = require('../../../probe');
const K = require('../reviewer-response-erases-reminder-history/lib.js');
const L = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';

forEachApp(async (app) => {
    const c = K.CASES[app.name];
    if (!c) return; // a preprint server has no review
    const id = c.pending;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submission: id};
    const step = async (key, fn) => {
        try {
            facts[key] = await fn();
        } catch (e) {
            facts[key] = {error: K.flat(e.message, 400)};
            note(`U27 A44 walk (${app.name}, ${MODE}): step ${key} failed: ${K.flat(e.message, 200)}`);
        }
        return facts[key];
    };
    const {page} = await launch(app);

    if (MODE === 'neighbour') {
        const who = c.reminded; // Julie Janssen, not responded
        await signIn(page, 'dbarnes');
        const since = new Date();
        await step('n1-unassign', async () => L.unassign(page, await K.openWorkflow(page, app, id), who.name, 'nb-unassign-window'));
        await step('n2-email', async () => L.mail(app, L.emailOf(app, who.user), since, 'Your review for', {fleet: false}));
        record('a44-neighbour', facts);
        return;
    }

    const who = c.declines; // Paul Hudson
    const dates = {response: K.day(7), review: K.day(28)};
    facts.picked = {response: L.isoDate(dates.response), review: L.isoDate(dates.review)};
    facts.storedBefore = L.storedDates(app, id, who.user);

    // 1-2: the reviewer declines
    await signIn(page, who.user);
    await step('s1-decline', () => K.reviewerDecline(page, app, id));
    await signOut(page);
    // 3: the editor's workflow, the row
    await signIn(page, 'dbarnes');
    let win;
    await step('s3-row', async () => K.rowText(await K.openWorkflow(page, app, id), who.name));
    // 4: the resend window as it opens
    await step('s4-open', async () => {
        const modal = await K.openWorkflow(page, app, id);
        const o = await L.openResend(page, modal, who.name, 's4-resend-window');
        win = o.win;
        return o.state;
    });
    // 5: the two dates picked from the calendars
    await step('s5-pick', () => L.pickDates(page, win, dates, 's5-dates-picked'));
    // 6: the window's "Resend Review Request"
    const since = new Date();
    await step('s6-resend', () => L.pressResend(page, win));
    await step('s6-row', async () => K.rowText(await K.openWorkflow(page, app, id), who.name));
    // 7: the reviewer's email
    await step('s7-email', async () => {
        const m = await L.mail(app, L.emailOf(app, who.user), since, 'Requesting your review again');
        return {...m, sentence: L.responseSentence(m.text)};
    });
    // the dates the request now carries, as the row's "Edit" shows them
    await step('s8-edit', async () => L.editWindowDates(page, await K.openWorkflow(page, app, id), who.name, 's8-edit-window'));
    facts.storedAfter = L.storedDates(app, id, who.user);
    record('a44-summary', facts);
});
