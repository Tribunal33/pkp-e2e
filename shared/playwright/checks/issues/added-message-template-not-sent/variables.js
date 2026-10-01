// U35 A10, with the fix in (issue report docs/issues/U35-A10-added-message-template-not-sent.md):
// what an added template that holds placeholders produces. As dbarnes: "Add template" in
// "Production Stage" ("u35r2 variables note", the text "u35r2 for" and, through "Insert Content",
// {$recipientName} and {$submissionTitle}); then the author's row › "Notify", the template chosen,
// "Notify" pressed with "Message" as filled. Reads "Message", the discussion's message and the email.
//   PROBE_FEATURE=issues-r2 PROBE_AGENT=r2 node bin/probe.js all shared/playwright/checks/issues/added-message-template-not-sent/variables.js
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const a = H.APPS[app.name];
    const NAME = 'u35r2 variables note';
    const facts = {app: app.name, line: app.line || 'main', steps: {}};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        facts.steps.added = await H.addTemplate(page, app, {stage: H.STAGE, name: NAME, message: 'u35r2 for ', insert: ['{$recipientName}', '{$submissionTitle}']});
        const panel = await H.openStage(page, app, a.id);
        const win = await H.openNotify(page, panel, a.author.name);
        facts.steps.notify = await H.chooseAndSend(page, app, win, 'v1', {template: NAME});
        facts.steps.after = await H.readDiscussions(page, panel, 'v2', {name: NAME});
        facts.steps.mail = await H.waitMail(page, app, a.author.username, 'u35r2 for');
        await signOut(page);
        const n = facts.steps.notify;
        facts.observed = {template: facts.steps.added.filled, choice: n.choice, messageAtSend: n.messageAtSend, send: n.send, discussion: facts.steps.after.window, mail: facts.steps.mail};
    } finally {
        record('variables', facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
