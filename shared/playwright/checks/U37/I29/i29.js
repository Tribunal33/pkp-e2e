// U37 claim check, chunk I29 (housekeeping 2026-09-29): incidentals row 12,
// "after 'Add' › 'Save' closes the window, the next reload asks 'Leave site?'
// with nothing typed; a second reload does not" (a stage's Tasks &
// Discussions panel, all three apps). Spec lines owned: Rule 11d, A22,
// footnotes r and td16 (docs/specs/U37-tasks-and-discussions.md).
//
// Seeds its own scratch context per run and app (nothing on publicknowledge):
// manager mg, section editor se, author au; submission SC at Copyediting
// (OJS, OMP) / Production (OPS) with one seeded discussion, and SS at the
// Submission stage (OJS, OMP).
//
// The axis is the time between the window closing and the move away. Every
// case starts from a fresh load of the workflow page, closes the "Add" window
// one way (a successful "Save", "Cancel" › "Warning" › "Yes", an untouched
// "Cancel"), waits one of: nothing (the reload is issued the moment the
// window is hidden), the kit's idle(), 2 s, 15 s, then leaves (two reloads,
// or a typed address). The script's own dialog listener accepts every
// "beforeunload" and logs which move raised it. Beside each move it reads,
// through DevTools (no request to the app), how many "beforeunload"
// listeners the window holds and whether the page has had a user gesture
// (Chromium asks only after one). The timeline cases sample, every 100 ms for
// 6 s after the closing press, the window's visibility, that listener count
// and whether a synthetic "beforeunload" would be cancelled; the "motion"
// variants first remove the kit's disable-motion style so the window's
// closing slide runs as a person sees it.
//
//   PROBE_FEATURE=U37 PROBE_AGENT=ccI29 RUN=1 node bin/probe.js ojs shared/playwright/checks/U37/I29/i29.js
//   CASES=controls,openChanged,otherWindows,discard,save,sweep,timeline,se (default all)
const {forEachApp, launch, signIn, screen, shot, record, loc, idle, tag} = require('../../../probe');

const RUN = process.env.RUN || '1';
const CASES = (process.env.CASES || 'controls,openChanged,otherWindows,discard,save,sweep,timeline,se').split(',');
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const day = (n) => ymd(new Date(Date.now() + n * 86400000));
const flat = (s, n = 800) => (s || '').replace(/\s*\n+\s*/g, ' | ').slice(0, n);

async function seed(app) {
    const t = tag('u37i29');
    const u = (s) => `${t}${s}`;
    const ops = app.name === 'ops';
    const users = [
        {username: u('mg'), roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
        {username: u('se'), roles: ['sectionEditor'], givenName: 'Sean', familyName: 'Editor'},
        {username: u('au'), roles: ['author'], givenName: 'Ava', familyName: 'Author'},
    ];
    const C = await app.api.createContext({tag: t, users});
    const base = {context: C.path, submitter: u('au')};
    const parts = [{username: u('se'), role: 'sectionEditor'}];
    const X = {t, path: C.path};
    X.SC = await app.api.createSubmission({...base, tag: `${t}c`, participants: parts,
        decisions: app.name === 'omp' ? ['skipInternalReview', 'accept'] : app.name === 'ojs' ? ['skipExternalReview'] : undefined,
        tasks: [{title: 'I29 existing discussion', creator: u('mg'), participants: [u('mg'), u('se')], message: 'I29 existing message'}]});
    if (!ops) X.SS = await app.api.createSubmission({...base, tag: `${t}s`, participants: parts});
    console.log(`[${app.name} seed]`, JSON.stringify({path: X.path, SC: X.SC.submissionId, SS: X.SS && X.SS.submissionId}));
    return X;
}

forEachApp(async (app) => {
    const X = await seed(app);
    const {page, close} = await launch(app);
    const cdp = await page.context().newCDPSession(page);
    const L = (...a) => console.log(`[${app.name} run${RUN}]`, ...a);
    const u = (s) => `${X.t}${s}`;
    const results = [];
    const dialogs = [];
    const crashes = [];
    let step = '-';
    let motion = false;
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message(), step});
        L('browser dialog', d.type(), JSON.stringify(d.message()), 'during', step);
        if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    page.on('response', (r) => { if (r.status() >= 500) crashes.push({step, status: r.status(), url: r.url().replace(/^.*index.php/, '')}); });
    page.on('pageerror', (e) => crashes.push({step, pageerror: String(e.message).slice(0, 200)}));

    const buCount = async () => {
        try {
            const {result} = await cdp.send('Runtime.evaluate', {expression: 'window'});
            const {listeners} = await cdp.send('DOMDebugger.getEventListeners', {objectId: result.objectId});
            await cdp.send('Runtime.releaseObject', {objectId: result.objectId}).catch(() => {});
            return listeners.filter((l) => l.type === 'beforeunload').length;
        } catch (e) { return `err ${e.message.slice(0, 60)}`; }
    };
    const gesture = () => page.evaluate(() => navigator.userActivation ? navigator.userActivation.hasBeenActive : null).catch(() => null);
    const wouldPrompt = () => page.evaluate(() => { const e = new Event('beforeunload', {cancelable: true}); window.dispatchEvent(e); return e.defaultPrevented; }).catch(() => null);
    const snap = async (name) => { const s = await screen(page); record(`${name}-r${RUN}`, s); await shot(page, `${name}-r${RUN}`).catch(() => {}); return s; };

    const edUrl = (id) => app.url(`/index.php/${X.path}/en/dashboard/editorial?workflowSubmissionId=${id}`);
    const panel = () => page.locator('[data-cy="discussion-manager"]').first();
    const win = () => page.getByRole('dialog').filter({has: page.locator('input[name="title"]')}).last();
    const warnDlg = () => page.getByRole('dialog').filter({hasText: 'The data on this form has changed'});
    const unMotion = async () => { if (motion) await page.evaluate(() => document.querySelectorAll('style[data-pkp-test="disable-motion"]').forEach((e) => e.remove())).catch(() => {}); };
    const open = async (id) => {
        step = `open ${id}`;
        await page.goto(edUrl(id));
        await panel().getByRole('button', {name: 'Add', exact: true}).first().waitFor({timeout: 30000}).catch(() => L('no Add button'));
        await idle(page);
        await unMotion();
    };
    const editorReady = () => page.waitForFunction(() => window.tinymce && window.tinymce.get().some((e) => e.initialized && e.getContainer() && e.getContainer().offsetParent !== null), null, {timeout: 20000}).catch(() => L('tinymce not initialized'));
    const openAdd = async () => {
        step = 'open Add';
        await panel().getByRole('button', {name: 'Add', exact: true}).first().click();
        const w = win();
        await w.waitFor({timeout: 30000});
        await w.locator('input[name="participants"]').first().waitFor({timeout: 30000}).catch(() => L('no participant boxes'));
        await idle(page);
        await editorReady();
        return w;
    };
    // Two participants: the signed-in person (pre-ticked) and one other the window
    // offers (the section editor for the manager; the author for the section
    // editor, whose window does not offer the manager).
    let other = 'se';
    const fillDiscussion = async (w, name) => {
        await w.locator('input[name="title"]').fill(name);
        const box = w.locator('label', {hasText: `(${u(other)})`}).locator('input[name="participants"]');
        if (!(await box.isChecked())) await box.check();
        await editorReady();
        await w.frameLocator('iframe').first().locator('body').click();
        await page.keyboard.type(`${name} message`);
    };
    // Close the open "Add" window one way; resolves once the window is hidden.
    const closeBy = async (w, how, name) => {
        if (how === 'save') {
            await fillDiscussion(w, name);
            step = 'Save';
            await w.getByRole('button', {name: 'Save', exact: true}).click();
        } else if (how === 'discard') {
            await w.locator('input[name="title"]').fill(name);
            step = 'Cancel changed';
            await w.getByRole('button', {name: 'Cancel', exact: true}).click();
            await warnDlg().last().waitFor({timeout: 5000});
            step = 'Warning Yes';
            await warnDlg().last().getByRole('button', {name: 'Yes', exact: true}).click();
        } else {
            step = 'Cancel untouched';
            await w.getByRole('button', {name: 'Cancel', exact: true}).click();
        }
        const closed = await w.waitFor({state: 'hidden', timeout: 30000}).then(() => true).catch(() => false);
        if (!closed) L(`the window did not close (${how})`);
        return closed;
    };
    const wait = async (delay) => {
        if (delay === 'now') return;
        await idle(page);
        if (typeof delay === 'number') await page.waitForTimeout(delay);
    };
    // One move away: a reload (then a second one) or a typed address.
    const leave = async (label, how) => {
        const out = {};
        const moves = how === 'nav' ? ['nav'] : ['reload1', 'reload2'];
        for (const k of moves) {
            const before = {listeners: await buCount(), gesture: await gesture()};
            const n0 = dialogs.length;
            step = `${label} ${k}`;
            if (k === 'nav') await page.goto(app.url(`/index.php/${X.path}/en/dashboard/editorial`)).catch((e) => L('goto error', e.message.slice(0, 100)));
            else await page.reload().catch((e) => L('reload error', e.message.slice(0, 100)));
            await idle(page);
            out[k] = {before, asked: dialogs.slice(n0).filter((d) => d.type === 'beforeunload').length};
        }
        return out;
    };
    const run = async (name, fn) => {
        const c0 = crashes.length;
        try {
            const r = await fn();
            results.push({case: name, ...r, crashes: crashes.slice(c0)});
            L(name, JSON.stringify(r));
        } catch (e) {
            L(`[error in ${name}]`, String(e.stack || e.message).slice(0, 800));
            await shot(page, `error-${name}-r${RUN}`).catch(() => {});
            results.push({case: name, error: String(e.message).slice(0, 300), crashes: crashes.slice(c0)});
        }
    };
    // A case: open the workflow page, open "Add", close it one way, wait, leave.
    const kase = (how, delay, move = 'reload', {id = X.SC.submissionId, snapAs} = {}) =>
        run(`${how}@${delay}${move === 'nav' ? ' nav' : ''}${id !== X.SC.submissionId ? ' first-stage' : ''}${motion ? ' motion' : ''}`, async () => {
            await open(id);
            const w = await openAdd();
            const name = `I29 ${how} ${delay} ${move} r${RUN}`;
            const closed = await closeBy(w, how, name);
            await wait(delay);
            let listed;
            if (snapAs) { await snap(snapAs); }
            if (how === 'save' && delay !== 'now') listed = await panel().getByText(name, {exact: true}).count();
            return {closed, listed, leave: await leave(`${how}@${delay}`, move)};
        });
    const timeline = (how) => run(`timeline ${how}${motion ? ' motion' : ''}`, async () => {
        await open(X.SC.submissionId);
        const w = await openAdd();
        const name = `I29 timeline ${how} r${RUN}`;
        if (how === 'save') await fillDiscussion(w, name);
        if (how === 'discard') {
            await w.locator('input[name="title"]').fill(name);
            await w.getByRole('button', {name: 'Cancel', exact: true}).click();
            await warnDlg().last().waitFor({timeout: 5000});
        }
        const beforePress = {listeners: await buCount(), wouldPrompt: await wouldPrompt()};
        const t0 = Date.now();
        step = `timeline ${how} press`;
        if (how === 'save') await w.getByRole('button', {name: 'Save', exact: true}).click();
        else if (how === 'discard') await warnDlg().last().getByRole('button', {name: 'Yes', exact: true}).click();
        else await w.getByRole('button', {name: 'Cancel', exact: true}).click();
        const pts = [];
        while (Date.now() - t0 < 6000) {
            pts.push({ms: Date.now() - t0, win: await win().isVisible().catch(() => false), listeners: await buCount(), wouldPrompt: await wouldPrompt()});
            await page.waitForTimeout(100);
        }
        const keep = pts.filter((p, i) => i === 0 || i === pts.length - 1 || ['win', 'listeners', 'wouldPrompt'].some((k) => p[k] !== pts[i - 1][k]));
        return {beforePress, pts: keep, leave: await leave(`timeline ${how}`, 'reload')};
    });

    try {
        await signIn(page, u('mg'), {contextPath: X.path});

        if (CASES.includes('controls')) {
            await run('no window', async () => {
                await open(X.SC.submissionId);
                await snap('i29-workflow-landed');
                L('panel text', flat(await panel().innerText().catch(() => ''), 600));
                await loc(page, 'Tasks & Discussions panel "Add"', panel().getByRole('button', {name: 'Add', exact: true}));
                // a gesture on the page without a window: press the stage's panel heading
                await panel().getByRole('heading').first().click().catch(() => {});
                return {leave: await leave('no window', 'reload')};
            });
            await kase('untouched', 'settled', 'reload', {snapAs: 'i29-after-untouched-close'});
            await kase('untouched', 'now');
        }
        if (CASES.includes('openChanged')) {
            // Rule 11d's first sentence: the page left with the window still open and changed.
            for (const what of ['name', 'participant', 'untouched']) {
                await run(`window open, ${what}, 2 s`, async () => {
                    await open(X.SC.submissionId);
                    const w = await openAdd();
                    if (what === 'name') await w.locator('input[name="title"]').fill(`I29 open ${RUN}`);
                    if (what === 'participant') await w.locator('label', {hasText: `(${u(other)})`}).locator('input[name="participants"]').check();
                    await idle(page); await page.waitForTimeout(2000);
                    if (what === 'name') await snap('i29-window-open-changed');
                    return {leave: await leave(`open ${what}`, 'reload')};
                });
            }
            await run('window open, name, 2 s, nav', async () => {
                await open(X.SC.submissionId);
                const w = await openAdd();
                await w.locator('input[name="title"]').fill(`I29 open nav ${RUN}`);
                await idle(page); await page.waitForTimeout(2000);
                return {leave: await leave('open name nav', 'nav')};
            });
        }
        if (CASES.includes('otherWindows')) {
            // A22 names the "Edit" window too, and Rule 25b sends the Settings template
            // window to Rule 11d: each discarded, then left at once and after 2 s.
            for (const delay of ['now', 2000]) {
                await run(`Edit window discard@${delay}`, async () => {
                    await open(X.SC.submissionId);
                    const row = panel().getByRole('row').filter({hasText: 'I29 existing'}).first();
                    await row.getByRole('button', {name: /More Actions/}).click();
                    await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
                    const w = win();
                    await w.waitFor({timeout: 30000}); await idle(page); await editorReady();
                    await w.locator('input[name="title"]').fill(`I29 edit discard ${RUN}`);
                    await w.getByRole('button', {name: 'Cancel', exact: true}).click();
                    await warnDlg().last().waitFor({timeout: 5000});
                    step = 'Edit Warning Yes';
                    await warnDlg().last().getByRole('button', {name: 'Yes', exact: true}).click();
                    const closed = await w.waitFor({state: 'hidden', timeout: 10000}).then(() => true).catch(() => false);
                    await wait(delay);
                    return {closed, leave: await leave(`Edit discard@${delay}`, 'reload')};
                });
                await run(`template window discard@${delay}`, async () => {
                    step = 'goto templates';
                    await page.goto(app.url(`/index.php/${X.path}/en/management/settings/workflow`));
                    await idle(page);
                    await page.getByRole('tab', {name: 'Tasks and Discussions'}).click();
                    const tp = page.getByRole('tabpanel', {name: 'Tasks and Discussions'});
                    await tp.getByRole('button', {name: /More Actions/}).first().waitFor({timeout: 30000}).catch(() => L('no template rows'));
                    await idle(page);
                    if (delay === 'now') await snap('i29-templates-tab');
                    await tp.getByRole('button', {name: /Add template/}).first().click();
                    const w = win();
                    await w.waitFor({timeout: 30000}); await idle(page); await editorReady();
                    await w.locator('input[name="title"]').fill(`I29 template discard ${RUN}`);
                    await w.getByRole('button', {name: 'Cancel', exact: true}).click();
                    await warnDlg().last().waitFor({timeout: 5000});
                    step = 'template Warning Yes';
                    await warnDlg().last().getByRole('button', {name: 'Yes', exact: true}).click();
                    const closed = await w.waitFor({state: 'hidden', timeout: 10000}).then(() => true).catch(() => false);
                    await wait(delay);
                    return {closed, leave: await leave(`template discard@${delay}`, 'reload')};
                });
            }
        }
        if (CASES.includes('discard')) {
            await kase('discard', 'now');
            await kase('discard', 'settled', 'reload', {snapAs: 'i29-after-discard'});
            await kase('discard', 'settled');
            await kase('discard', 2000);
            await kase('discard', 15000);
            await kase('discard', 2000, 'nav');
        }
        if (CASES.includes('save')) {
            await kase('save', 'now');
            await kase('save', 'settled', 'reload', {snapAs: 'i29-after-save'});
            await kase('save', 'settled');
            await kase('save', 'settled');
            await kase('save', 2000);
            await kase('save', 15000);
            await kase('save', 'now', 'nav');
            await kase('save', 2000, 'nav');
        }
        if (CASES.includes('sweep')) {
            await run('add window sweep', async () => {
                await open(X.SC.submissionId);
                const w = await openAdd();
                const s = await snap('i29-add-window');
                L('Add window text', flat(s.text.dialog, 1500));
                await w.getByRole('button', {name: 'Cancel', exact: true}).click();
                await w.waitFor({state: 'hidden', timeout: 10000}).catch(() => {});
                return {};
            });
            await run('task save@settled', async () => {
                await open(X.SC.submissionId);
                const w = await openAdd();
                await fillDiscussion(w, `I29 task r${RUN}`);
                await w.getByRole('checkbox', {name: 'Enter task information'}).check();
                await w.locator('input[name="taskInfoAssignee"]').first().waitFor({timeout: 10000}).catch(() => L('no owner radios'));
                await w.locator('label', {hasText: 'Sean Editor'}).locator('input[name="taskInfoAssignee"]').check();
                await w.locator('input[name="dateDue"]').fill(day(7));
                await snap('i29-add-task-filled');
                step = 'Save task';
                await w.getByRole('button', {name: 'Save', exact: true}).click();
                const closed = await w.waitFor({state: 'hidden', timeout: 30000}).then(() => true).catch(() => false);
                await idle(page);
                return {closed, leave: await leave('task save@settled', 'reload')};
            });
            await run('save then untouched Add', async () => {
                await open(X.SC.submissionId);
                let w = await openAdd();
                const closed = await closeBy(w, 'save', `I29 then-untouched r${RUN}`);
                await idle(page);
                w = await openAdd();
                const reopenedName = await w.locator('input[name="title"]').inputValue();
                await closeBy(w, 'untouched');
                await idle(page);
                return {closed, reopenedName, leave: await leave('save then untouched', 'reload')};
            });
            await run('Edit save@settled', async () => {
                await open(X.SC.submissionId);
                const row = panel().getByRole('row').filter({hasText: 'I29 existing'}).first();
                step = 'More Actions › Edit';
                await row.getByRole('button', {name: /More Actions/}).click();
                await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
                const w = win();
                await w.waitFor({timeout: 30000}); await idle(page); await editorReady();
                await snap('i29-edit-window');
                await w.locator('input[name="title"]').fill(`I29 existing renamed r${RUN}`);
                step = 'Edit Save';
                await w.getByRole('button', {name: 'Save', exact: true}).click();
                const closed = await w.waitFor({state: 'hidden', timeout: 30000}).then(() => true).catch(() => false);
                await idle(page);
                const s = await snap('i29-after-edit-save');
                const listed = await panel().getByText(`I29 existing renamed r${RUN}`, {exact: true}).count();
                return {closed, windowsOpenAfterSave: s.aria.dialogs.length, listed, leave: await leave('Edit save@settled', 'reload')};
            });
            if (X.SS) {
                await kase('save', 'settled', 'reload', {id: X.SS.submissionId, snapAs: 'i29-first-stage-after-save'});
                await kase('save', 'now', 'reload', {id: X.SS.submissionId});
            }
        }
        if (CASES.includes('timeline')) {
            await timeline('save');
            await timeline('discard');
            await timeline('untouched');
            motion = true;
            await timeline('save');
            await timeline('discard');
            await kase('save', 'now');
            await kase('discard', 'now');
            await kase('save', 'settled');
            await kase('discard', 'settled');
            motion = false;
        }
        if (CASES.includes('se')) {
            await signIn(page, u('se'), {contextPath: X.path});
            other = 'au';
            await run('se landed', async () => { await open(X.SC.submissionId); await snap('i29-se-landed'); const w = await openAdd(); await snap('i29-se-add'); await closeBy(w, 'untouched'); return {}; });
            await kase('save', 'now');
            await kase('save', 'settled', 'reload', {snapAs: 'i29-se-after-save'});
            await kase('discard', 'now');
            await kase('discard', 'settled');
            await kase('discard', 2000);
        }
    } finally {
        record(`i29-facts-run${RUN}`, {seed: {path: X.path, SC: X.SC.submissionId, SS: X.SS && X.SS.submissionId}, results, dialogs, crashes});
        await close();
    }
});
