// Kept walk for docs/issues/U27-A47-resent-request-never-overdue.md (spec U27, register A47).
// On PKP's default test dataset (a dataset fleet), journal and press: Paul Hudson declines his request,
// dbarnes resends it with the dates offered, then moves its "Response Due Date" to yesterday through
// "Edit" (standing in for the date passing); his row, its menu and the round status are read. Control:
// Julie Janssen's first request moved to yesterday the same way. Run:
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=h13m node bin/probe.js ojs,omp \
//     shared/playwright/checks/issues/resent-request-never-overdue/walk.js
// (`all` works too: a preprint server has no review and is skipped.)
// When the row offers "Send Reminder" (the fix in), the walk opens it and sends the reminder.
// WALK_MODE=neighbour runs only the neighbour check for a fix trial: Paul Hudson declines, the request is
// resent, he accepts it, and its response date is moved to yesterday: an accepted request must keep
// reading "Request Accepted" (no "Send Reminder"), with the fix in and out.
const {forEachApp, launch, signIn, signOut, record, note} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';

forEachApp(async (app) => {
    const c = L.CASES[app.name];
    if (!c) return; // a preprint server has no review
    const {id, declines: who, control} = c;
    const yesterday = L.day(-1);
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submission: id, yesterday: L.isoDate(yesterday)};
    const step = async (key, fn) => {
        try {
            facts[key] = await fn();
        } catch (e) {
            facts[key] = {error: L.flat(e.message, 400)};
            note(`U27 A47 walk (${app.name}, ${MODE}): step ${key} failed: ${L.flat(e.message, 200)}`);
        }
        return facts[key];
    };
    const {page} = await launch(app);
    facts.storedBefore = L.stored(app, id, who.user);

    // 1-2: the reviewer declines
    await signIn(page, who.user);
    await step('s2-decline', () => L.reviewerDecline(page, app, id));
    await signOut(page);
    // 3: the editor's workflow, the declined row
    await signIn(page, 'dbarnes');
    await step('s3-row', async () => L.rowState(await L.openWorkflow(page, app, id), who.name));
    // 4: "Resend Review Request" with the dates the window offers
    await step('s4-resend', async () => L.resendAsOffered(page, await L.openWorkflow(page, app, id), who.name, 's4-resend-window'));
    await step('s4-row', async () => L.rowState(await L.openWorkflow(page, app, id), who.name));
    facts.storedResent = L.stored(app, id, who.user);

    if (MODE === 'neighbour') {
        await signOut(page);
        await signIn(page, who.user);
        await step('n1-accept', () => L.reviewerAccept(page, app, id));
        await signOut(page);
        await signIn(page, 'dbarnes');
        await step('n2-edit', async () => L.editResponseDate(page, await L.openWorkflow(page, app, id), who.name, yesterday, 'nb-edit-window'));
        await step('n3-row', async () => {
            const modal = await L.openWorkflow(page, app, id);
            record('nb-row', await require('../../../probe').screen(page));
            return {row: await L.rowState(modal, who.name), round: await L.roundStatus(modal)};
        });
        facts.storedAfter = L.stored(app, id, who.user);
        record('a47-neighbour', facts);
        return;
    }

    // 5: "Edit", "Response Due Date" yesterday, "OK"
    await step('s5-edit', async () => L.editResponseDate(page, await L.openWorkflow(page, app, id), who.name, yesterday, 's5-edit-window'));
    facts.storedAfterEdit = L.stored(app, id, who.user);
    // 6: reloaded: his row and the round status
    let modal;
    await step('s6-row', async () => {
        modal = await L.openWorkflow(page, app, id);
        record('s6-reviewers', await require('../../../probe').screen(page));
        return {row: await L.rowState(modal, who.name), round: await L.roundStatus(modal)};
    });
    // 7: his "More Actions" menu
    await step('s7-menu', async () => L.menuEntries(page, modal, who.name));
    // with the fix: the row's "Send Reminder", opened and sent
    await step('s7-reminder', async () => L.sendReminderIfOffered(page, modal, who.name, 's7-reminder-window'));
    // 8: control, the first request of Julie Janssen moved to yesterday
    await step('s8-edit', async () => L.editResponseDate(page, await L.openWorkflow(page, app, id), control.name, yesterday));
    await step('s8-row', async () => {
        const m = await L.openWorkflow(page, app, id);
        record('s8-reviewers', await require('../../../probe').screen(page));
        return {control: await L.rowState(m, control.name), resent: await L.rowState(m, who.name), round: await L.roundStatus(m)};
    });
    facts.storedAfter = L.stored(app, id, who.user);
    record('a47-summary', facts);
});
