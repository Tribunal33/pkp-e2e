// Issue report docs/issues/U42-A13-citation-author-row-kept-after-close.md (U42 A13): in "Edit
// citation" with metadata lookup on, an author row added and abandoned with "Close" comes back
// blank on the next "Edit", is saved with the next "Save", and makes the reference structured.
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default
// test dataset, as the dataset's editor `dbarnes` on `publicknowledge`, on the submission of
// lib.js SUBMISSION. Names tagged u42r4. The kit builds nothing. Database reads are reads only.
//
// Modes (first argument; each runs alone on a freshly reset dataset):
//   steps (default)  the Steps (and the request body of the step-8 save).
//   reach            the same cause elsewhere: R1 an author row deleted and abandoned with "Close"
//                    (the author is gone on the next "Edit" and from the next save); R2 the data
//                    citation panel's "Creators" (a row added and abandoned with "Close").
//   funding          the same two lines in the Funding page's grant rows: a grant deleted and abandoned
//                    with "Close" (F1-F4), a grant row added and abandoned (F5-F6).
//   nbf              what a fix must leave alone there: a funder saved with two grants, one deleted and saved.
//   nb               what a fix must leave alone: authors added and deleted, then saved, are stored
//                    as saved (two named authors, then one deleted); a data citation added with a
//                    named creator keeps it.
//
// Reset first:  npm run fleet-prep -- --feature issues-u42r4 --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u42r4 PROBE_AGENT=u42r4 node bin/probe.js <app|all> shared/playwright/checks/issues/citation-author-row-kept-after-close/walk.js [steps|reach|funding|nb|nbf]
// Fix trial:    PROBE_RUN=fix (steps), nb-in / nb-out (nb), with fix.diff applied or not.
// Facts: .reports/issues-u42r4/u42r4/a13-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib');

const mode = process.argv[2] || 'steps';
const RAW = 'Lovelace A. u42r4 Notes on the analytical engine. 1843.';
const NEEDLE = 'u42r4';
const TITLE = 'u42r4 Notes on the analytical engine';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main', mode, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1200)}`);
    };
    const {page, close} = await launch(app);
    const writes = L.watchWrites(page);
    /** One part; a throw is recorded, never fatal (a fix changes the screen). */
    const part = async (key, fn) => {
        try {
            await fn();
        } catch (e) {
            fact(`${key} error`, L.flat(e.message, 500));
            await shot(page, `a13-${key}-error`).catch(() => {});
        }
    };

    try {
        await signIn(page, 'dbarnes');

        if (mode === 'steps') {
            await part('pre', async () => fact('pre lookup on', await L.tickMetadata(page, app, ['lookup'])));
            let refs;
            await part('s', async () => {
                ({pg: refs} = await L.openPublicationPage(page, app, 'References'));
                // 4. a reference
                await refs.add(RAW);
                fact('s4 row', await L.referenceRow(page, refs, NEEDLE));
                // 5. a DOI and a title
                let panel = await refs.edit(NEEDLE);
                await panel.field('DOI').fill('10.1234/u42r4');
                await panel.field('Title').fill(TITLE);
                await panel.save();
                await L.afterClose(page);
                fact('s5 row after DOI and title', await L.referenceRow(page, refs, NEEDLE));
                // 6. Add an author row, type a given name, Close
                panel = await refs.edit(NEEDLE);
                fact('s6 author rows on open', await L.authorRows(panel.authorsField()));
                await panel.addAuthor({givenName: 'Ada'});
                fact('s6 author rows before Close', await L.authorRows(panel.authorsField()));
                await panel.close();
                await L.afterClose(page);
                // 7. Edit again
                panel = await refs.edit(NEEDLE);
                fact('s7 author rows on reopen', await L.authorRows(panel.authorsField()));
                record(`a13-s7`, await screen(page));
                await shot(page, `a13-s7`);
                // 8. Volume, Save
                const from = writes.length;
                await panel.field('Volume').fill('12');
                await panel.save();
                await L.afterClose(page);
                fact('s8 save request (authors sent)', writes.slice(from));
                fact('s8 stored', L.storedCitation(app, NEEDLE));
                // 9. reload, References, the row and its menu, Edit
                await page.reload();
                await idle(page);
                ({pg: refs} = await L.openPublicationPage(page, app, 'References'));
                fact('s9 row after reload', await L.referenceRow(page, refs, NEEDLE));
                record(`a13-s9`, await screen(page));
                await shot(page, `a13-s9`);
                panel = await refs.edit(NEEDLE);
                fact('s9 author rows on Edit', await L.authorRows(panel.authorsField()));
                await panel.close();
            });
        } else if (mode === 'reach') {
            await part('pre', async () => fact('pre lookup and data citations on', await L.tickMetadata(page, app, ['lookup', 'dataCitations'])));
            // R1: a named author deleted, then Close (a DOI and an author, no title: never structured, so the page never refreshes itself)
            await part('R1', async () => {
                const {pg: refs} = await L.openPublicationPage(page, app, 'References');
                await refs.add(RAW);
                let panel = await refs.edit(NEEDLE);
                await panel.field('DOI').fill('10.1234/u42r4');
                await panel.addAuthor({givenName: 'Ada', familyName: 'Lovelace'});
                await panel.save();
                await L.afterClose(page);
                fact('R1 stored with the author', L.storedCitation(app, NEEDLE));
                panel = await refs.edit(NEEDLE);
                fact('R1 author rows on open', await L.authorRows(panel.authorsField()));
                await panel.authorsField().locator('tbody tr').first().getByRole('button', {name: 'Delete', exact: true}).click();
                await L.sleep(300);
                fact('R1 author rows after Delete', await L.authorRows(panel.authorsField()));
                await panel.close();
                await L.afterClose(page);
                panel = await refs.edit(NEEDLE);
                fact('R1 author rows on reopen', await L.authorRows(panel.authorsField()));
                const from = writes.length;
                await panel.field('Volume').fill('7');
                await panel.save();
                await L.afterClose(page);
                fact('R1 save request (authors sent)', writes.slice(from));
                fact('R1 stored after the save', L.storedCitation(app, NEEDLE));
            });
            // R2: the data citation panel's Creators
            await part('R2', async () => {
                const {pg: data} = await L.openPublicationPage(page, app, 'Data');
                await data.add({title: 'u42r4 Dataset', relationshipType: 'supporting'});
                await L.afterClose(page);
                let panel = await data.edit('u42r4 Dataset');
                fact('R2 creator rows on open', await L.authorRows(panel.creatorsField()));
                await panel.addCreator({givenName: 'Ada'});
                await panel.close();
                await L.afterClose(page);
                panel = await data.edit('u42r4 Dataset');
                fact('R2 creator rows on reopen', await L.authorRows(panel.creatorsField()));
                record(`a13-R2`, await screen(page));
                await shot(page, `a13-R2`);
                const from = writes.length;
                await panel.repositoryBox().fill('u42r4 repo');
                await panel.save();
                await L.afterClose(page);
                fact('R2 save request (authors sent)', writes.slice(from));
                fact('R2 stored', L.storedDataCitation(app, 'u42r4 Dataset'));
            });
        } else if (mode === 'nb') {
            await part('pre', async () => fact('pre lookup and data citations on', await L.tickMetadata(page, app, ['lookup', 'dataCitations'])));
            await part('nb1', async () => {
                const {pg: refs} = await L.openPublicationPage(page, app, 'References');
                await refs.add(RAW);
                let panel = await refs.edit(NEEDLE);
                await panel.addAuthor({givenName: 'Ada', familyName: 'Lovelace'});
                await panel.addAuthor({givenName: 'Charles', familyName: 'Babbage'});
                fact('nb1 author rows before Save', await L.authorRows(panel.authorsField()));
                await panel.save();
                await L.afterClose(page);
                fact('nb1 stored two authors', L.storedCitation(app, NEEDLE));
                panel = await refs.edit(NEEDLE);
                fact('nb1 author rows on reopen', await L.authorRows(panel.authorsField()));
                await panel.authorsField().locator('tbody tr').nth(1).getByRole('button', {name: 'Delete', exact: true}).click();
                await L.sleep(300);
                fact('nb1 author rows after Delete', await L.authorRows(panel.authorsField()));
                await panel.save();
                await L.afterClose(page);
                fact('nb1 stored after Delete and Save', L.storedCitation(app, NEEDLE));
                panel = await refs.edit(NEEDLE);
                fact('nb1 author rows on reopen after Delete', await L.authorRows(panel.authorsField()));
                await panel.close();
            });
            await part('nb2', async () => {
                const {pg: data} = await L.openPublicationPage(page, app, 'Data');
                const panel = await data.openAdd();
                await panel.fill({title: 'u42r4 Dataset', relationshipType: 'supporting'});
                await panel.addCreator({givenName: 'Ada', familyName: 'Lovelace'});
                await panel.save();
                await L.afterClose(page);
                fact('nb2 stored creator', L.storedDataCitation(app, 'u42r4 Dataset'));
                const again = await data.edit('u42r4 Dataset');
                fact('nb2 creator rows on Edit', await L.authorRows(again.creatorsField()));
                await again.close();
            });
        } else if (mode === 'funding' || mode === 'nbf') {
            // The Funding page's grant rows (FieldFunderGrants, the same two lines). The registry search
            // answers no match, so the typed name is the choice offered, as for a funder the registry lacks.
            await page.route('https://api.ror.org/**', (r) =>
                r.fulfill({status: 200, contentType: 'application/json', headers: {'Access-Control-Allow-Origin': '*'}, body: '{"items":[]}'})
            );
            await part(mode, async () => {
                const wf = await L.openFunding(page, app);
                if (mode === 'funding') {
                    // F1 a funder with one grant; F2 Edit, Delete the grant, Close; F3 Edit again; F4 Save
                    fact('F1 add funder save', await L.addFunder(page, wf, 'u42r4 Funder', ['u42r4-1']));
                    fact('F1 stored', L.storedGrants(app));
                    let panel = await L.editFunder(page, wf, 'u42r4 Funder');
                    fact('F2 grant rows on open', await L.grantRows(panel));
                    await panel.locator('.pkpFormField--funder-grants tbody tr').first().getByRole('button', {name: 'Delete', exact: true}).click();
                    await L.sleep(300);
                    fact('F2 grant rows after Delete', await L.grantRows(panel));
                    await panel.getByRole('button', {name: 'Close', exact: true}).first().click();
                    await L.afterClose(page);
                    panel = await L.editFunder(page, wf, 'u42r4 Funder');
                    fact('F3 grant rows on reopen', await L.grantRows(panel));
                    await shot(page, 'a13-F3');
                    const saved = page.waitForResponse((r) => /\/funders\/\d+$/.test(r.url().split('?')[0]) && r.request().method() === 'POST', {timeout: L.T});
                    await panel.getByRole('button', {name: 'Save', exact: true}).click();
                    fact('F4 save', (await saved).status());
                    await L.afterClose(page);
                    fact('F4 stored', L.storedGrants(app));
                    // F5 Edit, Add a grant row, type a number, Close; F6 Edit again
                    panel = await L.editFunder(page, wf, 'u42r4 Funder');
                    await panel.locator('.pkpFormField--funder-grants').getByRole('button', {name: 'Add', exact: true}).click();
                    await panel.locator('.pkpFormField--funder-grants tbody tr:has(input[name="grantNumber"])').last().locator('input[name="grantNumber"]').fill('u42r4-2');
                    fact('F5 grant rows before Close', await L.grantRows(panel));
                    await panel.getByRole('button', {name: 'Close', exact: true}).first().click();
                    await L.afterClose(page);
                    panel = await L.editFunder(page, wf, 'u42r4 Funder');
                    fact('F6 grant rows on reopen', await L.grantRows(panel));
                    await panel.getByRole('button', {name: 'Close', exact: true}).first().click();
                } else {
                    // a funder with two grants saved; Edit, Delete the second, Save
                    fact('nbf add funder save', await L.addFunder(page, wf, 'u42r4 Funder', ['u42r4-1', 'u42r4-2']));
                    fact('nbf stored two grants', L.storedGrants(app));
                    const panel = await L.editFunder(page, wf, 'u42r4 Funder');
                    fact('nbf grant rows on open', await L.grantRows(panel));
                    await panel.locator('.pkpFormField--funder-grants tbody tr').nth(1).getByRole('button', {name: 'Delete', exact: true}).click();
                    await L.sleep(300);
                    const saved = page.waitForResponse((r) => /\/funders\/\d+$/.test(r.url().split('?')[0]) && r.request().method() === 'POST', {timeout: L.T});
                    await panel.getByRole('button', {name: 'Save', exact: true}).click();
                    fact('nbf save', (await saved).status());
                    await L.afterClose(page);
                    fact('nbf stored after Delete and Save', L.storedGrants(app));
                }
            });
        } else {
            throw new Error(`unknown mode ${mode}`);
        }
    } finally {
        record(`a13-facts`, facts);
        await close();
    }
});
