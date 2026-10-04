// Issue report docs/issues/U42-A14-citation-author-boxes-unnamed.md (U42 A14): the Given Name,
// Family Name and ORCID iD boxes of "Edit citation"'s "Author Information" rows (and of the data
// citation panel's "Creators" rows, the same field) have no accessible name.
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default
// test dataset, as the dataset's editor `dbarnes` on `publicknowledge`, on the submission of
// ../citation-author-row-kept-after-close/lib.js SUBMISSION. Names tagged u42r4. The kit builds
// nothing. A box's name is read as Chromium's accessibility tree computes it (what a screen
// reader is given), with its id, the labels the browser ties to it and where a click on its
// label puts the cursor.
//
// Modes (first argument; each runs alone on a freshly reset dataset):
//   steps (default)  the Steps, and the "Add Data Citation" panel's Creators boxes (reach).
//   nb               what a fix must leave alone: names typed into two author rows are saved and
//                    stored in order; a bare ORCID iD in a creator row is refused with the message
//                    under that row's box.
//
// Reset first:  npm run fleet-prep -- --feature issues-u42r4 --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u42r4 PROBE_AGENT=u42r4 node bin/probe.js <app|all> shared/playwright/checks/issues/citation-author-boxes-unnamed/walk.js [steps|nb]
// Fix trial:    PROBE_RUN=fix (steps), nb-in / nb-out (nb), with fix.diff applied or not.
// Facts: .reports/issues-u42r4/u42r4/a14-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('../citation-author-row-kept-after-close/lib.js');
const B = require('../name-boxes-labels-run-together/lib.js');

const mode = process.argv[2] || 'steps';
const RAW = 'Lovelace A. u42r4 Notes on the analytical engine. 1843.';
const NEEDLE = 'u42r4';
const ORCID_INVALID =
    'The ORCID iD you specified is invalid. Please include the full URI (e.g. "https://orcid.org/0000-0002-1825-0097").';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
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
            await shot(page, `a14-${key}-error`).catch(() => {});
        }
    };
    const boxes = (field) => field.locator('tbody input.pkpFormField--text__input');
    /** Each box's facts, cut to what the report needs. */
    const read = async (field) =>
        (await B.boxFacts(page, boxes(field))).map((b) => ({
            id: b.id,
            elementsWithId: b.elementsWithId,
            labelsTied: b.labelsTied,
            ownLabel: b.ownLabel,
            ownLabelPointsAtThisBox: b.ownLabelPointsAtThisBox,
            ax: b.ax,
        }));

    try {
        await signIn(page, 'dbarnes');
        await part('pre', async () => fact('pre lookup and data citations on', await L.tickMetadata(page, app, ['lookup', 'dataCitations'])));

        if (mode === 'steps') {
            await part('s', async () => {
                const {pg: refs} = await L.openPublicationPage(page, app, 'References');
                await refs.add(RAW);
                const panel = await refs.edit(NEEDLE);
                await panel.addAuthor({});
                await panel.addAuthor({});
                const field = panel.authorsField();
                fact('s6 boxes', await read(field));
                fact('s6 column headers', (await field.locator('thead th').allInnerTexts()).map((s) => L.flat(s, 40)));
                fact('s6 aria snapshot of Author Information', L.flat(await field.ariaSnapshot(), 1500));
                const n = await boxes(field).count();
                if (n > 4) fact('s6 cursor after a click on the second row\'s first label (box index; -1 none)', (await field.locator('label').count()) > 1 ? await B.clickOwnLabel(page, boxes(field), 3) : 'no label');
                record('a14-s6', await screen(page));
                await shot(page, 'a14-s6');
                await panel.close();
                await L.afterClose(page);
            });
            await part('R', async () => {
                const {pg: data} = await L.openPublicationPage(page, app, 'Data');
                const panel = await data.openAdd();
                await panel.addCreator({});
                fact('R creators boxes', await read(panel.creatorsField()));
                await shot(page, 'a14-R');
                await panel.close();
            });
        } else if (mode === 'nb') {
            await part('nb1', async () => {
                const {pg: refs} = await L.openPublicationPage(page, app, 'References');
                await refs.add(RAW);
                let panel = await refs.edit(NEEDLE);
                await panel.addAuthor({givenName: 'Ada', familyName: 'Lovelace', orcid: 'https://orcid.org/0000-0002-1825-0097'});
                await panel.addAuthor({givenName: 'Charles', familyName: 'Babbage'});
                await panel.save();
                await L.afterClose(page);
                fact('nb1 stored', L.storedCitation(app, NEEDLE));
                panel = await refs.edit(NEEDLE);
                fact('nb1 author rows on reopen', await L.authorRows(panel.authorsField()));
                await panel.close();
                await L.afterClose(page);
            });
            await part('nb2', async () => {
                const {pg: data} = await L.openPublicationPage(page, app, 'Data');
                const panel = await data.openAdd();
                await panel.fill({title: 'u42r4 Dataset', relationshipType: 'supporting'});
                await panel.addCreator({givenName: 'Ada', familyName: 'Lovelace'});
                await panel.addCreator({givenName: 'Charles', familyName: 'Babbage', orcid: '0000-0002-1825-0097'});
                await panel.saveButton().click();
                await panel.dialog().getByText(ORCID_INVALID).first().waitFor({timeout: L.T});
                const field = panel.creatorsField();
                fact('nb2 refused: messages per row', await field.locator('tbody tr').evaluateAll((trs) =>
                    trs.map((tr) => [...tr.querySelectorAll('.pkpFieldError')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()))));
                fact('nb2 the second row ORCID box describedby and its error', await boxes(field).nth(5).evaluate((el) => {
                    const ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
                    return {describedBy: ids, texts: ids.map((id) => document.getElementById(id)?.innerText?.replace(/\s+/g, ' ').trim() ?? null)};
                }));
                await shot(page, 'a14-nb2');
                await panel.close();
            });
        } else {
            throw new Error(`unknown mode ${mode}`);
        }
    } finally {
        record('a14-facts', facts);
        await close();
    }
});
