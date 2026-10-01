// Issue report docs/issues/U19-A10-oai-jats-list-refused-for-one-subscription-article.md (U19 A10)
// {OJS}: the report's Steps to reproduce, walked through the screens on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), as the dataset's `dbarnes`. The kit
// builds nothing.
//
//   1. sign in as dbarnes
//   2. Settings › Distribution › "Access": "The journal will require subscriptions to access some
//      or all of its contents.", "Save"
//   3. Settings › Website › "Plugins": tick "JATS Metadata Format"
//   4. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access": "Subscription", "Save"
//   5. submission 5 "Genetic transformation of forest trees": "Schedule For Publication",
//      "Don't Assign To An Issue", "Confirm", "Publish"
//      [3.5, where an article needs an issue: Issues › "Future Issues" › "Vol. 2 No. 1 (2015)" ›
//      "Publish Issue" first; then Publication › "Issue" › "Assign to Issue", that issue, "Save",
//      and "Publish"]
//   6. signed out: …/oai?verb=ListRecords&metadataPrefix=jats, as sent and in the browser
//   7. …/oai?verb=ListIdentifiers&metadataPrefix=jats; GetRecord in jats of article 5 (open) and
//      of article 17 (in the subscription issue)
//   control: ListRecords in oai_dc.
// Neighbour reads, for the fix (taken on every run): the list in jats right after step 3, with
//   no restricted article yet (articles 1 and 17 served); GetRecord of article 17 after step 4
//   (the refusal must stay); the list in jats with only restricted articles (after step 4,
//   before step 5); the list as dbarnes signed in (an editor is served every record).
//
// Reset first:  npm run fleet-prep -- --feature issues-a13 --dataset 5 --reset
// Run (main):   PROBE_FEATURE=issues-a13 PROBE_AGENT=a13 node bin/probe.js ojs shared/playwright/checks/issues/oai-jats-list-refused-for-one-subscription-article/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-a13-3_5 --dataset 5 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-a13-3_5 PROBE_AGENT=a13 node bin/probe.js ojs shared/playwright/checks/issues/oai-jats-list-refused-for-one-subscription-article/walk.js
// Facts: .reports/<feature>/a13/jats-facts[-<run>]-ojs.json (PROBE_NAME=<name> renames it)
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const {readOai} = require('../../../pages/OaiPages.js');
const D = require('../oai-driver-set-lists-article-without-galley/lib');
const {publish: publishOnOlderLine} = require('../recommend-by-author-list-never-shown/lib');
const L = require('./lib');

const RESTRICTED = 'Vol. 1 No. 2 (2014)';
const OPEN_35 = 'Vol. 2 No. 1 (2015)';
const JATS = 'verb=ListRecords&metadataPrefix=jats';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return console.log(`[walk] ${app.name}: no "JATS Metadata Format" plugin and no subscriptions; not walked`);
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const old = app.line === 'stable-3_5_0';
    const f = {app: app.name, line: app.line || 'main', reads: []};
    const fact = (k, v) => {
        f[k] = v;
        console.log(`[fact] ojs ${k}: ${L.flat(JSON.stringify(v), 1400)}`);
    };
    const read = async (name, params) => {
        const r = await D.ask(app, name, params);
        const raw = await readOai(app.baseURL, L.CTX, params);
        r.articles = raw.records.map((x) => `${String(x.header && x.header.identifier).replace(/^oai:[^:]+:/, '')}${/<article[\s>]/.test(x.metadata || '') ? ' <article>' : x.metadata ? ' (other)' : ' (no metadata)'}`);
        r.bytes = raw.body.length;
        f.reads.push(r);
        console.log(`${D.line(app, r)} | metadata: ${r.articles.join('; ')} | ${r.bytes} bytes`);
        return r;
    };
    const getRecord = (name, id) => read(name, `verb=GetRecord&metadataPrefix=jats&identifier=${id}`);
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const log = D.serverLog(app);
    try {
        await signIn(page, 'dbarnes');
        fact('2 subscriptions required', await L.requireSubscriptions(page));
        fact('3 JATS Metadata Format ticked', await L.enablePlugin(page, 'JATS Metadata Format'));
        fact('3 formats', (await readOai(app.baseURL, L.CTX, 'verb=ListMetadataFormats')).formats.map((x) => x.prefix));
        const before = await read('3 neighbour: jats list, no restricted article', JATS);
        const ids = Object.fromEntries(before.headers.map((h) => [h.match(/article\/(\d+)/)[1], h.split(' ')[0]]));
        const repo = (await readOai(app.baseURL, L.CTX, 'verb=Identify')).identify.repositoryIdentifier;
        const id = (n) => `oai:${repo}:article/${n}`;
        fact('4 issue access', await L.restrictIssue(page, RESTRICTED));
        await read('4 neighbour: jats list, only restricted articles', JATS);
        await getRecord('4 neighbour: GetRecord article 17 (restricted)', id(17));
        if (old) {
            fact('5 [3.5] issue published', await L.publishIssue(page, OPEN_35));
            fact('5 [3.5] publish 5', await publishOnOlderLine(page, app, 5, new RegExp(OPEN_35.replace(/[.()]/g, '\\$&'))));
        } else {
            fact('5 publish 5', await D.publish(page, app, 5, {issue: false}));
        }
        // the list as the signed-in editor's browser gets it (an editor is served every record)
        const editor = await page.request.get(app.url(`/index.php/${L.CTX}/oai?${JATS}`));
        const editorBody = await editor.text();
        fact('6 neighbour: jats list as dbarnes', {status: editor.status(), records: (editorBody.match(/<record>/g) || []).length, error: (editorBody.match(/<error[^>]*>[^<]*<\/error>/) || [null])[0]});
        await signOut(page);
        const list = await read('6 ListRecords jats', JATS);
        fact('6 as sent', L.flat((await readOai(app.baseURL, L.CTX, JATS)).body.replace(/<\?xml[\s\S]*?<responseDate>[^<]*<\/responseDate>/, ''), 500));
        fact('6 browser view', await D.view(page, app, '6 jats list', JATS));
        await read('7 ListIdentifiers jats', 'verb=ListIdentifiers&metadataPrefix=jats');
        await getRecord('7 GetRecord article 5 (open)', id(5));
        await getRecord('7 GetRecord article 17 (restricted)', id(17));
        await read('control: ListRecords oai_dc', 'verb=ListRecords&metadataPrefix=oai_dc');
        fact('6 article 5 in the jats list', list.headers.some((h) => /article\/5 /.test(h)));
        fact('server log', {file: log.file, lines: log.since()});
        void ids;
    } catch (e) {
        f.error = String(e.stack || e.message).slice(0, 900);
        console.log(`[fact] ojs FAILED: ${f.error}`);
    } finally {
        record(process.env.PROBE_NAME || 'jats-facts', f);
        await close();
    }
});
