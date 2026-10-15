// Issue report docs/issues/U45-OPS6-preprint-crossref-file-doi-twice.md (U45 OPS6): on a preprint server,
// the Crossref file "Export DOIs" builds (the one a deposit sends) names a DOI once for every posted version
// that shares it. Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's
// default test dataset, as the dataset's `dbarnes` on `publicknowledge`, preprint 2 ("The Facets Of Job
// Satisfaction…"). OPS only (a journal's file is built by another filter; a press has no Crossref plugin).
// The kit builds nothing.
//
// Setting up (every mode):
//   1. sign in as dbarnes
//   2. Settings › Website › "Plugins": tick "Crossref Manager Plugin"
//   3. DOIs › "Setup": "DOI Prefix" 10.1234; "DOI Versioning" "Yes" (WALK=switch: "No"); "Save"
//   4. "Registration": "Crossref", depositor name and email; "Save"
//   5. "DOIs": tick preprint 2, "Assign DOIs"
// WALK=minor (default; main):
//   6. "Create New Version", "Revision Significance" "Minor Revision", "Confirm"
//   7. "Post" version 1.1
//   8. "Export DOIs" on preprint 2: the window, then the file the export left in the files dir's temp/
//      folder (the test installs cannot fetch Crossref's schema, so nothing downloads), its records,
//      and the same file checked against Crossref's schema outside the install (validate.php)
// WALK=switch (main and stable-3_5_0): step 3 with "No"; then
//   6. "Create New Version" (main "Major Revision"; 3.5 has no "Revision Significance": "Yes")
//   7. "Post" it
//   8. "Export DOIs" as above
//   9. "Setup": "DOI Versioning" "Yes", "Save"
//  10. "Export DOIs" again
// WALK=neighbour (main; the fix in and out): steps 1-5 with "Yes"; "Create New Version" "Major Revision",
//   "Post" (2.0, its own DOI); "Create New Version" "Minor Revision", "Post" (2.1, 2.0's DOI); "Export DOIs".
//   Each DOI must stay once, with its newest posted version: 2.1's record and 1.0's.
// Every step records what it finds and never throws, so a trial run walks each mode once.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   [WALK=switch|neighbour] PROBE_FEATURE=<feature> PROBE_AGENT=k8 node bin/probe.js ops \
//                 shared/playwright/checks/issues/preprint-crossref-file-doi-twice/walk.js
// Run (3.5):    WALK=switch PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35, the line fleet's feature, in front of both.
// The fix:      node bin/try-fix.js apply …/fix.diff ops (PROBE_RUN=fix, nb-in; nb-out with the fix out)
// Facts: .reports/<feature>/k8/ops6-<mode>-facts[-<run>]-ops.json; files ops6-<mode>-<step>[-<run>]-ops.xml
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, sql, outFile, serverLog} = require('../../../probe');

const MODE = process.env.WALK || 'minor';
const T = 30_000;
const PREFIX = '10.1234';
const SID = 2;
const REPO = path.resolve(__dirname, '../../../../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The fleet's files dir, read from its config. */
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

/** A Crossref file's records: per `posted_content` its DOI and the page it leads to. */
function recordsOf(xml) {
    const out = [];
    for (const m of xml.matchAll(/<posted_content\b[\s\S]*?<\/posted_content>/g)) {
        const block = m[0];
        out.push({
            doi: (block.match(/<doi>([^<]*)<\/doi>/) || [])[1] || null,
            resource: ((block.match(/<resource[^>]*>([^<]*)<\/resource>/) || [])[1] || '').replace(/&amp;/g, '&').replace(/^https?:\/\/[^/]+/, ''),
            relations: [...block.matchAll(/<rel:(?:intra_work_relation|inter_work_relation)[^>]*relationship-type="([^"]+)"[^>]*>([^<]*)</g)].map((r) => `${r[1]} ${r[2]}`),
        });
    }
    return out;
}

function validate(file) {
    try {
        const out = execFileSync('php', [path.join(__dirname, 'validate.php'), file], {encoding: 'utf8', timeout: 300000});
        return JSON.parse(out.trim().split('\n').pop());
    } catch (e) {
        return {error: flat(String(e.stdout || e.message), 600)};
    }
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'ops') {
        console.log(`[ops6] ${app.name}: not a preprint server; skipped`);
        return;
    }
    const {expect} = require('@playwright/test');
    const {DoiSettings, DoisPage, recordNotices} = require('../../../pages/DoisPages.js');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {createVersion, publishLatest} = require('../minor-version-new-galley-dois/lib');
    const {storedStatuses, createVersion35, publish35} = require('../major-version-earlier-doi-stays-registered/lib');
    const stable35 = app.line === 'stable-3_5_0';
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `ops6-${MODE}-${s}${run}`;
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: MODE, run: process.env.PROBE_RUN || null, steps: {}};
    const log = serverLog(app);
    const {page, close} = await launch(app);
    page.on('dialog', (d) => d.accept().catch(() => {}));
    await recordNotices(page);
    const settings = new DoiSettings(page, app.contextPath);
    const dois = new DoisPage(page, app.contextPath);
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Preprint'}});

    const step = async (label, fn) => {
        try {
            const v = await fn();
            facts.steps[label] = v;
            console.log(`[ops6] ${label}: ${flat(JSON.stringify(v), 1200)}`);
            return v;
        } catch (e) {
            facts.steps[`ERROR ${label}`] = flat(String(e && e.stack ? e.stack : e), 900);
            console.log(`[ops6] ERROR ${label}: ${flat(String(e), 400)}`);
            await shot(page, name(`err-${label.replace(/\W+/g, '_')}`)).catch(() => {});
            return null;
        }
    };
    const snap = async (label) => {
        const s = await screen(page);
        record(name(label), s);
        return s;
    };
    const setVersioning = async (choice) => {
        await settings.goto('Setup');
        if ((await settings.prefixBox().inputValue()) !== PREFIX) await settings.prefixBox().fill(PREFIX);
        const radio = settings.versioningRadio(choice);
        const before = {yes: await settings.versioningRadio('Yes').isChecked(), no: await settings.versioningRadio('No').isChecked()};
        await radio.check();
        const r = await settings.pressSave(settings.setup);
        await expect(settings.savedStatus(settings.setup)).toBeVisible({timeout: T});
        await snap(`setup-${choice}`);
        return {status: r.status(), before, chosen: choice, kinds: await settings.kinds(), stored: sql(app, `select setting_value from server_settings where setting_name = 'doiVersioning'`)};
    };
    const newVersion = async (significance) => {
        await frame.gotoEditorial(SID);
        await frame.expectVersionLoaded().catch(() => {});
        const created = stable35 ? await createVersion35(page, frame) : await createVersion(page, frame, significance);
        return {created, stored: storedStatuses(sql, app, SID)};
    };
    const post = async () => {
        await frame.gotoEditorial(SID);
        await frame.expectVersionLoaded().catch(() => {});
        const status = stable35 ? await publish35(page, 'Post') : await publishLatest(page, frame, 'Post');
        await snap(`posted-${Date.now() % 100000}`);
        return {status, stored: storedStatuses(sql, app, SID)};
    };
    /** "Export DOIs" on preprint 2: the window, the answer, and the file the export built. */
    const exportDois = async (label) => {
        await dois.goto();
        await dois.row(SID).waitFor({timeout: T});
        await dois.tick([SID]);
        const dialog = await dois.chooseBulkAction('Export DOIs');
        const question = flat(await dialog.innerText(), 400);
        const answered = page.waitForResponse((r) => /\/api\/v1\/dois\/submissions\/export/.test(r.url()) && r.request().method() !== 'GET', {timeout: 60000});
        const downloads = [];
        page.on('download', (d) => downloads.push(d.suggestedFilename()));
        const mark = log.mark();
        const since = Date.now();
        await dialog.getByRole('button', {name: 'Export DOIs', exact: true}).click();
        const r = await answered;
        const body = flat(await r.text().catch(() => ''), 900);
        await sleep(2500);
        await snap(`export-${label}`);
        await shot(page, name(`export-${label}`)).catch(() => {});
        const windows = await page.getByRole('dialog').allInnerTexts().then((a) => a.map((x) => flat(x, 600)));
        await dois.errorDialog().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
        const out = {question, status: r.status(), body, windows, downloads, serverLog: log.since(mark)};
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
        return out;
    };

    try {
        await step('1 sign in', async () => {
            await signIn(page, 'dbarnes');
            return {url: page.url(), stored: storedStatuses(sql, app, SID)};
        });
        await step('2 plugin', async () => {
            await settings.gotoPlugins('crossrefplugin');
            const row = flat(await settings.pluginRow('crossrefplugin').innerText(), 200);
            if (!(await settings.pluginBox('crossrefplugin').isChecked())) await settings.setPluginEnabled('crossrefplugin', true);
            return {row, enabled: await settings.pluginBox('crossrefplugin').isChecked()};
        });
        await step('3 setup', async () => setVersioning(MODE === 'switch' ? 'No' : 'Yes'));
        await step('4 registration', async () => {
            await settings.goto('Registration');
            await settings.chooseAgency('Crossref');
            await settings.field('depositorName').fill('Public Knowledge Project');
            await settings.field('depositorEmail').fill('dbarnes@mailinator.com');
            const r = await settings.pressSave(settings.registration);
            await snap('registration');
            return {status: r.status(), agency: await settings.agencyState()};
        });
        await step('5 assign', async () => {
            await dois.goto();
            const r = await dois.runBulk('Assign DOIs', [SID]);
            await sleep(600);
            return {status: r.status(), stored: storedStatuses(sql, app, SID)};
        });

        if (MODE === 'minor') {
            await step('6 minor version', async () => newVersion('Minor Revision'));
            await step('7 post', async () => post());
            await step('8 export', async () => exportDois('8'));
        } else if (MODE === 'switch') {
            await step('6 new version', async () => newVersion('Major Revision'));
            await step('7 post', async () => post());
            await step('8 export under No', async () => exportDois('8'));
            await step('9 setup Yes', async () => setVersioning('Yes'));
            await step('10 export under Yes', async () => exportDois('10'));
        } else {
            await step('n6 major version', async () => newVersion('Major Revision'));
            await step('n7 post 2.0', async () => post());
            await step('n8 minor version', async () => newVersion('Minor Revision'));
            await step('n9 post 2.1', async () => post());
            await step('n10 export', async () => exportDois('n10'));
        }
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
