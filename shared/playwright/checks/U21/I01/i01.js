// U21 claim check, housekeeping chunk I01 (2026-10-01): incidentals row 69, the wizard after a refused autosave
// (Rule 9a, Rule 9b, A16). Does any 400 on a step's save leave the footer on "Saving" and "Submit" disabled, or only
// the plain language summary's word limit? As the Author of a seeded draft on two scratch contexts per run:
//   ctxReq   Settings › Workflow › Metadata: "Plain Language Summary" at require, "Coverage" at request
//   ctxPlain the same two items at request
// Variants (one browser each, all at once):
//   pls        ctxReq: a summary typed on "Details" (Continue), then "Coverage" typed on "For the Editors"/"For Readers",
//              Continue: does the server refuse the step's save for the required summary the step does not send?
//   plsdetails ctxReq: only the Title changed on "Details" (summary box left empty), Continue
//   cov        ctxPlain (control for pls): the same drive as pls
//   refs       ctxReq: a summary and two lines in "References" typed on "Details", Continue (the references box is its own
//              form, saved apart from the summary's)
//   refsctl    ctxPlain (control for refs): the same drive
//   relreq     OPS, ctxReq: only the required "Relation status" answered on "For Readers" ("This preprint has not been
//              published elsewhere."), Continue
//   vordoi     OPS, ctxPlain: "For Readers": "This preprint has been published elsewhere." and a bare DOI
//              (10.1234/…) in "DOI of the published preprint", Continue
//   vordoiurl  OPS, ctxPlain (control for vordoi): the same with https://doi.org/10.1234/…
//   inj400     ctxPlain: the Title changed on "Details", Continue, with the first save answered 400 by a Playwright route
//              (a fault-injection stand-in; the server never sees that request)
//   inj400more the same as inj400, then a new Title typed on "Details" in the same visit and Continue: is it sent? (and
//              after the reload, does "Yes" in "Unsaved Changes" bring it back?)
//   vordoifix  OPS, ctxPlain: vordoi, then the full address typed into the same box in the same visit and Continue
//   inj500     the same, answered 500 (Rule 9a's other end)
//   injdrop    the same, the request aborted (status 0, a dropped connection)
// After the save: the "Error" dialog, the footer (every change, a MutationObserver), the page errors, the writes in the
// next 25 s; then "OK"; then Continue to "Review": "Checking your submission", "Submit", both "Save for Later";
// then a reload: the leave dialogs, an "Unsaved Changes" dialog (answered "Yes", the branch no earlier drive took),
// the triggering field read back on its step, and "Review" again.
//
//   PROBE_FEATURE=U21 PROBE_AGENT=ccI01 PROBE_RUN=r1 node bin/probe.js all shared/playwright/checks/U21/I01/i01.js
//   VARIANTS narrows (comma list). Each run seeds its own scratch contexts (tag prefix u21i01); publicknowledge is
//   never touched. Kept for a later build; run on demand, never in CI.
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');
const {waitForEditorReady} = require('../../../support/richtext.js');

const RUN = process.env.PROBE_RUN || 'r1';
const T = 30_000;
const TITLE_ID = 'titleAbstract-title-control-en';
const PLS_ID = 'titleAbstract-plainLanguageSummary-control-en';
const log = (...a) => console.log(`[i01 ${RUN}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const endAnchored = (name) => new RegExp(`${esc(name)}\\s*$`);
const PUB_WRITE = /\/api\/v1\/submissions\/\d+\/publications\/\d+$/;

function watchFooter() {
    window.__u21footer = [];
    let last = null;
    const read = () => {
        const el = document.querySelector('.submissionWizard__lastSaved');
        const t = el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
        if (t !== last) { last = t; window.__u21footer.push({at: Date.now(), text: t}); }
    };
    const start = () => new MutationObserver(read).observe(document.body, {subtree: true, childList: true, characterData: true});
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
}

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOPS = app.name === 'ops';
    const ALL = ['pls', 'plsdetails', 'cov', 'refs', 'refsctl', 'inj400', 'inj500', 'injdrop'].concat(['inj400more'], isOPS ? ['vordoi', 'vordoiurl', 'vordoifix', 'relreq'] : []);
    const VARIANTS = (process.env.VARIANTS ? process.env.VARIANTS.split(',') : ALL).filter((v) => ALL.includes(v));
    const fact = (name, data) => record(`facts-${name}`, data, {merge: true});
    const t = tag('u21i01');
    const U = (k, roles, g, f) => ({username: `${t}${k}`, roles, givenName: g, familyName: f});
    async function makeContext(suffix, pls) {
        const body = {tag: `${t}${suffix}`, context: {name: `U21 I01 ${suffix} ${t}`, contactName: 'I01 Contact', contactEmail: `${t}${suffix}c@mail.test`},
            metadata: {plainLanguageSummary: pls, coverage: 'request'},
            users: [U(`${suffix}mg`, ['manager'], 'Mira', 'Manager'), U(`${suffix}au`, ['author'], 'Ava', 'Author')]};
        if (isOJS) body.sections = [{abbrev: 'ART', title: 'Articles'}];
        if (isOPS) body.sections = [{abbrev: 'PRE', title: 'Preprints', path: 'preprints'}];
        const C = await app.api.createContext(body);
        return {path: C.path || `${t}${suffix}`, author: `${t}${suffix}au`};
    }
    const ctxReq = await makeContext('rq', 'require');
    const ctxPlain = await makeContext('pl', 'request');
    fact('context', {ctxReq, ctxPlain, run: RUN});
    const editorsStep = isOPS ? 'For Readers' : 'For the Editors';

    async function drive(v) {
        const o = {variant: v, app: app.name, run: RUN};
        const C = ['pls', 'plsdetails', 'refs', 'relreq'].includes(v) ? ctxReq : ctxPlain;
        o.context = C.path;
        const spec = {tag: `${t}${v}`, context: C.path, submitter: C.author, title: `I01 ${v} seeded ${t}`, submitted: false};
        const D = isOPS ? await app.api.createSubmission({...spec, galleys: [{label: 'PDF', file: 'preprint.pdf'}]})
            : await app.api.createSubmission({...spec, files: [{file: 'article.pdf'}]});
        o.id = D.submissionId;
        const {page, close} = await launch(app);
        await page.addInitScript(watchFooter);
        const traffic = [];
        const dialogs = [];
        const errs = [];
        page.on('response', async (r) => {
            const u = r.url();
            if (!/\/api\/v1\//.test(u) || /_test\//.test(u) || r.request().method() === 'GET') return;
            const e = {at: Date.now(), op: r.request().headers()['x-http-method-override'] || r.request().method(),
                url: u.replace(/^https?:\/\/[^/]+/, '').split('?')[0], status: r.status()};
            traffic.push(e);
            if (r.status() >= 400) e.body = flat(await r.text().catch(() => null), 400);
        });
        page.on('requestfailed', (r) => {
            const u = r.url();
            if (!/\/api\/v1\//.test(u)) return;
            traffic.push({at: Date.now(), op: r.headers()['x-http-method-override'] || r.method(), url: u.replace(/^https?:\/\/[^/]+/, '').split('?')[0], status: 0, failure: r.failure() && r.failure().errorText});
        });
        page.on('pageerror', (e) => errs.push({at: Date.now(), type: 'pageerror', text: flat(e.message, 300)}));
        page.on('console', (m) => { if (m.type() === 'error') errs.push({at: Date.now(), type: 'console', text: flat(m.text(), 300)}); });
        page.on('dialog', async (d) => {
            dialogs.push({at: Date.now(), type: d.type(), message: flat(d.message(), 300)});
            if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
        });
        let t0 = null;
        const rel = (x) => (t0 === null ? null : Math.round((x - t0) / 100) / 10); // seconds from the triggering Continue
        const writes = (from = 0) => traffic.filter((x) => x.at >= from).map((x) => ({op: x.op, url: x.url, status: x.status, atS: rel(x.at), body: x.body, failure: x.failure}));
        const footerAll = [];
        const harvest = async () => { footerAll.push(...(await page.evaluate(() => window.__u21footer || []).catch(() => [])).map((x) => ({atS: rel(x.at), text: x.text}))); };
        const footer = () => page.locator('.submissionWizard__footer');
        const footerText = async () => flat(await page.locator('.submissionWizard__lastSaved').innerText({timeout: 2000}).catch(() => null), 120);
        const cur = () => page.locator('.pkpSteps__step__label--current');
        const curText = async () => flat(await cur().innerText().catch(() => ''), 80);
        let n = 0;
        const snap = async (name, extra) => {
            let s;
            try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 300), text: {}}; }
            if (extra) s.facts = extra;
            const id = `${v}-${String(++n).padStart(2, '0')}-${name}`;
            record(id, s);
            await shot(page, id).catch(() => {});
            return s;
        };
        async function nextStepName() {
            const labels = (await page.locator('.pkpSteps__step__label').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ').trim());
            const c = await curText();
            const k = labels.findIndex((l) => l === c);
            return k >= 0 && labels[k + 1] ? labels[k + 1].replace(/^\d+\s*/, '') : null;
        }
        async function pressContinue() {
            const next = await nextStepName();
            await footer().getByRole('button', {name: 'Continue', exact: true}).click({timeout: 10000});
            if (next) await cur().filter({hasText: endAnchored(next)}).waitFor({timeout: 10000}).catch(() => {});
            await idle(page).catch(() => {});
            return next;
        }
        async function railTo(label) {
            for (let attempt = 0; attempt < 3; attempt++) {
                if (await page.locator('.pkpSteps--collapsed').count()) await page.locator('.pkpSteps__controls button').click().catch(() => {});
                await page.locator('button.pkpSteps__step__label').filter({hasText: endAnchored(label)}).first().click();
                try { await cur().filter({hasText: endAnchored(label)}).waitFor({timeout: 5000}); return; } catch (e) { if (attempt === 2) throw e; }
            }
        }
        async function continueUntil(label, beforeEach) {
            for (let i = 0; i < 8 && !endAnchored(label).test(await curText()); i++) {
                if (beforeEach) await beforeEach(await curText());
                await pressContinue();
            }
            return curText();
        }
        async function typeRich(id, text) {
            await page.locator(`#${id}_ifr`).waitFor({state: 'visible', timeout: T});
            await waitForEditorReady(page, id);
            await page.frameLocator(`#${id}_ifr`).locator('body').click();
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Delete');
            await page.keyboard.type(text);
        }
        const richValue = (id) => page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent({format: 'text'}) : null), id).catch(() => null);
        const relationNone = async (c) => {
            if (!isOPS || !/For Readers\s*$/.test(c)) return;
            const radios = page.locator('input[name="relationStatus"]');
            if (!(await radios.count())) return;
            const checked = await radios.evaluateAll((els) => els.some((e) => e.checked));
            if (!checked) await page.getByRole('radio', {name: 'This preprint has not been published elsewhere.', exact: true}).check().catch(() => {});
        };
        const errDialog = () => page.getByRole('dialog').filter({hasText: /An unexpected error has occurred/});
        async function readControls() {
            const btn = async (scope, name) => {
                const b = scope.getByRole('button', {name, exact: true});
                const c = await b.count();
                if (!c) return 'absent';
                return (await b.first().isDisabled().catch(() => null)) ? 'disabled' : 'enabled';
            };
            const header = page.locator('.pkpHeader, .app__pageHeading, .pkpPageHeader').first();
            return {
                submit: await btn(footer(), 'Submit'),
                saveForLaterFooter: await btn(footer(), 'Save for Later'),
                saveForLaterAll: await page.getByRole('button', {name: 'Save for Later', exact: true}).evaluateAll((els) => els.map((e) => e.disabled)).catch(() => null),
                back: await btn(footer(), 'Back'),
                cancel: await btn(page, 'Cancel'),
                cont: await btn(footer(), 'Continue'),
                footer: await footerText(),
            };
        }
        const VOR_BARE = `10.1234/${t}`;
        const VOR_URL = `https://doi.org/10.1234/${t}`;
        const COVERAGE = `Coverage typed by the author ${t}`;
        const LATER_TITLE = `I01 later edit after the refusal ${t}`;
        const REFS = `Reference one for ${t}. 2020.\nReference two for ${t}. 2021.`;
        try {
            await signIn(page, C.author, {contextPath: C.path});
            await idle(page).catch(() => {});
            await page.goto(app.url(`/index.php/${C.path}/submission?id=${D.submissionId}`));
            await page.locator('.pkpSteps').waitFor({timeout: T});
            await idle(page);
            o.stepOnOpen = await curText();
            await snap('open', {footer: await footerText()});
            await continueUntil('Details');
            await snap('details', {footer: await footerText()});
            o.detailsFields = await page.locator('main').innerText().then((s) => (s.match(/Plain Language Summary[^\n]*|Coverage[^\n]*/gi) || []).slice(0, 6)).catch(() => null);
            let trigger; // the Continue whose save is judged
            if (v === 'pls' || v === 'cov') {
                await typeRich(PLS_ID, `A short plain summary ${t}`);
                const s0 = Date.now();
                await pressContinue();
                await sleep(2500);
                o.detailsSave = writes(s0);
                await continueUntil(editorsStep);
                await idle(page);
                const box = page.locator('[id$="coverage-control-en"]').first();
                await box.waitFor({timeout: T});
                await loc(page, `"Coverage" box on "${editorsStep}"`, box);
                await box.fill(COVERAGE);
                await box.blur().catch(() => {});
                await snap('editors-typed', {footer: await footerText()});
                trigger = editorsStep;
            } else if (v === 'refs' || v === 'refsctl') {
                await typeRich(PLS_ID, `A short plain summary ${t}`);
                const refs = page.getByRole('textbox', {name: 'References', exact: true});
                await loc(page, 'the "References" box on "Details"', refs);
                await refs.fill(REFS);
                await refs.blur().catch(() => {});
                await snap('details-typed', {footer: await footerText()});
                trigger = 'Details';
            } else if (v === 'relreq') {
                await continueUntil(editorsStep);
                await idle(page);
                await page.getByRole('radio', {name: 'This preprint has not been published elsewhere.', exact: true}).check();
                await snap('readers-typed', {footer: await footerText()});
                trigger = editorsStep;
            } else if (v.startsWith('vordoi')) {
                await continueUntil(editorsStep);
                await idle(page);
                await page.getByRole('radio', {name: 'This preprint has been published elsewhere.', exact: true}).check();
                const box = page.locator('input[name="vorDoi"]').first();
                await box.waitFor({timeout: T});
                await loc(page, 'wizard "DOI of the published preprint" box', box);
                await box.fill(v === 'vordoiurl' ? VOR_URL : VOR_BARE);
                await box.blur().catch(() => {});
                await snap('readers-typed', {footer: await footerText()});
                trigger = editorsStep;
            } else {
                await typeRich(TITLE_ID, `I01 ${v} title changed ${t}`);
                await snap('details-typed', {footer: await footerText()});
                trigger = 'Details';
                if (v.startsWith('inj')) {
                    let used = false;
                    await page.route((url) => PUB_WRITE.test(url.pathname), async (route) => {
                        const r = route.request();
                        if (used || r.method() !== 'POST' || (r.headers()['x-http-method-override'] || '') !== 'PUT') return route.continue();
                        used = true;
                        o.injected = {at: Date.now(), kind: v};
                        if (v.startsWith('inj400')) return route.fulfill({status: 400, contentType: 'application/json', body: JSON.stringify({title: {en: ['Injected refusal u21i01']}})});
                        if (v === 'inj500') return route.fulfill({status: 500, contentType: 'application/json', body: JSON.stringify({error: 'injected u21i01'})});
                        return route.abort('failed');
                    });
                }
            }
            // ---- the judged Continue
            o.triggerStep = await curText();
            t0 = Date.now();
            o.movedTo = await pressContinue();
            o.stepAfterContinue = await curText();
            await sleep(1500);
            o.save = writes(t0).filter((x) => PUB_WRITE.test(x.url));
            o.errorDialogAt1s = (await errDialog().isVisible().catch(() => false)) ? flat(await errDialog().innerText().catch(() => null), 300) : null;
            o.footerAt1s = await footerText();
            o.controlsAt1s = await readControls();
            await snap('after-continue', {save: o.save, footer: o.footerAt1s, errorDialog: o.errorDialogAt1s});
            await sleep(5000); // past the 4 s reconnect timer
            o.footerAt6s = await footerText();
            o.errorDialogAt6s = (await errDialog().isVisible().catch(() => false));
            o.errorsBy6s = errs.filter((x) => x.at >= t0).map((x) => ({...x, atS: rel(x.at)}));
            await snap('after-6s', {footer: o.footerAt6s});
            if (o.errorDialogAt6s) {
                await loc(page, 'the "Error" dialog\'s OK', errDialog().getByRole('button', {name: 'OK', exact: true}));
                await errDialog().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
                await sleep(2000);
                o.footerAfterOk = await footerText();
                o.controlsAfterOk = await readControls();
                await snap('after-ok', {footer: o.footerAfterOk});
            }
            await sleep(20000);
            o.writes25s = writes(t0);
            o.footerAt28s = await footerText();
            o.controlsAt28s = await readControls();
            await snap('after-28s', {footer: o.footerAt28s, writes: o.writes25s});
            // ---- a later edit in the same visit, after the refusal (inj400more: a new Title on "Details";
            // vordoifix: the full address in the DOI box): is it sent?
            if (v === 'inj400more' || v === 'vordoifix') {
                const target = v === 'inj400more' ? 'Details' : editorsStep;
                await railTo(target);
                await idle(page).catch(() => {});
                if (v === 'inj400more') await typeRich(TITLE_ID, LATER_TITLE);
                else {
                    const box = page.locator('input[name="vorDoi"]').first();
                    o.laterBoxBefore = await box.inputValue({timeout: 5000}).catch(() => null);
                    o.laterRelationBefore = await page.locator('input[name="relationStatus"]').evaluateAll((els) => els.filter((e) => e.checked).map((e) => e.value)).catch(() => null);
                    await box.fill(VOR_URL);
                    await box.blur().catch(() => {});
                }
                await snap('later-typed', {footer: await footerText()});
                const l0 = Date.now();
                o.laterMovedTo = await pressContinue();
                await sleep(8000);
                o.laterWrites = writes(l0);
                o.laterFooter = await footerText();
                o.laterControls = await readControls();
                o.laterErrorDialog = await errDialog().isVisible().catch(() => false);
                await snap('later-continue', {writes: o.laterWrites, footer: o.laterFooter});
            }
            // ---- on to Review
            o.reviewPath = [];
            await continueUntil('Review', async (c) => { o.reviewPath.push(c); await relationNone(c); });
            await sleep(8000);
            const rv = await snap('review');
            const main = (rv.text && rv.text.main) || '';
            o.reviewChecking = /Checking your submission/.test(main);
            o.reviewErrors = (main.match(/[^\n]*(required|too long|valid URL|not valid|must)[^\n]*/gi) || []).slice(0, 8);
            o.reviewCoverage = main.includes(COVERAGE);
            o.reviewVor = main.includes(VOR_BARE) || main.includes(VOR_URL);
            o.controlsOnReview = await readControls();
            o.errorsAll = errs.filter((x) => x.at >= t0).map((x) => ({...x, atS: rel(x.at)}));
            o.dialogsBefore = dialogs.slice();
            await harvest();
            // ---- leave by reload
            const r0 = Date.now();
            await page.reload();
            await page.locator('.pkpSteps').waitFor({timeout: T});
            await idle(page).catch(() => {});
            await sleep(1500);
            o.leaveDialogs = dialogs.filter((x) => x.at >= r0);
            const unsaved = page.getByRole('dialog').filter({hasText: /Unsaved Changes/});
            o.unsavedDialog = (await unsaved.isVisible().catch(() => false)) ? flat(await unsaved.innerText().catch(() => null), 400) : null;
            await snap('reload', {unsaved: o.unsavedDialog});
            if (o.unsavedDialog) {
                const y = Date.now();
                await unsaved.getByRole('button', {name: 'Yes', exact: true}).click().catch(() => {});
                await sleep(6000);
                o.afterYes = {stillOpen: await unsaved.isVisible().catch(() => false), writes: writes(y), footer: await footerText(),
                    errors: errs.filter((x) => x.at >= y).map((x) => x.text), errorDialog: await errDialog().isVisible().catch(() => false)};
                await snap('after-yes', o.afterYes);
                if (o.afterYes.errorDialog) await errDialog().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
            }
            o.stepOnReload = await curText();
            // read the triggering field back on its step
            const tick = v.startsWith('vordoi') ? null : relationNone; // A10 (U75): the radios reopen blank; a tick would overwrite the saved answer
            await continueUntil(trigger, tick);
            await idle(page).catch(() => {});
            await sleep(1000);
            if (trigger === 'Details') {
                await waitForEditorReady(page, TITLE_ID).catch(() => {});
                o.readBack = {title: await richValue(TITLE_ID)};
                if (v === 'refs' || v === 'refsctl') {
                    await waitForEditorReady(page, PLS_ID).catch(() => {});
                    o.readBack.summary = await richValue(PLS_ID);
                    o.readBack.references = await page.getByRole('textbox', {name: 'References', exact: true}).inputValue({timeout: 5000}).catch(() => null);
                }
            } else if (v.startsWith('vordoi') || v === 'relreq') {
                await page.locator('input[name="relationStatus"]').first().waitFor({state: 'attached', timeout: 15000}).catch(() => {});
                await sleep(1000);
                o.readBack = {relation: await page.locator('input[name="relationStatus"]').evaluateAll((els) => els.filter((e) => e.checked).map((e) => e.value)).catch(() => null),
                    vorDoi: await page.locator('input[name="vorDoi"]').first().inputValue({timeout: 2000}).catch(() => null)};
            } else {
                o.readBack = {coverage: await page.locator('[id$="coverage-control-en"]').first().inputValue({timeout: 5000}).catch(() => null)};
            }
            await snap('readback', o.readBack);
            await continueUntil('Review', tick);
            await sleep(8000);
            const rv2 = await snap('review-after-reload');
            const m2 = (rv2.text && rv2.text.main) || '';
            const ri = m2.indexOf('Relation status');
            o.reviewAfterReload = {checking: /Checking your submission/.test(m2), controls: await readControls(),
                relationPanel: ri >= 0 ? flat(m2.slice(ri, ri + 160), 160) : null, title: m2.includes(LATER_TITLE) ? 'later' : undefined};
            await harvest();
            o.footerLog = footerAll;
            o.allWrites = writes(t0);
            o.dialogs = dialogs;
            o.errorsAll = errs.filter((x) => x.at >= t0).map((x) => ({...x, atS: rel(x.at)}));
        } catch (e) {
            o.error = flat(e.stack || e.message, 1200);
            o.allWrites = writes(t0 || 0);
            o.errorsAll = errs.map((x) => ({...x, atS: rel(x.at)}));
            await harvest();
            o.footerLog = footerAll;
            await snap('error').catch(() => {});
        } finally {
            await signOut(page).catch(() => {});
            await close();
        }
        fact(v, o);
        log(app.name, v, JSON.stringify({save: o.save && o.save.map((x) => `${x.status} ${x.body || ''}`), dlg: !!o.errorDialogAt1s, f1: o.footerAt1s, f6: o.footerAt6s, fOk: o.footerAfterOk,
            f28: o.footerAt28s, rev: o.reviewChecking, ctl: o.controlsOnReview, err: (o.errorsAll || []).map((x) => `${x.atS}s ${x.text}`).slice(0, 3), unsaved: !!o.unsavedDialog, rb: o.readBack, rar: o.reviewAfterReload, error: o.error}).slice(0, 2000));
        return o;
    }
    await Promise.all(VARIANTS.map((v, i) => sleep(i * 2000).then(() => drive(v)).catch((e) => log(app.name, v, 'FAILED', e.message))));
});
