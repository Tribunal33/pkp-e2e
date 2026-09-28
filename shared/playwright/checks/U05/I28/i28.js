// U05 claim check, chunk I28 (housekeeping 2026-09-28): the incidental rows L59 and L140 for
// docs/specs/U05-notifications-center-and-email-preferences.md.
//   L59a — who gets the "…needs to be assigned" task (Rule 6 roster, "Who is told"): one throwaway per
//          permission level on a scratch context (manager, Journal/Press editor, Production editor,
//          Section editor, an assistant role, author, reader, plus the auto-enrolled `admin`), a seeded
//          submission (`submitted: true`, nobody assigned); each account's Tasks panel read by the title.
//   L59b — where a long Participants message is cut in the "started a discussion" task (Rule 6
//          "Discussion added." row): "Assign" of a Section Editor with a 300-character message, and
//          "Notify" with 150, 200, 201 and 300 characters (the axis); the assignee's Tasks panel, the
//          discussion email as the control that the whole message was sent.
//   L140b — a toast over an open side window: Participants › "Notify" with "Message" empty raises the
//          warning toast with the window open; press its "×" (a real mouse press and a locator click);
//          control: the "Notification sent to users." toast after the window closed, "×" pressed.
//   Sweep: the Notify window left with a typed, unsent message by its close control.
//
//   PROBE_FEATURE=U05 PROBE_AGENT=ccI28 RUN=r1 node bin/probe.js all shared/playwright/checks/U05/I28/i28.js
//   (RUN names the facts of one run; each run seeds its own scratch context.)
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
// PHASES (default all): l59a (who gets the needs-editor task), assign (L59b "Assign"), toast (L140b and the
// Notify window's ways out), axis (L59b "Notify" lengths and the success-toast control), control2 (the
// Profile save toast's "×"), unbroken (a message with a 150-character address), read (the recipients'
// Tasks panels and mailboxes; needs assign, axis or unbroken).
// wizard: L59a again on a submission the Author sends through the wizard, with the "needs an editor" email.
const PHASES = (process.env.PHASES || 'l59a,wizard,assign,toast,axis,unbroken,control2,read').split(',');
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log(`[${RUN}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 600));

// A message of words whose every 10-character block starts with its own letter, so the cut point reads
// directly: "A12345678 B12345678 …" (26 letters, then a, b, c, …); a space every tenth character lets the
// row wrap as a real message does (a message without spaces is clipped at the window's edge instead).
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
function marked(len, head) {
    let s = head;
    let i = 0;
    while (s.length < len) {
        s += LETTERS[i % LETTERS.length] + '12345678 ';
        i++;
    }
    return s.slice(0, len).replace(/ $/, 'x');
}

async function sect(name, fn) {
    try {
        return await fn();
    } catch (e) {
        log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | '));
        record(`${RUN}-${name}-FAILED`, {error: String(e.stack || e).slice(0, 1500)});
        return null;
    }
}
async function snap(page, name, extra) {
    let s;
    try {
        s = await screen(page);
    } catch (e) {
        s = {url: page.url(), error: String(e.message).slice(0, 200)};
    }
    if (extra) Object.assign(s, extra);
    record(`${RUN}-${name}`, s);
    await shot(page, `${RUN}-${name}`).catch(() => {});
    return s;
}

// Every toast as it is added and as it leaves, with page-clock times.
const TOAST_WATCH = () => {
    window.__i28 = [];
    const seen = new Map();
    const scan = () => {
        const now = Date.now();
        const present = new Set();
        document.querySelectorAll('.app__notifications .pkpNotification').forEach((el) => {
            present.add(el);
            if (!seen.has(el)) {
                const btn = el.querySelector('.pkpNotification__closeButton');
                let text = el.textContent || '';
                if (btn) text = text.replace(btn.textContent || '', '');
                const entry = {text: text.replace(/\s+/g, ' ').trim().slice(0, 300), cls: el.className, shownAt: now, goneAt: null};
                seen.set(el, entry);
                window.__i28.push(entry);
            }
        });
        for (const [el, entry] of seen) if (!present.has(el) && entry.goneAt === null) entry.goneAt = now;
    };
    const go = () => new MutationObserver(scan).observe(document.documentElement, {childList: true, subtree: true});
    if (document.documentElement) go();
    else document.addEventListener('DOMContentLoaded', go);
};
const toastLog = (page) => page.evaluate(() => (window.__i28 || []).map((x) => ({...x}))).catch(() => []);
const pageNow = (page) => page.evaluate(() => Date.now());

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const L = {
        se: isOMP ? 'Series editor' : isOPS ? 'Moderator' : 'Section editor',
        stage: isOPS ? 'workflow_5' : 'workflow_1',
        disc: isOPS ? 'Discussion (Production)' : 'Discussion (Submission)',
        needs: isOJS ? 'A new article has been submitted to which an editor needs to be assigned.'
            : isOMP ? 'A new monograph has been submitted to which an editor needs to be assigned.'
                : 'A new preprint has been submitted to which a moderator needs to be assigned.',
    };

    // ---- seed ------------------------------------------------------------------------------------
    const t = tag('u05i28');
    const U = (k, roles, g, f) => ({username: `${t}${k}`, roles, givenName: g, familyName: f});
    const users = [
        U('mgr', ['manager'], 'Mia', 'Manager'),
        U('se', ['sectionEditor'], 'Sid', 'Section'),
        U('se2', ['sectionEditor'], 'Ada', 'Assignee'),
        U('se3', ['sectionEditor'], 'Nia', 'Notified'),
        U('au', ['author'], 'Ari', 'Author'),
        U('rd', ['reader'], 'Rex', 'Reader'),
    ];
    if (!isOPS) {
        users.push(U('ed', ['editor'], 'Eda', 'Editor'), U('pe', ['productionEditor'], 'Pat', 'Production'),
            U('ce', ['copyeditor'], 'Cal', 'Copyeditor'));
    } else {
        users.push(U('eb', ['editorialBoardMember'], 'Ebb', 'Board'));
    }
    await app.api.createContext({tag: t, context: {name: `U05 I28 ${t}`, acronym: 'I28', contactName: 'I28 Contact', contactEmail: `${t}contact@mail.test`}, users});
    const ctx = t;
    const u = Object.fromEntries(users.map((x) => [x.username.slice(t.length), {username: x.username, name: `${x.givenName} ${x.familyName}`, email: `${x.username}@mail.test`}]));
    const s1 = await app.api.createSubmission({tag: `${t}s1`, context: ctx, submitter: u.au.username, title: `I28 needs editor ${t}`});
    const s2 = await app.api.createSubmission({tag: `${t}s2`, context: ctx, submitter: u.au.username, title: `I28 discussion ${t}`,
        participants: [{username: u.se3.username, role: 'sectionEditor'}]});
    const S1 = {id: s1.submissionId, title: `I28 needs editor ${t}`};
    const S2 = {id: s2.submissionId, title: `I28 discussion ${t}`};
    record(`${RUN}-seed`, {ctx, users: u, S1, S2, stage: {s1: s1.stageId, s2: s2.stageId}});
    log(`[seed] ${app.name} ctx ${ctx} S1 #${S1.id} S2 #${S2.id}`);

    const ctxUrl = (p) => app.url(`/index.php/${ctx}${p}`);
    const wfUrl = (id) => ctxUrl(`/dashboard/editorial?workflowSubmissionId=${id}&workflowMenuKey=${L.stage}`);

    async function session() {
        const s = await launch(app);
        await s.context.addInitScript(TOAST_WATCH);
        s.dialogs = [];
        s.answer = 'accept';
        s.page.on('dialog', async (d) => {
            const answer = d.type() === 'beforeunload' ? 'accept' : s.answer;
            s.dialogs.push({at: new Date().toISOString(), type: d.type(), message: d.message(), answer});
            await (answer === 'accept' ? d.accept() : d.dismiss()).catch(() => {});
        });
        return s;
    }

    // The Tasks panel from the account's Profile page (an editorial page every role reaches).
    async function readTasks(page, label, {titles = [], marker = null} = {}) {
        await page.goto(ctxUrl('/user/profile'));
        await idle(page);
        const bell = page.getByRole('button', {name: /^Tasks/});
        const bellText = flat(await bell.innerText().catch(() => null), 40);
        await bell.click();
        const dlg = page.getByRole('dialog').filter({has: page.getByRole('heading', {name: 'Tasks', exact: true})});
        await dlg.waitFor({timeout: 30000});
        await dlg.locator('table').first().waitFor({timeout: 30000});
        await idle(page);
        const rows = await dlg.locator('tr.gridRow').evaluateAll((trs) => trs.map((tr) => {
            const msg = tr.querySelector('.task .message');
            const cs = msg ? getComputedStyle(msg) : null;
            return {
                message: (msg?.textContent || '').replace(/\s+/g, ' ').trim(),
                messageInner: msg ? msg.innerText.replace(/\s+/g, ' ').trim() : null,
                title: (tr.querySelector('.task .details .submission')?.textContent || '').replace(/\s+/g, ' ').trim(),
                acronym: (tr.querySelector('.task .details .acronym')?.textContent || '').replace(/\s+/g, ' ').trim(),
                unread: !!tr.querySelector('div.task.unread'),
                style: cs ? {whiteSpace: cs.whiteSpace, overflow: cs.overflow, textOverflow: cs.textOverflow, lineClamp: cs.webkitLineClamp} : null,
                clipped: msg ? msg.scrollWidth > msg.clientWidth + 1 || msg.scrollHeight > msg.clientHeight + 1 : null,
            };
        }));
        const pager = flat(await dlg.innerText().catch(() => ''), 4000);
        const s = await snap(page, label, {bellText, rowCount: rows.length});
        const mine = rows.filter((r) => titles.some((ti) => r.title.includes(ti) || r.message.includes(ti)) || (marker && r.message.includes(marker)));
        const out = {bellText, rowCount: rows.length, mine, dialogTail: pager.slice(-200), dialogText: s.text && s.text.dialog ? flat(s.text.dialog, 3000) : null};
        record(`${RUN}-${label}-rows`, out);
        await loc(page, 'Tasks panel rows', dlg.locator('tr.gridRow'));
        await dlg.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await dlg.waitFor({state: 'detached', timeout: 15000}).catch(() => {});
        return out;
    }

    // ---- L59a: who gets the needs-editor task --------------------------------------------------------
    const L59a = {};
    if (on('l59a')) await sect('l59a', async () => {
        const {page, close} = await session();
        const who = isOPS ? ['mgr', 'se', 'eb', 'au', 'rd', 'admin'] : ['mgr', 'ed', 'pe', 'se', 'ce', 'au', 'rd', 'admin'];
        for (const k of who) {
            await sect(`l59a-${k}`, async () => {
                const username = k === 'admin' ? 'admin' : u[k].username;
                await signIn(page, username, {contextPath: ctx});
                await idle(page);
                const r = await readTasks(page, `l59a-tasks-${k}`, {titles: [S1.title]});
                L59a[k] = {rowsForS1: r.mine.map((m) => m.message), needsRow: r.mine.some((m) => m.message === L.needs), bell: r.bellText, total: r.rowCount};
                log(`[l59a] ${app.name} ${k}: needs-row ${L59a[k].needsRow} rows ${JSON.stringify(L59a[k].rowsForS1)} bell ${r.bellText}`);
            });
        }
        record(`${RUN}-l59a`, L59a);
        await close();
    });

    // ---- L59a on the wizard's own submit: the task and the "needs an editor" email per role ------------------
    if (on('wizard')) await sect('wizard', async () => {
        const {page, close} = await session();
        const title = `I28 wizard ${t}`;
        const {submissionId} = await app.api.createSubmission({tag: `${t}s3`, context: ctx, submitter: u.au.username, title, submitted: false, participants: []});
        await signIn(page, u.au.username, {contextPath: ctx});
        await idle(page);
        if (isOJS) {
            const {SubmissionWizardPage} = require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPage.js'));
            const w = new SubmissionWizardPage(page, ctx);
            await w.goto(submissionId);
            await w.expectStep('Upload Files');
            await w.uploadFile();
            await w.continueTo('Details');
            await w.continueTo('Contributors');
            await w.continueTo('For the Editors');
            await w.continueToReview(submissionId);
            await snap(page, 'wizard-review-au');
            await w.submitAndConfirm();
        } else {
            const W = require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPages.js'));
            await page.goto(W.wizardUrl(ctx, submissionId));
            await W.expectWizardOpen(page);
            if (isOMP) await W.completeAndSubmitDraft(page, `ms-${t}.txt`);
            else await W.completeAndSubmitDraft(page);
        }
        await idle(page);
        await snap(page, 'wizard-submitted-au');
        const who = isOPS ? ['mgr', 'se', 'eb', 'au', 'rd', 'admin'] : ['mgr', 'ed', 'pe', 'se', 'ce', 'au', 'rd', 'admin'];
        const out = {submissionId, title, tasks: {}, mail: {}};
        const subject = 'needs an editor';
        const bound = await app.mail.find({to: u.mgr.email, subject, timeoutMs: 30000}).then((m) => m.Subject).catch((e) => `none: ${String(e.message).slice(0, 120)}`);
        out.mailBound = bound;
        for (const k of who) {
            await sect(`wizard-${k}`, async () => {
                const username = k === 'admin' ? 'admin' : u[k].username;
                await signIn(page, username, {contextPath: ctx});
                await idle(page);
                const r = await readTasks(page, `wizard-tasks-${k}`, {titles: [title]});
                out.tasks[k] = r.mine.map((m) => m.message);
                if (k !== 'admin') {
                    const found = await app.mail._search({to: u[k].email, subject}).then((x) => (x.messages || []).map((m) => m.Subject)).catch((e) => String(e.message));
                    out.mail[k] = found;
                }
            });
        }
        record(`${RUN}-wizard`, out);
        log(`[wizard] ${app.name}`, JSON.stringify(out));
        await close();
    });

    // ---- the workflow helpers --------------------------------------------------------------------------
    const wf = (page) => page.locator('[role="dialog"]:visible').first();
    async function openWf(page, id) {
        await page.goto(wfUrl(id));
        await idle(page);
        await page.locator('[data-cy="workflow-secondary-items"]').waitFor({timeout: 30000});
        await idle(page);
    }
    const msgId = (win) => win.locator('textarea[name="message"]').getAttribute('id');
    const readMsg = async (page, win) => {
        const id = await msgId(win).catch(() => null);
        if (!id) return null;
        return page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent({format: 'text'}) : null), id);
    };
    async function typeMessage(page, win, text) {
        const id = await msgId(win);
        await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: 30000});
        const body = page.frameLocator(`#${id}_ifr`).locator('body');
        await body.click();
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.press('Delete');
        if (text) await page.keyboard.insertText(text);
        await sleep(300);
        return readMsg(page, win);
    }
    async function chooseTemplate(page, win, label) {
        const opts = await win.locator('select[name="template"] option').evaluateAll((els) => els.map((o) => ({text: o.text.trim(), value: o.value})));
        const o = opts.find((x) => x.text === label) || opts.find((x) => x.value);
        const before = await readMsg(page, win);
        const fetched = page.waitForResponse((r) => r.url().includes('fetch-template-body'), {timeout: 30000}).catch(() => null);
        await win.locator('select[name="template"]').selectOption(o.value);
        await fetched;
        await idle(page);
        for (let i = 0; i < 30; i++) {
            const m = await readMsg(page, win);
            if (m && m !== before) break;
            await sleep(300);
        }
        return {chosen: o.text, options: opts.map((x) => x.text)};
    }
    const notifyWin = (page) => page.getByRole('dialog').filter({has: page.locator('form select[name="template"]')}).filter({hasNot: page.locator('select[name="filterUserGroupId"]')}).last();
    async function openNotify(page, k) {
        await wf(page).getByRole('button', {name: `${u[k].name} More Actions`, exact: true}).first().click();
        await page.getByRole('menuitem', {name: 'Notify', exact: true}).click();
        const win = notifyWin(page);
        await win.getByRole('button', {name: 'Notify', exact: true}).waitFor({timeout: 30000});
        await win.locator('textarea[name="message"]').waitFor({state: 'attached', timeout: 30000});
        await idle(page);
        return win;
    }
    async function pressNotify(page, win) {
        const resp = page.waitForResponse((r) => r.url().includes('send-notification'), {timeout: 30000}).catch(() => null);
        const t0 = await pageNow(page);
        await win.getByRole('button', {name: 'Notify', exact: true}).click();
        const r = await resp;
        return {t0, status: r ? r.status() : null, answer: r ? flat(await r.text().catch(() => ''), 300) : null};
    }

    // Press a toast's "×" and time what follows. `how` = 'mouse' (a real press at the "×"'s centre) or 'locator'.
    async function pressToastClose(page, textRe, how, label) {
        const toast = page.locator('.app__notifications .pkpNotification').filter({hasText: textRe}).first();
        await toast.waitFor({timeout: 15000});
        const btn = toast.locator('.pkpNotification__closeButton');
        await sleep(800);
        const box = await btn.boundingBox();
        const info = await btn.evaluate((b) => {
            const r = b.getBoundingClientRect();
            const x = r.left + r.width / 2;
            const y = r.top + r.height / 2;
            const top = document.elementFromPoint(x, y);
            const desc = (el) => (el ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''}` : null);
            return {
                label: b.getAttribute('aria-label') || b.innerText.trim(),
                text: b.textContent.replace(/\s+/g, ' ').trim(),
                topElement: desc(top),
                topIsButton: !!(top && (top === b || b.contains(top))),
                toastEdge: (() => { const n = b.closest('.pkpNotification'); const cs = n && getComputedStyle(n); return cs ? {borderLeftColor: cs.borderLeftColor, borderLeftWidth: cs.borderLeftWidth, background: cs.backgroundColor, cls: n.className} : null; })(),
                pointerEvents: {button: getComputedStyle(b).pointerEvents, area: getComputedStyle(document.querySelector('.app__notifications')).pointerEvents, body: getComputedStyle(document.body).pointerEvents},
            };
        });
        const pressAt = await pageNow(page);
        let clickError = null;
        if (how === 'mouse') {
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
            await page.mouse.up();
        } else {
            await btn.click({timeout: 3000}).catch((e) => { clickError = flat(String(e.message), 500); });
        }
        let goneAt = null;
        for (let i = 0; i < 120; i++) {
            if (!(await toast.isVisible().catch(() => false))) { goneAt = await pageNow(page); break; }
            await sleep(100);
        }
        await page.mouse.move(5, 890);
        const logEntry = (await toastLog(page)).filter((x) => textRe.test(x.text)).pop() || null;
        const out = {how, info, clickError, pressAt, goneAt, goneAfterPressMs: goneAt ? goneAt - pressAt : null,
            shownAt: logEntry && logEntry.shownAt, pressAfterShownMs: logEntry ? pressAt - logEntry.shownAt : null,
            goneAfterShownMs: logEntry && goneAt ? goneAt - logEntry.shownAt : null, toastClass: logEntry && logEntry.cls};
        record(`${RUN}-${label}`, out);
        log(`[${label}] ${app.name}`, JSON.stringify({how, top: info.topElement, topIsButton: info.topIsButton, pe: info.pointerEvents, clickError: clickError && clickError.slice(0, 120), goneAfterPressMs: out.goneAfterPressMs, goneAfterShownMs: out.goneAfterShownMs}));
        return out;
    }

    // ---- L59b + L140b: as the Manager on S2 ---------------------------------------------------------------
    const lengths = [150, 198, 199, 200, 201, 300];
    const sent = {};
    await sect('mgr-workflow', async () => {
        const s = await session();
        const {page} = s;
        await signIn(page, u.mgr.username, {contextPath: ctx});
        await idle(page);

        // L59b, "Assign" with a 300-character message to se2.
        if (on('assign')) await sect('l59b-assign', async () => {
            await openWf(page, S2.id);
            await snap(page, 'wf-s2-mgr');
            await page.locator('[data-cy="workflow-secondary-items"]').getByRole('button', {name: 'Assign', exact: true}).click();
            const win = page.getByRole('dialog').filter({has: page.locator('select[name="filterUserGroupId"]')}).last();
            await win.locator('select[name="filterUserGroupId"]').waitFor({timeout: 30000});
            await idle(page);
            await win.locator('select[name="filterUserGroupId"]').selectOption({label: L.se});
            await idle(page);
            await win.getByRole('textbox', {name: 'Search User By Name'}).fill(u.se2.username);
            await win.getByRole('button', {name: 'Search', exact: true}).click();
            await idle(page);
            await win.getByRole('row').filter({hasText: u.se2.name}).locator('input[name="userId"]').click();
            await idle(page);
            const tpl = await chooseTemplate(page, win, L.disc);
            const msg = marked(300, 'ASG ');
            const typed = await typeMessage(page, win, msg);
            await snap(page, 'l59b-assign-filled', {template: tpl, typedLength: typed && typed.length});
            const resp = page.waitForResponse((r) => r.url().includes('save-participant'), {timeout: 30000}).catch(() => null);
            await win.getByRole('button', {name: 'OK', exact: true}).click();
            const r = await resp;
            await win.waitFor({state: 'detached', timeout: 15000}).catch(() => {});
            await idle(page);
            sent.assign = {length: 300, msg, typedLength: typed && typed.length, template: tpl.chosen, status: r && r.status()};
            await snap(page, 'l59b-assign-after', {sent: sent.assign});
            log(`[l59b assign] ${app.name} status ${r && r.status()} typed ${typed && typed.length} tpl ${tpl.chosen}`);
        });

        // L140b: "Notify" with "Message" empty, the warning toast over the open window; "×" pressed.
        const toastRuns = {};
        for (const how of on('toast') ? ['mouse', 'locator'] : []) {
            await sect(`l140b-${how}`, async () => {
                await openWf(page, S2.id);
                const win = await openNotify(page, 'se3');
                await snap(page, `l140b-notify-open-${how}`);
                await typeMessage(page, win, '');
                const p = await pressNotify(page, win);
                const warn = /Please ensure that you have filled out the message field/;
                const stageBox = async () => page.evaluate(() => [...document.querySelectorAll('h3')].filter((h) => /Notification/.test(h.textContent)).map((h) => (h.parentElement?.innerText || '').replace(/\s+/g, ' ').slice(0, 300)));
                const appeared = await page.locator('.app__notifications .pkpNotification').filter({hasText: warn}).first().waitFor({timeout: 10000}).then(() => true).catch(() => false);
                const snapNow = await snap(page, `l140b-warning-${how}`, {send: p, toastAppeared: appeared, stageBox: await stageBox().catch(() => null)});
                if (!appeared) {
                    toastRuns[how] = {send: p, toastAppeared: false, notices: snapNow.notices, stageBox: await stageBox().catch(() => null)};
                    return;
                }
                const res = await pressToastClose(page, warn, how, `l140b-press-${how}`);
                const winOpen = await win.isVisible().catch(() => false);
                toastRuns[how] = {send: p, ...res, windowOpenAfter: winOpen};
                await snap(page, `l140b-after-${how}`, {windowOpenAfter: winOpen});
                // Sweep: leave the window with a typed, unsent message by its close control.
                if (how === 'mouse' && winOpen) {
                    await chooseTemplate(page, win, L.disc);
                    await typeMessage(page, win, `Unsent ${t}`);
                    const before = s.dialogs.length;
                    await win.getByRole('button', {name: /^Close/}).first().click();
                    await win.waitFor({state: 'detached', timeout: 10000}).catch(() => {});
                    toastRuns.leave = {dialogs: s.dialogs.slice(before), closed: !(await win.isVisible().catch(() => false))};
                    await snap(page, 'l140b-leave-unsent', toastRuns.leave);
                }
            });
        }
        // Sweep, the other end: a fresh Notify window (no refused press first) left the same way.
        if (on('toast')) await sect('leave-fresh', async () => {
            await openWf(page, S2.id);
            const win = await openNotify(page, 'se3');
            await chooseTemplate(page, win, L.disc);
            await typeMessage(page, win, `Unsent fresh ${t}`);
            const before = s.dialogs.length;
            // First answer the question "Cancel": the window should stay with the text; then "OK".
            s.answer = 'dismiss';
            await win.getByRole('button', {name: /^Close/}).first().click();
            await sleep(1500);
            const afterCancel = {open: await win.isVisible().catch(() => false), message: await readMsg(page, win).catch(() => null)};
            s.answer = 'accept';
            if (afterCancel.open) {
                await win.getByRole('button', {name: /^Close/}).first().click();
                await win.waitFor({state: 'detached', timeout: 10000}).catch(() => {});
            }
            toastRuns.leaveFresh = {dialogs: s.dialogs.slice(before), afterCancel, closed: !(await win.isVisible().catch(() => false))};
            await snap(page, 'leave-fresh-unsent', toastRuns.leaveFresh);
            // and a fresh window left untouched
            await openWf(page, S2.id);
            const win2 = await openNotify(page, 'se3');
            const before2 = s.dialogs.length;
            await win2.getByRole('button', {name: /^Close/}).first().click();
            await win2.waitFor({state: 'detached', timeout: 10000}).catch(() => {});
            toastRuns.leaveUntouched = {dialogs: s.dialogs.slice(before2), closed: !(await win2.isVisible().catch(() => false))};
            // the two halves apart: the predefined message chosen and nothing typed; a message typed with the list blank
            for (const [key, fill] of [['leaveTemplateOnly', async (w) => chooseTemplate(page, w, L.disc)], ['leaveTypedOnly', async (w) => typeMessage(page, w, `Typed only ${t}`)]]) {
                await openWf(page, S2.id);
                const w = await openNotify(page, 'se3');
                await fill(w);
                const b = s.dialogs.length;
                await w.getByRole('button', {name: /^Close/}).first().click();
                await w.waitFor({state: 'detached', timeout: 10000}).catch(() => {});
                toastRuns[key] = {dialogs: s.dialogs.slice(b), closed: !(await w.isVisible().catch(() => false))};
            }
            log(`[leave] ${app.name}`, JSON.stringify({afterRefusal: toastRuns.leave, fresh: toastRuns.leaveFresh, untouched: toastRuns.leaveUntouched, templateOnly: toastRuns.leaveTemplateOnly, typedOnly: toastRuns.leaveTypedOnly}));
        });
        if (on('toast')) record(`${RUN}-l140b`, toastRuns);

        // L59b axis + L140b control: "Notify" to se3 with 150 to 300 characters; the success toast's "×".
        for (const len of on('axis') ? lengths : []) {
            await sect(`l59b-notify-${len}`, async () => {
                await openWf(page, S2.id);
                const win = await openNotify(page, 'se3');
                await chooseTemplate(page, win, L.disc);
                const msg = marked(len, `N${len} `);
                const typed = await typeMessage(page, win, msg);
                const p = await pressNotify(page, win);
                await win.waitFor({state: 'detached', timeout: 15000}).catch(() => {});
                sent[`n${len}`] = {length: len, msg, typedLength: typed && typed.length, send: p};
                if (len === 150) {
                    const ok = /Notification sent to users/;
                    const appeared = await page.locator('.app__notifications .pkpNotification').filter({hasText: ok}).first().waitFor({timeout: 10000}).then(() => true).catch(() => false);
                    await snap(page, 'l140b-control-success', {appeared});
                    if (appeared) record(`${RUN}-l140b-control`, await pressToastClose(page, ok, 'mouse', 'l140b-control-press'));
                    else record(`${RUN}-l140b-control`, {appeared: false, toasts: await toastLog(page)});
                }
                log(`[l59b notify ${len}] ${app.name} typed ${typed && typed.length} status ${p.status}`);
            });
        }
        // Sweep: a message holding one long unbroken string (a 150-character address), under the server's cut.
        if (on('unbroken')) await sect('unbroken', async () => {
            await openWf(page, S2.id);
            const win = await openNotify(page, 'se3');
            await chooseTemplate(page, win, L.disc);
            const msg = `https://example.org/${t}/` + marked(150, 'U').replace(/ /g, '-').slice(0, 150 - 21 - t.length);
            const typed = await typeMessage(page, win, msg);
            const p = await pressNotify(page, win);
            await win.waitFor({state: 'detached', timeout: 15000}).catch(() => {});
            sent.unbroken = {length: msg.length, msg, typedLength: typed && typed.length, send: p};
        });
        if (on('assign') || on('axis') || on('unbroken')) record(`${RUN}-l59b-sent`, sent);

        // L140b control on every app: the Profile › "Notifications" save toast, no window open; "×" pressed.
        if (on('control2')) await sect('l140b-control2', async () => {
            await page.goto(ctxUrl('/user/profile/notificationSettings'));
            await idle(page);
            const form = page.locator('#notificationSettingsForm');
            await form.waitFor({timeout: 30000});
            await snap(page, 'profile-notifications-mgr');
            const saved = page.waitForResponse((r) => /profile-tab\/save-/i.test(r.url()), {timeout: 30000}).catch(() => null);
            await form.getByRole('button', {name: 'Save', exact: true}).click();
            await saved;
            const ok = /Your changes have been saved/;
            const appeared = await page.locator('.app__notifications .pkpNotification').filter({hasText: ok}).first().waitFor({timeout: 10000}).then(() => true).catch(() => false);
            record(`${RUN}-l140b-control2`, appeared ? await pressToastClose(page, ok, 'mouse', 'l140b-control2-press') : {appeared: false, toasts: await toastLog(page)});
        });
        await s.close();
    });

    // ---- L59b: the recipients' Tasks panels and the email control ---------------------------------------------
    if (on('read')) await sect('l59b-read', async () => {
        const {page, close} = await session();
        const out = {};
        for (const k of ['se2', 'se3']) {
            await signIn(page, u[k].username, {contextPath: ctx});
            await idle(page);
            const r = await readTasks(page, `l59b-tasks-${k}`, {titles: [S2.title]});
            out[k] = r.mine.filter((m) => /started a discussion/.test(m.message)).map((m) => {
                const res = {};
                for (const [key, v] of Object.entries(sent)) {
                    const head = v.msg.slice(0, 8);
                    const at = m.message.indexOf(head);
                    if (at < 0) continue;
                    const shown = m.message.slice(at);
                    const ell = /(\.\.\.|…)$/.exec(shown);
                    const body = ell ? shown.slice(0, -ell[0].length) : shown;
                    Object.assign(res, {key, sentLength: v.length, shownChars: body.length, ellipsis: ell ? ell[0] : null, cutEndsWith: body.slice(-12), wholeShown: body === v.msg});
                }
                return {...res, sentence: m.message, style: m.style, clipped: m.clipped, title: m.title, unread: m.unread};
            });
        }
        record(`${RUN}-l59b-tasks`, out);
        log(`[l59b tasks] ${app.name}`, JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.map((x) => ({key: x.key, shown: x.shownChars, ell: x.ellipsis, clipped: x.clipped}))]))));
        // Email control: the discussion emails carry the whole message.
        const mails = {};
        for (const [key, v] of Object.entries(sent)) {
            const to = key === 'assign' ? u.se2.email : u.se3.email;
            const m = await app.mail.find({to, contains: v.msg.slice(0, 8), timeoutMs: 20000}).catch((e) => ({error: String(e.message).slice(0, 200)}));
            if (m && m.ID) {
                const full = await app.mail.fullMessage(m.ID);
                const txt = (full.Text || '').replace(/\s+/g, '');
                mails[key] = {subject: full.Subject, wholeMessageInText: txt.includes(v.msg.replace(/\s+/g, '')), from: full.From && full.From.Name};
            } else mails[key] = m;
        }
        record(`${RUN}-l59b-mail`, mails);
        log(`[l59b mail] ${app.name}`, JSON.stringify(mails));
        await close();
    });

    if (RUN === 'r1' && isOJS) {
        note(`ccI28: Tasks panel read from \`{ctx}/user/profile\` for every role (bell \`getByRole('button', {name: /^Tasks/})\`, window \`getByRole('dialog')\` with heading "Tasks", rows \`tr.gridRow\`, sentence \`.task .message\`); a Notify window's refusal toast is read at \`.app__notifications .pkpNotification\` while the window is open (${app.name}, 2026-09-28).`);
    }
});
