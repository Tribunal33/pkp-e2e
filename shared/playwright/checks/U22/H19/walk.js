// U22 claim check H19 (incidentals row, housekeeping 2026-10-19): deleting an unfinished submission.
// The row: DELETE /api/v1/submissions/{id} of an unfinished submission answers 500 after deleting
// (OJS by its author, OPS by an admin; lib/pkp classes/publication/Repository.php:937).
// Drives, per app, on PKP's default dataset (a dataset fleet; dataset.md users):
//   A  the author starts a draft and deletes it from My Submissions (More Actions › "Delete
//      Incomplete Submissions" › tick › "Confirm"): the screen's own `_submissions` DELETE, the page,
//      the list after a reload, the database rows, the server log;
//   B  the author starts a draft, ticks it in selection mode and leaves the page (the dialogs on the
//      way out), then sends DELETE submissions/{id} (the public API, which no screen calls) in the
//      author's session;
//   C  the author starts a draft, the site admin sends DELETE submissions/{id};
//   D  the author starts a draft, the manager deletes it from the editorial dashboard's
//      "Delete Incomplete Submissions" (the OPS route around OPS2);
//   E  the other end of the "unfinished" axis: the site admin sends DELETE submissions/{id} for a
//      dataset submission that is submitted and never published;
//   F  and for a published one (a control). E and F delete dataset submissions: reset the fleet after.
// main:  PROBE_FEATURE=issues-cc19d PKP_E2E_DATASET=1 PROBE_AGENT=cc19d PROBE_RUN=r1 \
//          bin/app-lock.sh shared ojs -- node bin/probe.js ojs shared/playwright/checks/U22/H19/walk.js
// 3.5:   PKP_E2E_LINE=stable-3_5_0 PROBE_FEATURE=issues-cc19d-3_5 PKP_E2E_DATASET=1 PROBE_AGENT=cc19d PROBE_RUN=s1 \
//          node bin/probe.js all shared/playwright/checks/U22/H19/walk.js
// PHASES=A,B,C,D narrows. Each phase starts its own draft, so the fleet needs no reset between runs.
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, idle, serverLog, sql, tag} = require('../../../probe');
const H = require('./lib.js');

const PHASES = (process.env.PHASES || 'A,B,C,D,E,F').split(',');
const RUN = process.env.PROBE_RUN || 'r0';

forEachApp(async (app) => {
    const log = serverLog(app);
    const facts = {app: app.name, line: app.line || 'main', run: RUN, phases: {}};
    const author = H.AUTHOR[app.name];
    const {page, close} = await launch(app);
    const deletes = H.watchDeletes(page);
    const rec = (phase) => (name, data) => record(`h19-${phase}-${name}`, data);
    const draft = async (phase) => {
        const title = `${tag('h19')} ${phase} draft`;
        await signIn(page, author, {contextPath: app.contextPath});
        const id = await H.beginSubmission(page, app, {title, section: H.SECTION[app.name]});
        rec(phase)('wizard', await screen(page));
        return {title, id};
    };
    try {
        if (PHASES.includes('A')) {
            const f = (facts.phases.A = {who: author, route: 'My Submissions › Delete Incomplete Submissions'});
            Object.assign(f, await draft('A'));
            await H.openMySubmissions(page, app);
            const land = await screen(page);
            rec('A')('my-submissions', land);
            await shot(page, `h19-A-my-submissions`);
            f.listedBefore = await H.listed(page, f.title);
            await loc(page, 'My Submissions: the "More Actions" button above the list', page.getByRole('button', {name: 'More Actions'}).first());
            f.rowsBefore = H.rows(app, f.id);
            const from = log.mark();
            Object.assign(f, await H.bulkDelete(page, f.title, rec('A')));
            await shot(page, `h19-A-after-confirm`);
            f.serverLog = log.since(from).slice(0, 20);
            f.rowsAfter = H.rows(app, f.id);
            await H.openMySubmissions(page, app);
            f.listedAfterReload = await H.listed(page, f.title);
            rec('A')('after-reload', await screen(page));
        }
        if (PHASES.includes('B')) {
            const f = (facts.phases.B = {who: author, route: 'DELETE submissions/{id} in the author session'});
            Object.assign(f, await draft('B'));
            // leave selection mode by navigating away with a tick set: what asks on the way out
            await H.openMySubmissions(page, app);
            await page.getByRole('button', {name: 'More Actions'}).first().click({timeout: H.T});
            await page.getByRole('menuitem', {name: 'Delete Incomplete Submissions'}).click({timeout: H.T});
            const box = H.rowBox(page, f.title);
            if (await box.waitFor({state: 'attached', timeout: 10_000}).then(() => true).catch(() => false)) {
                await box.check({timeout: H.T, force: true});
                f.leaveWithTick = {dialogs: []};
                const onDialog = (d) => { f.leaveWithTick.dialogs.push({type: d.type(), message: d.message()}); d.accept().catch(() => {}); };
                page.on('dialog', onDialog);
                await H.openMySubmissions(page, app);
                page.off('dialog', onDialog);
                f.leaveWithTick.selectionModeAfter = await page.getByRole('button', {name: 'Delete Incomplete Submissions', exact: true}).count();
            }
            rec('B')('my-submissions', await screen(page));
            f.rowsBefore = H.rows(app, f.id);
            const from = log.mark();
            f.api = await H.apiDelete(page, f.id);
            f.serverLog = log.since(from).slice(0, 20);
            f.rowsAfter = H.rows(app, f.id);
            await H.openMySubmissions(page, app);
            f.listedAfterReload = await H.listed(page, f.title);
            rec('B')('after-reload', await screen(page));
        }
        if (PHASES.includes('C')) {
            const f = (facts.phases.C = {who: H.ADMIN, route: 'DELETE submissions/{id} in the admin session'});
            Object.assign(f, await draft('C'));
            await signIn(page, H.ADMIN, {contextPath: app.contextPath});
            await H.openEditorial(page, app);
            rec('C')('editorial', await screen(page));
            f.rowsBefore = H.rows(app, f.id);
            const from = log.mark();
            f.api = await H.apiDelete(page, f.id);
            f.serverLog = log.since(from).slice(0, 20);
            f.rowsAfter = H.rows(app, f.id);
            await signIn(page, author, {contextPath: app.contextPath});
            await H.openMySubmissions(page, app);
            f.listedAfterReloadForAuthor = await H.listed(page, f.title);
            rec('C')('author-after', await screen(page));
        }
        if (PHASES.includes('D')) {
            const f = (facts.phases.D = {who: H.MANAGER, route: 'editorial dashboard › Delete Incomplete Submissions'});
            Object.assign(f, await draft('D'));
            await signIn(page, H.MANAGER, {contextPath: app.contextPath});
            await H.openEditorial(page, app, 'active');
            const land = await screen(page);
            rec('D')('editorial-active', land);
            f.listedBefore = await H.listed(page, f.title);
            f.rowsBefore = H.rows(app, f.id);
            if (f.listedBefore) {
                const from = log.mark();
                Object.assign(f, await H.bulkDelete(page, f.title, rec('D')));
                f.serverLog = log.since(from).slice(0, 20);
                f.rowsAfter = H.rows(app, f.id);
                await H.openEditorial(page, app, 'active');
                f.listedAfterReload = await H.listed(page, f.title);
                rec('D')('after-reload', await screen(page));
            }
            await signOut(page).catch(() => {});
        }
        // E, F: an existing dataset submission, the newest of its kind still there (each run takes another)
        const pick = {
            E: `select s.submission_id from submissions s where s.submission_progress = '' and s.status = 1 and not exists (select 1 from publications p where p.submission_id = s.submission_id and p.status = 3) order by s.submission_id desc limit 1`,
            F: `select s.submission_id from submissions s where s.status = 3 order by s.submission_id desc limit 1`,
        };
        for (const phase of ['E', 'F'].filter((x) => PHASES.includes(x))) {
            const id = Number(sql(app, pick[phase]) || 0);
            const f = (facts.phases[phase] = {who: H.ADMIN, route: `DELETE submissions/{id} in the admin session, ${phase === 'E' ? 'submitted, never published' : 'published'}`, id});
            if (!id) continue;
            f.status = sql(app, `select status || '|' || coalesce(submission_progress, '') from submissions where submission_id = ${id}`);
            f.publications = sql(app, `select string_agg(status::text, ',') from publications where submission_id = ${id}`);
            await signIn(page, H.ADMIN, {contextPath: app.contextPath});
            await H.openEditorial(page, app);
            f.rowsBefore = H.rows(app, id);
            const from = log.mark();
            f.api = await H.apiDelete(page, id);
            f.serverLog = log.since(from).slice(0, 20);
            f.rowsAfter = H.rows(app, id);
            await page.goto(app.url(`/index.php/${app.contextPath}${H.L(app)}/dashboard/editorial?workflowSubmissionId=${id}`));
            await idle(page);
            rec(phase)('workflow-after', await screen(page));
        }
    } finally {
        facts.deletes = deletes;
        record(process.env.PHASES ? `h19-facts-${PHASES.join('')}` : 'h19-facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
