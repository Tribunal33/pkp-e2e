// U61 claim check K3, extra legs: (1) a job a journal put on the queue shows
// on the Jobs page next to the testing queue's (Rule 13 "whichever journal
// or feature"); (2) the page a gone failed job's Details address opens,
// beside the application's ordinary not-found pages (Rule 18).
// Leaves no job behind: the journal's own jobs are removed by id.
// Run: PROBE_FEATURE=U61 PROBE_AGENT=ccK3 node bin/probe.js <app|all> shared/playwright/checks/U61/K3/k3-extra.js
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, idle, tag} = require('../../../probe');

const sql = (app, q) => execFileSync('psql', ['-d', `${app.name}_test`, '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim();
const flat = (s, n = 400) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

forEachApp(async (app) => {
    const out = {};
    const {page, close} = await launch(app);
    try {
        const maxJ = Number(sql(app, 'select coalesce(max(id),0) from jobs'));
        const J = tag('u61k3x');
        await app.api.createContext({tag: J, context: {name: `U61 K3 extra ${J}`, acronym: 'K3X'}, users: [{username: `${J}au`, roles: ['author']}]});
        await app.api.createSubmission({tag: J, context: J, submitter: `${J}au`, decisions: ['accept']});
        const mine = sql(app, `select string_agg(id::text, ',') from jobs where id > ${maxJ}`);
        out.journalJobs = sql(app, `select string_agg(id || ':' || queue || ':' || (payload::json->>'displayName'), ' ; ') from jobs where id > ${maxJ}`);
        const test = await app.api.createJob({state: 'queued'});
        await signIn(page, 'admin');
        await page.goto(app.url('/index.php/index/en/admin/jobs'));
        await idle(page);
        const s = await screen(page);
        record('extra-jobs', s);
        await shot(page, 'extra-jobs');
        out.jobsRows = await page.locator('main table tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.trim()).join(' | ')));
        out.testJob = test.id;
        if (mine) sql(app, `delete from jobs where id in (${mine})`);
        sql(app, `delete from jobs where id = ${test.id}`);
        for (const [k, p] of [['goneDetails', '/index.php/index/en/admin/failedJobDetails/999999'], ['noSuchOp', '/index.php/index/en/admin/noSuchPage'], ['noSuchArticle', `/index.php/${app.contextPath}/en/${app.name === 'omp' ? 'catalog/book' : app.name === 'ops' ? 'preprint/view' : 'article/view'}/999999`]]) {
            const r = await page.goto(app.url(p));
            await idle(page);
            const sx = await screen(page);
            record(`extra-${k}`, sx);
            await shot(page, `extra-${k}`);
            out[k] = {status: r && r.status(), title: sx.title, text: flat(sx.text.main, 200)};
        }
        out.left = sql(app, "select count(*) || ' jobs, ' || (select count(*) from failed_jobs) || ' failed' from jobs");
    } catch (e) {
        out.error = String(e.stack || e).slice(0, 1000);
    } finally {
        record('k3-extra', out);
        console.log(JSON.stringify(out, null, 1));
        await close();
    }
});
