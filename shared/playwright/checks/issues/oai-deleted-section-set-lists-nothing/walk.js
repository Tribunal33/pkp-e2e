// Issue report docs/issues/U19-A19-oai-deleted-section-set-lists-nothing.md (U19 A19) {OJS OPS}:
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), as the dataset's `admin`. The kit builds nothing.
//
// A section's abbreviation changed:
//   1. sign in as admin
//   2. submission 17 (OPS 19): workflow › "Unpublish" ("Unpost"), confirmed
//   3. Settings › Journal (Server) › "Sections" › "Articles" ("Preprints") › "Edit": "Abbreviation" ARTX (PREX), "Save"
//   4. ListSets; ListRecords with set=publicknowledge:ART (:PRE) and with set=publicknowledge:ARTX (:PREX)
// A deleted section:
//   5. "Sections" › "Create Section": "Notes u19a19", abbreviation U19A19 (OPS: path u19a19)
//   6. the submission › "Publication Settings" (OJS 3.5 "Issue", OPS "Preprint entry"): "Section" "Notes u19a19", "Save"
//   7. "Schedule For Publication" / "Publish" ("Post"), confirmed; then "Unpublish" ("Unpost"), confirmed
//   8. the same page: "Section" back to "Articles" ("Preprints"), "Save"
//   9. "Sections" › "Notes u19a19" › "Delete", "OK"
//  10. ListSets; ListRecords with set=publicknowledge:U19A19 at the journal's address and the site-wide one
// Neighbour reads, for the fix (taken on every run): the list with no set, with the journal's set,
// with a set nobody has (publicknowledge:NOPE, nosuchset), and the live section's set. Then, after
// the steps: the deleted section's set with from=2030-01-01 and until=2020-01-01 (the dates hold
// only with the fix of U19 A20 beside this one), and a second journal (server), "Second Journal
// u19a19", path u19a19b, created on Administration > Hosted Journals: at its address the first
// journal's sets must list nothing.
//
// Reset first:  npm run fleet-prep -- --feature issues-a19 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-a19 PROBE_AGENT=a19 node bin/probe.js ojs,ops shared/playwright/checks/issues/oai-deleted-section-set-lists-nothing/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-a19-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-a19-3_5 PROBE_AGENT=a19 node bin/probe.js ojs,ops shared/playwright/checks/issues/oai-deleted-section-set-lists-nothing/walk.js
const {forEachApp, launch, signIn, record} = require('../../../probe');
const {unpublish, createPublicContext, WORDS} = require('../oai-own-address-loses-deleted-records/lib');
const L = require('./lib');

const APPS = {
    ojs: {id: 17, section: 'Articles', abbrev: 'ART', renamed: 'ARTX'},
    ops: {id: 19, section: 'Preprints', abbrev: 'PRE', renamed: 'PREX'},
};
const NEW = {title: 'Notes u19a19', abbrev: 'U19A19', path: 'u19a19'};
const CTX = 'publicknowledge';
const SECOND = 'u19a19b';
const LIST = 'verb=ListRecords&metadataPrefix=oai_dc';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const A = APPS[app.name];
    if (!A) return console.log(`[walk] ${app.name}: a press has series, not sections; not walked`);
    const f = {app: app.name, line: app.line || 'main', submission: A.id, reads: []};
    const fact = (k, v) => {
        f[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 900)}`);
    };
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const read = async (name, ctx, params, show = false) => {
        const r = await L.ask(show ? page : null, app, name, ctx, params);
        f.reads.push(r);
        console.log(L.line(app, r));
        return r;
    };
    try {
        // 1-2
        await signIn(page, 'admin');
        await read('0 before: ListSets', CTX, 'verb=ListSets');
        await read(`0 before: set ${A.abbrev}`, CTX, `${LIST}&set=${CTX}:${A.abbrev}`);
        fact('2 unpublish', await unpublish(page, app, CTX, A.id));
        await read(`2 set ${A.abbrev}, deleted record in it`, CTX, `${LIST}&set=${CTX}:${A.abbrev}`);
        // 3
        fact('3 abbreviation', await L.setAbbreviation(page, A.section, A.renamed));
        // 4
        await read('4 ListSets', CTX, 'verb=ListSets', true);
        await read(`4 set ${A.abbrev} (the deleted record's)`, CTX, `${LIST}&set=${CTX}:${A.abbrev}`, true);
        await read(`4 set ${A.renamed} (the section's now)`, CTX, `${LIST}&set=${CTX}:${A.renamed}`);
        await read(`4 site-wide set ${A.abbrev}`, 'index', `${LIST}&set=${CTX}:${A.abbrev}`);
        await read(`4 ListIdentifiers set ${A.abbrev}`, CTX, `verb=ListIdentifiers&metadataPrefix=oai_dc&set=${CTX}:${A.abbrev}`);
        await read('4 control: no set', CTX, LIST);
        await read('4 neighbour: journal set', CTX, `${LIST}&set=${CTX}`);
        await read('4 neighbour: set NOPE', CTX, `${LIST}&set=${CTX}:NOPE`);
        await read('4 neighbour: set nosuchset', CTX, `${LIST}&set=nosuchset`);
        // 5
        fact('5 create section', await L.createSection(page, app, NEW));
        // 6
        fact('6 section of the submission', await L.setSection(page, app, A.id, NEW.title));
        // 7
        fact('7 publish', await L.publish(page, app));
        await read(`7 published: set ${NEW.abbrev}`, CTX, `${LIST}&set=${CTX}:${NEW.abbrev}`);
        fact('7 unpublish', await unpublish(page, app, CTX, A.id));
        await read(`7 unpublished: set ${NEW.abbrev} (section still there)`, CTX, `${LIST}&set=${CTX}:${NEW.abbrev}`);
        // 8
        fact('8 section back', await L.setSection(page, app, A.id, A.section));
        // 9
        fact('9 delete section', await L.deleteSection(page, NEW.title));
        // 10
        await read('10 ListSets', CTX, 'verb=ListSets', true);
        await read(`10 set ${NEW.abbrev}`, CTX, `${LIST}&set=${CTX}:${NEW.abbrev}`, true);
        await read(`10 site-wide set ${NEW.abbrev}`, 'index', `${LIST}&set=${CTX}:${NEW.abbrev}`, true);
        await read(`10 ListIdentifiers set ${NEW.abbrev}`, CTX, `verb=ListIdentifiers&metadataPrefix=oai_dc&set=${CTX}:${NEW.abbrev}`);
        await read('10 control: no set', CTX, LIST, true);
        await read('10 neighbour: journal set', CTX, `${LIST}&set=${CTX}`);
        await read(`10 neighbour: set ${A.renamed}`, CTX, `${LIST}&set=${CTX}:${A.renamed}`);
        await read(`10 neighbour: set ${A.abbrev} (nobody's now)`, CTX, `${LIST}&set=${CTX}:${A.abbrev}`);
        await read('10 neighbour: set NOPE', CTX, `${LIST}&set=${CTX}:NOPE`);
        await read('10 neighbour: site-wide set NOPE', 'index', `${LIST}&set=${CTX}:NOPE`);
        await read('10 neighbour: set nosuchset', CTX, `${LIST}&set=nosuchset`);
        // after the steps: the dates on the deleted section's set
        await read(`11 dates: set ${NEW.abbrev}, from 2030`, CTX, `${LIST}&set=${CTX}:${NEW.abbrev}&from=2030-01-01`);
        await read(`11 dates: set ${NEW.abbrev}, until 2020`, CTX, `${LIST}&set=${CTX}:${NEW.abbrev}&until=2020-01-01`);
        await read(`11 dates: set ${NEW.abbrev}, from today`, CTX, `${LIST}&set=${CTX}:${NEW.abbrev}&from=${new Date().toISOString().slice(0, 10)}`);
        // after the steps: a second journal (server), and the first one's sets asked at its address
        fact('12 second created', {status: await createPublicContext(page, app, {name: `Second ${WORDS[app.name].noun} u19a19`, initials: 'U19A19B', path: SECOND, email: `${SECOND}@mailinator.com`})});
        await read(`12 second: set ${CTX}:${NEW.abbrev}`, SECOND, `${LIST}&set=${CTX}:${NEW.abbrev}`, true);
        await read(`12 second: set ${CTX}:${A.abbrev}`, SECOND, `${LIST}&set=${CTX}:${A.abbrev}`);
        await read(`12 second: set ${CTX}:${A.renamed}`, SECOND, `${LIST}&set=${CTX}:${A.renamed}`);
        await read(`12 second: set ${CTX}`, SECOND, `${LIST}&set=${CTX}`);
        await read(`12 second: set ${SECOND}:${NEW.abbrev}`, SECOND, `${LIST}&set=${SECOND}:${NEW.abbrev}`);
        await read(`12 second: set ${SECOND}`, SECOND, `${LIST}&set=${SECOND}`);
        await read(`12 site-wide: set ${SECOND}:${NEW.abbrev}`, 'index', `${LIST}&set=${SECOND}:${NEW.abbrev}`);
        await read(`12 site-wide: set ${CTX}:${NEW.abbrev}:x`, 'index', `${LIST}&set=${CTX}:${NEW.abbrev}:x`);
        await read('12 second: no set (U19 A1 on OJS)', SECOND, LIST);
    } catch (e) {
        f.error = String(e.stack || e.message).slice(0, 800);
        console.log(`[walk] ${app.name} ERROR ${f.error}`);
    } finally {
        record('facts', f);
        await close();
    }
});
