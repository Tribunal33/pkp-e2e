// U35 A10 walk (issue report docs/issues/U35-A10-added-message-template-not-sent.md).
// On PKP's default test dataset, as dbarnes: Settings › Workflow › "Tasks and Discussions" ›
// "Production Stage" › "Add template" ("u35r2 proofs note", message "u35r2 proofs are ready", "Save");
// then the Production stage of the app's submission (OJS 5, OMP 4, OPS 1), the author's row ›
// "More Actions" › "Notify", the new template chosen, a message typed, "Notify".
//   PROBE_FEATURE=issues-r2 PROBE_AGENT=r2 node bin/probe.js all shared/playwright/checks/issues/added-message-template-not-sent/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, tag} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const a = H.APPS[app.name];
    const run = tag('u35r2');
    const NAME = 'u35r2 proofs note';
    const facts = {app: app.name, line: app.line || 'main', run, steps: {}};
    const {page, close} = await launch(app);
    try {
        // 1-4. dbarnes adds the template
        await signIn(page, 'dbarnes');
        facts.steps.added = await H.addTemplate(page, app, {stage: H.STAGE, name: NAME, message: 'u35r2 proofs are ready'});
        record('w4-templates', await screen(page));

        // 5-8. Production › the author's row › "Notify": choose it, type, "Notify"
        const panel = await H.openStage(page, app, a.id);
        facts.steps.before = await H.readDiscussions(page, panel, 'w5', {name: NAME, open: false});
        record('w5-production', await screen(page));
        const win = await H.openNotify(page, panel, a.author.name);
        facts.steps.notify = await H.chooseAndSend(page, app, win, 'w7', {template: NAME, message: `u35r2 hello ${run}`});

        // what is left: the stage's discussions, the author's mailbox
        facts.steps.after = await H.readDiscussions(page, panel, 'w9', {name: NAME});
        facts.steps.mail = await H.waitMail(page, app, a.author.username, run);
        await signOut(page);
        const n = facts.steps.notify;
        facts.observed = {
            listed: n.options.includes(NAME),
            choice: n.choice,
            send: n.send,
            discussions: {before: facts.steps.before.count, after: facts.steps.after.count, rows: facts.steps.after.rows, window: facts.steps.after.window},
            mail: facts.steps.mail,
        };
    } finally {
        record('walk', facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
