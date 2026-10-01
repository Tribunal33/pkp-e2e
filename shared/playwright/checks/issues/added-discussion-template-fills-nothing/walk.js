// Issue report docs/issues/U35-A10-added-discussion-template-fills-nothing.md (U35 A10):
// a discussion template added in Settings fills nothing and cannot be sent from
// the Participants panel's "Notify". Takes the report's Steps through the screens
// on a dataset fleet (PKP's default test dataset), freshly reset, on OJS, OMP, OPS:
//   1. sign in as dbarnes; 2. Settings › Workflow › "Tasks and Discussions";
//   3-4. "Production Stage" › "Add template": "u35w26 Proof questions",
//        "Please check the proofs.", unrestricted, "Save";
//   5. open the submission at Production (OJS 5, OMP 4, OPS 1);
//   6. the author's "More Actions" › "Notify"; 7. choose the template;
//   8. type "Hello", "Notify"; then the stage's discussions and the author's mailbox.
// Control (also the fix's neighbour check): the same with the installed
// "Discussion (Production)".
// Run: PROBE_FEATURE=issues-w26 PROBE_AGENT=w26 node bin/probe.js all shared/playwright/checks/issues/added-discussion-template-fills-nothing/walk.js
//      (reset the dataset fleet first: npm run fleet-prep -- --feature issues-w26 --dataset 2 --reset)
const {forEachApp} = require('../../../probe');
const {DEFAULT_TPL, helpers, session, signIn, signOut, record} = require('./common');

const NAME = 'u35w26 Proof questions';
const BODY = 'Please check the proofs.';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {page, close} = await session(app);
    const h = helpers(app, page);
    h.facts.startedAt = new Date().toISOString();
    try {
        await signIn(page, 'dbarnes');
        await h.addTemplate(NAME, BODY);

        await h.openSubmission('a-workflow');
        let {w, options} = await h.openNotify(h.c.authorName, 'a-notify-open');
        h.fact('notify list', options);
        await h.choose(w, NAME, 'a-choose-added');
        await h.typeAndSend(w, 'Hello', 'a-send-added');
        await h.discussions('a-after-added');
        h.fact('mail added', await h.mailTo(h.c.author, NAME));
        h.fact('db tasks after added', h.tasks());

        // Control: the installed "Discussion (Production)"
        ({w} = await h.openNotify(h.c.authorName, 'a-notify-open-control'));
        await h.choose(w, DEFAULT_TPL, 'a-choose-control');
        await h.typeAndSend(w, 'Hello', 'a-send-control');
        await h.discussions('a-after-control');
        h.fact('mail control', await h.mailTo(h.c.author, DEFAULT_TPL));
        h.fact('db tasks after control', h.tasks());
        await signOut(page);
    } finally {
        record('a-facts', h.facts);
        await close();
    }
});
