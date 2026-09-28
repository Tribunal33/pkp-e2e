// U38 claim check, chunk I28 (housekeeping 2026-09-28) — incidentals row L77:
// "Every 'An email has been sent: …' line has an empty 'User' column, a
// discussion's email and the wizard's alike" (Activity Log, all three apps).
// Spec lines owned: Rule 4c and note i (docs/specs/U38-submission-activity-log-and-notes.md).
//
// Drives, per app, on a scratch context of its own (nothing on publicknowledge):
//   base     the History of a seeded, submitted submission D as the Journal
//            Manager: the seeded submission's email lines (acknowledgement,
//            "needs an editor"); the sweep of the window (tabs, a note typed
//            and not added, "History" answered "OK", back to "Notes", "Close").
//   closeh   (sweep) the same typed note, "History" answered "OK", then
//            "Close" pressed straight from "History" (answered "Cancel", then
//            "OK"), then two reloads; its own dialog listener.
//   disc     control (A1): the assigned Section editor / Series editor /
//            Moderator starts a discussion on D to the Author, and the
//            manager reads its email lines ("User" expected empty).
//   decline  the Journal Manager (not a participant) presses "Decline
//            Submission" on D (OPS: at Production), sends the email to the
//            Author as the page offers it, and reads the decision's email
//            line ("User" expected: the manager) and its "View Email".
//   review   {OJS OMP} the Journal Manager presses "Add Reviewer" on R's
//            round 1 and sends the request; reads the request's email line
//            and its "View Email".
//   answer   {OJS OMP} after "review": the Reviewer accepts and submits the
//            review; the manager reads the answer's and "Review complete"'s
//            email lines (Rule 4c, A5).
//   wizard   the Author submits a draft W through the submission wizard;
//            the manager reads its email lines (the acknowledgement: "User"
//            expected empty).
//
//   RUN=r1 PROBE_FEATURE=U38 PROBE_AGENT=ccI28 node bin/probe.js all shared/playwright/checks/U38/I28/i28.js
//   RUN=r2 … (a second run seeds afresh; facts land in facts-<RUN>-<app>.json)
//   PHASES=base,closeh,disc,decline,review,answer,wizard (default all). Phases run in
//   that order on one seed (decline closes D). The recorded runs: r1, r2 all
//   phases (closeh added after r2); r3, r4 PHASES=closeh,disc; r5, r6 PHASES=review,answer (answer added after r4).
//
// No assertions: every screen is recorded with screen()/shot(); console lines
// carry the facts (prefix [app run phase]).
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const PHASES = (process.env.PHASES || 'base,closeh,disc,decline,review,answer,wizard').split(',');
const on = (p) => PHASES.includes(p);
const flat = (s, n = 2000) => (s || '').replace(/\s*\n+\s*/g, ' | ').replace(/[ \t]+/g, ' ').slice(0, n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fixture = (app, f) => path.resolve(__dirname, `../../../../../apps/${app.name}/playwright/fixtures/files/${f}`);
const NAMES = {mg: ['Mona', 'Manager'], se: ['Sean', 'Section'], au: ['Ava', 'Author'], ed: ['Eddie', 'Editor'], rv: ['Rhea', 'Reviewer']};
const fullName = (k) => NAMES[k].join(' ');

const newLines = (before, after) => {
    const left = (before || []).map((r) => `${r.user}\u0001${r.event}`);
    const out = [];
    for (const r of after || []) {
        const k = `${r.user}\u0001${r.event}`;
        const at = left.indexOf(k);
        if (at >= 0) left.splice(at, 1); else out.push(r);
    }
    return out;
};
const brief = (rows) => (rows || []).map((r) => `${r.user || '(empty)'} | ${r.event}${r.arrow ? ' [>]' : ''}`);

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const factsFile = path.join(outDir(), `facts-${RUN}-${app.name}.json`);
    const facts = fs.existsSync(factsFile) ? JSON.parse(fs.readFileSync(factsFile, 'utf8')) : {};
    const saveFacts = () => fs.writeFileSync(factsFile, JSON.stringify(facts, null, 1));
    let phase = '';
    const log = (...a) => console.log(`[${app.name} ${RUN}${phase ? ' ' + phase : ''}]`, ...a);
    const mark = (m) => log(new Date().toISOString(), 'MARK', m);
    const fact = (k, v) => { facts[k] = v; saveFacts(); log(k, JSON.stringify(v).slice(0, 3000)); };

    // ---------------------------------------------------------------- seed
    const stateFile = path.join(outDir(), `state-${RUN}-${app.name}.json`);
    let S;
    if (process.env.REUSE && fs.existsSync(stateFile)) {
        S = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        log('reusing', S.t);
    } else {
        phase = 'seed';
        const t = tag('u38i28');
        const u = (s) => `${t}${s}`;
        const users = [
            {username: u('mg'), roles: ['manager'], givenName: NAMES.mg[0], familyName: NAMES.mg[1]},
            {username: u('se'), roles: ['sectionEditor'], givenName: NAMES.se[0], familyName: NAMES.se[1]},
            {username: u('au'), roles: ['author'], givenName: NAMES.au[0], familyName: NAMES.au[1]},
        ];
        if (!isOPS) {
            users.push({username: u('ed'), roles: ['editor'], givenName: NAMES.ed[0], familyName: NAMES.ed[1]});
            users.push({username: u('rv'), roles: ['externalReviewer'], givenName: NAMES.rv[0], familyName: NAMES.rv[1]});
        }
        const C = await app.api.createContext({tag: t, users});
        S = {t, path: C.path, users: Object.fromEntries(C.users.map((x) => [x.username.slice(t.length), x.username]))};
        const base = {context: C.path, submitter: u('au')};
        const part = (k, role) => ({username: u(k), role});
        S.D = await app.api.createSubmission({...base, tag: `${t}d`, title: `I28 D ${t}`, participants: [part('se', 'sectionEditor')]});
        if (!isOPS) S.R = await app.api.createSubmission({...base, tag: `${t}r`, title: `I28 R ${t}`, decisions: [isOMP ? 'skipInternalReview' : 'sendExternalReview'], reviewRounds: [{files: [{file: 'article.pdf'}]}], participants: [part('ed', 'editor')]});
        S.W = await app.api.createSubmission({...base, tag: `${t}w`, title: `I28 W ${t}`, submitted: false, participants: [part('se', 'sectionEditor')], ...(isOPS ? {} : {files: [{file: 'article.pdf'}]})});
        fs.writeFileSync(stateFile, JSON.stringify(S, null, 1));
        log('seeded', S.path, JSON.stringify({D: S.D.submissionId, R: S.R && S.R.submissionId, rounds: S.R && S.R.reviewRounds, W: S.W.submissionId}));
    }
    const U = (k) => S.users[k];
    const CP = S.path;
    const DKEY = isOPS ? 'workflow_5' : 'workflow_1';
    const wfUrl = (id, key) => app.url(`/index.php/${CP}/en/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);

    // ---------------------------------------------------------------- helpers
    const H = (page) => {
        const h = {};
        h.snap = async (name, extra) => { const n = `${RUN}-${name}`; const s = await screen(page); record(n, extra ? {...s, extra} : s); await shot(page, n).catch(() => {}); return s; };
        h.wf = () => page.getByRole('dialog').filter({has: page.locator('[data-cy="sidemodal-header"]')}).first();
        h.open = async (id, key, label) => {
            await page.goto(wfUrl(id, key));
            await h.wf().locator('[data-cy="sidemodal-header"]').waitFor({timeout: 30000}).catch(() => log('no workflow header', id, key));
            await page.waitForFunction(() => !/Loading|Refreshing data/.test((document.querySelector('[data-cy="sidemodal-header"]') || {}).innerText || ''), null, {timeout: 15000}).catch(() => {});
            await idle(page);
            if (label) await h.snap(label);
        };
        h.reland = async () => { await page.goto(page.url()); await h.wf().locator('[data-cy="sidemodal-header"]').waitFor({timeout: 30000}).catch(() => {}); await idle(page); };
        h.logDialog = () => page.getByRole('dialog', {name: 'Activity Log & Notes', exact: true});
        h.openLog = async () => {
            const btn = h.wf().locator('[data-cy="sidemodal-header"]').getByRole('button', {name: 'Activity Log', exact: true}).first();
            if (!(await btn.count())) { log('no Activity Log button'); return null; }
            const fetched = page.waitForResponse((r) => r.url().includes('submission-event-log-grid/fetch-grid'), {timeout: 30000}).catch(() => null);
            await btn.click();
            await fetched;
            await h.logDialog().locator('tr.gridRow').first().waitFor({timeout: 30000}).catch(() => log('History grid did not fill'));
            await idle(page);
            return h.logDialog();
        };
        // The History rows as {i, date, user, event, arrow} (the arrow's "Settings" and inline scripts dropped).
        h.rows = async () => h.logDialog().locator('tr.gridRow').evaluateAll((trs) => trs.map((tr, i) => {
            const cell = (td) => { if (!td) return ''; const c = td.cloneNode(true); c.querySelectorAll('script, a.show_extras, a.hide_extras').forEach((e) => e.remove()); return (c.textContent || '').replace(/\s+/g, ' ').trim(); };
            const tds = [...tr.querySelectorAll(':scope > td')];
            return {i, date: cell(tds[0]), user: cell(tds[1]), event: cell(tds[2]), arrow: !!tr.querySelector('a.show_extras, a.hide_extras')};
        })).catch(() => []);
        h.readLog = async (label) => {
            const d = await h.openLog();
            if (!d) return null;
            const rows = await h.rows();
            await h.snap(label, {rows});
            log(`[${label}]`, JSON.stringify(brief(rows)).slice(0, 4000));
            return rows;
        };
        h.closeLog = async () => {
            await h.logDialog().getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
            await h.logDialog().waitFor({state: 'detached', timeout: 10000}).catch(() => {});
            await h.reland();
        };
        // Press line i's arrow, then "View Email"; return the window's text.
        h.viewEmail = async (i, label) => {
            const tr = h.logDialog().locator('tr.gridRow').nth(i);
            const a = tr.locator('a.show_extras').first();
            if (!(await a.count())) return {noArrow: true};
            await a.click();
            const strip = tr.locator('xpath=following-sibling::tr[1]');
            const link = strip.getByRole('link', {name: 'View Email', exact: true}).first();
            await link.waitFor({timeout: 15000}).catch(() => {});
            if (!(await link.count())) return {noViewEmail: true, strip: flat(await strip.innerText().catch(() => ''), 300)};
            await loc(page, 'an email line\'s "View Email" (strip under the line)', link);
            await link.click();
            const win = page.getByRole('dialog', {name: 'View Email'}).last();
            await win.waitFor({timeout: 20000}).catch(() => {});
            await page.waitForFunction(() => { const ds = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length); const d = ds[ds.length - 1]; return d && /Subject/.test(d.innerText); }, null, {timeout: 20000}).catch(() => {});
            const s = await h.snap(label);
            const text = s.text.dialog || '';
            await win.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
            await sleep(600);
            return {from: (text.match(/From:\s*([^\n]*)/) || [])[1] || null, to: (text.match(/To:\s*([^\n]*)/) || [])[1] || null, subject: (text.match(/Subject:\s*([^\n]*)/) || [])[1] || null, head: flat(text, 500)};
        };
        // Read the History, then "View Email" on every email line `pick` selects.
        h.emailLines = async (label, pick) => {
            const rows = (await h.readLog(label)) || [];
            const out = [];
            for (const r of rows.filter((x) => /^An email has been sent/.test(x.event) && (!pick || pick(x)))) {
                if (!(await h.logDialog().isVisible().catch(() => false))) await h.openLog();
                const v = await h.viewEmail(r.i, `${label}-view-${r.i}`);
                out.push({user: r.user, event: r.event, ...v});
                await h.reland();
            }
            if (await h.logDialog().isVisible().catch(() => false)) await h.closeLog();
            return {rows: brief(rows), emails: out};
        };
        return h;
    };
    const sect = async (name, fn) => {
        phase = name;
        const {page, close} = await launch(app);
        page.on('dialog', (d) => { log(new Date().toISOString(), 'browser dialog', d.type(), JSON.stringify(d.message())); d.accept().catch(() => {}); });
        try { await fn(page, H(page)); } catch (e) { log('SECTION FAILED', String(e.stack || e).slice(0, 1500)); await shot(page, `${RUN}-${name}-failure`).catch(() => {}); } finally { await close(); phase = ''; }
    };

    // ---------------------------------------------------------------- base
    if (on('base')) await sect('base', async (page, h) => {
        await signIn(page, U('mg'));
        await h.open(S.D.submissionId, DKEY, 'base-D-workflow');
        const r = await h.emailLines('base-D-history');
        // sweep: the window's tabs, a note typed and not added, then "History"
        await h.openLog();
        const tabs = await h.logDialog().getByRole('tab').allInnerTexts().catch(() => []);
        await loc(page, 'Activity Log window tabs', h.logDialog().getByRole('tab'));
        await loc(page, 'History column headers', h.logDialog().getByRole('columnheader'));
        await loc(page, 'History rows (tr.gridRow)', h.logDialog().locator('tr.gridRow'));
        const dialogs = [];
        const onD = (d) => dialogs.push(`${new Date().toISOString()} ${d.type()}: ${d.message()}`);
        page.on('dialog', onD);
        await h.logDialog().getByRole('tab', {name: 'Notes'}).click();
        const box = h.logDialog().getByRole('textbox', {name: 'Add Note'});
        await box.waitFor({timeout: 20000}).catch(() => {});
        await box.fill('I28 typed, not added').catch(() => {});
        await h.snap('base-notes-typed');
        mark('switch to History pressed');
        await h.logDialog().getByRole('tab', {name: 'History'}).click();
        await h.logDialog().locator('tr.gridRow').first().waitFor({timeout: 20000}).catch(() => {});
        await idle(page);
        await h.snap('base-history-after-switch');
        const afterSwitch = dialogs.length;
        await sleep(2000);
        // back on "Notes": is the box empty?
        await h.logDialog().getByRole('tab', {name: 'Notes'}).click();
        await box.waitFor({timeout: 20000}).catch(() => {});
        await idle(page);
        const boxBack = await box.inputValue().catch(() => null);
        await h.snap('base-notes-back');
        const afterBack = dialogs.length;
        await sleep(1000);
        mark('window Close pressed (from Notes, nothing typed)');
        await h.logDialog().getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await h.logDialog().waitFor({state: 'detached', timeout: 10000}).catch(() => {});
        await sleep(1000);
        const afterClose = dialogs.length;
        mark('reload after close');
        await h.reland();
        page.off('dialog', onD);
        facts.baseSweep = {afterSwitch, boxBack, afterBack, afterClose, all: dialogs.slice()};
        fact('base', {...r, tabs: tabs.map((x) => x.trim()), switchDialogs: dialogs});
    });

    // ---------------------------------------------------------------- closeh (sweep)
    // A note typed and not added, "History" pressed and answered "OK", then the
    // window's "Close" pressed straight from "History": asked again? First
    // answer "Cancel", then "Close" again answered "OK"; then two reloads
    // (a "Leave site?"?). Its own dialog listener decides every answer.
    if (on('closeh')) {
        phase = 'closeh';
        const {page, close} = await launch(app);
        const answers = [];
        const got = [];
        page.on('dialog', (d) => {
            const a = d.type() === 'beforeunload' ? 'accept' : (answers.shift() || 'accept');
            got.push(`${new Date().toISOString()} ${d.type()} -> ${a}: ${d.message()}`);
            log(new Date().toISOString(), 'browser dialog', d.type(), '->', a, JSON.stringify(d.message()));
            (a === 'accept' ? d.accept() : d.dismiss()).catch(() => {});
        });
        const h = H(page);
        const out = {};
        try {
            await signIn(page, U('mg'));
            await h.open(S.D.submissionId, DKEY);
            await h.openLog();
            await h.logDialog().getByRole('tab', {name: 'Notes'}).click();
            const box = h.logDialog().getByRole('textbox', {name: 'Add Note'});
            await box.waitFor({timeout: 20000});
            await idle(page);
            out.notesBefore = flat(await h.logDialog().getByRole('tabpanel').last().innerText().catch(() => ''), 300);
            await box.fill('I28 closeh typed, not added');
            answers.push('accept');
            mark('History pressed (answer OK)');
            await h.logDialog().getByRole('tab', {name: 'History'}).click();
            await h.logDialog().locator('tr.gridRow').first().waitFor({timeout: 20000}).catch(() => {});
            await idle(page);
            await sleep(1000);
            out.afterSwitch = got.length;
            await h.snap('closeh-1-history');
            answers.push('dismiss');
            mark('Close pressed from History (answer Cancel)');
            await h.logDialog().getByRole('button', {name: 'Close', exact: true}).first().click();
            await sleep(1500);
            out.afterClose1 = got.length;
            out.openAfterCancel = await h.logDialog().isVisible().catch(() => false);
            await h.snap('closeh-2-after-cancel');
            if (out.openAfterCancel) {
                out.selectedTab = await h.logDialog().locator('[role=tab][aria-selected=true]').innerText().catch(() => null);
                answers.push('accept');
                mark('Close pressed again (answer OK)');
                await h.logDialog().getByRole('button', {name: 'Close', exact: true}).first().click();
                await h.logDialog().waitFor({state: 'detached', timeout: 10000}).catch(() => {});
                await sleep(1500);
                out.afterClose2 = got.length;
                out.openAfterOK = await h.logDialog().isVisible().catch(() => false);
                await h.snap('closeh-3-after-ok');
            }
            mark('reload 1');
            await h.reland();
            await sleep(800);
            out.afterReload1 = got.length;
            mark('reload 2');
            await h.reland();
            await sleep(800);
            out.afterReload2 = got.length;
            // does the note exist? (nothing added)
            await h.openLog();
            await h.logDialog().getByRole('tab', {name: 'Notes'}).click();
            await h.logDialog().getByRole('textbox', {name: 'Add Note'}).waitFor({timeout: 20000}).catch(() => {});
            await idle(page);
            await h.snap('closeh-4-notes-after');
            out.notesAfter = flat(await h.logDialog().getByRole('tabpanel').last().innerText().catch(() => ''), 300);
        } catch (e) { out.error = String(e.message).split('\n')[0]; log('closeh ERROR', out.error); await shot(page, `${RUN}-closeh-error`).catch(() => {}); }
        out.dialogs = got;
        await close();
        fact('closeh', out);
        phase = '';
    }

    // ---------------------------------------------------------------- disc (control, A1)
    if (on('disc')) await sect('disc', async (page, h) => {
        const T = require('../../../pages/TasksDiscussionsPages.js');
        await signIn(page, U('se'));
        await h.open(S.D.submissionId, DKEY, 'disc-se-workflow');
        const title = ((await page.locator('[data-cy="discussion-manager"] h3').first().innerText().catch(() => '')) || '').trim();
        log('panel title', title);
        const panel = new T.TasksDiscussionsPanel(page, CP, {title});
        const out = {title};
        try {
            await panel.expectSettled();
            const add = await panel.openAdd();
            await add.nameField().fill(`I28 disc ${S.t}`);
            await add.tick(U('au'));
            await add.typeMessage('I28 discussion message.');
            await h.snap('disc-add-filled');
            mark('discussion Save pressed');
            await add.saveExpectClosed();
            mark('discussion window closed; relanding');
            await panel.reland();
            mark('relanded');
            await sleep(1000);
            mark('second reload');
            await panel.reland();
            mark('relanded again');
        } catch (e) { out.error = String(e.message).split('\n')[0]; log('disc ERROR', out.error); await shot(page, `${RUN}-disc-error`).catch(() => {}); }
        mark('signing in as the manager');
        await signIn(page, U('mg'));
        await h.open(S.D.submissionId, DKEY);
        const r = await h.emailLines('disc-D-history-mg', (x) => /I28 disc/.test(x.event));
        fact('disc', {...out, ...r});
    });

    // ---------------------------------------------------------------- decline
    if (on('decline')) await sect('decline', async (page, h) => {
        const out = {};
        await signIn(page, U('mg'));
        await h.open(S.D.submissionId, DKEY, 'decline-mg-workflow');
        const before = (await h.readLog('decline-0-history')) || [];
        await h.closeLog();
        try {
            const btn = h.wf().getByRole('button', {name: 'Decline Submission', exact: true}).first();
            out.buttonForManager = await btn.count();
            await loc(page, 'workflow "Decline Submission"', btn);
            await btn.click();
            await page.waitForURL(/decision\/record/, {timeout: 30000});
            await idle(page);
            await page.locator('.composer__loadingTemplateMask').first().waitFor({state: 'detached', timeout: 30000}).catch(() => {});
            await sleep(800);
            const step = page.locator('.pkpStep:not([hidden])');
            out.subject = await step.locator('input[name="subject"]').inputValue().catch(() => null);
            out.stepText = flat(await step.innerText().catch(() => ''), 600);
            await h.snap('decline-email-page');
            await page.getByRole('button', {name: 'Record Decision', exact: true}).click();
            await page.getByRole('dialog').filter({hasText: /declined/i}).first().waitFor({timeout: 45000}).catch(() => log('no completion dialog'));
            const done = await h.snap('decline-recorded');
            out.completion = flat(done.text.dialog, 400);
        } catch (e) { out.error = String(e.message).split('\n')[0]; log('decline ERROR', out.error); await shot(page, `${RUN}-decline-error`).catch(() => {}); }
        await h.open(S.D.submissionId, DKEY);
        const after = (await h.readLog('decline-1-history')) || [];
        out.added = brief(newLines(before, after));
        await h.closeLog();
        const r = await h.emailLines('decline-2-history', (x) => out.subject ? x.event.includes(out.subject.slice(0, 40)) : true);
        fact('decline', {...out, ...r});
    });

    // ---------------------------------------------------------------- review {OJS OMP}
    if (on('review') && S.R) await sect('review', async (page, h) => {
        const out = {};
        const RKEY = `workflow_3_${S.R.reviewRounds[0].id}`;
        await signIn(page, U('mg'));
        await h.open(S.R.submissionId, RKEY, 'review-mg-workflow');
        const before = (await h.readLog('review-0-history')) || [];
        await h.closeLog();
        try {
            const panel = h.wf().locator('[data-cy="reviewer-manager"]');
            await loc(page, 'reviewer panel "Add Reviewer"', panel.getByRole('button', {name: 'Add Reviewer', exact: true}));
            await panel.getByRole('button', {name: 'Add Reviewer', exact: true}).click();
            const add = page.getByRole('dialog').filter({has: page.locator('.listPanel--selectReviewer')});
            const box = add.locator('.listPanel--selectReviewer input.pkpSearch__input');
            await box.waitFor({timeout: 30000});
            await box.fill(NAMES.rv[0]); await box.press('Enter'); await idle(page);
            await page.waitForFunction(() => { const ta = document.querySelector('#reviewerFormFooter textarea[name="personalMessage"]'); const m = window.tinyMCE || window.tinymce; return !!(ta && m && m.get(ta.id) && m.get(ta.id).initialized); }, null, {timeout: 30000});
            await add.getByText(`Select ${fullName('rv')}`).click();
            await idle(page);
            await add.frameLocator('iframe[id^="personalMessage"]').locator('body').filter({hasText: /\w/}).waitFor({timeout: 30000});
            out.emailSubject = await add.locator('input[name="subject"], [name="subject"]').first().inputValue().catch(() => null);
            await h.snap('review-add-form');
            await add.getByRole('button', {name: 'Add Reviewer', exact: true}).click();
            await h.wf().locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: fullName('rv')}).first().waitFor({timeout: 30000}).catch(() => log('no reviewer row'));
            await h.snap('review-added');
        } catch (e) { out.error = String(e.message).split('\n')[0]; log('review ERROR', out.error); await shot(page, `${RUN}-review-error`).catch(() => {}); }
        await h.reland();
        const after = (await h.readLog('review-1-history')) || [];
        out.added = brief(newLines(before, after));
        await h.closeLog();
        const addedEmails = newLines(before, after).filter((x) => /^An email has been sent/.test(x.event)).map((x) => x.event);
        const r = await h.emailLines('review-2-history', (x) => addedEmails.includes(x.event));
        fact('review', {...out, ...r});
    });

    // ---------------------------------------------------------------- answer {OJS OMP}
    // The reviewer accepts and submits (after "review"): the reviewer's answer
    // and the "Review complete" email lines (Rule 4c, A5), read by the manager.
    if (on('answer') && S.R) await sect('answer', async (page, h) => {
        const out = {};
        const RKEY = `workflow_3_${S.R.reviewRounds[0].id}`;
        await signIn(page, U('mg'));
        await h.open(S.R.submissionId, RKEY);
        const before = (await h.readLog('answer-0-history')) || [];
        await h.closeLog();
        try {
            await signIn(page, U('rv'));
            await page.goto(app.url(`/index.php/${CP}/en/reviewer/submission/${S.R.submissionId}`));
            await idle(page);
            await h.snap('answer-rv-step1');
            const priv = page.locator('input[name="privacyConsent"]').filter({visible: true});
            if (await priv.count()) await priv.check();
            await page.getByRole('button', {name: /Accept Review, Continue to Step #2/}).click();
            const s3 = page.getByRole('button', {name: 'Continue to Step #3'}).filter({visible: true});
            await s3.first().waitFor({timeout: 30000});
            await h.snap('answer-rv-step2');
            await s3.first().click();
            const submit = page.getByRole('button', {name: 'Submit Review', exact: true}).filter({visible: true});
            await submit.waitFor({timeout: 30000});
            const body = page.frameLocator('iframe[id^="comments"]:not([id^="commentsPrivate"])').locator('body');
            await body.click(); await body.pressSequentially('I28 review comment.');
            const rec = page.locator('select[id="reviewerRecommendationId"]');
            if (await rec.count()) await rec.selectOption({index: 1});
            await h.snap('answer-rv-step3');
            await submit.click();
            await page.getByRole('button', {name: 'OK', exact: true}).click();
            await page.getByRole('heading', {name: 'Review Submitted'}).waitFor({timeout: 30000}).catch(() => log('no Review Submitted heading'));
            await h.snap('answer-rv-submitted');
        } catch (e) { out.error = String(e.message).split('\n')[0]; log('answer ERROR', out.error); await shot(page, `${RUN}-answer-error`).catch(() => {}); }
        await signIn(page, U('mg'));
        await h.open(S.R.submissionId, RKEY);
        const after = (await h.readLog('answer-1-history')) || [];
        out.added = brief(newLines(before, after));
        await h.closeLog();
        const addedEmails = newLines(before, after).filter((x) => /^An email has been sent/.test(x.event)).map((x) => x.event);
        const r = await h.emailLines('answer-2-history', (x) => addedEmails.includes(x.event));
        fact('answer', {...out, ...r});
    });

    // ---------------------------------------------------------------- wizard
    if (on('wizard')) await sect('wizard', async (page, h) => {
        const out = {};
        const W = S.W;
        const cur = () => page.locator('.pkpSteps__step__label--current');
        const cont = async (label) => {
            const b = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true});
            for (let a = 0; ; a++) { await b.click(); try { await cur().filter({hasText: label}).waitFor({timeout: 6000}); return; } catch (e) { if (a >= 2) throw e; } }
        };
        try {
            await signIn(page, U('au'));
            await page.goto(app.url(`/index.php/${CP}/en/submission?id=${W.submissionId}`));
            await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: 30000});
            await idle(page);
            if (isOPS) {
                const labelDialog = page.getByRole('dialog').filter({has: page.locator('#preprintGalleyForm')});
                for (let a = 0; ; a++) { await page.getByRole('link', {name: 'Add File', exact: true}).click(); try { await labelDialog.first().waitFor({timeout: 5000}); break; } catch (e) { if (a >= 2) throw e; } }
                await labelDialog.locator('input[name="label"]').fill('PDF');
                await labelDialog.getByRole('button', {name: 'Save', exact: true}).click();
                const upload = page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')});
                const g = upload.locator('select[name="genreId"]').first();
                await g.waitFor({timeout: 30000});
                await g.selectOption({label: 'Preprint Text'});
                await upload.locator('input[type="file"]').setInputFiles(fixture(app, 'preprint.pdf'));
                await page.waitForFunction(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find((x) => x.innerText.trim() === 'Continue'); return b && !b.disabled; }, null, {timeout: 30000});
                await upload.getByRole('button', {name: 'Continue', exact: true}).click();
                await upload.getByRole('tab', {name: '2. Review Details'}).waitFor({timeout: 30000});
                await upload.getByRole('button', {name: 'Continue', exact: true}).click();
                await upload.getByRole('tab', {name: '3. Confirm'}).waitFor({timeout: 30000});
                await upload.getByRole('button', {name: 'Complete', exact: true}).click();
                await upload.waitFor({state: 'hidden', timeout: 30000});
                await idle(page);
            }
            await cont('Details');
            const ab = page.locator('iframe[id*="-abstract-"]');
            if (await ab.count()) { const b = page.frameLocator('iframe[id*="-abstract-"]').first().locator('body'); if (!(await b.innerText().catch(() => '')).trim()) { await b.click(); await b.fill('I28 wizard abstract.'); } }
            await cont('Contributors');
            if (isOPS) { await cont('For Readers'); await page.getByRole('radio', {name: 'This preprint has not been published elsewhere.'}).check(); } else await cont('For the Editors');
            const validated = page.waitForResponse((r) => r.url().includes('/submit') && r.request().method() === 'POST' && r.status() < 500, {timeout: 45000});
            await cont('Review');
            await validated.catch(() => {});
            await page.locator('.submissionWizard__loadingReview').waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
            await h.snap('wizard-review');
            await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true}).click();
            const d = page.getByRole('dialog').filter({hasText: /will be submitted to|Are you sure you want to (complete|submit)/});
            await d.waitFor({timeout: 30000});
            await d.getByRole('button', {name: 'Submit', exact: true}).click();
            await page.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: 45000});
            await h.snap('wizard-complete');
        } catch (e) { out.error = String(e.message).split('\n')[0]; log('wizard ERROR', out.error); await shot(page, `${RUN}-wizard-error`).catch(() => {}); }
        await signIn(page, U('mg'));
        await h.open(W.submissionId, null);
        const r = await h.emailLines('wizard-W-history');
        fact('wizard', {...out, ...r});
    });

    saveFacts();
});
