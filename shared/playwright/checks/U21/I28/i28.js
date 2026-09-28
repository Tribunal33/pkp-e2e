// U21 claim check, housekeeping chunk I28 (2026-09-28): the incidental rows for the submission wizard.
//   role    (L58a/b/c)  OJS, OMP, OPS (control): a user with an editorial role and Author starts on "Make a
//                       Submission", reads "Submit As" (preselection), picks the editorial role and submits; a
//                       second pick of Author as the control. Mailpit (submitter, both managers, admin) and the
//                       Participants panel after the submit.
//   pre     (L79)       OJS, OMP, OPS (a Moderator seeded): the Author submits a draft that already has a Section/Series editor
//                       (seeded participant), and a control draft with none. Mailpit for the managers and admin.
//   rail    (L86)       three apps: a return visit to "Details", the Title (and the References box) changed, the step
//                       rail to "Review" and "Submit" at once (0 s, 1.5 s, no settle read); control: "Continue" (RAIL_VARIANTS narrows).
//   leave   (L159)      three apps: the Title changed on "Details" and another address opened within seconds; then
//                       back to the wizard (dialog? text?) and a reload; control: the rail to "Upload Files".
//   galley  (L97)       OPS: a saved draft with a galley, reopened; "Add File" › label › "Save" (window, console);
//                       controls: the first galley of a fresh draft, and a second one in the same visit.
//   pls     (L114)      OJS, OPS: a plain language summary over a 10-word section limit on "Details", left to the
//                       autosave; footer, the save's answer, Review, console. Control: at the limit.
//   license (L151)      OPS: "Edit" on the Review step's "License", "Relation status" and "For Readers" panels.
//   mgrau   (Fields "Submit As", read only) three apps: the start form of a manager + Author and of a pure Section editor.
//   galleyrev (sweep)   OPS: the Review "Files" panel in the upload's own visit and after a reload.
//
//   PROBE_FEATURE=U21 PROBE_AGENT=ccI28 RUN=r1 node bin/probe.js all shared/playwright/checks/U21/I28/i28.js
//   PHASES=role,mgrau,pre,rail,leave,galley,galleyrev,pls,license (default all; each phase applies only to the apps named above)
//   RUN names the run (r1, r2, …): every snapshot and fact file carries it, and each run seeds its own scratch
//   contexts (tag prefix u21i28), so two runs of a phase never share data. publicknowledge is never touched.
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');
const {waitForEditorReady} = require('../../../support/richtext.js');

const ALL = ['role', 'mgrau', 'pre', 'rail', 'leave', 'galley', 'galleyrev', 'pls', 'license'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const RUN = process.env.RUN || 'r1';
const on = (p) => PHASES.includes(p);
const T = 30_000;
const log = (...a) => console.log(`[i28 ${RUN}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const endAnchored = (name) => new RegExp(`${esc(name)}\\s*$`);
const REPO = path.resolve(__dirname, '../../../../..');
const FIX = {
    ojs: path.join(REPO, 'apps/ojs/playwright/fixtures/files/article.pdf'),
    omp: path.join(REPO, 'apps/omp/playwright/fixtures/files/article.pdf'),
    ops: path.join(REPO, 'apps/ops/playwright/fixtures/files/preprint.pdf'),
};
const RELATION_NONE = 'This preprint has not been published elsewhere.';

async function sect(name, fn) {
    try { return await fn(); } catch (e) {
        log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 5).join(' | '));
        record(`${RUN}-${name}-FAILED`, {error: String(e.stack || e).slice(0, 2000)});
        return null;
    }
}

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const L = {
        edRole: isOMP ? /Series editor/ : isOPS ? /Moderator/ : /Section editor/,
        editorsStep: isOPS ? 'For Readers' : 'For the Editors',
    };
    const fact = (name, data) => record(`${RUN}-facts-${name}`, data, {merge: true});

    const {page, close} = await launch(app);
    // ------------------------------------------------------------------ traffic, console, dialogs
    const traffic = [];
    const errs = [];
    const dialogs = [];
    page.on('response', async (r) => {
        const u = r.url();
        if (!/\/api\/v1\//.test(u) || /_test\//.test(u)) return;
        const m = r.request().method();
        const e = {at: Date.now(), m, override: r.request().headers()['x-http-method-override'] || null,
            url: u.replace(/^https?:\/\/[^/]+/, '').split('?')[0], status: r.status()};
        if (m !== 'GET') e.body = await r.text().then((b) => b.slice(0, 500)).catch(() => null);
        if (m !== 'GET') e.sent = flat(r.request().postData(), 400);
        traffic.push(e);
    });
    page.on('pageerror', (e) => errs.push({at: Date.now(), type: 'pageerror', text: flat(e.message, 300), url: page.url()}));
    page.on('console', (m) => { if (m.type() === 'error') errs.push({at: Date.now(), type: 'console', text: flat(m.text(), 300), url: page.url()}); });
    page.on('dialog', async (d) => {
        dialogs.push({at: Date.now(), type: d.type(), message: flat(d.message(), 300), url: page.url()});
        if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    const writesSince = (t0) => traffic.filter((x) => x.at >= t0 && x.m !== 'GET').map((x) => ({op: x.override || x.m, url: x.url, status: x.status, body: x.body, sent: x.sent}));
    const errsSince = (t0) => errs.filter((x) => x.at >= t0);
    const dialogsSince = (t0) => dialogs.filter((x) => x.at >= t0);

    async function snap(name, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 300), text: {}}; }
        if (extra) s.facts = extra;
        record(`${RUN}-${name}`, s);
        await shot(page, `${RUN}-${name}`).catch(() => {});
        return s;
    }
    const as = async (user, ctx) => { await signIn(page, user, {contextPath: ctx}); await idle(page).catch(() => {}); };

    // ------------------------------------------------------------------ wizard helpers
    const cur = () => page.locator('.pkpSteps__step__label--current');
    const curText = async () => flat(await cur().innerText().catch(() => ''), 80);
    const footer = () => page.locator('.submissionWizard__footer');
    const footerText = async () => flat(await footer().innerText().catch(() => null), 200);
    const lastSaved = async () => flat(await page.locator('.submissionWizard__lastSaved').innerText().catch(() => null), 120);
    async function gotoWizard(ctx, id) {
        await page.goto(app.url(`/index.php/${ctx}/submission?id=${id}`));
        await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: T});
        await page.locator('.pkpSteps').waitFor({timeout: T});
        await idle(page);
    }
    const continueState = async () => {
        const b = footer().getByRole('button', {name: 'Continue', exact: true});
        const o = {count: await b.count()};
        if (o.count) {
            o.visible = await b.first().isVisible().catch(() => null);
            o.disabled = await b.first().isDisabled().catch(() => null);
            o.atPoint = await b.first().evaluate((el) => {
                const r = el.getBoundingClientRect();
                const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
                return {rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], top: top ? `${top.tagName}.${top.className}`.slice(0, 120) : null, same: top === el || el.contains(top)};
            }).catch((e) => String(e.message).slice(0, 120));
        }
        o.footerButtons = await footer().locator('button').evaluateAll((els) => els.map((e) => `${e.innerText.trim()}${e.disabled ? '[disabled]' : ''}`)).catch(() => null);
        return o;
    };
    async function continueTo(label) {
        const button = footer().getByRole('button', {name: 'Continue', exact: true});
        for (let attempt = 0; ; attempt++) {
            try { await button.click({timeout: 10000}); } catch (e) {
                const st = await continueState();
                record(`${RUN}-continue-stuck-${Date.now()}`, {label, state: st, step: await curText(), footer: await footerText(), error: flat(e.message, 300)});
                throw new Error(`Continue not pressable toward ${label}: ${JSON.stringify(st)}`);
            }
            try { await cur().filter({hasText: endAnchored(label)}).waitFor({timeout: 8000}); await idle(page); return; } catch (e) { if (attempt >= 2) throw e; }
        }
    }
    async function railTo(label) {
        for (let attempt = 0; attempt < 3; attempt++) {
            if (await page.locator('.pkpSteps--collapsed').count()) await page.locator('.pkpSteps__controls button').click().catch(() => {});
            await page.locator('button.pkpSteps__step__label').filter({hasText: endAnchored(label)}).first().click();
            try { await cur().filter({hasText: endAnchored(label)}).waitFor({timeout: 5000}); return; } catch (e) { if (attempt === 2) throw e; }
        }
    }
    async function typeRich(id, text) {
        await page.locator(`#${id}_ifr`).waitFor({state: 'visible', timeout: T});
        await waitForEditorReady(page, id);
        await page.frameLocator(`#${id}_ifr`).locator('body').click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Delete');
        if (text) await page.keyboard.type(text);
    }
    const richValue = (id) => page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent({format: 'text'}) : null), id).catch(() => null);
    async function ensureAbstract(text) {
        const id = 'titleAbstract-abstract-control-en';
        if (!(await page.locator(`#${id}_ifr`).count())) return 'no abstract box';
        await waitForEditorReady(page, id).catch(() => {});
        const v = flat(await richValue(id), 200);
        if (v) return 'kept';
        await typeRich(id, text);
        return 'typed';
    }
    async function answerRelation() {
        if (!isOPS) return null;
        const r = page.getByRole('radio', {name: RELATION_NONE, exact: true});
        if (!(await r.count())) return 'no radio';
        if (await r.isChecked()) return 'already';
        await r.check();
        await sleep(300);
        return 'checked';
    }
    // From wherever the wizard stands, "Continue" to Review (abstract filled on Details, the relation answered on OPS).
    async function continueToReview(abstractText) {
        const out = {path: []};
        for (let i = 0; i < 8; i++) {
            const c = await curText();
            out.path.push(c);
            if (/Review\s*$/.test(c)) break;
            if (/Details\s*$/.test(c)) out.abstract = await ensureAbstract(abstractText);
            if (/For Readers\s*$/.test(c)) out.relation = await answerRelation();
            const next = await nextStepName();
            await continueTo(next);
        }
        await page.locator('.submissionWizard__loadingReview').waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await idle(page);
        return out;
    }
    async function nextStepName() {
        const labels = (await page.locator('.pkpSteps__step__label').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ').trim());
        const c = await curText();
        const i = labels.findIndex((l) => l === c);
        return labels[i + 1].replace(/^\d+\s*/, '');
    }
    async function uploadOnScreen(label = 'PDF') {
        if (isOJS) {
            const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', {name: 'Add File', exact: true}).click()]);
            await chooser.setFiles(FIX.ojs);
            await page.getByRole('button', {name: 'Article Text', exact: true}).click();
            await page.locator('.listPanel__item--submissionFile').filter({hasText: 'article.pdf'}).getByText('Article Text').waitFor({timeout: T});
        } else if (isOMP) {
            await page.locator('.submissionFilesListPanel input[type="file"]').setInputFiles(FIX.omp);
            const g = page.locator('.listPanel--submissionFiles__setGenre').getByRole('button', {name: 'Book Manuscript', exact: true});
            await g.waitFor({timeout: T});
            await g.click();
            await page.locator('.listPanel--submissionFiles__itemGenre').filter({hasText: 'Book Manuscript'}).first().waitFor({timeout: T});
        } else {
            const o = await opsAddGalley(label, 'upload');
            if (!o.uploaded) throw new Error(`OPS galley upload failed: ${JSON.stringify(o).slice(0, 400)}`);
        }
        await idle(page);
    }
    // OPS "Upload Files": "Add File" › label › "Save", then the upload window. mode 'read' stops at the window.
    const galleyForm = () => page.getByRole('dialog').filter({has: page.locator('#preprintGalleyForm')}).last();
    const uploadWin = () => page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
    const galleyRows = () => page.locator('[id^="component-grid-preprintgalleys"] tr.gridRow').allInnerTexts().then((x) => x.map((y) => flat(y, 120))).catch(() => []);
    async function readUploadWin() {
        const w = uploadWin();
        if (!(await w.isVisible().catch(() => false))) return {open: false};
        return w.evaluate((d) => {
            const v = (e) => e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
            const f = (x) => (x || '').replace(/\s+/g, ' ').trim();
            const lab = d.getAttribute('aria-labelledby');
            const btns = [...d.querySelectorAll('button, a, input[type=submit]')].filter(v).map((b) => `${f(b.innerText || b.value || b.getAttribute('aria-label'))}${b.disabled || b.getAttribute('aria-disabled') === 'true' || b.classList.contains('ui-state-disabled') ? '[disabled]' : ''}`).filter((x) => x && x !== '[disabled]');
            return {open: true, title: d.getAttribute('aria-label') || (lab && document.getElementById(lab) ? f(document.getElementById(lab).innerText) : null),
                tabs: [...d.querySelectorAll('[role=tab]')].filter(v).map((t) => `${f(t.innerText)}${t.getAttribute('aria-selected') === 'true' ? '*' : ''}`),
                genre: [...d.querySelectorAll('select')].filter(v).map((s) => ({name: s.name, options: [...s.options].map((o) => f(o.text))})),
                fileInput: d.querySelectorAll('input[type=file]').length,
                dropText: /Drag and drop/i.test(d.innerText), uploadFileText: /Upload File/.test(d.innerText),
                buttons: [...new Set(btns)].slice(0, 20), text: f(d.innerText).slice(0, 900)};
        }).catch((e) => ({error: flat(e.message, 200)}));
    }
    async function visibleState() {
        const w = uploadWin();
        return {
            open: await w.isVisible().catch(() => false),
            dropArea: await w.getByText(/Drag and drop a file here/).first().isVisible().catch(() => false),
            uploadFileButton: await w.getByRole('button', {name: 'Upload File', exact: true}).or(w.getByRole('link', {name: 'Upload File', exact: true})).first().isVisible().catch(() => false),
            componentList: await w.locator('select[name="genreId"]').first().isVisible().catch(() => false),
            continueDisabled: await w.getByRole('button', {name: 'Continue', exact: true}).first().isDisabled().catch(() => null),
        };
    }
    async function opsAddGalley(label, mode, snapName) {
        const o = {};
        const t0 = Date.now();
        for (let attempt = 0; ; attempt++) {
            await page.getByRole('link', {name: 'Add File', exact: true}).first().click();
            try { await galleyForm().locator('input[name="label"]').waitFor({timeout: 8000}); break; } catch (e) { if (attempt >= 2) throw e; }
        }
        await idle(page);
        if (snapName) await snap(`${snapName}-label-window`);
        await galleyForm().locator('input[name="label"]').fill(label);
        await galleyForm().getByRole('button', {name: 'Save', exact: true}).last().click();
        await uploadWin().waitFor({state: 'visible', timeout: T}).catch(() => {});
        // bounded: after the page script fails here (L97) jQuery never goes idle
        await Promise.race([idle(page).catch(() => {}), sleep(10000)]);
        await uploadWin().locator('select[name="genreId"]').first().waitFor({timeout: 15000}).catch(() => {});
        await sleep(2500);
        o.window = await readUploadWin();
        o.visible = await visibleState();
        o.errors = errsSince(t0);
        if (snapName) await snap(`${snapName}-upload-window`, o);
        if (mode === 'read') return o;
        const w = uploadWin();
        await w.locator('select[name="genreId"]').first().selectOption({label: 'Preprint Text'}).catch((e) => { o.selectError = flat(e.message, 200); });
        await sleep(1500);
        o.visibleAfterComponent = await visibleState();
        if (snapName) await snap(`${snapName}-component-chosen`, {visible: o.visibleAfterComponent});
        const input = w.locator('input[type="file"]');
        o.fileInputs = await input.count();
        if (!o.fileInputs) { o.uploaded = false; o.errorsAll = errsSince(t0); return o; }
        await input.first().setInputFiles(FIX.ops).catch((e) => { o.setFilesError = flat(e.message, 200); });
        const cont = () => w.getByRole('button', {name: 'Continue', exact: true}).first();
        // sample the window for twenty seconds after the file is chosen
        o.samples = [];
        for (let i = 0; i < 10; i++) {
            await sleep(2000);
            const st = await visibleState();
            st.uploadArea = flat(await w.locator('.pkp_uploader_container, [id^="plupload"], .pkpUploaderDropZone, .pkp_controllers_fileUpload').first().innerText().catch(() => null), 200);
            o.samples.push(st);
            if (st.continueDisabled === false) break;
        }
        o.continueEnabled = o.samples.length ? o.samples[o.samples.length - 1].continueDisabled === false : false;
        if (snapName) await snap(`${snapName}-file-set`, {samples: o.samples});
        const pressWhenEnabled = async (btn, what) => {
            for (let i = 0; i < 40; i++) { if (await btn.isEnabled().catch(() => false)) break; await sleep(500); }
            try { await btn.click({timeout: 5000}); return true; } catch (e) { o.stuckAt = what; o.stuckError = flat(e.message, 300); return false; }
        };
        const ok = o.continueEnabled && await pressWhenEnabled(cont(), 'step 1 Continue')
            && await w.getByRole('tab', {name: '2. Review Details'}).waitFor({timeout: T}).then(() => true).catch(() => false)
            && await pressWhenEnabled(cont(), 'step 2 Continue')
            && await w.getByRole('tab', {name: '3. Confirm'}).waitFor({timeout: T}).then(() => true).catch(() => false)
            && await pressWhenEnabled(w.getByRole('button', {name: 'Complete', exact: true}).first(), 'Complete');
        if (!ok) {
            o.uploaded = false;
            o.visibleAtStop = await visibleState();
            o.errorsAll = errsSince(t0);
            if (snapName) await snap(`${snapName}-stopped`, {stuckAt: o.stuckAt, visible: o.visibleAtStop});
            return o;
        }
        await w.waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await Promise.race([idle(page).catch(() => {}), sleep(10000)]); await sleep(800);
        o.uploaded = true;
        o.rows = await galleyRows();
        o.errorsAll = errsSince(t0);
        return o;
    }
    async function closeUploadWin() {
        const w = uploadWin();
        if (!(await w.isVisible().catch(() => false))) return;
        await w.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await w.waitFor({state: 'hidden', timeout: 10000}).catch(() => {});
        await sleep(800);
    }
    async function submitNow() {
        const o = {};
        const submit = footer().getByRole('button', {name: 'Submit', exact: true});
        o.button = {count: await submit.count(), disabled: (await submit.count()) ? await submit.isDisabled() : null};
        if (!o.button.count || o.button.disabled) return o;
        const t0 = Date.now();
        await submit.click();
        const confirm = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Submit', exact: true})}).last();
        if (await confirm.waitFor({state: 'visible', timeout: 10000}).then(() => true).catch(() => false)) {
            o.confirmText = flat(await confirm.innerText().catch(() => null), 500);
            await confirm.getByRole('button', {name: 'Submit', exact: true}).click();
        }
        o.completed = await page.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: 45000}).then(() => true).catch(() => false);
        await idle(page).catch(() => {});
        o.ms = Date.now() - t0;
        o.writes = writesSince(t0);
        return o;
    }
    // Start page → Begin Submission; role: a RegExp for the "Submit As" label to pick (null: leave as offered).
    async function startSubmission(ctx, title, role, name) {
        const out = {};
        await page.goto(app.url(`/index.php/${ctx}/submission`));
        await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: T});
        await idle(page);
        out.radios = await page.getByRole('radio').evaluateAll((els) => els.map((e) => ({name: e.name, value: e.value, label: (e.labels && e.labels[0] ? e.labels[0].innerText : '').replace(/\s+/g, ' ').trim(), checked: e.checked})));
        out.legends = (await page.locator('legend').allInnerTexts().catch(() => [])).map((x) => flat(x, 80));
        out.submitAsGroup = flat(await page.locator('fieldset').filter({has: page.locator('input[name="userGroupId"]')}).first().innerText().catch(() => null), 600);
        await snap(`${name}-start`, out);
        await loc(page, 'Make a Submission: "Submit As" radios', page.locator('input[type=radio][name="userGroupId"]'));
        await typeRich('startSubmission-title-control', title);
        for (const box of [page.getByRole('checkbox', {name: /meets all of these requirements/}), page.getByRole('checkbox', {name: /agree to have my data collected/})]) {
            if (await box.count()) await box.check();
        }
        if (role) {
            const r = out.radios.find((x) => x.name === 'userGroupId' && role.test(x.label));
            out.picked = r ? r.label : null;
            if (r) await page.locator(`input[type=radio][name="userGroupId"][value="${r.value}"]`).check();
        }
        const groups = {};
        for (const r of out.radios) (groups[r.name] ||= []).push(r);
        for (const [g, list] of Object.entries(groups)) {
            if (g !== 'userGroupId' && !list.some((r) => r.checked)) await page.locator(`input[type=radio][name="${g}"]`).first().check();
        }
        await snap(`${name}-start-filled`, {picked: out.picked});
        out.titleTyped = flat(await richValue('startSubmission-title-control'), 200);
        const tb = Date.now();
        await page.getByRole('button', {name: 'Begin Submission'}).click();
        const landed = await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45000}).then(() => true).catch(() => false);
        if (!landed) {
            await idle(page).catch(() => {});
            out.refused = {writes: writesSince(tb), fieldErrors: await page.locator('.pkpFieldError:visible').allInnerTexts().catch(() => []), errors: errsSince(tb)};
            await snap(`${name}-start-refused`, out.refused);
            return out;
        }
        out.submissionId = Number(new URL(page.url()).searchParams.get('id'));
        await page.locator('.pkpSteps').waitFor({timeout: T});
        await idle(page);
        return out;
    }
    // The workflow: participants and header, as the signed-in user.
    const wf = () => page.locator('[role="dialog"]:visible').first();
    async function openWorkflow(ctx, id, author) {
        await page.goto(app.url(`/index.php/${ctx}/dashboard/${author ? 'mySubmissions' : 'editorial'}?workflowSubmissionId=${id}`));
        await idle(page);
        await wf().waitFor({timeout: T}).catch(() => {});
        await wf().getByRole('heading').first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(800);
    }
    const participantsRead = () => page.evaluate(() => {
        const vis = (e) => e.getClientRects().length > 0;
        const dlg = [...document.querySelectorAll('[role=dialog]')].filter(vis)[0] || document.body;
        const h = [...dlg.querySelectorAll('h1,h2,h3,h4')].filter(vis).find((x) => /^participants$/i.test(x.textContent.trim()));
        if (!h) return {present: false};
        let box = h.parentElement;
        for (let i = 0; i < 4 && box && !box.querySelector('ul, [role=list]'); i++) box = box.parentElement;
        const items = box ? [...box.querySelectorAll('li')].filter(vis).map((li) => li.innerText.split('\n').map((s) => s.trim()).filter(Boolean).join(' / ')) : [];
        return {present: true, items};
    }).catch((e) => ({error: String(e.message).slice(0, 200)}));
    const headerRead = async () => flat(await wf().locator('h1, h2').first().innerText().catch(() => null), 300);
    // Mailpit: every message to a recipient (unique throwaway address) or, for a shared address, carrying a marker.
    async function mailTo(to, contains) {
        const r = await app.mail._search({to, contains}).catch((e) => ({error: String(e.message)}));
        return (r.messages || []).map((m) => ({subject: m.Subject, from: m.From && m.From.Address, to: (m.To || []).map((x) => x.Address), cc: (m.Cc || []).map((x) => x.Address), bcc: (m.Bcc || []).map((x) => x.Address), created: m.Created}));
    }
    async function mailWait(to, contains, ms = 30000) {
        return app.mail.find({to, contains, timeoutMs: ms}).then(() => true).catch(() => false);
    }

    try {
        // ============================================================== role (L58a/b/c)
        if (on('role')) await sect('role', async () => {
            const out = {};
            const t = tag('u21i28r');
            const U = (k, roles, g, f) => ({username: `${t}${k}`, roles, givenName: g, familyName: f});
            const users = [U('mg', ['manager'], 'Mira', 'Manager'), U('mh', ['manager'], 'Mort', 'Othermanager'),
                U('sa', ['sectionEditor', 'author'], 'Sal', 'Sectionauthor'),
                isOPS ? U('ea', ['manager', 'author'], 'Edna', 'Managerauthor') : U('ea', ['editor', 'author'], 'Edna', 'Editorauthor')];
            const body = {tag: t, context: {name: `U21 I28 role ${t}`, contactName: 'I28 Contact', contactEmail: `${t}contact@mail.test`}, users};
            if (isOJS) body.sections = [{abbrev: 'ART', title: 'Articles'}];
            if (isOPS) body.sections = [{abbrev: 'PRE', title: 'Preprints', path: 'preprints'}];
            const C = await app.api.createContext(body);
            const ctx = C.path || t;
            out.ctx = ctx;
            const cases = [['sa', L.edRole, 'sa-editorial'], ['ea', /^(Journal editor|Press editor|Journal manager|Press manager|Server manager|Preprint Server manager)/i, 'ea-editorial'], ['sa', /^Author$/, 'sa-author']];
            for (const [k, role, key] of cases) {
                const o = {};
                const title = `I28 ${key} ${t}`;
                await as(`${t}${k}`, ctx);
                o.start = await startSubmission(ctx, title, role, `role-${key}`);
                log('role', key, JSON.stringify(o.start.radios.filter((r) => r.name === 'userGroupId')), 'picked', o.start.picked, 'refused', JSON.stringify(o.start.refused || null).slice(0, 800));
                if (o.start.refused) {
                    // the refusal on the start form: once more with the preselected role left alone? No: record and try the offered editorial role only.
                    out[key] = o;
                    fact('role', {[key]: o, ctx});
                    continue;
                }
                await snap(`role-${key}-wizard-first`);
                await uploadOnScreen();
                o.walk = await continueToReview(`Abstract of ${title}.`);
                await snap(`role-${key}-review`);
                o.submit = await submitNow();
                await snap(`role-${key}-complete`, {submit: o.submit});
                // mail: bound the wait on the first manager's needs-editor or the submitter's own mail
                o.bounded = await mailWait(`${t}${k}@mail.test`, null, 30000);
                await sleep(3000);
                o.mail = {
                    submitter: await mailTo(`${t}${k}@mail.test`),
                    mg: await mailTo(`${t}mg@mail.test`, title),
                    mh: await mailTo(`${t}mh@mail.test`, title),
                    admin: await mailTo('admin@mail.test', title),
                };
                // participants: the submitter's own workflow view, then a manager's
                await openWorkflow(ctx, o.start.submissionId, /author/.test(key));
                o.participantsSelf = await participantsRead();
                o.headerSelf = await headerRead();
                await snap(`role-${key}-workflow-self`, {participants: o.participantsSelf});
                if (!o.participantsSelf.present && !/author/.test(key)) {
                    await openWorkflow(ctx, o.start.submissionId, true);
                    o.participantsSelfAuthorView = await participantsRead();
                    await snap(`role-${key}-workflow-self-mysubmissions`, {participants: o.participantsSelfAuthorView});
                }
                await as(`${t}mg`, ctx);
                await openWorkflow(ctx, o.start.submissionId);
                o.participantsMgr = await participantsRead();
                await snap(`role-${key}-workflow-manager`, {participants: o.participantsMgr});
                out[key] = o;
                fact('role', {[key]: o, ctx});
                log('role', key, JSON.stringify({picked: o.start.picked, completed: o.submit.completed, mail: o.mail, pSelf: o.participantsSelf, pMgr: o.participantsMgr}).slice(0, 2000));
            }
            await signOut(page).catch(() => {});
        });

        // ============================================================== mgrau (Fields "Submit As": the manager + Author end, read only)
        if (on('mgrau')) await sect('mgrau', async () => {
            const out = {};
            const t = tag('u21i28m');
            const U = (k, roles, g, f) => ({username: `${t}${k}`, roles, givenName: g, familyName: f});
            const body = {tag: t, context: {name: `U21 I28 mgrau ${t}`, contactName: 'I28 Contact', contactEmail: `${t}contact@mail.test`},
                users: [U('ma', ['manager', 'author'], 'Mo', 'Managerauthor'), U('se', ['sectionEditor'], 'Sid', 'Sectiononly')]};
            if (isOJS) body.sections = [{abbrev: 'ART', title: 'Articles'}];
            if (isOPS) body.sections = [{abbrev: 'PRE', title: 'Preprints', path: 'preprints'}];
            const C = await app.api.createContext(body);
            const ctx = C.path || t;
            out.ctx = ctx;
            for (const k of ['ma', 'se']) {
                await as(`${t}${k}`, ctx);
                await page.goto(app.url(`/index.php/${ctx}/submission`));
                await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: T});
                await idle(page);
                const o = {};
                o.radios = await page.locator('input[type=radio][name="userGroupId"]').evaluateAll((els) => els.map((e) => ({label: (e.labels && e.labels[0] ? e.labels[0].innerText : '').trim(), checked: e.checked})));
                o.submitAsGroup = flat(await page.locator('fieldset').filter({has: page.locator('input[name="userGroupId"]')}).first().innerText().catch(() => null), 600);
                await snap(`mgrau-${k}-start`, o);
                out[k] = o;
            }
            fact('mgrau', out);
            log('mgrau', JSON.stringify(out).slice(0, 1500));
            await signOut(page).catch(() => {});
        });

        // ============================================================== pre (L79)
        if (on('pre')) await sect('pre', async () => {
            const out = {};
            const t = tag('u21i28p');
            const U = (k, roles, g, f) => ({username: `${t}${k}`, roles, givenName: g, familyName: f});
            const users = [U('mg', ['manager'], 'Mira', 'Manager'), U('mh', ['manager'], 'Mort', 'Othermanager'),
                U('au', ['author'], 'Ava', 'Author'), U('se', ['sectionEditor'], 'Sam', 'Section')];
            const body = {tag: t, context: {name: `U21 I28 pre ${t}`, contactName: 'I28 Contact', contactEmail: `${t}contact@mail.test`}, users};
            if (isOJS) body.sections = [{abbrev: 'ART', title: 'Articles'}];
            if (isOPS) body.sections = [{abbrev: 'PRE', title: 'Preprints', path: 'preprints'}];
            const C = await app.api.createContext(body);
            const ctx = C.path || t;
            const fileKey = isOPS ? {galleys: [{label: 'PDF', file: 'preprint.pdf'}]} : {files: [{file: 'article.pdf'}]};
            const D1 = await app.api.createSubmission({tag: `${t}d1`, context: ctx, submitter: `${t}au`, title: `I28 pre with editor ${t}`, submitted: false, ...fileKey,
                participants: [{username: `${t}se`, role: 'sectionEditor'}]});
            const D0 = await app.api.createSubmission({tag: `${t}d0`, context: ctx, submitter: `${t}au`, title: `I28 pre no editor ${t}`, submitted: false, ...fileKey});
            out.ctx = ctx;
            for (const [key, D, title] of [['with-editor', D1, `I28 pre with editor ${t}`], ['no-editor', D0, `I28 pre no editor ${t}`]]) {
                const o = {id: D.submissionId};
                // before: the manager's view of the draft's participants
                await as(`${t}mg`, ctx);
                await openWorkflow(ctx, D.submissionId);
                o.participantsBefore = await participantsRead();
                await snap(`pre-${key}-manager-before`, {participants: o.participantsBefore});
                await as(`${t}au`, ctx);
                await gotoWizard(ctx, D.submissionId);
                await snap(`pre-${key}-wizard`);
                o.walk = await continueToReview(`Abstract of ${title}.`);
                await snap(`pre-${key}-review`);
                o.submit = await submitNow();
                await snap(`pre-${key}-complete`, {submit: o.submit});
                o.bounded = await mailWait(`${t}au@mail.test`, null, 30000);
                await sleep(3000);
                o.mail = {
                    au: await mailTo(`${t}au@mail.test`, title),
                    se: await mailTo(`${t}se@mail.test`, title),
                    seAll: await mailTo(`${t}se@mail.test`),
                    mg: await mailTo(`${t}mg@mail.test`, title),
                    mh: await mailTo(`${t}mh@mail.test`, title),
                    admin: await mailTo('admin@mail.test', title),
                };
                await as(`${t}mg`, ctx);
                await openWorkflow(ctx, D.submissionId);
                o.participantsAfter = await participantsRead();
                await snap(`pre-${key}-manager-after`, {participants: o.participantsAfter});
                out[key] = o;
                fact('pre', {[key]: o, ctx});
                log('pre', key, JSON.stringify({completed: o.submit.completed, mail: o.mail, before: o.participantsBefore, after: o.participantsAfter}).slice(0, 2000));
            }
            await signOut(page).catch(() => {});
        });

        // ============================================================== rail (L86)
        if (on('rail')) await sect('rail', async () => {
            const out = {};
            const t = tag('u21i28g');
            const U = (k, roles, g, f) => ({username: `${t}${k}`, roles, givenName: g, familyName: f});
            const body = {tag: t, context: {name: `U21 I28 rail ${t}`, contactName: 'I28 Contact', contactEmail: `${t}contact@mail.test`},
                users: [U('mg', ['manager'], 'Mira', 'Manager'), U('au', ['author'], 'Ava', 'Author')]};
            if (isOJS) body.sections = [{abbrev: 'ART', title: 'Articles'}];
            if (isOPS) body.sections = [{abbrev: 'PRE', title: 'Preprints', path: 'preprints'}];
            const C = await app.api.createContext(body);
            const ctx = C.path || t;
            out.ctx = ctx;
            const seedDraft = async (k) => {
                const spec = {tag: `${t}${k}`, context: ctx, submitter: `${t}au`, title: `I28 ${k} original ${t}`, submitted: false};
                if (isOPS) {
                    try { return {...(await app.api.createSubmission({...spec, galleys: [{label: 'PDF', file: 'preprint.pdf'}]})), seededGalley: true}; } catch (e) {
                        out.opsDraftGalleySeed = flat(e.message, 400);
                        return {...(await app.api.createSubmission(spec)), seededGalley: false};
                    }
                }
                return app.api.createSubmission({...spec, files: [{file: 'article.pdf'}]});
            };
            // variants: rail-title (L86 exact), cont-title (control: Continue), rail-refs (the References box, rail)
            const VARIANTS = (process.env.RAIL_VARIANTS || 'rail-title-now,rail-title,cont-title-now,rail-refs-now,rail-refs,rail-refs-fast,rail-title-fast').split(',');
            for (const v of VARIANTS) {
                const pause = /-(now|fast)$/.test(v) ? 0 : 1500;
                const isRefs = /refs/.test(v);
                const o = {};
                const D = await seedDraft(v.replace(/-/g, ''));
                o.id = D.submissionId;
                const changed = `I28 ${v} changed ${t}`;
                const refs = `I28 ${v} reference one ${t}`;
                await as(`${t}au`, ctx);
                await gotoWizard(ctx, D.submissionId);
                if (isOPS && !D.seededGalley && !(await galleyRows()).length) await uploadOnScreen();
                o.first = await continueToReview('Seeded abstract.');
                o.reviewFirst = flat((await snap(`rail-${v}-01-review-first`)).text.main, 1500);
                // the return visit to Details (by the rail)
                await railTo('Details');
                const fast = /-fast$/.test(v);
                if (!fast) await snap(`rail-${v}-02-details-return`);
                const t0 = Date.now();
                if (isRefs) {
                    const box = page.locator('main').getByRole('textbox', {name: /^References/}).first();
                    o.refsBox = await box.waitFor({timeout: 10000}).then(() => 1).catch(() => 0);
                    if (o.refsBox) await box.fill(refs);
                } else {
                    await typeRich('titleAbstract-title-control-en', changed);
                }
                o.typedMs = Date.now() - t0;
                const t1 = Date.now();
                o.pause = pause;
                if (/^cont/.test(v)) {
                    if (pause) await sleep(pause);
                    o.move = await continueToReview('Seeded abstract.');
                } else {
                    if (pause) await sleep(pause);
                    await railTo('Review');
                    await page.locator('.submissionWizard__loadingReview').waitFor({state: 'hidden', timeout: T}).catch(() => {});
                    await idle(page);
                }
                o.moveMs = Date.now() - t1;
                o.writesOnMove = writesSince(t1);
                o.footerOnReview = await footerText();
                const sr = await snap(`rail-${v}-03-review-after-move`, {writes: o.writesOnMove});
                o.reviewShowsChange = (sr.text.main || '').includes(isRefs ? refs : changed);
                o.secondsSinceTyping = Math.round((Date.now() - t0) / 1000);
                o.submit = await submitNow();
                o.confirmNamesChange = (o.submit.confirmText || '').includes(changed);
                await snap(`rail-${v}-04-complete`, {submit: o.submit});
                // anything the wizard sent after the submit (a late autosave), for ten seconds on the completion page
                await sleep(10000);
                o.writesAfterSubmit = writesSince(t1);
                // the saved title (header of the author's workflow) and, for the References variant, the manager's References page
                await openWorkflow(ctx, D.submissionId, true);
                const sw = await snap(`rail-${v}-05-workflow-author`);
                o.workflowHeader = await headerRead();
                o.workflowShowsChange = (sw.text.dialog || '').includes(changed);
                o.workflowShowsOriginal = (sw.text.dialog || '').includes(`I28 ${v.replace(/-/g, '')} original ${t}`);
                if (isRefs) {
                    await as(`${t}mg`, ctx);
                    await openWorkflow(ctx, D.submissionId);
                    const link = wf().getByRole('link', {name: 'References', exact: true}).first();
                    if (!(await link.isVisible().catch(() => false))) await wf().getByRole('link', {name: /^(Publication|Preprint)$/}).first().click().catch(() => {});
                    await link.click().catch(() => {});
                    await idle(page); await sleep(1500);
                    const sm = await snap(`rail-${v}-06-manager-references`);
                    o.managerRefsShowChange = (sm.text.dialog || '').includes(refs);
                }
                out[v] = o;
                fact('rail', {[v]: o, ctx});
                log('rail', v, JSON.stringify({writesOnMove: o.writesOnMove.map((w) => [w.op, w.url, w.status]), reviewShowsChange: o.reviewShowsChange, completed: o.submit.completed, confirmNamesChange: o.confirmNamesChange, after: o.writesAfterSubmit.map((w) => [w.op, w.url, w.status]), workflowShowsChange: o.workflowShowsChange, managerRefs: o.managerRefsShowChange}));
            }
            await signOut(page).catch(() => {});
        });

        // ============================================================== leave (L159)
        if (on('leave')) await sect('leave', async () => {
            const out = {};
            const t = tag('u21i28l');
            const U = (k, roles, g, f) => ({username: `${t}${k}`, roles, givenName: g, familyName: f});
            const body = {tag: t, context: {name: `U21 I28 leave ${t}`, contactName: 'I28 Contact', contactEmail: `${t}contact@mail.test`},
                users: [U('au', ['author'], 'Ava', 'Author')]};
            if (isOJS) body.sections = [{abbrev: 'ART', title: 'Articles'}];
            if (isOPS) body.sections = [{abbrev: 'PRE', title: 'Preprints', path: 'preprints'}];
            const C = await app.api.createContext(body);
            const ctx = C.path || t;
            out.ctx = ctx;
            // variants: leave-first (Details reached by Continue, the Title changed, another address opened),
            // leave-return (Details reached again by the rail from Review, then the address), rail-back (control: the rail to Upload Files)
            for (const v of ['leave-first', 'leave-return', 'rail-back']) {
                const o = {};
                const D = await app.api.createSubmission({tag: `${t}${v.replace(/-/g, '')}`, context: ctx, submitter: `${t}au`, title: `I28 ${v} original ${t}`, submitted: false});
                o.id = D.submissionId;
                const changed = `I28 ${v} changed ${t}`;
                await as(`${t}au`, ctx);
                await gotoWizard(ctx, D.submissionId);
                if (v === 'leave-return') {
                    await continueToReview('Seeded abstract.');
                    await railTo('Details');
                } else {
                    await continueTo('Details');
                }
                await snap(`leave-${v}-01-details`);
                const t0 = Date.now();
                await typeRich('titleAbstract-title-control-en', changed);
                o.typedMs = Date.now() - t0;
                o.footerAfterTyping = await lastSaved();
                const t1 = Date.now();
                if (v === 'rail-back') {
                    await sleep(1500);
                    await railTo('Upload Files');
                    await sleep(4000); await idle(page);
                    o.writes = writesSince(t1);
                    await snap(`leave-${v}-02-after-rail`, {writes: o.writes});
                    await page.goto(app.url(`/index.php/${ctx}/submissions`)).catch((e) => { o.gotoError = flat(e.message, 200); });
                } else {
                    await sleep(1500);
                    await page.goto(app.url(`/index.php/${ctx}/submissions`)).catch((e) => { o.gotoError = flat(e.message, 200); });
                }
                await idle(page).catch(() => {});
                o.leftAfterMs = Date.now() - t0;
                o.dialogsOnLeave = dialogsSince(t1);
                o.writesOnLeave = writesSince(t1);
                o.landedOn = page.url().replace(/^https?:\/\/[^/]+/, '');
                await snap(`leave-${v}-03-left`, {dialogs: o.dialogsOnLeave, writes: o.writesOnLeave});
                // back to the wizard
                await page.goto(app.url(`/index.php/${ctx}/submission?id=${D.submissionId}`));
                await page.locator('.pkpSteps').waitFor({timeout: T});
                await idle(page); await sleep(1500);
                const unsaved = page.getByRole('dialog').filter({hasText: /Unsaved Changes/});
                o.unsavedDialog = await unsaved.isVisible().catch(() => false);
                o.stepOnReturn = await curText();
                const sb = await snap(`leave-${v}-04-back`, {unsavedDialog: o.unsavedDialog});
                if (o.unsavedDialog) {
                    o.unsavedText = flat(await unsaved.innerText().catch(() => null), 500);
                    await unsaved.getByRole('button', {name: 'Yes', exact: true}).click().catch(() => {});
                    await sleep(1500); await idle(page);
                }
                if (!/Details\s*$/.test(await curText())) {
                    if (await page.locator('button.pkpSteps__step__label').filter({hasText: endAnchored('Details')}).count()) await railTo('Details');
                    else await continueTo('Details');
                }
                await waitForEditorReady(page, 'titleAbstract-title-control-en').catch(() => {});
                await sleep(800);
                o.titleOnReturn = await richValue('titleAbstract-title-control-en');
                o.headerOnReturn = flat(await page.locator('.submissionWizard__submissionDetails').innerText().catch(() => null), 200);
                await snap(`leave-${v}-05-details-back`, {title: o.titleOnReturn});
                // a reload
                await page.reload(); await page.locator('.pkpSteps').waitFor({timeout: T}); await idle(page); await sleep(1500);
                o.unsavedDialogAfterReload = await page.getByRole('dialog').filter({hasText: /Unsaved Changes/}).isVisible().catch(() => false);
                o.headerAfterReload = flat(await page.locator('.submissionWizard__submissionDetails').innerText().catch(() => null), 200);
                await snap(`leave-${v}-06-reload`, {header: o.headerAfterReload});
                o.kept = (o.titleOnReturn || '').includes(changed);
                out[v] = o;
                fact('leave', {[v]: o, ctx});
                log('leave', v, JSON.stringify({dialogs: o.dialogsOnLeave, writes: (o.writes || []).map((w) => [w.op, w.url, w.status]), writesOnLeave: o.writesOnLeave.map((w) => [w.op, w.url, w.status]), unsaved: o.unsavedDialog, title: o.titleOnReturn, header: o.headerAfterReload}));
            }
            await signOut(page).catch(() => {});
        });

        // ============================================================== galley (L97)
        if (on('galley') && isOPS) await sect('galley', async () => {
            const out = {};
            const t = tag('u21i28y');
            const U = (k, roles, g, f) => ({username: `${t}${k}`, roles, givenName: g, familyName: f});
            const C = await app.api.createContext({tag: t, context: {name: `U21 I28 galley ${t}`, contactName: 'I28 Contact', contactEmail: `${t}contact@mail.test`},
                sections: [{abbrev: 'PRE', title: 'Preprints', path: 'preprints'}], users: [U('au', ['author'], 'Ava', 'Author')]});
            const ctx = C.path || t;
            out.ctx = ctx;
            await as(`${t}au`, ctx);
            // (a) a draft whose galley was added on screen, then "Save for Later"; reopened
            const A = await app.api.createSubmission({tag: `${t}a`, context: ctx, submitter: `${t}au`, title: `I28 galley saved ${t}`, submitted: false});
            await gotoWizard(ctx, A.submissionId);
            out.a = {first: await opsAddGalley('PDF', 'upload', 'galley-a-01-first')};
            await snap('galley-a-02-after-first', {rows: out.a.first.rows});
            const sfl = footer().getByRole('button', {name: 'Save for Later', exact: true});
            await sfl.click();
            await page.getByRole('heading', {name: /Saved for Later/}).waitFor({timeout: T}).catch(() => {});
            await idle(page);
            await snap('galley-a-03-saved-for-later');
            let t0 = Date.now();
            await gotoWizard(ctx, A.submissionId);
            await page.locator('[id^="component-grid-preprintgalleys"]').first().waitFor({timeout: T}).catch(() => {});
            await sleep(1500);
            out.a.reopen = {step: await curText(), rows: await galleyRows(), errors: errsSince(t0)};
            await snap('galley-a-04-reopened', out.a.reopen);
            // the second galley on the reopened draft: the window, the component, the file
            const second = async (key, snapName, withReview = false) => {
                const t2 = Date.now();
                const o = await opsAddGalley('HTML', 'try', snapName);
                o.errorsLater = errsSince(t2);
                await closeUploadWin();
                o.rowsAfter = await galleyRows();
                await gotoWizard(ctx, key);
                await page.locator('[id^="component-grid-preprintgalleys"]').first().waitFor({timeout: T}).catch(() => {});
                await sleep(1500);
                o.rowsAfterReload = await galleyRows();
                await snap(`${snapName}-after-reload`, {rows: o.rowsAfterReload});
                if (withReview) {
                    // what "Review" makes of the galley left behind
                    await continueToReview('Seeded abstract.').catch((e) => { o.reviewError = flat(e.message, 300); });
                    const sr = await snap(`${snapName}-review`);
                    o.reviewFiles = (sr.text.main || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 400).join(' | ').match(/Files \| Edit \|[^]*?\| Details \| Edit/);
                    o.reviewFiles = o.reviewFiles ? o.reviewFiles[0] : flat(sr.text.main, 600);
                    o.submitDisabled = await footer().getByRole('button', {name: 'Submit', exact: true}).isDisabled().catch(() => null);
                }
                return o;
            };
            out.a.second = await second(A.submissionId, 'galley-a-05-second', true);
            log('galley a second', JSON.stringify({visible: out.a.second.visible, after: out.a.second.visibleAfterComponent, file: out.a.second.visibleAfterFile, uploaded: out.a.second.uploaded, rows: out.a.second.rowsAfterReload, errs: out.a.second.errorsAll}).slice(0, 1500));
            fact('galley', out);
            // (b) a seeded draft with a galley, reopened
            let B = null;
            try { B = await app.api.createSubmission({tag: `${t}b`, context: ctx, submitter: `${t}au`, title: `I28 galley seeded ${t}`, submitted: false, galleys: [{label: 'PDF', file: 'preprint.pdf'}]}); } catch (e) { out.bSeedError = flat(e.message, 400); }
            if (B) {
                await gotoWizard(ctx, B.submissionId);
                await page.locator('[id^="component-grid-preprintgalleys"]').first().waitFor({timeout: T}).catch(() => {});
                await sleep(1500);
                out.b = {rows: await galleyRows()};
                await snap('galley-b-01-reopened', out.b);
                out.b.second = await second(B.submissionId, 'galley-b-02-second');
            }
            fact('galley', out);
            // (c) control: a fresh draft, the first galley and a second one in the same visit (no reload between)
            const Cd = await app.api.createSubmission({tag: `${t}c`, context: ctx, submitter: `${t}au`, title: `I28 galley fresh ${t}`, submitted: false});
            await gotoWizard(ctx, Cd.submissionId);
            out.c = {first: await opsAddGalley('PDF', 'upload', 'galley-c-01-first')};
            out.c.second = await opsAddGalley('HTML', 'try', 'galley-c-02-second');
            await closeUploadWin();
            out.c.rows = await galleyRows();
            await snap('galley-c-03-after-second', {rows: out.c.rows});
            // (d) the fresh draft reloaded (two galleys now): a third "Add File"
            await gotoWizard(ctx, Cd.submissionId);
            await page.locator('[id^="component-grid-preprintgalleys"]').first().waitFor({timeout: T}).catch(() => {});
            await sleep(1500);
            out.d = await second(Cd.submissionId, 'galley-d-01-third-after-reload');
            fact('galley', out);
            const brief = (x) => x && ({visible: x.visible, afterComponent: x.visibleAfterComponent, afterFile: x.visibleAfterFile, uploaded: x.uploaded, rows: x.rowsAfterReload || x.rows, errs: (x.errorsAll || []).map((e) => e.text)});
            log('galley', JSON.stringify({aFirst: brief(out.a.first), a: brief(out.a.second), b: out.b ? brief(out.b.second) : out.bSeedError, c1: brief(out.c.first), c2: brief(out.c.second), d: brief(out.d)}).slice(0, 4000));
            await signOut(page).catch(() => {});
        });

        // ============================================================== galleyrev (sweep: the Review "Files" panel of a reopened draft, OPS)
        if (on('galleyrev') && isOPS) await sect('galleyrev', async () => {
            const out = {};
            const t = tag('u21i28v');
            const U = (k, roles, g, f) => ({username: `${t}${k}`, roles, givenName: g, familyName: f});
            const C = await app.api.createContext({tag: t, context: {name: `U21 I28 galleyrev ${t}`, contactName: 'I28 Contact', contactEmail: `${t}contact@mail.test`},
                sections: [{abbrev: 'PRE', title: 'Preprints', path: 'preprints'}], users: [U('au', ['author'], 'Ava', 'Author'), U('mg', ['manager'], 'Mira', 'Manager')]});
            const ctx = C.path || t;
            out.ctx = ctx;
            const filesPanel = (txt) => { const i = (txt || '').indexOf('Files\nEdit'); return i < 0 ? null : flat(txt.slice(i, i + 160), 160); };
            await as(`${t}au`, ctx);
            const D = await app.api.createSubmission({tag: `${t}d`, context: ctx, submitter: `${t}au`, title: `I28 galleyrev ${t}`, submitted: false});
            await gotoWizard(ctx, D.submissionId);
            out.upload = await opsAddGalley('PDF', 'upload');
            // same visit: Review
            await continueToReview('Seeded abstract.');
            let sr = await snap('galleyrev-01-review-same-visit');
            out.sameVisit = {files: filesPanel(sr.text.main), submitDisabled: await footer().getByRole('button', {name: 'Submit', exact: true}).isDisabled().catch(() => null)};
            // reload (a fresh page load on Review)
            await page.reload(); await page.locator('.pkpSteps').waitFor({timeout: T}); await idle(page); await sleep(1000);
            out.stepAfterReload = await curText();
            await continueToReview('Seeded abstract.');
            sr = await snap('galleyrev-02-review-after-reload');
            out.afterReload = {files: filesPanel(sr.text.main), submitDisabled: await footer().getByRole('button', {name: 'Submit', exact: true}).isDisabled().catch(() => null), upload: {rows: await galleyRows()}};
            // back on "Upload Files" after the reload: what the list shows
            await railTo('Upload Files').catch(() => {});
            await sleep(1000);
            out.afterReload.rowsOnUpload = await galleyRows();
            await snap('galleyrev-03-upload-files-after-reload', {rows: out.afterReload.rowsOnUpload});
            fact('galleyrev', out);
            log('galleyrev', JSON.stringify(out).slice(0, 1500));
            await signOut(page).catch(() => {});
        });

        // ============================================================== pls (L114)
        if (on('pls') && !isOMP) await sect('pls', async () => {
            const out = {};
            const t = tag('u21i28s');
            const U = (k, roles, g, f) => ({username: `${t}${k}`, roles, givenName: g, familyName: f});
            const body = {tag: t, context: {name: `U21 I28 pls ${t}`, contactName: 'I28 Contact', contactEmail: `${t}contact@mail.test`},
                metadata: {plainLanguageSummary: 'request'}, users: [U('au', ['author'], 'Ava', 'Author')]};
            body.sections = isOJS ? [{abbrev: 'ART', title: 'Articles', wordCount: 10}] : [{abbrev: 'PRE', title: 'Preprints', path: 'preprints', wordCount: 10}];
            const C = await app.api.createContext(body);
            const ctx = C.path || t;
            out.ctx = ctx;
            const words = (n, w = 'word') => Array.from({length: n}, (_, i) => `${w}${i + 1}`).join(' ');
            const ID = 'titleAbstract-plainLanguageSummary-control-en';
            const errDialog = () => page.getByRole('dialog').filter({hasText: 'An unexpected error has occurred'});
            for (const [v, n] of [['over', 20], ['overcont', 20], ['at', 10]]) {
                const o = {};
                const D = await app.api.createSubmission({tag: `${t}${v}`, context: ctx, submitter: `${t}au`, title: `I28 pls ${v} ${t}`, abstract: 'Five words of seeded abstract.', submitted: false,
                    ...(isOJS ? {files: [{file: 'article.pdf'}]} : {})});
                o.id = D.submissionId;
                await as(`${t}au`, ctx);
                await gotoWizard(ctx, D.submissionId);
                await continueTo('Details');
                o.plsBox = await page.locator(`#${ID}_ifr`).count();
                await snap(`pls-${v}-01-details`);
                await loc(page, 'wizard Details: Plain Language Summary editor', page.locator(`#${ID}_ifr`));
                const summary = words(n, 'plain');
                const t0 = Date.now();
                await typeRich(ID, summary);
                o.counters = ((await page.locator('main').innerText().catch(() => '')).match(/Word Count[^\n]*/g) || []);
                // wait for the autosave (the wizard's own minute), on this step; 'overcont' presses Continue at once instead (K3-5's path)
                const savedP = page.waitForResponse((r) => /\/publications\/\d+$/.test(r.url().split('?')[0]) && r.request().method() !== 'GET', {timeout: 120000}).catch(() => null);
                if (v === 'overcont') {
                    await footer().getByRole('button', {name: 'Continue', exact: true}).click();
                    await cur().filter({hasText: endAnchored('Contributors')}).waitFor({timeout: 10000}).catch(() => {});
                    o.stepAfterContinue = await curText();
                }
                const saved = await savedP;
                o.autosave = saved ? {status: saved.status(), afterMs: Date.now() - t0, body: flat(await saved.text().catch(() => null), 500)} : null;
                await sleep(2500);
                o.footerAfterSave = await lastSaved();
                o.buttons = {saveForLaterDisabled: await footer().getByRole('button', {name: 'Save for Later', exact: true}).isDisabled().catch(() => null)};
                o.fieldErrors = await page.locator('.pkpFieldError:visible').allInnerTexts().catch(() => []);
                o.errorDialog = await errDialog().isVisible().catch(() => false);
                o.errorDialogText = o.errorDialog ? flat(await errDialog().innerText().catch(() => null), 300) : null;
                await snap(`pls-${v}-02-after-autosave`, {autosave: o.autosave, footer: o.footerAfterSave, errorDialog: o.errorDialogText});
                if (o.errorDialog) {
                    await errDialog().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
                    await sleep(1000);
                    o.footerAfterOk = await lastSaved();
                    o.stepAfterOk = await curText();
                    await snap(`pls-${v}-02b-after-ok`, {footer: o.footerAfterOk});
                }
                // twenty seconds more on the step: the retries, the console
                await sleep(20000);
                o.footerLater = await lastSaved();
                o.errorDialogLater = await errDialog().isVisible().catch(() => false);
                if (o.errorDialogLater) { await snap(`pls-${v}-03a-error-again`); await errDialog().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {}); await sleep(800); }
                o.writes = writesSince(t0).map((w) => ({op: w.op, url: w.url, status: w.status, body: flat(w.body, 300)}));
                o.errorsOnDetails = errsSince(t0);
                await snap(`pls-${v}-03-details-later`, {footer: o.footerLater, errors: o.errorsOnDetails});
                // Review (Continue)
                const t1 = Date.now();
                try { o.walk = await continueToReview('Five words of seeded abstract.'); } catch (e) {
                    o.continueStuck = flat(e.message, 900);
                    o.continueStuckStep = await curText();
                    o.footerStuck = await footerText();
                    await snap(`pls-${v}-04x-continue-stuck`, {stuck: o.continueStuck});
                    log('pls', v, 'continue stuck', o.continueStuck);
                }
                await sleep(3000);
                const sr = await snap(`pls-${v}-04-review`);
                o.reviewShowsSummary = (sr.text.main || '').includes(summary);
                o.reviewPlsLines = (sr.text.main || '').split('\n').map((x) => x.trim()).filter((x, i, a) => /Plain Language Summary/i.test(x) || /Plain Language Summary/i.test(a[i - 1] || '')).slice(0, 6);
                o.submitDisabled = await footer().getByRole('button', {name: 'Submit', exact: true}).isDisabled().catch(() => null);
                o.footerOnReview = await lastSaved();
                await sleep(10000);
                o.errorsLater = errsSince(t1);
                o.errorsAll = errsSince(t0);
                // leave and come back: the "Unsaved Changes" dialog?
                await page.goto(app.url(`/index.php/${ctx}/submission?id=${D.submissionId}`));
                await page.locator('.pkpSteps').waitFor({timeout: T}); await idle(page); await sleep(1500);
                const unsaved = page.getByRole('dialog').filter({hasText: /Unsaved Changes/});
                o.unsavedDialogOnReload = await unsaved.isVisible().catch(() => false);
                if (o.unsavedDialogOnReload) o.unsavedText = flat(await unsaved.innerText().catch(() => null), 500);
                await snap(`pls-${v}-05-reload`, {unsaved: o.unsavedDialogOnReload});
                if (o.unsavedDialogOnReload) {
                    await unsaved.getByRole('button', {name: /No, discard/}).click().catch(() => {});
                    await sleep(1000);
                }
                // what the server kept: the summary on "Details" after the reload
                o.stepOnReload = await curText();
                await continueTo('Details').catch(() => {});
                await waitForEditorReady(page, ID).catch(() => {});
                await sleep(800);
                o.summaryAfterReload = flat(await richValue(ID), 300);
                await snap(`pls-${v}-06-details-after-reload`, {summary: o.summaryAfterReload});
                out[v] = o;
                fact('pls', {[v]: o, ctx});
                log('pls', v, JSON.stringify({autosave: o.autosave && {status: o.autosave.status, afterMs: o.autosave.afterMs, body: (o.autosave.body || '').slice(0, 200)}, errDialog: o.errorDialogText, footer: [o.footerAfterSave, o.footerAfterOk, o.footerLater, o.footerOnReview], review: o.reviewShowsSummary, lines: o.reviewPlsLines, stuck: o.continueStuck, errs: o.errorsAll.map((e) => e.text), unsaved: o.unsavedDialogOnReload, afterReload: o.summaryAfterReload}).slice(0, 2500));
            }
            await signOut(page).catch(() => {});
        });

        // ============================================================== license (L151)
        if (on('license') && isOPS) await sect('license', async () => {
            const out = {};
            const t = tag('u21i28c');
            const U = (k, roles, g, f) => ({username: `${t}${k}`, roles, givenName: g, familyName: f});
            const C = await app.api.createContext({tag: t, context: {name: `U21 I28 license ${t}`, contactName: 'I28 Contact', contactEmail: `${t}contact@mail.test`},
                sections: [{abbrev: 'PRE', title: 'Preprints', path: 'preprints'}], users: [U('au', ['author'], 'Ava', 'Author')]});
            const ctx = C.path || t;
            const D = await app.api.createSubmission({tag: `${t}d`, context: ctx, submitter: `${t}au`, title: `I28 license ${t}`, submitted: false});
            out.ctx = ctx;
            await as(`${t}au`, ctx);
            await gotoWizard(ctx, D.submissionId);
            await continueToReview('Seeded abstract.');
            out.review = flat((await snap('license-01-review')).text.main, 2500);
            out.panels = await page.locator('.submissionWizard__reviewPanel h3').allInnerTexts().catch(() => []);
            const H3 = {License: 'h3#review-license', 'Relation status': 'h3#review-relation', 'For Readers': 'h3#revieweditors'};
            for (const [name, sel] of Object.entries(H3)) {
                if (!/Review\s*$/.test(await curText())) { await railTo('Review'); await page.locator('.submissionWizard__loadingReview').waitFor({state: 'hidden', timeout: T}).catch(() => {}); await idle(page); }
                const p = page.locator('.submissionWizard__reviewPanel').filter({has: page.locator(sel)}).first();
                const o = {panel: await p.count()};
                if (o.panel) {
                    await loc(page, `wizard Review: "${name}" panel's Edit`, p.getByRole('button', {name: 'Edit'}).first());
                    const t0 = Date.now();
                    await p.getByRole('button', {name: 'Edit'}).first().click();
                    await sleep(1500);
                    o.step = await curText();
                    o.url = page.url().replace(/^https?:\/\/[^/]+/, '');
                    o.errors = errsSince(t0);
                    o.dialogs = await page.getByRole('dialog').allInnerTexts().then((x) => x.map((y) => flat(y, 200))).catch(() => []);
                }
                await snap(`license-02-after-edit-${name.replace(/\W+/g, '').toLowerCase()}`, o);
                out[name] = o;
            }
            fact('license', out);
            log('license', JSON.stringify(out).slice(0, 2000));
            await signOut(page).catch(() => {});
        });
    } finally {
        await close();
    }
});
