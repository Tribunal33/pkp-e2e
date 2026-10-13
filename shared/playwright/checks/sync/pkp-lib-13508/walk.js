// PR review pkp/pkp-lib#13507 (pkp-lib#13508, ui-library#1016, crossref-ojs#114, crossref-ops#73,
// ojs#5928, ops#1447): the issue's "To reproduce" and its three expectations, on a dataset fleet freshly
// reset to PKP's default test dataset (job_runner On, as the dataset ships it), with the fleet's
// `[proxy]` pointed at the Crossref stand-in (crossref-stub.js, started here), so the schema is
// fetched and every deposit lands in the stand-in. side.sh sets that up. OJS and OPS (OMP has no
// registration agency).
//   1.  sign in as dbarnes; Settings › Website › "Plugins": tick "Crossref Manager Plugin"
//   2.  DOIs › "Setup": "DOI Prefix" 10.1234, "Save"; "Registration": Crossref, depositor name and
//       email, "Save"
//   3.  DOIs page: "Assign DOIs" on the published works: INVALID (OJS 17, OPS 2), VALID (OJS 1,
//       OPS 5), REFUSED (OJS 1 again, after step 7 registered it; OPS 6)
//   4.  INVALID's first author loses the given name (the issue's step 1; by SQL, as the contributor
//       form refuses an empty given name): the Crossref XML gets an empty <surname>
//   5.  "Export DOIs" on INVALID alone: the answer, the windows that showed, a screenshot
//   6.  "Export DOIs" on VALID alone: the control (the schema copy validates a good file; a download)
//   7.  "Deposit DOIs" on INVALID and VALID together (one job each, run by the same request's
//       worker); reload until the queue is empty; what the stand-in received; both badges;
//       INVALID's "View Error" window
//   8.  the stand-in answers the next deposit with Crossref's failure_count 1 (a valid file Crossref
//       does not take); "Deposit DOIs" on REFUSED; its badge and "View Error" window
//   9.  buffer.php: exportXML() on INVALID then VALID in one PHP process
// Run (side.sh does all of it):
//   PROBE_FEATURE=pr-13507 PROBE_AGENT=pr PROBE_RUN=<side> node bin/probe.js all <this file>
// Facts: .reports/pr-13507/pr/walk-<side>-<app>.json; the stand-in's log and the deposited files
// under .reports/pr-13507/stub-<side>-<app>/.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, sql} = require('../../../probe');
const {watchDialogs, takeDialogs, watchDoiAnswers} = require('../../issues/bulk-action-refusal-no-message/lib.js');
const {startStub} = require('./crossref-stub.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const REPO = path.resolve(__dirname, '../../../../..');
// OJS's default dataset publishes only 1 and 17, so there REFUSED is VALID deposited a second time
const ITEMS = {ojs: {invalid: 17, valid: 1, refused: 1}, ops: {invalid: 2, valid: 5, refused: 6}};
// the stand-in's port: one per slot and app (side.sh points the fleet's [proxy] at the same one)
const stubPort = (name) => 8770 + 10 * Number(process.env.PKP_E2E_SLOT || 0) + (name === 'ojs' ? 1 : 3);

forEachApp(async (app) => {
    if (!ITEMS[app.name]) {
        console.log(`[walk] ${app.name}: no registration agency, no surface; skipped`);
        return;
    }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {DoiSettings, DoisPage, recordNotices} = require('../../../pages/DoisPages.js');
    const {expect} = require('@playwright/test');
    const side = process.env.PROBE_RUN || 'run';
    const pre = `${side}-${app.name}`;
    const {invalid, valid, refused} = ITEMS[app.name];
    const facts = {app: app.name, side, items: ITEMS[app.name]};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1600)}`);
    };
    const stubDir = path.join(REPO, '.reports/pr-13507', `stub-${side}-${app.name}`);
    fs.rmSync(path.join(stubDir, 'deposits'), {recursive: true, force: true});
    fs.mkdirSync(stubDir, {recursive: true});
    // the CA and the schema copy are shared: the server was started trusting ../stub/ca.pem
    const stub = await startStub({dir: path.join(REPO, '.reports/pr-13507/stub'), port: stubPort(app.name), logFile: path.join(stubDir, 'stub.log'), depositDir: path.join(stubDir, 'deposits')});
    const deposits = () => stub.since(0).filter((l) => / POST /.test(l));

    const {page, close} = await launch(app);
    try {
        await recordNotices(page);
        await watchDialogs(page);
        const answers = watchDoiAnswers(page);
        const settings = new DoiSettings(page, app.contextPath);
        const dois = new DoisPage(page, app.contextPath);
        const doi = (id) => sql(app, `select d.doi || ' ' || d.status from dois d join publications p on p.doi_id = d.doi_id join submissions s on s.current_publication_id = p.publication_id where s.submission_id = ${id}`);

        /** Close whatever window is still open (an "Error" window's "OK"). */
        const closeOpenWindow = async () => {
            const open = page.getByRole('dialog');
            if (await open.count()) {
                await open.last().getByRole('button', {name: /^(OK|Close)$/}).first().click().catch(() => {});
                await expect(open).toHaveCount(0, {timeout: T}).catch(() => {});
            }
        };
        /** Tick, choose, confirm; then what the page showed for 2 s: windows, notices, still-open window, answer. */
        const bulk = async (step, label, ids) => {
            takeDialogs(page);
            answers.take();
            await page.evaluate(() => (window.__doiNotices = []));
            await dois.tick(ids);
            const win = await dois.chooseBulkAction(label);
            const done = page.waitForResponse((r) => /\/api\/v1\/dois\//.test(r.url()) && r.request().method() !== 'GET', {timeout: 90_000});
            await win.getByRole('button', {name: label, exact: true}).click();
            await done;
            await expect(win).toBeHidden({timeout: 90_000}).catch(() => {});
            await sleep(2000);
            const open = page.getByRole('dialog');
            const out = {
                answers: answers.take().map((a) => ({...a, body: flat(a.body, 600)})),
                windowsSeen: (await takeDialogs(page)).map((t) => flat(t, 600)),
                openNow: (await open.count()) ? flat(await open.last().innerText(), 900) : null,
                openNowHtml: (await open.count()) ? flat(await open.last().locator('.text-lg-normal, p, ul').first().innerHTML().catch(() => null), 900) : null,
                notices: await page.evaluate(() => window.__doiNotices || []),
            };
            record(`${pre}-${step}`, await screen(page));
            await shot(page, `${pre}-${step}`).catch(() => {});
            return out;
        };
        const drain = async () => {
            let loads = 0;
            for (; loads < 30; loads++) {
                await sleep(3000);
                await dois.reload();
                if (Number(sql(app, "select count(*) from jobs where payload like '%Deposit%'") || 0) === 0) break;
            }
            await sleep(1500);
            await dois.reload();
            return loads + 1;
        };
        const viewError = async (id, step) => {
            const row = dois.row(id);
            await dois.expand(row, id);
            const button = dois.expanded(row).getByRole('button', {name: 'View Error'});
            const out = {badge: flat(await dois.rowBadge(row).innerText()), viewError: await button.count()};
            if (out.viewError) {
                await button.first().click();
                const win = dois.dialog('Registration Error Message');
                await win.waitFor({timeout: T}).catch(() => {});
                await sleep(500);
                out.window = (await win.innerText().catch(() => '')).slice(0, 2500);
                record(`${pre}-${step}`, await screen(page));
                await shot(page, `${pre}-${step}`).catch(() => {});
                await closeOpenWindow();
            }
            await dois.collapse(row, id);
            return out;
        };

        // 1, 2
        await signIn(page, 'dbarnes');
        await settings.gotoPlugins('crossrefplugin');
        await settings.setPluginEnabled('crossrefplugin', true);
        await settings.goto('Setup');
        await settings.prefixBox().fill('10.1234');
        await settings.save(settings.setup);
        await settings.goto('Registration');
        await settings.chooseAgency('Crossref');
        for (const [name, value] of Object.entries({depositorName: 'Public Knowledge Project', depositorEmail: 'dbarnes@mailinator.com'})) {
            await expect(settings.field(name)).toBeVisible({timeout: T});
            await settings.field(name).fill(value);
        }
        const saved = await settings.save(settings.registration);
        fact('1-2 setup', {registration: saved.status(), agency: await settings.agencyState()});

        // 3
        await dois.goto();
        await dois.row(invalid).waitFor({timeout: T});
        const works = [...new Set([invalid, valid, refused])];
        const assigned = await dois.runBulk('Assign DOIs', works);
        fact('3 assign', {status: assigned.status(), dois: works.map(doi)});
        await closeOpenWindow();

        // 4
        const first = sql(app, `select a.author_id from authors a join submissions s on s.current_publication_id = a.publication_id where s.submission_id = ${invalid} order by a.seq, a.author_id limit 1`);
        const before = sql(app, `select setting_name || '[' || locale || ']=' || setting_value from author_settings where author_id = ${first} and setting_name in ('givenName','familyName') order by 1`);
        sql(app, `delete from author_settings where author_id = ${first} and setting_name = 'givenName'`);
        fact('4 given name removed', {authorId: first, before: before.split('\n'), after: sql(app, `select setting_name || '[' || locale || ']=' || setting_value from author_settings where author_id = ${first} and setting_name in ('givenName','familyName') order by 1`).split('\n')});
        await dois.reload();

        // 5, 6
        let downloads = [];
        page.on('download', (d) => downloads.push(d.suggestedFilename()));
        const m5 = stub.mark();
        fact('5 export INVALID', {...(await bulk('5-export-invalid', 'Export DOIs', [invalid])), downloads: [...downloads], stub: stub.since(m5).filter((l) => !/CONNECT/.test(l)).length});
        await closeOpenWindow();
        downloads = [];
        const m6 = stub.mark();
        const e6 = await bulk('6-export-valid', 'Export DOIs', [valid]);
        await sleep(1500);
        fact('6 export VALID (control)', {...e6, downloads: [...downloads], schemaFetches: stub.since(m6).filter((l) => /GET /.test(l)).map((l) => flat(l.replace(/^\S+ /, ''), 160)).slice(0, 4)});
        await closeOpenWindow();

        // 7
        stub.setAnswer('200-ok');
        const m7 = stub.mark();
        const d7 = await bulk('7-deposit-both', 'Deposit DOIs', [invalid, valid]);
        const reloads7 = await drain();
        fact('7 deposit INVALID + VALID', {
            ...d7, reloads: reloads7,
            received: stub.since(m7).filter((l) => / POST /.test(l)).map((l) => flat(l.replace(/^\S+ /, ''), 300)),
            dois: [invalid, valid].map(doi),
            failedJobs: sql(app, "select substring(payload from 'displayName\":\"([^\"]+)') || ' | ' || split_part(exception, E'\\n', 1) from failed_jobs").split('\n').filter(Boolean).map((l) => flat(l, 300)),
            invalidRow: await viewError(invalid, '7-view-error-invalid'),
            validRow: await viewError(valid, '7-valid-row'),
        });

        // 8
        stub.setAnswer('200-failure');
        const m8 = stub.mark();
        const d8 = await bulk('8-deposit-refused', 'Deposit DOIs', [refused]);
        const reloads8 = await drain();
        fact('8 deposit REFUSED (Crossref failure_count 1)', {
            ...d8, reloads: reloads8,
            received: stub.since(m8).filter((l) => / POST /.test(l)).map((l) => flat(l.replace(/^\S+ /, ''), 300)),
            dois: [refused].map(doi),
            row: await viewError(refused, '8-view-error-refused'),
        });
        stub.setAnswer('200-ok');

        // 9
        const iniDir = path.join(REPO, '.reports/pr-13507/stub/php');
        try {
            const out = execFileSync('php', [path.join(__dirname, 'buffer.php'), app.root, app.contextPath, String(invalid), String(valid)], {
                cwd: app.root, encoding: 'utf8', env: {...process.env, PKP_CONFIG_FILE: app.configFile, PHP_INI_SCAN_DIR: `:${iniDir}`}, timeout: 120_000,
            });
            fact('9 one process: exportXML INVALID then VALID', JSON.parse(out.trim().split('\n').pop()));
        } catch (e) {
            fact('9 one process: exportXML INVALID then VALID', {failed: flat(String(e.stdout || '') + String(e.stderr || e.message), 900)});
        }
        fact('deposits received in all', deposits().length);
    } finally {
        record(`walk-${side}-${app.name}`, facts);
        await close();
        await stub.close();
    }
});
