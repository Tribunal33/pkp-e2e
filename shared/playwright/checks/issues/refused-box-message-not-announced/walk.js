// Issue report docs/issues/U42-A24-refused-box-message-not-announced.md (U42 A24): when a form of
// the editorial screens refuses a save, the message under each refused box is not tied to the box,
// so a screen reader announces the box as invalid without the reason.
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default
// test dataset, as the dataset's editor `dbarnes` on `publicknowledge`: Settings > Journal (Press,
// Server) > "Contact", "Technical Support Contact" "Name" and "Email" cleared and saved; then (main,
// data citations ticked on screen first) submission 1 (OJS, OPS) or 4 (OMP) > "Data" > "Add Data
// Citation" with "Year" 20a4, "URL" example and a creator's bare ORCID iD, saved. After each refusal
// the cursor goes into each refused box and the box is read as Chromium's accessibility tree
// computes it (what a screen reader is given), with its aria-invalid and aria-describedby. Names
// tagged h19y. The kit builds nothing.
//
// Modes (first argument; each runs alone on a freshly reset dataset):
//   steps (default)  the Steps above (on a line without data citations, the Contact steps alone).
//   nb               what the fix must leave alone: the Masthead's multilingual title cleared and
//                    saved (the message tied to the English box only, its multilingual-progress
//                    token kept); "Contact" refused, then corrected and saved (no message id left);
//                    a valid data citation with a valid creator row and an empty one saved, the
//                    panel's boxes read before and after.
//
// Reset first:  npm run fleet-prep -- --feature issues-h19y --dataset 5 --reset
// Run (main):   PROBE_FEATURE=issues-h19y PROBE_AGENT=h19y node bin/probe.js <app|all> shared/playwright/checks/issues/refused-box-message-not-announced/walk.js [steps|nb]
// 3.5:          PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-h19y-3_5 PROBE_AGENT=h19y node bin/probe.js …
// Fix trial:    with fix.diff applied, PROBE_RUN=fix (steps), nb-in / nb-out (nb).
// Facts: .reports/<feature>/h19y/a24-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib.js');

const mode = process.argv[2] || 'steps';
const CONTEXT = {ojs: 'Journal', omp: 'Press', ops: 'Server'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {app: app.name, line: app.line || 'main', mode, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1600)}`);
    };
    const {page, close} = await launch(app);
    const part = async (key, fn) => {
        try {
            await fn();
        } catch (e) {
            fact(`${key} error`, L.flat(e.message, 500));
            await shot(page, `a24-${key}-error${run}`).catch(() => {});
        }
    };
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(L.flat(e.message, 300)));

    /** Contact tab: clear the support Name and Email, press Save; returns the form. */
    const refuseContact = async (key) => {
        const form = await L.openContextTab(page, app, 'contact');
        const name = form.locator('input[name="supportName"]');
        const email = form.locator('input[name="supportEmail"]');
        fact(`${key} before: support Name, Email`, [await name.inputValue(), await email.inputValue()]);
        await name.fill('');
        await email.fill('');
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        await form.locator('.pkpFieldError').first().waitFor({timeout: L.T});
        await L.sleep(500);
        record(`a24-${key}-contact-refused${run}`, await screen(page));
        fact(`${key} refused: support Name`, await L.boxFacts(page, name));
        fact(`${key} refused: support Email`, await L.boxFacts(page, email));
        fact(`${key} refused: the form's foot`, L.flat(await form.locator('.pkpFormErrors, .pkpFormPage__footer').first().innerText().catch(() => ''), 400));
        return {form, name, email};
    };

    try {
        await signIn(page, 'dbarnes');

        if (mode === 'steps') {
            await part('S1-4 contact', async () => {
                await refuseContact('S3');
            });

            await part('P data citations on', async () => fact('P Enable data citation metadata', await L.enableDataCitations(page, app)));
            await part('S5-7 data citation', async () => {
                const table = await L.openData(page, app);
                if (!table) return fact('S5 Data page', 'absent');
                await page.getByRole('button', {name: 'Add Data Citation', exact: true}).first().click();
                const panel = page.getByRole('dialog', {name: 'Add Data Citation', exact: true});
                await panel.waitFor({timeout: L.T});
                await panel.getByRole('textbox', {name: /^Title/}).fill('h19y Survey data');
                await panel.getByRole('combobox', {name: /^Relationship type/}).selectOption({label: L.SUPPORTING});
                const year = panel.getByRole('textbox', {name: 'Year', exact: true});
                const url = panel.getByRole('textbox', {name: 'URL', exact: true});
                await year.fill('20a4');
                await url.fill('example');
                const creators = panel.locator('.pkpFormField--authors');
                await creators.getByRole('button', {name: 'Add', exact: true}).click();
                const orcid = creators.locator('input[name="orcid"]').first();
                await orcid.fill('0000-0002-1825-0097');
                const saved = page.waitForResponse((r) => /\/dataCitations$/.test(r.url().split('?')[0]) && r.request().method() === 'POST', {timeout: L.T});
                await panel.getByRole('button', {name: 'Save', exact: true}).click();
                fact('S6 Save answered', (await saved).status());
                await panel.locator('.pkpFieldError').first().waitFor({timeout: L.T});
                await L.sleep(800);
                record(`a24-S6-add-data-citation-refused${run}`, await screen(page));
                await shot(page, `a24-S6-add-data-citation-refused${run}`);
                fact('S7 Year', await L.boxFacts(page, year));
                fact('S7 URL', await L.boxFacts(page, url));
                fact('S7 creator ORCID iD', await L.boxFacts(page, orcid));
                fact('S7 the panel foot', L.flat(await panel.locator('.pkpFormErrors').first().innerText().catch(() => ''), 500));
            });
        } else if (mode === 'nb') {
            await part('nb masthead', async () => {
                const form = await L.openContextTab(page, app, 'masthead');
                const en = form.locator('input[name="name-en"]');
                fact('nb a: title box before', await L.boxFacts(page, en));
                await en.fill('');
                await form.getByRole('button', {name: 'Save', exact: true}).click();
                await form.locator('.pkpFieldError').first().waitFor({timeout: L.T});
                await L.sleep(500);
                fact('nb a: title box (English) refused', await L.boxFacts(page, en));
                const initials = form.locator('input[name="acronym-en"]');
                fact('nb a: initials box (English), not refused', await L.boxFacts(page, initials));
            });
            await part('nb contact corrected', async () => {
                const {form, name, email} = await refuseContact('nb b');
                await name.fill('h19y Support');
                await email.fill('h19y-support@mailinator.com');
                await L.sleep(300);
                fact('nb b: after typing, Name', await L.boxFacts(page, name));
                const saved = page.waitForResponse((r) => /\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: L.T});
                await form.getByRole('button', {name: 'Save', exact: true}).click();
                fact('nb b: corrected Save answered', (await saved).status());
                await L.sleep(800);
                fact('nb b: saved, Name', await L.boxFacts(page, name));
                fact('nb b: saved, Email', await L.boxFacts(page, email));
            });
            await part('P data citations on', async () => fact('P Enable data citation metadata', await L.enableDataCitations(page, app)));
            await part('nb data citation', async () => {
                const table = await L.openData(page, app);
                if (!table) return fact('nb c Data page', 'absent');
                await page.getByRole('button', {name: 'Add Data Citation', exact: true}).first().click();
                const panel = page.getByRole('dialog', {name: 'Add Data Citation', exact: true});
                await panel.waitFor({timeout: L.T});
                await panel.getByRole('textbox', {name: /^Title/}).fill('h19y Valid data');
                await panel.getByRole('combobox', {name: /^Relationship type/}).selectOption({label: L.SUPPORTING});
                await panel.getByRole('textbox', {name: 'Year', exact: true}).fill('2024');
                const creators = panel.locator('.pkpFormField--authors');
                await creators.getByRole('button', {name: 'Add', exact: true}).click();
                await creators.getByRole('button', {name: 'Add', exact: true}).click();
                const rows = creators.locator('input[name="orcid"]');
                fact('nb c: creator rows drawn', await rows.count());
                await creators.locator('input[name="givenName"]').first().fill('Ada');
                await creators.locator('input[name="familyName"]').first().fill('h19y');
                await rows.first().fill('https://orcid.org/0000-0002-1825-0097');
                fact('nb c: row 2 ORCID iD box before save', await L.boxFacts(page, rows.nth(1)));
                const saved = page.waitForResponse((r) => /\/dataCitations$/.test(r.url().split('?')[0]) && r.request().method() === 'POST', {timeout: L.T});
                await panel.getByRole('button', {name: 'Save', exact: true}).click();
                fact('nb c: Save answered', (await saved).status());
                await panel.waitFor({state: 'detached', timeout: L.T}).catch(() => {});
                await L.sleep(800);
                fact('nb c: panel closed', !(await panel.isVisible().catch(() => false)));
                fact('nb c: rows', L.flat(await table.innerText().catch(() => ''), 400));
            });
        }
    } finally {
        fact('page errors', pageErrors);
        record(`a24-facts${run}`, facts);
        await close();
    }
});
