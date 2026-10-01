// U21 A10 issue walk: a submission wizard loaded in a phone-sized window keeps its full step rail.
// Steps (docs/issues/U21-A10-phone-wizard-step-rail-not-collapsed.md), on the default dataset, in a 375 x 812 window:
//   the author (OJS/OPS ccorino, OMP aclark), in an ordinary window: Make a Submission, "Begin Submission" (the start
//   page's title box is squeezed to nothing at phone width); the window narrowed to 375 x 812; reload; reload again.
// Controls in the same run: the open wizard widened to 1440 and narrowed back to 375 without a reload; a load at 600.
// Neighbour (what a fix must leave alone): a load at 1280, where the five steps fit, keeps the full rail.
//
//   npm run fleet-prep -- --feature issues-ir35 --dataset 3 --reset
//   PROBE_FEATURE=issues-ir35 PROBE_AGENT=ir35 node bin/probe.js all shared/playwright/checks/issues/phone-load-step-rail-not-collapsed/walk.js
//   (PKP_E2E_LINE=stable-3_5_0 and the line's fleet for 3.5)
const {forEachApp, launch, screen, shot, record, signIn, idle} = require('../../../probe');
const {beginSubmission} = require('../wizard-refused-save-hangs-saving/lib.js');
const L = require('./lib.js');

const PHONE = {width: 375, height: 812};

forEachApp(async (app) => {
    const author = app.name === 'omp' ? 'aclark' : 'ccorino';
    const o = {app: app.name, line: app.line || 'main', author, reads: {}};
    const {page, close} = await launch(app);
    await page.addInitScript(L.watchRail);
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
    let n = 0;
    const snap = async (name) => {
        await L.railSettled(page);
        const rail = await L.readRail(page);
        rail.timeline = await page.evaluate(() => window.__rail || []).catch(() => null);
        o.reads[name] = rail;
        const s = await screen(page).catch((e) => ({url: page.url(), error: String(e.message)}));
        s.rail = rail;
        const id = `${String(++n).padStart(2, '0')}-${name}`;
        record(id, s);
        await shot(page, id).catch(() => {});
        return rail;
    };
    try {
        // 1-3: the submission started in an ordinary window.
        await signIn(page, author);
        o.submissionId = await beginSubmission(page, app, {title: 'u21ir35 phone step rail', section: 'Articles'});
        // 4-5: the window narrowed to phone size, then the page reloaded (a fresh load at phone width).
        await page.setViewportSize(PHONE);
        await page.reload();
        await page.locator('.pkpSteps__step__label--current').waitFor({timeout: 30_000});
        await idle(page);
        await snap('phone-load');
        // 6: reload again at the same width.
        await page.reload();
        await page.locator('.pkpSteps__step__label--current').waitFor({timeout: 30_000});
        await idle(page);
        await snap('phone-reload');
        // Control: widen, then narrow back without a reload.
        await page.setViewportSize({width: 1440, height: 900});
        await snap('resized-up-1440');
        await page.setViewportSize(PHONE);
        await snap('resized-down-375');
        // Control: a fresh load at 600.
        await page.setViewportSize({width: 600, height: 900});
        await page.reload();
        await page.locator('.pkpSteps__step__label--current').waitFor({timeout: 30_000});
        await idle(page);
        await snap('load-600');
        // Neighbour: a fresh load at 1280 keeps the full rail.
        await page.setViewportSize({width: 1280, height: 900});
        await page.reload();
        await page.locator('.pkpSteps__step__label--current').waitFor({timeout: 30_000});
        await idle(page);
        await snap('load-1280');
    } catch (e) {
        o.error = String(e.stack || e).slice(0, 600);
        await shot(page, 'error').catch(() => {});
    } finally {
        o.pageErrors = errs;
        o.summary = Object.fromEntries(Object.entries(o.reads).map(([k, r]) => [k, `collapsed=${r.collapsed} controls=${JSON.stringify(r.controls)} viewport=${r.viewport} docScroll=${r.documentScrollWidth} wrapper=${r.rail && r.rail.wrapperWidth} stepsSum=${r.rail && r.rail.stepsWidthSum}`]));
        record('walk', o);
        console.log(JSON.stringify({app: o.app, line: o.line, id: o.submissionId, error: o.error, summary: o.summary, pageErrors: errs}, null, 1));
        await close();
    }
});
