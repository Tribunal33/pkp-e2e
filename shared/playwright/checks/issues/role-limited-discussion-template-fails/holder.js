// Second neighbour check for docs/issues/U35-A10-role-limited-discussion-template-fails.md,
// walked with the fix in and out on a freshly reset dataset fleet: a sender who is
// not a manager but holds one of the template's roles.
//   precondition: dbarnes limits "Discussion (Production)" to "Author" and the
//   sender's role (OJS "Section editor" for dbuskins, OMP "Layout Editor" for gcox,
//   OPS "Moderator" for dbuskins);
//   1. the sender opens "Notify" on the author's row and chooses "Discussion (Production)";
//   2. "Notify"; then the author's mailbox.
// Run: PROBE_FEATURE=issues-w26 PROBE_AGENT=w26 node bin/probe.js all shared/playwright/checks/issues/role-limited-discussion-template-fails/holder.js
const {forEachApp} = require('../../../probe');
const {DEFAULT_TPL, helpers, session, signIn, signOut, record} = require('../added-discussion-template-fills-nothing/common');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('holder.js runs on a dataset fleet');
    const {page, close} = await session(app);
    const h = helpers(app, page);
    h.facts.startedAt = new Date().toISOString();
    try {
        await signIn(page, 'dbarnes');
        await h.limitTemplate(DEFAULT_TPL, 'Author', h.c.otherRole);
        await signOut(page);

        await signIn(page, h.c.other);
        await h.openSubmission('h-workflow');
        const {w, options} = await h.openNotify(h.c.authorName, 'h-notify-open');
        h.fact('holder list', options);
        await h.choose(w, DEFAULT_TPL, 'h-choose');
        await h.typeAndSend(w, 'Hello', 'h-send');
        h.fact('mail to author', await h.mailTo(h.c.author, DEFAULT_TPL));
        h.fact('db tasks', h.tasks());
        await signOut(page);
    } finally {
        record('h-facts', h.facts);
        await close();
    }
});
