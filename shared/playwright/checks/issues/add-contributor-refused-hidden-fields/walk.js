// U41 A20: on a journal (press, server) with a language ticked under "Forms" but not under
// "Metadata", the workflow's "Add Contributor" › "Save" is refused for every contributor type,
// on fields the chosen type does not show.
// The Steps of docs/issues/U41-A20-add-contributor-refused-hidden-fields.md, on PKP's default test
// dataset, as `rvaca`. Spec: docs/specs/U41-contributors-and-affiliations.md, register A20.
//
// Run (reset the dataset fleet first):
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/issues/add-contributor-refused-hidden-fields/walk.js
// MODE=neighbour runs, alone, the path a fix must leave alone, on the unchanged dataset (French
// still under "Metadata"): "Add Contributor" › "Organization or group" saves, and the new row's
// "Edit" › "Person" saves with the organization name discarded (the type switch still clears the
// other type's data; the stored record is read from the database).
// MODE=wayround (run it on OJS: the code is shared) takes steps 1-3, then as the section editor
// `dbuskins` the type-switch way round (an Organization Name typed before switching back to
// "Person"; the three Person names typed before switching to "Organization or group"), an
// existing contributor's "Edit", an add on submission 4, and as the author `ccorino` an add in
// the submission wizard's "Contributors" step.
// Records the screens; asserts nothing.
const {forEachApp, launch, signIn, record, shot, screen, loc, sql} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    const sub = L.SUBMISSION[app.name];
    const {page, close} = await launch(app);
    const facts = {mode: MODE, line: app.line, submission: sub};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${app.name} ${MODE}] ${k}:`, JSON.stringify(v).slice(0, 1500));
    };
    const step = async (name, fn) => {
        try {
            return await fn();
        } catch (e) {
            await shot(page, `${name}-error`).catch(() => {});
            return {error: L.flat(e.message, 600)};
        }
    };
    const add = async (name, fields) => step(name, async () => {
        await page.getByRole('button', {name: 'Add Contributor'}).first().click();
        const dlg = L.panel(page, 'Add Contributor');
        await dlg.waitFor({timeout: L.T});
        const filled = await L.fill(dlg, fields);
        if (filled.noType) return {skipped: `no "Contributor Type" on this version: no "${fields.type}"`};
        const opened = await L.panelState(page, dlg);
        const saved = await L.pressSave(page, dlg);
        await shot(page, `${name}-after-save`);
        return {opened, ...saved};
    });
    try {
        await signIn(page, 'rvaca');
        if (MODE === 'walk') {
            fact('s3-untick-french-metadata', await step('s3', () => L.untickFrenchMetadata(page, app)));
            fact('s5-contributors', await step('s5', () => L.openContributors(page, app, sub.id)));
            await loc(page, 'Contributors: Add Contributor', page.getByRole('button', {name: 'Add Contributor'}));
            // Person: steps 6-9.
            fact('s7-person-save', await add('s7', {type: 'Person', given: 'Ada', family: 'u41i', email: 'u41i-person@mailinator.com', country: 'Canada', role: 'Author'}));
            fact('s8-type-into-shown-field', await step('s8', async () => {
                const dlg = L.panel(page, 'Add Contributor');
                if (!(await dlg.isVisible().catch(() => false))) return {open: false};
                await dlg.locator('input[name="givenName-en"]').fill('Adah');
                await dlg.locator('input[name="email"]').focus();
                await L.sleep(800);
                record('s8-panel', await screen(page));
                return L.panelState(page, dlg);
            }));
            fact('s9-close', await step('s9', () => L.closePanel(page, L.panel(page, 'Add Contributor'))));
            fact('s9-rows-after-reload', await step('s9r', () => L.openContributors(page, app, sub.id)));
            // Organization or group: steps 10-11.
            fact('s11-organization-save', await add('s11', {type: 'Organization or group', org: 'u41i Org', email: 'u41i-org@mailinator.com', country: 'Canada', role: 'Author'}));
            fact('s11-close', await step('s11c', () => L.closePanel(page, L.panel(page, 'Add Contributor'))));
            // Anonymous: steps 12-13.
            fact('s13-anonymous-save', await add('s13', {type: 'Anonymous', email: 'u41i-anon@mailinator.com', country: 'Canada', role: 'Author'}));
            fact('s13-close', await step('s13c', () => L.closePanel(page, L.panel(page, 'Add Contributor'))));
            fact('end-rows-after-reload', await step('end', () => L.openContributors(page, app, sub.id)));
            await shot(page, 'end-contributors');
        } else if (MODE === 'wayround') {
            // The ways round and the trigger's reach, on the journal of steps 1-3 (OJS is enough:
            // the code is shared). w2-w3 as the section editor `dbuskins` (assigned to submission 7).
            fact('w1-untick-french-metadata', await step('w1', () => L.untickFrenchMetadata(page, app)));
            await signIn(page, 'dbuskins');
            fact('w2-contributors', await step('w2', () => L.openContributors(page, app, sub.id)));
            // Person: type an Organization Name under "Organization or group" first, then switch back.
            fact('w2-person-via-organization', await step('w2p', async () => {
                await page.getByRole('button', {name: 'Add Contributor'}).first().click();
                const dlg = L.panel(page, 'Add Contributor');
                await dlg.waitFor({timeout: L.T});
                await L.fill(dlg, {type: 'Organization or group', org: 'u41i Org'});
                await L.fill(dlg, {type: 'Person', given: 'Ada', family: 'u41i', email: 'u41i-person@mailinator.com', country: 'Canada', role: 'Author'});
                return L.pressSave(page, dlg);
            }));
            // Organization: type the three Person names first, then switch.
            fact('w3-organization-via-person', await step('w3o', async () => {
                const dlg = L.panel(page, 'Add Contributor');
                if (await dlg.isVisible().catch(() => false)) await L.closePanel(page, dlg);
                await L.sleep(600);
                await page.getByRole('button', {name: 'Add Contributor'}).first().click();
                await dlg.waitFor({timeout: L.T});
                await L.fill(dlg, {type: 'Person', given: 'x', family: 'x'});
                await dlg.locator('input[name="preferredPublicName-en"]').fill('x');
                await L.fill(dlg, {type: 'Organization or group', org: 'u41i Org', email: 'u41i-org@mailinator.com', country: 'Canada', role: 'Author'});
                return L.pressSave(page, dlg);
            }));
            fact('w3-rows', await step('w3r', () => L.openContributors(page, app, sub.id)));
            fact('w3-stored', sql(app, `select a.email, s.setting_name, s.locale, coalesce(s.setting_value, '<null>') from authors a join author_settings s on s.author_id = a.author_id where a.email like 'u41i-%' order by 1, 2, 3`).split('\n').filter(Boolean));
            // Edit an existing contributor on the same journal.
            fact('w4-edit-existing', await step('w4', async () => {
                const row = page.locator('.listPanel--contributor li.listPanel__item').first();
                await row.getByRole('button', {name: 'Edit', exact: true}).click();
                const dlg = L.panel(page, 'Edit');
                await dlg.waitFor({timeout: L.T});
                await dlg.locator('input[name="preferredPublicName-en"]').fill('u41i preferred');
                const country = dlg.locator('select[name="country"]');
                if ((await country.count()) && !(await country.inputValue())) await country.selectOption({label: 'Canada'});
                return L.pressSave(page, dlg);
            }));
            // Submission 4: its author's French rows hold no value, so it is hit like submission 7.
            fact('w5-add-on-submission-with-french', await step('w5', async () => {
                await signIn(page, 'rvaca');
                await L.openContributors(page, app, 4);
                await page.getByRole('button', {name: 'Add Contributor'}).first().click();
                const dlg = L.panel(page, 'Add Contributor');
                await dlg.waitFor({timeout: L.T});
                await L.fill(dlg, {type: 'Person', given: 'Ada', family: 'u41i', email: 'u41i-person4@mailinator.com', country: 'Canada', role: 'Author'});
                return L.pressSave(page, dlg);
            }));
            // The submission wizard's Contributors step, as an author starting a new submission.
            fact('w6-wizard-add', await step('w6', async () => {
                const W = require('../wizard-refused-save-hangs-saving/lib.js');
                await signIn(page, 'ccorino');
                const id = await W.beginSubmission(page, app, {title: 'u41i wizard', section: 'Articles'});
                for (let i = 0; i < 4 && !/Contributors$/.test(await W.currentStep(page)); i++) {
                    await W.pressContinue(page);
                    await L.sleep(800);
                }
                const at = await W.currentStep(page);
                await page.getByRole('button', {name: 'Add Contributor'}).first().click();
                const dlg = L.panel(page, 'Add Contributor');
                await dlg.waitFor({timeout: L.T});
                await L.fill(dlg, {type: 'Person', given: 'Ada', family: 'u41i', email: 'u41i-wizard@mailinator.com', country: 'Canada', role: 'Author'});
                const saved = await L.pressSave(page, dlg);
                return {id, at, ...saved, rows: await L.rows(page)};
            }));
        } else if (MODE === 'neighbour') {
            fact('n1-contributors', await step('n1', () => L.openContributors(page, app, sub.id)));
            fact('n2-organization-save', await add('n2', {type: 'Organization or group', org: 'u41i Org', email: 'u41i-org@mailinator.com', country: 'Canada', role: 'Author'}));
            fact('n2-rows', await step('n2r', () => L.openContributors(page, app, sub.id)));
            fact('n3-edit-to-person', await step('n3', async () => {
                const row = page.locator('.listPanel--contributor li.listPanel__item').filter({hasText: 'u41i Org'}).first();
                await row.getByRole('button', {name: 'Edit', exact: true}).click();
                const dlg = L.panel(page, 'Edit');
                await dlg.waitFor({timeout: L.T});
                await L.fill(dlg, {type: 'Person', given: 'Ada', family: 'u41i'});
                return L.pressSave(page, dlg);
            }));
            fact('n3-rows', await step('n3r', () => L.openContributors(page, app, sub.id)));
            fact('n3-stored', sql(app, `select s.setting_name, s.locale, coalesce(s.setting_value, '<null>') from authors a join author_settings s on s.author_id = a.author_id where a.email = 'u41i-org@mailinator.com' and s.setting_name in ('givenName', 'familyName', 'organizationName', 'preferredPublicName') order by 1, 2`).split('\n').filter(Boolean));
        }
    } finally {
        record(`facts-${MODE}`, facts);
        await close();
    }
});
