// Issue report walk, second case: docs/issues/U21-A6-submitted-twice-empty-problems-banner.md
// (spec U21 register A6). The draft's section closes while the author is on "Review":
//   1-4  an Author (ccorino; OMP aclark) starts "u21w43 Section Closed" and goes to
//        "Review" (../editorial-role-submitter-no-acknowledgement/submit.js, stopAtReview)
//   5-7  dbarnes, in a browser of his own: Settings › Journal/Server › "Sections"
//        (OMP: Press › "Series") › the draft's section › "Edit", ticks the
//        editors-only box, "Save"
//   8    the author presses "Submit", then "Submit": what "Review" shows, and the answer
//   9    (OMP) the author opens "For the Editors": the series field's message, if any
//   10   the author reloads the page
// The kit builds nothing.
//
// Reset first:  npm run fleet-prep -- --feature issues-w43 --dataset 8 --reset
// Run (main):   PROBE_RUN=sc PROBE_FEATURE=issues-w43 PROBE_AGENT=w43 node bin/probe.js all shared/playwright/checks/issues/submitted-twice-empty-problems-banner/section-closed.js
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');
const {submitThroughWizard} = require('../editorial-role-submitter-no-acknowledgement/submit.js');
const {restrictSection, flat, pause, T} = require('./lib.js');

const AUTHOR = {ojs: 'ccorino', omp: 'aclark', ops: 'ccorino'};
const SECTION = {ojs: 'Articles', omp: 'Library & Information Studies', ops: 'Preprints'};

async function readReview(page) {
    return {
        current: flat(await page.locator('.pkpSteps__step__label--current').innerText().catch(() => ''), 80),
        banners: (await page.locator('.submissionWizard__review_errors').allInnerTexts().catch(() => [])).map((t) => flat(t, 400)),
        notices: (await page.locator('.app__main .pkpNotification:visible').allInnerTexts().catch(() => [])).map((t) => flat(t, 300)),
        fieldErrors: (await page.locator('.pkpFormFieldError:visible, .pkpFieldError:visible, [class*="FieldError"]:visible').allInnerTexts().catch(() => [])).map((t) => flat(t, 300)),
        submitDisabled: await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true}).isDisabled().catch(() => null),
    };
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('section-closed.js runs on a dataset fleet only');
    const facts = {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${flat(JSON.stringify(v), 1500)}`); };
    let n = 0;
    const rec = async (page, label) => {
        const name = `w43sc-${String(++n).padStart(2, '0')}-${label}`;
        try { const s = await screen(page); record(name, s); await shot(page, name).catch(() => {}); return s; }
        catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); return null; }
    };
    const errors = [];
    const answers = [];
    const watch = (page, who) => {
        page.on('pageerror', (e) => errors.push({who, kind: 'pageerror', text: flat(e.message, 300)}));
        page.on('response', async (r) => {
            if (r.status() >= 400) errors.push({who, kind: 'http', text: `${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 160)}`});
            if (/\/api\/v1\/submissions\/\d+\/submit/.test(r.url())) {
                answers.push({who, validateOnly: /_validateOnly/.test(r.request().postData() || ''), status: r.status(), body: flat(await r.text().catch(() => null), 600)});
            }
        });
    };
    try {
        const author = await launch(app);
        const page = author.page;
        page.setDefaultTimeout(T);
        watch(page, 'author');
        try {
            await signIn(page, AUTHOR[app.name]);
            const draft = await submitThroughWizard(app, page, {title: 'u21w43 Section Closed', rec, label: 's4', stopAtReview: true});
            fact('steps 1-4 on Review', {id: draft.id, steps: draft.steps, review: await readReview(page)});

            const mgr = await launch(app);
            try {
                watch(mgr.page, 'dbarnes');
                await signIn(mgr.page, 'dbarnes');
                const r = await restrictSection(mgr.page, app, SECTION[app.name]);
                await rec(mgr.page, 's7-restricted');
                fact('steps 5-7 restricted', r);
                await signOut(mgr.page);
            } finally { await mgr.close(); }

            await page.bringToFront();
            await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true}).click();
            const dialog = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Submit', exact: true})}).last();
            await dialog.waitFor();
            await dialog.getByRole('button', {name: 'Submit', exact: true}).click();
            await dialog.waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await idle(page);
            await pause(1500);
            await rec(page, 's8-after-submit');
            fact('step 8 after Submit', await readReview(page));

            if (app.name === 'omp') {
                const b = page.locator('button.pkpSteps__step__label').filter({hasText: /For the Editors\s*$/}).first();
                if (await b.count()) await b.click();
                await idle(page);
                await pause(800);
                await rec(page, 's9-for-the-editors');
                fact('step 9 For the Editors', {current: flat(await page.locator('.pkpSteps__step__label--current').innerText().catch(() => ''), 80),
                    fieldErrors: (await page.locator('.pkpFormFieldError:visible, [class*="FieldError"]:visible').allInnerTexts().catch(() => [])).map((t) => flat(t, 300))});
            }

            await page.reload();
            await idle(page).catch(() => {});
            await pause(800);
            const s10 = await rec(page, 's10-reloaded');
            fact('step 10 reload', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), h1: (await page.locator('h1').allInnerTexts().catch(() => [])).map((t) => flat(t, 120)),
                text: flat(s10 && s10.text && (s10.text.main || s10.text.body), 500)});
            fact('db (Evidence)', sql(app, `select submission_id || ' progress=' || coalesce(submission_progress, '<null>') || ' status=' || status || ' submitted=' || coalesce(date_submitted::text, '<null>') from submissions where submission_id = ${draft.id}`).trim());
            fact('submit answers', answers);
            await signOut(page).catch(() => {});
        } finally { await author.close(); }
    } catch (e) {
        fact('walk error', flat(e.stack || e.message, 800));
    } finally {
        fact('errors', errors);
        record('facts-sc', facts);
    }
});
