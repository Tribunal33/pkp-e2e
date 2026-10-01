// sync rrupg (2026-10-01): the 3.5 -> main upgrade path. pkp-lib 07b19290b4 (#12994) added
// I12994_CompetingInterestsDeclared, which no app's upgrade.xml names, so an upgraded install has no
// review_assignments.competing_interests_declared; aff80d393e (#11699) left edit_tasks.status behind.
// Drives, in scratch contexts only (publicknowledge untouched):
//   S1 a reviewer accepts (step 1) in a context with the "Competing Interests" guidance
//   S2 a reviewer declines in that context
//   S3 the editor's "Modify Review" of a completed review after the guidance is set
//   S4 a seeded discussion and task (edit_tasks), listed on the panel and the tasks API
//   C  control: a reviewer accepts in a context without the guidance
// Run on the dataset fleet (upgraded) and, as the yardstick, on the campaign fleet (fresh main):
//   PROBE_FEATURE=sync-ds PROBE_AGENT=rrupg PROBE_RUN=ds node bin/probe.js ojs shared/playwright/checks/sync/upgrade-3_5/ci-declared.js
//   PROBE_FEATURE=sync    PROBE_AGENT=rrupg PROBE_RUN=fresh node bin/probe.js ojs shared/playwright/checks/sync/upgrade-3_5/ci-declared.js
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle, tag, sql} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1200) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const POLICY = 'rrupg competing interests policy: disclose any relationship with the authors.';
const T = 30000;

forEachApp(async (app) => {
    const facts = {};
    const fact = (k, v) => { facts[k] = v; record('facts', {[k]: v}, {merge: true}); console.log(`[${k}]`, JSON.stringify(v).slice(0, 900)); };
    const q = (s) => { try { return sql(app, s); } catch (e) { return `ERROR ${flat(e.message, 300)}`; } };
    fact('schema', {
        ciDeclaredColumn: q("select count(*) from information_schema.columns where table_name='review_assignments' and column_name='competing_interests_declared'"),
        editTasksStatusColumn: q("select count(*) from information_schema.columns where table_name='edit_tasks' and column_name='status'"),
        dataset: app.dataset, baseURL: app.baseURL, db: app.db,
    });

    const t = tag('rrupg');
    const U = (k) => `${t}${k}`;
    const person = (k, roles, gn, fn) => ({username: U(k), roles, givenName: gn, familyName: fn});
    const P = await app.api.createContext({
        tag: t, context: {name: `rrupg P ${t}`},
        users: [person('ed', ['editor'], 'Edda', 'Chief'), person('au', ['author'], 'Ada', 'Author'),
            person('ra', ['externalReviewer'], 'Rita', 'Accepter'), person('rd', ['externalReviewer'], 'Dirk', 'Decliner')],
        review: {competingInterests: {en: POLICY}},
    });
    const N = await app.api.createContext({
        tag: `${t}n`, context: {name: `rrupg N ${t}`},
        users: [person('edn', ['editor'], 'Ned', 'Nchief'), person('aun', ['author'], 'Nia', 'Nauthor'),
            person('rn', ['externalReviewer'], 'Noel', 'Completed'), person('rc', ['externalReviewer'], 'Cara', 'Control')],
    });
    const sP = await app.api.createSubmission({tag: `${t}s`, context: P.path, submitter: U('au'), title: `rrupg S ${t}`, decisions: ['sendExternalReview'],
        reviewRounds: [{reviewers: [{username: U('ra'), status: 'invited'}, {username: U('rd'), status: 'invited'}]}],
        tasks: [{title: `rrupg discussion ${t}`, creator: U('ed'), participants: [U('ed'), U('au')]},
            {title: `rrupg task ${t}`, type: 'task', creator: U('ed'), participants: [U('ed')], owner: U('ed'), dateDue: '2030-01-15'}]});
    const sN = await app.api.createSubmission({tag: `${t}sn`, context: N.path, submitter: U('aun'), title: `rrupg SN ${t}`, decisions: ['sendExternalReview'],
        reviewRounds: [{reviewers: [{username: U('rn'), status: 'completed', comments: 'rrupg seeded comments.'}, {username: U('rc'), status: 'invited'}]}]});
    fact('seed', {P: P.path, N: N.path, sP: {id: sP.submissionId, rounds: sP.reviewRounds, ra: sP.reviewAssignments, tasks: sP.tasks}, sN: {id: sN.submissionId, rounds: sN.reviewRounds, ra: sN.reviewAssignments}});

    const {page, close} = await launch(app);
    const bad = [];
    page.on('response', (r) => { if (r.status() >= 500) bad.push({status: r.status(), method: r.request().method(), url: r.url().replace(/^https?:\/\/[^/]+/, '')}); });
    page.on('dialog', async (d) => { await d.accept().catch(() => {}); });
    const since = (n) => bad.slice(n);
    let snapN = 0;
    const snap = async (label) => { let s; try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; } const name = `${process.env.PROBE_RUN || 'r'}-${String(++snapN).padStart(2, '0')}-${label}`; record(name, s); await shot(page, name).catch(() => {}); return {name, s}; };
    const raRow = (ctxSub, user) => q(`select ra.review_id, ra.date_confirmed is not null, ra.declined, ra.step, coalesce(ra.competing_interests,'(null)') from review_assignments ra join users u on u.user_id=ra.reviewer_id where ra.submission_id=${ctxSub} and u.username='${user}'`);
    const {ReviewWizardPage} = require(path.resolve(__dirname, '../../../pages/ReviewerPages.js'));

    async function step1(who, ctx, subId, label, mode) {
        const n0 = bad.length;
        await signIn(page, U(who), {contextPath: ctx}); await idle(page);
        const w = new ReviewWizardPage(page, ctx, {});
        await w.goto(subId); await idle(page);
        await w.expectStep(1).catch(() => {});
        const radios = await page.locator('input[name="competingInterestOption"]').count();
        const out = {radios};
        if (mode === 'accept') {
            if (await w.privacyBox.count()) await w.privacyBox.check();
            await w.acceptButton.click();
            const ok = await w.expectStep(2).then(() => true).catch(() => false);
            out.reachedStep2 = ok;
        } else {
            await w.openDecline();
            const r = await w.confirmDecline().then(() => 'left the wizard').catch((e) => `stayed: ${flat(e.message, 160)}`);
            out.decline = r;
        }
        await sleep(1500);
        const s = await snap(label);
        out.url = s.s.url; out.mainText = flat(s.s.text && s.s.text.main, 500); out.notices = s.s.notices; out.snap = s.name;
        out.http500 = since(n0);
        out.db = raRow(subId, U(who));
        return out;
    }

    try {
        fact('C control accept, no guidance', await step1('rc', N.path, sN.submissionId, 'c-accept', 'accept'));
        fact('S1 accept with guidance', await step1('ra', P.path, sP.submissionId, 's1-accept', 'accept'));
        fact('S2 decline with guidance', await step1('rd', P.path, sP.submissionId, 's2-decline', 'decline'));

        // S4: the seeded discussion and task, on the panel and the tasks API (the editor's session)
        {
            const n0 = bad.length;
            await signIn(page, U('ed'), {contextPath: P.path}); await idle(page);
            await page.goto(app.url(`/index.php/${P.path}/dashboard/editorial?workflowSubmissionId=${sP.submissionId}`)); await idle(page); await sleep(1500);
            const s = await snap('s4-workflow');
            const stageId = sP.stageId || 3;
            const api = await page.request.get(app.url(`/index.php/${P.path}/api/v1/submissions/${sP.submissionId}/stages/${stageId}/tasks`));
            let j = null; try { j = await api.json(); } catch (_) { j = flat(await api.text(), 300); }
            fact('S4 tasks', {seeded: sP.tasks, panelHasDiscussion: ((s.s.text && (s.s.text.dialog || s.s.text.main)) || '').includes('rrupg discussion'), panelHasTask: ((s.s.text && (s.s.text.dialog || s.s.text.main)) || '').includes('rrupg task'),
                api: {status: api.status(), items: j && j.items ? j.items.map((i) => ({id: i.id, type: i.type, title: i.title, status: i.status})) : j},
                db: q(`select edit_task_id, type, ${facts.schema.editTasksStatusColumn === '1' ? 'status' : "'(no column)'"}, title from edit_tasks where assoc_id=${sP.submissionId}`), http500: since(n0), snap: s.name});
        }

        // S3: guidance set on N by its editor (manager level), then Modify Review of rn's completed review
        {
            const n0 = bad.length;
            await signIn(page, U('edn'), {contextPath: N.path}); await idle(page);
            const {ReviewSettingsPage} = require(path.resolve(__dirname, '../../../pages/ReviewSettingsPages.js'));
            const rs = new ReviewSettingsPage(page, N.path);
            await rs.goto('Reviewer Guidance');
            await rs.guidance.typeInto('competingInterests', POLICY);
            await rs.guidance.save();
            const set = q(`select left(setting_value,40) from journal_settings js join journals j on j.journal_id=js.journal_id where j.path='${N.path}' and setting_name='competingInterests'`);
            await page.goto(app.url(`/index.php/${N.path}/dashboard/editorial?workflowSubmissionId=${sN.submissionId}&workflowMenuKey=workflow_${sN.reviewRounds[0].stageId}_${sN.reviewRounds[0].id}`)); await idle(page);
            const table = page.getByRole('table', {name: 'Reviewers', exact: true});
            const row = table.getByRole('row').filter({hasText: 'Noel Completed'}).first();
            await row.waitFor({timeout: T});
            await row.getByRole('button', {name: 'Read Review', exact: true}).click();
            const rd = page.getByRole('dialog', {name: /^Review Details:/}).last();
            await rd.waitFor({timeout: T});
            await rd.getByRole('button', {name: 'Modify Review', exact: true}).waitFor({timeout: T});
            await idle(page); await sleep(800);
            const rdBefore = await snap('s3-review-details');
            await rd.getByRole('button', {name: 'Modify Review', exact: true}).click();
            const conf = page.locator('[data-cy="dialog"]').filter({hasText: 'Modify this review?'}).last();
            await conf.waitFor({timeout: T});
            await conf.getByRole('button', {name: 'Modify Review', exact: true}).click();
            const mr = page.getByRole('dialog', {name: 'Modify Review'}).last();
            await mr.getByRole('button', {name: 'Save Changes', exact: true}).waitFor({timeout: T});
            await idle(page); await sleep(800);
            const radio = mr.locator('input[type=radio][value="noCompetingInterests"]');
            const radioCount = await radio.count();
            if (radioCount) { try { await radio.check({timeout: 5000}); } catch (_) { await radio.check({force: true}); } }
            const puts = [];
            const onResp = async (r) => { if (/\/reviewAssignments\/\d+\/review$/.test(r.url().split('?')[0])) { let b = null; try { b = await r.json(); } catch (_) { /* */ } puts.push({status: r.status(), req: flat(r.request().postData(), 400), answer: b ? flat(JSON.stringify(b), 400) : null}); } };
            page.on('response', onResp);
            await mr.getByRole('button', {name: 'Save Changes', exact: true}).click();
            await mr.waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
            await sleep(2000); await idle(page);
            page.off('response', onResp);
            const after = await snap('s3-after-save');
            fact('S3 modify review', {guidanceSaved: set, radioCount, puts, modifyStillOpen: await mr.isVisible().catch(() => null), notices: after.s.notices, dialogText: flat(after.s.text && after.s.text.dialog, 600),
                db: raRow(sN.submissionId, U('rn')), http500: since(n0), snaps: [rdBefore.name, after.name]});
        }
    } finally {
        fact('all 5xx', bad);
        await close();
    }
});
