// Issue report docs/issues/U41-A28-affiliation-dropped-language-save-refused.md (U41 A28): once a
// language that a hand-entered institution is named in is unticked under "Metadata", the
// contributor's "Edit" > "Save" is refused, and the form shows no reason.
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default
// test dataset, as the dataset's editor `dbarnes` on `publicknowledge`, on the submission and
// contributor of ../affiliation-error-list-object-object/lib.js CASES: "Edit institution name",
// a French name typed and saved; Settings > Website > Setup > Languages, French's "Metadata"
// unticked; the contributor's "Edit" again and "Save" with nothing changed. The kit builds
// nothing.
//
// Modes (first argument):
//   steps (default)  the Steps.
//   way              the Steps, then the way round: the refused form closed, "Edit" again,
//                    "Remove institution" > "Yes", "Save".
//   ror              an institution picked from the registry instead (the Steps' contributor,
//                    "University of Ljubljana" picked and added, "Save"), then French unticked,
//                    "Edit" again and "Save" with nothing changed.
//   control          what a fix must leave alone (runs alone): French's "Metadata" unticked first,
//                    with no French name anywhere; then the contributor's "Edit", the languages the
//                    form offers, "Edit institution name", and "Save" with nothing changed.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/affiliation-dropped-language-save-refused/walk.js [steps|way|ror|control]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, the line's feature, PROBE_RUN=r35.
// Fix trial:    PROBE_RUN=fix (steps), control-in / control-out (control), with fix.diff applied or not.
// Facts: .reports/<feature>/<id>/dropped-language-facts[-control|-way|-ror][-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, serverLog, idle} = require('../../../probe');
const A = require('../affiliation-error-list-object-object/lib.js');
const R = require('../registry-pick-saves-nameless/lib.js');
const H = require('./lib');

const mode = process.argv[2] || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const run = `${['control', 'way', 'ror'].includes(mode) ? `-${mode}` : ''}${process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : ''}`;
    const facts = {app: app.name, line: app.line || 'main', mode, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${A.flat(JSON.stringify(v), 1600)}`);
    };
    const {page, close} = await launch(app);
    const errors = [];
    page.on('pageerror', (e) => errors.push(A.flat(e.message, 300)));
    const log = serverLog(app);
    const from = log.mark();
    const group = app.name === 'ops' ? 'Preprint' : 'Publication';
    const wf = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: group}});
    const c = A.CASES[app.name];
    const stored = () => R.storedAffiliations(app, R.authorId(app, c.id, c.contributor));
    try {
        // step 1
        await signIn(page, 'dbarnes');
        if (mode === 'control') {
            fact('control French "Metadata" unticked', await H.untickMetadata(page, app, 'fr_CA'));
            await R.openPage(wf, page, c.id, 'Contributors');
            const dlg = await R.openContributorEdit(page, wf, c.contributor);
            fact('control form languages', await H.formLanguages(dlg));
            fact('control affiliations rows', await R.affiliationRows(dlg));
            await A.rowAction(page, dlg, c.institution, 'Edit institution name');
            fact('control name boxes', await H.nameBoxes(dlg));
            fact('control save', await A.pressSave(page, dlg));
            fact('control messages under fields', await H.fieldMessages(dlg).catch(() => []));
            fact('control stored affiliations', stored());
            record(`dropped-language-control${run}`, await screen(page));
            await shot(page, `dropped-language-control${run}`);
            if (await dlg.isVisible().catch(() => false)) await R.closeForm(page, dlg);
            return;
        }
        if (mode === 'ror') {
            // the same contributor with an institution picked from the registry, then French unticked
            await R.openPage(wf, page, c.id, 'Contributors');
            const dlg = await R.openContributorEdit(page, wf, c.contributor);
            const field = dlg.locator('.pkpFormField--affiliations');
            fact('ror pick', await R.pickRegistry(page, field, R.ORG.cachedAffiliation));
            const add = field.getByRole('button', {name: 'Add', exact: true});
            await add.waitFor({timeout: A.T});
            await add.click();
            await idle(page);
            fact('ror affiliations rows', await R.affiliationRows(dlg));
            fact('ror save', await R.saveContributor(page, dlg));
            fact('ror stored affiliations', stored());
            fact('ror French "Metadata" unticked', await H.untickMetadata(page, app, 'fr_CA'));
            await R.openPage(wf, page, c.id, 'Contributors');
            const again = await R.openContributorEdit(page, wf, c.contributor);
            fact('ror form languages after', await H.formLanguages(again));
            fact('ror affiliations rows after', await R.affiliationRows(again));
            fact('ror save after', await R.saveContributor(page, again));
            fact('ror stored affiliations after', stored());
            record(`dropped-language-ror${run}`, await screen(page));
            if (await again.isVisible().catch(() => false)) await R.closeForm(page, again);
            return;
        }
        // steps 2-3
        if (!(await R.openPage(wf, page, c.id, 'Contributors'))) {
            fact('3 Contributors page', 'absent');
            return;
        }
        // step 4
        const dlg = await R.openContributorEdit(page, wf, c.contributor);
        fact('4 form languages', await H.formLanguages(dlg));
        fact('4 affiliations rows', await R.affiliationRows(dlg));
        // step 5
        await A.rowAction(page, dlg, c.institution, 'Edit institution name');
        fact('5 name boxes', await H.nameBoxes(dlg));
        // step 6: the French box is the second
        const boxes = dlg.locator('.pkpFormField--affiliations tbody input.pkpFormField--text__input');
        await boxes.nth(1).fill('u41h13g nom');
        await boxes.nth(1).blur();
        fact('6 name boxes before Save', await H.nameBoxes(dlg));
        fact('6 save', await A.pressSave(page, dlg));
        await dlg.waitFor({state: 'hidden', timeout: 8000}).catch(() => {});
        fact('6 stored affiliations', stored());
        // step 7
        fact('7 French "Metadata" unticked', await H.untickMetadata(page, app, 'fr_CA'));
        record(`dropped-language-languages${run}`, await screen(page));
        await shot(page, `dropped-language-languages${run}`);
        // step 8
        await R.openPage(wf, page, c.id, 'Contributors');
        const again = await R.openContributorEdit(page, wf, c.contributor);
        fact('8 form languages', await H.formLanguages(again));
        fact('8 affiliations rows', await R.affiliationRows(again));
        await A.rowAction(page, again, c.institution, 'Edit institution name');
        fact('8 name boxes', await H.nameBoxes(again));
        // step 9
        fact('9 save', await A.pressSave(page, again));
        fact('9 error box at the foot', await A.errorBox(again));
        fact('9 Affiliations field', await A.fieldText(again, '.pkpFormField--affiliations'));
        fact('9 messages under fields', await H.fieldMessages(again).catch(() => []));
        fact('9 Save button disabled', await again.getByRole('button', {name: 'Save', exact: true}).isDisabled().catch(() => null));
        const snap = await screen(page);
        fact('9 page notices', snap.notices);
        record(`dropped-language${run}`, snap);
        await shot(page, `dropped-language${run}`);
        fact('9 stored affiliations', stored());
        if (mode !== 'way') return;
        // the way round (mode way): close the refused form, "Edit" again, "Remove institution" > "Yes", "Save"
        await R.closeForm(page, again);
        const third = await R.openContributorEdit(page, wf, c.contributor);
        await A.rowAction(page, third, c.institution, 'Remove institution');
        fact('way round: confirm', await H.confirmYes(page));
        fact('way round: affiliations rows', await R.affiliationRows(third));
        fact('way round: save', await A.pressSave(page, third));
        fact('way round: stored affiliations', stored());
        record(`dropped-language-way${run}`, await screen(page));
        if (await third.isVisible().catch(() => false)) await R.closeForm(page, third);
    } catch (e) {
        fact('error', A.flat(e.message, 500));
        await shot(page, `dropped-language-${mode}-error${run}`).catch(() => {});
    } finally {
        fact('page errors', errors);
        fact('server log', log.since(from));
        record(`dropped-language-facts${run}`, facts);
        await close();
    }
});
