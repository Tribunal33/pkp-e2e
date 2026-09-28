// U34 claim check, chunk I28: the housekeeping session's incidental rows for the decision-recording spec.
// Chunk: .reports/hk28/chunks/U34.md (incidentals L10 and L148).
//
// L10 (all three apps): the decline letter's closing. A scratch context with a throwaway section editor
// (`se`, "Sven Editorson"), an author (`au`) and one submission with `se` assigned (OJS/OMP Submission
// stage, OPS Production). As `se`: Profile › Contact › "Signature" driven along its axis, each end read
// in "Decline Submission" › "Notify Authors" (the letter's closing lines):
//   a) empty signature (the install default)          → read, Cancel
//   b) "Kind regards, Sven Editorson" typed and saved  → read, Cancel   (the row's exact screen)
//   (r2 on) the context's manager, signature never set → read, Cancel (the other permission level)
//   c) an unsaved change left by another tab (the tab's leave question; r2 on: after a click into
//      "Phone", and the control: an unsaved "Phone" change left the same way), then
//      "S. Editorson, Handling Editor" typed and saved → read, Record, the author's mail
// Each save is read on the same page and again after a reload.
//
// L148 (OMP): the "Select Files" pages of an internal round after a revision. A scratch press with
// `ed` (Press editor), `au`, `ri1` (Internal Reviewer), `rv1` (External Reviewer):
//   IR  internal R1: file, ri1 completed → "Request Revisions", au uploads a revision; then
//       "Accept Submission", "Create New Review Round", "Send to External Review": each walked to its
//       last page ("Select Files"), read, cancelled
//   ER  external R1: file, rv1 completed → "Request Revisions" (no new round), au uploads; then
//       "Accept Submission" and "Create New Review Round" walked, read, cancelled (the control)
//
//   RUN=r1 PROBE_FEATURE=U34 PROBE_AGENT=ccI28 node bin/probe.js all shared/playwright/checks/U34/I28/i28.js
//   RUN=r2 …  (a second, independent run: its own scratch contexts and facts names)
//   PHASES=l10,l148 (default both; l148 runs on OMP only)
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const PDF = fs.readFileSync(path.join(REPO, 'apps/omp/playwright/fixtures/files/article.pdf'));
const RUN = process.env.RUN || 'r1';
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ['l10', 'l148'];
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log(`[${RUN}]`, ...a);
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 400));
const stateFile = (app) => path.join(outDir(), `i28-state-${RUN}-${app.name}.json`);
const pdfNamed = (name) => ({name, mimeType: 'application/pdf', buffer: PDF});
const SIG_KR = 'Kind regards, Sven Editorson';
const SIG_PLAIN = 'S. Editorson, Handling Editor';

async function sect(name, fn) {
    try { await fn(); } catch (e) { log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | ')); record(`${RUN}-${name}-FAILED`, {error: String(e.stack || e).slice(0, 1200)}); }
}
async function snap(page, name, extra) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
    if (extra) Object.assign(s, extra);
    record(`${RUN}-${name}`, s);
    await shot(page, `${RUN}-${name}`).catch(() => {});
    return s;
}
const dialogTexts = (page) => page.locator('[role="dialog"]:visible').evaluateAll((els) =>
    els.map((d) => ({
        name: d.getAttribute('aria-label') || (d.getAttribute('aria-labelledby') && document.getElementById(d.getAttribute('aria-labelledby'))?.innerText) || null,
        text: d.innerText.slice(0, 4000),
        buttons: [...d.querySelectorAll('button, a[role=button], a.pkp_button, input[type=submit], a')].filter((b) => b.getClientRects().length).map((b) => (b.getAttribute('aria-label') || b.innerText || b.value || '').trim().replace(/\s+/g, ' ').slice(0, 80)).filter(Boolean).slice(0, 60),
        inputs: [...d.querySelectorAll('input')].filter((i) => i.type === 'radio' || i.type === 'checkbox').map((i) => ({type: i.type, checked: i.checked, label: (i.closest('label') || i.parentElement || {}).innerText?.trim().slice(0, 160)})).slice(0, 20),
    }))).catch(() => []);
const wfInfo = (page) => page.evaluate(() => {
    const vis = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const dlgs = [...document.querySelectorAll('[role=dialog]')].filter(vis);
    const root = dlgs[0] || document.body;
    const txt = (e) => (e ? e.innerText.trim().replace(/\s+/g, ' ') : null);
    const tables = [...root.querySelectorAll('table')].filter(vis).map((t) => ({
        name: t.getAttribute('aria-label') || (t.getAttribute('aria-labelledby') && document.getElementById(t.getAttribute('aria-labelledby'))?.innerText.trim()) || null,
        rows: [...t.querySelectorAll('tbody tr')].filter(vis).map((tr) => tr.innerText.trim().replace(/\s+/g, ' ').slice(0, 220)),
    }));
    const actionRegion = root.querySelector('[data-cy="workflow-action-items"]');
    const actionButtons = actionRegion ? [...actionRegion.querySelectorAll('button, a')].filter(vis).map((b) => b.innerText.trim().replace(/\s+/g, ' ')) : null;
    const hs = [...root.querySelectorAll('h1,h2,h3,h4')].filter(vis);
    const statusH = hs.find((x) => /Status$/.test(x.innerText.trim()));
    const lines = (dlgs[0] ? dlgs[0].innerText : '').split('\n').map((l) => l.trim()).filter(Boolean);
    const closeAt = lines.indexOf('Close');
    const header = dlgs[0] ? lines.slice(closeAt >= 0 ? closeAt + 1 : 0, (closeAt >= 0 ? closeAt + 1 : 0) + 8).join(' | ') : null;
    return {dialogCount: dlgs.length, header, actionButtons, statusBox: statusH ? txt(statusH.parentElement).slice(0, 500) : null, tables, headings: hs.map((h) => h.innerText.trim()).filter(Boolean).slice(0, 40)};
});
// The decision wizard page: heading, rail, panels (Select Files lists), the letter as shown.
const wizInfo = (page) => page.evaluate(() => {
    const vis = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const main = document.querySelector('main') || document.body;
    const txt = (e) => (e ? e.innerText.trim().replace(/\s+/g, ' ') : null);
    const h1 = main.querySelector('h1');
    const railList = [...main.querySelectorAll('ol, ul')].find((l) => /Complete the following steps/i.test(l.getAttribute('aria-label') || ''));
    const rail = railList ? [...railList.children].map((li) => ({text: txt(li), current: li.getAttribute('aria-current') || li.querySelector('[aria-current]')?.getAttribute('aria-current') || null})) : null;
    const hs = [...main.querySelectorAll('h1,h2,h3,h4,legend')].filter(vis).map((e) => ({tag: e.tagName.toLowerCase(), text: txt(e), next: e.nextElementSibling && vis(e.nextElementSibling) ? txt(e.nextElementSibling).slice(0, 300) : null})).slice(0, 30);
    const btns = [...main.querySelectorAll('button, a.pkp_button, a[role=button], input[type=submit]')].filter(vis).map((b) => ({text: (b.innerText || b.getAttribute('aria-label') || b.value || '').trim().replace(/\s+/g, ' ').slice(0, 80), disabled: b.disabled || b.getAttribute('aria-disabled') === 'true'})).filter((b) => b.text).slice(0, 80);
    const panels = [...main.querySelectorAll('.listPanel')].filter(vis).map((p) => ({title: txt(p.querySelector('.listPanel__title, h2, h3')), items: [...p.querySelectorAll('.listPanel__item')].map((it) => ({text: txt(it).slice(0, 220), checked: it.querySelector('input[type=checkbox]')?.checked ?? null})).slice(0, 20), text: txt(p).slice(0, 600)})).slice(0, 8);
    const templates = [...main.querySelectorAll('.composer__template')].filter(vis).map((e) => txt(e.querySelector('.composer__template__name'))).slice(0, 20);
    const subjectInput = [...main.querySelectorAll('input')].filter(vis).find((i) => /subject/i.test((i.id && document.querySelector(`label[for="${i.id}"]`)?.innerText) || i.name || ''));
    const edList = window.tinymce ? (window.tinymce.get() || []) : [];
    const editors = edList.map((ed) => { try { const c = ed.getContainer && ed.getContainer(); return {id: ed.id, visible: !!(c && c.getClientRects().length), shown: ed.getBody() ? ed.getBody().innerText : null, html: ed.getContent().slice(-900)}; } catch (e) { return {id: ed.id, error: String(e.message)}; } }).sort((a, b) => (b.visible ? 1 : 0) - (a.visible ? 1 : 0));
    return {url: location.href, h1: txt(h1), rail, headings: hs, buttons: btns, panels, templates, subject: subjectInput ? subjectInput.value : null, editors, text: main.innerText.slice(0, 5000)};
});
const topWin = (page) => page.locator('[role="dialog"]:visible').last();
const isWizard = (page) => /\/decision\/record\//.test(page.url());
async function waitWizard(page) {
    await page.waitForURL(/decision\/record/, {timeout: 20000}).catch(() => {});
    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
    await idle(page);
    await page.waitForFunction(() => !!document.querySelector('main h1'), null, {timeout: 15000}).catch(() => {});
    await idle(page);
}
const uploadWiz = (page) => page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
// The closing of a letter as shown: the lines from the last "Kind regards" (or the last three) on.
function closing(shown) {
    const lines = String(shown || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const first = lines.findIndex((l) => /^Kind regards/.test(l));
    return {tail: lines.slice(first >= 0 ? Math.max(0, first - 1) : -4), kindRegardsCount: lines.filter((l) => /Kind regards/.test(l)).length};
}

forEachApp(async (app) => {
    const sf = stateFile(app);
    const sc = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(sc, null, 2));
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const A = app.name;
    const ctxUrl = (cp, p) => app.url(`/index.php/${cp}${p}`);
    const wf = (cp, id, key) => ctxUrl(cp, `/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const authorWf = (cp, id, key) => ctxUrl(cp, `/dashboard/mySubmissions?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const rkey = (s, n = 0) => (s.rounds && s.rounds[n] ? `workflow_${s.rounds[n].stageId}_${s.rounds[n].id}` : undefined);

    const {page, close} = await launch(app);
    const dialogsSeen = [];
    page.on('dialog', async (d) => { dialogsSeen.push({type: d.type(), message: d.message(), url: page.url()}); log('[browser dialog]', d.type(), flat(d.message(), 140)); await d.accept().catch(() => {}); });
    const as = async (user, cp) => { await signIn(page, user, {contextPath: cp}); await idle(page); };

    async function openWorkflow(url, label) {
        await page.goto(url); await idle(page);
        await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page); await page.waitForTimeout(400);
        const info = await wfInfo(page).catch((e) => ({error: String(e.message)}));
        await snap(page, label, {info});
        log(`[${label}]`, A, 'header:', flat(info.header, 100), '| actions:', JSON.stringify(info.actionButtons), '| tables:', JSON.stringify((info.tables || []).map((t) => `${t.name}:${t.rows.length}`)));
        return info;
    }
    async function readWizard(label) {
        await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
        await idle(page);
        // an email page: wait for the letter to be filled
        await page.waitForFunction(() => { const m = document.querySelector('main') || document.body; if (!m.querySelector('.composer')) return true; const eds = (window.tinymce && window.tinymce.get()) || []; return eds.some((e) => { try { return e.getBody() && e.getBody().innerText.trim().length > 20; } catch (_) { return false; } }); }, null, {timeout: 20000}).catch(() => {});
        await page.waitForTimeout(400);
        const w = await wizInfo(page).catch((e) => ({error: String(e.message), url: page.url()}));
        await snap(page, label, {wiz: w});
        log(`[${label}]`, A, 'h1:', flat(w.h1, 90), '| rail:', JSON.stringify((w.rail || []).map((r) => `${r.text}${r.current ? '*' : ''}`)), '| panels:', JSON.stringify((w.panels || []).map((p) => `${p.title}: ${p.items.map((i) => `${i.checked ? '[x]' : '[ ]'}${flat(i.text, 50)}`).join(', ')}${p.items.length ? '' : ' (' + flat(p.text, 90) + ')'}`)));
        return w;
    }
    async function press(name, label, {choice} = {}) {
        const dlg = page.locator('[role="dialog"]:visible').first();
        const btn = dlg.locator('[data-cy="workflow-action-items"]').getByRole('button', {name, exact: true}).first();
        if (!(await btn.count())) { record(`${RUN}-${label}-button-absent`, {name, actions: (await wfInfo(page)).actionButtons}); log(`[${label}] button "${name}" absent`); return {absent: true}; }
        await loc(page, `workflow action "${name}"`, btn);
        const before = page.url();
        await btn.click(); await idle(page);
        const out = {pressed: name, windows: []};
        for (let i = 0; i < 3 && !isWizard(page); i++) {
            await page.waitForFunction((b) => location.href !== b || [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).length > 1, before, {timeout: 10000}).catch(() => {});
            if (isWizard(page)) break;
            const ds = await dialogTexts(page);
            const top = ds[ds.length - 1];
            if (!top || ds.length < 2) break;
            out.windows.push({name: top.name, text: flat(top.text, 700), buttons: top.buttons, inputs: top.inputs});
            await snap(page, `${label}-window${i + 1}`, {win: out.windows[i]});
            const t = topWin(page);
            if (typeof choice === 'number') { const radios = t.locator('input[type=radio]'); if (await radios.count() > choice) await radios.nth(choice).check({force: true}); }
            const next = t.getByRole('button', {name: /^(Next|Yes, Continue|Continue|OK)$/}).first();
            if (await next.count()) { await next.click(); await idle(page); } else break;
        }
        if (isWizard(page)) await waitWizard(page);
        out.onWizard = isWizard(page);
        return out;
    }
    async function walk(label) {
        const pages = [];
        for (let n = 1; n < 7; n++) {
            const w = await readWizard(`${label}-p${n}`);
            pages.push({n, h1: w.h1, rail: (w.rail || []).map((r) => `${r.text}${r.current ? '*' : ''}`), guidance: (w.headings || []).find((h) => h.tag === 'h2')?.next || null, panels: (w.panels || []).map((p) => ({title: p.title, items: p.items.map((i) => `${i.checked ? '[x]' : '[ ]'} ${i.text.slice(0, 90)}`), text: flat(p.text, 300)})), footer: (w.buttons || []).filter((b) => /^(Cancel|Continue|Previous|Record Decision|Skip this email)$/.test(b.text)).map((b) => b.text)});
            const rec = page.getByRole('button', {name: 'Record Decision', exact: true});
            if (await rec.isVisible().catch(() => false)) break;
            const cont = page.getByRole('button', {name: 'Continue', exact: true}).first();
            if (!(await cont.isVisible().catch(() => false))) break;
            await cont.click(); await idle(page); await page.waitForTimeout(400);
        }
        record(`${RUN}-${label}-pages`, pages);
        return pages;
    }
    async function cancelWizard(label) {
        const cancel = page.getByRole('button', {name: 'Cancel', exact: true}).first();
        if (!(await cancel.count())) return null;
        await cancel.click(); await page.waitForTimeout(600); await idle(page);
        const d = (await dialogTexts(page)).slice(-1)[0];
        const out = {dialog: d ? {name: d.name, text: flat(d.text, 300), buttons: d.buttons} : null};
        const cd = topWin(page).getByRole('button', {name: 'Cancel Decision'}).first();
        if (await cd.count()) { await cd.click(); await idle(page); await page.waitForTimeout(900); await idle(page); }
        out.landed = page.url().replace(/^https?:\/\/[^/]+/, '');
        record(`${RUN}-${label}-cancel`, out);
        return out;
    }
    async function recordDecision(label) {
        const rec = page.getByRole('button', {name: 'Record Decision', exact: true}).first();
        await rec.click(); await idle(page);
        await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog]')].some((e) => e.getClientRects().length) || document.querySelector('.pkpFieldError'), null, {timeout: 30000}).catch(() => {});
        await page.waitForTimeout(800); await idle(page);
        const d = (await dialogTexts(page)).slice(-1)[0];
        const out = {dialog: d ? {name: d.name, text: flat(d.text, 500), buttons: d.buttons} : null};
        await snap(page, `${label}-recorded`, {out});
        record(`${RUN}-${label}-record`, out);
        return out;
    }

    // ------------------------------------------------------------------ L10 helpers
    const sigEditorId = () => page.evaluate(() => { const e = ((window.tinymce && window.tinymce.get()) || []).find((x) => /^signature/.test(x.id) && /en/.test(x.id)) || ((window.tinymce && window.tinymce.get()) || []).find((x) => /^signature/.test(x.id)); return e ? e.id : null; });
    async function openContact(cp, label) {
        await page.goto(ctxUrl(cp, '/user/profile/contact')); await idle(page);
        await page.locator('form#contactForm').waitFor({timeout: 30000});
        await page.waitForFunction(() => ((window.tinymce && window.tinymce.get()) || []).some((e) => /^signature/.test(e.id) && e.initialized), null, {timeout: 30000}).catch(() => {});
        await idle(page);
        const id = await sigEditorId();
        const sig = id ? await page.evaluate((i) => { const e = window.tinymce.get(i); return {html: e.getContent(), shown: e.getBody().innerText}; }, id) : null;
        const country = await page.locator('form#contactForm select[name="country"]').evaluate((s) => s.options[s.selectedIndex]?.text || '').catch(() => null);
        const s = await snap(page, label, {signatureEditor: id, signature: sig, country});
        log(`[${label}]`, A, 'signature:', JSON.stringify(sig && sig.shown), '| country:', country);
        return {id, sig, country, s};
    }
    async function typeSignature(id, text) {
        const body = page.frameLocator(`#${id}_ifr`).locator('body');
        await body.click();
        await page.keyboard.press('Control+A'); await page.keyboard.press('Delete');
        await page.keyboard.type(text, {delay: 15});
        await page.waitForTimeout(300);
    }
    async function saveContact(label) {
        const country = page.locator('form#contactForm select[name="country"]');
        if (!(await country.inputValue().catch(() => ''))) await country.selectOption({label: 'Canada'});
        const saved = page.waitForResponse((r) => r.request().method() === 'POST' && /profile-tab\/save-/.test(r.url()), {timeout: 30000}).catch(() => null);
        const btn = page.locator('form#contactForm').getByRole('button', {name: 'Save', exact: true});
        await loc(page, 'Profile › Contact "Save"', btn);
        await btn.click();
        const r = await saved;
        await idle(page); await page.waitForTimeout(500);
        const errs = await page.locator('form#contactForm label.error:visible, form#contactForm .pkp_form_error:visible').allInnerTexts().catch(() => []);
        const s = await snap(page, `${label}-saved`, {status: r && r.status(), errors: errs});
        log(`[${label} saved]`, A, r && r.status(), '| notices:', JSON.stringify(s.notices), '| errors:', JSON.stringify(errs));
        // the same page right after the save
        const id = await sigEditorId();
        const now = id ? await page.evaluate((i) => window.tinymce.get(i).getBody().innerText, id).catch(() => null) : null;
        return {status: r && r.status(), notices: s.notices, errors: errs, samePage: now};
    }
    async function readDecline(cp, S, label) {
        await openWorkflow(wf(cp, S.id, isOPS ? 'workflow_5' : 'workflow_1'), `${label}-workflow`);
        const p = await press('Decline Submission', `${label}-decline`);
        if (!p.onWizard) { record(`${RUN}-${label}-no-wizard`, p); return {press: p}; }
        const w = await readWizard(`${label}-notify-authors`);
        const ed = (w.editors || [])[0] || {};
        const c = closing(ed.shown);
        const out = {h1: w.h1, rail: (w.rail || []).map((r) => r.text), subject: w.subject, templates: w.templates, closing: c.tail, kindRegardsCount: c.kindRegardsCount, htmlTail: flat(ed.html, 600), footer: (w.buttons || []).map((b) => b.text).filter((t) => /Cancel|Record|Skip|Continue|Previous/.test(t))};
        record(`${RUN}-${label}-letter`, out);
        log(`[${label} letter]`, A, 'closing:', JSON.stringify(c.tail), '| "Kind regards" lines:', c.kindRegardsCount);
        return out;
    }

    try {
        // ================================================================ L10
        if (on('l10')) await sect('l10', async () => {
            if (!sc.l10) {
                const t = tag(`u34i28${RUN}`);
                const users = [
                    {username: `${t}mgr`, roles: ['manager'], givenName: 'Mira', familyName: 'Manager'},
                    {username: `${t}se`, roles: ['sectionEditor'], givenName: 'Sven', familyName: 'Editorson'},
                    {username: `${t}au`, roles: ['author'], givenName: 'Ava', familyName: 'Author'},
                ];
                await app.api.createContext({tag: t, context: {name: `U34 I28 ${t}`, contactName: `Principal Contact ${t}`, contactEmail: `${t}contact@mail.test`}, users});
                const title = `I28 L10 decline closing ${t}`;
                const s = await app.api.createSubmission({tag: `${t}d1`, context: t, submitter: `${t}au`, title, participants: [{username: `${t}se`, role: 'sectionEditor'}]});
                sc.l10 = {t, S: {id: s.submissionId, title, stageId: s.stageId}};
                save(); record(`${RUN}-l10-seed`, sc.l10);
                log('[l10 seed]', A, t, s.submissionId, 'stage', s.stageId);
            }
            const {t, S} = sc.l10;
            const out = {};
            await as(`${t}se`, t);
            // a) the install default: no signature
            out.a0 = (await openContact(t, 'l10-a-contact')).sig;
            out.a = await readDecline(t, S, 'l10-a');
            out.aCancel = await cancelWizard('l10-a');
            // b) "Kind regards, Sven Editorson"
            let c = await openContact(t, 'l10-b-contact-before');
            await typeSignature(c.id, SIG_KR);
            out.bSave = await saveContact('l10-b-contact');
            await page.reload(); await idle(page);
            out.bReload = (await openContact(t, 'l10-b-contact-reload')).sig;
            out.b = await readDecline(t, S, 'l10-b');
            out.bCancel = await cancelWizard('l10-b');
            // the other level: the context's manager (not a participant), signature never set
            if (RUN !== 'r1') {
                await as(`${t}mgr`, t);
                out.mgr = await readDecline(t, S, 'l10-mgr');
                out.mgrCancel = await cancelWizard('l10-mgr');
                await as(`${t}se`, t);
            }
            // c) an unsaved change left by another tab, then the plain signature saved
            c = await openContact(t, 'l10-c-contact-before');
            await typeSignature(c.id, 'Unsaved draft signature');
            const phone = page.locator('form#contactForm input[name="phone"]');
            if (RUN === 'r1') await page.locator('form#contactForm select[name="country"]').focus().catch(() => {});
            else { await loc(page, 'Profile › Contact "Phone"', phone); await phone.click(); await page.waitForTimeout(300); }
            const n0 = dialogsSeen.length;
            await page.locator('#profileTabs > ul > li > a[name="identity"]').click();
            await page.waitForTimeout(1500); await idle(page);
            out.cLeave = {dialogs: dialogsSeen.slice(n0), identityShown: await page.locator('form#identityForm').isVisible().catch(() => false)};
            await snap(page, 'l10-c-left-unsaved', {leave: out.cLeave});
            out.cAfterLeave = (await openContact(t, 'l10-c-contact-after-leave')).sig;
            if (RUN !== 'r1') {
                // the control: an unsaved Phone change left by the same tab press
                await phone.click(); await page.keyboard.type('555 0100'); await page.locator('form#contactForm select[name="country"]').focus();
                const n1 = dialogsSeen.length;
                await page.locator('#profileTabs > ul > li > a[name="identity"]').click();
                await page.waitForTimeout(1500); await idle(page);
                out.cLeavePhone = {dialogs: dialogsSeen.slice(n1), identityShown: await page.locator('form#identityForm').isVisible().catch(() => false)};
                await snap(page, 'l10-c-left-unsaved-phone', {leave: out.cLeavePhone});
                const back = await openContact(t, 'l10-c-contact-after-phone-leave');
                out.cAfterPhoneLeave = {sig: back.sig, phone: await phone.inputValue().catch(() => null)};
                log('[l10 leave]', A, 'signature-only:', JSON.stringify(out.cLeave.dialogs), '| phone:', JSON.stringify(out.cLeavePhone.dialogs), '| after:', JSON.stringify(out.cAfterPhoneLeave));
            }
            c = await openContact(t, 'l10-c-contact-before-plain');
            await typeSignature(c.id, SIG_PLAIN);
            out.cSave = await saveContact('l10-c-contact');
            await page.reload(); await idle(page);
            out.cReload = (await openContact(t, 'l10-c-contact-reload')).sig;
            out.c = await readDecline(t, S, 'l10-c');
            out.cRecord = await recordDecision('l10-c');
            // the author's mail
            try {
                const m = await app.mail.find({to: `${t}au@mail.test`, contains: S.title, timeoutMs: 30000});
                const full = await app.mail.fullMessage(m.ID).catch(() => null);
                const text = (full && full.Text) || '';
                const cl = closing(text);
                out.mail = {subject: m.Subject, closing: cl.tail, kindRegardsCount: cl.kindRegardsCount, htmlTail: flat(full && full.HTML, 800) && String(full.HTML).replace(/\s+/g, ' ').slice(-700)};
            } catch (e) { out.mail = {none: true, error: flat(e.message, 200)}; }
            log('[l10 mail]', A, JSON.stringify(out.mail).slice(0, 400));
            out.dialogs = dialogsSeen;
            record(`${RUN}-l10-summary`, out);
            if (RUN === 'r1') note(`ccI28 [${A}] · Profile › Contact "Signature": the TinyMCE editor id starts "signature" (form#contactForm); type into its iframe body (\`#<id>_ifr\` body, Control+A, Delete, type); a scenario-seeded user has no Country, choose one before "Save" or the save is refused. Leaving the tab by another tab with a typed, unsaved signature: see the run's dialogs (kit accepts).`);
        });

        // ================================================================ L148 (OMP)
        if (on('l148') && isOMP) await sect('l148', async () => {
            if (!sc.l148) {
                const t = tag(`u34i28p${RUN}`);
                const users = [
                    {username: `${t}ed`, roles: ['editor'], givenName: 'Eve', familyName: 'Presseditor'},
                    {username: `${t}au`, roles: ['author'], givenName: 'Alex', familyName: 'Authorson'},
                    {username: `${t}ri1`, roles: ['internalReviewer'], givenName: 'Ian', familyName: 'Internalone'},
                    {username: `${t}rv1`, roles: ['externalReviewer'], givenName: 'Rita', familyName: 'Externalrev'},
                ];
                await app.api.createContext({tag: t, context: {contactName: `Principal Contact ${t}`, contactEmail: `${t}contact@mail.test`}, users});
                sc.l148 = {t};
                const seed = async (key, body) => {
                    const full = {tag: `${t}${key.toLowerCase()}`, context: t, submitter: `${t}au`, title: `I28 ${key} ${t}`, participants: [{username: `${t}ed`, role: 'editor'}], ...body};
                    const s = await app.api.createSubmission(full);
                    sc.l148[key] = {id: s.submissionId, stageId: s.stageId, rounds: s.reviewRounds, title: full.title};
                    log(`[l148 seed] ${key} #${s.submissionId} stage ${s.stageId} rounds ${JSON.stringify(s.reviewRounds)}`);
                    save();
                };
                await seed('IR', {decisions: ['sendInternalReview'], reviewRounds: [{stage: 'internal', files: [{file: 'article.pdf'}], reviewers: [{username: `${t}ri1`, status: 'completed'}]}]});
                await seed('ER', {decisions: ['skipInternalReview'], reviewRounds: [{stage: 'external', files: [{file: 'article.pdf'}], reviewers: [{username: `${t}rv1`, status: 'completed'}]}]});
                record(`${RUN}-l148-seed`, sc.l148);
            }
            const t = sc.l148.t;
            const out = {};
            async function finishUpload(fileName, label) {
                const w = uploadWiz(page);
                await w.locator('input[type="file"]').waitFor({state: 'attached', timeout: 30000});
                await idle(page);
                const g = w.locator('select[id^="genreId"]');
                await snap(page, `${label}-upload-step1`);
                if (await g.count()) await g.selectOption({label: 'Book Manuscript'}).catch(() => {});
                await w.locator('input[type="file"]').setInputFiles(pdfNamed(fileName));
                const cont = w.getByRole('button', {name: 'Continue', exact: true});
                for (let i = 0; i < 100 && !(await cont.isEnabled().catch(() => false)); i++) await page.waitForTimeout(200);
                await cont.click(); await idle(page);
                await page.waitForTimeout(800);
                await cont.click(); await idle(page);
                await w.getByRole('button', {name: 'Complete', exact: true}).waitFor({timeout: 30000}).catch(() => {});
                await w.getByRole('button', {name: 'Complete', exact: true}).click();
                await w.waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
                await idle(page); await page.waitForTimeout(600); await idle(page);
            }
            async function authorUpload(S, fileName, label) {
                await as(`${t}au`, t);
                await openWorkflow(authorWf(t, S.id, rkey(S)), `${label}-au-round`);
                const btn = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Upload revisions', exact: true});
                await loc(page, 'author review round "Upload revisions"', btn);
                if (!(await btn.count())) { log(`[${label}] no Upload revisions`); return false; }
                await btn.click();
                await finishUpload(fileName, `${label}-au`);
                const after = await openWorkflow(authorWf(t, S.id, rkey(S)), `${label}-au-round-after-upload`);
                await page.reload(); await idle(page);
                await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000}).catch(() => {});
                await idle(page); await page.waitForTimeout(500);
                const reload = await wfInfo(page).catch(() => ({}));
                await snap(page, `${label}-au-round-after-upload-reload`, {info: reload});
                return {after: (after.tables || []).find((x) => /Revisions/.test(x.name || '')), reload: (reload.tables || []).find((x) => /Revisions/.test(x.name || ''))};
            }
            const lastPanels = (pages) => (pages.length ? pages[pages.length - 1] : {});
            for (const [key, choice] of [['IR', undefined], ['ER', 0]]) {
                const S = sc.l148[key]; const o = {};
                const k = key.toLowerCase();
                await as(`${t}ed`, t);
                o.before = await openWorkflow(wf(t, S.id, rkey(S)), `l148-${k}-ed-before`);
                if (!S.requested) {
                    const p = await press('Request Revisions', `l148-${k}-request`, {choice});
                    o.requestWindows = p.windows;
                    if (!p.onWizard) throw new Error(`${key}: Request Revisions did not open the wizard`);
                    await walk(`l148-${k}-request`);
                    o.requestRecord = await recordDecision(`l148-${k}-request`);
                    S.requested = true; save();
                }
                if (!S.uploaded) { o.upload = await authorUpload(S, `i28-${k}-revision-${RUN}.pdf`, `l148-${k}`); S.uploaded = !!o.upload; save(); }
                await as(`${t}ed`, t);
                const decisions = key === 'IR' ? ['Accept Submission', 'Create New Review Round', 'Send to External Review'] : ['Accept Submission', 'Create New Review Round'];
                o.revised = await openWorkflow(wf(t, S.id, rkey(S)), `l148-${k}-ed-revised`);
                o.decisions = {};
                for (const d of decisions) {
                    const dk = d.toLowerCase().replace(/[^a-z]+/g, '-');
                    await openWorkflow(wf(t, S.id, rkey(S)), `l148-${k}-${dk}-open`);
                    const p = await press(d, `l148-${k}-${dk}`);
                    if (!p.onWizard) { o.decisions[d] = {press: p}; continue; }
                    const pages = await walk(`l148-${k}-${dk}`);
                    o.decisions[d] = {pages: pages.map((x) => `${x.h1} [${x.rail.join(' · ')}]`), selectFiles: lastPanels(pages).panels, guidance: lastPanels(pages).guidance};
                    o.decisions[d].cancel = await cancelWizard(`l148-${k}-${dk}`);
                }
                out[key] = o;
                log(`[l148 ${key}]`, JSON.stringify(Object.fromEntries(Object.entries(o.decisions).map(([d, v]) => [d, (v.selectFiles || []).map((p) => `${p.title}: ${p.items.join(', ') || flat(p.text, 80)}`)]))).slice(0, 900));
            }
            out.dialogs = dialogsSeen;
            record(`${RUN}-l148-summary`, out);
        });

        // ================================================================ leave (OMP): the stepped wizard left with a change unsaved
        // On IR (still on its internal round: every decision above was cancelled): "Accept Submission", a word typed
        // into the letter, "Continue" to "Select Files", then "Cancel" › "Cancel Decision"; reopened: the letter.
        // Then the same typed word left by the breadcrumb's "Dashboard"; reopened: the letter.
        if (on('leave') && isOMP && sc.l148 && sc.l148.IR) await sect('leave', async () => {
            const t = sc.l148.t; const S = sc.l148.IR; const out = {};
            const letter = () => page.evaluate(() => { const e = ((window.tinymce && window.tinymce.get()) || []).find((x) => { try { const c = x.getContainer(); return c && c.getClientRects().length; } catch (_) { return false; } }); return e ? {id: e.id, shown: e.getBody().innerText.slice(0, 200)} : null; });
            const typeWord = async (word) => { const l = await letter(); await page.frameLocator(`#${l.id}_ifr`).locator('body').click(); await page.keyboard.press('Control+Home'); await page.keyboard.type(`${word} `, {delay: 15}); await page.waitForTimeout(300); };
            await as(`${t}ed`, t);
            for (const via of ['cancel', 'breadcrumb']) {
                const word = `Unsaved${via}${RUN}`;
                await openWorkflow(wf(t, S.id, rkey(S)), `leave-${via}-open`);
                const p = await press('Accept Submission', `leave-${via}-accept`);
                if (!p.onWizard) { out[via] = {press: p}; continue; }
                await readWizard(`leave-${via}-p1`);
                await typeWord(word);
                const typed = await letter();
                await page.getByRole('button', {name: 'Continue', exact: true}).first().click(); await idle(page); await page.waitForTimeout(400);
                await readWizard(`leave-${via}-p2`);
                const n0 = dialogsSeen.length;
                let exit;
                if (via === 'cancel') exit = await cancelWizard(`leave-${via}`);
                else {
                    const crumb = page.locator('nav[aria-label*="readcrumb"], .pkpBreadcrumbs, [class*="breadcrumb"]').getByRole('link', {name: 'Dashboard'}).first();
                    await loc(page, 'wizard breadcrumb "Dashboard"', crumb);
                    await crumb.click(); await page.waitForTimeout(1500); await idle(page);
                    exit = {landed: page.url().replace(/^https?:\/\/[^/]+/, '')};
                    await snap(page, `leave-${via}-landed`, {exit});
                }
                exit.browserDialogs = dialogsSeen.slice(n0);
                await openWorkflow(wf(t, S.id, rkey(S)), `leave-${via}-reopen`);
                const p2 = await press('Accept Submission', `leave-${via}-accept-again`);
                const back = p2.onWizard ? await readWizard(`leave-${via}-reopened-p1`) : null;
                const again = p2.onWizard ? await letter() : null;
                out[via] = {typedFirstLine: typed && typed.shown.split('\n')[0], exit, reopenedFirstLine: again && again.shown.split('\n')[0], wordKept: !!(again && again.shown.includes(word)), rail: back && (back.rail || []).map((r) => r.text)};
                if (p2.onWizard) await cancelWizard(`leave-${via}-again`);
                log(`[leave ${via}]`, JSON.stringify(out[via]).slice(0, 600));
            }
            record(`${RUN}-leave-summary`, out);
        });
    } finally {
        await close();
    }
});
