// U14 claim check C14 (housekeeping 2026-10-13, incidentals row 24): the comments
// API's "delete every report of a comment" route, DELETE {ctx}/api/v1/comments/{id}/reports.
// No screen sends it (ui-library's moderator store deletes one report at a time:
// DELETE …/reports/{reportId}), so it is checked directly as the Frame allows: as the
// scratch journal's own Journal Manager, from a page of the journal with the page's
// CSRF token, on scratch comments of tag u14c14. Four approved comments:
//   two  — two reports (the row's case)
//   one  — one report (control on the report count)
//   none — no report (the other end of the axis)
//   ctl  — one report, deleted through the per-report route the screens send (control on the route)
// For each: GET …/reports before, the DELETE, GET …/reports after, the DB rows of the
// reports and of their tasks, the server log since. Then the Comments page's Reported tab,
// the comment panel of "two" and the Tasks panel, each through screen().
const path = require('path');
const ROOT = path.resolve(__dirname, '../../../../..');
const {forEachApp, launch, signIn, screen, shot, record, idle, tag, note, sql, serverLog} = require('../../../probe');

const ASSOC_COMMENT_REPORT = 0x0100011;

forEachApp(async (app) => {
    const {CommentsPage, REPORT_TASK, COMMENT_TASK} = require(path.join(ROOT, `apps/${app.name}/playwright/pages/ReaderCommentsPages.js`));
    const {TasksPanel} = require(path.join(ROOT, 'shared/playwright/pages/NotificationsPages.js'));
    const {expect} = require('@playwright/test');
    const facts = {app: app.name, run: process.env.PROBE_RUN, startedAt: new Date().toISOString(), cases: {}, screens: {}};

    const T = tag('u14c14');
    const u = (k, roles) => ({username: `${T}${k}`, givenName: k, familyName: 'Probe', email: `${T}${k}@mail.test`, roles});
    await app.api.createContext({tag: T, enablePublicComments: true,
        users: [u('mg', ['manager']), u('au', ['author']), u('ra', ['reader']), u('rb', ['reader']), u('rc', ['reader'])]});
    const rep = (who, n) => ({user: `${T}${who}`, note: `C14 report ${n} ${T}.`});
    const sub = await app.api.createSubmission({tag: `${T}s`, context: T, submitter: `${T}au`, title: `Article ${T}`, published: true,
        userComments: [
            {user: `${T}ra`, text: `C14 two ${T}.`, approved: true, reports: [rep('rb', 'two-a'), rep('rc', 'two-b')]},
            {user: `${T}ra`, text: `C14 one ${T}.`, approved: true, reports: [rep('rb', 'one-a')]},
            {user: `${T}ra`, text: `C14 none ${T}.`, approved: true},
            {user: `${T}ra`, text: `C14 ctl ${T}.`, approved: true, reports: [rep('rb', 'ctl-a')]},
        ]});
    const [two, one, none, ctl] = sub.userComments;
    facts.seed = sub.userComments;

    const dbRows = (ids) => ids.length ? {
        reports: Number(sql(app, `select count(*) from user_comment_reports where user_comment_report_id in (${ids.join(',')})`)),
        tasks: Number(sql(app, `select count(*) from notifications where assoc_type=${ASSOC_COMMENT_REPORT} and assoc_id in (${ids.join(',')})`)),
    } : {reports: 0, tasks: 0};

    const {page, close} = await launch(app);
    const api = (p) => app.url(`/index.php/${T}/api/v1/${p}`);
    async function call(method, p) {
        return page.evaluate(async ({url, method}) => {
            const token = window.pkp && pkp.currentUser && pkp.currentUser.csrfToken;
            const r = await fetch(url, {method, headers: {'X-Csrf-Token': token || '', Accept: 'application/json'}});
            const text = await r.text();
            let json = null;
            try { json = JSON.parse(text); } catch (_) { /* not json */ }
            return {status: r.status, json, text: text.slice(0, 800), hadToken: !!token};
        }, {url: api(p), method});
    }
    const reportIds = (res) => (res.json && Array.isArray(res.json.data)) ? res.json.data.map((r) => r.id) : null;

    try {
        await signIn(page, `${T}mg`, {contextPath: T});
        const comments = new CommentsPage(page, T);
        const tasks = new TasksPanel(page);
        const readTasks = async (label) => {
            await page.goto(app.url(`/index.php/${T}/dashboard/editorial`));
            await expect(tasks.bell()).toBeVisible({timeout: 30_000});
            await tasks.open();
            await idle(page);
            facts.screens[`tasks-${label}`] = await screen(page);
            facts[`tasks-${label}`] = {report: await tasks.rowsOpening(REPORT_TASK).count(), comment: await tasks.rowsOpening(COMMENT_TASK).count()};
            await shot(page, `c14-tasks-${label}`);
            await tasks.close();
        };
        await readTasks('before');

        await comments.goto();
        await comments.openTab('Reported');
        facts.screens['reported-before'] = await screen(page);
        facts['reported-before'] = {two: await comments.row(`C14 two ${T}.`).count(), one: await comments.row(`C14 one ${T}.`).count(), ctl: await comments.row(`C14 ctl ${T}.`).count()};

        const log = serverLog(app);
        for (const [name, c] of [['two', two], ['one', one], ['none', none], ['ctl', ctl]]) {
            const k = {comment: c.id, seededReports: c.reports};
            k.dbBefore = dbRows(c.reports);
            const g0 = await call('GET', `comments/${c.id}/reports`);
            k.getBefore = {status: g0.status, ids: reportIds(g0), total: g0.json && g0.json.total};
            const from = log.mark();
            const d = name === 'ctl'
                ? await call('DELETE', `comments/${c.id}/reports/${c.reports[0]}`)
                : await call('DELETE', `comments/${c.id}/reports`);
            k.delete = {route: name === 'ctl' ? 'DELETE comments/{id}/reports/{reportId}' : 'DELETE comments/{id}/reports', status: d.status, body: d.json || d.text, hadToken: d.hadToken};
            k.serverLog = log.since(from);
            const g1 = await call('GET', `comments/${c.id}/reports`);
            k.getAfter = {status: g1.status, ids: reportIds(g1), total: g1.json && g1.json.total};
            k.dbAfter = dbRows(c.reports);
            facts.cases[name] = k;
            console.log(app.name, name, JSON.stringify({status: d.status, before: k.dbBefore, after: k.dbAfter, getAfter: k.getAfter, log: (k.serverLog || []).length}));
        }

        // The screens after: Reported tab (same page, after a reload), the panel of "two", the Tasks panel.
        await comments.goto();
        await comments.openTab('Reported');
        facts.screens['reported-after'] = await screen(page);
        facts['reported-after'] = {two: await comments.row(`C14 two ${T}.`).count(), one: await comments.row(`C14 one ${T}.`).count(), ctl: await comments.row(`C14 ctl ${T}.`).count()};
        await shot(page, 'c14-reported-after');
        await comments.goto(`?commentId=${two.id}`);
        await expect(comments.commentPanel()).toBeVisible({timeout: 30_000});
        await expect(comments.reportsTable()).toBeVisible({timeout: 30_000});
        await idle(page);
        facts.screens['panel-two-after'] = await screen(page);
        facts['panel-two-after'] = {reportRows: await comments.reportRows().count(), noReports: await comments.noReports().count()};
        await shot(page, 'c14-panel-two-after');
        await readTasks('after');

        record('c14-delete-reports', facts);
        note(`ccC14 ${app.name} ${process.env.PROBE_RUN || ''}: DELETE comments/{id}/reports as the scratch JM from a page with its CSRF token: two reports ${facts.cases.two.delete.status}, one ${facts.cases.one.delete.status}, none ${facts.cases.none.delete.status}; per-report control ${facts.cases.ctl.delete.status}. Reports DB rows two ${facts.cases.two.dbBefore.reports}->${facts.cases.two.dbAfter.reports}, one ${facts.cases.one.dbBefore.reports}->${facts.cases.one.dbAfter.reports}. Seeded reports raise their tasks (createSubmission userComments[].reports).`);
    } finally {
        await close();
    }
});
