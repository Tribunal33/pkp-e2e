// Issue report docs/issues/U53-A4-user-search-example-journal-role.md (its fix-omp.diff, fix-ops.diff):
// on a press and a preprint server the "Users" search box's example names "Journal editor", a role
// they do not have. Takes the report's Steps on PKP's default test dataset, all three apps (OJS
// the control):
//   1. rvaca signs in
//   2-3. Settings > Users & Roles, the "Users" tab: the search box's text
//   4. the example "Journal editor" typed and searched: the list
//   5. the app's own editor role ("Journal editor", "Press editor", "Moderator") searched: the list
// Changes nothing. NB=1 runs the neighbour check alone: the same box in French (Canada), which the
// fix (English texts of OMP and OPS) must leave as it is.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/user-search-example-journal-role/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const {openUsersTab, usersTabFacts, searchUsers} = require('../users-tab-french-raw-keys/lib');

const OWN_ROLE = {ojs: 'Journal editor', omp: 'Press editor', ops: 'Moderator'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const lang = nb ? 'fr_CA' : 'en';
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour (fr_CA)' : 'steps (en)'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
    };
    const {page, close} = await launch(app);
    try {
        // 1
        await signIn(page, 'rvaca');
        await idle(page);
        // 2
        await openUsersTab(app, page, lang);
        record(`${lang}-2-users-tab`, await screen(page));
        // 3
        const f = await usersTabFacts(page);
        fact('3 search box', {placeholder: f.placeholder, label: f.label});
        if (!nb) {
            // 4
            fact('4 example searched', await searchUsers(page, 'Journal editor'));
            record(`${lang}-4-example-searched`, await screen(page));
            // 5
            fact('5 own role searched', await searchUsers(page, OWN_ROLE[app.name]));
            record(`${lang}-5-own-role-searched`, await screen(page));
        }
        await signOut(page).catch(() => {});
    } finally {
        record(`${lang}-facts`, facts);
        await close();
    }
});
