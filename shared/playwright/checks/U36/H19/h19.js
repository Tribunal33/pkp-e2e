// U36 claim check H19 (cc19c, housekeeping 2026-10-19): one incidentals row.
// "More Information" › "Notes" on a file copied from an earlier stage
// (source_submission_file_id set) as the editor `dbarnes` on a DATASET fleet
// (PKP's default test dataset; docs/process/dataset.md), on main and on
// stable-3_5_0. Bears on U36 Rule 14, scenario "Earlier Revision Notes", d18.
//
// Phases (PHASE=read,copy; default both):
//   read  read-only: the dataset's own copied review file (OJS 19, OMP 2) on
//         its review round's list: More Information › History › Notes ›
//         "Earlier Revision Notes"; control: the source file on "Submission
//         Files". OPS (no workflow file lists, OPS1): a galley's file, and the
//         count of copied files in its database.
//   copy  the scenario path (mutates the dataset fleet: reset it first):
//         a note on the Submission file, "Upload/Select Files" on
//         Copyediting's "Draft Files" copying it, More Information › Notes on
//         the copy, read again after a reload; text typed and a switch to
//         History on the way out (Rule 14a). OJS 19, OMP 7.
//
// Run (main, one app per call, under the app lock; 3.5 takes no lock):
//   npm run fleet-prep -- --feature issues-cc19c --dataset 7 --reset
//   bin/app-lock.sh shared ojs -- env PROBE_FEATURE=issues-cc19c PKP_E2E_DATASET=7 PROBE_AGENT=cc19c PROBE_RUN=r1 \
//       node bin/probe.js ojs shared/playwright/checks/U36/H19/h19.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-cc19c-3_5 --dataset 7 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_FEATURE=issues-cc19c-3_5 PKP_E2E_DATASET=7 PROBE_AGENT=cc19c PROBE_RUN=s1 \
//       node bin/probe.js all shared/playwright/checks/U36/H19/h19.js
const {forEachApp, launch, signIn, screen, shot, record, loc, idle, sql, serverLog} = require('../../../probe');

const PHASES = (process.env.PHASE || 'read,copy').split(',');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);

// Per app: the dataset's copied review file (read) and the Copyediting submission (copy).
const PLAN = {
    ojs: {read: {sid: 19}, copy: {sid: 19}},
    omp: {read: {sid: 2}, copy: {sid: 7}},
    ops: {},
};

forEachApp(async (app) => {
    const line = app.line || 'main';
    const {page, close} = await launch(app);
    const out = {app: app.name, line, dataset: app.dataset, phases: PHASES};
    const log = serverLog(app);
    const calls = [];
    page.on('response', (r) => {
        const u = r.url();
        if (/information-center|save-note|list-past-notes|view-notes|manage-.*files|select-files|update-/.test(u)) {
            calls.push({t: Date.now(), status: r.status(), method: r.request().method(), url: u.replace(/^.*\/index\.php/, '').slice(0, 220)});
        }
    });
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({t: Date.now(), type: d.type(), message: d.message()});
        if (d.type() === 'beforeunload' || d.type() === 'confirm') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push({t: Date.now(), message: String(e.message || e).slice(0, 400)}));
    const since = (t0) => ({
        calls: calls.filter((c) => c.t >= t0).map(({t, ...c}) => c),
        dialogs: dialogs.filter((c) => c.t >= t0).map(({t, ...c}) => c),
        pageErrors: errors.filter((c) => c.t >= t0).map(({t, ...c}) => c),
    });
    const snap = async (name, extra) => {
        const s = await screen(page);
        record(name, extra ? {...s, extra} : s);
        await shot(page, name).catch(() => {});
        return s;
    };
    const wfUrl = (sid, key) => app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${sid}${key ? `&workflowMenuKey=${key}` : ''}`);
    const wf = () => page.getByRole('dialog').filter({has: page.locator('[data-cy="sidemodal-header"]')}).first();
    const openWf = async (sid, key) => {
        await page.goto(wfUrl(sid, key));
        await wf().waitFor({timeout: 30000}).catch(() => {});
        await idle(page); await sleep(800);
    };
    // The row of file `id` (its number cell) on any table of the workflow panel.
    const fileRow = (id) => wf().locator('table tbody tr').filter({has: page.locator('td, th').filter({hasText: new RegExp(`^\\s*${id}\\s*$`)})}).first();
    const tableOf = async (row) => row.evaluate((tr) => {
        const t = tr.closest('table');
        const lab = t && (t.getAttribute('aria-label') || (t.getAttribute('aria-labelledby') && document.getElementById(t.getAttribute('aria-labelledby'))?.innerText) || (t.querySelector('caption') || {}).innerText);
        return (lab || '').trim() || null;
    }).catch(() => null);
    const icWin = () => page.getByRole('dialog').filter({has: page.locator('.pkp_controllers_informationCenter')}).last();

    // More Information on file `id`: History (landing), Notes, "Earlier Revision Notes".
    async function moreInfo(id, name, key, {typeAndLeave = false} = {}) {
        const r = {id};
        const row = fileRow(id);
        r.rowFound = await row.waitFor({timeout: 20000}).then(() => true).catch(() => false);
        if (!r.rowFound) { await snap(`${key}-norow`); return r; }
        r.table = await tableOf(row);
        r.rowText = flat(await row.innerText().catch(() => ''), 300);
        await row.getByRole('button', {name: /More Actions/}).first().click();
        await sleep(300);
        r.menu = (await page.getByRole('menuitem').allInnerTexts().catch(() => [])).map((s) => flat(s));
        let t0 = Date.now();
        await page.getByRole('menuitem', {name: 'More Information', exact: true}).first().click();
        await icWin().waitFor({timeout: 30000}).catch(() => {});
        await icWin().locator('tr.gridRow').first().waitFor({timeout: 30000}).catch(() => {});
        await idle(page); await sleep(500);
        r.window = await icWin().evaluate((d) => {
            const lab = d.getAttribute('aria-labelledby');
            return {title: d.getAttribute('aria-label') || (lab && document.getElementById(lab)?.innerText.trim()) || null,
                tabs: [...d.querySelectorAll('[role=tab]')].map((t) => `${t.innerText.trim()}${t.getAttribute('aria-selected') === 'true' ? '*' : ''}`)};
        }).catch((e) => ({err: String(e).slice(0, 200)}));
        const sH = await snap(`${key}-history`);
        r.historyText = flat(sH.text && sH.text.dialog, 800);
        r.historyTraffic = since(t0);
        // Notes
        t0 = Date.now(); const lm = log.mark();
        const notesResp = page.waitForResponse((x) => x.url().includes('view-notes'), {timeout: 30000}).catch(() => null);
        await icWin().getByRole('tab', {name: 'Notes', exact: true}).click();
        const resp = await notesResp;
        r.viewNotes = resp ? {status: resp.status(), url: resp.url().replace(/^.*\/index\.php/, '')} : null;
        await sleep(1500); await idle(page); await sleep(500);
        const sN = await snap(`${key}-notes`);
        r.notesText = flat(sN.text && sN.text.dialog, 1200);
        r.notesPanel = await icWin().evaluate((d) => {
            const v = (e) => e && e.getClientRects().length > 0;
            const p = [...d.querySelectorAll('[role=tabpanel]')].find(v);
            return p ? {
                text: p.innerText.replace(/\s+/g, ' ').trim().slice(0, 1000),
                hasForm: !!p.querySelector('#newNoteForm'),
                hasPast: !!p.querySelector('#showPastNotesLink'),
                spinners: p.querySelectorAll('.pkp_spinner, .pkp_loading').length,
                own: [...p.querySelectorAll('#informationCenterNotes > .pkp_notes_list .note, #informationCenterNotes > .pkp_notes_list .no_notes')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()),
            } : null;
        }).catch((e) => ({err: String(e).slice(0, 200)}));
        r.notesTraffic = since(t0);
        r.notesLog = log.since(lm).slice(-6).map((l) => l.slice(0, 400));
        // "Earlier Revision Notes"
        const past = icWin().locator('#showPastNotesLink').first();
        if (await past.count()) {
            await loc(page, 'Information Center › Notes: "Earlier Revision Notes" toggle', past.locator('a.toggleExtras'));
            t0 = Date.now();
            await past.locator('a.toggleExtras').click().catch(() => {});
            await sleep(800); await idle(page);
            const sP = await snap(`${key}-earlier`);
            r.earlier = await past.evaluate((e) => ({
                active: e.classList.contains('active'),
                heading: (e.querySelector('a.toggleExtras') || {}).innerText?.trim() || null,
                content: (e.querySelector('.extrasContainer') || {}).innerText?.replace(/\s+/g, ' ').trim() || null,
                deletes: [...e.querySelectorAll('.extrasContainer button, .extrasContainer a')].map((b) => b.innerText.trim()).filter((x) => /Delete/.test(x)).length,
            })).catch((e) => ({err: String(e).slice(0, 200)}));
            r.earlierTraffic = since(t0);
            r.earlierDialogText = flat(sP.text && sP.text.dialog, 300);
        } else {
            r.earlier = {present: false};
        }
        // Leave the tab with text typed and not added (Rule 14a), when the form is there.
        if (typeAndLeave) {
            const box = icWin().locator('textarea[name="newNote"]');
            if (await box.count()) {
                t0 = Date.now();
                await box.fill('cc19c typed, not added');
                await box.blur().catch(() => {});
                await icWin().getByRole('tab', {name: 'History', exact: true}).click();
                await sleep(1500); await idle(page);
                const sL = await snap(`${key}-leave`);
                r.leave = {...since(t0), tabs: await icWin().evaluate((d) => [...d.querySelectorAll('[role=tab]')].map((t) => `${t.innerText.trim()}${t.getAttribute('aria-selected') === 'true' ? '*' : ''}`)).catch(() => null), dialogText: flat(sL.text && sL.text.dialog, 200)};
            } else {
                r.leave = {noBox: true};
            }
        }
        await icWin().getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await sleep(800);
        return r;
    }

    try {
        await signIn(page, 'dbarnes');
        const plan = PLAN[app.name];

        // ---------------------------------------------------------------- read
        if (PHASES.includes('read')) {
            const read = {};
            read.copiesInDb = sql(app, 'select count(*) from submission_files where source_submission_file_id is not null');
            if (app.name !== 'ops') {
                const sid = plan.read.sid;
                const rows = sql(app, `select sf.submission_file_id, sf.source_submission_file_id, rrf.review_round_id, rr.stage_id from submission_files sf join review_round_files rrf on rrf.submission_file_id = sf.submission_file_id join review_rounds rr on rr.review_round_id = rrf.review_round_id where sf.submission_id = ${sid} and sf.source_submission_file_id is not null order by 1 limit 1`).split('|');
                const [copyId, srcId, roundId, stageId] = rows;
                const nameOf = (id) => sql(app, `select setting_value from submission_file_settings where submission_file_id = ${id} and setting_name = 'name' and locale = 'en'`);
                read.target = {sid, copyId, srcId, roundId, stageId, name: nameOf(copyId), srcName: nameOf(srcId)};
                await openWf(sid, `workflow_${stageId}_${roundId}`);
                await snap(`read-round-${sid}`);
                read.copy = await moreInfo(copyId, read.target.name, `read-copy-${copyId}`);
                await openWf(sid, 'workflow_1');
                await snap(`read-submission-${sid}`);
                read.source = await moreInfo(srcId, read.target.srcName, `read-source-${srcId}`, {typeAndLeave: true});
            } else {
                // OPS: a galley's file on the publication's "Galleys" page (OPS1: no workflow
                // file lists), on an unposted preprint and on a posted one.
                read.galleys = {};
                const picks = {
                    unposted: `select p.submission_id, p.publication_id from publication_galleys g join publications p on p.publication_id = g.publication_id where g.submission_file_id is not null and p.status <> 3 order by p.submission_id, p.publication_id desc limit 1`,
                    posted: `select p.submission_id, p.publication_id from publication_galleys g join publications p on p.publication_id = g.publication_id where g.submission_file_id is not null and p.status = 3 order by p.submission_id desc, p.publication_id desc limit 1`,
                };
                for (const [kind, q] of Object.entries(picks)) {
                    const [sid, pid] = sql(app, q).split('|');
                    const r = {sid, pid};
                    read.galleys[kind] = r;
                    if (!sid) continue;
                    await openWf(sid, `publication_${pid}_galleys`);
                    // 3.5 has no such menu key (it lands on the stage): press the menu's "Galleys"
                    if (!(await wf().getByRole('heading', {name: /Galleys/}).count())) {
                        await wf().getByRole('navigation').getByRole('link', {name: 'Galleys', exact: true}).first().click().catch(() => {});
                        await idle(page); await sleep(1500);
                    }
                    await snap(`read-galleys-${kind}`);
                    r.wfMenu = flat(await wf().getByRole('navigation').first().innerText().catch(() => ''), 600);
                    const row = wf().getByRole('table', {name: 'Galleys'}).locator('tbody tr').filter({has: page.getByRole('button', {name: /More Actions/})}).first();
                    if (!(await row.waitFor({timeout: 15000}).then(() => true).catch(() => false))) { r.noRow = true; continue; }
                    r.label = flat(await row.locator('td, th').first().innerText(), 60);
                    await row.getByRole('button', {name: /More Actions/}).first().click(); await sleep(300);
                    r.menu = (await page.getByRole('menuitem').allInnerTexts().catch(() => [])).map((s) => flat(s));
                    await snap(`read-galley-${kind}-menu`, {menu: r.menu});
                    const mi = page.getByRole('menuitem', {name: 'More Information', exact: true}).first();
                    if (!(await mi.count())) { await row.getByRole('button', {name: /More Actions/}).first().click().catch(() => {}); r.noMoreInformation = true; continue; }
                    await mi.click();
                    await icWin().waitFor({timeout: 30000}).catch(() => {});
                    await idle(page); await sleep(800);
                    await snap(`read-galley-${kind}-history`);
                    const t0 = Date.now(), lm = log.mark();
                    const notesResp = page.waitForResponse((x) => x.url().includes('view-notes'), {timeout: 30000}).catch(() => null);
                    await icWin().getByRole('tab', {name: 'Notes', exact: true}).click();
                    const resp = await notesResp;
                    r.viewNotes = resp ? {status: resp.status(), url: resp.url().replace(/^.*\/index\.php/, '')} : null;
                    await sleep(1500); await idle(page);
                    const sN = await snap(`read-galley-${kind}-notes`);
                    r.notesText = flat(sN.text && sN.text.dialog, 800);
                    const past = icWin().locator('#showPastNotesLink a.toggleExtras').first();
                    if (await past.count()) {
                        await past.click(); await sleep(800); await idle(page);
                        const sP = await snap(`read-galley-${kind}-earlier`);
                        r.earlierText = flat(sP.text && sP.text.dialog, 600);
                    } else r.earlier = {present: false};
                    r.traffic = since(t0); r.log = log.since(lm).slice(-6).map((l) => l.slice(0, 400));
                    await icWin().getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
                    await sleep(800);
                }
            }
            out.read = read;
            console.log(`[${app.name} ${line}] read`, JSON.stringify(read).slice(0, 2500));
        }

        // ---------------------------------------------------------------- copy
        if (PHASES.includes('copy') && app.name !== 'ops') {
            const cp = {};
            const sid = plan.copy.sid;
            const src = sql(app, `select submission_file_id from submission_files where submission_id = ${sid} and file_stage = 2 order by 1 limit 1`);
            const srcName = sql(app, `select setting_value from submission_file_settings where submission_file_id = ${src} and setting_name = 'name' and locale = 'en'`);
            const run = process.env.PROBE_RUN || 'x';
            const noteText = `cc19c source note ${run}`;
            cp.src = {sid, id: src, name: srcName, note: noteText};
            // 1. a note on the source file (Submission Files), which is not copied
            await openWf(sid, 'workflow_1');
            await fileRow(src).getByRole('button', {name: /More Actions/}).first().click();
            await page.getByRole('menuitem', {name: 'More Information', exact: true}).first().click();
            await icWin().waitFor({timeout: 30000}); await idle(page); await sleep(500);
            await icWin().getByRole('tab', {name: 'Notes', exact: true}).click();
            await icWin().locator('textarea[name="newNote"]').waitFor({timeout: 30000});
            let t0 = Date.now();
            await icWin().locator('textarea[name="newNote"]').fill(noteText);
            const saved = page.waitForResponse((x) => x.url().includes('save-note'), {timeout: 30000}).catch(() => null);
            await icWin().locator('#newNoteForm').getByRole('button', {name: 'Add Note', exact: true}).click();
            const sv = await saved;
            await sleep(1200); await idle(page);
            const sS = await snap('copy-01-source-note');
            cp.sourceNote = {status: sv && sv.status(), notices: sS.notices, text: flat(sS.text && sS.text.dialog, 500), ...since(t0)};
            await icWin().getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
            await sleep(800);
            // 2. "Upload/Select Files" on Copyediting's "Draft Files"
            await openWf(sid, 'workflow_4');
            const before = sql(app, `select coalesce(max(submission_file_id), 0) from submission_files`);
            const draftWrap = wf().locator('div').filter({has: page.getByRole('heading', {name: 'Draft Files', exact: true})}).filter({has: page.getByRole('button', {name: 'Upload/Select Files', exact: true})}).last();
            await loc(page, 'Copyediting "Draft Files": "Upload/Select Files"', draftWrap.getByRole('button', {name: 'Upload/Select Files', exact: true}));
            await draftWrap.getByRole('button', {name: 'Upload/Select Files', exact: true}).click();
            const selWin = page.getByRole('dialog').filter({has: page.locator('input[name="allStages"]')}).last();
            await selWin.locator('input[name="allStages"]').waitFor({state: 'attached', timeout: 30000});
            await idle(page); await sleep(800);
            const fetched = page.waitForResponse((x) => x.url().includes('fetch-grid'), {timeout: 30000}).catch(() => null);
            await selWin.locator('input[name="allStages"]').check({force: true});
            await fetched; await idle(page); await sleep(800);
            await snap('copy-02-select-window');
            const header = selWin.locator('tr.gridRow').filter({hasNot: page.locator('input[type="checkbox"]')}).filter({hasText: /^\s*Submission\s*$/});
            const box = header.locator('xpath=following-sibling::tr[contains(concat(" ", normalize-space(@class), " "), " gridRow ")][.//input[@type="checkbox"]]').filter({hasText: srcName}).first().locator('input[type="checkbox"]');
            cp.boxFound = await box.count();
            await box.check({force: true}).catch((e) => { cp.tickErr = String(e).slice(0, 200); });
            t0 = Date.now();
            await selWin.getByRole('button', {name: 'OK', exact: true}).click();
            await selWin.waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
            await idle(page); await sleep(1500);
            cp.selectTraffic = since(t0);
            const copyId = sql(app, `select submission_file_id from submission_files where submission_id = ${sid} and submission_file_id > ${before} and source_submission_file_id = ${src} order by 1 desc limit 1`);
            cp.copy = {id: copyId, stage: copyId ? sql(app, `select file_stage from submission_files where submission_file_id = ${copyId}`) : null};
            await snap('copy-03-draft-files');
            if (copyId) {
                // 3. More Information › Notes on the copy, as landed, then after a reload
                cp.onCopy = await moreInfo(copyId, srcName, 'copy-04-copy', {typeAndLeave: true});
                await openWf(sid, 'workflow_4');
                cp.onCopyReload = await moreInfo(copyId, srcName, 'copy-05-copy-reload');
                // 4. control: the source, with its note, after the copy
                await openWf(sid, 'workflow_1');
                cp.onSource = await moreInfo(src, srcName, 'copy-06-source');
            }
            out.copy = cp;
            console.log(`[${app.name} ${line}] copy`, JSON.stringify(cp).slice(0, 3500));
        }
    } finally {
        record('h19', out);
        await close();
    }
});
