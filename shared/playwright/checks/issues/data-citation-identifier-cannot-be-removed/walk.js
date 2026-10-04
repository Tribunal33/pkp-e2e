// Issue report docs/issues/U42-A15-data-citation-identifier-cannot-be-removed.md (U42 A15): on
// "Edit Data Citation", a saved identifier cannot be removed: "Identifier type" offers no empty
// entry, and clearing "Identifier" alone is refused with "This field is required when identifier
// type is present.".
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default
// test dataset, as the dataset's editor `dbarnes` on `publicknowledge`: ticks "Enable data citation
// metadata" (Settings > Workflow > Submission > Metadata), then on submission 1 (OJS, OPS) or 4
// (OMP) adds "u42r6 Dataset with DOI" (DOI "10.1234/u42r6", Repository "u42r6 Repository"), opens
// "Edit", reads "Identifier type"'s options, picks the empty entry when there is one, clears
// "Identifier" and saves; then reopens "Edit" to read what is stored, and clears "Repository" and
// saves (a cleared optional box: is it gone on the next "Edit"?). The kit builds nothing.
//
// Modes (first argument):
//   steps (default)  the Steps above.
//   nb               what the fix must leave alone, run alone on a fresh reset: a type with its
//                    identifier cleared is still refused; an identifier with the type set to the
//                    empty entry is refused; changing the identifier still saves; a data citation
//                    added without an identifier still saves, and an edit keeps the fields it leaves
//                    alone; then "Year" and "URL" cleared and saved, read on the next "Edit".
//
// Reset first:  npm run fleet-prep -- --feature issues-u42r6 --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-u42r6 PROBE_AGENT=u42r6 node bin/probe.js all shared/playwright/checks/issues/data-citation-identifier-cannot-be-removed/walk.js [steps|nb]
// Fix trial:    with fix.diff applied, PROBE_RUN=fix (steps), nb-in / nb-out (nb).
// Facts: .reports/<feature>/u42r6/a15-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, record, sql} = require('../../../probe');
const L = require('../data-citation-added-after-order-goes-first/lib.js');

const mode = process.argv[2] || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {app: app.name, line: app.line || 'main', mode, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1600)}`);
    };
    const part = async (name, fn) => {
        try {
            await fn();
        } catch (e) {
            fact(`${name} error`, L.flat(e.message, 400));
        }
    };
    const sid = L.SUBMISSION[app.name];
    /** Evidence only: the stored settings of the submission's data citations. */
    const stored = () =>
        sql(
            app,
            `select d.data_citation_id, s.setting_name, s.setting_value from data_citations d
             join publications p on p.publication_id = d.publication_id
             join data_citation_settings s on s.data_citation_id = d.data_citation_id
             where p.submission_id = ${sid} and s.setting_name in ('title', 'identifier', 'identifierType', 'repository', 'year', 'url') order by 1, 2`
        )
            .split('\n')
            .filter(Boolean);
    const readEdit = async (table, title, key) => {
        await L.rowAction(page, table, title, 'Edit');
        const r = await L.readEditPanel(page);
        fact(`${key} Edit Data Citation fields`, {typeValue: r.typeValue, identifier: r.identifier, repository: r.repository, year: r.year, url: r.url});
        return r;
    };
    /** Choose the empty "Identifier type" entry when there is one; returns whether it was there. */
    const pickEmptyType = async (panel, options) => {
        const empty = options.find((o) => o.value === '');
        if (!empty) return false;
        await panel.getByRole('combobox', {name: /^Identifier type/}).selectOption({value: ''});
        return true;
    };

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        await part('P1', async () => fact('P1 Enable data citation metadata', await L.enableDataCitations(page, app)));
        let table;

        if (mode === 'steps') {
            const title = 'u42r6 Dataset with DOI';
            await part('S1-2', async () => {
                table = await L.openData(page, app);
                if (!table) return fact('S1 Data page', 'absent');
                fact('S2 add: status', await L.addDataCitation(page, table, {title, identifierType: 'DOI', identifier: '10.1234/u42r6', repository: 'u42r6 Repository'}));
                fact('S2 rows', await L.rowTexts(table));
            });
            await part('S3-5', async () => {
                const r = await readEdit(table, title, 'S3');
                fact('S4 Identifier type options', r.typeOptions);
                fact('S4 an empty entry chosen', await pickEmptyType(r.panel, r.typeOptions));
                await r.panel.getByRole('textbox', {name: 'Identifier', exact: true}).fill('');
                const s = await L.savePanel(page, r.panel);
                fact('S5 save with Identifier cleared', s);
                record(`a15-after-save${run}`, await screen(page));
                await L.closePanel(page, r.panel);
                fact('S5 rows', await L.rowTexts(table));
            });
            await part('S6 reopen', async () => {
                table = await L.openData(page, app);
                fact('S6 rows after a reload', await L.rowTexts(table));
                const r = await readEdit(table, title, 'S6 reopened');
                await L.closePanel(page, r.panel);
            });
            await part('X repository', async () => {
                const r = await readEdit(table, title, 'X before');
                await r.panel.getByRole('textbox', {name: 'Repository', exact: true}).fill('');
                fact('X save with Repository cleared', await L.savePanel(page, r.panel));
                await L.closePanel(page, r.panel);
                table = await L.openData(page, app);
                const again = await readEdit(table, title, 'X reopened');
                await L.closePanel(page, again.panel);
            });
            fact('stored (id, setting, value)', stored());
        } else if (mode === 'nb') {
            const title = 'u42r6 NB with DOI';
            await part('nb add', async () => {
                table = await L.openData(page, app);
                if (!table) return fact('nb Data page', 'absent');
                fact('nb add with DOI: status', await L.addDataCitation(page, table, {title, identifierType: 'DOI', identifier: '10.1234/u42r6nb', repository: 'u42r6 NB Repository', year: '2024', url: 'https://example.org/u42r6'}));
            });
            await part('nb a type alone', async () => {
                const r = await readEdit(table, title, 'nb a');
                await r.panel.getByRole('textbox', {name: 'Identifier', exact: true}).fill('');
                fact('nb a: DOI kept, Identifier cleared, save', await L.savePanel(page, r.panel));
                await L.closePanel(page, r.panel);
            });
            await part('nb an identifier alone', async () => {
                table = await L.openData(page, app);
                const r = await readEdit(table, title, 'nb b');
                const picked = await pickEmptyType(r.panel, r.typeOptions);
                fact('nb b: an empty entry chosen', picked);
                if (picked) fact('nb b: empty type, Identifier kept, save', await L.savePanel(page, r.panel));
                await L.closePanel(page, r.panel);
            });
            await part('nb change identifier', async () => {
                table = await L.openData(page, app);
                const r = await readEdit(table, title, 'nb c');
                await r.panel.getByRole('textbox', {name: 'Identifier', exact: true}).fill('10.1234/u42r6nb2');
                fact('nb c: Identifier changed, save', await L.savePanel(page, r.panel));
                await L.closePanel(page, r.panel);
                fact('nb c rows', await L.rowTexts(table));
            });
            await part('nb add without identifier', async () => {
                table = await L.openData(page, app);
                fact('nb d: add without identifier: status', await L.addDataCitation(page, table, {title: 'u42r6 NB plain'}));
                fact('nb d rows', await L.rowTexts(table));
                const r = await readEdit(table, 'u42r6 NB plain', 'nb d');
                fact('nb d: Identifier type options', r.typeOptions.length);
                await L.closePanel(page, r.panel);
            });
            await part('nb clear year and url', async () => {
                table = await L.openData(page, app);
                const r = await readEdit(table, title, 'nb e');
                await r.panel.getByRole('textbox', {name: 'Year', exact: true}).fill('');
                await r.panel.getByRole('textbox', {name: 'URL', exact: true}).fill('');
                fact('nb e: Year and URL cleared, save', await L.savePanel(page, r.panel));
                await L.closePanel(page, r.panel);
                table = await L.openData(page, app);
                const again = await readEdit(table, title, 'nb e reopened');
                await L.closePanel(page, again.panel);
            });
            fact('nb stored (id, setting, value)', stored());
        }
    } finally {
        record(`a15-facts${run}`, facts);
        await close();
    }
});
