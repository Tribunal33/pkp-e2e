// Issue report docs/issues/U41-OPS2-competing-interests-label-raw-markup.md (U41 OPS2): on a
// preprint server the contributor form's "Competing Interests" field is labelled with raw markup,
// `Competing interests <a … href="{$competingInterestGuidelinesUrl}">CI Policy</a>`.
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default
// test dataset, as the dataset's `dbarnes` on `publicknowledge`: Settings › Workflow ›
// "Submission" › "Metadata", the competing-interests requirement ticked and saved; the lib.js
// CASES submission's "Contributors", "Add Contributor"; then the row "Edit" of its contributor.
// OJS and OMP take the same steps as the control. The kit builds nothing.
//
// Modes (first argument):
//   steps (default)  the Steps.
//   french           runs alone: the same form after "Change Language" › "français":
//                    the label and the guidance in French (OPS carries a French copy of the
//                    override too), beside step 2's settings section in English, which the fix
//                    must leave alone (its own keys).
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/competing-interests-label-raw-markup/walk.js [steps|french]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, the line's feature, PROBE_RUN=r35.
// Fix trial:    PROBE_RUN=fix (steps), french-in / french-out (french), with fix.diff applied or not.
// Facts: .reports/<feature>/<id>/ci-label-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib');

const mode = process.argv[2] || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {app: app.name, line: app.line || 'main', mode, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1600)}`);
    };
    const {page, close} = await launch(app);
    const group = app.name === 'ops' ? 'Preprint' : 'Publication';
    const wf = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: group}});
    const c = L.CASES[app.name];
    try {
        // step 1
        await signIn(page, 'dbarnes');
        // step 2
        fact('2 require competing interests', await L.requireCompetingInterests(page, app));
        if (mode === 'french') {
            await L.changeLanguage(page, /fran[cç]ais|French/i, 'fr_CA');
            fact('address after Change Language', page.url());
        }
        // step 3
        const label = mode === 'french' ? /^Contribut/ : 'Contributors';
        if (!(await L.openPage(wf, page, c.id, label))) {
            fact('3 Contributors page', 'absent');
            return;
        }
        // step 4
        const add = await L.openAdd(page, wf);
        fact('4 list header buttons', add.buttons);
        if (add.dlg) {
            fact(`4 Add Contributor: competing-interests field${mode === 'french' ? ' (French)' : ''}`, await L.ciField(add.dlg));
            record(`ci-label-add${mode === 'french' ? '-french' : ''}${run}`, await screen(page));
            await shot(page, `ci-label-add${mode === 'french' ? '-french' : ''}${run}`);
            await L.closeForm(page, add.dlg);
        }
        if (mode === 'steps') {
            // the same field on an existing contributor's "Edit"
            const dlg = await L.openEdit(page, wf, c.contributor);
            fact('Edit: competing-interests field', await L.ciField(dlg));
            await shot(page, `ci-label-edit${run}`);
            await L.closeForm(page, dlg);
        }
    } catch (e) {
        fact('error', L.flat(e.message, 500));
        await shot(page, `ci-label-${mode}-error${run}`).catch(() => {});
    } finally {
        record(`ci-label-facts${mode === 'french' ? '-french' : ''}${run}`, facts);
        await close();
    }
});
