// Issue report docs/issues/U41-A14-one-role-journal-contributor-save-fails.md (U41 A14): the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"). The kit builds nothing; names are tagged u41h.
//
// Steps (default mode):
//   [OMP] precondition: as rvaca, the nine contributors of submissions 2, 12, 18 that hold
//         "Chapter Author" or "Volume editor" get "Author" as their only role
//   1-3   rvaca: Settings › Workflow › Submission › "Contributor Roles", "Delete Role" on
//         "Translator" (OMP also "Volume editor" and "Chapter Author"): one role left
//   4-7   adding: the workflow's Publication › Contributors of OJS 4 / OMP 3 / OPS 1,
//         "Add Contributor", "Ana u41h Person", "Save"; Close; reload
//   8     editing: "Edit" on the second contributor (OJS Mark Irvine, OMP Bob Barnetson,
//         OPS Carlo Corino), Given Name "<name> u41h", "Save"; Close; reload
//   9-10  submitting: the author (ccorino, OMP aclark) begins a submission "u41h wizard",
//         "Continue" to "Contributors", "Add Contributor" "Ben u41h Person", "Save"
//   Besides the screens it reads each new or edited contributor's stored roles and the server log.
// MODE=neighbour (the neighbour check for fix.diff): no role is deleted. On the same list,
//   "Add Contributor" with only "Translator" ticked must save with that role alone, and one with
//   no role ticked must still be refused on screen.
// On stable-3_5_0 the walk stops after step 2: the line has no "Contributor Roles" screen.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u41h --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u41h PROBE_AGENT=u41h node bin/probe.js all shared/playwright/checks/issues/one-role-journal-contributor-save-fails/walk.js
// Neighbour:    MODE=neighbour PROBE_RUN=nb-out PROBE_FEATURE=issues-u41h PROBE_AGENT=u41h node bin/probe.js all …/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u41h-3_5 PROBE_AGENT=u41h node bin/probe.js all …/walk.js
// Facts: .reports/<feature>/u41h/walk[-<run>]-<app>.json, screens NN-<name>[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, sql, idle, serverLog} = require('../../../probe');
const L = require('./lib');
const W = require('../wizard-refused-save-hangs-saving/lib.js');

const MODE = process.env.MODE || 'steps';
const SUB = {ojs: {id: 4, pub: 5, edit: 'Mark Irvine', given: 'Mark'}, omp: {id: 3, pub: 3, edit: 'Bob Barnetson', given: 'Bob'},
    ops: {id: 1, pub: 1, edit: 'Carlo Corino', given: 'Carlo'}};
const AUTHOR = {ojs: 'ccorino', omp: 'aclark', ops: 'ccorino'};
const SECTION = {ojs: 'Articles', omp: null, ops: 'Preprints'};
// OMP: contributors holding the roles to delete (submission, publication, names)
const OMP_PRE = [
    {id: 2, pub: 2, names: ['Sarah Carter', 'Peter Fortna'], from: 'Volume editor'},
    {id: 2, pub: 2, names: ['Gerald Friesen', 'Lyle Dick', 'Winona Wheeler', 'Matt Dyce', 'James Opp'], from: 'Chapter Author'},
    {id: 12, pub: 12, names: ['Heloise Emdon'], from: 'Volume editor'},
    {id: 18, pub: 18, names: ['Nargis Parvin'], from: 'Volume editor'},
];
const DELETE = {ojs: [['Translator', 'TRANSLATOR']], ops: [['Translator', 'TRANSLATOR']],
    omp: [['Translator', 'TRANSLATOR'], ['Volume editor', 'EDITOR'], ['Chapter Author', 'AUTHOR']]};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const facts = {mode: MODE, line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const {page, close} = await launch(app);
    const log = serverLog(app);
    let n = 0;
    const snap = async (name) => {
        const s = await screen(page).catch((e) => ({error: L.flat(e.message, 200)}));
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`).catch(() => {});
        return s;
    };
    const step = async (name, fn) => {
        try { return await fn(); } catch (e) { fact(`${name}.FAILED`, L.flat(e.stack || e, 900)); await snap(`${name}-FAILED`); return null; }
    };
    const storedRoles = (like) => sql(app, `select a.author_id, a.publication_id, s.setting_value,
        coalesce((select string_agg(r.setting_value, ',') from credit_contributor_roles c join contributor_role_settings r
            on r.contributor_role_id = c.contributor_role_id and r.setting_name = 'name' and r.locale = 'en'
            where c.contributor_id = a.author_id), '(none)')
        from authors a join author_settings s on s.author_id = a.author_id and s.setting_name = 'givenName' and s.locale = 'en'
        where s.setting_value like '${like}' order by a.author_id`);
    const sub = SUB[app.name];

    try {
        // 1-2: rvaca, the Contributor Roles screen
        await signIn(page, 'rvaca');
        const before = await step('roles', () => L.openContributorRoles(page, app));
        fact('rolesBefore', before);
        await snap('contributor-roles');
        if (!before) { fact('stop', 'no "Contributor Roles" tab on Settings › Workflow › Submission'); return; }

        if (MODE === 'steps') {
            if (app.name === 'omp') {
                const pre = [];
                for (const g of OMP_PRE) {
                    await L.openWorkflowContributors(page, app, g.id, g.pub);
                    for (const name of g.names) {
                        const r = await step(`pre-${name}`, () => L.saveContributor(page, {edit: name, roles: {'Author': true, [g.from]: false}}));
                        pre.push({name, status: r && r.request && r.request.status, closed: r && !r.after6s.open});
                        await L.closeForm(page);
                    }
                }
                fact('ompPrecondition', pre);
                await L.openContributorRoles(page, app);
            }
            // 3: delete roles until one is left
            const deleted = [];
            for (const [name, ident] of DELETE[app.name]) {
                deleted.push({name, ...(await step(`delete-${name}`, () => L.deleteContributorRole(page, name, ident)) || {})});
            }
            fact('deleted', deleted);
            await snap('contributor-roles-one-left');
        }

        // 4: the workflow's Contributors list
        await L.openWorkflowContributors(page, app, sub.id, sub.pub);
        fact('listBefore', await L.contributorRows(page));
        await snap('workflow-contributors');

        if (MODE === 'neighbour') {
            for (const [label, roles] of [['translator-only', {'Translator': true}], ['no-role', {}]]) {
                const mark = log.mark();
                const r = await step(`nb-${label}`, () => L.saveContributor(page, {
                    fill: {givenName: `Nb u41h ${label}`, familyName: 'Person', email: `u41h-${label}@mailinator.com`, country: 'Canada'}, roles}));
                fact(`nb-${label}`, {...r, screen: undefined, notices: r && r.screen && r.screen.notices, serverLog: log.since(mark)});
                await snap(`nb-${label}-after-save`);
                await L.closeForm(page);
                await L.openWorkflowContributors(page, app, sub.id, sub.pub);
            }
            fact('nbListAfterReload', await L.contributorRows(page));
            await snap('nb-list-reload');
            fact('nbStored', storedRoles('Nb u41h%'));
            return;
        }

        // 5-7: adding
        let mark = log.mark();
        const add = await step('add', () => L.saveContributor(page, {
            fill: {givenName: 'Ana u41h', familyName: 'Person', email: 'u41h@mailinator.com', country: 'Canada'}}));
        fact('add', {...add, screen: undefined, notices: add && add.screen && add.screen.notices, serverLog: log.since(mark)});
        await snap('add-after-save');
        fact('addClosedWithClose', await L.closeForm(page));
        fact('addListSamePage', await L.contributorRows(page));
        await L.openWorkflowContributors(page, app, sub.id, sub.pub);
        fact('addListAfterReload', await L.contributorRows(page));
        await snap('add-list-reload');
        fact('addStored', storedRoles('Ana u41h%'));

        // 8: editing
        mark = log.mark();
        const edit = await step('edit', () => L.saveContributor(page, {edit: sub.edit, fill: {givenName: `${sub.given} u41h`}}));
        fact('edit', {...edit, screen: undefined, notices: edit && edit.screen && edit.screen.notices, serverLog: log.since(mark)});
        await snap('edit-after-save');
        await L.closeForm(page);
        await L.openWorkflowContributors(page, app, sub.id, sub.pub);
        fact('editListAfterReload', await L.contributorRows(page));
        await snap('edit-list-reload');
        fact('editStored', storedRoles(`${sub.given}%`));

        // 9-10: the author in the wizard
        await signOut(page);
        await signIn(page, AUTHOR[app.name]);
        const id = await step('wizard-begin', () => W.beginSubmission(page, app, {title: 'u41h wizard', section: SECTION[app.name]}));
        fact('wizardSubmission', id);
        if (id) {
            await step('wizard-continue', () => L.continueToContributors(page));
            fact('wizardListBefore', await L.contributorRows(page));
            await snap('wizard-contributors');
            mark = log.mark();
            const wz = await step('wizard-add', () => L.saveContributor(page, {
                fill: {givenName: 'Ben u41h', familyName: 'Person', email: 'u41h-ben@mailinator.com', country: 'Canada'}}));
            fact('wizardAdd', {...wz, screen: undefined, notices: wz && wz.screen && wz.screen.notices, serverLog: log.since(mark)});
            await snap('wizard-after-save');
            await L.closeForm(page);
            await page.reload(); await idle(page).catch(() => {});
            await step('wizard-reload', () => L.continueToContributors(page));
            fact('wizardListAfterReload', await L.contributorRows(page));
            await snap('wizard-list-reload');
            fact('wizardStored', storedRoles('Ben u41h%'));
        }
    } finally {
        record('walk', facts);
        await close();
    }
});
