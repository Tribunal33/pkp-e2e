// Issue report walk: docs/issues/U19-A18-oai-datestamp-never-moves-after-publication.md
// (spec U19 register A18). Takes the report's Steps on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), through the
// screens: the published item's OAI record read signed out (GetRecord), then
// as `dbarnes` its published version's "Prefix" saved on "Title & Abstract",
// the record read again; "Unpublish" ("Unpost"), the record read; "Publish"
// ("Post") again, the record read. The kit builds nothing.
//   OMP: "From Bricks to Brains" (submission 14), format 3
//   OPS: "Investigating the Shared Background …" (submission 5)
//   OJS (control): "Antimicrobial, heavy metal resistance …" (submission 17)
// Each read: the header's datestamp, deleted or not, the server log lines;
// beside it (Evidence only) the database's submissions.last_modified and the
// current publication's last_modified.
//
// Reset first:  npm run fleet-prep -- --feature issues-w05 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-w05 PROBE_AGENT=w05 node bin/probe.js all shared/playwright/checks/issues/oai-datestamp-never-moves-after-publication/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w05-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w05-3_5 PROBE_AGENT=w05 node bin/probe.js all <this file>
// Fix trial:    trial.sh beside this file.
// Facts: .reports/<feature>/w05/facts[-<run>]-<app>.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const REPO = path.resolve(__dirname, '../../../../..');
const ITEMS = {
    omp: {submission: 14, kind: 'publicationFormat', object: 3},
    ops: {submission: 5, kind: 'preprint', object: 5},
    ojs: {submission: 17, kind: 'article', object: 17},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const isOPS = app.name === 'ops';
    const item = ITEMS[app.name];
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 600)}`); };
    const q = (s) => (sql(app, s) || '').trim();
    const repoId = (fs.readFileSync(path.resolve(REPO, app.configFile), 'utf8').match(/^repository_id\s*=\s*"?([^"\n]+)"?/m) || [])[1];
    const identifier = `oai:${repoId}:${item.kind}/${item.object}`;
    const pubId = q(`select current_publication_id from submissions where submission_id=${item.submission}`);
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, identifier, publicationId: pubId});
    const db = () => q(`select 'submission '||s.last_modified||' | publication '||p.last_modified||' | status '||s.status from submissions s join publications p on p.publication_id=s.current_publication_id where s.submission_id=${item.submission}`);

    const logFile = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /PHP|Error|Exception|SQLSTATE/.test(l) && !/Accepted|Closing/.test(l))
                .map((l) => l.replace(/^\[[^\]]+\] /, '').slice(0, 400)).slice(0, 6);
        } catch { return []; }
    };

    const reader = await launch(app);   // signed out: the harvester
    const {page, close} = await launch(app);
    const wf = () => page.locator('[role="dialog"]:visible').first();
    // The side menu's address: main names the version (`publication_<id>_titleAbstract`), 3.5 does not.
    const menuKey = (key) => (app.line === 'stable-3_5_0' ? `publication_${key}` : `publication_${pubId}_${key}`);
    const wfUrl = (key) => app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${item.submission}${key ? `&workflowMenuKey=${menuKey(key)}` : ''}`);
    let n = 0;
    const getRecord = async (label) => {
        const from = logSize();
        const url = app.url(`/index.php/${app.contextPath}/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=${identifier}`);
        const r = await reader.page.goto(url);
        await idle(reader.page).catch(() => {});
        const name = `${String(++n).padStart(2, '0')}-${label}`;
        try { record(name, await screen(reader.page)); } catch (e) { record(name, {error: String(e)}); }
        await shot(reader.page, name).catch(() => {});
        const xml = await (await reader.page.request.get(reader.page.url())).text();
        const shown = (await reader.page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
        const out = {
            status: r ? r.status() : null,
            datestamp: (xml.match(/<datestamp>([^<]*)/) || [])[1] || null,
            deleted: /status="deleted"/.test(xml),
            error: (xml.match(/<error[^>]*>([^<]*)/) || [])[1] || null,
            shownDatestamp: (shown.match(/Datestamp\s*(\S+)/i) || [])[1] || null,
            db: db(),
            serverLog: logSince(from),
        };
        fact(label, out);
        return out;
    };
    const tick = () => pause(1500);   // the datestamp counts seconds: let the next action land in a later one

    try {
        // 1. The record as published.
        await getRecord('1-before');
        await tick();

        // 2–4. dbarnes saves "Prefix" on the published version's "Title & Abstract".
        await signIn(page, 'dbarnes');
        await page.goto(wfUrl()); await idle(page);
        record('02-workflow', await screen(page)); await shot(page, '02-workflow');
        await page.goto(wfUrl('titleAbstract')); await idle(page);
        const prefix = wf().locator('input[name^="prefix"]').first();
        await prefix.waitFor({state: 'visible', timeout: T});
        const s3 = await screen(page); record('03-title-abstract', s3); await shot(page, '03-title-abstract');
        const warning = ((s3.text.dialog || '').split('\n').find((l) => /has been (published|posted)/i.test(l)) || null);
        await prefix.fill('u19w05');
        const saved = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await wf().getByRole('button', {name: 'Save', exact: true}).first().click();
        const sr = await saved;
        const savedAt = new Date().toISOString();
        await idle(page);
        record('04-saved', await screen(page)); await shot(page, '04-saved');
        fact('4-save', {warning, status: sr ? sr.status() : null, at: savedAt});

        // 5. The record after the save.
        await getRecord('5-after-edit');
        await tick();

        // 6. Unpublish / Unpost.
        const verb = isOPS ? 'Unpost' : 'Unpublish';
        await page.goto(wfUrl('titleAbstract')); await idle(page);
        const ub = page.getByRole('button', {name: verb, exact: true}).first();
        await ub.waitFor({state: 'visible', timeout: T});
        await ub.click();
        const dlg = page.getByRole('dialog').filter({hasText: isOPS ? "Are you sure you don't want this to be posted?" : "Are you sure you don't want this to be published?"}).last();
        await dlg.waitFor({state: 'visible', timeout: T});
        const confirmText = (await dlg.innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 300);
        const ur = page.waitForResponse((r) => r.url().includes('/unpublish') && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await dlg.getByRole('button', {name: verb, exact: true}).last().click();
        const u = await ur;
        const unpublishedAt = new Date().toISOString();
        await dlg.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await idle(page);
        record('06-unpublished', await screen(page)); await shot(page, '06-unpublished');
        fact('6-unpublish', {confirm: confirmText, status: u ? u.status() : null, at: unpublishedAt});

        // 7. The record while unpublished.
        await getRecord('7-after-unpublish');
        await tick();

        // 8. Publish / Post again.
        await page.goto(wfUrl('titleAbstract')); await idle(page);
        // 3.5 shows the stage first, then the form: press only once the form is there.
        await wf().locator('input[name^="prefix"]').first().waitFor({state: 'visible', timeout: T});
        // main: the workflow's right-hand controls; 3.5: the version's own bar above the form.
        const pbName = isOPS ? /^(Post|Post the preprint)$/ : /^(Schedule For Publication|Publish)$/;
        const right = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: pbName}).filter({visible: true});
        const pb = (await right.count()) ? right.first() : wf().getByRole('button', {name: pbName}).filter({visible: true}).last();
        await pb.waitFor({state: 'visible', timeout: T});
        const pbText = (await pb.innerText()).trim();
        await pb.click(); await idle(page);
        // The dialog the press opens: OJS main "Review Publishing Details", the others the question itself.
        const panel = page.getByRole('dialog').filter({hasText: /Review Publishing Details|requirements have been met|Are you sure you want to (publish|post) this\?/}).last();
        await panel.getByRole('button', {name: /^(Confirm|Publish|Post)$/}).last().waitFor({state: 'visible', timeout: T})
            .catch(async (e) => { record('08-publish-dialog-missing', await screen(page)); await shot(page, '08-publish-dialog-missing'); throw e; });
        const panelText = (await panel.innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 600);
        record('08-publish-dialog', await screen(page)); await shot(page, '08-publish-dialog');
        let answered = false;
        const pr = page.waitForResponse((r) => /\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T})
            .then((r) => { answered = true; return r; }).catch(() => null);
        // OJS asks once more in a second dialog; OMP's and OPS's first dialog is already the question.
        const confirms = page.getByRole('dialog').filter({hasText: /Are you sure you want to (publish|post) this\?/});
        const before = await confirms.count();
        await panel.getByRole('button', {name: /^(Confirm|Publish|Post)$/}).last().click();
        const conf = confirms.last();
        for (let t = Date.now(); !answered && Date.now() - t < T && (await confirms.count()) <= before;) await pause(200);
        let confirm2 = null;
        if (!answered && (await confirms.count()) > before) {
            confirm2 = (await conf.innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 200);
            await conf.getByRole('button', {name: /^(Publish|Post)$/}).last().click();
        }
        const p = await pr;
        const publishedAt = new Date().toISOString();
        await idle(page);
        record('08-published', await screen(page)); await shot(page, '08-published');
        fact('8-publish', {button: pbText, panel: panelText, confirm: confirm2, status: p ? p.status() : null, at: publishedAt});

        // 9. The record after it is back.
        await getRecord('9-after-publish-again');
    } finally {
        record('facts', facts);
        await reader.close();
        await close();
    }
});
