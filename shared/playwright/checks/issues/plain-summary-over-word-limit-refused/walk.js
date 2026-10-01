// U21 A16 issue walk: a plain language summary over the section's word limit is refused by the wizard's save.
// Steps (docs/issues/U21-A16-plain-summary-over-word-limit-refused.md), on PKP's default test dataset, OJS and OPS:
//   dbarnes: Settings › Workflow › Submission › Metadata, "Plain Language Summary" enabled at "Ask …";
//            Settings › Journal (Server) › Sections, "Articles" ("Preprints"), "Word Count" 10.
//   ccorino: a new submission, "Details" with an 8-word abstract and a 20-word summary, "Continue", "OK", on to "Review".
//   Control: a second submission with a 20-word abstract and a short summary, on to "Review".
// MODE=neighbour: the path a fix must leave alone. dbarnes on a submitted submission in the same section
//   (OJS 4, OPS 1), Publication › "Title & Abstract": a 20-word summary "Save" (refused, naming the field), then a
//   20-word abstract "Save" (refused), then both short "Save" (saved).
//
//   npm run fleet-prep -- --feature issues-ir26 --dataset 1 --reset
//   ONLY=ojs,ops PROBE_FEATURE=issues-ir26 PROBE_AGENT=ir26 node bin/probe.js all shared/playwright/checks/issues/plain-summary-over-word-limit-refused/walk.js
//   (MODE=neighbour in front for the neighbour check; PKP_E2E_LINE=stable-3_5_0 and the line's fleet for 3.5)
const {forEachApp, launch, signIn, signOut, record, idle} = require('../../../probe');
const L = require('./lib.js');
const W = require('../wizard-refused-save-hangs-saving/lib.js'); // the wizard's helpers (U21 A19)
const P = require('../plain-summary-required-refuses-other-saves/lib.js'); // the workflow's helpers (U21 A20)

const MODE = process.env.MODE || 'walk';
const SHORT_ABSTRACT = 'u21ir26 abstract of eight words within the limit.';
const LONG_SUMMARY = 'u21ir26 this plain language summary runs past the section word limit of ten words so the server refuses it today.';
const LONG_ABSTRACT = 'u21ir26 this abstract runs past the section word limit of ten words and the review check reports it to authors.';
const SHORT_SUMMARY = 'u21ir26 short summary.';
const ABS_ID = 'titleAbstract-abstract-control-en';
const PLS_ID = 'titleAbstract-plainLanguageSummary-control-en';

forEachApp(async (app) => {
    const section = app.name === 'ops' ? 'Preprints' : 'Articles';
    const o = {app: app.name, line: app.line || 'main', mode: MODE, words: {LONG_SUMMARY: L.words(LONG_SUMMARY), LONG_ABSTRACT: L.words(LONG_ABSTRACT), SHORT_ABSTRACT: L.words(SHORT_ABSTRACT)}};
    if (app.name === 'omp') { o.skipped = 'no word limit on a series'; record(`facts-${MODE}`, o); return; }
    const {page, close} = await launch(app);
    await page.addInitScript(W.watchFooter);
    const writes = P.watchWrites(page);
    const errs = [];
    page.on('pageerror', (e) => errs.push({at: Date.now(), text: W.flat(e.message, 200)}));
    page.on('dialog', async (d) => { if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {}); });
    let n = 0;
    const snap = (name, facts) => P.snap(page, `${MODE}-${String(++n).padStart(2, '0')}-${name}`, facts);
    const errDialog = () => page.getByRole('dialog').filter({hasText: /An unexpected error has occurred/});
    const countLines = () => page.locator('.pkpFormField--richTextarea__wordLimit').evaluateAll((els) => els.map((e) => ({
        field: (e.closest('.pkpFormField') || e).querySelector('label, .pkpFormFieldLabel')?.innerText.replace(/\s+/g, ' ').trim(),
        text: e.innerText.replace(/\s+/g, ' ').trim(),
        icon: !!e.querySelector('svg, .pkpIcon, [class*="Icon"]'),
        color: getComputedStyle(e).color,
    }))).catch(() => []);
    const fieldErrors = () => page.locator('.pkpFieldError:visible, .pkpFormErrors:visible').allInnerTexts().then((a) => a.map((x) => W.flat(x, 300))).catch(() => []);
    const errsSince = (t) => errs.filter((x) => x.at >= t).map((x) => x.text);
    const toReview = async () => {
        for (let i = 0; i < 6 && !W.endAnchored('Review').test(await W.currentStep(page)); i++) {
            await W.pressContinue(page);
            if (await errDialog().isVisible().catch(() => false)) await errDialog().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
        }
        await W.sleep(8000);
        const rv = await snap('review');
        const main = (rv.text && rv.text.main) || '';
        return {step: await W.currentStep(page), checking: /Checking your submission/.test(main),
            summaryLine: W.flat((main.match(/Plain Language Summary[\s\S]{0,260}/) || [])[0], 260),
            abstractLine: W.flat((main.match(/Abstract[\s\S]{0,200}/) || [])[0], 200),
            tooLong: (main.match(/The [a-z ]+ is too long\.[^\n]*/g) || []),
            controls: await W.readControls(page)};
    };
    try {
        // Preconditions, as dbarnes.
        await signIn(page, 'dbarnes');
        o.plsSetting = await L.enablePlainLanguageSummary(page, app);
        await snap('metadata-settings', o.plsSetting);
        if (o.plsSetting.absent) { o.stopped = 'no plain language summary on this line'; return; }
        o.wordCount = await L.setSectionWordCount(page, app, section, 10);
        await snap('section-word-count', o.wordCount);

        if (MODE === 'neighbour') {
            const id = app.name === 'ops' ? 1 : 4;
            o.submissionId = id;
            await P.openWorkflow(app, page, id);
            await P.openEntry(page, 'Title & Abstract');
            const pls = await page.locator('iframe[id$="plainLanguageSummary-control-en_ifr"]').getAttribute('id');
            const abs = await page.locator('iframe[id$="abstract-control-en_ifr"]').first().getAttribute('id');
            const plsId = pls.replace(/_ifr$/, ''); const absId = abs.replace(/_ifr$/, '');
            await P.typeRich(page, plsId, LONG_SUMMARY);
            o.longSummary = {counts: await countLines(), save: await P.savePage(page, writes)};
            await snap('editor-long-summary', o.longSummary);
            await P.typeRich(page, plsId, SHORT_SUMMARY);
            await P.typeRich(page, absId, LONG_ABSTRACT);
            o.longAbstract = {save: await P.savePage(page, writes)};
            await snap('editor-long-abstract', o.longAbstract);
            await P.typeRich(page, absId, SHORT_ABSTRACT);
            o.bothShort = {save: await P.savePage(page, writes)};
            await snap('editor-both-short', o.bothShort);
            return;
        }
        await signOut(page);

        // 1-3: the author starts a submission and passes "Upload Files".
        await signIn(page, 'ccorino');
        o.s1 = await W.beginSubmission(page, app, {title: 'u21ir26 summary over the limit', section});
        if (/Upload Files\s*$/.test(await W.currentStep(page))) await W.pressContinue(page);
        o.detailsStep = await W.currentStep(page);
        // 4: the abstract within the limit, the summary over it.
        await W.typeRich(page, ABS_ID, SHORT_ABSTRACT);
        await W.typeRich(page, PLS_ID, LONG_SUMMARY);
        await W.sleep(500);
        o.step4 = {counts: await countLines(), fieldErrors: await fieldErrors(), controls: await W.readControls(page)};
        await snap('details-typed', o.step4);
        // 5: Continue.
        const t0 = Date.now();
        o.step5next = await W.pressContinue(page);
        o.errorDialog = await errDialog().waitFor({timeout: 10_000}).then(() => true).catch(() => false);
        o.errorDialogText = o.errorDialog ? W.flat(await errDialog().innerText().catch(() => null), 200) : null;
        await snap('refused', {writes: writes.since(t0)});
        await page.waitForTimeout(Math.max(0, t0 + 10_000 - Date.now()));
        o.step5 = {writes: writes.since(t0), controls: await W.readControls(page), pageErrors: errsSince(t0),
            footer: (await page.evaluate(() => window.__footer || []).catch(() => [])).filter((x) => x.at >= t0).map((x) => ({atS: Math.round((x.at - t0) / 100) / 10, text: x.text}))};
        // 6: OK, on to Review.
        if (o.errorDialog) await errDialog().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
        o.review1 = await toReview();
        o.review1.writes = writes.since(t0);

        // Control, 7-9: a new submission, the abstract over the limit and a short summary.
        await page.goto('about:blank');
        o.s2 = await W.beginSubmission(page, app, {title: 'u21ir26 abstract over the limit', section});
        if (/Upload Files\s*$/.test(await W.currentStep(page))) await W.pressContinue(page);
        await W.typeRich(page, ABS_ID, LONG_ABSTRACT);
        await W.typeRich(page, PLS_ID, SHORT_SUMMARY);
        await W.sleep(500);
        o.step8 = {counts: await countLines()};
        await snap('control-details', o.step8);
        const t1 = Date.now();
        await W.pressContinue(page);
        await W.sleep(3000);
        o.step8.writes = writes.since(t1);
        o.step8.errorDialog = await errDialog().isVisible().catch(() => false);
        o.review2 = await toReview();
        o.review2.pageErrors = errsSince(t1);
    } catch (e) {
        o.error = W.flat(e.stack || e.message, 800);
        await snap('error').catch(() => {});
    } finally {
        o.allPageErrors = errs.map((x) => x.text);
        record(`facts-${MODE}`, o);
        console.log(`[ir26 ${app.name} ${MODE}]`, JSON.stringify(o).slice(0, 4000));
        await close();
    }
});
