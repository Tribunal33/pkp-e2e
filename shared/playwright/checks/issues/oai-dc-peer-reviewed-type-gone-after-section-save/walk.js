// Issue report docs/issues/U19-A7-oai-dc-peer-reviewed-type-gone-after-section-save.md (U19 A7)
// {OJS}: the report's Steps to reproduce, walked through the screens on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), as the dataset's `admin`. The kit
// builds nothing: the second journal, its article and every save go through the screens.
//
// On the dataset's journal:
//   1. …/publicknowledge/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ojs2.localhost:article/17
//   2. as admin: Settings › Journal › "Sections" › "Articles" › "Edit": the two boxes read, "Cancel"
// On a new journal, before and after a save:
//   3. Administration › "Hosted Journals" › "Create Journal": "u19a7 Journal", path u19a7, enabled
//   4. …/u19a7/en/submission: "u19a7 article" in "Articles", the wizard to "Submit"
//   5. its workflow: the publish button › "Confirm" › "Publish" (the journal has no issue)
//   6. …/u19a7/oai?verb=ListRecords&metadataPrefix=oai_dc
//   7. Settings › Journal › "Sections" › "Articles" › "Edit", nothing changed, "Save"
//   8. the address of step 6
// Neighbours (for the fix; taken on every run, after the steps), each followed by the address of
// step 6:
//   9. the same window: "Will not be peer-reviewed" ticked, "Save"
//   10. the same window: the box unticked, "Identify items…" "Research Article", "Save"
// On 3.5 an article is published only in an issue, so steps 3 to 10 are not taken there: steps 1
// and 2 are.
// The report numbers these one higher (2 to 9): its step 1 copies the identifier from
// ListIdentifiers, where this script uses the one the dataset's own config gives.
//
// Reset first:  npm run fleet-prep -- --feature issues-a7 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-a7 PROBE_AGENT=a7 node bin/probe.js ojs shared/playwright/checks/issues/oai-dc-peer-reviewed-type-gone-after-section-save/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-a7-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-a7-3_5 PROBE_AGENT=a7 node bin/probe.js ojs shared/playwright/checks/issues/oai-dc-peer-reviewed-type-gone-after-section-save/walk.js
const {forEachApp, launch, signIn, record, sql} = require('../../../probe');
const L = require('./lib');
const S = require('../section-editors-not-assigned-second-journal/lib');
const D = require('../oai-driver-set-lists-article-without-galley/lib');

const CTX = 'publicknowledge';
const NEW = 'u19a7';
const LIST = 'verb=ListRecords&metadataPrefix=oai_dc';
const ONE = 'verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ojs2.localhost:article/17';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return console.log(`[walk] ${app.name}: no section type in its Dublin Core record; not walked`);
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const f = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        f[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1800)}`);
    };
    const types = async (ctx, params) => {
        const a = await L.readDc(app, ctx, params);
        return {status: a.status, error: a.error, records: a.records.map((r) => ({identifier: r.identifier, type: r.type}))};
    };
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const log = D.serverLog(app);
    try {
        fact('1 article 17', await types(CTX, ONE));
        fact('1 browser view', await L.viewDc(page, app, CTX, ONE, '01-record'));
        await signIn(page, 'admin');
        fact('2 "Articles" window', await L.editSection(page, app, CTX, 'Articles'));
        if (L.old(app)) return;
        fact('3 create journal', {status: await S.createContext(page, app, {name: 'u19a7 Journal', initials: 'UJ', path: NEW, email: 'u19a7@mailinator.com'})});
        fact('3 its "Articles" rows in the database (Evidence only)', sql(app, `select ss.locale, ss.setting_name, ss.setting_value from section_settings ss join sections s using (section_id) join journals j using (journal_id) where j.path = '${NEW}' order by 2, 1`));
        const sid = await S.beginSubmission(page, app, NEW, {title: 'u19a7 article', section: 'Articles'});
        fact('4 submission', {id: sid, problems: await S.completeSubmission(page, app, NEW, sid, {})});
        fact('5 publish', await L.publish(page, app, NEW, sid));
        fact('6 list', await types(NEW, LIST));
        fact('6 browser view', await L.viewDc(page, app, NEW, LIST, '06-list'));
        fact('7 "Articles" saved unchanged', await L.editSection(page, app, NEW, 'Articles', {}));
        fact('8 list', await types(NEW, LIST));
        fact('8 browser view', await L.viewDc(page, app, NEW, LIST, '08-list'));
        fact('8 its "Articles" rows in the database (Evidence only)', sql(app, `select ss.locale, ss.setting_name, '[' || coalesce(ss.setting_value, 'NULL') || ']' from section_settings ss join sections s using (section_id) join journals j using (journal_id) where j.path = '${NEW}' order by 2, 1`));
        // neighbours
        fact('9 "Will not be peer-reviewed" ticked', await L.editSection(page, app, NEW, 'Articles', {notPeerReviewed: true}));
        fact('9 list', await types(NEW, LIST));
        fact('10 unticked, "Research Article" typed', await L.editSection(page, app, NEW, 'Articles', {notPeerReviewed: false, identify: 'Research Article'}));
        fact('10 list', await types(NEW, LIST));
        fact('server log', {file: log.file, lines: log.since()});
    } catch (e) {
        f.error = String(e.stack || e.message).slice(0, 800);
        console.log(`[walk] ${app.name} ERROR ${f.error}`);
    } finally {
        record('facts', f);
        await close();
    }
});
