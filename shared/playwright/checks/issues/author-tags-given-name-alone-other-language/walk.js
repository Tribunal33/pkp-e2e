// U20 A6: an author whose account holds its name in English submits an item in French; once
// published, the item's "citation_author" and "DC.Creator.PersonalName" tags, and its page in
// French, give the contributor's given name alone
// (docs/issues/U20-A6-author-tags-given-name-alone-other-language.md).
//
// On PKP's default test dataset, `publicknowledge`, through the screens:
//   1-4  the dataset's author (OJS, OPS `ccorino`; OMP `aclark`) starts a submission with
//        "Submission Language" "French (Canada)", titled "u20e La mer et ses marées", a file and a French
//        abstract; the Review step read in English and in French; "Submit"
//   5    dbarnes: "Accept and Skip Review", "Send To Production" (OJS, OMP; OPS none)
//   6    dbarnes: "Publish" ("Post"); OJS into "Vol. 1 No. 2 (2014)"
//   7-8  signed out: the item's page in English and in French, its author tags
// MODE=crossref (OJS): after the Steps, dbarnes turns on "Crossref Manager Plugin", sets the DOI
//   prefix 10.1234 and Crossref with a depositor, then on the DOIs page "Assign DOIs" and
//   "Export DOIs" on the article; the downloaded XML's <contributors> is read (nothing deposited).
// MODE=nb (the neighbour alone, what a fix must leave as it is): the same author first gives
//   the account a French name of its own (Profile › Identity, "Carl" / "Corin"; OMP "Art" /
//   "Clarke"), then starts a French submission and reads the Review step in both interface
//   languages; nothing is submitted. Each step is recorded, none throws.
//
// Run (the fleet freshly reset to the dataset):
//   PROBE_FEATURE=<dataset fleet's feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/author-tags-given-name-alone-other-language/walk.js
//   MODE=nb PROBE_RUN=nb-out … the same command
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<the 3.5 fleet's feature> … the same command
const {forEachApp, launch, signIn, signOut, record, sql} = require('../../../probe');
const L = require('./lib.js');

const NB = process.env.MODE === 'nb';
const CROSSREF = process.env.MODE === 'crossref';
const ISSUE = 'Vol. 1 No. 2 (2014)';
const NB_NAMES = {ojs: ['Carl', 'Corin'], omp: ['Art', 'Clarke'], ops: ['Carl', 'Corin']};

/** Evidence beside the screens, never a step: the contributor's stored names. */
function storedNames(app, id) {
    if (!Number(id)) return null;
    const rows = sql(app, `select s.setting_name, s.locale, s.setting_value from author_settings s
        join authors a on a.author_id = s.author_id join publications p on p.publication_id = a.publication_id
        where p.submission_id = ${Number(id)} and s.setting_name in ('givenName','familyName','preferredPublicName') order by 1, 2`);
    return rows ? rows.split('\n') : [];
}

const step = async (facts, key, fn) => {
    try {
        facts[key] = await fn();
    } catch (e) {
        facts[key] = {error: L.flat(e.message, 300)};
    }
    return facts[key];
};

forEachApp(async (app) => {
    const w = L.WORDS[app.name];
    const facts = {line: app.line || 'main', mode: NB ? 'nb' : 'steps', author: w.author};
    const {page, close} = await launch(app);
    try {
        if (process.env.MODE === 'export') {
            // The export alone, on a fleet the crossref mode left published with a DOI assigned.
            await signIn(page, 'dbarnes');
            if (app.name === 'ojs') await step(facts, 'crossref', () => L.exportDois(page, app, Number(process.env.ITEM || 21)));
            return;
        }
        await signIn(page, w.author);
        if (NB) {
            const [given, family] = NB_NAMES[app.name];
            await step(facts, 'profile', () => L.setFrenchName(page, app, {given, family}));
        }
        const begun = await step(facts, 'begin', () => L.beginInLanguage(page, app, {title: NB ? 'u20e nb Le vent' : 'u20e La mer et ses marées', section: w.section, language: 'French (Canada)'}));
        const id = begun && begun.id;
        facts.id = id;
        await step(facts, 'wizard', () => L.toReview(page, app, {abstract: 'u20e Un résumé de la mer.', locale: 'fr_CA'}));
        await step(facts, 'reviewEn', () => L.readReview(page, app, id, 'en'));
        await step(facts, 'reviewFr', () => L.readReview(page, app, id, 'fr_CA'));
        facts.storedAtReview = storedNames(app, id);
        if (!NB) {
            await step(facts, 'reviewEnAgain', () => L.readReview(page, app, id, 'en'));
            await step(facts, 'submit', () => L.submit(page, app).then(() => 'Submission complete'));
            await signOut(page);
            await signIn(page, 'dbarnes');
            await step(facts, 'production', () => L.toProduction(page, app, id));
            await step(facts, 'publish', () => L.publishItem(page, app, id, ISSUE));
            await signOut(page);
            await step(facts, 'itemEn', () => L.readItemPage(page, app, id, 'en'));
            await step(facts, 'itemFr', () => L.readItemPage(page, app, id, 'fr_CA'));
            facts.storedPublished = storedNames(app, id);
            if (CROSSREF && app.name === 'ojs') {
                await signIn(page, 'dbarnes');
                await step(facts, 'crossref', () => L.exportCrossref(page, app, id));
            }
        }
    } finally {
        record('facts', facts);
        await close();
    }
});
