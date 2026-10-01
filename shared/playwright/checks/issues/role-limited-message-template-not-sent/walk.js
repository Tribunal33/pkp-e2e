// U35 A10 walk (issue report docs/issues/U35-A10-role-limited-message-template-not-sent.md).
// On PKP's default test dataset, as dbarnes, on the Production stage of the app's submission
// (OJS 5, OMP 4, OPS 1): the control first (the author's row › "Notify", "Discussion (Production)"
// chosen, a message typed, "Notify"); then Settings › Workflow › "Tasks and Discussions" ›
// "Discussion (Production)" › "Edit", "Limit access to specific roles", "Author", "Save"; then the
// same "Notify" again, and once more on the row of a participant who is not an Author (OJS and OMP
// Graham Cox, Layout Editor; OPS David Buskins, Moderator).
//   PROBE_FEATURE=issues-r2 PROBE_AGENT=r2 node bin/probe.js all shared/playwright/checks/issues/role-limited-message-template-not-sent/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, tag} = require('../../../probe');
const H = require('../added-message-template-not-sent/lib.js');

forEachApp(async (app) => {
    const a = H.APPS[app.name];
    const run = tag('u35r2');
    const NAME = 'Discussion (Production)';
    const facts = {app: app.name, line: app.line || 'main', run, steps: {}};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');

        // control: the template as installed, not limited
        let panel = await H.openStage(page, app, a.id);
        facts.steps.start = await H.readDiscussions(page, panel, 'c0', {name: NAME, open: false});
        let win = await H.openNotify(page, panel, a.author.name);
        facts.steps.control = await H.chooseAndSend(page, app, win, 'c1', {template: NAME, message: `u35r2 control c${run}`});
        facts.steps.afterControl = await H.readDiscussions(page, panel, 'c2', {name: NAME});
        facts.steps.controlMail = await H.waitMail(page, app, a.author.username, `c${run}`);

        // 2-4. limit the template to Author
        facts.steps.limited = await H.limitTemplate(page, app, {stage: H.STAGE, name: NAME, role: 'Author'});
        record('w4-templates', await screen(page));

        // 5-8. the same "Notify"
        panel = await H.openStage(page, app, a.id);
        win = await H.openNotify(page, panel, a.author.name);
        facts.steps.notify = await H.chooseAndSend(page, app, win, 'w7', {template: NAME, message: `u35r2 hello h${run}`});
        facts.steps.after = await H.readDiscussions(page, panel, 'w9', {name: NAME});
        facts.steps.mail = await H.waitMail(page, app, a.author.username, `h${run}`);

        // 9-10. the same template to a participant who holds none of its roles
        panel = await H.openStage(page, app, a.id);
        win = await H.openNotify(page, panel, a.outside.name);
        facts.steps.outside = await H.chooseAndSend(page, app, win, 'w9o', {template: NAME, message: `u35r2 other o${run}`});
        facts.steps.afterOutside = await H.readDiscussions(page, panel, 'w10', {name: NAME});
        facts.steps.outsideMail = await H.waitMail(page, app, a.outside.username, `o${run}`);
        await signOut(page);
        const c = facts.steps.control;
        const n = facts.steps.notify;
        facts.observed = {
            control: {choice: c.choice, send: c.send, discussions: [facts.steps.start.count, facts.steps.afterControl.count], mail: facts.steps.controlMail},
            limited: {wasLimited: facts.steps.limited.wasLimited, rolesOffered: facts.steps.limited.rolesOffered},
            listed: n.options.includes(NAME),
            choice: n.choice,
            send: n.send,
            discussions: {before: facts.steps.afterControl.count, after: facts.steps.after.count, window: facts.steps.after.window},
            mail: facts.steps.mail,
            outside: {to: a.outside, choice: facts.steps.outside.choice, send: facts.steps.outside.send, discussions: [facts.steps.after.count, facts.steps.afterOutside.count], window: facts.steps.afterOutside.window, mail: facts.steps.outsideMail},
        };
    } finally {
        record('walk', facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
