// Issue report docs/issues/U41-A7-affiliation-error-list-object-object.md (U41 A7): when a
// contributor's affiliation is refused, the form's error list (the one a screen reader reads)
// says "Go to Affiliations: [object Object]" instead of the message.
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default
// test dataset, as the dataset's editor `dbarnes` on `publicknowledge`: on the submission of
// lib.js CASES, the contributor's "Edit", the typed affiliation's "Edit institution name", the
// English name cleared, "Save". The save is refused, so nothing is stored. The kit builds nothing.
//
// Modes (first argument):
//   steps (default)  the Steps.
//   goto             the Steps, then a press on the list's "Go to Affiliations": where focus and
//                    the scroll are afterwards.
//   nb               what a fix must leave alone (runs alone): on the same form, the English
//                    "Given Name" cleared and "Country" emptied, "Save": the list's entries for a
//                    per-language field and a plain field.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/affiliation-error-list-object-object/walk.js [steps|goto|nb]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, the line's feature, PROBE_RUN=r35.
// Fix trial:    PROBE_RUN=fix (steps), nb-in / nb-out (nb), with fix.diff applied or not.
// Facts: .reports/<feature>/<id>/affiliation-error-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib');
const R = require('../registry-pick-saves-nameless/lib.js');

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
        // steps 2-3
        if (!(await R.openPage(wf, page, c.id, 'Contributors'))) {
            fact('3 Contributors page', 'absent');
            return;
        }
        // step 4
        const dlg = await R.openContributorEdit(page, wf, c.contributor);
        fact('4 affiliations rows', await R.affiliationRows(dlg));

        if (mode === 'steps' || mode === 'goto') {
            // step 5
            await L.rowAction(page, dlg, c.institution, 'Edit institution name');
            const boxes = dlg.locator('.pkpFormField--affiliations tbody input.pkpFormField--text__input');
            await boxes.first().waitFor({timeout: L.T});
            fact('5 name boxes (values)', await boxes.evaluateAll((bs) => bs.map((b) => b.value)));
            // step 6: the English box is the first (the submission's language)
            await boxes.first().fill('');
            await boxes.first().blur();
            // step 7
            fact('7 save', await L.pressSave(page, dlg));
            fact('7 error box at the foot', await L.errorBox(dlg));
            fact('7 Affiliations field', await L.fieldText(dlg, '.pkpFormField--affiliations'));
            record(`affiliation-error${run}`, await screen(page));
            await shot(page, `affiliation-error${run}`);
            if (mode === 'goto') {
                // a screen reader's press on the list's button (it is clipped off screen, so a DOM click)
                const before = await L.focusFacts(page, dlg);
                await dlg.locator('.pkpFormErrors ul button').first().evaluate((b) => b.click());
                await L.sleep(1200);
                fact('goto before the press', before);
                fact('goto after "Go to Affiliations"', await L.focusFacts(page, dlg));
            }
            fact('stored affiliations after (a read)', R.storedAffiliations(app, R.authorId(app, c.id, c.contributor)));
        } else if (mode === 'nb') {
            const given = dlg.locator('input[name^="givenName"]').first();
            fact('nb given name box', {name: await given.getAttribute('name'), value: await given.inputValue()});
            await given.fill('');
            await given.blur();
            const country = dlg.locator('select[name="country"]').first();
            if (await country.count()) {
                await country.selectOption('').catch((e) => fact('nb country empty option', L.flat(e.message, 200)));
            } else fact('nb country select', 'absent');
            fact('nb save', await L.pressSave(page, dlg));
            fact('nb error box at the foot', await L.errorBox(dlg));
            record(`affiliation-error-nb${run}`, await screen(page));
            await shot(page, `affiliation-error-nb${run}`);
        }
        await R.closeForm(page, dlg);
    } catch (e) {
        fact('error', L.flat(e.message, 500));
        await shot(page, `affiliation-error-${mode}-error${run}`).catch(() => {});
    } finally {
        record(`affiliation-error-facts${run}`, facts);
        await close();
    }
});
