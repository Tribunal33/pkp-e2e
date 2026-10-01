// Issue report docs/issues/U19-A22-doi-versioning-oai-requests-fail.md (U19 A22) {OJS}:
// the report's Steps to reproduce, walked through the screens on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"). The kit builds nothing.
//
//   P. as admin: Administration › Hosted Journals › "Create Journal", path u19a22, public
//   1. signed out, the OAI addresses: Identify, ListRecords, ListIdentifiers, GetRecord and
//      ListMetadataFormats of article 17, ListSets at publicknowledge; Identify at u19a22;
//      ListRecords at the site-wide address
//   2. as dbarnes: Settings › Distribution › "DOIs" › "Setup"
//   3. "DOI Prefix" 10.1234 (the dataset has none and the form asks for one), "DOI Versioning"
//      "Yes, assign a unique DOI to every version of an article.", "Save"
//   4. the addresses of step 1 again
//   5. "DOI Versioning" back to "No, …", "Save"; the addresses again
// On stable-3_5_0 OJS offers no "DOI Versioning": the walk takes steps 1 and 2 at
// publicknowledge and records that the choice is absent.
// Neighbour (`neighbour` as the script's argument, with the fix in and out): versioning left
// at "No", the lists; article 17's workflow › "Unpublish"; the lists (its deleted record, the
// half of the query the fix reorders). With FIX=1 it then turns versioning to "Yes" and reads
// the lists once more.
// Versions (`versions` as the script's argument, with the fix in: FIX=1): "DOI Versioning"
// "Yes", article 17's workflow › "Create New Version", "Revision Significance" "Major
// Revision", "Confirm", "Publish"; then ListRecords, ListIdentifiers, GetRecord of each
// identifier listed, the site-wide list (the per-version branch returning a row).
//
// Reset first:  npm run fleet-prep -- --feature issues-a22 --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-a22 PROBE_AGENT=a22 node bin/probe.js ojs shared/playwright/checks/issues/doi-versioning-oai-requests-fail/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-a22-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-a22-3_5 PROBE_AGENT=a22 node bin/probe.js ojs shared/playwright/checks/issues/doi-versioning-oai-requests-fail/walk.js
// Facts: .reports/<feature>/a22/facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, sql} = require('../../../probe');
const {createPublicContext, unpublish, oai} = require('../oai-own-address-loses-deleted-records/lib');
const {view, serverLog, flat} = require('../book-without-abstract-oai-lists-fail/lib');
const {createVersion, publishLatest} = require('../minor-version-new-galley-dois/lib');
const {readOai} = require('../../../pages/OaiPages.js');

const T = 30_000;
const NEIGHBOUR = process.argv.includes('neighbour');
const VERSIONS = process.argv.includes('versions');
const FIX = !!process.env.FIX;
const SECOND = 'u19a22';
const ARTICLE = 17;
const PREFIX = '10.1234';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // per-version OAI records are a journal's; OMP and OPS have no such query
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const {expect} = require('@playwright/test');
    const {DoiSettings} = require('../../../pages/DoisPages.js');
    const stable = app.line && app.line !== 'main';
    const {page, close} = await launch(app);
    const ctx = app.contextPath;
    const log = serverLog(app);
    const tagName = (s) => `${s}${FIX ? '-fix' : ''}`;
    const facts = {line: app.line || 'main', dataset: app.dataset, neighbour: NEIGHBOUR, fix: FIX, log: log.file, steps: []};
    const fact = (step, data) => {
        facts.steps.push({step, ...data});
        const line = data.address
            ? `${data.status}${data.shownStatus !== undefined ? `/${data.shownStatus}` : ''} ${data.error ? `error "${data.error}"` : `headers ${data.headers.length} [${data.headers.map((h) => h.replace(/^(DELETED )?oai:[^:]+:/, '$1').split(' ').slice(0, h.startsWith('DELETED') ? 2 : 1).join(' ')).join('; ')}]`}${data.status >= 400 ? ` shown "${data.shown}"` : ''}${data.sets ? ` sets ${data.sets.join(',')}` : ''}${data.earliestDatestamp ? ` earliest ${data.earliestDatestamp}` : ''}`
            : JSON.stringify(data);
        console.log(`[fact] ${step.padEnd(40)} ${line}`);
        return data;
    };
    const ask = async (step, where, params, name) => {
        const data = {...(await oai(app, where, params)), ...(await view(page, app, where, params))};
        if (name) await shot(page, tagName(name)).catch(() => {});
        return fact(step, data);
    };
    let identifier = null;
    const readAll = async (n, name) => {
        const list = await ask(`${n} ListRecords`, ctx, 'verb=ListRecords&metadataPrefix=oai_dc', name);
        if (!identifier) identifier = (list.headers.map((h) => h.replace(/^DELETED /, '').split(' ')[0]).find((i) => i.endsWith(`article/${ARTICLE}`))) || null;
        await ask(`${n} Identify`, ctx, 'verb=Identify');
        await ask(`${n} ListIdentifiers`, ctx, 'verb=ListIdentifiers&metadataPrefix=oai_dc');
        if (identifier) {
            await ask(`${n} GetRecord article ${ARTICLE}`, ctx, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(identifier)}`);
            await ask(`${n} ListMetadataFormats article ${ARTICLE}`, ctx, `verb=ListMetadataFormats&identifier=${encodeURIComponent(identifier)}`);
        }
        await ask(`${n} ListSets`, ctx, 'verb=ListSets');
        if (!stable && !NEIGHBOUR) await ask(`${n} second journal Identify`, SECOND, 'verb=Identify');
        await ask(`${n} site-wide ListRecords`, 'index', 'verb=ListRecords&metadataPrefix=oai_dc');
    };
    const settings = new DoiSettings(page, ctx);
    const setVersioning = async (step, start) => {
        await settings.goto('Setup');
        const radio = settings.versioningRadio(start);
        const offered = await radio.count();
        if (!offered) {
            record(tagName(`${step}-setup`), await screen(page));
            return fact(`${step} "DOI Versioning"`, {offered, groups: await settings.setup.getByRole('group').evaluateAll((g) => g.map((x) => x.querySelector('legend')?.innerText.trim()).filter(Boolean))});
        }
        const label = flat(await radio.evaluate((r) => r.closest('label')?.innerText || ''), 120);
        // the dataset's journal has no "DOI Prefix", and the form refuses a save without one
        const prefix = await settings.prefixBox().inputValue();
        if (!prefix) await settings.prefixBox().fill(PREFIX);
        await radio.check();
        const saved = await settings.pressSave(settings.setup);
        if (saved.status() !== 200) fact(`${step} save refused`, {save: saved.status(), body: flat(await saved.text().catch(() => ''), 300)});
        await expect(settings.savedStatus(settings.setup)).toBeVisible({timeout: T});
        record(tagName(`${step}-setup`), await screen(page));
        const stored = sql(app, `select journal_id || ':' || setting_name || '=' || setting_value from journal_settings where setting_name in ('doiVersioning', 'enableDois') order by 1`);
        return fact(`${step} "DOI Versioning" ${start}`, {offered, label, prefixBefore: prefix, save: saved.status(), stored});
    };
    try {
        if (VERSIONS) {
            const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
            const {PublishScreen} = require('../../../../../apps/ojs/playwright/pages/PublishSchedulePages.js');
            const frame = new WorkflowPage(page, ctx, {labels: {publicationGroup: 'Publication'}});
            await signIn(page, 'dbarnes');
            await setVersioning('v1', 'Yes');
            await frame.gotoEditorial(ARTICLE);
            await frame.expectVersionLoaded().catch(() => {});
            fact('v2 create version', await createVersion(page, frame, 'Major Revision'));
            await frame.gotoEditorial(ARTICLE);
            await frame.expectVersionLoaded().catch(() => {});
            fact('v3 publish', {publish: await publishLatest(page, frame, 'Publish', new PublishScreen(page, ctx))});
            record(tagName('v3-published'), await screen(page));
            fact('v3 stored', {stored: sql(app, `select publication_id || ' ' || coalesce(version_stage, '') || ' ' || version_major || '.' || version_minor || ' status ' || status || (case when publication_id = (select current_publication_id from submissions where submission_id = ${ARTICLE}) then ' current' else '' end) from publications where submission_id = ${ARTICLE} order by 1`)});
            const list = await ask('v4 ListRecords', ctx, 'verb=ListRecords&metadataPrefix=oai_dc', 'versions-list');
            await ask('v4 ListIdentifiers', ctx, 'verb=ListIdentifiers&metadataPrefix=oai_dc');
            for (const h of list.headers.filter((x) => x.includes(`article/${ARTICLE}`))) {
                const id = h.replace(/^DELETED /, '').split(' ')[0];
                const a = await readOai(app.baseURL, ctx, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(id)}`);
                const all = (t) => [...a.body.matchAll(new RegExp(`<dc:${t}[^>]*>([^<]*)</dc:${t}>`, 'g'))].map((m) => m[1]);
                fact(`v5 GetRecord ${id.split(':').pop()}`, {status: a.status, error: a.error || null, identifier: (a.body.match(/<identifier>([^<]+)</) || [])[1], dcIdentifier: all('identifier'), relation: all('relation'), date: all('date'), title: all('title')});
            }
            await ask('v6 Identify', ctx, 'verb=Identify');
            await ask('v6 site-wide ListRecords', 'index', 'verb=ListRecords&metadataPrefix=oai_dc');
            facts.serverLog = log.since();
            for (const l of facts.serverLog) console.log(`[log] ${l}`);
            return;
        }
        if (NEIGHBOUR) {
            await readAll('n1 before');
            await signIn(page, 'dbarnes');
            fact('n2 unpublish article 17', await unpublish(page, app, ctx, ARTICLE));
            await readAll('n3 after unpublish', 'neighbour-deleted');
            if (FIX) {
                await setVersioning('n4', 'Yes');
                await readAll('n5 versioning yes', 'neighbour-deleted-versioning');
            }
            facts.serverLog = log.since();
            for (const l of facts.serverLog) console.log(`[log] ${l}`);
            return;
        }
        if (!stable) {
            await signIn(page, 'admin');
            fact('P second journal', {save: await createPublicContext(page, app, {name: 'Journal u19a22', initials: 'U19A22', path: SECOND, email: 'u19a22@mailinator.com'})});
            fact('P second journal settings', {stored: sql(app, `select j.path || ':' || s.setting_name || '=' || s.setting_value from journals j join journal_settings s using (journal_id) where j.path = '${SECOND}' and s.setting_name in ('doiVersioning', 'enableDois', 'enableOai') order by 1`)});
            await signOut(page);
        }
        await readAll('1', 'list-before');
        await signIn(page, 'dbarnes');
        const set = await setVersioning('3', 'Yes');
        if (!set.offered) return;
        await readAll('4', 'list-versioning-yes');
        facts.serverLog = log.since();
        for (const l of facts.serverLog) console.log(`[log] ${l}`);
        await setVersioning('5', 'No');
        await readAll('5', 'list-versioning-no');
    } finally {
        record(tagName(VERSIONS ? 'versions' : NEIGHBOUR ? 'neighbour' : 'facts'), facts);
        await close();
    }
});
