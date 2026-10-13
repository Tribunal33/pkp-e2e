// Issue report docs/issues/U41-A24-refused-add-contributor-saved-twice.md (U41 A24): an "Add
// Contributor" refused for an institution's missing name still adds the contributor, without the
// institution, so the corrected "Save" lists the same person twice and "Close" keeps the refused one.
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default
// test dataset, as the dataset's editor `dbarnes` on `publicknowledge`, on the submission of the
// A7 walk's CASES (OJS 7, OMP 1, OPS 1). The kit builds nothing; the stored contributors are read
// from the database after each step (Evidence only).
//
// Modes (first argument):
//   steps (default)  the Steps: "Correcting and saving" (Lea), then "Leaving by Close" (Max).
//   nb               what a fix must leave alone (runs alone): a valid "Add Contributor" with a
//                    typed institution (Ned) saves once, with the institution; the existing
//                    contributor's "Edit" with the institution's English name cleared is refused
//                    and stores nothing.
//   language         how the trigger arises: the A7 walk's WIZARD author starts a submission in
//                    French with the interface in English; "Add Contributor" with a typed
//                    institution: which name box it fills, and whether "Save" takes it.
//   wizard           the Cause's reach on the submission wizard: the A7 walk's WIZARD author starts
//                    a submission, "Continue" to "Contributors", then Lea's add as in the Steps,
//                    refused, "Close", reload.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/refused-add-contributor-saved-twice/walk.js [steps|nb|wizard]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, the line's feature, PROBE_RUN=r35.
// Fix trial:    PROBE_RUN=fix (steps), nb-in / nb-out (nb), with fix.diff applied or not.
// Facts: .reports/<feature>/<id>/refused-add-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib');
const A7 = require('../affiliation-error-list-object-object/lib.js');
const R = require('../registry-pick-saves-nameless/lib.js');
const W = require('../wizard-refused-save-hangs-saving/lib.js');

const mode = process.argv[2] || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const facts = {app: app.name, line: app.line || 'main', mode, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1600)}`);
    };
    const {page, close} = await launch(app);
    const group = app.name === 'ops' ? 'Preprint' : 'Publication';
    const wf = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: group}});
    const c = A7.CASES[app.name];
    const errors = [];
    page.on('pageerror', (e) => errors.push(L.flat(e.message, 200)));
    page.on('response', (r) => r.status() >= 500 && errors.push(`${r.status()} ${r.request().method()} ${r.url()}`));

    /** Steps 4-8 for one person: the form, the typed institution, its English name cleared, "Save". Returns the open form. */
    const refusedAdd = async (who, label, sid = c.id) => {
        const dlg = await A7.openAddContributor(page, who);
        await A7.addTypedInstitution(page, dlg, L.INSTITUTION);
        fact(`${label} 6 affiliations rows`, await R.affiliationRows(dlg));
        await A7.rowAction(page, dlg, L.INSTITUTION, 'Edit institution name');
        await L.nameBoxes(dlg).first().waitFor({timeout: L.T});
        fact(`${label} 7 name boxes before`, await L.nameBoxes(dlg).evaluateAll((bs) => bs.map((b) => b.value)));
        await L.nameBoxes(dlg).first().fill('');
        await L.nameBoxes(dlg).first().blur();
        fact(`${label} 8 save`, await L.pressSave(page, dlg));
        const snap = await screen(page);
        fact(`${label} 8 notices`, snap.notices);
        fact(`${label} 8 Affiliations field`, await A7.fieldText(dlg, '.pkpFormField--affiliations'));
        fact(`${label} 8 foot`, (await A7.errorBox(dlg)).visibleText || null);
        fact(`${label} 8 list behind the panel`, await L.listRows(wf));
        fact(`${label} 8 stored (db)`, L.storedTagged(app, sid));
        record(`refused-add-${label}-8`, snap);
        await shot(page, `refused-add-${label}-8`);
        return dlg;
    };
    const reload = async (label) => {
        await R.openPage(wf, page, c.id, 'Contributors');
        fact(`${label} list after reload`, await L.listRows(wf));
        record(`refused-add-${label}-reload`, await screen(page));
    };

    try {
        if (mode === 'language') {
            // A submission in French started by the author, the interface in English: which name box the
            // typed institution fills, and whether "Save" takes it.
            const w = A7.WIZARD[app.name];
            await signIn(page, w.author);
            await page.goto(app.url(`/index.php/${app.contextPath}/en/submission`));
            await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: L.T});
            await W.typeRich(page, 'startSubmission-title-control', `${L.TAG} langue`);
            if (w.section) {
                const r = page.getByRole('radio', {name: w.section, exact: true});
                if (await r.count()) await r.check();
            }
            const fr = page.getByRole('radio', {name: /French|Français/});
            fact('language radios', await page.getByRole('radio').evaluateAll((rs) => rs.map((r) => r.labels?.[0]?.innerText?.trim() || r.value)));
            await fr.first().check();
            for (const name of [/meets all of these requirements/, /agree to have my data collected/]) {
                const b = page.getByRole('checkbox', {name});
                if (await b.count()) await b.check();
            }
            await page.getByRole('button', {name: 'Begin Submission'}).click();
            await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
            await page.locator('.pkpSteps__step__label--current').waitFor({timeout: L.T});
            await idle(page);
            const sid = Number(new URL(page.url()).searchParams.get('id'));
            fact('language submission (id, locale)', [sid, require('../../../probe').sql(app, `select locale from submissions where submission_id = ${sid}`)]);
            for (let i = 0; i < 6 && !/Contributors/.test(await W.currentStep(page)); i++) await W.pressContinue(page);
            fact('language step', await W.currentStep(page));
            const dlg = await A7.openAddContributor(page, L.PEOPLE.lea);
            await A7.addTypedInstitution(page, dlg, L.INSTITUTION);
            fact('language affiliations rows', await R.affiliationRows(dlg));
            await A7.rowAction(page, dlg, L.INSTITUTION, 'Edit institution name');
            await L.nameBoxes(dlg).first().waitFor({timeout: L.T});
            fact('language name boxes', await L.nameBoxes(dlg).evaluateAll((bs) => bs.map((b) => ({label: (b.labels?.[0]?.innerText || b.getAttribute('aria-label') || b.placeholder || b.name || '').trim(), value: b.value}))));
            fact('language save', await L.pressSave(page, dlg));
            fact('language stored (db)', L.storedTagged(app, sid));
            record('refused-add-language', await screen(page));
            if (await dlg.isVisible().catch(() => false)) await R.closeForm(page, dlg);
            return;
        }
        if (mode === 'wizard') {
            const w = A7.WIZARD[app.name];
            await signIn(page, w.author);
            const sid = await W.beginSubmission(page, app, {title: `${L.TAG} wizard`, section: w.section});
            fact('wizard started (submission id)', sid);
            for (let i = 0; i < 6 && !/Contributors/.test(await W.currentStep(page)); i++) await W.pressContinue(page);
            fact('wizard step', await W.currentStep(page));
            const dlg = await refusedAdd(L.PEOPLE.lea, 'wizard', Number(sid));
            await R.closeForm(page, dlg);
            fact('wizard list after Close', (await page.locator('li.listPanel__item').allInnerTexts()).map((t) => L.flat(t, 160)));
            await page.reload();
            await idle(page);
            await L.sleep(1500);
            fact('wizard list after reload', (await page.locator('li.listPanel__item').allInnerTexts()).map((t) => L.flat(t, 160)));
            record('refused-add-wizard-reload', await screen(page));
            return;
        }
        // step 1
        await signIn(page, 'dbarnes');
        // steps 2-3
        if (!(await R.openPage(wf, page, c.id, 'Contributors'))) {
            fact('3 Contributors page', 'absent');
            return;
        }
        fact('3 list', await L.listRows(wf));
        fact('3 stored count (db)', L.storedCount(app, c.id));

        if (mode === 'nb') {
            // a valid add with a typed institution
            const dlg = await A7.openAddContributor(page, L.PEOPLE.ned);
            await A7.addTypedInstitution(page, dlg, L.INSTITUTION);
            fact('nb add save', await L.pressSave(page, dlg));
            if (await dlg.isVisible().catch(() => false)) await R.closeForm(page, dlg);
            fact('nb add list', await L.listRows(wf));
            fact('nb add stored (db)', L.storedTagged(app, c.id));
            fact('nb add Edit shows', await L.editRowAffiliations(page, wf, 'Ned', 0).catch((e) => `error: ${L.flat(e.message, 200)}`));
            // the existing contributor's refused Edit
            const before = L.storedCount(app, c.id);
            const ed = await R.openContributorEdit(page, wf, c.contributor);
            await A7.rowAction(page, ed, c.institution, 'Edit institution name');
            await L.nameBoxes(ed).first().waitFor({timeout: L.T});
            await L.nameBoxes(ed).first().fill('');
            await L.nameBoxes(ed).first().blur();
            fact('nb edit save', await L.pressSave(page, ed));
            await R.closeForm(page, ed);
            fact('nb edit stored count before/after (db)', [before, L.storedCount(app, c.id)]);
            fact('nb edit stored affiliations (db)', R.storedAffiliations(app, R.authorId(app, c.id, c.contributor)));
            await reload('nb');
            return;
        }

        // Correcting and saving: steps 4-8
        const dlg = await refusedAdd(L.PEOPLE.lea, 'lea');
        // step 9
        await L.nameBoxes(dlg).first().fill(L.INSTITUTION);
        await L.nameBoxes(dlg).first().blur();
        fact('lea 9 save', await L.pressSave(page, dlg));
        if (await dlg.isVisible().catch(() => false)) await R.closeForm(page, dlg);
        fact('lea 9 list', await L.listRows(wf));
        fact('lea 9 stored (db)', L.storedTagged(app, c.id));
        record('refused-add-lea-9', await screen(page));
        await shot(page, 'refused-add-lea-9');
        // step 10
        await reload('lea 10');
        const n = await wf.dialog().locator('li.listPanel__item').filter({hasText: 'Lea'}).count();
        for (let i = 0; i < n; i++) fact(`lea 10 row ${i + 1} Edit affiliations`, await L.editRowAffiliations(page, wf, 'Lea', i));

        // Leaving by Close: step 11
        const dlg2 = await refusedAdd(L.PEOPLE.max, 'max');
        // step 12
        await R.closeForm(page, dlg2);
        fact('max 12 list after Close', await L.listRows(wf));
        await reload('max 12');
        fact('max 12 stored (db)', L.storedTagged(app, c.id));
        const m = await wf.dialog().locator('li.listPanel__item').filter({hasText: 'Max'}).count();
        for (let i = 0; i < m; i++) fact(`max 12 row ${i + 1} Edit affiliations`, await L.editRowAffiliations(page, wf, 'Max', i));
    } catch (e) {
        fact('error', L.flat(e.message, 500));
        await shot(page, `refused-add-${mode}-error`).catch(() => {});
    } finally {
        fact('5xx answers and page errors', errors);
        record(`refused-add-facts-${mode}`, facts);
        await close();
    }
});
