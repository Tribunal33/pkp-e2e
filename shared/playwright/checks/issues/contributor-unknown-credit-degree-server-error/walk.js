// Issue report docs/issues/U41-A29-contributor-unknown-credit-degree-server-error.md (U41 A29): a contributor
// saved through the REST API with a CRediT degree other than LEAD, EQUAL or SUPPORTING (or none) fails with
// a server error after part of the change is written. Latent: the form offers no other degree.
//
// On a dataset fleet freshly reset to PKP's default test dataset, as `dbarnes` on `publicknowledge`, the
// submission and contributor of ../credit-role-rows-labels-first-row/lib.js CASES (OJS 7 Domatilia Sokoloff,
// OMP 1 Arthur Clark, OPS 1 Carlo Corino):
//   steps (default)
//     S1-S4 screens: "Contributors", "Edit", the "Degree" options of a new CRediT row; Conceptualization
//           "Lead" and Data curation with no degree; "Save" (the start state, and the form's own save).
//     S5    code check (seam.php: the API handler's validate(), then edit() when it passes): given name
//           "<given> hkk4", creditRoles Conceptualization EQUAL + Software "lead".
//     S6    code check, the same gap on contributorType: "person" with given name "<given> hkk4t".
//     S7    screens: "Edit" again, what the form shows now.
//   neighbour (runs alone; what a fix must leave alone): S1-S4 with the given name changed to
//           "<given> hkk4n" in the same "Save"; then the code check with valid values (given name
//           "<given> hkk4c", Conceptualization SUPPORTING, Data curation null, contributorType PERSON).
//   http    (one app is enough) S1-S4, then the REST API as a developer would call it: `api_key_secret`
//           set in the fleet's config, dbarnes's Profile › "API Key" › "Create API Key", GET the contributor,
//           PUT it back with given name "<given> hkk4" and Conceptualization EQUAL + Software "lead" (H4),
//           "Edit" on screen, the program's corrected resend with "LEAD" (H5), and the neighbouring gap: a
//           PUT that leaves out contributorType and affiliations (H6).
// steps/neighbour build no HTTP request: the code check calls the PHP methods the API handler calls. The
// kit builds nothing. On a line without CRediT roles (stable-3_5_0) it records the form's fields and stops.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_FEATURE=<feature> PROBE_AGENT=k4 node bin/probe.js <app|all> shared/playwright/checks/issues/contributor-unknown-credit-degree-server-error/walk.js [steps|neighbour]
// Fix trial:    PROBE_RUN=fix (steps), nb-in / nb-out (neighbour), with fix.diff applied or not.
const {forEachApp, launch, signIn, screen, shot, record, idle, sql, serverLog} = require('../../../probe');
const L = require('../credit-role-rows-labels-first-row/lib.js');
const K = require('./lib.js');

const mode = process.argv[2] || 'steps';
const GIVEN = {ojs: 'Domatilia', omp: 'Arthur', ops: 'Carlo'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {app: app.name, line: app.line || 'main', mode, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1600)}`);
    };
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    const part = async (key, fn) => {
        try {
            await fn();
        } catch (e) {
            fact(`${key} error`, L.flat(e.message, 500));
            await shot(page, `a29-${key}-error${run}`).catch(() => {});
        }
    };
    const wf = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: app.name === 'ops' ? 'Preprint' : 'Publication'}});
    const c = L.CASES[app.name];
    const given = GIVEN[app.name];
    const id = K.authorId(app, c.id, given);
    fact('contributor', {submission: c.id, name: c.contributor, authorId: id});
    fact('stored at start', K.stored(app, id));

    /** S2-S4: "Contributors", "Edit", two CRediT rows, optionally a new given name, "Save". */
    const formSave = async (key, newGiven) => {
        if (!(await L.openPage(wf, page, c.id, 'Contributors'))) return fact(`${key} Contributors page`, 'absent');
        const item = wf.dialog().locator('li.listPanel__item').filter({hasText: c.contributor}).first();
        await item.waitFor({timeout: L.T});
        await item.getByRole('button', {name: /^Edit/}).first().click();
        const dlg = page.getByRole('dialog', {name: 'Edit', exact: true});
        await dlg.waitFor({timeout: L.T});
        await idle(page);
        const f = L.creditField(dlg);
        if (!(await f.count())) {
            fact(`${key} CRediT field`, 'absent');
            fact(`${key} form labels`, L.flat(await dlg.locator('.pkpFormField label, legend').allInnerTexts().then((a) => a.join(' | ')), 1200));
            await shot(page, `a29-${key}-form${run}`);
            await dlg.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
            return;
        }
        await f.scrollIntoViewIfNeeded().catch(() => {});
        const add = f.getByRole('button', {name: 'Add Another Role', exact: true});
        await add.click();
        await L.sleep(500);
        const rows = L.creditRows(dlg);
        fact(`${key} new row`, await L.rowValues(dlg));
        fact(`${key} "Degree" options`, await K.optionTexts(rows.nth(0).locator('select').nth(1)));
        await L.pick(rows.nth(0).locator('select').nth(1), 'Lead');
        await add.click();
        await L.sleep(500);
        await L.pick(rows.nth(1).locator('select').nth(0), 'Data Curation');
        if (newGiven) await dlg.locator('input[name="givenName-en"]').fill(newGiven);
        fact(`${key} rows before Save`, await L.rowValues(dlg));
        record(`a29-${key}-before-save${run}`, await screen(page));
        const answer = page
            .waitForResponse((r) => /\/contributors\/\d+/.test(r.url()) && r.request().method() === 'POST', {timeout: L.T})
            .catch(() => null);
        await dlg.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await answer;
        fact(`${key} save`, {status: r ? r.status() : null, body: r ? L.flat(await r.text().catch(() => ''), 300) : null});
        await dlg.waitFor({state: 'hidden', timeout: L.T}).catch(() => {});
        await idle(page);
        await L.sleep(800);
        fact(`${key} stored`, K.stored(app, id));
        record(`a29-${key}-list${run}`, await screen(page));
    };

    /** A code check: seam.php, then the stored state. */
    const check = (key, params) => {
        fact(`${key} params`, params);
        fact(`${key} result`, K.seam(app, id, params));
        fact(`${key} stored`, K.stored(app, id));
    };

    try {
        await signIn(page, 'dbarnes');
        if (mode === 'steps') {
            await part('S2-S4', () => formSave('S4'));
            if (facts['S4 CRediT field'] === 'absent') return;
            await part('S5', async () =>
                check('S5', {
                    givenName: {en: `${given} hkk4`},
                    creditRoles: [
                        {role: K.role('conceptualization'), degree: 'EQUAL'},
                        {role: K.role('software'), degree: 'lead'},
                    ],
                }),
            );
            await part('S6', async () => check('S6', {givenName: {en: `${given} hkk4t`}, contributorType: 'person'}));
            await part('S7', async () => {
                await L.openPage(wf, page, c.id, 'Contributors');
                record(`a29-S7-list${run}`, await screen(page));
                const dlg = await L.openContributorEdit(page, wf, c.contributor);
                fact('S7 rows in "Edit"', await L.rowValues(dlg));
                fact('S7 given name in "Edit"', await dlg.locator('input[name="givenName-en"]').inputValue());
                record(`a29-S7-edit${run}`, await screen(page));
                await shot(page, `a29-S7-edit${run}`);
                await dlg.getByRole('button', {name: 'Close', exact: true}).first().click();
                await L.sleep(800);
            });
        } else if (mode === 'http') {
            const pub = sql(app, `select publication_id from authors where author_id = ${id}`);
            const api = app.url(`/index.php/${app.contextPath}/api/v1/submissions/${c.id}/publications/${pub}/contributors/${id}`);
            fact('H0 api_key_secret', K.setApiKeySecret(app));
            let token = null;
            await part('H1', async () => {
                const {ProfilePage} = require('../../../pages/ProfilePage.js');
                const prof = new ProfilePage(page, app.contextPath);
                await prof.goto('apiKey');
                if (!(await prof.apiKeyBox().inputValue().catch(() => '')).includes('.')) await prof.createApiKey();
                token = await prof.apiKeyBox().inputValue();
                fact('H1 API key', token ? `${token.length} characters` : null);
                await shot(page, `a29-H1-apikey${run}`);
            });
            await part('H2', () => formSave('H2'));
            fact('H2 affiliations', K.storedAffiliations(app, id));
            if (!token) return;
            const roles = (deg2) => [
                {role: K.role('conceptualization'), degree: 'EQUAL'},
                {role: K.role('software'), degree: deg2},
            ];
            const after = (key) => fact(`${key} stored`, {...K.stored(app, id), ...K.storedPerson(app, id), affiliations: K.storedAffiliations(app, id)});
            const answer = (r) => ({status: r.status, body: r.json ? L.flat(JSON.stringify(r.json), 500) : r.text});
            let original = null;
            await part('H3', async () => {
                const got = K.curl('GET', api, token);
                original = got.json;
                fact('H3 GET', {
                    status: got.status,
                    contributorType: original && original.contributorType,
                    givenName: original && original.givenName,
                    creditRoles: original && original.creditRoles,
                    affiliations: original && (original.affiliations || []).map((a) => (a.name && a.name.en) || a.ror),
                });
            });
            if (!original) return;
            // The record as read, sent back the way the edit takes it: contributorRoles as their ids (the
            // GET lists objects, which the PUT answers 500), and no null fields (orcidVerificationRequested
            // null is refused "This field must be true or false.").
            const ids = (original.contributorRoles || []).map((r) => r.id);
            original = Object.fromEntries(Object.entries(original).filter(([, v]) => v !== null));
            fact('H3 body keys sent back', Object.keys(original));
            await part('H4', async () => {
                // GET lists contributorRoles as objects; the PUT takes their ids (as the form sends them)
                const body = {...original, contributorRoles: ids, givenName: {...original.givenName, en: `${given} hkk4`}, creditRoles: roles('lead')};
                fact('H4 PUT body (changed keys)', {givenName: body.givenName, contributorType: body.contributorType, contributorRoles: body.contributorRoles, affiliations: body.affiliations, creditRoles: body.creditRoles});
                fact('H4 PUT', answer(K.curl('PUT', api, token, body)));
                after('H4');
            });
            await part('H4b', async () => {
                await L.openPage(wf, page, c.id, 'Contributors');
                record(`a29-H4b-list${run}`, await screen(page));
                const dlg = await L.openContributorEdit(page, wf, c.contributor);
                fact('H4b rows in "Edit"', await L.rowValues(dlg));
                fact('H4b given name in "Edit"', await dlg.locator('input[name="givenName-en"]').inputValue());
                record(`a29-H4b-edit${run}`, await screen(page));
                await shot(page, `a29-H4b-edit${run}`);
                await dlg.getByRole('button', {name: 'Close', exact: true}).first().click();
                await L.sleep(800);
            });
            await part('H5', async () => {
                // the program corrects the degree and resends its own body (the record as it read it first)
                const body = {...original, contributorRoles: ids, givenName: {...original.givenName, en: `${given} hkk4`}, creditRoles: roles('LEAD')};
                fact('H5 PUT', answer(K.curl('PUT', api, token, body)));
                after('H5');
            });
            await part('H6', async () => {
                // the neighbouring gap: a valid body that leaves out contributorType and affiliations
                const body = {givenName: {en: `${given} hkk4x`}, creditRoles: [{role: K.role('conceptualization'), degree: 'LEAD'}]};
                fact('H6 PUT body', body);
                fact('H6 PUT', answer(K.curl('PUT', api, token, body)));
                after('H6');
            });
        } else if (mode === 'neighbour') {
            await part('N1', () => formSave('N1', `${given} hkk4n`));
            if (facts['N1 CRediT field'] === 'absent') return;
            await part('N2', async () =>
                check('N2', {
                    givenName: {en: `${given} hkk4c`},
                    contributorType: 'PERSON',
                    creditRoles: [
                        {role: K.role('conceptualization'), degree: 'SUPPORTING'},
                        {role: K.role('data-curation'), degree: null},
                    ],
                }),
            );
        }
    } finally {
        fact('server log', log.since(from).slice(-12).map((l) => L.flat(l, 300)));
        record(`a29-facts${run}`, facts);
        await close();
    }
});
