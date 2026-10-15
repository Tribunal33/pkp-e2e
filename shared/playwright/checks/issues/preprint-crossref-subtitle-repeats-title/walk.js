// Issue report docs/issues/U45-OPS7-preprint-crossref-subtitle-repeats-title.md (U45 OPS7): a preprint
// server's Crossref file puts the preprint's title in `<subtitle>` instead of the subtitle. Takes the report's
// Steps through the screens on a dataset fleet freshly reset to PKP's default test dataset, as the dataset's
// `dbarnes` on `publicknowledge`. The kit builds nothing. OPS has the fault; OJS takes the same steps as the
// control (a journal's file carries the subtitle). A press has no Crossref plugin.
//
// Default mode, the Steps (the records keep the names in brackets):
//   1.   sign in as dbarnes [1 sign in]
//   2-4. Crossref Manager Plugin ticked; DOIs › Setup "DOI Prefix" 10.1234; Registration: Crossref,
//        depositor name and email [2 plugin, 3 setup, 4 registration]
//   5-6. E (OPS 1, OJS 5) "Subtitle" typed `hkrb a plain subtitle`, "Save" [6 subtitle]
//   7.   "Post" (OJS: "Publish" into Vol. 1 No. 2 (2014)) [7 post]
//   8.   DOIs: "Assign DOIs" on E [8 assign]
//   9.   DOIs: "Export DOIs" on E: what the screen answers [9 export], then the file the export builds
//        (../crossref-title-ampersand-italic-codes/read.php, validation off: the test installs reach no
//        crossref.org) checked against Crossref's 5.4.0 schema (validate.php there) [9 file]
//   control: a posted preprint without a subtitle (OPS 8) "Assign DOIs", its file [control]
// `neighbour` as the argument (the fix in and out; OPS; runs alone, on a fresh dataset; each step records
//   what it finds, never throwing): the same setup, then OPS 8 and OPS 2 (posted, no subtitle), "Assign
//   DOIs", their files, which must not change with the fix.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=k5b node bin/probe.js <ops|ojs|all> \
//                 shared/playwright/checks/issues/preprint-crossref-subtitle-repeats-title/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, the line fleet's feature, PROBE_RUN=r35.
// The fix:      node bin/try-fix.js apply shared/playwright/checks/issues/preprint-crossref-subtitle-repeats-title/fix.diff ops
// Facts: .reports/<feature>/k5b/ops7-facts-<mode>[-<run>]-<app>.json; files ops7-<mode>-<work>[-<run>]-<app>.xml
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, idle, outFile, serverLog} = require('../../../probe');

const ARGS = process.argv.slice(2);
const MODE = ARGS.includes('neighbour') ? 'neighbour' : 'steps';
const T = 30_000;
const PREFIX = '10.1234';
const ISSUE = /Vol\. 1 No\. 2 \(2014\)/;
const SUBTITLE = 'hkrb a plain subtitle';
const REPO = path.resolve(__dirname, '../../../../..');
const A30 = path.join(__dirname, '..', 'crossref-title-ampersand-italic-codes');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

// The work whose subtitle the steps type (unpublished, at Production).
const EDIT = {ojs: 5, ops: 1};
// Posted preprints without a subtitle.
const NO_SUBTITLE = [8, 2];

/** The Crossref file the export builds for a work (A30's read.php, read only), checked against the schema. */
function fileOf(app, mode, id) {
    const root = path.resolve(REPO, app.root);
    const config = path.isAbsolute(app.configFile) ? app.configFile : path.resolve(REPO, app.configFile);
    const out = execFileSync('php', [path.join(A30, 'read.php'), root, app.contextPath, String(id)],
        {env: {...process.env, PKP_CONFIG_FILE: config}, encoding: 'utf8', timeout: 180000, cwd: root, maxBuffer: 64 * 1024 * 1024});
    const w = JSON.parse(out.trim().split('\n').pop()).works[id];
    const res = {stored: w.stored, doi: w.doi, titles: w.titles, exception: w.exception};
    if (w.xml) {
        const file = outFile(`ops7-${mode}-${id}.xml`);
        fs.writeFileSync(file, w.xml);
        res.file = path.relative(REPO, file);
        // Without batch id, timestamp and DOI (a new random suffix on each fresh dataset), so builds compare.
        res.bodyHash = crypto.createHash('sha1').update(w.xml
            .replace(/<doi_batch_id>[^<]*<\/doi_batch_id>|<timestamp>[^<]*<\/timestamp>/g, '')
            .split(w.doi || '\u0000').join('DOI')).digest('hex');
        try {
            res.valid = JSON.parse(execFileSync('php', [path.join(A30, 'validate.php'), file], {encoding: 'utf8', timeout: 300000}).trim().split('\n').pop());
        } catch (e) {
            res.valid = {error: flat(String(e.stdout || e.message), 600)};
        }
    }
    return res;
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    if (!EDIT[app.name] || (MODE === 'neighbour' && app.name !== 'ops')) {
        console.log(`[ops7] ${app.name}: no part in ${MODE}; skipped`);
        return;
    }
    const {DoiSettings, DoisPage} = require('../../../pages/DoisPages.js');
    const {retypeTitleBoxes} = require('../doi-row-title-formatting-codes/lib');
    const {publish} = require('../recommend-by-author-list-never-shown/lib');
    const {openTitleAbstract, post} = require('../preprint-posted-acknowledgement/lib');
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: MODE, run: process.env.PROBE_RUN || null, steps: {}};
    const log = serverLog(app);
    const {page, close} = await launch(app);
    page.on('dialog', (d) => d.accept().catch(() => {}));
    const settings = new DoiSettings(page, ctx);
    const dois = new DoisPage(page, ctx);
    const step = async (name, fn) => {
        try {
            const v = await fn();
            facts.steps[name] = v;
            console.log(`[ops7] ${app.name} ${name}: ${flat(JSON.stringify(v), 900)}`);
        } catch (e) {
            facts.steps[`ERROR ${name}`] = flat(String(e && e.stack ? e.stack : e), 900);
            console.log(`[ops7] ${app.name} ERROR ${name}: ${flat(String(e), 400)}`);
            await shot(page, `ops7-${MODE}-err-${name}`).catch(() => {});
        }
    };
    const snap = async (name) => {
        const s = await screen(page);
        record(`ops7-${MODE}-${name}`, s);
        return s;
    };
    const bulk = async (label, id) => {
        await dois.goto();
        await dois.row(id).waitFor({timeout: T});
        const r = await dois.runBulk(label, [id]);
        await sleep(600);
        return {status: r.status()};
    };
    const exportOnScreen = async (id) => {
        await dois.goto();
        await dois.row(id).waitFor({timeout: T});
        await dois.tick([id]);
        const dialog = await dois.chooseBulkAction('Export DOIs');
        const question = flat(await dialog.innerText(), 400);
        const answered = page.waitForResponse((r) => /\/api\/v1\/dois\/submissions\/export/.test(r.url()) && r.request().method() !== 'GET', {timeout: 60000});
        const mark = log.mark();
        await dialog.getByRole('button', {name: 'Export DOIs', exact: true}).click();
        const r = await answered;
        await sleep(2500);
        const s = await snap(`export-${id}`);
        const windows = await page.getByRole('dialog').allInnerTexts().then((a) => a.map((x) => flat(x, 600)));
        await dois.errorDialog().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
        return {question, status: r.status(), body: flat(await r.text().catch(() => ''), 600), windows, dialogText: flat(s.text && s.text.dialog, 600), serverLog: log.since(mark).slice(0, 3)};
    };

    try {
        await step('1 sign in', async () => {
            await signIn(page, 'dbarnes');
            return page.url();
        });
        await step('2 plugin', async () => {
            await settings.gotoPlugins('crossrefplugin');
            await settings.setPluginEnabled('crossrefplugin', true);
            return {enabled: await settings.pluginBox('crossrefplugin').isChecked()};
        });
        await step('3 setup', async () => {
            await settings.goto('Setup');
            await settings.prefixBox().fill(PREFIX);
            const r = await settings.save(settings.setup);
            return {status: r.status()};
        });
        await step('4 registration', async () => {
            await settings.goto('Registration');
            await settings.chooseAgency('Crossref');
            await settings.field('depositorName').fill('Public Knowledge Project');
            await settings.field('depositorEmail').fill('dbarnes@mailinator.com');
            const r = await settings.save(settings.registration);
            return {status: r.status(), agency: await settings.agencyState()};
        });
        if (MODE === 'steps') {
            const E = EDIT[app.name];
            await step('6 subtitle', async () => retypeTitleBoxes(page, app, E, {subtitle: SUBTITLE}));
            await step('6 heading', async () => {
                const s = await snap('title-abstract');
                return flat(s.text && (s.text.dialog || s.text.main), 300);
            });
            await step('7 post', async () => {
                if (app.name === 'ojs') return publish(page, app, E, ISSUE);
                await openTitleAbstract(page, app, E);
                return post(page);
            });
            await step('8 assign', async () => bulk('Assign DOIs', E));
            await step('9 export', async () => exportOnScreen(E));
            await step('9 file', async () => fileOf(app, MODE, E));
            if (app.name === 'ops') await step('control', async () => ({assign: await bulk('Assign DOIs', NO_SUBTITLE[0]), file: fileOf(app, MODE, NO_SUBTITLE[0])}));
        } else {
            for (const id of NO_SUBTITLE) {
                await step(`n ${id}`, async () => ({assign: await bulk('Assign DOIs', id), file: fileOf(app, MODE, id)}));
            }
        }
    } finally {
        record(`ops7-facts-${MODE}`, facts);
        await close();
    }
});
