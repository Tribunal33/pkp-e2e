// U70 claim check, housekeeping chunk I28 (2026-09-28): incidentals row L142 of
// docs/tracking/incidentals.md (.reports/hk28/chunks/U70.md): a book's Activity Log after
// Catalog › "Add Entry" › "Save" (and after a Catalog Entry "Save" with nothing changed).
// Spec: docs/specs/U70-catalog-management.md, Side effects bullets 2 and 3, Rule 12; notes g, h, td13.
//
// Axis: the press's DOI setting. A "Submission metadata updated" line beside "The submission
// was published." could be Add Entry's own, or the DOI minted on publish (DOIs "Upon
// publication"), so every app seeds two scratch contexts: D (DOIs on, publication DOIs,
// "Upon publication") and N (DOIs off). Control: a second item published from its
// workflow's own publish button, on the same context, compared line by line.
//
// OMP (per press D and N, signed in as the press's throwaway manager "Mia Manager"):
//   ae   book 1 at Production: Activity Log, then Catalog › "Add Entry" › choose › "Save",
//        then the Activity Log again (the new lines and their "User")
//   wf   book 2 at Production: the same around the workflow's "Publish"
//   ce   (press N only) book 3 at Production: the Catalog Entry page's "Save" with nothing
//        changed, the log before and after; then the page left once with an unsaved change
// OJS, OPS (the workflow publish's lines, U49 Side effects "Activity log"):
//   wf   per context D and N, one item at Production (OPS: submitted), published from its
//        workflow ("Publish" / "Post"), the log before and after
//
// Run twice, each under its own facts name (fresh scratch contexts per RUN):
//   RUN=r1 PROBE_FEATURE=U70 PROBE_AGENT=ccI28 node bin/probe.js all shared/playwright/checks/U70/I28/i28.js
//   RUN=r2 …
// Outputs: .reports/U70/ccI28/ (facts `i28-facts-<RUN>-<app>.json`, snapshots `<RUN>-…`).
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 600) => (t == null ? t : String(t).replace(/\s+/g, ' ').trim().slice(0, n));
const log = (...a) => console.log(`[u70 i28 ${RUN}]`, ...a);
const N = (name) => `${RUN}-${name}`;
const BOX = 'Find monographs to add to the catalog';
const PUBLISH_RE = /^(Schedule For Publication|Publish|Post)$/;
const WINDOW_RE = /Are you sure you want to|requirements must be met|requirements have been met/;

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs', isOMP = app.name === 'omp', isOPS = app.name === 'ops';
    const fact = (k, v) => { record(`i28-facts-${RUN}`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const sql = (q) => {
        try { return execFileSync('psql', ['-d', app.db, '-tA', '-F', '|', '-c', q], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim(); } catch (e) { return `SQL ERROR ${flat(e.stderr, 300)}`; }
    };
    const cUrl = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    const wfUrl = (ctx, id, key) => cUrl(ctx, `/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);

    // ------------------------------------------------------------------ seed
    const t = tag('u70i28');
    const S = {};
    const PROD = isOPS ? {} : {decisions: ['skipExternalReview', 'sendToProduction']};
    const DOI_ON = {enableDois: true, doiPrefix: '10.12345', enabledDoiTypes: ['publication'], doiCreationTime: 'publication'};
    const ctx = async (k, spec) => {
        const p = `${t}${k}`;
        const c = await app.api.createContext({tag: p, ...spec,
            context: {name: {en: `I28 ${k} ${p}`}, contactName: 'Pat Principal', contactEmail: `${p}pc@mail.test`},
            users: [
                {username: `${p}mg`, roles: ['manager'], givenName: 'Mia', familyName: 'Manager'},
                {username: `${p}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
            ]});
        S[k] = {path: c.path, mg: `${p}mg`, au: `${p}au`, subs: {}};
    };
    const sub = async (k, s, title) => {
        const r = await app.api.createSubmission({tag: `${t}${k}${s}`, context: S[k].path, submitter: S[k].au, title, ...PROD});
        S[k].subs[s] = {id: r.submissionId, pub: r.publicationId, stageId: r.stageId, status: r.status, title};
    };
    await ctx('D', DOI_ON);
    await ctx('N', {enableDois: false});
    for (const k of ['D', 'N']) {
        if (isOMP) await sub(k, 'ae', `I28 Harbour Added ${k}`);
        await sub(k, 'wf', `I28 Harbour Workflow ${k}`);
        if (isOMP && k === 'N') await sub(k, 'ce', `I28 Harbour Entry ${k}`);
    }
    for (const k of ['D', 'N']) S[k].doiSettings = sql(`select setting_name, setting_value from ${isOJS ? 'journal' : isOMP ? 'press' : 'server'}_settings where ${isOJS ? 'journal' : isOMP ? 'press' : 'server'}_id=(select ${isOJS ? 'journal' : isOMP ? 'press' : 'server'}_id from ${isOJS ? 'journals' : isOMP ? 'presses' : 'servers'} where path='${S[k].path}') and setting_name in ('enableDois','enabledDoiTypes','doiCreationTime') order by 1`);
    fact('seed', S);
    note(`ccI28 [${app.name}] ${RUN}: scratch contexts D=${S.D.path} (DOIs on, "Upon publication"), N=${S.N.path} (DOIs off); manager "Mia Manager"`);

    const {page, close} = await launch(app);
    const jsDialogs = [];
    page.on('dialog', async (d) => {
        jsDialogs.push({at: Date.now(), type: d.type(), message: flat(d.message(), 300)});
        await d.accept().catch(() => {});
    });
    const net = [];
    page.on('response', async (r) => {
        const u = r.url();
        if (!/\/api\/v1\//.test(u)) return;
        const m = r.request().method();
        if (m === 'GET') return;
        net.push({at: Date.now(), m, override: r.request().headers()['x-http-method-override'] || null, status: r.status(), url: u.replace(/^.*\/api\/v1/, '').slice(0, 160)});
    });
    const netSince = (t0) => net.filter((x) => x.at >= t0).map(({at, ...x}) => x);
    const dialogsSince = (t0) => jsDialogs.filter((d) => d.at >= t0).map(({at, ...d}) => d);

    async function snap(name, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        record(N(name), s);
        await shot(page, N(name)).catch(() => {});
        return s;
    }
    const step = async (name, fn) => {
        const out = {};
        try { await fn(out); } catch (e) { out.error = flat(e.message, 500); log('step error', name, out.error); await snap(`${name}-error`).catch(() => {}); }
        fact(name, out);
        return out;
    };
    let who = null;
    const as = async (user, ctxPath) => {
        if (who === user) return;
        await signIn(page, user, {contextPath: ctxPath});
        await idle(page);
        who = user;
    };

    // ---- the workflow and its Activity Log
    async function openWf(ctxPath, id, key) {
        await page.goto(wfUrl(ctxPath, id, key));
        await idle(page);
        await page.locator('[data-cy="workflow-controls-left"], [role="dialog"]').first().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page);
        await sleep(600);
    }
    const head = async () => ({
        left: flat(await page.locator('[data-cy="workflow-controls-left"]').innerText().catch(() => null), 200),
        right: (await page.locator('[data-cy="workflow-controls-right"]').getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)),
    });
    /** The Activity Log's History rows as shown (Date · User · Event), with a snapshot of the window. */
    async function activityLog(name) {
        await page.getByRole('button', {name: 'Activity Log', exact: true}).click();
        const dlg = page.getByRole('dialog').filter({hasText: 'Activity Log & Notes'});
        await dlg.getByText('Event', {exact: true}).waitFor({timeout: T});
        await idle(page);
        // the grid's rows land after its header: wait until the row count holds across two reads
        let rows = [];
        for (let i = 0; i < 12; i++) {
            const r = await dlg.locator('tr.gridRow').allInnerTexts().catch(() => []);
            if (r.length && r.length === rows.length) break;
            rows = r;
            await sleep(400);
        }
        rows = (await dlg.locator('tr.gridRow').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.replace(/\s+/g, ' ').trim())))).map((c) => c.join(' | '));
        const tabs = (await dlg.getByRole('tab').allInnerTexts().catch(() => [])).map((x) => flat(x, 40));
        const headers = (await dlg.locator('th').allInnerTexts().catch(() => [])).map((x) => flat(x, 40));
        const s = await snap(name, {rows, tabs, headers});
        await dlg.getByRole('button', {name: 'Close', exact: true}).first().click();
        await dlg.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await sleep(700);
        return {rows, tabs, headers, dialogText: flat(s.text && s.text.dialog, 400)};
    }
    const dbLog = (sid) => sql(`select e.log_id, e.event_type, e.message, u.username from event_log e left join users u on u.user_id=e.user_id where e.assoc_type=1048585 and e.assoc_id=${sid} order by e.log_id`).split('\n');
    const dbDoi = (pub) => sql(`select coalesce(d.doi,'-') from publications p left join dois d on d.doi_id=p.doi_id where p.publication_id=${pub}`);
    const dbStatus = (sid) => sql(`select s.status, s.stage_id, p.status, p.date_published from submissions s join publications p on p.publication_id=s.current_publication_id where s.submission_id=${sid}`);
    // the grid lists oldest first, so the new lines are the tail
    const newRows = (before, after) => after.rows.slice(before.rows.length);

    // ---- the Catalog page and the "Add Entry" panel (OMP)
    const panel = () => page.getByRole('dialog', {name: 'Add Entry'});
    const box = () => panel().getByRole('combobox', {name: BOX});
    async function openCatalog(ctxPath) {
        await page.goto(cUrl(ctxPath, '/manageCatalog'));
        await idle(page);
        await page.locator('.listPanel__item--catalog, .listPanel__empty').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
    }
    const listTitles = async () => (await page.locator('.listPanel__item--catalog .listPanel__itemSubtitle').allInnerTexts().catch(() => [])).map((x) => flat(x, 120));
    async function addEntry(ctxPath, title, name) {
        const o = {};
        await openCatalog(ctxPath);
        o.listBefore = await listTitles();
        await snap(`${name}-01-catalog`);
        await page.getByRole('button', {name: 'Add Entry', exact: true}).click();
        await box().waitFor({timeout: T});
        await idle(page);
        await box().click();
        const got = page.waitForResponse((r) => /\/_?submissions\?/.test(r.url()) && r.request().method() === 'GET', {timeout: 10_000}).catch(() => null);
        await box().pressSequentially(title, {delay: 30});
        await got;
        await idle(page);
        await sleep(700);
        o.options = (await panel().getByRole('option').allInnerTexts().catch(() => [])).map((x) => flat(x, 120));
        await panel().getByRole('option', {name: title}).first().click();
        await idle(page);
        await sleep(300);
        o.chosen = (await panel().locator('.pkpAutosuggest__selection').allInnerTexts().catch(() => [])).map((x) => flat(x, 120));
        await snap(`${name}-02-chosen`, o);
        const t0 = Date.now();
        const resp = page.waitForResponse((r) => /addToCatalog/.test(r.url()), {timeout: T}).catch(() => null);
        await panel().getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        await idle(page);
        await sleep(900);
        o.save = {status: r ? r.status() : null, writes: netSince(t0), dialogs: dialogsSince(t0), panelOpen: await panel().isVisible().catch(() => false)};
        o.listAtOnce = await listTitles();
        await snap(`${name}-03-after-save`, o);
        await openCatalog(ctxPath);
        o.listReload = await listTitles();
        await snap(`${name}-04-reload`);
        return o;
    }

    // ---- the workflow's own publish button (all apps)
    const panelLoc = () => page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
    const windowLoc = () => page.getByRole('dialog').filter({hasText: WINDOW_RE}).last();
    async function workflowPublish(name) {
        const o = {};
        const button = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: PUBLISH_RE});
        await button.first().waitFor({timeout: T});
        o.label = flat(await button.first().innerText(), 60);
        const t0 = Date.now();
        await button.first().click();
        const stage = panelLoc().locator('select[name="versionStage"]');
        let ok = await stage.or(windowLoc()).first().waitFor({state: 'visible', timeout: 8000}).then(() => true).catch(() => false);
        if (!ok) { await button.first().click().catch(() => {}); ok = await stage.or(windowLoc()).first().waitFor({state: 'visible', timeout: T}).then(() => true).catch(() => false); }
        await idle(page);
        await sleep(1000);
        o.opened = (await stage.isVisible().catch(() => false)) ? 'panel' : (await windowLoc().isVisible().catch(() => false)) ? 'window' : 'none';
        await snap(`${name}-01-opened`, o);
        if (o.opened === 'panel') {
            const p = panelLoc();
            if (!(await stage.inputValue().catch(() => ''))) await stage.selectOption('VoR').catch(() => {});
            const mi = p.locator('select[name="versionIsMinor"]');
            if ((await mi.count()) && !(await mi.inputValue().catch(() => ''))) await mi.selectOption('false').catch(() => {});
            const noIssue = p.getByRole('radio', {name: "Don't Assign To An Issue"});
            if (await noIssue.count()) { await noIssue.check().catch(() => {}); await sleep(300); }
            await p.getByRole('button', {name: 'Confirm', exact: true}).click();
            await windowLoc().waitFor({timeout: 20000}).catch(() => {});
            await idle(page);
            await sleep(800);
        }
        const w = windowLoc();
        if (await w.isVisible().catch(() => false)) {
            const st = w.locator('select[name="versionStage"]');
            if ((await st.count()) && !(await st.inputValue().catch(() => ''))) await st.selectOption('VoR').catch(() => {});
            o.windowText = flat(await w.innerText().catch(() => null), 600);
            const btns = (await w.getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 60));
            const b = btns.find((x) => PUBLISH_RE.test(x));
            o.windowButtons = btns;
            if (b) {
                const resp = page.waitForResponse((r) => /\/publish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await w.getByRole('button', {name: b, exact: true}).click();
                const r = await resp;
                o.publish = r ? r.status() : null;
                await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Unpublish|Unschedule|Unpost)$/}).first().waitFor({timeout: T}).catch(() => {});
                await idle(page);
                await sleep(800);
            }
        }
        o.writes = netSince(t0);
        o.dialogs = dialogsSince(t0);
        o.head = await head();
        await snap(`${name}-02-published`, o);
        return o;
    }

    // ---- the Catalog Entry page (OMP)
    const entryForm = () => page.locator('form').filter({has: page.locator('input[name="urlPath"]')}).first();
    async function openEntry(ctxPath, s) {
        await openWf(ctxPath, s.id, `publication_${s.pub}_catalogEntry`);
        await page.locator('input[name="urlPath"]').waitFor({timeout: 15_000}).catch(() => {});
        await idle(page);
        await sleep(600);
    }

    try {
        for (const k of ['D', 'N']) {
            const C = S[k];
            // ------------------------------------------------ ae: "Add Entry" › "Save" (OMP)
            if (isOMP) {
                await step(`ae-${k}`, async (o) => {
                    const s = C.subs.ae;
                    await as(C.mg, C.path);
                    await openWf(C.path, s.id);
                    o.head0 = await head();
                    o.log0 = await activityLog(`ae-${k}-00-log-before`);
                    o.db0 = {log: dbLog(s.id), doi: dbDoi(s.pub), status: dbStatus(s.id)};
                    o.add = await addEntry(C.path, s.title, `ae-${k}`);
                    await openWf(C.path, s.id);
                    o.head1 = await head();
                    await snap(`ae-${k}-05-workflow-after`, o.head1);
                    o.log1 = await activityLog(`ae-${k}-06-log-after`);
                    o.newRows = newRows(o.log0, o.log1);
                    o.db1 = {log: dbLog(s.id), doi: dbDoi(s.pub), status: dbStatus(s.id)};
                    // read again in a fresh page load
                    await page.goto(cUrl(C.path, '/dashboard/editorial'));
                    await idle(page);
                    await openWf(C.path, s.id);
                    o.log2 = await activityLog(`ae-${k}-07-log-reload`);
                });
            }
            // ------------------------------------------------ wf: the workflow's own publish (all apps)
            await step(`wf-${k}`, async (o) => {
                const s = C.subs.wf;
                await as(C.mg, C.path);
                await openWf(C.path, s.id, `publication_${s.pub}_titleAbstract`);
                o.head0 = await head();
                o.log0 = await activityLog(`wf-${k}-00-log-before`);
                o.db0 = {log: dbLog(s.id), doi: dbDoi(s.pub), status: dbStatus(s.id)};
                await openWf(C.path, s.id, `publication_${s.pub}_titleAbstract`);
                o.publish = await workflowPublish(`wf-${k}`);
                o.log1 = await activityLog(`wf-${k}-03-log-after`);
                o.newRows = newRows(o.log0, o.log1);
                o.db1 = {log: dbLog(s.id), doi: dbDoi(s.pub), status: dbStatus(s.id)};
                await page.goto(cUrl(C.path, '/dashboard/editorial'));
                await idle(page);
                await openWf(C.path, s.id);
                o.log2 = await activityLog(`wf-${k}-04-log-reload`);
            });
            // ------------------------------------------------ ce: Catalog Entry "Save" with nothing changed (OMP, press N)
            if (isOMP && k === 'N') {
                await step(`ce-${k}`, async (o) => {
                    const s = C.subs.ce;
                    await as(C.mg, C.path);
                    await openWf(C.path, s.id);
                    o.log0 = await activityLog(`ce-${k}-00-log-before`);
                    await openEntry(C.path, s);
                    const s1 = await snap(`ce-${k}-01-entry`);
                    o.entryHeading = flat(await page.getByRole('heading', {name: /^Publication: /}).first().innerText().catch(() => null), 80);
                    o.entryTail = flat(s1.text && s1.text.dialog, 300);
                    await loc(page, 'Catalog Entry: "Save"', entryForm().getByRole('button', {name: 'Save', exact: true}));
                    const t0 = Date.now();
                    const resp = page.waitForResponse((r) => /\/submissions\/\d+\/publications\/\d+(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                    await entryForm().getByRole('button', {name: 'Save', exact: true}).click();
                    const r = await resp;
                    await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 8000}).catch(() => {});
                    o.save = {status: r ? r.status() : null, method: r ? r.request().method() : null, writes: netSince(t0), savedShown: await page.locator('[role="status"]:has-text("Saved")').count()};
                    await snap(`ce-${k}-02-saved`, o.save);
                    await sleep(800);
                    o.log1 = await activityLog(`ce-${k}-03-log-after`);
                    o.newRows = newRows(o.log0, o.log1);
                    o.dbLog = dbLog(s.id);
                    // the page left once with an unsaved change: Series Position typed, then the workflow's "Title & Abstract", then another page
                    await openEntry(C.path, s);
                    const t1 = Date.now();
                    await page.locator('input[name="seriesPosition"]').fill('Book 9');
                    await page.locator('input[name="seriesPosition"]').blur();
                    await page.getByRole('link', {name: 'Title & Abstract', exact: true}).last().click().catch((e) => { o.titleClick = flat(e.message, 120); });
                    await idle(page);
                    await sleep(1000);
                    o.leaveInside = {dialogs: dialogsSince(t1), heading: flat(await page.getByRole('heading', {name: /^Publication: /}).first().innerText().catch(() => null), 80), visibleDialogs: (await page.locator('[role="dialog"]:visible').evaluateAll((els) => els.map((e) => (e.getAttribute('aria-label') || '').slice(0, 80))).catch(() => []))};
                    await snap(`ce-${k}-04-left-inside`, o.leaveInside);
                    await openEntry(C.path, s);
                    o.seriesPositionAfter = await page.locator('input[name="seriesPosition"]').inputValue().catch(() => null);
                    await page.locator('input[name="seriesPosition"]').fill('Book 10');
                    await page.locator('input[name="seriesPosition"]').blur();
                    const t2 = Date.now();
                    await page.goto(cUrl(C.path, '/manageCatalog')).catch((e) => { o.gotoErr = flat(e.message, 120); });
                    await idle(page);
                    o.leavePage = {dialogs: dialogsSince(t2), url: page.url()};
                    await snap(`ce-${k}-05-left-page`, o.leavePage);
                    await openEntry(C.path, s);
                    o.seriesPositionAfterLeave = await page.locator('input[name="seriesPosition"]').inputValue().catch(() => null);
                    await openWf(C.path, s.id);
                    o.log2 = await activityLog(`ce-${k}-06-log-final`);
                });
            }
        }
    } finally {
        await close();
    }
});
