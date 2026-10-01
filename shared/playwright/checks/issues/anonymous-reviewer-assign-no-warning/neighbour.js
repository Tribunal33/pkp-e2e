// U35 A11 neighbour check (issue report docs/issues/U35-A11-anonymous-reviewer-assign-no-warning.md):
// the warning must stay away from a person who does not review the submission. On PKP's default test
// dataset, as dbarnes: a journal's submission 7 and a press's submission 16 (both in Review, Minoti Inoue
// reviews neither), and a preprint server's submission 1 (Production): "Participants" › "Assign", the role
// "Section editor" ("Series editor", "Moderator"), "Search", "Minoti Inoue" chosen (no box may open), "OK"
// (she is assigned).
//   PROBE_FEATURE=issues-r4 PROBE_AGENT=r4 node bin/probe.js all shared/playwright/checks/issues/anonymous-reviewer-assign-no-warning/neighbour.js
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', submission: c.other.id};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const panel = await H.openWorkflow(page, app, c.other.id, c.other.menuKey);
        const a = await H.assign(page, panel, {role: c.role, person: c.person, label: 'n1'});
        await signOut(page);
        facts.observed = {anonymousReviewerIdsInForm: a.ids, listed: a.listed, warning: a.warning, save: a.save, participants: a.participants};
    } finally {
        record('neighbour', facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
