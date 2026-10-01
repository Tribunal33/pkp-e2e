// Issue report docs/issues/U45-OJS2-datacite-issue-export-fails.md (U45 OJS2):
// with DataCite chosen, "Export DOIs" and "Deposit All" on a published issue
// fail on the server. Takes the report's Steps through the screens on OJS,
// on a dataset fleet freshly reset to PKP's default test dataset, as `rvaca`
// (Journal manager of `publicknowledge`):
//   1-4. Plugins: enable "DataCite Manager Plugin"; DOIs › Registration:
//        "DataCite", "Username (symbol)" u45ir2, Save; DOIs › Setup: prefix
//        10.1234, tick "Issues", Save
//   5-6. DOIs page: "Assign DOIs" on issue 1 "Vol. 1 No. 2 (2014)" and on
//        article 1 "Signalling Theory Dividends"
//   7.   "Export DOIs" on the issue (the finding)
//   8.   "Export DOIs" on the article (the control, and the neighbour the
//        fix must leave alone)
//   9.   "Deposit All", then reloads until the queued deposits have run;
//        reads the failed jobs (read only)
// Every export's request, its answer, the download (if any) and the server
// log lines it wrote are recorded; the first lines of a downloaded XML are
// kept so the fix check can show the issue's record.
// Run (reset the fleet first):
//   npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
//   PROBE_FEATURE=issues-ir2 PROBE_AGENT=ir2 node bin/probe.js ojs shared/playwright/checks/issues/datacite-issue-export-fails/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-ir2-3_5.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, record, idle, sql, outFile} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // DataCite issue DOIs exist on OJS only
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {DoiSettings, DoisPage, recordNotices} = require('../../../pages/DoisPages.js');
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1200)}`);
    };
    const logFile = path.resolve(__dirname, '../../../../..', 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => (fs.existsSync(logFile) ? fs.statSync(logFile).size : 0);
    const logSince = (from) => {
        if (!fs.existsSync(logFile)) return [`no log at ${logFile}`];
        const buf = fs.readFileSync(logFile).subarray(from).toString('utf8');
        return buf.split('\n').filter((l) => /error|exception|warning/i.test(l) && !/\[200\]|\[30\d\]/.test(l)).map((l) => flat(l, 500)).slice(0, 12);
    };

    const {page, close} = await launch(app);
    try {
        await recordNotices(page);
        await signIn(page, 'rvaca');
        const settings = new DoiSettings(page, ctx);
        const dois = new DoisPage(page, ctx);

        // FROM=9wait resumes a walk whose "Deposit All" was pressed: only the wait and the reads that follow it.
        const resume = process.env.FROM === '9wait';
        const issueRow = dois.row(1, 'issue');
        const articleRow = dois.row(1);
        let failedBefore = 0;
        let from = logSize();
        if (!resume) {
            // 2. Plugins: enable DataCite
            await settings.gotoPlugins('dataciteplugin');
            const wasOn = await settings.pluginBox('dataciteplugin').isChecked();
            if (!wasOn) await settings.setPluginEnabled('dataciteplugin', true);
            fact('2 datacite plugin', {wasOn, nowOn: await settings.pluginBox('dataciteplugin').isChecked()});

            // 3. Registration: DataCite, username, Save
            await settings.goto('Registration');
            fact('3 agency before', await settings.agencyState());
            await settings.chooseAgency('DataCite');
            await settings.field('username').fill('u45ir2');
            const regSave = await settings.save(settings.registration);
            record('03-registration-saved', await screen(page));
            fact('3 registration save', {status: regSave.status()});

            // 4. Setup: prefix, "Issues", Save
            await settings.goto('Setup');
            fact('4 kinds before', await settings.kinds());
            await settings.prefixBox().fill('10.1234');
            await settings.kindBox('Issues').check();
            const setupSave = await settings.save(settings.setup);
            await settings.goto('Setup');
            fact('4 setup saved', {status: setupSave.status(), prefix: await settings.prefixBox().inputValue(), kinds: await settings.kinds()});

            // 5. Issues tab: Assign DOIs on issue 1
            await dois.goto();
            fact('5 tabs', (await dois.tabs().allInnerTexts()).map((t) => flat(t)));
            await dois.openTab('Issues');
            await issueRow.waitFor({timeout: T});
            fact('5 issue row', {name: flat(await dois.rowLink(issueRow).innerText()), badge: flat(await dois.rowBadge(issueRow).innerText())});
            const assignIssue = await dois.runBulk('Assign DOIs', [1], {type: 'issue', list: 'issues'});
            await dois.expand(issueRow, 1);
            fact('5 issue assigned', {status: assignIssue.status(), doi: await dois.doiBox(issueRow, 'Issue').inputValue(), badge: flat(await dois.rowBadge(issueRow).innerText())});
            await dois.collapse(issueRow, 1);

            // 6. Articles tab: Assign DOIs on article 1
            await dois.openTab('Articles');
            await articleRow.waitFor({timeout: T});
            const assignArticle = await dois.runBulk('Assign DOIs', [1]);
            fact('6 article assigned', {status: assignArticle.status(), name: flat(await dois.rowLink(articleRow).innerText()), badge: flat(await dois.rowBadge(articleRow).innerText())});

            // 7 and 8. Export DOIs: the issue, then the article
            const exportOne = async (label, tabName, id, type, list) => {
                await dois.openTab(tabName);
                const row = dois.row(id, type);
                await dois.rowCheckbox(row).check();
                const dialog = await dois.chooseBulkAction('Export DOIs');
                const question = flat(await dialog.innerText());
                const from = logSize();
                const answered = page.waitForResponse((r) => /\/api\/v1\/dois\/[a-z]+\/export/.test(r.url()) && r.request().method() === 'POST', {timeout: 120_000});
                const downloaded = page.waitForEvent('download', {timeout: 25_000}).catch(() => null);
                await dialog.getByRole('button', {name: 'Export DOIs', exact: true}).click();
                const res = await answered;
                const body = flat(await res.text().catch(() => ''), 600);
                const dl = await downloaded;
                let file = null;
                if (dl) {
                    const to = outFile(`${label}-download.xml`);
                    await dl.saveAs(to);
                    const xml = fs.readFileSync(to, 'utf8');
                    file = {name: dl.suggestedFilename(), saved: path.relative(process.cwd(), to), bytes: xml.length, head: flat(xml, 700),
                        identifier: (xml.match(/<identifier[^>]*>([^<]*)<\/identifier>/) || [])[1] || null,
                        resourceType: (xml.match(/<resourceType[^>]*>[^<]*<\/resourceType>|<resourceType[^>]*\/>/) || [])[0] || null,
                        fundingReferences: /fundingReferences/.test(xml)};
                }
                await sleep(1500);
                await idle(page);
                const s = await screen(page);
                record(`${label}-after-export`, s);
                const out = {url: res.url().replace(/^https?:\/\/[^/]+/, ''), status: res.status(), body, question, download: file,
                    windowStillOpen: await dialog.isVisible(), notices: s.notices, log: logSince(from)};
                fact(label, out);
                // untick for the next action
                if (await dois.rowCheckbox(row).isChecked()) await dois.rowCheckbox(row).uncheck();
                return out;
            };
            await exportOne('7-issue-export', 'Issues', 1, 'issue', 'issues');
            await exportOne('8-article-export', 'Articles', 1, 'submission', 'submissions');

            // 9. Deposit All, then reload until the queued jobs have run
            await dois.openTab('Issues');
            const jobsBefore = sql(app, 'select count(*) from jobs');
            failedBefore = Number(sql(app, 'select count(*) from failed_jobs') || 0);
            await dois.depositAllButton().click();
            const dAll = dois.dialog('Deposit all DOIs');
            await dAll.waitFor({timeout: T});
            const dAllText = flat(await dAll.innerText());
            from = logSize();
            const answered = page.waitForResponse((r) => /\/api\/v1\/dois\/depositAll/.test(r.url()), {timeout: T});
            await dAll.getByRole('button', {name: 'Deposit all DOIs', exact: true}).click();
            const dres = await answered;
            await sleep(1500);
            await idle(page);
            const sAfter = await screen(page);
            record('9-after-deposit-all', sAfter);
            fact('9 deposit all', {status: dres.status(), window: dAllText, notices: sAfter.notices, jobsBefore,
                queued: sql(app, `select substring(payload from 'displayName":"([^"]+)') from jobs order by id`).split('\n').filter(Boolean)});
        }
        let failed = [];
        for (let i = 0; i < 24; i++) {
            await sleep(5000);
            await dois.goto({list: 'submissions'});
            const left = Number(sql(app, 'select count(*) from jobs') || 0);
            failed = sql(app, `select substring(payload from 'displayName":"([^"]+)') || ' | ' || split_part(exception, E'\\n', 1) from failed_jobs order by id offset ${failedBefore}`).split('\n').filter(Boolean);
            if (left === 0) break;
        }
        await dois.openTab('Issues');
        await dois.expand(issueRow, 1);
        const sIssue = await screen(page);
        record('9-issues-tab-after-jobs', sIssue);
        const issueAfter = {badge: flat(await dois.rowBadge(issueRow).innerText()), panel: flat(await dois.agencyPanel(issueRow).innerText().catch(() => null))};
        await dois.openTab('Articles');
        await dois.expand(articleRow, 1);
        const articleAfter = {badge: flat(await dois.rowBadge(articleRow).innerText()), panel: flat(await dois.agencyPanel(articleRow).innerText().catch(() => null))};
        record('9-articles-tab-after-jobs', await screen(page));
        fact('9 after jobs', {jobsLeft: sql(app, 'select count(*) from jobs'), failed: failed.map((l) => flat(l, 400)), issue: issueAfter, article: articleAfter,
            doiRows: sql(app, "select doi_id, doi, status from dois order by doi_id").split('\n'), log: logSince(from)});
    } finally {
        record('facts', facts);
        await close();
    }
});
