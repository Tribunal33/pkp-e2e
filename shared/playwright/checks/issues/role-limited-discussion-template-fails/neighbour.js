// Neighbour check for docs/issues/U35-A10-role-limited-discussion-template-fails.md,
// walked with the fix in and out, on a freshly reset dataset fleet:
//   precondition: dbarnes limits "Discussion (Production)" to "Author" (walk.js steps 1-4);
//   1. a participant who is neither a manager nor an Author (OJS and OPS dbuskins,
//      OMP gcox) opens "Notify" on the author's row: "Discussion (Production)" must
//      stay off their list;
//   2. dbarnes sends "Discussion (Production)" to that participant (who lacks the
//      Author role): with the fix the roles limit who may send the template, not who
//      may receive it.
// Run: PROBE_FEATURE=issues-w26 PROBE_AGENT=w26 node bin/probe.js all shared/playwright/checks/issues/role-limited-discussion-template-fails/neighbour.js
const {forEachApp} = require('../../../probe');
const {DEFAULT_TPL, helpers, session, signIn, signOut, record} = require('../added-discussion-template-fills-nothing/common');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    const {page, close} = await session(app);
    const h = helpers(app, page);
    h.facts.startedAt = new Date().toISOString();
    try {
        await signIn(page, 'dbarnes');
        await h.limitTemplate(DEFAULT_TPL, 'Author');
        await signOut(page);

        await signIn(page, h.c.other);
        await h.openSubmission('n-other-workflow');
        const r = await h.openNotify(h.c.authorName, 'n-other-notify-open').catch((e) => ({error: String(e.message).slice(0, 200)}));
        h.fact('other user list', r.options || r);
        await signOut(page);

        await signIn(page, 'dbarnes');
        await h.openSubmission('n-workflow');
        const {w} = await h.openNotify(h.c.otherName, 'n-notify-other');
        await h.choose(w, DEFAULT_TPL, 'n-choose-to-other');
        await h.typeAndSend(w, 'Hello', 'n-send-to-other');
        h.fact('mail to other', await h.mailTo(h.c.other, DEFAULT_TPL));
        h.fact('db tasks', h.tasks());
        await signOut(page);
    } finally {
        record('n-facts', h.facts);
        await close();
    }
});
