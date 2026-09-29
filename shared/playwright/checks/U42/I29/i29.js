// U42 claim check, housekeeping chunk I29 (2026-09-29): incidentals row 11, the wizard's References box carried to
// "Review" by the step rail (Rule 16 "When the step saves", A18, note b).
//   As the author of a seeded draft on a scratch context (references at "request", the install default):
//   "Continue" to "Review", back to "Details" by the step rail, the References box changed, then:
//     rail-now    the rail to "Review" at once, "Submit" › "Submit" at once
//     rail-pause  the rail to "Review" after 1.5 s, "Submit" › "Submit"
//     rail-typed  the box typed from the keyboard (not filled), the rail at once, "Submit" at once
//     rail-reload the rail to "Review" at once, then a reload (nothing submitted): the box and "Review" again
//     cont        control: "Continue" through the later steps to "Review", "Submit"
//     leave       control: another address (the dashboard) 1.5 s after the change, then back to the wizard
//     edit-back   sweep: "Details" reopened by the Review panel's "Edit", the box changed, the footer's "Back" at once;
//                 then a reload, the box and "Review" again (nothing submitted)
//     idle        the bullet's other end: the box changed and the author stays on "Details" for 90 s (autosave timer)
//     idle-late   the same, the box changed only after 40 s on "Details" (is the timer counted from the typing or the last save?)
//     save-later  sweep: the box changed, the footer's "Save for Later" at once; then back to the wizard (nothing submitted)
//   Every variant records the writes the move sent, what "Review" lists, and (submitted variants) the manager's
//   "References" page of the submission.
//
//   PROBE_FEATURE=U42 PROBE_AGENT=ccI29 RUN=r1 node bin/probe.js all shared/playwright/checks/U42/I29/i29.js
//   VARIANTS narrows (comma list). RUN names the run: every snapshot and fact file carries it and each run seeds its
//   own scratch context (tag prefix u42i29), so two runs never share data. publicknowledge is never touched.
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');
const {waitForEditorReady} = require('../../../support/richtext.js');

const ALL = ['rail-now', 'rail-pause', 'rail-typed', 'rail-reload', 'cont', 'leave', 'edit-back', 'save-later', 'idle', 'idle-late'];
const VARIANTS = (process.env.VARIANTS || ALL.join(',')).split(',');
const RUN = process.env.RUN || 'r1';
const T = 30_000;
const log = (...a) => console.log(`[i29 ${RUN}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const endAnchored = (name) => new RegExp(`${esc(name)}\\s*$`);
const RELATION_NONE = 'This preprint has not been published elsewhere.';

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOPS = app.name === 'ops';
    const fact = (name, data) => record(`${RUN}-facts-${name}`, data, {merge: true});
    const {page, close} = await launch(app);

    const traffic = [];
    const errs = [];
    const dialogs = [];
    page.on('response', async (r) => {
        const u = r.url();
        if (!/\/api\/v1\//.test(u) || /_test\//.test(u)) return;
        const m = r.request().method();
        const e = {at: Date.now(), m, override: r.request().headers()['x-http-method-override'] || null,
            url: u.replace(/^https?:\/\/[^/]+/, '').split('?')[0], status: r.status()};
        if (m !== 'GET') {
            e.body = await r.text().then((b) => b.slice(0, 300)).catch(() => null);
            const pd = r.request().postData() || '';
            e.citationsRaw = /citationsRaw/.test(pd) ? flat(decodeURIComponent(((pd.match(/citationsRaw=([^&]*)/) || [])[1] || '').replace(/\+/g, ' ')), 300) : undefined;
            e.sentKeys = pd.split('&').map((kv) => decodeURIComponent(kv.split('=')[0])).slice(0, 25);
        }
        traffic.push(e);
    });
    page.on('pageerror', (e) => errs.push({at: Date.now(), type: 'pageerror', text: flat(e.message, 300), url: page.url()}));
    page.on('console', (m) => { if (m.type() === 'error') errs.push({at: Date.now(), type: 'console', text: flat(m.text(), 300), url: page.url()}); });
    page.on('dialog', async (d) => {
        dialogs.push({at: Date.now(), type: d.type(), message: flat(d.message(), 300), url: page.url()});
        if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    const writesSince = (t0) => traffic.filter((x) => x.at >= t0 && x.m !== 'GET').map((x) => ({op: x.override || x.m, url: x.url, status: x.status, citationsRaw: x.citationsRaw, sentKeys: x.sentKeys, body: x.status >= 400 ? x.body : undefined, atMs: x.at - t0}));
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

    // ------------------------------------------------------------------ wizard
    const cur = () => page.locator('.pkpSteps__step__label--current');
    const curText = async () => flat(await cur().innerText().catch(() => ''), 80);
    const footer = () => page.locator('.submissionWizard__footer');
    const footerText = async () => flat(await footer().innerText().catch(() => null), 200);
    const box = () => page.locator('main').getByRole('textbox', {name: /^References/}).first();
    async function gotoWizard(ctx, id) {
        await page.goto(app.url(`/index.php/${ctx}/submission?id=${id}`));
        await page.locator('.pkpSteps').waitFor({timeout: T});
        await idle(page);
    }
    async function continueTo(label) {
        const button = footer().getByRole('button', {name: 'Continue', exact: true});
        for (let attempt = 0; ; attempt++) {
            await button.click({timeout: 10000});
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
        if (flat(await richValue(id), 200)) return 'kept';
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
    async function nextStepName() {
        const labels = (await page.locator('.pkpSteps__step__label').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ').trim());
        const c = await curText();
        const i = labels.findIndex((l) => l === c);
        return labels[i + 1].replace(/^\d+\s*/, '');
    }
    async function continueToReview(abstractText, onDetails) {
        const out = {path: []};
        for (let i = 0; i < 8; i++) {
            const c = await curText();
            out.path.push(c);
            if (/Review\s*$/.test(c)) break;
            if (/Details\s*$/.test(c)) { out.abstract = await ensureAbstract(abstractText); if (onDetails) await onDetails(); }
            if (/For Readers\s*$/.test(c)) out.relation = await answerRelation();
            await continueTo(await nextStepName());
        }
        await page.locator('.submissionWizard__loadingReview').waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await idle(page);
        return out;
    }
    // Back to "Details": by the rail when its pill is reached, else by "Continue" (a reopened wizard starts on
    // "Upload Files" with the later pills unreached, U21 Rule 6).
    async function toDetails() {
        if (/Details\s*$/.test(await curText())) return 'already';
        if (/Upload Files\s*$/.test(await curText())) { await continueTo('Details'); return 'continue'; }
        await railTo('Details'); return 'rail';
    }
    // The Review step's "References" item: the lines between the "References" heading and the next item.
    function reviewRefs(text) {
        if (!text) return null;
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        const i = lines.findIndex((l) => l === 'References');
        if (i < 0) return null;
        return lines.slice(i + 1, i + 4);
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
        return o;
    }
    // ------------------------------------------------------------------ the manager's References page
    const wf = () => page.locator('[role="dialog"]:visible').first();
    async function managerRefs(ctx, id, name) {
        await page.goto(app.url(`/index.php/${ctx}/dashboard/editorial?workflowSubmissionId=${id}`));
        await idle(page);
        await wf().waitFor({timeout: T}).catch(() => {});
        const link = wf().getByRole('link', {name: 'References', exact: true}).first();
        await link.waitFor({state: 'attached', timeout: T}).catch(() => {});
        if (!(await link.isVisible().catch(() => false))) await wf().getByRole('link', {name: /^(Publication|Preprint)$/}).first().click().catch(() => {});
        await link.click().catch(() => {});
        await wf().locator('table').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
        await idle(page); await sleep(1000);
        const s = await snap(name);
        const rows = await wf().locator('table').first().locator('tbody tr').evaluateAll((trs) => trs.map((tr) => (tr.querySelector('td, th') || tr).innerText.replace(/\s+/g, ' ').trim())).catch(() => null);
        return {rows, heading: flat(await wf().getByRole('heading', {level: 2}).first().innerText().catch(() => null), 120), snapUrl: s.url};
    }

    try {
        const t = tag('u42i29');
        const U = (k, roles, g, f) => ({username: `${t}${k}`, roles, givenName: g, familyName: f});
        const body = {tag: t, context: {name: `U42 I29 ${t}`, contactName: 'I29 Contact', contactEmail: `${t}contact@mail.test`},
            users: [U('mg', ['manager'], 'Mira', 'Manager'), U('au', ['author'], 'Ava', 'Author')]};
        if (isOJS) body.sections = [{abbrev: 'ART', title: 'Articles'}];
        if (isOPS) body.sections = [{abbrev: 'PRE', title: 'Preprints', path: 'preprints'}];
        const C = await app.api.createContext(body);
        const ctx = C.path || t;
        fact('context', {ctx});
        for (const v of VARIANTS) {
            const o = {variant: v};
            const t0v = Date.now();
            try {
                const key = v.replace(/-/g, '');
                const spec = {tag: `${t}${key}`, context: ctx, submitter: `${t}au`, title: `I29 ${v} ${t}`, submitted: false,
                    citationsRaw: [`I29 ${v} original reference ${t}`]};
                const D = isOPS ? await app.api.createSubmission({...spec, galleys: [{label: 'PDF', file: 'preprint.pdf'}]})
                    : await app.api.createSubmission({...spec, files: [{file: 'article.pdf'}]});
                o.id = D.submissionId;
                const original = `I29 ${v} original reference ${t}`;
                const changed = `I29 ${v} changed reference ${t}`;
                const changed2 = `I29 ${v} second line ${t}`;
                await as(`${t}au`, ctx);
                await gotoWizard(ctx, D.submissionId);
                o.stepOnOpen = await curText();
                // First pass: "Continue" to Review.
                o.first = await continueToReview('Seeded abstract.');
                const s1 = await snap(`${v}-01-review-first`);
                o.reviewFirst = reviewRefs(s1.text.main);
                if (v === 'cont') {
                    // Control: back to Details, change, Continue through to Review.
                    await railTo('Details');
                    await box().waitFor({timeout: 10000});
                    await snap(`${v}-02-details-return`);
                    await box().fill(`${changed}\n${changed2}`);
                    const t1 = Date.now();
                    o.move = await continueToReview('Seeded abstract.');
                    o.writesOnMove = writesSince(t1);
                    const sr = await snap(`${v}-03-review-after-move`, {writes: o.writesOnMove});
                    o.reviewAfterMove = reviewRefs(sr.text.main);
                } else if (v === 'edit-back' || v === 'save-later') {
                    if (v === 'edit-back') {
                        const panel = page.locator('.submissionWizard__reviewPanel').filter({has: page.locator('.submissionWizard__reviewPanel__header', {hasText: /^\s*Details\s*Edit\s*$/})}).first();
                        const edit = panel.locator('.submissionWizard__reviewPanel__edit');
                        await loc(page, 'Review step: the "Details" panel\'s "Edit"', edit);
                        o.editName = flat(await edit.innerText().catch(() => null), 60);
                        await edit.click();
                        await cur().filter({hasText: endAnchored('Details')}).waitFor({timeout: 8000}).catch(() => {});
                        await idle(page);
                        o.stepAfterEdit = await curText();
                    } else {
                        await railTo('Details');
                    }
                    await box().waitFor({timeout: 10000});
                    await snap(`${v}-02-details-return`);
                    await box().fill(`${changed}\n${changed2}`);
                    const t1 = Date.now();
                    if (v === 'edit-back') {
                        await footer().getByRole('button', {name: 'Back', exact: true}).click();
                        await cur().filter({hasText: endAnchored('Upload Files')}).waitFor({timeout: 8000}).catch(() => {});
                        await idle(page); await sleep(1500);
                        o.stepAfterMove = await curText();
                        o.writesOnMove = writesSince(t1);
                        await snap(`${v}-03-after-back`, {writes: o.writesOnMove});
                        await page.reload();
                    } else {
                        const b = footer().getByRole('button', {name: 'Save for Later', exact: true});
                        await loc(page, 'Wizard footer: "Save for Later"', b);
                        await b.click();
                        await page.waitForURL((u) => !/submission\?id=/.test(String(u)), {timeout: T}).catch(() => {});
                        await idle(page).catch(() => {});
                        o.landedOn = page.url().replace(/^https?:\/\/[^/]+/, '');
                        o.writesOnMove = writesSince(t1);
                        const sl = await snap(`${v}-03-after-save-later`, {writes: o.writesOnMove});
                        o.savedScreen = flat(sl.text.main, 400);
                        await gotoWizard(ctx, D.submissionId);
                    }
                    await page.locator('.pkpSteps').waitFor({timeout: T});
                    await idle(page); await sleep(1500);
                    o.unsavedDialogAfter = await page.getByRole('dialog').filter({hasText: /Unsaved Changes/}).isVisible().catch(() => false);
                    o.stepOnReturn = await curText();
                    await snap(`${v}-04-back`);
                    o.detailsBy = await toDetails().catch((e) => flat(e.message, 200));
                    await box().waitFor({timeout: 10000}).catch(() => {});
                    o.boxOnReturn = await box().inputValue().catch(() => null);
                    await snap(`${v}-05-details-back`, {box: o.boxOnReturn});
                    await continueToReview('Seeded abstract.').catch((e) => { o.reviewError = flat(e.message, 200); });
                    const sr = await snap(`${v}-06-review-back`);
                    o.reviewOnReturn = reviewRefs(sr.text.main);
                } else if (v === 'idle' || v === 'idle-late') {
                    await railTo('Details');
                    await box().waitFor({timeout: 10000});
                    if (v === 'idle-late') {
                        const t0w = Date.now();
                        o.footerOnArrival = await footerText();
                        await sleep(40000);
                        o.writesWhileWaiting = writesSince(t0w);
                        o.footerBeforeTyping = await footerText();
                    }
                    await box().fill(`${changed}\n${changed2}`);
                    const t1 = Date.now();
                    o.footerSamples = [];
                    for (let i = 0; i < 18; i++) {
                        await sleep(5000);
                        o.footerSamples.push([Math.round((Date.now() - t1) / 1000), await footerText()]);
                        if (writesSince(t1).length && !o.firstWriteAtS) { o.firstWriteAtS = Math.round(writesSince(t1)[0].atMs / 1000); }
                        if (o.firstWriteAtS && Date.now() - t1 > o.firstWriteAtS * 1000 + 6000) break;
                    }
                    o.writesOnMove = writesSince(t1);
                    await snap(`${v}-03-details-after-wait`, {writes: o.writesOnMove});
                    await page.reload();
                    await page.locator('.pkpSteps').waitFor({timeout: T});
                    await idle(page); await sleep(1000);
                    o.detailsBy = await toDetails().catch((e) => flat(e.message, 200));
                    await box().waitFor({timeout: 10000}).catch(() => {});
                    o.boxOnReturn = await box().inputValue().catch(() => null);
                    await snap(`${v}-05-details-after-reload`, {box: o.boxOnReturn});
                } else if (v === 'leave') {
                    await railTo('Details');
                    await box().waitFor({timeout: 10000});
                    await snap(`${v}-02-details-return`);
                    await box().fill(`${changed}\n${changed2}`);
                    await box().blur().catch(() => {});
                    await sleep(1500);
                    const t1 = Date.now();
                    await page.goto(app.url(`/index.php/${ctx}/dashboard/mySubmissions`)).catch((e) => { o.gotoError = flat(e.message, 200); });
                    await idle(page).catch(() => {});
                    o.dialogsOnLeave = dialogsSince(t1);
                    o.writesOnLeave = writesSince(t1);
                    o.landedOn = page.url().replace(/^https?:\/\/[^/]+/, '');
                    await snap(`${v}-03-left`, {dialogs: o.dialogsOnLeave, writes: o.writesOnLeave});
                    await gotoWizard(ctx, D.submissionId);
                    await sleep(1500);
                    const unsaved = page.getByRole('dialog').filter({hasText: /Unsaved Changes/});
                    o.unsavedDialog = await unsaved.isVisible().catch(() => false);
                    o.stepOnReturn = await curText();
                    await snap(`${v}-04-back`, {unsavedDialog: o.unsavedDialog});
                    if (o.unsavedDialog) o.unsavedText = flat(await unsaved.innerText().catch(() => null), 500);
                    if (!o.unsavedDialog) {
                        o.detailsBy = await toDetails().catch((e) => flat(e.message, 200));
                        await box().waitFor({timeout: 10000}).catch(() => {});
                        o.boxOnReturn = await box().inputValue().catch(() => null);
                        await snap(`${v}-05-details-back`, {box: o.boxOnReturn});
                        await continueToReview('Seeded abstract.').catch((e) => { o.reviewError = flat(e.message, 200); });
                        const sr = await snap(`${v}-06-review-back`);
                        o.reviewOnReturn = reviewRefs(sr.text.main);
                    }
                } else {
                    await railTo('Details');
                    await box().waitFor({timeout: 10000});
                    if (v !== 'rail-now') await snap(`${v}-02-details-return`);
                    o.boxBefore = await box().inputValue().catch(() => null);
                    if (v === 'rail-typed') {
                        await box().click();
                        await page.keyboard.press('Control+A');
                        await page.keyboard.press('Delete');
                        await page.keyboard.type(`${changed}\n${changed2}`);
                    } else {
                        await box().fill(`${changed}\n${changed2}`);
                    }
                    const t1 = Date.now();
                    if (v === 'rail-pause') await sleep(1500);
                    await railTo('Review');
                    o.railClickedAtMs = Date.now() - t1;
                    await page.locator('.submissionWizard__loadingReview').waitFor({state: 'hidden', timeout: T}).catch(() => {});
                    await idle(page);
                    o.footerOnReview = await footerText();
                    const sr = await snap(`${v}-03-review-after-move`);
                    o.reviewAfterMove = reviewRefs(sr.text.main);
                    o.writesOnMove = writesSince(t1);
                    o.errorsOnMove = errsSince(t1);
                    if (v === 'rail-reload') {
                        await page.reload();
                        await page.locator('.pkpSteps').waitFor({timeout: T});
                        await idle(page); await sleep(1500);
                        o.unsavedDialogAfterReload = await page.getByRole('dialog').filter({hasText: /Unsaved Changes/}).isVisible().catch(() => false);
                        o.stepAfterReload = await curText();
                        await snap(`${v}-04-after-reload`);
                        o.detailsBy = await toDetails().catch((e) => flat(e.message, 200));
                        await box().waitFor({timeout: 10000}).catch(() => {});
                        o.boxAfterReload = await box().inputValue().catch(() => null);
                        await snap(`${v}-05-details-after-reload`, {box: o.boxAfterReload});
                        await continueToReview('Seeded abstract.').catch((e) => { o.reviewError = flat(e.message, 200); });
                        const s6 = await snap(`${v}-06-review-after-reload`);
                        o.reviewAfterReload = reviewRefs(s6.text.main);
                    }
                }
                if (!['rail-reload', 'leave', 'edit-back', 'save-later', 'idle', 'idle-late'].includes(v)) {
                    const t2 = Date.now();
                    o.submit = await submitNow();
                    await snap(`${v}-07-complete`, {submit: o.submit});
                    await sleep(8000);
                    o.writesFromSubmit = writesSince(t2);
                }
                o.errors = errsSince(t0v);
                await as(`${t}mg`, ctx);
                o.manager = await managerRefs(ctx, D.submissionId, `${v}-08-manager-references`);
                o.managerHasChange = (o.manager.rows || []).some((r) => r.includes(changed));
                o.managerHasOriginal = (o.manager.rows || []).some((r) => r.includes(original));
            } catch (e) {
                o.error = flat(e.stack || e.message, 1200);
                await snap(`${v}-error`).catch(() => {});
            }
            fact(v, o);
            log(app.name, v, JSON.stringify({moveWrites: (o.writesOnMove || o.writesOnLeave || []).map((w) => [w.op, w.url, w.status, w.atMs, w.citationsRaw]), reviewAfterMove: o.reviewAfterMove, submit: o.submit && o.submit.completed, managerRows: o.manager && o.manager.rows, error: o.error}).slice(0, 1500));
        }
    } finally {
        await signOut(page).catch(() => {});
        await close();
    }
});
