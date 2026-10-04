// U42 A7: with "References Metadata Lookup" off, a reference typed into the submission wizard's
// "References" box does not keep the DOI written in its text, while the same kind of reference
// added through the workflow's References "Add" does
// (docs/issues/U42-A7-wizard-reference-doi-not-kept.md).
//
// On PKP's default test dataset, `publicknowledge`, through the screens:
//   1-5  the dataset's author (OJS, OPS `ccorino`; OMP `aclark`) submits "u42r8 DOI in references"
//        with "Alpha study 2020. https://doi.org/10.1234/abcd" in the "Details" step's "References"
//   6-8  dbarnes: the submission's Publication › "References", "Add" of
//        "Beta trial 2021. https://doi.org/10.1234/efgh"; both rows and their "Edit" read
//   9-10 dbarnes: Settings › Workflow › "Metadata", "Enable references structuring and metadata
//        lookup" ticked, "Save"; the References rows and their "Edit" "DOI" box read again
// Beside the screens (evidence, never a step): the stored DOIs; OJS: the <citation_list> the
// Crossref export builds for the submission (citationlist.php).
// MODE=nb (the neighbour alone, what a fix must leave as it is): dbarnes turns lookup ON first,
//   then the author submits "u42r8 lookup on" with "Gamma report 2022. https://doi.org/10.1234/ijkl"
//   and "Delta notes 2019" (no DOI); the References rows and the stored DOIs are read. Each step
//   is recorded, none throws.
//
// Run (the fleet freshly reset to the dataset):
//   PROBE_FEATURE=<dataset fleet's feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/wizard-reference-doi-not-kept/walk.js
//   MODE=nb PROBE_RUN=nb-out … the same command
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const L = require('./lib.js');

const NB = process.env.MODE === 'nb';
const ALPHA = 'Alpha study 2020. https://doi.org/10.1234/abcd';
const BETA = 'Beta trial 2021. https://doi.org/10.1234/efgh';
const GAMMA = 'Gamma report 2022. https://doi.org/10.1234/ijkl';
const DELTA = 'Delta notes 2019';

const step = async (facts, key, fn) => {
    try {
        facts[key] = await fn();
    } catch (e) {
        facts[key] = {error: L.flat(e.message, 300)};
    }
    return facts[key];
};

forEachApp(async (app) => {
    const author = L.WORDS[app.name].author;
    const facts = {line: app.line || 'main', mode: NB ? 'nb' : 'steps', author};
    const key = NB ? 'u42r8-nb' : 'u42r8-walk';
    const {page, close} = await launch(app);
    const lists = L.watchCitationLists(page);
    try {
        if (NB) {
            await signIn(page, 'dbarnes');
            await step(facts, 'lookupOn', () => L.setLookup(page, app, true));
            await signOut(page);
        }
        await signIn(page, author);
        const sub = await step(facts, 'submit', () => L.submitWithReferences(page, app, {
            title: NB ? 'u42r8 lookup on' : 'u42r8 DOI in references',
            refs: NB ? `${GAMMA}\n${DELTA}` : ALPHA,
        }));
        const id = sub && sub.id;
        facts.id = id;
        await L.snap(page, NB ? 'nb-submitted' : '05-submitted');
        await signOut(page);
        await signIn(page, 'dbarnes');
        if (NB) {
            await step(facts, 'references', () => L.openReferences(page, app, id));
            await L.snap(page, 'nb-references');
            await step(facts, 'rows', () => L.readRows(page, ['Gamma report', 'Delta notes']));
            facts.stored = L.storedReferences(app, id);
            facts.lists = lists.slice(-2);
            return;
        }
        await step(facts, 'references', () => L.openReferences(page, app, id));
        await step(facts, 'add', () => L.addReference(page, BETA));
        await L.snap(page, '08-references-lookup-off');
        await step(facts, 'rowsLookupOff', () => L.readRows(page, ['Alpha study', 'Beta trial']));
        facts.listsLookupOff = lists.slice(-2);
        facts.storedLookupOff = L.storedReferences(app, id);
        if (app.name === 'ojs') facts.crossrefCitationList = L.crossrefCitationList(app, id);
        await step(facts, 'lookupOn', () => L.setLookup(page, app, true));
        await step(facts, 'referencesAgain', () => L.openReferences(page, app, id));
        await L.snap(page, '10-references-lookup-on');
        await step(facts, 'rowsLookupOn', () => L.readRows(page, ['Alpha study', 'Beta trial']));
        facts.listsLookupOn = lists.slice(-2);
        facts.storedLookupOn = L.storedReferences(app, id);
    } finally {
        record(key, facts);
        await close();
    }
});
