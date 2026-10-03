// Issue report docs/issues/U41-A1-contributor-rows-no-affiliation.md (U41 A1): the report's Steps to
// reproduce, walked through the screens on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"). The kit builds nothing; the one submission the steps begin is titled "u41a wizard".
//
// Steps (default mode):
//   1-3  dbarnes: the workflow's Publication › "Contributors" of OJS 4 / OMP 4 / OPS 1; each row's
//        title and the line under it
//   4    "Edit" on the first contributor: the window's "Affiliations"; "Close"
//   5-6  the author (ccorino, OMP aclark) begins a submission "u41a wizard"
//   7    "Continue" to "Contributors": the own row's line; "Edit": "Affiliations"; "Close"
//   8    "Continue" to "Review": the names its "Contributors" section lists
//   Besides the screens it reads the contributors' stored affiliations (author_affiliations).
// MODE=neighbour (the neighbour check for fix.diff): dbarnes opens a list that mixes contributors
//   with and without an affiliation (OJS 1, OMP 2, OPS 2): those without must keep an empty line,
//   and those with one show it.
// MODE=two (to see the fix's separators): the default steps, with a second affiliation "Second
//   Institute" typed and added in step 4's and step 7's "Edit" windows ("Add", "Save"), so the rows
//   and Review show a contributor with two affiliations.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u41a --dataset 5 --reset
// Run (main):   PROBE_FEATURE=issues-u41a PROBE_AGENT=u41a node bin/probe.js all shared/playwright/checks/issues/contributor-rows-no-affiliation/walk.js
// Neighbour:    MODE=neighbour PROBE_RUN=nb-out PROBE_FEATURE=issues-u41a PROBE_AGENT=u41a node bin/probe.js all …/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u41a-3_5 PROBE_AGENT=u41a node bin/probe.js all …/walk.js
// Facts: .reports/<feature>/u41a/walk[-<run>]-<app>.json, screens NN-<name>[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, sql, idle} = require('../../../probe');
const L = require('./lib');
const C = require('../one-role-journal-contributor-save-fails/lib.js');
const W = require('../wizard-refused-save-hangs-saving/lib.js');

const MODE = process.env.MODE || 'steps';
const SUB = {
    steps: {ojs: {id: 4, pub: 5, first: 'Craig Montgomerie'}, omp: {id: 4, pub: 4, first: 'Bart Beaty'}, ops: {id: 1, pub: 1, first: 'Carlo Corino'}},
    two: {ojs: {id: 4, pub: 5, first: 'Craig Montgomerie'}, omp: {id: 4, pub: 4, first: 'Bart Beaty'}, ops: {id: 1, pub: 1, first: 'Carlo Corino'}},
    neighbour: {ojs: {id: 1, pub: 2}, omp: {id: 2, pub: 2}, ops: {id: 2, pub: 2}},
};
const AUTHOR = {ojs: 'ccorino', omp: 'aclark', ops: 'ccorino'};
const SECTION = {ojs: 'Articles', omp: null, ops: 'Preprints'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const facts = {mode: MODE, line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const {page, close} = await launch(app);
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
    const stored = (pubId) => sql(app, `select a.seq, a.author_id,
        (select setting_value from author_settings s where s.author_id = a.author_id and s.setting_name = 'familyName' and s.locale = 'en'),
        coalesce((select string_agg(x.setting_value, ' / ') from author_affiliations af join author_affiliation_settings x
            on x.author_affiliation_id = af.author_affiliation_id and x.setting_name = 'name' and x.locale = 'en'
            where af.author_id = a.author_id), '(none)')
        from authors a where a.publication_id = ${pubId} order by a.seq`);
    const sub = SUB[MODE][app.name];

    try {
        // 1-3: dbarnes, the workflow's Contributors list
        await signIn(page, 'dbarnes');
        await C.openWorkflowContributors(page, app, sub.id, sub.pub);
        fact('rows', await L.rowLines(page));
        fact('stored', stored(sub.pub));
        await snap(MODE === 'neighbour' ? 'nb-workflow-contributors' : 'workflow-contributors');
        if (MODE === 'neighbour') return;

        // 4: the first contributor's Edit window
        fact('editAffiliations', await step('edit', () => L.editAffiliations(page, sub.first)));
        await snap('workflow-after-edit-close');
        if (MODE === 'two') {
            fact('twoAdd', await step('two-add', () => L.addAffiliation(page, sub.first, 'Second Institute')));
            await C.openWorkflowContributors(page, app, sub.id, sub.pub);
            fact('twoRows', await L.rowLines(page));
            await snap('two-workflow-contributors');
        }

        // 5-6: the author begins a submission
        await signOut(page);
        await signIn(page, AUTHOR[app.name]);
        const id = await step('wizard-begin', () => W.beginSubmission(page, app, {title: 'u41a wizard', section: SECTION[app.name]}));
        fact('wizardSubmission', id);
        if (!id) return;

        // 7: Continue to Contributors
        await step('wizard-contributors', () => C.continueToContributors(page));
        fact('wizardRows', await L.rowLines(page));
        await snap('wizard-contributors');
        const own = (await L.rowLines(page))[0];
        const ownName = own ? own.title.split(' ').slice(0, 2).join(' ') : '';
        fact('wizardEditAffiliations', await step('wizard-edit', () => L.editAffiliations(page, ownName)));
        if (MODE === 'two') {
            fact('twoWizardAdd', await step('two-wizard-add', () => L.addAffiliation(page, ownName, 'Second Institute')));
            fact('twoWizardRows', await L.rowLines(page));
            await snap('two-wizard-contributors');
        }

        // 8: Continue to Review
        for (let i = 0; i < 6 && !(await page.locator('.submissionWizard__reviewPanel').first().isVisible().catch(() => false)); i++) {
            const next = await step(`wizard-continue-${i}`, () => W.pressContinue(page));
            await idle(page).catch(() => {});
            if (next === null) break;
        }
        fact('wizardStep', await W.currentStep(page));
        fact('reviewContributors', await L.reviewContributorNames(page));
        await snap('wizard-review');
        fact('wizardStored', sql(app, `select publication_id from publications where submission_id = ${id}`).trim().split('\n')
            .map((p) => stored(Number(p))));
    } finally {
        record('walk', facts);
        await close();
    }
});
