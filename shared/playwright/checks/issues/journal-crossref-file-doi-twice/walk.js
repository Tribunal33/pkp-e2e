// Issue report docs/issues/U45-OJS11-journal-crossref-file-doi-twice.md (U45 OJS11): a journal's Crossref file,
// the one "Export DOIs" builds and a deposit sends, names a DOI once for each published major version that shares
// it, the older version first. Takes the report's Steps through the screens on a dataset fleet freshly reset to
// PKP's default test dataset, as the dataset's `dbarnes` on `publicknowledge`, article 17 ("Antimicrobial, heavy
// metal resistance…", published 1.0). OJS only (a preprint server's file is OPS6's report; a press has no
// Crossref plugin). The kit builds nothing.
//
// Setting up (every mode):
//   1. sign in as dbarnes
//   2. Settings › Website › "Plugins": tick "Crossref Manager Plugin"
//   3. DOIs › "Setup": "DOI Prefix" 10.1234, "Save" ("DOI Versioning" stays "No"; WALK=neighbour: "Yes")
//   4. "Registration": "Crossref", depositor name and email ("Update Policy DOI" 10.1234/policy when shown); "Save"
//   5. "DOIs": tick article 17, "Assign DOIs"
// No WALK (main and stable-3_5_0):
//   6. "Create New Version", "Revision Significance" "Major Revision", "Confirm" (3.5: "Yes" in its window)
//   7. "Publish" version 2.0
//   8. "Export DOIs" under "No" (control)
//   9. "Setup": "DOI Versioning" "Yes", "Save" (3.5: not offered on a journal; recorded, nothing saved)
//  10. "Registration": "Update Policy DOI" 10.1234/policy (shown, starred, once "Yes" is saved), "Save"
//  11. "Export DOIs" again
//  12. the DOIs row and "View all"
// WALK=wayround (main): steps 1-11, then 13 "Setup": "DOI Versioning" "No" again, "Save"; 14 "Export DOIs" (the
//   way round the report names: the current version alone, at the article's unversioned page).
// WALK=neighbour (main; the fix in and out): steps 1-5 under "Yes"; "Minor Revision", "Publish" 1.1 (1.0's DOI);
//   "Major Revision", "Publish" 2.0 (a DOI of its own); "Export DOIs". Both DOIs must stay, 1.1's then 2.0's,
//   2.0's record a version of 1.1's DOI.
// Each "Export DOIs": the window, the answer (400 on the test installs: the schema fetch goes to the dead
// [proxy]), the file the export left in the files dir's temp/ folder and its records, and the same file checked
// against Crossref's 5.4.0 schema outside the install. Every step records what it finds and never throws.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset --apps ojs
// Run (main):   bin/app-lock.sh shared ojs -- env [WALK=neighbour] PROBE_FEATURE=<feature> PROBE_AGENT=h20b \
//                 node bin/probe.js ojs shared/playwright/checks/issues/journal-crossref-file-doi-twice/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35, the line fleet's feature, in front of both.
// The fix:      node bin/try-fix.js apply …/fix.diff ojs (PROBE_RUN=fix, nb-in; nb-out with the fix out)
// Facts: .reports/<feature>/h20b/ojs11-<mode>-facts[-<run>]-ojs.json; files ojs11-<mode>-<step>[-<run>]-ojs.xml
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, sql, outFile, serverLog} = require('../../../probe');
const {REPO, exportedFiles, journalRecords, validate} = require('./lib');

const MODE = process.env.WALK || 'switch';
const T = 30_000;
const PREFIX = '10.1234';
const POLICY = '10.1234/policy';
const SID = 17;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'ojs') {
        console.log(`[ojs11] ${app.name}: not a journal; skipped`);
        return;
    }
    if (!['switch', 'wayround', 'neighbour'].includes(MODE)) throw new Error(`WALK must be unset, wayround or neighbour, not ${MODE}`);
    const {expect} = require('@playwright/test');
    const {DoiSettings, DoisPage, recordNotices} = require('../../../pages/DoisPages.js');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {PublishScreen} = require('../../../../../apps/ojs/playwright/pages/PublishSchedulePages.js');
    const {createVersion, publishLatest, readDoiRow, readVersionsWindow} = require('../minor-version-new-galley-dois/lib');
    const {storedStatuses, createVersion35, publish35} = require('../major-version-earlier-doi-stays-registered/lib');
    const stable35 = app.line === 'stable-3_5_0';
    if (stable35 && MODE !== 'switch') throw new Error('on stable-3_5_0 only the default walk (no "Revision Significance")');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `ojs11-${MODE}-${s}${run}`;
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: MODE, run: process.env.PROBE_RUN || null, steps: {}};
    const log = serverLog(app);
    const {page, close} = await launch(app);
    page.on('dialog', (d) => d.accept().catch(() => {}));
    await recordNotices(page);
    const settings = new DoiSettings(page, app.contextPath);
    const dois = new DoisPage(page, app.contextPath);
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    const ojsScreen = new PublishScreen(page, app.contextPath);
    const stored = () => storedStatuses(sql, app, SID);
    const storedSetting = () =>
        sql(app, `select setting_value from journal_settings where setting_name = 'doiVersioning' and journal_id = (select journal_id from journals where path = '${app.contextPath}')`);

    const step = async (label, fn) => {
        try {
            const v = await fn();
            facts.steps[label] = v;
            console.log(`[ojs11] ${label}: ${flat(JSON.stringify(v), 1600)}`);
            return v;
        } catch (e) {
            facts.steps[`ERROR ${label}`] = flat(String(e && e.stack ? e.stack : e), 900);
            console.log(`[ojs11] ERROR ${label}: ${flat(String(e), 400)}`);
            await shot(page, name(`err-${label.replace(/\W+/g, '_')}`)).catch(() => {});
            return null;
        }
    };
    const snap = async (label) => {
        const s = await screen(page);
        record(name(label), s);
        return s;
    };
    /** "Setup": the prefix, and "DOI Versioning" when `choice` is given and the tab offers it; "Save". */
    const setup = async (label, choice) => {
        await settings.goto('Setup');
        if ((await settings.prefixBox().inputValue()) !== PREFIX) await settings.prefixBox().fill(PREFIX);
        const offered = (await settings.versioningRadio('Yes').count()) > 0;
        const before = offered ? {yes: await settings.versioningRadio('Yes').isChecked(), no: await settings.versioningRadio('No').isChecked()} : null;
        if (choice && !offered) return {offered, before, chosen: choice, skipped: 'no "DOI Versioning" on this Setup tab', stored: storedSetting()};
        if (choice) await settings.versioningRadio(choice).check();
        const r = await settings.pressSave(settings.setup);
        await expect(settings.savedStatus(settings.setup)).toBeVisible({timeout: T});
        const s = await snap(`${label}-setup`);
        return {status: r.status(), offered, before, chosen: choice || null, notices: s.notices, stored: storedSetting()};
    };
    /** "Registration": Crossref and the depositor (first time), "Update Policy DOI" when shown; "Save". */
    const registration = async (label, first) => {
        await settings.goto('Registration');
        if (first) {
            await settings.chooseAgency('Crossref');
            await settings.field('depositorName').fill('Public Knowledge Project');
            await settings.field('depositorEmail').fill('dbarnes@mailinator.com');
        }
        const box = settings.field('updatePolicyDoi');
        const policyShown = await box.isVisible().catch(() => false);
        const policyLabel = policyShown ? flat(await settings.registration.locator('label[for*="updatePolicyDoi"]').first().innerText().catch(() => null), 120) : null;
        if (policyShown) await box.fill(POLICY);
        const r = await settings.pressSave(settings.registration);
        await sleep(800);
        const s = await snap(`${label}-registration`);
        return {status: r.status(), policyShown, policyLabel, notices: s.notices, body: flat(await r.text().catch(() => ''), 400)};
    };
    const newVersion = async (label, significance) => {
        await frame.gotoEditorial(SID);
        await frame.expectVersionLoaded().catch(() => {});
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
    /** "Export DOIs" on article 17: the window, the answer, and the file the export built. */
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
        await snap(`${label}-export`);
        await shot(page, name(`${label}-export`)).catch(() => {});
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
            out.records = journalRecords(xml);
            out.dois = out.records.map((x) => x.doi);
            out.doiListedTwice = new Set(out.dois).size !== out.dois.length;
            out.valid = validate(kept);
        }
        out.stored = stored();
        return out;
    };

    try {
        await step('1 sign in', async () => {
            await signIn(page, 'dbarnes');
            return {url: page.url(), stored: stored(), doiVersioning: storedSetting()};
        });
        await step('2 plugin', async () => {
            await settings.gotoPlugins('crossrefplugin');
            const row = flat(await settings.pluginRow('crossrefplugin').innerText(), 200);
            if (!(await settings.pluginBox('crossrefplugin').isChecked())) await settings.setPluginEnabled('crossrefplugin', true);
            return {row, enabled: await settings.pluginBox('crossrefplugin').isChecked()};
        });
        await step('3 setup', async () => setup('3', MODE === 'neighbour' ? 'Yes' : null));
        await step('4 registration', async () => registration('4', true));
        await step('5 assign', async () => {
            await dois.goto();
            const r = await dois.runBulk('Assign DOIs', [SID]);
            await sleep(600);
            return {status: r.status(), stored: stored()};
        });

        if (MODE === 'switch' || MODE === 'wayround') {
            await step('6 major version', async () => newVersion('6', 'Major Revision'));
            await step('7 publish 2.0', async () => publish('7'));
            await step('8 export under No', async () => exportDois('8'));
            await step('9 setup Yes', async () => setup('9', 'Yes'));
            await step('10 registration, policy DOI', async () => registration('10', false));
            await step('11 export under Yes', async () => exportDois('11'));
            if (MODE === 'wayround') {
                await step('13 setup No again', async () => setup('13', 'No'));
                await step('14 export under No again', async () => exportDois('14'));
            } else await step('12 row and View all', async () => {
                await dois.goto();
                await dois.row(SID).waitFor({timeout: T});
                const row = await readDoiRow(page, dois, SID);
                await snap('12-row');
                row.viewAll = await readVersionsWindow(page, dois, SID);
                return row;
            });
        } else {
            await step('n6 minor version', async () => newVersion('n6', 'Minor Revision'));
            await step('n7 publish 1.1', async () => publish('n7'));
            await step('n8 major version', async () => newVersion('n8', 'Major Revision'));
            await step('n9 publish 2.0', async () => publish('n9'));
            await step('n10 export', async () => exportDois('n10'));
        }
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
