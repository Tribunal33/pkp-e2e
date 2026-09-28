// U28 claim check, chunk I28 (housekeeping 2026-09-28): the incidental rows
// L33 (a, b), L54a and L63 of docs/tracking/incidentals.md, driven on OJS and
// OMP (OPS has no reviewer role: nothing to drive there, U28 Purpose).
// Spec: docs/specs/U28-reviewers-review.md, Fields step 3 (the review form's
// questions row, the "Recommendation" row), Rule 7 (the "Review Files"
// link), Rule 13, scenario 8.
//
// Seeds its own scratch context per app and per run: a manager, a section
// editor (stage participant), an author and one external reviewer "Ivy
// Reviewer"; two active review forms, "I28 Required" (a required radio
// group, an optional text box, a required one-line text field) and
// "I28 Optional" (the same three questions, none required). Submissions,
// all on External Review with the section editor as participant:
//   F  Ivy accepted with "I28 Required"   (L33a, L33b)
//   O  Ivy accepted with "I28 Optional"   (L33b control)
//   P  Ivy accepted, free-form, one round file (L54a; L33b free-form control;
//      the step-3 file link of L63)
//   I  Ivy invited, one round file         (L63 on step 1)
//   F2 Ivy accepted with "I28 Required"   (E: answered from the keyboard, submitted)
//   G1–G4 (PARTS=G only) the answered required form submitted after fill() vs
//      keyboard typing, with and without an earlier save (the OMP fill() artefact)
//   H1 form, H2 free-form (PARTS=H only): leaving step 3 with unsaved text by a
//      tab ("Cancel", then "OK") and by the address bar
//
//   RUN=r1 PROBE_FEATURE=U28 PROBE_AGENT=ccI28 node bin/probe.js all shared/playwright/checks/U28/I28/i28.js
//   RUN=r2 …   a second run seeds afresh and writes its facts under its own name
//   PARTS=A,B,C,D,E,G,H narrows (default all). Runs of this check: r1, r2 (A–E),
//   e1 (E), g1 (G), h1, h2 (H); logs .reports/U28/i28-<run>.log.
//
// No assertions: every screen is recorded with screen()/shot(); the facts
// file `facts-<RUN>-<app>.json` and the console log carry what the report cites.
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const RUN = process.env.RUN || 'r1';
const PARTS = process.env.PARTS ? process.env.PARTS.split(',') : ['A', 'B', 'C', 'D', 'E', 'G', 'H'];
const part = (p) => PARTS.includes(p);
const log = (...a) => console.log(`[${RUN}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s || '').replace(/\n+/g, ' | ').slice(0, n);

async function sect(facts, name, fn) {
    try { await fn(); } catch (e) { facts.failed[name] = String(e).split('\n')[0]; log(`[${name} FAILED]`, String(e).split('\n')[0]); }
}
async function waitTab(page, n) {
    await page.waitForFunction((n) => document.querySelector('[role=tab][aria-selected=true]')?.textContent.trim().startsWith(`${n}.`), n, {timeout: 30000}).catch(() => {});
    await idle(page);
}
async function noLoading(page) {
    await page.waitForFunction(() => !document.querySelector('main')?.innerText.includes('Loading'), null, {timeout: 20000}).catch(() => {});
}
const tabsOf = (page) => page.getByRole('tab').evaluateAll((els) =>
    els.map((e) => `${e.textContent.trim()}:disabled=${e.getAttribute('aria-disabled')}:selected=${e.getAttribute('aria-selected')}`));

// Page notices as they are added (they expire after five seconds).
async function toastWatch(page) {
    await page.evaluate(() => {
        window.__toasts = [];
        if (window.__toastObs) window.__toastObs.disconnect();
        window.__toastObs = new MutationObserver((ms) => {
            for (const m of ms) for (const n of m.addedNodes) {
                if (n.nodeType !== 1) continue;
                const hit = n.matches('.pkpNotification, .ui-pnotify, .pkp_notification') ? n : n.querySelector('.pkpNotification, .ui-pnotify, .pkp_notification');
                if (hit) { const t = (hit.innerText || '').trim(); if (t) window.__toasts.push(t.replace(/\s+/g, ' ').slice(0, 200)); }
            }
        });
        window.__toastObs.observe(document.body, {childList: true, subtree: true});
    });
}
const toasts = (page) => page.evaluate(() => window.__toasts || []);

// Everything on step 3 that could read as a refusal, with where it sits.
async function readErrors(page) {
    return page.evaluate(() => {
        const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
        const inView = (e) => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; };
        const where = (e) => {
            const fs = e.closest('fieldset');
            const sec = e.closest('.section, .pkp_form_section, div[id]');
            return {fieldset: fs ? `${fs.id}|${(fs.querySelector('legend')?.innerText || '').trim().slice(0, 60)}` : null, section: sec ? sec.id : null};
        };
        const labels = [...document.querySelectorAll('label.error, .error:not(fieldset):not(form), .pkpFormField__error, .pkpFieldError')]
            .filter(vis).map((e) => ({tag: e.tagName, cls: e.className, for: e.getAttribute('for'), text: e.innerText.trim().slice(0, 120), inView: inView(e), top: Math.round(e.getBoundingClientRect().top), ...where(e)}));
        const box = document.querySelector('#reviewStep3MessageBox');
        const invalid = [...document.querySelectorAll('[aria-invalid="true"], fieldset.error, .error fieldset')].map((e) => `${e.tagName}#${e.id}${e.name ? '[' + e.name + ']' : ''}`);
        const notices = [...document.querySelectorAll('.pkpNotification, .ui-pnotify, .pkp_notification')].filter(vis).map((e) => e.innerText.trim().replace(/\s+/g, ' ').slice(0, 200));
        const rec = document.querySelector('#reviewerRecommendationId');
        return {
            errorLabels: labels,
            messageBox: box ? {visible: vis(box), inView: vis(box) && inView(box), text: box.innerText.trim().replace(/\s+/g, ' ').slice(0, 300)} : 'absent',
            invalid, notices, scrollY: Math.round(window.scrollY),
            recommendation: rec ? {value: rec.value, text: rec.options[rec.selectedIndex]?.text, ariaInvalid: rec.getAttribute('aria-invalid'), required: rec.required, cls: rec.className} : 'absent',
        };
    });
}
async function readForm(page) {
    return page.evaluate(() => {
        const out = [...document.querySelectorAll('fieldset[id^="reviewFormResponses"], #reviewStep3Form .section')].map((fs) => ({
            id: fs.id, ariaRequired: fs.getAttribute('aria-required'),
            text: fs.innerText.trim().replace(/\s+/g, ' ').slice(0, 160),
            req: [...fs.querySelectorAll('.req, abbr, [class*=required]')].map((r) => r.textContent.trim()),
            inputs: [...fs.querySelectorAll('input, textarea, select')].map((i) => `${i.tagName.toLowerCase()}[${i.type}] ${i.name}${i.checked ? ' checked' : ''}${i.value && i.type !== 'radio' ? ' =' + i.value.slice(0, 40) : ''}${i.required ? ' required' : ''}`),
        }));
        return out.filter((f) => f.inputs.length);
    });
}

forEachApp(async (app) => {
    if (app.name === 'ops') { log('[ops] no reviewer role and no review stage (U28 Purpose): nothing to drive'); return; }
    const facts = {run: RUN, app: app.name, failed: {}};
    const done = (k, v) => { facts[k] = v; log(`[${k}]`, app.name, JSON.stringify(v).slice(0, 2500)); };
    const snap = async (page, name) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        record(`${RUN}-${name}`, s); await shot(page, `${RUN}-${name}`).catch(() => {});
        return s;
    };

    // ---- seed ------------------------------------------------------------------
    const t = tag('u28i28');
    const U = {mgr: `${t}mgr`, se: `${t}se`, au: `${t}au`, rv: `${t}rv`};
    const Q = (required) => [
        {question: 'Is the method sound?', type: 'radiobuttons', required, options: ['Yes', 'No']},
        {question: 'Further remarks', type: 'textarea'},
        {question: 'One-line verdict', type: 'textfield', required},
    ];
    const ctx = await app.api.createContext({
        tag: t,
        context: {name: `I28 journal ${t}`, contactName: 'I28 Contact', contactEmail: `${t}contact@mail.test`},
        users: [
            {username: U.mgr, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
            {username: U.se, roles: ['sectionEditor'], givenName: 'Sam', familyName: 'Editor'},
            {username: U.au, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
            {username: U.rv, roles: ['externalReviewer'], givenName: 'Ivy', familyName: 'Reviewer'},
        ],
        reviewForms: [
            {title: 'I28 Required', description: 'I28 required form description.', elements: Q(true)},
            {title: 'I28 Optional', description: 'I28 optional form description.', elements: Q(false)},
        ],
    });
    const cp = ctx.path || t;
    const sub = async (key, reviewer, extra = {}) => {
        const r = await app.api.createSubmission({
            tag: `${t}${key}`, context: cp, submitter: U.au, title: `I28 ${key} ${t}`,
            decisions: ['sendExternalReview'],
            participants: [{username: U.se, role: 'sectionEditor'}],
            reviewRounds: [{reviewers: [{username: U.rv, ...reviewer}], ...extra}],
        });
        return r.submissionId;
    };
    const S = {
        F: await sub('f', {status: 'accepted', reviewForm: 'I28 Required'}),
        O: await sub('o', {status: 'accepted', reviewForm: 'I28 Optional'}),
        P: await sub('p', {status: 'accepted'}, {files: [{file: 'article.pdf'}]}),
        I: await sub('i', {status: 'invited'}, {files: [{file: 'article.pdf'}]}),
        F2: await sub('f2', {status: 'accepted', reviewForm: 'I28 Required'}),
        ...(part('G') ? {G1: await sub('g1', {status: 'accepted', reviewForm: 'I28 Required'}),
            G2: await sub('g2', {status: 'accepted', reviewForm: 'I28 Required'}),
            G3: await sub('g3', {status: 'accepted', reviewForm: 'I28 Required'}),
            G4: await sub('g4', {status: 'accepted', reviewForm: 'I28 Required'})} : {}),
        ...(part('H') ? {H1: await sub('h1', {status: 'accepted', reviewForm: 'I28 Required'}),
            H2: await sub('h2', {status: 'accepted'})} : {}),
    };
    done('seed', {context: cp, subs: S});
    const wizard = (id, step) => app.url(`/index.php/${cp}/reviewer/submission/${id}${step ? `?step=${step}` : ''}`);

    const {page, close} = await launch(app);
    const dialogs = [];
    let dismissNext = false;   // H: answer the next confirm() with "Cancel"
    page.on('dialog', async (d) => {
        const cancel = dismissNext && d.type() === 'confirm'; if (cancel) dismissNext = false;
        dialogs.push({type: d.type(), message: d.message().slice(0, 200), url: page.url(), answered: cancel ? 'Cancel' : 'OK'});
        if (cancel) await d.dismiss().catch(() => {}); else await d.accept().catch(() => {});
    });
    const saveSteps = [];
    page.on('response', (r) => { if (/saveStep/.test(r.url())) saveSteps.push({status: r.status(), method: r.request().method(), url: r.url().replace(/^.*\/reviewer\//, 'reviewer/')}); });
    const takeSaves = () => saveSteps.splice(0);
    const consoleAll = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) consoleAll.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
    page.on('pageerror', (e) => consoleAll.push(`pageerror: ${String(e.message).slice(0, 200)}`));
    const takeConsole = () => consoleAll.splice(0);

    const toStep3 = async (id, label) => {
        await page.goto(wizard(id)); await idle(page); await noLoading(page);
        const tabs0 = await tabsOf(page);
        const s1 = page.getByRole('button', {name: 'Save and continue', exact: true});
        if (await s1.isVisible().catch(() => false)) { await s1.click(); await waitTab(page, 2); }
        await page.getByRole('button', {name: 'Continue to Step #3'}).click(); await waitTab(page, 3);
        await page.locator('form#reviewStep3Form').waitFor({timeout: 30000}); await noLoading(page);
        await page.waitForFunction(() => { const m = window.tinymce || window.tinyMCE; return !m || m.get().every((e) => e.initialized); }, null, {timeout: 30000}).catch(() => {});
        await idle(page);
        log(`[${label} landing tabs]`, JSON.stringify(tabs0), '→', JSON.stringify(await tabsOf(page)));
    };
    const reloadStep3 = async (id) => {
        await page.goto(wizard(id, 3)); await idle(page); await noLoading(page);
        await page.locator('form#reviewStep3Form').waitFor({timeout: 30000}).catch(() => {});
        await page.waitForFunction(() => { const m = window.tinymce || window.tinyMCE; return !m || m.get().every((e) => e.initialized); }, null, {timeout: 30000}).catch(() => {});
        await idle(page);
    };
    const pressSubmitOK = async (label) => {
        takeSaves();
        await page.getByRole('button', {name: 'Submit Review'}).click();
        const conf = page.getByRole('dialog').filter({hasText: /Are you sure/}).last();
        const shown = await conf.waitFor({timeout: 15000}).then(() => true).catch(() => false);
        const confText = shown ? flat(await conf.innerText(), 200) : null;
        if (shown) {
            await snap(page, `${label}-confirm`);
            await toastWatch(page);
            await conf.getByRole('button', {name: 'OK', exact: true}).click();
            await conf.waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
        }
        await sleep(3000); await idle(page);
        const out = {confirm: confText, tabs: await tabsOf(page), url: page.url().replace(/^.*\/reviewer\//, 'reviewer/'), errors: await readErrors(page), saveStep: takeSaves(), toasts: await toasts(page).catch(() => []), console: takeConsole()};
        await snap(page, label);
        await page.screenshot({path: path.join(outDir(), `${RUN}-${label}-viewport-${app.name}.png`)}).catch(() => {});
        return out;
    };
    const saveForLater = async (label) => {
        takeSaves();
        await toastWatch(page);
        await page.getByRole('button', {name: 'Save for Later'}).click();
        await page.waitForFunction(() => (window.__toasts || []).length > 0, null, {timeout: 8000}).catch(() => {});
        await sleep(1500); await idle(page);
        const out = {toasts: await toasts(page).catch(() => []), errors: await readErrors(page), saveStep: takeSaves(), tabs: await tabsOf(page), console: takeConsole()};
        await snap(page, label);
        return out;
    };
    const remarks = () => page.locator('fieldset[id^="reviewFormResponses"] textarea, #reviewStep3Form textarea[name^="reviewFormResponses"]').first();

    try {
        await signIn(page, U.rv);

        // ---- A: required form (L33a, L33b) ---------------------------------------
        if (part('A')) await sect(facts, 'A', async () => {
            await toStep3(S.F, 'A');
            await snap(page, 'a-step3-required-form');
            done('A1-form', await readForm(page));
            await loc(page, 'step 3 › review form › required question group', page.locator('fieldset[id^="reviewFormResponses"][aria-required="true"]').first());
            if (app.name === 'ojs') await page.locator('select#reviewerRecommendationId').selectOption({index: 1});
            done('A2-submit-unanswered', await pressSubmitOK('a-submit-unanswered'));
            // same page, no reload: Save for Later with the refusal still shown
            await remarks().fill('I28 remarks saved after refusal');
            done('A3-save-after-refusal', await saveForLater('a-save-after-refusal'));
            await reloadStep3(S.F);
            await snap(page, 'a-save-after-refusal-reload');
            done('A3r-reload', {form: await readForm(page), errors: await readErrors(page)});
            // fresh load: Save for Later with the required questions unanswered, no refusal before
            await remarks().fill('I28 remarks second save');
            done('A4-save-fresh', await saveForLater('a-save-fresh'));
            await reloadStep3(S.F);
            await snap(page, 'a-save-fresh-reload');
            done('A4r-reload', {form: await readForm(page), errors: await readErrors(page)});
            // leave the tabbed step once with something unsaved
            dialogs.splice(0);
            await remarks().fill('I28 unsaved text');
            await remarks().blur();
            await page.getByRole('tab', {name: '2. Guidelines'}).click(); await idle(page); await sleep(800);
            const afterTab = {tabs: await tabsOf(page), dialogs: dialogs.splice(0)};
            await snap(page, 'a-leave-tab-unsaved');
            await page.goto(app.url(`/index.php/${cp}/dashboard/reviewAssignments`)).catch((e) => afterTab.gotoError = String(e.message).slice(0, 120));
            await idle(page);
            afterTab.leaveDialogs = dialogs.splice(0); afterTab.urlAfterLeave = page.url();
            await reloadStep3(S.F);
            afterTab.remarksAfterReturn = await remarks().inputValue().catch(() => null);
            done('A5-leave-unsaved', afterTab);
            // answer the two required questions and submit
            await page.locator('fieldset[id^="reviewFormResponses"] input[type=radio]').first().check();
            await page.locator('#reviewStep3Form input[type=text][name^="reviewFormResponses"]').first().fill('Sound.');
            if (app.name === 'ojs') await page.locator('select#reviewerRecommendationId').selectOption({index: 1});
            done('A6-inputs', await page.locator('#reviewStep3Form [name^="reviewFormResponses"]').evaluateAll((els) => els.map((e) => `${e.tagName.toLowerCase()}[${e.type}] ${e.name} id=${e.id} value=${JSON.stringify(e.value)} checked=${e.checked}`)));
            done('A6-submit-answered', await pressSubmitOK('a-submit-answered'));
        });

        // ---- B: optional form control (L33b) ---------------------------------------
        if (part('B')) await sect(facts, 'B', async () => {
            await toStep3(S.O, 'B');
            await snap(page, 'b-step3-optional-form');
            done('B1-form', await readForm(page));
            await remarks().fill('I28 optional remarks');
            done('B2-save', await saveForLater('b-save'));
            await reloadStep3(S.O);
            await snap(page, 'b-save-reload');
            done('B2r-reload', {form: await readForm(page), errors: await readErrors(page)});
            if (app.name === 'ojs') await page.locator('select#reviewerRecommendationId').selectOption({index: 1});
            done('B3-submit-unanswered', await pressSubmitOK('b-submit-unanswered'));
        });

        // ---- C: free-form (L54a on OJS; L33b free-form control; step-3 file link) ---
        if (part('C')) await sect(facts, 'C', async () => {
            await toStep3(S.P, 'C');
            await snap(page, 'c-step3-free-form');
            const link3 = page.locator('main a').filter({hasText: /article/}).first();
            done('C0-step3-file-link', {count: await page.locator('main a').filter({hasText: /article/}).count(),
                attrs: await link3.evaluate((a) => ({text: a.innerText.trim(), target: a.getAttribute('target'), hasTargetAttr: a.hasAttribute('target'), rel: a.getAttribute('rel'), download: a.getAttribute('download'), href: a.getAttribute('href')?.replace(/^.*index\.php/, 'index.php')})).catch((e) => String(e.message).slice(0, 80))});
            done('C1-save-empty', await saveForLater('c-save-empty'));
            const ae = page.frameLocator('iframe[id^="comments"]:not([id^="commentsPrivate"])').locator('body');
            await ae.click(); await page.keyboard.type('I28 comment for author and editor.');
            const recOpts = app.name === 'ojs' ? await page.locator('select#reviewerRecommendationId option').allTextContents() : null;
            done('C2-before-submit', {recommendationOptions: recOpts, errors: await readErrors(page)});
            await loc(page, 'step 3 › "Recommendation" list', page.locator('select#reviewerRecommendationId'));
            done('C3-submit-choose-one', await pressSubmitOK('c-submit-choose-one'));
            if (app.name === 'ojs') {
                await sleep(3000);
                done('C3b-after-3s-more', {errors: await readErrors(page), tabs: await tabsOf(page)});
                // a second press on the same page, still "Choose One"
                done('C4-second-submit-choose-one', await pressSubmitOK('c-second-submit-choose-one'));
                await page.locator('select#reviewerRecommendationId').selectOption({label: 'Revisions Required'});
                done('C5-submit-chosen', await pressSubmitOK('c-submit-chosen'));
            }
        });

        // ---- D: step-1 file link of an invited request (L63) -------------------------
        if (part('D')) await sect(facts, 'D', async () => {
            await page.goto(wizard(S.I)); await idle(page); await noLoading(page);
            await page.locator('main a').filter({hasText: /article/}).first().waitFor({timeout: 30000}).catch(() => {});
            await snap(page, 'd-step1-invited');
            const link = page.locator('main a').filter({hasText: /article/}).first();
            await loc(page, 'step 1 › Review Files › file name link', link);
            const attrs = await link.evaluate((a) => ({text: a.innerText.trim(), target: a.getAttribute('target'), hasTargetAttr: a.hasAttribute('target'), rel: a.getAttribute('rel'), download: a.getAttribute('download'), href: a.getAttribute('href')?.replace(/^.*index\.php/, 'index.php'), cls: a.className}));
            const before = page.url(); const pagesBefore = page.context().pages().length;
            const navs = []; const onNav = (f) => { if (f === page.mainFrame()) navs.push(f.url().replace(/^.*index\.php/, 'index.php')); };
            page.on('framenavigated', onNav);
            const popups = []; const onPage = (p) => popups.push(p.url()); page.context().on('page', onPage);
            const resp = []; const onResp = (r) => { if (/download|file|submissionFile/i.test(r.url())) resp.push({status: r.status(), url: r.url().replace(/^.*index\.php/, 'index.php').slice(0, 160), disposition: r.headers()['content-disposition'] || null, type: r.headers()['content-type'] || null}); };
            page.on('response', onResp);
            const dlP = page.waitForEvent('download', {timeout: 15000}).catch(() => null);
            await link.click();
            const dl = await dlP;
            await sleep(2000);
            page.off('framenavigated', onNav); page.context().off('page', onPage); page.off('response', onResp);
            const after = page.url();
            const out = {attrs, urlBefore: before.replace(/^.*index\.php/, 'index.php'), urlAfter: after.replace(/^.*index\.php/, 'index.php'), urlChanged: before !== after,
                mainFrameNavigations: navs, popups, pagesBefore, pagesAfter: page.context().pages().length,
                download: dl ? {name: dl.suggestedFilename(), failure: await dl.failure().catch(() => 'n/a')} : null, responses: resp, console: takeConsole()};
            // is the step still on screen, unchanged?
            out.stepStillShown = await page.getByRole('button', {name: 'Accept Review, Continue to Step #2'}).isVisible().catch(() => false);
            done('D1-step1-link', out);
            await snap(page, 'd-step1-after-click');
        });

        // ---- E: the required form answered on a fresh load, typed from the keyboard ----
        if (part('E')) await sect(facts, 'E', async () => {
            await toStep3(S.F2, 'E');
            const txt = page.locator('#reviewStep3Form input[type=text][name^="reviewFormResponses"]');
            const dump = () => page.locator('#reviewStep3Form [name^="reviewFormResponses"]').evaluateAll((els) => els.map((e) => `${e.tagName.toLowerCase()}[${e.type}] name=${e.name} id=${e.id} value=${JSON.stringify(e.value)} checked=${e.checked} required=${e.required} visible=${e.getClientRects().length > 0}`));
            done('E0-inputs', await dump());
            await page.locator('fieldset[id^="reviewFormResponses"]').first().getByText('Yes', {exact: true}).click();
            await txt.first().click(); await page.keyboard.type('Sound.'); await page.keyboard.press('Tab');
            if (app.name === 'ojs') await page.locator('select#reviewerRecommendationId').selectOption({index: 1});
            done('E1-typed', {inputs: await dump(), errors: await readErrors(page)});
            await snap(page, 'e-answered-before-submit');
            done('E2-submit-answered', await pressSubmitOK('e-submit-answered'));
        });

        // ---- G: what keeps the answered required form from submitting (A6 on OMP) ----
        //   G1 fresh load, answers filled programmatically; G2 after a saved-for-later
        //   visit, filled; G3 after a saved visit, typed from the keyboard; G4 after a
        //   refused submit and a save, filled.
        if (part('G')) for (const key of ['G1', 'G2', 'G3', 'G4']) await sect(facts, key, async () => {
            const id = S[key];
            await toStep3(id, key);
            if (key === 'G4') { if (app.name === 'ojs') await page.locator('select#reviewerRecommendationId').selectOption({index: 1}); await pressSubmitOK(`g4-refused`); }
            if (key !== 'G1') {
                await remarks().fill(`I28 ${key} remarks`);
                await saveForLater(`${key.toLowerCase()}-save`);
                await reloadStep3(id);
            }
            const txt = page.locator('#reviewStep3Form input[type=text][name^="reviewFormResponses"]').first();
            if (key === 'G3') {
                await page.locator('fieldset[id^="reviewFormResponses"]').first().getByText('Yes', {exact: true}).click();
                await txt.click(); await page.keyboard.type('Sound.'); await page.keyboard.press('Tab');
            } else {
                await page.locator('fieldset[id^="reviewFormResponses"] input[type=radio]').first().check();
                await txt.fill('Sound.');
            }
            if (app.name === 'ojs') await page.locator('select#reviewerRecommendationId').selectOption({index: 1});
            const before = await readErrors(page);
            const r = await pressSubmitOK(`${key.toLowerCase()}-submit-answered`);
            r.validator = await page.evaluate(() => { try { const v = window.jQuery('#reviewStep3Form').validate(); return {errorList: v.errorList.map((e) => `${e.element.name}: ${e.message}`), pending: Object.keys(v.pending || {})}; } catch (e) { return String(e.message); } });
            done(`${key}-result`, {before: before.errorLabels, ...r});
        });

        // ---- H: leaving step 3 with unsaved text: a tab ("Cancel", then "OK") and the address bar ----
        if (part('H')) for (const key of ['H1', 'H2']) await sect(facts, key, async () => {
            const id = S[key];
            await toStep3(id, key);
            const typed = `I28 ${key} unsaved text`;
            const readTyped = async () => (key === 'H1' ? remarks().inputValue().catch(() => null)
                : page.frameLocator('iframe[id^="comments"]:not([id^="commentsPrivate"])').locator('body').innerText().catch(() => null));
            if (key === 'H1') { await remarks().fill(typed); await remarks().blur(); }
            else { const ae = page.frameLocator('iframe[id^="comments"]:not([id^="commentsPrivate"])').locator('body'); await ae.click(); await page.keyboard.type(typed); await page.locator('#reviewStep3Form h2, #reviewStep3Form legend, main h1').first().click().catch(() => {}); }
            dialogs.splice(0);
            dismissNext = true;
            await page.getByRole('tab', {name: '2. Guidelines'}).click(); await idle(page); await sleep(800);
            const cancelled = {dialogs: dialogs.splice(0), tabs: await tabsOf(page), text: await readTyped()};
            dismissNext = false;
            await snap(page, `${key.toLowerCase()}-tab-cancel`);
            await page.getByRole('tab', {name: '2. Guidelines'}).click(); await idle(page); await sleep(800);
            const accepted = {dialogs: dialogs.splice(0), tabs: await tabsOf(page)};
            await snap(page, `${key.toLowerCase()}-tab-ok`);
            await page.getByRole('tab', {name: '3. Download & Review'}).click(); await idle(page); await sleep(1500);
            await page.locator('form#reviewStep3Form').waitFor({timeout: 30000}).catch(() => {});
            accepted.textBackOnStep3 = await readTyped();
            // type again and leave by the address bar
            if (key === 'H1') { await remarks().fill(typed); await remarks().blur(); }
            else { const ae = page.frameLocator('iframe[id^="comments"]:not([id^="commentsPrivate"])').locator('body'); await ae.click(); await page.keyboard.type(' again'); await page.locator('main h1').first().click().catch(() => {}); }
            await page.goto(app.url(`/index.php/${cp}/dashboard/reviewAssignments`)).catch((e) => accepted.gotoError = String(e.message).slice(0, 120));
            await idle(page);
            const left = {dialogs: dialogs.splice(0), url: page.url().replace(/^.*index\.php/, 'index.php')};
            await reloadStep3(id);
            left.textAfterReturn = await readTyped();
            done(`${key}-leave`, {cancelled, accepted, left});
        });
        done('dialogs', dialogs);
        await signOut(page).catch(() => {});
    } finally {
        record(`facts-${RUN}`, facts);
        await close();
    }
});
