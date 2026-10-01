// Issue report docs/issues/U35-A10-role-limited-discussion-template-fails.md (U35 A10):
// a discussion template limited to some roles fails on the server when chosen or
// sent from the Participants panel's "Notify". Takes the report's Steps through
// the screens on a dataset fleet (PKP's default test dataset), freshly reset, on
// OJS, OMP and OPS:
//   1. sign in as dbarnes; 2. Settings › Workflow › "Tasks and Discussions";
//   3-4. "Discussion (Production)" › "Edit" › "Limit access to specific roles" › "Author" › "Save";
//   5. open the submission at Production (OJS 5, OMP 4, OPS 1);
//   6. the author's "More Actions" › "Notify"; 7. choose "Discussion (Production)";
//   8. type "Hello", "Notify"; then the stage's discussions and the author's mailbox.
// The neighbour check is neighbour.js beside this file.
// Run: PROBE_FEATURE=issues-w26 PROBE_AGENT=w26 node bin/probe.js all shared/playwright/checks/issues/role-limited-discussion-template-fails/walk.js
//      (reset the dataset fleet first: npm run fleet-prep -- --feature issues-w26 --dataset 2 --reset)
const {forEachApp} = require('../../../probe');
const {DEFAULT_TPL, helpers, session, signIn, signOut, record} = require('../added-discussion-template-fills-nothing/common');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {page, close} = await session(app);
    const h = helpers(app, page);
    h.facts.startedAt = new Date().toISOString();
    try {
        await signIn(page, 'dbarnes');
        await h.limitTemplate(DEFAULT_TPL, 'Author');

        await h.openSubmission('b-workflow');
        const {w, options} = await h.openNotify(h.c.authorName, 'b-notify-open');
        h.fact('notify list', options);
        await h.choose(w, DEFAULT_TPL, 'b-choose-limited');
        await h.typeAndSend(w, 'Hello', 'b-send-limited');
        await h.discussions('b-after-limited');
        h.fact('mail limited', await h.mailTo(h.c.author, DEFAULT_TPL));
        h.fact('db tasks after limited', h.tasks());
        await signOut(page);
    } finally {
        record('b-facts', h.facts);
        await close();
    }
});
