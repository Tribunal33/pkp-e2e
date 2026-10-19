// U24 claim check, chunk H19 (housekeeping 2026-10-19, incidentals row): the workflow page of a
// submission opened by its address by its own author who also holds a manager-level role
// ("Journal editor", OMP "Press editor", OPS "Preprint Server manager") but is not assigned to it as
// editor. Source: U38 A12 reporter k26's control (an "Error: You are not allowed to access these
// files." dialog beside "You don't currently have access to that stage of the workflow.").
//
// On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), `publicknowledge`.
// The kit builds nothing: the role is given on screen (admin › Users & Roles › "Invite to a role",
// accepted from the email), so reset the fleet before each run.
//
// Cases: OJS submission 2 (author ccorino, Review round 1), control 4 (Submission, not theirs);
//        OMP submission 2 (author afinkel, External Review round 1, no editor assigned), control 3;
//        OPS submission 1 (author ccorino, Production), control 2 (posted, not theirs).
// Phases (PHASES=pre,grant,drive,ctl; default all, in that order, one process):
//   pre    the author (Author, Reader only): My Submissions address (author's view, the control) and
//          the editorial dashboard address (refused at the page)
//   grant  admin invites the author to the manager-level role; the author accepts from the email
//   drive  the author-editor: sign-in landing; dashboard address of their own submission: landing,
//          dialogs, the API answers; every stage/round entry and publication page pressed; header
//          buttons; the "Error" dialog's "OK"; reload; My Submissions address; the older addresses
//          (workflow/access, workflow/index/<id>/<stage>, authorDashboard/submission)
//   ctl    the author-editor on a submission that is not theirs (full manager view); dbarnes on the
//          authored one
//   ctlold (not in the default list) the older addresses (workflow/access, workflow/index/<other>/<last
//          stage>) typed by the author-editor for the control submission (needs grant first)
//   ctlpress (not in the default list) the first decision button pressed by dbarnes, then by the
//          author-editor, each window read and closed (needs grant first)
//
// Reset:  npm run fleet-prep -- --feature issues-cc19e --dataset 3 --reset
// Run:    PROBE_RUN=r1 PROBE_FEATURE=issues-cc19e PKP_E2E_DATASET=3 PROBE_AGENT=cc19e \
//           bin/app-lock.sh shared ojs -- node bin/probe.js ojs shared/playwright/checks/U24/H19/h19.js
// 3.5:    PKP_E2E_LINE=stable-3_5_0 PROBE_FEATURE=issues-cc19e-3_5 PROBE_RUN=s1 … (no lock)
// Facts:  .reports/<feature>/cc19e/h19-facts-[<phases>-]<run>-<app>.json; screens h19-<step>-<run>-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, serverLog, sql} = require('../../../probe');

const T = 30_000;
const PHASES = (process.env.PHASES || 'pre,grant,drive,ctl').split(',');
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const TAG = 'cc19e';

const CASES = {
    ojs: {sub: 2, author: 'ccorino', role: 'Journal editor', other: 4, stages: {1: 'submission', 3: 'externalReview', 4: 'editorial', 5: 'production'}},
    omp: {sub: 2, author: 'afinkel', role: 'Press editor', other: 3, stages: {1: 'submission', 2: 'internalReview', 3: 'externalReview', 4: 'editorial', 5: 'production'}},
    ops: {sub: 1, author: 'ccorino', role: 'Preprint Server manager', other: 2, stages: {5: 'production'}},
};

/** The workflow panel as data (DOM facts from U24 I29's wfInfo). */
const wfInfo = (page) => page.evaluate(() => {
    const vis = (e) => !!(e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden');
    const txt = (e) => (e ? e.innerText.trim().replace(/\s+/g, ' ') : null);
    const header = document.querySelector('[data-cy="sidemodal-header"]');
    const root = header ? header.closest('[role=dialog]') || header.parentElement : null;
    const others = [...document.querySelectorAll('[role=dialog], [role=alertdialog]')].filter((d) => vis(d) && (!root || (d !== root && !d.contains(root) && !root.contains(d)))).map((d) => txt(d).slice(0, 500));
    const inner = root ? [...root.querySelectorAll('[role=dialog], [role=alertdialog]')].filter(vis).map((d) => txt(d).slice(0, 500)) : [];
    if (!root) return {panel: false, otherDialogs: others};
    const nav = root.querySelector('nav');
    const links = nav ? [...nav.querySelectorAll('a')] : [];
    const menu = links.map((a) => {
        const cls = a.className || '';
        let level = 1;
        if (/!px-(7|9)\b/.test(cls)) level = 2;
        if (/!px-(10|12)\b/.test(cls)) level = 3;
        if (/!px-(14|16)\b/.test(cls)) level = 4;
        return {t: (a.textContent || '').trim().replace(/\s+/g, ' '), level, visible: vis(a), striped: /!border-s-8/.test(cls), selected: /bg-selection-dark/.test(cls)};
    });
    const h2 = root.querySelector('.pkp-modal-scroll-container h2');
    const prim = root.querySelector('[data-cy="workflow-primary-items"]');
    const sec = root.querySelector('[data-cy="workflow-secondary-items"]');
    const act = root.querySelector('[data-cy="workflow-action-items"]');
    return {
        panel: true,
        headerText: txt(header),
        headerButtons: header ? [...header.querySelectorAll('button')].filter(vis).map((b) => txt(b) || b.getAttribute('aria-label')).filter(Boolean) : [],
        heading: txt(h2),
        controlsLeft: txt(root.querySelector('[data-cy="workflow-controls-left"]')),
        controlsRight: txt(root.querySelector('[data-cy="workflow-controls-right"]')),
        primary: prim ? txt(prim).slice(0, 600) : null,
        primaryH3: prim ? [...prim.querySelectorAll('h3')].filter(vis).map(txt).slice(0, 12) : [],
        secondary: sec ? txt(sec).slice(0, 300) : null,
        actions: act ? [...act.querySelectorAll('button, a')].filter(vis).map(txt).filter(Boolean) : null,
        menu,
        innerDialogs: inner,
        otherDialogs: others,
    };
}).catch((e) => ({error: String(e.message)}));

const menuKey = (page) => { try { return new URL(page.url()).searchParams.get('workflowMenuKey'); } catch (e) { return null; } };
const menuShape = (info) => (info.menu || []).map((m) => `${'  '.repeat(m.level - 1)}${m.t}${m.visible ? '' : ' (hidden)'}${m.striped ? ' [stripe]' : ''}${m.selected ? ' [sel]' : ''}`);

forEachApp(async (app) => {
    const c = CASES[app.name];
    const RUN = process.env.PROBE_RUN || 'r1';
    const o = {app: app.name, line: app.line || 'main', run: RUN, case: c, phases: PHASES};
    const {page, close} = await launch(app);
    const log = serverLog(app);
    const from = log.mark();
    // the browser's own traffic: every /api/ answer of 400 or more, with its JSON body
    const bad = [];
    page.on('response', async (r) => {
        if (r.status() < 400) return;
        const u = r.url().replace(/^https?:\/\/[^/]+/, '');
        let body = null;
        if (/\/api\/|\$\$\$call\$\$\$/.test(u)) body = await r.text().then((t) => flat(t, 300)).catch(() => null);
        bad.push({status: r.status(), method: r.request().method(), url: u.slice(0, 240), body});
    });
    const errs = [];
    page.on('console', (m) => { if (m.type() === 'error') errs.push(flat(m.text(), 300)); });
    page.on('pageerror', (e) => errs.push(`pageerror: ${flat(e.message, 300)}`));
    const say = (k, v) => console.log(`[h19 ${app.name} ${RUN}] ${k}`, JSON.stringify(v).slice(0, 1800));
    const step = async (key, fn) => {
        const b0 = bad.length; const e0 = errs.length;
        try { o[key] = await fn(); } catch (e) { o[key] = {threw: flat(e.message, 400)}; await shot(page, `h19-${key}-threw`).catch(() => {}); }
        if (o[key] && typeof o[key] === 'object') {
            if (bad.length > b0) o[key].bad = bad.slice(b0);
            if (errs.length > e0) o[key].consoleErrors = errs.slice(e0);
        }
        say(key, o[key]);
        return o[key];
    };
    const settle = async () => {
        await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: 20_000}).catch(() => {});
        await page.waitForFunction(() => {
            const h = document.querySelector('[data-cy="sidemodal-header"]');
            const d = h && h.closest('[role=dialog]');
            return !d || !/Loading|Refreshing data/.test(d.innerText);
        }, null, {timeout: 15_000}).catch(() => {});
        await idle(page); await sleep(800); await idle(page);
    };
    const snap = async (label) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; }
        const info = await wfInfo(page);
        record(`h19-${label}`, {...s, info});
        await shot(page, `h19-${label}`).catch(() => {});
        return {s, info};
    };
    const brief = ({s, info}) => ({
        url: s.url.replace(app.baseURL, ''), title: s.title, key: menuKey(page), panel: info.panel,
        header: flat(info.headerText, 300), headerButtons: info.headerButtons, heading: info.heading,
        primary: flat(info.primary, 400), primaryH3: info.primaryH3, secondary: flat(info.secondary, 200), actions: info.actions,
        controlsLeft: info.controlsLeft, controlsRight: info.controlsRight,
        innerDialogs: info.innerDialogs, otherDialogs: info.otherDialogs, notices: s.notices,
        lastDialog: flat(s.text && s.text.dialog, 400), mainText: info.panel ? undefined : flat(s.text && s.text.main, 500),
    });
    const open = async (path, label) => {
        const res = await page.goto(app.url(path)).catch((e) => ({error: e.message}));
        await settle();
        const r = brief(await snap(label));
        r.status = res && res.status ? res.status() : res;
        r.menu = menuShape(await wfInfo(page));
        return r;
    };
    // The "Error" dialog over the panel (a Vue dialog, modal: it hides the rest of the page from
    // role queries and takes the clicks): its text, then "OK".
    const dismissError = async () => {
        const d = page.locator('[role=dialog]:visible, [role=alertdialog]:visible').filter({hasText: /^\s*Error/}).last();
        if (!(await d.isVisible().catch(() => false))) return null;
        const text = flat(await d.innerText(), 300);
        await d.locator('button').filter({hasText: /^\s*OK\s*$/}).first().click({timeout: 5000}).catch(() => {});
        await idle(page); await sleep(500);
        return text;
    };
    // Press a side-menu entry by label and level (nth among equals) and read the screen.
    const press = async (label, level, nth, snapLabel) => {
        const errorBefore = await dismissError();
        const nav = page.locator('[data-cy="sidemodal-header"]').first().locator('xpath=ancestor::*[@role="dialog"][1]').locator('nav');
        const idx = await nav.locator('a').evaluateAll((as, [lab, lev, n]) => {
            const lv = (a) => { const cl = a.className || ''; if (/!px-(7|9)\b/.test(cl)) return 2; if (/!px-(10|12)\b/.test(cl)) return 3; if (/!px-(14|16)\b/.test(cl)) return 4; return 1; };
            const hits = as.map((a, i) => ({i, t: (a.textContent || '').trim().replace(/\s+/g, ' '), l: lv(a)})).filter((x) => x.t === lab && x.l === lev);
            return hits[n] ? hits[n].i : -1;
        }, [label, level, nth]);
        if (idx < 0) return {label, missing: true};
        await nav.locator('a').nth(idx).click({timeout: 10_000}).catch((x) => console.log('click failed', label, flat(x.message, 100)));
        await idle(page); await sleep(900); await idle(page);
        const r = {label, level, errorBefore, ...brief(await snap(snapLabel))};
        if (r.key == null || !/workflowSubmissionId/.test(r.url)) r.left = true;
        return r;
    };
    // Every visible entry under the first group (stages, rounds) and under the publication group's
    // newest version node, pressed in menu order.
    const walk = async (prefix) => {
        const info = await wfInfo(page);
        if (!info.panel) return {panel: false};
        const out = {entries: []};
        const seen = {};
        let group = null; let g = 0;
        const targets = [];
        for (const m of info.menu) {
            if (m.level === 1) { group = m.t; g++; continue; }
            const nth = (seen[`${m.t}|${m.level}`] = (seen[`${m.t}|${m.level}`] || 0) + 1) - 1;
            if (!m.visible) continue;
            if (g >= 2 && m.level === 2) continue; // version nodes, "Create New Version"
            targets.push({t: m.t, level: m.level, nth, group});
        }
        let n = 0;
        for (const x of targets) {
            n++;
            const r = await press(x.t, x.level, x.nth, `${prefix}-e${String(n).padStart(2, '0')}-${RUN}`);
            out.entries.push({group: x.group, ...r});
        }
        return out;
    };
    const dash = `/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=`;
    const mine = `/index.php/${app.contextPath}/en/dashboard/mySubmissions?workflowSubmissionId=`;
    const groupsOf = (u) => sql(app, `select string_agg(s.setting_value, ', ' order by ug.user_group_id) from users u join user_user_groups uug on uug.user_id=u.user_id join user_groups ug on ug.user_group_id=uug.user_group_id join user_group_settings s on s.user_group_id=ug.user_group_id and s.setting_name='name' and s.locale='en' where u.username='${u}' and (uug.date_end is null or uug.date_end > now())`).trim();
    const stageAssignments = (id) => sql(app, `select u.username, s.setting_value from stage_assignments sa join users u on u.user_id=sa.user_id join user_group_settings s on s.user_group_id=sa.user_group_id and s.setting_name='name' and s.locale='en' where sa.submission_id=${id} order by 1`).trim().split('\n');
    try {
        o.groupsBefore = groupsOf(c.author);
        o.assignmentsSub = stageAssignments(c.sub);
        say('premise', {groups: o.groupsBefore, assignments: o.assignmentsSub});

        if (on('pre')) {
            await signIn(page, c.author, {contextPath: app.contextPath});
            await idle(page);
            await step('preLanding', async () => ({url: page.url().replace(app.baseURL, '')}));
            await step('preMine', () => open(`${mine}${c.sub}`, `pre-mine-${RUN}`));
            await step('preMineWalk', () => walk('pre-mine'));
            await step('preDash', () => open(`${dash}${c.sub}`, `pre-dash-${RUN}`));
            await signOut(page).catch(() => {});
        }

        if (on('grant')) {
            if (new RegExp(c.role).test(o.groupsBefore)) {
                o.grant = {skipped: `already holds ${c.role}`};
            } else {
                const subject = `Invitation ${TAG} ${app.name} ${RUN}`;
                const since = new Date();
                await signIn(page, 'admin', {contextPath: app.contextPath});
                await step('invite', () => inviteToRole(page, app, {email: `${c.author}@mailinator.com`, role: c.role, subject}));
                await signOut(page).catch(() => {});
                await step('accept', () => acceptInvitation(app, {email: `${c.author}@mailinator.com`, subject, since}));
                await sleep(1500); // a role's start is compared in whole seconds (users.md)
            }
            o.groupsAfter = groupsOf(c.author);
            o.assignmentsSubAfter = stageAssignments(c.sub);
            say('granted', {groups: o.groupsAfter, assignments: o.assignmentsSubAfter});
        }

        if (on('drive')) {
            await signIn(page, c.author, {contextPath: app.contextPath});
            await idle(page); await sleep(500);
            await step('landing', async () => { const r = brief(await snap(`landing-${RUN}`)); return {url: r.url, main: r.mainText || flat((await screen(page)).text.main, 500)}; });
            // the dashboard address of their own submission
            await step('dash', () => open(`${dash}${c.sub}`, `dash-${RUN}`));
            await step('dashWalk', () => walk('dash'));
            // the header buttons, each pressed and its window read, then closed
            await step('dashHeader', async () => {
                const out = [];
                await page.goto(app.url(`${dash}${c.sub}`)); await settle();
                const errorBefore = await dismissError();
                const header = page.locator('[data-cy="sidemodal-header"]').first();
                const names = (await header.locator('button').allInnerTexts()).map((t) => flat(t, 40)).filter((t) => t && !/^Close$/.test(t));
                for (const name of names) {
                    await dismissError();
                    const b = header.locator('button').filter({hasText: new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`)}).first();
                    if (!(await b.isVisible().catch(() => false))) { out.push({name, visible: false}); continue; }
                    await b.click({timeout: 8000}).catch(() => {});
                    await idle(page); await sleep(1200); await idle(page);
                    const r = brief(await snap(`dash-hdr-${name.replace(/\W+/g, '')}-${RUN}`));
                    out.push({name, url: r.url, innerDialogs: r.innerDialogs, otherDialogs: r.otherDialogs, lastDialog: r.lastDialog});
                    await page.keyboard.press('Escape').catch(() => {});
                    await sleep(600);
                    if (!/workflowSubmissionId/.test(page.url())) { await page.goto(app.url(`${dash}${c.sub}`)); await settle(); }
                }
                return {errorBefore, names, out};
            });
            // sweep: the stage's own controls in this view: the Participants rows' menus, the
            // Reviewers panel, and the first decision button pressed (what it opens)
            await step('dashControls', async () => {
                await page.goto(app.url(`${dash}${c.sub}`)); await settle();
                const errorBefore = await dismissError();
                const root = page.locator('[data-cy="sidemodal-header"]').first().locator('xpath=ancestor::*[@role="dialog"][1]');
                const out = {errorBefore};
                const sec = root.locator('[data-cy="workflow-secondary-items"]');
                out.participantsText = flat(await sec.innerText().catch(() => null), 600);
                out.assignOffered = await sec.locator('button').filter({hasText: /^\s*Assign\s*$/}).count();
                const rowMenu = sec.locator('button[aria-haspopup]').first();
                if (await rowMenu.isVisible().catch(() => false)) {
                    await rowMenu.click({timeout: 5000}).catch(() => {});
                    await sleep(600);
                    out.participantMenu = (await page.locator('[role=menu]:visible [role=menuitem]').allInnerTexts().catch(() => [])).map((t) => flat(t, 60));
                    await page.keyboard.press('Escape').catch(() => {}); await sleep(300);
                }
                const prim = root.locator('[data-cy="workflow-primary-items"]');
                out.primaryButtons = (await prim.locator('button').allInnerTexts().catch(() => [])).map((t) => flat(t, 40)).filter(Boolean);
                const act = root.locator('[data-cy="workflow-action-items"] button');
                out.actionButtons = (await act.allInnerTexts().catch(() => [])).map((t) => flat(t, 40)).filter(Boolean);
                const first = out.actionButtons.find((t) => !/Decline|Cancel|Revert/.test(t));
                if (first) {
                    out.pressed = first;
                    await dismissError();
                    await act.filter({hasText: first}).first().click({timeout: 8000}).catch((e) => { out.pressFailed = flat(e.message, 150); });
                    await page.waitForLoadState('domcontentloaded').catch(() => {});
                    await idle(page); await sleep(1500); await idle(page);
                    await sleep(1500); await idle(page);
                    const r = brief(await snap(`dash-decision-${RUN}`));
                    // a decision window with a "Next" (Request Revisions): pressed, the decision page read
                    const next = page.locator('[role=dialog]:visible button').filter({hasText: /^\s*Next\s*$/}).last();
                    if (await next.isVisible().catch(() => false)) {
                        await page.locator('[role=dialog]:visible input[type=radio]').first().check({timeout: 3000}).catch(() => {});
                        await next.click({timeout: 8000}).catch((e) => { out.nextFailed = flat(e.message, 150); });
                        await page.waitForLoadState('domcontentloaded').catch(() => {});
                        await idle(page); await sleep(1500); await idle(page);
                        const n = await snap(`dash-decision-next-${RUN}`);
                        out.next = {url: n.s.url.replace(app.baseURL, ''), title: n.s.title, main: flat(n.s.text && n.s.text.main, 500), dialog: flat(n.s.text && n.s.text.dialog, 300), notices: n.s.notices};
                    }
                    out.after = {url: r.url, title: r.title, panel: r.panel, heading: r.heading, mainText: r.mainText || flat((await screen(page).catch(() => ({text: {}}))).text.main, 500), innerDialogs: r.innerDialogs, otherDialogs: r.otherDialogs, lastDialog: r.lastDialog, notices: r.notices};
                }
                return out;
            });
            // the "Error" dialog's "OK", then what stays; then a reload
            await step('dashOk', async () => {
                await page.goto(app.url(`${dash}${c.sub}`)); await settle();
                const err = page.getByRole('dialog').filter({hasText: /^\s*Error/}).last();
                const any = page.locator('[role=dialog]:visible, [role=alertdialog]:visible').filter({hasText: 'not allowed to access these files'}).last();
                const visible = await any.isVisible().catch(() => false);
                const okBtn = any.getByRole('button', {name: 'OK', exact: true});
                const ok = visible && await okBtn.isVisible().catch(() => false);
                if (ok) { await okBtn.click(); await idle(page); await sleep(800); }
                const after = brief(await snap(`dash-after-ok-${RUN}`));
                await page.reload(); await settle();
                const reload = brief(await snap(`dash-reload-${RUN}`));
                return {errorDialogVisible: visible, errorNamedDialog: await err.isVisible().catch(() => false), okPressed: ok, after, reload};
            });
            // the My Submissions address, as the author-editor
            await step('mine', () => open(`${mine}${c.sub}`, `mine-${RUN}`));
            await step('mineWalk', () => walk('mine'));
            // the older addresses
            await step('olderAccess', () => open(`/index.php/${app.contextPath}/en/workflow/access/${c.sub}`, `old-access-${RUN}`));
            o.olderIndex = {};
            for (const [n, word] of Object.entries(c.stages)) {
                await step(`olderIndex${n}`, () => open(`/index.php/${app.contextPath}/en/workflow/index/${c.sub}/${n}`, `old-index${n}-${RUN}`));
                await step(`olderWord${n}`, () => open(`/index.php/${app.contextPath}/en/workflow/${word}/${c.sub}`, `old-${word}-${RUN}`));
            }
            await step('olderAuthorDash', () => open(`/index.php/${app.contextPath}/en/authorDashboard/submission/${c.sub}`, `old-authordash-${RUN}`));
            // sweep: a publication page left with a change unsaved (the My Submissions view: the
            // editorial view lists no publication pages for this reader)
            await step('leaveUnsaved', async () => {
                await page.goto(app.url(`${mine}${c.sub}`)); await settle();
                const nav = page.locator('[data-cy="sidemodal-header"]').first().locator('xpath=ancestor::*[@role="dialog"][1]').locator('nav');
                const ta = nav.getByRole('link', {name: 'Title & Abstract', exact: true}).last();
                if (!(await ta.isVisible().catch(() => false))) return {titleAbstractListed: false};
                await ta.click(); await idle(page); await sleep(1500); await idle(page);
                const r1 = brief(await snap(`leave-ta-${RUN}`));
                const box = page.locator('[role=dialog] input[type=text]:enabled').first();
                const editable = await box.isVisible().catch(() => false);
                if (editable) { await box.fill(`${await box.inputValue()} ${TAG}`); await box.blur(); }
                const dialogs = [];
                const onDlg = async (d) => { dialogs.push({type: d.type(), message: d.message()}); await d.accept().catch(() => {}); };
                page.on('dialog', onDlg);
                const target = app.name === 'ops' ? 'Contributors' : 'Submission';
                const r2 = await press(target, app.name === 'ops' ? 3 : 2, 0, `leave-after-${RUN}`);
                const back = await press('Title & Abstract', 3, 0, `leave-back-${RUN}`);
                const kept = editable ? await box.inputValue().catch(() => null) : null;
                page.off('dialog', onDlg);
                return {titleAbstractListed: true, ta: {heading: r1.heading, primary: r1.primary, innerDialogs: r1.innerDialogs}, editable, dialogs, after: {pressed: target, key: r2.key, heading: r2.heading}, back: {key: back.key, heading: back.heading, valueAfterReturn: kept, keptTag: kept != null && kept.includes(TAG)}};
            });
            await signOut(page).catch(() => {});
        }

        if (on('ctl')) {
            await signIn(page, c.author, {contextPath: app.contextPath});
            await idle(page);
            await step('ctlOther', () => open(`${dash}${c.other}`, `ctl-other-${RUN}`));
            await step('ctlOtherWalk', () => walk('ctl-other'));
            await signOut(page).catch(() => {});
            await signIn(page, 'dbarnes', {contextPath: app.contextPath});
            await idle(page);
            await step('ctlBarnes', () => open(`${dash}${c.sub}`, `ctl-dbarnes-${RUN}`));
            await step('ctlBarnesWalk', () => walk('ctl-dbarnes'));
            await signOut(page).catch(() => {});
        }
        if (on('ctlold')) {
            // the older addresses typed by the author-editor for a submission that is not theirs
            await signIn(page, c.author, {contextPath: app.contextPath});
            await idle(page);
            const n = Object.keys(c.stages).pop();
            await step('ctlOldAccess', () => open(`/index.php/${app.contextPath}/en/workflow/access/${c.other}`, `ctl-old-access-${RUN}`));
            await step(`ctlOldIndex${n}`, () => open(`/index.php/${app.contextPath}/en/workflow/index/${c.other}/${n}`, `ctl-old-index${n}-${RUN}`));
            await signOut(page).catch(() => {});
        }
        if (on('ctlpress')) {
            // the first decision button pressed by `dbarnes` (the control) and again by the
            // author-editor with a longer wait; the window that opens is read and closed, nothing sent
            for (const who of ['dbarnes', c.author]) {
                await signIn(page, who, {contextPath: app.contextPath});
                await idle(page);
                await step(`press-${who}`, async () => {
                    await page.goto(app.url(`${dash}${c.sub}`)); await settle();
                    const errorBefore = await dismissError();
                    const root = page.locator('[data-cy="sidemodal-header"]').first().locator('xpath=ancestor::*[@role="dialog"][1]');
                    const act = root.locator('[data-cy="workflow-action-items"] button');
                    const names = (await act.allInnerTexts().catch(() => [])).map((t) => flat(t, 40)).filter(Boolean);
                    const first = names.find((t) => !/Decline|Cancel|Revert/.test(t));
                    const before = await page.locator('[role=dialog]:visible').count();
                    await act.filter({hasText: first}).first().click({timeout: 8000});
                    await sleep(5000); await idle(page);
                    const r = brief(await snap(`press-${who}-${RUN}`));
                    const after = await page.locator('[role=dialog]:visible').count();
                    await page.keyboard.press('Escape').catch(() => {});
                    return {errorBefore, names, pressed: first, dialogsBefore: before, dialogsAfter: after, url: r.url, otherDialogs: r.otherDialogs, innerDialogs: r.innerDialogs, lastDialog: r.lastDialog, notices: r.notices};
                });
                await signOut(page).catch(() => {});
            }
        }
    } catch (e) {
        o.fatal = flat(e.stack || e.message, 800);
        record(`h19-fatal-${RUN}`, await screen(page).catch(() => ({url: page.url()})));
    } finally {
        o.allBad = bad;
        o.serverLog = log.since(from).slice(0, 20).map((l) => flat(l, 400));
        // a run of other phases than the default keeps its own facts file (never the full run's)
        record(`h19-facts-${process.env.PHASES ? PHASES.join('+') + '-' : ''}${RUN}`, o);
        say('done', {fatal: o.fatal, bad: bad.length, serverLog: o.serverLog.length});
        await close();
    }
});

/**
 * Settings › Users & Roles › Users › "Invite to a role": search the address, choose the role in the
 * new role row (start today, on the masthead), "Save And Continue", subject tagged, "Invite user to
 * the role". (After U38 A12's walk lib.)
 */
async function inviteToRole(page, app, {email, role, subject}) {
    const out = {};
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/access`));
    await page.getByRole('heading', {name: 'Users & Roles'}).first().waitFor({timeout: T});
    await idle(page);
    await page.getByRole('button', {name: 'Invite to a role'}).click();
    const search = page.getByLabel(/Search for a user by email address/);
    await search.waitFor({timeout: T});
    await search.fill(email);
    await page.getByRole('button', {name: 'Search User', exact: true}).click();
    await page.getByRole('heading', {name: /Enter details/}).first().waitFor({timeout: T});
    await idle(page);
    let newRow = page.getByRole('row').filter({hasText: 'Select a new role'}).last();
    if (!(await newRow.count())) { await page.getByRole('button', {name: 'Add Another Role'}).click(); await sleep(500); newRow = page.getByRole('row').filter({hasText: 'Select a new role'}).last(); }
    out.roleOptions = (await newRow.getByRole('combobox').first().locator('option').allInnerTexts()).map((t) => flat(t, 60));
    await newRow.getByRole('combobox').first().selectOption({label: role});
    await newRow.getByRole('textbox').fill(new Date().toISOString().slice(0, 10));
    await newRow.getByRole('combobox').last().selectOption({label: 'Appear on the masthead'}).catch(() => {});
    await page.getByRole('button', {name: 'Save And Continue'}).click();
    const subj = page.locator('input[name="subject"]');
    await subj.waitFor({timeout: T});
    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page); await sleep(500);
    await subj.fill(subject);
    await page.getByRole('button', {name: 'Invite user to the role'}).click();
    const sent = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
    out.sent = await sent.waitFor({timeout: T}).then(() => true).catch(() => false);
    if (out.sent) out.sentText = flat(await sent.innerText(), 300);
    await sent.getByRole('button', {name: 'View All Users'}).click().catch(() => {});
    await idle(page);
    return out;
}

/** Open the invitation email's accept link in a browser of its own and accept (ORCID skipped). */
async function acceptInvitation(app, {email, subject, since}) {
    const out = {};
    const summary = await app.fleetMail.find({to: email, contains: subject, since, timeoutMs: 60_000});
    const full = await app.fleetMail.fullMessage(summary.ID);
    const m = (full.HTML || '').match(/href=['"]([^'"]*\/invitation\/accept\?[^'"]+)['"]/i);
    out.subject = summary.Subject;
    out.link = !!m;
    if (!m) return out;
    const inv = await launch(app);
    try {
        const ip = inv.page;
        await ip.goto(m[1].replace(/&amp;/g, '&'));
        await idle(ip);
        const skip = ip.getByRole('button', {name: 'Skip ORCID verification'});
        if (await skip.isVisible().catch(() => false)) { out.orcidSkipped = true; await skip.click(); await idle(ip); }
        const button = ip.getByRole('button', {name: /^Accept And Continue to/});
        await button.waitFor({timeout: T});
        await button.click();
        const done = ip.getByRole('dialog').filter({hasText: /assigned a new role/});
        out.accepted = await done.waitFor({timeout: T}).then(() => true).catch(() => false);
        if (out.accepted) out.acceptedText = flat(await done.innerText(), 300);
        else out.after = await screen(ip).catch(() => null);
    } finally { await inv.close(); }
    return out;
}
