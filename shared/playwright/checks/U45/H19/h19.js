// U45 claim check H19 (housekeeping 2026-10-19, incidentals row "Rule 29b, an OJS Crossref file and versions
// sharing a DOI"): does a journal's Crossref file, the one "Export DOIs" downloads and a deposit sends, name a DOI
// twice when two published major versions of an article share it (OPS6's twin)? OJS only (OPS is OPS6 itself; a
// press has no Crossref plugin). Runs on a dataset fleet freshly reset to PKP's default test dataset, as the
// dataset's `dbarnes` on `publicknowledge`, article 17 ("Antimicrobial, heavy metal resistance…", published 1.0).
//
// Setting up (every walk):
//   1. sign in as dbarnes
//   2. Settings › Website › "Plugins": tick "Crossref Manager Plugin"
//   3. DOIs › "Setup": "DOI Prefix" 10.1234; "DOI Versioning" "No" (WALK=control: "Yes"); "Save"
//   4. "Registration": "Crossref", depositor name and email (and "Update Policy DOI" 10.1234/policy when shown,
//      that is under "Yes"); "Save"
//   5. "DOIs": tick article 17, "Assign DOIs"
// WALK=switch (default): 6 "Create New Version" "Major Revision" (2.0 keeps 1.0's DOI); 7 "Publish" 2.0;
//   8 "Export DOIs" under "No"; 9 "Setup" "Yes", "Save"; 10 "Export DOIs" under "Yes"; 10b "Registration" read
//   (the "Update Policy DOI" a "Yes" needs, never asked for), typed 10.1234/policy and saved; 10c "Export DOIs"
//   again; 11 the DOIs row and "View all".
// WALK=switchB: 6 as above; 7 "Setup" "Yes" (2.0 unpublished, made under "No"); 8 "Publish" 2.0; 9 "Export DOIs";
//   9b/9c as 10b/10c above; 10 the DOIs row and "View all".
// WALK=control: "Yes" from step 3; 6 "Minor Revision", "Publish" 1.1, "Export DOIs" (1.0 and 1.1 on one DOI);
//   7 "Major Revision", "Publish" 2.0 (its own DOI), "Export DOIs"; the DOIs row and "View all".
// Each "Export DOIs": the window, the answer (400 on the test installs: the schema fetch goes to the dead
// [proxy]), the file the export left in the files dir's temp/ folder (built in the request, so its <resource>
// URLs are the deposit's) checked against Crossref's schema outside the app (the OPS6 walk's validate.php), and
// the same work built read-only with validation off by ../H15/xml-read.php.
// Every step records what it finds and never throws, so one run walks the whole mode.
//
// Reset first:  npm run fleet-prep -- --feature issues-cc19i --dataset 1 --reset
// WALK=switch also runs on stable-3_5_0, where a journal's Setup has no "DOI Versioning" (steps 9 and 10b record
//   that and save nothing; "Create New Version" answered "Yes"; the 3.5 publish window), with
//   PKP_E2E_LINE=stable-3_5_0, the line fleet's feature and PROBE_RUN=s1/s2, no app lock.
// Run (main):   bin/app-lock.sh shared ojs -- env WALK=<walk> PROBE_RUN=r1 PROBE_FEATURE=issues-cc19i \
//                 PKP_E2E_DATASET=1 PROBE_AGENT=cc19i node bin/probe.js ojs shared/playwright/checks/U45/H19/h19.js
// Facts: .reports/<feature>/cc19i/h19-<walk>-facts[-<run>]-ojs.json; files h19-<walk>-<step>[-<run>]-ojs.xml
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, sql, outFile, serverLog} = require('../../../probe');

const MODE = process.env.WALK || 'switch';
const T = 30_000;
const PREFIX = '10.1234';
const SID = 17;
const POLICY = '10.1234/policy';
const REPO = path.resolve(__dirname, '../../../../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

function filesDir(app) {
    const config = fs.readFileSync(path.isAbsolute(app.configFile) ? app.configFile : path.join(REPO, app.configFile), 'utf8');
    return (config.match(/^files_dir\s*=\s*"?([^"\n]+?)"?\s*$/m) || [])[1];
}

/** The Crossref files in temp/ written at or after `since` (ms), newest last. */
function exportedFiles(app, since) {
    const dir = path.join(filesDir(app), 'temp');
    if (!fs.existsSync(dir)) return [];
    return fs
        .readdirSync(dir)
        .filter((f) => /^crossref(plugin)?-.*\.xml$/.test(f))
        .map((f) => ({f: path.join(dir, f), m: fs.statSync(path.join(dir, f)).mtimeMs}))
        .filter((x) => x.m >= since - 1000)
        .sort((a, b) => a.m - b.m)
        .map((x) => x.f);
}

/** A Crossref file's records: per `journal_article` its DOI, page, version relations and Crossmark updates. */
function recordsOf(xml) {
    const out = [];
    for (const m of xml.matchAll(/<journal_article\b[\s\S]*?<\/journal_article>/g)) {
        const block = m[0];
        out.push({
            doi: (block.match(/<doi>([^<]*)<\/doi>/) || [])[1] || null,
            resource: ((block.match(/<resource[^>]*>([^<]*)<\/resource>/) || [])[1] || '').replace(/&amp;/g, '&').replace(/^https?:\/\/[^/]+/, ''),
            relations: [...block.matchAll(/<rel:intra_work_relation[^>]*relationship-type="([^"]+)"[^>]*>([^<]*)</g)].map((r) => `${r[1]} ${r[2]}`),
            updates: [...block.matchAll(/<update\b[^>]*>([^<]*)<\/update>/g)].map((r) => r[1]),
            published: (block.match(/<publication_date[^>]*>[\s\S]*?<\/publication_date>/) || [''])[0].replace(/\s+/g, ' '),
        });
    }
    return out;
}

/** ../H15/xml-read.php on the fleet (read only, validation off), with the XML body parsed into records. */
function xmlRead(app) {
    const root = path.resolve(REPO, app.root);
    const config = path.isAbsolute(app.configFile) ? app.configFile : path.resolve(REPO, app.configFile);
    try {
        const out = execFileSync('php', [path.join(__dirname, '../H15/xml-read.php'), root, app.contextPath, '--raw', String(SID)], {
            env: {...process.env, PKP_CONFIG_FILE: config},
            encoding: 'utf8',
            timeout: 180000,
            cwd: root,
        });
        const j = JSON.parse(out.trim().split('\n').pop());
        const w = j.works[SID] || {};
        const c = w.crossref || {};
        const records = c.body ? recordsOf(c.body) : null;
        return {
            mode: j.mode,
            exportable: j.exportable,
            depositable: (j.depositable || []).filter((d) => (d.carriers || []).some((x) => x.includes(`(work ${SID})`))),
            versions: (w.versions || []).map((v) => ({id: v.id, version: v.version, published: v.published, doiId: v.doiId, doi: v.doi, status: v.status})),
            crossref: {dois: c.dois, records: c.records, exception: c.exception, libxmlErrors: c.libxmlErrors},
            parsed: records,
            doiListedTwice: records ? new Set(records.map((r) => r.doi)).size !== records.length : null,
        };
    } catch (e) {
        return {error: flat(String(e.stdout || e.message), 600)};
    }
}

/** The file against Crossref's published schema, outside the app (the OPS6 walk's validate.php). */
function validate(file) {
    try {
        const out = execFileSync('php', [path.join(__dirname, '../../issues/preprint-crossref-file-doi-twice/validate.php'), file], {encoding: 'utf8', timeout: 300000});
        return JSON.parse(out.trim().split('\n').pop());
    } catch (e) {
        return {error: flat(String(e.stdout || e.message), 600)};
    }
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('h19.js runs on a dataset fleet (PKP_E2E_DATASET / fleet-prep --dataset)');
    if (app.name !== 'ojs') {
        console.log(`[h19] ${app.name}: not a journal; skipped (OPS is OPS6; a press has no Crossref plugin)`);
        return;
    }
    const {expect} = require('@playwright/test');
    const {DoiSettings, DoisPage, recordNotices} = require('../../../pages/DoisPages.js');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {createVersion, publishLatest, readDoiRow, readVersionsWindow} = require('../../issues/minor-version-new-galley-dois/lib');
    const {storedStatuses, createVersion35, publish35} = require('../../issues/major-version-earlier-doi-stays-registered/lib');
    const stable35 = app.line === 'stable-3_5_0';
    if (stable35 && MODE !== 'switch') throw new Error('on stable-3_5_0 only WALK=switch (3.5 has no "Revision Significance")');
    const {PublishScreen} = require('../../../../../apps/ojs/playwright/pages/PublishSchedulePages.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `h19-${MODE}-${s}${run}`;
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, walk: MODE, run: process.env.PROBE_RUN || null, steps: {}};
    const log = serverLog(app);
    const {page, close} = await launch(app);
    page.on('dialog', (d) => d.accept().catch(() => {}));
    await recordNotices(page);
    const settings = new DoiSettings(page, app.contextPath);
    const dois = new DoisPage(page, app.contextPath);
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    const ojsScreen = new PublishScreen(page, app.contextPath);
    const stored = () => storedStatuses(sql, app, SID);

    const step = async (label, fn) => {
        try {
            const v = await fn();
            facts.steps[label] = v;
            console.log(`[h19] ${label}: ${flat(JSON.stringify(v), 1600)}`);
            return v;
        } catch (e) {
            facts.steps[`ERROR ${label}`] = flat(String(e && e.stack ? e.stack : e), 900);
            console.log(`[h19] ERROR ${label}: ${flat(String(e), 400)}`);
            await shot(page, name(`err-${label.replace(/\W+/g, '_')}`)).catch(() => {});
            return null;
        }
    };
    const snap = async (label) => {
        const s = await screen(page);
        record(name(label), s);
        return s;
    };
    const setVersioning = async (choice, label) => {
        await settings.goto('Setup');
        await snap(`${label}-setup-before`);
        if ((await settings.prefixBox().inputValue()) !== PREFIX) await settings.prefixBox().fill(PREFIX);
        // A journal on stable-3_5_0 has no "DOI Versioning" group (only a preprint server has it there).
        const offered = (await settings.versioningRadio(choice).count()) > 0;
        if (!offered && choice === 'Yes') return {offered, chosen: choice, skipped: 'no "DOI Versioning" on this Setup tab'};
        const before = offered ? {yes: await settings.versioningRadio('Yes').isChecked(), no: await settings.versioningRadio('No').isChecked()} : null;
        if (offered) await settings.versioningRadio(choice).check();
        const r = await settings.pressSave(settings.setup);
        await expect(settings.savedStatus(settings.setup)).toBeVisible({timeout: T});
        const s = await snap(`${label}-setup-${choice}`);
        return {status: r.status(), offered, before, chosen: choice, notices: s.notices, stored: sql(app, `select setting_value from journal_settings where setting_name = 'doiVersioning' and journal_id = (select journal_id from journals where path = '${app.contextPath}')`)};
    };
    const newVersion = async (significance, label) => {
        await frame.gotoEditorial(SID);
        await frame.expectVersionLoaded().catch(() => {});
        await snap(`${label}-workflow`);
        const created = stable35 ? await createVersion35(page, frame) : await createVersion(page, frame, significance);
        await snap(`${label}-created`);
        return {created, stored: stored()};
    };
    const publish = async (label) => {
        await frame.gotoEditorial(SID);
        await frame.expectVersionLoaded().catch(() => {});
        const status = stable35 ? await publish35(page, 'Publish') : await publishLatest(page, frame, 'Publish', ojsScreen);
        await snap(`${label}-published`);
        return {status, stored: stored()};
    };
    const readRow = async (label) => {
        await dois.goto();
        await dois.row(SID).waitFor({timeout: T});
        const row = await readDoiRow(page, dois, SID);
        await snap(`${label}-row`);
        row.viewAll = await readVersionsWindow(page, dois, SID);
        return row;
    };
    /** The Registration tab as it stands (the "Update Policy DOI" box), then, with `fill`, that box typed and saved. */
    const policy = async (label, fill) => {
        await settings.goto('Registration');
        const box = settings.field('updatePolicyDoi');
        const s = await snap(`${label}-registration`);
        const out = {
            shown: await box.isVisible().catch(() => false),
            value: await box.inputValue().catch(() => null),
            label: flat(await settings.registration.locator('label[for*="updatePolicyDoi"]').first().innerText().catch(() => null), 120),
            stored: sql(app, `select setting_value from plugin_settings where plugin_name = 'crossrefplugin' and setting_name = 'updatePolicyDoi'`),
            notices: s.notices,
        };
        if (fill && out.shown) {
            await box.fill(fill);
            const r = await settings.pressSave(settings.registration);
            await sleep(800);
            const s2 = await snap(`${label}-registration-saved`);
            out.saved = {status: r.status(), body: flat(await r.text().catch(() => ''), 300), notices: s2.notices,
                stored: sql(app, `select setting_value from plugin_settings where plugin_name = 'crossrefplugin' and setting_name = 'updatePolicyDoi'`)};
        }
        return out;
    };
    /** "Export DOIs" on article 17: the window, the answer, the file the export built, and the CLI read. */
    const exportDois = async (label) => {
        await dois.goto();
        await dois.row(SID).waitFor({timeout: T});
        await snap(`${label}-dois`);
        await dois.tick([SID]);
        const dialog = await dois.chooseBulkAction('Export DOIs');
        const question = flat(await dialog.innerText(), 400);
        await snap(`${label}-export-window`);
        const answered = page.waitForResponse((r) => /\/api\/v1\/dois\/submissions\/export/.test(r.url()) && r.request().method() !== 'GET', {timeout: 60000});
        const downloads = [];
        page.on('download', (d) => downloads.push(d.suggestedFilename()));
        const mark = log.mark();
        const since = Date.now();
        await dialog.getByRole('button', {name: 'Export DOIs', exact: true}).click();
        const r = await answered;
        const body = flat(await r.text().catch(() => ''), 900);
        await sleep(2500);
        const s = await snap(`${label}-export`);
        await shot(page, name(`${label}-export`)).catch(() => {});
        const windows = await page.getByRole('dialog').allInnerTexts().then((a) => a.map((x) => flat(x, 600)));
        await dois.errorDialog().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
        const out = {question, status: r.status(), body, windows, notices: s.notices, downloads, serverLog: log.since(mark)};
        const files = exportedFiles(app, since);
        out.builtFiles = files.map((f) => path.basename(f));
        if (files.length) {
            const xml = fs.readFileSync(files[files.length - 1], 'utf8');
            const kept = outFile(`${name(label)}.xml`);
            fs.writeFileSync(kept, xml);
            out.file = path.relative(REPO, kept);
            out.timestamp = (xml.match(/<timestamp>([^<]*)<\/timestamp>/) || [])[1];
            out.records = recordsOf(xml);
            out.dois = out.records.map((x) => x.doi);
            out.doiListedTwice = new Set(out.dois).size !== out.dois.length;
            out.valid = validate(kept);
        }
        // xml-read.php speaks main's API; on 3.5 the file the screen's export left is the read.
        out.cli = stable35 ? {skipped: 'stable-3_5_0'} : xmlRead(app);
        out.stored = stored();
        return out;
    };

    try {
        await step('1 sign in', async () => {
            await signIn(page, 'dbarnes');
            return {url: page.url(), stored: stored()};
        });
        await step('2 plugin', async () => {
            await settings.gotoPlugins('crossrefplugin');
            const row = flat(await settings.pluginRow('crossrefplugin').innerText(), 200);
            if (!(await settings.pluginBox('crossrefplugin').isChecked())) await settings.setPluginEnabled('crossrefplugin', true);
            await snap('2-plugins');
            return {row, enabled: await settings.pluginBox('crossrefplugin').isChecked()};
        });
        await step('3 setup', async () => setVersioning(MODE === 'control' ? 'Yes' : 'No', '3'));
        await step('4 registration', async () => {
            await settings.goto('Registration');
            await settings.chooseAgency('Crossref');
            await settings.field('depositorName').fill('Public Knowledge Project');
            await settings.field('depositorEmail').fill('dbarnes@mailinator.com');
            const policyBox = settings.field('updatePolicyDoi');
            const policyShown = await policyBox.isVisible().catch(() => false);
            if (policyShown) await policyBox.fill(POLICY);
            const r = await settings.pressSave(settings.registration);
            await sleep(800);
            await snap('4-registration');
            return {status: r.status(), body: flat(await r.text().catch(() => ''), 300), policyShown, agency: await settings.agencyState()};
        });
        await step('5 assign', async () => {
            await dois.goto();
            const r = await dois.runBulk('Assign DOIs', [SID]);
            await sleep(600);
            await snap('5-assigned');
            return {status: r.status(), stored: stored()};
        });

        if (MODE === 'switch') {
            await step('6 major version under No', async () => newVersion('Major Revision', '6'));
            await step('7 publish 2.0', async () => publish('7'));
            await step('8 export under No', async () => exportDois('8'));
            await step('9 setup Yes', async () => setVersioning('Yes', '9'));
            await step('10 export under Yes', async () => exportDois('10'));
            await step('10b registration, policy DOI', async () => policy('10b', POLICY));
            await step('10c export under Yes with a policy DOI', async () => exportDois('10c'));
            await step('11 row', async () => readRow('11'));
        } else if (MODE === 'switchB') {
            await step('6 major version under No', async () => newVersion('Major Revision', '6'));
            await step('7 setup Yes', async () => setVersioning('Yes', '7'));
            await step('8 publish 2.0 under Yes', async () => publish('8'));
            await step('9 export under Yes', async () => exportDois('9'));
            await step('9b registration, policy DOI', async () => policy('9b', POLICY));
            await step('9c export under Yes with a policy DOI', async () => exportDois('9c'));
            await step('10 row', async () => readRow('10'));
        } else if (MODE === 'control') {
            await step('6 minor version', async () => newVersion('Minor Revision', '6'));
            await step('6b publish 1.1', async () => publish('6b'));
            await step('6c export 1.0+1.1', async () => exportDois('6c'));
            await step('7 major version', async () => newVersion('Major Revision', '7'));
            await step('7b publish 2.0', async () => publish('7b'));
            await step('7c export 1.1+2.0', async () => exportDois('7c'));
            await step('8 row', async () => readRow('8'));
        } else {
            throw new Error(`WALK must be switch, switchB or control, not ${MODE}`);
        }
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
