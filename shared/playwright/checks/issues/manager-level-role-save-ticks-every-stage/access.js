// U54 A3, what the save opens to a member (issue report docs/issues/U54-A3-manager-level-role-save-ticks-every-stage.md).
// On PKP's default test dataset (OJS submission 5, Production; OMP submission 13, Copyediting; both with a
// double-anonymous review round):
//   1. admin: Administration > Hosted Journals (Presses), "Settings wizard", "Users", svogt's "Edit User",
//      tick "Production editor", "OK".
//   2. dbarnes: the submission's "Assign", "Production editor", "Search", "Sarah Vogt", "OK".
//   3. svogt: the submission's workflow, the "Submission" and "Review Round 1" entries read.
//   4. dbarnes: Settings > Users & Roles > "Roles", "Production editor" > "Edit", "OK" unchanged.
//   5. svogt: step 3 again.
//   ONLY=ojs,omp PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/manager-level-role-save-ticks-every-stage/access.js
const {forEachApp, launch, signIn, record, screen} = require('../../../probe');
const H = require('./lib.js');

const ROLE = 'Production editor';
// OMP: the external round is the second "Review Round 1" (after Internal Review's).
const ENTRIES = {
    ojs: [{label: 'Submission', key: 'submission'}, {label: 'Review Round 1', key: 'review'}],
    omp: [{label: 'Submission', key: 'submission'}, {label: 'Review Round 1', key: 'internalReview'}, {label: 'Review Round 1', nth: 1, key: 'externalReview'}],
};

forEachApp(async (app) => {
    const a = H.ACCESS[app.name];
    if (!a) {
        return;
    }
    const facts = {app: app.name, line: app.line || 'main', submissionId: a.id};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        await H.giveRoleAsAdmin(page, app, {username: a.person, role: ROLE});
        await signIn(page, 'dbarnes');
        facts.assigned = await H.assignAs(page, app, a.id, {role: ROLE, personName: a.personName});
        await signIn(page, a.person);
        facts.before = await H.stageTexts(page, app, a.id, ENTRIES[app.name]);
        record('a1-member-before', await screen(page));
        await signIn(page, 'dbarnes');
        const tab = await H.rolesTab(page, app);
        const win = await tab.openEdit(ROLE);
        facts.save = await H.saveWindow(page, win);
        facts.rowAfter = await H.ticked(tab, ROLE);
        await signIn(page, a.person);
        facts.after = await H.stageTexts(page, app, a.id, ENTRIES[app.name]);
        record('a2-member-after', await screen(page));
    } finally {
        record('access', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
