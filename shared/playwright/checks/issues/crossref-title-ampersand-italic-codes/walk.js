// Issue report docs/issues/U45-A30-crossref-title-ampersand-italic-codes.md (U45 A30): a title typed
// with "&" and an italic word, and a subtitle with "&", go into the Crossref file as the text
// `hkrb forest trees &amp; <i>shrubs</i>` and `rocks &amp; sand`. Takes the report's Steps through the
// screens on a dataset fleet freshly reset to PKP's default test dataset, as the dataset's `dbarnes` on
// `publicknowledge`. The kit builds nothing. OJS and OPS (a press has no Crossref plugin).
//
// Default mode, the Steps (the records keep the names in brackets):
//   1.    sign in as dbarnes [steps]
//   2-4.  Crossref Manager Plugin ticked; DOIs › Setup "DOI Prefix" 10.1234; Registration: Crossref,
//         depositor name and email [plugin, setup, registration]
//   control: the dataset's own "Hansen & Pinto: Reason Reclaimed" (OJS 9, published first into
//         Vol. 1 No. 2 (2014); OPS 8, posted), "Assign DOIs", its file [control]
//   5-7.  E (OJS 5, OPS 1) "Title" retyped `hkrb forest trees & shrubs`, "shrubs" in italics with Ctrl+I,
//         "Save"; "Subtitle" `rocks & sand`, "Save" [title, subtitle]
//   8.    "Publish" into Vol. 1 No. 2 (2014) / "Post" [publish]
//   9.    DOIs: "Assign DOIs" on E [assign]
//   10.   DOIs: "Export DOIs" on E: what the screen answers [export], then the file the export builds,
//         read with read.php (validation off; the test installs reach no crossref.org) [file], validated
//         against Crossref's 5.4.0 schema by validate.php [valid]; the work's page heading [reader]
// `neighbour` as the argument (the fix in and out; runs alone, on a fresh dataset; each step records what it
//   finds, never throwing): the same setup; the control as above; E's "Title" retyped `hkrb a <b> c plain`
//   ("plain" in italics: the typed angle brackets must stay text) and "Prefix" `L'`; published, DOI, file;
//   and a plain published work (OJS 17, OPS 2), DOI, file (must not change with the fix).
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=k5 node bin/probe.js <ojs|ops|all> \
//                 shared/playwright/checks/issues/crossref-title-ampersand-italic-codes/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, the line fleet's feature, PROBE_RUN=r35.
// The fix:      node bin/try-fix.js apply …/fix-ojs.diff ojs; …/fix-ops.diff ops (PROBE_RUN=fix, nb-in, nb-out)
// Facts: .reports/<feature>/k5/a30-facts-<mode>[-<run>]-<app>.json; files a30-<mode>-<work>[-<run>]-<app>.xml
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, idle, outFile, serverLog} = require('../../../probe');

const ARGS = process.argv.slice(2);
const MODE = ARGS.includes('neighbour') ? 'neighbour' : 'steps';
const T = 30_000;
const PREFIX = '10.1234';
const ISSUE = /Vol\. 1 No\. 2 \(2014\)/;
const REPO = path.resolve(__dirname, '../../../../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

// The work whose title the steps retype (unpublished, at Production).
const EDIT = {ojs: 5, ops: 1};
// The dataset's own title with a bare "&".
const AMP = {ojs: 9, ops: 8};
// A published work with a plain title (the neighbour's unchanged file).
const PLAIN = {ojs: 17, ops: 2};

/** read.php on the app's fleet: per work the stored title parts and the Crossref XML (read only). */
function readFile(app, ids) {
    const root = path.resolve(REPO, app.root);
    const config = path.isAbsolute(app.configFile) ? app.configFile : path.resolve(REPO, app.configFile);
    const out = execFileSync('php', [path.join(__dirname, 'read.php'), root, app.contextPath, ...ids.map(String)],
        {env: {...process.env, PKP_CONFIG_FILE: config}, encoding: 'utf8', timeout: 180000, cwd: root, maxBuffer: 64 * 1024 * 1024});
    return JSON.parse(out.trim().split('\n').pop());
}

/** validate.php on a saved file: Crossref's schema from crossref.org, outside the app. */
function validate(file) {
    try {
        const out = execFileSync('php', [path.join(__dirname, 'validate.php'), file], {encoding: 'utf8', timeout: 300000});
        return JSON.parse(out.trim().split('\n').pop());
    } catch (e) {
        return {error: flat(String(e.stdout || e.message), 600)};
    }
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    if (!EDIT[app.name]) {
        console.log(`[a30] ${app.name}: no Crossref plugin; skipped`);
        return;
    }
    const {DoiSettings, DoisPage} = require('../../../pages/DoisPages.js');
    const {retypeTitle} = require('../articles-report-title-html-codes/lib');
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
            console.log(`[a30] ${app.name} ${name}: ${flat(JSON.stringify(v), 900)}`);
        } catch (e) {
            facts.steps[`ERROR ${name}`] = flat(String(e && e.stack ? e.stack : e), 900);
            console.log(`[a30] ${app.name} ERROR ${name}: ${flat(String(e), 400)}`);
            await shot(page, `a30-${MODE}-err-${name}`).catch(() => {});
        }
    };
    const snap = async (name) => {
        const s = await screen(page);
        record(`a30-${MODE}-${name}`, s);
        return s;
    };
    /** "Publish" into the back issue (OJS) or "Post" (OPS). */
    const publishWork = async (id) => {
        if (app.name === 'ojs') return publish(page, app, id, ISSUE);
        await openTitleAbstract(page, app, id);
        return post(page);
    };
    const bulk = async (label, id) => {
        await dois.goto();
        await dois.row(id).waitFor({timeout: T});
        const r = await dois.runBulk(label, [id]);
        await sleep(600);
        return {status: r.status()};
    };
    /** Step 10 on screen: "Export DOIs" on one row, what the page answers. */
    const exportOnScreen = async (id) => {
        await dois.goto();
        await dois.row(id).waitFor({timeout: T});
        await dois.tick([id]);
        const dialog = await dois.chooseBulkAction('Export DOIs');
        const question = flat(await dialog.innerText(), 400);
        const answered = page.waitForResponse((r) => /\/api\/v1\/dois\/submissions\/export/.test(r.url()) && r.request().method() !== 'GET', {timeout: 60000});
        const downloads = [];
        page.on('download', (d) => downloads.push(d.suggestedFilename()));
        const mark = log.mark();
        await dialog.getByRole('button', {name: 'Export DOIs', exact: true}).click();
        const r = await answered;
        const body = flat(await r.text().catch(() => ''), 900);
        await sleep(2500);
        const s = await snap(`export-${id}`);
        await shot(page, `a30-${MODE}-export-${id}`).catch(() => {});
        const windows = await page.getByRole('dialog').allInnerTexts().then((a) => a.map((x) => flat(x, 600)));
        await dois.errorDialog().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
        return {question, status: r.status(), body, windows, downloads, dialogText: flat(s.text && s.text.dialog, 600), serverLog: log.since(mark)};
    };
    /** The file the export builds for a work: stored parts, the <titles> blocks, the schema check. */
    const fileOf = (id) => {
        const w = readFile(app, [id]).works[id];
        const out = {stored: w.stored, doi: w.doi, titles: w.titles, exception: w.exception};
        if (w.xml) {
            const file = outFile(`a30-${MODE}-${id}.xml`);
            fs.writeFileSync(file, w.xml);
            out.file = path.relative(REPO, file);
            // The file without its batch id, timestamp and DOI (a new random suffix on each fresh dataset), so two builds
            // of one work compare.
            out.bodyHash = require('crypto').createHash('sha1')
                .update(w.xml.replace(/<doi_batch_id>[^<]*<\/doi_batch_id>|<timestamp>[^<]*<\/timestamp>/g, '').split(w.doi || '\u0000').join('DOI')).digest('hex');
            out.valid = validate(file);
        }
        return out;
    };
    /** The work's own page, read signed out: the heading as readers see it. */
    const readerHeading = async (id) => {
        const reader = await launch(app, {record: false});
        try {
            await reader.page.goto(app.url(`/index.php/${ctx}/${app.name === 'ops' ? 'preprint' : 'article'}/view/${id}`));
            await idle(reader.page);
            return {
                h1: await reader.page.locator('h1').first().innerHTML().then((h) => flat(h, 300)).catch(() => null),
                subtitle: await reader.page.locator('.subtitle').first().innerHTML().then((h) => flat(h, 300)).catch(() => null),
            };
        } finally {
            await reader.close();
        }
    };

    try {
        await step('1 sign in', async () => {
            await signIn(page, 'dbarnes');
            return page.url();
        });
        await step('2 plugin', async () => {
            await settings.gotoPlugins('crossrefplugin');
            const name = flat(await settings.pluginRow('crossrefplugin').innerText(), 200);
            await settings.setPluginEnabled('crossrefplugin', true);
            return {row: name, enabled: await settings.pluginBox('crossrefplugin').isChecked()};
        });
        await step('3 setup', async () => {
            await settings.goto('Setup');
            await settings.prefixBox().fill(PREFIX);
            const r = await settings.save(settings.setup);
            return {status: r.status(), kinds: await settings.kinds()};
        });
        await step('4 registration', async () => {
            await settings.goto('Registration');
            await settings.chooseAgency('Crossref');
            await settings.field('depositorName').fill('Public Knowledge Project');
            await settings.field('depositorEmail').fill('dbarnes@mailinator.com');
            await snap('registration');
            const r = await settings.save(settings.registration);
            return {status: r.status(), agency: await settings.agencyState()};
        });
        await step('control', async () => {
            const out = {};
            if (app.name === 'ojs') out.publish = await publishWork(AMP.ojs);
            out.assign = await bulk('Assign DOIs', AMP[app.name]);
            out.file = fileOf(AMP[app.name]);
            return out;
        });
        const E = EDIT[app.name];
        if (MODE === 'steps') {
            await step('5-6 title', async () => retypeTitle(page, app, E, 'hkrb forest trees & shrubs'));
            await step('7 subtitle', async () => retypeTitleBoxes(page, app, E, {subtitle: 'rocks & sand'}));
            await step('7 heading', async () => {
                const s = await snap('title-abstract');
                return flat(s.text && (s.text.dialog || s.text.main), 300);
            });
            await step('8 publish', async () => publishWork(E));
            await step('9 assign', async () => bulk('Assign DOIs', E));
            await step('10 export on screen', async () => exportOnScreen(E));
            await step('10 file', async () => fileOf(E));
            await step('reader page', async () => readerHeading(E));
        } else {
            await step('n1 title with typed brackets', async () => retypeTitle(page, app, E, 'hkrb a <b> c plain'));
            await step('n2 prefix', async () => retypeTitleBoxes(page, app, E, {prefix: "L'"}));
            await step('n3 publish', async () => publishWork(E));
            await step('n4 assign', async () => bulk('Assign DOIs', E));
            await step('n5 file', async () => fileOf(E));
            await step('n6 reader page', async () => readerHeading(E));
            await step('n7 plain work', async () => ({assign: await bulk('Assign DOIs', PLAIN[app.name]), file: fileOf(PLAIN[app.name])}));
        }
    } finally {
        record(`a30-facts-${MODE}`, facts);
        await close();
    }
});
