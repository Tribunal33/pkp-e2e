// Regression read of pkp/pkp-lib#13385 (issue #12593 "Handle missing email template or key"), kept from the
// PR review rounds of 2026-09-28 (.reports/sync/rr12593/suspicions.md), 2026-10-02 (.reports/pr12593r2/) and
// 2026-10-03 (.reports/pr12593r3/, .reports/sync/r3/) and 2026-10-05 (.reports/pr12593r4/, .reports/sync/r4/).
// The PR changes the stage Participants panel's "Assign" / "Notify" message:
// PKPStageParticipantNotifyForm::sendMessage() (a blank template, or one the SENDER may not use (round 2;
// round 1 checked the recipient) → the stage's DISCUSSION_NOTIFICATION_* template, then promote() with no null
// check; createdBy the sender), StageParticipantGridHandler::fetchTemplateBody() (blank → body ''),
// Repository::isTemplateAccessibleToUser() (manager-level users pass; the restricted test on the loaded
// collection), getEmailVariableNames(?string). Round 2 adds pkp/omp#2487: OMP installs
// DISCUSSION_NOTIFICATION_INTERNAL_REVIEW ("Discussion (Review)" on Internal Review), with an upgrade migration
// (migrate-ir.php, migration.js). Spec: docs/specs/U35-stage-participants.md Rule 5, A3, A5, A10, OMP1.
//
//   PROBE_FEATURE=sync PROBE_AGENT=<agent> RR_REF=after node bin/probe.js all shared/playwright/checks/sync/pkp-lib-13385/rr.js
//   RR_LEGS=s1,s2,s3,s4,s5,s6,s7,s8 narrows (s2 OMP only; s7 OJS only). RR_REF labels the outputs
//   (result-<ref>-<app>.json); every run seeds fresh scratch contexts.
// Refs, round 2: after = ojs b84f8e2e44 with lib/pkp at the PR head 2af7ddfcb2 merged onto its pointer
//   ddd8ab243a; omp at the PR head e50a757bdc (lib/pkp 2af7ddfcb2); ops c8af945bb7 with lib/pkp 2af7ddfcb2
//   (its pointer 3dc90c81a6 lies below the PR base). Round 1 (head cf72cc78d8): see the 2026-09-28 sync-log entry.
// Refs, round 3: after3 = ojs ff004d0973 with lib/pkp at the PR head 62077d1f6f merged onto its pointer
//   987776cd04; omp at the PR head ecd65eebb0 (lib/pkp 62077d1f6f); ops c8af945bb7 with lib/pkp 62077d1f6f.
// Refs, round 4: after4 = ojs 1f4cef786f and ops caddbb33da with lib/pkp at the PR head e39fdee199 (on pkp-lib
//   main d1c90fe604, one merge above both pointers a7f5e3081b); omp at the PR head 27a00dd1a1 (lib/pkp e39fdee199).
// Verdicts, from result-<ref>-<app>.json (round 2 expectations):
//   s1 (A3 fixed): notifyBlank/assignBlank status 200 and a mail with subject "Discussion (Submission)"
//      ("Discussion (Production)" on OPS); tasks' created_by is the manager (A5 fixed); before: 500, no mail.
//   s2 (OMP Internal Review, OMP1/A3): options hold "Discussion (Review)"; blank sends as "Discussion (Review)";
//      choosing it fills "Please enter your message."; a restricted template sent to a non-holder keeps its name.
//   s3 (blank entry empties the message; ruled intended 2026-09-28).
//   s4 (A10 fixed): choose → message filled; every recipient → subject = the template's name.
//   s5 (default deleted, every app): round 2 500 ("promote() on null"); round 3 still 500 (the anonymous
//      fallback Mailable has no allowUnsubscribe()), no mail, but a discussion per attempt.
//      Round 4 (e39fdee199, the fallback uses Discussion): both 200 with the notice, one discussion each, mails
//      "Discussion (Submission)" ("Discussion (Production)" on OPS) with the typed text and the discussion footer.
//   s6 (sender check): the Section editor's EditorOnly send to the Author keeps its name.
//   s8 (A17): chosen, set back to blank, typed, "Notify": 200, sent as the stage's "Discussion (…)".
//   s7 (letter): "Request Copyedit" limited to Copyeditor sent to the Author keeps its subject, fills
//      {$recipientName}, raises the copyedit task.
// No assertions: facts per leg, mails and DB rows go to result-<ref>-<app>.json (merge).
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, tag} = require('../../../probe');

const REF = process.env.RR_REF || 'after';
const ONLY = (process.env.RR_LEGS || '').split(',').map((s) => s.trim()).filter(Boolean);
const want = (l) => !ONLY.length || ONLY.includes(l);
const log = (...a) => console.log(`[${REF}]`, ...a);
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 400));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const isOJS = app.name === 'ojs';
    const L = {
        se: isOMP ? 'Series editor' : isOPS ? 'Moderator' : 'Section editor',
        ed: isOMP ? 'Press editor' : isOPS ? 'Preprint Server manager' : 'Journal editor',
        stage: isOPS ? 'workflow_5' : 'workflow_1',
        stageName: isOPS ? 'Production' : 'Submission',
        disc: isOPS ? 'Discussion (Production)' : 'Discussion (Submission)',
    };
    const result = {ref: REF, app: app.name};
    const put = (k, v) => { result[k] = v; record(`result-${REF}`, {[k]: v, ref: REF}, {merge: true}); };
    const db = (q) => { try { return execFileSync('psql', ['-d', app.db, '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim(); } catch (e) { return `db error: ${flat(e.message, 200)}`; } };

    // ---- seed ----------------------------------------------------------------------------------
    async function seedContext(prefix, withC) {
        const t = tag(prefix);
        const U = (k, roles, g, f) => ({username: `${t}${k}`, roles, givenName: g, familyName: f});
        const users = [U('mgr', ['manager'], 'Mira', 'Manager'), U('au', ['author'], 'Ava', 'Author'),
            U('ed', [isOPS ? 'manager' : 'editor'], 'Eli', 'Editor'), U('se', ['sectionEditor'], 'Sam', 'Section'),
            U('sea', ['sectionEditor'], 'Ann', 'Aeditor'), U('seb', ['sectionEditor'], 'Ben', 'Beditor'),
            U('sec', ['sectionEditor'], 'Cat', 'Ceditor'), U('sed', ['sectionEditor'], 'Dan', 'Deditor')];
        if (!isOPS) users.push(U('ce', ['copyeditor'], 'Cora', 'Copy'));
        const ctx = await app.api.createContext({tag: t, context: {name: `RR 13385 ${t}`, contactName: 'RR Contact', contactEmail: `${t}contact@mail.test`}, users});
        const sc = {t, ctx: ctx.path || t, u: Object.fromEntries(users.map((x) => [x.username.slice(t.length), {username: x.username, name: `${x.givenName} ${x.familyName}`}]))};
        const mk = async (key, title, decisions) => {
            const body = {tag: `${t}${key.toLowerCase()}`, context: sc.ctx, submitter: `${t}au`, title: `${title} ${t}`, participants: [{username: `${t}se`, role: 'sectionEditor'}]};
            if (decisions.length) body.decisions = decisions;
            const s = await app.api.createSubmission(body);
            sc[key] = {id: s.submissionId, stage: s.stageId, rounds: s.reviewRounds};
        };
        await mk('S', 'RR message', []);
        if (isOMP) await mk('I', 'RR internal', ['sendInternalReview']);
        if (withC && !isOPS) await mk('C', 'RR copyediting', ['sendExternalReview', 'accept']);
        return sc;
    }

    // ---- browser helpers (from checks/U35/K3/k3.js) -----------------------------------------------
    function helpers(sc) {
        const u = sc.u;
        const ctxUrl = (p) => app.url(`/index.php/${sc.ctx}${p}`);
        const wf = (page) => page.locator('[role="dialog"]:visible').first();
        const mailOf = (k) => `${u[k].username}@mail.test`;
        const H = {};
        H.session = async () => {
            const {page, close} = await launch(app);
            page.on('dialog', async (d) => { await d.accept().catch(() => {}); });
            return {page, close};
        };
        H.as = async (page, k) => { await signIn(page, u[k].username, {contextPath: sc.ctx}); await idle(page); };
        H.openWf = async (page, id, key) => {
            await page.goto(ctxUrl(`/dashboard/editorial?workflowSubmissionId=${id}&workflowMenuKey=${key}`)); await idle(page);
            await wf(page).waitFor({timeout: 30000}).catch(() => {});
            await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
            await idle(page);
        };
        H.discussions = (page) => page.evaluate(() => {
            const vis = (e) => e.getClientRects().length > 0;
            const dlg = [...document.querySelectorAll('[role=dialog]')].filter(vis)[0] || document.body;
            const h = [...dlg.querySelectorAll('h1,h2,h3,h4')].filter(vis).find((x) => /Tasks & Discussions|Discussions/i.test(x.innerText.trim()));
            if (!h) return null;
            let box = h.parentElement;
            for (let i = 0; i < 4 && box && !box.querySelector('table'); i++) box = box.parentElement;
            return box ? [...box.querySelectorAll('tbody tr')].filter(vis).map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean) : [];
        }).catch(() => null);
        H.panel = (page) => page.evaluate(() => {
            const vis = (e) => e.getClientRects().length > 0;
            const dlg = [...document.querySelectorAll('[role=dialog]')].filter(vis)[0] || document.body;
            const h = [...dlg.querySelectorAll('h1,h2,h3,h4')].filter(vis).find((x) => /^participants$/i.test(x.textContent.trim()));
            if (!h) return null;
            let box = h.parentElement;
            for (let i = 0; i < 4 && box && !box.querySelector('ul, [role=list]'); i++) box = box.parentElement;
            return box ? [...box.querySelectorAll('li')].filter(vis).map((li) => li.innerText.split('\n').map((s) => s.trim()).filter(Boolean).join('/')) : [];
        }).catch(() => null);
        const msgId = (win) => win.locator('textarea[name="message"]').getAttribute('id').catch(() => null);
        H.readMsg = async (page, win) => {
            const id = await msgId(win);
            if (!id) return null;
            return page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent({format: 'text'}) : document.getElementById(i).value), id).catch(() => null);
        };
        H.type = async (page, win, text, {append} = {}) => {
            const id = await msgId(win);
            await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: 20000}).catch(() => {});
            await page.frameLocator(`#${id}_ifr`).locator('body').click();
            if (append) await page.keyboard.press('ControlOrMeta+End');
            else { await page.keyboard.press('ControlOrMeta+a'); await page.keyboard.press('Delete'); }
            if (text) await page.keyboard.type(text);
            await sleep(300);
            return H.readMsg(page, win);
        };
        H.options = (win) => win.locator('select[name="template"] option').evaluateAll((els) => els.map((o) => ({text: o.text.trim(), value: o.value}))).catch(() => null);
        // Choose an entry ('' = the blank one); returns the fetchTemplateBody status and the box after it settles.
        H.choose = async (page, win, text) => {
            const opts = await H.options(win);
            const o = text === '' ? {value: ''} : (opts || []).find((x) => x.text === text);
            if (!o) return {missing: text, options: opts};
            const resp = page.waitForResponse((r) => /fetchTemplateBody|fetch-template-body/i.test(r.url()), {timeout: 15000}).catch(() => null);
            await win.locator('select[name="template"]').selectOption(o.value);
            const r = await resp;
            await sleep(1500); await idle(page);
            return {chosen: text, fetchStatus: r ? r.status() : null, message: flat(await H.readMsg(page, win), 400)};
        };
        const assignWin = (page) => page.getByRole('dialog').filter({has: page.locator('select[name="filterUserGroupId"]')}).last();
        const notifyWin = (page) => page.getByRole('dialog').filter({has: page.locator('form select[name="template"]')}).filter({hasNotText: 'Locate a User'}).last();
        H.reland = async (page, win) => {
            if (win && await win.isVisible().catch(() => false)) {
                const c = win.locator('form').getByRole('link', {name: /^\s*Cancel\s*$/}).first();
                if (await c.count()) await c.click().catch(() => {}); else await win.getByRole('button', {name: /^Close/}).first().click().catch(() => {});
                await win.waitFor({state: 'detached', timeout: 10000}).catch(() => {});
            }
            await page.goto(page.url()); await idle(page);
            await wf(page).waitFor({timeout: 30000}).catch(() => {});
            await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
            await idle(page);
        };
        H.openAssign = async (page, role, k) => {
            await page.locator('[data-cy="workflow-secondary-items"]').getByRole('button', {name: 'Assign', exact: true}).click();
            const win = assignWin(page);
            await win.locator('select[name="filterUserGroupId"]').waitFor({timeout: 30000});
            await win.locator('textarea[name="message"]').waitFor({state: 'attached', timeout: 20000}).catch(() => {});
            await idle(page);
            await win.locator('select[name="filterUserGroupId"]').selectOption({label: role});
            await idle(page);
            await win.getByRole('textbox', {name: 'Search User By Name'}).fill(u[k].username);
            await win.getByRole('button', {name: 'Search', exact: true}).click();
            await idle(page);
            await win.getByRole('row').filter({hasText: u[k].name}).locator('input[name="userId"]').check();
            await idle(page);
            return win;
        };
        H.openNotify = async (page, k) => {
            await wf(page).getByRole('button', {name: `${u[k].name} More Actions`, exact: true}).first().click();
            await page.getByRole('menuitem', {name: 'Notify', exact: true}).click();
            const win = notifyWin(page);
            await win.waitFor({timeout: 30000});
            await win.locator('textarea[name="message"]').waitFor({state: 'attached', timeout: 20000}).catch(() => {});
            await idle(page);
            return win;
        };
        // Submit a filled window; returns status, answer, notices, window state, the panel rows after.
        H.submit = async (page, win, kind, label) => {
            const out = {messageAtSend: flat(await H.readMsg(page, win), 300)};
            await shot(page, `${label}-filled`).catch(() => {});
            const re = kind === 'assign' ? /saveParticipant|save-participant/i : /sendNotification|send-notification/i;
            const resp = page.waitForResponse((r) => re.test(r.url()), {timeout: 20000}).catch(() => null);
            if (kind === 'assign') await win.getByRole('button', {name: 'OK', exact: true}).click();
            else await win.locator('form').getByRole('button', {name: 'Notify', exact: true}).click();
            const r = await resp;
            out.status = r ? r.status() : null;
            out.answer = r ? flat(await r.text().catch(() => ''), 300) : null;
            await win.waitFor({state: 'detached', timeout: 10000}).catch(() => {});
            await sleep(1500); await idle(page);
            const s = await screen(page).catch(() => ({notices: []}));
            out.notices = (s.notices || []).map((n) => flat(typeof n === 'string' ? n : (n.text || JSON.stringify(n)), 160));
            out.windowStillOpen = await win.isVisible().catch(() => false);
            if (out.windowStillOpen) await shot(page, `${label}-still-open`).catch(() => {});
            await H.reland(page, out.windowStillOpen ? win : null);
            out.panel = await H.panel(page);
            out.discussions = await H.discussions(page);
            record(`${REF}-${label}`, out);
            await shot(page, `${REF}-${label}-after`).catch(() => {});
            log(label, JSON.stringify({status: out.status, still: out.windowStillOpen, notices: out.notices, disc: out.discussions}));
            return out;
        };
        H.assign = async (page, label, {role, k, template, message}) => {
            const win = await H.openAssign(page, role, k);
            const pre = {};
            if (template) pre.choose = await H.choose(page, win, template);
            if (message !== undefined) pre.typed = flat(await H.type(page, win, message), 200);
            return {...pre, ...(await H.submit(page, win, 'assign', label))};
        };
        H.notify = async (page, label, {k, template, message}) => {
            const win = await H.openNotify(page, k);
            const pre = {options: (await H.options(win) || []).map((o) => o.text)};
            if (template) pre.choose = await H.choose(page, win, template);
            if (message !== undefined) pre.typed = flat(await H.type(page, win, message), 200);
            return {...pre, ...(await H.submit(page, win, 'notify', label))};
        };
        H.mail = async (k, contains, ms = 12000) => {
            try {
                const m = await app.mail.find({to: mailOf(k), contains, timeoutMs: ms});
                const f = await app.mail.fullMessage(m.ID);
                return {subject: f.Subject, from: f.From && f.From.Address, text: flat(f.Text, 600)};
            } catch (e) { return {none: flat(e.message, 120)}; }
        };
        // The submission's discussions straight from the database: title, head note.
        H.tasks = (subId) => db(`select t.edit_task_id, t.stage_id, t.title, t.created_by, (select n.contents from notes n where n.assoc_type=1048586 and n.assoc_id=t.edit_task_id order by n.note_id limit 1) from edit_tasks t where t.assoc_type=1048585 and t.assoc_id=${subId} order by t.edit_task_id`).split('\n').filter(Boolean).map((l) => flat(l, 400));
        H.logLines = (subId) => db(`select e.event_type, e.message from event_log e where e.assoc_type=1048585 and e.assoc_id=${subId} order by e.log_id`).split('\n').filter(Boolean).map((l) => flat(l, 200));
        // Settings › Workflow › Tasks and Discussions: add, edit (limit), delete.
        H.settings = async (page) => {
            await page.goto(ctxUrl('/management/settings/workflow')); await idle(page);
            await page.getByRole('tab', {name: /Tasks and Discussions/}).first().click(); await idle(page);
            await page.waitForFunction(() => /Submission Stage|Production Stage/.test(document.body.innerText), null, {timeout: 15000}).catch(() => {});
            await sleep(500);
        };
        H.fillTemplateForm = async (page, win, {name, body, restrictTo}) => {
            await win.getByRole('textbox', {name: /^Name/}).first().waitFor({timeout: 20000});
            await idle(page); await sleep(500);
            if (name) await win.getByRole('textbox', {name: /^Name/}).first().fill(name);
            if (restrictTo) {
                await win.getByRole('radio', {name: 'Limit access to specific roles'}).check();
                await sleep(300);
                await win.getByRole('checkbox', {name: restrictTo, exact: true}).check();
            }
            if (body) { await win.frameLocator('iframe').first().locator('body').click(); await page.keyboard.type(body); await sleep(300); }
            const resp = page.waitForResponse((r) => /editTaskTemplates/.test(r.url()) && ['POST', 'PUT'].includes(r.request().method()), {timeout: 20000}).catch(() => null);
            await win.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await resp;
            await sleep(1000); await idle(page);
            return {status: r && r.status(), answer: r ? flat(await r.text().catch(() => ''), 200) : null};
        };
        H.addTemplate = async (page, {stage, name, body, restrictTo}) => {
            await H.settings(page);
            await page.locator('tbody tr').filter({has: page.locator('th[scope="rowgroup"]', {hasText: stage})}).first().locator('button').filter({hasText: /^\s*Add template\s*$/}).click();
            return H.fillTemplateForm(page, tplWin(page), {name, body, restrictTo});
        };
        const rowMenu = async (page, name, item) => {
            await H.settings(page);
            const row = page.locator('tbody tr').filter({has: page.locator('th[scope="row"]', {hasText: name})}).first();
            await row.locator('button[aria-label="More Actions"]').click();
            await page.getByRole('menuitem', {name: item, exact: true}).click();
        };
        const tplWin = (page) => page.getByRole('dialog').filter({has: page.locator('input[name="title"]')}).last();
        H.limitTemplate = async (page, name, restrictTo) => { await rowMenu(page, name, 'Edit'); return H.fillTemplateForm(page, tplWin(page), {restrictTo}); };
        H.deleteTemplate = async (page, name) => {
            await rowMenu(page, name, 'Delete');
            const resp = page.waitForResponse((r) => /editTaskTemplates/.test(r.url()) && r.request().method() === 'DELETE', {timeout: 20000}).catch(() => null);
            await page.getByRole('dialog', {name: 'Delete', exact: true}).last().getByRole('button', {name: 'OK', exact: true}).click();
            const r = await resp;
            await sleep(1000); await idle(page);
            return {status: r && r.status()};
        };
        return H;
    }
    const sect = async (name, fn) => { try { return await fn(); } catch (e) { log(`[${name} FAILED]`, flat(e.stack, 500)); put(`${name}-FAILED`, flat(e.stack, 800)); return null; } };

    const needA = ['s1', 's3', 's4', 's6', 's7'].some(want) || (isOMP && want('s2'));
    if (needA) {
        const sc = await seedContext('rr93a', isOJS && want('s7'));
        put('seedA', {ctx: sc.ctx, S: sc.S, I: sc.I, C: sc.C});
        const H = helpers(sc);
        const t = sc.t;
        const {page, close} = await H.session();
        try {
            await H.as(page, 'mgr');
            if (want('s1')) await sect('s1', async () => {
                await H.openWf(page, sc.S.id, L.stage);
                const a = await H.assign(page, 's1-assign-blank', {role: L.se, k: 'sea', message: `RR blank assign ${t}`});
                const n = await H.notify(page, 's1-notify-blank', {k: 'au', message: `RR blank notify ${t}`});
                put('s1', {assignBlank: a, notifyBlank: n, mailSea: await H.mail('sea', `RR blank assign ${t}`), mailAu: await H.mail('au', `RR blank notify ${t}`), tasks: H.tasks(sc.S.id), log: H.logLines(sc.S.id)});
            });
            if (want('s2') && isOMP) await sect('s2', async () => {
                const key = sc.I.rounds && sc.I.rounds[0] ? `workflow_${sc.I.rounds[0].stageId}_${sc.I.rounds[0].id}` : 'workflow_2';
                await H.openWf(page, sc.I.id, key);
                const choose = await sect('s2-choose', async () => {
                    const win = await H.openNotify(page, 'au');
                    const out = {options: (await H.options(win) || []).map((o) => o.text), pick: await H.choose(page, win, 'Discussion (Review)')};
                    await H.reland(page, win);
                    return out;
                });
                const n = await H.notify(page, 's2-notify-blank', {k: 'au', message: `RR IR notify ${t}`});
                const a = await H.assign(page, 's2-assign-blank', {role: L.se, k: 'sec', message: `RR IR assign ${t}`});
                const add = await H.addTemplate(page, {stage: 'Internal Review', name: `RR IR AuthorOnly ${t}`, body: `RR IR author-only body ${t}`, restrictTo: 'Author'});
                await H.openWf(page, sc.I.id, key);
                const nb = await H.notify(page, 's2-notify-restricted-nonholder', {k: 'se', template: `RR IR AuthorOnly ${t}`, message: `RR IR restricted ${t}`});
                put('s2', {choose, notifyBlank: n, assignBlank: a, addTemplate: add, notifyRestrictedNonHolder: nb, mails: {au: await H.mail('au', `RR IR notify ${t}`, 5000), sec: await H.mail('sec', `RR IR assign ${t}`, 3000), se: await H.mail('se', `RR IR restricted ${t}`, 3000)}, tasks: H.tasks(sc.I.id), log: H.logLines(sc.I.id)});
            });
            if (want('s3')) await sect('s3', async () => {
                await H.openWf(page, sc.S.id, L.stage);
                const win = await H.openNotify(page, 'au');
                const out = {typed: flat(await H.type(page, win, `RR typed ${t}`), 200)};
                out.template = await H.choose(page, win, L.disc);
                out.edited = flat(await H.type(page, win, ` RR edited ${t}`, {append: true}), 200);
                out.blankAgain = await H.choose(page, win, '');
                await shot(page, `${REF}-s3-blank-again`).catch(() => {});
                put('s3', out);
                log('s3', JSON.stringify(out));
                await H.reland(page, win);
            });
            if (want('s4') || want('s6')) await sect('s4', async () => {
                const adds = {
                    open: await H.addTemplate(page, {stage: L.stageName, name: `RR Open ${t}`, body: `RR open body ${t}`}),
                    au: await H.addTemplate(page, {stage: L.stageName, name: `RR AuthorOnly ${t}`, body: `RR author-only body ${t}`, restrictTo: 'Author'}),
                    se: await H.addTemplate(page, {stage: L.stageName, name: `RR EditorOnly ${t}`, body: `RR editor-only body ${t}`, restrictTo: L.se}),
                };
                put('s4-adds', adds);
            });
            if (want('s4')) await sect('s4', async () => {
                await H.openWf(page, sc.S.id, L.stage);
                // choose each in one Notify window, then send the unrestricted one
                const win = await H.openNotify(page, 'au');
                const chooses = {options: (await H.options(win) || []).map((o) => o.text)};
                for (const n of ['AuthorOnly', 'EditorOnly', 'Open']) chooses[n] = await H.choose(page, win, `RR ${n} ${t}`);
                await H.type(page, win, ` RR OPEN to author ${t}`, {append: true});
                const open = await H.submit(page, win, 'notify', 's4-notify-open');
                const auHolder = await H.notify(page, 's4-notify-authoronly-holder', {k: 'au', template: `RR AuthorOnly ${t}`, message: `RR AO to author ${t}`});
                const auNon = await H.notify(page, 's4-notify-editoronly-nonholder', {k: 'au', template: `RR EditorOnly ${t}`, message: `RR EO to author ${t}`});
                const seNon = await H.assign(page, 's4-assign-authoronly-nonholder', {role: L.se, k: 'seb', template: `RR AuthorOnly ${t}`, message: `RR AO to editor ${t}`});
                const edMgr = await H.assign(page, 's4-assign-editoronly-managerlevel', {role: L.ed, k: 'ed', template: `RR EditorOnly ${t}`, message: `RR EO to manager-level ${t}`});
                put('s4', {chooses, open, auHolder, auNon, seNon, edMgr,
                    mails: {open: await H.mail('au', `RR OPEN to author ${t}`), auHolder: await H.mail('au', `RR AO to author ${t}`), auNon: await H.mail('au', `RR EO to author ${t}`), seNon: await H.mail('seb', `RR AO to editor ${t}`), edMgr: await H.mail('ed', `RR EO to manager-level ${t}`)},
                    tasks: H.tasks(sc.S.id), log: H.logLines(sc.S.id)});
            });
            await signOut(page);
            if (want('s6')) await sect('s6', async () => {
                await H.as(page, 'se');
                await H.openWf(page, sc.S.id, L.stage);
                const n = await H.notify(page, 's6-se-notify-editoronly-to-author', {k: 'au', template: `RR EditorOnly ${t}`, message: `RR SE EO to author ${t}`});
                put('s6', {notify: n, mail: await H.mail('au', `RR SE EO to author ${t}`), tasks: H.tasks(sc.S.id)});
                await signOut(page);
            });
            if (want('s7') && isOJS) await sect('s7', async () => {
                await H.as(page, 'mgr');
                const limit = await H.limitTemplate(page, 'Request Copyedit', 'Copyeditor');
                await H.openWf(page, sc.C.id, 'workflow_4');
                const holder = await H.assign(page, 's7-assign-ce-holder', {role: 'Copyeditor', k: 'ce', template: 'Request Copyedit'});
                const non = await H.notify(page, 's7-notify-au-nonholder', {k: 'au', template: 'Request Copyedit'});
                put('s7', {limit, holder, non, mails: {ce: await H.mail('ce', 'copyedit'), au: await H.mail('au', 'copyedit')}, tasks: H.tasks(sc.C.id),
                    notifications: db(`select n.user_id, n.type from notifications n where n.assoc_type=1048585 and n.assoc_id=${sc.C.id} and n.type in (16777239, 16777249) order by 1`)});
                await signOut(page);
            });
        } finally { await close(); }
    }

    // s8 (A17, round 2): a predefined message chosen, the list set back to blank, a message typed, "Notify".
    if (want('s8')) await sect('s8', async () => {
        const sc = await seedContext('rr93c', false);
        const H = helpers(sc);
        const t = sc.t;
        const {page, close} = await H.session();
        try {
            await H.as(page, 'mgr');
            await H.openWf(page, sc.S.id, L.stage);
            const win = await H.openNotify(page, 'au');
            const out = {template: await H.choose(page, win, L.disc), blankAgain: await H.choose(page, win, '')};
            out.typed = flat(await H.type(page, win, `RR blank again ${t}`), 200);
            out.send = await H.submit(page, win, 'notify', 's8-notify-blank-again');
            put('s8', {seedC: {ctx: sc.ctx, S: sc.S}, ...out, mail: await H.mail('au', `RR blank again ${t}`), tasks: H.tasks(sc.S.id)});
            await signOut(page);
        } finally { await close(); }
    });

    if (want('s5')) await sect('s5', async () => {
        const sc = await seedContext('rr93b', false);
        const H = helpers(sc);
        const t = sc.t;
        const {page, close} = await H.session();
        try {
            await H.as(page, 'mgr');
            const del = await H.deleteTemplate(page, L.disc);
            await H.openWf(page, sc.S.id, L.stage);
            const n = await H.notify(page, 's5-notify-blank-nodefault', {k: 'au', message: `RR nodefault notify ${t}`});
            const a = await H.assign(page, 's5-assign-blank-nodefault', {role: L.se, k: 'sea', message: `RR nodefault assign ${t}`});
            put('s5', {seedB: {ctx: sc.ctx, S: sc.S}, del, notifyBlank: n, assignBlank: a, remaining: db(`select t.key, t.stage_id from edit_task_templates t join ${isOMP ? 'presses' : isOPS ? 'servers' : 'journals'} j on j.${isOMP ? 'press_id' : isOPS ? 'server_id' : 'journal_id'}=t.context_id where j.path='${sc.ctx}' order by 2,1`), mails: {au: await H.mail('au', `RR nodefault notify ${t}`, 4000), sea: await H.mail('sea', `RR nodefault assign ${t}`, 3000)}, tasks: H.tasks(sc.S.id)});
            await signOut(page);
        } finally { await close(); }
    });
});
