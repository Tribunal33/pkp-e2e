// Issue report walk: docs/issues/U21-A6-submitted-twice-empty-problems-banner.md
// (spec U21 register A6). Takes the report's Steps through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"):
//   1-5  an Author (ccorino; OMP aclark) starts "u21w43 Submitted Twice" and goes
//        to "Review" in tab A (../editorial-role-submitter-no-acknowledgement/submit.js,
//        stopAtReview)
//   6    a second tab (B) on the same draft's wizard, "Continue" to "Review"
//   7    tab B: "Submit", "Submit"; "Submission complete"
//   8    tab A: "Submit", "Submit"; what Review shows, and the submit's answer
// Neighbour (the fix must leave it alone): the same author starts
// "u21w43 Missing Abstract", uploads nothing and types no abstract, and goes
// to "Review": the generic problems banner and the item complaints show, and
// "Submit" stays disabled, with the fix in and out.
// The kit builds nothing.
//
// Reset first:  npm run fleet-prep -- --feature issues-w43 --dataset 8 --reset
// Run (main):   PROBE_FEATURE=issues-w43 PROBE_AGENT=w43 node bin/probe.js all shared/playwright/checks/issues/submitted-twice-empty-problems-banner/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w43-3_5 PROBE_AGENT=w43 node bin/probe.js all <this file>
// Facts: .reports/<feature>/w43/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');
const {submitThroughWizard, flat} = require('../editorial-role-submitter-no-acknowledgement/submit.js');

const TAG = 'u21w43';
const AUTHOR = {ojs: 'ccorino', omp: 'aclark', ops: 'ccorino'};
const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** What the Review step shows: the banner, every notice on the step, the Submit button's state. */
async function readReview(page) {
    const step = page.locator('.pkpSteps__step:visible, [role="tabpanel"]:visible').first();
    const banner = page.locator('.submissionWizard__review_errors');
    const notices = await page.locator('.submissionWizard .pkpNotification:visible, .app__main .pkpNotification:visible').allInnerTexts().catch(() => []);
    const submit = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true});
    return {
        current: flat(await page.locator('.pkpSteps__step__label--current').innerText().catch(() => ''), 80),
        banners: (await banner.allInnerTexts().catch(() => [])).map((t) => flat(t, 400)),
        notices: notices.map((t) => flat(t, 400)),
        itemWarnings: (await page.locator('.submissionWizard__reviewEmptyWarning:visible').allInnerTexts().catch(() => [])).map((t) => flat(t, 200)),
        fieldErrors: (await page.locator('.pkpFieldError:visible, .submissionWizard__reviewPanel__item__value .text-negative:visible').allInnerTexts().catch(() => [])).map((t) => flat(t, 200)),
        links: await page.locator('.submissionWizard__review_errors a').evaluateAll((as) => as.map((a) => `${a.textContent.trim()} -> ${a.getAttribute('href')}`)).catch(() => []),
        submitDisabled: await submit.isDisabled().catch(() => null),
        stepText: flat(await step.innerText().catch(() => ''), 600),
    };
}

/** Every write the page sends to the submit endpoint, with its status and body. */
function watchSubmit(page, into, who) {
    page.on('response', async (r) => {
        const q = r.request();
        if (!/\/api\/v1\/submissions\/\d+\/submit/.test(r.url())) return;
        let body = null;
        try { body = flat(await r.text(), 600); } catch (e) { body = null; }
        into.push({who, method: q.method(), override: q.headers()['x-http-method-override'] || null,
            validateOnly: /_validateOnly/.test(q.postData() || ''), status: r.status(), body});
    });
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${flat(JSON.stringify(v), 1500)}`); };
    let n = 0;
    const rec = async (page, label) => {
        const name = `w43-${String(++n).padStart(2, '0')}-${label}`;
        try { const s = await screen(page); record(name, s); await shot(page, name).catch(() => {}); return s; }
        catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); return null; }
    };
    const errors = [];
    const submits = [];
    const watch = (page, who) => {
        page.on('pageerror', (e) => errors.push({who, kind: 'pageerror', text: flat(e.message, 300)}));
        page.on('console', (m) => { if (m.type() === 'error') errors.push({who, kind: 'console', text: flat(m.text(), 300)}); });
        page.on('response', (r) => { if (r.status() >= 400) errors.push({who, kind: 'http', text: `${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '').replace(/csrfToken=[^&]+/, 'csrf').slice(0, 200)}`}); });
        watchSubmit(page, submits, who);
    };
    const who = AUTHOR[app.name];
    const line = app.line || 'main';
    const loc = line === 'main' || line === 'stable-3_5_0' ? '/en' : '';

    try {
        const {page: tabA, close} = await launch(app);
        tabA.setDefaultTimeout(T);
        watch(tabA, 'tab A');
        try {
            // Steps 1-5: tab A, a new draft taken to "Review".
            await signIn(tabA, who);
            const draft = await submitThroughWizard(app, tabA, {title: `${TAG} Submitted Twice`, rec, label: 's5-tabA', stopAtReview: true});
            fact('steps 1-5 tab A on Review', {id: draft.id, steps: draft.steps, review: await readReview(tabA)});

            // Step 6: tab B, the same draft's wizard, "Continue" to "Review".
            const tabB = await tabA.context().newPage();
            tabB.setDefaultTimeout(T);
            watch(tabB, 'tab B');
            await submitThroughWizard(app, tabB, {title: null, rec, label: 's6-tabB', stopAtReview: true, existingId: draft.id});
            fact('step 6 tab B on Review', await readReview(tabB));

            // Step 7: tab B submits.
            await tabB.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true}).click();
            const dialogB = tabB.getByRole('dialog').filter({has: tabB.getByRole('button', {name: 'Submit', exact: true})}).last();
            await dialogB.waitFor();
            await dialogB.getByRole('button', {name: 'Submit', exact: true}).click();
            await tabB.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: 45_000});
            await idle(tabB);
            const doneB = await rec(tabB, 's7-tabB-complete');
            fact('step 7 tab B', {url: tabB.url().replace(/^https?:\/\/[^/]+/, ''), heading: flat(doneB && doneB.text && doneB.text.main, 200)});

            // Step 8: tab A, still on "Review", submits.
            await tabA.bringToFront();
            const before = await readReview(tabA);
            await tabA.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true}).click();
            const dialogA = tabA.getByRole('dialog').filter({has: tabA.getByRole('button', {name: 'Submit', exact: true})}).last();
            await dialogA.waitFor();
            const dialogText = flat(await dialogA.innerText().catch(() => ''), 400);
            await dialogA.getByRole('button', {name: 'Submit', exact: true}).click();
            await dialogA.waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await idle(tabA);
            await pause(1500);
            const s8 = await rec(tabA, 's8-tabA-after-submit');
            fact('step 8 tab A', {before: {banners: before.banners, submitDisabled: before.submitDisabled}, dialogText,
                url: tabA.url().replace(/^https?:\/\/[^/]+/, ''), after: await readReview(tabA),
                notices: (s8 && s8.notices) || []});
            fact('submit answers', submits);
            fact('db (Evidence)', sql(app, `select submission_id || ' progress=' || coalesce(submission_progress, '<null>') || ' status=' || status || ' submitted=' || coalesce(date_submitted::text, '<null>') from submissions where submission_id = ${draft.id}`).trim());
            await tabB.close();

            // Neighbour: a draft with real problems still gets the generic banner and its complaints.
            submits.length = 0;
            await tabA.goto(app.url(`/index.php/${app.contextPath}${loc}/submission`));
            const {waitForEditorReady, editorIdOf} = require('../../../support/richtext.js');
            await idle(tabA);
            const iframe = tabA.locator('iframe.tox-edit-area__iframe').first();
            await waitForEditorReady(tabA, await editorIdOf(iframe));
            const body = iframe.contentFrame().locator('body');
            await body.click();
            await body.fill(`${TAG} Missing Abstract`);
            const SECTION = {ojs: 'Articles', omp: 'Library & Information Studies', ops: 'Preprints'};
            const radio = tabA.getByRole('radio', {name: SECTION[app.name], exact: true});
            if (await radio.isVisible().catch(() => false)) await radio.check();
            const english = tabA.getByRole('radio', {name: 'English', exact: true});
            if (await english.isVisible().catch(() => false)) await english.check();
            for (const box of await tabA.getByRole('checkbox').all()) {
                if ((await box.isVisible()) && !(await box.isChecked())) await box.check();
            }
            await tabA.getByRole('button', {name: 'Begin Submission'}).click();
            await tabA.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
            await tabA.locator('.pkpSteps').waitFor();
            await idle(tabA);
            const cur = tabA.locator('.pkpSteps__step__label--current');
            for (let i = 0; i < 9; i++) {
                const step = flat(await cur.innerText().catch(() => ''));
                if (/Review$/.test(step) && !/Suggestions/.test(step)) break;
                const relation = tabA.getByRole('radio', {name: 'This preprint has not been published elsewhere.'});
                if (await relation.isVisible().catch(() => false)) await relation.check();
                await tabA.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true}).click();
                await tabA.waitForFunction((prev) => {
                    const el = document.querySelector('.pkpSteps__step__label--current');
                    return el && el.textContent.replace(/\s+/g, ' ').trim() !== prev;
                }, step, {timeout: T}).catch(() => {});
                await idle(tabA);
            }
            await pause(1500);
            await idle(tabA);
            for (const box of await tabA.getByRole('checkbox').all()) {
                if ((await box.isVisible()) && !(await box.isChecked())) await box.check();
            }
            await rec(tabA, 'n-review-missing-abstract');
            fact('neighbour review', {review: await readReview(tabA), validate: submits.map((s) => ({status: s.status, validateOnly: s.validateOnly, body: s.body}))});
            await signOut(tabA);
        } finally { await close(); }
    } catch (e) {
        fact('walk error', flat(e.stack || e.message, 800));
    } finally {
        fact('errors', errors);
        record('facts', facts);
    }
});
