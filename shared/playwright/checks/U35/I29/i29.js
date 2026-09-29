// U35 claim check, chunk I29 (housekeeping 2026-09-29): incidentals row 6 against
// docs/specs/U35-stage-participants.md Rule 11's last sentence ("The window's close control closes it at
// once, a typed message included: nothing is sent and nothing asks first").
//   The Participants row menu's "Notify" window left by its close control ("Close" at the top right), per
//   case, each on a freshly opened window:
//     untouched   — nothing changed (the control end)
//     tplOnly     — a predefined message chosen, nothing typed
//     tplTyped    — a predefined message chosen, then "Message" typed over (the row's case b)
//     typedOnly   — the list left blank, a message typed, the focus still in the box (the row's case c)
//     typedBlur   — the same, then a click on the window's heading so the box loses focus
//     tplBack     — a predefined message chosen, then the list set back to its blank entry
//   Every close is answered "Cancel" first (the window's state is read when it stays), then "OK".
//   Levels: Journal Manager (all cases), Section Editor/Series editor/Moderator (tplTyped, typedOnly),
//   Copyeditor on a Copyediting submission (OJS, OMP; tplTyped, typedOnly).
//   Reads: the stage's discussions panel after the closes and after a reload; the recipients' mailboxes
//   for every unsent marker, after a control message sent through "Notify" arrived.
//   Sweep: a reload of the page with a changed Notify window open (the page-leave question), and Escape
//   pressed on the window's list after a change.
//
//   PROBE_FEATURE=U35 PROBE_AGENT=ccI29 RUN=r1 node bin/probe.js all shared/playwright/checks/U35/I29/i29.js
//   (RUN names the facts of one run; each run seeds its own scratch context.)
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const log = (...a) => console.log(`[${RUN}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 400));

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
// The stage's discussions panel as text rows (as U35 K3).
const discussionsRead = (page) => page.evaluate(() => {
    const vis = (e) => e.getClientRects().length > 0;
    const dlg = [...document.querySelectorAll('[role=dialog]')].filter(vis)[0] || document.body;
    const h = [...dlg.querySelectorAll('h1,h2,h3,h4')].filter(vis).find((x) => /Tasks & Discussions|Discussions/i.test(x.innerText.trim()));
    if (!h) return null;
    let box = h.parentElement;
    for (let i = 0; i < 4 && box && !box.querySelector('table'); i++) box = box.parentElement;
    const rows = box ? [...box.querySelectorAll('tbody tr')].filter(vis).map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()).filter((t) => t && !/^(Yet to begin|In progress|Closed|No Items)$/.test(t)) : [];
    return {heading: h.innerText.trim(), rows};
});

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const L = {
        stage1: isOPS ? 'workflow_5' : 'workflow_1',
        disc1: isOPS ? 'Discussion (Production)' : 'Discussion (Submission)',
        stage2: 'workflow_4',
        disc2: 'Discussion (Copyediting)',
    };

    // ---- seed ------------------------------------------------------------------------------------
    const t = tag('u35i29');
    const U = (k, roles, g, f) => ({username: `${t}${k}`, roles, givenName: g, familyName: f});
    const users = [
        U('mgr', ['manager'], 'Mia', 'Manager'),
        U('se', ['sectionEditor'], 'Sid', 'Section'),
        U('se2', ['sectionEditor'], 'Ada', 'Second'),
        U('au', ['author'], 'Ari', 'Author'),
    ];
    if (!isOPS) users.push(U('ce', ['copyeditor'], 'Cal', 'Copyeditor'));
    await app.api.createContext({tag: t, context: {name: `U35 I29 ${t}`, acronym: 'I29', contactName: 'I29 Contact', contactEmail: `${t}contact@mail.test`}, users});
    const ctx = t;
    const u = Object.fromEntries(users.map((x) => [x.username.slice(t.length), {username: x.username, name: `${x.givenName} ${x.familyName}`, email: `${x.username}@mail.test`}]));
    const P = (k, role) => ({username: u[k].username, role});
    const s1 = await app.api.createSubmission({tag: `${t}s1`, context: ctx, submitter: u.au.username, title: `I29 notify ${t}`,
        participants: [P('se', 'sectionEditor'), P('se2', 'sectionEditor')]});
    const S1 = {id: s1.submissionId};
    let S2 = null;
    if (!isOPS) {
        let lastErr = null;
        for (const chain of [['skipExternalReview'], ['acceptAndSkipReview'], ['skipReview'], ['sendExternalReview', 'accept']]) {
            try {
                const s2 = await app.api.createSubmission({tag: `${t}s2`, context: ctx, submitter: u.au.username, title: `I29 copyedit ${t}`,
                    decisions: chain, participants: [P('se', 'sectionEditor'), P('ce', 'copyeditor')]});
                S2 = {id: s2.submissionId, stageId: s2.stageId, chain};
                break;
            } catch (e) {
                lastErr = e;
            }
        }
        if (!S2) log('[seed] S2 failed', String(lastErr && lastErr.message).slice(0, 300));
    }
    record(`${RUN}-seed`, {ctx, users: u, S1, S2, stage1: s1.stageId});
    log(`[seed] ${app.name} ctx ${ctx} S1 #${S1.id} S2 ${S2 ? '#' + S2.id + ' stage ' + S2.stageId : 'none'}`);

    const ctxUrl = (p) => app.url(`/index.php/${ctx}${p}`);
    const wfUrl = (id, key) => ctxUrl(`/dashboard/editorial?workflowSubmissionId=${id}&workflowMenuKey=${key}`);

    const s = await launch(app);
    const {page} = s;
    s.dialogs = [];
    s.answer = 'dismiss';
    page.on('dialog', async (d) => {
        const answer = d.type() === 'beforeunload' ? 'accept' : s.answer;
        s.dialogs.push({at: new Date().toISOString(), type: d.type(), message: d.message(), answer});
        await (answer === 'accept' ? d.accept() : d.dismiss()).catch(() => {});
    });

    const wf = () => page.locator('[role="dialog"]:visible').first();
    async function openWf(id, key) {
        await page.goto(wfUrl(id, key));
        await idle(page);
        await page.locator('[data-cy="workflow-secondary-items"]').waitFor({timeout: 30000});
        await idle(page);
    }
    const notifyWin = () => page.getByRole('dialog').filter({has: page.locator('form select[name="template"]')}).filter({hasNot: page.locator('select[name="filterUserGroupId"]')}).last();
    async function openNotify(k) {
        await wf().getByRole('button', {name: `${u[k].name} More Actions`, exact: true}).first().click();
        await page.getByRole('menuitem', {name: 'Notify', exact: true}).click();
        const win = notifyWin();
        await win.getByRole('button', {name: 'Notify', exact: true}).waitFor({timeout: 30000});
        await win.locator('textarea[name="message"]').waitFor({state: 'attached', timeout: 30000});
        await idle(page);
        const id = await win.locator('textarea[name="message"]').getAttribute('id');
        await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: 30000});
        return win;
    }
    const readMsg = async (win) => {
        const id = await win.locator('textarea[name="message"]').getAttribute('id', {timeout: 3000}).catch(() => null);
        if (!id) return null;
        return page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent({format: 'text'}) : null), id);
    };
    const readTpl = (win) => win.locator('select[name="template"]').evaluate((el) => (el.selectedOptions[0] ? el.selectedOptions[0].text.trim() : null), null, {timeout: 3000}).catch(() => null);
    async function typeMessage(win, text) {
        const id = await win.locator('textarea[name="message"]').getAttribute('id');
        const body = page.frameLocator(`#${id}_ifr`).locator('body');
        await body.click();
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.press('Delete');
        await page.keyboard.insertText(text);
        await sleep(300);
    }
    async function chooseTemplate(win, label) {
        const opts = await win.locator('select[name="template"] option').evaluateAll((els) => els.map((o) => ({text: o.text.trim(), value: o.value})));
        const o = opts.find((x) => x.text === label) || opts.find((x) => x.value);
        const before = await readMsg(win);
        const fetched = page.waitForResponse((r) => /fetch-?template-?body/i.test(r.url()), {timeout: 30000}).catch(() => null);
        await win.locator('select[name="template"]').selectOption(o.value);
        await fetched;
        await idle(page);
        for (let i = 0; i < 30; i++) {
            const m = await readMsg(win);
            if (m && m !== before) break;
            await sleep(300);
        }
        return {chosen: o.text, options: opts.map((x) => x.text), messageAfter: flat(await readMsg(win), 200)};
    }
    // The blank entry chosen again: the request it posts and its answer are kept (a 500 is a finding).
    async function blankTemplate(win) {
        const fetched = page.waitForResponse((r) => /fetch-?template-?body/i.test(r.url()), {timeout: 15000}).catch(() => null);
        await win.locator('select[name="template"]').selectOption('');
        const r = await fetched;
        await idle(page);
        await sleep(500);
        return r ? {status: r.status(), body: flat(await r.text().catch(() => ''), 200)} : {status: null};
    }
    // Press the window's close control ("Close" at its top right) with the given answer ready for a question.
    async function pressClose(win, answer, how = 'close') {
        s.answer = answer;
        const b = s.dialogs.length;
        if (how === 'close') await win.getByRole('button', {name: /^Close/}).first().click();
        else if (how === 'escape') {
            await win.locator('select[name="template"]').focus();
            await page.keyboard.press('Escape');
        }
        await sleep(1500);
        await idle(page);
        const open = await win.isVisible().catch(() => false);
        return {
            answer, dialogs: s.dialogs.slice(b).map((d) => ({type: d.type, message: d.message, answer: d.answer})),
            windowOpen: open,
            workflowOpen: await page.locator('[data-cy="workflow-secondary-items"]').isVisible().catch(() => false),
            message: open ? flat(await readMsg(win), 200) : null,
            template: open ? await readTpl(win) : null,
        };
    }

    const results = {};
    // One case: open the row's Notify window afresh, make the change, close with "Cancel" first, then "OK".
    async function runCase(level, id, key, k, c, discLabel) {
        const label = `${level}-${c}`;
        return sect(label, async () => {
            await openWf(id, key);
            const discBefore = await discussionsRead(page).catch(() => null);
            const win = await openNotify(k);
            const marker = `Unsent ${label} ${t}`;
            const made = {};
            if (['tplOnly', 'tplTyped', 'tplBack'].includes(c)) made.template = await chooseTemplate(win, discLabel);
            if (c === 'tplBack') made.blankAgain = await blankTemplate(win);
            if (['tplTyped', 'typedOnly', 'typedBlur'].includes(c)) await typeMessage(win, marker);
            if (c === 'typedBlur') {
                await win.getByText('Start Discussion', {exact: true}).first().click();
                await sleep(500);
            }
            made.beforeClose = {message: flat(await readMsg(win), 200), template: await readTpl(win)};
            await snap(page, `${label}-filled`, made);
            const first = await pressClose(win, 'dismiss');
            let second = null;
            if (first.windowOpen) {
                await snap(page, `${label}-after-cancel`, first);
                second = await pressClose(win, 'accept');
            }
            const closedSnap = await snap(page, `${label}-closed`, {first, second});
            const out = {recipient: k, marker, made, first, second, discBefore: discBefore && discBefore.rows, discAfter: ((await discussionsRead(page).catch(() => null)) || {}).rows, noticesAfter: closedSnap.notices};
            results[label] = out;
            log(`[${label}] ${app.name}`, JSON.stringify({before: made.beforeClose, first: {d: first.dialogs.map((x) => x.message), open: first.windowOpen, msg: first.message, tpl: first.template}, second: second && {d: second.dialogs.map((x) => x.message), open: second.windowOpen}}));
            return out;
        });
    }

    const unsent = []; // [recipient key, marker]
    try {
        // ---- Journal Manager: every case, then the reads, the control and the sweep ------------------------
        await signIn(page, u.mgr.username, {contextPath: ctx});
        await idle(page);
        await openWf(S1.id, L.stage1);
        await snap(page, 'mgr-workflow');
        {
            const win = await openNotify('se');
            await snap(page, 'mgr-notify-open');
            await loc(page, 'Notify window close control', win.getByRole('button', {name: /^Close/}).first());
            await loc(page, 'Notify window predefined-message list', win.locator('select[name="template"]'));
            await loc(page, 'Notify window heading "Start Discussion"', win.getByText('Start Discussion', {exact: true}));
            await pressClose(win, 'accept');
        }
        for (const c of ['untouched', 'tplOnly', 'tplTyped', 'typedOnly', 'typedBlur', 'tplBack']) {
            const r = await runCase('mgr', S1.id, L.stage1, 'se', c, L.disc1);
            if (r && ['tplTyped', 'typedOnly', 'typedBlur'].includes(c)) unsent.push(['se', r.marker]);
        }
        // the discussions panel after a reload
        await sect('mgr-reload-read', async () => {
            await openWf(S1.id, L.stage1);
            const d = await discussionsRead(page).catch(() => null);
            results['mgr-after-reload'] = {discussions: d && d.rows};
            await snap(page, 'mgr-after-reload', {discussions: d});
        });
        // control: the same window sends when "Notify" is pressed
        await sect('mgr-control-send', async () => {
            await openWf(S1.id, L.stage1);
            const win = await openNotify('se');
            await chooseTemplate(win, L.disc1);
            const marker = `Sent control ${t}`;
            await typeMessage(win, marker);
            const resp = page.waitForResponse((r) => /send-?notification/i.test(r.url()), {timeout: 30000}).catch(() => null);
            await win.getByRole('button', {name: 'Notify', exact: true}).click();
            const r = await resp;
            await idle(page);
            await sleep(1000);
            const sn = await snap(page, 'mgr-control-sent', {status: r ? r.status() : null});
            results['mgr-control'] = {marker, status: r ? r.status() : null, windowOpen: await win.isVisible().catch(() => false), notices: sn.notices, discussions: ((await discussionsRead(page).catch(() => null)) || {}).rows};
            log(`[control] ${app.name}`, JSON.stringify(results['mgr-control']));
        });
        // sweep: a reload with a changed Notify window open
        await sect('mgr-sweep-reload', async () => {
            await openWf(S1.id, L.stage1);
            const win = await openNotify('se');
            await chooseTemplate(win, L.disc1);
            const marker = `Unsent reload ${t}`;
            await typeMessage(win, marker);
            unsent.push(['se', marker]);
            await win.getByText('Start Discussion', {exact: true}).first().click();
            const b = s.dialogs.length;
            await page.reload();
            await idle(page);
            await page.locator('[data-cy="workflow-secondary-items"]').waitFor({timeout: 30000}).catch(() => {});
            results['mgr-sweep-reload'] = {dialogs: s.dialogs.slice(b), url: page.url(), discussions: ((await discussionsRead(page).catch(() => null)) || {}).rows};
            await snap(page, 'mgr-sweep-reload', results['mgr-sweep-reload']);
            log(`[sweep reload] ${app.name}`, JSON.stringify(results['mgr-sweep-reload'].dialogs));
        });
        // sweep: Escape on the window's list after a change ("Cancel" first, then "OK")
        await sect('mgr-sweep-escape', async () => {
            await openWf(S1.id, L.stage1);
            const win = await openNotify('se');
            await chooseTemplate(win, L.disc1);
            const first = await pressClose(win, 'dismiss', 'escape');
            let second = null;
            if (first.windowOpen) second = await pressClose(win, 'accept', 'escape');
            results['mgr-sweep-escape'] = {first, second};
            await snap(page, 'mgr-sweep-escape', {first, second});
            log(`[sweep escape] ${app.name}`, JSON.stringify({first, second}));
        });
        await signOut(page);

        // ---- Section Editor (assigned) on S1: notify the second one's row ---------------------------------
        await signIn(page, u.se.username, {contextPath: ctx});
        await idle(page);
        await sect('se-workflow', async () => {
            await openWf(S1.id, L.stage1);
            await snap(page, 'se-workflow');
        });
        for (const c of ['tplTyped', 'typedOnly']) {
            const r = await runCase('se', S1.id, L.stage1, 'se2', c, L.disc1);
            if (r) unsent.push(['se2', r.marker]);
        }
        await signOut(page);

        // ---- Copyeditor (assistant level) on S2's Copyediting: notify the Section Editor's row --------------
        if (S2) {
            await signIn(page, u.ce.username, {contextPath: ctx});
            await idle(page);
            await sect('ce-workflow', async () => {
                await openWf(S2.id, L.stage2);
                await snap(page, 'ce-workflow');
            });
            for (const c of ['tplTyped', 'typedOnly']) {
                const r = await runCase('ce', S2.id, L.stage2, 'se', c, L.disc2);
                if (r) unsent.push(['se', r.marker]);
            }
            await signOut(page);
        }
    } finally {
        record(`${RUN}-cases`, results);
    }

    // ---- mailboxes: the control first, then every unsent marker ----------------------------------------
    await sect('mail', async () => {
        const ctl = results['mgr-control'];
        const control = ctl ? await app.mail.find({to: u.se.email, contains: ctl.marker, timeoutMs: 30000}).then((m) => ({found: true, subject: m.Subject})).catch((e) => ({found: false, error: String(e.message).slice(0, 200)})) : null;
        const counts = [];
        for (const [k, marker] of unsent) counts.push({to: k, marker, count: await app.mail.count({to: u[k].email, contains: marker}).catch((e) => String(e.message).slice(0, 120))});
        record(`${RUN}-mail`, {control, unsent: counts});
        log(`[mail] ${app.name}`, JSON.stringify({control, unsent: counts}));
    });

    if (RUN === 'r1' && app.name === 'ojs') {
        const q = (c) => ((results[`mgr-${c}`] || {}).first || {}).dialogs || [];
        const d = q('tplOnly')[0];
        note(`ccI29: the Notify window's close control is \`getByRole('button', {name: /^Close/})\` inside the dialog that has \`form select[name="template"]\`; after a predefined message is chosen it asks ${d ? `a native ${d.type}() "${d.message}"` : 'nothing'}, so a script sets its own page.on('dialog') answer before the press (the kit dismisses it, which is "Cancel"); a message typed with the list blank asks ${q('typedOnly').length ? 'too' : 'nothing'}, after the box lost focus ${q('typedBlur').length ? 'too' : 'still nothing'} (${app.name}, 2026-09-29).`);
    }
});
