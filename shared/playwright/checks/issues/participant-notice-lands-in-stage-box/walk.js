// U35 OPS4 walk (issue report docs/issues/U35-OPS4-participant-notice-lands-in-stage-box.md).
// On PKP's default test dataset: dbarnes opens a submission in Production (OPS 1, OJS 5, OMP 4),
// assigns Minoti Inoue as a Moderator (Section editor, Series editor), edits that assignment and
// sends her a message with "Notify" three times, staying on the page; then edits the assignment
// once more, sends a fourth message and loads the page again, to see whether the box stays. After each action the walk reads the two
// places the confirmation can show (a notice at the top right, a box headed "Notification" at the
// top of the stage's main column) and the page's own requests for pending notices.
// The journal and the press are the control, and with the fix in they are the neighbour check:
// their Production entry's box must keep showing the stage's own notices ("Awaiting Galleys.",
// a press's "Awaiting approval.") and refresh them after each action.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/participant-notice-lands-in-stage-box/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, tag} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const run = tag('u35r16');
    const facts = {app: app.name, line: app.line || 'main', run, submission: c.id};
    const {page, close} = await launch(app);
    const fetches = H.watchFetches(page);
    try {
        await signIn(page, 'dbarnes');
        await H.P.openWorkflow(page, app, c.id, c.stage);
        record('01-production', await screen(page));
        facts.boxesOnLanding = await H.stageBoxes(page);
        facts.fetchesOnLanding = fetches.take();
        facts.assign = await H.assign(page, fetches, c, '02-assign');
        facts.edit = await H.edit(page, fetches, c, '03-edit');
        facts.notify = await H.notify(page, fetches, c, `${run} a message to the participant`, '04-notify');
        facts.notify2 = await H.notify(page, fetches, c, `${run} a second message`, '05-notify');
        facts.notify3 = await H.notify(page, fetches, c, `${run} a third message`, '06-notify');
        // 7. "Edit" once more: whether the box of the last "Notify" stays after another action
        facts.editAgain = await H.edit(page, fetches, c, '07-edit-again');
        // 8. "Notify" once more, then the page loaded again: whether the box stays after a reload
        facts.notify4 = await H.notify(page, fetches, c, `${run} a fourth message`, '08-notify');
        await page.goto('about:blank');
        await H.P.openWorkflow(page, app, c.id, c.stage);
        record('09-reloaded', await screen(page));
        facts.reloaded = {stageBox: await H.stageBoxes(page), fetches: fetches.take()};
        facts.participants = await H.P.participants(page);
        await signOut(page);
        facts.observed = Object.fromEntries(['assign', 'edit', 'notify', 'notify2', 'notify3', 'editAgain', 'notify4'].map((k) => [k, {place: facts[k].place, topRight: facts[k].topRight, stageBox: facts[k].stageBox, boxAbove: facts[k].boxAbove,
            fetches: (facts[k].fetches || []).map((f) => `${f.by}${f.options ? ' with options' : ''} sent ${f.sentAt} answered ${f.answeredAt}: ${JSON.stringify(f.notices)}`)}]));
        facts.observed.reloaded = facts.reloaded;
    } finally {
        record('facts', facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
