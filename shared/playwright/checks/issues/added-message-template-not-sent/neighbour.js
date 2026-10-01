// U35 A10 neighbour check (issue report docs/issues/U35-A10-added-message-template-not-sent.md):
// the fix must leave the installed templates, which have a key, as they are. As dbarnes on the
// Production stage of the app's submission: the author's row › "Notify"; on a journal and a press
// "Ready for Production" is chosen and "Message" read (its letter keeps the "NAME" tag); then
// "Discussion (Production)" is chosen, a message typed and "Notify" pressed, which must send.
//   PROBE_FEATURE=issues-r2 PROBE_AGENT=r2 node bin/probe.js all shared/playwright/checks/issues/added-message-template-not-sent/neighbour.js
const {forEachApp, launch, signIn, signOut, record, tag} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const a = H.APPS[app.name];
    const run = tag('u35r2n');
    const NAME = 'Discussion (Production)';
    const facts = {app: app.name, line: app.line || 'main', run, steps: {}};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const panel = await H.openStage(page, app, a.id);
        facts.steps.before = await H.readDiscussions(page, panel, 'n0', {name: NAME, open: false});
        const win = await H.openNotify(page, panel, a.author.name);
        if (app.name !== 'ops') facts.steps.letter = await H.chooseAndSend(page, app, win, 'n1', {template: 'Ready for Production', send: false});
        facts.steps.notify = await H.chooseAndSend(page, app, win, 'n2', {template: NAME, message: `u35r2 neighbour ${run}`});
        facts.steps.after = await H.readDiscussions(page, panel, 'n3', {name: NAME});
        facts.steps.mail = await H.waitMail(page, app, a.author.username, run);
        await signOut(page);
        const n = facts.steps.notify;
        facts.observed = {
            letter: facts.steps.letter && facts.steps.letter.choice,
            choice: n.choice,
            send: n.send,
            discussions: {before: facts.steps.before.count, after: facts.steps.after.count, window: facts.steps.after.window},
            mail: facts.steps.mail,
        };
    } finally {
        record('neighbour', facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
